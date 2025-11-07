const { Web3 } = require('web3');

const RPC_URL = 'http://localhost:8545';
const TX_HASH = process.argv[2];

if (!TX_HASH) {
    console.error('Usage: node check-tx.js <tx_hash>');
    process.exit(1);
}

const web3 = new Web3(RPC_URL);

async function checkTransaction() {
    try {
        console.log(`Checking transaction: ${TX_HASH}`);

        const receipt = await web3.eth.getTransactionReceipt(TX_HASH);

        if (receipt) {
            console.log('\n✅ Transaction mined!');
            console.log(`   Block: ${receipt.blockNumber}`);
            console.log(`   Contract Address: ${receipt.contractAddress}`);
            console.log(`   Gas Used: ${receipt.gasUsed}`);
            console.log(`   Status: ${receipt.status ? 'Success' : 'Failed'}`);
            return receipt;
        } else {
            console.log('❌ Transaction not found or not mined yet');
            return null;
        }
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

checkTransaction();
