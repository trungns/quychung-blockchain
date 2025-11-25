import React, { useState } from 'react';
import { formatCurrency, formatDate } from '../utils/formatters';
import { transactionAPI } from '../services/api';
import '../styles/PendingTransactions.css';

const PendingTransactions = ({ treasuryId, pendingTransactions, onUpdate }) => {
  const [selectedTx, setSelectedTx] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [confirmedAmount, setConfirmedAmount] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [loading, setLoading] = useState(false);

  const handleConfirm = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await transactionAPI.confirm(treasuryId, selectedTx.id, {
        confirmed_amount: parseFloat(confirmedAmount),
      });
      setShowConfirmModal(false);
      setSelectedTx(null);
      setConfirmedAmount('');
      onUpdate();
    } catch (error) {
      console.error('Failed to confirm transaction:', error);
      alert('Xác nhận giao dịch thất bại');
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await transactionAPI.reject(treasuryId, selectedTx.id, {
        reason: rejectReason,
      });
      setShowRejectModal(false);
      setSelectedTx(null);
      setRejectReason('');
      onUpdate();
    } catch (error) {
      console.error('Failed to reject transaction:', error);
      alert('Từ chối giao dịch thất bại');
    } finally {
      setLoading(false);
    }
  };

  const openConfirmModal = (tx) => {
    setSelectedTx(tx);
    setConfirmedAmount(tx.amount_token.toString());
    setShowConfirmModal(true);
  };

  const openRejectModal = (tx) => {
    setSelectedTx(tx);
    setShowRejectModal(true);
  };

  if (!pendingTransactions || pendingTransactions.length === 0) {
    return (
      <div className="pending-transactions">
        <h3>Giao dịch chờ xác nhận</h3>
        <p className="empty-message">Không có giao dịch nào chờ xác nhận</p>
      </div>
    );
  }

  return (
    <div className="pending-transactions">
      <h3>Giao dịch chờ xác nhận ({pendingTransactions.length})</h3>
      <div className="pending-list">
        {pendingTransactions.map((tx) => (
          <div key={tx.id} className={`pending-card ${tx.type.toLowerCase()}`}>
            <div className="pending-header">
              <span className={`type-badge ${tx.type.toLowerCase()}`}>
                {tx.type === 'INCOME' ? 'Thu' : 'Chi'}
              </span>
              <span className="amount">
                {tx.type === 'INCOME' ? '+' : '-'}
                {formatCurrency(tx.amount_token)}
              </span>
            </div>
            <div className="pending-body">
              <p className="note">{tx.note || 'Không có ghi chú'}</p>
              <div className="meta">
                <small>Tạo bởi: {tx.creator?.name || tx.creator?.email}</small>
                <small>{formatDate(tx.created_at)}</small>
              </div>
            </div>
            <div className="pending-actions">
              <button
                onClick={() => openConfirmModal(tx)}
                className="btn-confirm"
              >
                ✓ Xác nhận
              </button>
              <button
                onClick={() => openRejectModal(tx)}
                className="btn-reject"
              >
                ✗ Từ chối
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Confirm Modal */}
      {showConfirmModal && selectedTx && (
        <div className="modal-overlay" onClick={() => setShowConfirmModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Xác nhận giao dịch</h2>
            <form onSubmit={handleConfirm}>
              <div className="confirm-info">
                <p><strong>Loại:</strong> {selectedTx.type === 'INCOME' ? 'Thu' : 'Chi'}</p>
                <p><strong>Số tiền đề xuất:</strong> {formatCurrency(selectedTx.amount_token)}</p>
                <p><strong>Ghi chú:</strong> {selectedTx.note || 'Không có'}</p>
              </div>
              <div className="form-group">
                <label>Số tiền xác nhận *</label>
                <input
                  type="number"
                  step="0.01"
                  value={confirmedAmount}
                  onChange={(e) => setConfirmedAmount(e.target.value)}
                  required
                  placeholder="Nhập số tiền thực tế"
                />
                <small>Có thể điều chỉnh nếu số tiền thực tế khác đề xuất</small>
              </div>
              <div className="modal-actions">
                <button
                  type="button"
                  onClick={() => setShowConfirmModal(false)}
                  className="btn-secondary"
                  disabled={loading}
                >
                  Hủy
                </button>
                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? 'Đang xử lý...' : 'Xác nhận'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && selectedTx && (
        <div className="modal-overlay" onClick={() => setShowRejectModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Từ chối giao dịch</h2>
            <form onSubmit={handleReject}>
              <div className="confirm-info">
                <p><strong>Loại:</strong> {selectedTx.type === 'INCOME' ? 'Thu' : 'Chi'}</p>
                <p><strong>Số tiền:</strong> {formatCurrency(selectedTx.amount_token)}</p>
                <p><strong>Ghi chú:</strong> {selectedTx.note || 'Không có'}</p>
              </div>
              <div className="form-group">
                <label>Lý do từ chối *</label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  required
                  placeholder="Nhập lý do từ chối..."
                  rows="3"
                />
              </div>
              <div className="modal-actions">
                <button
                  type="button"
                  onClick={() => setShowRejectModal(false)}
                  className="btn-secondary"
                  disabled={loading}
                >
                  Hủy
                </button>
                <button type="submit" className="btn-danger" disabled={loading}>
                  {loading ? 'Đang xử lý...' : 'Từ chối'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PendingTransactions;
