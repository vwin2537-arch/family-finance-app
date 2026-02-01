/**
 * Family Biz - Main Application Logic (v3.1)
 * Fixed: Variable redeclaration and robust loading
 */

// ใช้ Categories จาก window.DATA_CATEGORIES (ที่ประกาศไว้ใน utils.js)

// ===== THEME MANAGEMENT =====
function setupTheme() {
    // Load theme from localStorage
    const savedTheme = localStorage.getItem('theme') || 'light';
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
        document.getElementById('themeIcon').textContent = '☀️';
    }

    // Theme toggle button
    document.getElementById('themeToggleBtn')?.addEventListener('click', toggleTheme);
}

function toggleTheme() {
    const body = document.body;
    const themeIcon = document.getElementById('themeIcon');

    body.classList.toggle('dark-mode');

    if (body.classList.contains('dark-mode')) {
        themeIcon.textContent = '☀️';
        localStorage.setItem('theme', 'dark');
    } else {
        themeIcon.textContent = '🌙';
        localStorage.setItem('theme', 'light');
    }
}

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', () => {
    console.log("App DOM Loaded. Initializing...");

    // Register Service Worker for PWA
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js').then(() => {
            console.log("Service Worker Registered");
        });
    }

    // Safety Net: Force hide loader after 5s regardless of crashes
    setTimeout(forceHideLoader, 5000);

    setupTheme(); // NEW: Load theme
    initApp();
    setupNavigation();
    setupFilters(); // New
    setupModals();
    setupForms();
    setupSettings();
});

function forceHideLoader() {
    const loader = document.getElementById('loadingOverlay');
    if (loader) {
        loader.classList.add('hidden');
        setTimeout(() => loader.style.display = 'none', 500);
    }
}

async function initApp() {
    try {
        const syncBadge = document.getElementById('syncStatus');

        // Pull from cloud if API URL exists (with timeout)
        if (StorageManager.getApiUrl()) {
            if (syncBadge) syncBadge.textContent = '⏳ กำลังเชื่อมต่อ...';

            await Promise.race([
                StorageManager.pullFromCloud(),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Cloud Timeout')), 4000))
            ]).then(() => {
                if (syncBadge) {
                    syncBadge.textContent = '✅ ออนไลน์';
                    syncBadge.style.color = 'var(--secondary-mint)';
                }
            }).catch(e => {
                console.warn("Cloud sync skipped:", e);
                if (syncBadge) {
                    syncBadge.textContent = '⚠️ ออฟไลน์';
                    syncBadge.style.color = 'var(--color-expense)';
                }
            });
        }
    } catch (e) {
        console.error("Init sync error:", e);
    } finally {
        // Render UI regardless of sync success
        refreshUI();
        forceHideLoader();
    }
}

function refreshUI() {
    try {
        updateDashboard();
        renderTransactions();
        updateInvestmentPage();
        updateBusinessPage(); // NEW
    } catch (e) {
        console.error("UI Refresh error:", e);
    }
}

// ===== DASHBOARD UPDATE =====
function updateDashboard() {
    const summary = TransactionsManager.getSummary();
    const inv = InvestmentsManager.getOverview();

    setTxt('netProfit', `฿${Utils.formatNumber(summary.netProfit)}`);
    setTxt('monthlyRevenue', `฿${Utils.formatNumber(summary.income)}`);
    setTxt('monthlyExpense', `฿${Utils.formatNumber(summary.expense)}`);

    setTxt('husbandInvestment', `฿${Utils.formatNumber(inv.husband.amount)}`);
    setTxt('wifeInvestment', `฿${Utils.formatNumber(inv.wife.amount)}`);
    setTxt('husbandShare', `${inv.husband.share.toFixed(0)}%`);
    setTxt('wifeShare', `${inv.wife.share.toFixed(0)}%`);
}

function updateInvestmentPage() {
    const inv = InvestmentsManager.getOverview();
    const summary = TransactionsManager.getSummary();

    setTxt('totalInvestment', `฿${Utils.formatNumber(inv.total)}`);
    setTxt('husbandInvPage', `฿${Utils.formatNumber(inv.husband.amount)}`);
    setTxt('wifeInvPage', `฿${Utils.formatNumber(inv.wife.amount)}`);
    setTxt('husbandSharePage', `${inv.husband.share.toFixed(0)}%`);
    setTxt('wifeSharePage', `${inv.wife.share.toFixed(0)}%`);

    const list = document.getElementById('investmentList');
    if (list) {
        const invs = StorageManager.getInvestments();
        list.innerHTML = invs.length ? invs.map(i => renderInvItem(i)).join('') : renderEmpty('💎', 'ยังไม่มีการลงทุน');
    }
}

