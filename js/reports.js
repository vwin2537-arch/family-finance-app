/**
 * Family Biz - Reports Manager
 * Handles chart rendering and data aggregation for reports
 */

const ReportsManager = {
    charts: {},

    // Initialize Charts
    initCharts() {
        const canvasTrend = document.getElementById('trendChart');
        const canvasCat = document.getElementById('categoryChart');

        if (canvasTrend) {
            this.charts.trend = new Chart(canvasTrend, {
                type: 'line',
                data: {
                    labels: ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.'], // Dummy labels for now
                    datasets: [
                        {
                            label: 'รายรับ',
                            data: [0, 0, 0, 0, 0, 0],
                            borderColor: '#10b981',
                            tension: 0.4
                        },
                        {
                            label: 'รายจ่าย',
                            data: [0, 0, 0, 0, 0, 0],
                            borderColor: '#ef4444',
                            tension: 0.4
                        }
                    ]
                },
                options: {
                    responsive: true,
                    plugins: { legend: { position: 'top', labels: { color: '#fff' } } },
                    scales: {
                        x: { ticks: { color: '#a0a0b0' }, grid: { color: 'rgba(255,255,255,0.05)' } },
                        y: { ticks: { color: '#a0a0b0' }, grid: { color: 'rgba(255,255,255,0.05)' } }
                    }
                }
            });
        }

        if (canvasCat) {
            this.charts.category = new Chart(canvasCat, {
                type: 'doughnut',
                data: {
                    labels: [],
                    datasets: [{
                        data: [],
                        backgroundColor: [
                            '#ef4444', '#f59e0b', '#8b5cf6', '#3b82f6', '#10b981', '#6366f1'
                        ],
                        borderWidth: 0
                    }]
                },
                options: {
                    responsive: true,
                    plugins: { legend: { position: 'right', labels: { color: '#fff' } } }
                }
            });
        }
    },

    // Update charts data (Dummy data for mock phase)
    updateCharts(period = 'month') {
        // Validation: Logic to aggregate real data would go here
        // For MVP/Proto, we will keep static or basic aggregation
    },

    // Refresh report statistics
    refreshStats() {
        const summary = TransactionsManager.getSummary('month');

        document.getElementById('reportTotalIncome').textContent = `฿${TransactionsManager.formatNumber(summary.income)}`;
        document.getElementById('reportTotalExpense').textContent = `฿${TransactionsManager.formatNumber(summary.expense)}`;
        document.getElementById('reportNetProfit').textContent = `฿${TransactionsManager.formatNumber(summary.netProfit)}`;
    }
};

window.ReportsManager = ReportsManager;
