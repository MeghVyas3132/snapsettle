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
        assertTrue(sys.isSubscribed(address(rc), DEST, address(dest), uint256(DestinationSettler.Confirmed.selector)));
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

    function test_mediumOrder_settlesOnlyAfterConfirm() public {
        (bytes32 id, OrderData memory d) = _open(1_000e6);
        _fill(id, d);
        assertEq(sys.callbackCount(), 0, "no settle before the delay");
        assertEq(uint8(_rcStatus(id)), uint8(SnapsettleReactive.Status.Queued));

        vm.warp(block.timestamp + 29);
        vm.chainId(DEST);
        vm.prank(solver);
        vm.expectRevert(abi.encodeWithSelector(DestinationSettler.TooEarly.selector, block.timestamp + 1));
        dest.confirm(id, d);

        vm.warp(block.timestamp + 1);
        _confirm(id, d);
        assertEq(sys.callbackCount(), 1, "settled from Confirmed after 30 s");
        _runCallbacks();
        assertEq(usdcOrigin.balanceOf(solverRepay), 1_000e6);
    }

    function test_confirm_onlyOnce_andNotForOnSightOrders() public {
        (bytes32 id, OrderData memory d) = _open(1_000e6);
        _fill(id, d);
        vm.warp(block.timestamp + 30);
        _confirm(id, d);
        vm.chainId(DEST);
        vm.expectRevert(DestinationSettler.AlreadyConfirmed.selector);
        dest.confirm(id, d);

        (bytes32 id2, OrderData memory d2) = _open(50e6);
        _fill(id2, d2);
        vm.chainId(DEST);
        vm.expectRevert(DestinationSettler.NoDelayTier.selector);
        dest.confirm(id2, d2);
    }

    /// @notice The reorg case: Reactive saw a fill that is no longer in the destination's state. It cannot be
    ///         confirmed, nobody is paid for it, and the user can get a refund once the confirm window has passed.
    function test_reorgedFill_cannotBeConfirmed_andBecomesRefundable() public {
        (bytes32 id, OrderData memory d) = _open(1_000e6);
        uint256 snap = vm.snapshotState();
        Vm.Log[] memory fillLogs = _fillNoDeliver(id, d);
        vm.revertToState(snap); // the fill is gone from every chain's state ...
        _deliver(fillLogs, DEST, address(dest)); // ... but Reactive had already observed it
        assertEq(uint8(_rcStatus(id)), uint8(SnapsettleReactive.Status.Queued));

        vm.warp(block.timestamp + 30);
        vm.chainId(DEST);
        vm.expectRevert(DestinationSettler.NotFilled.selector);
        dest.confirm(id, d);
        assertEq(sys.callbackCount(), 0, "nobody paid for a fill that no longer exists");

        // Within the confirm window the refund request is still ignored (the fill might be confirmed).
        vm.warp(uint256(d.fillDeadline) + GRACE + 1);
        _requestRefund(id);
        assertEq(sys.callbackCount(), 0);

        // After the confirm window the order is refundable.
        vm.warp(block.timestamp + rc.CONFIRM_WINDOW() + 1);
        _requestRefund(id);
        assertEq(sys.callbackCount(), 1);
        _runCallbacks();
        assertEq(usdcOrigin.balanceOf(user), 1_000_000e6, "user made whole");
    }

    /// @notice If a reorg dropped the first fill and another solver fills again, the fill that exists is paid.
    function test_refillAfterReorg_paysTheConfirmedFill() public {
        (bytes32 id, OrderData memory d) = _open(1_000e6);
        uint256 snap = vm.snapshotState();
        Vm.Log[] memory first = _fillNoDeliver(id, d);
        vm.revertToState(snap);
        _deliver(first, DEST, address(dest)); // Reactive queued the vanished fill

        address other = makeAddr("otherSolver");
        address otherRepay = makeAddr("otherRepay");
        usdcDest.mint(other, 10_000e6);
        vm.chainId(DEST);
        vm.prank(other);
        usdcDest.approve(address(dest), type(uint256).max);
        vm.recordLogs();
        vm.prank(other);
        dest.fill(id, d, otherRepay);
        _deliver(vm.getRecordedLogs(), DEST, address(dest)); // rejected: order already queued

        vm.warp(block.timestamp + 30);
        _confirm(id, d); // confirms the fill that exists: the second one
        _runCallbacks();
        assertEq(usdcOrigin.balanceOf(otherRepay), 1_000e6, "the existing fill is paid");
        assertEq(usdcOrigin.balanceOf(solverRepay), 0);
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

    /// @notice Every react() path must fit Reactive's 900k reactive-transaction cap minus the ~100k the
    ///         system contract reserves. Measured with the mock system (which over-charges callbacks).
    function test_reactGas_underCap() public {
        uint256 cap = 700_000;
        (bytes32 id, OrderData memory d) = _open(1_000e6);
        _fill(id, d);
        vm.warp(block.timestamp + 30);
        Vm.Log[] memory logs = _confirmNoDeliver(id, d);
        IReactive.LogRecord memory r = _record(logs[0], DEST);
        vm.chainId(REACTIVE);
        vm.prank(SYSTEM);
        uint256 g = gasleft();
        rc.react(r);
        uint256 used = g - gasleft();
        emit log_named_uint("confirm -> settle react gas", used);
        assertLt(used, cap, "react under cap");
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

        _requestRefund(id); // escrow is still Open: the fill is waiting for its confirm
        assertEq(sys.callbackCount(), 0, "no refund once a valid fill was seen");

        _confirm(id, d);
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
        DestinationSettler.Tier[] memory t = new DestinationSettler.Tier[](1);
        t[0] = DestinationSettler.Tier(type(uint256).max, 0);
        DestinationSettler impostor = new DestinationSettler(t);
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

    // ------------------------------------------------------------ outflow cap

    function test_open_rejectsOrderAboveCap() public {
        OrderData memory d = _order(CAP + 1, CAP, uint32(block.timestamp + 1 hours));
        vm.chainId(ORIGIN);
        vm.prank(user);
        vm.expectRevert(OriginEscrow.OverOutflowCap.selector);
        escrow.open(d);
    }

    /// @notice A faulty or compromised Reactive can release at most CAP per window; the rest waits, and is
    ///         paid when the window has room.
    function test_outflowCap_defersThenReleases() public {
        (bytes32 a, OrderData memory da) = _open(60_000e6);
        (bytes32 b, OrderData memory db) = _open(60_000e6);
        _fill(a, da);
        _fill(b, db);
        vm.warp(block.timestamp + 300);
        _confirm(a, da);
        _confirm(b, db);
        _runCallbacks();
        assertEq(uint8(_status(a)), uint8(OriginEscrow.Status.Settled));
        assertEq(uint8(_status(b)), uint8(OriginEscrow.Status.Deferred), "over the cap: deferred, not lost");
        assertEq(usdcOrigin.balanceOf(solverRepay), 60_000e6);

        vm.expectRevert();
        escrow.releaseDeferred(b); // window still full
        vm.warp(block.timestamp + WINDOW);
        escrow.releaseDeferred(b); // anyone may release once there is room
        assertEq(usdcOrigin.balanceOf(solverRepay), 120_000e6);
        assertEq(uint8(_status(b)), uint8(OriginEscrow.Status.Settled));
    }

    function _requestRefund(bytes32 id) internal {
        vm.chainId(ORIGIN);
        vm.recordLogs();
        vm.prank(user);
        escrow.requestRefund(id);
        _deliver(vm.getRecordedLogs(), ORIGIN, address(escrow));
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
        if (filled && dest.settleDelay(amount) > 0) _confirm(id, d);
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