// ===== BUSINESS PAGE (กองทุนต้นทุน & แบ่งกำไร) =====
function updateBusinessPage() {
    const costReserve = TransactionsManager.getCostReserve();

    // Get month filter value
    const monthFilter = document.getElementById('profitFilterDate')?.value || null;
    const profitShare = TransactionsManager.getProfitShare(monthFilter);

    // Cost Reserve
    setTxt('costReserveBalance', `฿${Utils.formatNumber(costReserve.balance)}`);
    setTxt('withdrawAvailable', `฿${Utils.formatNumber(costReserve.balance)}`);

    // Profit Sharing
    setTxt('husbandProfit', `฿${Utils.formatNumber(profitShare.husband.amount)}`);
    setTxt('wifeProfit', `฿${Utils.formatNumber(profitShare.wife.amount)}`);
    setTxt('husbandProfitPct', `${profitShare.husband.share}%`);
    setTxt('wifeProfitPct', `${profitShare.wife.share}%`);

    // Summary
    setTxt('bizTotalProfit', `฿${Utils.formatNumber(profitShare.totalProfit)}`);
    setTxt('bizTotalExpense', `฿${Utils.formatNumber(profitShare.totalExpense)}`);
    setTxt('bizNetProfit', `฿${Utils.formatNumber(profitShare.netProfit)}`);

    // Withdrawal History
    const wList = document.getElementById('withdrawalList');
    if (wList) {
        const withdrawals = costReserve.withdrawals || [];
        wList.innerHTML = withdrawals.length
            ? withdrawals.map(w => renderWithdrawItem(w)).join('')
            : renderEmpty('📦', 'ยังไม่มีการถอนเงิน');
    }
}

function renderWithdrawItem(w) {
    return `
        <div class="tx-card">
            <div class="tx-emoji">📤</div>
            <div class="tx-info">
                <span class="tx-name">ถอนเงินจากกองทุน</span>
                <span class="tx-meta">${Utils.formatDate(w.date)} • ${w.note || '-'}</span>
            </div>
            <div class="tx-price" style="color:#E65100;">
                -฿${Utils.formatNumber(w.amount)}
            </div>
            <div class="tx-actions">
                <button class="action-btn delete-btn" data-id="${w.id}" data-type="withdrawal">🗑️</button>
            </div>
        </div>
    `;
}

// ===== FILTERING =====
function setupFilters() {
    const today = new Date();
    const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

    ['incomeFilterDate', 'expenseFilterDate', 'allFilterDate'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.value = currentMonth;
            el.addEventListener('change', () => renderTransactions());
        }
    });

    // Profit filter for business page
    const profitFilter = document.getElementById('profitFilterDate');
    if (profitFilter) {
        profitFilter.value = currentMonth;  // Default to current month
        profitFilter.addEventListener('change', updateBusinessPage);
    }
}

function renderTransactions() {
    const txs = StorageManager.getTransactions();
    const summary = TransactionsManager.getSummary(); // Dashboard uses current month automatically

    // Dashboard Recent (Always top 5 latest) - No edit/delete buttons
    const recent = document.getElementById('recentTransactions');
    if (recent) recent.innerHTML = txs.slice(0, 5).map(t => renderTxItem(t, false)).join('');

    // --- Filtered Pages ---

    // Helper to filter by month input
    const filterByMonth = (list, inputId) => {
        const val = document.getElementById(inputId)?.value;
        if (!val) return list;
        const [y, m] = val.split('-');
        return list.filter(t => {
            const d = new Date(t.date);
            return d.getFullYear() == y && (d.getMonth() + 1) == m;
        });
    };

    // Pages
    setList('incomeList', filterByMonth(txs.filter(t => t.type === 'income'), 'incomeFilterDate'), '💰', 'เดือนนี้ไม่มีรายรับ');
    setList('expenseList', filterByMonth(txs.filter(t => t.type === 'expense'), 'expenseFilterDate'), '💸', 'เดือนนี้ไม่มีรายจ่าย');
    setList('allTransactions', filterByMonth(txs, 'allFilterDate'), '📊', 'เดือนนี้ไม่มีข้อมูล');

    // Stats (Update Dashboard + Stats Page Totals)
    setTxt('totalIncome', `฿${Utils.formatNumber(summary.income)}`);
    setTxt('totalExpense', `฿${Utils.formatNumber(summary.expense)}`);
    setTxt('statsIncome', `฿${Utils.formatNumber(summary.income)}`);
    setTxt('statsExpense', `฿${Utils.formatNumber(summary.expense)}`);

    // Charts
    console.log("Rendering charts with:", summary.transactions.length, "items");
    renderCharts(summary.transactions);
}

