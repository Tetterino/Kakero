import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Alert, Switch, Modal, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { loadAppMode, saveAppMode, loadMonthStartDay, saveMonthStartDay } from '../utils/storage';
import { APP_MODES, THEMES } from '../constants/storage';
import { useTheme } from '../contexts/ThemeContext';

export default function SettingsScreen({ navigation }) {
  const { theme, setThemeMode, colors, isDark } = useTheme();
  const [appMode, setAppMode] = useState(APP_MODES.NORMAL);
  const [monthStartDay, setMonthStartDay] = useState(1);
  const [showDayPicker, setShowDayPicker] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const mode = await loadAppMode();
    setAppMode(mode);

    const day = await loadMonthStartDay();
    setMonthStartDay(day);
  };

  const handleModeChange = async (value) => {
    const newMode = value ? APP_MODES.EXPENSE_ONLY : APP_MODES.NORMAL;

    if (newMode === appMode) return;

    const modeNames = {
      [APP_MODES.NORMAL]: '通常モード',
      [APP_MODES.EXPENSE_ONLY]: '支出のみモード',
    };

    Alert.alert(
      'モード変更',
      `${modeNames[newMode]}に変更しますか？\n\n${
        newMode === APP_MODES.EXPENSE_ONLY
          ? '※ 収入の入力と表示が非表示になります。データは保持されます。'
          : '※ 収入の入力と表示が再度表示されます。'
      }`,
      [
        {
          text: 'キャンセル',
          style: 'cancel',
        },
        {
          text: '変更',
          onPress: async () => {
            await saveAppMode(newMode);
            setAppMode(newMode);
            Alert.alert(
              '変更完了',
              'モードを変更しました。\nアプリを再起動すると反映されます。'
            );
          },
        },
      ]
    );
  };

  const handleMonthStartDayChange = async (day) => {
    await saveMonthStartDay(day);
    setMonthStartDay(day);
    setShowDayPicker(false);
    Alert.alert('変更完了', `月初日を${day}日に変更しました。`);
  };

  // 日付選択肢を生成（1日から31日まで）
  const dayOptions = Array.from({ length: 31 }, (_, i) => i + 1);

  const handleThemeChange = async (value) => {
    const newTheme = value ? THEMES.DARK : THEMES.LIGHT;
    await setThemeMode(newTheme);
  };

  const styles = createStyles(colors);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <ScrollView>
        <View style={styles.header}>
          <Text style={styles.title}>設定</Text>
        </View>

        {/* アプリモード設定 */}
        <View style={styles.section}>
          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <Text style={styles.settingTitle}>支出のみモード</Text>
              <Text style={styles.settingDescription}>
                {appMode === APP_MODES.EXPENSE_ONLY
                  ? '支出だけを記録・表示'
                  : '収入と支出の両方を管理'}
              </Text>
            </View>
            <Switch
              value={appMode === APP_MODES.EXPENSE_ONLY}
              onValueChange={handleModeChange}
              trackColor={{ false: '#d1d1d6', true: '#4CAF50' }}
              thumbColor={'#fff'}
              ios_backgroundColor="#d1d1d6"
            />
          </View>
          <View style={styles.infoBox}>
            <MaterialIcons name="info-outline" size={16} color="#666" />
            <Text style={styles.infoText}>
              支出のみモードでは収入の入力と表示が非表示になります。データは保持されます。
            </Text>
          </View>
        </View>

        {/* 月初日設定 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>月の範囲</Text>
          <TouchableOpacity
            style={styles.settingRow}
            onPress={() => setShowDayPicker(true)}>
            <View style={styles.settingLeft}>
              <Text style={styles.settingTitle}>月初日</Text>
              <Text style={styles.settingDescription}>
                毎月{monthStartDay}日を月の開始日として計算
              </Text>
            </View>
            <View style={styles.settingRight}>
              <Text style={styles.settingValue}>{monthStartDay}日</Text>
              <MaterialIcons name="chevron-right" size={24} color="#999" />
            </View>
          </TouchableOpacity>
          <View style={styles.infoBox}>
            <MaterialIcons name="info-outline" size={16} color="#666" />
            <Text style={styles.infoText}>
              給料日と同じ日付に設定すると、給料日から次の給料日前日までを1ヶ月として収支を管理できます。{'\n\n'}
              例: 25日を設定 → 毎月25日〜翌月24日が「今月」になります。{'\n\n'}
              ※ 31日など、月によって存在しない日付を設定した場合は、その月の最終日（2月なら28日または29日）が使われます。
            </Text>
          </View>
        </View>

        {/* 表示設定 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>表示</Text>
          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <Text style={styles.settingTitle}>ダークモード</Text>
              <Text style={styles.settingDescription}>
                {theme === THEMES.DARK ? '暗い配色で表示' : '明るい配色で表示'}
              </Text>
            </View>
            <Switch
              value={isDark}
              onValueChange={handleThemeChange}
              trackColor={{ false: colors.border, true: colors.success }}
              thumbColor={'#fff'}
              ios_backgroundColor={colors.border}
            />
          </View>
          <View style={styles.infoBox}>
            <MaterialIcons name="info-outline" size={16} color="#666" />
            <Text style={styles.infoText}>
              ダークモードでは、目に優しい暗い配色で表示されます。
            </Text>
          </View>
        </View>

        {/* その他の設定 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>その他</Text>
          <Text style={styles.placeholder}>今後、以下の機能を追加予定：</Text>
          <Text style={styles.description}>
            - データのバックアップ/復元{'\n'}
            - 通知設定{'\n'}
            - データの削除
          </Text>
        </View>
      </ScrollView>

      {/* 日付選択モーダル */}
      <Modal
        visible={showDayPicker}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowDayPicker(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>月初日を選択</Text>
              <TouchableOpacity
                onPress={() => setShowDayPicker(false)}
                style={styles.modalCloseButton}>
                <MaterialIcons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={dayOptions}
              keyExtractor={(item) => String(item)}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.dayOption,
                    item === monthStartDay && styles.dayOptionSelected,
                  ]}
                  onPress={() => handleMonthStartDayChange(item)}>
                  <Text
                    style={[
                      styles.dayOptionText,
                      item === monthStartDay && styles.dayOptionTextSelected,
                    ]}>
                    {item}日
                  </Text>
                  {item === monthStartDay && (
                    <MaterialIcons name="check" size={24} color="#2196F3" />
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
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
    paddingTop: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
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
    marginBottom: 8,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  settingLeft: {
    flex: 1,
    marginRight: 15,
  },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingValue: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
    marginRight: 4,
  },
  settingTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.surfaceSecondary,
    padding: 12,
    borderRadius: 8,
    marginTop: 15,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  infoText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  placeholder: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.textSecondary,
    marginBottom: 10,
  },
  description: {
    fontSize: 14,
    color: colors.textTertiary,
    lineHeight: 22,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  modalCloseButton: {
    padding: 5,
  },
  dayOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  dayOptionSelected: {
    backgroundColor: colors.primaryLight + '20',
  },
  dayOptionText: {
    fontSize: 16,
    color: colors.text,
  },
  dayOptionTextSelected: {
    color: colors.primary,
    fontWeight: '600',
  },
});
