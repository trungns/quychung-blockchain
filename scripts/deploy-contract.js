const fs = require('fs');
const path = require('path');
const solc = require('solc');
const { Web3 } = require('web3');

// Connect to the local Geth node
const web3 = new Web3(process.env.BLOCKCHAIN_RPC || 'http://localhost:8545');

// Read the contract source
const contractPath = path.join(__dirname, '../contracts/TreasuryLogger.sol');
const source = fs.readFileSync(contractPath, 'utf8');

// Compile the contract
function compileContract() {
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
            throw new Error('Compilation failed');
        }
    }

    const contract = output.contracts['TreasuryLogger.sol']['TreasuryLogger'];
    return {
        abi: contract.abi,
        bytecode: contract.evm.bytecode.object
    };
}

// Deploy the contract
async function deployContract() {
    try {
        console.log('Compiling contract...');
        const { abi, bytecode } = compileContract();

        console.log('Getting accounts...');
        const accounts = await web3.eth.getAccounts();
        const deployer = accounts[0];
        console.log('Deployer address:', deployer);

        console.log('Deploying contract...');
        const contract = new web3.eth.Contract(abi);

        const deployment = contract.deploy({
            data: '0x' + bytecode
        });

        const deployedContract = await deployment.send({
            from: deployer,
            gas: 3000000,
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

        return deployedContract.options.address;
    } catch (error) {
        console.error('Deployment failed:', error);
        process.exit(1);
    }
}

// Run deployment
if (require.main === module) {
    deployContract()
        .then(() => process.exit(0))
        .catch(error => {
            console.error(error);
            process.exit(1);
        });
}

module.exports = { deployContract };