// --- CHARTS ---
let expenseChartInstance = null;

function renderCharts(transactions) {
    const ctx = document.getElementById('expenseChart');
    const placeholder = document.getElementById('chartPlaceholder');

    // Only render if element exists (it is on statsPage)
    // Even if hidden, we can update it, but ChartJS needs visible canvas sometimes
    if (!ctx) return;

    // Filter Expenses (Case Insensitive)
    const expenses = transactions.filter(t => (t.type || '').toLowerCase() === 'expense');

    console.log("Chart Debug - Expenses Found:", expenses.length);

    if (expenses.length === 0) {
        if (expenseChartInstance) expenseChartInstance.destroy();
        ctx.style.display = 'none';
        if (placeholder) placeholder.style.display = 'block';
        return;
    }

    // Has Data
    ctx.style.display = 'block';
    if (placeholder) placeholder.style.display = 'none';

    // Group by Category
    const categoryTotals = {};
    expenses.forEach(t => {
        // Fallback name if cat not found
        let catName = t.category;
        const catObj = TransactionsManager.getCategory('expense', t.category);
        if (catObj) catName = catObj.name;

        categoryTotals[catName] = (categoryTotals[catName] || 0) + parseFloat(t.amount);
    });

    const labels = Object.keys(categoryTotals);
    const data = Object.values(categoryTotals);

    // Destroy old chart
    if (expenseChartInstance) {
        expenseChartInstance.destroy();
    }

    // Colors (Pastel)
    const colors = ['#FF9AA2', '#FFB7B2', '#FFDAC1', '#E2F0CB', '#B5EAD7', '#C7CEEA', '#E0BBE4', '#957DAD'];

    try {
        if (typeof Chart === 'undefined') {
            console.error("Chart.js not loaded");
            return;
        }

        expenseChartInstance = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: colors,
                    borderWidth: 2,
                    borderColor: '#ffffff',
                    hoverOffset: 10
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            font: { family: 'Mali', size: 12 },
                            boxWidth: 12,
                            padding: 15,
                            usePointStyle: true
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function (context) {
                                let label = context.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                label += '฿' + Utils.formatNumber(context.raw);
                                return label;
                            }
                        },
                        bodyFont: { family: 'Mali' },
                        titleFont: { family: 'Mali' },
                        backgroundColor: 'rgba(93, 91, 106, 0.9)',
                        padding: 10,
                        cornerRadius: 10,
                        displayColors: false
                    }
                },
                layout: {
                    padding: 10
                }
            }
        });
    } catch (e) {
        console.error("Chart Error:", e);
    }
}

// ===== HELPERS =====
function setTxt(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
}

function setList(id, data, icon, msg) {
    const el = document.getElementById(id);
    if (el) el.innerHTML = data.length ? data.map(t => renderTxItem(t)).join('') : renderEmpty(icon, msg);
}

function renderEmpty(icon, msg) {
    return `
        <div class="empty-block">
            <span class="empty-icon">${icon}</span>
            <p>${msg}</p>
        </div>
    `;
}

// Helper functions for profit share inputs
function updateWifeShare() {
    const husbandVal = parseFloat(document.getElementById('husbandShareInput').value) || 0;
    const wifeVal = 100 - husbandVal;
    document.getElementById('wifeShareInput').value = wifeVal;
    document.getElementById('totalShareDisplay').textContent = 100;
}

function updateHusbandShare() {
    const wifeVal = parseFloat(document.getElementById('wifeShareInput').value) || 0;
    const husbandVal = 100 - wifeVal;
    document.getElementById('husbandShareInput').value = husbandVal;
    document.getElementById('totalShareDisplay').textContent = 100;
}

