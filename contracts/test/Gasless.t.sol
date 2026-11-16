// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

import {Vm} from "forge-std/Test.sol";
import {OrderData} from "../src/OrderTypes.sol";
import {OriginEscrow} from "../src/OriginEscrow.sol";
import {SnapsettleHarness} from "./helpers/SnapsettleHarness.sol";

/// @notice Gasless opening (`openFor`): the user signs one EIP-3009 authorization, anyone submits it.
contract GaslessTest is SnapsettleHarness {
    address signer;
    uint256 signerKey;
    address relayer = makeAddr("relayer");

    function setUp() public override {
        super.setUp();
        (signer, signerKey) = makeAddrAndKey("gasless user");
        usdcOrigin.mint(signer, 1_000e6);
        vm.warp(1_000_000);
    }

    /// @dev What a wallet signs: EIP-712 ReceiveWithAuthorization on the token's domain, nonce bound to the order.
    function _sign(OrderData memory d, uint256 validBefore, bytes32 nonce) internal view returns (bytes memory) {
        bytes32 structHash = keccak256(
            abi.encode(usdcOrigin.RECEIVE_WITH_AUTHORIZATION_TYPEHASH(), signer, address(escrow), d.inputAmount, uint256(0), validBefore, nonce)
        );
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", usdcOrigin.DOMAIN_SEPARATOR(), structHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(signerKey, digest);
        return abi.encodePacked(r, s, v);
    }

    function _signed(uint256 amount) internal returns (OrderData memory d, bytes memory sig) {
        d = _order(amount, amount * 99 / 100, uint32(block.timestamp + 1 hours));
        vm.chainId(ORIGIN);
        sig = _sign(d, block.timestamp + 5 minutes, escrow.gaslessNonce(d));
    }

    function test_openFor_relayerPaysGas_userOwnsOrder_andItSettles() public {
        (OrderData memory d, bytes memory sig) = _signed(50e6);
        vm.recordLogs();
        vm.prank(relayer);
        bytes32 id = escrow.openFor(d, signer, 0, block.timestamp + 5 minutes, sig);
        Vm.Log[] memory logs = vm.getRecordedLogs();

        assertEq(usdcOrigin.balanceOf(signer), 950e6, "user's USDC pulled by signature alone");
        assertEq(usdcOrigin.balanceOf(relayer), 0, "relayer moved no funds of its own");
        (address owner,,,,,) = escrow.orders(id);
        assertEq(owner, signer, "the signer owns the order, not the relayer");

        _deliver(logs, ORIGIN, address(escrow));
        _fill(id, d);
        _runCallbacks();
        assertEq(uint8(_status(id)), uint8(OriginEscrow.Status.Settled));
        assertEq(usdcOrigin.balanceOf(solverRepay), 50e6, "solver repaid as for a normal order");
    }

    function test_openFor_refundGoesToTheSigner() public {
        (OrderData memory d, bytes memory sig) = _signed(50e6);
        vm.recordLogs();
        vm.prank(relayer);
        bytes32 id = escrow.openFor(d, signer, 0, block.timestamp + 5 minutes, sig);
        _deliver(vm.getRecordedLogs(), ORIGIN, address(escrow));

        vm.warp(uint256(d.fillDeadline) + GRACE + 1);
        vm.prank(relayer);
        vm.expectRevert(OriginEscrow.NotOrderUser.selector);
        escrow.requestRefund(id);

        vm.recordLogs();
        vm.prank(signer);
        escrow.requestRefund(id);
        _deliver(vm.getRecordedLogs(), ORIGIN, address(escrow));
        _runCallbacks();
        assertEq(usdcOrigin.balanceOf(signer), 1_000e6, "refund returns to the signer");
    }

    /// @notice A relayer cannot change any term: each change gives a different nonce, so the signature fails.
    function test_openFor_relayerCannotChangeTerms() public {
        (OrderData memory d, bytes memory sig) = _signed(50e6);

        OrderData memory worse = d;
        worse.outputAmount = d.outputAmount / 2; // pay the user less on the destination
        vm.prank(relayer);
        vm.expectRevert(bytes("FiatTokenV2: invalid signature"));
        escrow.openFor(worse, signer, 0, block.timestamp + 5 minutes, sig);

        OrderData memory redirected = d;
        redirected.recipient = relayer; // send the user's funds to someone else
        vm.prank(relayer);
        vm.expectRevert(bytes("FiatTokenV2: invalid signature"));
        escrow.openFor(redirected, signer, 0, block.timestamp + 5 minutes, sig);

        vm.prank(relayer);
        vm.expectRevert(bytes("FiatTokenV2: invalid signature"));
        escrow.openFor(d, relayer, 0, block.timestamp + 5 minutes, sig); // claim someone else's order

        assertEq(usdcOrigin.balanceOf(signer), 1_000e6, "nothing moved");
    }

    function test_openFor_signatureWorksOnce() public {
        (OrderData memory d, bytes memory sig) = _signed(50e6);
        vm.prank(relayer);
        escrow.openFor(d, signer, 0, block.timestamp + 5 minutes, sig);
        vm.prank(relayer);
        vm.expectRevert(bytes("FiatTokenV2: authorization is used or canceled"));
        escrow.openFor(d, signer, 0, block.timestamp + 5 minutes, sig);
        assertEq(usdcOrigin.balanceOf(signer), 950e6, "charged once");
    }

    function test_openFor_expiredAuthorizationRejected() public {
        (OrderData memory d, bytes memory sig) = _signed(50e6);
        vm.warp(block.timestamp + 5 minutes);
        vm.prank(relayer);
        vm.expectRevert(bytes("FiatTokenV2: authorization is expired"));
        escrow.openFor(d, signer, 0, block.timestamp, sig);
    }

    /// @notice The escrow's own checks (token pair, minimum, cap) apply before the signature is even used.
    function test_openFor_keepsEscrowChecks() public {
        OrderData memory dust = _order(MIN_ORDER - 1, MIN_ORDER - 1, uint32(block.timestamp + 1 hours));
        vm.chainId(ORIGIN);
        bytes memory sig = _sign(dust, block.timestamp + 5 minutes, escrow.gaslessNonce(dust));
        vm.prank(relayer);
        vm.expectRevert(abi.encodeWithSelector(OriginEscrow.BelowMinimum.selector, MIN_ORDER));
        escrow.openFor(dust, signer, 0, block.timestamp + 5 minutes, sig);

        OrderData memory other = _order(50e6, 49e6, uint32(block.timestamp + 1 hours));
        other.inputToken = address(usdcDest);
        vm.prank(relayer);
        vm.expectRevert(OriginEscrow.TokenNotAllowed.selector);
        escrow.openFor(other, signer, 0, block.timestamp + 5 minutes, sig);

        vm.prank(relayer);
        vm.expectRevert(OriginEscrow.ZeroUser.selector);
        escrow.openFor(dust, address(0), 0, block.timestamp + 5 minutes, sig);
    }
}
