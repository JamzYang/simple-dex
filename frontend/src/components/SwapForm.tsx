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
      const amount0In = ethers.utils.parseEther(amount0);
      const amount1Out = ethers.utils.parseEther(amount1);

      // Execute swap
      const tx = await pairContract.swap(0, amount1Out, account);
      await tx.wait();

      // Refresh balances
      const balance0 = await token0Contract.balanceOf(account);
      const balance1 = await token1Contract.balanceOf(account);
      setToken0Balance(ethers.utils.formatEther(balance0));
      setToken1Balance(ethers.utils.formatEther(balance1));

      setAmount0('');
      setAmount1('');
    } catch (error) {
      console.error('Swap failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const needsApproval = ethers.utils.parseEther(token0Allowance).lt(ethers.utils.parseEther(amount0 || '0'));

  return (
    <div className="max-w-md mx-auto bg-white rounded-xl shadow-md overflow-hidden p-6">
      <div className="space-y-4">
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
            disabled={loading || !amount0 || !amount1}
            className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
          >
            {loading ? 'Swapping...' : 'Swap'}
          </button>
        )}
      </div>
    </div>
  );
}
