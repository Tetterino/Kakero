// AsyncStorage キー
export const STORAGE_KEYS = {
  TRANSACTIONS: 'transactions',
  CUSTOM_EXPENSE_CATEGORIES: 'customExpenseCategories',
  CUSTOM_INCOME_CATEGORIES: 'customIncomeCategories',
  DELETED_EXPENSE_CATEGORIES: 'deletedExpenseCategories',
  DELETED_INCOME_CATEGORIES: 'deletedIncomeCategories',
  APP_MODE: 'appMode',
  MONTH_START_DAY: 'monthStartDay',
  THEME: 'theme',
};

// アプリモード定数
export const APP_MODES = {
  NORMAL: 'normal',        // 通常モード（収入・支出両方）
  EXPENSE_ONLY: 'expenseOnly',  // 支出のみモード
};

// テーマ定数
export const THEMES = {
  LIGHT: 'light',
  DARK: 'dark',
};
