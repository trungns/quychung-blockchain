import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './pages/Login';
import TreasuryList from './pages/TreasuryList';
import TreasuryDetail from './pages/TreasuryDetail';
import Reports from './pages/Reports';
import './App.css';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <div className="loading">Đang tải...</div>;
  }

  return isAuthenticated ? children : <Navigate to="/login" />;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <TreasuryList />
              </ProtectedRoute>
            }
          />
          <Route
            path="/treasury/:id"
            element={
              <ProtectedRoute>
                <TreasuryDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/treasury/:id/reports"
            element={
              <ProtectedRoute>
                <Reports />
              </ProtectedRoute>
            }
          />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
