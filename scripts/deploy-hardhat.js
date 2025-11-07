const fs = require('fs');
const path = require('path');

async function main() {
  console.log("🚀 Starting deployment on Hardhat network...");

  // Get the contract factory
  const TreasuryLogger = await ethers.getContractFactory("TreasuryLogger");

  console.log("📝 Deploying TreasuryLogger contract...");

  // Deploy the contract
  const treasuryLogger = await TreasuryLogger.deploy();

  // Wait for deployment to complete
  await treasuryLogger.waitForDeployment();

  const contractAddress = await treasuryLogger.getAddress();

  console.log(`✅ TreasuryLogger deployed to: ${contractAddress}`);

  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log(`📍 Deployed by account: ${deployer.address}`);
  console.log(`💰 Account balance: ${ethers.formatEther(await ethers.provider.getBalance(deployer.address))} ETH`);

  // Get network info
  const network = await ethers.provider.getNetwork();
  console.log(`🌐 Network: ${network.name} (chainId: ${network.chainId})`);

  // Save contract address and ABI
  const contractsDir = path.join(__dirname, '..', 'contracts');

  // Read the compiled artifact
  const artifactPath = path.join(__dirname, '..', 'artifacts', 'contracts', 'TreasuryLogger.sol', 'TreasuryLogger.json');
  const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));

  // Create deployment info
  const deploymentInfo = {
    address: contractAddress,
    abi: artifact.abi,
    bytecode: artifact.bytecode,
    deployedAt: new Date().toISOString(),
    network: {
      name: network.name,
      chainId: Number(network.chainId)
    },
    deployer: deployer.address
  };

  // Save to contracts/TreasuryLogger.json
  const outputPath = path.join(contractsDir, 'TreasuryLogger.json');
  fs.writeFileSync(
    outputPath,
    JSON.stringify(deploymentInfo, null, 2)
  );

  console.log(`💾 Contract info saved to: ${outputPath}`);
  console.log("\n✨ Deployment completed successfully!");

  // Test the contract
  console.log("\n🧪 Testing contract...");

  // Create a test treasury address
  const testTreasuryAddress = "0x1111111111111111111111111111111111111111";

  // Create detail hash from transaction details
  const detailHash = ethers.keccak256(ethers.toUtf8Bytes("Test transaction - 100 tokens income"));

  const tx = await treasuryLogger.logTransaction(
    testTreasuryAddress, // treasury address
    ethers.parseEther("100"), // amount in wei
    true, // isIncome
    detailHash // detail hash
  );
  await tx.wait();
  console.log("✅ Test transaction logged successfully!");

  // Query the transaction
  const logCount = await treasuryLogger.getTreasuryLogCount(testTreasuryAddress);
  console.log(`📊 Found ${logCount} transaction(s) for treasury ${testTreasuryAddress}`);

  // Get total log count
  const totalLogs = await treasuryLogger.logCount();
  console.log(`📊 Total logs in system: ${totalLogs}`);

  return {
    address: contractAddress,
    deployer: deployer.address
  };
}

// Execute deployment
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
