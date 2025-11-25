import React, { useState } from 'react';
import { treasuryAPI } from '../services/api';
import '../styles/MemberManagement.css';

const MemberManagement = ({ treasuryId, members = [], currentUserId, onUpdate }) => {
  const [editingMember, setEditingMember] = useState(null);
  const [selectedRole, setSelectedRole] = useState('');
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberRole, setNewMemberRole] = useState('member');

  const roleLabels = {
    admin: 'Quản trị viên',
    treasurer: 'Thủ quỹ',
    member: 'Thành viên',
  };

  const roleColors = {
    admin: '#ef4444',
    treasurer: '#3b82f6',
    member: '#10b981',
  };

  const handleUpdateRole = async (member) => {
    if (!selectedRole || selectedRole === member.role) {
      setEditingMember(null);
      return;
    }

    setLoading(true);
    try {
      await treasuryAPI.updateMemberRole(treasuryId, member.id, { role: selectedRole });
      setEditingMember(null);
      onUpdate();
    } catch (error) {
      console.error('Failed to update role:', error);
      alert('Cập nhật quyền thất bại');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMember = async (member) => {
    if (!window.confirm(`Xác nhận xóa ${member.user?.name || member.user?.email} khỏi quỹ?`)) {
      return;
    }

    setLoading(true);
    try {
      await treasuryAPI.removeMember(treasuryId, member.id);
      onUpdate();
    } catch (error) {
      console.error('Failed to remove member:', error);
      alert(error.response?.data?.error || 'Xóa thành viên thất bại');
    } finally {
      setLoading(false);
    }
  };

  const handleAddMember = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await treasuryAPI.addMember(treasuryId, {
        email: newMemberEmail,
        role: newMemberRole,
      });
      setNewMemberEmail('');
      setNewMemberRole('member');
      setShowAddForm(false);
      onUpdate();
    } catch (error) {
      console.error('Failed to add member:', error);
      alert(error.response?.data?.error || 'Thêm thành viên thất bại');
    } finally {
      setLoading(false);
    }
  };

  const startEditRole = (member) => {
    setEditingMember(member.id);
    setSelectedRole(member.role);
  };

  return (
    <div className="member-management">
      <div className="management-header">
        <h3>Quản lý thành viên</h3>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="btn-primary btn-add"
        >
          {showAddForm ? 'Hủy' : '+ Thêm thành viên'}
        </button>
      </div>

      {showAddForm && (
        <form onSubmit={handleAddMember} className="add-member-form">
          <div className="form-row">
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                value={newMemberEmail}
                onChange={(e) => setNewMemberEmail(e.target.value)}
                required
                placeholder="email@example.com"
              />
            </div>
            <div className="form-group">
              <label>Quyền</label>
              <select
                value={newMemberRole}
                onChange={(e) => setNewMemberRole(e.target.value)}
              >
                <option value="member">Thành viên</option>
                <option value="treasurer">Thủ quỹ</option>
                <option value="admin">Quản trị viên</option>
              </select>
            </div>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Đang thêm...' : 'Thêm'}
            </button>
          </div>
        </form>
      )}

      <div className="members-table">
        <table>
          <thead>
            <tr>
              <th>Tên / Email</th>
              <th>Quyền</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {members.map((member) => (
              <tr key={member.id}>
                <td>
                  <div className="member-info">
                    <span className="member-name">
                      {member.user?.name || member.user?.email}
                    </span>
                    {member.user_id === currentUserId && (
                      <span className="badge-you">Bạn</span>
                    )}
                  </div>
                </td>
                <td>
                  {editingMember === member.id ? (
                    <select
                      value={selectedRole}
                      onChange={(e) => setSelectedRole(e.target.value)}
                      className="role-select"
                    >
                      <option value="member">Thành viên</option>
                      <option value="treasurer">Thủ quỹ</option>
                      <option value="admin">Quản trị viên</option>
                    </select>
                  ) : (
                    <span
                      className="role-badge"
                      style={{ backgroundColor: roleColors[member.role] }}
                    >
                      {roleLabels[member.role]}
                    </span>
                  )}
                </td>
                <td>
                  <div className="action-buttons">
                    {editingMember === member.id ? (
                      <>
                        <button
                          onClick={() => handleUpdateRole(member)}
                          className="btn-save"
                          disabled={loading}
                        >
                          ✓
                        </button>
                        <button
                          onClick={() => setEditingMember(null)}
                          className="btn-cancel"
                          disabled={loading}
                        >
                          ✗
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => startEditRole(member)}
                          className="btn-edit"
                          disabled={loading}
                        >
                          Đổi quyền
                        </button>
                        <button
                          onClick={() => handleRemoveMember(member)}
                          className="btn-remove"
                          disabled={loading}
                        >
                          Xóa
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {members.length === 0 && (
          <p className="no-members">Chưa có thành viên nào</p>
        )}
      </div>
    </div>
  );
};

export default MemberManagement;
