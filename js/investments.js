/**
 * Family Biz - Investments Manager
 * Handles investment tracking, profit sharing logic, and dividend calculation
 */

const InvestmentsManager = {
    // Get Investment Overview
    getOverview() {
        const investments = StorageManager.getInvestments();

        let husbandTotal = 0;
        let wifeTotal = 0;

        investments.forEach(inv => {
            if (inv.investor === 'husband') husbandTotal += parseFloat(inv.amount);
            if (inv.investor === 'wife') wifeTotal += parseFloat(inv.amount);
        });

        const total = husbandTotal + wifeTotal;
        const husbandShare = total > 0 ? (husbandTotal / total) * 100 : 0;
        const wifeShare = total > 0 ? (wifeTotal / total) * 100 : 0;

        return {
            total,
            husband: {
                amount: husbandTotal,
                share: husbandShare
            },
            wife: {
                amount: wifeTotal,
                share: wifeShare
            },
            history: investments
        };
    },

    // Calculate Dividends based on current month's profit
    calculateDividends(monthlyProfit) {
        const settings = StorageManager.getSettings();
        const overview = this.getOverview();

        // Deduct cost buffer
        const costDeduction = monthlyProfit > 0 ? monthlyProfit * (settings.costPercent / 100) : 0;
        const distributable = monthlyProfit - costDeduction;

        // Split based on share
        const husbandDividend = distributable > 0 ? distributable * (overview.husband.share / 100) : 0;
        const wifeDividend = distributable > 0 ? distributable * (overview.wife.share / 100) : 0;

        return {
            profit: monthlyProfit,
            deduction: costDeduction,
            deductionPercent: settings.costPercent,
            distributable,
            husband: husbandDividend,
            wife: wifeDividend
        };
    },

    // Render Investment History
    renderHistory(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const investments = StorageManager.getInvestments();
        container.innerHTML = '';

        if (investments.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <span class="empty-icon">💎</span>
                    <p>ยังไม่มีรายการลงทุน</p>
                </div>
            `;
            return;
        }

        investments.forEach(inv => {
            const el = document.createElement('div');
            el.className = 'transaction-item';
            el.innerHTML = `
                <div class="transaction-icon">💎</div>
                <div class="transaction-info">
                    <div class="transaction-category">${inv.note || 'เพิ่มทุน'}</div>
                    <div class="transaction-date">${TransactionsManager.formatDate(inv.date)}</div>
                </div>
                <div class="transaction-amount invest">
                    ${inv.investor === 'husband' ? '👨' : '👩'} ฿${TransactionsManager.formatNumber(inv.amount)}
                </div>
            `;
            container.appendChild(el);
        });
    }
};

window.InvestmentsManager = InvestmentsManager;
