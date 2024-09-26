import { time } from "@nomicfoundation/hardhat-network-helpers";

import { expect } from "chai";
import { ethers } from "hardhat";

import type { TypedDataDomain } from "ethers";

import { addDec, setERC20Balance } from "../helpers";
import { TokenERC20, TokenERC20Permit } from "../helpers/src/token";

import hre from "hardhat";

describe.skip("Helpers", function () {
    const token = new TokenERC20(18, "Mock Token", "MOCK", false, "ERC20Mock");
    const totalSupply = addDec(10000);

    const permitToken = new TokenERC20Permit(18, "Mock Token", "MOCK", false, "ERC20Mock");

    it("Example of running default tests for the ERC20 token", async () => {
        const [user, spender] = await ethers.getSigners();

        await token.deploy(user, [totalSupply]);

        await token.checkConstructor(totalSupply);

        await token.checkApprove(user, spender, addDec(100));

        await token.checkTransfer(user, spender, addDec(100));

        await token.checkTransferFrom(user, spender, addDec(100));
    });

    it("Example of running default tests for the ERC20 token with permit", async () => {
        const [user, spender] = await ethers.getSigners();

        await permitToken.deploy(user, [totalSupply]);

        await permitToken.checkConstructor(totalSupply);

        await permitToken.checkApprove(user, spender, addDec(100));

        await permitToken.checkTransfer(user, spender, addDec(100));

        await permitToken.checkTransferFrom(user, spender, addDec(100));

        await permitToken.checkPermit(user, spender, addDec(100));
    });

    it("Set balance should work", async () => {
        // Test works only while forking mainnet
        const [user] = await ethers.getSigners();
        const USDT = await ethers.getContractAt("ERC20", "0xdAC17F958D2ee523a2206206994597C13D831ec7");
        const balance = await USDT.balanceOf(user.address);

        console.log("Balance: ", balance.toString());

        await setERC20Balance(USDT.target, "0xF977814e90dA44bFA03b6295A0616a897441aceC", user, 1000);
        const newBalance = await USDT.balanceOf(user.address);

        console.log("New balance: ", newBalance.toString());
    });

    it("ERC20 Permit test", async () => {
        const [sender, spender] = await ethers.getSigners();
        const value = addDec(100);

        const token = permitToken.token;

        // Set allowance to zero before permit
        await token.connect(sender).approve(spender, 0);

        // Set token value and deadline
        const deadline = (await time.latest()) + time.duration.minutes(10);

        // Get chainId
        const chainId = hre.network.config.chainId;

        // Get the current nonce for the deployer
        const nonces = await token.nonces(sender);

        // Set the domain parameters
        const domain = <TypedDataDomain>{
            name: await token.name(),
            version: "1",
            chainId: chainId,
            verifyingContract: token.target
        };

        // Set the Permit type parameters
        const types = {
            Permit: [
                {
                    name: "owner",
                    type: "address"
                },
                {
                    name: "spender",
                    type: "address"
                },
                {
                    name: "value",
                    type: "uint256"
                },
                {
                    name: "nonce",
                    type: "uint256"
                },
                {
                    name: "deadline",
                    type: "uint256"
                }
            ]
        };

        // Define the Permit type values
        const tokenOwner = sender;
        const tokenReceiver = spender;

        // Set the Permit type values
        const values = {
            owner: tokenOwner.address,
            spender: tokenReceiver.address,
            value: value,
            nonce: nonces,
            deadline: deadline
        };

        // Sign the Permit type data from the tokenOwner
        const signature = await tokenOwner.signTypedData(domain, types, values);

        // Split the signature into its components
        const splitSig = ethers.Signature.from(signature);

        // Verify the Permit type data with the signature
        ethers.verifyTypedData(domain, types, values, splitSig);

        await time.increaseTo(deadline - 10);

        // Permit the tokenReceiver address to spend tokens on behalf of the tokenOwner
        await token
            .connect(tokenReceiver)
            .permit(tokenOwner, tokenReceiver, value, deadline, splitSig.v, splitSig.r, splitSig.s);

        // Check allowance
        expect(await token.allowance(sender, spender)).to.eq(value);
    });
});
