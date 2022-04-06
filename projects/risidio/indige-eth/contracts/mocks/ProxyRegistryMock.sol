// SPDX-License-Identifier: MIT
pragma solidity ^0.8.12;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract MockOwnableDelegateProxy {
    function simulateSale(
        IERC20 _token,
        uint256 _tokenID,
        address _from,
        address _to
    )
        external
    {
        _token.transferFrom(_from, _to, _tokenID);
    }
}

contract ProxyRegistryMock {
    mapping(address => MockOwnableDelegateProxy) public proxies;

    function registerProxy()
        public
        returns (MockOwnableDelegateProxy proxy)
    {
        require(address(proxies[msg.sender]) == address(0x0));
        proxy = new MockOwnableDelegateProxy();
        proxies[msg.sender] = proxy;
        return proxy;
    }
}