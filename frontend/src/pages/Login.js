import React from 'react';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../contexts/AuthContext';
import { authAPI } from '../services/api';
import { useNavigate } from 'react-router-dom';
import '../styles/Login.css';

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  // Get Google Client ID from window.ENV (runtime config)
  const googleClientId = window.ENV?.REACT_APP_GOOGLE_CLIENT_ID || process.env.REACT_APP_GOOGLE_CLIENT_ID;

  const handleSuccess = async (credentialResponse) => {
    try {
      const response = await authAPI.googleLogin(credentialResponse.credential);
      login(response.data);
      navigate('/');
    } catch (error) {
      console.error('Login failed:', error);
      alert('Đăng nhập thất bại. Vui lòng thử lại.');
    }
  };

  const handleError = () => {
    console.error('Login Failed');
    alert('Đăng nhập thất bại. Vui lòng thử lại.');
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1>Quỹ Chung</h1>
          <p>Hệ thống quản lý quỹ chung minh bạch với blockchain</p>
        </div>

        <div className="login-content">
          <h2>Đăng nhập</h2>
          <p className="login-subtitle">Sử dụng tài khoản Google của bạn</p>

          <div className="google-login-wrapper">
            <GoogleOAuthProvider clientId={googleClientId}>
              <GoogleLogin
                onSuccess={handleSuccess}
                onError={handleError}
                useOneTap
                theme="outline"
                size="large"
                text="signin_with"
                shape="rectangular"
              />
            </GoogleOAuthProvider>
          </div>
        </div>

        <div className="login-footer">
          <p>Open-source • MIT License</p>
        </div>
      </div>
    </div>
  );
};

export default Login;
