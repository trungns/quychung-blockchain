# Data Persistence và Smart Contract chi tiết

## Câu hỏi 1: Tắt bật Docker - Dữ liệu blockchain có mất không?

### Trả lời ngắn gọn

**CÓ - Dữ liệu blockchain SẼ MẤT** khi bạn tắt/bật lại Docker với cấu hình hiện tại!

### Tại sao mất?

Hãy xem cấu hình Hardhat trong [docker-compose.yml](../docker-compose.yml:24-46):

```yaml
hardhat:
  image: node:18-alpine
  container_name: quychung-hardhat
  working_dir: /app
  command: sh -c "npm install && npx hardhat node --hostname 0.0.0.0"
  ports:
    - "8545:8545"
  volumes:
    - ./hardhat.config.js:/app/hardhat.config.js
    - ./contracts:/app/contracts
    - ./scripts:/app/scripts
    - ./package.json:/app/package.json
    - ./package-lock.json:/app/package-lock.json
    - hardhat_artifacts:/app/artifacts      # ← Chỉ lưu compiled contracts
    - hardhat_cache:/app/cache              # ← Chỉ lưu cache
  # ⚠️ KHÔNG CÓ VOLUME CHO BLOCKCHAIN DATA!
```

**Vấn đề:**
- Hardhat node lưu blockchain data trong **RAM** (bộ nhớ tạm)
- Khi container stop → RAM bị xóa → blockchain data mất hết
- Volumes hiện tại chỉ lưu `artifacts` và `cache` (compiled contracts), KHÔNG lưu blockchain data

### So sánh với PostgreSQL (data KHÔNG mất)

```yaml
postgres:
  image: postgres:15-alpine
  volumes:
    - postgres_data:/var/lib/postgresql/data  # ← Volume lưu database
```

PostgreSQL có volume mount vào `/var/lib/postgresql/data` nên data persistent!

### Chi tiết kỹ thuật: Blockchain data được lưu ở đâu?

#### 1. TRONG Container (ephemeral - tạm thời)

```
Container: quychung-hardhat
├── /app/artifacts/          ← Volume mount (persistent)
├── /app/cache/              ← Volume mount (persistent)
└── /tmp/hardhat-*/          ← Blockchain data (RAM - EPHEMERAL!)
    ├── chaindata/
    │   ├── 000001.log       ← Blocks
    │   ├── CURRENT
    │   ├── LOCK
    │   └── MANIFEST-000000
    └── keystore/            ← Account keys
```

Khi container stop → `/tmp/hardhat-*` bị xóa hoàn toàn!

#### 2. Chứng minh bằng test

**Test 1: Tắt bật container**
```bash
# Bước 1: Tạo 1 transaction
curl -X POST http://localhost:8080/api/treasuries/xxx/transactions \
  -d '{"amount": 100000, "type": "INCOME", "note": "Test"}'
# → Blockchain có Block #2, tx hash: 0xabc123...

# Bước 2: Check block number
curl -X POST http://localhost:8545 \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'
# Response: {"result":"0x2"}  ← 2 blocks

# Bước 3: Restart container
docker restart quychung-hardhat

# Bước 4: Check lại block number
curl -X POST http://localhost:8545 \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'
# Response: {"result":"0x0"}  ← 0 blocks! BLOCKCHAIN ĐÃ MẤT!

# Bước 5: Check contract
curl -X POST http://localhost:8545 \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_getCode","params":["0x5FbDB2315678afecb367f032d93F642f64180aa3","latest"],"id":1}'
# Response: {"result":"0x"}  ← Contract không tồn tại! ĐÃ MẤT!
```

**Kết luận:** Sau restart:
- ✅ PostgreSQL data VẪN CÒN (vì có volume)
- ❌ Blockchain data MẤT HẾT (vì không có volume)
- ❌ Smart contract MẤT (phải deploy lại)
- ❌ Tất cả tx_hash MẤT

### Tại sao PostgreSQL data vẫn còn?

```yaml
volumes:
  postgres_data:  # ← Docker volume được tạo
```

Data lưu ở:
```bash
# Trên macOS
/var/lib/docker/volumes/quychung_postgres_data/_data/

# Check data
docker volume inspect quychung_postgres_data
```

### Làm sao để blockchain data KHÔNG mất?

**Phương án 1: Thêm volume cho Hardhat (KHÔNG KHUYẾN NGHỊ)**

```yaml
hardhat:
  volumes:
    - hardhat_data:/root/.hardhat  # Persistent blockchain data
```

⚠️ **Vấn đề:**
- Hardhat dev node không thiết kế cho persistent storage
- Có thể gây lỗi state conflict
- Nonce issues khi restart

**Phương án 2: Dùng Geth với persistent storage (KHUYẾN NGHỊ)**

```yaml
geth:
  image: ethereum/client-go:latest
  command: |
    --dev
    --datadir /data
    --http
    --http.addr 0.0.0.0
    --http.port 8545
  volumes:
    - geth_data:/data  # ← Persistent blockchain data
```

**Phương án 3: Dùng public testnet (TỐT NHẤT)**

```bash
# Không cần run node, dùng RPC provider
BLOCKCHAIN_RPC=https://sepolia.infura.io/v3/YOUR_KEY
```

### Workflow hiện tại với Hardhat

```
┌─────────────────────────────────────────────────────────────┐
│ 1. docker-compose up -d                                     │
│    ↓                                                         │
│    Hardhat node khởi động → Blockchain mới (rỗng)          │
│    - Block #0 (genesis)                                     │
│    - 10 accounts với 10,000 ETH mỗi account                 │
│    - Không có contract nào                                  │
└─────────────────────────────────────────────────────────────┘
                         │
                         v
┌─────────────────────────────────────────────────────────────┐
│ 2. make deploy-contract                                     │
│    ↓                                                         │
│    Deploy TreasuryLogger.sol                                │
│    - Block #1 tạo ra                                        │
│    - Contract address: 0x5FbDB2315678afecb367f032d93F642f... │
│    - Lưu vào contracts/TreasuryLogger.json                  │
└─────────────────────────────────────────────────────────────┘
                         │
                         v
┌─────────────────────────────────────────────────────────────┐
│ 3. User tạo transactions                                    │
│    ↓                                                         │
│    Mỗi transaction → 1 block mới                            │
│    - Block #2: Transaction 1                                │
│    - Block #3: Transaction 2                                │
│    - Block #4: Transaction 3                                │
│    - ...                                                    │
└─────────────────────────────────────────────────────────────┘
                         │
                         v
┌─────────────────────────────────────────────────────────────┐
│ 4. docker restart quychung-hardhat                          │
│    ↓                                                         │
│    ❌ TẤT CẢ BLOCKCHAIN DATA MẤT!                           │
│    - Blockchain reset về Block #0                           │
│    - Contract không còn                                     │
│    - Tất cả transactions mất                                │
│    - Phải deploy contract lại                               │
└─────────────────────────────────────────────────────────────┘
                         │
                         v
┌─────────────────────────────────────────────────────────────┐
│ 5. Backend error khi user tạo transaction                   │
│    ↓                                                         │
│    Error: "contract not found"                              │
│    Vì contract address 0x5FbDB... không còn tồn tại         │
│    → Phải chạy lại: make deploy-contract                    │
└─────────────────────────────────────────────────────────────┘
```

