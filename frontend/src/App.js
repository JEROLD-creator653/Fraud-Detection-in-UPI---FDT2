import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import SplashScreen from './components/SplashScreen';
import LoginScreen from './components/LoginScreen';
import RegisterScreen from './components/RegisterScreen';
import Dashboard from './components/Dashboard';
import SendMoney from './components/SendMoney';
import TransactionHistory from './components/TransactionHistory';
import FraudAlertEnhanced from './components/FraudAlertEnhanced';
import RiskAnalysis from './components/RiskAnalysis';
import SecuritySettings from './components/SecuritySettings';
import NotificationPanel from './components/NotificationPanel';
import { NotificationProvider } from './components/NotificationSystem';

function AppContent() {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Check if user is already logged in
    const token = localStorage.getItem('fdt_token');
    const userData = localStorage.getItem('fdt_user');
    
    if (token && userData) {
      try {
        setUser(JSON.parse(userData));
        setIsAuthenticated(true);
      } catch (e) {
        console.error('Failed to parse user data:', e);
      }
    }
    
    // Skip splash screen - go directly to login/dashboard
    setIsLoading(false);
  }, []);

  const handleLogin = (userData, token) => {
    localStorage.setItem('fdt_token', token);
    localStorage.setItem('fdt_user', JSON.stringify(userData));
    setUser(userData);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('fdt_token');
    localStorage.removeItem('fdt_user');
    setUser(null);
    setIsAuthenticated(false);
  };

  if (isLoading) {
    return <SplashScreen />;
  }

  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Routes>
          <Route
            path="/login"
            element={
              isAuthenticated ? (
                <Navigate to="/dashboard" />
              ) : (
                <LoginScreen onLogin={handleLogin} />
              )
            }
          />
          <Route
            path="/register"
            element={
              isAuthenticated ? (
                <Navigate to="/dashboard" />
              ) : (
                <RegisterScreen onRegister={handleLogin} />
              )
            }
          />
          <Route
            path="/dashboard"
            element={
              isAuthenticated ? (
                <Dashboard user={user} onLogout={handleLogout} />
              ) : (
                <Navigate to="/login" />
              )
            }
          />

          <Route
            path="/send-money"
            element={
              isAuthenticated ? (
                <SendMoney user={user} onBack={() => window.history.back()} />
              ) : (
                <Navigate to="/login" />
              )
            }
          />
          <Route
            path="/transactions"
            element={
              isAuthenticated ? (
                <TransactionHistory user={user} />
              ) : (
                <Navigate to="/login" />
              )
            }
          />
          <Route
            path="/fraud-alert/:txId"
            element={
              isAuthenticated ? (
                <FraudAlertEnhanced user={user} />
              ) : (
                <Navigate to="/login" />
              )
            }
          />
          <Route
            path="/risk-analysis"
            element={
              isAuthenticated ? (
                <RiskAnalysis user={user} />
              ) : (
                <Navigate to="/login" />
              )
            }
          />
          <Route
            path="/security-settings"
            element={
              isAuthenticated ? (
                <SecuritySettings user={user} />
              ) : (
                <Navigate to="/login" />
              )
            }
          />
          <Route
            path="/"
            element={
              isAuthenticated ? (
                <Navigate to="/dashboard" />
              ) : (
                <Navigate to="/login" />
              )
            }
          />
        </Routes>
        <NotificationPanel />
      </div>
    </Router>
  );
}

function App() {
  return (
    <NotificationProvider>
      <AppContent />
    </NotificationProvider>
  );
}

export default App;
