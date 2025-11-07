import React, { useState } from 'react';
import '../styles/TransactionForm.css';

const TransactionForm = ({ type, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    amount_token: '',
    note: '',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await onSubmit({
        type,
        amount_token: parseFloat(formData.amount_token),
        note: formData.note,
      });
      setFormData({ amount_token: '', note: '' });
    } catch (error) {
      console.error('Transaction failed:', error);
      alert('Giao dịch thất bại. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="transaction-form">
      <div className="form-group">
        <label>Số tiền (VNĐ) *</label>
        <input
          type="number"
          step="0.01"
          min="0.01"
          value={formData.amount_token}
          onChange={(e) => setFormData({ ...formData, amount_token: e.target.value })}
          required
          placeholder="0.00"
          disabled={loading}
        />
      </div>

      <div className="form-group">
        <label>Ghi chú</label>
        <textarea
          value={formData.note}
          onChange={(e) => setFormData({ ...formData, note: e.target.value })}
          placeholder="Mô tả giao dịch..."
          rows="3"
          disabled={loading}
        />
      </div>

      <div className="modal-actions">
        <button type="button" onClick={onCancel} className="btn-secondary" disabled={loading}>
          Hủy
        </button>
        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? 'Đang xử lý...' : 'Xác nhận'}
        </button>
      </div>
    </form>
  );
};

export default TransactionForm;
