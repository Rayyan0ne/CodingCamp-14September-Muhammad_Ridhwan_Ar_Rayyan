/**
 * ============================================================
 * KrayBudget — app.js
 * Vanilla JavaScript, no frameworks, no build tools.
 * All data persists in localStorage.
 * ============================================================
 */

/* ─── Constants & Config ─────────────────────────────────── */

const LS_TRANSACTIONS = 'ebv_transactions';
const LS_CATEGORIES   = 'ebv_categories';
const LS_THEME        = 'ebv_theme';
const LS_BUDGET_LIMIT = 'ebv_budget_limit';

const DEFAULT_CATEGORIES = ['Food', 'Transport', 'Fun'];

/**
 * Color palette for categories (cyclic assignment).
 * These are the CSS variable hex values — we replicate them here
 * so Chart.js can consume them directly.
 */
const CATEGORY_COLORS = [
  '#00F0FF', // cyan
  '#A855F7', // violet
  '#22FFA1', // green
  '#FFB830', // amber
  '#FF3D5A', // red
  '#38BDF8', // sky
  '#F472B6', // pink
  '#A3E635', // lime
];

/* ─── State ──────────────────────────────────────────────── */

let state = {
  transactions: [],   // { id, name, amount, category, createdAt }
  categories:   [],   // string[]
  theme:        'dark',
  sortMode:     'date', // 'date' | 'amount-desc' | 'amount-asc' | 'category'
  chart:        null,  // Chart.js instance
  budgetLimit:  0,     // spending budget limit in Rp (0 = no limit)
};

/* ─── Utility: Generate unique ID ───────────────────────── */

function generateId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/* ─── Utility: Format currency (Rupiah) ─────────────────── */

