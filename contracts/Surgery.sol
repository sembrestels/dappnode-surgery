// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.23;

import "./interfaces/IERC20.sol";

contract Surgery {

    // The storage slot where the address of the bypass contract is stored
    // uint private constant BYPASS_SLOT = uint(keccak256("surgery.bypass"));
    uint private constant BYPASS_SLOT = 0x53edf09d858352d72f64ef79097f9ffaee955e2757de83b69ff2afe447984250;

    event Operation(uint256 slot, uint256 value, uint256 offset, uint256 size);
    event Withdrawal(address token, address to, uint amount);
    event BypassSet(address target);

    error OffsetTooBig();
    error SizeTooBig();
    error ValueTooBig();
    error BypassNotSet();
    error NoPaymentsAccepted();

    function operate(uint256 slot, uint256 value) external {
        assembly {
            sstore(slot, value)
        }

        emit Operation(slot, value, 0, 32);
    }

    /**
     * @notice Update a portion of the storage value at the slot `slot` with the value `value`, without affecting the
     * surrounding data, starting at byte offset `offset` and with a size of `size` bytes
     * @param slot The storage slot where the value is stored.
     * @param value The new value to be stored in the specified portion of the storage slot.
     * @param offset The right-to-left byte offset within the storage slot where the new value will be placed (0 to 31).
     * @param size The size in bytes of the value to be updated (1 to 32).
     */
    function operate(uint256 slot, uint256 value, uint256 offset, uint256 size) external {
        if (offset >= 32) {
            revert OffsetTooBig();
        }
        if (size > 32 && offset + size > 32) { // We check both because of a possible overflow
            revert SizeTooBig();
        }
        // When size is 32, 2**(size * 8) overflows, but it's still valid as `2**(32 * 8) - 1` overflow back to the maximum possible value.
        if (value > 2 ** (size * 8) - 1) {
            revert ValueTooBig();
        } 
        assembly {
            let originalValue := sload(slot)
            let updateMask := sub(exp(2, mul(size, 8)), 1) // Create the mask based on the size in bytes
            let shiftedUpdateMask := mul(updateMask, exp(2, mul(offset, 8))) // Shift the mask according to the offset by multiplying instead of using shl
            let shiftedValue := mul(value, exp(2, mul(offset, 8))) // Shift the value by multiplying instead of using shl
            let updatedValue := or(and(originalValue, not(shiftedUpdateMask)), and(shiftedValue, shiftedUpdateMask))
            sstore(slot, updatedValue)
        }

        emit Operation(slot, value, offset, size);
    }

    /**
     * @notice Call a contract at the address `target` with the data `data` and the value `msg.value`
     * @param _target The address of the contract to call
     * @param _data The data to be sent to the contract
     */
    function call(address _target, bytes memory _data) public payable {
        (bool success, bytes memory returnData) = _target.call{value: msg.value}(_data);
        require(success, string(returnData));
    }

    /**
     * @notice Withdraw the balance of the contract to the address `to`
     * @param _token The address of the token to withdraw, or 0x0 for ETH
     * @param _to The address to send the balance to
     */
    function withdraw(address _token, address payable _to) public {
        if (_token == address(0)) {
            _to.transfer(address(this).balance);
            emit Withdrawal(_token, _to, address(this).balance);
        } else {
            IERC20 token = IERC20(_token);
            uint256 balance = token.balanceOf(address(this));
            token.transfer(_to, balance);
            emit Withdrawal(_token, _to, balance);
        }
    }

    function getBypass() public view returns (address bypass) {
        assembly {
            bypass := sload(BYPASS_SLOT)
        }
    }

    function setBypass(address _target) public {
        assembly {
            sstore(BYPASS_SLOT, _target)
        }
        emit BypassSet(_target);
    }


    function _delegate(address _implementation) internal virtual {
        assembly {
            // Copy msg.data. We take full control of memory in this inline assembly
            // block because it will not return to Solidity code. We overwrite the
            // Solidity scratch pad at memory position 0.

            // calldatacopy(t, f, s) - copy s bytes from calldata at position f to mem at position t
            // calldatasize() - size of call data in bytes
            calldatacopy(0, 0, calldatasize())

            // Call the implementation.
            // out and outsize are 0 because we don't know the size yet.

            // delegatecall(g, a, in, insize, out, outsize) -
            // - call contract at address a
            // - with input mem[in…(in+insize))
            // - providing g gas
            // - and output area mem[out…(out+outsize))
            // - returning 0 on error (eg. out of gas) and 1 on success
            let result := delegatecall(gas(), _implementation, 0, calldatasize(), 0, 0)

            // Copy the returned data.
            // returndatacopy(t, f, s) - copy s bytes from returndata at position f to mem at position t
            // returndatasize() - size of the last returndata
            returndatacopy(0, 0, returndatasize())

            switch result
            // delegatecall returns 0 on error.
            case 0 {
                // revert(p, s) - end execution, revert state changes, return data mem[p…(p+s))
                revert(0, returndatasize())
            }
            default {
                // return(p, s) - end execution, return data mem[p…(p+s))
                return(0, returndatasize())
            }
        }
    }

    function _fallback() private {
        _delegate(getBypass());
    }

    fallback() external payable {
        _fallback();
    }

    receive() external payable {
        _fallback();
    }
}
