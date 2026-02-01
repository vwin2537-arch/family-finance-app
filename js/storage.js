/**
 * Family Biz - Storage Manager (Cloud Enabled)
 * Handles "Hybrid Sync" between LocalStorage and Google Sheets
 */

const STORAGE_KEYS = {
    TRANSACTIONS: 'fb_transactions',
    INVESTMENTS: 'fb_investments',
    SETTINGS: 'fb_settings',
    CUSTOM_CATEGORIES: 'fb_custom_cats',
    COST_WITHDRAWALS: 'fb_cost_withdrawals', // กองทุนต้นทุน - ประวัติการถอน
    API_URL: 'fb_api_url',
    LAST_SYNC: 'fb_last_sync'
};

const DEFAULT_SETTINGS = {
    costPercent: 30,           // เปอร์เซ็นต์หักต้นทุน
    husbandShare: 50,          // สัดส่วนแบ่งกำไร สามี
    wifeShare: 50              // สัดส่วนแบ่งกำไร ภรรยา
};

// URL ที่ User ให้มา (Hardcoded เพื่อความสะดวก)
const DEFAULT_API_URL = "https://script.google.com/macros/s/AKfycbzCq-xcP_m2P3lHlvWTxfG8sIMmyWRq9wDOADUeYfsN9aTBFjOKt9dKbsAlaukKjQ_nAw/exec";

