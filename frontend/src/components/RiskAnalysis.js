import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getUserTransactions } from '../api';
import { formatAmount, getRiskColor, getRiskLabel } from '../utils/helpers';
import { useNotifications } from './NotificationSystem';

const RiskAnalysis = () => {
  const navigate = useNavigate();
  const { addNotification } = useNotifications();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30d');
  const [riskFilter, setRiskFilter] = useState('all');

  useEffect(() => {
    loadRiskData();
  }, [timeRange, riskFilter]);

  const loadRiskData = async () => {
    try {
      const data = await getUserTransactions(100);
      setTransactions(data.transactions || []);
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Load Failed',
        message: 'Unable to load risk analysis data',
        category: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const getFilteredTransactions = () => {
    let filtered = transactions;
    
    if (riskFilter !== 'all') {
      if (riskFilter === 'high') {
        filtered = transactions.filter(tx => tx.risk_score >= 0.6);
      } else if (riskFilter === 'medium') {
        filtered = transactions.filter(tx => tx.risk_score >= 0.3 && tx.risk_score < 0.6);
      } else {
        filtered = transactions.filter(tx => tx.risk_score < 0.3);
      }
    }
    
    return filtered;
  };

  const calculateStats = () => {
    const filtered = getFilteredTransactions();
    const totalAmount = filtered.reduce((sum, tx) => sum + tx.amount, 0);
    const avgRisk = filtered.length > 0 ? filtered.reduce((sum, tx) => sum + tx.risk_score, 0) / filtered.length : 0;
    
    return {
      count: filtered.length,
      totalAmount,
      avgRisk,
      blockedCount: filtered.filter(tx => tx.action === 'BLOCK').length,
      delayedCount: filtered.filter(tx => tx.action === 'DELAY').length,
      allowedCount: filtered.filter(tx => tx.action === 'ALLOW').length
    };
  };

  const stats = calculateStats();
  const filteredTransactions = getFilteredTransactions();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900 flex items-center justify-center">
        <div className="text-white text-center">
          <div className="w-16 h-16 border-4 border-purple-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-xl">Analyzing risk patterns...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900">
      {/* Header */}
      <div className="bg-black/20 backdrop-blur-sm border-b border-white/10">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link to="/dashboard" className="text-white/80 hover:text-white flex items-center">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Dashboard
            </Link>
            <h1 className="text-2xl font-bold text-white">Risk Analysis</h1>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Filters */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-white/80 text-sm font-medium mb-2">Risk Level</label>
              <select 
                value={riskFilter} 
                onChange={(e) => setRiskFilter(e.target.value)}
                className="w-full bg-white/20 border border-white/30 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="all">All Transactions</option>
                <option value="high">High Risk Only</option>
                <option value="medium">Medium Risk Only</option>
                <option value="low">Low Risk Only</option>
              </select>
            </div>
            <div>
              <label className="block text-white/80 text-sm font-medium mb-2">Time Range</label>
              <select 
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className="w-full bg-white/20 border border-white/30 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
                <option value="90d">Last 90 Days</option>
              </select>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-6 rounded-2xl border border-blue-400/30">
            <p className="text-blue-100 text-sm font-medium mb-2">Total Transactions</p>
            <p className="text-3xl font-bold text-white">{stats.count}</p>
          </div>
          <div className="bg-gradient-to-br from-green-500 to-green-600 p-6 rounded-2xl border border-green-400/30">
            <p className="text-green-100 text-sm font-medium mb-2">Total Amount</p>
            <p className="text-3xl font-bold text-white">{formatAmount(stats.totalAmount)}</p>
          </div>
          <div className="bg-gradient-to-br from-amber-500 to-orange-600 p-6 rounded-2xl border border-amber-400/30">
            <p className="text-amber-100 text-sm font-medium mb-2">Avg Risk Score</p>
            <p className="text-3xl font-bold text-white">{(stats.avgRisk * 100).toFixed(1)}%</p>
          </div>
          <div className="bg-gradient-to-br from-red-500 to-pink-600 p-6 rounded-2xl border border-red-400/30">
            <p className="text-red-100 text-sm font-medium mb-2">Fraud Attempts</p>
            <p className="text-3xl font-bold text-white">{stats.blockedCount}</p>
          </div>
        </div>

        {/* Transaction Distribution */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-6">
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mr-4">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <p className="text-green-400 text-sm">Allowed</p>
                <p className="text-2xl font-bold text-white">{stats.allowedCount}</p>
              </div>
            </div>
          </div>
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-6">
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-amber-500 rounded-full flex items-center justify-center mr-4">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <p className="text-amber-400 text-sm">Pending</p>
                <p className="text-2xl font-bold text-white">{stats.delayedCount}</p>
              </div>
            </div>
          </div>
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6">
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center mr-4">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 0018.364 5.636m-9 9a9 9 0 11-12.728 0m12.728 0a9 9 0 00-12.728 0M9 15h6m-3-3h.01M9 12h6" />
                </svg>
              </div>
              <div>
                <p className="text-red-400 text-sm">Blocked</p>
                <p className="text-2xl font-bold text-white">{stats.blockedCount}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Detailed Transactions */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-6">
          <h2 className="text-2xl font-bold text-white mb-6">Detailed Risk Analysis</h2>
          
          {filteredTransactions.length === 0 ? (
            <div className="text-center py-12">
              <svg className="w-20 h-20 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 012-2h2a2 2 0 012 2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <p className="text-gray-400 text-lg font-medium">No transactions found</p>
              <p className="text-gray-500 text-sm mt-2">Try adjusting the filters to see more results</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredTransactions.map((tx) => {
                const riskLevel = getRiskColor(tx.risk_score);
                const riskLabel = getRiskLabel(tx.risk_score);
                
                return (
                  <div key={tx.tx_id} className="bg-white/5 rounded-xl p-6 border border-white/10 hover:bg-white/10 transition-colors">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center">
                        <div className={`w-4 h-4 rounded-full mr-3 ${
                          riskLevel === 'red' ? 'bg-red-500' : 
                          riskLevel === 'yellow' ? 'bg-amber-500' : 'bg-green-500'
                        }`}></div>
                        <div>
                          <p className="text-white font-semibold">{tx.recipient_vpa}</p>
                          <p className="text-white/60 text-sm">{new Date(tx.created_at).toLocaleString()}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-white">{formatAmount(tx.amount)}</p>
                        <p className={`text-sm font-medium ${riskLevel === 'red' ? 'text-red-400' : riskLevel === 'yellow' ? 'text-amber-400' : 'text-green-400'}`}>
                          {riskLabel}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap gap-2">
                      {tx.action === 'ALLOW' && (
                        <span className="px-3 py-1 bg-green-500/20 text-green-400 text-xs font-medium rounded-full">
                          ✅ Approved
                        </span>
                      )}
                      {tx.action === 'DELAY' && (
                        <>
                          <span className="px-3 py-1 bg-amber-500/20 text-amber-400 text-xs font-medium rounded-full">
                            ⏳ Pending Review
                          </span>
                          <Link 
                            to={`/fraud-alert/${tx.tx_id}`}
                            className="px-3 py-1 bg-purple-500/20 text-purple-400 text-xs font-medium rounded-full hover:bg-purple-500/30"
                          >
                            Review Transaction
                          </Link>
                        </>
                      )}
                      {tx.action === 'BLOCK' && (
                        <span className="px-3 py-1 bg-red-500/20 text-red-400 text-xs font-medium rounded-full">
                          🚫 Blocked
                        </span>
                      )}
                    </div>
                    
                    {tx.fraud_reasons && tx.fraud_reasons.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-white/10">
                        <p className="text-white/60 text-sm mb-2">Risk Factors:</p>
                        <div className="flex flex-wrap gap-2">
                          {tx.fraud_reasons.map((reason, index) => (
                            <span key={index} className="px-2 py-1 bg-red-500/10 text-red-300 text-xs rounded">
                              {reason}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RiskAnalysis;