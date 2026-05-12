// ===== Data Storage =====

class SavingsApp {
    constructor() {
        this.expenses = this.loadData('expenses') || [];
        this.goals = this.loadData('goals') || [];
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setTodayDate();
        this.updateDashboard();
        this.generateAITip();
        this.setupChart();
    }

    // ===== Data Persistence =====

    saveData(key, data) {
        localStorage.setItem(key, JSON.stringify(data));
    }

    loadData(key) {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : null;
    }

    // ===== Event Listeners =====

    setupEventListeners() {
        // Tab Navigation
        document.querySelectorAll('.nav-item').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchTab(e.target.closest('.nav-item')));
        });

        // Filter Buttons
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.filterExpenses(e.target));
        });

        // File Upload
        const receiptFile = document.getElementById('receiptFile');
        if (receiptFile) {
            receiptFile.addEventListener('change', (e) => this.handleReceiptUpload(e));
        }

        // File upload click area
        const fileUpload = document.querySelector('.file-upload');
        if (fileUpload) {
            fileUpload.addEventListener('click', () => receiptFile.click());
        }
    }

    setTodayDate() {
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('expenseDate').value = today;
    }

    // ===== Tab Navigation =====

    switchTab(button) {
        const tabName = button.getAttribute('data-tab');

        // Update active nav item
        document.querySelectorAll('.nav-item').forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');

        // Update active tab content
        document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
        document.getElementById(tabName).classList.add('active');

        // Trigger tab-specific actions
        if (tabName === 'expenses') {
            this.displayExpenses();
        } else if (tabName === 'goals') {
            this.displayGoals();
        } else if (tabName === 'insights') {
            this.updateInsights();
        }
    }

    // ===== Expense Management =====

    addExpense() {
        const amount = parseFloat(document.getElementById('expenseAmount').value);
        const category = document.getElementById('expenseCategory').value;
        const description = document.getElementById('expenseDescription').value;
        const date = document.getElementById('expenseDate').value;
        const receiptFile = document.getElementById('receiptFile').files[0];

        if (!amount || amount <= 0) {
            this.showNotification('Podaj prawidłową kwotę', 'error');
            return;
        }

        if (!description.trim()) {
            this.showNotification('Podaj opis wydatku', 'error');
            return;
        }

        const expense = {
            id: Date.now(),
            amount,
            category,
            description,
            date,
            receipt: receiptFile ? URL.createObjectURL(receiptFile) : null,
            timestamp: new Date().toISOString()
        };

        this.expenses.unshift(expense);
        this.saveData('expenses', this.expenses);

        // Reset form
        document.getElementById('expenseAmount').value = '';
        document.getElementById('expenseDescription').value = '';
        document.getElementById('expenseCategory').value = 'food';
        document.getElementById('receiptFile').value = '';
        document.getElementById('receiptPreview').innerHTML = '';

        this.showNotification('✓ Wydatek dodany pomyślnie!', 'success');
        this.updateDashboard();
        this.setTodayDate();
    }

    displayExpenses(filter = 'all') {
        const container = document.getElementById('expensesList');
        let filtered = this.expenses;

        if (filter !== 'all') {
            filtered = this.expenses.filter(e => e.category === filter);
        }

        if (filtered.length === 0) {
            container.innerHTML = '<p class="empty-state">Brak wydatków w tej kategorii.</p>';
            return;
        }

        container.innerHTML = filtered.map(expense => this.createExpenseElement(expense)).join('');
    }

    createExpenseElement(expense) {
        const date = new Date(expense.date);
        const formattedDate = date.toLocaleDateString('pl-PL', { month: 'short', day: 'numeric' });
        const categoryEmoji = {
            'food': '🍔',
            'transport': '🚗',
            'entertainment': '🎮',
            'utilities': '💡',
            'other': '📦'
        };

        return `
            <div class="expense-item">
                <div class="expense-info">
                    <div style="display: flex; align-items: center;">
                        <span class="expense-category">${categoryEmoji[expense.category]}</span>
                        <span class="expense-name">${expense.description}</span>
                    </div>
                    <p class="expense-date">${formattedDate}</p>
                </div>
                <div style="display: flex; gap: 12px; align-items: center;">
                    <span class="expense-amount">-${expense.amount.toFixed(2)} zł</span>
                    <button class="btn-danger" onclick="app.deleteExpense(${expense.id})" style="padding: 4px 8px; font-size: 12px;">Usuń</button>
                </div>
            </div>
        `;
    }

    deleteExpense(id) {
        this.expenses = this.expenses.filter(e => e.id !== id);
        this.saveData('expenses', this.expenses);
        this.updateDashboard();
        this.displayExpenses();
        this.showNotification('Wydatek usunięty', 'success');
    }

    filterExpenses(button) {
        document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        const filter = button.getAttribute('data-filter');
        this.displayExpenses(filter);
    }

    handleReceiptUpload(event) {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const preview = document.getElementById('receiptPreview');
                preview.innerHTML = `<img src="${e.target.result}" alt="Paragon">`;
            };
            reader.readAsDataURL(file);
        }
    }

    // ===== Goals Management =====

    addGoal() {
        const name = document.getElementById('goalName').value;
        const amount = parseFloat(document.getElementById('goalAmount').value);
        const months = parseInt(document.getElementById('goalMonths').value);

        if (!name.trim()) {
            this.showNotification('Podaj nazwę celu', 'error');
            return;
        }

        if (!amount || amount <= 0) {
            this.showNotification('Podaj prawidłową kwotę', 'error');
            return;
        }

        if (!months || months <= 0) {
            this.showNotification('Podaj liczbę miesięcy', 'error');
            return;
        }

        const goal = {
            id: Date.now(),
            name,
            targetAmount: amount,
            currentAmount: 0,
            months,
            created: new Date().toISOString()
        };

        this.goals.push(goal);
        this.saveData('goals', this.goals);

        // Reset form
        document.getElementById('goalName').value = '';
        document.getElementById('goalAmount').value = '';
        document.getElementById('goalMonths').value = '6';

        this.showNotification('✓ Cel oszczędnościowy utworzony!', 'success');
        this.displayGoals();
    }

    displayGoals() {
        const container = document.getElementById('goalsList');

        if (this.goals.length === 0) {
            container.innerHTML = '<p class="empty-state">Brak celów. Dodaj swój pierwszy cel oszczędnościowy!</p>';
            return;
        }

        container.innerHTML = this.goals.map(goal => this.createGoalElement(goal)).join('');
    }

    createGoalElement(goal) {
        const progress = (goal.currentAmount / goal.targetAmount) * 100;
        const monthlyTarget = goal.targetAmount / goal.months;
        const daysLeft = Math.ceil((goal.months * 30 * (goal.targetAmount - goal.currentAmount)) / goal.targetAmount);

        return `
            <div class="goal-card">
                <div class="goal-header">
                    <div>
                        <h3 class="goal-title">${goal.name}</h3>
                    </div>
                    <button class="btn-danger" onclick="app.deleteGoal(${goal.id})" style="padding: 4px 8px; font-size: 12px;">Usuń</button>
                </div>
                <div class="goal-progress">
                    <div class="goal-progress-bar" style="width: ${Math.min(progress, 100)}%"></div>
                </div>
                <p style="font-size: 12px; color: #8E8E93; margin-bottom: 12px;">
                    ${progress.toFixed(0)}% osiągnięte (${goal.currentAmount.toFixed(2)} / ${goal.targetAmount.toFixed(2)} zł)
                </p>
                <div class="goal-stats">
                    <div class="goal-stat">
                        <span class="goal-stat-label">Miesięczny cel</span>
                        <span class="goal-stat-value">${monthlyTarget.toFixed(2)} zł</span>
                    </div>
                    <div class="goal-stat">
                        <span class="goal-stat-label">Dni pozostało</span>
                        <span class="goal-stat-value">${daysLeft}</span>
                    </div>
                </div>
            </div>
        `;
    }

    deleteGoal(id) {
        this.goals = this.goals.filter(g => g.id !== id);
        this.saveData('goals', this.goals);
        this.displayGoals();
        this.showNotification('Cel usunięty', 'success');
    }

    // ===== Dashboard Updates =====

    updateDashboard() {
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();

        const monthExpenses = this.expenses.filter(e => {
            const expenseDate = new Date(e.date);
            return expenseDate.getMonth() === currentMonth && expenseDate.getFullYear() === currentYear;
        });

        const totalExpenses = monthExpenses.reduce((sum, e) => sum + e.amount, 0);
        const income = 5000; // Średniowy przykładowy dochód
        const savings = income - totalExpenses;

        document.getElementById('totalBalance').textContent = `${savings.toFixed(2)} zł`;
        document.getElementById('monthlyExpenses').textContent = `-${totalExpenses.toFixed(2)} zł`;
        document.getElementById('monthlySavings').textContent = `${savings.toFixed(2)} zł`;

        this.displayRecentExpenses();
    }

    displayRecentExpenses() {
        const container = document.getElementById('recentList');
        const recent = this.expenses.slice(0, 5);

        if (recent.length === 0) {
            container.innerHTML = '<p class="empty-state">Brak wydatków. Zacznij od dodania swoich wydatków!</p>';
            return;
        }

        container.innerHTML = recent.map(expense => this.createExpenseElement(expense)).join('');
    }

    // ===== AI Coach =====

    generateAITip() {
        const tips = [
            "💡 Staraj się zaoszczędzić przynajmniej 20% swoich dochodów każdego miesiąca.",
            "📊 Przeanalizuj swoje wydatki za ostatni miesiąc i znajdź obszary do optymalizacji.",
            "🎯 Ustaw konkretny cel oszczędnościowy - jest to pierwszy krok do sukcesu finansowego.",
            "🚫 Każdy dzień bez impulsywnych zakupów to krok do Twoich celów!",
            "💰 Zamiast wydać pieniądze teraz, pomyśl czy naprawdę tego potrzebujesz.",
            "📱 Śledź swoje wydatki codziennie - świadomość jest kluczem.",
            "🏦 Rozważ automatyczne przelewy na osobne konto oszczędnościowe.",
            "🍔 Gotowanie w domu zamiast jedzenia na mieście może zaoszczędzić 1000+ zł/miesiąc!",
            "🎁 Zamiast impulsywnych zakupów, czekaj 7 dni przed każdą dużą decyzją.",
            "📈 Każdy mały krok się liczy - nawet 50 zł dziennie to 1500 zł/miesiąc!"
        ];

        const randomTip = tips[Math.floor(Math.random() * tips.length)];
        document.getElementById('aiTip').textContent = randomTip;
    }

    // ===== Analytics & Insights =====

    updateInsights() {
        this.generateRecommendations();
        setTimeout(() => this.setupChart(), 100);
    }

    generateRecommendations() {
        const monthExpenses = this.getMonthExpenses();
        const container = document.getElementById('recommendationsList');
        const recommendations = [];

        if (monthExpenses.length === 0) {
            container.innerHTML = '<p class="empty-state">Dodaj wydatki aby otrzymać rekomendacje.</p>';
            return;
        }

        // Analiza kategorii
        const categoryTotals = {};
        monthExpenses.forEach(e => {
            categoryTotals[e.category] = (categoryTotals[e.category] || 0) + e.amount;
        });

        const sorted = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);

        // Rekomendacja 1: Najwyższa kategoria
        if (sorted[0][1] > 1500) {
            const category = {
                'food': 'jedzenie',
                'transport': 'transport',
                'entertainment': 'rozrywka',
                'utilities': 'opłaty',
                'other': 'inne'
            }[sorted[0][0]];
            recommendations.push(`⚠️ Twoje wydatki na ${category} (${sorted[0][1].toFixed(2)} zł) są wysokie. Spróbuj je zmniejszyć.`);
        }

        // Rekomendacja 2: Stałe koszty
        const totalMonthly = monthExpenses.reduce((sum, e) => sum + e.amount, 0);
        if (totalMonthly > 4000) {
            recommendations.push(`💡 Twoje miesięczne wydatki (${totalMonthly.toFixed(2)} zł) są wysokie. Spróbuj się skupić na oszczędzaniu.`);
        }

        // Rekomendacja 3: Motywacja
        if (monthExpenses.length > 15) {
            recommendations.push(`✨ Świetna robota! Śledź swoje wydatki bardzo dokładnie. Kontynuuj tę dyscyplinę!`);
        }

        // Rekomendacja 4: Potencjalna oszczędność
        if (sorted[0][1] > 500) {
            recommendations.push(`🎯 Jeśli zmniejszysz wydatki o 10%, zaoszczędzisz ${(totalMonthly * 0.1).toFixed(2)} zł/miesiąc!`);
        }

        container.innerHTML = recommendations.map(r => 
            `<div class="recommendation-item">${r}</div>`
        ).join('');

        // Update insights stats
        const avgDaily = (totalMonthly / 30).toFixed(2);
        document.getElementById('avgDaily').textContent = `${avgDaily} zł`;
        document.getElementById('topCategory').textContent = {
            'food': '🍔 Jedzenie',
            'transport': '🚗 Transport',
            'entertainment': '🎮 Rozrywka',
            'utilities': '💡 Opłaty',
            'other': '📦 Inne'
        }[sorted[0][0]];
    }

    setupChart() {
        const ctx = document.getElementById('expensesChart');
        if (!ctx) return;

        const monthExpenses = this.getMonthExpenses();
        const categoryTotals = {};
        const categoryColors = {
            'food': '#FF9500',
            'transport': '#34C759',
            'entertainment': '#FF3B30',
            'utilities': '#007AFF',
            'other': '#5AC8FA'
        };

        monthExpenses.forEach(e => {
            categoryTotals[e.category] = (categoryTotals[e.category] || 0) + e.amount;
        });

        if (window.expensesChart) {
            window.expensesChart.destroy();
        }

        window.expensesChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: Object.keys(categoryTotals).map(cat => ({
                    'food': '🍔 Jedzenie',
                    'transport': '🚗 Transport',
                    'entertainment': '🎮 Rozrywka',
                    'utilities': '💡 Opłaty',
                    'other': '📦 Inne'
                }[cat])),
                datasets: [{
                    data: Object.values(categoryTotals),
                    backgroundColor: Object.keys(categoryTotals).map(cat => categoryColors[cat]),
                    borderColor: '#FFFFFF',
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            font: { size: 12, family: 'system-ui' },
                            color: '#3C3C43',
                            padding: 16
                        }
                    }
                }
            }
        });
    }

    getMonthExpenses() {
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();

        return this.expenses.filter(e => {
            const expenseDate = new Date(e.date);
            return expenseDate.getMonth() === currentMonth && expenseDate.getFullYear() === currentYear;
        });
    }

    // ===== Notifications =====

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 16px 24px;
            border-radius: 12px;
            font-weight: 600;
            z-index: 2000;
            animation: slideIn 0.3s ease;
            font-size: 14px;
        `;

        const colors = {
            'success': { bg: '#34C759', text: 'white' },
            'error': { bg: '#FF3B30', text: 'white' },
            'info': { bg: '#007AFF', text: 'white' }
        };

        const color = colors[type] || colors['info'];
        notification.style.backgroundColor = color.bg;
        notification.style.color = color.text;
        notification.textContent = message;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
}

// ===== Initialize App =====

const app = new SavingsApp();

// Animation keyframes
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