function renderTxItem(tx, showActions = true) {
    const cat = TransactionsManager.getCategory(tx.type, tx.category);
    const isInc = tx.type === 'income';

    // Calculate individual shares for income transactions
    let shareDisplay = '';
    if (isInc && tx.husbandShare !== undefined) {
        const settings = StorageManager.getSettings();
        const costPercent = settings.costPercent || 30;
        const profitAmount = tx.deductCost ?
            tx.amount * (100 - costPercent) / 100 :
            tx.amount;
        const husbandAmount = profitAmount * tx.husbandShare / 100;
        const wifeAmount = profitAmount * tx.wifeShare / 100;

        shareDisplay = `
            <div style="font-size:0.85rem; color:#666; margin-top:4px;">
                👨 ฿${Utils.formatNumber(husbandAmount)} (${tx.husbandShare}%) •
                👩 ฿${Utils.formatNumber(wifeAmount)} (${tx.wifeShare}%)
            </div>
        `;
    }

    return `
        <div class="tx-card">
            <div class="tx-emoji">${cat ? cat.icon : '❓'}</div>
            <div class="tx-info">
                <span class="tx-name">${cat ? cat.name : tx.category}</span>
                <span class="tx-meta">${Utils.formatDate(tx.date)} • ${tx.description || '-'}</span>
                ${shareDisplay}
            </div>
            <div class="tx-price ${isInc ? 'inc-text' : 'exp-text'}">
                ${isInc ? '+' : '-'}฿${Utils.formatNumber(tx.amount)}
            </div>
            ${showActions ? `
                <div class="tx-actions">
                    <button class="action-btn edit-btn" data-id="${tx.id}" data-type="transaction">✏️</button>
                    <button class="action-btn delete-btn" data-id="${tx.id}" data-type="transaction">🗑️</button>
                </div>
            ` : ''}
        </div>
    `;
}

function renderInvItem(inv) {
    return `
        <div class="tx-card">
            <div class="tx-emoji">${inv.investor === 'husband' ? '👨' : '👩'}</div>
            <div class="tx-info">
                <span class="tx-name">${inv.investor === 'husband' ? 'สามีเติมเงิน' : 'ภรรยาเติมเงิน'}</span>
                <span class="tx-meta">${Utils.formatDate(inv.date)} • ${inv.note || '-'}</span>
            </div>
            <div class="tx-price" style="color: var(--color-inv);">
                +฿${Utils.formatNumber(inv.amount)}
            </div>
            <div class="tx-actions">
                <button class="action-btn edit-btn" data-id="${inv.id}" data-type="investment">✏️</button>
                <button class="action-btn delete-btn" data-id="${inv.id}" data-type="investment">🗑️</button>
            </div>
        </div>
    `;
}

// ===== NAVIGATION =====
function setupNavigation() {
    const btns = document.querySelectorAll('.nav-item[data-target]');
    btns.forEach(btn => {
        btn.addEventListener('click', () => {
            btns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
            const targetId = btn.dataset.target;
            document.getElementById(targetId)?.classList.add('active');

            // Re-render charts when stats page is opened
            if (targetId === 'statsPage') {
                const summary = TransactionsManager.getSummary();
                renderCharts(summary.transactions);
            }

            refreshUI();
        });
    });
}

// ===== MODALS & FORMS =====
function setupModals() {
    const modals = {
        tx: document.getElementById('transactionModal'),
        inv: document.getElementById('investmentModal'),
        set: document.getElementById('settingsModal'),
        withdraw: document.getElementById('withdrawModal')
    };

    document.getElementById('quickAddIncome')?.addEventListener('click', () => { setTxType('income'); showModal(modals.tx); });
    document.getElementById('quickAddExpense')?.addEventListener('click', () => { setTxType('expense'); showModal(modals.tx); });
    document.getElementById('quickAddInvest')?.addEventListener('click', () => {
        document.getElementById('investDateInput').value = Utils.getToday();
        showModal(modals.inv);
    });
    document.getElementById('settingsBtn')?.addEventListener('click', () => showModal(modals.set));

    // Withdraw from Cost Reserve
    document.getElementById('withdrawCostBtn')?.addEventListener('click', () => {
        // Update available balance before showing modal
        const reserve = TransactionsManager.getCostReserve();
        setTxt('withdrawAvailable', `฿${Utils.formatNumber(reserve.balance)}`);
        showModal(modals.withdraw);
    });

    document.querySelectorAll('.btn-close').forEach(b => b.addEventListener('click', hideAllModals));
}

function showModal(m) { if (m) m.classList.add('active'); }
function hideAllModals() {
    document.querySelectorAll('.modal').forEach(m => m.classList.remove('active'));
    document.querySelectorAll('.custom-modal').forEach(m => m.classList.remove('active'));
}

// ===== CUSTOM CUTE MODALS =====
let passwordResolver = null;
let confirmResolver = null;