### Nhưng PostgreSQL data thì SAO?

```
┌─────────────────────────────────────────────────────────────┐
│ PostgreSQL (với volume mount)                               │
│                                                             │
│ docker restart quychung-postgres                            │
│    ↓                                                         │
│    ✅ DATA VẪN CÒN NGUYÊN                                   │
│    - Tất cả users                                           │
│    - Tất cả treasuries                                      │
│    - Tất cả transactions                                    │
│    - Tất cả chain_logs (nhưng tx_hash không verify được)    │
└─────────────────────────────────────────────────────────────┘
```

**Vấn đề nghiêm trọng:**

PostgreSQL có record:
```sql
SELECT * FROM chain_logs;
```
| tx_hash | detail_hash | status |
|---------|-------------|--------|
| 0xabc123... | 0xdef456... | CONFIRMED |

Nhưng khi verify trên blockchain:
```bash
curl -X POST http://localhost:8545 \
  -d '{"jsonrpc":"2.0","method":"eth_getTransactionReceipt","params":["0xabc123..."],"id":1}'
# Response: {"result": null}  ← KHÔNG TÌM THẤY!
```

→ **Data inconsistency**: Database nói có, blockchain nói không!

### Tóm tắt

| Component | Volume | Data sau restart |
|-----------|--------|------------------|
| PostgreSQL | ✅ `postgres_data` | ✅ VẪN CÒN |
| Hardhat Blockchain | ❌ Không có | ❌ MẤT HẾT |
| Smart Contract | ❌ Lưu trong blockchain | ❌ MẤT (phải deploy lại) |
| Hardhat Artifacts | ✅ `hardhat_artifacts` | ✅ VẪN CÒN (compiled code) |

---

## Câu hỏi 2: Smart Contract trong dự án hoạt động thế nào?

### Tổng quan Smart Contract

**File:** [contracts/TreasuryLogger.sol](../contracts/TreasuryLogger.sol)

**Mục đích:** Ghi nhận (log) các giao dịch thu/chi lên blockchain để đảm bảo tính minh bạch, không thể sửa đổi.

### Cấu trúc Smart Contract

#### 1. Event - Sự kiện

```solidity
event TransactionLogged(
    address indexed treasury,    // Địa chỉ quỹ
    uint256 amountToken,         // Số tiền (đơn vị wei)
    bool isIncome,               // true = Thu, false = Chi
    bytes32 detailHash,          // Hash chi tiết giao dịch
    uint256 timestamp,           // Thời gian on-chain
    address indexed loggedBy     // Người tạo transaction
);
```

**Event là gì?**
- Giống như "log" trong hệ thống
- Được emit (phát ra) khi có hành động
- Lưu trữ trong blockchain
- Frontend/Backend có thể listen (lắng nghe) events
- Tốn ít gas hơn so với lưu storage

**indexed là gì?**
- Cho phép filter/search theo field đó
- Ví dụ: Lấy tất cả events của 1 treasury cụ thể

#### 2. Struct - Cấu trúc dữ liệu

```solidity
struct LogEntry {
    address treasury;      // Địa chỉ quỹ (20 bytes)
    uint256 amountToken;   // Số tiền (32 bytes)
    bool isIncome;         // Thu/Chi (1 byte)
    bytes32 detailHash;    // Hash chi tiết (32 bytes)
    uint256 timestamp;     // Unix timestamp (32 bytes)
    address loggedBy;      // Người tạo (20 bytes)
}
```

**Struct là gì?**
- Giống như một "object" hoặc "class" trong lập trình
- Gom nhóm nhiều fields lại thành 1 đơn vị
- Trong Solidity, struct được pack để tiết kiệm gas

#### 3. Storage Variables - Biến lưu trữ

```solidity
// Mapping từ log index → log entry
mapping(uint256 => LogEntry) public logs;

// Đếm số lượng logs
uint256 public logCount;

// Mapping từ treasury address → array of log indices
mapping(address => uint256[]) public treasuryLogs;
```

**Giải thích:**

**`mapping(uint256 => LogEntry) public logs`**
```
Giống như một HashMap/Dictionary:
Key (uint256)    →    Value (LogEntry)
─────────────────────────────────────
0                →    {treasury: 0x123, amount: 100000, ...}
1                →    {treasury: 0x456, amount: 50000, ...}
2                →    {treasury: 0x123, amount: 200000, ...}
```

**`uint256 public logCount`**
```
Đơn giản là một số đếm:
logCount = 3  (có 3 logs)
```

**`mapping(address => uint256[]) public treasuryLogs`**
```
Mapping từ treasury address → array of indices:
Key (address)             →    Value (uint256[])
──────────────────────────────────────────────────
0x1111...                →    [0, 2, 5]       ← Treasury này có 3 logs
0x2222...                →    [1, 3, 4, 6]    ← Treasury này có 4 logs
```

### Hàm chính: logTransaction()

```solidity
function logTransaction(
    address _treasury,      // Địa chỉ quỹ
    uint256 _amountToken,   // Số tiền
    bool _isIncome,         // Thu hay Chi
    bytes32 _detailHash     // Hash chi tiết
) external {
    // Step 1: Validate input
    require(_treasury != address(0), "Invalid treasury address");
    require(_amountToken > 0, "Amount must be greater than 0");

    // Step 2: Tạo LogEntry struct
    LogEntry memory newLog = LogEntry({
        treasury: _treasury,
        amountToken: _amountToken,
        isIncome: _isIncome,
        detailHash: _detailHash,
        timestamp: block.timestamp,    // Lấy timestamp của block
        loggedBy: msg.sender          // Lấy address của caller
    });

    // Step 3: Lưu vào storage
    logs[logCount] = newLog;                    // Lưu log entry
    treasuryLogs[_treasury].push(logCount);     // Thêm index vào treasury

    // Step 4: Emit event
    emit TransactionLogged(
        _treasury,
        _amountToken,
        _isIncome,
        _detailHash,
        block.timestamp,
        msg.sender
    );

    // Step 5: Tăng counter
    logCount++;
}
```

