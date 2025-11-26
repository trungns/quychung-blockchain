import React from 'react';
import '../styles/TransactionStatusBadge.css';

const TransactionStatusBadge = ({ status }) => {
  const statusConfig = {
    pending: { label: 'Chờ xác nhận', color: 'orange', icon: '⏳' },
    confirmed: { label: 'Đã ghi sổ', color: 'green', icon: '✓' },
    rejected: { label: 'Đã từ chối', color: 'red', icon: '✗' },
    deleted: { label: 'Đã xóa', color: 'gray', icon: '🗑' },
  };

  const config = statusConfig[status] || statusConfig.pending;

  return (
    <span className={`status-badge status-${config.color}`}>
      <span className="status-icon">{config.icon}</span>
      <span className="status-label">{config.label}</span>
    </span>
  );
};

export default TransactionStatusBadge;
