// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

import {Test, Vm} from "forge-std/Test.sol";
import {IReactive} from "@reactive/src/interfaces/IReactive.sol";
import {IPayable} from "@reactive/src/interfaces/IPayable.sol";
import {AbstractPayer} from "@reactive/src/base/AbstractPayer.sol";
import {AbstractCallback} from "@reactive/src/base/AbstractCallback.sol";
import {OrderData, OrderLib} from "../../src/OrderTypes.sol";
import {OriginEscrow} from "../../src/OriginEscrow.sol";
import {DestinationSettler} from "../../src/DestinationSettler.sol";
import {SnapsettleReactive} from "../../src/SnapsettleReactive.sol";
import {MockSystem} from "./MockSystem.sol";
import {TestToken} from "./TestToken.sol";

/// @notice End-to-end tests of the Snapsettle loop. All three chains run in one EVM: `vm.chainId` switches
///         between Base Sepolia (origin), Unichain Sepolia (destination) and Lasna (reactive). Logs emitted
///         on the origin/destination are converted to `LogRecord`s and delivered to `react()` as the system
///         contract would; requested callbacks are replayed through a fake callback proxy.
abstract contract SnapsettleHarness is Test {
    uint256 constant ORIGIN = 84532; // Base Sepolia
    uint256 constant DEST = 1301; // Unichain Sepolia
    uint256 constant REACTIVE = 5318007; // Lasna
    address constant SYSTEM = 0x8888888888888888888888888888888888888888;
    address constant CRON_SOURCE = 0x0000000000000000000000000000000000fffFfF;
    uint256 constant CRON10_TOPIC_0 = 0x04463f7c1651e6b9774d7f85c85bb94654e3c46ca79b0c16fb16d4183307b687;
    uint32 constant GRACE = 600;

    MockSystem sys;
    TestToken usdcOrigin;
    TestToken usdcDest;
    DestinationSettler dest;
    SnapsettleReactive rc;
    OriginEscrow escrow;

    address proxy = makeAddr("callbackProxy");
    address owner = makeAddr("owner");
    address user = makeAddr("user");
    address recipient = makeAddr("recipient");
    address solver = makeAddr("solver");
    address solverRepay = makeAddr("solverRepay");

    uint256 callbacksRun;

    function setUp() public virtual {
        vm.warp(1_800_000_000);
        vm.etch(SYSTEM, address(new MockSystem()).code);
        sys = MockSystem(payable(SYSTEM));

        vm.chainId(DEST);
        usdcDest = new TestToken("TEST USDC", "tUSDC");
        dest = new DestinationSettler();

        vm.chainId(REACTIVE);
        SnapsettleReactive.Tier[] memory t = new SnapsettleReactive.Tier[](3);
        t[0] = SnapsettleReactive.Tier(100e6, 0); // up to 100: settle on sight
        t[1] = SnapsettleReactive.Tier(10_000e6, 30); // up to 10k: wait 30 s
        t[2] = SnapsettleReactive.Tier(type(uint256).max, 300); // above: wait 5 min
        rc = new SnapsettleReactive(owner, ORIGIN, DEST, address(dest), t);

        vm.chainId(ORIGIN);
        usdcOrigin = new TestToken("TEST USDC", "tUSDC");
        escrow = new OriginEscrow(IPayable(payable(proxy)), address(rc), GRACE, DEST, address(dest));

        vm.prank(owner);
        rc.setOriginEscrow(address(escrow));

        usdcOrigin.mint(user, 1_000_000e6);
        vm.prank(user);
        usdcOrigin.approve(address(escrow), type(uint256).max);
        usdcDest.mint(solver, 1_000_000e6);
        vm.prank(solver);
        usdcDest.approve(address(dest), type(uint256).max);
    }

    // ------------------------------------------------------------ harness

    function _order(uint256 amountIn, uint256 amountOut, uint32 deadline) internal view returns (OrderData memory) {
        return OrderData({
            inputToken: address(usdcOrigin),
            inputAmount: amountIn,
            outputToken: address(usdcDest),
            outputAmount: amountOut,
            recipient: recipient,
            destinationChainId: DEST,
            destinationSettler: address(dest),
            fillDeadline: deadline
        });
    }

    /// @dev Memory structs alias on assignment; this makes a real copy.
    function _copy(OrderData memory d) internal pure returns (OrderData memory) {
        return abi.decode(abi.encode(d), (OrderData));
    }

    function _open(uint256 amountIn) internal returns (bytes32 id, OrderData memory d) {
        d = _order(amountIn, amountIn * 99 / 100, uint32(block.timestamp + 1 hours));
        vm.chainId(ORIGIN);
        vm.recordLogs();
        vm.prank(user);
        id = escrow.open(d);
        _deliver(vm.getRecordedLogs(), ORIGIN, address(escrow));
    }

    function _openNoDeliver(uint256 amountIn) internal returns (bytes32 id, OrderData memory d, Vm.Log[] memory logs) {
        d = _order(amountIn, amountIn * 99 / 100, uint32(block.timestamp + 1 hours));
        vm.chainId(ORIGIN);
        vm.recordLogs();
        vm.prank(user);
        id = escrow.open(d);
        logs = vm.getRecordedLogs();
    }

    function _fillNoDeliver(bytes32 id, OrderData memory d) internal returns (Vm.Log[] memory logs) {
        vm.chainId(DEST);
        vm.recordLogs();
        vm.prank(solver);
        dest.fill(id, d, solverRepay);
        logs = vm.getRecordedLogs();
    }

    function _fill(bytes32 id, OrderData memory d) internal {
        _deliver(_fillNoDeliver(id, d), DEST, address(dest));
    }

    function _deliver(Vm.Log[] memory logs, uint256 chainId, address emitter) internal {
        for (uint256 i = 0; i < logs.length; ++i) {
            if (logs[i].emitter != emitter) continue;
            _react(_record(logs[i], chainId));
        }
    }

    function _record(Vm.Log memory l, uint256 chainId) internal view returns (IReactive.LogRecord memory r) {
        r.chainId = chainId;
        r.contractAddress = l.emitter;
        r.topic0 = l.topics.length > 0 ? uint256(l.topics[0]) : 0;
        r.topic1 = l.topics.length > 1 ? uint256(l.topics[1]) : 0;
        r.topic2 = l.topics.length > 2 ? uint256(l.topics[2]) : 0;
        r.topic3 = l.topics.length > 3 ? uint256(l.topics[3]) : 0;
        r.data = l.data;
        r.blockNumber = block.number;
        r.opCode = l.topics.length;
    }

    function _react(IReactive.LogRecord memory r) internal {
        uint256 saved = block.chainid;
        vm.chainId(REACTIVE);
        vm.prank(SYSTEM);
        rc.react(r);
        vm.chainId(saved);
    }

    function _cronTick() internal {
        IReactive.LogRecord memory r;
        r.chainId = REACTIVE;
        r.contractAddress = CRON_SOURCE;
        r.topic0 = CRON10_TOPIC_0;
        r.data = abi.encode(block.number);
        r.opCode = 2;
        _react(r);
    }

    /// @dev Replays pending callbacks the way the proxy delivers them: as `proxy`, with the requesting
    ///      reactive contract's address injected into the first argument.
    function _runCallbacks() internal returns (uint256 ran) {
        uint256 n = sys.callbackCount();
        for (; callbacksRun < n; ++callbacksRun) {
            MockSystem.CallbackReq memory c = sys.callbackAt(callbacksRun);
            assertEq(c.chainId, ORIGIN, "callback goes to origin");
            assertEq(c.recipient, address(escrow), "callback recipient");
            bytes memory p = c.payload;
            bytes32 sender = bytes32(uint256(uint160(c.sender)));
            assembly {
                mstore(add(p, 36), sender)
            }
            vm.chainId(ORIGIN);
            vm.prank(proxy);
            (bool ok,) = c.recipient.call{gas: c.gasLimit}(p);
            assertTrue(ok, "callback reverted");
            ++ran;
        }
    }

    function _status(bytes32 id) internal view returns (OriginEscrow.Status s) {
        (,,,, s,) = escrow.orders(id);
    }

    function _rcStatus(bytes32 id) internal view returns (SnapsettleReactive.Status s) {
        (,,, s,,) = rc.orders(id);
    }

}
