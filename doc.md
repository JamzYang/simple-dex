## 核心逻辑说明：
1. 交易对创建：
```solidity
function createPair(address tokenA, address tokenB) external returns (address pair)
```
- 使用CREATE2创建新的交易对
- 确保代币地址排序（较小地址为token0）
- 初始化交易对合约
2. 添加流动性：
```solidity
function mint(address to) external returns (uint256 liquidity)
```
- 计算提供的代币数量
- 根据当前储备计算LP代币数量
- 更新储备金额
3. 代币交换：
```solidity
function swap(uint256 amount0Out, uint256 amount1Out, address to) external
```
- 验证输出金额
- 执行代币转账
- 确保交易后储备金额满足恒定乘积公式