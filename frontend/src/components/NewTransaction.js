import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createTransaction } from '../api';

const NewTransaction = ({ user }) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    recipient_vpa: '',
    amount: '',
    remarks: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fraudAlert, setFraudAlert] = useState(null);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const amount = parseFloat(formData.amount);
      
      if (isNaN(amount) || amount <= 0) {
        setError('Please enter a valid amount');
        setLoading(false);
        return;
      }

      const transactionData = {
        recipient_vpa: formData.recipient_vpa,
        amount: amount,
        remarks: formData.remarks || null,
        device_id: 'web_device_' + Date.now()
      };

      const response = await createTransaction(transactionData);
      
      if (response.status === 'success') {
        if (response.requires_confirmation) {
          // Show fraud alert
          setFraudAlert({
            transaction: response.transaction,
            risk_level: response.risk_level
          });
        } else {
          // Transaction successful
          alert('Transaction completed successfully!');
          navigate('/dashboard');
        }
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Transaction failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleFraudDecision = async (decision) => {
    try {
      const { submitUserDecision } = await import('../api');
      
      const response = await submitUserDecision({
        tx_id: fraudAlert.transaction.tx_id,
        decision: decision
      });

      if (response.status === 'success') {
        if (decision === 'confirm') {
          alert('Transaction confirmed and completed!');
        } else {
          alert('Transaction cancelled for your safety');
        }
        navigate('/dashboard');
      }
    } catch (err) {
      setError('Failed to process decision. Please try again.');
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  if (fraudAlert) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-md mx-auto">
          {/* Fraud Alert */}
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
            <div className="bg-red-500 text-white p-6 text-center">
              <svg className="w-20 h-20 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <h2 className="text-2xl font-bold">Suspicious Transaction Detected</h2>
            </div>

            <div className="p-6">
              <div className="mb-6">
                <div className="flex items-center justify-center mb-4">
                  <span className={`px-4 py-2 rounded-full text-sm font-semibold ${
                    fraudAlert.risk_level === 'high' 
                      ? 'bg-red-100 text-red-800' 
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {fraudAlert.risk_level.toUpperCase()} RISK
                  </span>
                </div>

                <div className="space-y-4 bg-gray-50 p-4 rounded-lg">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Amount:</span>
                    <span className="font-bold text-xl">{formatCurrency(fraudAlert.transaction.amount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">To:</span>
                    <span className="font-semibold">{fraudAlert.transaction.recipient_vpa}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Risk Score:</span>
                    <span className="font-semibold">{(fraudAlert.transaction.risk_score * 100).toFixed(1)}%</span>
                  </div>
                </div>
              </div>

              <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <h4 className="font-semibold text-yellow-800 mb-2">⚠️ Why was this flagged?</h4>
                <ul className="text-sm text-yellow-700 space-y-1">
                  {fraudAlert.transaction.amount > 10000 && (
                    <li>• High transaction amount detected</li>
                  )}
                  {fraudAlert.risk_level === 'high' && (
                    <li>• Unusual transaction pattern detected by ML model</li>
                  )}
                  <li>• Transaction requires your confirmation before processing</li>
                </ul>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <div className="space-y-3">
                <button
                  onClick={() => handleFraudDecision('confirm')}
                  className="w-full bg-green-600 text-white py-4 rounded-lg font-semibold hover:bg-green-700 transition duration-200"
                  data-testid="confirm-transaction-button"
                >
                  ✓ Confirm & Proceed
                </button>
                <button
                  onClick={() => handleFraudDecision('cancel')}
                  className="w-full bg-red-600 text-white py-4 rounded-lg font-semibold hover:bg-red-700 transition duration-200"
                  data-testid="cancel-transaction-button"
                >
                  ✕ Cancel Transaction
                </button>
              </div>

              <p className="text-xs text-gray-500 text-center mt-4">
                Your safety is our priority. Please verify before confirming.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-6">
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
          <h1 className="text-2xl font-bold">New Payment</h1>
        </div>
      </div>

      <div className="px-6 -mt-4">
        <div className="bg-white rounded-2xl shadow-xl p-6" data-testid="new-transaction-form">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Recipient UPI ID
              </label>
              <input
                type="text"
                name="recipient_vpa"
                value={formData.recipient_vpa}
                onChange={handleChange}
                placeholder="user@upi or merchant@upi"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                required
                data-testid="recipient-vpa-input"
              />
              <p className="text-xs text-gray-500 mt-1">Enter UPI ID or VPA</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Amount (₹)
              </label>
              <input
                type="number"
                name="amount"
                value={formData.amount}
                onChange={handleChange}
                placeholder="0.00"
                step="0.01"
                min="1"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-2xl font-bold"
                required
                data-testid="amount-input"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Remarks (Optional)
              </label>
              <textarea
                name="remarks"
                value={formData.remarks}
                onChange={handleChange}
                placeholder="Add a note..."
                rows="3"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                data-testid="remarks-input"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            <div className="pt-4">
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-600 text-white py-4 rounded-lg font-bold text-lg hover:bg-indigo-700 transition duration-200 disabled:bg-gray-400"
                data-testid="pay-button"
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full spinner mr-2"></div>
                    Processing...
                  </span>
                ) : (
                  '💳 Pay Now'
                )}
              </button>
            </div>
          </form>

          <div className="mt-6 p-4 bg-indigo-50 rounded-lg">
            <h4 className="text-sm font-semibold text-indigo-900 mb-2">🔒 Security Features</h4>
            <ul className="text-xs text-indigo-700 space-y-1">
              <li>• Real-time fraud detection with AI</li>
              <li>• Instant alerts for suspicious transactions</li>
              <li>• 100% secure payment processing</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewTransaction;
