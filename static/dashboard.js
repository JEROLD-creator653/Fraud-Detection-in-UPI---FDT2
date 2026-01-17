// UPI Fraud Detection Dashboard - Main JavaScript
// Modularized for better maintainability

// Global state
let currentTimeRange = '24h';
let txCache = [];
let chatHistory = [];

// Utility functions
function fmtTS(ts) {
  try { return new Date(ts).toLocaleString(); } catch(e){ return ts; }
}

function safeNumber(el) {
  if (!el) return 0;
  const v = el.textContent.replace(/,/g, '').trim();
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function getRangeLabel(range) {
  const labels = {
    '1h': 'Last 1 hour',
    '24h': 'Last 24 hours',
    '7d': 'Last 7 days',
    '30d': 'Last 30 days'
  };
  return labels[range] || 'Custom range';
}

// Chart initialization
const timelineChart = new Chart(document.getElementById('timelineChart').getContext('2d'), {
  type: 'line',
  data: {
    labels: [],
    datasets: [
      { label: 'Blocked', data: [], borderColor: '#EF4444', tension: 0.3, fill: false },
      { label: 'Delayed', data: [], borderColor: '#F59E0B', tension: 0.3, fill: false },
      { label: 'Allowed', data: [], borderColor: '#10B981', tension: 0.3, fill: false }
    ]
  },
  options: { responsive: true, maintainAspectRatio: true, scales: { x: {}, y: { beginAtZero: true }}}
});

const riskPie = new Chart(document.getElementById('riskPie').getContext('2d'), {
  type: 'pie',
  data: {
    labels: ['Low', 'Medium', 'High', 'Critical'],
    datasets: [{
      data: [70, 20, 7, 3],
      backgroundColor: ['#6BCF7F', '#FFD93D', '#FF9F40', '#FF6B6B']
    }]
  },
  options: { responsive: true, maintainAspectRatio: true }
});

const fraudBar = new Chart(document.getElementById('fraudBar').getContext('2d'), {
  type: 'bar',
  data: {
    labels: ['Unusual Amount', 'Suspicious Recipient', 'Rapid Transactions', 'New Device', 'Location Mismatch'],
    datasets: [{
      label: 'Count',
      data: [35, 28, 22, 10, 5],
      backgroundColor: ['#FF6B6B', '#FF9F40', '#FFD93D', '#6BCF7F', '#4ECDC4']
    }]
  },
  options: { indexAxis: 'y', responsive: true, maintainAspectRatio: true }
});

// Data loading functions
async function loadDashboardData() {
  try {
    const res = await fetch(`/dashboard-data?time_range=${currentTimeRange}`);
    if (!res.ok) throw new Error('fetch dashboard failed');

    const j = await res.json();
    const s = j.stats || {};

    document.getElementById('totalTx').textContent = Number(s.totalTransactions || 0).toLocaleString();
    document.getElementById('blockedTx').textContent = Number(s.blocked || 0).toLocaleString();
    document.getElementById('delayedTx').textContent = Number(s.delayed || 0).toLocaleString();
    document.getElementById('allowedTx').textContent = Number(s.allowed || 0).toLocaleString();

    const labelEl = document.querySelector('#totalTx')?.nextElementSibling;
    if (labelEl) {
      labelEl.textContent = getRangeLabel(currentTimeRange);
    }
  } catch (e) {
    console.error('loadDashboardData error', e);
  }
}

async function loadRecentTransactions() {
  try {
    const res = await fetch(`/recent-transactions?limit=2000&time_range=${currentTimeRange}`);
    if (!res.ok) throw new Error('fetch recent failed');

    const j = await res.json();
    txCache = Array.isArray(j.transactions) ? j.transactions : [];

    const tbody = document.getElementById('txTbody');
    tbody.innerHTML = '';
    txCache.forEach(tx => tbody.appendChild(makeTxRow(tx)));

    updateHighRiskAlerts(txCache);
    updateFraudPatternAnalysisFromCache();
    updateTimelineFromCache();
    updateRiskDistributionFromCache();
  } catch (e) {
    console.error('loadRecentTransactions error', e);
  }
}

// Transaction row builder
function makeTxRow(tx) {
  const o = Object.assign({}, tx || {});
  const ts = o.ts || o.created_at || o.timestamp || new Date().toISOString();
  const txid = o.tx_id || o.id || '';
  const user = o.user_id || o.user || '';
  const amount = (o.amount === undefined) ? 0 : Number(o.amount);
  const type = o.action || o.tx_type || o.type || '';
  const channel = o.channel || '';
  const risk = Number(o.risk_score ?? o.risk ?? 0).toFixed(2);

  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td class="px-3 py-2">${fmtTS(ts)}</td>
    <td class="px-3 py-2">${txid}</td>
    <td class="px-3 py-2">${user}</td>
    <td class="px-3 py-2">₹${Number(amount || 0).toFixed(2)}</td>
    <td class="px-3 py-2">${type}</td>
    <td class="px-3 py-2">${channel}</td>
    <td class="px-3 py-2 font-medium text-gray-700">${risk}</td>
  `;
  return tr;
}

// Chart update functions
function updateFraudPatternAnalysisFromCache() {
  if (!Array.isArray(txCache) || txCache.length === 0) return;

  let unusualAmount = 0;
  let suspiciousRecipient = 0;
  let rapidTx = 0;
  let newDevice = 0;
  let locationMismatch = 0;

  const userCount = {};
  const recipientCount = {};
  const deviceSeen = new Set();

  txCache.forEach(tx => {
    const amt = Number(tx.amount || 0);
    if (amt > 5000) unusualAmount++;

    const recipient = tx.recipient_vpa;
    if (recipient) {
      recipientCount[recipient] = (recipientCount[recipient] || 0) + 1;
      if (recipientCount[recipient] === 3) suspiciousRecipient++;
    }

    const user = tx.user_id;
    if (user) {
      userCount[user] = (userCount[user] || 0) + 1;
      if (userCount[user] === 5) rapidTx++;
    }

    const device = tx.device_id;
    if (device && !deviceSeen.has(device)) {
      deviceSeen.add(device);
      newDevice++;
    }

    if (tx.location_mismatch === true) locationMismatch++;
  });

  fraudBar.data.datasets[0].data = [unusualAmount, suspiciousRecipient, rapidTx, newDevice, locationMismatch];
  fraudBar.update();
}

function updateRiskDistributionFromCache() {
  if (!Array.isArray(txCache) || txCache.length === 0) return;

  let low = 0, medium = 0, high = 0, critical = 0;

  txCache.forEach(tx => {
    const r = Number(tx.risk_score ?? 0);
    if (r < 0.3) low++;
    else if (r < 0.6) medium++;
    else if (r < 0.8) high++;
    else critical++;
  });

  riskPie.data.labels = ['Low', 'Medium', 'High', 'Critical'];
  riskPie.data.datasets[0].data = [low, medium, high, critical];
  riskPie.update('none');
}

function updateTimelineFromCache() {
  if (!Array.isArray(txCache) || txCache.length === 0) return;

  const buckets = {};

  txCache.forEach(tx => {
    const ts = new Date(tx.ts || tx.created_at || tx.timestamp);
    if (isNaN(ts)) return;

    const key = ts.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    if (!buckets[key]) {
      buckets[key] = { BLOCK: 0, DELAY: 0, ALLOW: 0 };
    }

    const action = (tx.action || '').toUpperCase();
    if (buckets[key][action] !== undefined) {
      buckets[key][action]++;
    }
  });

  const labels = Object.keys(buckets).slice(-10);

  timelineChart.data.labels = labels;
  timelineChart.data.datasets[0].data = labels.map(l => buckets[l].BLOCK);
  timelineChart.data.datasets[1].data = labels.map(l => buckets[l].DELAY);
  timelineChart.data.datasets[2].data = labels.map(l => buckets[l].ALLOW);

  timelineChart.update();
}

function updateHighRiskAlerts(transactions) {
  const container = document.getElementById('alertsList');
  if (!container) return;

  container.innerHTML = '';

  transactions
    .filter(tx => Number(tx.risk_score || 0) >= 0.8)
    .slice(0, 10)
    .forEach(tx => {
      const div = document.createElement('div');
      div.className = 'p-2 border rounded bg-red-50 text-red-800';
      div.innerHTML = `
        <div class="font-semibold">${tx.tx_id}</div>
        <div>User: ${tx.user_id}</div>
        <div>Amount: ₹${Number(tx.amount).toFixed(2)}</div>
        <div>Risk Score: <b>${Number(tx.risk_score).toFixed(2)}</b></div>
        <div>Action: ${tx.action}</div>
      `;
      container.appendChild(div);
    });

  if (!container.children.length) {
    container.innerHTML = '<div class="text-gray-500">No high-risk transactions</div>';
  }
}

// WebSocket setup
function setupWebSocket() {
  const proto = location.protocol === 'https:' ? 'wss' : 'ws';
  const ws = new WebSocket(`${proto}://${location.host}/ws`);

  ws.onopen = () => console.log('WebSocket connected');

  ws.onmessage = (ev) => {
    try {
      const msg = JSON.parse(ev.data);
      if (!msg || !msg.data) return;

      const txObj = msg.data;
      const msgType = String(msg.type || '').toLowerCase();

      if (msgType === 'tx_inserted') {
        txCache.unshift(txObj);
        if (txCache.length > 200) txCache.pop();

        const tbody = document.getElementById('txTbody');
        tbody.insertBefore(makeTxRow(txObj), tbody.firstChild);

        updateHighRiskAlerts(txCache);
        updateFraudPatternAnalysisFromCache();
        updateTimelineFromCache();
        updateRiskDistributionFromCache();
        loadDashboardData();
      }

      if (msgType === 'tx_updated') {
        loadRecentTransactions();
        loadDashboardData();
      }
    } catch (e) {
      console.error('WebSocket error:', e);
    }
  };

  ws.onclose = () => setTimeout(setupWebSocket, 2000);
  ws.onerror = () => ws.close();
}

// Chatbot functions
function addChatMessage(content, isUser = false) {
  const messageDiv = document.createElement('div');
  messageDiv.className = `chatbot-message ${isUser ? 'user' : 'bot'}`;
  
  const contentDiv = document.createElement('div');
  contentDiv.className = 'chatbot-message-content';
  
  // Format with proper line breaks
  let formatted = content.trim();
  
  // Detect and style section headers (supports ──, ───, ━━, ━━━, ==, ===)
  if (formatted.includes('─') || formatted.includes('━') || /={2,}/.test(formatted)) {
    const lines = formatted.split('\n');
    let htmlContent = '';
    
    lines.forEach(line => {
      line = line.trim();
      
      // Section header detection - matches 2+ separator chars on each side
      if (/^[─━=]{2,}.*[─━=]{2,}$/.test(line)) {
        const title = line.replace(/[─━=]/g, '').trim();
        htmlContent += `<div class="msg-section-header">${title}</div>`;
      } else if (line) {
        htmlContent += `<div>${line}</div>`;
      } else {
        htmlContent += '<br>';
      }
    });
    
    contentDiv.innerHTML = htmlContent;
  } else {
    contentDiv.textContent = formatted;
  }
  
  messageDiv.appendChild(contentDiv);
  document.getElementById('chatbotMessages').appendChild(messageDiv);
  document.getElementById('chatbotMessages').scrollTop = document.getElementById('chatbotMessages').scrollHeight;
}

function showTypingIndicator() {
  const typingDiv = document.createElement('div');
  typingDiv.className = 'chatbot-message bot';
  typingDiv.id = 'typingIndicator';
  
  const indicator = document.createElement('div');
  indicator.className = 'typing-indicator chatbot-message-content';
  indicator.innerHTML = '<span></span><span></span><span></span>';
  
  typingDiv.appendChild(indicator);
  document.getElementById('chatbotMessages').appendChild(typingDiv);
  document.getElementById('chatbotMessages').scrollTop = document.getElementById('chatbotMessages').scrollHeight;
}

function removeTypingIndicator() {
  const indicator = document.getElementById('typingIndicator');
  if (indicator) indicator.remove();
}

async function sendChatMessage() {
  const chatbotInput = document.getElementById('chatbotInput');
  const chatbotSend = document.getElementById('chatbotSend');
  const message = chatbotInput.value.trim();
  if (!message) return;
  
  addChatMessage(message, true);
  chatHistory.push({ role: 'user', content: message });
  
  chatbotInput.value = '';
  chatbotSend.disabled = true;
  chatbotInput.disabled = true;
  
  showTypingIndicator();
  
  try {
    const response = await fetch('/api/chatbot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: message,
        time_range: currentTimeRange,
        history: chatHistory.slice(-10)
      })
    });
    
    if (!response.ok) throw new Error('Chatbot request failed');
    
    const data = await response.json();
    removeTypingIndicator();
    addChatMessage(data.response, false);
    chatHistory.push({ role: 'assistant', content: data.response });
  } catch (error) {
    console.error('Chatbot error:', error);
    removeTypingIndicator();
    addChatMessage('Sorry, I encountered an error. Please try again.', false);
  } finally {
    chatbotSend.disabled = false;
    chatbotInput.disabled = false;
    chatbotInput.focus();
  }
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
  // Initialize
  loadDashboardData();
  loadRecentTransactions();
  setupWebSocket();
  setInterval(loadDashboardData, 30000);

  // Time range selector
  document.getElementById('timeRange').addEventListener('change', (e) => {
    currentTimeRange = e.target.value;
    loadDashboardData();
    loadRecentTransactions();
  });

  // Export CSV
  document.getElementById('exportBtn').addEventListener('click', () => {
    const rows = [['Time', 'TX ID', 'User', 'Amount', 'Type', 'Channel', 'Risk Score']];
    document.querySelectorAll('#txTbody tr').forEach(tr => {
      const cols = [...tr.querySelectorAll('td')].map(td => td.textContent.trim());
      rows.push(cols);
    });
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transactions_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '_')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  });

  // Transaction filter
  document.getElementById('txFilter').addEventListener('change', () => {
    const filter = document.getElementById('txFilter').value;
    document.querySelectorAll('#txTbody tr').forEach(row => {
      const typeCell = row.children[4];
      if (!typeCell) return;
      const type = typeCell.textContent.trim().toUpperCase();
      row.style.display = (filter === 'ALL' || type === filter) ? '' : 'none';
    });
  });

  // Risk Score Modal
  document.getElementById('infoBtn').addEventListener('click', () => {
    document.getElementById('riskScoreModal').classList.add('open');
  });

  document.getElementById('closeModal').addEventListener('click', () => {
    document.getElementById('riskScoreModal').classList.remove('open');
  });

  document.getElementById('riskScoreModal').addEventListener('click', (e) => {
    if (e.target.id === 'riskScoreModal') {
      document.getElementById('riskScoreModal').classList.remove('open');
    }
  });

  // Chatbot
  document.getElementById('chatbotToggle').addEventListener('click', () => {
    const chatbotWindow = document.getElementById('chatbotWindow');
    chatbotWindow.classList.toggle('open');
    if (chatbotWindow.classList.contains('open')) {
      document.getElementById('chatbotInput').focus();
    }
  });

  document.getElementById('chatbotClose').addEventListener('click', () => {
    document.getElementById('chatbotWindow').classList.remove('open');
  });

  document.getElementById('chatbotSend').addEventListener('click', sendChatMessage);

  document.getElementById('chatbotInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      sendChatMessage();
    }
  });
});
