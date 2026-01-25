import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createTransaction } from '../api';
import { useNotifications } from './NotificationSystem';
import cacheManager from '../utils/cacheManager';

const SendMoney = ({ user, onBack }) => {
  const navigate = useNavigate();
  const { addNotification } = useNotifications();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    recipient_vpa: '',
    amount: '',
    remarks: ''
  });
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setError('');
  };

  const validateForm = () => {
    if (!formData.recipient_vpa) {
      setError('Please enter recipient UPI ID');
      return false;
    }
    if (!formData.recipient_vpa.includes('@')) {
      setError('Invalid UPI ID format (e.g., user@upi)');
      return false;
    }
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      setError('Please enter a valid amount');
      return false;
    }
    if (parseFloat(formData.amount) > 100000) {
      setError('Amount cannot exceed ₹1,00,000');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await createTransaction({
        recipient_vpa: formData.recipient_vpa,
        amount: parseFloat(formData.amount),
        remarks: formData.remarks || 'Payment'
      });

      const { transaction, requires_confirmation, risk_level } = response;

      // Clear cache so dashboard refreshes with new data
      cacheManager.invalidateCategory('dashboard');
      cacheManager.invalidateCategory('transactions');

      // Show notifications based on transaction action
      if (transaction.action === 'BLOCK') {
        addNotification({
          type: 'error',
          title: 'Transaction Blocked',
          message: `Your transaction of ₹${transaction.amount.toFixed(2)} to ${transaction.recipient_vpa} was blocked due to high fraud risk (${(transaction.risk_score * 100).toFixed(1)}%).`,
          category: 'fraud'
        });
      } else if (transaction.action === 'DELAY') {
        addNotification({
          type: 'warning',
          title: 'Transaction Pending Review',
          message: `Your transaction of ₹${transaction.amount.toFixed(2)} to ${transaction.recipient_vpa} has been delayed for security review. Risk score: ${(transaction.risk_score * 100).toFixed(1)}%`,
          category: 'fraud',
          action: 'review',
          actionText: 'Review Now',
          actionUrl: `/fraud-alert/${transaction.tx_id}`
        });
      } else {
        addNotification({
          type: 'success',
          title: 'Transaction Successful',
          message: `₹${transaction.amount.toFixed(2)} sent to ${transaction.recipient_vpa} successfully!`,
          category: 'transaction'
        });
      }

      // Navigate to appropriate page
      if (requires_confirmation) {
        setTimeout(() => {
          navigate(`/fraud-alert/${transaction.tx_id}`);
        }, 1500);
      } else {
        setTimeout(() => {
          navigate('/dashboard');
        }, 1500);
      }

    } catch (err) {
      console.error('Transaction failed:', err);
      const errorMessage = err.response?.data?.detail || 'Transaction failed. Please try again.';
      setError(errorMessage);
      
      addNotification({
        type: 'error',
        title: 'Transaction Failed',
        message: errorMessage,
        category: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Animated background */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute top-0 left-0 w-96 h-96 bg-purple-500 rounded-full filter blur-3xl opacity-20 animate-pulse"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-indigo-500 rounded-full filter blur-3xl opacity-20 animate-pulse delay-1000"></div>
      </div>

      {/* Header */}
      <div className="bg-black/20 backdrop-blur-xl border-b border-white/10 text-white p-6">
        <div className="flex items-center">
          <button
            onClick={onBack}
            className="mr-4 p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-2xl font-bold">Send Money</h1>
        </div>
      </div>

      {/* Form */}
      <div className="p-6">
        <div className="max-w-md mx-auto">
          {/* Balance Card */}
          <div className="bg-gradient-to-br from-purple-600 to-indigo-600 rounded-xl p-6 mb-6 shadow-lg">
            <div className="text-white/80 text-sm mb-1">Available Balance</div>
            <div className="text-white text-3xl font-bold">
              {formatCurrency(user?.balance || 0)}
            </div>
          </div>

          {/* Transaction Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Recipient UPI ID */}
            <div className="bg-white/10 backdrop-blur-xl rounded-xl p-5 border border-white/20">
              <label className="text-white/80 text-sm mb-2 block">Recipient UPI ID</label>
              <input
                type="text"
                name="recipient_vpa"
                value={formData.recipient_vpa}
                onChange={handleChange}
                placeholder="example@upi"
                className="w-full bg-white/10 text-white placeholder-white/40 rounded-lg px-4 py-3 border border-white/20 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400/50"
                disabled={loading}
              />
            </div>

            {/* Amount */}
            <div className="bg-white/10 backdrop-blur-xl rounded-xl p-5 border border-white/20">
              <label className="text-white/80 text-sm mb-2 block">Amount (₹)</label>
              <input
                type="number"
                name="amount"
                value={formData.amount}
                onChange={handleChange}
                placeholder="0.00"
                step="0.01"
                min="1"
                max="100000"
                className="w-full bg-white/10 text-white placeholder-white/40 rounded-lg px-4 py-3 border border-white/20 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400/50 text-2xl font-semibold"
                disabled={loading}
              />
            </div>

            {/* Remarks */}
            <div className="bg-white/10 backdrop-blur-xl rounded-xl p-5 border border-white/20">
              <label className="text-white/80 text-sm mb-2 block">Remarks (Optional)</label>
              <input
                type="text"
                name="remarks"
                value={formData.remarks}
                onChange={handleChange}
                placeholder="Add a note..."
                className="w-full bg-white/10 text-white placeholder-white/40 rounded-lg px-4 py-3 border border-white/20 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400/50"
                disabled={loading}
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-500/20 backdrop-blur-xl border border-red-500/50 rounded-xl p-4">
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-red-400 mr-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <span className="text-red-100">{error}</span>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold py-4 rounded-xl hover:from-purple-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Processing...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                  Send Money
                </>
              )}
            </button>
          </form>

          {/* Security Info */}
          <div className="mt-6 p-4 bg-white/5 backdrop-blur-xl rounded-xl border border-white/10">
            <div className="flex items-start">
              <svg className="w-5 h-5 text-purple-400 mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <div className="text-white/60 text-sm">
                <strong className="text-white/80">Protected by AI:</strong> All transactions are analyzed in real-time for fraud detection to keep your money safe.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SendMoney;
