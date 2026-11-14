// SPDX-License-Identifier: CC0-1.0
pragma solidity ^0.8.29;

/// @notice ERC-7683 (Cross Chain Intents, resolver-centric Draft), EVM resolver interfaces, transcribed from
///         https://eips.ethereum.org/EIPS/eip-7683. Steps, variables, payments, attributes and formulas are
///         carried as ABI calldata of the functions below (`abi.encodeCall(IStep.Call, (...))` etc.).
interface IResolver {
    struct ResolvedOrder {
        /// Array of `IStep` ABI calldata.
        bytes[] steps;
        /// Array of `IVariableRole` ABI calldata.
        bytes[] variables;
        /// Array of `IPayment` ABI calldata.
        bytes[] payments;
        Assumption[] assumptions;
    }

    struct Assumption {
        string name;
        bytes data;
    }

    function resolve(bytes calldata payload) external view returns (ResolvedOrder memory);
}

interface IStep {
    /// @param arguments Each element is either an ABI-encoded variable index, or a framed ABI encoding of a value.
    /// @param attributes Each element is `IAttribute` ABI calldata.
    function Call(bytes calldata target, bytes4 selector, bytes[] calldata arguments, bytes[] calldata attributes)
        external;
}

interface IVariableRole {
    function PaymentRecipient() external;
    function PaymentChain() external;
    function StepCaller(uint256 stepIdx) external;
    function ExecutionOutput(string calldata field, uint256 stepIdx) external;
    function Witness(string calldata kind, bytes calldata data, uint256[] calldata variables) external;
    function Query(bytes calldata target, bytes4 selector, bytes[] calldata arguments, uint256 blockNumber) external;
    function QueryEvents(
        bytes calldata emitter,
        bytes1 topicMatch,
        bytes32 topic0,
        bytes32 topic1,
        bytes32 topic2,
        bytes32 topic3,
        uint256 blockNumber
    ) external;
}

interface IPayment {
    /// @param amountFormula `IFormula` ABI calldata.
    function ERC20(
        bytes calldata token,
        bytes calldata sender,
        bytes calldata amountFormula,
        uint256 recipientVarIdx,
        uint256 onStepIdx,
        uint256 estimatedDelaySeconds
    ) external;
}

interface IAttribute {
    function SpendsERC20(bytes calldata token, bytes calldata amountFormula, bytes calldata spender, bytes calldata recipient)
        external;
    function SpendsGas(bytes calldata amountFormula) external;
    function TimingBounds(string calldata field, bytes calldata lowerBound, bytes calldata upperBound) external;
    function NeedsStep(uint256 stepIdx) external;
    function NeedsVariable(uint256 varIdx) external;
    function RevertPolicy(string calldata policy, bytes calldata expectedReason) external;
}

interface IFormula {
    function Constant(uint256 val) external;
    function Variable(uint256 varIdx) external;
}
