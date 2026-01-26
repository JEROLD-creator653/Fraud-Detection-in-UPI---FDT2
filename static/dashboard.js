// UPI Fraud Detection Dashboard - Main JavaScript
// Modularized for better maintainability

console.log('=== Dashboard.js loading ===');

// Global state
let currentTimeRange = '24h';
let txCache = window.txCache || [];
let chatHistory = [];
let sortState = window.sortState || { column: 'time', direction: 'desc' };
let useServerTimeline = false; // prefer server-provided timeline when available
// Prevent stale server responses from overwriting live UI increments
let lastServerTotal = null;
// Track when the time range changes so server should be authoritative
let _rangeChanged = false;
// Simple debounce utility for bursty websocket updates (minimal delay for instant feedback)
const _debounceTimers = {};
function debounce(key, fn, delay = 50) {
  clearTimeout(_debounceTimers[key]);
  _debounceTimers[key] = setTimeout(fn, delay);
}

// Chart objects - will be initialized on DOMContentLoaded
let timelineChart, riskPie, fraudBar;

// Sort table function - MUST be defined immediately for onclick handlers
console.log('Defining window.sortTable...');
window.sortTable = function(column) {
  console.log('✓✓✓ REAL sortTable called with column:', column);
  console.log('Current sortState:', sortState);
  console.log('txCache length:', txCache.length);
  
  // Toggle direction if same column, otherwise default to descending
  if (sortState.column === column) {
    sortState.direction = sortState.direction === 'asc' ? 'desc' : 'asc';
  } else {
    sortState.column = column;
    sortState.direction = 'desc';
  }

  console.log('New sortState:', sortState);

  // Update arrow indicators - remove all active classes first
  document.querySelectorAll('.sort-arrow').forEach(arrow => {
    arrow.classList.remove('active-asc', 'active-desc');
  });
  
  // Add appropriate classes based on sort direction
  const arrows = document.querySelectorAll(`.sort-arrow[data-column="${column}"]`);
  arrows.forEach(arrow => {
    if (sortState.direction === 'asc') {
      arrow.classList.add('active-asc');
    } else {
      arrow.classList.add('active-desc');
    }
  });
  
  console.log('Arrows updated for column:', column, 'direction:', sortState.direction);

  // Sort the cache
  txCache.sort((a, b) => {
    let aVal, bVal;

    switch (column) {
      case 'time':
        aVal = new Date(a.ts || a.created_at || a.timestamp || 0).getTime();
        bVal = new Date(b.ts || b.created_at || b.timestamp || 0).getTime();
        break;
      case 'user':
        aVal = (a.user_id || a.user || '').toLowerCase();
        bVal = (b.user_id || b.user || '').toLowerCase();
        break;
      case 'amount':
        aVal = Number(a.amount || 0);
        bVal = Number(b.amount || 0);
        break;
      case 'type':
        aVal = (a.action || a.tx_type || a.type || '').toLowerCase();
        bVal = (b.action || b.tx_type || b.type || '').toLowerCase();
        break;
      case 'channel':
        aVal = (a.channel || '').toLowerCase();
        bVal = (b.channel || '').toLowerCase();
        break;
      case 'risk':
        aVal = Number(a.risk_score ?? a.risk ?? 0);
        bVal = Number(b.risk_score ?? b.risk ?? 0);
        break;
      case 'confidence':
        const confOrder = { 'high': 1, 'medium': 2, 'low': 3 };
        aVal = confOrder[(a.confidence_level || 'HIGH').toLowerCase()] || 1;
        bVal = confOrder[(b.confidence_level || 'HIGH').toLowerCase()] || 1;
        break;
      default:
        return 0;
    }

    if (aVal < bVal) return sortState.direction === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortState.direction === 'asc' ? 1 : -1;
    return 0;
  });

  console.log('Table sorted, calling renderTransactionTable');
  // Re-render the table
  renderTransactionTable();
  console.log('renderTransactionTable completed');
};

console.log('✓ sortTable function defined on window');

// Utility functions
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

// User-facing simplified reason (no model details, no scores)
function getSimplifiedReason(tx) {
  const action = String(tx.action || '').toUpperCase();
  if (action === 'BLOCK') return 'Transaction blocked for security reasons.';
  if (action === 'DELAY') return 'Transaction delayed due to unusual activity.';
  return 'Transaction processed successfully.';
}

