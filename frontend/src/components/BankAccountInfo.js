import React from 'react';
import '../styles/BankAccountInfo.css';

const BankAccountInfo = ({ bankAccount, amount }) => {
  if (!bankAccount) {
    return (
      <div className="bank-account-info">
        <p className="no-bank-info">Chưa cấu hình thông tin ngân hàng</p>
      </div>
    );
  }

  // Generate VietQR URL with amount
  const generateQRUrl = () => {
    if (!bankAccount.qr_code_url) return null;

    // VietQR format: https://img.vietqr.io/image/{BANK_ID}-{ACCOUNT_NO}-{TEMPLATE}.png?amount={AMOUNT}&addInfo={INFO}
    // If qr_code_url is a template, add amount parameter
    let qrUrl = bankAccount.qr_code_url;

    if (amount && amount > 0) {
      // Check if URL already has query params
      const separator = qrUrl.includes('?') ? '&' : '?';
      qrUrl = `${qrUrl}${separator}amount=${amount}`;
    }

    return qrUrl;
  };

  const qrUrl = generateQRUrl();

  return (
    <div className="bank-account-info">
      <h4>Thông tin chuyển khoản</h4>

      <div className="bank-details">
        <div className="detail-row">
          <span className="detail-label">Ngân hàng:</span>
          <span className="detail-value">{bankAccount.bank_name}</span>
        </div>

        <div className="detail-row">
          <span className="detail-label">Số tài khoản:</span>
          <span className="detail-value account-number">{bankAccount.account_number}</span>
        </div>

        <div className="detail-row">
          <span className="detail-label">Chủ tài khoản:</span>
          <span className="detail-value">{bankAccount.account_name}</span>
        </div>

        {amount && amount > 0 && (
          <div className="detail-row amount-row">
            <span className="detail-label">Số tiền:</span>
            <span className="detail-value amount-value">
              {amount.toLocaleString('vi-VN')} đ
            </span>
          </div>
        )}
      </div>

      {qrUrl && (
        <div className="qr-code-section">
          <p className="qr-label">Quét mã QR để chuyển khoản</p>
          <img
            src={qrUrl}
            alt="QR Code"
            className="qr-code-image"
            onError={(e) => {
              e.target.style.display = 'none';
              e.target.nextElementSibling.style.display = 'block';
            }}
          />
          <p className="qr-error" style={{ display: 'none' }}>
            Không thể tải mã QR
          </p>
        </div>
      )}

      <p className="bank-note">
        💡 Vui lòng chuyển khoản và nhập ghi chú để xác nhận giao dịch
      </p>
    </div>
  );
};

export default BankAccountInfo;
