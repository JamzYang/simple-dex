import { ethers, run } from "hardhat";
import fs from "fs";

async function main() {
  // 部署 Token 合约
  const Token = await ethers.getContractFactory("Token");
  
  const token0 = await Token.deploy(
    "TestToken0",
    "TK0",
    ethers.utils.parseEther("1000000")
  );
  await token0.deployed();
  console.log(`Token0 deployed to: ${token0.address}`);

  const token1 = await Token.deploy(
    "TestToken1",
    "TK1",
    ethers.utils.parseEther("1000000")
  );
  await token1.deployed();
  console.log(`Token1 deployed to: ${token1.address}`);

  // 部署 Factory 合约
  const Factory = await ethers.getContractFactory("Factory");
  const factory = await Factory.deploy();
  await factory.deployed();
  console.log(`Factory deployed to: ${factory.address}`);

  // 创建交易对
  await factory.createPair(token0.address, token1.address);
  const pairAddress = await factory.getPair(token0.address, token1.address);
  console.log(`Pair deployed to: ${pairAddress}`);

  // 可选：验证合约
  await Promise.all([
    run("verify:verify", {
      address: token0.address,
      contract: "contracts/Token.sol:Token",
      constructorArguments: ["TestToken0", "TK0", ethers.utils.parseEther("1000000")]
    }),
    run("verify:verify", {
      address: token1.address,
      contract: "contracts/Token.sol:Token",
      constructorArguments: ["TestToken1", "TK1", ethers.utils.parseEther("1000000")]
    }),
    run("verify:verify", {
      address: factory.address,
      contract: "contracts/Factory.sol:Factory",
      constructorArguments: []
    }),
    run("verify:verify", {
      address: pairAddress,
      contract: "contracts/Pair.sol:Pair",
      constructorArguments: []
    })
  ]).catch(console.error);

  // 将合约地址保存到文件中，供前端使用
  const contractAddresses = {
    token0: token0.address,
    token1: token1.address,
    factory: factory.address,
    pair: pairAddress
  };

  fs.writeFileSync(
    "./frontend/src/contracts/addresses.json",
    JSON.stringify(contractAddresses, null, 2)
  );

  // 为测试账户铸造一些代币
  const [deployer] = await ethers.getSigners();
  console.log("Minting initial tokens to deployer:", deployer.address);
  
  await token0.mint(deployer.address, ethers.utils.parseEther("10000"));
  await token1.mint(deployer.address, ethers.utils.parseEther("10000"));
  
  console.log("Initial tokens minted");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