### Ví dụ thực tế

Giả sử có 2 quỹ:
- Treasury A: `0x1111111111111111111111111111111111111111`
- Treasury B: `0x2222222222222222222222222222222222222222`

#### Transaction 1: Treasury A nhập thu 100,000 VND

**Backend gọi:**
```go
// blockchain_service.go
tx, err := contract.LogTransaction(
    treasuryA,              // 0x1111...
    big.NewInt(100000),     // 100000
    true,                   // isIncome = true
    detailHash              // 0xabcd1234...
)
```

**Blockchain state sau khi execute:**
```
logs[0] = LogEntry{
    treasury: 0x1111...,
    amountToken: 100000,
    isIncome: true,
    detailHash: 0xabcd1234...,
    timestamp: 1705123456,
    loggedBy: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266  // Backend account
}

treasuryLogs[0x1111...] = [0]

logCount = 1
```

**Event emitted:**
```
TransactionLogged(
    treasury: 0x1111...,
    amountToken: 100000,
    isIncome: true,
    detailHash: 0xabcd1234...,
    timestamp: 1705123456,
    loggedBy: 0xf39Fd...
)
```

#### Transaction 2: Treasury B nhập chi 50,000 VND

```
logs[1] = LogEntry{
    treasury: 0x2222...,
    amountToken: 50000,
    isIncome: false,
    detailHash: 0xef567890...,
    timestamp: 1705123500,
    loggedBy: 0xf39Fd...
}

treasuryLogs[0x1111...] = [0]        ← Không đổi
treasuryLogs[0x2222...] = [1]        ← Mới

logCount = 2
```

#### Transaction 3: Treasury A nhập chi 30,000 VND

```
logs[2] = LogEntry{
    treasury: 0x1111...,
    amountToken: 30000,
    isIncome: false,
    detailHash: 0x12345678...,
    timestamp: 1705123600,
    loggedBy: 0xf39Fd...
}

treasuryLogs[0x1111...] = [0, 2]     ← Thêm index 2
treasuryLogs[0x2222...] = [1]        ← Không đổi

logCount = 3
```

### Truy vấn dữ liệu

#### 1. Lấy tổng số logs

```javascript
const totalLogs = await contract.logCount();
console.log(totalLogs); // 3
```

#### 2. Lấy một log cụ thể

```javascript
const log = await contract.logs(0);  // Get log index 0
console.log(log);
// {
//   treasury: '0x1111...',
//   amountToken: 100000n,
//   isIncome: true,
//   detailHash: '0xabcd1234...',
//   timestamp: 1705123456n,
//   loggedBy: '0xf39Fd...'
// }
```

#### 3. Lấy số lượng logs của một treasury

```javascript
const count = await contract.getTreasuryLogCount('0x1111...');
console.log(count); // 2 (có 2 transactions)
```

#### 4. Lấy tất cả log indices của một treasury

```javascript
const indices = await contract.getTreasuryLogIndices('0x1111...');
console.log(indices); // [0, 2]

// Sau đó loop qua từng index để lấy chi tiết
for (let i of indices) {
    const log = await contract.logs(i);
    console.log(log);
}
```

### Chi phí Gas

#### Gas là gì? (Giải thích cho người mới)

**Hãy tưởng tượng blockchain như một siêu máy tính toàn cầu:**

```
┌─────────────────────────────────────────────────────────────┐
│ Máy tính thông thường                                       │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ CPU: Xử lý miễn phí (bạn đã mua máy rồi)                │ │
│ │ RAM: Lưu trữ miễn phí (bạn đã mua RAM rồi)              │ │
│ │ Disk: Ghi file miễn phí (bạn đã mua ổ cứng rồi)        │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘

VS

┌─────────────────────────────────────────────────────────────┐
│ Blockchain (Ethereum, Polygon, ...)                         │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ CPU: Xử lý PHẢI TRẢ TIỀN (hàng nghìn máy tính cùng     │ │
│ │      xử lý và verify)                                   │ │
│ │ Storage: Lưu dữ liệu PHẢI TRẢ TIỀN (lưu mãi mãi trên   │ │
│ │          hàng nghìn nodes)                              │ │
│ │ → Mỗi operation tốn GAS (phí xăng để chạy)             │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

**Tại sao phải trả gas?**

1. **Thanh toán cho miners/validators:**
   - Họ dùng điện, phần cứng để xử lý transactions
   - Họ phải có động lực (incentive) để maintain network
   - Gas fee = lương cho miners

2. **Ngăn chặn spam:**
   - Nếu miễn phí → ai cũng spam transactions
   - Có phí → chỉ transactions quan trọng mới được gửi
   - Giống như tem thư: phải trả tiền mới gửi được

3. **Phân bổ tài nguyên:**
   - Blockchain có giới hạn (block size, processing power)
   - Gas giúp ưu tiên transactions quan trọng hơn
   - Ai trả nhiều gas hơn → xử lý trước

#### Tại sao mỗi operation có gas cost khác nhau?

**Quy tắc đơn giản: Operation càng "nặng" → Gas càng cao**

Hãy so sánh với thế giới thực:

```
┌──────────────────────────────────────────────────────────────┐
│ GỬI HÀNG QUA BƯU ĐIỆN                                        │
├──────────────────────────────────────────────────────────────┤
│ Gửi thư (nhẹ, nhỏ)           →  20,000 VND                  │
│ Gửi hộp (nặng hơn)           →  50,000 VND                  │
│ Gửi tủ lạnh (rất nặng)       → 500,000 VND                  │
└──────────────────────────────────────────────────────────────┘

TƯƠNG TỰ

