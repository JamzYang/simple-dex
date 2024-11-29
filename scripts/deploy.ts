import { ethers, run } from "hardhat";

async function main() {
  // 部署 Token 合约
  const Token = await ethers.getContractFactory("Token");
  const token0 = await Token.deploy("TestToken0", "TK0", ethers.utils.parseEther("1000000"));
  const token1 = await Token.deploy("TestToken1", "TK1", ethers.utils.parseEther("1000000"));
  await token0.deployed();
  await token1.deployed();

  console.log(`Token0 deployed to: ${token0.address}`);
  console.log(`Token1 deployed to: ${token1.address}`);

  // 部署 Factory 合约
  const Factory = await ethers.getContractFactory("Factory");
  const factory = await Factory.deploy();
  await factory.deployed();

  console.log(`Factory deployed to: ${factory.address}`);

  // 创建交易对
  const tx = await factory.createPair(token0.address, token1.address);
  const receipt = await tx.wait();
  
  // 从事件中获取交易对地址
  const event = receipt.events?.find(e => e.event === "PairCreated");
  const pairAddress = event?.args?.[2];

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
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
