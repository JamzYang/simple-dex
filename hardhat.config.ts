import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@nomiclabs/hardhat-ethers";
import * as dotenv from "dotenv";

dotenv.config();

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.17",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    hardhat: {
      accounts: [
        {
          privateKey: "0x580f63c571e48c6b887f05f707161d32d05aa5438e56e2378695a354112cb243",
          balance: "10000000000000000000000"
        },
        {
          privateKey: "0xf927445352e588c9769ed7cfd028eaf6b41a23c4567d03c6015f9132d1869c14",
          balance: "10000000000000000000000"
        },
        {
          privateKey: "0x6912c6c9e16923030aafce353afe1cad2496b1848b48ccb445ff8db2a4f47e3e",
          balance: "10000000000000000000000"
        }
      ]
    },
    localhost: {
      url: "http://127.0.0.1:8545",
      accounts: [
        "0x580f63c571e48c6b887f05f707161d32d05aa5438e56e2378695a354112cb243",
        "0xf927445352e588c9769ed7cfd028eaf6b41a23c4567d03c6015f9132d1869c14",
        "0x6912c6c9e16923030aafce353afe1cad2496b1848b48ccb445ff8db2a4f47e3e"
      ]
    },
    sepolia: {
      url: process.env.SEPOLIA_URL || "",
      accounts:
        process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    }
  },
  etherscan: {
    apiKey: {
      sepolia: process.env.SEPOLIA_ETHERSCAN_API_KEY || ""
    }
  }
};

export default config;