function confidencePill(level) {
  const lvl = (level || 'HIGH').toUpperCase();
  const style = lvl === 'LOW'
    ? 'bg-red-50 text-red-700 border border-red-100'
    : lvl === 'MEDIUM'
      ? 'bg-yellow-50 text-yellow-700 border border-yellow-100'
      : 'bg-green-50 text-green-700 border border-green-100';
  return `<span class="px-2 py-0.5 rounded-full text-[10px] font-semibold ${style}">${lvl}</span>`;
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

function formatTimelineLabel(raw, range) {
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw;
  if (range === '1h' || range === '24h') {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleDateString([], { month: 'short', day: '2-digit' });
}

// Initialize charts after DOM is ready
function initCharts() {
  const isDarkMode = document.body.classList.contains('dark-mode');
  const textColor = isDarkMode ? '#e5e7eb' : '#374151';
  const gridColor = isDarkMode ? 'rgba(71, 85, 105, 0.3)' : 'rgba(229, 231, 235, 0.8)';

  timelineChart = new Chart(document.getElementById('timelineChart').getContext('2d'), {
    type: 'line',
    data: {
      labels: [],
      datasets: [
        { label: 'Blocked', data: [], borderColor: '#EF4444', tension: 0.3, fill: false },
        { label: 'Delayed', data: [], borderColor: '#F59E0B', tension: 0.3, fill: false },
        { label: 'Allowed', data: [], borderColor: '#10B981', tension: 0.3, fill: false }
      ]
    },
    options: { 
      responsive: true, 
      maintainAspectRatio: true, 
      scales: { 
        x: {
          ticks: { color: textColor },
          grid: { color: gridColor }
        }, 
        y: { 
          beginAtZero: true,
          ticks: { color: textColor },
          grid: { color: gridColor }
        }
      },
      plugins: {
        legend: {
          labels: { color: textColor }
        }
      },
      animation: {
        duration: 0 // Disable animations
      }
    }
  });

  riskPie = new Chart(document.getElementById('riskPie').getContext('2d'), {
    type: 'pie',
    data: {
      labels: ['Low', 'Medium', 'High', 'Critical'],
      datasets: [{
        // Data populated live from txCache to keep the chart data-driven
        data: [0, 0, 0, 0],
        backgroundColor: ['#6BCF7F', '#FFD93D', '#FF9F40', '#FF6B6B']
      }]
    },
    options: { 
      responsive: true, 
      maintainAspectRatio: true,
      plugins: {
        legend: {
          labels: { color: textColor }
        }
      },
      animation: {
        duration: 0 // Disable animations
      }
    }
  });

  fraudBar = new Chart(document.getElementById('fraudBar').getContext('2d'), {
    type: 'bar',
    data: {
      labels: ['Amount Anomaly', 'Behavioural Anomaly', 'Device Anomaly', 'Velocity Anomaly', 'Model Consensus', 'Model Disagreement'],
      datasets: [{
        label: 'Count',
        data: [0, 0, 0, 0, 0, 0],
        backgroundColor: ['#FF6B6B', '#FF9F40', '#FFD93D', '#6BCF7F', '#4ECDC4', '#A78BFA']
      }]
    },
    options: { 
      indexAxis: 'y', 
      responsive: true, 
      maintainAspectRatio: true,
      scales: {
        x: {
          ticks: { color: textColor },
          grid: { color: gridColor }
        },
        y: {
          ticks: { color: textColor },
          grid: { color: gridColor }
        }
      },
      plugins: {
        legend: {
          labels: { color: textColor }
        }
      },
      animation: {
        duration: 0 // Disable animations
      }
    }
  });
}

// Data loading functions
async function loadDashboardData() {
  try {
    const res = await fetch(`/dashboard-data?time_range=${currentTimeRange}&_=${Date.now()}`);
    if (!res.ok) throw new Error('fetch dashboard failed');

    const j = await res.json();
    const s = j.stats || {};

    // Use max(current UI, serverTotal) to avoid overwriting live increments with a slightly stale value
    const serverTotal = Number(s.totalTransactions || 0);
    lastServerTotal = serverTotal;
    const totalEl = document.getElementById('totalTx');
    if (totalEl) {
      const currentVal = parseInt(String(totalEl.textContent || '0').replace(/[,\s]/g, ''), 10) || 0;
      if (_rangeChanged) {
        // When the range changes, trust the server value exactly
        totalEl.textContent = serverTotal.toLocaleString();
        _rangeChanged = false;
      } else {
        const nextVal = Math.max(currentVal, serverTotal);
        totalEl.textContent = nextVal.toLocaleString();
      }
    }
    document.getElementById('blockedTx').textContent = Number(s.blocked || 0).toLocaleString();
    document.getElementById('delayedTx').textContent = Number(s.delayed || 0).toLocaleString();
    document.getElementById('allowedTx').textContent = Number(s.allowed || 0).toLocaleString();

    // Update time range label in the first card (the <p> after #totalTx is the static label)
    const totalTxCard = document.getElementById('totalTx')?.closest('.card');
    const timeLabel = totalTxCard?.querySelector('p.text-xs.text-gray-500');
    if (timeLabel) {
      timeLabel.textContent = getRangeLabel(currentTimeRange);
    }
  } catch (e) {
    console.error('loadDashboardData error', e);
  }
}

async function loadPatternAnalytics() {
  try {
    const res = await fetch(`/pattern-analytics?time_range=${currentTimeRange}&_=${Date.now()}`);
    if (!res.ok) {
      console.warn('Pattern analytics fetch failed, leaving existing chart data intact');
      return;
    }

    const data = await res.json();
    
    // Update fraud pattern chart with real aggregated data from backend
    if (fraudBar) {
      fraudBar.data.datasets[0].data = [
        data.amount_anomaly || 0,
        data.behavioural_anomaly || 0,
        data.device_anomaly || 0,
        data.velocity_anomaly || 0,
        data.model_consensus || 0,
        data.model_disagreement || 0
      ];
      fraudBar.update('none');
    }
  } catch (e) {
    console.error('loadPatternAnalytics error, leaving existing chart data intact:', e);
  }
}

async function loadModelAccuracy() {
  try {
    const res = await fetch(`/model-accuracy?_=${Date.now()}`);
    if (!res.ok) {
      console.warn('Model accuracy fetch failed');
      return;
    }

    const data = await res.json();
    
    // Update model accuracy displays
    const rfEl = document.getElementById('rfAccuracy');
    const xgbEl = document.getElementById('xgbAccuracy');
    const ifEl = document.getElementById('iforestAccuracy');
    const ensembleEl = document.getElementById('ensembleAccuracy');
    
    if (rfEl) rfEl.textContent = `${data.random_forest}%`;
    if (xgbEl) xgbEl.textContent = `${data.xgboost}%`;
    if (ifEl) ifEl.textContent = `${data.isolation_forest}%`;
    if (ensembleEl) ensembleEl.textContent = `${data.ensemble}%`;
  } catch (e) {
    console.error('loadModelAccuracy error:', e);
  }
}

function getLimitForRange(range) {
  switch (range) {
    case '1h':
      return 50; // finer granularity
    case '24h':
      return 300; // enough to populate hourly buckets
    case '7d':
      return 1500; // larger window for week view
    case '30d':
      return 3000; // month view aggregation
    default:
      return 200;
  }
}

async function loadRecentTransactions() {
  try {
    const limit = getLimitForRange(currentTimeRange);
    const res = await fetch(`/recent-transactions?limit=${limit}&time_range=${currentTimeRange}&_=${Date.now()}`);
    if (!res.ok) throw new Error('fetch recent failed');

    const j = await res.json();
    txCache = Array.isArray(j.transactions) ? j.transactions : [];

    // Sort and render table
    if (window.sortTable) {
      window.sortTable(sortState.column);
    } else {
      renderTransactionTable();
    }

    // Immediately update charts from fresh cache data, including realtime timeline
    updateHighRiskAlerts(txCache);
    updateTimelineFromCache();
    updateRiskDistributionFromCache();
  } catch (e) {
    console.error('loadRecentTransactions error', e);
  }
}

// Aggregated analytics for charts
async function loadDashboardAnalytics() {
  try {
    const res = await fetch(`/dashboard-analytics?time_range=${currentTimeRange}&_=${Date.now()}`);
    if (!res.ok) throw new Error('fetch analytics failed');

    const data = await res.json();
    
    // DISABLED server timeline - using client-side cache timeline for consistency
    // This prevents dual updates that overwrite each other
    console.log('Server analytics loaded, but using client-side timeline generation');
    
  } catch (e) {
    console.error('loadDashboardAnalytics error', e);
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
    const channel = o.channel || 'N/A';
    const risk = Number(o.risk_score ?? o.risk ?? 0).toFixed(2);
    const confidence = confidencePill(o.confidence_level);

  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td class="px-3 py-2">${fmtTS(ts)}</td>
    <td class="px-3 py-2">${txid}</td>
    <td class="px-3 py-2">${user}</td>
    <td class="px-3 py-2">₹${Number(amount || 0).toFixed(2)}</td>
    <td class="px-3 py-2">${type}</td>
    <td class="px-3 py-2">${channel}</td>
    <td class="px-3 py-2 font-medium text-gray-700">${risk}</td>
      <td class="px-3 py-2">${confidence}</td>
  `;
  // Tooltip with simplified reason only (no model names / scores)
  tr.title = getSimplifiedReason(o);
  return tr;
}

// Render transaction table from cache
function renderTransactionTable() {
  const tbody = document.getElementById('txTbody');
  if (!tbody) return;
  tbody.innerHTML = '';
  
  // Apply filter if set
  const filter = document.getElementById('txFilter')?.value || 'ALL';
  const filteredTx = filter === 'ALL' 
    ? txCache 
    : txCache.filter(tx => (tx.action || tx.tx_type || tx.type || '') === filter);
  
  filteredTx.forEach(tx => tbody.appendChild(makeTxRow(tx)));
}

// Chart update functions
function updateRiskDistributionFromCache() {
  if (!riskPie || !Array.isArray(txCache) || txCache.length === 0) {
    // Clear chart if no data or chart doesn't exist
    if (riskPie) {
      riskPie.data.datasets[0].data = [0, 0, 0, 0];
      riskPie.update('none');
    }
    return;
  }

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
  if (!timelineChart || !Array.isArray(txCache)) return;

  const buckets = {};
  const labelDates = []; // Store dates with their string labels for proper sorting
  let labelFormat;

  // Determine label format based on time range
  if (currentTimeRange === '1h') {
    labelFormat = 'time'; // HH:MM format
  } else if (currentTimeRange === '24h') {
    labelFormat = 'time_1h'; // 1-hour interval format
  } else if (currentTimeRange === '7d') {
    labelFormat = 'date'; // MMM DD format - all 7 days
  } else if (currentTimeRange === '30d') {
    labelFormat = 'date'; // MMM DD format - all 30 days
  }

  // Generate labels for date-based views first (oldest to newest)
  if (currentTimeRange === '7d') {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let i = 6; i >= 0; i--) { // Start from 6 days ago to today
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const label = d.toLocaleDateString([], { month: 'short', day: '2-digit' });
      labelDates.push({ date: new Date(d), label });
      buckets[label] = { BLOCK: 0, DELAY: 0, ALLOW: 0 };
    }
  } else if (currentTimeRange === '30d') {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let i = 29; i >= 0; i--) { // Start from 29 days ago to today
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const label = d.toLocaleDateString([], { month: 'short', day: '2-digit' });
      labelDates.push({ date: new Date(d), label });
      buckets[label] = { BLOCK: 0, DELAY: 0, ALLOW: 0 };
    }
  } else if (currentTimeRange === '24h') {
    // Generate 24 hourly labels (oldest to newest)
    const now = new Date();
    for (let i = 23; i >= 0; i--) {
      const d = new Date(now);
      d.setHours(d.getHours() - i);
      d.setMinutes(0, 0, 0);
      const hour = String(d.getHours()).padStart(2, '0');
      const label = `${hour}:00`;
      labelDates.push({ date: new Date(d), label });
      buckets[label] = { BLOCK: 0, DELAY: 0, ALLOW: 0 };
    }
  }

  // Process transactions and match to buckets
  if (Array.isArray(txCache) && txCache.length > 0) {
    txCache.forEach(tx => {
      const ts = new Date(tx.ts || tx.created_at || tx.timestamp);
      if (isNaN(ts)) return;

      let key;
      if (labelFormat === 'time') {
        // For 1h: Show exact time (HH:MM)
        key = ts.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        if (!buckets[key]) {
          buckets[key] = { BLOCK: 0, DELAY: 0, ALLOW: 0 };
          labelDates.push({ date: ts, label: key });
        }
      } else if (labelFormat === 'time_1h') {
        // For 24h: Group into hourly buckets
        const hour = ts.getHours();
        const label = String(hour).padStart(2, '0') + ':00';
        key = label;
      } else if (labelFormat === 'date') {
        // For 7d and 30d: Show date (MMM DD)
        key = ts.toLocaleDateString([], { month: 'short', day: '2-digit' });
      }

      const action = (tx.action || '').toUpperCase();
      if (buckets[key]) {
        if (buckets[key][action] !== undefined) {
          buckets[key][action]++;
        }
      }
    });
  }

  // Extract labels in chronological order
  const labels = labelDates.map(item => item.label);

  // Update chart
  if (timelineChart) {
    timelineChart.data.labels = labels;
    timelineChart.data.datasets[0].data = labels.map(l => buckets[l]?.BLOCK || 0);
    timelineChart.data.datasets[1].data = labels.map(l => buckets[l]?.DELAY || 0);
    timelineChart.data.datasets[2].data = labels.map(l => buckets[l]?.ALLOW || 0);
    timelineChart.update('none');
  }
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
      const reason = getSimplifiedReason(tx);
      const confidence = String(tx.confidence_level || '').toUpperCase();
      const confidenceTag = confidencePill(confidence);
      const lowWarn = confidence === 'LOW' ? '<span class="text-xs text-red-700 font-semibold ml-1">⚠ low confidence</span>' : '';
      div.innerHTML = `
        <div class="font-semibold">${tx.tx_id}</div>
        <div>User: ${tx.user_id}</div>
        <div>Amount: ₹${Number(tx.amount).toFixed(2)}</div>
        <div>Action: ${tx.action}</div>
        <div class="flex items-center gap-2">Confidence: ${confidenceTag} ${lowWarn}</div>
        <div>Reason: ${reason}</div>
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

        renderTransactionTable();

        // Immediate chart updates with no debounce for instant visual feedback
        updateHighRiskAlerts(txCache);
        // Always push realtime updates to the timeline from cache
        updateTimelineFromCache();
        updateRiskDistributionFromCache();

        // Immediately reflect the new transaction in the total card
        try {
          const totalEl = document.getElementById('totalTx');
          if (totalEl) {
            const currentVal = parseInt(String(totalEl.textContent || '0').replace(/[,\s]/g, ''), 10) || 0;
            const newVal = currentVal + 1;
            totalEl.textContent = newVal.toLocaleString();
          }
        } catch (e) {
          console.warn('Inline totalTx update failed, will refresh via API', e);
        }

        // Minimal debounce for backend refreshes (charts already updated from cache)
        debounce('dashboardData', () => loadDashboardData(), 100);
        debounce('patternAnalytics', () => loadPatternAnalytics(), 150);
      }

      if (msgType === 'tx_updated') {
        loadRecentTransactions();
        debounce('dashboardData', () => loadDashboardData(), 100);
        debounce('patternAnalytics', () => loadPatternAnalytics(), 150);
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
  // Initialize dark mode from localStorage FIRST (before charts)
  const darkMode = localStorage.getItem('darkMode') === 'true';
  if (darkMode) {
    document.body.classList.add('dark-mode');
    updateDarkModeButton(true);
  }

  // Initialize charts AFTER dark mode is set
  initCharts();

  // Initialize
  loadDashboardData();
  loadRecentTransactions();
  loadDashboardAnalytics(); // server aggregated timeline for full range coverage
  loadPatternAnalytics();
  loadModelAccuracy(); // Load model performance metrics
  setupWebSocket();
  setInterval(loadDashboardData, 30000);
  setInterval(loadPatternAnalytics, 30000); // Refresh patterns every 30s

  // Time range selector - optimized for instant updates
  document.getElementById('timeRange').addEventListener('change', async (e) => {
    currentTimeRange = e.target.value;
    _rangeChanged = true;
    
    // Fetch all data in parallel for fastest response
    await Promise.all([
      loadDashboardData(),
      loadRecentTransactions(),
      loadDashboardAnalytics(),
      loadPatternAnalytics()
    ]);
  });

  // Export CSV
  document.getElementById('exportBtn').addEventListener('click', () => {
    const rows = [['Time', 'TX ID', 'User', 'Amount', 'Type', 'Channel', 'Risk Score', 'Confidence']];
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
    renderTransactionTable();
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

  // Fraud Pattern Modal
  document.getElementById('fraudPatternInfoBtn').addEventListener('click', () => {
    document.getElementById('fraudPatternModal').classList.add('open');
  });

  document.getElementById('closeFraudPatternModal').addEventListener('click', () => {
    document.getElementById('fraudPatternModal').classList.remove('open');
  });

  document.getElementById('fraudPatternModal').addEventListener('click', (e) => {
    if (e.target.id === 'fraudPatternModal') {
      document.getElementById('fraudPatternModal').classList.remove('open');
    }
  });

  // Risk Distribution Modal
  document.getElementById('riskDistInfoBtn').addEventListener('click', () => {
    document.getElementById('riskDistModal').classList.add('open');
  });

  document.getElementById('closeRiskDistModal').addEventListener('click', () => {
    document.getElementById('riskDistModal').classList.remove('open');
  });

  document.getElementById('riskDistModal').addEventListener('click', (e) => {
    if (e.target.id === 'riskDistModal') {
      document.getElementById('riskDistModal').classList.remove('open');
    }
  });

  // Model Performance Metrics Modal
  document.getElementById('modelMetricsInfoBtn').addEventListener('click', () => {
    document.getElementById('modelMetricsModal').classList.add('open');
  });

  document.getElementById('closeModelMetricsModal').addEventListener('click', () => {
    document.getElementById('modelMetricsModal').classList.remove('open');
  });

  document.getElementById('modelMetricsModal').addEventListener('click', (e) => {
    if (e.target.id === 'modelMetricsModal') {
      document.getElementById('modelMetricsModal').classList.remove('open');
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

  // Dark mode toggle
  document.getElementById('darkModeToggle').addEventListener('click', () => {
    const isDarkMode = document.body.classList.toggle('dark-mode');
    localStorage.setItem('darkMode', isDarkMode);
    updateDarkModeButton(isDarkMode);
    updateChartColors(isDarkMode);
  });
});

// Update chart colors for dark mode
function updateChartColors(isDarkMode) {
  const textColor = isDarkMode ? '#e5e7eb' : '#374151';
  const gridColor = isDarkMode ? 'rgba(71, 85, 105, 0.3)' : 'rgba(229, 231, 235, 0.8)';

  // Update timeline chart
  if (timelineChart) {
    timelineChart.options.scales.x.ticks.color = textColor;
    timelineChart.options.scales.x.grid.color = gridColor;
    timelineChart.options.scales.y.ticks.color = textColor;
    timelineChart.options.scales.y.grid.color = gridColor;
    timelineChart.options.plugins.legend.labels.color = textColor;
    timelineChart.update();
  }

  // Update risk pie chart
  if (riskPie) {
    riskPie.options.plugins.legend.labels.color = textColor;
    riskPie.update();
  }

  // Update fraud bar chart
  if (fraudBar) {
    fraudBar.options.scales.x.ticks.color = textColor;
    fraudBar.options.scales.x.grid.color = gridColor;
    fraudBar.options.scales.y.ticks.color = textColor;
    fraudBar.options.scales.y.grid.color = gridColor;
    fraudBar.options.plugins.legend.labels.color = textColor;
    fraudBar.update();
  }
}

// Dark mode button text updater
function updateDarkModeButton(isDarkMode) {
  const btn = document.getElementById('darkModeToggle');
  if (isDarkMode) {
    btn.textContent = '☀️ Light';
    btn.style.background = 'linear-gradient(to right, #f59e0b, #eab308)';
    btn.style.color = '#ffffff';
  } else {
    btn.textContent = '🌙 Dark';
    btn.style.background = 'linear-gradient(to right, #4f46e5, #3b82f6)';
    btn.style.color = '#ffffff';
  }
}
