import * as dotenv from "dotenv";
dotenv.config();

import { ethers } from "hardhat";

import { impersonateAccount } from "@nomicfoundation/hardhat-network-helpers";

import type { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import type { Addressable } from "ethers";

// Import ABIs
import erc20ABI from "@openzeppelin/contracts/build/contracts/ERC20.json";
import erc721ABI from "@openzeppelin/contracts/build/contracts/ERC721.json";
import erc1155ABI from "@openzeppelin/contracts/build/contracts/ERC1155.json";

/**
 * @dev Transfer ERC20 tokens from the holder to the recipient
 *
 * @param tokenAddress The address of the token contract
 * @param holder The address of the holder
 * @param recipient The address of the recipient
 * @param amount The amount of tokens to transfer, if not provided, the current balance of the holder will be used
 */
async function setERC20Balance(
    tokenAddress: string | Addressable,
    holder: string,
    recipient: HardhatEthersSigner | string,
    amount?: bigint | number
) {
    // Check if the network is forked
    await _isForking();

    // Impersonate holder
    await impersonateAccount(holder);
    const holderSigner = await ethers.getSigner(holder);

    // Get contract instance
    const contract = new ethers.Contract(tokenAddress, erc20ABI.abi, holderSigner);

    let balance: bigint | number;
    if (amount === undefined) {
        balance = await contract.balanceOf(holder);
    } else {
        balance = amount;
    }

    // Transfer tokens
    try {
        await contract.transfer(recipient, balance);
    } catch (error) {
        throw new Error(`Error: transferring tokens: ${error}`);
    }
}

/**
 * @dev Transfer ERC721 tokens from the holder to the recipient
 *
 * @param collectionAddress The address of the ERC721 collection contract
 * @param holder The address of the holder
 * @param recipient The address of the recipient
 * @param tokenId The ID of the token to transfer
 */
async function setERC721Balance(
    collectionAddress: string | Addressable,
    holder: string,
    recipient: HardhatEthersSigner | string,
    tokenId: bigint | number
) {
    // Check if the network is forked
    await _isForking();

    // Impersonate holder
    await impersonateAccount(holder);
    const holderSigner = await ethers.getSigner(holder);

    // Get contract instance
    const contract = new ethers.Contract(collectionAddress, erc721ABI.abi, holderSigner);

    // Transfer tokens
    try {
        await contract.transferFrom(holder, recipient, tokenId);
    } catch (error) {
        throw new Error(`Error: transferring tokens: ${error}`);
    }
}

/**
 * @dev Transfer ERC1155 tokens from the holder to the recipient
 *
 * @param address The address of the ERC1155 contract
 * @param holder The address of the holder
 * @param recipient The address of the recipient
 * @param tokenId The ID of the token to transfer
 * @param amount The amount of tokens to transfer
 * @param data Additional data with no specified format
 */
async function setERC1155Balance(
    address: string | Addressable,
    holder: string,
    recipient: HardhatEthersSigner | string,
    tokenId: bigint | number,
    amount: bigint | number,
    data: string
) {
    // Check if the network is forked
    await _isForking();

    // Impersonate holder
    await impersonateAccount(holder);
    const holderSigner = await ethers.getSigner(holder);

    // Get contract instance
    const contract = new ethers.Contract(address, erc1155ABI.abi, holderSigner);

    // Transfer tokens
    try {
        await contract.safeTransferFrom(holder, recipient, tokenId, amount, data);
    } catch (error) {
        throw new Error(`Error: transferring tokens: ${error}`);
    }
}

async function _isForking() {
    if (process.env.FORKING !== "true") throw new Error("Can only be used in forked network");
}

export { setERC20Balance, setERC721Balance, setERC1155Balance };
