'use client';
import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { TokenABI } from '../../contracts/abis';
import addresses from '../../contracts/addresses.json';

export default function MintPage() {
  const [account, setAccount] = useState('');
  const [loading, setLoading] = useState(false);
  const [token0Balance, setToken0Balance] = useState('0');
  const [token1Balance, setToken1Balance] = useState('0');

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
