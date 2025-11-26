import React, { useState } from 'react';
import { formatCurrency, formatDate } from '../utils/formatters';
import TransactionStatusBadge from './TransactionStatusBadge';
import BlockchainStatusBadge from './BlockchainStatusBadge';
import { transactionAPI } from '../services/api';
import '../styles/TransactionList.css';

const TransactionList = ({ transactions, treasuryId, userRole, onUpdate }) => {
  const [retrying, setRetrying] = useState({});

  if (!transactions || transactions.length === 0) {
    return (
      <div className="empty-transactions">
        <p>Chưa có giao dịch nào</p>
      </div>
    );
  }

  const canRetryBlockchain = (transaction) => {
    return (
      transaction.status === 'confirmed' &&
      transaction.chain_log &&
      (transaction.chain_log.status === 'none' || transaction.chain_log.status === 'failed') &&
      (userRole === 'admin' || userRole === 'treasurer')
    );
  };

  const handleRetryBlockchain = async (transactionId) => {
    if (retrying[transactionId]) return;

    setRetrying({ ...retrying, [transactionId]: true });
    try {
      await transactionAPI.retryBlockchain(treasuryId, transactionId);
      alert('Đã gửi yêu cầu ghi lại lên blockchain');
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Retry blockchain failed:', error);
      alert('Không thể ghi lại blockchain: ' + (error.response?.data?.error || error.message));
    } finally {
      setRetrying({ ...retrying, [transactionId]: false });
    }
  };

  return (
    <div className="transaction-list">
      <table className="transaction-table">
        <thead>
          <tr>
            <th>Ngày</th>
            <th>Loại</th>
            <th>Số tiền</th>
            <th>Ghi chú</th>
            <th>Người tạo</th>
            <th>Trạng thái</th>
            <th>Blockchain</th>
            <th>Thao tác</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((transaction) => (
            <tr key={transaction.id} className={`transaction-row ${transaction.type.toLowerCase()}`}>
              <td className="date-cell">{formatDate(transaction.created_at)}</td>
              <td className="type-cell">
                <span className={`badge ${transaction.type.toLowerCase()}`}>
                  {transaction.type === 'INCOME' ? 'Thu' : 'Chi'}
                </span>
              </td>
              <td className={`amount-cell ${transaction.type.toLowerCase()}`}>
                {transaction.type === 'INCOME' ? '+' : '-'}
                {formatCurrency(transaction.confirmed_amount || transaction.amount_token)}
              </td>
              <td className="note-cell">{transaction.note || '-'}</td>
              <td className="creator-cell">{transaction.creator?.name || transaction.creator?.email}</td>
              <td className="status-cell">
                <TransactionStatusBadge status={transaction.status} />
              </td>
              <td className="blockchain-cell">
                <BlockchainStatusBadge chainLog={transaction.chain_log} />
              </td>
              <td className="action-cell">
                {canRetryBlockchain(transaction) && (
                  <button
                    className="btn-retry-blockchain"
                    onClick={() => handleRetryBlockchain(transaction.id)}
                    disabled={retrying[transaction.id]}
                    title="Ghi lại lên blockchain"
                  >
                    {retrying[transaction.id] ? '⟳' : '🔄'}
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Mobile View */}
      <div className="transaction-list-mobile">
        {transactions.map((transaction) => (
          <div key={transaction.id} className={`transaction-card ${transaction.type.toLowerCase()}`}>
            <div className="transaction-card-header">
              <span className={`badge ${transaction.type.toLowerCase()}`}>
                {transaction.type === 'INCOME' ? 'Thu' : 'Chi'}
              </span>
              <span className={`amount ${transaction.type.toLowerCase()}`}>
                {transaction.type === 'INCOME' ? '+' : '-'}
                {formatCurrency(transaction.confirmed_amount || transaction.amount_token)}
              </span>
            </div>
            <div className="transaction-card-body">
              {transaction.note && <p className="note">{transaction.note}</p>}
              <div className="meta">
                <span>{formatDate(transaction.created_at)}</span>
                <span>{transaction.creator?.name || transaction.creator?.email}</span>
              </div>
              <div className="status-info">
                <TransactionStatusBadge status={transaction.status} />
                <BlockchainStatusBadge chainLog={transaction.chain_log} />
              </div>
              {canRetryBlockchain(transaction) && (
                <button
                  className="btn-retry-blockchain mobile"
                  onClick={() => handleRetryBlockchain(transaction.id)}
                  disabled={retrying[transaction.id]}
                >
                  {retrying[transaction.id] ? '⟳ Đang ghi...' : '🔄 Ghi lại blockchain'}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TransactionList;
