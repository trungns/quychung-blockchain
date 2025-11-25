import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { treasuryAPI, transactionAPI } from '../services/api';
import TransactionForm from '../components/TransactionForm';
import TransactionList from '../components/TransactionList';
import MembersSummary from '../components/MembersSummary';
import { formatCurrency } from '../utils/formatters';
import '../styles/TreasuryDetail.css';

const TreasuryDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [treasury, setTreasury] = useState(null);
  const [balance, setBalance] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showTransactionForm, setShowTransactionForm] = useState(false);
  const [transactionType, setTransactionType] = useState('INCOME');
  const [showAddMember, setShowAddMember] = useState(false);
  const [memberEmail, setMemberEmail] = useState('');

  useEffect(() => {
    loadTreasuryData();
  }, [id]);

  const loadTreasuryData = async () => {
    try {
      const [treasuryRes, balanceRes, transactionsRes] = await Promise.all([
        treasuryAPI.getById(id),
        treasuryAPI.getBalance(id),
        transactionAPI.getAll(id),
      ]);

      setTreasury(treasuryRes.data);
      setBalance(balanceRes.data);
      setTransactions(transactionsRes.data);
    } catch (error) {
      console.error('Failed to load treasury data:', error);
      alert('Không thể tải dữ liệu quỹ');
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const handleTransactionSubmit = async (data) => {
    try {
      await transactionAPI.create(id, data);
      setShowTransactionForm(false);
      loadTreasuryData(); // Reload data
    } catch (error) {
      console.error('Failed to create transaction:', error);
      throw error;
    }
  };

  const handleAddMember = async (e) => {
    e.preventDefault();
    try {
      await treasuryAPI.addMember(id, { email: memberEmail });
      setMemberEmail('');
      setShowAddMember(false);
      loadTreasuryData();
    } catch (error) {
      console.error('Failed to add member:', error);
      alert('Thêm thành viên thất bại. Vui lòng kiểm tra email.');
    }
  };

  const openTransactionForm = (type) => {
    setTransactionType(type);
    setShowTransactionForm(true);
  };

  if (loading) {
    return <div className="loading">Đang tải...</div>;
  }

  if (!treasury) {
    return <div className="error">Không tìm thấy quỹ</div>;
  }

  return (
    <div className="treasury-detail-container">
      <header className="treasury-header">
        <button onClick={() => navigate('/')} className="btn-back">
          ← Quay lại
        </button>
        <h1>{treasury.name}</h1>
        {treasury.description && <p className="treasury-description">{treasury.description}</p>}
      </header>

      <div className="treasury-content">
        {/* Balance Card */}
        <div className="balance-card">
          <h2>Số dư hiện tại</h2>
          <div className="balance-amount">
            {formatCurrency(balance?.balance || 0)}
          </div>
          <div className="balance-details">
            <div className="balance-item income">
              <span>Tổng thu</span>
              <span>{formatCurrency(balance?.total_income || 0)}</span>
            </div>
            <div className="balance-item expense">
              <span>Tổng chi</span>
              <span>{formatCurrency(balance?.total_expense || 0)}</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="action-buttons">
          <button
            onClick={() => openTransactionForm('INCOME')}
            className="btn-primary btn-income"
          >
            + Nhập thu
          </button>
          <button
            onClick={() => openTransactionForm('EXPENSE')}
            className="btn-primary btn-expense"
          >
            - Nhập chi
          </button>
          <button
            onClick={() => navigate(`/treasury/${id}/reports`)}
            className="btn-secondary btn-reports"
          >
            📊 Báo cáo
          </button>
        </div>

        {/* Transactions Section - Moved up for mobile priority */}
        <div className="transactions-section">
          <h3>Lịch sử giao dịch</h3>
          <TransactionList transactions={transactions} />
        </div>

        {/* Members Section - Using new MembersSummary component */}
        <MembersSummary
          members={treasury.members || []}
          onAddMember={() => setShowAddMember(true)}
          isAdmin={treasury.created_by === treasury.creator?.id}
        />
      </div>

      {/* Transaction Form Modal */}
      {showTransactionForm && (
        <div className="modal-overlay" onClick={() => setShowTransactionForm(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>{transactionType === 'INCOME' ? 'Nhập thu' : 'Nhập chi'}</h2>
            <TransactionForm
              type={transactionType}
              onSubmit={handleTransactionSubmit}
              onCancel={() => setShowTransactionForm(false)}
            />
          </div>
        </div>
      )}

      {/* Add Member Modal */}
      {showAddMember && (
        <div className="modal-overlay" onClick={() => setShowAddMember(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Thêm thành viên</h2>
            <form onSubmit={handleAddMember}>
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  value={memberEmail}
                  onChange={(e) => setMemberEmail(e.target.value)}
                  required
                  placeholder="email@example.com"
                />
              </div>
              <div className="modal-actions">
                <button type="button" onClick={() => setShowAddMember(false)} className="btn-secondary">
                  Hủy
                </button>
                <button type="submit" className="btn-primary">
                  Thêm
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TreasuryDetail;
