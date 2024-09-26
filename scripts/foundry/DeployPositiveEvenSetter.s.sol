// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;

import "../../lib/forge-std/src/Script.sol";

import {PositiveEvenSetter} from "../../contracts/PositiveEvenSetter.sol";

contract DeployPositiveEvenSetter is Script {
    function run() public returns (PositiveEvenSetter positiveEvenSetter) {
        vm.startBroadcast(vm.envUint("PRIVATE_KEY"));

        positiveEvenSetter = new PositiveEvenSetter();

        vm.stopBroadcast();
    }
}