function formatRp(amount) {
  return new Intl.NumberFormat('id-ID', {
    style:                 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.round(amount));
}

/* ─── Utility: Format date ──────────────────────────────── */

function formatDate(ts) {
  return new Intl.DateTimeFormat('id-ID', {
    day:   '2-digit',
    month: 'short',
    hour:  '2-digit',
    minute:'2-digit',
  }).format(new Date(ts));
}

/* ─── Utility: Format / Parse amount input fields ───────── */

/**
 * Converts a raw number to the "Rp X.XXX" display string.
 * e.g. 1500000 → "Rp 1.500.000"
 */
function formatAmountInput(value) {
  if (value === '' || value === null || value === undefined) return '';
  const num = Math.floor(Math.abs(Number(value)));
  if (isNaN(num)) return '';
  return 'Rp ' + num.toLocaleString('id-ID');
}

/**
 * Strips "Rp ", dots (thousand separators) and returns a float.
 * e.g. "Rp 1.500.000" → 1500000
 */
function parseAmountInput(str) {
  if (!str) return NaN;
  // Remove "Rp" prefix and all dots (id-ID thousand separator)
  const cleaned = str.replace(/Rp\s*/i, '').replace(/\./g, '').replace(/,/g, '').trim();
  return parseFloat(cleaned);
}

/**
 * Applies live "Rp X.XXX" formatting to an input element while the
 * user is typing. Preserves cursor position.
 */
function attachAmountFormatter(inputEl) {
  inputEl.addEventListener('input', () => {
    const raw = inputEl.value;
    // Strip everything except digits
    const digits = raw.replace(/[^0-9]/g, '');

    if (digits === '') {
      inputEl.value = '';
      return;
    }

    const num = parseInt(digits, 10);
    inputEl.value = formatAmountInput(num);
  });

  // On focus: if empty placeholder showing, leave blank for easier entry
  inputEl.addEventListener('focus', () => {
    if (inputEl.value === '') inputEl.placeholder = 'Rp 0';
  });

  // On blur: if empty, clear back to empty (placeholder takes over)
  inputEl.addEventListener('blur', () => {
    if (inputEl.value.replace(/[^0-9]/g, '') === '') {
      inputEl.value = '';
    }
  });
}

/* ─── Utility: Get category color ──────────────────────── */

function getCategoryColor(categoryName) {
  const idx = state.categories.indexOf(categoryName);
  return CATEGORY_COLORS[idx % CATEGORY_COLORS.length];
}

/* ─── Utility: Lighten/darken hex for badge background ─── */

function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/* ─── localStorage helpers ──────────────────────────────── */

function saveTransactions() {
  localStorage.setItem(LS_TRANSACTIONS, JSON.stringify(state.transactions));
}

function saveCategories() {
  localStorage.setItem(LS_CATEGORIES, JSON.stringify(state.categories));
}

function saveTheme() {
  localStorage.setItem(LS_THEME, state.theme);
}

function loadFromStorage() {
  const rawTx  = localStorage.getItem(LS_TRANSACTIONS);
  const rawCat = localStorage.getItem(LS_CATEGORIES);
  const rawTheme = localStorage.getItem(LS_THEME);

  state.transactions = rawTx  ? JSON.parse(rawTx)  : [];
  state.categories   = rawCat ? JSON.parse(rawCat) : [...DEFAULT_CATEGORIES];
  state.theme        = rawTheme || 'dark';

  const rawLimit    = localStorage.getItem(LS_BUDGET_LIMIT);
  state.budgetLimit = rawLimit ? parseFloat(rawLimit) : 0;
}

/* ─── DOM Refs ──────────────────────────────────────────── */

const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

const balanceDisplay    = $('#balance-display');
const balanceSub        = $('#balance-sub-text');
const txForm            = $('#transaction-form');
const inputName         = $('#input-name');
const inputAmount       = $('#input-amount');
const inputCategory     = $('#input-category');
const inputCustomCat    = $('#input-custom-category');
const btnAddCat         = $('#btn-add-category');
const btnSubmit         = $('#btn-submit');
const txList            = $('#transaction-list');
const emptyState        = $('#empty-state');
const txCount           = $('#transaction-count');
const chartCanvas       = $('#spending-chart');
const chartCenterAmount = $('#chart-center-amount');
const chartEmptyEl      = $('#chart-empty');
const chartLegendEl     = $('#chart-legend');
const themeToggle       = $('#theme-toggle');
const toastContainer       = $('#toast-container');
const inputBudgetLimit     = $('#input-budget-limit');
const btnSetLimit          = $('#btn-set-limit');
const limitBarFill         = $('#limit-bar-fill');
const limitBarPct          = $('#limit-bar-pct');
const limitSpentLabel      = $('#limit-spent-label');
const limitOfLabel         = $('#limit-of-label');
const limitProgressSection = $('#limit-progress-section');
const limitWarningBanner   = $('#limit-warning-banner');
const monthlySelect        = $('#monthly-select');
const monthlyList          = $('#monthly-list');
const monthlyEmpty         = $('#monthly-empty');
const monthlyTotalRow      = $('#monthly-total-row');
const monthlyTotalAmount   = $('#monthly-total-amount');

/* ─── Count-up Animation ────────────────────────────────── */

let countUpRAF = null;

function animateCountUp(element, from, to, duration = 500) {
  if (countUpRAF) cancelAnimationFrame(countUpRAF);

  const start = performance.now();

  function tick(now) {
    const elapsed  = now - start;
    const progress = Math.min(elapsed / duration, 1);
    // Ease-out cubic
    const eased    = 1 - Math.pow(1 - progress, 3);
    const current  = from + (to - from) * eased;

    element.textContent = formatRp(current);

    if (progress < 1) {
      countUpRAF = requestAnimationFrame(tick);
    } else {
      element.textContent = formatRp(to);
      countUpRAF = null;
    }
  }

  countUpRAF = requestAnimationFrame(tick);
}

/* ─── Balance Render ────────────────────────────────────── */

let previousBalance = 0;

function renderBalance() {
  const total = state.transactions.reduce((sum, t) => sum + t.amount, 0);

  // Animate count-up from previous to new value
  animateCountUp(balanceDisplay, previousBalance, total, 600);
  previousBalance = total;

  // Pulse effect
  balanceDisplay.classList.remove('pulse');
  void balanceDisplay.offsetWidth; // force reflow
  balanceDisplay.classList.add('pulse');

  // Color
  balanceDisplay.classList.toggle('danger',  total < 0);
  balanceDisplay.classList.toggle('healthy', total >= 0);

  // Sub-text
  if (state.transactions.length === 0) {
    balanceSub.textContent = 'No transactions yet';
  } else {
    balanceSub.textContent = `${state.transactions.length} transaction${state.transactions.length !== 1 ? 's' : ''} recorded`;
  }

  // Re-evaluate budget limit on every balance update
  checkBudgetLimit();
}

/* ─── Budget Limit ───────────────────────────────────────── */

function checkBudgetLimit() {
  const total = state.transactions.reduce((sum, t) => sum + t.amount, 0);
  const limit = state.budgetLimit;

  // Update progress bar
  if (limitProgressSection) {
    if (limit > 0) {
      limitProgressSection.style.display = '';
      const raw = (total / limit) * 100;
      const pct = Math.min(raw, 100);
      limitBarFill.style.width        = `${pct.toFixed(1)}%`;
      limitBarFill.className          = 'limit-bar-fill' +
        (raw >= 100 ? ' over' : raw >= 80 ? ' warning' : '');
      limitBarPct.textContent         = `${raw.toFixed(1)}%`;
      limitSpentLabel.textContent     = `Rp ${formatRp(total)}`;
      limitOfLabel.textContent        = `/ Rp ${formatRp(limit)}`;
    } else {
      limitProgressSection.style.display = 'none';
    }
  }

  // Warning banner & over-limit visual
  const isOver = limit > 0 && total >= limit;
  if (limitWarningBanner) {
    limitWarningBanner.setAttribute('aria-hidden', String(!isOver));
    if (isOver) {
      const warningText = document.getElementById('limit-warning-text');
      if (warningText) warningText.textContent = `Melebihi budget sebesar Rp ${formatRp(total - limit)}!`;
    }
  }
  if (chartCenterAmount) {
    chartCenterAmount.classList.toggle('over-limit', isOver);
  }
}

function renderBudgetLimitUI() {
  if (inputBudgetLimit) {
    inputBudgetLimit.value = state.budgetLimit > 0 ? formatAmountInput(state.budgetLimit) : '';
  }
  checkBudgetLimit();
}

/* ─── Monthly Summary ────────────────────────────────────── */

function renderMonthlySummary() {
  if (!monthlySelect || !monthlyList) return;

  // Collect unique YYYY-MM keys from transactions
  const months = new Set();
  state.transactions.forEach(tx => {
    const d   = new Date(tx.createdAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    months.add(key);
  });

  const sortedMonths = [...months].sort((a, b) => b.localeCompare(a));
  const prevVal      = monthlySelect.value;
  monthlySelect.innerHTML = '';

  if (sortedMonths.length === 0) {
    const opt       = document.createElement('option');
    opt.value       = '';
    opt.textContent = 'Belum ada data';
    monthlySelect.appendChild(opt);
  } else {
    sortedMonths.forEach(key => {
      const [yr, mo] = key.split('-');
      const label    = new Date(parseInt(yr), parseInt(mo) - 1, 1)
        .toLocaleString('id-ID', { month: 'long', year: 'numeric' });
      const opt       = document.createElement('option');
      opt.value       = key;
      opt.textContent = label;
      monthlySelect.appendChild(opt);
    });

    const now    = new Date();
    const curKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    if (prevVal && sortedMonths.includes(prevVal)) {
      monthlySelect.value = prevVal;
    } else if (sortedMonths.includes(curKey)) {
      monthlySelect.value = curKey;
    } else {
      monthlySelect.value = sortedMonths[0];
    }
  }

  renderMonthlyBreakdown();
}

function renderMonthlyBreakdown() {
  if (!monthlyList) return;

  const selectedKey = monthlySelect ? monthlySelect.value : '';
  monthlyList.innerHTML = '';

  if (!selectedKey) {
    if (monthlyEmpty)    monthlyEmpty.style.display    = '';
    if (monthlyTotalRow) monthlyTotalRow.style.display = 'none';
    return;
  }

  const [yr, mo] = selectedKey.split('-');
  const txMonth  = state.transactions.filter(tx => {
    const d = new Date(tx.createdAt);
    return d.getFullYear() === parseInt(yr) && (d.getMonth() + 1) === parseInt(mo);
  });

  if (txMonth.length === 0) {
    if (monthlyEmpty)    monthlyEmpty.style.display    = '';
    if (monthlyTotalRow) monthlyTotalRow.style.display = 'none';
    return;
  }

  if (monthlyEmpty)    monthlyEmpty.style.display    = 'none';
  if (monthlyTotalRow) monthlyTotalRow.style.display = '';

  // Aggregate by category
  const catTotals = {};
  txMonth.forEach(tx => {
    catTotals[tx.category] = (catTotals[tx.category] || 0) + tx.amount;
  });

  const total   = Object.values(catTotals).reduce((a, b) => a + b, 0);
  const entries = Object.entries(catTotals).sort((a, b) => b[1] - a[1]);

  entries.forEach(([cat, amt]) => {
    const color = getCategoryColor(cat);
    const pct   = total > 0 ? ((amt / total) * 100).toFixed(1) : '0.0';
    const li    = document.createElement('li');
    li.className = 'monthly-item';
    li.innerHTML = `
      <span class="monthly-dot" style="background:${color};"></span>
      <span class="monthly-cat-name">${escapeHtml(cat)}</span>
      <span class="monthly-cat-pct">${pct}%</span>
      <span class="monthly-cat-amount">Rp ${formatRp(amt)}</span>
    `;
    monthlyList.appendChild(li);
  });

  if (monthlyTotalAmount) monthlyTotalAmount.textContent = `Rp ${formatRp(total)}`;
}

/* ─── Category Select Render ────────────────────────────── */

function renderCategorySelect() {
  inputCategory.innerHTML = '';
  state.categories.forEach(cat => {
    const opt = document.createElement('option');
    opt.value = cat;
    opt.textContent = cat;
    inputCategory.appendChild(opt);
  });
}

/* ─── Transaction Item HTML builder ─────────────────────── */

function buildTransactionItem(tx) {
  const color = getCategoryColor(tx.category);
  const li = document.createElement('li');
  li.className = 'transaction-item entering';
  li.dataset.id = tx.id;

  li.innerHTML = `
    <span class="cat-dot" style="color:${color}; background:${color};" aria-hidden="true"></span>
    <div class="item-info">
      <div class="item-name" title="${escapeHtml(tx.name)}">${escapeHtml(tx.name)}</div>
      <div class="item-meta">
        <span
          class="item-category-badge"
          style="background:${hexToRgba(color, 0.15)}; color:${color};"
        >${escapeHtml(tx.category)}</span>
        <span class="item-date">${formatDate(tx.createdAt)}</span>
      </div>
    </div>
    <span class="item-amount" aria-label="Amount: ${formatRp(tx.amount)} rupiah">
      Rp ${formatRp(tx.amount)}
    </span>
    <button
      class="btn-delete"
      data-id="${tx.id}"
      aria-label="Delete transaction: ${escapeHtml(tx.name)}"
      title="Delete"
    >×</button>
  `;

  // Remove entering class after animation completes
  li.addEventListener('animationend', () => li.classList.remove('entering'), { once: true });

  return li;
}

function escapeHtml(str) {
  const d = document.createElement('div');
  d.appendChild(document.createTextNode(String(str)));
  return d.innerHTML;
}

/* ─── Sort Transactions ─────────────────────────────────── */

function getSortedTransactions() {
  const sorted = [...state.transactions];
  switch (state.sortMode) {
    case 'amount-desc':
      sorted.sort((a, b) => b.amount - a.amount);
      break;
    case 'amount-asc':
      sorted.sort((a, b) => a.amount - b.amount);
      break;
    case 'category':
      sorted.sort((a, b) => a.category.localeCompare(b.category));
      break;
    case 'date':
    default:
      sorted.sort((a, b) => b.createdAt - a.createdAt);
      break;
  }
  return sorted;
}

/* ─── FLIP Animation Helper ─────────────────────────────── */

function flipAnimate(listEl) {
  // 1. Record old positions (First)
  const items  = [...listEl.children];
  const oldPos = new Map();
  items.forEach(el => {
    const rect = el.getBoundingClientRect();
    oldPos.set(el.dataset.id, rect);
  });

  return function applyFlip() {
    const newItems = [...listEl.children];
    newItems.forEach(el => {
      const old = oldPos.get(el.dataset.id);
      if (!old) return;
      const cur = el.getBoundingClientRect();
      const dy  = old.top  - cur.top;
      const dx  = old.left - cur.left;
      if (dy === 0 && dx === 0) return;

      // Apply the inverse transform (snap to old position)
      el.style.transform = `translate(${dx}px, ${dy}px)`;
      el.style.transition = 'none';

      // Force reflow, then animate to final position
      requestAnimationFrame(() => {
        el.classList.add('flipping');
        el.style.transform = '';
        el.addEventListener('transitionend', () => {
          el.classList.remove('flipping');
          el.style.transition = '';
        }, { once: true });
      });
    });
  };
}

/* ─── Transaction List Render ───────────────────────────── */

function renderTransactionList() {
  const sorted = getSortedTransactions();

  // FLIP — record positions before update
  const applyFlip = flipAnimate(txList);

  // Clear & rebuild (without entering animation for re-sorts)
  txList.innerHTML = '';
  sorted.forEach(tx => {
    const li = buildTransactionItem(tx);
    li.classList.remove('entering'); // no slide-in on re-sort
    txList.appendChild(li);
  });

  // FLIP — apply transitions from old → new positions
  requestAnimationFrame(applyFlip);

  // Update count badge
  txCount.textContent = state.transactions.length;

  // Toggle empty state
  const isEmpty = state.transactions.length === 0;
  emptyState.setAttribute('aria-hidden', String(isEmpty));
  if (!isEmpty) {
    emptyState.style.display = 'none';
  } else {
    emptyState.style.display = '';
  }
}

/* ─── Chart ─────────────────────────────────────────────── */

function buildChartData() {
  // Aggregate by category
  const totals = {};
  state.transactions.forEach(tx => {
    totals[tx.category] = (totals[tx.category] || 0) + tx.amount;
  });

  const labels  = Object.keys(totals);
  const data    = labels.map(l => totals[l]);
  const colors  = labels.map(l => getCategoryColor(l));

  return { labels, data, colors };
}

function initChart() {
  const ctx = chartCanvas.getContext('2d');
  const { labels, data, colors } = buildChartData();

  state.chart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor:      colors.map(c => hexToRgba(c, 0.85)),
        hoverBackgroundColor: colors.map(c => hexToRgba(c, 1.0)),
        borderColor:          colors,
        borderWidth:          2,
        hoverBorderWidth:     4,
        hoverOffset:          0,
      }],
    },
    options: {
      cutout:    '68%',
      animation: { duration: 600, easing: 'easeInOutQuart' },
      plugins: {
        legend: { display: false }, // We use custom legend
        tooltip: {
          backgroundColor: 'rgba(18, 24, 38, 0.95)',
          borderColor:     'rgba(0, 240, 255, 0.25)',
          borderWidth:     1,
          titleColor:      '#E8EDF4',
          bodyColor:       '#7C8AA5',
          padding:         12,
          titleFont: { family: "'Space Grotesk', sans-serif", size: 13, weight: '600' },
          bodyFont:  { family: "'JetBrains Mono', monospace", size: 12 },
          callbacks: {
            label(ctx) {
              const total   = ctx.dataset.data.reduce((a, b) => a + b, 0);
              const pct     = total > 0 ? ((ctx.parsed / total) * 100).toFixed(1) : 0;
              return ` Rp ${formatRp(ctx.parsed)}  (${pct}%)`;
            },
          },
        },
      },
    },
  });
}

