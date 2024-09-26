# Project Documentation

This README provides comprehensive documentation for setting up, developing, testing, and deploying the project. It includes instructions for installation, environment setup, running scripts, and troubleshooting.

## Table of Contents

-   [Installation](#installation)
-   [Guide to Set Up `.env` Environments](#guide-to-set-up-env-environments)
    -   [Steps](#steps)
    -   [DEVELOPMENT Mode](#development-mode)
-   [Testing](#testing)
    -   [Hardhat](#hardhat)
    -   [Foundry](#foundry)
-   [Scripts Running](#scripts-running)
    -   [Hardhat Scripts](#hardhat-scripts)
    -   [Foundry Scripts](#foundry-scripts)
-   [Test Coverage Results](#test-coverage-results)
-   [Troubleshooting](#troubleshooting)

## Installation

Prerequisites: `NodeJS` version 16 or higher, `npm` version 7 or higher.

📝 _`NodeJS` version **`v22.5.1`** and `npm` version **`10.8.3`** were used for development_.

Run the command `$ npm install` in [the root of the project directory](./) to install all the dependencies specified in [`package.json`](./package.json), compile contracts ([`contracts/`](./contracts/)), prepare an ABI ([`abi/`](./abi/)), documentation ([`docs/`](./docs/)) for the contracts in [the NatSpec format](https://docs.soliditylang.org/en/latest/natspec-format.html) and [Husky hooks](#husky-hooks).

## Guide to Set Up `.env` Environments

#### Steps

1. **Create a `.env` File**

    - In the root directory of your project, create a file named `.env`.

2. **Define Environment Variables**

    - Open the [`.env.example`](./.env.example) file and copy all variables and then paste them into `.env` file and set the values

#### DEVELOPMENT Mode

For the audits it is recommended to not use development mode. Development mode allows to generate docs and abi after each commit to the github.

Development mode is designed to automate certain tasks before committing changes to the repository. It performs the following actions:

1. **Loads Environment Variables**: If a [`.env`](./.env) file exists in the project directory, the script loads the environment variables defined in it.
2. **Checks DEVELOPMENT Environment Variable**: The script checks if the `DEVELOPMENT` environment variable is set to `true`.
3. **Conditional Actions Based on DEVELOPMENT**:
    - If `DEVELOPMENT` is `true`, the script performs the following tasks:
      a. **Run `dev:abi` Script**: Executes the `dev:abi` npm script to generate ABI files and stages any changes in the [`abi/`](./abi) directory.
      b. **Run `dev:docs` Script**: Executes the `dev:docs` npm script to generate documentation and stages any changes in the [`docs/`](./docs/) directory.
      c. **Run `lint-staged`**: Executes `lint-staged` to lint and format the staged files.

This script ensures that the ABI files and documentation are up-to-date and that the code is properly linted and formatted before committing changes, provided that the `DEVELOPMENT` environment variable is set to `true`.

## Testing

### Hardhat

Run `$ npm run dev:coverage` to examine how well the developed tests cover the functionality of contracts. The results can also be viewed in a web browser by opening a file [`coverage/index.html`](./coverage/index.html) created by the script.

Perform tests with `$ npm test` to run all tests from the [`test/`](./test/hardhat/) directory.

Use `$ npm run test-t` to see events and calls when running tests, or `$ npm run test-ft` to also see the storage operations.

📝 _Each test case (`it()`) of [`tests/`](./test/hardhat/) is independent, [a snapshot](https://hardhat.org/hardhat-network-helpers/docs/reference#snapshots) or `beforeEach()`, so the entire specific flow is contained in `it()` and a set of `before()` and `beforeEach()` before it._

### Foundry

Run `$ forge coverage` to examine how well the developed tests cover the functionality of contracts.
Run `$ forge coverage --report lcov` to create lcov file with coverage data.
Run `$ forge coverage --report debug` to output uncovered code locations.

Perform tests with `$ forge test -vvv` to run all tests from the [`test/`](./test/foundry/) directory.

📝 \_Each test case is independent function.

## Scripts running

### Hardhat Scripts

#### `scripts/hardhat/deployment/deploy.js`

This script is used to deploy the smart contracts using Hardhat.

**Usage**:

```sh
$ npx hardhat run scripts/hardhat/deployment/deploy.ts --network <network-name>
```

**Description**:

-   This script deploys the smart contracts to the specified network.
-   Replace `<network-name>` with the name of the network you want to deploy to (e.g., `mainnet`, `sepolia`).

**Example**:

```sh
$ npx hardhat run scripts/hardhat/deployment/deploy.ts --network sepolia
```

### Foundry Scripts

#### `scripts/foundry/DeployPositiveEvenSetter.s.sol`

This script is used to deploy the `PositiveEvenSetter` contract using Foundry.

🛑Before running script for deployment make sure you set all the values in `.env` and then run the following command to load all environment variables.

🛑`Private key` must starts with `0xyour_private_key`

```sh
$ source .env
```

**Usage**:

```sh
$ forge script scripts/foundry/DeployPositiveEvenSetter.s.sol --broadcast --rpc-url <YOUR_RPC_URL> --verify -vvvv
```

**Description**:

-   This script deploys the `PositiveEvenSetter` contract to the specified network.
-   Replace `<YOUR_RPC_URL>` with the RPC URL of the network you want to deploy to (e.g., Infura, Alchemy).
-   Remove `<--verify>` if ETHERSCAN_API_KEY is not provided

**Example**:

```sh
$ forge script scripts/DeployPositiveEvenSetter.s.sol --broadcast --rpc-url https://mainnet.infura.io/v3/YOUR_INFURA_PROJECT_ID -- verify
```

### Summary

These scripts help automate the deployment of smart contracts using Hardhat and Foundry. Make sure to replace the placeholders with actual values when running the scripts.

### Test coverage results

| File | % Stmts | % Branch | % Funcs | % Lines |
| ---- | ------- | -------- | ------- | ------- |
|      |         |          |         |         |

## Troubleshooting

Hardhat:

Use `$ npm run clean` and try again.

Foundry:

1. Use

```bash
$ foundryup
```

2. Then

```bash
$ forge install
```
