export default {
  common: {
    loading: 'Carregando...',
    cancel: 'Cancelar',
    delete: 'Excluir',
    create: 'Criar',
    update: 'Atualizar',
    edit: 'Editar',
    save: 'Salvar',
    actions: 'Ações',
    noDescription: 'Sem descrição',
    uncategorized: 'Sem categoria'
  },
  nav: {
    appName: 'Meu App de Finanças',
    dashboard: 'Dashboard',
    transactions: 'Transações',
    budgets: 'Orçamentos',
    categories: 'Categorias',
    logout: 'Sair'
  },
  auth: {
    login: {
      title: 'Meu App de Finanças',
      subtitle: 'Faça login para gerenciar suas finanças',
      email: 'Email',
      emailPlaceholder: 'seu@email.com',
      password: 'Senha',
      passwordPlaceholder: '••••••••',
      signIn: 'Entrar',
      loading: 'Carregando...'
    }
  },
  dashboard: {
    title: 'Dashboard',
    welcomeBack: 'Bem-vindo de volta',
    totalBalance: 'Saldo Total',
    thisMonthIncome: 'Receitas do Mês',
    thisMonthExpenses: 'Despesas do Mês',
    recentTransactions: 'Transações Recentes',
    loadingTransactions: 'Carregando transações...',
    noTransactions: 'Nenhuma transação ainda. Comece adicionando sua primeira transação!',
    viewAllTransactions: 'Ver todas as transações'
  },
  transactions: {
    title: 'Transações',
    subtitle: 'Gerencie suas receitas e despesas',
    addTransaction: 'Adicionar Transação',
    editTransaction: 'Editar Transação',
    allTransactions: 'Todas as Transações',
    income: 'Receitas',
    expenses: 'Despesas',
    totalIncome: 'Total de Receitas',
    totalExpenses: 'Total de Despesas',
    balance: 'Saldo',
    loadingTransactions: 'Carregando transações...',
    noTransactions: 'Nenhuma transação ainda. Clique em "Adicionar Transação" para começar!',
    noIncomeTransactions: 'Nenhuma transação de receita encontrada.',
    noExpenseTransactions: 'Nenhuma transação de despesa encontrada.',
    deleteTitle: 'Excluir Transação',
    deleteConfirmation: 'Tem certeza de que deseja excluir esta transação? Esta ação não pode ser desfeita.',
    amount: 'Valor',
    category: 'Categoria',
    description: 'Descrição',
    type: 'Tipo',
    date: 'Data',
    editAriaLabel: 'Editar transação',
    deleteAriaLabel: 'Excluir transação'
  },
  budgets: {
    title: 'Orçamentos',
    subtitle: 'Defina e acompanhe seus limites de gastos mensais',
    addBudget: 'Adicionar Orçamento',
    editBudget: 'Editar Orçamento',
    noBudgets: 'Nenhum orçamento ainda. Clique em "Adicionar Orçamento" para começar!',
    deleteTitle: 'Excluir Orçamento',
    deleteConfirmation: 'Tem certeza de que deseja excluir este orçamento? Esta ação não pode ser desfeita.',
    month: 'Mês',
    limit: 'Limite',
    spent: 'Gasto',
    remaining: 'Restante',
    progress: 'Progresso'
  },
  categories: {
    title: 'Categorias',
    subtitle: 'Organize suas transações com categorias personalizadas',
    addCategory: 'Adicionar Categoria',
    editCategory: 'Editar Categoria',
    noCategories: 'Nenhuma categoria ainda. Clique em "Adicionar Categoria" para começar!',
    deleteTitle: 'Excluir Categoria',
    deleteConfirmation: 'Tem certeza de que deseja excluir esta categoria? Esta ação não pode ser desfeita.',
    name: 'Nome',
    type: 'Tipo',
    color: 'Cor',
    icon: 'Ícone'
  },
  forms: {
    transaction: {
      category: 'Categoria',
      categoryPlaceholder: 'Selecione uma categoria',
      amount: 'Valor',
      amountPlaceholder: '0,00',
      description: 'Descrição',
      descriptionPlaceholder: 'Descrição opcional',
      date: 'Data',
      type: 'Tipo',
      income: 'Receita',
      expense: 'Despesa'
    },
    budget: {
      category: 'Categoria',
      categoryPlaceholder: 'Selecione uma categoria',
      month: 'Mês',
      limit: 'Limite',
      limitPlaceholder: '0,00'
    },
    category: {
      name: 'Nome',
      namePlaceholder: 'Nome da categoria',
      type: 'Tipo',
      income: 'Receita',
      expense: 'Despesa',
      color: 'Cor',
      icon: 'Ícone (opcional)',
      iconPlaceholder: 'Ex: 🏠, 🍔, 💰',
      chooseEmoji: 'Escolher Emoji'
    }
  }
}