function updateChart() {
  const { labels, data, colors } = buildChartData();
  const total = data.reduce((a, b) => a + b, 0);
  const isEmpty = data.length === 0;

  // Show/hide empty state
  chartEmptyEl.classList.toggle('hidden', !isEmpty);
  chartCanvas.style.visibility = isEmpty ? 'hidden' : 'visible';

  // Update center text
  chartCenterAmount.textContent = `Rp ${formatRp(total)}`;

  // Update chart instance data (don't destroy/recreate)
  if (state.chart) {
    state.chart.data.labels           = labels;
    state.chart.data.datasets[0].data = data;
    state.chart.data.datasets[0].backgroundColor = colors.map(c => hexToRgba(c, 0.85));
    state.chart.data.datasets[0].borderColor      = colors;

    // Adapt chart colors for theme
    const isDark = state.theme === 'dark';
    state.chart.options.plugins.tooltip.backgroundColor = isDark
      ? 'rgba(18, 24, 38, 0.95)'
      : 'rgba(255, 255, 255, 0.97)';
    state.chart.options.plugins.tooltip.titleColor = isDark ? '#E8EDF4' : '#1A202C';
    state.chart.options.plugins.tooltip.bodyColor  = isDark ? '#7C8AA5' : '#5A6A85';

    state.chart.update('active'); // animate update
  }

  // Render custom legend
  renderChartLegend(labels, colors, data, total);
}

