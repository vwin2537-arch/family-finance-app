/**
 * Family Biz - Transactions Manager
 * Handles transaction logic, categorization, and calculations
 */

const TRANSACTION_TYPES = {
    INCOME: 'income',
    EXPENSE: 'expense'
};

const TransactionsManager = {
    // Get summary of transactions
    getSummary() {
        const transactions = StorageManager.getTransactions();
        const investments = StorageManager.getInvestments();

        // Calculate Investment Total
        const totalInvestment = investments.reduce((sum, inv) => sum + parseFloat(inv.amount || 0), 0);

        // Filter transactions based on current month
        const now = new Date();
        const currentMonthTransactions = transactions.filter(t => {
            const tDate = new Date(t.date);
            return tDate.getMonth() === now.getMonth() && tDate.getFullYear() === now.getFullYear();
        });

        // Calculate Revenue and Expenses
        const income = currentMonthTransactions
            .filter(t => t.type === TRANSACTION_TYPES.INCOME)
            .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);

        const expense = currentMonthTransactions
            .filter(t => t.type === TRANSACTION_TYPES.EXPENSE)
            .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);

        const netProfit = income - expense;

        return {
            totalInvestment,
            income,
            expense,
            netProfit,
            transactions: currentMonthTransactions,
            allTransactions: transactions
        };
    },

    /**
     * คำนวณกองทุนต้นทุน
     * = ผลรวมของ (รายรับที่เลือกหักต้นทุน × เปอร์เซ็นต์) - ยอดถอนออก
     */
    getCostReserve() {
        const transactions = StorageManager.getTransactions();
        const withdrawals = StorageManager.getCostWithdrawals();
        const settings = StorageManager.getSettings();
        const costPercent = settings.costPercent || 30;

        // คำนวณยอดหักต้นทุนสะสม (จากรายรับที่เลือก deductCost = true)
        const totalDeducted = transactions
            .filter(t => t.type === 'income' && t.deductCost === true)
            .reduce((sum, t) => sum + (parseFloat(t.amount || 0) * costPercent / 100), 0);

        // คำนวณยอดถอนออก
        const totalWithdrawn = withdrawals.reduce((sum, w) => sum + parseFloat(w.amount || 0), 0);

        return {
            totalDeducted,      // ยอดหักสะสม
            totalWithdrawn,     // ยอดถอนออก
            balance: totalDeducted - totalWithdrawn,  // ยอดคงเหลือ
            costPercent,
            withdrawals
        };
    },

    /**
     * คำนวณส่วนแบ่งกำไร
     * = รายรับ - ต้นทุนที่หัก (ถ้าหัก) แล้วแบ่งตามสัดส่วน
     */
    getProfitShare() {
        const transactions = StorageManager.getTransactions();
        const settings = StorageManager.getSettings();
        const costPercent = settings.costPercent || 30;
        const husbandPct = settings.husbandShare || 50;
        const wifePct = settings.wifeShare || 50;

        // คำนวณกำไรหลังหักต้นทุน
        let totalProfit = 0;
        transactions.filter(t => t.type === 'income').forEach(t => {
            const amount = parseFloat(t.amount || 0);
            if (t.deductCost === true) {
                // หักต้นทุน 30% -> กำไร 70%
                totalProfit += amount * (100 - costPercent) / 100;
            } else {
                // ไม่หักต้นทุน -> กำไรเต็ม
                totalProfit += amount;
            }
        });

        // หักรายจ่าย
        const totalExpense = transactions
            .filter(t => t.type === 'expense')
            .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);

        const netProfit = totalProfit - totalExpense;
        const positiveProfit = Math.max(0, netProfit); // ถ้าติดลบให้เป็น 0

        return {
            totalProfit,        // กำไรก่อนหักรายจ่ายทั่วไป
            totalExpense,
            netProfit,          // กำไรสุทธิ
            husband: {
                share: husbandPct,
                amount: positiveProfit * husbandPct / 100
            },
            wife: {
                share: wifePct,
                amount: positiveProfit * wifePct / 100
            }
        };
    },

    getCategory(type, catId) {
        const list = Utils.getCategories(type);
        return list.find(c => c.id === catId);
    },

    formatNumber(num) { return Utils.formatNumber(num); },
    formatDate(dateStr) { return Utils.formatDate(dateStr); }
};

window.TransactionsManager = TransactionsManager;
window.TRANSACTION_TYPES = TRANSACTION_TYPES;
