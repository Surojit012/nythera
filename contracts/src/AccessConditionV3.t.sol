// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import "./AccessConditionV3.sol";

interface VmV3 {
    function prank(address) external;
    function prank(address, address) external;
}

contract AccessConditionV3Test {
    VmV3 private constant vm = VmV3(address(uint160(uint256(keccak256("hevm cheat code")))));
    AccessConditionV3 private condition;
    address private constant CREATOR = address(0x1001);
    address private constant GUARDIAN = address(0x2002);
    address private constant OTHER = address(0x3003);

    function setUp() public {
        condition = new AccessConditionV3();
    }

    function testCreatorCanReadAndWriteWithExplicitCaller() public {
        bytes memory conditionData = _conditionData();
        _assertTrue(condition.checkReadCondition(CREATOR, conditionData, ""));
        _assertTrue(condition.checkWriteCondition(CREATOR, conditionData, ""));
    }

    function testCreatorCanWriteThroughCdrCompatibleOverload() public {
        vm.prank(CREATOR, CREATOR);
        _assertTrue(condition.checkWriteCondition(1, _conditionData(), ""));
    }

    function testOtherCannotWriteThroughCdrCompatibleOverload() public {
        vm.prank(OTHER, OTHER);
        _assertFalse(condition.checkWriteCondition(1, _conditionData(), ""));
    }

    function testInitialGuardianCanReadButNotWrite() public {
        bytes memory conditionData = _conditionData();
        _assertTrue(condition.checkReadCondition(GUARDIAN, conditionData, ""));
        _assertFalse(condition.checkWriteCondition(GUARDIAN, conditionData, ""));
    }

    function testCreatorCanRemoveInitialGuardianWithOverride() public {
        bytes memory conditionData = _conditionData();
        vm.prank(CREATOR);
        condition.setAccessOverride(conditionData, GUARDIAN, false);
        _assertFalse(condition.checkReadCondition(GUARDIAN, conditionData, ""));
    }

    function testNonCreatorCannotEditOverrides() public {
        bool reverted;
        try condition.setAccessOverride(_conditionData(), OTHER, true) {
            reverted = false;
        } catch {
            reverted = true;
        }
        _assertTrue(reverted);
    }

    function _conditionData() private pure returns (bytes memory) {
        address[] memory readers = new address[](1);
        readers[0] = GUARDIAN;
        return abi.encode(CREATOR, readers);
    }

    function _assertTrue(bool value) private pure {
        if (!value) revert("assert true failed");
    }

    function _assertFalse(bool value) private pure {
        if (value) revert("assert false failed");
    }
}
