// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {OrderData, OrderLib} from "./OrderTypes.sol";

/// @title DestinationSettler
/// @notice Destination side of Snapsettle (Unichain Sepolia). A solver fills an order by paying the
///         output to the recipient from its own inventory and names where it wants to be repaid on the
///         origin chain. The `Filled` event is what the reactive contract settles on-sight orders from.
///
///         Orders in a delayed finality tier are settled from `Confirmed`, not from `Filled`. Once the tier's
///         delay has passed since the fill, anyone (in practice the solver, who wants its money) calls
///         `confirm`. It succeeds only if the fill is still recorded in this contract's state at that point,
///         so a fill that a reorganisation removed during the wait cannot be confirmed, and the reactive
///         contract never pays for it. The delay is a re-check of destination state, not just a timer.
/// @dev This contract cannot see the origin chain, so it does not check that `orderId` is real or that
///      the terms match. The reactive contract does: it compares `orderHash` with the terms it observed
///      in `Opened`. Fills are keyed by (orderId, orderHash) so a fill with fake terms for a real order id
///      cannot block the genuine fill.
contract DestinationSettler is ReentrancyGuard {
    using SafeERC20 for IERC20;

    /// @notice Same finality tiers as the reactive contract: orders with `inputAmount <= maxAmount` wait
    ///         `delay` seconds after the fill before they can be confirmed. Sorted by `maxAmount`.
    struct Tier {
        uint256 maxAmount;
        uint32 delay;
    }

    struct Fill {
        address solver;
        address repayTo;
        uint32 fillTime;
        bool confirmed;
    }

    Tier[] internal _tiers;
    mapping(bytes32 fillKey => Fill) public fills;

    event Filled(bytes32 indexed orderId, address indexed solver, bytes32 orderHash, address repayTo, uint32 fillTime);
    event Confirmed(bytes32 indexed orderId, bytes32 orderHash, address repayTo, uint32 fillTime, uint32 confirmTime);

    error WrongDestination();
    error FillDeadlinePassed();
    error AlreadyFilled();
    error ZeroAddress();
    error BadTiers();
    error NotFilled();
    error AlreadyConfirmed();
    error NoDelayTier();
    error TooEarly(uint256 availableAt);

    constructor(Tier[] memory tiers_) {
        if (tiers_.length == 0) revert BadTiers();
        for (uint256 i = 0; i < tiers_.length; ++i) {
            if (i > 0 && tiers_[i].maxAmount <= tiers_[i - 1].maxAmount) revert BadTiers();
            _tiers.push(tiers_[i]);
        }
    }

    function fillKey(bytes32 orderId, OrderData calldata d) public pure returns (bytes32) {
        return keccak256(abi.encode(orderId, OrderLib.hash(d)));
    }

    /// @notice True once `orderId` with these exact terms has been filled.
    function filled(bytes32 key) external view returns (bool) {
        return fills[key].repayTo != address(0);
    }

    /// @notice Fills `orderId`: transfers `d.outputAmount` of `d.outputToken` from the caller to
    ///         `d.recipient`. `repayTo` is the solver's address on the origin chain.
    function fill(bytes32 orderId, OrderData calldata d, address repayTo) external nonReentrant {
        if (d.destinationChainId != block.chainid || d.destinationSettler != address(this)) revert WrongDestination();
        if (block.timestamp > d.fillDeadline) revert FillDeadlinePassed();
        if (repayTo == address(0)) revert ZeroAddress();

        bytes32 h = OrderLib.hash(d);
        bytes32 key = keccak256(abi.encode(orderId, h));
        if (fills[key].repayTo != address(0)) revert AlreadyFilled();
        fills[key] = Fill(msg.sender, repayTo, uint32(block.timestamp), false);

        IERC20(d.outputToken).safeTransferFrom(msg.sender, d.recipient, d.outputAmount);
        emit Filled(orderId, msg.sender, h, repayTo, uint32(block.timestamp));
    }

    /// @notice Confirms a delayed-tier fill once its delay has passed. Callable by anyone, once per fill.
    ///         Reverts if the fill is not in this contract's state now (never made, or removed by a reorg).
    function confirm(bytes32 orderId, OrderData calldata d) external {
        bytes32 h = OrderLib.hash(d);
        Fill storage f = fills[keccak256(abi.encode(orderId, h))];
        if (f.repayTo == address(0)) revert NotFilled();
        if (f.confirmed) revert AlreadyConfirmed();
        uint32 delay = settleDelay(d.inputAmount);
        if (delay == 0) revert NoDelayTier(); // on-sight orders settle from Filled; no confirm needed
        uint256 availableAt = uint256(f.fillTime) + delay;
        if (block.timestamp < availableAt) revert TooEarly(availableAt);
        f.confirmed = true;
        emit Confirmed(orderId, h, f.repayTo, f.fillTime, uint32(block.timestamp));
    }

    /// @notice Seconds an order of `amount` input waits after its fill before it can be confirmed.
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
}
