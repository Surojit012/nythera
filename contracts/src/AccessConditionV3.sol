// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

/// @title AccessConditionV3
/// @notice CDR condition that stores creator/initial guardians in conditionData.
/// @dev CDR calls 3-argument condition methods from the CDR contract, so this
/// contract uses tx.origin in those overloads to evaluate the transaction signer.
contract AccessConditionV3 {
    struct AccessOverride {
        bool set;
        bool allowed;
    }

    mapping(bytes32 accessKey => mapping(address account => AccessOverride)) private accessOverrides;

    error EmptyCreator();
    error NotCreator();

    event AccessOverrideSet(bytes32 indexed accessKey, address indexed account, bool allowed);

    function setAccessOverride(bytes calldata conditionData, address account, bool allowed) external {
        (address creator,) = _decodeConditionData(conditionData);
        if (creator == address(0)) revert EmptyCreator();
        if (msg.sender != creator) revert NotCreator();

        accessOverrides[keccak256(conditionData)][account] = AccessOverride({ set: true, allowed: allowed });
        emit AccessOverrideSet(keccak256(conditionData), account, allowed);
    }

    function checkWriteCondition(
        uint32,
        bytes calldata conditionData,
        bytes calldata
    ) external view returns (bool) {
        return _canWrite(tx.origin, conditionData);
    }

    function checkReadCondition(
        uint32,
        bytes calldata conditionData,
        bytes calldata
    ) external view returns (bool) {
        return _canRead(tx.origin, conditionData);
    }

    function checkWriteCondition(
        address caller,
        bytes calldata conditionData,
        bytes calldata
    ) external view returns (bool) {
        return _canWrite(caller, conditionData);
    }

    function checkReadCondition(
        address caller,
        bytes calldata conditionData,
        bytes calldata
    ) external view returns (bool) {
        return _canRead(caller, conditionData);
    }

    function checkWriteCondition(
        uint32,
        bytes calldata conditionData,
        bytes calldata,
        address caller
    ) external view returns (bool) {
        return _canWrite(caller, conditionData);
    }

    function checkReadCondition(
        uint32,
        bytes calldata conditionData,
        bytes calldata,
        address caller
    ) external view returns (bool) {
        return _canRead(caller, conditionData);
    }

    function getAccessOverride(bytes calldata conditionData, address account) external view returns (bool set, bool allowed) {
        AccessOverride memory overrideState = accessOverrides[keccak256(conditionData)][account];
        return (overrideState.set, overrideState.allowed);
    }

    function _canWrite(address caller, bytes calldata conditionData) private pure returns (bool) {
        if (conditionData.length < 96) return false;
        (address creator,) = _decodeConditionData(conditionData);
        return caller == creator;
    }

    function _canRead(address caller, bytes calldata conditionData) private view returns (bool) {
        if (conditionData.length < 96) return false;
        (address creator, address[] memory initialReaders) = _decodeConditionData(conditionData);
        if (caller == creator) return true;

        AccessOverride memory overrideState = accessOverrides[keccak256(conditionData)][caller];
        if (overrideState.set) return overrideState.allowed;

        for (uint256 i = 0; i < initialReaders.length; i++) {
            if (caller == initialReaders[i]) return true;
        }

        return false;
    }

    function _decodeConditionData(bytes calldata conditionData) private pure returns (address creator, address[] memory initialReaders) {
        return abi.decode(conditionData, (address, address[]));
    }
}