┌──────────────────────────────────────────────────────────────┐
│ BLOCKCHAIN OPERATIONS                                        │
├──────────────────────────────────────────────────────────────┤
│ Đọc dữ liệu (nhẹ)           →  200 gas                      │
│ Tính toán (vừa)             →  5,000 gas                    │
│ Lưu dữ liệu (nặng)          →  20,000 gas                   │
└──────────────────────────────────────────────────────────────┘
```

#### Chi tiết từng operation trong logTransaction()

Khi bạn gọi `contract.logTransaction()`, đây là những gì xảy ra:

```solidity
function logTransaction(
    address _treasury,
    uint256 _amountToken,
    bool _isIncome,
    bytes32 _detailHash
) external {
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // OPERATION 1: Tạo LogEntry struct (trong memory)
    // Gas cost: ~500 gas
    // Lý do: Tính toán trong RAM, không lưu vào blockchain
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    LogEntry memory newLog = LogEntry({
        treasury: _treasury,
        amountToken: _amountToken,
        isIncome: _isIncome,
        detailHash: _detailHash,
        timestamp: block.timestamp,
        loggedBy: msg.sender
    });

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // OPERATION 2: SSTORE - Lưu vào mapping logs[logCount]
    // Gas cost: ~20,000 gas (LẦN ĐẦU GHI MỚI)
    //
    // TẠI SAO TỐN 20,000 GAS?
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    //
    // Khi ghi dữ liệu mới vào storage:
    // 1. Hàng nghìn nodes phải cập nhật database của họ
    // 2. Dữ liệu được lưu MÃI MÃI (không bao giờ xóa)
    // 3. Cần verify và replicate across all nodes
    //
    // Ví dụ thực tế:
    // ┌────────────────────────────────────────────────────┐
    // │ Ghi 1 LogEntry = Ghi 157 bytes vào blockchain     │
    // │ (address=20 + uint256=32 + bool=1 + bytes32=32    │
    // │  + uint256=32 + address=20 + overhead=20)          │
    // │                                                    │
    // │ 157 bytes × hàng nghìn nodes × lưu mãi mãi        │
    // │ → Tốn nhiều tài nguyên → Gas cao                  │
    // └────────────────────────────────────────────────────┘
    //
    // So sánh:
    // - Lưu vào PostgreSQL (1 node): Miễn phí cho bạn
    // - Lưu vào Blockchain (10,000 nodes): 20,000 gas
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    logs[logCount] = newLog;

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // OPERATION 3: SSTORE - Push vào array treasuryLogs
    // Gas cost: ~5,000 gas (thêm vào array có sẵn)
    //
    // TẠI SAO PUSH VÀO ARRAY CHỈ TỐN 5,000 GAS?
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    //
    // Push vào array "rẻ" hơn vì:
    // 1. Array đã tồn tại (không cần khởi tạo mới)
    // 2. Chỉ thêm 1 số uint256 (32 bytes) thay vì cả struct
    // 3. Ít computation hơn
    //
    // Breakdown chi tiết:
    // - Đọc array length: 200 gas
    // - Tính vị trí mới: 100 gas
    // - Ghi giá trị mới: 5,000 gas
    // - Cập nhật length: 5,000 gas
    // - TOTAL: ~10,000 gas (làm tròn xuống ~5,000)
    //
    // Ví dụ:
    // treasuryLogs[0x1111] = [0]      ← Array đã có
    // treasuryLogs[0x1111].push(2)    ← Chỉ thêm 1 số
    // treasuryLogs[0x1111] = [0, 2]   ← Kết quả
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    treasuryLogs[_treasury].push(logCount);

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // OPERATION 4: LOG - Emit event
    // Gas cost: ~2,000 gas
    //
    // TẠI SAO EMIT EVENT CHỈ 2,000 GAS?
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    //
    // Events RẺ HƠN storage rất nhiều vì:
    // 1. Không lưu vào contract storage (không access được từ contract)
    // 2. Chỉ lưu trong transaction logs (cho external queries)
    //    → Xem phần "Transaction Logs - Lưu ở đâu?" bên dưới
    // 3. Không replicate rộng rãi như storage
    //
    // Event structure:
    // - Base cost: 375 gas
    // - Mỗi topic (indexed param): 375 gas × 2 = 750 gas
    // - Data (non-indexed params): ~8 gas/byte × 128 bytes = 1,024 gas
    // - TOTAL: 375 + 750 + 1,024 ≈ 2,000 gas
    //
    // So sánh:
    // ┌────────────────────────────────────────────┐
    // │ Lưu 100 bytes vào STORAGE:  ~20,000 gas   │
    // │ Lưu 100 bytes vào EVENT:    ~2,000 gas    │
    // │ → Event rẻ gấp 10 lần!                    │
    // └────────────────────────────────────────────┘
    //
    // Nhưng tradeoff:
    // - Storage: Contract có thể đọc được
    // - Event: Chỉ external tools đọc được (web3.js, backend)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    emit TransactionLogged(
        _treasury,
        _amountToken,
        _isIncome,
        _detailHash,
        block.timestamp,
        msg.sender
    );

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // OPERATION 5: SSTORE - Tăng counter logCount
    // Gas cost: ~5,000 gas (ghi đè giá trị cũ)
    //
    // TẠI SAO TĂNG COUNTER TỐN 5,000 GAS?
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    //
    // Ghi đè giá trị cũ RẺ HƠN ghi mới:
    // - Ghi mới (0 → value): 20,000 gas
    // - Ghi đè (value1 → value2): 5,000 gas
    //
    // Vì sao?
    // - Ghi mới: Phải allocate storage slot mới
    // - Ghi đè: Slot đã tồn tại, chỉ cần update
    //
    // Ví dụ:
    // logCount = 0  → 1   : 20,000 gas (lần đầu)
    // logCount = 1  → 2   : 5,000 gas
    // logCount = 2  → 3   : 5,000 gas
    // logCount = 3  → 4   : 5,000 gas
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    logCount++;
}
```

#### Bảng tổng hợp Gas Cost

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Operation              │ Gas    │ Lý do                                     │
├────────────────────────┼────────┼───────────────────────────────────────────┤
│ SSTORE (ghi mới)       │ 20,000 │ Allocate storage slot mới + replicate     │
│ SSTORE (ghi đè)        │  5,000 │ Update giá trị có sẵn                     │
│ SSTORE (xóa, set 0)    │ -15,000│ Refund gas (khuyến khích dọn dẹp)        │
│ SLOAD (đọc storage)    │    200 │ Đọc từ database                           │
│ LOG (emit event)       │  2,000 │ Ghi vào transaction logs (nhẹ hơn)        │
│ SHA3/Keccak256         │    30  │ Hash 1 word (32 bytes)                    │
│ ADD/SUB/MUL            │      3 │ Phép toán cơ bản                          │
│ DIV/MOD                │      5 │ Chia/chia lấy dư (phức tạp hơn)           │
│ JUMP/JUMPI             │      8 │ Control flow                              │
│ CALL (gọi contract)    │  2,600 │ + 9,000 nếu transfer ETH                  │
│ CREATE (deploy)        │ 32,000 │ Tạo contract mới                          │
│ Base transaction cost  │ 21,000 │ Ethereum protocol overhead                │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Tổng gas cho logTransaction()

```
┌────────────────────────────────────────────────────────────┐
│ LẦN ĐẦU TIÊN gọi logTransaction() (logCount chưa có)      │
├────────────────────────────────────────────────────────────┤
│ Base transaction cost          │  21,000 gas              │
│ Function call overhead         │   2,000 gas              │
│ SSTORE logs[0] (ghi mới)       │  20,000 gas              │
│ SSTORE treasuryLogs push       │  10,000 gas              │
│ SSTORE logCount (0→1, ghi mới) │  20,000 gas              │
│ LOG emit event                 │   2,000 gas              │
│ Computation (create struct,..) │   1,000 gas              │
├────────────────────────────────────────────────────────────┤
│ TOTAL                          │  76,000 gas              │
└────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────┐
│ LẦN THỨ 2+ gọi logTransaction()                           │
├────────────────────────────────────────────────────────────┤
│ Base transaction cost          │  21,000 gas              │
│ Function call overhead         │   2,000 gas              │
│ SSTORE logs[N] (ghi mới)       │  20,000 gas              │
│ SSTORE treasuryLogs push       │  10,000 gas              │
│ SSTORE logCount (N→N+1, đè)    │   5,000 gas ← RẺ HƠN!    │
│ LOG emit event                 │   2,000 gas              │
│ Computation                    │   1,000 gas              │
├────────────────────────────────────────────────────────────┤
│ TOTAL                          │  61,000 gas              │
└────────────────────────────────────────────────────────────┘
```

**Lưu ý:** Số liệu trên là ước tính. Gas thực tế phụ thuộc vào:
- Độ dài dữ liệu (array size, string length)
- Compiler optimization level
- EVM version

#### Quy đổi ra tiền thật

**Đơn vị đo lường:**
```
1 ETH = 1,000,000,000 Gwei (1 tỷ Gwei)
1 Gwei = 0.000000001 ETH
```

**Ví dụ tính toán:**

Giả sử gọi `logTransaction()` tốn **60,000 gas**:

```
┌────────────────────────────────────────────────────────────────────┐
│ HARDHAT LOCAL (Development)                                       │
├────────────────────────────────────────────────────────────────────┤
│ Gas: 60,000                                                        │
│ Gas Price: 1 Gwei (giả định)                                       │
│ Cost = 60,000 × 1 = 60,000 Gwei = 0.00006 ETH                     │
│ ETH Price: $0 (fake ETH)                                           │
│ ➜ Total Cost: $0 (MIỄN PHÍ)                                        │
└────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────┐
│ POLYGON MAINNET (Production)                                      │
├────────────────────────────────────────────────────────────────────┤
│ Gas: 60,000                                                        │
│ Gas Price: 30 Gwei (average)                                       │
│ Cost = 60,000 × 30 = 1,800,000 Gwei = 0.0018 ETH                  │
│ ETH Price: $3,000 (giả định)                                       │
│ ➜ Total Cost: 0.0018 × $3,000 = $5.4                              │
│                                                                    │
│ Nhưng Polygon dùng MATIC, không phải ETH:                         │
│ - MATIC Price: $1                                                  │
│ - Cost: 0.0018 MATIC = $0.0018 ≈ 2 xu USD                         │
│ ➜ Total Cost: $0.002 (2/10 cent)                                  │
└────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────┐
│ ETHEREUM MAINNET (Production)                                     │
├────────────────────────────────────────────────────────────────────┤
│ Gas: 60,000                                                        │
│ Gas Price: 50 Gwei (lúc vắng), 200 Gwei (lúc đông)                │
│                                                                    │
│ LÚC VẮNG:                                                          │
│ Cost = 60,000 × 50 = 3,000,000 Gwei = 0.003 ETH                   │
│ ETH Price: $3,000                                                  │
│ ➜ Total Cost: 0.003 × $3,000 = $9                                 │
│                                                                    │
│ LÚC ĐÔNG (peak hours):                                             │
│ Cost = 60,000 × 200 = 12,000,000 Gwei = 0.012 ETH                 │
│ ETH Price: $3,000                                                  │
│ ➜ Total Cost: 0.012 × $3,000 = $36                                │
└────────────────────────────────────────────────────────────────────┘
```

#### Tại sao phải optimize gas?

**Ví dụ thực tế:**

Giả sử hệ thống có **1,000 giao dịch/tháng**:

```
┌─────────────────────────────────────────────────────────────┐
│ Code KHÔNG OPTIMIZE (100,000 gas/tx)                       │
├─────────────────────────────────────────────────────────────┤
│ Polygon: 1,000 tx × $0.003 = $3/tháng                      │
│ Ethereum: 1,000 tx × $15 = $15,000/tháng (!!)              │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Code OPTIMIZE (60,000 gas/tx) - TIẾT KIỆM 40%              │
├─────────────────────────────────────────────────────────────┤
│ Polygon: 1,000 tx × $0.002 = $2/tháng                      │
│ Ethereum: 1,000 tx × $9 = $9,000/tháng                     │
│                                                             │
│ ➜ Tiết kiệm: $6,000/tháng trên Ethereum!                   │
└─────────────────────────────────────────────────────────────┘
```

**Các kỹ thuật optimize gas:**

1. **Dùng events thay vì storage khi có thể**
   ```solidity
   // ❌ TỐN: ~20,000 gas
   string public lastNote;
   lastNote = "Đóng quỹ tháng 1";

   // ✅ TIẾT KIỆM: ~2,000 gas
   event NoteLogged(string note);
   emit NoteLogged("Đóng quỹ tháng 1");
   ```

2. **Pack variables để tiết kiệm storage slots**
   ```solidity
   // ❌ TỐN: 3 slots × 20,000 = 60,000 gas
   uint256 a;  // slot 1
   uint128 b;  // slot 2
   uint128 c;  // slot 3

   // ✅ TIẾT KIỆM: 2 slots × 20,000 = 40,000 gas
   uint256 a;  // slot 1
   uint128 b;  // slot 2 (first half)
   uint128 c;  // slot 2 (second half)
   ```

3. **Xóa dữ liệu không dùng để nhận gas refund**
   ```solidity
   // Khi xóa storage, nhận lại 15,000 gas
   delete logs[oldIndex];  // Refund: 15,000 gas
   ```

#### Tóm tắt

**Gas = Chi phí để chạy code trên blockchain**

**Tại sao có gas?**
- Trả cho miners/validators
- Ngăn spam
- Phân bổ tài nguyên

**Tại sao operation khác nhau có gas khác nhau?**
- Lưu storage (20,000 gas): Lưu mãi mãi trên hàng nghìn nodes
- Cập nhật storage (5,000 gas): Chỉ update, không allocate mới
- Emit event (2,000 gas): Nhẹ hơn, không lưu vào contract storage
- Tính toán (3-30 gas): Rẻ, chỉ CPU không lưu trữ

**Chi phí thực tế:**
- Hardhat local: MIỄN PHÍ (fake ETH)
- Polygon: $0.002/transaction (2/10 cent)
- Ethereum: $9-36/transaction (ĐẮT!)

**Kết luận:** Optimize gas rất quan trọng nếu deploy lên mainnet!

---

## Cấu trúc Block trong Blockchain

### Storage và Events đều lưu trong Block

Mỗi block trong blockchain chứa cả **Storage changes** và **Events**. Đây là cấu trúc chi tiết:

```
┌─────────────────────────────────────────────────────────────────┐
│ BLOCK #123                                                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ PHẦN 1: BLOCK HEADER (Metadata)                            │ │
│ ├─────────────────────────────────────────────────────────────┤ │
│ │ Block Number: 123                                           │ │
│ │ Timestamp: 2025-01-14 10:00:00                             │ │
│ │ Parent Hash: 0xblock122... (hash của block trước)          │ │
│ │ Block Hash: 0xblock123... (hash của block này)             │ │
│ │ Miner: 0xminer...                                           │ │
│ │                                                             │ │
│ │ State Root: 0xstate123...   ← Hash của CONTRACT STORAGE    │ │
│ │ Receipts Root: 0xreceipt... ← Hash của EVENTS              │ │
│ │ Transactions Root: 0xtx...  ← Hash của transactions        │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ PHẦN 2: TRANSACTIONS (Danh sách các giao dịch)             │ │
│ ├─────────────────────────────────────────────────────────────┤ │
│ │ Transaction #1:                                             │ │
│ │   Hash: 0x1111aaaa...                                       │ │
│ │   From: 0xAlice...                                          │ │
│ │   To: 0xContract1... (TreasuryLogger)                       │ │
│ │   Input: logTransaction(0x1111, 100000, true, 0xhash...)   │ │
│ │   Gas: 61,234                                               │ │
│ │                                                             │ │
│ │ Transaction #2:                                             │ │
│ │   Hash: 0x2222bbbb...                                       │ │
│ │   From: 0xBob...                                            │ │
│ │   To: 0xContract2...                                        │ │
│ │   Input: transfer(0xCharlie, 50)                            │ │
│ │   Gas: 21,000                                               │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ PHẦN 3: STATE CHANGES (Contract Storage thay đổi)          │ │
│ ├─────────────────────────────────────────────────────────────┤ │
│ │ Từ transaction #1:                                          │ │
│ │ ┌─────────────────────────────────────────────────────────┐ │ │
│ │ │ Contract: 0xContract1... (TreasuryLogger)               │ │ │
│ │ │                                                         │ │ │
│ │ │ Storage slot 0 (logCount):                              │ │ │
│ │ │   Before: 4                                             │ │ │
│ │ │   After:  5                    ← STORAGE THAY ĐỔI      │ │ │
│ │ │                                                         │ │ │
│ │ │ Storage slot 5 (logs[4]):                               │ │ │
│ │ │   Before: empty                                         │ │ │
│ │ │   After: {treasury: 0x1111, amount: 100000, ...}       │ │ │
│ │ │                                  ← STORAGE MỚI         │ │ │
│ │ └─────────────────────────────────────────────────────────┘ │ │
│ │                                                             │ │
│ │ Từ transaction #2:                                          │ │
│ │ ┌─────────────────────────────────────────────────────────┐ │ │
│ │ │ Contract: 0xContract2... (Token)                        │ │ │
│ │ │                                                         │ │ │
│ │ │ balances[0xBob]:                                        │ │ │
│ │ │   Before: 100                                           │ │ │
│ │ │   After:  50                    ← STORAGE THAY ĐỔI      │ │ │
│ │ │                                                         │ │ │
│ │ │ balances[0xCharlie]:                                    │ │ │
│ │ │   Before: 200                                           │ │ │
│ │ │   After:  250                   ← STORAGE THAY ĐỔI      │ │ │
│ │ └─────────────────────────────────────────────────────────┘ │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ PHẦN 4: TRANSACTION RECEIPTS (Kết quả + Events)            │ │
│ ├─────────────────────────────────────────────────────────────┤ │
│ │ Receipt for transaction #1 (0x1111aaaa...):                │ │
│ │ ┌─────────────────────────────────────────────────────────┐ │ │
│ │ │ Status: Success (1)                                     │ │ │
│ │ │ Gas Used: 61,234                                        │ │ │
│ │ │ Contract Address: 0xContract1...                        │ │ │
│ │ │                                                         │ │ │
│ │ │ LOGS (Events): [         ← EVENTS LƯU Ở ĐÂY!          │ │ │
│ │ │   {                                                     │ │ │
│ │ │     address: "0xContract1...",                          │ │ │
│ │ │     topics: [                                           │ │ │
│ │ │       "0xTransactionLogged_sig...",  // Event signature│ │ │
│ │ │       "0x1111...",                   // indexed: treasury│ │ │
│ │ │       "0xAlice..."                   // indexed: loggedBy│ │ │
│ │ │     ],                                                  │ │ │
│ │ │     data: "0x0000...0186a0..."  // non-indexed: amount,│ │ │
│ │ │                                 // isIncome, detailHash │ │ │
│ │ │   }                                                     │ │ │
│ │ │ ]                                                       │ │ │
│ │ └─────────────────────────────────────────────────────────┘ │ │
│ │                                                             │ │
│ │ Receipt for transaction #2 (0x2222bbbb...):                │ │
│ │ ┌─────────────────────────────────────────────────────────┐ │ │
│ │ │ Status: Success (1)                                     │ │ │
│ │ │ Gas Used: 21,000                                        │ │ │
│ │ │                                                         │ │ │
│ │ │ LOGS (Events): [                                        │ │ │
│ │ │   {                                                     │ │ │
│ │ │     address: "0xContract2...",                          │ │ │
│ │ │     topics: ["0xTransfer_sig...", "0xBob", "0xCharlie"],│ │ │
│ │ │     data: "0x32"  // 50 in hex                          │ │ │
│ │ │   }                                                     │ │ │
│ │ │ ]                                                       │ │ │
│ │ └─────────────────────────────────────────────────────────┘ │ │
│ └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### Tóm tắt

