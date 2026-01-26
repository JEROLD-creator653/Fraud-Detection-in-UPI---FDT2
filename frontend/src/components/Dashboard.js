import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { getUserDashboard } from '../api';
import { useNotifications } from './NotificationSystem';
import { formatUPIId } from '../utils/helpers';

const Dashboard = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const { setShowNotificationPanel, unreadCount } = useNotifications();

  // Reload dashboard whenever we navigate to this page
  useEffect(() => {
    loadDashboard();
  }, [location]);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const data = await getUserDashboard();
      setDashboardData(data);
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to logout?')) {
      onLogout();
      navigate('/login');
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('en-IN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getRiskBadge = (action, riskScore) => {
    if (action === 'BLOCK') {
      return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">Blocked</span>;
    } else if (action === 'DELAY') {
      return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">Pending</span>;
    } else {
      return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">Success</span>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full spinner"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 pb-20" data-testid="dashboard-screen">
      {/* Animated background */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute top-0 left-0 w-96 h-96 bg-purple-500 rounded-full filter blur-3xl opacity-20 animate-pulse"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-indigo-500 rounded-full filter blur-3xl opacity-20 animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-pink-500 rounded-full filter blur-3xl opacity-10 animate-pulse delay-500"></div>
      </div>

      {/* Header */}
      <div className="bg-black/20 backdrop-blur-xl border-b border-white/10 text-white p-6 pb-24">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg flex items-center justify-center mr-3">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold">Fraud Detection</h1>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setShowNotificationPanel(true)}
              className="relative text-white/80 hover:text-white transition-colors"
              data-testid="notification-button"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center shadow-lg">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
            <button
              onClick={handleLogout}
              className="text-white/80 hover:text-white transition-colors"
              data-testid="logout-button"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
        
        <div className="mb-2">
          <p className="text-purple-300 text-sm">Welcome back,</p>
          <h2 className="text-3xl font-bold text-white" data-testid="user-name">{dashboardData?.user?.name || user?.name}</h2>
          <p className="text-purple-400 text-sm mt-1">Account: {dashboardData?.user?.upi_id || formatUPIId(user?.phone || '+919876543210')}</p>
        </div>
      </div>

      {/* Security Overview Card */}
      <div className="px-6 -mt-16">
        <div className="bg-white/10 backdrop-blur-xl rounded-2xl shadow-xl p-6 mb-6 border border-white/20">
          <p className="text-purple-300 text-sm mb-2">Security Status</p>
          <h3 className="text-4xl font-bold text-white mb-4" data-testid="user-balance">
            Protected
          </h3>
          
          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-white/20">
            <div className="text-center">
              <p className="text-2xl font-bold text-green-400" data-testid="successful-transactions">
                {dashboardData?.stats?.successful || 0}
              </p>
              <p className="text-xs text-purple-300">Safe</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-yellow-400" data-testid="pending-transactions">
                {dashboardData?.stats?.pending || 0}
              </p>
              <p className="text-xs text-purple-300">Review</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-red-400" data-testid="blocked-transactions">
                {dashboardData?.stats?.blocked || 0}
              </p>
              <p className="text-xs text-purple-300">Blocked</p>
            </div>
          </div>
        </div>

        {/* Fraud Detection Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Link
            to="/transactions"
            className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 border border-white/20"
            data-testid="transaction-history-button"
          >
            <svg className="w-8 h-8 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p className="font-semibold">Transaction Monitor</p>
            <p className="text-xs mt-1 opacity-90">Review security alerts</p>
          </Link>

          <Link
            to="/risk-analysis"
            className="bg-gradient-to-r from-amber-500 to-orange-600 text-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 border border-white/20"
          >
            <svg className="w-8 h-8 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p className="font-semibold">Risk Analysis</p>
            <p className="text-xs mt-1 opacity-90">AI-powered insights</p>
          </Link>

          <Link
            to="/security-settings"
            className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 border border-white/20"
          >
            <svg className="w-8 h-8 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a2 2 0 002-2V7a2 2 0 00-2-2H6a2 2 0 00-2 2v5a2 2 0 002 2m2 0h7a2 2 0 002-2V9a2 2 0 00-2-2h-7m-6 2l4-4m0 0l4 4" />
            </svg>
            <p className="font-semibold">Security Settings</p>
            <p className="text-xs mt-1 opacity-90">Customize protection</p>
          </Link>
        </div>

        {/* Recent Security Events */}
        <div className="bg-white/10 backdrop-blur-xl rounded-2xl shadow-lg p-6 border border-white/20">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-white">Recent Security Events</h3>
            <Link to="/transactions" className="text-purple-300 text-sm font-semibold hover:text-white">
              View All
            </Link>
          </div>

          {dashboardData?.recent_transactions?.length === 0 ? (
            <div className="text-center py-8 text-purple-300">
              <svg className="w-16 h-16 mx-auto mb-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <p>All systems secure</p>
              <p className="text-sm">No security events detected</p>
            </div>
          ) : (
            <div className="space-y-3" data-testid="recent-transactions-list">
              {dashboardData?.recent_transactions?.map((tx) => (
                <div key={tx.tx_id} className="flex justify-between items-center p-4 bg-white/5 rounded-lg border border-white/10">
                  <div className="flex-1">
                    <p className="font-semibold text-white">{tx.recipient_vpa}</p>
                    <p className="text-xs text-purple-300">{formatDate(tx.created_at)}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-white">{formatCurrency(tx.amount)}</p>
                    <div className="mt-1">{getRiskBadge(tx.action, tx.risk_score)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
