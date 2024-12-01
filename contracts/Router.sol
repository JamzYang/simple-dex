// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "./Factory.sol";
import "./Pair.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract Router {
    Factory public factory;

    constructor(address _factory) {
        factory = Factory(_factory);
    }

    function addLiquidity(
        address tokenA,
        address tokenB,
        uint amountADesired,
        uint amountBDesired,
        uint amountAMin,
        uint amountBMin,
        address to,
        uint deadline
    ) public returns (uint amountA, uint amountB, uint liquidity) {
        // 检查 deadline
        require(block.timestamp <= deadline, "Router: EXPIRED");

        // 检查交易对是否存在，如果不存在则创建
        address pair = factory.getPair(tokenA, tokenB);
        if (pair == address(0)) {
            pair = factory.createPair(tokenA, tokenB);
        }

        // 转移代币到交易对
        IERC20(tokenA).transferFrom(msg.sender, pair, amountADesired);
        IERC20(tokenB).transferFrom(msg.sender, pair, amountBDesired);

        // 调用交易对的 mint 方法
        liquidity = Pair(pair).mint(to);

        // 检查最小流动性
        require(amountADesired >= amountAMin, "Router: INSUFFICIENT_A_AMOUNT");
        require(amountBDesired >= amountBMin, "Router: INSUFFICIENT_B_AMOUNT");

        return (amountADesired, amountBDesired, liquidity);
    }
}
