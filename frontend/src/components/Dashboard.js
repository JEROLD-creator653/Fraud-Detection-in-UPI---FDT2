import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getUserDashboard } from '../api';

const Dashboard = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const data = await getUserDashboard();
      setDashboardData(data);
    } catch (err) {
      setError('Failed to load dashboard');
      console.error(err);
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
    <div className="min-h-screen bg-gray-50 pb-20" data-testid="dashboard-screen">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-700 text-white p-6 pb-24">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">FDT</h1>
          <button
            onClick={handleLogout}
            className="text-white/90 hover:text-white"
            data-testid="logout-button"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
        
        <div className="mb-2">
          <p className="text-indigo-200 text-sm">Welcome back,</p>
          <h2 className="text-3xl font-bold" data-testid="user-name">{dashboardData?.user?.name || user?.name}</h2>
        </div>
      </div>

      {/* Balance Card */}
      <div className="px-6 -mt-16">
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          <p className="text-gray-600 text-sm mb-2">Available Balance</p>
          <h3 className="text-4xl font-bold text-gray-800 mb-4" data-testid="user-balance">
            {formatCurrency(dashboardData?.user?.balance || 0)}
          </h3>
          
          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-200">
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600" data-testid="successful-transactions">
                {dashboardData?.stats?.successful || 0}
              </p>
              <p className="text-xs text-gray-600">Successful</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-yellow-600" data-testid="pending-transactions">
                {dashboardData?.stats?.pending || 0}
              </p>
              <p className="text-xs text-gray-600">Pending</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-red-600" data-testid="blocked-transactions">
                {dashboardData?.stats?.blocked || 0}
              </p>
              <p className="text-xs text-gray-600">Blocked</p>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <Link
            to="/new-transaction"
            className="bg-indigo-600 text-white p-6 rounded-xl shadow-lg hover:bg-indigo-700 transition duration-200"
            data-testid="new-transaction-button"
          >
            <svg className="w-8 h-8 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <p className="font-semibold">New Payment</p>
          </Link>

          <Link
            to="/transactions"
            className="bg-white text-gray-800 p-6 rounded-xl shadow-lg hover:bg-gray-50 transition duration-200 border border-gray-200"
            data-testid="transaction-history-button"
          >
            <svg className="w-8 h-8 mb-2 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p className="font-semibold">History</p>
          </Link>
        </div>

        {/* Recent Transactions */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-gray-800">Recent Transactions</h3>
            <Link to="/transactions" className="text-indigo-600 text-sm font-semibold">
              View All
            </Link>
          </div>

          {dashboardData?.recent_transactions?.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
              <p>No transactions yet</p>
              <p className="text-sm">Start by making your first payment</p>
            </div>
          ) : (
            <div className="space-y-3" data-testid="recent-transactions-list">
              {dashboardData?.recent_transactions?.map((tx) => (
                <div key={tx.tx_id} className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <p className="font-semibold text-gray-800">{tx.recipient_vpa}</p>
                    <p className="text-xs text-gray-500">{formatDate(tx.created_at)}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-800">-{formatCurrency(tx.amount)}</p>
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
