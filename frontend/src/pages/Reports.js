import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { reportAPI, treasuryAPI } from '../services/api';
import { formatCurrency, formatMonthYear } from '../utils/formatters';
import '../styles/Reports.css';

const Reports = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [treasury, setTreasury] = useState(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [incomeByMember, setIncomeByMember] = useState([]);
  const [monthlyExpense, setMonthlyExpense] = useState([]);
  const [yearlySummary, setYearlySummary] = useState([]);
  const [topContributors, setTopContributors] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [id, selectedYear]);

  const loadData = async () => {
    try {
      const [
        treasuryRes,
        incomeRes,
        expenseRes,
        summaryRes,
        contributorsRes
      ] = await Promise.all([
        treasuryAPI.getById(id),
        reportAPI.getIncomeByMember(id, selectedYear),
        reportAPI.getMonthlyExpense(id, selectedYear),
        reportAPI.getYearlySummary(id),
        reportAPI.getTopContributors(id, 10)
      ]);

      setTreasury(treasuryRes.data);
      // Defensive: ensure arrays are never null
      setIncomeByMember(incomeRes.data || []);
      setMonthlyExpense(expenseRes.data || []);
      setYearlySummary(summaryRes.data || []);
      setTopContributors(contributorsRes.data || []);
    } catch (error) {
      console.error('Failed to load reports:', error);
      alert('Không thể tải báo cáo');
    } finally {
      setLoading(false);
    }
  };

  // Group income by member
  const groupIncomeByMember = () => {
    if (!Array.isArray(incomeByMember)) return [];
    const grouped = {};
    incomeByMember.forEach(item => {
      if (!grouped[item.user_id]) {
        grouped[item.user_id] = {
          user_name: item.user_name,
          user_email: item.user_email,
          months: {},
          total: 0
        };
      }
      grouped[item.user_id].months[item.month] = item.total;
      grouped[item.user_id].total += item.total;
    });
    return Object.values(grouped);
  };

  // Get unique months from income data
  const getMonths = () => {
    if (!Array.isArray(incomeByMember)) return [];
    const months = new Set();
    incomeByMember.forEach(item => months.add(item.month));
    return Array.from(months).sort().reverse();
  };

  if (loading) {
    return <div className="loading">Đang tải...</div>;
  }

  const memberGroups = groupIncomeByMember();
  const months = getMonths();
  const availableYears = Array.isArray(yearlySummary) ? yearlySummary.map(y => y.year) : [];

  return (
    <div className="reports-container">
      <header className="reports-header">
        <button onClick={() => navigate(`/treasury/${id}`)} className="btn-back">
          ← Quay lại
        </button>
        <h1>Báo cáo: {treasury?.name}</h1>
      </header>

      <div className="reports-content">
        {/* Year Selector */}
        <div className="year-selector">
          <label>Năm:</label>
          <select value={selectedYear} onChange={(e) => setSelectedYear(parseInt(e.target.value))}>
            {availableYears.length > 0 ? (
              availableYears.map(year => (
                <option key={year} value={year}>{year}</option>
              ))
            ) : (
              <option value={new Date().getFullYear()}>{new Date().getFullYear()}</option>
            )}
          </select>
        </div>

        {/* Yearly Summary */}
        {yearlySummary.length > 0 && (
          <div className="report-section">
            <h2>Tổng hợp theo năm</h2>
            <div className="yearly-summary-grid">
              {yearlySummary.map(year => (
                <div key={year.year} className="yearly-card">
                  <h3>Năm {year.year}</h3>
                  <div className="yearly-stats">
                    <div className="stat income">
                      <span className="label">Tổng thu</span>
                      <span className="value">{formatCurrency(year.total_income)}</span>
                      <span className="count">({year.income_count} giao dịch)</span>
                    </div>
                    <div className="stat expense">
                      <span className="label">Tổng chi</span>
                      <span className="value">{formatCurrency(year.total_expense)}</span>
                      <span className="count">({year.expense_count} giao dịch)</span>
                    </div>
                    <div className="stat balance">
                      <span className="label">Số dư</span>
                      <span className="value">{formatCurrency(year.balance)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Top Contributors */}
        {topContributors.length > 0 && (
          <div className="report-section">
            <h2>Top đóng góp</h2>
            <div className="contributors-list">
              {topContributors.map((contributor, index) => (
                <div key={contributor.user_id} className="contributor-item">
                  <div className="rank">#{index + 1}</div>
                  <div className="contributor-info">
                    <div className="name">{contributor.user_name}</div>
                    <div className="email">{contributor.user_email}</div>
                  </div>
                  <div className="contributor-stats">
                    <div className="amount">{formatCurrency(contributor.total_income)}</div>
                    <div className="count">{contributor.count} lần</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Income by Member and Month */}
        {memberGroups.length > 0 && (
          <div className="report-section">
            <h2>Thu theo thành viên và tháng ({selectedYear})</h2>
            <div className="table-responsive">
              <table className="report-table">
                <thead>
                  <tr>
                    <th>Thành viên</th>
                    {months.map(month => (
                      <th key={month}>{month}</th>
                    ))}
                    <th className="total-col">Tổng</th>
                  </tr>
                </thead>
                <tbody>
                  {memberGroups.map(member => (
                    <tr key={member.user_email}>
                      <td className="member-name">{member.user_name}</td>
                      {months.map(month => (
                        <td key={month} className="amount-cell">
                          {member.months[month] ? formatCurrency(member.months[month]) : '-'}
                        </td>
                      ))}
                      <td className="total-cell">{formatCurrency(member.total)}</td>
                    </tr>
                  ))}
                  <tr className="total-row">
                    <td><strong>Tổng cộng</strong></td>
                    {months.map(month => {
                      const monthTotal = Array.isArray(incomeByMember)
                        ? incomeByMember
                            .filter(i => i.month === month)
                            .reduce((sum, i) => sum + i.total, 0)
                        : 0;
                      return (
                        <td key={month} className="amount-cell">
                          <strong>{formatCurrency(monthTotal)}</strong>
                        </td>
                      );
                    })}
                    <td className="total-cell">
                      <strong>{formatCurrency(memberGroups.reduce((sum, m) => sum + m.total, 0))}</strong>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Monthly Expense */}
        {monthlyExpense.length > 0 && (
          <div className="report-section">
            <h2>Chi tiêu theo tháng ({selectedYear})</h2>
            <div className="table-responsive">
              <table className="report-table">
                <thead>
                  <tr>
                    <th>Tháng</th>
                    <th>Số tiền</th>
                    <th>Số giao dịch</th>
                  </tr>
                </thead>
                <tbody>
                  {monthlyExpense.map(expense => (
                    <tr key={expense.month}>
                      <td>{expense.month}</td>
                      <td className="amount-cell expense">{formatCurrency(expense.total)}</td>
                      <td>{expense.count}</td>
                    </tr>
                  ))}
                  <tr className="total-row">
                    <td><strong>Tổng cộng</strong></td>
                    <td className="amount-cell expense">
                      <strong>{formatCurrency(Array.isArray(monthlyExpense) ? monthlyExpense.reduce((sum, e) => sum + e.total, 0) : 0)}</strong>
                    </td>
                    <td><strong>{Array.isArray(monthlyExpense) ? monthlyExpense.reduce((sum, e) => sum + e.count, 0) : 0}</strong></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Empty State */}
        {memberGroups.length === 0 && monthlyExpense.length === 0 && (
          <div className="empty-reports">
            <p>Chưa có dữ liệu báo cáo cho năm {selectedYear}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Reports;
