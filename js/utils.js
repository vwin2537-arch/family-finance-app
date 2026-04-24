/**
 * Family Biz - Constants & Utilities
 */

// Define Categories globally once to avoid redeclaration errors
// Define Default Categories
const DEFAULT_CATEGORIES = {
    INCOME: [
        { id: 'sales', name: 'ขายสินค้า', icon: '🛒' },
        { id: 'service', name: 'บริการ', icon: '🔧' },
        { id: 'other', name: 'อื่นๆ', icon: '📥' }
    ],
    EXPENSE: [
        { id: 'cost', name: 'ต้นทุนสินค้า', icon: '📦' },
        { id: 'shipping', name: 'ค่าขนส่ง', icon: '🚚' },
        { id: 'ads', name: 'โฆษณา', icon: '📢' },
        { id: 'rent', name: 'ค่าเช่า', icon: '🏪' },
        { id: 'utility', name: 'ค่าน้ำ/ไฟ', icon: '💡' },
        { id: 'withdrawal', name: 'ถอนเงินกองทุน', icon: '📤' },
        { id: 'other_out', name: 'อื่นๆ', icon: '💸' }
    ]

};

window.DEFAULT_CATEGORIES = DEFAULT_CATEGORIES; // Backwards compatibility if needed

const Utils = {
    getCategories(type) {
        // Ensure StorageManager is available
        const custom = window.StorageManager ? window.StorageManager.getCustomCategories() : [];
        const defaults = result = (type === 'income') ? DEFAULT_CATEGORIES.INCOME : DEFAULT_CATEGORIES.EXPENSE;

        // Filter custom cats by type
        const customByType = custom.filter(c => c.type === type);

        return [...defaults, ...customByType];
    },

    getAllCategories() {
        return [...this.getCategories('income'), ...this.getCategories('expense')];
    },

    getToday() {
        const d = new Date();
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    },

    formatNumber(num) {
        return parseFloat(num || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    },

    formatDate(dateStr) {
        if (!dateStr) return '-';
        const date = new Date(dateStr);
        return date.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
    }
};

window.Utils = Utils;
