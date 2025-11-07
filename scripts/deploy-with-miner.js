const solc = require('solc');
const fs = require('fs');
const path = require('path');
const http = require('http');

const RPC_URL = process.env.BLOCKCHAIN_RPC || 'http://geth:8545';
const [protocol, rest] = RPC_URL.split('://');
const [host, port] = rest.split(':');

// RPC call helper
function rpcCall(method, params) {
    return new Promise((resolve, reject) => {
        const postData = JSON.stringify({
            jsonrpc: '2.0',
            method: method,
            params: params,
            id: Date.now()
        });

        const options = {
            hostname: host,
            port: port || 8545,
            path: '/',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            }
        };

        const req = http.request(options, (res) => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    if (json.error) {
                        reject(new Error(json.error.message));
                    } else {
                        resolve(json.result);
                    }
                } catch (e) {
                    reject(e);
                }
            });
        });

        req.on('error', (e) => {
            reject(e);
        });

        req.write(postData);
        req.end();
    });
}

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
        bytecode: '0x' + contract.evm.bytecode.object
    };
}

// Wait for receipt
async function waitForReceipt(txHash, maxAttempts = 60) {
    console.log(`⏳ Waiting for transaction: ${txHash}`);

    for (let i = 0; i < maxAttempts; i++) {
        try {
            const receipt = await rpcCall('eth_getTransactionReceipt', [txHash]);
            if (receipt) {
                console.log(`✅ Receipt received after ${i + 1} attempts`);
                return receipt;
            }
        } catch (error) {
            // Continue polling
        }

        await new Promise(resolve => setTimeout(resolve, 500));

        if (i % 5 === 4) {
            console.log(`   Still waiting... (${i + 1}/${maxAttempts})`);
        }
    }

    throw new Error('Transaction timeout');
}

// Deploy contract
async function deployContract() {
    try {
        console.log('🚀 Starting deployment...');
        console.log(`   RPC URL: ${RPC_URL}`);

        // Start miner
        console.log('⛏️  Starting miner...');
        try {
            await rpcCall('miner_start', [1]);
            console.log('✅ Miner started');
        } catch (e) {
            console.log('   Miner already running or not needed in dev mode');
        }

        // Get accounts
        const accounts = await rpcCall('eth_accounts', []);
        if (!accounts || accounts.length === 0) {
            throw new Error('No accounts available');
        }
        const deployerAccount = accounts[0];
        console.log(`   Deployer: ${deployerAccount}`);

        // Compile contract
        const { abi, bytecode } = compileContract();

        // Estimate gas
        console.log('⛽ Estimating gas...');
        const gasEstimate = await rpcCall('eth_estimateGas', [{
            from: deployerAccount,
            data: bytecode
        }]);
        console.log(`   Estimated gas: ${gasEstimate}`);

        // Send transaction
        console.log('📤 Sending deployment transaction...');
        const txHash = await rpcCall('eth_sendTransaction', [{
            from: deployerAccount,
            data: bytecode,
            gas: gasEstimate
        }]);

        console.log(`   Transaction hash: ${txHash}`);

        // Wait for receipt
        const receipt = await waitForReceipt(txHash);

        // Stop miner
        try {
            await rpcCall('miner_stop', []);
            console.log('⛏️  Miner stopped');
        } catch (e) {
            // Ignore
        }

        if (!receipt.contractAddress) {
            throw new Error('Contract address not found in receipt');
        }

        console.log(`✅ Contract deployed at: ${receipt.contractAddress}`);
        console.log(`   Block number: ${parseInt(receipt.blockNumber, 16)}`);
        console.log(`   Gas used: ${parseInt(receipt.gasUsed, 16)}`);

        // Save contract info
        const contractInfo = {
            address: receipt.contractAddress,
            abi: abi,
            transactionHash: txHash,
            blockNumber: parseInt(receipt.blockNumber, 16),
            deployedAt: new Date().toISOString()
        };

        const outputPath = path.join(__dirname, '../contracts/TreasuryLogger.json');
        fs.writeFileSync(outputPath, JSON.stringify(contractInfo, null, 2));
        console.log(`📋 Contract info saved to: ${outputPath}`);

        return contractInfo;
    } catch (error) {
        console.error('❌ Deployment failed:', error.message);
        // Try to stop miner
        try {
            await rpcCall('miner_stop', []);
        } catch (e) {
            // Ignore
        }
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
