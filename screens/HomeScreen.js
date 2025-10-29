import React, {useState, useEffect} from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  Image,
  ActivityIndicator,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Calendar } from 'react-native-calendars';
import * as ImagePicker from 'expo-image-picker';
import { MaterialIcons } from '@expo/vector-icons';
import { performOCR, extractAmountFromText, extractStoreName, extractDate, extractItems, extractTax } from '../utils/ocr';
import { DEFAULT_EXPENSE_CATEGORIES, DEFAULT_INCOME_CATEGORIES } from '../constants/categories';
import {
  loadTransactions,
  saveTransactions as saveTransactionsToStorage,
  loadCustomCategories,
  saveCustomCategories,
  loadDeletedCategories,
  loadAppMode,
} from '../utils/storage';
import { APP_MODES } from '../constants/storage';
import {
  calculateBalance,
  calculateTotalIncome,
  calculateTotalExpense,
} from '../utils/calculations';
import { getAvailableCategories } from '../utils/categories';
import BalanceCard from '../components/BalanceCard';
import CategoryPicker from '../components/CategoryPicker';
import TransactionItem from '../components/TransactionItem';
import EditTransactionModal from '../components/EditTransactionModal';
import ItemizedTransactionModal from '../components/ItemizedTransactionModal';
import OCRResultModal from '../components/OCRResultModal';
import { useTheme } from '../contexts/ThemeContext';

