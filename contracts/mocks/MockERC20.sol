// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity 0.8.27;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";

contract ERC20Mock is ERC20, ERC20Permit {
    constructor(uint256 totalSupply) ERC20("Mock Token", "MOCK") ERC20Permit("Mock Token") {
        _mint(msg.sender, totalSupply);
    }
}
