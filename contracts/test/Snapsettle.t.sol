// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

import {Vm} from "forge-std/Test.sol";
import {IReactive} from "@reactive/src/interfaces/IReactive.sol";
import {AbstractPayer} from "@reactive/src/base/AbstractPayer.sol";
import {AbstractCallback} from "@reactive/src/base/AbstractCallback.sol";
import {OrderData} from "../src/OrderTypes.sol";
import {OriginEscrow} from "../src/OriginEscrow.sol";
import {DestinationSettler} from "../src/DestinationSettler.sol";
import {SnapsettleReactive} from "../src/SnapsettleReactive.sol";
import {SnapsettleHarness} from "./helpers/SnapsettleHarness.sol";

contract SnapsettleTest is SnapsettleHarness {
    // ------------------------------------------------------------ wiring

    function test_subscriptions_wired() public view {
        assertTrue(sys.isSubscribed(address(rc), DEST, address(dest), uint256(DestinationSettler.Filled.selector)));
        assertTrue(sys.isSubscribed(address(rc), ORIGIN, address(escrow), uint256(OriginEscrow.Opened.selector)));
        assertTrue(sys.isSubscribed(address(rc), ORIGIN, address(escrow), uint256(OriginEscrow.RefundRequested.selector)));
        assertFalse(sys.isSubscribed(address(rc), REACTIVE, CRON_SOURCE, CRON10_TOPIC_0), "cron off at rest");
    }

    function test_setOriginEscrow_onlyOnceAndOnlyOwner() public {
        vm.expectRevert(SnapsettleReactive.NotOwner.selector);
        rc.setOriginEscrow(address(1));
        vm.prank(owner);
        vm.expectRevert(SnapsettleReactive.AlreadyConfigured.selector);
        rc.setOriginEscrow(address(1));
    }

    function test_tiers() public view {
        assertEq(rc.settleDelay(1e6), 0);
        assertEq(rc.settleDelay(100e6), 0);
        assertEq(rc.settleDelay(100e6 + 1), 30);
        assertEq(rc.settleDelay(10_000e6), 30);
        assertEq(rc.settleDelay(10_000e6 + 1), 300);
    }

    // ------------------------------------------------------------ happy paths

    function test_smallOrder_settlesOnFill() public {
        (bytes32 id, OrderData memory d) = _open(50e6);
        assertEq(usdcOrigin.balanceOf(address(escrow)), 50e6);

        _fill(id, d);
        assertEq(usdcDest.balanceOf(recipient), d.outputAmount, "user paid on destination");
        assertEq(sys.callbackCount(), 1, "settle requested at once");

        assertEq(_runCallbacks(), 1);
        assertEq(usdcOrigin.balanceOf(solverRepay), 50e6, "solver repaid on origin");
        assertEq(usdcOrigin.balanceOf(address(escrow)), 0);
        assertEq(uint8(_status(id)), uint8(OriginEscrow.Status.Settled));
    }

    function test_mediumOrder_waitsForTierDelay() public {
        (bytes32 id, OrderData memory d) = _open(1_000e6);
        _fill(id, d);
        assertEq(sys.callbackCount(), 0, "no settle before the delay");
        assertTrue(rc.cronActive());
        assertTrue(sys.isSubscribed(address(rc), REACTIVE, CRON_SOURCE, CRON10_TOPIC_0), "cron subscribed");

        vm.warp(block.timestamp + 29);
        _cronTick();
        assertEq(sys.callbackCount(), 0, "still waiting");

        vm.warp(block.timestamp + 1);
        _cronTick();
        assertEq(sys.callbackCount(), 1, "settled after 30 s");
        assertFalse(rc.cronActive(), "cron released when queue empties");
        assertFalse(sys.isSubscribed(address(rc), REACTIVE, CRON_SOURCE, CRON10_TOPIC_0));

        _runCallbacks();
        assertEq(usdcOrigin.balanceOf(solverRepay), 1_000e6);
    }

    function test_fillObservedBeforeOpen_isParkedThenSettled() public {
        (bytes32 id, OrderData memory d, Vm.Log[] memory openLogs) = _openNoDeliver(50e6);
        _fill(id, d); // Reactive sees the destination first
        assertEq(sys.callbackCount(), 0);
        _deliver(openLogs, ORIGIN, address(escrow));
        assertEq(sys.callbackCount(), 1, "parked fill settles once the order is seen");
        _runCallbacks();
        assertEq(usdcOrigin.balanceOf(solverRepay), 50e6);
    }

    function test_drain_capsPerTick() public {
        bytes32[] memory ids = new bytes32[](7);
        for (uint256 i = 0; i < 7; ++i) {
            (bytes32 id, OrderData memory d) = _open(500e6 + i);
            _fill(id, d);
            ids[i] = id;
        }
        assertEq(rc.queueLength(), 7);
        vm.warp(block.timestamp + 30);
        _cronTick();
        assertEq(sys.callbackCount(), 3, "capped at 3 per tick");
        _cronTick();
        assertEq(sys.callbackCount(), 6);
        assertTrue(rc.cronActive());
        _cronTick();
        assertEq(sys.callbackCount(), 7);
        assertFalse(rc.cronActive());
        _runCallbacks();
        for (uint256 i = 0; i < 7; ++i) {
            assertEq(uint8(_status(ids[i])), uint8(OriginEscrow.Status.Settled));
        }
    }

    /// @notice Every react() path must fit Reactive's 900k reactive-transaction cap minus the ~100k the
    ///         system contract reserves. Measured with the mock system (which over-charges callbacks).
    function test_reactGas_underCap() public {
        uint256 cap = 700_000;
        bytes32[] memory ids = new bytes32[](5);
        for (uint256 i = 0; i < 5; ++i) {
            (bytes32 id, OrderData memory d) = _open(500e6 + i);
            _fill(id, d);
            ids[i] = id;
        }
        vm.warp(block.timestamp + 30);
        IReactive.LogRecord memory r;
        r.chainId = REACTIVE;
        r.contractAddress = CRON_SOURCE;
        r.topic0 = CRON10_TOPIC_0;
        r.opCode = 2;
        vm.chainId(REACTIVE);
        vm.prank(SYSTEM);
        uint256 g = gasleft();
        rc.react(r);
        uint256 used = g - gasleft();
        emit log_named_uint("worst-case drain tick gas", used);
        assertLt(used, cap, "drain tick under cap");
    }

    // ------------------------------------------------------------ refunds

    function test_unfilledOrder_refundsAfterDeadline() public {
        (bytes32 id, OrderData memory d) = _open(50e6);
        vm.warp(uint256(d.fillDeadline) + GRACE);
        vm.prank(user);
        vm.expectRevert(abi.encodeWithSelector(OriginEscrow.RefundTooEarly.selector, uint256(d.fillDeadline) + GRACE));
        escrow.requestRefund(id);

        vm.warp(uint256(d.fillDeadline) + GRACE + 1);
        vm.chainId(ORIGIN);
        vm.recordLogs();
        vm.prank(user);
        escrow.requestRefund(id);
        _deliver(vm.getRecordedLogs(), ORIGIN, address(escrow));

        assertEq(sys.callbackCount(), 1);
        _runCallbacks();
        assertEq(usdcOrigin.balanceOf(user), 1_000_000e6, "user made whole");
        assertEq(uint8(_status(id)), uint8(OriginEscrow.Status.Refunded));
    }

    function test_refundRequest_ignoredWhenFillWasSeen() public {
        (bytes32 id, OrderData memory d) = _open(50_000e6); // 5-minute tier
        _fill(id, d);
        vm.warp(uint256(d.fillDeadline) + GRACE + 1);

        vm.chainId(ORIGIN);
        vm.recordLogs();
        vm.prank(user);
        escrow.requestRefund(id); // escrow is still Open: settlement is queued
        _deliver(vm.getRecordedLogs(), ORIGIN, address(escrow));
        assertEq(sys.callbackCount(), 0, "no refund once a valid fill was seen");

        _cronTick();
        _runCallbacks();
        assertEq(usdcOrigin.balanceOf(solverRepay), 50_000e6, "solver still paid");
    }

    function test_requestRefund_onlyUser() public {
        (bytes32 id, OrderData memory d) = _open(50e6);
        vm.warp(uint256(d.fillDeadline) + GRACE + 1);
        vm.expectRevert(OriginEscrow.NotOrderUser.selector);
        escrow.requestRefund(id);
    }

    // ------------------------------------------------------------ adversarial

    function test_fillWithWrongTerms_isRejected_andCannotBlockGenuineFill() public {
        (bytes32 id, OrderData memory d) = _open(50e6);
        OrderData memory cheap = _copy(d);
        cheap.outputAmount = 1; // griefer "fills" with almost nothing
        _fill(id, cheap);
        assertEq(sys.callbackCount(), 0, "wrong terms never settle");

        _fill(id, d); // the genuine fill still goes through on the destination
        assertEq(sys.callbackCount(), 1);
        _runCallbacks();
        assertEq(usdcOrigin.balanceOf(solverRepay), 50e6);
    }

    function test_wrongTermsParkedFirst_doesNotBlockGenuineParkedFill() public {
        (bytes32 id, OrderData memory d, Vm.Log[] memory openLogs) = _openNoDeliver(50e6);
        OrderData memory cheap = _copy(d);
        cheap.outputAmount = 1;
        _fill(id, cheap); // parked under (id, wrongHash)
        _fill(id, d); // parked under (id, rightHash)
        _deliver(openLogs, ORIGIN, address(escrow));
        assertEq(sys.callbackCount(), 1);
        _runCallbacks();
        assertEq(usdcOrigin.balanceOf(solverRepay), 50e6);
    }

    function test_lateFill_revertsOnDestination() public {
        (bytes32 id, OrderData memory d) = _open(50e6);
        vm.warp(uint256(d.fillDeadline) + 1);
        vm.chainId(DEST);
        vm.prank(solver);
        vm.expectRevert(DestinationSettler.FillDeadlinePassed.selector);
        dest.fill(id, d, solverRepay);
    }

    function test_doubleFill_reverts() public {
        (bytes32 id, OrderData memory d) = _open(50e6);
        _fill(id, d);
        vm.chainId(DEST);
        vm.prank(solver);
        vm.expectRevert(DestinationSettler.AlreadyFilled.selector);
        dest.fill(id, d, solverRepay);
    }

    function test_secondValidFillEvent_isIgnored() public {
        (bytes32 id, OrderData memory d) = _open(50e6);
        Vm.Log[] memory logs = _fillNoDeliver(id, d);
        _deliver(logs, DEST, address(dest));
        _deliver(logs, DEST, address(dest)); // same log delivered twice
        assertEq(sys.callbackCount(), 1, "one settlement per order");
    }

    function test_duplicateSettleCallback_paysOnce() public {
        (bytes32 id, OrderData memory d) = _open(50e6);
        _fill(id, d);
        _runCallbacks();
        vm.prank(owner);
        rc.retry(id); // re-send: the escrow must ignore it
        _runCallbacks();
        assertEq(usdcOrigin.balanceOf(solverRepay), 50e6, "paid exactly once");
    }

    function test_retry_onlyOwner() public {
        (bytes32 id, OrderData memory d) = _open(50e6);
        _fill(id, d);
        vm.expectRevert(SnapsettleReactive.NotOwner.selector);
        rc.retry(id);
    }

    function test_callbacks_requireProxyAndReactiveSender() public {
        (bytes32 id,) = _open(50e6);
        vm.chainId(ORIGIN);
        vm.expectRevert(abi.encodeWithSelector(AbstractPayer.NotAuthorized.selector, address(this), proxy));
        escrow.settle(address(rc), id, address(this));

        vm.prank(proxy);
        vm.expectRevert(
            abi.encodeWithSelector(AbstractCallback.CallbackNotAuthorized.selector, address(0xBAD), address(rc))
        );
        escrow.settle(address(0xBAD), id, address(this));
    }

    function test_react_onlySystem() public {
        IReactive.LogRecord memory r;
        vm.expectRevert(abi.encodeWithSelector(AbstractPayer.NotAuthorized.selector, address(this), SYSTEM));
        rc.react(r);
    }

    function test_foreignLogs_areIgnored() public {
        (bytes32 id, OrderData memory d) = _open(50e6);
        // A Filled-shaped log from a contract other than the destination settler.
        DestinationSettler impostor = new DestinationSettler();
        vm.chainId(DEST);
        vm.recordLogs();
        vm.prank(solver);
        usdcDest.approve(address(impostor), type(uint256).max);
        OrderData memory d2 = _copy(d);
        d2.destinationSettler = address(impostor);
        vm.prank(solver);
        impostor.fill(id, d2, solverRepay);
        _deliver(vm.getRecordedLogs(), DEST, address(impostor));
        assertEq(sys.callbackCount(), 0);
    }

    function test_open_rejectsUnknownDestination() public {
        OrderData memory d = _order(50e6, 49e6, uint32(block.timestamp + 1 hours));
        d.destinationSettler = address(0xDEAD);
        vm.chainId(ORIGIN);
        vm.prank(user);
        vm.expectRevert(OriginEscrow.WrongDestination.selector);
        escrow.open(d);
    }

    // ------------------------------------------------------------ fuzz

    /// @notice Whatever the order size and event ordering, the escrow pays out exactly once: either the
    ///         full input to the solver or the full input back to the user.
    function testFuzz_escrowPaysExactlyOnce(uint96 rawAmount, bool fillFirst, bool filled, bool askRefund) public {
        uint256 amount = bound(uint256(rawAmount), 100, 100_000e6); // output = 99% must be > 0
        (bytes32 id, OrderData memory d, Vm.Log[] memory openLogs) = _openNoDeliver(amount);
        if (filled && fillFirst) _fill(id, d);
        _deliver(openLogs, ORIGIN, address(escrow));
        if (filled && !fillFirst) _fill(id, d);

        vm.warp(uint256(d.fillDeadline) + GRACE + 1);
        if (askRefund && _status(id) == OriginEscrow.Status.Open) {
            vm.chainId(ORIGIN);
            vm.recordLogs();
            vm.prank(user);
            escrow.requestRefund(id);
            _deliver(vm.getRecordedLogs(), ORIGIN, address(escrow));
        }
        _runCallbacks();
        _cronTick();
        _runCallbacks();

        uint256 toSolver = usdcOrigin.balanceOf(solverRepay);
        uint256 toUser = usdcOrigin.balanceOf(user) - (1_000_000e6 - amount);
        uint256 held = usdcOrigin.balanceOf(address(escrow));
        assertEq(toSolver + toUser + held, amount, "conservation");
        assertTrue(toSolver == 0 || toUser == 0, "never both");
        if (filled) assertEq(toSolver, amount, "filled orders always pay the solver");
        if (!filled && askRefund) assertEq(toUser, amount, "unfilled + refund asked returns funds");
    }
}
