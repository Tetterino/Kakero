import React, { createContext, useState, useContext, useEffect } from 'react';
import { loadTheme, saveTheme } from '../utils/storage';
import { THEMES } from '../constants/storage';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(THEMES.LIGHT);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadThemeFromStorage();
  }, []);

  const loadThemeFromStorage = async () => {
    const savedTheme = await loadTheme();
    setTheme(savedTheme);
    setIsLoading(false);
  };

  const toggleTheme = async () => {
    const newTheme = theme === THEMES.LIGHT ? THEMES.DARK : THEMES.LIGHT;
    setTheme(newTheme);
    await saveTheme(newTheme);
  };

  const setThemeMode = async (newTheme) => {
    setTheme(newTheme);
    await saveTheme(newTheme);
  };

  const colors = theme === THEMES.DARK ? darkColors : lightColors;

  return (
    <ThemeContext.Provider
      value={{
        theme,
        colors,
        toggleTheme,
        setThemeMode,
        isDark: theme === THEMES.DARK,
        isLoading,
      }}>
      {children}
    </ThemeContext.Provider>
  );
};

// ライトモードの色定義
const lightColors = {
  // 背景色
  background: '#f5f5f5',
  surface: '#ffffff',
  surfaceSecondary: '#f8f9fa',

  // テキスト色
  text: '#333333',
  textSecondary: '#666666',
  textTertiary: '#999999',

  // プライマリーカラー
  primary: '#2196F3',
  primaryLight: '#90CAF9',
  primaryDark: '#1976d2',

  // 収入・支出
  income: '#4CAF50',
  incomeLight: '#E8F5E9',
  expense: '#f44336',
  expenseLight: '#FFEBEE',

  // ボーダー・区切り線
  border: '#e0e0e0',
  borderLight: '#f0f0f0',

  // カード・グラデーション
  cardShadow: 'rgba(0, 0, 0, 0.1)',
  gradientPositive: ['#4CAF50', '#388E3C'],
  gradientNegative: ['#f44336', '#d32f2f'],
  gradientNeutral: ['#FF9800', '#F57C00'],
  gradientExpenseOnly: ['#7986CB', '#5C6BC0'],

  // その他
  overlay: 'rgba(0, 0, 0, 0.5)',
  success: '#4CAF50',
  warning: '#FF9800',
  error: '#f44336',
  info: '#2196F3',
};

// ダークモードの色定義
const darkColors = {
  // 背景色
  background: '#121212',
  surface: '#1E1E1E',
  surfaceSecondary: '#2C2C2C',

  // テキスト色
  text: '#E0E0E0',
  textSecondary: '#B0B0B0',
  textTertiary: '#808080',

  // プライマリーカラー
  primary: '#90CAF9',
  primaryLight: '#BBDEFB',
  primaryDark: '#42A5F5',

  // 収入・支出
  income: '#66BB6A',
  incomeLight: '#1B5E20',
  expense: '#EF5350',
  expenseLight: '#B71C1C',

  // ボーダー・区切り線
  border: '#404040',
  borderLight: '#333333',

  // カード・グラデーション
  cardShadow: 'rgba(0, 0, 0, 0.4)',
  gradientPositive: ['#66BB6A', '#4CAF50'],
  gradientNegative: ['#EF5350', '#E53935'],
  gradientNeutral: ['#FFA726', '#FB8C00'],
  gradientExpenseOnly: ['#9FA8DA', '#7986CB'],

  // その他
  overlay: 'rgba(0, 0, 0, 0.7)',
  success: '#66BB6A',
  warning: '#FFA726',
  error: '#EF5350',
  info: '#42A5F5',
};