function showPasswordModal() {
    return new Promise((resolve) => {
        passwordResolver = resolve;
        const modal = document.getElementById('passwordModal');
        const input = document.getElementById('passwordInput');
        input.value = '';
        modal.classList.add('active');
        setTimeout(() => input.focus(), 100);

        // Enter key support
        input.onkeypress = (e) => {
            if (e.key === 'Enter') submitPasswordModal();
        };
    });
}

function submitPasswordModal() {
    const pwd = document.getElementById('passwordInput').value;
    document.getElementById('passwordModal').classList.remove('active');
    if (passwordResolver) {
        passwordResolver(pwd);
        passwordResolver = null;
    }
}

function cancelPasswordModal() {
    document.getElementById('passwordModal').classList.remove('active');
    if (passwordResolver) {
        passwordResolver(null);
        passwordResolver = null;
    }
}

function showAlert(title, message) {
    return new Promise((resolve) => {
        document.getElementById('alertTitle').textContent = title;
        document.getElementById('alertMessage').textContent = message;
        document.getElementById('alertModal').classList.add('active');
        window.alertResolver = resolve;
    });
}

function closeAlertModal() {
    document.getElementById('alertModal').classList.remove('active');
    if (window.alertResolver) {
        window.alertResolver();
        window.alertResolver = null;
    }
}

function showConfirm(title, message) {
    return new Promise((resolve) => {
        confirmResolver = resolve;
        document.getElementById('confirmTitle').textContent = title;
        document.getElementById('confirmMessage').textContent = message;
        document.getElementById('confirmModal').classList.add('active');
    });
}

function acceptConfirmModal() {
    document.getElementById('confirmModal').classList.remove('active');
    if (confirmResolver) {
        confirmResolver(true);
        confirmResolver = null;
    }
}

function cancelConfirmModal() {
    document.getElementById('confirmModal').classList.remove('active');
    if (confirmResolver) {
        confirmResolver(false);
        confirmResolver = null;
    }
}

function setTxType(type) {
    document.getElementById('transactionType').value = type;
    document.getElementById('modalTitle').textContent = type === 'income' ? 'บันทึกรายรับ' : 'บันทึกรายจ่าย';
    document.getElementById('dateInput').value = Utils.getToday();

    // Show/Hide cost deduction checkbox (only for income)
    const costRow = document.getElementById('costDeductRow');
    if (costRow) {
        costRow.style.display = type === 'income' ? 'block' : 'none';
        // Reset checkbox
        document.getElementById('deductCostCheck').checked = true;
        // Update percentage label
        const settings = StorageManager.getSettings();
        document.getElementById('costPctLabel').textContent = `${settings.costPercent || 30}%`;
    }

    // Show/Hide profit share inputs (only for income)
    const profitRow = document.getElementById('profitShareRow');
    if (profitRow) {
        profitRow.style.display = type === 'income' ? 'block' : 'none';
        // Reset to default 50/50 split
        document.getElementById('husbandShareInput').value = 50;
        document.getElementById('wifeShareInput').value = 50;
        document.getElementById('totalShareDisplay').textContent = 100;
    }

    // Toggle logic for compatibility (optional)
    document.querySelectorAll('#typeToggle .toggle-btn').forEach(b => b.classList.toggle('active', b.dataset.type === type));

    const grid = document.getElementById('categoryGrid');
    const cats = Utils.getCategories(type);

    // Fix: Use .cat-sticker to match CSS
    grid.innerHTML = cats.map((c, i) => `
        <div class="cat-sticker ${i === 0 ? 'active' : ''}" data-id="${c.id}">
            <span class="cat-img">${c.icon}</span>
            <span>${c.name}</span>
        </div>
    `).join('');
}

