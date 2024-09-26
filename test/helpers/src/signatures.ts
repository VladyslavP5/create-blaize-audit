import { ethers } from "hardhat";

import type { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import type { TypedDataDomain, TypedDataField } from "ethers";

async function signMessage(message: string, signer: HardhatEthersSigner): Promise<string> {
    return signer.signMessage(ethers.toBeArray(message));
}

function splitSignature(signature: string): { r: string; s: string; v: number } {
    const sig = ethers.Signature.from(signature);
    return { r: sig.r, s: sig.s, v: sig.v };
}

function joinSignature(signature: { r: string; s: string; v: number }): string {
    return ethers.solidityPacked(["uint8", "bytes32", "bytes32"], [signature.v, signature.r, signature.s]);
}

function signValues(signer: HardhatEthersSigner, values: string[], types: string[]): Promise<string> {
    const message = ethers.solidityPackedKeccak256(["bytes"], [ethers.solidityPacked(types, values)]);

    return signMessage(message, signer);
}

/**
 * Sign a typed data message (Standard EIP-712)
 * https://eips.ethereum.org/EIPS/eip-712
 *
 * Example of usage can be found here: https://dev.to/zemse/ethersjs-signing-eip712-typed-structs-2ph8
 *
 * @param signer - The signer to sign the message
 * @param domain - The domain of the typed data
 * @param types - The types of the typed data
 * @param values - The values of the typed data
 * @returns - The signature of the typed data
 */
async function signTypedData(
    signer: HardhatEthersSigner,
    domain: TypedDataDomain,
    types: TypedDataField[],
    values: Object
): Promise<string> {
    // Sign the Permit type data from the signer
    return await signer.signTypedData(domain, Object(types), values);
}

export { splitSignature, signMessage, joinSignature, signValues, signTypedData };