function renderChartLegend(labels, colors, data, total) {
  chartLegendEl.innerHTML = '';
  if (labels.length === 0) return;

  labels.forEach((label, i) => {
    const pct = total > 0 ? ((data[i] / total) * 100).toFixed(1) : 0;
    const li  = document.createElement('li');
    li.className = 'legend-item';
    li.innerHTML = `
      <span class="legend-dot" style="background:${colors[i]};"></span>
      <span class="legend-label">${escapeHtml(label)}</span>
      <span class="legend-amount">Rp ${formatRp(data[i])}</span>
      <span class="legend-percent">${pct}%</span>
    `;
    chartLegendEl.appendChild(li);
  });
}

/* ─── Full Render (all components) ─────────────────────── */

function renderAll() {
  renderBalance();
  renderTransactionList();
  updateChart();
  renderMonthlySummary();
}

/* ─── Add Transaction ───────────────────────────────────── */

function addTransaction(name, amount, category) {
  const tx = {
    id:        generateId(),
    name:      name.trim(),
    amount:    parseFloat(amount),
    category,
    createdAt: Date.now(),
  };

  state.transactions.unshift(tx); // newest first internally
  saveTransactions();

  // Render balance & chart
  renderBalance();
  updateChart();

  // Add item to list with slide-in animation
  const sorted = getSortedTransactions();
  const idx    = sorted.findIndex(t => t.id === tx.id);

  if (idx === 0 || state.sortMode === 'date') {
    // Prepend to top of visible list
    const li = buildTransactionItem(tx);
    txList.insertBefore(li, txList.firstChild);
  } else {
    // Re-render if sort puts it elsewhere
    renderTransactionList();
  }

  // Update count
  txCount.textContent = state.transactions.length;
  emptyState.style.display = 'none';
  emptyState.setAttribute('aria-hidden', 'true');

  showToast('Transaction added ✓', 'success');
}

