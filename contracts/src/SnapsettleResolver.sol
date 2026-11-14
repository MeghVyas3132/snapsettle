// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

import {IResolver, IStep, IVariableRole, IPayment, IAttribute, IFormula} from "./interfaces/IERC7683.sol";
import {OrderData, OrderLib} from "./OrderTypes.sol";
import {OriginEscrow} from "./OriginEscrow.sol";
import {DestinationSettler} from "./DestinationSettler.sol";

/// @title SnapsettleResolver
/// @notice ERC-7683 resolver (resolver-centric Draft) for Snapsettle orders, deployed on the origin chain.
///         Solvers call `resolve(abi.encode(orderId, orderData))` via `eth_call` and get a standard order:
///         one `Call` step (fill on the destination), one `PaymentRecipient` variable (the solver's repayment
///         address), and one `ERC20` payment from the escrow whose `estimatedDelaySeconds` is the order's
///         finality tier plus the loop latency.
///
///         Reactive's settlement is not something this resolver can check on-chain, so it is surfaced the way
///         ERC-7683 asks for unverifiable conditions: as named assumptions (`reactive-settlement`,
///         `reactive-origin-finality`) that a solver must vet before filling.
contract SnapsettleResolver is IResolver {
    struct Tier {
        uint256 maxAmount;
        uint32 delay;
    }

    OriginEscrow public immutable escrow;
    uint256 public immutable destinationChainId;
    address public immutable destinationSettler;
    uint256 public immutable reactiveChainId;
    address public immutable reactiveContract;
    /// @notice Seconds added to every tier delay for the open→fill→react→settle loop itself.
    ///         Set from the measured p95 at deploy time (see docs/evidence).
    uint32 public immutable loopLatency;

    Tier[] internal _tiers;

    error OrderNotOpen();
    error TermsMismatch();
    error OrderExpired();
    error BadTiers();

    constructor(
        OriginEscrow escrow_,
        uint256 reactiveChainId_,
        address reactiveContract_,
        uint32 loopLatency_,
        Tier[] memory tiers_
    ) {
        if (tiers_.length == 0) revert BadTiers();
        for (uint256 i = 0; i < tiers_.length; ++i) {
            if (i > 0 && tiers_[i].maxAmount <= tiers_[i - 1].maxAmount) revert BadTiers();
            _tiers.push(tiers_[i]);
        }
        escrow = escrow_;
        destinationChainId = escrow_.destinationChainId();
        destinationSettler = escrow_.destinationSettler();
        reactiveChainId = reactiveChainId_;
        reactiveContract = reactiveContract_;
        loopLatency = loopLatency_;
    }

    /// @inheritdoc IResolver
    function resolve(bytes calldata payload) external view returns (ResolvedOrder memory r) {
        (bytes32 orderId, OrderData memory d) = abi.decode(payload, (bytes32, OrderData));
        (,, uint256 inputAmount,, OriginEscrow.Status status, bytes32 termsHash) = escrow.orders(orderId);
        if (status != OriginEscrow.Status.Open) revert OrderNotOpen();
        if (termsHash != OrderLib.hash(d)) revert TermsMismatch();
        if (block.timestamp >= d.fillDeadline) revert OrderExpired();

        uint256 dst = destinationChainId;

        // Step 0: DestinationSettler.fill(orderId, d, repayTo) on the destination chain.
        bytes[] memory args = new bytes[](3);
        args[0] = abi.encode("", orderId); // framed constant
        args[1] = abi.encode("", d); // framed constant
        args[2] = abi.encode(uint256(0)); // variable 0: PaymentRecipient

        bytes[] memory attrs = new bytes[](4);
        attrs[0] = abi.encodeCall(
            IAttribute.SpendsERC20,
            (
                interop(dst, d.outputToken),
                abi.encodeCall(IFormula.Constant, (d.outputAmount)),
                interop(dst, destinationSettler),
                interop(dst, d.recipient)
            )
        );
        attrs[1] = abi.encodeCall(
            IAttribute.TimingBounds,
            ("block.timestamp", bytes(""), abi.encodeCall(IFormula.Constant, (uint256(d.fillDeadline))))
        );
        attrs[2] = abi.encodeCall(
            IAttribute.RevertPolicy, ("abort", abi.encodePacked(DestinationSettler.AlreadyFilled.selector))
        );
        attrs[3] = abi.encodeCall(
            IAttribute.RevertPolicy, ("abort", abi.encodePacked(DestinationSettler.FillDeadlinePassed.selector))
        );

        r.steps = new bytes[](1);
        r.steps[0] =
            abi.encodeCall(IStep.Call, (interop(dst, destinationSettler), DestinationSettler.fill.selector, args, attrs));

        r.variables = new bytes[](1);
        r.variables[0] = abi.encodeCall(IVariableRole.PaymentRecipient, ());

        uint32 delay = settleDelay(inputAmount);
        r.payments = new bytes[](1);
        r.payments[0] = abi.encodeCall(
            IPayment.ERC20,
            (
                interop(block.chainid, d.inputToken),
                interop(block.chainid, address(escrow)),
                abi.encodeCall(IFormula.Constant, (inputAmount)),
                0,
                0,
                uint256(delay) + loopLatency
            )
        );

        r.assumptions = new Assumption[](2);
        // The escrow only releases on a callback from this reactive contract on this chain.
        r.assumptions[0] = Assumption("reactive-settlement", abi.encode(reactiveChainId, reactiveContract));
        // Reactive acts on observed events even if the observed chain later reorganises; this order waits
        // `delay` seconds after the fill is observed before settling.
        r.assumptions[1] = Assumption("reactive-origin-finality", abi.encode(uint256(delay)));
    }

    /// @notice Finality-tier delay for `amount`; mirrors the reactive contract's tiers.
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

    /// @notice ERC-7930 interoperable address for an EVM account: version 1, chain type 0x0000 (eip155),
    ///         minimal big-endian chain id, 20-byte address.
    function interop(uint256 chainId, address account) public pure returns (bytes memory) {
        uint256 n;
        for (uint256 x = chainId; x > 0; x >>= 8) ++n;
        bytes memory ref = new bytes(n);
        for (uint256 i = 0; i < n; ++i) {
            ref[n - 1 - i] = bytes1(uint8(chainId >> (8 * i)));
        }
        return abi.encodePacked(uint16(1), uint16(0), uint8(n), ref, uint8(20), account);
    }
}
