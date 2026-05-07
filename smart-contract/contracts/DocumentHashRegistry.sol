// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract DocumentHashRegistry {
    mapping(bytes32 => bool) private hashExists;
    address public owner;

    event HashStored(bytes32 indexed hash, address indexed storedBy, uint256 timestamp);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can store hash");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function storeHash(bytes32 _hash) external onlyOwner {
        require(!hashExists[_hash], "Hash already stored");
        hashExists[_hash] = true;
        emit HashStored(_hash, msg.sender, block.timestamp);
    }

    function verifyHash(bytes32 _hash) external view returns (bool) {
        return hashExists[_hash];
    }
}
