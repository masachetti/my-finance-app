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
    noBudgets: 'No budgets yet. Click "Add Budget" to create your first budget!',
    deleteTitle: 'Delete Budget',
    deleteConfirmation: 'Are you sure you want to delete this budget? This action cannot be undone.',
    month: 'Month',
    limit: 'Limit',
    spent: 'Spent',
    remaining: 'Remaining',
    progress: 'Progress',
    // Summary stats
    totalBudgeted: 'Total Budgeted',
    totalSpent: 'Total Spent',
    totalRemaining: 'Remaining',
    // Status badges
    overBudget: 'Over Budget',
    nearLimit: 'Near Limit',
    onTrack: 'On Track',
    // Progress labels
    spentLabel: 'spent',
    limitLabel: 'limit',
    remainingLabel: 'remaining',
    overLabel: 'over',
    // Loading and error states
    loadingBudgets: 'Loading budgets...',
    // Aria labels
    previousMonthAriaLabel: 'Previous month',
    nextMonthAriaLabel: 'Next month',
    editBudgetAriaLabel: 'Edit budget',
    deleteBudgetAriaLabel: 'Delete budget',
    // Modal
    category: 'Category',
    budget: 'Budget',
    // Delete confirmation
    unknownCategory: 'Unknown',
  },
  categories: {
    title: 'Categories',
    subtitle: 'Organize your transactions',
    addCategory: 'Add Category',
    editCategory: 'Edit Category',
    noCategories: 'No categories yet. Click "Add Category" to get started!',
    deleteTitle: 'Delete Category',
    deleteConfirmation: 'Are you sure you want to delete "{name}"? This action cannot be undone.',
    deleteWarning: 'Note: Existing transactions will remain but will lose their category association.',
    name: 'Name',
    type: 'Type',
    color: 'Color',
    icon: 'Icon',
    // Section headings
    incomeCategories: 'Income Categories',
    expenseCategories: 'Expense Categories',
    // Empty states
    noIncomeCategories: 'No income categories yet.',
    noExpenseCategories: 'No expense categories yet.',
    // Loading states
    loadingCategories: 'Loading categories...',
    // Aria labels
    editCategoryAriaLabel: 'Edit category',
    deleteCategoryAriaLabel: 'Delete category',
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
      categoryRequired: 'Please select a category',
      month: 'Month',
      monthRequired: 'Please select a month',
      invalidMonth: 'Invalid month format',
      limit: 'Budget Limit',
      limitPlaceholder: '0.00',
      limitRequired: 'Please enter a valid amount',
      limitPositive: 'Budget amount must be greater than 0',
      limitHelp: 'Maximum amount you plan to spend in this category',
      noExpenseCategories: 'No expense categories available. Please create one first.',
    },
    category: {
      name: 'Category Name',
      namePlaceholder: 'e.g., Groceries, Salary, Rent',
      nameRequired: 'Category name is required',
      nameMinLength: 'Category name must be at least 2 characters',
      type: 'Type',
      income: 'Income',
      expense: 'Expense',
      color: 'Color',
      selectColor: 'Select color {color}',
      icon: 'Icon (Optional)',
      iconPlaceholder: 'Ex: 🏠, 🍔, 💰',
      iconHelp: 'Select an emoji for this category',
      chooseEmoji: 'Choose Emoji'
    }
  }
}
