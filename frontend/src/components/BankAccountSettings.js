import React, { useState, useEffect } from 'react';
import { treasuryAPI } from '../services/api';
import '../styles/BankAccountSettings.css';

const BankAccountSettings = ({ treasuryId }) => {
  const [bankAccount, setBankAccount] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    bank_name: '',
    account_number: '',
    account_name: '',
    qr_code_url: '',
  });

  useEffect(() => {
    loadBankAccount();
  }, [treasuryId]);

  const loadBankAccount = async () => {
    try {
      const response = await treasuryAPI.getBankAccount(treasuryId);
      setBankAccount(response.data);
      setFormData({
        bank_name: response.data.bank_name,
        account_number: response.data.account_number,
        account_name: response.data.account_name,
        qr_code_url: response.data.qr_code_url || '',
      });
    } catch (error) {
      console.log('No bank account configured yet');
      setBankAccount(null);
      setIsEditing(true); // Auto-open form if no bank account
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await treasuryAPI.updateBankAccount(treasuryId, formData);
      alert('Cập nhật thông tin ngân hàng thành công!');
      setIsEditing(false);
      loadBankAccount();
    } catch (error) {
      console.error('Failed to update bank account:', error);
      alert('Cập nhật thất bại. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Bạn có chắc muốn xóa thông tin ngân hàng?')) {
      return;
    }

    setLoading(true);
    try {
      await treasuryAPI.deleteBankAccount(treasuryId);
      alert('Đã xóa thông tin ngân hàng');
      setBankAccount(null);
      setIsEditing(true);
      setFormData({
        bank_name: '',
        account_number: '',
        account_name: '',
        qr_code_url: '',
      });
    } catch (error) {
      console.error('Failed to delete bank account:', error);
      alert('Xóa thất bại. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (bankAccount) {
      setFormData({
        bank_name: bankAccount.bank_name,
        account_number: bankAccount.account_number,
        account_name: bankAccount.account_name,
        qr_code_url: bankAccount.qr_code_url || '',
      });
      setIsEditing(false);
    }
  };

  return (
    <div className="bank-account-settings">
      <div className="settings-header">
        <h3>Thông tin ngân hàng</h3>
        {bankAccount && !isEditing && (
          <div className="header-actions">
            <button onClick={() => setIsEditing(true)} className="btn-secondary">
              Chỉnh sửa
            </button>
            <button onClick={handleDelete} className="btn-danger" disabled={loading}>
              Xóa
            </button>
          </div>
        )}
      </div>

      {!isEditing && bankAccount ? (
        <div className="bank-account-display">
          <div className="info-row">
            <span className="label">Ngân hàng:</span>
            <span className="value">{bankAccount.bank_name}</span>
          </div>
          <div className="info-row">
            <span className="label">Số tài khoản:</span>
            <span className="value">{bankAccount.account_number}</span>
          </div>
          <div className="info-row">
            <span className="label">Chủ tài khoản:</span>
            <span className="value">{bankAccount.account_name}</span>
          </div>
          <div className="info-row">
            <span className="label">QR Code URL:</span>
            <span className="value">{bankAccount.qr_code_url || 'Chưa cấu hình'}</span>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="bank-account-form">
          <div className="form-group">
            <label>Tên ngân hàng *</label>
            <input
              type="text"
              value={formData.bank_name}
              onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
              required
              placeholder="VietcomBank, Techcombank, ACB..."
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label>Số tài khoản *</label>
            <input
              type="text"
              value={formData.account_number}
              onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
              required
              placeholder="0123456789"
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label>Chủ tài khoản *</label>
            <input
              type="text"
              value={formData.account_name}
              onChange={(e) => setFormData({ ...formData, account_name: e.target.value })}
              required
              placeholder="NGUYEN VAN A"
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label>QR Code URL (VietQR)</label>
            <input
              type="text"
              value={formData.qr_code_url}
              onChange={(e) => setFormData({ ...formData, qr_code_url: e.target.value })}
              placeholder="https://img.vietqr.io/image/VCB-0123456789-compact2.png"
              disabled={loading}
            />
            <small className="hint">
              Tạo QR code tại:{' '}
              <a href="https://vietqr.io" target="_blank" rel="noopener noreferrer">
                vietqr.io
              </a>
            </small>
          </div>

          <div className="form-actions">
            {bankAccount && (
              <button type="button" onClick={handleCancel} className="btn-secondary" disabled={loading}>
                Hủy
              </button>
            )}
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Đang lưu...' : bankAccount ? 'Cập nhật' : 'Lưu'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default BankAccountSettings;
