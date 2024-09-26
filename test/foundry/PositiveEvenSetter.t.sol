// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;

import "../../lib/forge-std/src/Test.sol";
import "../../contracts/PositiveEvenSetter.sol";

contract PositiveEvenSetterTest is Test {
    PositiveEvenSetter positiveEvenSetter;

    address public owner;

    function setUp() public {
        owner = address(1);

        vm.startPrank(owner);

        positiveEvenSetter = new PositiveEvenSetter();

        vm.stopPrank();
    }

    function testDeployment() public {
        assertEq(address(positiveEvenSetter.owner()), owner);
        assertEq(positiveEvenSetter.positiveEven(), 2);
    }

    function testSetNewPositiveEven() public {
        uint256 newPositiveEven = 4;

        vm.startPrank(owner);

        positiveEvenSetter.setPositiveEven(newPositiveEven);

        vm.stopPrank();

        assertEq(positiveEvenSetter.positiveEven(), newPositiveEven);
    }

    function testFail_SetPositiveEvenToZero() public {
        vm.startPrank(owner);

        positiveEvenSetter.setPositiveEven(0);
    }

    // Test setting an odd number (should revert)
    function testSetPositiveEvenToOdd() public {
        vm.expectRevert();

        positiveEvenSetter.setPositiveEven(3);
    }

    function testFail_RevertNonOwnerSet() public {
        uint256 newPositiveEven = 4;

        positiveEvenSetter.setPositiveEven(newPositiveEven);
    }
}
