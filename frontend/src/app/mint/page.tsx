'use client';
import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { TokenABI, PairABI, RouterABI } from '../../contracts/abis';
import addresses from '../../contracts/addresses.json';

export default function MintPage() {
  const [account, setAccount] = useState('');
  const [loading, setLoading] = useState(false);
  const [token0Balance, setToken0Balance] = useState('0');
  const [token1Balance, setToken1Balance] = useState('0');
  const [liquidityAmount, setLiquidityAmount] = useState('');

  useEffect(() => {
    const init = async () => {
      if (typeof window !== 'undefined' && typeof window.ethereum !== 'undefined') {
        try {
          const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
          setAccount(accounts[0]);
          await updateBalances(accounts[0]);
        } catch (error) {
          console.error('Failed to initialize:', error);
        }
      }
    };
    init();
  }, []);

  const updateBalances = async (account: string) => {
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const token0 = new ethers.Contract(addresses.token0, TokenABI, provider);
    const token1 = new ethers.Contract(addresses.token1, TokenABI, provider);
    
    const balance0 = await token0.balanceOf(account);
    const balance1 = await token1.balanceOf(account);
    
    setToken0Balance(ethers.utils.formatEther(balance0));
    setToken1Balance(ethers.utils.formatEther(balance1));
  };

  const mintTokens = async () => {
    try {
      setLoading(true);
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      
      // 铸造 Token0
      const token0Contract = new ethers.Contract(addresses.token0, TokenABI, signer);
      const tx1 = await token0Contract.mint(account, ethers.utils.parseEther('1000'));
      await tx1.wait();
      
      // 铸造 Token1
      const token1Contract = new ethers.Contract(addresses.token1, TokenABI, signer);
      const tx2 = await token1Contract.mint(account, ethers.utils.parseEther('1000'));
      await tx2.wait();
      
      // 更新余额
      await updateBalances(account);
    } catch (error) {
      console.error('Failed to mint tokens:', error);
    } finally {
      setLoading(false);
    }
  };

  const addLiquidity = async () => {
    try {
      setLoading(true);
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();

      // 获取合约实例
      const token0Contract = new ethers.Contract(addresses.token0, TokenABI, signer);
      const token1Contract = new ethers.Contract(addresses.token1, TokenABI, signer);
      const routerContract = new ethers.Contract(addresses.router, RouterABI, signer);

      // 转换流动性数量
      const liquidityTokenAmount = ethers.utils.parseEther(liquidityAmount || '0');

      // 批准路由合约花费代币
      const approveTx0 = await token0Contract.approve(
        addresses.router, 
        liquidityTokenAmount
      );
      await approveTx0.wait();

      const approveTx1 = await token1Contract.approve(
        addresses.router, 
        liquidityTokenAmount
      );
      await approveTx1.wait();

      // 添加流动性
      const tx = await routerContract.addLiquidity(
        addresses.token0,  // tokenA
        addresses.token1,  // tokenB
        liquidityTokenAmount,  // amountADesired
        liquidityTokenAmount,  // amountBDesired
        liquidityTokenAmount.mul(95).div(100),  // amountAMin (允许 5% 滑点)
        liquidityTokenAmount.mul(95).div(100),  // amountBMin
        account,  // to
        Math.floor(Date.now() / 1000) + 300  // deadline (5分钟后)
      );

      await tx.wait();

      // 更新余额
      await updateBalances(account);

      // 清空输入
      setLiquidityAmount('');

      alert('成功添加流动性！');
    } catch (error) {
      console.error('添加流动性失败:', error);
      alert(`添加流动性失败: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  if (!account) {
    return (
      <div className="min-h-screen bg-gray-100 py-6 flex flex-col justify-center sm:py-12">
        <div className="relative py-3 sm:max-w-xl sm:mx-auto">
          <div className="relative px-4 py-10 bg-white shadow-lg sm:rounded-3xl sm:p-20">
            <div className="max-w-md mx-auto">
              <div className="divide-y divide-gray-200">
                <div className="py-8 text-base leading-6 space-y-4 text-gray-700 sm:text-lg sm:leading-7">
                  <p>Please connect your wallet to continue.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-6 flex flex-col justify-center sm:py-12">
      <div className="relative py-3 sm:max-w-xl sm:mx-auto">
        <div className="relative px-4 py-10 bg-white shadow-lg sm:rounded-3xl sm:p-20">
          <div className="max-w-md mx-auto">
            <div className="divide-y divide-gray-200">
              <div className="py-8 text-base leading-6 space-y-4 text-gray-700 sm:text-lg sm:leading-7">
                <h1 className="text-2xl font-bold mb-8">Mint Test Tokens</h1>
                <div className="space-y-4">
                  <div>
                    <p>Token0 Balance: {parseFloat(token0Balance).toFixed(4)}</p>
                    <p>Token1 Balance: {parseFloat(token1Balance).toFixed(4)}</p>
                  </div>
                  <button
                    onClick={mintTokens}
                    disabled={loading}
                    className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
                  >
                    {loading ? 'Minting...' : 'Mint 1000 of each token'}
                  </button>
                  <div className="mt-4">
                    <input 
                      type="number" 
                      value={liquidityAmount} 
                      onChange={(e) => setLiquidityAmount(e.target.value)} 
                      placeholder="流动性数量" 
                      className="w-full bg-gray-100 py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 mb-2"
                    />
                    <button
                      onClick={addLiquidity}
                      disabled={loading || !liquidityAmount}
                      className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50"
                    >
                      {loading ? 'Adding liquidity...' : 'Add Liquidity'}
                    </button>
                  </div>
                  <div className="mt-4 text-sm text-gray-600">
                    <p>注意：添加流动性需要相等数量的 Token0 和 Token1</p>
                    <p>建议先铸造代币，再添加流动性</p>
                  </div>
                  <div className="mt-4">
                    <a
                      href="/"
                      className="text-indigo-600 hover:text-indigo-800"
                    >
                      Back to Swap
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
