import React, { useState, useEffect } from 'react';
import '../styles/MembersSummary.css';

const MembersSummary = ({ members = [], onAddMember, isAdmin }) => {
  const [expanded, setExpanded] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile viewport
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    // Initial check
    checkMobile();

    // Listen for resize
    window.addEventListener('resize', checkMobile);

    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Desktop: always expanded
  // Mobile: collapsed by default, click to expand
  const isExpanded = !isMobile || expanded;

  const toggleExpand = () => {
    if (isMobile) {
      setExpanded(!expanded);
    }
  };

  return (
    <div className="members-summary">
      <div
        className={`members-header ${isMobile ? 'clickable' : ''}`}
        onClick={toggleExpand}
      >
        <h3>
          Thành viên ({members.length})
          {isMobile && (
            <span className={`arrow ${expanded ? 'up' : 'down'}`}>
              {expanded ? '▲' : '▼'}
            </span>
          )}
        </h3>
        {isAdmin && !isMobile && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAddMember();
            }}
            className="btn-secondary btn-add-member"
          >
            + Thêm thành viên
          </button>
        )}
      </div>

      {isExpanded && (
        <div className="members-list">
          {members.map((member) => (
            <div key={member.id} className="member-item">
              <span className="member-name">
                {member.user?.name || member.user?.email}
              </span>
              <span className="member-role">{member.role}</span>
            </div>
          ))}

          {members.length === 0 && (
            <p className="no-members">Chưa có thành viên nào</p>
          )}

          {isAdmin && isMobile && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAddMember();
              }}
              className="btn-secondary btn-add-member mobile"
            >
              + Thêm thành viên
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default MembersSummary;
