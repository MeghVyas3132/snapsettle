// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

import {ISystemContract} from "@reactive/src/interfaces/ISystemContract.sol";

/// @notice Stand-in for the Omni system contract at 0x8888…8888 (etched in tests). Records subscriptions
///         and callback requests so tests can assert on them and replay callbacks through a fake proxy.
///         reactive-test-lib only models the legacy RVM system, hence this minimal Omni mock.
contract MockSystem {
    struct Sub {
        uint256 chainId;
        address contractAddr;
        uint256 topic0;
    }

    struct CallbackReq {
        address sender;
        uint256 chainId;
        address recipient;
        uint64 gasLimit;
        bytes payload;
    }

    mapping(bytes32 => bool) public subscribed;
    CallbackReq[] internal _callbacks;

    function _key(address rc, uint256 chainId, address c, uint256 t0) internal pure returns (bytes32) {
        return keccak256(abi.encode(rc, chainId, c, t0));
    }

    function isSubscribed(address rc, uint256 chainId, address c, uint256 t0) external view returns (bool) {
        return subscribed[_key(rc, chainId, c, t0)];
    }

    function subscribe(uint256 chainId, address c, uint256 t0, uint256, uint256, uint256) external {
        subscribed[_key(msg.sender, chainId, c, t0)] = true;
    }

    function unsubscribe(uint256 chainId, address c, uint256 t0, uint256, uint256, uint256) external {
        subscribed[_key(msg.sender, chainId, c, t0)] = false;
    }

    function requestCallbackV_1_0(ISystemContract.CallbackConfiguration_V_1_0 memory cfg) external {
        _callbacks.push(CallbackReq(msg.sender, cfg.chainId, cfg.recipient, cfg.gasLimit, cfg.payload));
    }

    function callbackCount() external view returns (uint256) {
        return _callbacks.length;
    }

    function callbackAt(uint256 i) external view returns (CallbackReq memory) {
        return _callbacks[i];
    }

    function debt(address) external pure returns (uint256) {
        return 0;
    }

    receive() external payable {}
}
