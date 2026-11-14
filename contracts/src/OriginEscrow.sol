// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IPayable} from "@reactive/src/interfaces/IPayable.sol";
import {AbstractCallback} from "@reactive/src/base/AbstractCallback.sol";
import {OrderData, OrderLib} from "./OrderTypes.sol";

/// @title OriginEscrow
/// @notice Origin side of Snapsettle (Base Sepolia). Users open orders here and their input is escrowed.
///         Only the Snapsettle reactive contract, through the Reactive callback proxy, can release the
///         escrow: to the solver once a matching fill was observed on the destination chain, or back to
///         the user once the order expired unfilled.
/// @dev Callbacks never revert on a state mismatch (a reverted callback is still billed); they emit
///      `CallbackSkipped` instead, which also makes duplicate deliveries harmless.
contract OriginEscrow is AbstractCallback, ReentrancyGuard {
    using SafeERC20 for IERC20;

    enum Status {
        None,
        Open,
        Settled,
        Refunded
    }

    struct Order {
        address user;
        address inputToken;
        uint256 inputAmount;
        uint32 fillDeadline;
        Status status;
    }

    /// @notice Seconds after `fillDeadline` before a refund can be requested. Covers the time the
    ///         reactive contract needs to observe a last-second fill on the destination chain.
    uint32 public immutable refundGrace;
    /// @notice The only destination this escrow accepts orders for (chain and settler contract).
    uint256 public immutable destinationChainId;
    address public immutable destinationSettler;

    mapping(bytes32 orderId => Order) public orders;
    mapping(address user => uint256) public nonces;

    event Opened(bytes32 indexed orderId, address indexed user, OrderData order);
    event RefundRequested(bytes32 indexed orderId, address indexed user);
    event Settled(bytes32 indexed orderId, address indexed repayTo, uint256 amount);
    event Refunded(bytes32 indexed orderId, address indexed user, uint256 amount);
    event CallbackSkipped(bytes32 indexed orderId, Status status);

    error ZeroAmount();
    error ZeroAddress();
    error DeadlineInPast();
    error NotOpen();
    error NotOrderUser();
    error RefundTooEarly(uint256 availableAt);
    error WrongDestination();

    constructor(
        IPayable callbackProxy_,
        address reactiveContract_,
        uint32 refundGrace_,
        uint256 destinationChainId_,
        address destinationSettler_
    ) payable AbstractCallback(callbackProxy_, reactiveContract_) {
        refundGrace = refundGrace_;
        destinationChainId = destinationChainId_;
        destinationSettler = destinationSettler_;
    }

    /// @notice Opens an order and escrows `d.inputAmount` of `d.inputToken` (approve first).
    function open(OrderData calldata d) external nonReentrant returns (bytes32 id) {
        if (d.inputAmount == 0 || d.outputAmount == 0) revert ZeroAmount();
        if (d.recipient == address(0) || d.inputToken == address(0) || d.outputToken == address(0)) {
            revert ZeroAddress();
        }
        if (d.fillDeadline <= block.timestamp) revert DeadlineInPast();
        if (d.destinationChainId != destinationChainId || d.destinationSettler != destinationSettler) {
            revert WrongDestination();
        }

        id = OrderLib.orderId(block.chainid, address(this), msg.sender, nonces[msg.sender]++, d);
        orders[id] = Order(msg.sender, d.inputToken, d.inputAmount, d.fillDeadline, Status.Open);

        IERC20(d.inputToken).safeTransferFrom(msg.sender, address(this), d.inputAmount);
        emit Opened(id, msg.sender, d);
    }

    /// @notice Asks the reactive contract to refund an expired, unfilled order. The refund itself
    ///         arrives as a callback; if a fill was observed in time, the solver is paid instead.
    function requestRefund(bytes32 id) external {
        Order storage o = orders[id];
        if (o.status != Status.Open) revert NotOpen();
        if (msg.sender != o.user) revert NotOrderUser();
        uint256 availableAt = uint256(o.fillDeadline) + refundGrace;
        if (block.timestamp <= availableAt) revert RefundTooEarly(availableAt);
        emit RefundRequested(id, msg.sender);
    }

    /// @notice Callback: pays the escrowed input to the solver's repayment address.
    function settle(address rvm, bytes32 id, address repayTo)
        external
        onlyServiceProvider
        onlyCallbackSender(rvm)
        nonReentrant
    {
        Order storage o = orders[id];
        if (o.status != Status.Open || repayTo == address(0)) {
            emit CallbackSkipped(id, o.status);
            return;
        }
        o.status = Status.Settled;
        IERC20(o.inputToken).safeTransfer(repayTo, o.inputAmount);
        emit Settled(id, repayTo, o.inputAmount);
    }

    /// @notice Callback: returns the escrowed input to the user of an expired, unfilled order.
    function refund(address rvm, bytes32 id) external onlyServiceProvider onlyCallbackSender(rvm) nonReentrant {
        Order storage o = orders[id];
        if (o.status != Status.Open) {
            emit CallbackSkipped(id, o.status);
            return;
        }
        o.status = Status.Refunded;
        IERC20(o.inputToken).safeTransfer(o.user, o.inputAmount);
        emit Refunded(id, o.user, o.inputAmount);
    }

    /// @notice Settles any debt owed to the callback proxy from this contract's balance. Anyone may call.
    function coverDebt() external {
        _coverDebt();
    }
}
