import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import SplashScreen from './components/SplashScreen';
import LoginScreen from './components/LoginScreen';
import RegisterScreen from './components/RegisterScreen';
import Dashboard from './components/Dashboard';
import NewTransaction from './components/NewTransaction';
import TransactionHistory from './components/TransactionHistory';
import FraudAlert from './components/FraudAlert';
import { requestNotificationPermission, onMessageListener } from './firebase';
import { registerPushToken } from './api';

function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [notification, setNotification] = useState(null);

  useEffect(() => {
    // Check if user is already logged in
    const token = localStorage.getItem('fdt_token');
    const userData = localStorage.getItem('fdt_user');
    
    if (token && userData) {
      setUser(JSON.parse(userData));
      setIsAuthenticated(true);
      
      // Request notification permission
      requestNotificationPermission().then((fcmToken) => {
        if (fcmToken) {
          registerPushToken(fcmToken, 'web_device')
            .then(() => console.log('Push token registered'))
            .catch((err) => console.error('Failed to register push token:', err));
        }
      });
    }
    
    // Show splash screen for 2 seconds
    setTimeout(() => {
      setIsLoading(false);
    }, 2000);
  }, []);

  useEffect(() => {
    // Listen for foreground push notifications
    onMessageListener()
      .then((payload) => {
        setNotification({
          title: payload.notification.title,
          body: payload.notification.body
        });
        
        // Auto-hide notification after 5 seconds
        setTimeout(() => setNotification(null), 5000);
      })
      .catch((err) => console.log('Error in foreground message listener:', err));
  }, []);

  const handleLogin = (userData, token) => {
    localStorage.setItem('fdt_token', token);
    localStorage.setItem('fdt_user', JSON.stringify(userData));
    setUser(userData);
    setIsAuthenticated(true);
    
    // Request notification permission after login
    requestNotificationPermission().then((fcmToken) => {
      if (fcmToken) {
        registerPushToken(fcmToken, 'web_device')
          .then(() => console.log('Push token registered'))
          .catch((err) => console.error('Failed to register push token:', err));
      }
    });
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
        {/* Push Notification Display */}
        {notification && (
          <div className="fixed top-4 left-4 right-4 z-50 bg-red-500 text-white p-4 rounded-lg shadow-lg slide-up">
            <h3 className="font-bold">{notification.title}</h3>
            <p className="text-sm">{notification.body}</p>
          </div>
        )}

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
            path="/new-transaction"
            element={
              isAuthenticated ? (
                <NewTransaction user={user} />
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
                <FraudAlert user={user} />
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
      </div>
    </Router>
  );
}

export default App;
