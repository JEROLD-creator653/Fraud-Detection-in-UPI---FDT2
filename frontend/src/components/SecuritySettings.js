import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useNotifications } from './NotificationSystem';

const SecuritySettings = () => {
  const navigate = useNavigate();
  const { addNotification } = useNotifications();
  const [settings, setSettings] = useState({
    transactionLimit: 10000,
    autoBlockHighRisk: true,
    smsAlerts: true,
    emailAlerts: false,
    biometricRequired: false,
    riskThreshold: 'medium',
    trustedDevices: ['Rajesh iPhone', 'Priya Android']
  });
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // In production, this would save to backend
      addNotification({
        type: 'success',
        title: 'Settings Saved',
        message: 'Your security preferences have been updated successfully.',
        category: 'success'
      });
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Save Failed',
        message: 'Unable to save settings. Please try again.',
        category: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (key) => {
    setSettings(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleChange = (key, value) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const addTrustedDevice = () => {
    const deviceName = prompt('Enter device name:');
    if (deviceName && !settings.trustedDevices.includes(deviceName)) {
      setSettings(prev => ({
        ...prev,
        trustedDevices: [...prev.trustedDevices, deviceName]
      }));
    }
  };

  const removeTrustedDevice = (device) => {
    setSettings(prev => ({
      ...prev,
      trustedDevices: prev.trustedDevices.filter(d => d !== device)
    }));
  };

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
            <h1 className="text-2xl font-bold text-white">Security Settings</h1>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          
          {/* Transaction Limits */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-6 h-full flex flex-col">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center">
              <svg className="w-6 h-6 mr-3 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .438-4.125-1.269l2.417-2.417c.437-.437 1.011-.594 1.011-.594.882 0 1.432.163 1.883.651.68.149a3 3 0 00.65.822L21 8a1 1 0 01-.988-1.117l-2.417-2.417A6 6 0 0012 2z" />
              </svg>
              Transaction Limits
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-white/80 text-sm font-medium mb-2">Daily Transaction Limit</label>
                <div className="flex items-center">
                  <span className="text-2xl font-bold text-white mr-2">₹</span>
                  <input
                    type="number"
                    value={settings.transactionLimit}
                    onChange={(e) => handleChange('transactionLimit', parseInt(e.target.value))}
                    className="flex-1 bg-white/20 border border-white/30 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <p className="text-white/60 text-xs mt-2">Transactions above this limit will require additional verification</p>
              </div>
            </div>
          </div>

          {/* Risk Management */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-6 h-full flex flex-col">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center">
              <svg className="w-6 h-6 mr-3 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 0018.364 5.636m-9 9a9 9 0 11-12.728 0m12.728 0a9 9 0 00-12.728 0M9 15h6m-3-3h.01M9 12h6" />
              </svg>
              Risk Management
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-white/80 text-sm font-medium mb-2">Risk Threshold</label>
                <select
                  value={settings.riskThreshold}
                  onChange={(e) => handleChange('riskThreshold', e.target.value)}
                  className="w-full bg-white/20 border border-white/30 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value="low">Low (Block > 80% risk)</option>
                  <option value="medium">Medium (Block > 60% risk)</option>
                  <option value="high">High (Block > 40% risk)</option>
                </select>
              </div>
              
              <div className="flex items-start justify-between gap-4 py-3">
                <div className="flex-1 min-w-0 pr-2">
                  <div className="text-white/80 text-sm font-medium break-words leading-relaxed">
                    Auto-block high-risk transactions
                  </div>
                </div>
                <button
                  onClick={() => handleToggle('autoBlockHighRisk')}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 ${
                    settings.autoBlockHighRisk ? 'bg-red-500' : 'bg-gray-600'
                  }`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.autoBlockHighRisk ? 'translate-x-6' : 'translate-x-1'
                  }`} />
                </button>
              </div>
            </div>
          </div>

          {/* Alert Preferences */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-6 h-full flex flex-col">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center">
              <svg className="w-6 h-6 mr-3 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0018 14.158V11a2.032 2.032 0 00-1.464-1.95l-5.193-5.193A2.032 2.032 0 008.158 6H4a2.032 2.032 0 00-1.464 1.95L-2.672 10.032A2.032 2.032 0 002 11.158V14a2.032 2.032 0 001.464 1.95l5.193 5.193A2.032 2.032 0 0015.842 18H18a2.032 2.032 0 001.464-1.95l1.405-1.405z" />
              </svg>
              Alert Preferences
            </h2>
            
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-3 py-2">
                <div className="flex-1 min-w-0">
                  <div className="text-white/80 text-sm font-medium">SMS Alerts</div>
                  <p className="text-white/60 text-xs mt-1 break-words">Instant SMS for suspicious activity</p>
                </div>
                <button
                  onClick={() => handleToggle('smsAlerts')}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 ${
                    settings.smsAlerts ? 'bg-blue-500' : 'bg-gray-600'
                  }`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.smsAlerts ? 'translate-x-6' : 'translate-x-1'
                  }`} />
                </button>
              </div>
              
              <div className="flex items-start justify-between gap-3 py-2">
                <div className="flex-1 min-w-0">
                  <div className="text-white/80 text-sm font-medium">Email Alerts</div>
                  <p className="text-white/60 text-xs mt-1 break-words">Daily summary emails</p>
                </div>
                <button
                  onClick={() => handleToggle('emailAlerts')}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 ${
                    settings.emailAlerts ? 'bg-blue-500' : 'bg-gray-600'
                  }`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.emailAlerts ? 'translate-x-6' : 'translate-x-1'
                  }`} />
                </button>
              </div>
            </div>
          </div>

          {/* Trusted Devices */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-6 lg:col-span-3">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center">
              <svg className="w-6 h-6 mr-3 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a2 2 0 002-2V7a2 2 0 00-2-2H6a2 2 0 00-2 2v5a2 2 0 002 2m2 0h7a2 2 0 002-2V9a2 2 0 00-2-2h-7m-6 2l4-4m0 0l4 4" />
              </svg>
              Trusted Devices
            </h2>
            
            <div className="space-y-3">
              {settings.trustedDevices.map((device, index) => (
                <div key={index} className="flex items-center justify-between bg-white/5 rounded-lg p-3">
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-green-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H4a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    <span className="text-white/80 text-sm">{device}</span>
                  </div>
                  <button
                    onClick={() => removeTrustedDevice(device)}
                    className="text-red-400 hover:text-red-300 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              ))}
              
              <button
                onClick={addTrustedDevice}
                className="w-full py-3 border-2 border-dashed border-white/30 rounded-lg text-white/60 hover:text-white hover:border-white/50 transition-colors"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 4v6m-3-3h.01M9 12h6" />
                </svg>
                Add Trusted Device
              </button>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="mt-8 flex justify-center">
          <button
            onClick={handleSave}
            disabled={loading}
            className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold py-4 px-12 rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:transform-none flex items-center"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-3"></div>
                Saving...
              </>
            ) : (
              <>
                <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-6 2l4-4m0 0l4 4" />
                </svg>
                Save Settings
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SecuritySettings;