// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

contract BacchaFestivalSBT is ERC721, Ownable {
    using ECDSA for bytes32;

    uint256 private _nextTokenId = 1;
    mapping(uint256 => string) private _tokenURIs;
    mapping(string => bool) public usedTicketIds;
    address public voucherSigner;

    constructor(address initialOwner, address initialVoucherSigner)
        ERC721("Baccha Festival SBT", "BACCHA-SBT")
        Ownable(initialOwner)
    {
        require(initialVoucherSigner != address(0), "Invalid voucher signer");
        voucherSigner = initialVoucherSigner;
    }

    function setVoucherSigner(address newVoucherSigner) external onlyOwner {
        require(newVoucherSigner != address(0), "Invalid voucher signer");
        voucherSigner = newVoucherSigner;
    }

    function mintSoulbound(address to, string memory tokenURI_) external onlyOwner returns (uint256) {
        require(to != address(0), "Invalid recipient");

        uint256 tokenId = _nextTokenId;
        _nextTokenId += 1;

        _safeMint(to, tokenId);
        _tokenURIs[tokenId] = tokenURI_;

        return tokenId;
    }

    function mintWithVoucher(
        address to,
        string memory tokenURI_,
        string memory ticketId,
        uint256 expiry,
        bytes memory signature
    ) external returns (uint256) {
        require(to != address(0), "Invalid recipient");
        require(block.timestamp <= expiry, "Voucher expired");
        require(!usedTicketIds[ticketId], "Ticket already used");

        bytes32 digest = keccak256(
            abi.encodePacked(address(this), block.chainid, to, tokenURI_, ticketId, expiry)
        );
        bytes32 ethSignedDigest = MessageHashUtils.toEthSignedMessageHash(digest);
        address recovered = ECDSA.recover(ethSignedDigest, signature);
        require(recovered == voucherSigner, "Invalid voucher signature");

        usedTicketIds[ticketId] = true;

        uint256 tokenId = _nextTokenId;
        _nextTokenId += 1;

        _safeMint(to, tokenId);
        _tokenURIs[tokenId] = tokenURI_;

        return tokenId;
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireOwned(tokenId);
        return _tokenURIs[tokenId];
    }

    function transferFrom(address, address, uint256) public pure override {
        revert("Soulbound: non-transferable");
    }

    function safeTransferFrom(address, address, uint256, bytes memory) public pure override {
        revert("Soulbound: non-transferable");
    }

    function approve(address, uint256) public pure override {
        revert("Soulbound: approvals disabled");
    }

    function setApprovalForAll(address, bool) public pure override {
        revert("Soulbound: approvals disabled");
    }
}