**Mỗi block chứa 4 phần chính:**

1. **Block Header** - Metadata và các hash roots
2. **Transactions** - Danh sách các giao dịch được execute
3. **State Changes** - Thay đổi Contract Storage (nếu có transactions ghi storage)
4. **Transaction Receipts** - Kết quả execute + Events (nếu có transactions emit events)

**Lưu ý quan trọng:**

```
┌─────────────────────────────────────────────────────────────┐
│ STORAGE (State):                                            │
│ - Chỉ lưu THAY ĐỔI (delta) trong mỗi block                 │
│ - VD: logCount: 4 → 5 (chỉ lưu kết quả cuối)              │
│ - Để biết state đầy đủ, phải tính từ block genesis đến nay │
│ - Được tổ chức trong State Trie (Merkle Patricia Trie)     │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ EVENTS (Receipts):                                          │
│ - Lưu TOÀN BỘ event data trong block đó                    │
│ - Không tích lũy, mỗi block chứa events riêng của nó       │
│ - Được lưu trong Transaction Receipts                       │
│ - External tools query qua eth_getLogs                      │
└─────────────────────────────────────────────────────────────┘
```

**Ví dụ minh họa:**

```
Block #121:
  - State: logCount = 3
  - Events: [TransactionLogged(...)]

Block #122:
  - State change: logCount 3 → 4
  - Events: [TransactionLogged(...)]

Block #123:
  - State change: logCount 4 → 5
  - Events: [TransactionLogged(...)]

→ Current state của logCount = 5
  (phải tính từ genesis → block 123)

→ Events của block 123 chỉ chứa events của block đó
  (không tích lũy events từ block trước)
```

