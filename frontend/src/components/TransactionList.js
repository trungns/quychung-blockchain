import React from 'react';
import { formatCurrency, formatDate } from '../utils/formatters';
import '../styles/TransactionList.css';

const TransactionList = ({ transactions }) => {
  if (!transactions || transactions.length === 0) {
    return (
      <div className="empty-transactions">
        <p>Chưa có giao dịch nào</p>
      </div>
    );
  }

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
            <th>Blockchain</th>
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
                {formatCurrency(transaction.amount_token)}
              </td>
              <td className="note-cell">{transaction.note || '-'}</td>
              <td className="creator-cell">{transaction.creator?.name || transaction.creator?.email}</td>
              <td className="blockchain-cell">
                {transaction.chain_log?.tx_hash ? (
                  <span className="tx-hash" title={transaction.chain_log.tx_hash}>
                    {transaction.chain_log.tx_hash.substring(0, 10)}...
                  </span>
                ) : (
                  <span className="pending">Đang xử lý...</span>
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
                {formatCurrency(transaction.amount_token)}
              </span>
            </div>
            <div className="transaction-card-body">
              {transaction.note && <p className="note">{transaction.note}</p>}
              <div className="meta">
                <span>{formatDate(transaction.created_at)}</span>
                <span>{transaction.creator?.name || transaction.creator?.email}</span>
              </div>
              {transaction.chain_log?.tx_hash && (
                <div className="tx-info">
                  <small title={transaction.chain_log.tx_hash}>
                    TX: {transaction.chain_log.tx_hash.substring(0, 20)}...
                  </small>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TransactionList;
