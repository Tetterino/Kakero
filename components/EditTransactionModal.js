import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Alert,
  Image,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Calendar } from 'react-native-calendars';
import * as ImagePicker from 'expo-image-picker';
import CategoryPicker from './CategoryPicker';
import ImagePreviewModal from './ImagePreviewModal';
import ItemizedTransactionModal from './ItemizedTransactionModal';

export default function EditTransactionModal({
  visible,
  transaction,
  categories,
  onSave,
  onCancel,
  onAddCategory,
}) {
  const [editTitle, setEditTitle] = useState('');
  const [editStoreName, setEditStoreName] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editType, setEditType] = useState('expense');
  const [editDate, setEditDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [editImageUri, setEditImageUri] = useState(null);
  const [showImagePreview, setShowImagePreview] = useState(false);
  const [editItems, setEditItems] = useState([]);
  const [showItemizedModal, setShowItemizedModal] = useState(false);

  useEffect(() => {
    if (transaction) {
      setEditTitle(transaction.title || '');
      setEditStoreName(transaction.storeName || '');
      setEditAmount(transaction.amount.toString());
      setEditCategory(transaction.category || transaction.description || '');
      setEditType(transaction.type);
      setEditDate(new Date(transaction.date));
      setEditImageUri(transaction.imageUri || null);
      setEditItems(transaction.items || []);
    }
  }, [transaction]);

  const handleSave = () => {
    if (!editAmount || !editCategory) {
      Alert.alert('エラー', '金額とカテゴリを入力してください');
      return;
    }

    const numAmount = parseFloat(editAmount);
    if (isNaN(numAmount) || numAmount <= 0) {
      Alert.alert('エラー', '有効な金額を入力してください');
      return;
    }

    // 商品明細が1つでもあれば親取引として扱う
    const hasItems = editItems && editItems.length > 0;

    const updatedTransaction = {
      ...transaction,
      title: editTitle.trim(),
      storeName: editStoreName.trim(),
      amount: numAmount,
      category: editCategory,
      type: editType,
      date: editDate.toISOString().split('T')[0],
      displayDate: editDate.toLocaleDateString('ja-JP'),
      imageUri: editImageUri || null,
      items: hasItems ? editItems : [],
      isParent: hasItems, // 商品明細が1つでもあれば親取引
    };

    onSave(updatedTransaction);
  };

  const handleItemizedConfirm = (items, total) => {
    setEditItems(items);
    setEditAmount(total.toString());
    setShowItemizedModal(false);
  };

  // 商品を削除
  const deleteItem = (id) => {
    const newItems = editItems.filter(item => item.id !== id);
    setEditItems(newItems);
    // 合計金額を再計算
    const total = newItems.reduce((sum, item) => sum + item.amount, 0);
    setEditAmount(total.toString());
  };

  // 商品名を更新
  const updateItemName = (id, newName) => {
    const newItems = editItems.map(item =>
      item.id === id ? { ...item, name: newName } : item
    );
    setEditItems(newItems);
  };

  // 商品金額を更新
  const updateItemAmount = (id, newAmount) => {
    const amount = parseFloat(newAmount) || 0;
    const newItems = editItems.map(item =>
      item.id === id ? { ...item, amount: amount } : item
    );
    setEditItems(newItems);
    // 合計金額を再計算
    const total = newItems.reduce((sum, item) => sum + item.amount, 0);
    setEditAmount(total.toString());
  };

  const onEditDateSelect = (day) => {
    const selectedDate = new Date(day.dateString);
    setEditDate(selectedDate);
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

  // カメラで撮影
  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('権限エラー', 'カメラの使用権限が必要です');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: 'images',
      quality: 0.7,
      allowsEditing: true,
    });

    if (!result.canceled) {
      setEditImageUri(result.assets[0].uri);
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
      quality: 0.7,
      allowsEditing: true,
    });

    if (!result.canceled) {
      setEditImageUri(result.assets[0].uri);
    }
  };

  if (!transaction) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onCancel}>
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.modalContent}>
          <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>取引を編集</Text>
            <TouchableOpacity onPress={onCancel}>
              <MaterialIcons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <View style={styles.typeSelector}>
            <TouchableOpacity
              style={[
                styles.typeButton,
                editType === 'expense' && styles.typeButtonActive,
              ]}
              onPress={() => setEditType('expense')}>
              <Text
                style={[
                  styles.typeButtonText,
                  editType === 'expense' && styles.typeButtonTextActive,
                ]}>
                支出
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.typeButton,
                editType === 'income' && styles.typeButtonActive,
              ]}
              onPress={() => setEditType('income')}>
              <Text
                style={[
                  styles.typeButtonText,
                  editType === 'income' && styles.typeButtonTextActive,
                ]}>
                収入
              </Text>
            </TouchableOpacity>
          </View>

          <TextInput
            style={styles.input}
            placeholder="タイトル（任意）"
            value={editTitle}
            onChangeText={setEditTitle}
          />

          <TextInput
            style={styles.input}
            placeholder="店舗名（任意）"
            value={editStoreName}
            onChangeText={setEditStoreName}
          />

          <TextInput
            style={styles.input}
            placeholder="金額"
            keyboardType="numeric"
            value={editAmount}
            onChangeText={setEditAmount}
          />

          <CategoryPicker
            selectedCategory={editCategory}
            onSelectCategory={setEditCategory}
            categories={categories}
            onAddCategory={onAddCategory}
            type={editType}
          />

          <TouchableOpacity
            style={styles.datePickerButton}
            onPress={() => setShowDatePicker(!showDatePicker)}>
            <MaterialIcons name="event" size={20} color="#2196F3" />
            <Text style={styles.datePickerButtonText}>
              日付: {editDate.toLocaleDateString('ja-JP')}
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
                current={editDate.toISOString().split('T')[0]}
                markedDates={{
                  [editDate.toISOString().split('T')[0]]: {
                    selected: true,
                    selectedColor: '#2196F3',
                  },
                }}
                onDayPress={onEditDateSelect}
                theme={{
                  todayTextColor: '#2196F3',
                  selectedDayBackgroundColor: '#2196F3',
                  arrowColor: '#2196F3',
                }}
              />
            </View>
          )}

          {/* 商品明細 */}
          {editItems.length > 0 && (
            <View style={styles.itemsSection}>
              <View style={styles.itemsHeader}>
                <MaterialIcons name="list" size={20} color="#2196F3" />
                <Text style={styles.itemsTitle}>商品明細 ({editItems.length}点)</Text>
                <TouchableOpacity
                  style={styles.addItemButton}
                  onPress={() => setShowItemizedModal(true)}>
                  <MaterialIcons name="add" size={20} color="#2196F3" />
                </TouchableOpacity>
              </View>
              <View style={styles.itemsList}>
                {editItems.map((item, index) => (
                  <View key={item.id} style={styles.editableItemRow}>
                    <View style={styles.itemNumberCell}>
                      <Text style={styles.itemNumber}>{index + 1}</Text>
                    </View>
                    <TextInput
                      style={styles.itemNameInput}
                      value={item.name}
                      onChangeText={(text) => updateItemName(item.id, text)}
                      placeholder="商品名"
                    />
                    <TextInput
                      style={styles.itemAmountInput}
                      value={item.amount.toString()}
                      onChangeText={(text) => updateItemAmount(item.id, text)}
                      keyboardType="numeric"
                      placeholder="金額"
                    />
                    <TouchableOpacity
                      style={styles.deleteItemButton}
                      onPress={() => deleteItem(item.id)}>
                      <MaterialIcons name="delete" size={20} color="#f44336" />
                    </TouchableOpacity>
                  </View>
                ))}
                <View style={styles.itemsTotalRow}>
                  <Text style={styles.itemsTotalLabel}>合計</Text>
                  <Text style={styles.itemsTotalAmount}>
                    ¥{editItems.reduce((sum, item) => sum + item.amount, 0).toLocaleString()}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* レシート画像 */}
          <View style={styles.receiptSection}>
            <TouchableOpacity
              style={styles.receiptButton}
              onPress={showImagePickerOptions}>
              <MaterialIcons name="photo-camera" size={20} color="#2196F3" />
              <Text style={styles.receiptButtonText}>
                {editImageUri ? 'レシート画像を変更' : 'レシート画像を追加'}
              </Text>
            </TouchableOpacity>

            {editImageUri && (
              <TouchableOpacity
                style={styles.receiptPreview}
                onPress={() => setShowImagePreview(true)}>
                <Image
                  source={{ uri: editImageUri }}
                  style={styles.receiptImage}
                  resizeMode="cover"
                />
                <View style={styles.imageOverlay}>
                  <MaterialIcons name="zoom-in" size={32} color="#fff" />
                </View>
                <TouchableOpacity
                  style={styles.removeImageButton}
                  onPress={(e) => {
                    e.stopPropagation();
                    setEditImageUri(null);
                  }}>
                  <MaterialIcons name="close" size={20} color="#fff" />
                </TouchableOpacity>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={[styles.modalButton, styles.cancelButton]}
              onPress={onCancel}>
              <Text style={styles.cancelButtonText}>キャンセル</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, styles.saveButton]}
              onPress={handleSave}>
              <Text style={styles.saveButtonText}>保存</Text>
            </TouchableOpacity>
          </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>

      {/* 画像プレビューモーダル */}
      <ImagePreviewModal
        visible={showImagePreview}
        imageUri={editImageUri}
        onClose={() => setShowImagePreview(false)}
      />

      {/* 商品明細モーダル */}
      <ItemizedTransactionModal
        visible={showItemizedModal}
        onClose={() => setShowItemizedModal(false)}
        onConfirm={handleItemizedConfirm}
        initialItems={editItems}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    width: '90%',
    maxWidth: 500,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  typeSelector: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    marginHorizontal: 5,
    borderRadius: 8,
  },
  typeButtonActive: {
    backgroundColor: '#2196F3',
  },
  typeButtonText: {
    fontSize: 16,
    color: '#666',
  },
  typeButtonTextActive: {
    color: '#fff',
    fontWeight: 'bold',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
    backgroundColor: '#fff',
  },
  datePickerButtonText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 10,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  modalButton: {
    flex: 1,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
  },
  saveButton: {
    backgroundColor: '#2196F3',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: 'bold',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  calendarContainer: {
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    overflow: 'hidden',
  },
  receiptSection: {
    marginBottom: 15,
  },
  receiptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#2196F3',
    borderRadius: 8,
    borderStyle: 'dashed',
    padding: 12,
    backgroundColor: '#f8f9fa',
  },
  receiptButtonText: {
    fontSize: 14,
    color: '#2196F3',
    marginLeft: 8,
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
    height: 150,
    borderRadius: 8,
  },
  imageOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
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
  itemsSection: {
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    overflow: 'hidden',
  },
  itemsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  itemsTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#2196F3',
    marginLeft: 8,
    flex: 1,
  },
  addItemButton: {
    padding: 4,
  },
  itemsList: {
    padding: 8,
    backgroundColor: '#fff',
  },
  editableItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 6,
  },
  itemNumberCell: {
    width: 30,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 6,
  },
  itemNumber: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#666',
  },
  itemNameInput: {
    flex: 2,
    height: 40,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    paddingHorizontal: 10,
    fontSize: 14,
    backgroundColor: '#fff',
  },
  itemAmountInput: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    paddingHorizontal: 10,
    fontSize: 14,
    backgroundColor: '#fff',
    textAlign: 'right',
  },
  deleteItemButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffebee',
    borderRadius: 6,
  },
  itemsTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    marginTop: 8,
    borderTopWidth: 2,
    borderTopColor: '#2196F3',
  },
  itemsTotalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  itemsTotalAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2196F3',
  },
});