function setupForms() {
    // 1. GLOBAL CLICK LISTENER for Selection (Event Delegation)
    document.addEventListener('click', (e) => {
        // Category Selection
        const catItem = e.target.closest('.cat-sticker');
        if (catItem && !catItem.classList.contains('investor-btn')) { // Exclude investor buttons if they share class
            // Toggle active in the grid container
            const container = catItem.parentElement;
            container.querySelectorAll('.cat-sticker').forEach(el => el.classList.remove('active'));
            catItem.classList.add('active');
        }

        // Investor Selection
        const invItem = e.target.closest('.investor-btn');
        if (invItem) {
            document.querySelectorAll('.investor-btn').forEach(b => b.classList.remove('active'));
            invItem.classList.add('active');
            document.getElementById('investorType').value = invItem.dataset.investor;
        }
    });

    // Transaction Form
    document.getElementById('transactionForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const amount = parseFloat(document.getElementById('amountInput').value);
        if (!amount) {
            await showAlert('⚠️ กรอกข้อมูลไม่ครบ', 'กรุณาใส่จำนวนเงิน');
            return;
        }

        const txType = document.getElementById('transactionType').value;
        const deductCost = txType === 'income' ? document.getElementById('deductCostCheck')?.checked : false;

        // Fix: Select .cat-sticker.active
        StorageManager.addTransaction({
            type: txType,
            amount: amount,
            category: document.querySelector('#categoryGrid .cat-sticker.active')?.dataset.id || 'other',
            date: document.getElementById('dateInput').value,
            description: document.getElementById('descriptionInput').value,
            deductCost: deductCost,  // NEW: flag for cost deduction
            husbandShare: txType === 'income' ? parseFloat(document.getElementById('husbandShareInput').value) : undefined,
            wifeShare: txType === 'income' ? parseFloat(document.getElementById('wifeShareInput').value) : undefined
        });

        document.getElementById('amountInput').value = '';
        hideAllModals();
        refreshUI();
    });

    // Investment Form
    document.getElementById('investmentForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const amount = parseFloat(document.getElementById('investAmountInput').value);
        if (!amount) {
            await showAlert('⚠️ กรอกข้อมูลไม่ครบ', 'กรุณาใส่จำนวนเงิน');
            return;
        }

        StorageManager.addInvestment({
            amount: amount,
            investor: document.getElementById('investorType').value,
            date: document.getElementById('investDateInput').value,
            note: document.getElementById('investNoteInput').value
        });

        document.getElementById('investAmountInput').value = '';
        hideAllModals();
        refreshUI();
    });

    // Withdraw Form (from Cost Reserve)
    document.getElementById('withdrawForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const amount = parseFloat(document.getElementById('withdrawAmount').value);
        if (!amount) {
            await showAlert('⚠️ กรอกข้อมูลไม่ครบ', 'กรุณาใส่จำนวนเงิน');
            return;
        }

        // Check if enough balance
        const reserve = TransactionsManager.getCostReserve();
        if (amount > reserve.balance) {
            await showAlert('❌ ยอดเงินไม่พอ', `คงเหลือ: ฿${Utils.formatNumber(reserve.balance)}`);
            return;
        }

        StorageManager.addCostWithdrawal({
            amount: amount,
            note: document.getElementById('withdrawNote').value,
            date: Utils.getToday()
        });

        document.getElementById('withdrawAmount').value = '';
        document.getElementById('withdrawNote').value = '';
        hideAllModals();
        refreshUI();
        await showAlert('✅ ถอนเงินสำเร็จ', `ถอนเงิน ฿${Utils.formatNumber(amount)} เรียบร้อยแล้ว! 🎉`);
    });

    // Password verification for edit/delete operations
    async function verifyPassword() {
        const pwd = await showPasswordModal();
        return pwd === '1120';
    }

    // Edit/Delete Handlers
    document.addEventListener('click', async (e) => {
        // Delete Handler
        if (e.target.closest('.delete-btn')) {
            const btn = e.target.closest('.delete-btn');
            const id = btn.dataset.id;
            const type = btn.dataset.type;

            // Check password first
            const isValidPassword = await verifyPassword();
            if (!isValidPassword) {
                await showAlert('❌ รหัสผ่านไม่ถูกต้อง', 'กรุณาลองใหม่อีกครั้ง');
                return;
            }

            const confirmed = await showConfirm('ยืนยันการลบ', 'คุณแน่ใจว่าต้องการลบรายการนี้?');
            if (confirmed) {
                if (type === 'transaction') {
                    StorageManager.deleteTransaction(id);
                } else if (type === 'investment') {
                    StorageManager.deleteInvestment(id);
                } else if (type === 'withdrawal') {
                    StorageManager.deleteCostWithdrawal(id);
                }
                refreshUI();
                await showAlert('✅ ลบสำเร็จ', 'ลบรายการเรียบร้อยแล้ว');
            }
        }

        // Edit Handler
        if (e.target.closest('.edit-btn')) {
            const btn = e.target.closest('.edit-btn');
            const id = btn.dataset.id;
            const type = btn.dataset.type;

            // Password check moved to save button


            if (type === 'transaction') {
                editTransaction(id);
            } else if (type === 'investment') {
                editInvestment(id);
            }
        }
    });
}

