const hre = require("hardhat");
const fs = require('fs');
const path = require('path');

async function main() {
  console.log("==================================================");
  console.log("🧪 Testing Write to Polygon Amoy Testnet");
  console.log("==================================================\n");

  const contractInfoPath = path.join(__dirname, '../contracts/TreasuryLogger.json');
  const contractInfo = JSON.parse(fs.readFileSync(contractInfoPath, 'utf8'));

  console.log("📋 Contract Address:", contractInfo.address);
  
  const network = await hre.ethers.provider.getNetwork();
  console.log("🌐 Connected to:", network.name);
  console.log("🔗 Chain ID:", network.chainId, "\n");

  const [signer] = await hre.ethers.getSigners();
  const balance = await hre.ethers.provider.getBalance(signer.address);

  console.log("👤 Signer:", signer.address);
  console.log("💰 Balance:", hre.ethers.formatEther(balance), "MATIC\n");

  if (balance === 0n) {
    console.error("❌ No MATIC!");
    process.exit(1);
  }

  const TreasuryLogger = await hre.ethers.getContractAt("TreasuryLogger", contractInfo.address);
  const currentLogCount = await TreasuryLogger.logCount();
  console.log("📊 Current log count:", currentLogCount.toString(), "\n");

  const testTreasury = "0x2222222222222222222222222222222222222222";
  const amount = hre.ethers.parseEther("75");
  const detailHash = hre.ethers.keccak256(hre.ethers.toUtf8Bytes("Test - " + Date.now()));

  console.log("🚀 Sending transaction...");
  const tx = await TreasuryLogger.logTransaction(testTreasury, amount, false, detailHash);
  
  console.log("⏳ Tx hash:", tx.hash);
  const receipt = await tx.wait(2);

  console.log("\n✅ Confirmed! Block:", receipt.blockNumber);
  console.log("   Gas used:", receipt.gasUsed.toString());

  const newLogCount = await TreasuryLogger.logCount();
  console.log("\n📊 New log count:", newLogCount.toString());

  console.log("\n🔍 View on PolygonScan:");
  console.log("   https://amoy.polygonscan.com/tx/" + tx.hash);
  
  console.log("\n🎉 SUCCESS! Data written to testnet!");
}

main().then(() => process.exit(0)).catch((error) => {
  console.error("\n❌ Error:", error.message);
  process.exit(1);
});
