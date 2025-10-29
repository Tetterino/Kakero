import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS, APP_MODES } from '../constants/storage';

// トランザクションの読み込み
export const loadTransactions = async () => {
  try {
    const saved = await AsyncStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
    if (saved) {
      return JSON.parse(saved);
    }
    return [];
  } catch (error) {
    console.error('データの読み込みエラー:', error);
    return [];
  }
};

// トランザクションの保存
export const saveTransactions = async (transactions) => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(transactions));
  } catch (error) {
    console.error('データの保存エラー:', error);
  }
};

// カスタムカテゴリの読み込み
export const loadCustomCategories = async () => {
  try {
    const expenseCategories = await AsyncStorage.getItem(STORAGE_KEYS.CUSTOM_EXPENSE_CATEGORIES);
    const incomeCategories = await AsyncStorage.getItem(STORAGE_KEYS.CUSTOM_INCOME_CATEGORIES);

    return {
      expense: expenseCategories ? JSON.parse(expenseCategories) : [],
      income: incomeCategories ? JSON.parse(incomeCategories) : [],
    };
  } catch (error) {
    console.error('カテゴリの読み込みエラー:', error);
    return { expense: [], income: [] };
  }
};

// カスタムカテゴリの保存
export const saveCustomCategories = async (expenseCategories, incomeCategories) => {
  try {
    await AsyncStorage.setItem(
      STORAGE_KEYS.CUSTOM_EXPENSE_CATEGORIES,
      JSON.stringify(expenseCategories)
    );
    await AsyncStorage.setItem(
      STORAGE_KEYS.CUSTOM_INCOME_CATEGORIES,
      JSON.stringify(incomeCategories)
    );
  } catch (error) {
    console.error('カテゴリの保存エラー:', error);
  }
};

// 削除されたデフォルトカテゴリの読み込み
export const loadDeletedCategories = async () => {
  try {
    const expenseCategories = await AsyncStorage.getItem(STORAGE_KEYS.DELETED_EXPENSE_CATEGORIES);
    const incomeCategories = await AsyncStorage.getItem(STORAGE_KEYS.DELETED_INCOME_CATEGORIES);

    return {
      expense: expenseCategories ? JSON.parse(expenseCategories) : [],
      income: incomeCategories ? JSON.parse(incomeCategories) : [],
    };
  } catch (error) {
    console.error('削除カテゴリの読み込みエラー:', error);
    return { expense: [], income: [] };
  }
};

// 削除されたデフォルトカテゴリの保存
export const saveDeletedCategories = async (expenseCategories, incomeCategories) => {
  try {
    await AsyncStorage.setItem(
      STORAGE_KEYS.DELETED_EXPENSE_CATEGORIES,
      JSON.stringify(expenseCategories)
    );
    await AsyncStorage.setItem(
      STORAGE_KEYS.DELETED_INCOME_CATEGORIES,
      JSON.stringify(incomeCategories)
    );
  } catch (error) {
    console.error('削除カテゴリの保存エラー:', error);
  }
};

// アプリモードの読み込み
export const loadAppMode = async () => {
  try {
    const mode = await AsyncStorage.getItem(STORAGE_KEYS.APP_MODE);
    return mode || APP_MODES.NORMAL; // デフォルトは通常モード
  } catch (error) {
    console.error('モードの読み込みエラー:', error);
    return APP_MODES.NORMAL;
  }
};

// アプリモードの保存
export const saveAppMode = async (mode) => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.APP_MODE, mode);
  } catch (error) {
    console.error('モードの保存エラー:', error);
  }
};

// 月初日の読み込み
export const loadMonthStartDay = async () => {
  try {
    const day = await AsyncStorage.getItem(STORAGE_KEYS.MONTH_START_DAY);
    return day ? parseInt(day, 10) : 1; // デフォルトは1日
  } catch (error) {
    console.error('月初日の読み込みエラー:', error);
    return 1;
  }
};

// 月初日の保存
export const saveMonthStartDay = async (day) => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.MONTH_START_DAY, String(day));
  } catch (error) {
    console.error('月初日の保存エラー:', error);
  }
};

// テーマの読み込み
export const loadTheme = async () => {
  try {
    const theme = await AsyncStorage.getItem(STORAGE_KEYS.THEME);
    return theme || 'light'; // デフォルトはライトモード
  } catch (error) {
    console.error('テーマの読み込みエラー:', error);
    return 'light';
  }
};

// テーマの保存
export const saveTheme = async (theme) => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.THEME, theme);
  } catch (error) {
    console.error('テーマの保存エラー:', error);
  }
};
