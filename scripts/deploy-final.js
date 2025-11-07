const fs = require('fs');
const path = require('path');
const solc = require('solc');
const { Web3 } = require('web3');

// Connect
const web3 = new Web3(process.env.BLOCKCHAIN_RPC || 'http://localhost:8545');

// Read the contract
const contractPath = path.join(__dirname, '../contracts/TreasuryLogger.sol');
const source = fs.readFileSync(contractPath, 'utf8');

console.log('Compiling contract...');

const input = {
    language: 'Solidity',
    sources: {
        'TreasuryLogger.sol': { content: source }
    },
    settings: {
        outputSelection: {
            '*': { '*': ['abi', 'evm.bytecode'] }
        }
    }
};

const output = JSON.parse(solc.compile(JSON.stringify(input)));

if (output.errors) {
    const errors = output.errors.filter(e => e.severity === 'error');
    if (errors.length > 0) {
        errors.forEach(e => console.error(e.formattedMessage));
        process.exit(1);
    }
}

const contract = output.contracts['TreasuryLogger.sol']['TreasuryLogger'];
const abi = contract.abi;
const bytecode = '0x' + contract.evm.bytecode.object;

async function deploy() {
    try {
        const accounts = await web3.eth.getAccounts();
        const deployer = accounts[0];
        console.log('Deployer:', deployer);

        console.log('Deploying...');
        
        // Create contract instance
        const Contract = new web3.eth.Contract(abi);
        
        // Send deployment transaction and wait for receipt directly
        const tx = Contract.deploy({ data: bytecode });
        
        const receipt = await tx.send({
            from: deployer,
            gas: 3000000,
            gasPrice: '0'
        });
        
        const address = receipt.options.address;
        console.log('✅ Deployed at:', address);

        // Save
        const info = {
            address,
            abi,
            deployedAt: new Date().toISOString(),
            deployer
        };

        fs.writeFileSync(
            path.join(__dirname, '../contracts/TreasuryLogger.json'),
            JSON.stringify(info, null, 2)
        );
        
        console.log('✅ Saved to contracts/TreasuryLogger.json');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

deploy();
