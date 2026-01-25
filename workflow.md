# Fraud Detection in UPI Transactions – Project Components

## Website

### 1. Activity Dashboard
- Displays system-wide statistics and visualizations
- Shows recent transactions and fraud trends
- Supports data export for analysis
- Read-only (no manual actions)

### 2. Admin Console
- Allows manual override of transactions (allow / delay / block)
- Displays decision justification (rules triggered, risk score)
- Shows server status and system health
- Maintains audit logs of manual actions

### 3. Transaction Evaluator (Simulation Interface)
- Accepts a single simulated transaction input
- Evaluates the transaction using the same fraud detection pipeline
- Explains why it was allowed, delayed, or blocked
- Stores results in the database with source marked as simulation

## Mobile Application (Flutter)
- Notifies users of delayed or blocked transactions
- Allows users to confirm or cancel delayed transactions
- Provides simple, non-technical explanations for decisions
