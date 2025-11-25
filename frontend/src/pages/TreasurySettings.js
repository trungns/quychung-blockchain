import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { treasuryAPI } from '../services/api';
import BankAccountSettings from '../components/BankAccountSettings';
import '../styles/TreasurySettings.css';

const TreasurySettings = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [treasury, setTreasury] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    loadTreasury();
  }, [id]);

  const loadTreasury = async () => {
    try {
      const response = await treasuryAPI.getById(id);
      setTreasury(response.data);

      // Check if current user is admin
      const currentUserId = response.data.creator?.id;
      setIsAdmin(response.data.created_by === currentUserId);
    } catch (error) {
      console.error('Failed to load treasury:', error);
      alert('Không thể tải thông tin quỹ');
      navigate(`/treasury/${id}`);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading">Đang tải...</div>;
  }

  if (!treasury) {
    return <div className="error">Không tìm thấy quỹ</div>;
  }

  if (!isAdmin) {
    return (
      <div className="error-container">
        <h2>Không có quyền truy cập</h2>
        <p>Chỉ Admin mới có thể cấu hình cài đặt quỹ</p>
        <button onClick={() => navigate(`/treasury/${id}`)} className="btn-primary">
          Quay lại
        </button>
      </div>
    );
  }

  return (
    <div className="treasury-settings-container">
      <header className="settings-page-header">
        <button onClick={() => navigate(`/treasury/${id}`)} className="btn-back">
          ← Quay lại
        </button>
        <h1>Cài đặt quỹ</h1>
        <p className="treasury-name">{treasury.name}</p>
      </header>

      <div className="settings-content">
        <BankAccountSettings treasuryId={id} />
      </div>
    </div>
  );
};

export default TreasurySettings;
