'use client';
import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';

interface SwapFormProps {
  token0Contract: any;
  token1Contract: any;
  pairContract: any;
  account: string;
}

export default function SwapForm({ token0Contract, token1Contract, pairContract, account }: SwapFormProps) {
  const [amount0, setAmount0] = useState('');
  const [amount1, setAmount1] = useState('');
  const [loading, setLoading] = useState(false);
  const [token0Balance, setToken0Balance] = useState('0');
  const [token1Balance, setToken1Balance] = useState('0');
  const [token0Allowance, setToken0Allowance] = useState('0');
  const [reserves, setReserves] = useState<[ethers.BigNumber, ethers.BigNumber]>([
    ethers.BigNumber.from(0),
    ethers.BigNumber.from(0),
  ]);

  // 添加状态用于存储流动性池信息
  const [liquidityPoolInfo, setLiquidityPoolInfo] = useState({
    reserve0: '0',
    reserve1: '0',
    token0Balance: '0',
    token1Balance: '0'
  });

  // 判断流动性池是否有效
  const isLiquidityPoolValid = () => {
    const reserve0 = parseFloat(liquidityPoolInfo.reserve0);
    const reserve1 = parseFloat(liquidityPoolInfo.reserve1);
    return reserve0 > 0 && reserve1 > 0;
  };

  // 新增：检查流动性池详细状态的方法
  const checkLiquidityPoolStatus = async () => {
    try {
      // 获取流动性池储备
      const [reserve0, reserve1] = await pairContract.getReserves();
      
      // 获取代币信息
      const token0Address = await pairContract.token0();
      const token1Address = await pairContract.token1();
      
      // 获取代币余额
      const token0Balance = await token0Contract.balanceOf(pairContract.address);
      const token1Balance = await token1Contract.balanceOf(pairContract.address);
      
      // 格式化并存储流动性池信息
      const poolInfo = {
        reserve0: ethers.utils.formatEther(reserve0),
        reserve1: ethers.utils.formatEther(reserve1),
        token0Balance: ethers.utils.formatEther(token0Balance),
        token1Balance: ethers.utils.formatEther(token1Balance)
      };

      // 更新状态
      setLiquidityPoolInfo(poolInfo);

      console.log('流动性池详细状态:', {
        token0: {
          address: token0Address,
          reserves: poolInfo.reserve0,
          balance: poolInfo.token0Balance
        },
        token1: {
          address: token1Address,
          reserves: poolInfo.reserve1,
          balance: poolInfo.token1Balance
        }
      });

      return poolInfo;
    } catch (error) {
      console.error('检查流动性池状态时出错:', error);
      throw error;
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      if (pairContract && account) {
        const [reserve0, reserve1] = await pairContract.getReserves();
        setReserves([reserve0, reserve1]);
        
        const balance0 = await token0Contract.balanceOf(account);
        const balance1 = await token1Contract.balanceOf(account);
        const allowance = await token0Contract.allowance(account, pairContract.address);
        
        setToken0Balance(ethers.utils.formatEther(balance0));
        setToken1Balance(ethers.utils.formatEther(balance1));
        setToken0Allowance(ethers.utils.formatEther(allowance));
      }
    };
    fetchData();
  }, [pairContract, account, token0Contract, token1Contract]);

  useEffect(() => {
    const fetchLiquidityPoolStatus = async () => {
      if (pairContract && account) {
        try {
          await checkLiquidityPoolStatus();
        } catch (error) {
          console.error('初始化时获取流动性池状态失败:', error);
        }
      }
    };
    fetchLiquidityPoolStatus();
  }, [pairContract, account]);

  const handleAmount0Change = (value: string) => {
    setAmount0(value);
    if (value && !isNaN(Number(value))) {
      const amount0In = ethers.utils.parseEther(value);
      const reserve0 = reserves[0];
      const reserve1 = reserves[1];
      const amount1Out = amount0In.mul(reserve1).div(reserve0.add(amount0In));
      setAmount1(ethers.utils.formatEther(amount1Out));
    } else {
      setAmount1('');
    }
  };

  const handleApprove = async () => {
    try {
      setLoading(true);
      const amount = ethers.constants.MaxUint256;
      const tx = await token0Contract.approve(pairContract.address, amount);
      await tx.wait();
      const newAllowance = await token0Contract.allowance(account, pairContract.address);
      setToken0Allowance(ethers.utils.formatEther(newAllowance));
    } catch (error) {
      console.error('Approval failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSwap = async () => {
    try {
      setLoading(true);
      
      // 1. 检查输入
      if (!amount0 && !amount1) {
        throw new Error('请输入交换金额');
      }

      // 2. 获取当前储备量
      const [reserve0, reserve1] = await pairContract.getReserves();
      
      // 3. 转换为 Wei
      const amount0In = amount0 ? ethers.utils.parseEther(amount0) : ethers.BigNumber.from(0);
      const amount1Out = amount1 ? ethers.utils.parseEther(amount1) : ethers.BigNumber.from(0);

      // 4. 检查并授权
      if (amount0In.gt(0)) {
        const allowance = await token0Contract.allowance(account, pairContract.address);
        if (allowance.lt(amount0In)) {
          const approveTx = await token0Contract.approve(pairContract.address, amount0In);
          await approveTx.wait();
          console.log('Token0 approved');
        }
      }

      // 5. 计算预期输出
      const x = reserve0;
      const y = reserve1;
      const dx = amount0In;
      const dy = amount1Out;

      console.log('Swap parameters:', {
        reserve0: ethers.utils.formatEther(x),
        reserve1: ethers.utils.formatEther(y),
        amount0In: ethers.utils.formatEther(dx),
        amount1Out: ethers.utils.formatEther(dy)
      });

      // 6. 执行交换
      const tx = await pairContract.swap(
        0,           // amount0Out (我们不需要输出token0)
        amount1Out,  // amount1Out (我们想要获得的token1数量)
        account      // recipient (接收地址)
      );
      
      console.log('Swap transaction sent:', tx.hash);
      const receipt = await tx.wait();
      console.log('Swap transaction confirmed:', receipt.transactionHash);

      // 7. 刷新余额和储备量
      await Promise.all([
        updateBalances(),
        updateReserves()
      ]);

      // 8. 重置输入
      setAmount0('');
      setAmount1('');

      // 9. 用户友好提示
      alert('交换成功！');

    } catch (error: any) {
      console.error('Swap Error:', error);
      const errorMessage = error.reason || error.message || error.toString();
      alert(`交换失败: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const needsApproval = ethers.utils.parseEther(token0Allowance).lt(ethers.utils.parseEther(amount0 || '0'));

  const updateBalances = async () => {
    const balance0 = await token0Contract.balanceOf(account);
    const balance1 = await token1Contract.balanceOf(account);
    setToken0Balance(ethers.utils.formatEther(balance0));
    setToken1Balance(ethers.utils.formatEther(balance1));
  };

  const updateReserves = async () => {
    const [reserve0, reserve1] = await pairContract.getReserves();
    setReserves([reserve0, reserve1]);
  };

  return (
    <div className="max-w-md mx-auto bg-white rounded-xl shadow-md overflow-hidden p-6">
      <div className="space-y-4">
        {/* 流动性池信息卡片 */}
        <div className="bg-gray-100 p-4 rounded-lg">
          <h3 className="text-lg font-semibold mb-2 text-gray-700">流动性池状态</h3>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-sm text-gray-600">Token0 储备:</p>
              <p className="font-medium">{parseFloat(liquidityPoolInfo.reserve0).toFixed(4)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Token1 储备:</p>
              <p className="font-medium">{parseFloat(liquidityPoolInfo.reserve1).toFixed(4)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Token0 余额:</p>
              <p className="font-medium">{parseFloat(liquidityPoolInfo.token0Balance).toFixed(4)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Token1 余额:</p>
              <p className="font-medium">{parseFloat(liquidityPoolInfo.token1Balance).toFixed(4)}</p>
            </div>
          </div>
          
          {/* 流动性不足警告 */}
          {!isLiquidityPoolValid() && (
            <div className="mt-2 bg-yellow-50 border-l-4 border-yellow-400 p-2">
              <div className="flex">
                <div className="ml-3">
                  <p className="text-sm text-yellow-700">
                    流动性池当前没有足够的代币进行交易。
                  </p>
                  <p className="text-sm text-yellow-700 mt-1">
                    请先 
                    <a 
                      href="/mint" 
                      className="underline text-yellow-800 hover:text-yellow-900"
                    >
                      添加流动性
                    </a>
                    到交易对中。
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">From (Token0)</label>
          <div className="mt-1">
            <input
              type="number"
              value={amount0}
              onChange={(e) => handleAmount0Change(e.target.value)}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              placeholder="0.0"
              disabled={loading}
            />
            <p className="mt-1 text-sm text-gray-500">Balance: {parseFloat(token0Balance).toFixed(4)}</p>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">To (Token1)</label>
          <div className="mt-1">
            <input
              type="number"
              value={amount1}
              readOnly
              className="block w-full rounded-md border-gray-300 shadow-sm bg-gray-50"
              placeholder="0.0"
            />
            <p className="mt-1 text-sm text-gray-500">Balance: {parseFloat(token1Balance).toFixed(4)}</p>
          </div>
        </div>
        
        {needsApproval ? (
          <button
            onClick={handleApprove}
            disabled={loading}
            className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
          >
            {loading ? 'Approving...' : 'Approve Token0'}
          </button>
        ) : (
          <button
            onClick={handleSwap}
            disabled={loading || !amount0 || !amount1 || !isLiquidityPoolValid()}
            className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
          >
            {loading ? 'Swapping...' : 'Swap'}
          </button>
        )}
      </div>
    </div>
  );
}
