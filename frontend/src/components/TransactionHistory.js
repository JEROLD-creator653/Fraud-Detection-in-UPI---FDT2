import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUserTransactions } from '../api';

const TransactionHistory = ({ user }) => {
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [error, setError] = useState('');

  useEffect(() => {
    loadTransactions();
  }, [filter]);

  const loadTransactions = async () => {
    try {
      setLoading(true);
      const statusFilter = filter === 'all' ? null : filter.toUpperCase();
      const data = await getUserTransactions(50, statusFilter);
      setTransactions(data.transactions || []);
    } catch (err) {
      setError('Failed to load transactions');
      console.error(err);
    } finally {
      setLoading(false);
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
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (action) => {
    const badges = {
      ALLOW: { bg: 'bg-green-100', text: 'text-green-800', label: 'Success' },
      DELAY: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Pending' },
      BLOCK: { bg: 'bg-red-100', text: 'text-red-800', label: 'Blocked' }
    };

    const badge = badges[action] || badges.ALLOW;
    return (
      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${badge.bg} ${badge.text}`}>
        {badge.label}
      </span>
    );
  };

  const getRiskIndicator = (riskScore) => {
    const score = parseFloat(riskScore) * 100;
    if (score >= 60) {
      return <span className="text-red-600 text-xs">🔴 High Risk</span>;
    } else if (score >= 30) {
      return <span className="text-yellow-600 text-xs">🟡 Medium Risk</span>;
    } else {
      return <span className="text-green-600 text-xs">🟢 Low Risk</span>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-6" data-testid="transaction-history-screen">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-700 text-white p-6 pb-8">
        <div className="flex items-center mb-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="mr-4"
            data-testid="back-button"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-2xl font-bold">Transaction History</h1>
        </div>
      </div>

      <div className="px-6 -mt-4">
        {/* Filter Tabs */}
        <div className="bg-white rounded-2xl shadow-lg p-2 mb-6 flex space-x-2" data-testid="filter-tabs">
          <button
            onClick={() => setFilter('all')}
            className={`flex-1 py-2 rounded-lg font-semibold text-sm transition duration-200 ${
              filter === 'all'
                ? 'bg-indigo-600 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
            data-testid="filter-all"
          >
            All
          </button>
          <button
            onClick={() => setFilter('allow')}
            className={`flex-1 py-2 rounded-lg font-semibold text-sm transition duration-200 ${
              filter === 'allow'
                ? 'bg-green-600 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
            data-testid="filter-success"
          >
            Success
          </button>
          <button
            onClick={() => setFilter('delay')}
            className={`flex-1 py-2 rounded-lg font-semibold text-sm transition duration-200 ${
              filter === 'delay'
                ? 'bg-yellow-600 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
            data-testid="filter-pending"
          >
            Pending
          </button>
          <button
            onClick={() => setFilter('block')}
            className={`flex-1 py-2 rounded-lg font-semibold text-sm transition duration-200 ${
              filter === 'block'
                ? 'bg-red-600 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
            data-testid="filter-blocked"
          >
            Blocked
          </button>
        </div>

        {/* Transactions List */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full spinner"></div>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg">
            {error}
          </div>
        ) : transactions.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
            <svg className="w-20 h-20 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
            <p className="text-gray-600 font-semibold">No transactions found</p>
            <p className="text-sm text-gray-500 mt-2">
              {filter !== 'all' ? `No ${filter} transactions` : 'Start making payments to see your history'}
            </p>
          </div>
        ) : (
          <div className="space-y-3" data-testid="transactions-list">
            {transactions.map((tx) => (
              <div
                key={tx.tx_id}
                className="bg-white rounded-xl shadow-md p-4 hover:shadow-lg transition duration-200"
                data-testid={`transaction-${tx.tx_id}`}
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <p className="font-semibold text-gray-800 text-lg">{tx.recipient_vpa}</p>
                    <p className="text-xs text-gray-500 mt-1">{formatDate(tx.created_at)}</p>
                    {tx.remarks && (
                      <p className="text-sm text-gray-600 mt-1 italic">"{tx.remarks}"</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-xl text-gray-800">-{formatCurrency(tx.amount)}</p>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-3 border-t border-gray-100">
                  <div className="flex items-center space-x-3">
                    {getStatusBadge(tx.action)}
                    {getRiskIndicator(tx.risk_score)}
                  </div>
                  <div className="text-xs text-gray-500">
                    ID: {tx.tx_id.substring(0, 12)}...
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TransactionHistory;
