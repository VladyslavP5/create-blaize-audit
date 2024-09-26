import * as dotenv from "dotenv";
dotenv.config();

import type { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-toolbox/network-helpers";

import {
    ISwapRouter02,
    IUniswapV3Factory,
    IUniswapV3Pool,
    IUniswapV3PoolDeployer,
    IWETH,
    UniswapV2Factory,
    UniswapV2Router02
} from "../../../typechain-types";

const ZERO_ADDRESS = ethers.ZeroAddress;

class Uniswap {
    // Core Uniswap V2 contracts.
    public uniswapV2Factory!: UniswapV2Factory;
    public uniswapV2Router02!: UniswapV2Router02;

    // Core Uniswap V3 contracts.
    public uniswapV3Factory!: IUniswapV3Factory;
    public uniswapV3Pool!: IUniswapV3Pool;
    public uniswapV3PoolDeployer!: IUniswapV3PoolDeployer;
    public uniswapV3SwapRouter!: ISwapRouter02;

    public weth!: IWETH;

    /// @notice No-args constructor
    constructor() {}

    /**
     * @notice Initialize the Uniswap V2 contracts.
     * In case if the Uniswap V2 Factory and Router02 addresses are zero addresses, the contracts will be deployed. Otherwise, the contracts will be fetched. If only one of the addresses is zero, an error will be thrown.
     *
     * @param signer - The signer to deploy the contracts.
     * @param _weth - The WETH address. Required for deployment.
     * @param _uniswapV2Factory - The Uniswap V2 Factory address. If zero, the contract will be deployed.
     * @param _uniswapV2Router02 - The Uniswap V2 Router02 address. If zero, the contract will be deployed.
     */
    public async initUniswapV2(
        signer: HardhatEthersSigner,
        _weth: string,
        _uniswapV2Factory: string,
        _uniswapV2Router02: string
    ) {
        if (_weth === ZERO_ADDRESS) {
            throw new Error("WETH address is required");
        }

        this.weth = await ethers.getContractAt("IWETH", _weth, signer);

        if (_uniswapV2Factory != ZERO_ADDRESS && _uniswapV2Router02 != ZERO_ADDRESS) {
            this.uniswapV2Factory = await ethers.getContractAt("UniswapV2Factory", _uniswapV2Factory, signer);
            this.uniswapV2Router02 = await ethers.getContractAt("UniswapV2Router02", _uniswapV2Router02, signer);
        }
        if (
            (_uniswapV2Factory != ZERO_ADDRESS && _uniswapV2Router02 === ZERO_ADDRESS) ||
            (_uniswapV2Factory === ZERO_ADDRESS && _uniswapV2Router02 != ZERO_ADDRESS)
        ) {
            throw new Error("Both Uniswap V2 Factory and Router02 addresses are required");
        } else {
            // Deploy the Uniswap V2 Factory contract.
            this.uniswapV2Factory = await ethers.deployContract("UniswapV2Factory", [signer.address], signer);
            await this.uniswapV2Factory.waitForDeployment();

            // Deploy the Uniswap V2 Router02 contract.
            this.uniswapV2Router02 = await ethers.deployContract(
                "UniswapV2Router02",
                [this.uniswapV2Factory.target, _weth],
                signer
            );
            await this.uniswapV2Router02.waitForDeployment();
        }
    }

    /**
     * @notice Initialize the Uniswap V3 contract Router.
     * @notice The contract will be fetched. If the address is zero, an error will be thrown.
     * @notice The network must be forked.
     *
     * @param signer - The signer to fetch the contract.
     * @param _uniswapV3SwapRouter - The Uniswap V3 Swap Router address.
     */
    public async initUniswapV3(signer: HardhatEthersSigner, _uniswapV3SwapRouter: string) {
        // Check if network is forked
        if (process.env.FORKING !== "true") {
            throw new Error("Network must be forked");
        }

        if (_uniswapV3SwapRouter !== ZERO_ADDRESS) {
            this.uniswapV3SwapRouter = await ethers.getContractAt("ISwapRouter02", _uniswapV3SwapRouter, signer);
        } else {
            throw new Error("Uniswap V3 Swap Router address is required");
        }
    }

    /**
     * @notice Get the Uniswap V2 pair address.
     *
     * @param tokens - The tokens to get the pair address.
     * @returns - The pair address.
     */
    public async v2GetPoolAddress(tokens: string[]): Promise<string> {
        const pool = await this.uniswapV2Factory.getPair(tokens[0], tokens[1]);

        if (pool === ethers.ZeroAddress) {
            throw new Error("Uniswap pair not found");
        }

        return pool;
    }

    /**
     * @notice Perform a Uniswap V2 swap with exact amount in.
     *
     * @param signer - The signer to make the swap.
     * @param token0 - The token0 address. Token to be sent.
     * @param token1 - The token1 address. Token to be received.
     * @param amountIn - The amount of token0 to be sent.
     * @param amountOutMin  - The minimum amount of token1 to be received.
     * @param recipient - The recipient address. Default is the signer address.
     * @param deadline - The deadline for the swap. Default is the current time + 30 seconds.
     * @returns - The amount of token1 received.
     */
    public async v2SwapSingleExactAmountIn(
        signer: HardhatEthersSigner,
        token0: string,
        token1: string,
        amountIn: bigint,
        amountOutMin: bigint,
        recipient?: string,
        deadline?: number | bigint
    ): Promise<bigint> {
        // Get the token0 contract.
        const token0Contract = await ethers.getContractAt("IERC20", token0, signer);

        // Approve the router to spend the tokens.
        await token0Contract.connect(signer).approve(this.uniswapV2Router02, amountIn);

        // Prepare the arguments.
        const path = [token0, token1];
        recipient = recipient !== undefined ? recipient : signer.address;
        deadline = deadline !== undefined ? deadline : (await time.latest()) + 30;

        // Make the swap.
        const amounts = await this.uniswapV2Router02
            .connect(signer)
            .swapExactTokensForTokens.staticCall(amountIn, amountOutMin, path, recipient, deadline);

        await this.uniswapV2Router02
            .connect(signer)
            .swapExactTokensForTokens(amountIn, amountOutMin, path, recipient, deadline);

        return amounts[1];
    }

    /**
     * @notice Perform a Uniswap V2 swap with exact amount out.
     *
     * @param signer - The signer to make the swap.
     * @param token0 - The token0 address. Token to be sent.
     * @param token1 - The token1 address. Token to be received.
     * @param amountOut - The amount of token1 to be received.
     * @param amountInMax - The maximum amount of token0 to be sent.
     * @param recipient - The recipient address. Default is the signer address.
     * @param deadline - The deadline for the swap. Default is the current time + 30 seconds.
     * @returns - The amount of token0 sent.
     */
    public async v2SwapSingleExactAmountOut(
        signer: HardhatEthersSigner,
        token0: string,
        token1: string,
        amountOut: bigint,
        amountInMax: bigint,
        recipient?: string,
        deadline?: number | bigint
    ): Promise<bigint> {
        // Get the token0 contract.
        const token0Contract = await ethers.getContractAt("IERC20", token0, signer);

        // Approve the router to spend the tokens.
        await token0Contract.connect(signer).approve(this.uniswapV2Router02, amountInMax);

        // Prepare the arguments.
        const path = [token0, token1];
        recipient = recipient !== undefined ? recipient : signer.address;
        deadline = deadline !== undefined ? deadline : (await time.latest()) + 30;

        // Make the swap.
        const amounts = await this.uniswapV2Router02
            .connect(signer)
            .swapTokensForExactTokens.staticCall(amountOut, amountInMax, path, recipient, deadline);

        await this.uniswapV2Router02
            .connect(signer)
            .swapTokensForExactTokens(amountOut, amountInMax, path, recipient, deadline);

        return amounts[1];
    }

    /**
     * @notice Perform a Uniswap V2 swap with multiple exact amounts in.
     *
     * @param signer - The signer to make the swap.
     * @param tokens - The tokens to be swapped. The first token is the token to be sent. The last token is the token to be received.
     * @param amountIn - The amount of the first token to be sent.
     * @param amountOutMin - The minimum amount of the last token to be received.
     * @param recipient - The recipient address. Default is the signer address.
     * @param deadline - The deadline for the swap. Default is the current time + 30 seconds.
     * @returns - The amount of the last token received.
     */
    public async v2SwapMultiExactAmountIn(
        signer: HardhatEthersSigner,
        tokens: string[],
        amountIn: bigint,
        amountOutMin: bigint,
        recipient?: string,
        deadline?: number | bigint
    ): Promise<bigint> {
        // Get the token0 contract.
        const token0Contract = await ethers.getContractAt("IERC20", tokens[0], signer);

        // Approve the router to spend the tokens.
        await token0Contract.connect(signer).approve(this.uniswapV2Router02, amountIn);

        // Prepare the arguments.
        recipient = recipient !== undefined ? recipient : signer.address;
        deadline = deadline !== undefined ? deadline : (await time.latest()) + 30;

        // Make the swap.
        const amounts = await this.uniswapV2Router02
            .connect(signer)
            .swapExactTokensForTokens.staticCall(amountIn, amountOutMin, tokens, recipient, deadline);

        await this.uniswapV2Router02
            .connect(signer)
            .swapExactTokensForTokens(amountIn, amountOutMin, tokens, recipient, deadline);

        return amounts[1];
    }

    /**
     * @notice Perform a Uniswap V2 swap with multiple exact amounts out.
     *
     * @param signer - The signer to make the swap.
     * @param tokens - The tokens to be swapped. The first token is the token to be received. The last token is the token to be sent.
     * @param amountOut - The amount of the first token to be received.
     * @param amountInMax - The maximum amount of the first token to be sent.
     * @param recipient - The recipient address. Default is the signer address.
     * @param deadline - The deadline for the swap. Default is the current time + 30 seconds.
     * @returns - The amount of the last token sent.
     */
    public async v2SwapMultiExactAmountOut(
        signer: HardhatEthersSigner,
        tokens: string[],
        amountOut: bigint,
        amountInMax: bigint,
        recipient?: string,
        deadline?: number | bigint
    ): Promise<bigint> {
        // Get the token0 contract.
        const token0Contract = await ethers.getContractAt("IERC20", tokens[0], signer);

        // Approve the router to spend the tokens.
        await token0Contract.connect(signer).approve(this.uniswapV2Router02, amountInMax);

        // Prepare the arguments.
        recipient = recipient !== undefined ? recipient : signer.address;
        deadline = deadline !== undefined ? deadline : (await time.latest()) + 30;

        // Make the swap.
        const amounts = await this.uniswapV2Router02
            .connect(signer)
            .swapTokensForExactTokens.staticCall(amountOut, amountInMax, tokens, recipient, deadline);

        await this.uniswapV2Router02
            .connect(signer)
            .swapTokensForExactTokens(amountOut, amountInMax, tokens, recipient, deadline);

        return amounts[1];
    }

    /**
     * @notice Create a Uniswap V2 pair.
     *
     * @param signer - The signer to create the pair.
     * @param token0 - The token0 address.
     * @param token1 - The token1 address.
     * @returns - The pair address.
     */
    public async v2CreatePair(signer: HardhatEthersSigner, token0: string, token1: string): Promise<string> {
        // Create the pair.
        const pair = await this.uniswapV2Factory.createPair.staticCall(token0, token1);

        await this.uniswapV2Factory.createPair(token0, token1);

        return pair;
    }

    /**
     * @notice Add liquidity to a Uniswap V2 pair.
     *
     * @param signer - The signer to add the liquidity.
     * @param tokenA - The tokenA address.
     * @param tokenB - The tokenB address.
     * @param amountADesired - The amount of tokenA to be added.
     * @param amountBDesired - The amount of tokenB to be added.
     * @param amountAMin - The minimum amount of tokenA to be added. Default is 1.
     * @param amountBMin - The minimum amount of tokenB to be added. Default is 1.
     * @param recipient - The recipient address. Default is the signer address.
     * @param deadline - The deadline for the swap. Default is the current time + 30 seconds.
     * @returns - The amount of LP tokens minted.
     */
    public async v2AddLiquidity(
        signer: HardhatEthersSigner,
        tokenA: string,
        tokenB: string,
        amountADesired: bigint,
        amountBDesired: bigint,
        amountAMin?: bigint,
        amountBMin?: bigint,
        recipient?: string,
        deadline?: bigint | number
    ) {
        // Get the token0 contract.
        const token0Contract = await ethers.getContractAt("IERC20", tokenA, signer);
        const token1Contract = await ethers.getContractAt("IERC20", tokenB, signer);

        // Approve the router to spend the tokens.
        await token0Contract.connect(signer).approve(this.uniswapV2Router02, amountADesired);
        await token1Contract.connect(signer).approve(this.uniswapV2Router02, amountBDesired);

        // Prepare the arguments.
        amountAMin = amountAMin !== undefined ? amountAMin : 1n;
        amountBMin = amountBMin !== undefined ? amountBMin : 1n;
        recipient = recipient !== undefined ? recipient : signer.address;
        deadline = deadline !== undefined ? deadline : (await time.latest()) + 30;

        // Add liquidity.
        const result = await this.uniswapV2Router02
            .connect(signer)
            .addLiquidity.staticCall(
                tokenA,
                tokenB,
                amountADesired,
                amountBDesired,
                amountAMin,
                amountBMin,
                recipient,
                deadline
            );

        await this.uniswapV2Router02
            .connect(signer)
            .addLiquidity(tokenA, tokenB, amountADesired, amountBDesired, amountAMin, amountBMin, recipient, deadline);

        return result;
    }

    /**
     * @notice Remove liquidity from a Uniswap V2 pair.
     *
     * @param signer - The signer to remove the liquidity.
     * @param tokenA - The tokenA address.
     * @param tokenB - The tokenB address.
     * @param liquidity - The amount of LP tokens to be removed. Default is the signer's balance.
     * @param amountAMin - The minimum amount of tokenA to be received. Default is 1.
     * @param amountBMin - The minimum amount of tokenB to be received. Default is 1.
     * @param recipient - The recipient address. Default is the signer address.
     * @param deadline - The deadline for the swap. Default is the current time + 30 seconds.
     * @returns - The amount of tokenA and tokenB received.
     */
    public async v2RemoveLiquidity(
        signer: HardhatEthersSigner,
        tokenA: string,
        tokenB: string,
        liquidity?: bigint,
        amountAMin?: bigint,
        amountBMin?: bigint,
        recipient?: string,
        deadline?: bigint | number
    ) {
        // Get the pair address.
        const pair = await this.uniswapV2Factory.getPair(tokenA, tokenB);
        const pairContract = await ethers.getContractAt("IERC20", pair, signer);

        // Prepare the liquidity argument.
        liquidity = liquidity !== undefined ? liquidity : await pairContract.balanceOf(signer.address);
        await pairContract.connect(signer).approve(this.uniswapV2Router02, liquidity);

        // Prepare the arguments.
        amountAMin = amountAMin !== undefined ? amountAMin : 1n;
        amountBMin = amountBMin !== undefined ? amountBMin : 1n;
        recipient = recipient !== undefined ? recipient : signer.address;
        deadline = deadline !== undefined ? deadline : (await time.latest()) + 30;

        // Remove liquidity.
        const result = await this.uniswapV2Router02.removeLiquidity.staticCall(
            tokenA,
            tokenB,
            liquidity,
            amountAMin,
            amountBMin,
            recipient,
            deadline
        );

        await this.uniswapV2Router02.removeLiquidity(
            tokenA,
            tokenB,
            liquidity,
            amountAMin,
            amountBMin,
            recipient,
            deadline
        );

        return result;
    }

    /**
     * @notice Perform a Uniswap V3 swap with exact amount in.
     *
     * @param signer - The signer to make the swap.
     * @param tokenIn - The tokenIn address. Token to be sent.
     * @param tokenOut - The tokenOut address. Token to be received.
     * @param fee - The fee amount.
     * @param recipient - The recipient address. Default is the signer address.
     * @param amountIn - The amount of tokenIn to be sent.
     * @param amountOutMinimum - The minimum amount of tokenOut to be received.
     * @param sqrtPriceLimitX96 - The square root price limit. Default is 0.
     * @returns - The amount of tokenOut received.
     */
    public async v3ExactInputSingle(
        signer: HardhatEthersSigner,
        tokenIn: string,
        tokenOut: string,
        fee: bigint | number,
        recipient: string,
        amountIn: bigint | number,
        amountOutMinimum?: bigint | number,
        sqrtPriceLimitX96?: bigint | number
    ): Promise<bigint> {
        await this._v3InitCheck();

        // Get the tokenIn contract.
        const tokenInContract = await ethers.getContractAt("IERC20", tokenIn);

        // Approve the router to spend the tokens.
        await tokenInContract.connect(signer).approve(this.uniswapV3SwapRouter, amountIn);

        // Prepare the arguments.
        const params: ISwapRouter02.ExactInputSingleParamsStruct = {
            tokenIn: tokenIn,
            tokenOut: tokenOut,
            fee: fee,
            recipient: recipient,
            amountIn: amountIn,
            amountOutMinimum: amountOutMinimum !== undefined ? amountOutMinimum : 0,
            sqrtPriceLimitX96: sqrtPriceLimitX96 !== undefined ? sqrtPriceLimitX96 : 0
        };

        // Make the swap.
        const amountOut = await this.uniswapV3SwapRouter.connect(signer).exactInputSingle.staticCall(params);

        await this.uniswapV3SwapRouter.connect(signer).exactInputSingle(params);

        return amountOut;
    }

    /**
     * @notice Perform a Uniswap V3 swap with exact amount out.
     *
     * @param signer - The signer to make the swap.
     * @param tokenIn - The tokenIn address. Token to be sent.
     * @param tokenOut - The tokenOut address. Token to be received.
     * @param fee - The fee amount.
     * @param recipient - The recipient address. Default is the signer address.
     * @param amountOut - The amount of tokenOut to be received.
     * @param amountInMaximum - The maximum amount of tokenIn to be sent.
     * @param sqrtPriceLimitX96 - The square root price limit. Default is 0.
     * @returns - The amount of tokenIn sent.
     */
    public async v3ExactOutputSingle(
        signer: HardhatEthersSigner,
        tokenIn: string,
        tokenOut: string,
        fee: bigint | number,
        recipient: string,
        amountOut: bigint | number,
        amountInMaximum: bigint | number,
        sqrtPriceLimitX96?: bigint | number
    ): Promise<bigint> {
        await this._v3InitCheck();

        // Get the tokenIn contract.
        const tokenInContract = await ethers.getContractAt("IERC20", tokenIn);

        // Approve the router to spend the tokens.
        await tokenInContract.connect(signer).approve(this.uniswapV3SwapRouter, amountInMaximum);

        // Prepare the arguments.
        const params: ISwapRouter02.ExactOutputSingleParamsStruct = {
            tokenIn: tokenIn,
            tokenOut: tokenOut,
            fee: fee,
            recipient: recipient,
            amountOut: amountOut,
            amountInMaximum: amountInMaximum,
            sqrtPriceLimitX96: sqrtPriceLimitX96 !== undefined ? sqrtPriceLimitX96 : 0
        };

        // Make the swap.
        const amountIn = await this.uniswapV3SwapRouter.connect(signer).exactOutputSingle.staticCall(params);

        await this.uniswapV3SwapRouter.connect(signer).exactOutputSingle(params);

        return amountIn;
    }

    /**
     * @notice Perform a Uniswap V3 swap with exact amount in.
     *
     * @param signer - The signer to make the swap.
     * @param path - The path of tokens to be swapped.
     * Example: ["token0", 500 "token1", 500, "token2"]
     * @param types - The types of the path.
     * Example: ["address", "uint256", "address", "uint256", "address"]
     * @param recipient - The recipient address. Default is the signer address.
     * @param amountIn - The amount of tokenIn to be sent (first token in path).
     * @param amountOutMinimum - The minimum amount of tokenOut to be received (last token in path).
     * @returns - The amount of tokenOut received.
     */
    public async v3ExactInputMulti(
        signer: HardhatEthersSigner,
        path: any[],
        types: any[],
        recipient: string,
        amountIn: bigint | number,
        amountOutMinimum: bigint | number
    ): Promise<bigint> {
        await this._v3InitCheck();

        const encodedPath = ethers.solidityPacked(types, path);

        // Get the tokenIn contract.
        const tokenInContract = await ethers.getContractAt("IERC20", path[0]);

        // Approve the router to spend the tokens.
        await tokenInContract.connect(signer).approve(this.uniswapV3SwapRouter, amountIn);

        // Prepare the arguments.
        const params: ISwapRouter02.ExactInputParamsStruct = {
            path: encodedPath,
            recipient: recipient,
            amountIn: amountIn,
            amountOutMinimum: amountOutMinimum
        };

        // Make the swap.
        const amountsOut = await this.uniswapV3SwapRouter.connect(signer).exactInput.staticCall(params);

        await this.uniswapV3SwapRouter.connect(signer).exactInput(params);

        return amountsOut;
    }

    /**
     * @notice Perform a Uniswap V3 swap with exact amount out.
     *
     * @param signer - The signer to make the swap.
     * @param path - The path of tokens to be swapped.
     * Example: ["token0", 500 "token1", 500, "token2"]
     * @param types - The types of the path.
     * Example: ["address", "uint256", "address", "uint256", "address"]
     * @param recipient - The recipient address. Default is the signer address.
     * @param amountOut - The amount of tokenOut to be received (last token in path).
     * @param amountInMaximum - The maximum amount of tokenIn to be sent (first token in path).
     * @returns - The amount of tokenIn sent.
     */
    public async v3ExactOutputMulti(
        signer: HardhatEthersSigner,
        path: any[],
        types: any[],
        recipient: string,
        amountOut: bigint | number,
        amountInMaximum: bigint | number
    ): Promise<bigint> {
        await this._v3InitCheck();

        const encodedPath = ethers.solidityPacked(types, path);

        // Get the tokenIn contract.
        const tokenInContract = await ethers.getContractAt("IERC20", path[0]);

        // Approve the router to spend the tokens.
        await tokenInContract.connect(signer).approve(this.uniswapV3SwapRouter, amountInMaximum);

        // Prepare the arguments.
        const params: ISwapRouter02.ExactOutputParamsStruct = {
            path: encodedPath,
            recipient: recipient,
            amountOut: amountOut,
            amountInMaximum: amountInMaximum
        };

        // Make the swap.
        const amountsIn = await this.uniswapV3SwapRouter.connect(signer).exactOutput.staticCall(params);

        await this.uniswapV3SwapRouter.connect(signer).exactOutput(params);

        return amountsIn;
    }

    private async _v3InitCheck() {
        if (this.uniswapV3SwapRouter === undefined) {
            throw new Error("Uniswap V3 Swap Router not initialized");
        }
    }
}

export { Uniswap };
