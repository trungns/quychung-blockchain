const { Web3 } = require('web3');
const solc = require('solc');
const fs = require('fs');
const path = require('path');

const RPC_URL = process.env.BLOCKCHAIN_RPC || 'http://geth:8545';
// Default dev account private key from Geth dev mode
const PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY || '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';

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
        bytecode: '0x' + contract.evm.bytecode.object
    };
}

// Deploy contract using signed transaction
async function deployContract() {
    try {
        console.log('🚀 Starting deployment...');
        console.log(`   RPC URL: ${RPC_URL}`);

        // Create account from private key
        const account = web3.eth.accounts.privateKeyToAccount(PRIVATE_KEY);
        web3.eth.accounts.wallet.add(account);
        console.log(`   Deployer: ${account.address}`);

        // Compile contract
        const { abi, bytecode } = compileContract();

        // Create contract instance
        const contract = new web3.eth.Contract(abi);

        // Get gas price
        console.log('⛽ Getting gas price...');
        const gasPrice = await web3.eth.getGasPrice();
        console.log(`   Gas price: ${gasPrice}`);

        // Get nonce
        const nonce = await web3.eth.getTransactionCount(account.address);
        console.log(`   Nonce: ${nonce}`);

        // Prepare deployment transaction
        const deployTx = contract.deploy({
            data: bytecode,
            arguments: []
        });

        // Estimate gas
        console.log('⛽ Estimating gas...');
        const gas = await deployTx.estimateGas({ from: account.address });
        console.log(`   Estimated gas: ${gas}`);

        // Send transaction
        console.log('📤 Sending deployment transaction...');
        const receipt = await deployTx.send({
            from: account.address,
            gas: gas + 100000n, // Add buffer
            gasPrice: gasPrice,
            nonce: nonce
        });

        if (!receipt.contractAddress) {
            throw new Error('Contract address not found in receipt');
        }

        console.log(`✅ Contract deployed at: ${receipt.contractAddress}`);
        console.log(`   Block number: ${receipt.blockNumber}`);
        console.log(`   Gas used: ${receipt.gasUsed}`);
        console.log(`   Transaction hash: ${receipt.transactionHash}`);

        // Save contract info
        const contractInfo = {
            address: receipt.contractAddress,
            abi: abi,
            transactionHash: receipt.transactionHash,
            blockNumber: receipt.blockNumber,
            deployedAt: new Date().toISOString()
        };

        const outputPath = path.join(__dirname, '../contracts/TreasuryLogger.json');
        fs.writeFileSync(outputPath, JSON.stringify(contractInfo, null, 2));
        console.log(`📋 Contract info saved to: ${outputPath}`);

        return contractInfo;
    } catch (error) {
        console.error('❌ Deployment failed:', error.message);
        if (error.innerError) {
            console.error('Inner error:', error.innerError);
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
