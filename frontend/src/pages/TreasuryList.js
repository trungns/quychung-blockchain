import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { treasuryAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import '../styles/TreasuryList.css';

const TreasuryList = () => {
  const [treasuries, setTreasuries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ name: '', description: '' });
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    loadTreasuries();
  }, []);

  const loadTreasuries = async () => {
    try {
      const response = await treasuryAPI.getAll();
      setTreasuries(response.data);
    } catch (error) {
      console.error('Failed to load treasuries:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTreasury = async (e) => {
    e.preventDefault();
    try {
      await treasuryAPI.create(formData);
      setFormData({ name: '', description: '' });
      setShowModal(false);
      loadTreasuries();
    } catch (error) {
      console.error('Failed to create treasury:', error);
      alert('Tạo quỹ thất bại. Vui lòng thử lại.');
    }
  };

  if (loading) {
    return <div className="loading">Đang tải...</div>;
  }

  return (
    <div className="treasury-list-container">
      <header className="app-header">
        <h1>Quỹ Chung</h1>
        <div className="user-info">
          <span>{user?.name || user?.email}</span>
          <button onClick={logout} className="btn-logout">Đăng xuất</button>
        </div>
      </header>

      <div className="content">
        <div className="page-header">
          <h2>Danh sách quỹ</h2>
          <button onClick={() => setShowModal(true)} className="btn-primary">
            + Tạo quỹ mới
          </button>
        </div>

        {treasuries.length === 0 ? (
          <div className="empty-state">
            <p>Bạn chưa có quỹ nào.</p>
            <button onClick={() => setShowModal(true)} className="btn-primary">
              Tạo quỹ đầu tiên
            </button>
          </div>
        ) : (
          <div className="treasury-grid">
            {treasuries.map((treasury) => (
              <div
                key={treasury.id}
                className="treasury-card"
                onClick={() => navigate(`/treasury/${treasury.id}`)}
              >
                <h3>{treasury.name}</h3>
                {treasury.description && <p>{treasury.description}</p>}
                <div className="treasury-meta">
                  <span>{treasury.members?.length || 0} thành viên</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Tạo quỹ mới</h2>
            <form onSubmit={handleCreateTreasury}>
              <div className="form-group">
                <label>Tên quỹ *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  placeholder="VD: Quỹ lớp 10A1"
                />
              </div>
              <div className="form-group">
                <label>Mô tả</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Mô tả về quỹ..."
                  rows="3"
                />
              </div>
              <div className="modal-actions">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">
                  Hủy
                </button>
                <button type="submit" className="btn-primary">
                  Tạo quỹ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TreasuryList;
