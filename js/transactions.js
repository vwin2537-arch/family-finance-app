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
            .filter(t => t.type === TRANSACTION_TYPES.EXPENSE && !t.isFundWithdrawal && t.category !== 'withdrawal')
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
        const investments = StorageManager.getInvestments();
        const settings = StorageManager.getSettings();
        const costPercent = settings.costPercent || 30;

        // คำนวณยอดหักต้นทุนสะสม (จากรายรับที่เลือก deductCost = true)
        const totalDeducted = transactions
            .filter(t => t.type === 'income' && t.deductCost === true)
            .reduce((sum, t) => sum + (parseFloat(t.amount || 0) * costPercent / 100), 0);

        // คำนวณยอดลงทุนรวม
        const totalInvestments = investments
            .reduce((sum, inv) => sum + parseFloat(inv.amount || 0), 0);

        // คำนวณยอดถอนออก
        const totalWithdrawn = withdrawals.reduce((sum, w) => sum + parseFloat(w.amount || 0), 0);

        return {
            totalDeducted,      // ยอดหักสะสม
            totalInvestments,   // ยอดลงทุนรวม
            totalWithdrawn,     // ยอดถอนออก
            balance: totalDeducted + totalInvestments - totalWithdrawn,  // ยอดคงเหลือ (รวมเงินลงทุน)
            costPercent,
            withdrawals
        };
    },

    /**
     * คำนวณส่วนแบ่งกำไร (รองรับเปอร์เซ็นต์แยกรายการและฟิลเตอร์เดือน)
     * = รายรับ - ต้นทุนที่หัก (ถ้าหัก) แล้วแบ่งตามสัดส่วนที่กำหนดในแต่ละรายการ
     */
    getProfitShare(monthFilter = null) {
        const transactions = StorageManager.getTransactions();
        const settings = StorageManager.getSettings();
        const costPercent = settings.costPercent || 30;

        // Filter by month if provided
        let filteredTxs = transactions;
        if (monthFilter) {
            const [year, month] = monthFilter.split('-');
            filteredTxs = transactions.filter(t => {
                const d = new Date(t.date);
                return d.getFullYear() == year && (d.getMonth() + 1) == month;
            });
        }

        let husbandTotal = 0;
        let wifeTotal = 0;
        let totalProfit = 0;

        // Calculate per-transaction profit shares
        filteredTxs.filter(t => t.type === 'income').forEach(t => {
            const amount = parseFloat(t.amount || 0);
            let profitAmount = amount;

            // Deduct cost if applicable
            if (t.deductCost === true) {
                profitAmount = amount * (100 - costPercent) / 100;
            }

            totalProfit += profitAmount;

            // Use per-transaction percentages (default to global settings if not set)
            const hShare = t.husbandShare ?? settings.husbandShare ?? 50;
            const wShare = t.wifeShare ?? settings.wifeShare ?? 50;

            husbandTotal += profitAmount * hShare / 100;
            wifeTotal += profitAmount * wShare / 100;
        });

        // Deduct expenses (EXCLUDING Fund Withdrawals as per user request)
        const totalExpense = filteredTxs
            .filter(t => t.type === 'expense' && !t.isFundWithdrawal && t.category !== 'withdrawal')
            .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);


        const netProfit = totalProfit - totalExpense;

        // Split net profit proportionally
        const totalShares = husbandTotal + wifeTotal;
        let finalHusbandProfit = 0;
        let finalWifeProfit = 0;

        if (totalShares > 0 && netProfit > 0) {
            finalHusbandProfit = netProfit * (husbandTotal / totalShares);
            finalWifeProfit = netProfit * (wifeTotal / totalShares);
        }

        return {
            totalProfit,
            totalExpense,
            netProfit,
            husband: {
                share: totalShares > 0 ? Math.round(husbandTotal / totalShares * 100) : 50,
                amount: Math.max(0, finalHusbandProfit)
            },
            wife: {
                share: totalShares > 0 ? Math.round(wifeTotal / totalShares * 100) : 50,
                amount: Math.max(0, finalWifeProfit)
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
