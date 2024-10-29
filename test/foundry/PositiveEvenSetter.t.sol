// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;

import {Test} from "forge-std/Test.sol";
import {PositiveEvenSetter} from "contracts/PositiveEvenSetter.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract PositiveEvenSetterTest is Test {
    PositiveEvenSetter positiveEvenSetter;

    address public owner;
    address public alice;

    function setUp() public {
        owner = makeAddr("owner");
        alice = makeAddr("alice");

        vm.prank(owner);

        positiveEvenSetter = new PositiveEvenSetter();
    }

    function testConstructor() public {
        assertEq(address(positiveEvenSetter.owner()), owner);
        assertEq(positiveEvenSetter.positiveEven(), 2);
    }

    function testSetNewPositiveEven() public {
        uint256 newPositiveEven = 4;

        vm.expectEmit();
        emit PositiveEvenSetter.PositiveEvenSet(2, newPositiveEven);

        vm.prank(owner);

        positiveEvenSetter.setPositiveEven(newPositiveEven);

        assertEq(positiveEvenSetter.positiveEven(), newPositiveEven);
    }

    function testSetPositiveEvenToZero() public {
        vm.expectRevert(PositiveEvenSetter.SetPositiveNumberToZero.selector);

        vm.prank(owner);

        positiveEvenSetter.setPositiveEven(0);
    }

    function testSetPositiveEvenToOdd() public {
        vm.expectRevert(abi.encodeWithSelector(PositiveEvenSetter.SetEvenToOddNumber.selector, 3));

        vm.prank(owner);

        positiveEvenSetter.setPositiveEven(3);
    }

    function testRevertNonOwnerSet() public {
        uint256 newPositiveEven = 4;

        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, alice));

        vm.prank(alice);

        positiveEvenSetter.setPositiveEven(newPositiveEven);
    }
}
