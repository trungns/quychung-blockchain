const hre = require("hardhat");
const fs = require('fs');

async function main() {
  const contractInfo = JSON.parse(fs.readFileSync('contracts/TreasuryLogger.json', 'utf8'));
  const TreasuryLogger = await hre.ethers.getContractAt("TreasuryLogger", contractInfo.address);
  
  const logCount = await TreasuryLogger.logCount();
  console.log("\n📊 Total logs on blockchain:", logCount.toString());
  
  const lastIndex = logCount - 1n;
  const log = await TreasuryLogger.logs(lastIndex);
  
  console.log("\n📝 Latest transaction (your 1,000,000 quỹ):");
  console.log("   Treasury:", log.treasury);
  console.log("   Amount:", hre.ethers.formatEther(log.amountToken), "tokens");
  console.log("   Type:", log.isIncome ? "Income ✅" : "Expense ❌");
  console.log("   Timestamp:", new Date(Number(log.timestamp) * 1000).toISOString());
  console.log("   Logged by:", log.loggedBy);
  console.log("   Detail hash:", log.detailHash);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
