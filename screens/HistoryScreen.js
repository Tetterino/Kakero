import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import TransactionItem from '../components/TransactionItem';
import EditTransactionModal from '../components/EditTransactionModal';
import {
  loadTransactions,
  saveTransactions as saveTransactionsToStorage,
  loadCustomCategories,
  loadDeletedCategories,
  loadAppMode,
} from '../utils/storage';
import { getAvailableCategories } from '../utils/categories';
import { APP_MODES } from '../constants/storage';
import { useTheme } from '../contexts/ThemeContext';

export default function HistoryScreen({ navigation }) {
  const { colors } = useTheme();
  const [transactions, setTransactions] = useState([]);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [customExpenseCategories, setCustomExpenseCategories] = useState([]);
  const [customIncomeCategories, setCustomIncomeCategories] = useState([]);
  const [deletedExpenseCategories, setDeletedExpenseCategories] = useState([]);
  const [deletedIncomeCategories, setDeletedIncomeCategories] = useState([]);
  const [appMode, setAppMode] = useState(APP_MODES.NORMAL);
  const [displayCount, setDisplayCount] = useState(50); // 初期表示件数

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

  // フィルター済みの収支を取得（支出のみモードでは収入を除外）
  const getFilteredTransactions = () => {
    let filtered = transactions;

    // 支出のみモードの場合は収入を除外
    if (appMode === APP_MODES.EXPENSE_ONLY) {
      filtered = filtered.filter(t => t.type === 'expense');
    }

    return filtered;
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

  // もっと読み込む
  const loadMore = () => {
    setDisplayCount(prev => prev + 50);
  };

  const filteredTransactions = getFilteredTransactions();
  const displayedTransactions = filteredTransactions.slice(0, displayCount);
  const hasMore = filteredTransactions.length > displayCount;

  const styles = createStyles(colors);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>収支履歴</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.statsBar}>
        <Text style={styles.statsText}>
          全{filteredTransactions.length}件
          {appMode === APP_MODES.EXPENSE_ONLY && ' (支出のみ)'}
        </Text>
      </View>

      <ScrollView style={styles.scrollView}>
        {displayedTransactions.length > 0 ? (
          <View style={styles.listSection}>
            {displayedTransactions.map((item) => (
              <TransactionItem
                key={item.id}
                item={item}
                onPress={openEditModal}
                onDelete={deleteTransaction}
              />
            ))}

            {hasMore && (
              <TouchableOpacity
                style={styles.loadMoreButton}
                onPress={loadMore}>
                <MaterialIcons name="expand-more" size={24} color="#2196F3" />
                <Text style={styles.loadMoreText}>
                  さらに表示 (残り{filteredTransactions.length - displayCount}件)
                </Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <MaterialIcons name="receipt-long" size={64} color="#ccc" />
            <Text style={styles.emptyText}>収支がありません</Text>
          </View>
        )}
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    paddingHorizontal: 15,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: 5,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
  },
  placeholder: {
    width: 34, // backButtonと同じ幅
  },
  statsBar: {
    backgroundColor: colors.surface,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  statsText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
  },
  listSection: {
    backgroundColor: colors.surface,
    marginTop: 10,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 100,
  },
  emptyText: {
    marginTop: 15,
    fontSize: 16,
    color: colors.textTertiary,
  },
  loadMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    backgroundColor: colors.surfaceSecondary,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  loadMoreText: {
    fontSize: 15,
    color: colors.primary,
    fontWeight: '600',
    marginLeft: 8,
  },
});
