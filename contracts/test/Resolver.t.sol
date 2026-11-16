// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

import {IResolver, IStep, IPayment, IVariableRole} from "../src/interfaces/IERC7683.sol";
import {OrderData} from "../src/OrderTypes.sol";
import {OriginEscrow} from "../src/OriginEscrow.sol";
import {DestinationSettler} from "../src/DestinationSettler.sol";
import {SnapsettleResolver} from "../src/SnapsettleResolver.sol";
import {SnapsettleHarness} from "./helpers/SnapsettleHarness.sol";

contract ResolverTest is SnapsettleHarness {
    SnapsettleResolver resolver;
    uint32 constant LOOP = 10;

    function setUp() public override {
        super.setUp();
        SnapsettleResolver.Tier[] memory t = new SnapsettleResolver.Tier[](3);
        t[0] = SnapsettleResolver.Tier(100e6, 0);
        t[1] = SnapsettleResolver.Tier(10_000e6, 30);
        t[2] = SnapsettleResolver.Tier(type(uint256).max, 300);
        vm.chainId(ORIGIN);
        resolver = new SnapsettleResolver(escrow, REACTIVE, address(rc), LOOP, t);
    }

    // ------------------------------------------------------------ helpers

    function _args(bytes memory callData) internal pure returns (bytes memory out) {
        out = new bytes(callData.length - 4);
        for (uint256 i = 0; i < out.length; ++i) out[i] = callData[i + 4];
    }

    function _selector(bytes memory callData) internal pure returns (bytes4 s) {
        assembly {
            s := mload(add(callData, 32))
        }
    }

    /// @dev Strips the ERC-7683 framing from a framed ABI encoding of a static value.
    function _unframe(bytes memory framed) internal pure returns (bytes memory v) {
        v = new bytes(framed.length - 64);
        for (uint256 i = 0; i < v.length; ++i) v[i] = framed[i + 32];
    }

    // ------------------------------------------------------------ tests

    function test_resolve_delayedOrder_secondStepIsConfirm() public {
        (bytes32 id, OrderData memory d) = _open(1_000e6);
        vm.chainId(ORIGIN);
        IResolver.ResolvedOrder memory r = resolver.resolve(abi.encode(id, d));
        (bytes memory target, bytes4 sel,,) = abi.decode(_args(r.steps[1]), (bytes, bytes4, bytes[], bytes[]));
        assertEq(target, resolver.interop(DEST, address(dest)));
        assertEq(sel, DestinationSettler.confirm.selector);
    }

    function test_resolve_onSightOrder_hasOnlyTheFillStep() public {
        (bytes32 id, OrderData memory d) = _open(50e6);
        vm.chainId(ORIGIN);
        IResolver.ResolvedOrder memory r = resolver.resolve(abi.encode(id, d));
        assertEq(r.steps.length, 1);
    }

    function test_interop_matchesErc7930Example() public view {
        // ERC-7930 Example 1: Ethereum mainnet, 0xd8dA…6045.
        assertEq(
            resolver.interop(1, 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045),
            hex"00010000010114d8da6bf26964af9d7eed9e03e53415d37aa96045"
        );
        assertEq(resolver.interop(84532, address(0)).length, 2 + 2 + 1 + 3 + 1 + 20);
    }

    function test_resolve_describesFillStepAndPayment() public {
        (bytes32 id, OrderData memory d) = _open(1_000e6);
        vm.chainId(ORIGIN);
        IResolver.ResolvedOrder memory r = resolver.resolve(abi.encode(id, d));

        assertEq(r.steps.length, 2, "30 s tier: fill, then confirm");
        assertEq(_selector(r.steps[0]), IStep.Call.selector);
        (bytes memory target, bytes4 sel, bytes[] memory args, bytes[] memory attrs) =
            abi.decode(_args(r.steps[0]), (bytes, bytes4, bytes[], bytes[]));
        assertEq(target, resolver.interop(DEST, address(dest)));
        assertEq(sel, DestinationSettler.fill.selector);
        assertEq(args.length, 3);
        (string memory empty, bytes32 framedId) = abi.decode(args[0], (string, bytes32));
        assertEq(bytes(empty).length, 0);
        assertEq(framedId, id);
        (, OrderData memory framedOrder) = abi.decode(args[1], (string, OrderData));
        assertEq(keccak256(abi.encode(framedOrder)), keccak256(abi.encode(d)));
        assertEq(abi.decode(args[2], (uint256)), 0, "repayTo is variable 0");
        assertEq(attrs.length, 4);

        assertEq(r.variables.length, 1);
        assertEq(r.variables[0], abi.encodeCall(IVariableRole.PaymentRecipient, ()));

        assertEq(r.payments.length, 1);
        assertEq(_selector(r.payments[0]), IPayment.ERC20.selector);
        (bytes memory token, bytes memory sender,, uint256 recipientVar, uint256 onStep, uint256 delay) =
            abi.decode(_args(r.payments[0]), (bytes, bytes, bytes, uint256, uint256, uint256));
        assertEq(token, resolver.interop(ORIGIN, address(usdcOrigin)));
        assertEq(sender, resolver.interop(ORIGIN, address(escrow)));
        assertEq(recipientVar, 0);
        assertEq(onStep, 0);
        assertEq(delay, 30 + LOOP, "tier delay + loop latency");

        assertEq(r.assumptions.length, 2);
        assertEq(r.assumptions[0].name, "reactive-settlement");
        (uint256 chain, address who) = abi.decode(r.assumptions[0].data, (uint256, address));
        assertEq(chain, REACTIVE);
        assertEq(who, address(rc));
        assertEq(r.assumptions[1].name, "reactive-origin-finality");
    }

    function test_resolve_delayFollowsTier() public {
        (bytes32 a, OrderData memory da) = _open(50e6);
        (bytes32 b, OrderData memory db) = _open(50_000e6);
        vm.chainId(ORIGIN);
        (,,,,, uint256 delayA) =
            abi.decode(_args(resolver.resolve(abi.encode(a, da)).payments[0]), (bytes, bytes, bytes, uint256, uint256, uint256));
        (,,,,, uint256 delayB) =
            abi.decode(_args(resolver.resolve(abi.encode(b, db)).payments[0]), (bytes, bytes, bytes, uint256, uint256, uint256));
        assertEq(delayA, LOOP);
        assertEq(delayB, 300 + LOOP);
    }

    /// @notice A generic solver following only the resolved order can fill it, and gets paid.
    function test_genericSolver_executesResolvedOrder_andIsPaid() public {
        (bytes32 id, OrderData memory d) = _open(50e6);
        vm.chainId(ORIGIN);
        IResolver.ResolvedOrder memory r = resolver.resolve(abi.encode(id, d));
        (, bytes4 sel, bytes[] memory args,) = abi.decode(_args(r.steps[0]), (bytes, bytes4, bytes[], bytes[]));

        // Build call data: constants are unframed, variable 0 (PaymentRecipient) is the solver's choice.
        bytes memory data = abi.encodePacked(sel);
        for (uint256 i = 0; i < args.length; ++i) {
            if (args[i].length == 32) {
                assertEq(abi.decode(args[i], (uint256)), 0);
                data = bytes.concat(data, abi.encode(solverRepay));
            } else {
                data = bytes.concat(data, _unframe(args[i]));
            }
        }

        vm.chainId(DEST);
        vm.recordLogs();
        vm.prank(solver);
        (bool ok,) = address(dest).call(data);
        assertTrue(ok, "resolved step executes");
        _deliver(vm.getRecordedLogs(), DEST, address(dest));
        _runCallbacks();
        assertEq(usdcOrigin.balanceOf(solverRepay), 50e6, "payment arrived as described");
    }

    function test_resolve_rejectsWrongTermsSettledAndExpired() public {
        (bytes32 id, OrderData memory d) = _open(50e6);
        OrderData memory bad = _copy(d);
        bad.outputAmount = 1;
        vm.chainId(ORIGIN);
        vm.expectRevert(SnapsettleResolver.TermsMismatch.selector);
        resolver.resolve(abi.encode(id, bad));

        vm.warp(d.fillDeadline);
        vm.expectRevert(SnapsettleResolver.OrderExpired.selector);
        resolver.resolve(abi.encode(id, d));

        vm.warp(d.fillDeadline - 1);
        _fill(id, d);
        _runCallbacks();
        vm.chainId(ORIGIN);
        vm.expectRevert(SnapsettleResolver.OrderNotOpen.selector);
        resolver.resolve(abi.encode(id, d));
    }
}
