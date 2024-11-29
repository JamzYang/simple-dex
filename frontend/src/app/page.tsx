'use client';
import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import SwapForm from '../components/SwapForm';
import { TokenABI, PairABI, FactoryABI } from '../contracts/abis';
import addresses from '../contracts/addresses.json';

export default function Home() {
  const [account, setAccount] = useState<string>('');
  const [token0Contract, setToken0Contract] = useState<any>(null);
  const [token1Contract, setToken1Contract] = useState<any>(null);
  const [pairContract, setPairContract] = useState<any>(null);

  useEffect(() => {
    const init = async () => {
      if (typeof window !== 'undefined' && typeof window.ethereum !== 'undefined') {
        try {
          // Request account access
          const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
          setAccount(accounts[0]);

          const provider = new ethers.providers.Web3Provider(window.ethereum);
          const signer = provider.getSigner();

          // Initialize contracts
          setToken0Contract(new ethers.Contract(addresses.token0, TokenABI, signer));
          setToken1Contract(new ethers.Contract(addresses.token1, TokenABI, signer));
          setPairContract(new ethers.Contract(addresses.pair, PairABI, signer));
        } catch (error) {
          console.error('Failed to initialize:', error);
        }
      }
    };

    init();
  }, []);

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
    <main className="min-h-screen bg-gray-100 py-6 flex flex-col justify-center sm:py-12">
      <div className="relative py-3 sm:max-w-xl sm:mx-auto">
        <div className="relative px-4 py-10 bg-white shadow-lg sm:rounded-3xl sm:p-20">
          <div className="max-w-md mx-auto">
            <div className="divide-y divide-gray-200">
              <div className="py-8 text-base leading-6 space-y-4 text-gray-700 sm:text-lg sm:leading-7">
                <h1 className="text-2xl font-bold mb-8">Simple DEX</h1>
                {token0Contract && token1Contract && pairContract ? (
                  <SwapForm
                    token0Contract={token0Contract}
                    token1Contract={token1Contract}
                    pairContract={pairContract}
                    account={account}
                  />
                ) : (
                  <p>Loading contracts...</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