**Cả Storage và Events đều:**
- ✅ Lưu trong blockchain
- ✅ Đồng bộ trên tất cả nodes
- ✅ Immutable (không thể sửa đổi)
- ✅ Persistent (lưu mãi mãi)

**Chỉ khác nhau về:**
- Vị trí lưu trong block (State Trie vs Receipts)
- Contract có đọc được không
- Gas cost (20,000 vs 2,000)

---

### detailHash là gì?

**Backend tạo detailHash:**

```go
// blockchain_service.go - Line 189-202
func (s *BlockchainService) createDetailHash(transaction *models.Transaction) [32]byte {
    // Ghép các field lại thành 1 string
    data := fmt.Sprintf(
        "%s|%s|%.8f|%s|%s",
        transaction.ID.String(),           // UUID
        transaction.Type,                  // "INCOME" or "EXPENSE"
        transaction.AmountToken,           // 100000.00000000
        transaction.Note,                  // "Đóng quỹ tháng 1"
        transaction.CreatedAt.String(),    // "2025-01-12 10:00:00"
    )
    // VD: "abc-123|INCOME|100000.00000000|Đóng quỹ tháng 1|2025-01-12 10:00:00"

    // Hash bằng Keccak256 (SHA-3)
    hash := crypto.Keccak256Hash([]byte(data))
    return [32]byte(hash)
    // Result: 0xabcd1234ef5678901234567890abcdef...
}
```

