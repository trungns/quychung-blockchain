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
        bytecode: '0x' + contract.evm.bytecode.object
    };
}

// Deploy contract using dev account
async function deployContract() {
    try {
        console.log('🚀 Starting deployment...');
        console.log(`   RPC URL: ${RPC_URL}`);

        // Get accounts (dev account is first)
        const accounts = await web3.eth.getAccounts();
        if (!accounts || accounts.length === 0) {
            throw new Error('No accounts available');
        }
        const deployerAccount = accounts[0];
        console.log(`   Deployer: ${deployerAccount}`);

        // Check balance
        const balance = await web3.eth.getBalance(deployerAccount);
        console.log(`   Balance: ${web3.utils.fromWei(balance, 'ether')} ETH`);

        // Compile contract
        const { abi, bytecode } = compileContract();

        // Create contract instance
        const contract = new web3.eth.Contract(abi);

        // Deploy
        console.log('📤 Deploying contract...');
        const deployTx = contract.deploy({
            data: bytecode,
            arguments: []
        });

        // Send transaction and wait for receipt
        const deployedContract = await deployTx.send({
            from: deployerAccount,
            gas: 3000000,
            gasPrice: await web3.eth.getGasPrice()
        });

        const contractAddress = deployedContract.options.address;
        console.log(`✅ Contract deployed at: ${contractAddress}`);

        // Get transaction receipt
        const receipt = await web3.eth.getTransactionReceipt(deployedContract._deployedBlockNumber || await web3.eth.getBlockNumber());

        console.log(`   Block number: ${receipt ? receipt.blockNumber : 'N/A'}`);
        console.log(`   Gas used: ${receipt ? receipt.gasUsed : 'N/A'}`);

        // Save contract info
        const contractInfo = {
            address: contractAddress,
            abi: abi,
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
        if (error.receipt) {
            console.error('Receipt:', error.receipt);
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
