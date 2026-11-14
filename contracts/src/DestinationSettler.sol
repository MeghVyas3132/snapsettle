// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {OrderData, OrderLib} from "./OrderTypes.sol";

/// @title DestinationSettler
/// @notice Destination side of Snapsettle (Unichain Sepolia). A solver fills an order by paying the
///         output to the recipient from its own inventory and names where it wants to be repaid on the
///         origin chain. The `Filled` event is what the reactive contract settles on.
/// @dev This contract cannot see the origin chain, so it does not check that `orderId` is real or that
///      the terms match. The reactive contract does: it compares `orderHash` with the terms it observed
///      in `Opened`. Fills are keyed by (orderId, orderHash) so a fill with fake terms for a real order id
///      cannot block the genuine fill.
contract DestinationSettler is ReentrancyGuard {
    using SafeERC20 for IERC20;

    mapping(bytes32 fillKey => bool) public filled;

    event Filled(bytes32 indexed orderId, address indexed solver, bytes32 orderHash, address repayTo, uint32 fillTime);

    error WrongDestination();
    error FillDeadlinePassed();
    error AlreadyFilled();
    error ZeroAddress();

    function fillKey(bytes32 orderId, OrderData calldata d) public pure returns (bytes32) {
        return keccak256(abi.encode(orderId, OrderLib.hash(d)));
    }

    /// @notice Fills `orderId`: transfers `d.outputAmount` of `d.outputToken` from the caller to
    ///         `d.recipient`. `repayTo` is the solver's address on the origin chain.
    function fill(bytes32 orderId, OrderData calldata d, address repayTo) external nonReentrant {
        if (d.destinationChainId != block.chainid || d.destinationSettler != address(this)) revert WrongDestination();
        if (block.timestamp > d.fillDeadline) revert FillDeadlinePassed();
        if (repayTo == address(0)) revert ZeroAddress();

        bytes32 h = OrderLib.hash(d);
        bytes32 key = keccak256(abi.encode(orderId, h));
        if (filled[key]) revert AlreadyFilled();
        filled[key] = true;

        IERC20(d.outputToken).safeTransferFrom(msg.sender, d.recipient, d.outputAmount);
        emit Filled(orderId, msg.sender, h, repayTo, uint32(block.timestamp));
    }
}
