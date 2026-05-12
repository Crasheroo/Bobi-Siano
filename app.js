// ===== DATA MANAGEMENT =====
class SavingsApp {
    constructor() {
        this.expenses = JSON.parse(localStorage.getItem('expenses')) || [];
        this.goals = JSON.parse(localStorage.getItem('goals')) || [];
        this.chart = null;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setTodayDate();
        this.loadTheme();
        this.render();
    }

    // ===== LOCAL STORAGE =====
    save() {
        localStorage.setItem('expenses', JSON.stringify(this.expenses));
        localStorage.setItem('goals', JSON.stringify(this.goals));
    }

    loadTheme() {
        const savedTheme = localStorage.getItem('theme') || 'dark';
        document.documentElement.setAttribute('data-theme', savedTheme);
        this.updateThemeToggle();
    }

    updateThemeToggle() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const themeToggle = document.getElementById('themeToggle');
        themeToggle.textContent = currentTheme === 'dark' ? '☀️' : '🌙';
    }

    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        this.updateThemeToggle();
    }

    // ===== EVENT LISTENERS =====
    setupEventListeners() {
        // Expense Form
        document.getElementById('expenseForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addExpense();
        });

        // Goal Form
        document.getElementById('goalForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addGoal();
        });

        // Navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                this.switchTab(e.currentTarget.dataset.tab);
            });
        });

        // Theme Toggle
        document.getElementById('themeToggle').addEventListener('click', () => {
            this.toggleTheme();
        });

        // Coach
        document.getElementById('getAdviceBtn').addEventListener('click', () => {
            this.showAdvice();
        });

        // History & Filters
        document.getElementById('searchInput').addEventListener('input', () => {
            this.filterExpenses();
        });

        document.getElementById('filterCategory').addEventListener('change', () => {
            this.filterExpenses();
        });

        // Actions
        document.getElementById('clearDataBtn').addEventListener('click', () => {
            this.clearAllData();
        });

        document.getElementById('exportDataBtn').addEventListener('click', () => {
            this.exportData();
        });
    }

    setTodayDate() {
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('date').value = today;
    }

    // ===== TAB SWITCHING =====
    switchTab(tabName) {
        // Hide all tabs
        document.querySelectorAll('.tab-content').forEach(tab => {
            tab.classList.remove('active');
        });

        // Remove active from nav items
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });

        // Show selected tab
        document.getElementById(tabName).classList.add('active');

        // Mark nav item as active
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

        // Render chart when dashboard is opened
        if (tabName === 'dashboardTab') {
            setTimeout(() => this.renderChart(), 100);
        }

        // Load tips when coach tab is opened
        if (tabName === 'coachTab') {
            this.loadTips();
        }
    }

    // ===== EXPENSE MANAGEMENT =====
    addExpense() {
        const amount = parseFloat(document.getElementById('amount').value);
        const category = document.getElementById('category').value;
        const description = document.getElementById('description').value;
        const date = document.getElementById('date').value;

        if (amount <= 0 || !category || !date) {
            alert('Uzupełnij wszystkie pola!');
            return;
        }

        const expense = {
            id: Date.now(),
            amount,
            category,
            description,
            date,
            timestamp: new Date().getTime()
        };

        this.expenses.push(expense);
        this.save();

        // Reset form
        document.getElementById('expenseForm').reset();
        this.setTodayDate();

        // Feedback
        this.showNotification(`✅ Wydatek "${category}" został dodany!`);
        this.render();
    }

    deleteExpense(id) {
        this.expenses = this.expenses.filter(e => e.id !== id);
        this.save();
        this.render();
        this.showNotification('🗑️ Wydatek usunięty');
    }

    filterExpenses() {
        const searchTerm = document.getElementById('searchInput').value.toLowerCase();
        const selectedCategory = document.getElementById('filterCategory').value;

        const filtered = this.expenses.filter(expense => {
            const matchesSearch = 
                expense.description.toLowerCase().includes(searchTerm) ||
                expense.category.toLowerCase().includes(searchTerm);
            const matchesCategory = !selectedCategory || expense.category === selectedCategory;
            return matchesSearch && matchesCategory;
        });

        this.renderHistoryList(filtered);
    }

    // ===== GOAL MANAGEMENT =====
    addGoal() {
        const name = document.getElementById('goalName').value;
        const amount = parseFloat(document.getElementById('goalAmount').value);
        const saved = parseFloat(document.getElementById('goalSaved').value) || 0;

        if (!name || amount <= 0) {
            alert('Uzupełnij wszystkie pola!');
            return;
        }

        const goal = {
            id: Date.now(),
            name,
            targetAmount: amount,
            saved,
            createdAt: new Date().getTime()
        };

        this.goals.push(goal);
        this.save();

        // Reset form
        document.getElementById('goalForm').reset();

        this.showNotification(`🎯 Cel "${name}" został dodany!`);
        this.render();
    }

    deleteGoal(id) {
        this.goals = this.goals.filter(g => g.id !== id);
        this.save();
        this.render();
        this.showNotification('🗑️ Cel usunięty');
    }

    updateGoalSaved(id, amount) {
        const goal = this.goals.find(g => g.id === id);
        if (goal) {
            goal.saved = Math.max(0, amount);
            this.save();
            this.render();
        }
    }

    // ===== CALCULATIONS =====
    getTotalSpent() {
        return this.expenses.reduce((sum, e) => sum + e.amount, 0);
    }

    getTodaySpent() {
        const today = new Date().toISOString().split('T')[0];
        return this.expenses
            .filter(e => e.date === today)
            .reduce((sum, e) => sum + e.amount, 0);
    }

    getAverageDailySpent() {
        if (this.expenses.length === 0) return 0;
        const uniqueDates = new Set(this.expenses.map(e => e.date));
        return (this.getTotalSpent() / uniqueDates.size).toFixed(2);
    }

    getTopCategory() {
        if (this.expenses.length === 0) return '-';
        const categories = {};
        this.expenses.forEach(e => {
            categories[e.category] = (categories[e.category] || 0) + e.amount;
        });
        return Object.entries(categories).sort((a, b) => b[1] - a[1])[0][0];
    }

    getMaxExpense() {
        if (this.expenses.length === 0) return 0;
        return Math.max(...this.expenses.map(e => e.amount));
    }

    getCategoryData() {
        const categories = {};
        this.expenses.forEach(e => {
            categories[e.category] = (categories[e.category] || 0) + e.amount;
        });
        return categories;
    }

    // ===== COACH & TIPS =====
    showAdvice() {
        const advice = this.generateAdvice();
        document.getElementById('coachMessage').textContent = advice;
    }

    generateAdvice() {
        const advices = [
            "💡 Spróbuj zasady 50/30/20: 50% na potrzeby, 30% na chęci, 20% na oszczędności.",
            "🎯 Ustaw automatyczne transfery na konto oszczędnościowe zaraz po otrzymaniu wypłaty.",
            "📱 Śledź każdy wydatek - świadomość to pierwszy krok do zmian!",
            "☕ Rezygnacja z codziennej kawy może ci zaoszczędzić 600 zł rocznie!",
            "🚗 Rozważ transport publiczny - może zaoszczędzić setki złotych miesięcznie.",
            "🍕 Gotuj w domu - restauracje pobierają więcej nawet o 300%!",
            "💳 Unikaj impulsywnych zakupów - czekaj 3 dni zanim coś kupić.",
            "📊 Porównuj ceny przy zakupach - często możesz zaoszczędzić 10-30%.",
            "🏦 Inwestuj oszczędności - nawet 2% zysku rocznie to coś.",
            "⏰ Payday first - najpierw oszczędzaj, resztę wydaj.",
            "🎁 Rezygnuj z niepotrzebnych subskrypcji - mogą cię kosztować tysiące rocznie!",
            "👕 Wyprzedaże i second-hand to świetne miejsca do oszczędzania.",
            "💪 Motywacja: każde 100 zł oszczędności to już coś, pamiętaj!",
            "📈 Zwiększ dochód - dodatkowa praca to szybsza droga do celu.",
            "🎉 Świętuj każdy milestone - oszczędzanie to maraton, nie sprint!"
        ];
        return advices[Math.floor(Math.random() * advices.length)];
    }

    loadTips() {
        const tips = [
            "🍕 Zrób listę zakupów i trzymaj się jej - impulsywne zakupy pochłaniają budżet",
            "💳 Używaj gotówki zamiast karty - wydajesz bardziej świadomie",
            "📱 Wyloguj się z apek bankowych - mniej pokus do robienia transferów",
            "🎬 Streaming - ogranicz do 2 subskrypcji maksimum",
            "🚗 Karpol do pracy - oszczędź paliwo, poznaj ludzi!",
            "☕ Kawa z domu - nawet 200 zł miesięcznie oszczędności",
            "🏃 Czytaj o finansach - edukacja to klucz do sukcesu",
            "📊 Raportuj postępy - widoczne wyniki motywują",
            "🎯 Wyzwania - próbuj nie wydawać przez dni bez wydatków",
            "👥 Zaraź oszczędzaniem - znajomych, rodzinę, znajomych!"
        ];

        const tipsList = document.getElementById('tipsList');
        tipsList.innerHTML = tips.map(tip => `
            <div class="tip-item">${tip}</div>
        `).join('');
    }

    // ===== RENDERING =====
    render() {
        this.updateStats();
        this.renderRecentExpenses();
        this.renderGoals();
    }

    updateStats() {
        document.getElementById('totalSpent').textContent = this.formatCurrency(this.getTotalSpent());
        document.getElementById('todaySpent').textContent = this.formatCurrency(this.getTodaySpent());
        document.getElementById('avgDaily').textContent = this.formatCurrency(this.getAverageDailySpent());
        document.getElementById('topCategory').textContent = this.getCategoryEmoji(this.getTopCategory());
        document.getElementById('expenseCount').textContent = this.expenses.length;
        document.getElementById('maxExpense').textContent = this.formatCurrency(this.getMaxExpense());
    }

    renderRecentExpenses() {
        const recent = this.expenses.slice().reverse().slice(0, 5);
        const container = document.getElementById('recentExpenses');

        if (recent.length === 0) {
            container.innerHTML = '<p class="empty-state">Brak wydatków. Zacznij dodawać! 💰</p>';
            return;
        }

        container.innerHTML = recent.map(expense => `
            <div class="expense-item">
                <div class="expense-header">
                    <div>
                        <div class="expense-category">${this.getCategoryEmoji(expense.category)} ${expense.category}</div>
                        ${expense.description ? `<div class="expense-description">${expense.description}</div>` : ''}
                        <div class="expense-date">${new Date(expense.date).toLocaleDateString('pl-PL')}</div>
                    </div>
                    <div class="expense-amount">+${this.formatCurrency(expense.amount)}</div>
                </div>
                <button class="expense-delete" onclick="app.deleteExpense(${expense.id})">🗑️</button>
            </div>
        `).join('');
    }

    renderHistoryList(expenses) {
        const container = document.getElementById('historyList');

        if (expenses.length === 0) {
            container.innerHTML = '<p class="empty-state">Brak wydatków do wyświetlenia 📭</p>';
            return;
        }

        const sorted = expenses.slice().reverse();
        container.innerHTML = sorted.map(expense => `
            <div class="expense-item">
                <div class="expense-header">
                    <div>
                        <div class="expense-category">${this.getCategoryEmoji(expense.category)} ${expense.category}</div>
                        ${expense.description ? `<div class="expense-description">${expense.description}</div>` : ''}
                        <div class="expense-date">${new Date(expense.date).toLocaleDateString('pl-PL')}</div>
                    </div>
                    <div class="expense-amount">+${this.formatCurrency(expense.amount)}</div>
                </div>
                <button class="expense-delete" onclick="app.deleteExpense(${expense.id})">🗑️</button>
            </div>
        `).join('');
    }

    renderGoals() {
        const container = document.getElementById('goalsList');

        if (this.goals.length === 0) {
            container.innerHTML = '<p class="empty-state">Brak celów. Zaplanuj coś wspaniałego! 🌟</p>';
            return;
        }

        container.innerHTML = this.goals.map(goal => {
            const percentage = Math.min(100, (goal.saved / goal.targetAmount) * 100);
            const remaining = Math.max(0, goal.targetAmount - goal.saved);
            
            return `
                <div class="goal-card">
                    <div class="goal-header">
                        <span class="goal-name">${goal.name}</span>
                        <button class="goal-delete" onclick="app.deleteGoal(${goal.id})">✕</button>
                    </div>
                    <div class="goal-progress-bar">
                        <div class="goal-progress-fill" style="width: ${percentage}%"></div>
                    </div>
                    <div class="goal-stats">
                        <div>Zaoszczędzono: ${this.formatCurrency(goal.saved)}</div>
                        <div>Zostało: ${this.formatCurrency(remaining)}</div>
                    </div>
                    <div style="width: 100%; font-size: 12px; color: var(--text-secondary);">
                        Postęp: ${percentage.toFixed(0)}%
                    </div>
                </div>
            `;
        }).join('');
    }

    renderChart() {
        const ctx = document.getElementById('expenseChart');
        if (!ctx) return;

        const categoryData = this.getCategoryData();
        const labels = Object.keys(categoryData).map(cat => this.getCategoryEmoji(cat) + ' ' + cat);
        const data = Object.values(categoryData);
        const colors = [
            '#6c5ce7', '#a29bfe', '#00b8a9', '#ffd93d',
            '#ff6b6b', '#6bcf7f', '#74b9ff', '#fdcb6e'
        ];

        if (this.chart) {
            this.chart.destroy();
        }

        this.chart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: colors.slice(0, labels.length),
                    borderColor: 'var(--bg-light)',
                    borderWidth: 2,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            color: 'var(--text)',
                            padding: 15,
                            font: {
                                size: 12
                            }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return context.label + ': ' + app.formatCurrency(context.parsed);
                            }
                        }
                    }
                }
            }
        });
    }

    // ===== UTILITIES =====
    formatCurrency(value) {
        if (value === null || value === undefined) return '0 zł';
        return new Intl.NumberFormat('pl-PL', {
            style: 'currency',
            currency: 'PLN',
            maximumFractionDigits: 2
        }).format(value).replace('zł', 'zł');
    }

    getCategoryEmoji(category) {
        const emojis = {
            'jedzenie': '🍕',
            'transport': '🚗',
            'rozrywka': '🎮',
            'shopping': '🛍️',
            'mieszkanie': '🏠',
            'zdrowie': '⚕️',
            'subskrypcje': '📱',
            'inne': '📌'
        };
        return emojis[category] || '📌';
    }

    showNotification(message) {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: linear-gradient(135deg, #6c5ce7 0%, #a29bfe 100%);
            color: white;
            padding: 16px 24px;
            border-radius: 12px;
            font-weight: 600;
            z-index: 10000;
            animation: slideIn 0.3s ease;
        `;
        notification.textContent = message;
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    clearAllData() {
        if (confirm('⚠️ Jesteś pewny? Ta akcja usunie wszystkie dane!')) {
            this.expenses = [];
            this.goals = [];
            this.save();
            this.render();
            this.showNotification('✅ Wszystkie dane zostały wyczyszczone');
        }
    }

    exportData() {
        const data = {
            expenses: this.expenses,
            goals: this.goals,
            exportDate: new Date().toLocaleString('pl-PL')
        };

        const dataStr = JSON.stringify(data, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `savings-backup-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        URL.revokeObjectURL(url);
        this.showNotification('💾 Dane zostały wyeksportowane');
    }
}

// ===== ADD ANIMATIONS =====
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }

    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// ===== INITIALIZE =====
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new SavingsApp();
});
