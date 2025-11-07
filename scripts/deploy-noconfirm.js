const fs = require('fs');
const path = require('path');
const solc = require('solc');
const { Web3 } = require('web3');

const web3 = new Web3(process.env.BLOCKCHAIN_RPC || 'http://localhost:8545');
const contractPath = path.join(__dirname, '../contracts/TreasuryLogger.sol');
const source = fs.readFileSync(contractPath, 'utf8');

console.log('Compiling...');

const input = {
    language: 'Solidity',
    sources: { 'TreasuryLogger.sol': { content: source } },
    settings: { outputSelection: { '*': { '*': ['abi', 'evm.bytecode'] } } }
};

const output = JSON.parse(solc.compile(JSON.stringify(input)));
if (output.errors?.some(e => e.severity === 'error')) {
    output.errors.forEach(e => console.error(e.formattedMessage));
    process.exit(1);
}

const contract = output.contracts['TreasuryLogger.sol']['TreasuryLogger'];
const abi = contract.abi;
const bytecode = '0x' + contract.evm.bytecode.object;

async function deploy() {
    const accounts = await web3.eth.getAccounts();
    const deployer = accounts[0];
    console.log('Deployer:', deployer);

    // Get nonce
    const nonce = await web3.eth.getTransactionCount(deployer);
    
    // Calculate contract address (deterministic)
    const rlp = require('rlp');
    const keccak = require('keccak');
    const contractAddress = '0x' + keccak('keccak256')
        .update(rlp.encode([deployer, nonce]))
        .digest('hex')
        .slice(24);
    
    console.log('Sending transaction...');
    
    // Send raw transaction
    const txHash = await web3.eth.sendTransaction({
        from: deployer,
        data: bytecode,
        gas: 3000000,
        gasPrice: '0'
    });
    
    console.log('TX Hash:', txHash.transactionHash);
    console.log('Contract will be at:', contractAddress);
    
    // Wait a bit for mining
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Save
    const info = {
        address: contractAddress,
        abi,
        deployedAt: new Date().toISOString(),
        deployer,
        txHash: txHash.transactionHash
    };

    fs.writeFileSync(
        path.join(__dirname, '../contracts/TreasuryLogger.json'),
        JSON.stringify(info, null, 2)
    );
    
    console.log('✅ Saved!');
}

deploy().catch(e => {
    console.error('Error:', e.message);
    process.exit(1);
});
