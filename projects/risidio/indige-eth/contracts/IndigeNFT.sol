//SPDX-License-Identifier: MIT
pragma solidity ^0.8.12;

import "./token/ERC721Enumerable.sol";
import "./token/ERC2981ContractWideRoyalties.sol";
import "./token/TokenRescuer.sol";

error AlreadyFinalizedSupply();
error AlreadyRevokedRegistryApproval();
error AlreadySetProvenanceHash();
error ExceedsMaxMintPerTransaction();
error ExceedsMaxRoyaltiesPercentage();
error TokenDoesNotExist();

/**
 * @author Aaron Hanson <coffee.becomes.code@gmail.com>
 */
contract IndigeNFT is
    ERC721Enumerable,
    ERC2981ContractWideRoyalties,
    TokenRescuer
{
    uint256 public constant MAX_MINT_PER_TX = 50;

    /// The maximum ERC-2981 royalties percentage
    uint256 public constant MAX_ROYALTIES_PCT = 1000; // 10%

    string public baseURI;
    string public provenanceHash;

    bool public supplyFinalized;

    address public proxyRegistry;

    mapping(address => bool) public userRevokedRegistryApproval;
    mapping(address => bool) public projectProxy;

    constructor(
        string memory _name,
        string memory _symbol,
        string memory _baseURI,
        address _proxyRegistry,
        uint256 _royaltiesPercentage
    )
        ERC721(_name, _symbol)
    {
        baseURI = _baseURI;
        proxyRegistry = _proxyRegistry;
        setRoyalties(_msgSender(), _royaltiesPercentage);
    }

    function batchTransferFrom(
        address _from,
        address _to,
        uint256[] calldata _tokenIDs
    )
        external
    {
        unchecked {
            for (uint256 i = 0; i < _tokenIDs.length; i++) {
                transferFrom(_from, _to, _tokenIDs[i]);
            }
        }
    }

    function batchSafeTransferFrom(
        address _from,
        address _to,
        uint256[] calldata _tokenIDs,
        bytes calldata _data
    )
        external
    {
        unchecked {
            for (uint256 i = 0; i < _tokenIDs.length; i++) {
                safeTransferFrom(_from, _to, _tokenIDs[i], _data);
            }
        }
    }

    function revokeRegistryApproval()
        external
    {
        if (userRevokedRegistryApproval[_msgSender()] == true)
            revert AlreadyRevokedRegistryApproval();

        userRevokedRegistryApproval[_msgSender()] = true;
    }

    function mint(
        uint256 _mintAmount
    )
        external
        onlyOwner
    {
        if (supplyFinalized == true)
            revert AlreadyFinalizedSupply();

        if (_mintAmount > MAX_MINT_PER_TX)
            revert ExceedsMaxMintPerTransaction();

        uint256 totalSupply = _owners.length;
        unchecked {
            for(uint256 i; i < _mintAmount; i++) {
                _mint(_msgSender(), totalSupply + i);
            }
        }
    }

    function finalizeSupply()
        external
        onlyOwner
    {
        if (supplyFinalized == true) revert AlreadyFinalizedSupply();

        supplyFinalized = true;
    }

    function setProvenanceHash(
        string calldata _provenanceHash
    )
        external
        onlyOwner
    {
        if (bytes(provenanceHash).length > 0)
            revert AlreadySetProvenanceHash();

        provenanceHash = _provenanceHash;
    }

    function setProxyRegistry(
        address _newProxyRegistry
    )
        external
        onlyOwner
    {
        proxyRegistry = _newProxyRegistry;
    }

    function toggleProjectProxy(
        address _proxy
    )
        external
        onlyOwner
    {
        projectProxy[_proxy] = !projectProxy[_proxy];
    }

    function setBaseURI(
        string calldata _newBaseURI
    )
        external
        onlyOwner
    {
        baseURI = _newBaseURI;
    }

    function setRoyalties(
        address _recipient,
        uint256 _value
    )
        public
        onlyOwner
    {
        if(_value > MAX_ROYALTIES_PCT) revert ExceedsMaxRoyaltiesPercentage();

        _setRoyalties(
            _recipient,
            _value
        );
    }

    function isOwnerOf(
        address _account,
        uint256[] calldata _tokenIDs
    )
        external
        view
        returns (bool)
    {
        unchecked {
            for(uint256 i; i < _tokenIDs.length; ++i ){
                if(_owners[_tokenIDs[i]] != _account)
                    return false;
            }
        }
        return true;
    }

    function walletOfOwner(
        address _owner
    )
        public
        view
        returns (uint256[] memory)
    {
        uint256 tokenCount = balanceOf(_owner);
        if (tokenCount == 0) return new uint256[](0);

        uint256[] memory tokenIDs = new uint256[](tokenCount);
        unchecked {
            for (uint256 i; i < tokenCount; i++) {
                tokenIDs[i] = tokenOfOwnerByIndex(_owner, i);
            }
        }
        return tokenIDs;
    }

    function isApprovedForAll(
        address _owner,
        address _operator
    )
        public
        view
        override (ERC721, IERC721)
        returns (bool)
    {
        if (projectProxy[_operator]) return true;

        if (!userRevokedRegistryApproval[_owner]) {
            OpenSeaProxyRegistry registry = OpenSeaProxyRegistry(proxyRegistry);
            if (address(registry.proxies(_owner)) == _operator) return true;
        }

        return super.isApprovedForAll(_owner, _operator);
    }

    function tokenURI(
        uint256 _tokenID
    )
        public
        view
        override
        returns (string memory)
    {
        if (!_exists(_tokenID)) revert TokenDoesNotExist();
        return string(abi.encodePacked(baseURI, Strings.toString(_tokenID)));
    }

    /// @inheritdoc	ERC165
    function supportsInterface(
        bytes4 _interfaceId
    )
        public
        view
        override (ERC721Enumerable, ERC2981Base)
        returns (bool)
    {
        return super.supportsInterface(_interfaceId);
    }

    function _mint(
        address _to,
        uint256 _tokenID
    )
        internal
        override
    {
        _owners.push(_to);
        emit Transfer(address(0), _to, _tokenID);
    }
}

contract OwnableDelegateProxy {}

contract OpenSeaProxyRegistry {
    mapping(address => OwnableDelegateProxy) public proxies;
}

// TODO
// ERC-2981