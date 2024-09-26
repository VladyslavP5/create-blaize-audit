import type { SnapshotRestorer } from "@nomicfoundation/hardhat-network-helpers";
import { takeSnapshot } from "@nomicfoundation/hardhat-network-helpers";

import { expect } from "chai";
import { ethers } from "hardhat";
import type { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

import type { PositiveEvenSetter } from "../../typechain-types";

describe("PositiveEvenSetter", function () {
    let snapshotA: SnapshotRestorer;

    // Signers.
    let deployer: HardhatEthersSigner, owner: HardhatEthersSigner, user: HardhatEthersSigner;

    let positiveEvenSetter: PositiveEvenSetter;

    before(async () => {
        // Getting of signers.
        [deployer, user] = await ethers.getSigners();

        // Deployment of the factory.
        positiveEvenSetter = await ethers.deployContract("PositiveEvenSetter", []);
        await positiveEvenSetter.waitForDeployment();

        owner = deployer;

        snapshotA = await takeSnapshot();
    });

    afterEach(async () => await snapshotA.restore());

    describe("# Deployment", function () {
        it("Sets the deployer as the initial owner when initialization", async () => {
            // Deployment.
            const positiveEvenSetter = await ethers.deployContract("PositiveEvenSetter", []);
            await positiveEvenSetter.waitForDeployment();

            expect(await positiveEvenSetter.owner()).to.be.eq(deployer);
        });

        it("Sets the positive even number with '2' when initialization", async () => {
            // Deployment.
            const positiveEvenSetter = await ethers.deployContract("PositiveEvenSetter", []);
            await positiveEvenSetter.waitForDeployment();

            expect(await positiveEvenSetter.positiveEven()).to.be.eq(2);
        });
    });

    describe("# Setting of the positive even number", function () {
        it("Sets", async () => {
            // Saving of the previous value.
            const positiveEvenBefore = await positiveEvenSetter.positiveEven();

            // Setting.
            const newPositiveEven = 4;
            const tx = await positiveEvenSetter.connect(owner).setPositiveEven(newPositiveEven);
            // Check of the event emission.
            await expect(tx)
                .to.emit(positiveEvenSetter, "PositiveEvenSet")
                .withArgs(positiveEvenBefore, newPositiveEven);

            // Check of values.
            expect(await positiveEvenSetter.positiveEven()).to.be.eq(newPositiveEven);
        });

        it("Reverts when setting if a zero value", async () => {
            await expect(positiveEvenSetter.connect(owner).setPositiveEven(0)).to.be.revertedWithCustomError(
                positiveEvenSetter,
                "SetPositiveNumberToZero"
            );
        });

        it("Reverts when setting if an odd value", async () => {
            const oddNumber = 1;
            await expect(positiveEvenSetter.connect(owner).setPositiveEven(oddNumber))
                .to.be.revertedWithCustomError(positiveEvenSetter, "SetEvenToOddNumber")
                .withArgs(oddNumber);
        });

        it("Prevents non-owners from setting", async () => {
            await expect(positiveEvenSetter.connect(user).setPositiveEven(4))
                .to.be.revertedWithCustomError(positiveEvenSetter, "OwnableUnauthorizedAccount")
                .withArgs(user);
        });
    });
});
