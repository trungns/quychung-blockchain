import React, { useState } from 'react';
import { formatCurrencyInput, parseCurrencyInput } from '../utils/formatters';
import '../styles/TransactionForm.css';

const TransactionForm = ({ type, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    amount_token: '',
    note: '',
  });
  const [formattedAmount, setFormattedAmount] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAmountChange = (e) => {
    const input = e.target.value;

    // Format the input value
    const formatted = formatCurrencyInput(input);
    setFormattedAmount(formatted);

    // Parse and store the actual number
    const actualAmount = parseCurrencyInput(input);
    setFormData({ ...formData, amount_token: actualAmount });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await onSubmit({
        type,
        amount_token: formData.amount_token,
        note: formData.note,
      });
      setFormData({ amount_token: '', note: '' });
      setFormattedAmount('');
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
          type="text"
          value={formattedAmount}
          onChange={handleAmountChange}
          required
          placeholder="0"
          disabled={loading}
          className="currency-input"
          inputMode="numeric"
        />
        {formattedAmount && (
          <small className="formatted-hint">
            Số tiền: {formattedAmount} đ
          </small>
        )}
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