**Mục đích của detailHash:**

1. **Verify tính toàn vẹn (integrity):**
```
User nghi ngờ transaction bị sửa trong database.

Step 1: Lấy data từ PostgreSQL
- ID: abc-123
- Type: INCOME
- Amount: 100000
- Note: "Đóng quỹ tháng 1"
- CreatedAt: 2025-01-12 10:00:00

Step 2: Tính lại hash
detailHash = keccak256("abc-123|INCOME|100000|Đóng quỹ tháng 1|2025-01-12 10:00:00")
          = 0xabcd1234...

Step 3: Lấy hash từ blockchain
contract.logs(0).detailHash = 0xabcd1234...

Step 4: So sánh
0xabcd1234... === 0xabcd1234... ✅ KHỚP!
→ Data KHÔNG bị sửa đổi
```

2. **Tiết kiệm gas:**
```
❌ Lưu toàn bộ note lên blockchain:
note = "Đóng góp quỹ tháng 1 cho dự án xây dựng trường học tại vùng cao"
→ Tốn rất nhiều gas (~1000 gas/byte)

✅ Chỉ lưu hash:
detailHash = 0xabcd1234... (32 bytes cố định)
→ Tiết kiệm gas
```

### Quy trình hoàn chỉnh

```
┌──────────────────────────────────────────────────────────────┐
│ USER: Nhập thu 100,000 VND, note "Đóng quỹ tháng 1"         │
└─────────────────────┬────────────────────────────────────────┘
                      │
                      v
┌──────────────────────────────────────────────────────────────┐
│ FRONTEND                                                     │
│ POST /api/treasuries/xxx/transactions                        │
│ {                                                            │
│   "amount": 100000,                                          │
│   "type": "INCOME",                                          │
│   "note": "Đóng quỹ tháng 1"                                │
│ }                                                            │
└─────────────────────┬────────────────────────────────────────┘
                      │
                      v
┌──────────────────────────────────────────────────────────────┐
│ BACKEND - transaction_handler.go                            │
│                                                              │
│ Step 1: Validate request                                    │
│ Step 2: BEGIN transaction (PostgreSQL)                      │
│                                                              │
│ Step 3: Lưu vào database                                    │
│   INSERT INTO transactions VALUES (                          │
│     id: 'abc-123',                                           │
│     treasury_id: 'treas-1',                                  │
│     amount_token: 100000,                                    │
│     type: 'INCOME',                                          │
│     note: 'Đóng quỹ tháng 1',                               │
│     creator_id: 'user-1',                                    │
│     created_at: '2025-01-12 10:00:00'                       │
│   )                                                          │
│                                                              │
│ Step 4: Gọi blockchain service                              │
│   txHash, detailHash, err := blockchain.LogTransaction()    │
└─────────────────────┬────────────────────────────────────────┘
                      │
                      v
┌──────────────────────────────────────────────────────────────┐
│ BLOCKCHAIN SERVICE - blockchain_service.go                   │
│                                                              │
│ Step 1: Tạo detailHash                                      │
│   data = "abc-123|INCOME|100000|Đóng quỹ...|2025-01-12..." │
│   detailHash = keccak256(data)                              │
│              = 0xabcd1234...                                 │
│                                                              │
│ Step 2: Convert amount to wei                               │
│   amount = 100000 * 10^18 wei                               │
│                                                              │
│ Step 3: Pack transaction data (ABI encoding)                │
│   data = abi.Pack("logTransaction",                         │
│                   treasuryAddr,                              │
│                   amountWei,                                 │
│                   true,        // isIncome                   │
│                   detailHash)                                │
│                                                              │
│ Step 4: Lấy nonce                                           │
│   nonce = 5                                                  │
│                                                              │
│ Step 5: Lấy gas price                                       │
│   gasPrice = 1000000000 (1 Gwei)                            │
│                                                              │
│ Step 6: Tạo transaction                                     │
│   tx = NewTransaction(nonce, contractAddr, 0,                │
│                       300000, gasPrice, data)                │
│                                                              │
│ Step 7: Ký transaction                                      │
│   signedTx = SignTx(tx, signer, privateKey)                 │
│                                                              │
│ Step 8: Gửi lên blockchain                                  │
│   client.SendTransaction(signedTx)                           │
│   txHash = 0x1234abcd...                                    │
└─────────────────────┬────────────────────────────────────────┘
                      │
                      v
┌──────────────────────────────────────────────────────────────┐
│ HARDHAT NODE                                                 │
│                                                              │
│ Step 1: Nhận transaction                                    │
│ Step 2: Validate signature, nonce, gas                      │
│ Step 3: Decode transaction data                             │
│   function: logTransaction                                   │
│   params: [treasuryAddr, 100000, true, 0xabcd1234...]      │
│                                                              │
│ Step 4: Execute smart contract                              │
│   TreasuryLogger.logTransaction() được gọi                  │
│                                                              │
│   4.1: Validate input                                       │
│        require(treasuryAddr != 0x0) ✓                       │
│        require(amount > 0) ✓                                │
│                                                              │
│   4.2: Tạo LogEntry                                         │
│        newLog = LogEntry{...}                               │
│                                                              │
│   4.3: Lưu vào storage                                      │
│        logs[0] = newLog                                     │
│        treasuryLogs[treasuryAddr].push(0)                   │
│                                                              │
│   4.4: Emit event                                           │
│        emit TransactionLogged(...)                          │
│                                                              │
│   4.5: Tăng counter                                         │
│        logCount++ (logCount = 1)                            │
│                                                              │
│ Step 5: Mining (instant vì auto=true)                      │
│   Block #2 được tạo với transaction này                     │
│                                                              │
│ Step 6: Trả về txHash                                       │
│   txHash = 0x1234abcd...                                    │
└─────────────────────┬────────────────────────────────────────┘
                      │
                      v
┌──────────────────────────────────────────────────────────────┐
│ BACKEND - Tiếp tục transaction_handler.go                   │
│                                                              │
│ Step 5: Lưu blockchain info                                 │
│   INSERT INTO chain_logs VALUES (                            │
│     transaction_id: 'abc-123',                               │
│     tx_hash: '0x1234abcd...',                               │
│     detail_hash: '0xabcd1234...',                           │
│     status: 'CONFIRMED',                                     │
│     blockchain_time: '2025-01-12 10:00:01'                  │
│   )                                                          │
│                                                              │
│ Step 6: COMMIT transaction                                   │
│                                                              │
│ Step 7: Return response                                     │
│   {                                                          │
│     "id": "abc-123",                                         │
│     "amount": 100000,                                        │
│     "chain_log": {                                           │
│       "tx_hash": "0x1234abcd..."                            │
│     }                                                        │
│   }                                                          │
└─────────────────────┬────────────────────────────────────────┘
                      │
                      v
┌──────────────────────────────────────────────────────────────┐
│ FRONTEND                                                     │
│                                                              │
│ Hiển thị transaction với tx_hash                            │
│                                                              │
│ | Ngày       | Loại | Số tiền | Blockchain      |           │
│ |------------|------|---------|-----------------|           │
│ | 2025-01-12 | Thu  | 100,000 | 0x1234abcd...   |           │
└──────────────────────────────────────────────────────────────┘
```

