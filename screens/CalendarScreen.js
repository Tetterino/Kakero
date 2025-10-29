import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calendar } from 'react-native-calendars';
import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import TransactionItem from '../components/TransactionItem';
import EditTransactionModal from '../components/EditTransactionModal';
import {
  loadTransactions,
  saveTransactions as saveTransactionsToStorage,
  loadCustomCategories,
  saveCustomCategories,
  loadDeletedCategories,
  loadAppMode,
  loadMonthStartDay,
} from '../utils/storage';
import { getAvailableCategories } from '../utils/categories';
import { APP_MODES } from '../constants/storage';
import { getCurrentMonthRange } from '../utils/dateUtils';
import { useTheme } from '../contexts/ThemeContext';

export default function CalendarScreen() {
  const { colors } = useTheme();
  const [transactions, setTransactions] = useState([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedStartDate, setSelectedStartDate] = useState('');
  const [selectedEndDate, setSelectedEndDate] = useState('');
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [customExpenseCategories, setCustomExpenseCategories] = useState([]);
  const [customIncomeCategories, setCustomIncomeCategories] = useState([]);
  const [deletedExpenseCategories, setDeletedExpenseCategories] = useState([]);
  const [deletedIncomeCategories, setDeletedIncomeCategories] = useState([]);
  const [appMode, setAppMode] = useState(APP_MODES.NORMAL);
  const [monthStartDay, setMonthStartDay] = useState(1);

  // データを読み込む関数
  const loadData = async () => {
    const loadedTransactions = await loadTransactions();
    setTransactions(loadedTransactions);

    const { expense, income } = await loadCustomCategories();
    setCustomExpenseCategories(expense);
    setCustomIncomeCategories(income);

    const deleted = await loadDeletedCategories();
    setDeletedExpenseCategories(deleted.expense);
    setDeletedIncomeCategories(deleted.income);

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

  // カテゴリリストを取得
  const getCategories = (transactionType) => {
    if (transactionType === 'expense') {
      return getAvailableCategories(
        'expense',
        customExpenseCategories,
        deletedExpenseCategories
      );
    } else {
      return getAvailableCategories(
        'income',
        customIncomeCategories,
        deletedIncomeCategories
      );
    }
  };

  // フィルター済みの収支を取得
  const getFilteredTransactions = () => {
    let filtered = transactions;

    // 支出のみモードの場合は収入を除外
    if (appMode === APP_MODES.EXPENSE_ONLY) {
      filtered = filtered.filter(t => t.type === 'expense');
    }

    // デバッグ: フィルター前の収支とフィルター条件を出力
    console.log('=== カレンダーフィルターデバッグ ===');
    console.log('選択された日付:', selectedDate);
    console.log('期間開始:', selectedStartDate);
    console.log('期間終了:', selectedEndDate);
    console.log('全収支数:', transactions.length);
    if (transactions.length > 0) {
      console.log('最初の収支の日付:', transactions[0].date, 'type:', typeof transactions[0].date);
    }

    // 日付フィルター
    if (selectedDate) {
      // 単一日付選択
      console.log('単一日付でフィルター:', selectedDate);
      filtered = filtered.filter(t => {
        const match = t.date === selectedDate;
        if (!match) {
          console.log('マッチしない:', t.date, '!==', selectedDate);
        }
        return match;
      });
    } else if (selectedStartDate && selectedEndDate) {
      // 期間選択
      console.log('期間でフィルター:', selectedStartDate, '~', selectedEndDate);
      filtered = filtered.filter(t => t.date >= selectedStartDate && t.date <= selectedEndDate);
    }

    console.log('フィルター後の収支数:', filtered.length);
    console.log('====================');

    return filtered;
  };

  // カレンダーにマークする日付を生成
  const getMarkedDates = () => {
    const marked = {};

    // 支出のみモードの場合は収入を除外してマークを生成
    const transactionsToMark = appMode === APP_MODES.EXPENSE_ONLY
      ? transactions.filter(t => t.type === 'expense')
      : transactions;

    // 収支のドットを追加
    transactionsToMark.forEach(transaction => {
      const date = transaction.date;
      if (!marked[date]) {
        marked[date] = {dots: []};
      }

      const color = transaction.type === 'income' ? '#4CAF50' : '#f44336';
      marked[date].dots.push({color});
    });

    // 単一日付選択
    if (selectedDate) {
      marked[selectedDate] = {
        ...marked[selectedDate],
        selected: true,
        selectedColor: '#2196F3',
      };
    }

    // 期間選択
    if (selectedStartDate && selectedEndDate) {
      const start = new Date(selectedStartDate + 'T00:00:00');
      const end = new Date(selectedEndDate + 'T00:00:00');

      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;

        marked[dateStr] = {
          ...marked[dateStr],
          selected: true,
          selectedColor: dateStr === selectedStartDate || dateStr === selectedEndDate ? '#2196F3' : '#90CAF9',
          startingDay: dateStr === selectedStartDate,
          endingDay: dateStr === selectedEndDate,
          color: dateStr === selectedStartDate || dateStr === selectedEndDate ? '#2196F3' : '#90CAF9',
        };
      }
    }

    return marked;
  };

  // カレンダーで日付を選択
  const onDateSelect = (day) => {
    const dateStr = day.dateString;

    // 同じ日付を再度クリックした場合は選択解除
    if (selectedDate === dateStr) {
      setSelectedDate('');
      setSelectedStartDate('');
      setSelectedEndDate('');
      return;
    }

    // 単一日付が選択されている場合
    if (selectedDate && !selectedStartDate) {
      // 2つ目の選択 → 期間選択に移行
      const firstDate = selectedDate;
      const secondDate = dateStr;

      if (firstDate < secondDate) {
        setSelectedStartDate(firstDate);
        setSelectedEndDate(secondDate);
      } else {
        setSelectedStartDate(secondDate);
        setSelectedEndDate(firstDate);
      }
      setSelectedDate(''); // 単一選択をクリア
      return;
    }

    // 期間選択されている場合
    if (selectedStartDate && selectedEndDate) {
      // 3つ目の選択 → 単一日付選択に戻る
      setSelectedDate(dateStr);
      setSelectedStartDate('');
      setSelectedEndDate('');
      return;
    }

    // 初回選択
    setSelectedDate(dateStr);
    setSelectedStartDate('');
    setSelectedEndDate('');
  };

  // フィルターをクリア
  const clearFilter = () => {
    setSelectedDate('');
    setSelectedStartDate('');
    setSelectedEndDate('');
  };

  // 今月の範囲でフィルター（トグル）
  const filterByCurrentMonth = () => {
    const { startDate, endDate } = getCurrentMonthRange(monthStartDay);

    // 既に今月の範囲でフィルターされている場合は解除
    if (selectedStartDate === startDate && selectedEndDate === endDate) {
      clearFilter();
    } else {
      // 今月の範囲でフィルター
      setSelectedDate('');
      setSelectedStartDate(startDate);
      setSelectedEndDate(endDate);
    }
  };

  // 収支を編集モードで開く
  const openEditModal = (transaction) => {
    setEditingTransaction(transaction);
    setEditModalVisible(true);
  };

  // 編集をキャンセル
  const cancelEdit = () => {
    setEditModalVisible(false);
    setEditingTransaction(null);
  };

  // 編集した収支を保存
  const saveEditedTransaction = async (updatedTransaction) => {
    const newTransactions = transactions.map(t =>
      t.id === updatedTransaction.id ? updatedTransaction : t
    );

    setTransactions(newTransactions);
    await saveTransactionsToStorage(newTransactions);
    cancelEdit();
  };

  // 収支を削除
  const deleteTransaction = async (id) => {
    const newTransactions = transactions.filter(t => t.id !== id);
    setTransactions(newTransactions);
    await saveTransactionsToStorage(newTransactions);
  };

  // 編集モーダル用のカテゴリ追加
  const addCustomCategoryForEdit = async (newCategory) => {
    if (editingTransaction?.type === 'expense') {
      const newCategories = [...customExpenseCategories, newCategory];
      setCustomExpenseCategories(newCategories);
      await saveCustomCategories(newCategories, customIncomeCategories);
    } else {
      const newCategories = [...customIncomeCategories, newCategory];
      setCustomIncomeCategories(newCategories);
      await saveCustomCategories(customExpenseCategories, newCategories);
    }
  };

  const filteredTransactions = getFilteredTransactions();

  const styles = createStyles(colors);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Text style={styles.title}>カレンダー</Text>
      </View>

      <ScrollView style={styles.scrollView}>
        {/* カスタム月範囲の表示 */}
        {monthStartDay !== 1 && (
          <TouchableOpacity
            style={styles.customMonthInfo}
            onPress={filterByCurrentMonth}
            activeOpacity={0.7}>
            <MaterialIcons name="event" size={20} color="#4CAF50" />
            <Text style={styles.customMonthText}>
              今月の範囲: {(() => {
                const { startDate, endDate } = getCurrentMonthRange(monthStartDay);
                return `${startDate.slice(5)} 〜 ${endDate.slice(5)}`;
              })()}
            </Text>
            <MaterialIcons name="touch-app" size={18} color="#4CAF50" style={styles.tapIcon} />
          </TouchableOpacity>
        )}

        <View style={styles.calendarSection}>
          <Calendar
            markingType={selectedStartDate && selectedEndDate ? "period" : "multi-dot"}
            markedDates={getMarkedDates()}
            onDayPress={onDateSelect}
            theme={{
              calendarBackground: colors.surface,
              textSectionTitleColor: colors.textSecondary,
              dayTextColor: colors.text,
              todayTextColor: colors.primary,
              selectedDayBackgroundColor: colors.primary,
              dotColor: colors.primary,
              arrowColor: colors.primary,
              monthTextColor: colors.text,
              textDisabledColor: colors.textTertiary,
            }}
          />

          {(selectedDate || (selectedStartDate && selectedEndDate)) && (
            <View style={styles.filterInfo}>
              <View style={styles.filterTextContainer}>
                <MaterialIcons name="date-range" size={20} color="#1976d2" />
                <Text style={styles.filterText}>
                  {selectedDate
                    ? `選択: ${selectedDate}`
                    : `期間: ${selectedStartDate} 〜 ${selectedEndDate}`}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.clearFilterButton}
                onPress={clearFilter}>
                <Text style={styles.clearFilterText}>クリア</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* 収支リスト */}
        <View style={styles.listSection}>
          <Text style={styles.sectionTitle}>
            {selectedDate || (selectedStartDate && selectedEndDate)
              ? `収支一覧 (${filteredTransactions.length}件)`
              : '日付を選択してください'}
          </Text>

          {(selectedDate || (selectedStartDate && selectedEndDate)) && (
            <>
              {filteredTransactions.length > 0 ? (
                filteredTransactions.map((item) => (
                  <TransactionItem
                    key={item.id}
                    item={item}
                    onPress={openEditModal}
                    onDelete={deleteTransaction}
                  />
                ))
              ) : (
                <View style={styles.emptyContainer}>
                  <MaterialIcons name="event-busy" size={48} color="#ccc" />
                  <Text style={styles.emptyText}>この期間に収支がありません</Text>
                </View>
              )}
            </>
          )}

          {!selectedDate && !selectedStartDate && !selectedEndDate && (
            <View style={styles.emptyContainer}>
              <MaterialIcons name="touch-app" size={48} color="#ccc" />
              <Text style={styles.emptyText}>カレンダーから日付を選択してください</Text>
              <Text style={styles.emptySubText}>
                1回タップ: その日の収支{'\n'}
                2回タップ: 期間の収支{'\n'}
                3回タップ: 別の日の収支
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* 編集モーダル */}
      <EditTransactionModal
        visible={editModalVisible}
        transaction={editingTransaction}
        categories={getCategories(editingTransaction?.type || 'expense')}
        onSave={saveEditedTransaction}
        onCancel={cancelEdit}
        onAddCategory={addCustomCategoryForEdit}
      />
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
  customMonthInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.incomeLight,
    paddingVertical: 12,
    paddingHorizontal: 15,
    marginTop: 10,
    marginHorizontal: 0,
    borderLeftWidth: 4,
    borderLeftColor: colors.income,
  },
  customMonthText: {
    flex: 1,
    fontSize: 14,
    color: colors.income,
    fontWeight: '600',
    marginLeft: 8,
  },
  tapIcon: {
    marginLeft: 8,
    opacity: 0.7,
  },
  calendarSection: {
    backgroundColor: colors.surface,
    marginTop: 10,
  },
  filterInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    backgroundColor: colors.primaryLight + '30',
    borderTopWidth: 1,
    borderTopColor: colors.primaryLight,
  },
  filterTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  filterText: {
    fontSize: 14,
    color: colors.primaryDark,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  clearFilterButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 5,
  },
  clearFilterText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  listSection: {
    backgroundColor: colors.surface,
    marginTop: 10,
    paddingVertical: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 15,
    paddingHorizontal: 20,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyText: {
    marginTop: 15,
    fontSize: 16,
    color: colors.textTertiary,
    textAlign: 'center',
  },
  emptySubText: {
    marginTop: 15,
    fontSize: 14,
    color: colors.textTertiary,
    textAlign: 'center',
    lineHeight: 22,
  },
});
