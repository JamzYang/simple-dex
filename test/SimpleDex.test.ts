import { expect } from "chai";
import { ethers } from "hardhat";
import { Contract, ContractFactory, BigNumber } from "ethers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import "@nomicfoundation/hardhat-chai-matchers";

describe("SimpleDex", function () {
  let Token: ContractFactory;
  let Factory: ContractFactory;
  let token0: Contract;
  let token1: Contract;
  let factory: Contract;
  let pair: Contract;
  let owner: SignerWithAddress;
  let user: SignerWithAddress;

  const INITIAL_SUPPLY = ethers.utils.parseEther("1000000");
  const token0Amount = ethers.utils.parseEther("10");
  const token1Amount = ethers.utils.parseEther("10");
  const swapAmount = ethers.utils.parseEther("1");

  beforeEach(async function () {
    [owner, user] = await ethers.getSigners();

    // 部署合约
    Token = await ethers.getContractFactory("Token");
    token0 = await Token.deploy("Token0", "TK0", INITIAL_SUPPLY);
    token1 = await Token.deploy("Token1", "TK1", INITIAL_SUPPLY);

    Factory = await ethers.getContractFactory("Factory");
    factory = await Factory.deploy();

    // 确保token0地址小于token1地址
    [token0, token1] = await Promise.all([token0.deployed(), token1.deployed()]);
    if (token0.address > token1.address) {
      [token0, token1] = [token1, token0];
    }

    // 创建交易对
    await factory.createPair(token0.address, token1.address);
    const pairAddress = await factory.getPair(token0.address, token1.address);
    pair = await ethers.getContractAt("Pair", pairAddress);
  });

  describe("Factory", function () {
    it("应该正确创建交易对", async function () {
      expect(await factory.allPairsLength()).to.equal(BigNumber.from(1));
      const pairAddress = await factory.getPair(token0.address, token1.address);
      expect(pairAddress).to.not.equal(ethers.constants.AddressZero);
    });

    it("不应该允许创建重复的交易对", async function () {
      await expect(
        factory.createPair(token0.address, token1.address)
      ).to.be.revertedWith("PAIR_EXISTS");
    });
  });

  describe("Liquidity", function () {
    it("应该能够添加初始流动性", async function () {
      await token0.approve(pair.address, token0Amount);
      await token1.approve(pair.address, token1Amount);
      await token0.transfer(pair.address, token0Amount);
      await token1.transfer(pair.address, token1Amount);
      await pair.mint(owner.address);

      const totalSupply = await pair.totalSupply();
      const minLiquidity = await pair.MINIMUM_LIQUIDITY();
      expect(totalSupply.sub(minLiquidity)).to.equal(
        ethers.utils.parseEther("10").sub(minLiquidity)
      );

      expect(await token0.balanceOf(pair.address)).to.equal(token0Amount);
      expect(await token1.balanceOf(pair.address)).to.equal(token1Amount);
    });

    it("应该能够移除流动性", async function () {
      // 添加流动性
      await token0.transfer(pair.address, token0Amount);
      await token1.transfer(pair.address, token1Amount);
      await pair.mint(owner.address);

      const liquidity = await pair.balanceOf(owner.address);
      await pair.approve(pair.address, liquidity);
      await pair.transfer(pair.address, liquidity);
      await pair.burn(owner.address);

      expect(await pair.balanceOf(owner.address)).to.equal(BigNumber.from(0));
      // 考虑到MINIMUM_LIQUIDITY锁定，pair中的每个代币都会保留最小流动性
      const minLiquidity = await pair.MINIMUM_LIQUIDITY();
      expect(await token0.balanceOf(pair.address)).to.equal(minLiquidity);
      expect(await token1.balanceOf(pair.address)).to.equal(minLiquidity);
    });
  });

  describe("Swapping", function () {
    beforeEach(async function () {
      // 添加初始流动性
      await token0.transfer(pair.address, token0Amount);
      await token1.transfer(pair.address, token1Amount);
      await pair.mint(owner.address);
    });

    it("应该能够交换token0换token1", async function () {
      const [reserve0, reserve1] = await pair.getReserves();
      // 计算预期输出，考虑0.3%的手续费
      const amountInWithFee = swapAmount.mul(997);
      const numerator = amountInWithFee.mul(reserve1);
      const denominator = reserve0.mul(1000).add(amountInWithFee);
      const expectedOut = numerator.div(denominator);

      await token0.transfer(pair.address, swapAmount);
      await pair.swap(0, expectedOut, owner.address);

      const reserves = await pair.getReserves();
      expect(reserves[0]).to.equal(token0Amount.add(swapAmount));
      expect(reserves[1]).to.equal(token1Amount.sub(expectedOut));
    });

    it("不应该允许无效的交换", async function () {
      await expect(
        pair.swap(token0Amount, token1Amount, owner.address)
      ).to.be.revertedWith("INSUFFICIENT_LIQUIDITY");
    });
  });
});
