// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

import {Script, console2} from "forge-std/Script.sol";
import {TestToken} from "../test/helpers/TestToken.sol";

/// LOCAL HARNESS ONLY. Deploys a TEST USDC on an anvil chain and mints it to the user and solver wallets.
/// forge script script/Local.s.sol:LocalToken --rpc-url http://127.0.0.1:8545 --private-key <anvil dev key> --broadcast
contract LocalToken is Script {
    function run() external {
        address user = vm.envAddress("LOCAL_USER");
        address solver = vm.envAddress("LOCAL_SOLVER");
        vm.startBroadcast();
        TestToken t = new TestToken("TEST USDC", "tUSDC");
        t.mint(user, 10_000_000e6);
        t.mint(solver, 10_000_000e6);
        vm.stopBroadcast();
        string memory key = string.concat("token-", vm.toString(block.chainid));
        vm.writeJson(vm.serializeAddress(key, "token", address(t)), string.concat("deployments/local/", key, ".json"));
        console2.log(key, address(t));
    }
}
