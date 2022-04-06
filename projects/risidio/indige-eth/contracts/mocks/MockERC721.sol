// SPDX-License-Identifier: MIT
pragma solidity ^0.8.12;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract MockERC721 is ERC721("MockERC721", "MOCK721") {
    constructor(uint _numToMint) {
        for (uint i; i < _numToMint; i += 1) {
            _mint(_msgSender(), i);
        }
    }
}