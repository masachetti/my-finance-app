export default {
  common: {
    loading: 'Loading...',
    cancel: 'Cancel',
    delete: 'Delete',
    create: 'Create',
    update: 'Update',
    edit: 'Edit',
    save: 'Save',
    actions: 'Actions',
    noDescription: 'No description',
    uncategorized: 'Uncategorized'
  },
  nav: {
    appName: 'My Finance App',
    dashboard: 'Dashboard',
    transactions: 'Transactions',
    budgets: 'Budgets',
    categories: 'Categories',
    logout: 'Logout'
  },
  auth: {
    login: {
      title: 'My Finance App',
      subtitle: 'Sign in to manage your finances',
      email: 'Email',
      emailPlaceholder: 'your@email.com',
      password: 'Password',
      passwordPlaceholder: '••••••••',
      signIn: 'Sign In',
      loading: 'Loading...'
    }
  },
  dashboard: {
    title: 'Dashboard',
    welcomeBack: 'Welcome back',
    totalBalance: 'Total Balance',
    thisMonthIncome: 'This Month Income',
    thisMonthExpenses: 'This Month Expenses',
    recentTransactions: 'Recent Transactions',
    loadingTransactions: 'Loading transactions...',
    noTransactions: 'No transactions yet. Start by adding your first transaction!',
    viewAllTransactions: 'View all transactions'
  },
  transactions: {
    title: 'Transactions',
    subtitle: 'Manage your income and expenses',
    addTransaction: 'Add Transaction',
    editTransaction: 'Edit Transaction',
    allTransactions: 'All Transactions',
    income: 'Income',
    expenses: 'Expenses',
    totalIncome: 'Total Income',
    totalExpenses: 'Total Expenses',
    balance: 'Balance',
    loadingTransactions: 'Loading transactions...',
    noTransactions: 'No transactions yet. Click "Add Transaction" to get started!',
    noIncomeTransactions: 'No income transactions found.',
    noExpenseTransactions: 'No expense transactions found.',
    deleteTitle: 'Delete Transaction',
    deleteConfirmation: 'Are you sure you want to delete this transaction? This action cannot be undone.',
    amount: 'Amount',
    category: 'Category',
    description: 'Description',
    type: 'Type',
    date: 'Date',
    editAriaLabel: 'Edit transaction',
    deleteAriaLabel: 'Delete transaction'
  },
  budgets: {
    title: 'Budgets',
    subtitle: 'Set and track your monthly spending limits',
    addBudget: 'Add Budget',
    editBudget: 'Edit Budget',
    noBudgets: 'No budgets yet. Click "Add Budget" to get started!',
    deleteTitle: 'Delete Budget',
    deleteConfirmation: 'Are you sure you want to delete this budget? This action cannot be undone.',
    month: 'Month',
    limit: 'Limit',
    spent: 'Spent',
    remaining: 'Remaining',
    progress: 'Progress'
  },
  categories: {
    title: 'Categories',
    subtitle: 'Organize your transactions with custom categories',
    addCategory: 'Add Category',
    editCategory: 'Edit Category',
    noCategories: 'No categories yet. Click "Add Category" to get started!',
    deleteTitle: 'Delete Category',
    deleteConfirmation: 'Are you sure you want to delete this category? This action cannot be undone.',
    name: 'Name',
    type: 'Type',
    color: 'Color',
    icon: 'Icon'
  },
  forms: {
    transaction: {
      category: 'Category',
      categoryPlaceholder: 'Select a category',
      amount: 'Amount',
      amountPlaceholder: '0.00',
      description: 'Description',
      descriptionPlaceholder: 'Optional description',
      date: 'Date',
      type: 'Type',
      income: 'Income',
      expense: 'Expense'
    },
    budget: {
      category: 'Category',
      categoryPlaceholder: 'Select a category',
      month: 'Month',
      limit: 'Limit',
      limitPlaceholder: '0.00'
    },
    category: {
      name: 'Name',
      namePlaceholder: 'Category name',
      type: 'Type',
      income: 'Income',
      expense: 'Expense',
      color: 'Color',
      icon: 'Icon (optional)',
      iconPlaceholder: 'Ex: 🏠, 🍔, 💰',
      chooseEmoji: 'Choose Emoji'
    }
  }
}
