const fs = require('fs');
const path = require('path');
const solc = require('solc');
const { Web3 } = require('web3');

// Connect with increased timeout
const web3 = new Web3(process.env.BLOCKCHAIN_RPC || 'http://localhost:8545');
web3.eth.transactionBlockTimeout = 200;
web3.eth.transactionPollingTimeout = 120000;

// Read the contract source
const contractPath = path.join(__dirname, '../contracts/TreasuryLogger.sol');
const source = fs.readFileSync(contractPath, 'utf8');

console.log('Compiling contract...');

// Compile
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
    output.errors.forEach(error => {
        console.error(error.formattedMessage);
    });
    if (output.errors.some(error => error.severity === 'error')) {
        process.exit(1);
    }
}

const contract = output.contracts['TreasuryLogger.sol']['TreasuryLogger'];
const abi = contract.abi;
const bytecode = contract.evm.bytecode.object;

async function deploy() {
    try {
        console.log('Getting accounts...');
        const accounts = await web3.eth.getAccounts();
        const deployer = accounts[0];
        console.log('Deployer address:', deployer);

        console.log('Deploying contract...');
        const contractInstance = new web3.eth.Contract(abi);

        // Deploy with manual gas settings
        const deployTx = contractInstance.deploy({
            data: '0x' + bytecode
        });

        const gas = await deployTx.estimateGas({ from: deployer });
        console.log('Estimated gas:', gas);

        const deployedContract = await deployTx.send({
            from: deployer,
            gas: gas + 100000n, // Add buffer
            gasPrice: '0'
        });

        console.log('Contract deployed at:', deployedContract.options.address);

        // Save deployment info
        const deploymentInfo = {
            address: deployedContract.options.address,
            abi: abi,
            deployedAt: new Date().toISOString(),
            deployer: deployer
        };

        const outputPath = path.join(__dirname, '../contracts/TreasuryLogger.json');
        fs.writeFileSync(outputPath, JSON.stringify(deploymentInfo, null, 2));
        console.log('Deployment info saved to:', outputPath);

    } catch (error) {
        console.error('Deployment failed:', error.message);
        process.exit(1);
    }
}

deploy();
