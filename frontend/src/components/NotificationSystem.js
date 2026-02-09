import React, { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { getUserTransactions } from '../api';
import sessionStorageManager from '../utils/sessionStorageManager';

const NotificationContext = createContext();

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [showNotificationPanel, setShowNotificationPanel] = useState(false);

  const addNotification = useCallback((notification) => {
    const id = Date.now() + Math.random();
    const newNotification = {
      id,
      timestamp: new Date(),
      read: false,
      ...notification
    };
    
    setNotifications(prev => [newNotification, ...prev]);
    
    // Auto-remove temporary notifications after 10 seconds
    if (notification.type !== 'delayed_transaction') {
      setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== id));
      }, 10000);
    }
  }, []);

  const removeNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const markAsRead = useCallback((id) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  // Check for delayed transactions periodically (only if user is authenticated)
  useEffect(() => {
    // Only check if user is logged in (has token)
    const token = sessionStorageManager.getItem('fdt_token');
    if (!token) {
      return; // Skip if not authenticated
    }

    let isActive = true; // Track if component is still mounted

    const checkDelayedTransactions = async () => {
      // Re-check token before making request
      const currentToken = sessionStorageManager.getItem('fdt_token');
      if (!currentToken) {
        // Token was cleared (user logged out), stop polling
        isActive = false;
        return;
      }

      try {
        const data = await getUserTransactions(20, 'DELAY');
        
        // Only process if component is still mounted and we still have a token
        if (!isActive) return;
        
        const delayedTxns = data.transactions || [];
        
        delayedTxns.forEach(tx => {
          const existingNotification = notifications.find(
            n => n.type === 'delayed_transaction' && n.transactionId === tx.tx_id && n.read === false
          );
          
          if (!existingNotification) {
            addNotification({
              type: 'delayed_transaction',
              title: 'Transaction Pending Verification',
              message: `Transaction of ₹${tx.amount} to ${tx.recipient_vpa} needs your confirmation`,
              transactionId: tx.tx_id,
              action: 'review',
              actionText: 'Review Now',
              actionUrl: `/fraud-alert/${tx.tx_id}`
            });
          }
        });
      } catch (err) {
        // If we get authentication errors, stop polling
        if (err.response?.status === 401) {
          console.warn('⚠ Authentication lost, stopping delayed transaction checks');
          isActive = false;
          return;
        }
        // For other errors, just log without disrupting the app
        console.error('Failed to check delayed transactions:', err.message);
      }
    };

    // Check immediately and then every 30 seconds
    checkDelayedTransactions();
    const interval = setInterval(() => {
      // Stop checking if no token
      const currentToken = sessionStorageManager.getItem('fdt_token');
      if (!currentToken) {
        isActive = false;
        return;
      }
      checkDelayedTransactions();
    }, 30000);

    // Cleanup: stop polling when component unmounts or user logs out
    return () => {
      isActive = false;
      clearInterval(interval);
    };
  }, []); // Empty dependency array - we check token inside the effect

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        addNotification,
        removeNotification,
        markAsRead,
        clearAll,
        showNotificationPanel,
        setShowNotificationPanel,
        unreadCount
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export default NotificationContext;