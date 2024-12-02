import { ethers } from "hardhat";

async function main() {
  // MetaMask账户地址
  const accounts = [
    "0xa42c8a4Cc1f823A6703e0cC594671729BC756Bf7",
    "0x5CaAB60643832eCE0F699f5167ccABF1d6d3Fd74",
    "0xeb9fD971995B39256804c4bf02d97b3a0f1DF775"
  ];

  // 获取一个有资金的账户作为发送方
  const [sender] = await ethers.getSigners();
  
  // 每个账户转 1000 ETH
  const amount = ethers.utils.parseEther("1000");

  for (const account of accounts) {
    console.log(`Sending 1000 ETH to ${account}...`);
    const tx = await sender.sendTransaction({
      to: account,
      value: amount
    });
    await tx.wait();
    console.log(`Transaction hash: ${tx.hash}`);
  }

  console.log("Done!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
