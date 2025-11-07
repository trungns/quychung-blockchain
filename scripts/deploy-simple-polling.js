const { Web3 } = require('web3');
const solc = require('solc');
const fs = require('fs');
const path = require('path');

const RPC_URL = process.env.BLOCKCHAIN_RPC || 'http://geth:8545';
const web3 = new Web3(RPC_URL);

// Compile contract
function compileContract() {
    console.log('📝 Compiling contract...');
    const contractPath = path.join(__dirname, '../contracts/TreasuryLogger.sol');
    const source = fs.readFileSync(contractPath, 'utf8');

    const input = {
        language: 'Solidity',
        sources: {
            'TreasuryLogger.sol': {
                content: source
            }
        },
        settings: {
            outputSelection: {
                '*': {
                    '*': ['abi', 'evm.bytecode']
                }
            }
        }
    };

    const output = JSON.parse(solc.compile(JSON.stringify(input)));

    if (output.errors) {
        const errors = output.errors.filter(e => e.severity === 'error');
        if (errors.length > 0) {
            console.error('Compilation errors:', errors);
            throw new Error('Contract compilation failed');
        }
    }

    const contract = output.contracts['TreasuryLogger.sol']['TreasuryLogger'];
    console.log('✅ Contract compiled successfully');

    return {
        abi: contract.abi,
        bytecode: contract.evm.bytecode.object
    };
}

// Wait for transaction receipt with polling
async function waitForReceipt(txHash, maxAttempts = 60, pollInterval = 1000) {
    console.log(`⏳ Waiting for transaction receipt: ${txHash}`);

    for (let i = 0; i < maxAttempts; i++) {
        try {
            const receipt = await web3.eth.getTransactionReceipt(txHash);
            if (receipt) {
                console.log(`✅ Receipt received after ${i + 1} attempts`);
                return receipt;
            }
        } catch (error) {
            // Ignore errors and continue polling
        }

        // Wait before next attempt
        await new Promise(resolve => setTimeout(resolve, pollInterval));

        if (i % 5 === 4) {
            console.log(`   Still waiting... (${i + 1}/${maxAttempts})`);
        }
    }

    throw new Error(`Transaction receipt not found after ${maxAttempts} attempts`);
}

// Deploy contract
async function deployContract() {
    try {
        console.log('🚀 Starting deployment...');
        console.log(`   RPC URL: ${RPC_URL}`);

        // Get accounts
        const accounts = await web3.eth.getAccounts();
        if (accounts.length === 0) {
            throw new Error('No accounts available');
        }
        const deployerAccount = accounts[0];
        console.log(`   Deployer: ${deployerAccount}`);

        // Compile contract
        const { abi, bytecode } = compileContract();

        // Create contract instance
        const contract = new web3.eth.Contract(abi);

        // Estimate gas
        console.log('⛽ Estimating gas...');
        const deployData = contract.deploy({
            data: '0x' + bytecode,
            arguments: []
        }).encodeABI();

        const gasEstimate = await web3.eth.estimateGas({
            from: deployerAccount,
            data: deployData
        });
        console.log(`   Estimated gas: ${gasEstimate}`);

        // Get gas price
        const gasPrice = await web3.eth.getGasPrice();
        console.log(`   Gas price: ${gasPrice}`);

        // Send transaction
        console.log('📤 Sending deployment transaction...');
        const tx = await web3.eth.sendTransaction({
            from: deployerAccount,
            data: deployData,
            gas: gasEstimate + 100000n, // Add buffer
            gasPrice: gasPrice
        });

        console.log(`   Transaction hash: ${tx.transactionHash}`);

        // Wait for receipt with polling
        const receipt = await waitForReceipt(tx.transactionHash);

        if (!receipt.contractAddress) {
            throw new Error('Contract address not found in receipt');
        }

        console.log(`✅ Contract deployed at: ${receipt.contractAddress}`);
        console.log(`   Block number: ${receipt.blockNumber}`);
        console.log(`   Gas used: ${receipt.gasUsed}`);

        // Save contract info
        const contractInfo = {
            address: receipt.contractAddress,
            abi: abi,
            transactionHash: tx.transactionHash,
            blockNumber: receipt.blockNumber,
            deployedAt: new Date().toISOString()
        };

        const outputPath = path.join(__dirname, '../contracts/TreasuryLogger.json');
        fs.writeFileSync(outputPath, JSON.stringify(contractInfo, null, 2));
        console.log(`📋 Contract info saved to: ${outputPath}`);

        return contractInfo;
    } catch (error) {
        console.error('❌ Deployment failed:', error.message);
        throw error;
    }
}

// Main
deployContract()
    .then(() => {
        console.log('✅ Deployment completed successfully!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Deployment failed:', error);
        process.exit(1);
    });
