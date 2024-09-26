import hre from "hardhat";
import { expect } from "chai";
import { ethers, upgrades } from "hardhat";

import type { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import type { TypedDataDomain } from "ethers";
import {
    impersonateAccount,
    SnapshotRestorer,
    takeSnapshot,
    time
} from "@nomicfoundation/hardhat-toolbox/network-helpers";

/**
 * Represents an ERC20 token with a unique address and some metadata.
 */
class TokenERC20 {
    public decimals: number;
    public symbol: string;
    public name: string;
    public isUpgradeable: boolean;
    public contractName: string;
    public token!: ERC20;
    public snapshotA!: SnapshotRestorer;

    /**
     * @dev Creates a new instance of the TokenERC20 class.
     *
     * @param decimals - The number of decimals the token uses.
     * @param name - The name of the token.
     * @param symbol - The symbol of the token.
     * @param isUpgradeable - Whether the token is upgradeable or not.
     * @param contractName - The name of the contract. Uses the same name as the contract in file.
     */
    public constructor(decimals: number, name: string, symbol: string, isUpgradeable: boolean, contractName: string) {
        this.decimals = decimals;
        this.symbol = symbol;
        this.name = name;
        this.isUpgradeable = isUpgradeable;
        this.contractName = contractName;
    }

    /**
     * Deploys the token contract.
     *
     * @param deployer - The address that will deploy the contract.
     * @returns The token contract instance.
     */
    public async deploy(deployer: HardhatEthersSigner, args: any[]) {
        const factory = await ethers.getContractFactory(this.contractName, deployer);
        if (this.isUpgradeable) {
            this.token = <ERC20>(<unknown>await upgrades.deployProxy(factory, args));
            await this.token.waitForDeployment();
            this.snapshotA = await takeSnapshot();
        } else {
            this.token = <ERC20>await factory.deploy(...args);
            await this.token.waitForDeployment();
            this.snapshotA = await takeSnapshot();
        }
    }

    /**
     * Checks the constructor of the token contract.
     *
     * @param totalSupply - The total supply of the token.
     */
    public async checkConstructor(totalSupply: bigint) {
        const token = this.token;
        const name = this.name;
        const symbol = this.symbol;
        const decimals = this.decimals;

        describe("# Constructor", function () {
            it(`Returns \`${name}\` when getting the token name`, async function () {
                expect(await token.name()).to.be.eq(name);
            });

            it(`Returns \`${symbol}\` when getting the token symbol`, async function () {
                expect(await token.symbol()).to.be.eq(symbol);
            });

            it(`Returns \`${decimals}\` when getting the decimals`, async function () {
                expect(await token.decimals()).to.be.eq(decimals);
            });

            it(`Returns \`${totalSupply}\` when getting the total supply`, async function () {
                expect(await token.totalSupply()).to.be.eq(totalSupply);
            });
        });
    }

    /**
     * Checks the approve function of the token contract.
     *
     * @param owner - The address of the owner.
     * @param spender - The address of the spender.
     * @param value - The value to approve.
     */
    public async checkApprove(owner: HardhatEthersSigner, spender: HardhatEthersSigner, value: bigint | number) {
        const token = this.token;

        describe("# Approve", function () {
            it("Allows to approve spending", async function () {
                // Approve
                await expect(token.connect(owner).approve(spender, value))
                    .to.emit(token, "Approval")
                    .withArgs(owner, spender, value);

                // Check allowance
                expect(await token.allowance(owner.address, spender.address)).to.be.eq(value);
            });

            it("Allows to approve spending with zero balance", async function () {
                const singers = await ethers.getSigners();
                const owner = singers[10];
                expect(await token.balanceOf(owner)).to.be.eq(0);

                // Approve
                await expect(token.connect(owner).approve(spender, value))
                    .to.emit(token, "Approval")
                    .withArgs(owner, spender, value);

                // Check allowance
                expect(await token.allowance(owner.address, spender.address)).to.be.eq(value);
            });

            it("Reverts if spender is zero", async function () {
                const spender = ethers.ZeroAddress;
                // Approve
                await expect(token.connect(owner).approve(spender, 0))
                    .to.be.revertedWithCustomError(token, "ERC20InvalidSpender")
                    .withArgs(spender);
            });

            it("Allows to transfer without approval", async function () {
                // Transfer
                await expect(token.connect(owner).transfer(spender, value))
                    .to.emit(token, "Transfer")
                    .withArgs(owner.address, spender.address, value);

                expect(await token.balanceOf(spender)).to.be.eq(value);
            });

            it("Reverts if approver is zero address", async function () {
                await impersonateAccount(ethers.ZeroAddress);
                const signerZero = await ethers.getSigner(ethers.ZeroAddress);
                // Approve
                await expect(token.connect(signerZero).approve(spender, 0))
                    .to.be.revertedWithCustomError(token, "ERC20InvalidApprover")
                    .withArgs(signerZero.address);
            });
        });
    }

    /**
     * Checks the transfer function of the token contract.
     *
     * @param sender - The address of the sender.
     * @param receiver - The address of the receiver.
     * @param value - The value to transfer.
     */
    public async checkTransfer(sender: HardhatEthersSigner, receiver: HardhatEthersSigner, value: bigint | number) {
        const token = this.token;

        describe("# Transfer", function () {
            it("Allows to transfer tokens", async function () {
                // Save balance before transfer
                const senderBalance = await token.balanceOf(sender.address);
                const receiverBalance = await token.balanceOf(receiver.address);

                // Transfer from user3 to user2
                await expect(token.connect(sender).transfer(receiver, value))
                    .to.emit(token, "Transfer")
                    .withArgs(sender.address, receiver.address, value);

                // Check balance
                expect(await token.balanceOf(receiver)).to.eq(receiverBalance + BigInt(value));
                expect(await token.balanceOf(sender)).to.eq(senderBalance - BigInt(value));
            });

            it("Reverts when trying to transfer tokens to zero address", async function () {
                const spender = ethers.ZeroAddress;

                // Transfer
                await expect(token.connect(sender).transfer(spender, value))
                    .to.be.revertedWithCustomError(token, "ERC20InvalidReceiver")
                    .withArgs(spender);
            });

            it("Reverts when user doesn't have enough balance", async function () {
                const userBalance = await token.balanceOf(sender.address);
                const value = userBalance + 1n;

                // Trying to transfer more than balance
                await expect(token.connect(sender).transfer(receiver, value))
                    .to.be.revertedWithCustomError(token, "ERC20InsufficientBalance")
                    .withArgs(sender.address, userBalance, value);
            });

            it("Reverts when spender is zero address", async function () {
                await impersonateAccount(ethers.ZeroAddress);
                const signerZero = await ethers.getSigner(ethers.ZeroAddress);

                // Transfer
                await expect(token.connect(signerZero).transfer(receiver, value))
                    .to.be.revertedWithCustomError(token, "ERC20InvalidSender")
                    .withArgs(signerZero.address);
            });
        });
    }

    /**
     * Checks the transferFrom function of the token contract.
     *
     * @param sender - The address of the sender.
     * @param spender - The address of the spender.
     * @param value - The value to transfer.
     */
    public async checkTransferFrom(sender: HardhatEthersSigner, spender: HardhatEthersSigner, value: bigint | number) {
        const token = this.token;

        describe("# TransferFrom", function () {
            it("Allows to transfer tokens from user3 to user2", async function () {
                // Save balance before transfer
                const spenderBalance = await token.balanceOf(spender.address);
                const senderBalance = await token.balanceOf(sender.address);

                // Approve
                await expect(token.connect(sender).approve(spender, value))
                    .to.emit(token, "Approval")
                    .withArgs(sender.address, spender.address, value);

                // Transfer
                await expect(token.connect(spender).transferFrom(sender.address, spender.address, value))
                    .to.emit(token, "Transfer")
                    .withArgs(sender.address, spender.address, value);

                // Check balance
                expect(await token.balanceOf(spender)).to.eq(spenderBalance + BigInt(value));
                expect(await token.balanceOf(sender)).to.eq(senderBalance - BigInt(value));
            });

            it("Reverts when user doesn't have enough allowance", async function () {
                const value = (await token.allowance(sender.address, spender.address)) + 1n;

                // Transfer
                await expect(token.connect(spender).transferFrom(sender, spender, value))
                    .to.be.revertedWithCustomError(token, "ERC20InsufficientAllowance")
                    .withArgs(spender, await token.allowance(sender, spender), value);
            });

            it("Reverts when user doesn't have enough balance", async function () {
                const value = (await token.balanceOf(sender.address)) + 1n;

                // Approve
                await expect(token.connect(sender).approve(spender, value))
                    .to.emit(token, "Approval")
                    .withArgs(sender, spender, value);

                // Transfer
                await expect(token.connect(spender).transferFrom(sender, spender, value))
                    .to.be.revertedWithCustomError(token, "ERC20InsufficientBalance")
                    .withArgs(sender, await token.balanceOf(sender), value);
            });
        });
    }
}

class TokenERC20Permit extends TokenERC20 {
    public token!: ERC20Permit;

    public async checkPermit(sender: HardhatEthersSigner, spender: HardhatEthersSigner, value: bigint) {
        const token = this.token;

        describe("# Permit", () => {
            it("Allows to permit and transfer tokens", async function () {
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

            it("Reverts when the signature is expired", async function () {
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

                // Increase time to past deadline
                await time.increaseTo(deadline + 1);

                // Permit the tokenReceiver address to spend tokens on behalf of the tokenOwner
                await expect(
                    token
                        .connect(tokenReceiver)
                        .permit(tokenOwner, tokenReceiver, value, deadline, splitSig.v, splitSig.r, splitSig.s)
                )
                    .to.be.revertedWithCustomError(token, "ERC2612ExpiredSignature")
                    .withArgs(deadline);
            });

            it("Reverts when the signer is not valid", async function () {
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
                const signature = await tokenReceiver.signTypedData(domain, types, values);

                // Split the signature into its components
                const splitSig = ethers.Signature.from(signature);

                // Verify the Permit type data with the signature
                ethers.verifyTypedData(domain, types, values, splitSig);

                // Increase time to past deadline
                await time.increaseTo(deadline - 1);

                // Permit the tokenReceiver address to spend tokens on behalf of the tokenOwner
                await expect(
                    token
                        .connect(tokenReceiver)
                        .permit(tokenOwner, tokenReceiver, value, deadline, splitSig.v, splitSig.r, splitSig.s)
                )
                    .to.be.revertedWithCustomError(token, "ERC2612InvalidSigner")
                    .withArgs(tokenReceiver.address, tokenOwner.address);
            });
        });
    }
}

/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */
import type {
    BaseContract,
    BigNumberish,
    BytesLike,
    FunctionFragment,
    Result,
    Interface,
    EventFragment,
    AddressLike,
    ContractRunner,
    ContractMethod,
    Listener
} from "ethers";
import type {
    TypedContractEvent,
    TypedDeferredTopicFilter,
    TypedEventLog,
    TypedLogDescription,
    TypedListener,
    TypedContractMethod
} from "../../../typechain-types/common";

export interface ERC20Interface extends Interface {
    getFunction(
        nameOrSignature:
            | "allowance"
            | "approve"
            | "balanceOf"
            | "decimals"
            | "name"
            | "symbol"
            | "totalSupply"
            | "transfer"
            | "transferFrom"
    ): FunctionFragment;

    getEvent(nameOrSignatureOrTopic: "Approval" | "Transfer"): EventFragment;

    encodeFunctionData(functionFragment: "allowance", values: [AddressLike, AddressLike]): string;
    encodeFunctionData(functionFragment: "approve", values: [AddressLike, BigNumberish]): string;
    encodeFunctionData(functionFragment: "balanceOf", values: [AddressLike]): string;
    encodeFunctionData(functionFragment: "decimals", values?: undefined): string;
    encodeFunctionData(functionFragment: "name", values?: undefined): string;
    encodeFunctionData(functionFragment: "symbol", values?: undefined): string;
    encodeFunctionData(functionFragment: "totalSupply", values?: undefined): string;
    encodeFunctionData(functionFragment: "transfer", values: [AddressLike, BigNumberish]): string;
    encodeFunctionData(functionFragment: "transferFrom", values: [AddressLike, AddressLike, BigNumberish]): string;

    decodeFunctionResult(functionFragment: "allowance", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "approve", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "balanceOf", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "decimals", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "name", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "symbol", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "totalSupply", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "transfer", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "transferFrom", data: BytesLike): Result;
}

export namespace ApprovalEvent {
    export type InputTuple = [owner: AddressLike, spender: AddressLike, value: BigNumberish];
    export type OutputTuple = [owner: string, spender: string, value: bigint];
    export interface OutputObject {
        owner: string;
        spender: string;
        value: bigint;
    }
    export type Event = TypedContractEvent<InputTuple, OutputTuple, OutputObject>;
    export type Filter = TypedDeferredTopicFilter<Event>;
    export type Log = TypedEventLog<Event>;
    export type LogDescription = TypedLogDescription<Event>;
}

export namespace TransferEvent {
    export type InputTuple = [from: AddressLike, to: AddressLike, value: BigNumberish];
    export type OutputTuple = [from: string, to: string, value: bigint];
    export interface OutputObject {
        from: string;
        to: string;
        value: bigint;
    }
    export type Event = TypedContractEvent<InputTuple, OutputTuple, OutputObject>;
    export type Filter = TypedDeferredTopicFilter<Event>;
    export type Log = TypedEventLog<Event>;
    export type LogDescription = TypedLogDescription<Event>;
}

interface ERC20 extends BaseContract {
    connect(runner?: ContractRunner | null): ERC20;
    waitForDeployment(): Promise<this>;

    interface: ERC20Interface;

    queryFilter<TCEvent extends TypedContractEvent>(
        event: TCEvent,
        fromBlockOrBlockhash?: string | number | undefined,
        toBlock?: string | number | undefined
    ): Promise<Array<TypedEventLog<TCEvent>>>;
    queryFilter<TCEvent extends TypedContractEvent>(
        filter: TypedDeferredTopicFilter<TCEvent>,
        fromBlockOrBlockhash?: string | number | undefined,
        toBlock?: string | number | undefined
    ): Promise<Array<TypedEventLog<TCEvent>>>;

    on<TCEvent extends TypedContractEvent>(event: TCEvent, listener: TypedListener<TCEvent>): Promise<this>;
    on<TCEvent extends TypedContractEvent>(
        filter: TypedDeferredTopicFilter<TCEvent>,
        listener: TypedListener<TCEvent>
    ): Promise<this>;

    once<TCEvent extends TypedContractEvent>(event: TCEvent, listener: TypedListener<TCEvent>): Promise<this>;
    once<TCEvent extends TypedContractEvent>(
        filter: TypedDeferredTopicFilter<TCEvent>,
        listener: TypedListener<TCEvent>
    ): Promise<this>;

    listeners<TCEvent extends TypedContractEvent>(event: TCEvent): Promise<Array<TypedListener<TCEvent>>>;
    listeners(eventName?: string): Promise<Array<Listener>>;
    removeAllListeners<TCEvent extends TypedContractEvent>(event?: TCEvent): Promise<this>;

    allowance: TypedContractMethod<[owner: AddressLike, spender: AddressLike], [bigint], "view">;

    approve: TypedContractMethod<[spender: AddressLike, value: BigNumberish], [boolean], "nonpayable">;

    balanceOf: TypedContractMethod<[account: AddressLike], [bigint], "view">;

    decimals: TypedContractMethod<[], [bigint], "view">;

    name: TypedContractMethod<[], [string], "view">;

    symbol: TypedContractMethod<[], [string], "view">;

    totalSupply: TypedContractMethod<[], [bigint], "view">;

    transfer: TypedContractMethod<[to: AddressLike, value: BigNumberish], [boolean], "nonpayable">;

    transferFrom: TypedContractMethod<
        [from: AddressLike, to: AddressLike, value: BigNumberish],
        [boolean],
        "nonpayable"
    >;

    getFunction<T extends ContractMethod = ContractMethod>(key: string | FunctionFragment): T;

    getFunction(
        nameOrSignature: "allowance"
    ): TypedContractMethod<[owner: AddressLike, spender: AddressLike], [bigint], "view">;
    getFunction(
        nameOrSignature: "approve"
    ): TypedContractMethod<[spender: AddressLike, value: BigNumberish], [boolean], "nonpayable">;
    getFunction(nameOrSignature: "balanceOf"): TypedContractMethod<[account: AddressLike], [bigint], "view">;
    getFunction(nameOrSignature: "decimals"): TypedContractMethod<[], [bigint], "view">;
    getFunction(nameOrSignature: "name"): TypedContractMethod<[], [string], "view">;
    getFunction(nameOrSignature: "symbol"): TypedContractMethod<[], [string], "view">;
    getFunction(nameOrSignature: "totalSupply"): TypedContractMethod<[], [bigint], "view">;
    getFunction(
        nameOrSignature: "transfer"
    ): TypedContractMethod<[to: AddressLike, value: BigNumberish], [boolean], "nonpayable">;
    getFunction(
        nameOrSignature: "transferFrom"
    ): TypedContractMethod<[from: AddressLike, to: AddressLike, value: BigNumberish], [boolean], "nonpayable">;

    getEvent(
        key: "Approval"
    ): TypedContractEvent<ApprovalEvent.InputTuple, ApprovalEvent.OutputTuple, ApprovalEvent.OutputObject>;
    getEvent(
        key: "Transfer"
    ): TypedContractEvent<TransferEvent.InputTuple, TransferEvent.OutputTuple, TransferEvent.OutputObject>;

    filters: {
        "Approval(address,address,uint256)": TypedContractEvent<
            ApprovalEvent.InputTuple,
            ApprovalEvent.OutputTuple,
            ApprovalEvent.OutputObject
        >;
        Approval: TypedContractEvent<ApprovalEvent.InputTuple, ApprovalEvent.OutputTuple, ApprovalEvent.OutputObject>;

        "Transfer(address,address,uint256)": TypedContractEvent<
            TransferEvent.InputTuple,
            TransferEvent.OutputTuple,
            TransferEvent.OutputObject
        >;
        Transfer: TypedContractEvent<TransferEvent.InputTuple, TransferEvent.OutputTuple, TransferEvent.OutputObject>;
    };
}

export interface ERC20PermitInterface extends Interface {
    getFunction(
        nameOrSignature:
            | "DOMAIN_SEPARATOR"
            | "allowance"
            | "approve"
            | "balanceOf"
            | "decimals"
            | "eip712Domain"
            | "name"
            | "nonces"
            | "permit"
            | "symbol"
            | "totalSupply"
            | "transfer"
            | "transferFrom"
    ): FunctionFragment;

    getEvent(nameOrSignatureOrTopic: "Approval" | "EIP712DomainChanged" | "Transfer"): EventFragment;

    encodeFunctionData(functionFragment: "DOMAIN_SEPARATOR", values?: undefined): string;
    encodeFunctionData(functionFragment: "allowance", values: [AddressLike, AddressLike]): string;
    encodeFunctionData(functionFragment: "approve", values: [AddressLike, BigNumberish]): string;
    encodeFunctionData(functionFragment: "balanceOf", values: [AddressLike]): string;
    encodeFunctionData(functionFragment: "decimals", values?: undefined): string;
    encodeFunctionData(functionFragment: "eip712Domain", values?: undefined): string;
    encodeFunctionData(functionFragment: "name", values?: undefined): string;
    encodeFunctionData(functionFragment: "nonces", values: [AddressLike]): string;
    encodeFunctionData(
        functionFragment: "permit",
        values: [AddressLike, AddressLike, BigNumberish, BigNumberish, BigNumberish, BytesLike, BytesLike]
    ): string;
    encodeFunctionData(functionFragment: "symbol", values?: undefined): string;
    encodeFunctionData(functionFragment: "totalSupply", values?: undefined): string;
    encodeFunctionData(functionFragment: "transfer", values: [AddressLike, BigNumberish]): string;
    encodeFunctionData(functionFragment: "transferFrom", values: [AddressLike, AddressLike, BigNumberish]): string;

    decodeFunctionResult(functionFragment: "DOMAIN_SEPARATOR", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "allowance", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "approve", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "balanceOf", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "decimals", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "eip712Domain", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "name", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "nonces", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "permit", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "symbol", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "totalSupply", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "transfer", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "transferFrom", data: BytesLike): Result;
}

export namespace EIP712DomainChangedEvent {
    export type InputTuple = [];
    export type OutputTuple = [];
    export interface OutputObject {}
    export type Event = TypedContractEvent<InputTuple, OutputTuple, OutputObject>;
    export type Filter = TypedDeferredTopicFilter<Event>;
    export type Log = TypedEventLog<Event>;
    export type LogDescription = TypedLogDescription<Event>;
}

export interface ERC20Permit extends BaseContract {
    connect(runner?: ContractRunner | null): ERC20Permit;
    waitForDeployment(): Promise<this>;

    interface: ERC20PermitInterface;

    queryFilter<TCEvent extends TypedContractEvent>(
        event: TCEvent,
        fromBlockOrBlockhash?: string | number | undefined,
        toBlock?: string | number | undefined
    ): Promise<Array<TypedEventLog<TCEvent>>>;
    queryFilter<TCEvent extends TypedContractEvent>(
        filter: TypedDeferredTopicFilter<TCEvent>,
        fromBlockOrBlockhash?: string | number | undefined,
        toBlock?: string | number | undefined
    ): Promise<Array<TypedEventLog<TCEvent>>>;

    on<TCEvent extends TypedContractEvent>(event: TCEvent, listener: TypedListener<TCEvent>): Promise<this>;
    on<TCEvent extends TypedContractEvent>(
        filter: TypedDeferredTopicFilter<TCEvent>,
        listener: TypedListener<TCEvent>
    ): Promise<this>;

    once<TCEvent extends TypedContractEvent>(event: TCEvent, listener: TypedListener<TCEvent>): Promise<this>;
    once<TCEvent extends TypedContractEvent>(
        filter: TypedDeferredTopicFilter<TCEvent>,
        listener: TypedListener<TCEvent>
    ): Promise<this>;

    listeners<TCEvent extends TypedContractEvent>(event: TCEvent): Promise<Array<TypedListener<TCEvent>>>;
    listeners(eventName?: string): Promise<Array<Listener>>;
    removeAllListeners<TCEvent extends TypedContractEvent>(event?: TCEvent): Promise<this>;

    DOMAIN_SEPARATOR: TypedContractMethod<[], [string], "view">;

    allowance: TypedContractMethod<[owner: AddressLike, spender: AddressLike], [bigint], "view">;

    approve: TypedContractMethod<[spender: AddressLike, value: BigNumberish], [boolean], "nonpayable">;

    balanceOf: TypedContractMethod<[account: AddressLike], [bigint], "view">;

    decimals: TypedContractMethod<[], [bigint], "view">;

    eip712Domain: TypedContractMethod<
        [],
        [
            [string, string, string, bigint, string, string, bigint[]] & {
                fields: string;
                name: string;
                version: string;
                chainId: bigint;
                verifyingContract: string;
                salt: string;
                extensions: bigint[];
            }
        ],
        "view"
    >;

    name: TypedContractMethod<[], [string], "view">;

    nonces: TypedContractMethod<[owner: AddressLike], [bigint], "view">;

    permit: TypedContractMethod<
        [
            owner: AddressLike,
            spender: AddressLike,
            value: BigNumberish,
            deadline: BigNumberish,
            v: BigNumberish,
            r: BytesLike,
            s: BytesLike
        ],
        [void],
        "nonpayable"
    >;

    symbol: TypedContractMethod<[], [string], "view">;

    totalSupply: TypedContractMethod<[], [bigint], "view">;

    transfer: TypedContractMethod<[to: AddressLike, value: BigNumberish], [boolean], "nonpayable">;

    transferFrom: TypedContractMethod<
        [from: AddressLike, to: AddressLike, value: BigNumberish],
        [boolean],
        "nonpayable"
    >;

    getFunction<T extends ContractMethod = ContractMethod>(key: string | FunctionFragment): T;

    getFunction(nameOrSignature: "DOMAIN_SEPARATOR"): TypedContractMethod<[], [string], "view">;
    getFunction(
        nameOrSignature: "allowance"
    ): TypedContractMethod<[owner: AddressLike, spender: AddressLike], [bigint], "view">;
    getFunction(
        nameOrSignature: "approve"
    ): TypedContractMethod<[spender: AddressLike, value: BigNumberish], [boolean], "nonpayable">;
    getFunction(nameOrSignature: "balanceOf"): TypedContractMethod<[account: AddressLike], [bigint], "view">;
    getFunction(nameOrSignature: "decimals"): TypedContractMethod<[], [bigint], "view">;
    getFunction(nameOrSignature: "eip712Domain"): TypedContractMethod<
        [],
        [
            [string, string, string, bigint, string, string, bigint[]] & {
                fields: string;
                name: string;
                version: string;
                chainId: bigint;
                verifyingContract: string;
                salt: string;
                extensions: bigint[];
            }
        ],
        "view"
    >;
    getFunction(nameOrSignature: "name"): TypedContractMethod<[], [string], "view">;
    getFunction(nameOrSignature: "nonces"): TypedContractMethod<[owner: AddressLike], [bigint], "view">;
    getFunction(
        nameOrSignature: "permit"
    ): TypedContractMethod<
        [
            owner: AddressLike,
            spender: AddressLike,
            value: BigNumberish,
            deadline: BigNumberish,
            v: BigNumberish,
            r: BytesLike,
            s: BytesLike
        ],
        [void],
        "nonpayable"
    >;
    getFunction(nameOrSignature: "symbol"): TypedContractMethod<[], [string], "view">;
    getFunction(nameOrSignature: "totalSupply"): TypedContractMethod<[], [bigint], "view">;
    getFunction(
        nameOrSignature: "transfer"
    ): TypedContractMethod<[to: AddressLike, value: BigNumberish], [boolean], "nonpayable">;
    getFunction(
        nameOrSignature: "transferFrom"
    ): TypedContractMethod<[from: AddressLike, to: AddressLike, value: BigNumberish], [boolean], "nonpayable">;

    getEvent(
        key: "Approval"
    ): TypedContractEvent<ApprovalEvent.InputTuple, ApprovalEvent.OutputTuple, ApprovalEvent.OutputObject>;
    getEvent(
        key: "EIP712DomainChanged"
    ): TypedContractEvent<
        EIP712DomainChangedEvent.InputTuple,
        EIP712DomainChangedEvent.OutputTuple,
        EIP712DomainChangedEvent.OutputObject
    >;
    getEvent(
        key: "Transfer"
    ): TypedContractEvent<TransferEvent.InputTuple, TransferEvent.OutputTuple, TransferEvent.OutputObject>;

    filters: {
        "Approval(address,address,uint256)": TypedContractEvent<
            ApprovalEvent.InputTuple,
            ApprovalEvent.OutputTuple,
            ApprovalEvent.OutputObject
        >;
        Approval: TypedContractEvent<ApprovalEvent.InputTuple, ApprovalEvent.OutputTuple, ApprovalEvent.OutputObject>;

        "EIP712DomainChanged()": TypedContractEvent<
            EIP712DomainChangedEvent.InputTuple,
            EIP712DomainChangedEvent.OutputTuple,
            EIP712DomainChangedEvent.OutputObject
        >;
        EIP712DomainChanged: TypedContractEvent<
            EIP712DomainChangedEvent.InputTuple,
            EIP712DomainChangedEvent.OutputTuple,
            EIP712DomainChangedEvent.OutputObject
        >;

        "Transfer(address,address,uint256)": TypedContractEvent<
            TransferEvent.InputTuple,
            TransferEvent.OutputTuple,
            TransferEvent.OutputObject
        >;
        Transfer: TypedContractEvent<TransferEvent.InputTuple, TransferEvent.OutputTuple, TransferEvent.OutputObject>;
    };
}

export { TokenERC20, TokenERC20Permit };