/* ─── Delete Transaction ────────────────────────────────── */

function deleteTransaction(id) {
  const li = txList.querySelector(`[data-id="${id}"]`);

  if (li) {
    // Animate out, then remove from DOM + state
    li.classList.add('leaving');
    li.addEventListener('animationend', () => {
      li.remove();
      _removeFromState(id);
    }, { once: true });
  } else {
    _removeFromState(id);
  }
}

function _removeFromState(id) {
  state.transactions = state.transactions.filter(t => t.id !== id);
  saveTransactions();
  renderBalance();
  updateChart();
  txCount.textContent = state.transactions.length;

  if (state.transactions.length === 0) {
    emptyState.removeAttribute('aria-hidden');
    emptyState.style.display = '';
  }
}

/* ─── Validation ────────────────────────────────────────── */

function validateField(fieldGroupId, condition) {
  const group = $(`#${fieldGroupId}`);
  if (condition) {
    group.classList.remove('has-error');
    const input = group.querySelector('.field-input');
    if (input) input.classList.remove('shake');
    return true;
  } else {
    group.classList.add('has-error');
    const input = group.querySelector('.field-input');
    if (input) {
      // Reset shake so it retriggers
      input.classList.remove('shake');
      void input.offsetWidth;
      input.classList.add('shake');
    }
    return false;
  }
}

function clearErrors() {
  $$('.field-group.has-error').forEach(g => g.classList.remove('has-error'));
}

/* ─── Form Submit ───────────────────────────────────────── */

