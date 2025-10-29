import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import {
  loadTransactions,
  loadAppMode,
  loadMonthStartDay,
} from '../utils/storage';
import { APP_MODES } from '../constants/storage';
import { getCurrentMonthRange } from '../utils/dateUtils';
import { useTheme } from '../contexts/ThemeContext';

export default function AnalyticsScreen() {
  const { colors } = useTheme();
  const [transactions, setTransactions] = useState([]);
  const [appMode, setAppMode] = useState(APP_MODES.NORMAL);
  const [selectedPeriod, setSelectedPeriod] = useState('month'); // 'month' or 'all'
  const [monthStartDay, setMonthStartDay] = useState(1);

  // データを読み込む
  const loadData = async () => {
    const loadedTransactions = await loadTransactions();
    setTransactions(loadedTransactions);

    const mode = await loadAppMode();
    setAppMode(mode);

    const day = await loadMonthStartDay();
    setMonthStartDay(day);
  };

  // 画面がフォーカスされたときにデータを再読み込み
  useFocusEffect(
    React.useCallback(() => {
      loadData();
    }, [])
  );

  // フィルター済みの収支を取得
  const getFilteredTransactions = () => {
    let filtered = transactions;

    // 支出のみモードの場合は収入を除外
    if (appMode === APP_MODES.EXPENSE_ONLY) {
      filtered = filtered.filter(t => t.type === 'expense');
    }

    // 期間フィルター
    if (selectedPeriod === 'month') {
      const { startDate, endDate } = getCurrentMonthRange(monthStartDay);
      filtered = filtered.filter(t => t.date >= startDate && t.date <= endDate);
    }

    return filtered;
  };

  // カテゴリ別集計
  const getCategoryStats = () => {
    const filtered = getFilteredTransactions();
    const stats = {};

    filtered.forEach(transaction => {
      const category = transaction.category || '未分類';
      if (!stats[category]) {
        stats[category] = {
          category,
          total: 0,
          count: 0,
          type: transaction.type,
        };
      }
      stats[category].total += transaction.amount;
      stats[category].count += 1;
    });

    // 金額の大きい順にソート
    return Object.values(stats).sort((a, b) => b.total - a.total);
  };

  // 月別集計（直近6ヶ月）
  const getMonthlyStats = () => {
    const now = new Date();
    const months = [];

    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0');
      months.push({
        key: monthKey,
        label: `${date.getMonth() + 1}月`,
        income: 0,
        expense: 0,
      });
    }

    // 支出のみモードの場合は全件、通常モードは収支両方
    const dataTransactions = appMode === APP_MODES.EXPENSE_ONLY
      ? transactions.filter(t => t.type === 'expense')
      : transactions;

    dataTransactions.forEach(transaction => {
      const monthKey = transaction.date.substring(0, 7);
      const month = months.find(m => m.key === monthKey);
      if (month) {
        if (transaction.type === 'income') {
          month.income += transaction.amount;
        } else {
          month.expense += transaction.amount;
        }
      }
    });

    // 最大値を計算（バーの幅の基準にする）
    const maxAmount = Math.max(
      ...months.map(m => Math.max(m.income, m.expense)),
      1 // 0除算防止
    );

    return { months, maxAmount };
  };

  // 基本統計
  const getBasicStats = () => {
    const filtered = getFilteredTransactions();
    const expenses = filtered.filter(t => t.type === 'expense');
    const incomes = filtered.filter(t => t.type === 'income');

    const totalExpense = expenses.reduce((sum, t) => sum + t.amount, 0);
    const totalIncome = incomes.reduce((sum, t) => sum + t.amount, 0);

    return {
      totalExpense,
      totalIncome,
      totalTransactions: filtered.length,
      expenseCount: expenses.length,
      incomeCount: incomes.length,
      avgExpense: expenses.length > 0 ? Math.round(totalExpense / expenses.length) : 0,
      avgIncome: incomes.length > 0 ? Math.round(totalIncome / incomes.length) : 0,
    };
  };

  const categoryStats = getCategoryStats();
  const { months: monthlyStats, maxAmount: monthlyMaxAmount } = getMonthlyStats();
  const basicStats = getBasicStats();

  const styles = createStyles(colors);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Text style={styles.title}>分析</Text>
      </View>

      <ScrollView style={styles.scrollView}>
        {/* 期間選択 */}
        <View style={styles.periodSelector}>
          <TouchableOpacity
            style={[
              styles.periodButton,
              selectedPeriod === 'month' && styles.periodButtonActive,
            ]}
            onPress={() => setSelectedPeriod('month')}>
            <Text
              style={[
                styles.periodButtonText,
                selectedPeriod === 'month' && styles.periodButtonTextActive,
              ]}>
              今月
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.periodButton,
              selectedPeriod === 'all' && styles.periodButtonActive,
            ]}
            onPress={() => setSelectedPeriod('all')}>
            <Text
              style={[
                styles.periodButtonText,
                selectedPeriod === 'all' && styles.periodButtonTextActive,
              ]}>
              全期間
            </Text>
          </TouchableOpacity>
        </View>

        {/* 基本統計 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>基本統計</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <MaterialIcons name="receipt-long" size={24} color="#666" />
              <Text style={styles.statValue}>{basicStats.totalTransactions}</Text>
              <Text style={styles.statLabel}>収支件数</Text>
            </View>
            <View style={styles.statCard}>
              <MaterialIcons name="arrow-downward" size={24} color="#f44336" />
              <Text style={[styles.statValue, styles.expenseValue]}>
                ¥{basicStats.totalExpense.toLocaleString()}
              </Text>
              <Text style={styles.statLabel}>支出合計</Text>
            </View>
            {appMode === APP_MODES.NORMAL && (
              <View style={styles.statCard}>
                <MaterialIcons name="arrow-upward" size={24} color="#4CAF50" />
                <Text style={[styles.statValue, styles.incomeValue]}>
                  ¥{basicStats.totalIncome.toLocaleString()}
                </Text>
                <Text style={styles.statLabel}>収入合計</Text>
              </View>
            )}
            <View style={styles.statCard}>
              <MaterialIcons name="trending-down" size={24} color="#2196F3" />
              <Text style={styles.statValue}>
                ¥{basicStats.avgExpense.toLocaleString()}
              </Text>
              <Text style={styles.statLabel}>平均支出</Text>
            </View>
          </View>
        </View>

        {/* カテゴリ別集計 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>カテゴリ別集計</Text>
          {categoryStats.length > 0 ? (
            <View style={styles.categoryList}>
              {categoryStats.map((stat, index) => (
                <View key={stat.category} style={styles.categoryItem}>
                  <View style={styles.categoryRank}>
                    <Text style={styles.categoryRankText}>{index + 1}</Text>
                  </View>
                  <View style={styles.categoryInfo}>
                    <Text style={styles.categoryName}>{stat.category}</Text>
                    <Text style={styles.categoryCount}>{stat.count}件</Text>
                  </View>
                  <View style={styles.categoryAmount}>
                    <Text
                      style={[
                        styles.categoryAmountText,
                        stat.type === 'income' && styles.incomeText,
                      ]}>
                      ¥{stat.total.toLocaleString()}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <MaterialIcons name="analytics" size={48} color="#ccc" />
              <Text style={styles.emptyText}>データがありません</Text>
            </View>
          )}
        </View>

        {/* 月別推移 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>月別推移（直近6ヶ月）</Text>
          <View style={styles.monthlyList}>
            {monthlyStats.map((month) => (
              <View key={month.key} style={styles.monthlyItem}>
                <Text style={styles.monthlyLabel}>{month.label}</Text>
                <View style={styles.monthlyBars}>
                  {appMode === APP_MODES.NORMAL && month.income > 0 && (
                    <View style={styles.monthlyBarRow}>
                      <View style={styles.monthlyBarWrapper}>
                        <View
                          style={[
                            styles.monthlyBar,
                            styles.monthlyBarIncome,
                            { width: `${(month.income / monthlyMaxAmount) * 100}%` },
                          ]}
                        />
                      </View>
                      <Text style={styles.monthlyAmount}>
                        ¥{month.income.toLocaleString()}
                      </Text>
                    </View>
                  )}
                  {month.expense > 0 && (
                    <View style={styles.monthlyBarRow}>
                      <View style={styles.monthlyBarWrapper}>
                        <View
                          style={[
                            styles.monthlyBar,
                            styles.monthlyBarExpense,
                            { width: `${(month.expense / monthlyMaxAmount) * 100}%` },
                          ]}
                        />
                      </View>
                      <Text style={styles.monthlyAmount}>
                        ¥{month.expense.toLocaleString()}
                      </Text>
                    </View>
                  )}
                  {month.income === 0 && month.expense === 0 && (
                    <Text style={styles.monthlyNoData}>データなし</Text>
                  )}
                </View>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    backgroundColor: colors.surface,
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
  },
  scrollView: {
    flex: 1,
  },
  periodSelector: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    padding: 15,
    marginTop: 10,
    gap: 10,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 8,
  },
  periodButtonActive: {
    backgroundColor: colors.primary,
  },
  periodButtonText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  periodButtonTextActive: {
    color: '#fff',
  },
  section: {
    backgroundColor: colors.surface,
    marginTop: 10,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 15,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -5,
  },
  statCard: {
    width: '50%',
    padding: 5,
  },
  statCardInner: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 8,
  },
  expenseValue: {
    color: colors.expense,
  },
  incomeValue: {
    color: colors.income,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  categoryList: {
    gap: 10,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 15,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 8,
  },
  categoryRank: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  categoryRankText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
  },
  categoryInfo: {
    flex: 1,
  },
  categoryName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  categoryCount: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  categoryAmount: {
    alignItems: 'flex-end',
  },
  categoryAmountText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.expense,
  },
  incomeText: {
    color: colors.income,
  },
  monthlyList: {
    gap: 15,
  },
  monthlyItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  monthlyLabel: {
    width: 50,
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  monthlyBars: {
    flex: 1,
    gap: 5,
  },
  monthlyBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  monthlyBarWrapper: {
    flex: 1,
    height: 24,
  },
  monthlyBar: {
    height: 24,
    borderRadius: 4,
    minWidth: 40,
  },
  monthlyBarIncome: {
    backgroundColor: colors.income,
  },
  monthlyBarExpense: {
    backgroundColor: colors.expense,
  },
  monthlyAmount: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  monthlyNoData: {
    fontSize: 12,
    color: colors.textTertiary,
    paddingVertical: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    marginTop: 15,
    fontSize: 14,
    color: colors.textTertiary,
  },
});
