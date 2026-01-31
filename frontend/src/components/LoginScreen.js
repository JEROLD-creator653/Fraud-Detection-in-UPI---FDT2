import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { loginUser } from '../api';
import cacheManager from '../utils/cacheManager';
import errorHandler from '../utils/errorHandler';

const LoginScreen = ({ onLogin }) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    phone: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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
     
     // Basic validation
     const validation = errorHandler.validateForm(
       formData,
       {
         phone: {
           required: true,
           label: 'Phone Number',
           custom: (value) => {
             const cleanPhone = value.replace(/\D/g, '');
             return cleanPhone.length === 10;
           },
           message: 'Please enter a valid 10-digit phone number'
         },
         password: {
           required: true,
           label: 'Password',
           minLength: 3
         }
       }
     );

     if (!validation.isValid) {
       setError(Object.values(validation.errors)[0]);
       return;
     }

     setLoading(true);

     try {
       const response = await loginUser(formData);
       
       if (response.status === 'success') {
         // Set current user in cache manager to clear user-specific cache
         cacheManager.setCurrentUser(response.user.user_id);
         
         onLogin(response.user, response.token);
         // Always navigate to dashboard after login
         navigate('/dashboard');
       }
     } catch (err) {
       const errorInfo = errorHandler.handleAPIError(err, 'User Login');
       setError(errorInfo.message);
     } finally {
       setLoading(false);
     }
   };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-0 w-96 h-96 bg-purple-500 rounded-full filter blur-3xl opacity-20 animate-pulse"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-indigo-500 rounded-full filter blur-3xl opacity-20 animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-pink-500 rounded-full filter blur-3xl opacity-10 animate-pulse delay-500"></div>
      </div>
      
      <div className="bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl w-full max-w-md p-8 border border-white/20 relative z-10">
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto bg-gradient-to-br from-purple-500 to-indigo-600 rounded-full flex items-center justify-center mb-4 shadow-lg">
            <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <h2 className="text-3xl font-bold text-white mb-2">FDT Secure</h2>
          <p className="text-purple-200">Fraud Detection & Payments</p>
        </div>

        {error && (
          <div className="bg-red-500/20 border border-red-500/30 text-red-200 px-4 py-3 rounded-lg mb-4 backdrop-blur-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-purple-200 mb-2">
              Phone Number
            </label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="+91XXXXXXXXXX"
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white placeholder-purple-300 backdrop-blur-sm"
              required
              data-testid="login-phone-input"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-purple-200 mb-2">
              Password
            </label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Enter your password"
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white placeholder-purple-300 backdrop-blur-sm"
              required
              data-testid="login-password-input"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-3 rounded-lg font-semibold hover:from-purple-700 hover:to-indigo-700 transition duration-200 disabled:opacity-50 shadow-lg transform hover:scale-105"
            data-testid="login-submit-button"
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                Signing in...
              </span>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        <div className="text-center mt-6">
          <p className="text-purple-200">
            Don't have an account?{' '}
            <Link to="/register" className="text-purple-100 font-semibold hover:text-white">
              Sign Up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;