function setupSettings() {
    const urlIn = document.getElementById('apiUrlInput');
    const costIn = document.getElementById('costPercentInput');

    const settings = StorageManager.getSettings();
    if (urlIn) urlIn.value = StorageManager.getApiUrl() || '';
    if (costIn) costIn.value = settings.costPercent || 30;

    // --- Custom Category Logic ---
    const renderCustomCats = () => {
        const list = StorageManager.getCustomCategories();
        const container = document.getElementById('customCatList');
        if (container) {
            container.innerHTML = list.length === 0 ? '<p style="text-align:center; color:#ccc; padding:10px;">ยังไม่มีหมวดหมู่เพิ่มเอง</p>'
                : list.map(c => `
                <div class="cat-manage-item">
                    <span>${c.icon} ${c.name} <small style="color:#aaa;">(${c.type === 'income' ? 'รับ' : 'จ่าย'})</small></span>
                    <div class="cat-del-btn" data-id="${c.id}">✕</div>
                </div>
            `).join('');
        }
    };
    renderCustomCats();

    document.getElementById('addCatBtn')?.addEventListener('click', async () => {
        const name = document.getElementById('newCatName').value.trim();
        const icon = document.getElementById('newCatIcon').value || '🏷️'; // Get from hidden input
        const type = document.getElementById('newCatType').value;

        if (!name) {
            await showAlert('⚠️ กรอกข้อมูลไม่ครบ', 'กรุณาใส่ชื่อหมวดหมู่');
            return;
        }

        const newCat = {
            id: 'custom_' + Date.now(),
            name,
            icon,
            type
        };

        StorageManager.addCustomCategory(newCat);
        document.getElementById('newCatName').value = '';
        renderCustomCats();
    });

    // Emoji Picker Logic
    document.querySelectorAll('.emoji-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            // UI Update
            document.querySelectorAll('.emoji-btn').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');

            // Value Update
            document.getElementById('selectedIconDisplay').textContent = btn.textContent;
            document.getElementById('newCatIcon').value = btn.textContent;
        });
    });

    document.getElementById('customCatList')?.addEventListener('click', async (e) => {
        if (e.target.classList.contains('cat-del-btn')) {
            const confirmed = await showConfirm('ยืนยันการลบ', 'ต้องการลบหมวดหมู่นี้หรือไม่?');
            if (confirmed) {
                StorageManager.removeCustomCategory(e.target.dataset.id);
                renderCustomCats();
            }
        }
    });
    // -----------------------------

    document.getElementById('saveSettingsBtn')?.addEventListener('click', () => {
        StorageManager.setApiUrl(urlIn.value.trim());
        StorageManager.saveSettings({
            costPercent: parseInt(costIn.value) || 30
        });
        alert('บันทึกเรียบร้อย');
        window.location.reload();
    });

    document.getElementById('testCloudBtn')?.addEventListener('click', async () => {
        const btn = document.getElementById('testCloudBtn');
        const originalText = btn.textContent;
        btn.textContent = '⏳ กำลังทดสอบ...';

        try {
            const res = await StorageManager.pushToCloud();
            if (res.status === 'success') {
                btn.textContent = '✅ เชื่อมต่อสำเร็จ!';
                await showAlert('✅ เชื่อมต่อสำเร็จ', `เชื่อมต่อ Google Drive สำเร็จ!\nไฟล์ Database อยู่ที่: ${res.folderId || 'โฟลเดอร์ที่กำหนด'}`);
            } else {
                throw new Error(res.message);
            }
        } catch (e) {
            btn.textContent = '❌ ล้มเหลว';
            await showAlert('❌ เชื่อมต่อไม่ได้', 'เชื่อมต่อไม่ได้: ' + e.message + '\n\nคำแนะนำ:\n1. ตรวจสอบว่า Deploy เป็น "New Deployment" หรือยัง\n2. ตรวจสอบว่าเลือก "Anyone" can access หรือยัง');
        }

        setTimeout(() => btn.textContent = originalText, 3000);
    });

    document.getElementById('clearDataBtn')?.addEventListener('click', async () => {
        const confirmed = await showConfirm('⚠️ ล้างข้อมูลทั้งหมด?', 'การกระทำนี้ไม่สามารถย้อนกลับได้');
        if (confirmed) {
            StorageManager.clearAll();
            window.location.reload();
        }
    });
}

