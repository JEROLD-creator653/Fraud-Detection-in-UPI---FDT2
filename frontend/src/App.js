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
import NotificationPanel from './components/NotificationPanel';
import { NotificationProvider } from './components/NotificationSystem';
import cacheManager from './utils/cacheManager';

function AppContent() {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Clear any existing authentication to force login
    localStorage.removeItem('fdt_token');
    localStorage.removeItem('fdt_user');
    
    // Don't auto-authenticate - always show login screen
    setIsLoading(false);
  }, []);

  const handleLogin = (userData, token) => {
    // Clear all cache when logging in to prevent stale data
    cacheManager.clear();
    
    localStorage.setItem('fdt_token', token);
    localStorage.setItem('fdt_user', JSON.stringify(userData));
    setUser(userData);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    // Clear all cache when logging out
    cacheManager.clear();
    
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
             path="/send-money-login"
             element={
               isAuthenticated ? (
                 <Navigate to="/send-money" />
               ) : (
                 <Navigate to="/login" />
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
                  <SendMoney user={user} setUser={setUser} onLogout={handleLogout} />
                ) : (
                  <Navigate to="/send-money-login" />
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
