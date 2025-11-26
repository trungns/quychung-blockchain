import React from 'react';
import '../styles/BlockchainStatusBadge.css';

const BlockchainStatusBadge = ({ chainLog }) => {
  if (!chainLog) {
    return null;
  }

  const statusConfig = {
    none: { label: 'Chưa ghi', color: 'gray', icon: '○' },
    pending: { label: 'Đang ghi...', color: 'blue', icon: '⟳' },
    success: { label: 'On Chain', color: 'green', icon: '⛓' },
    failed: { label: 'Thất bại', color: 'red', icon: '⚠' },
  };

  const config = statusConfig[chainLog.status] || statusConfig.none;

  return (
    <span
      className={`blockchain-badge blockchain-${config.color}`}
      title={chainLog.error_detail || chainLog.tx_hash || 'Blockchain status'}
    >
      <span className="blockchain-icon">{config.icon}</span>
      <span className="blockchain-label">{config.label}</span>
      {chainLog.tx_hash && (
        <small className="tx-hash-short">
          {chainLog.tx_hash.substring(0, 8)}...
        </small>
      )}
    </span>
  );
};

export default BlockchainStatusBadge;
