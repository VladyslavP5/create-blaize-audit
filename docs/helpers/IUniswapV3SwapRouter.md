# Solidity API

## ISwapRouter02

### ExactInputSingleParams

```solidity
struct ExactInputSingleParams {
  address tokenIn;
  address tokenOut;
  uint24 fee;
  address recipient;
  uint256 amountIn;
  uint256 amountOutMinimum;
  uint160 sqrtPriceLimitX96;
}
```

### exactInputSingle

```solidity
function exactInputSingle(struct ISwapRouter02.ExactInputSingleParams params) external payable returns (uint256 amountOut)
```

### ExactOutputSingleParams

```solidity
struct ExactOutputSingleParams {
  address tokenIn;
  address tokenOut;
  uint24 fee;
  address recipient;
  uint256 amountOut;
  uint256 amountInMaximum;
  uint160 sqrtPriceLimitX96;
}
```

### exactOutputSingle

```solidity
function exactOutputSingle(struct ISwapRouter02.ExactOutputSingleParams params) external payable returns (uint256 amountIn)
```

### ExactInputParams

```solidity
struct ExactInputParams {
  bytes path;
  address recipient;
  uint256 amountIn;
  uint256 amountOutMinimum;
}
```

### exactInput

```solidity
function exactInput(struct ISwapRouter02.ExactInputParams params) external payable returns (uint256 amountOut)
```

### ExactOutputParams

```solidity
struct ExactOutputParams {
  bytes path;
  address recipient;
  uint256 amountOut;
  uint256 amountInMaximum;
}
```

### exactOutput

```solidity
function exactOutput(struct ISwapRouter02.ExactOutputParams params) external payable returns (uint256 amountIn)
```

