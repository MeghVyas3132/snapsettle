// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

import {ISystemContract} from "@reactive/src/interfaces/ISystemContract.sol";
import {IReactive} from "@reactive/src/interfaces/IReactive.sol";
import {AbstractReactive} from "@reactive/src/base/AbstractReactive.sol";
import {OrderData, OrderLib} from "./OrderTypes.sol";

/// @title SnapsettleReactive
/// @notice Reactive contract on Lasna that settles Snapsettle orders. It watches `Opened` and
///         `RefundRequested` on the origin escrow and `Filled` on the destination settler. A fill whose
///         terms hash matches the order and that landed before the deadline releases the escrow to the
///         solver through a callback. No optimistic challenge window and no off-chain keeper are involved.
///
///         Finality policy: Reactive treats an observed origin event as canonical even if that chain later
///         reorganises ("origin finality"). Snapsettle makes that trade explicit per order. Small orders
///         settle the moment the fill is seen; larger orders wait a configurable delay before the settle
///         callback, giving the destination chain time to settle. Delayed settlements are drained on Cron10
///         ticks, and the Cron10 subscription is only held while the queue is non-empty.
contract SnapsettleReactive is AbstractReactive {
    // ---------------------------------------------------------------- constants

    /// @dev Legacy system contract that still emits the protocol Cron events on Omni.
    address internal constant CRON_SOURCE = 0x0000000000000000000000000000000000fffFfF;
    /// @dev keccak256("Cron10(uint256)"): fires every 10 Reactive blocks.
    uint256 internal constant CRON10_TOPIC_0 = 0x04463f7c1651e6b9774d7f85c85bb94654e3c46ca79b0c16fb16d4183307b687;

    uint256 internal constant OPENED_TOPIC_0 = uint256(
        keccak256("Opened(bytes32,address,(address,uint256,address,uint256,address,uint256,address,uint32))")
    );
    uint256 internal constant REFUND_REQUESTED_TOPIC_0 = uint256(keccak256("RefundRequested(bytes32,address)"));
    uint256 internal constant FILLED_TOPIC_0 = uint256(keccak256("Filled(bytes32,address,bytes32,address,uint32)"));

    /// @dev Covers OriginEscrow.settle/refund (one ERC-20 transfer) plus the proxy's own overhead.
    uint64 internal constant CALLBACK_GAS_LIMIT = 300_000;
    /// @dev Upper bound on settlements requested per Cron tick. Reactive caps a reactive transaction at
    ///      900k gas and the system contract keeps ~100k of it, so react() must stay well under ~800k.
    ///      Measured against the mock system contract, each settle request costs ~190k (an upper bound:
    ///      the mock stores every payload); 3 per tick keeps the worst case near 600k.
    uint256 internal constant MAX_SETTLES_PER_TICK = 3;

    // ---------------------------------------------------------------- types

    enum Status {
        None,
        Open,
        Queued,
        SettleRequested,
        RefundRequested
    }

    struct Order {
        bytes32 orderHash;
        uint256 inputAmount;
        uint32 fillDeadline;
        Status status;
        address repayTo;
        uint64 readyAt;
    }

    struct PendingFill {
        address repayTo;
        uint32 fillTime;
    }

    /// @notice Orders with `inputAmount <= maxAmount` wait `delay` seconds after the fill is observed.
    ///         Tiers are sorted by `maxAmount`; amounts above the last tier use the last tier's delay.
    struct Tier {
        uint256 maxAmount;
        uint32 delay;
    }

    // ---------------------------------------------------------------- storage

    address public immutable owner;
    uint256 public immutable originChainId;
    uint256 public immutable destinationChainId;
    address public immutable destinationSettler;
    address public originEscrow;

    Tier[] internal _tiers;
    mapping(bytes32 orderId => Order) public orders;
    /// @dev Fills observed before their `Opened` event, keyed by keccak256(orderId, orderHash) so a fill
    ///      with fake terms cannot occupy the slot of the genuine one.
    mapping(bytes32 key => PendingFill) public pendingFills;
    bytes32[] public queue;
    bool public cronActive;

    // ---------------------------------------------------------------- events

    event OrderObserved(bytes32 indexed orderId, uint256 inputAmount, uint32 settleDelay);
    event OrderIgnored(bytes32 indexed orderId);
    event FillAccepted(bytes32 indexed orderId, address repayTo, uint32 fillTime, uint32 settleDelay);
    event FillParked(bytes32 indexed orderId, bytes32 orderHash);
    event FillRejected(bytes32 indexed orderId, string reason);
    event SettlementRequested(bytes32 indexed orderId, address repayTo);
    event RefundCallbackRequested(bytes32 indexed orderId);
    event CronSubscription(bool active);

    error NotOwner();
    error AlreadyConfigured();
    error BadTiers();
    error NotRetryable();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    constructor(
        address owner_,
        uint256 originChainId_,
        uint256 destinationChainId_,
        address destinationSettler_,
        Tier[] memory tiers_
    ) payable {
        if (tiers_.length == 0) revert BadTiers();
        for (uint256 i = 1; i < tiers_.length; ++i) {
            if (tiers_[i].maxAmount <= tiers_[i - 1].maxAmount) revert BadTiers();
        }
        for (uint256 i = 0; i < tiers_.length; ++i) {
            _tiers.push(tiers_[i]);
        }
        owner = owner_;
        originChainId = originChainId_;
        destinationChainId = destinationChainId_;
        destinationSettler = destinationSettler_;

        SYSTEM.subscribe(
            destinationChainId_, destinationSettler_, FILLED_TOPIC_0, REACTIVE_IGNORE, REACTIVE_IGNORE, REACTIVE_IGNORE
        );
    }

    /// @notice One-time wiring of the origin escrow. The escrow is deployed after this contract because it
    ///         needs this contract's address as its authorised callback sender.
    function setOriginEscrow(address escrow) external onlyOwner {
        if (originEscrow != address(0)) revert AlreadyConfigured();
        originEscrow = escrow;
        SYSTEM.subscribe(originChainId, escrow, OPENED_TOPIC_0, REACTIVE_IGNORE, REACTIVE_IGNORE, REACTIVE_IGNORE);
        SYSTEM.subscribe(
            originChainId, escrow, REFUND_REQUESTED_TOPIC_0, REACTIVE_IGNORE, REACTIVE_IGNORE, REACTIVE_IGNORE
        );
    }

    // ---------------------------------------------------------------- react

    /// @inheritdoc IReactive
    function react(LogRecord calldata log) external onlySystem {
        if (log.chainId == originChainId && log.contractAddress == originEscrow && originEscrow != address(0)) {
            if (log.topic0 == OPENED_TOPIC_0) _onOpened(log);
            else if (log.topic0 == REFUND_REQUESTED_TOPIC_0) _onRefundRequested(log);
        } else if (
            log.chainId == destinationChainId && log.contractAddress == destinationSettler
                && log.topic0 == FILLED_TOPIC_0
        ) {
            _onFilled(log);
        } else if (log.contractAddress == CRON_SOURCE && log.topic0 == CRON10_TOPIC_0) {
            _drainQueue();
        }
        // Anything else falls through: reverting would still be billed.
    }

    function _onOpened(LogRecord calldata log) internal {
        bytes32 id = bytes32(log.topic1);
        if (orders[id].status != Status.None) return;
        OrderData memory d = abi.decode(log.data, (OrderData));
        if (d.destinationChainId != destinationChainId || d.destinationSettler != destinationSettler) {
            emit OrderIgnored(id);
            return;
        }
        bytes32 h = OrderLib.hash(d);
        uint32 delay = settleDelay(d.inputAmount);
        orders[id] = Order(h, d.inputAmount, d.fillDeadline, Status.Open, address(0), 0);
        emit OrderObserved(id, d.inputAmount, delay);

        bytes32 key = keccak256(abi.encode(id, h));
        PendingFill memory p = pendingFills[key];
        if (p.repayTo != address(0)) {
            delete pendingFills[key];
            _acceptFill(id, p.repayTo, p.fillTime);
        }
    }

    function _onFilled(LogRecord calldata log) internal {
        bytes32 id = bytes32(log.topic1);
        (bytes32 h, address repayTo, uint32 fillTime) = abi.decode(log.data, (bytes32, address, uint32));
        Order storage o = orders[id];

        if (o.status == Status.None) {
            // Destination events can be observed before the origin `Opened`: park the fill.
            bytes32 key = keccak256(abi.encode(id, h));
            if (pendingFills[key].repayTo == address(0)) {
                pendingFills[key] = PendingFill(repayTo, fillTime);
                emit FillParked(id, h);
            }
            return;
        }
        if (o.status != Status.Open) {
            emit FillRejected(id, "order not open");
            return;
        }
        if (h != o.orderHash) {
            emit FillRejected(id, "terms mismatch");
            return;
        }
        _acceptFill(id, repayTo, fillTime);
    }

    function _acceptFill(bytes32 id, address repayTo, uint32 fillTime) internal {
        Order storage o = orders[id];
        if (fillTime > o.fillDeadline) {
            emit FillRejected(id, "late fill");
            return;
        }
        uint32 delay = settleDelay(o.inputAmount);
        emit FillAccepted(id, repayTo, fillTime, delay);
        o.repayTo = repayTo;
        if (delay == 0) {
            _requestSettle(id);
        } else {
            o.status = Status.Queued;
            o.readyAt = uint64(block.timestamp) + delay;
            queue.push(id);
            _setCron(true);
        }
    }

    function _onRefundRequested(LogRecord calldata log) internal {
        bytes32 id = bytes32(log.topic1);
        Order storage o = orders[id];
        // A fill seen in time wins: the solver gets paid and the refund request is ignored.
        if (o.status != Status.Open) return;
        o.status = Status.RefundRequested;
        _requestRefund(id);
    }

    function _drainQueue() internal {
        uint256 settled;
        uint256 i;
        while (i < queue.length && settled < MAX_SETTLES_PER_TICK) {
            bytes32 id = queue[i];
            if (orders[id].readyAt <= block.timestamp) {
                queue[i] = queue[queue.length - 1];
                queue.pop();
                _requestSettle(id);
                ++settled;
            } else {
                ++i;
            }
        }
        if (queue.length == 0) _setCron(false);
    }

    // ---------------------------------------------------------------- callbacks

    function _requestSettle(bytes32 id) internal {
        Order storage o = orders[id];
        o.status = Status.SettleRequested;
        emit SettlementRequested(id, o.repayTo);
        _callback(abi.encodeWithSignature("settle(address,bytes32,address)", address(0), id, o.repayTo));
    }

    function _requestRefund(bytes32 id) internal {
        emit RefundCallbackRequested(id);
        _callback(abi.encodeWithSignature("refund(address,bytes32)", address(0), id));
    }

    function _callback(bytes memory payload) internal {
        SYSTEM.requestCallbackV_1_0(
            ISystemContract.CallbackConfiguration_V_1_0({
                chainId: originChainId,
                recipient: originEscrow,
                gasLimit: CALLBACK_GAS_LIMIT,
                payload: payload
            })
        );
    }

    function _setCron(bool on) internal {
        if (cronActive == on) return;
        cronActive = on;
        if (on) {
            SYSTEM.subscribe(block.chainid, CRON_SOURCE, CRON10_TOPIC_0, REACTIVE_IGNORE, REACTIVE_IGNORE, REACTIVE_IGNORE);
        } else {
            SYSTEM.unsubscribe(
                block.chainid, CRON_SOURCE, CRON10_TOPIC_0, REACTIVE_IGNORE, REACTIVE_IGNORE, REACTIVE_IGNORE
            );
        }
        emit CronSubscription(on);
    }

    // ---------------------------------------------------------------- views & maintenance

    /// @notice Settlement delay, in seconds, for an order of `amount` input. This is the value a resolver
    ///         surfaces to solvers as `estimatedDelaySeconds` (plus loop latency).
    function settleDelay(uint256 amount) public view returns (uint32) {
        uint256 n = _tiers.length;
        for (uint256 i = 0; i < n; ++i) {
            if (amount <= _tiers[i].maxAmount) return _tiers[i].delay;
        }
        return _tiers[n - 1].delay;
    }

    function tiers() external view returns (Tier[] memory) {
        return _tiers;
    }

    function queueLength() external view returns (uint256) {
        return queue.length;
    }

    /// @notice Re-sends a settle or refund callback that never landed (e.g. the escrow was briefly out of
    ///         callback funds). The escrow ignores duplicates. Owner-only, because every callback is billed
    ///         to the escrow and an open retry would let anyone drain its callback budget.
    function retry(bytes32 id) external onlyOwner {
        Status s = orders[id].status;
        if (s == Status.SettleRequested) {
            emit SettlementRequested(id, orders[id].repayTo);
            _callback(abi.encodeWithSignature("settle(address,bytes32,address)", address(0), id, orders[id].repayTo));
        } else if (s == Status.RefundRequested) {
            _requestRefund(id);
        } else {
            revert NotRetryable();
        }
    }

    /// @notice Settles any debt owed to the system contract from this contract's balance. Anyone may call.
    function coverDebt() external {
        _coverDebt();
    }
}