txForm.addEventListener('submit', (e) => {
  e.preventDefault();

  const name     = inputName.value.trim();
  const amount   = parseAmountInput(inputAmount.value);
  const category = inputCategory.value;

  let valid = true;
  valid = validateField('field-name-group',   name.length > 0)   && valid;
  valid = validateField('field-amount-group', !isNaN(amount) && amount > 0) && valid;

  if (!valid) return;

  // ── Budget limit guard ──
  // Only intercept when a limit is set AND the new total would exceed it
  if (state.budgetLimit > 0) {
    const currentTotal = state.transactions.reduce((sum, t) => sum + t.amount, 0);
    const newTotal     = currentTotal + amount;

    if (newTotal > state.budgetLimit) {
      // Open warning modal and pause — user must confirm or cancel
      openBudgetWarnModal({ name, amount, category, currentTotal, newTotal });
      return; // Do NOT add transaction yet
    }
  }

  // No limit conflict — proceed normally
  createRipple(btnSubmit);
  addTransaction(name, amount, category);
  inputName.value   = '';
  inputAmount.value = '';
  clearErrors();
  inputName.focus();
});

/* ─── Attach Rp formatters to money inputs ──────────────── */

attachAmountFormatter(inputAmount);
attachAmountFormatter(inputBudgetLimit);

/* ─── Ripple Effect ─────────────────────────────────────── */

function createRipple(btn) {
  const container = btn.querySelector('.btn-ripple-container');
  if (!container) return;

  const ripple = document.createElement('span');
  ripple.className = 'ripple';

  const size = Math.max(btn.offsetWidth, btn.offsetHeight) * 2;
  ripple.style.width  = `${size}px`;
  ripple.style.height = `${size}px`;
  ripple.style.left   = `${btn.offsetWidth  / 2 - size / 2}px`;
  ripple.style.top    = `${btn.offsetHeight / 2 - size / 2}px`;

  container.appendChild(ripple);
  ripple.addEventListener('animationend', () => ripple.remove(), { once: true });
}

/* ─── Delete via event delegation ───────────────────────── */

txList.addEventListener('click', (e) => {
  const btn = e.target.closest('.btn-delete');
  if (btn) {
    const id = btn.dataset.id;
    deleteTransaction(id);
  }
});

/* ─── Real-time validation clear on input ───────────────── */

inputName.addEventListener('input', () => {
  if (inputName.value.trim()) {
    $('#field-name-group').classList.remove('has-error');
  }
});

inputAmount.addEventListener('input', () => {
  const val = parseAmountInput(inputAmount.value);
  if (!isNaN(val) && val > 0) {
    $('#field-amount-group').classList.remove('has-error');
  }
});

/* ─── Sort Controls ─────────────────────────────────────── */

const sortButtons = $$('.sort-btn');

sortButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    const mode = btn.dataset.sort;
    if (mode === state.sortMode) return;

    state.sortMode = mode;

    sortButtons.forEach(b => {
      b.classList.remove('active');
      b.setAttribute('aria-pressed', 'false');
    });
    btn.classList.add('active');
    btn.setAttribute('aria-pressed', 'true');

    // FLIP-animate the re-sort
    const applyFlip = flipAnimate(txList);

    // Re-render in new sort order
    const sorted = getSortedTransactions();
    const existing = new Map();
    [...txList.children].forEach(li => existing.set(li.dataset.id, li));

    // Re-order DOM nodes
    sorted.forEach(tx => {
      const li = existing.get(tx.id);
      if (li) txList.appendChild(li);
    });

    requestAnimationFrame(applyFlip);
  });
});

/* ─── Custom Category ───────────────────────────────────── */

btnAddCat.addEventListener('click', addCustomCategory);
inputCustomCat.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') { e.preventDefault(); addCustomCategory(); }
});

function addCustomCategory() {
  const name = inputCustomCat.value.trim();
  if (!name) return;

  // Check duplicate (case-insensitive)
  const dup = state.categories.some(c => c.toLowerCase() === name.toLowerCase());
  if (dup) {
    showToast(`"${name}" already exists`, 'danger');
    return;
  }

  state.categories.push(name);
  saveCategories();
  renderCategorySelect();

  // Select the new category automatically
  inputCategory.value = name;

  inputCustomCat.value = '';
  showToast(`Category "${name}" added ✓`, 'info');
}

/* ─── Dark / Light Theme Toggle ─────────────────────────── */

themeToggle.addEventListener('click', () => {
  state.theme = state.theme === 'dark' ? 'light' : 'dark';
  applyTheme(state.theme);
  saveTheme();
  // Re-render chart to adapt tooltip colors
  updateChart();
});

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  themeToggle.setAttribute('aria-label', `Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`);
}

/* ─── Toast Notification ────────────────────────────────── */

function showToast(message, type = 'info', duration = 3000) {
  const iconMap = {
    success: '✓',
    danger:  '⚠',
    info:    'ℹ',
  };

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.setAttribute('role', 'status');
  toast.innerHTML = `
    <span class="toast-icon" aria-hidden="true">${iconMap[type] || 'ℹ'}</span>
    <span class="toast-text">${escapeHtml(message)}</span>
  `;

  toastContainer.appendChild(toast);

  // Trigger enter transition
  requestAnimationFrame(() => {
    requestAnimationFrame(() => toast.classList.add('visible'));
  });

  // Auto-dismiss
  setTimeout(() => {
    toast.classList.replace('visible', 'hiding');
    toast.addEventListener('transitionend', () => toast.remove(), { once: true });
  }, duration);
}

