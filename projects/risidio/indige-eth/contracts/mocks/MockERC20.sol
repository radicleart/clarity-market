// SPDX-License-Identifier: MIT
pragma solidity ^0.8.12;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockERC20 is ERC20("MockERC20", "MOCK20") {
    constructor(uint _numToMint) {
        _mint(_msgSender(), _numToMint);
    }
}