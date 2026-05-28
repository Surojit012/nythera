// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import "./AccessConditionV2.sol";

interface Vm {
    function prank(address) external;
}

contract AccessConditionV2Test {
    Vm private constant vm = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));
    AccessConditionV2 private condition;
    address private constant CREATOR = address(0x1001);
    address private constant GUARDIAN = address(0x2002);
    address private constant OTHER = address(0x3003);

    function setUp() public {
        condition = new AccessConditionV2();
    }

    function testCreatorCanReadAndWrite() public {
        bytes memory conditionData = _conditionData();
        _assertTrue(condition.checkReadCondition(CREATOR, conditionData, ""));
        _assertTrue(condition.checkWriteCondition(CREATOR, conditionData, ""));
    }

    function testInitialGuardianCanReadButNotWrite() public {
        bytes memory conditionData = _conditionData();
        _assertTrue(condition.checkReadCondition(GUARDIAN, conditionData, ""));
        _assertFalse(condition.checkWriteCondition(GUARDIAN, conditionData, ""));
    }

    function testNonGuardianCannotRead() public {
        _assertFalse(condition.checkReadCondition(OTHER, _conditionData(), ""));
    }

    function testCreatorCanAddOverride() public {
        bytes memory conditionData = _conditionData();
        vm.prank(CREATOR);
        condition.setAccessOverride(conditionData, OTHER, true);
        _assertTrue(condition.checkReadCondition(OTHER, conditionData, ""));
    }

    function testCreatorCanRemoveInitialGuardianWithOverride() public {
        bytes memory conditionData = _conditionData();
        vm.prank(CREATOR);
        condition.setAccessOverride(conditionData, GUARDIAN, false);
        _assertFalse(condition.checkReadCondition(GUARDIAN, conditionData, ""));
    }

    function testNonCreatorCannotEditOverrides() public {
        bytes memory conditionData = _conditionDataFor(OTHER);
        bool reverted;
        try condition.setAccessOverride(conditionData, GUARDIAN, true) {
            reverted = false;
        } catch {
            reverted = true;
        }
        _assertTrue(reverted);
    }

    function _conditionData() private pure returns (bytes memory) {
        return _conditionDataFor(CREATOR);
    }

    function _conditionDataFor(address creator) private pure returns (bytes memory) {
        address[] memory readers = new address[](1);
        readers[0] = GUARDIAN;
        return abi.encode(creator, readers);
    }

    function _assertTrue(bool value) private pure {
        if (!value) revert("assert true failed");
    }

    function _assertFalse(bool value) private pure {
        if (value) revert("assert false failed");
    }
}
