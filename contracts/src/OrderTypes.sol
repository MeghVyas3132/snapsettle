// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

/// @notice One cross-chain order. The user escrows `inputAmount` of `inputToken` on the origin chain
///         and receives exactly `outputAmount` of `outputToken` at `recipient` on the destination chain,
///         filled by a solver before `fillDeadline`. The spread between input and output is the solver's fee.
/// @dev All fields are static so the struct ABI-encodes to a fixed 8 words, which keeps the `Opened`
///      log cheap to decode inside `react()`.
struct OrderData {
    address inputToken;
    uint256 inputAmount;
    address outputToken;
    uint256 outputAmount;
    address recipient;
    uint256 destinationChainId;
    address destinationSettler;
    uint32 fillDeadline;
}

library OrderLib {
    /// @notice Hash of the order terms. The destination emits it with every fill so the reactive
    ///         contract can check the fill against the terms it saw on the origin chain.
    function hash(OrderData memory d) internal pure returns (bytes32) {
        return keccak256(abi.encode(d));
    }

    /// @notice Globally unique order id: binds origin chain, escrow, user, user nonce and terms.
    function orderId(uint256 originChainId, address originEscrow, address user, uint256 nonce, OrderData memory d)
        internal
        pure
        returns (bytes32)
    {
        return keccak256(abi.encode(originChainId, originEscrow, user, nonce, d));
    }
}