export default function HomeScreen({ navigation }) {
  const { colors } = useTheme();
  const [transactions, setTransactions] = useState([]);
  const [title, setTitle] = useState('');
  const [storeName, setStoreName] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [type, setType] = useState('expense');
  const [transactionDate, setTransactionDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [customExpenseCategories, setCustomExpenseCategories] = useState([]);
  const [customIncomeCategories, setCustomIncomeCategories] = useState([]);
  const [deletedExpenseCategories, setDeletedExpenseCategories] = useState([]);
  const [deletedIncomeCategories, setDeletedIncomeCategories] = useState([]);
  const [receiptImage, setReceiptImage] = useState(null);
  const [isProcessingOCR, setIsProcessingOCR] = useState(false);
  const [showItemizedModal, setShowItemizedModal] = useState(false);
  const [extractedItems, setExtractedItems] = useState([]);
  const [ocrText, setOcrText] = useState('');
  const [appMode, setAppMode] = useState(APP_MODES.NORMAL);
  const [showOCRResultModal, setShowOCRResultModal] = useState(false);
  const [ocrResultData, setOcrResultData] = useState(null);
  const [sortOrder, setSortOrder] = useState('registration'); // 'registration' or 'date'

  // アプリ起動時にデータを読み込む
  useEffect(() => {
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

    loadData();
  }, []);

  // カテゴリリストを取得（削除されたデフォルトカテゴリを除外）
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

  // 新しいカテゴリを追加
  const addCustomCategory = (newCategory) => {
    if (type === 'expense') {
      const newCategories = [...customExpenseCategories, newCategory];
      setCustomExpenseCategories(newCategories);
      saveCustomCategories(newCategories, customIncomeCategories);
    } else {
      const newCategories = [...customIncomeCategories, newCategory];
      setCustomIncomeCategories(newCategories);
      saveCustomCategories(customExpenseCategories, newCategories);
    }
    setCategory(newCategory);
  };

  // OCR処理を実行
  const processImageWithOCR = async (imageUri) => {
    setIsProcessingOCR(true);
    try {
      // OCRテキストを取得（OCR.spaceのみ使用）
      console.log('[OCR] パターンマッチモード');
      const text = await performOCR(imageUri);

      setOcrText(text);

      // デバッグ: OCRテキストをコンソールに出力
      console.log('=== OCR認識テキスト ===');
      console.log(text);
      console.log('=== 行ごとの分解 ===');
      text.split('\n').forEach((line, index) => {
        console.log(`${index}: [${line}]`);
      });
      console.log('====================');

      // 金額を抽出
      const extractedAmount = extractAmountFromText(text);
      if (extractedAmount) {
        setAmount(extractedAmount.toString());
      }

      // 店名を抽出
      const extractedStoreName = extractStoreName(text);
      if (extractedStoreName) {
        setStoreName(extractedStoreName);
      }

      // 日付を抽出
      const extractedDate = extractDate(text);
      if (extractedDate) {
        // タイムゾーンの問題を避けるため、正午の時刻で日付を作成
        const [year, month, date] = extractedDate.split('-').map(Number);
        setTransactionDate(new Date(year, month - 1, date, 12, 0, 0));
      }

      // 商品明細を抽出（パターンマッチングのみ使用）
      console.log('=== パターンマッチングで商品抽出 ===');
      const items = extractItems(text);

      // 消費税を抽出して商品明細に追加
      const taxAmount = extractTax(text);
      if (taxAmount && taxAmount > 0) {
        items.push({
          id: `${Date.now()}_tax_${Math.random()}`,
          name: '消費税（外税）',
          amount: taxAmount,
        });
        console.log(`✓ 消費税を商品明細に追加: ¥${taxAmount}`);
      }

      // 商品明細の合計をチェック
      const itemsTotal = items.reduce((sum, item) => sum + (item.amount || 0), 0);
      console.log('=== 最終的な抽出商品 ===');
      console.log(items);
      console.log(`商品明細の合計: ¥${itemsTotal}`);
      console.log(`OCR抽出の合計: ¥${extractedAmount}`);

      // 合計金額が10円以上ズレている場合は警告
      if (extractedAmount && Math.abs(itemsTotal - extractedAmount) > 10) {
        console.warn(`⚠️ 金額の不一致: 明細合計 ¥${itemsTotal} vs OCR合計 ¥${extractedAmount}`);
      }
      console.log('====================');

      setExtractedItems(items);

      // OCR結果をモーダルで表示
      setOcrResultData({
        storeName: extractedStoreName,
        amount: extractedAmount,
        date: extractedDate,
        items: items,
      });
      setShowOCRResultModal(true);
    } catch (error) {
      console.error('OCR処理エラー:', error);
      Alert.alert(
        'OCRエラー',
        'レシートの読み取りに失敗しました。手動で入力してください。',
        [{ text: 'OK' }]
      );
    } finally {
      setIsProcessingOCR(false);
    }
  };

  // カメラで撮影
  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('権限エラー', 'カメラの使用権限が必要です');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: 'images',
      quality: 0.3,
      allowsEditing: false,
    });

    if (!result.canceled) {
      const imageUri = result.assets[0].uri;
      setReceiptImage(imageUri);

      // OCR処理を実行
      await processImageWithOCR(imageUri);
    }
  };

  // ギャラリーから選択
  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('権限エラー', 'ギャラリーへのアクセス権限が必要です');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      quality: 0.3,
      allowsEditing: false,
    });

    if (!result.canceled) {
      const imageUri = result.assets[0].uri;
      setReceiptImage(imageUri);

      // OCR処理を実行
      await processImageWithOCR(imageUri);
    }
  };

  // 画像選択のオプションを表示
  const showImagePickerOptions = () => {
    Alert.alert(
      'レシート画像',
      '画像を選択してください',
      [
        {
          text: 'カメラで撮影',
          onPress: takePhoto,
        },
        {
          text: 'ギャラリーから選択',
          onPress: pickImage,
        },
        {
          text: 'キャンセル',
          style: 'cancel',
        },
      ]
    );
  };

  // OCR結果モーダルを閉じる（キャンセル）
  const handleOCRResultCancel = () => {
    setShowOCRResultModal(false);
    // 入力値をクリア
    setStoreName('');
    setAmount('');
    setExtractedItems([]);
    setReceiptImage(null);
    setOcrResultData(null);
  };

  // OCRモーダルから子カテゴリを追加
  const handleAddSubcategoryFromOCR = (newSubcategory) => {
    const newCategories = [...customExpenseCategories, newSubcategory];
    setCustomExpenseCategories(newCategories);
    saveCustomCategories(newCategories, customIncomeCategories);
  };

  // OCR結果をそのまま使用（編集された内容を反映し、即座に登録）
  const handleOCRResultUseAsIs = (editedData) => {
    setShowOCRResultModal(false);

    // 編集されたデータから収支を作成
    if (editedData) {
      const finalAmount = editedData.amount || 0;
      const finalStoreName = editedData.storeName || '';
      const finalItems = editedData.items || [];

      // 日付を処理
      let finalDate = transactionDate;
      if (editedData.date) {
        const [year, month, date] = editedData.date.split('-').map(Number);
        finalDate = new Date(year, month - 1, date, 12, 0, 0);
      }

      // 金額チェック
      if (!finalAmount || finalAmount <= 0) {
        Alert.alert('エラー', '有効な金額を入力してください');
        return;
      }

      // 商品明細が1つ以上ある場合は必ず親収支として扱う
      const hasItems = finalItems && finalItems.length > 0;

      const year = finalDate.getFullYear();
      const month = String(finalDate.getMonth() + 1).padStart(2, '0');
      const date = String(finalDate.getDate()).padStart(2, '0');
      const dateString = `${year}-${month}-${date}`;

      const newTransaction = {
        id: Date.now().toString(),
        title: title.trim(),
        storeName: finalStoreName.trim(),
        amount: finalAmount,
        category: category || '未分類',
        type: type,
        date: dateString,
        displayDate: finalDate.toLocaleDateString('ja-JP'),
        imageUri: receiptImage || null,
        items: hasItems ? finalItems : [],
        isParent: hasItems,
      };

      const newTransactions = [newTransaction, ...transactions];
      setTransactions(newTransactions);
      saveTransactionsToStorage(newTransactions);

      // フォームをリセット
      setTitle('');
      setStoreName('');
      setAmount('');
      setCategory('');
      setTransactionDate(new Date());
      setReceiptImage(null);
      setExtractedItems([]);
      setOcrResultData(null);
    }
  };

  // OCR結果の明細を編集
  const handleOCRResultEdit = () => {
    setShowOCRResultModal(false);
    setShowItemizedModal(true);
  };

  // 商品明細を確定
  const handleItemizedConfirm = (items, total) => {
    // 商品明細を使って収支を作成
    setAmount(total.toString());
    setExtractedItems(items);
    setShowItemizedModal(false);

    // 即座に収支を作成
    const year = transactionDate.getFullYear();
    const month = String(transactionDate.getMonth() + 1).padStart(2, '0');
    const date = String(transactionDate.getDate()).padStart(2, '0');
    const dateString = `${year}-${month}-${date}`;

    const newTransaction = {
      id: Date.now().toString(),
      title: title.trim(),
      storeName: storeName.trim(),
      amount: total,
      category: category || '未分類', // カテゴリ未選択の場合は「未分類」
      type: type,
      date: dateString,
      displayDate: transactionDate.toLocaleDateString('ja-JP'),
      imageUri: receiptImage || null,
      items: items,
      isParent: true, // 商品明細を持つ親収支（1つ以上で必ず親）
    };

    const newTransactions = [newTransaction, ...transactions];
    setTransactions(newTransactions);
    saveTransactionsToStorage(newTransactions);

    // フォームをリセット
    setTitle('');
    setStoreName('');
    setAmount('');
    setCategory('');
    setTransactionDate(new Date());
    setReceiptImage(null);
    setExtractedItems([]);
    setShowItemizedModal(false);
  };

  // 収支を追加
  const addTransaction = () => {
    if (!amount) {
      Alert.alert('エラー', '金額を入力してください');
      return;
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      Alert.alert('エラー', '有効な金額を入力してください');
      return;
    }

    // 商品明細が1つ以上ある場合は必ず親収支として扱う
    const hasItems = extractedItems && extractedItems.length > 0;

    const year = transactionDate.getFullYear();
    const month = String(transactionDate.getMonth() + 1).padStart(2, '0');
    const date = String(transactionDate.getDate()).padStart(2, '0');
    const dateString = `${year}-${month}-${date}`;

    const newTransaction = {
      id: Date.now().toString(),
      title: title.trim(),
      storeName: storeName.trim(),
      amount: numAmount,
      category: category || '未分類', // カテゴリ未選択の場合は「未分類」
      type: type,
      date: dateString,
      displayDate: transactionDate.toLocaleDateString('ja-JP'),
      imageUri: receiptImage || null,
      items: hasItems ? extractedItems : [], // OCRで抽出された商品明細を使用
      isParent: hasItems, // 商品明細が1つでもあれば親収支
    };

    const newTransactions = [newTransaction, ...transactions];
    setTransactions(newTransactions);
    saveTransactionsToStorage(newTransactions);

    setTitle('');
    setStoreName('');
    setAmount('');
    setCategory('');
    setTransactionDate(new Date());
    setReceiptImage(null);
    setExtractedItems([]); // 抽出された商品明細をクリア
  };

  // 収支を削除
  const deleteTransaction = (id) => {
    const newTransactions = transactions.filter(t => t.id !== id);
    setTransactions(newTransactions);
    saveTransactionsToStorage(newTransactions);
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

  // ソート済みの収支を取得
  const getSortedTransactions = () => {
    const filtered = getFilteredTransactions();

    if (sortOrder === 'date') {
      // 日付順（新しい順）
      return [...filtered].sort((a, b) => {
        if (b.date === a.date) {
          // 同じ日付の場合は登録順（IDで判定）
          return b.id.localeCompare(a.id);
        }
        return b.date.localeCompare(a.date);
      });
    } else {
      // 登録順（デフォルト、既にIDで新しい順になっている）
      return filtered;
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
  const saveEditedTransaction = (updatedTransaction) => {
    const newTransactions = transactions.map(t =>
      t.id === updatedTransaction.id ? updatedTransaction : t
    );

    setTransactions(newTransactions);
    saveTransactionsToStorage(newTransactions);
    cancelEdit();
  };

  // 編集モーダル用のカテゴリ追加
  const addCustomCategoryForEdit = (newCategory) => {
    if (editingTransaction?.type === 'expense') {
      const newCategories = [...customExpenseCategories, newCategory];
      setCustomExpenseCategories(newCategories);
      saveCustomCategories(newCategories, customIncomeCategories);
    } else {
      const newCategories = [...customIncomeCategories, newCategory];
      setCustomIncomeCategories(newCategories);
      saveCustomCategories(customExpenseCategories, newCategories);
    }
  };

  const balance = calculateBalance(transactions);
  const totalIncome = calculateTotalIncome(transactions);
  const totalExpense = calculateTotalExpense(transactions);
  const sortedTransactions = getSortedTransactions();

  const styles = createStyles(colors);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar style="auto" />
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <Text style={styles.title}>家計簿 Kakero</Text>
          <BalanceCard
            balance={balance}
            totalIncome={totalIncome}
            totalExpense={totalExpense}
            appMode={appMode}
          />
        </View>

        {/* 入力セクション */}
        <View style={styles.inputSection}>
          {/* 通常モードの場合のみ支出/収入切り替えを表示 */}
          {appMode === APP_MODES.NORMAL && (
            <View style={styles.typeSelector}>
              <TouchableOpacity
                style={[
                  styles.typeButton,
                  type === 'expense' && styles.typeButtonActive,
                ]}
                onPress={() => setType('expense')}>
                <Text
                  style={[
                    styles.typeButtonText,
                    type === 'expense' && styles.typeButtonTextActive,
                  ]}>
                  支出
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.typeButton,
                  type === 'income' && styles.typeButtonActive,
                ]}
                onPress={() => setType('income')}>
                <Text
                  style={[
                    styles.typeButtonText,
                    type === 'income' && styles.typeButtonTextActive,
                  ]}>
                  収入
                </Text>
              </TouchableOpacity>
            </View>
          )}

          <TextInput
            style={styles.input}
            placeholder="タイトル（任意）"
            placeholderTextColor={colors.textTertiary}
            value={title}
            onChangeText={setTitle}
          />

          <TextInput
            style={styles.input}
            placeholder="店舗名（任意）"
            placeholderTextColor={colors.textTertiary}
            value={storeName}
            onChangeText={setStoreName}
          />

          <TextInput
            style={styles.input}
            placeholder="金額"
            placeholderTextColor={colors.textTertiary}
            keyboardType="numeric"
            value={amount}
            onChangeText={setAmount}
          />

          <CategoryPicker
            selectedCategory={category}
            onSelectCategory={setCategory}
            categories={getCategories(type)}
            onAddCategory={addCustomCategory}
            type={type}
          />

          <TouchableOpacity
            style={styles.datePickerButton}
            onPress={() => setShowDatePicker(!showDatePicker)}>
            <MaterialIcons name="event" size={20} color="#2196F3" />
            <Text style={styles.datePickerButtonText}>
              日付: {transactionDate.toLocaleDateString('ja-JP')}
            </Text>
            <MaterialIcons
              name={showDatePicker ? "keyboard-arrow-up" : "keyboard-arrow-down"}
              size={20}
              color="#666"
              style={{marginLeft: 'auto'}}
            />
          </TouchableOpacity>

          {showDatePicker && (
            <View style={styles.calendarContainer}>
              <Calendar
                current={(() => {
                  const year = transactionDate.getFullYear();
                  const month = String(transactionDate.getMonth() + 1).padStart(2, '0');
                  const date = String(transactionDate.getDate()).padStart(2, '0');
                  return `${year}-${month}-${date}`;
                })()}
                markedDates={{
                  [(() => {
                    const year = transactionDate.getFullYear();
                    const month = String(transactionDate.getMonth() + 1).padStart(2, '0');
                    const date = String(transactionDate.getDate()).padStart(2, '0');
                    return `${year}-${month}-${date}`;
                  })()]: {
                    selected: true,
                    selectedColor: colors.primary,
                  },
                }}
                onDayPress={(day) => {
                  // タイムゾーンの問題を避けるため、日付を直接指定
                  const [year, month, date] = day.dateString.split('-').map(Number);
                  setTransactionDate(new Date(year, month - 1, date));
                  setShowDatePicker(false);
                }}
                theme={{
                  calendarBackground: colors.surface,
                  textSectionTitleColor: colors.textSecondary,
                  dayTextColor: colors.text,
                  todayTextColor: colors.primary,
                  selectedDayBackgroundColor: colors.primary,
                  arrowColor: colors.primary,
                  monthTextColor: colors.text,
                  textDisabledColor: colors.textTertiary,
                }}
              />
            </View>
          )}

          {/* レシート画像 */}
          <View style={styles.receiptSection}>
            <TouchableOpacity
              style={styles.receiptButton}
              onPress={showImagePickerOptions}
              disabled={isProcessingOCR}>
              <MaterialIcons name="photo-camera" size={20} color="#2196F3" />
              <Text style={styles.receiptButtonText}>
                {receiptImage ? 'レシート画像を変更' : 'レシート画像を追加'}
              </Text>
            </TouchableOpacity>

            {isProcessingOCR && (
              <View style={styles.ocrLoadingContainer}>
                <ActivityIndicator size="large" color="#2196F3" />
                <Text style={styles.ocrLoadingText}>レシートを読み取り中...</Text>
              </View>
            )}

            {receiptImage && !isProcessingOCR && (
              <View style={styles.receiptPreview}>
                <Image
                  source={{ uri: receiptImage }}
                  style={styles.receiptImage}
                  resizeMode="cover"
                />
                <TouchableOpacity
                  style={styles.removeImageButton}
                  onPress={() => setReceiptImage(null)}>
                  <MaterialIcons name="close" size={20} color="#fff" />
                </TouchableOpacity>
              </View>
            )}
          </View>

          <TouchableOpacity style={styles.addButton} onPress={addTransaction}>
            <Text style={styles.addButtonText}>追加</Text>
          </TouchableOpacity>
        </View>

        {/* 収支履歴 */}
        <View style={styles.listSection}>
          <View style={styles.listHeader}>
            <Text style={styles.listTitle}>直近の収支</Text>
            {sortedTransactions.length > 10 && (
              <TouchableOpacity
                style={styles.viewAllButton}
                onPress={() => navigation.navigate('History')}>
                <Text style={styles.viewAllText}>すべて表示</Text>
                <MaterialIcons name="chevron-right" size={20} color={colors.primary} />
              </TouchableOpacity>
            )}
          </View>

          {/* ソート切り替えボタン */}
          <View style={styles.sortSelector}>
            <TouchableOpacity
              style={[
                styles.sortButton,
                sortOrder === 'registration' && styles.sortButtonActive,
              ]}
              onPress={() => setSortOrder('registration')}>
              <MaterialIcons
                name="history"
                size={16}
                color={sortOrder === 'registration' ? '#fff' : colors.textSecondary}
              />
              <Text
                style={[
                  styles.sortButtonText,
                  sortOrder === 'registration' && styles.sortButtonTextActive,
                ]}>
                登録順
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.sortButton,
                sortOrder === 'date' && styles.sortButtonActive,
              ]}
              onPress={() => setSortOrder('date')}>
              <MaterialIcons
                name="event"
                size={16}
                color={sortOrder === 'date' ? '#fff' : colors.textSecondary}
              />
              <Text
                style={[
                  styles.sortButtonText,
                  sortOrder === 'date' && styles.sortButtonTextActive,
                ]}>
                日付順
              </Text>
            </TouchableOpacity>
          </View>

          {sortedTransactions.length > 0 ? (
            <>
              {sortedTransactions.slice(0, 10).map((item) => (
                <TransactionItem
                  key={item.id}
                  item={item}
                  onPress={openEditModal}
                  onDelete={deleteTransaction}
                />
              ))}
              {sortedTransactions.length > 10 && (
                <TouchableOpacity
                  style={styles.moreButton}
                  onPress={() => navigation.navigate('History')}>
                  <Text style={styles.moreButtonText}>
                    もっと見る（残り{sortedTransactions.length - 10}件）
                  </Text>
                  <MaterialIcons name="arrow-forward" size={18} color={colors.primary} />
                </TouchableOpacity>
              )}
            </>
          ) : (
            <Text style={styles.emptyText}>収支がありません</Text>
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

      {/* OCR結果モーダル */}
      <OCRResultModal
        visible={showOCRResultModal}
        onClose={handleOCRResultCancel}
        onEdit={handleOCRResultEdit}
        onUseAsIs={handleOCRResultUseAsIs}
        storeName={ocrResultData?.storeName}
        amount={ocrResultData?.amount}
        date={ocrResultData?.date}
        items={ocrResultData?.items}
        transactions={transactions}
        customExpenseCategories={customExpenseCategories}
        deletedExpenseCategories={deletedExpenseCategories}
        onAddSubcategory={handleAddSubcategoryFromOCR}
      />

      {/* 商品明細モーダル */}
      <ItemizedTransactionModal
        visible={showItemizedModal}
        onClose={() => setShowItemizedModal(false)}
        onConfirm={handleItemizedConfirm}
        initialItems={extractedItems}
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
    paddingTop: 20,
    paddingBottom: 15,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 15,
  },
  inputSection: {
    backgroundColor: colors.surface,
    padding: 20,
    marginTop: 10,
  },
  typeSelector: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: colors.surfaceSecondary,
    marginHorizontal: 5,
    borderRadius: 8,
  },
  typeButtonActive: {
    backgroundColor: colors.primary,
  },
  typeButtonText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  typeButtonTextActive: {
    color: '#fff',
    fontWeight: 'bold',
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    fontSize: 16,
    backgroundColor: colors.surface,
    color: colors.text,
  },
  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    backgroundColor: colors.surface,
  },
  datePickerButtonText: {
    fontSize: 16,
    color: colors.text,
    marginLeft: 10,
  },
  calendarContainer: {
    marginBottom: 15,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    overflow: 'hidden',
  },
  addButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  scrollView: {
    flex: 1,
  },
  listSection: {
    backgroundColor: colors.surface,
    marginTop: 10,
    paddingTop: 15,
    paddingBottom: 20,
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingHorizontal: 20,
  },
  listTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  viewAllText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
  },
  sortSelector: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingBottom: 15,
    gap: 10,
  },
  sortButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sortButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  sortButtonText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '600',
    marginLeft: 6,
  },
  sortButtonTextActive: {
    color: '#fff',
  },
  moreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    marginHorizontal: 20,
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  moreButtonText: {
    fontSize: 15,
    color: colors.primary,
    fontWeight: '600',
    marginRight: 5,
  },
  emptyText: {
    textAlign: 'center',
    color: colors.textTertiary,
    marginTop: 20,
    fontSize: 16,
    paddingHorizontal: 20,
  },
  receiptSection: {
    marginBottom: 15,
  },
  receiptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 8,
    borderStyle: 'dashed',
    padding: 12,
    backgroundColor: colors.surfaceSecondary,
  },
  receiptButtonText: {
    fontSize: 14,
    color: colors.primary,
    marginLeft: 8,
    fontWeight: '500',
  },
  ocrLoadingContainer: {
    marginTop: 15,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: colors.primaryLight + '20',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.primary,
    borderStyle: 'dashed',
  },
  ocrLoadingText: {
    marginTop: 10,
    fontSize: 14,
    color: colors.primary,
    fontWeight: '500',
  },
  receiptPreview: {
    marginTop: 10,
    position: 'relative',
    borderRadius: 8,
    overflow: 'hidden',
  },
  receiptImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
  },
  removeImageButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 15,
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