const StorageManager = {
    init() {
        if (!localStorage.getItem(STORAGE_KEYS.TRANSACTIONS)) localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify([]));
        if (!localStorage.getItem(STORAGE_KEYS.INVESTMENTS)) localStorage.setItem(STORAGE_KEYS.INVESTMENTS, JSON.stringify([]));
        if (!localStorage.getItem(STORAGE_KEYS.SETTINGS)) localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(DEFAULT_SETTINGS));
        if (!localStorage.getItem(STORAGE_KEYS.CUSTOM_CATEGORIES)) localStorage.setItem(STORAGE_KEYS.CUSTOM_CATEGORIES, JSON.stringify([]));
        if (!localStorage.getItem(STORAGE_KEYS.COST_WITHDRAWALS)) localStorage.setItem(STORAGE_KEYS.COST_WITHDRAWALS, JSON.stringify([]));

        // LOCKED: Force update API URL always
        this.setApiUrl(DEFAULT_API_URL);
    },

    // --- Configuration ---
    setApiUrl(url) {
        localStorage.setItem(STORAGE_KEYS.API_URL, url);
    },

    getApiUrl() {
        return localStorage.getItem(STORAGE_KEYS.API_URL) || DEFAULT_API_URL;
    },

    // --- Data Access ---
    getTransactions() {
        return JSON.parse(localStorage.getItem(STORAGE_KEYS.TRANSACTIONS) || '[]');
    },

    getInvestments() {
        return JSON.parse(localStorage.getItem(STORAGE_KEYS.INVESTMENTS) || '[]');
    },

    getSettings() {
        return JSON.parse(localStorage.getItem(STORAGE_KEYS.SETTINGS)) || DEFAULT_SETTINGS;
    },

    // --- Actions ---
    addTransaction(transaction) {
        const list = this.getTransactions();
        list.unshift({ id: Date.now().toString(), timestamp: new Date().toISOString(), ...transaction });
        localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(list));
        this.triggerSync(); // Auto sync
        return list;
    },

    addInvestment(investment) {
        const list = this.getInvestments();
        list.unshift({ id: Date.now().toString(), timestamp: new Date().toISOString(), ...investment });
        localStorage.setItem(STORAGE_KEYS.INVESTMENTS, JSON.stringify(list));
        this.triggerSync(); // Auto sync
        return list;
    },

    saveSettings(settings) {
        localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
        this.triggerSync();
    },

    // --- Delete/Update Methods ---
    deleteTransaction(id) {
        let list = this.getTransactions();
        list = list.filter(t => t.id !== id);
        localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(list));
        this.triggerSync();
        return list;
    },

    updateTransaction(id, updatedData) {
        const list = this.getTransactions();
        const index = list.findIndex(t => t.id === id);
        if (index !== -1) {
            list[index] = { ...list[index], ...updatedData };
            localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(list));
            this.triggerSync();
        }
        return list;
    },

    deleteInvestment(id) {
        let list = this.getInvestments();
        list = list.filter(i => i.id !== id);
        localStorage.setItem(STORAGE_KEYS.INVESTMENTS, JSON.stringify(list));
        this.triggerSync();
        return list;
    },

    updateInvestment(id, updatedData) {
        const list = this.getInvestments();
        const index = list.findIndex(i => i.id === id);
        if (index !== -1) {
            list[index] = { ...list[index], ...updatedData };
            localStorage.setItem(STORAGE_KEYS.INVESTMENTS, JSON.stringify(list));
            this.triggerSync();
        }
        return list;
    },

    deleteCostWithdrawal(id) {
        let list = this.getCostWithdrawals();
        list = list.filter(w => w.id !== id);
        localStorage.setItem(STORAGE_KEYS.COST_WITHDRAWALS, JSON.stringify(list));
        this.triggerSync();
        return list;
    },

    // --- Custom Categories ---
    getCustomCategories() {
        return JSON.parse(localStorage.getItem(STORAGE_KEYS.CUSTOM_CATEGORIES) || '[]');
    },

    addCustomCategory(cat) {
        const list = this.getCustomCategories();
        // Prevent duplicates (by ID)
        if (!list.find(c => c.id === cat.id)) {
            list.push(cat);
            localStorage.setItem(STORAGE_KEYS.CUSTOM_CATEGORIES, JSON.stringify(list));
            this.triggerSync();
        }
        return list;
    },

    removeCustomCategory(id) {
        let list = this.getCustomCategories();
        list = list.filter(c => c.id !== id);
        localStorage.setItem(STORAGE_KEYS.CUSTOM_CATEGORIES, JSON.stringify(list));
        this.triggerSync();
        return list;
    },

    // --- Cost Withdrawals (ถอนเงินจากกองทุนต้นทุน) ---
    getCostWithdrawals() {
        return JSON.parse(localStorage.getItem(STORAGE_KEYS.COST_WITHDRAWALS) || '[]');
    },

    addCostWithdrawal(withdrawal) {
        // 1. Add to Withdrawals List (Data Source for Biz Page)
        const wList = this.getCostWithdrawals();
        const id = Date.now().toString();

        const newWithdrawal = {
            id: id,
            timestamp: new Date().toISOString(),
            ...withdrawal
        };

        wList.unshift(newWithdrawal);
        localStorage.setItem(STORAGE_KEYS.COST_WITHDRAWALS, JSON.stringify(wList));

        // 2. Add to Transactions List (as Expense)
        this.addTransaction({
            type: 'expense',
            amount: withdrawal.amount,
            category: 'withdrawal',
            description: withdrawal.note || 'ถอนเงินจากกองทุน',
            date: withdrawal.date,
            isFundWithdrawal: true,
            linkedWithdrawalId: id
        });

        return wList;
    },

    deleteCostWithdrawal(id) {
        // 1. Delete from Withdrawals List
        let list = this.getCostWithdrawals();
        list = list.filter(w => w.id !== id);
        localStorage.setItem(STORAGE_KEYS.COST_WITHDRAWALS, JSON.stringify(list));

        // 2. Delete linked Transaction
        let txList = this.getTransactions();
        const initialLen = txList.length;
        txList = txList.filter(t => t.linkedWithdrawalId !== id);

        if (txList.length !== initialLen) {
            localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(txList));
        }

        this.triggerSync();
        return list;
    },


    clearAll() {
        const url = this.getApiUrl(); // Keep URL
        localStorage.clear();
        this.init();
        if (url) this.setApiUrl(url);
    },

    // --- Cloud Sync Logic ---

    // โหลดข้อมูลจาก Cloud มาทับ Local (Full Pull)
    async pullFromCloud() {
        const apiUrl = this.getApiUrl();
        if (!apiUrl) return { status: 'no_url' };

        try {
            // ใช้ cache: 'no-cache' เพื่อให้ได้ข้อมูลล่าสุดเสมอ
            const response = await fetch(`${apiUrl}?action=getAll`, {
                method: 'GET',
                redirect: 'follow'
            });

            if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);

            const result = await response.json();

            if (result && result.status !== 'error') {
                // Fix: Ensure all IDs are Strings to prevent delete/edit bugs
                if (result.transactions) {
                    const txs = result.transactions.map(t => ({
                        ...t,
                        id: String(t.id),
                        linkedWithdrawalId: t.linkedWithdrawalId ? String(t.linkedWithdrawalId) : undefined
                    }));
                    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(txs));
                }

                if (result.investments) {
                    const invs = result.investments.map(i => ({ ...i, id: String(i.id) }));
                    localStorage.setItem(STORAGE_KEYS.INVESTMENTS, JSON.stringify(invs));
                }

                if (result.withdrawals) {
                    const ws = result.withdrawals.map(w => ({ ...w, id: String(w.id) }));
                    localStorage.setItem(STORAGE_KEYS.COST_WITHDRAWALS, JSON.stringify(ws));
                }

                if (result.customCategories) {
                    const cats = result.customCategories.map(c => ({ ...c, id: String(c.id) }));
                    localStorage.setItem(STORAGE_KEYS.CUSTOM_CATEGORIES, JSON.stringify(cats));
                }

                if (result.settings) localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(result.settings));

                return { status: 'success' };
            } else {
                throw new Error(result.message || 'Unknown cloud error');
            }
        } catch (error) {
            console.error("Cloud Pull Error:", error);
            return { status: 'error', message: error.message };
        }
    },

    // ส่งข้อมูล Local ไปทับ Cloud (Full Push)
    async pushToCloud() {
        const apiUrl = this.getApiUrl();
        if (!apiUrl) return { status: 'no_url' };

        const payload = {
            transactions: this.getTransactions(),
            investments: this.getInvestments(),
            withdrawals: this.getCostWithdrawals(),
            customCategories: this.getCustomCategories(),
            settings: this.getSettings()
        };

        try {
            const response = await fetch(apiUrl, {
                method: 'POST',
                redirect: 'follow',
                body: JSON.stringify(payload)
            });
            const result = await response.json();
            return result;
        } catch (error) {
            console.error("Cloud Push Error:", error);
            return { status: 'error', message: error.message };
        }
    },


    // Debounced Sync Helper
    // Debounced Sync Helper
    triggerSync() {
        const apiUrl = this.getApiUrl();
        if (!apiUrl) return;

        // Show Syncing Status on UI if element exists
        const statusEl = document.getElementById('syncStatus');
        if (statusEl) {
            statusEl.textContent = '⏳ กำลังบันทึก...';
            statusEl.style.color = '#FFA500'; // Orange
        }

        // Simple debounce
        if (this._syncTimeout) clearTimeout(this._syncTimeout);
        this._syncTimeout = setTimeout(async () => {
            const result = await this.pushToCloud();
            if (statusEl) {
                if (result.status === 'success') {
                    statusEl.textContent = '✅ บันทึกแล้ว';
                    statusEl.style.color = 'var(--secondary-mint)';
                    // setTimeout(() => statusEl.textContent = '☁️ ออนไลน์', 3000);
                } else {
                    statusEl.textContent = '❌ บันทึกไม่ได้';
                    statusEl.style.color = 'var(--color-expense)';
                    console.error("Sync Failed:", result);
                }
            }
        }, 2000); // Wait 2 seconds of inactivity before syncing
    }
};

StorageManager.init();
window.StorageManager = StorageManager;
