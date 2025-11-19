# Migration từ Geth sang Hardhat

## Tổng quan

Hệ thống đã được nâng cấp để sử dụng **Hardhat** thay thế **Geth** cho blockchain development. Hardhat cung cấp:

- ✅ Auto-mining đáng tin cậy (mọi transaction được mine ngay lập tức)
- ✅ Developer experience tốt hơn với error messages chi tiết
- ✅ Debugging tools mạnh mẽ
- ✅ Testing framework tích hợp sẵn
- ✅ Chuẩn công nghiệp cho Ethereum development

## Thay đổi chính

### 1. Docker Compose

**Trước (Geth):**
```yaml
geth:
  image: ethereum/client-go:v1.13.5
  command:
    - --dev
    - --dev.period=1
```

**Sau (Hardhat):**
```yaml
hardhat:
  image: node:18-alpine
  command: sh -c "npm install && npx hardhat node --hostname 0.0.0.0"
```

### 2. Blockchain RPC URL

Backend đã được cập nhật để kết nối với Hardhat:
```
BLOCKCHAIN_RPC=http://hardhat:8545
```

### 3. Deployment Script

Script mới: [scripts/deploy-hardhat.js](scripts/deploy-hardhat.js)

Features:
- Deploy TreasuryLogger contract
- Tự động test contract sau khi deploy
- Lưu contract address và ABI vào `contracts/TreasuryLogger.json`

### 4. Makefile Commands

```bash
# Deploy contract to Hardhat
make deploy-contract

# Access Hardhat console
make hardhat-console

# View logs
make logs
```

## Sử dụng

### 1. Khởi động hệ thống

```bash
# Khởi động tất cả services
docker-compose up -d

# Kiểm tra status
docker-compose ps
```

### 2. Deploy Smart Contract

```bash
# Deploy contract
make deploy-contract
```

Output sẽ hiển thị:
- Contract address
- Deployer account
- Test transaction results

### 3. Kiểm tra Contract

```bash
# Xem thông tin contract đã deploy
cat contracts/TreasuryLogger.json
```

File này chứa:
- `address`: Địa chỉ contract
- `abi`: Contract ABI để backend sử dụng
- `deployedAt`: Thời gian deploy
- `deployer`: Địa chỉ account đã deploy

## Hardhat Accounts

Hardhat tạo sẵn 10 accounts với mỗi account có **10,000 ETH**:

```
Account #0: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
Private Key: 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80

Account #1: 0x70997970C51812dc3A010C7d01b50e0d17dc79C8
Private Key: 0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d

... (8 accounts khác)
```

⚠️ **WARNING**: Các private keys này là public và CHỈ dùng cho development. KHÔNG BAO GIỜ dùng trên mainnet.

## Testing Blockchain

### Test với cURL

```bash
# Kiểm tra block number
curl -X POST http://localhost:8545 \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'

# Kiểm tra accounts
curl -X POST http://localhost:8545 \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_accounts","params":[],"id":1}'
```

### Test với Hardhat Console

```bash
make hardhat-console
```

Trong console:
```javascript
// Lấy accounts
const accounts = await ethers.getSigners();
console.log(accounts[0].address);

// Kiểm tra balance
const balance = await ethers.provider.getBalance(accounts[0].address);
console.log(ethers.formatEther(balance));

// Tương tác với contract
const contract = await ethers.getContractAt("TreasuryLogger", "CONTRACT_ADDRESS");
const logCount = await contract.logCount();
console.log("Total logs:", logCount.toString());
```

## Troubleshooting

### Container không start

```bash
# Kiểm tra logs
docker-compose logs hardhat

# Restart container
docker-compose restart hardhat
```

### Contract deploy failed

```bash
# Kiểm tra Hardhat node đã chạy chưa
docker exec quychung-hardhat wget -q -O- http://localhost:8545 \
  --post-data='{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
  --header='Content-Type: application/json'

# Nếu không response, restart
docker-compose restart hardhat
sleep 5
make deploy-contract
```

### Backend không kết nối được blockchain

```bash
# Kiểm tra backend logs
docker-compose logs backend

# Kiểm tra BLOCKCHAIN_RPC trong docker-compose.yml
grep BLOCKCHAIN_RPC docker-compose.yml

# Should be: BLOCKCHAIN_RPC=http://hardhat:8545
```

## Lợi ích của Hardhat

### 1. Instant Mining
Mọi transaction được mine ngay lập tức, không cần chờ đợi như Geth dev mode.

### 2. Better Error Messages
```
❌ Geth: "Transaction was not mined within 50 blocks"
✅ Hardhat: "Reverted with reason: Invalid treasury address"
```

### 3. Built-in Testing
```bash
# Run tests
npx hardhat test

# Run tests with gas reporting
REPORT_GAS=true npx hardhat test
```

### 4. Console Debugging
```bash
# Hardhat console hỗ trợ async/await native
make hardhat-console
```

### 5. Network Forking
Có thể fork mainnet để test với real data:
```javascript
// hardhat.config.js
networks: {
  hardhat: {
    forking: {
      url: "https://eth-mainnet.alchemyapi.io/v2/YOUR-API-KEY"
    }
  }
}
```

## Files liên quan

- [hardhat.config.js](hardhat.config.js) - Hardhat configuration
- [package.json](package.json) - Node dependencies
- [scripts/deploy-hardhat.js](scripts/deploy-hardhat.js) - Deployment script
- [scripts/deploy-hardhat-docker.sh](scripts/deploy-hardhat-docker.sh) - Docker deployment helper
- [docker-compose.yml](docker-compose.yml) - Docker services configuration
- [contracts/TreasuryLogger.sol](contracts/TreasuryLogger.sol) - Smart contract

## Next Steps

1. ✅ Hardhat setup hoàn tất
2. ✅ Contract deployment working
3. ✅ Auto-mining hoạt động
4. 🔄 Test end-to-end flow với frontend
5. 📝 Viết unit tests cho smart contract
6. 🚀 (Optional) Deploy lên public testnet (Sepolia, Goerli)

## Tài liệu tham khảo

- [Hardhat Documentation](https://hardhat.org/getting-started/)
- [Hardhat Network](https://hardhat.org/hardhat-network/)
- [Testing with Hardhat](https://hardhat.org/tutorial/testing-contracts)
- [Deploying Contracts](https://hardhat.org/tutorial/deploying-to-a-live-network)
