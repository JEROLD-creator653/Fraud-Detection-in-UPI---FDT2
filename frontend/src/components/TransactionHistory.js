import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUserTransactions, submitUserDecision, confirmTransaction, cancelTransaction } from '../api';
import { useNotifications } from './NotificationSystem';
import cacheManager from '../utils/cacheManager';

const TransactionHistory = ({ user }) => {
  const navigate = useNavigate();
  const { addNotification } = useNotifications();
  const [transactions, setTransactions] = useState([]);
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [error, setError] = useState('');
  const [expandedTransaction, setExpandedTransaction] = useState(null);
  const [processingAction, setProcessingAction] = useState(null);
  
  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('all'); // all, today, week, month
  const [amountMin, setAmountMin] = useState('');
  const [amountMax, setAmountMax] = useState('');
  const [riskFilter, setRiskFilter] = useState('all'); // all, low, medium, high
  const [sortBy, setSortBy] = useState('newest'); // newest, oldest, amount-high, amount-low

  // Apply all filters and search when transactions or filters change
  useEffect(() => {
    applyFiltersAndSearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transactions, filter, searchQuery, dateFilter, amountMin, amountMax, riskFilter, sortBy]);

  useEffect(() => {
    loadTransactions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const getRiskLevel = (riskScore) => {
    const score = parseFloat(riskScore) * 100;
    if (score >= 60) return 'high';
    if (score >= 30) return 'medium';
    return 'low';
  };

  const applyFiltersAndSearch = () => {
    let result = [...transactions];

    // Filter by status
    if (filter !== 'all') {
      result = result.filter(tx => tx.action.toLowerCase() === filter.toLowerCase());
    }

    // Search by recipient or transaction ID
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(tx =>
        tx.recipient_vpa.toLowerCase().includes(query) ||
        tx.tx_id.toLowerCase().includes(query) ||
        (tx.remarks && tx.remarks.toLowerCase().includes(query))
      );
    }

    // Filter by date range
    const now = new Date();
    const txDate = (tx) => new Date(tx.created_at);
    
    if (dateFilter === 'today') {
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      result = result.filter(tx => txDate(tx) >= today);
    } else if (dateFilter === 'week') {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      result = result.filter(tx => txDate(tx) >= weekAgo);
    } else if (dateFilter === 'month') {
      const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
      result = result.filter(tx => txDate(tx) >= monthAgo);
    }

    // Filter by amount range
    if (amountMin) {
      const min = parseFloat(amountMin);
      result = result.filter(tx => tx.amount >= min);
    }
    if (amountMax) {
      const max = parseFloat(amountMax);
      result = result.filter(tx => tx.amount <= max);
    }

    // Filter by risk level
    if (riskFilter !== 'all') {
      result = result.filter(tx => getRiskLevel(tx.risk_score) === riskFilter);
    }

    // Sort
    if (sortBy === 'newest') {
      result.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    } else if (sortBy === 'oldest') {
      result.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    } else if (sortBy === 'amount-high') {
      result.sort((a, b) => b.amount - a.amount);
    } else if (sortBy === 'amount-low') {
      result.sort((a, b) => a.amount - b.amount);
    }

    setFilteredTransactions(result);
  };

  const clearFilters = () => {
    setSearchQuery('');
    setDateFilter('all');
    setAmountMin('');
    setAmountMax('');
    setRiskFilter('all');
    setSortBy('newest');
    setFilter('all');
  };

  const hasActiveFilters = () => {
    return searchQuery || dateFilter !== 'all' || amountMin || amountMax || riskFilter !== 'all' || sortBy !== 'newest' || filter !== 'all';
  };

  const getExplanation = (action, riskScore, reasons) => {
    if (action === 'ALLOW') {
      return {
        title: '✅ Transaction Approved',
        message: 'This transaction passed all security checks and was processed successfully.',
        color: 'green',
        details: [
          'Recipient verification passed',
          'Amount within normal limits',
          'Device recognized as trusted'
        ]
      };
    } else if (action === 'DELAY') {
      return {
        title: '⏳ Transaction Under Review',
        message: `This transaction requires additional verification due to detected risk factors. Your account is protected while we verify this transaction.`,
        color: 'yellow',
        details: reasons?.length > 0 ? reasons : [
          'Unusual transaction pattern detected',
          'Amount requires verification',
          'New recipient detected'
        ]
      };
    } else if (action === 'BLOCK') {
      return {
        title: '🚫 Transaction Blocked',
        message: 'This transaction was blocked to protect your account from potential fraud. Our AI detected high-risk patterns.',
        color: 'red',
        details: reasons?.length > 0 ? reasons : [
          'Multiple suspicious factors detected',
          'High transaction amount',
          'Suspicious recipient pattern'
        ]
      };
    }
    return { title: 'Unknown Status', message: 'Transaction status not recognized.', color: 'gray', details: [] };
  };

  const toggleExplanation = (txId) => {
    setExpandedTransaction(expandedTransaction === txId ? null : txId);
  };

const handleQuickAction = async (txId, decision) => {
      setProcessingAction(`${txId}-${decision}`);
      try {
        let response;
        
        if (decision === 'confirm') {
          response = await confirmTransaction(txId);
        } else if (decision === 'cancel') {
          response = await cancelTransaction(txId);
        }
        
        // Clear transaction cache to ensure fresh data on next load
        cacheManager.invalidateCategory('transactions');
        cacheManager.invalidateCategory('dashboard');
        
        // Update the transaction locally immediately with response from backend
        const updatedAction = response.transaction?.action || (decision === 'confirm' ? 'ALLOW' : 'BLOCK');
        
        setTransactions(prevTransactions =>
          prevTransactions.map(tx =>
            tx.tx_id === txId
              ? { ...tx, action: updatedAction }
              : tx
          )
        );
        
        addNotification({
          type: 'transaction_resolved',
          title: `Transaction ${decision === 'confirm' ? 'Confirmed' : 'Rejected'}`,
          message: `Transaction has been processed successfully.`,
          category: 'success'
        });
        setExpandedTransaction(null);
      } catch (error) {
        console.error('Decision error:', error);
        addNotification({
          type: 'error',
          title: 'Action Failed',
          message: 'Unable to process your decision. Please try again.',
          category: 'error'
        });
      } finally {
        setProcessingAction(null);
      }
    };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 pb-6" data-testid="transaction-history-screen">
      {/* Animated background */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute top-0 left-0 w-96 h-96 bg-purple-500 rounded-full filter blur-3xl opacity-20 animate-pulse"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-indigo-500 rounded-full filter blur-3xl opacity-20 animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-pink-500 rounded-full filter blur-3xl opacity-10 animate-pulse delay-500"></div>
      </div>

      {/* Header */}
      <div className="bg-black/20 backdrop-blur-xl border-b border-white/10 text-white p-6 pb-8">
        <div className="flex items-center mb-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="mr-4 text-purple-300 hover:text-white transition-colors"
            data-testid="back-button"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-2xl font-bold">Security Monitor</h1>
        </div>
      </div>

      <div className="px-6 -mt-4">
        {/* Search Bar */}
        <div className="mb-6 relative">
          <input
            type="text"
            placeholder="Search by recipient, transaction ID, or remarks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-3 pl-12 bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
            data-testid="search-input"
          />
          <svg className="absolute left-4 top-3.5 w-5 h-5 text-purple-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        {/* Advanced Filters Panel */}
        <div className="bg-white/10 backdrop-blur-xl rounded-xl shadow-lg p-4 mb-6 border border-white/20">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-semibold">Advanced Filters</h3>
            {hasActiveFilters() && (
              <button
                onClick={clearFilters}
                className="text-sm text-purple-300 hover:text-white transition"
                data-testid="clear-filters-button"
              >
                Clear All
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Date Filter */}
            <div>
              <label className="block text-xs font-semibold text-purple-300 mb-2">Date Range</label>
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
                data-testid="date-filter"
              >
                <option value="all" className="text-gray-900">All Time</option>
                <option value="today" className="text-gray-900">Today</option>
                <option value="week" className="text-gray-900">Last 7 Days</option>
                <option value="month" className="text-gray-900">Last 30 Days</option>
              </select>
            </div>

            {/* Amount Min */}
            <div>
              <label className="block text-xs font-semibold text-purple-300 mb-2">Min Amount</label>
              <input
                type="number"
                placeholder="₹0"
                value={amountMin}
                onChange={(e) => setAmountMin(e.target.value)}
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
                data-testid="amount-min-filter"
              />
            </div>

            {/* Amount Max */}
            <div>
              <label className="block text-xs font-semibold text-purple-300 mb-2">Max Amount</label>
              <input
                type="number"
                placeholder="₹1,00,000"
                value={amountMax}
                onChange={(e) => setAmountMax(e.target.value)}
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
                data-testid="amount-max-filter"
              />
            </div>

            {/* Risk Level Filter */}
            <div>
              <label className="block text-xs font-semibold text-purple-300 mb-2">Risk Level</label>
              <select
                value={riskFilter}
                onChange={(e) => setRiskFilter(e.target.value)}
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
                data-testid="risk-filter"
              >
                <option value="all" className="text-gray-900">All Risks</option>
                <option value="low" className="text-gray-900">Low Risk</option>
                <option value="medium" className="text-gray-900">Medium Risk</option>
                <option value="high" className="text-gray-900">High Risk</option>
              </select>
            </div>
          </div>

          {/* Sort Options */}
          <div className="mt-4 pt-4 border-t border-white/20">
            <label className="block text-xs font-semibold text-purple-300 mb-2">Sort By</label>
            <div className="flex flex-wrap gap-2">
              {[
                { value: 'newest', label: 'Newest First' },
                { value: 'oldest', label: 'Oldest First' },
                { value: 'amount-high', label: 'Amount (High to Low)' },
                { value: 'amount-low', label: 'Amount (Low to High)' }
              ].map(option => (
                <button
                  key={option.value}
                  onClick={() => setSortBy(option.value)}
                  className={`px-3 py-1 text-xs rounded-lg transition ${
                    sortBy === option.value
                      ? 'bg-purple-600 text-white'
                      : 'bg-white/10 text-purple-300 hover:bg-white/20'
                  }`}
                  data-testid={`sort-${option.value}`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="bg-white/10 backdrop-blur-xl rounded-2xl shadow-lg p-2 mb-6 flex space-x-2 border border-white/20" data-testid="filter-tabs">
          <button
            onClick={() => setFilter('all')}
            className={`flex-1 py-2 rounded-lg font-semibold text-sm transition duration-200 ${
              filter === 'all'
                ? 'bg-purple-600 text-white'
                : 'text-purple-300 hover:bg-white/10'
            }`}
            data-testid="filter-all"
          >
            All Events
          </button>
          <button
            onClick={() => setFilter('allow')}
            className={`flex-1 py-2 rounded-lg font-semibold text-sm transition duration-200 ${
              filter === 'allow'
                ? 'bg-green-600 text-white'
                : 'text-purple-300 hover:bg-white/10'
            }`}
            data-testid="filter-success"
          >
            Safe
          </button>
          <button
            onClick={() => setFilter('delay')}
            className={`flex-1 py-2 rounded-lg font-semibold text-sm transition duration-200 ${
              filter === 'delay'
                ? 'bg-yellow-600 text-white'
                : 'text-purple-300 hover:bg-white/10'
            }`}
            data-testid="filter-pending"
          >
            Review
          </button>
          <button
            onClick={() => setFilter('block')}
            className={`flex-1 py-2 rounded-lg font-semibold text-sm transition duration-200 ${
              filter === 'block'
                ? 'bg-red-600 text-white'
                : 'text-purple-300 hover:bg-white/10'
            }`}
            data-testid="filter-blocked"
          >
            Blocked
          </button>
        </div>

        {/* Results Summary */}
        {filteredTransactions.length !== transactions.length && hasActiveFilters() && (
          <div className="mb-4 p-4 bg-blue-500/20 border border-blue-400/30 rounded-lg text-blue-300 text-sm">
            Found {filteredTransactions.length} of {transactions.length} transactions
          </div>
        )}

        {/* Transactions List */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full spinner"></div>
          </div>
        ) : error ? (
          <div className="bg-red-500/20 border border-red-500/30 text-red-200 p-4 rounded-lg backdrop-blur-sm">
            {error}
          </div>
         ) : transactions.length === 0 ? (
           <div className="bg-white/10 backdrop-blur-xl rounded-2xl shadow-lg p-8 text-center border border-white/20">
             <svg className="w-20 h-20 mx-auto mb-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
             </svg>
             <p className="text-purple-200 font-semibold">No security events</p>
             <p className="text-sm text-purple-300 mt-2">
               {filter !== 'all' ? `No ${filter} events found` : 'All transactions are secure'}
             </p>
           </div>
         ) : filteredTransactions.length === 0 ? (
           <div className="bg-white/10 backdrop-blur-xl rounded-2xl shadow-lg p-8 text-center border border-white/20">
             <svg className="w-20 h-20 mx-auto mb-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
             </svg>
             <p className="text-purple-200 font-semibold">No matching transactions</p>
             <p className="text-sm text-purple-300 mt-2">Try adjusting your filters</p>
             {hasActiveFilters() && (
               <button
                 onClick={clearFilters}
                 className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
               >
                 Clear Filters
               </button>
             )}
           </div>
         ) : (
           <div className="space-y-3" data-testid="transactions-list">
             {filteredTransactions.map((tx) => {
              const explanation = getExplanation(tx.action, tx.risk_score, tx.fraud_reasons);
              const isExpanded = expandedTransaction === tx.tx_id;
              
              return (
                <div
                  key={tx.tx_id}
                  className="bg-white/10 backdrop-blur-xl rounded-xl shadow-md hover:shadow-lg transition duration-200 overflow-hidden border border-white/20"
                  data-testid={`transaction-${tx.tx_id}`}
                >
                  <div
                    className="p-4 cursor-pointer"
                    onClick={() => (tx.action !== 'ALLOW' ? toggleExplanation(tx.tx_id) : null)}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <p className="font-semibold text-white text-lg">{tx.recipient_vpa}</p>
                        <p className="text-xs text-purple-300 mt-1">{formatDate(tx.created_at)}</p>
                        {tx.remarks && (
                          <p className="text-sm text-purple-200 mt-1 italic">"{tx.remarks}"</p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-xl text-white">{formatCurrency(tx.amount)}</p>
                      </div>
                    </div>

                    <div className="flex justify-between items-center pt-3 border-t border-white/20">
                      <div className="flex items-center space-x-3">
                         {getStatusBadge(tx.action)}
                         <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                           getRiskLevel(tx.risk_score) === 'high' ? 'bg-red-100 text-red-800' :
                           getRiskLevel(tx.risk_score) === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                           'bg-green-100 text-green-800'
                         }`}>
                           {getRiskLevel(tx.risk_score).charAt(0).toUpperCase() + getRiskLevel(tx.risk_score).slice(1)} Risk
                         </span>
                      </div>
                      <div className="flex items-center space-x-2 text-xs text-purple-300">
                        <span>ID: {tx.tx_id.substring(0, 12)}...</span>
                        {tx.action !== 'ALLOW' && (
                          <svg
                            className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {isExpanded && (
                    <div className={`border-t border-${explanation.color}-100 bg-${explanation.color}-50 p-6`}>
                      <div className="flex items-start space-x-4">
                        <div className={`flex-shrink-0 w-12 h-12 bg-${explanation.color}-100 rounded-full flex items-center justify-center`}>
                          {explanation.color === 'red' && (
                            <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 0018.364 5.636m-9 9a9 9 0 11-12.728 0m12.728 0a9 9 0 00-12.728 0M9 15h6m-3-3h.01M9 12h6" />
                            </svg>
                          )}
                          {explanation.color === 'yellow' && (
                            <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                          )}
                        </div>
                        <div className="flex-1">
                          <h4 className={`font-bold text-${explanation.color}-800 mb-3 text-lg`}>{explanation.title}</h4>
                          <p className={`text-${explanation.color}-700 mb-4 leading-relaxed`}>{explanation.message}</p>
                          
                          {explanation.details && explanation.details.length > 0 && (
                            <div className="space-y-2">
                              <p className={`text-sm font-medium text-${explanation.color}-800 mb-2`}>Security Analysis:</p>
                              {explanation.details.map((detail, index) => (
                                <div key={index} className="flex items-start bg-white/50 rounded-lg p-3">
                                  <svg className="w-4 h-4 text-amber-500 mr-2 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a2 2 0 002-2V7a2 2 0 00-2-2H6a2 2 0 00-2 2v5a2 2 0 002 2m2 0h7a2 2 0 002-2V9a2 2 0 00-2-2h-7m-6 2l4-4m0 0l4 4" />
                                  </svg>
                                  <span className="text-sm text-gray-700">{detail}</span>
                                </div>
                              ))}
                            </div>
                          )}
                          
                          {tx.action === 'DELAY' && (
                            <div className="mt-6 pt-4 border-t border-gray-200">
                              <div className="grid grid-cols-2 gap-3">
                                <button
                                  className="bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold py-3 px-4 rounded-xl hover:from-green-600 hover:to-emerald-700 transition-all duration-200 transform hover:scale-105 flex items-center justify-center"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleQuickAction(tx.tx_id, 'confirm');
                                  }}
                                  disabled={processingAction === `${tx.tx_id}-confirm`}
                                >
                                  {processingAction === `${tx.tx_id}-confirm` ? (
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                                  ) : (
                                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                  )}
                                  Confirm
                                </button>
                                <button
                                  className="bg-gradient-to-r from-red-500 to-pink-600 text-white font-semibold py-3 px-4 rounded-xl hover:from-red-600 hover:to-pink-700 transition-all duration-200 transform hover:scale-105 flex items-center justify-center"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleQuickAction(tx.tx_id, 'cancel');
                                  }}
                                  disabled={processingAction === `${tx.txId}-cancel`}
                                >
                                  {processingAction === `${tx.tx_id}-cancel` ? (
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                                  ) : (
                                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                  )}
                                  Cancel
                                </button>
                              </div>
                              <button
                                className="w-full mt-3 bg-gray-200 text-gray-700 font-semibold py-3 px-6 rounded-xl hover:bg-gray-300 transition-all duration-200 flex items-center justify-center"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/fraud-alert/${tx.tx_id}`);
                                }}
                              >
                                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                                View Details
                              </button>
                            </div>
                          )}
                        </div>
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
  );
};

export default TransactionHistory;