/* ─── Keyboard accessibility for delete buttons ─────────── */

txList.addEventListener('keydown', (e) => {
  if ((e.key === 'Delete' || e.key === 'Backspace') && e.target.classList.contains('btn-delete')) {
    e.target.click();
  }
});

/* ─── Handle category badge re-color when list re-renders ── */
// (Covered by buildTransactionItem which always uses current state.categories)

/* ─── App Init ──────────────────────────────────────────── */

function init() {
  // 1. Load persisted data
  loadFromStorage();

  // 2. Apply theme (already applied before first paint via inline script in HTML)
  applyTheme(state.theme);

  // 3. Populate category dropdown
  renderCategorySelect();

  // 4. Initialise chart
  initChart();

  // 5. Render all UI
  renderAll();

  // 5b. Initialise budget limit UI (populate input + progress bar)
  renderBudgetLimitUI();

  // 6. Set initial previousBalance without animation
  previousBalance = state.transactions.reduce((s, t) => s + t.amount, 0);

  // 7. Log loaded state for debugging
  console.info(
    `%c BudgetViz %c loaded — ${state.transactions.length} transactions, theme: ${state.theme}`,
    'background:#00F0FF;color:#0A0E17;font-weight:bold;padding:2px 6px;border-radius:3px;',
    'color:#7C8AA5'
  );
}

/* ─── Budget Limit Event Listeners ─────────────────────── */

// Quick ±adjust buttons
$$('.limit-adj-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const delta   = parseInt(btn.dataset.delta, 10);
    const current = parseAmountInput(inputBudgetLimit.value) || 0;
    const newVal  = Math.max(0, current + delta);
    inputBudgetLimit.value = newVal > 0 ? formatAmountInput(newVal) : '';
  });
});

// Update / Set limit button
btnSetLimit.addEventListener('click', () => {
  const val         = parseAmountInput(inputBudgetLimit.value) || 0;
  state.budgetLimit = val;
  localStorage.setItem(LS_BUDGET_LIMIT, val);
  createRipple(btnSetLimit);
  checkBudgetLimit();
  showToast(
    val > 0
      ? `Budget limit diset ke Rp ${formatRp(val)} ✓`
      : 'Budget limit dihapus',
    'success'
  );
});

/* ─── Monthly Summary Select ────────────────────────────── */

monthlySelect.addEventListener('change', renderMonthlyBreakdown);

// Wait for DOM to be fully ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

/* ─── Splash Screen Lifecycle ───────────────────────────── */

(function initSplash() {
  const splash = document.getElementById('splash-screen');
  if (!splash) return;

  let dismissed = false;

  /**
   * Dismiss the splash with exit animation, then hide.
   * Guard against double-calls.
   */
  function dismissSplash() {
    if (dismissed) return;
    dismissed = true;

    splash.classList.add('splash-exit');

    // After exit animation finishes (600ms), remove from layout
    splash.addEventListener('animationend', () => {
      splash.classList.add('splash-hidden');
    }, { once: true });
  }

  // Clicking anywhere on the splash screen enters the dashboard.
  // We wait 2.6s before enabling clicks so the CTA text has appeared
  // (avoids accidental immediate dismissal on page load).
  let clickEnabled = false;
  setTimeout(() => { clickEnabled = true; }, 2600);

  splash.addEventListener('click', () => {
    if (clickEnabled) dismissSplash();
  });

  // Keyboard: press Enter or Space to continue (accessibility)
  document.addEventListener('keydown', (e) => {
    if (!dismissed && clickEnabled && (e.key === 'Enter' || e.key === ' ')) {
      dismissSplash();
    }
  });
})();

/* ─── Exit Button + Confirmation Modal ──────────────────── */

