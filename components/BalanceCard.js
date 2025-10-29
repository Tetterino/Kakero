import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { getBalanceGradient } from '../utils/calculations';
import { APP_MODES } from '../constants/storage';
import { useTheme } from '../contexts/ThemeContext';

export default function BalanceCard({ balance, totalIncome, totalExpense, appMode }) {
  const { colors } = useTheme();
  const [isHidden, setIsHidden] = useState(false);
  const isExpenseOnlyMode = appMode === APP_MODES.EXPENSE_ONLY;

  // テーマに応じたグラデーション色を取得
  const getGradientColors = () => {
    if (isExpenseOnlyMode) {
      return colors.gradientExpenseOnly;
    }
    return balance >= 0 ? colors.gradientPositive : colors.gradientNegative;
  };

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={() => setIsHidden(!isHidden)}>
      <LinearGradient
        colors={getGradientColors()}
        start={{x: 0, y: 0}}
        end={{x: 1, y: 1}}
        style={styles.balanceCard}>
        <View style={styles.headerRow}>
          <Text style={styles.balanceLabel}>
            {isExpenseOnlyMode ? '支出総額' : '残高'}
          </Text>
          <MaterialIcons
            name={isHidden ? 'visibility-off' : 'visibility'}
            size={20}
            color="#fff"
            style={styles.visibilityIcon}
          />
        </View>
        <Text style={styles.balanceAmount}>
          {isHidden
            ? '¥ ••••••'
            : `¥${isExpenseOnlyMode ? totalExpense.toLocaleString() : balance.toLocaleString()}`
          }
        </Text>
        {!isExpenseOnlyMode && (
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>収入</Text>
              <Text style={styles.summaryAmount}>
                {isHidden ? '¥ ••••' : `¥${totalIncome.toLocaleString()}`}
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>支出</Text>
              <Text style={styles.summaryAmount}>
                {isHidden ? '¥ ••••' : `¥${totalExpense.toLocaleString()}`}
              </Text>
            </View>
          </View>
        )}
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  balanceCard: {
    borderRadius: 15,
    padding: 20,
    marginBottom: 10,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  balanceLabel: {
    fontSize: 16,
    color: '#fff',
    opacity: 0.9,
  },
  visibilityIcon: {
    opacity: 0.8,
  },
  balanceAmount: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
    marginVertical: 5,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: {width: 1, height: 1},
    textShadowRadius: 3,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 15,
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.9,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: {width: 1, height: 1},
    textShadowRadius: 2,
  },
  summaryAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 5,
    color: '#fff',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: {width: 1, height: 1},
    textShadowRadius: 3,
  },
});