### So sánh: Có và Không có Smart Contract

#### Không có Smart Contract (chỉ database)

```
┌─────────────────────────────────────────────────────────────┐
│ PostgreSQL                                                  │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ transactions table                                      │ │
│ │ id: abc-123, amount: 100000, note: "Đóng quỹ"          │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘

❌ Vấn đề:
1. Admin có thể sửa: UPDATE transactions SET amount = 50000
2. Hacker có thể xóa: DELETE FROM transactions WHERE id = 'abc-123'
3. Không có proof để verify
4. User phải tin tưởng admin 100%
```

#### Có Smart Contract

```
┌─────────────────────────────────────────────────────────────┐
│ PostgreSQL (fast queries)                                   │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ transactions: id, amount, note, ...                     │ │
│ │ chain_logs: tx_hash, detail_hash                        │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                        ↕ verify
┌─────────────────────────────────────────────────────────────┐
│ Blockchain (immutable proof)                                │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Block #2: tx_hash=0x1234..., detailHash=0xabcd...      │ │
│ │ Cannot be modified or deleted!                          │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘

✅ Lợi ích:
1. Nếu admin sửa database → detailHash sẽ không khớp
2. Hacker xóa database → vẫn có proof trên blockchain
3. Auditor có thể verify độc lập
4. Transparent và trustless
```

### Tóm tắt Smart Contract

**TreasuryLogger.sol làm gì?**
- Lưu trữ logs của tất cả transactions (thu/chi)
- Mỗi log có: treasury address, amount, isIncome, detailHash, timestamp
- Emit events để dễ query
- Cung cấp functions để đọc dữ liệu

**Tại sao cần?**
- Tạo proof immutable trên blockchain
- Không thể sửa đổi hoặc xóa
- Transparent - ai cũng có thể verify
- Trustless - không cần tin admin

**Chi phí?**
- Hardhat local: FREE
- Polygon mainnet: ~$0.005/transaction
- Ethereum mainnet: ~$5-50/transaction (đắt!)

**Hạn chế?**
- Không lưu được dữ liệu lớn (chỉ lưu hash)
- Query phức tạp hơn database
- Data mất khi restart Hardhat (cần persistent storage hoặc public chain)

---

**Kết luận:**

1. **Blockchain data MẤT khi restart Hardhat** vì không có persistent volume
2. **PostgreSQL data VẪN CÒN** vì có volume mount
3. **Smart contract** ghi nhận transactions lên blockchain để tạo immutable proof
4. **Kết hợp database + blockchain** = Fast queries + Immutable proof
5. **Production nên dùng public testnet/mainnet** thay vì Hardhat local

