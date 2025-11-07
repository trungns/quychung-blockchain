// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title TreasuryLogger
 * @dev Simple contract to log treasury transactions on-chain for transparency
 */
contract TreasuryLogger {

    event TransactionLogged(
        address indexed treasury,
        uint256 amountToken,
        bool isIncome,
        bytes32 detailHash,
        uint256 timestamp,
        address indexed loggedBy
    );

    struct LogEntry {
        address treasury;
        uint256 amountToken;
        bool isIncome;
        bytes32 detailHash;
        uint256 timestamp;
        address loggedBy;
    }

    // Mapping from log index to log entry
    mapping(uint256 => LogEntry) public logs;
    uint256 public logCount;

    // Mapping from treasury address to log indices
    mapping(address => uint256[]) public treasuryLogs;

    /**
     * @dev Log a transaction on-chain
     * @param _treasury Treasury address
     * @param _amountToken Amount in tokens (wei)
     * @param _isIncome True for income, false for expense
     * @param _detailHash Hash of transaction details (keccak256 of transaction data)
     */
    function logTransaction(
        address _treasury,
        uint256 _amountToken,
        bool _isIncome,
        bytes32 _detailHash
    ) external {
        require(_treasury != address(0), "Invalid treasury address");
        require(_amountToken > 0, "Amount must be greater than 0");

        LogEntry memory newLog = LogEntry({
            treasury: _treasury,
            amountToken: _amountToken,
            isIncome: _isIncome,
            detailHash: _detailHash,
            timestamp: block.timestamp,
            loggedBy: msg.sender
        });

        logs[logCount] = newLog;
        treasuryLogs[_treasury].push(logCount);

        emit TransactionLogged(
            _treasury,
            _amountToken,
            _isIncome,
            _detailHash,
            block.timestamp,
            msg.sender
        );

        logCount++;
    }

    /**
     * @dev Get log count for a specific treasury
     * @param _treasury Treasury address
     * @return Number of logs for the treasury
     */
    function getTreasuryLogCount(address _treasury) external view returns (uint256) {
        return treasuryLogs[_treasury].length;
    }

    /**
     * @dev Get log indices for a treasury
     * @param _treasury Treasury address
     * @return Array of log indices
     */
    function getTreasuryLogIndices(address _treasury) external view returns (uint256[] memory) {
        return treasuryLogs[_treasury];
    }
}
