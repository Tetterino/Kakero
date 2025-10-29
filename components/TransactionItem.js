import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import { UNCATEGORIZED } from '../constants/categories';
import { useTheme } from '../contexts/ThemeContext';

export default function TransactionItem({ item, onPress, onDelete }) {
  const { colors } = useTheme();
  const renderRightActions = () => {
    return (
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => onDelete(item.id)}>
        <MaterialIcons name="delete" size={28} color="#fff" />
        <Text style={styles.deleteButtonText}>削除</Text>
      </TouchableOpacity>
    );
  };

  // カテゴリ表示を決定
  const getCategoryDisplay = () => {
    const category = item.category || item.description;
    if (category === UNCATEGORIZED) {
      return '未分類';
    }
    return category;
  };

  // タイトル表示を決定（後方互換性のため）
  const getTitleDisplay = () => {
    // titleフィールドがあればそれを使用、なければ空文字
    return item.title || '';
  };

  // UNCATEGORIZEDかどうか
  const isUncategorized = (item.category || item.description) === UNCATEGORIZED;
  const hasTitle = !!item.title;

  const styles = createStyles(colors);

  return (
    <Swipeable
      renderRightActions={renderRightActions}
      overshootRight={false}
      rightThreshold={40}>
      <TouchableOpacity
        style={styles.transactionItem}
        onPress={() => onPress(item)}>
        <View style={styles.transactionLeft}>
          {hasTitle && (
            <Text style={styles.transactionTitle}>
              {getTitleDisplay()}
            </Text>
          )}
          {item.storeName && (
            <View style={styles.storeNameContainer}>
              <MaterialIcons name="store" size={14} color={colors.textSecondary} style={styles.storeIcon} />
              <Text style={styles.storeName}>
                {item.storeName}
              </Text>
            </View>
          )}
          <View style={styles.categoryContainer}>
            {isUncategorized && (
              <MaterialIcons name="help-outline" size={16} color={colors.textTertiary} style={styles.uncategorizedIcon} />
            )}
            <Text style={[
              styles.transactionCategory,
              isUncategorized && styles.uncategorizedText
            ]}>
              {getCategoryDisplay()}
            </Text>
            {item.items && item.items.length > 0 && (
              <MaterialIcons name="list" size={16} color={colors.income} style={styles.cameraIcon} />
            )}
            {item.imageUri && (
              <MaterialIcons name="photo-camera" size={16} color={colors.primary} style={styles.cameraIcon} />
            )}
          </View>
          <Text style={styles.transactionDate}>
            {item.displayDate || item.date}
          </Text>
        </View>
        <Text
          style={[
            styles.transactionAmount,
            item.type === 'income' ? styles.income : styles.expense,
          ]}>
          {item.type === 'income' ? '+' : '-'}¥{item.amount.toLocaleString()}
        </Text>
      </TouchableOpacity>
    </Swipeable>
  );
}

const createStyles = (colors) => StyleSheet.create({
  transactionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  transactionLeft: {
    flex: 1,
  },
  transactionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  storeNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  storeIcon: {
    marginRight: 4,
  },
  storeName: {
    fontSize: 13,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  categoryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  uncategorizedIcon: {
    marginRight: 4,
  },
  transactionCategory: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  cameraIcon: {
    marginLeft: 6,
  },
  uncategorizedText: {
    color: colors.textTertiary,
    fontStyle: 'italic',
  },
  transactionDate: {
    fontSize: 12,
    color: colors.textTertiary,
  },
  transactionAmount: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  income: {
    color: colors.income,
  },
  expense: {
    color: colors.expense,
  },
  deleteButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 75,
    backgroundColor: colors.expense,
    height: '100%',
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 4,
  },
});
