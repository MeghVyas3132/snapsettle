// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

import {Script, console2} from "forge-std/Script.sol";
import {IPayable} from "@reactive/src/interfaces/IPayable.sol";
import {DestinationSettler} from "../src/DestinationSettler.sol";
import {SnapsettleReactive} from "../src/SnapsettleReactive.sol";
import {OriginEscrow} from "../src/OriginEscrow.sol";

/// @notice Four-step deployment across three chains. Run in order (see docs/03-deploy.md). Each step writes
///         its addresses to `deployments/<step>.json`; later steps read them.
abstract contract Base is Script {
    uint256 constant BASE_SEPOLIA = 84532;
    uint256 constant UNICHAIN_SEPOLIA = 1301;
    uint256 constant LASNA = 5318007;
    address constant BASE_SEPOLIA_CALLBACK_PROXY = 0x476F44b11F5C942c58f4c8E3d0300E5710743585;

    function _write(string memory step, string memory key, address value) internal {
        string memory path = string.concat("deployments/", step, ".json");
        vm.writeJson(vm.serializeAddress(step, key, value), path);
        console2.log(step, key, value);
    }

    function _read(string memory step, string memory key) internal view returns (address) {
        string memory json = vm.readFile(string.concat("deployments/", step, ".json"));
        return vm.parseJsonAddress(json, string.concat(".", key));
    }
}

/// Step 1, Unichain Sepolia: forge script script/Deploy.s.sol:DeployDestination --rpc-url unichain_sepolia --account snapsettle-deployer --broadcast
contract DeployDestination is Base {
    function run() external {
        require(block.chainid == UNICHAIN_SEPOLIA, "run on Unichain Sepolia");
        vm.startBroadcast();
        DestinationSettler dest = new DestinationSettler();
        vm.stopBroadcast();
        _write("1-destination", "destinationSettler", address(dest));
    }
}

/// Step 2, Lasna: forge script script/Deploy.s.sol:DeployReactive --rpc-url lasna --account snapsettle-deployer --broadcast
/// Funds the reactive contract with RC_FUND (wei of lREACT, default 2 lREACT).
contract DeployReactive is Base {
    function run() external {
        require(block.chainid == LASNA, "run on Lasna");
        address dest = _read("1-destination", "destinationSettler");
        SnapsettleReactive.Tier[] memory t = new SnapsettleReactive.Tier[](3);
        t[0] = SnapsettleReactive.Tier(100e6, 0); // <= 100 USDC: settle on sight
        t[1] = SnapsettleReactive.Tier(10_000e6, 30); // <= 10k USDC: 30 s
        t[2] = SnapsettleReactive.Tier(type(uint256).max, 300); // above: 5 min
        uint256 fund = vm.envOr("RC_FUND", uint256(2 ether));

        vm.startBroadcast();
        SnapsettleReactive rc = new SnapsettleReactive{value: fund}(msg.sender, BASE_SEPOLIA, UNICHAIN_SEPOLIA, dest, t);
        vm.stopBroadcast();
        _write("2-reactive", "snapsettleReactive", address(rc));
    }
}

/// Step 3, Base Sepolia: forge script script/Deploy.s.sol:DeployOrigin --rpc-url base_sepolia --account snapsettle-deployer --broadcast
/// Funds the escrow with ESCROW_FUND (wei, default 0.01 ETH) to pay for settle/refund callbacks.
contract DeployOrigin is Base {
    function run() external {
        require(block.chainid == BASE_SEPOLIA, "run on Base Sepolia");
        address dest = _read("1-destination", "destinationSettler");
        address rc = _read("2-reactive", "snapsettleReactive");
        uint32 grace = uint32(vm.envOr("REFUND_GRACE", uint256(600)));
        uint256 fund = vm.envOr("ESCROW_FUND", uint256(0.01 ether));

        vm.startBroadcast();
        OriginEscrow escrow = new OriginEscrow{value: fund}(
            IPayable(payable(BASE_SEPOLIA_CALLBACK_PROXY)), rc, grace, UNICHAIN_SEPOLIA, dest
        );
        vm.stopBroadcast();
        _write("3-origin", "originEscrow", address(escrow));
    }
}

/// Step 4, Lasna: forge script script/Deploy.s.sol:WireReactive --rpc-url lasna --account snapsettle-deployer --broadcast
contract WireReactive is Base {
    function run() external {
        require(block.chainid == LASNA, "run on Lasna");
        SnapsettleReactive rc = SnapsettleReactive(payable(_read("2-reactive", "snapsettleReactive")));
        address escrow = _read("3-origin", "originEscrow");
        vm.startBroadcast();
        rc.setOriginEscrow(escrow);
        vm.stopBroadcast();
        console2.log("wired origin escrow", escrow);
    }
}
