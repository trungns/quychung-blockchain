// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title TreasuryLogger
 * @dev Ultra-minimal contract - only emits events, no storage
 * @dev All data is stored in DB, blockchain only for verification
 */
contract TreasuryLogger {

    /**
     * @dev Event emitted when a transaction is logged
     * @param treasury Treasury address
     * @param detailHash Hash of full transaction data (for verification)
     */
    event TransactionLogged(
        address indexed treasury,
        bytes32 indexed detailHash
    );

    /**
     * @dev Log a transaction - minimal gas cost, only emits event
     * @param _treasury Treasury address
     * @param _detailHash Hash of transaction details
     */
    function logTransaction(
        address _treasury,
        bytes32 _detailHash
    ) external {
        emit TransactionLogged(_treasury, _detailHash);
    }
}