// ===== EDIT FUNCTIONS =====
function editTransaction(id) {
    try {
        const transactions = StorageManager.getTransactions();
        const tx = transactions.find(t => t.id === id);
        if (!tx) return;

        // 1. Setup UI (Reset fields)
        setTxType(tx.type);

        // 2. Pre-fill form (Overwrite with existing data)
        document.getElementById('transactionType').value = tx.type;
        document.getElementById('amountInput').value = tx.amount;
        document.getElementById('dateInput').value = tx.date; // Critical: Ensure original date is kept
        document.getElementById('descriptionInput').value = tx.description || '';

        // Pre-fill Special Fields (Income)
        if (tx.type === 'income') {
            document.getElementById('deductCostCheck').checked = tx.deductCost || false;
            document.getElementById('husbandShareInput').value = tx.husbandShare ?? 50;
            document.getElementById('wifeShareInput').value = tx.wifeShare ?? 50;
            // Trigger shear calculations if needed? No, inputs handle logic.
        }

        // Select Category (Delayed to allow render)
        setTimeout(() => {
            const catBtn = document.querySelector(`#categoryGrid .cat-sticker[data-id="${tx.category}"]`);
            if (catBtn) {
                document.querySelectorAll('#categoryGrid .cat-sticker').forEach(el => el.classList.remove('active'));
                catBtn.classList.add('active');
            }
        }, 50);



        // Modify form submit handler to update instead of add
        const form = document.getElementById('transactionForm');
        const newForm = form.cloneNode(true);
        form.parentNode.replaceChild(newForm, form);

        newForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const amount = parseFloat(document.getElementById('amountInput').value);
            if (!amount) {
                await showAlert('⚠️ กรอกข้อมูลไม่ครบ', 'กรุณาใส่จำนวนเงิน');
                return;
            }

            const txType = document.getElementById('transactionType').value;
            const deductCost = txType === 'income' ? document.getElementById('deductCostCheck')?.checked : false;

            // Verify Password before saving
            const pwd = await showPasswordModal();
            if (pwd !== '1120') {
                await showAlert('❌ รหัสผ่านไม่ถูกต้อง', 'กรุณาลองใหม่อีกครั้ง');
                return;
            }

            StorageManager.updateTransaction(id, {

                type: txType,
                amount: amount,
                category: document.querySelector('#categoryGrid .cat-sticker.active')?.dataset.id || 'other',
                date: document.getElementById('dateInput').value,
                description: document.getElementById('descriptionInput').value,
                deductCost: deductCost,
                husbandShare: txType === 'income' ? parseFloat(document.getElementById('husbandShareInput').value) : undefined,
                wifeShare: txType === 'income' ? parseFloat(document.getElementById('wifeShareInput').value) : undefined
            });

            hideAllModals();
            refreshUI();

            // Restore original form handler
            setupForms();
        });

        showModal(document.getElementById('transactionModal'));
    } catch (e) {
        console.error(e);
        alert('เกิดข้อผิดพลาด: ' + e.message);
    }
}


function editInvestment(id) {
    const investments = StorageManager.getInvestments();
    const inv = investments.find(i => i.id === id);
    if (!inv) return;

    // Pre-fill form
    document.getElementById('investAmountInput').value = inv.amount;
    document.getElementById('investDateInput').value = inv.date;
    document.getElementById('investNoteInput').value = inv.note || '';
    document.getElementById('investorType').value = inv.investor;

    // Select investor button
    document.querySelectorAll('.investor-btn').forEach(b => b.classList.remove('active'));
    document.querySelector(`.investor-btn[data-investor="${inv.investor}"]`)?.classList.add('active');

    // Modify form submit handler
    const form = document.getElementById('investmentForm');
    const newForm = form.cloneNode(true);
    form.parentNode.replaceChild(newForm, form);

    newForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const amount = parseFloat(document.getElementById('investAmountInput').value);
        if (!amount) {
            await showAlert('⚠️ กรอกข้อมูลไม่ครบ', 'กรุณาใส่จำนวนเงิน');
            return;
        }

        // Verify Password before saving
        const pwd = await showPasswordModal();
        if (pwd !== '1120') {
            await showAlert('❌ รหัสผ่านไม่ถูกต้อง', 'กรุณาลองใหม่อีกครั้ง');
            return;
        }

        StorageManager.updateInvestment(id, {
            amount: amount,
            investor: document.getElementById('investorType').value,
            date: document.getElementById('investDateInput').value,
            note: document.getElementById('investNoteInput').value
        });

        hideAllModals();
        refreshUI();

        // Restore original form handler
        setupForms();
    });

    showModal(document.getElementById('investmentModal'));
}