(function initExitFlow() {
  const btnExit      = document.getElementById('btn-exit');
  const modalOverlay = document.getElementById('exit-modal-overlay');
  const btnCancel    = document.getElementById('exit-modal-cancel');
  const btnConfirm   = document.getElementById('exit-modal-confirm');
  const splash       = document.getElementById('splash-screen');

  // Guard: all elements must exist
  if (!btnExit || !modalOverlay || !btnCancel || !btnConfirm || !splash) return;

  /* ── Modal helpers ── */

  function openModal() {
    modalOverlay.classList.add('exit-modal-open');
    modalOverlay.setAttribute('aria-hidden', 'false');
    btnCancel.focus();
  }

  function closeModal() {
    modalOverlay.classList.remove('exit-modal-open');
    modalOverlay.setAttribute('aria-hidden', 'true');
    btnExit.focus();
  }

  /* ── Return to welcome screen ── */

  function returnToSplash() {
    closeModal();

    // Wait for modal close animation (280ms), then transition
    setTimeout(() => {
      const appMain   = document.querySelector('.app-main');
      const appHeader = document.querySelector('.app-header');

      // 1. Fade out the app
      if (appMain)   { appMain.style.transition   = 'opacity 0.4s ease'; appMain.style.opacity   = '0'; }
      if (appHeader) { appHeader.style.transition = 'opacity 0.4s ease'; appHeader.style.opacity = '0'; }

      // 2. After fade-out completes, show splash again
      setTimeout(() => {
        // Remove exit/hidden classes so splash re-renders with all animations
        splash.classList.remove('splash-exit', 'splash-hidden');

        // Force reflow so @keyframes restart from the beginning
        void splash.offsetWidth;

        // Signal the reshow handler to re-enable click-to-enter
        splash.dispatchEvent(new CustomEvent('splash:reshow'));

        // Restore app opacity (it sits behind the splash)
        if (appMain)   { appMain.style.opacity   = '1'; appMain.style.transition   = ''; }
        if (appHeader) { appHeader.style.opacity  = '1'; appHeader.style.transition = ''; }

      }, 430); // after fade-out duration
    }, 300);   // after modal close animation
  }

  /* ── Event listeners ── */

  btnExit.addEventListener('click', openModal);
  btnCancel.addEventListener('click', closeModal);
  btnConfirm.addEventListener('click', returnToSplash);

  // Click backdrop to close
  modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) closeModal();
  });

  // Escape key to close
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modalOverlay.classList.contains('exit-modal-open')) {
      closeModal();
    }
  });
})();

/* ─── Splash reshow click-to-enter patch ────────────────── */
// Re-attaches the click handler when splash is shown again via the
// exit flow, so user must click to enter the dashboard on each visit.

(function patchSplashReshow() {
  const splash = document.getElementById('splash-screen');
  if (!splash) return;

  splash.addEventListener('splash:reshow', () => {
    let reshowClickEnabled = false;
    const enableTimer = setTimeout(() => { reshowClickEnabled = true; }, 2600);

    function handleReshowClick() {
      if (!reshowClickEnabled) return;
      clearTimeout(enableTimer);

      splash.classList.add('splash-exit');
      splash.addEventListener('animationend', () => {
        splash.classList.add('splash-hidden');
      }, { once: true });

      splash.removeEventListener('click', handleReshowClick);
    }

    splash.addEventListener('click', handleReshowClick);
  });
})();

/* ─── Budget Warning Modal Logic ────────────────────────── */

/**
 * Opens the budget warning modal with the pending transaction data.
 * Populates the breakdown figures before showing.
 * @param {{ name, amount, category, currentTotal, newTotal }} pending
 */
function openBudgetWarnModal(pending) {
  const overlay  = document.getElementById('budget-warn-overlay');
  const elLimit  = document.getElementById('bw-limit');
  const elSpent  = document.getElementById('bw-spent');
  const elNew    = document.getElementById('bw-new');
  const elTotal  = document.getElementById('bw-total');

  if (!overlay) return;

  // Populate breakdown figures
  elLimit.textContent = `Rp ${formatRp(state.budgetLimit)}`;
  elSpent.textContent = `Rp ${formatRp(pending.currentTotal)}`;
  elNew.textContent   = `Rp ${formatRp(pending.amount)}`;
  elTotal.textContent = `Rp ${formatRp(pending.newTotal)}`;

  // Show modal
  overlay.classList.add('budget-warn-open');
  overlay.setAttribute('aria-hidden', 'false');

  // Focus cancel button for safety
  const btnCancel = document.getElementById('budget-warn-cancel');
  if (btnCancel) btnCancel.focus();

  // Store pending data on overlay for confirm handler to use
  overlay._pending = pending;
}

(function initBudgetWarnModal() {
  const overlay   = document.getElementById('budget-warn-overlay');
  const btnCancel = document.getElementById('budget-warn-cancel');
  const btnConfirm = document.getElementById('budget-warn-confirm');

  if (!overlay || !btnCancel || !btnConfirm) return;

  function closeWarnModal() {
    overlay.classList.remove('budget-warn-open');
    overlay.setAttribute('aria-hidden', 'true');
    overlay._pending = null;
  }

  // Cancel — discard pending transaction
  btnCancel.addEventListener('click', closeWarnModal);

  // Confirm — add the transaction anyway despite over-limit
  btnConfirm.addEventListener('click', () => {
    const pending = overlay._pending;
    closeWarnModal();

    if (!pending) return;

    // Proceed with the transaction that was held
    createRipple(btnSubmit);
    addTransaction(pending.name, pending.amount, pending.category);
    inputName.value   = '';
    inputAmount.value = '';
    clearErrors();
    inputName.focus();
    // Clear validation state
    $('#field-amount-group').classList.remove('has-error');
  });

  // Click backdrop to cancel
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeWarnModal();
  });

  // Escape key to cancel
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && overlay.classList.contains('budget-warn-open')) {
      closeWarnModal();
    }
  });
})();
