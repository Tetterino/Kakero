import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import {
  DEFAULT_EXPENSE_CATEGORIES,
  flattenCategories,
  isSubcategory,
  getParentCategory,
  getSubcategoryName,
} from '../constants/categories';
import { getAvailableCategories } from '../utils/categories';

export default function OCRResultModal({
  visible,
  onClose,
  onEdit,
  onUseAsIs,
  storeName: initialStoreName,
  amount: initialAmount,
  date: initialDate,
  items: initialItems,
  transactions = [],
  customExpenseCategories = [],
  deletedExpenseCategories = [],
  onAddSubcategory,
}) {
  const [editedStoreName, setEditedStoreName] = useState('');
  const [editedAmount, setEditedAmount] = useState('');
  const [editedDate, setEditedDate] = useState('');
  const [editedItems, setEditedItems] = useState([]);
  const [showStoreSuggestions, setShowStoreSuggestions] = useState(false);
  const [storeSuggestions, setStoreSuggestions] = useState([]);
  const [receiptParentCategory, setReceiptParentCategory] = useState(null); // レシート全体の親カテゴリ
  const [showCategoryPicker, setShowCategoryPicker] = useState({}); // {itemIndex: true/false}
  const [isAddingSubcategory, setIsAddingSubcategory] = useState(false);
  const [newSubcategoryInput, setNewSubcategoryInput] = useState('');

  // 利用可能なカテゴリを取得
  const availableCategories = getAvailableCategories(
    'expense',
    customExpenseCategories,
    deletedExpenseCategories
  );

  // 親カテゴリのみを取得
  const parentCategories = availableCategories.filter(cat => !isSubcategory(cat));

  // 特定の親カテゴリの子カテゴリを取得
  const getSubcategoriesFor = (parentCategory) => {
    if (!parentCategory) return [];
    return availableCategories.filter(cat => {
      const parent = getParentCategory(cat);
      return parent === parentCategory;
    });
  };

  // レシート全体の親カテゴリに基づく子カテゴリリスト
  const availableSubcategories = getSubcategoriesFor(receiptParentCategory);

  // 全カテゴリを取得（親カテゴリが選択されていない場合に使用）
  const getAllCategories = () => {
    return availableCategories; // 親カテゴリと全ての子カテゴリを含む
  };

  // 初期値をセット
  useEffect(() => {
    if (visible) {
      setEditedStoreName(initialStoreName || '');
      setEditedAmount(initialAmount ? initialAmount.toString() : '');
      setEditedDate(initialDate || '');
      setEditedItems(initialItems || []);

      // 店舗名が空の場合、過去の履歴から候補を生成
      if (!initialStoreName || initialStoreName.trim() === '') {
        const uniqueStores = [...new Set(
          transactions
            .filter(t => t.storeName && t.storeName.trim() !== '')
            .map(t => t.storeName.trim())
        )];
        setStoreSuggestions(uniqueStores.slice(0, 5)); // 最大5件
        setShowStoreSuggestions(uniqueStores.length > 0);
      } else {
        setShowStoreSuggestions(false);
        setStoreSuggestions([]);
      }
    }
  }, [visible, initialStoreName, initialAmount, initialDate, initialItems, transactions]);

  // 商品の名前を更新
  const updateItemName = (index, newName) => {
    const newItems = [...editedItems];
    newItems[index] = { ...newItems[index], name: newName };
    setEditedItems(newItems);
  };

  // 商品の金額を更新
  const updateItemAmount = (index, newAmount) => {
    const newItems = [...editedItems];

    // 空の場合は0にする
    if (newAmount === '' || newAmount === null || newAmount === undefined) {
      newItems[index] = { ...newItems[index], amount: 0 };
      setEditedItems(newItems);
      return;
    }

    const numAmount = parseInt(newAmount.replace(/[^0-9-]/g, ''), 10);
    if (!isNaN(numAmount)) {
      newItems[index] = { ...newItems[index], amount: numAmount };
      setEditedItems(newItems);
    }
  };

  // 商品を削除
  const deleteItem = (index) => {
    const newItems = editedItems.filter((_, i) => i !== index);
    setEditedItems(newItems);
  };

  // 商品を追加
  const addNewItem = () => {
    const newItem = {
      id: `${Date.now()}_new_${Math.random()}`,
      name: '',
      amount: 0,
      category: null,
    };
    setEditedItems([...editedItems, newItem]);
  };

  // 商品のカテゴリを更新（親カテゴリまたは子カテゴリを設定）
  const updateItemCategory = (index, category) => {
    const newItems = [...editedItems];
    // 親カテゴリまたは子カテゴリが選択された場合、カテゴリを保存
    newItems[index] = { ...newItems[index], category: category };
    setEditedItems(newItems);
    setShowCategoryPicker(prev => ({ ...prev, [index]: false }));
  };

  // 新しい子カテゴリを追加
  const handleAddSubcategory = () => {
    if (!newSubcategoryInput.trim()) {
      return;
    }
    if (!receiptParentCategory) {
      return;
    }

    const newSubcategoryName = `${receiptParentCategory} > ${newSubcategoryInput.trim()}`;

    // 親コンポーネントのカテゴリ追加関数を呼び出す
    if (onAddSubcategory) {
      onAddSubcategory(newSubcategoryName);
    }

    setNewSubcategoryInput('');
    setIsAddingSubcategory(false);
  };

  // 店舗名の候補を選択
  const selectStoreSuggestion = (storeName) => {
    setEditedStoreName(storeName);
    setShowStoreSuggestions(false);
  };

  // 編集した内容で使用
  const handleUseEdited = () => {
    // 編集内容を親に渡す（onEditコールバックを再利用）
    const numAmount = parseInt(editedAmount.replace(/[^0-9]/g, ''), 10);
    onUseAsIs({
      storeName: editedStoreName,
      amount: isNaN(numAmount) ? initialAmount : numAmount,
      date: editedDate,
      items: editedItems,
    });
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>OCR認識結果</Text>
            <TouchableOpacity onPress={onClose}>
              <MaterialIcons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.resultSection}>
            {/* メタ情報 */}
            <View style={styles.infoBox}>
              <MaterialIcons name="edit" size={20} color="#2196F3" />
              <Text style={styles.infoText}>
                認識結果を編集できます
              </Text>
            </View>

            {/* 店舗名（編集可能） */}
            <View style={styles.editRow}>
              <Text style={styles.resultLabel}>店舗名</Text>
              <TextInput
                style={styles.editInput}
                value={editedStoreName}
                onChangeText={setEditedStoreName}
                placeholder="店舗名"
                placeholderTextColor="#999"
              />

              {/* 店舗名の候補表示 */}
              {showStoreSuggestions && storeSuggestions.length > 0 && (
                <View style={styles.suggestionsContainer}>
                  <Text style={styles.suggestionsTitle}>過去の登録店舗:</Text>
                  <View style={styles.suggestionsList}>
                    {storeSuggestions.map((suggestion, index) => (
                      <TouchableOpacity
                        key={index}
                        style={styles.suggestionItem}
                        onPress={() => selectStoreSuggestion(suggestion)}>
                        <MaterialIcons name="store" size={16} color="#666" />
                        <Text style={styles.suggestionText}>{suggestion}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}
            </View>

            {/* 日付（編集可能） */}
            <View style={styles.editRow}>
              <Text style={styles.resultLabel}>日付</Text>
              <TextInput
                style={styles.editInput}
                value={editedDate}
                onChangeText={setEditedDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#999"
              />
            </View>

            {/* 合計金額（編集可能） */}
            <View style={styles.editRow}>
              <Text style={styles.resultLabel}>合計金額</Text>
              <TextInput
                style={[styles.editInput, styles.amountInput]}
                value={editedAmount}
                onChangeText={setEditedAmount}
                placeholder="金額"
                placeholderTextColor="#999"
                keyboardType="numeric"
              />
            </View>

            {/* 商品明細（編集可能） */}
            {editedItems && editedItems.length > 0 && (
              <View style={styles.itemsSection}>
                <Text style={styles.sectionTitle}>
                  商品明細 ({editedItems.length}点)
                </Text>

                {/* レシート全体の親カテゴリ選択（オプション） */}
                <View style={styles.receiptCategorySection}>
                  <Text style={styles.receiptCategoryLabel}>
                    親カテゴリを選択（オプション：全商品共通）
                  </Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.categoryChipsScrollView}
                    contentContainerStyle={styles.categoryChipsRow}>
                    {parentCategories.map((parentCat, pIndex) => (
                      <TouchableOpacity
                        key={pIndex}
                        style={[
                          styles.categoryChip,
                          styles.parentCategoryChip,
                          (receiptParentCategory === parentCat) && styles.categoryChipSelected
                        ]}
                        onPress={() => setReceiptParentCategory(parentCat)}>
                        <Text style={[
                          styles.categoryChipText,
                          (receiptParentCategory === parentCat) && styles.categoryChipTextSelected
                        ]}>
                          {parentCat}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                  <Text style={styles.categoryHintText}>
                    {receiptParentCategory
                      ? `※ ${receiptParentCategory}の子カテゴリのみ表示されます`
                      : '※ 親カテゴリを選択しない場合、全カテゴリから選択できます'}
                  </Text>
                </View>

                {editedItems.map((item, index) => {
                  const displayCategoryName = item.category
                    ? (isSubcategory(item.category) ? getSubcategoryName(item.category) : item.category)
                    : 'カテゴリを選択';

                  return (
                    <View key={item.id || index}>
                      <View style={styles.editableItemRow}>
                        <Text style={styles.itemNumber}>{index + 1}</Text>
                        <View style={styles.itemEditSection}>
                          <TextInput
                            style={styles.itemNameInput}
                            value={item.name}
                            onChangeText={(text) => updateItemName(index, text)}
                            placeholder="商品名"
                            placeholderTextColor="#999"
                            multiline
                          />

                          {/* カテゴリ選択ボタン（常に有効） */}
                          <TouchableOpacity
                            style={styles.categorySelectButton}
                            onPress={() => setShowCategoryPicker(prev => ({
                              ...prev,
                              [index]: !prev[index]
                            }))}>
                            <MaterialIcons name="label" size={16} color="#666" />
                            <Text style={styles.categorySelectText}>
                              {displayCategoryName}
                            </Text>
                            <MaterialIcons
                              name={showCategoryPicker[index] ? "expand-less" : "expand-more"}
                              size={16}
                              color="#666"
                            />
                          </TouchableOpacity>

                          <View style={styles.itemAmountRow}>
                            <Text style={styles.yenSymbol}>¥</Text>
                            <TextInput
                              style={styles.itemAmountInput}
                              value={item.amount.toString()}
                              onChangeText={(text) => updateItemAmount(index, text)}
                              placeholder="0"
                              placeholderTextColor="#999"
                              keyboardType="numeric"
                            />
                          </View>
                        </View>
                        <TouchableOpacity
                          style={styles.deleteItemButton}
                          onPress={() => deleteItem(index)}>
                          <MaterialIcons name="delete" size={20} color="#f44336" />
                        </TouchableOpacity>
                      </View>

                      {/* カテゴリピッカー（セレクトボックス形式） */}
                      {showCategoryPicker[index] && (
                        <View style={styles.categoryDropdownContainer}>
                          <Text style={styles.categoryPickerTitle}>
                            {receiptParentCategory
                              ? `子カテゴリ（${receiptParentCategory}）`
                              : 'カテゴリを選択'}
                          </Text>
                          <ScrollView style={styles.categoryDropdownList} nestedScrollEnabled>
                            {receiptParentCategory ? (
                              // 親カテゴリが選択されている場合：その子カテゴリのみを表示
                              availableSubcategories.length > 0 ? (
                                availableSubcategories.map((subcat, sIndex) => (
                                  <TouchableOpacity
                                    key={sIndex}
                                    style={[
                                      styles.categoryDropdownItem,
                                      (item.category === subcat) && styles.categoryDropdownItemSelected
                                    ]}
                                    onPress={() => updateItemCategory(index, subcat)}>
                                    <MaterialIcons
                                      name={item.category === subcat ? "radio-button-checked" : "radio-button-unchecked"}
                                      size={20}
                                      color={item.category === subcat ? "#2196F3" : "#ccc"}
                                    />
                                    <Text style={[
                                      styles.categoryDropdownText,
                                      (item.category === subcat) && styles.categoryDropdownTextSelected
                                    ]}>
                                      {getSubcategoryName(subcat)}
                                    </Text>
                                  </TouchableOpacity>
                                ))
                              ) : (
                                <View style={styles.emptySubcategoryMessage}>
                                  <MaterialIcons name="info-outline" size={20} color="#999" />
                                  <Text style={styles.emptySubcategoryText}>
                                    子カテゴリがありません。下のボタンから追加できます。
                                  </Text>
                                </View>
                              )
                            ) : (
                              // 親カテゴリが選択されていない場合：全カテゴリ（親＋子）を表示
                              getAllCategories().map((cat, cIndex) => {
                                const isSub = isSubcategory(cat);
                                const displayName = isSub ? getSubcategoryName(cat) : cat;
                                return (
                                  <TouchableOpacity
                                    key={cIndex}
                                    style={[
                                      styles.categoryDropdownItem,
                                      !isSub && styles.categoryDropdownItemParent,
                                      (item.category === cat) && styles.categoryDropdownItemSelected
                                    ]}
                                    onPress={() => updateItemCategory(index, cat)}>
                                    <MaterialIcons
                                      name={item.category === cat ? "radio-button-checked" : "radio-button-unchecked"}
                                      size={20}
                                      color={item.category === cat ? "#2196F3" : "#ccc"}
                                    />
                                    <Text style={[
                                      styles.categoryDropdownText,
                                      !isSub && styles.categoryDropdownTextParent,
                                      (item.category === cat) && styles.categoryDropdownTextSelected
                                    ]}>
                                      {displayName}
                                    </Text>
                                  </TouchableOpacity>
                                );
                              })
                            )}

                            {/* 子カテゴリ追加UI */}
                            {!isAddingSubcategory ? (
                              <TouchableOpacity
                                style={styles.addSubcategoryTrigger}
                                onPress={() => setIsAddingSubcategory(true)}>
                                <MaterialIcons name="add-circle-outline" size={20} color="#4CAF50" />
                                <Text style={styles.addSubcategoryTriggerText}>
                                  新しい子カテゴリを追加
                                </Text>
                              </TouchableOpacity>
                            ) : (
                              <View style={styles.addSubcategoryForm}>
                                <TextInput
                                  style={styles.addSubcategoryInput}
                                  placeholder="子カテゴリ名を入力"
                                  placeholderTextColor="#999"
                                  value={newSubcategoryInput}
                                  onChangeText={setNewSubcategoryInput}
                                  autoFocus
                                />
                                <View style={styles.addSubcategoryButtons}>
                                  <TouchableOpacity
                                    style={styles.addSubcategoryButtonConfirm}
                                    onPress={handleAddSubcategory}>
                                    <MaterialIcons name="check" size={20} color="#fff" />
                                  </TouchableOpacity>
                                  <TouchableOpacity
                                    style={styles.addSubcategoryButtonCancel}
                                    onPress={() => {
                                      setIsAddingSubcategory(false);
                                      setNewSubcategoryInput('');
                                    }}>
                                    <MaterialIcons name="close" size={20} color="#666" />
                                  </TouchableOpacity>
                                </View>
                              </View>
                            )}
                          </ScrollView>
                        </View>
                      )}
                    </View>
                  );
                })}

                {/* 商品追加ボタン */}
                <TouchableOpacity
                  style={styles.addItemButton}
                  onPress={addNewItem}>
                  <MaterialIcons name="add-circle-outline" size={24} color="#4CAF50" />
                  <Text style={styles.addItemButtonText}>商品を追加</Text>
                </TouchableOpacity>
              </View>
            )}

            {(!editedItems || editedItems.length === 0) && (
              <View style={styles.emptyBox}>
                <MaterialIcons name="receipt" size={48} color="#ccc" />
                <Text style={styles.emptyText}>
                  商品明細が認識されませんでした
                </Text>
                <TouchableOpacity
                  style={styles.addItemButtonEmpty}
                  onPress={addNewItem}>
                  <MaterialIcons name="add-circle-outline" size={24} color="#4CAF50" />
                  <Text style={styles.addItemButtonText}>商品を追加</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>

          {/* ボタン */}
          <View style={styles.buttonSection}>
            <TouchableOpacity
              style={[styles.button, styles.useButton]}
              onPress={handleUseEdited}>
              <MaterialIcons name="check" size={20} color="#fff" />
              <Text style={styles.buttonText}>
                この内容で使う
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={onClose}>
              <MaterialIcons name="close" size={20} color="#666" />
              <Text style={styles.cancelButtonText}>キャンセル</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  resultSection: {
    marginBottom: 15,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e3f2fd',
    padding: 12,
    borderRadius: 8,
    marginBottom: 15,
  },
  infoText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: '#1976d2',
  },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 15,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    marginBottom: 8,
  },
  editRow: {
    marginBottom: 12,
  },
  resultLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
    marginBottom: 6,
  },
  suggestionsContainer: {
    marginTop: 10,
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  suggestionsTitle: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
    marginBottom: 8,
  },
  suggestionsList: {
    gap: 6,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    backgroundColor: '#fff',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  suggestionText: {
    fontSize: 14,
    color: '#333',
    marginLeft: 8,
    flex: 1,
  },
  editInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    color: '#333',
    backgroundColor: '#fff',
  },
  amountInput: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  resultValue: {
    fontSize: 15,
    color: '#333',
    fontWeight: 'bold',
  },
  amountText: {
    fontSize: 18,
    color: '#2196F3',
  },
  itemsSection: {
    marginTop: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    paddingHorizontal: 5,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  editableItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  itemHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    marginBottom: 8,
  },
  itemHeaderNumber: {
    width: 24,
    fontSize: 12,
    fontWeight: 'bold',
    color: '#666',
    textAlign: 'center',
  },
  itemHeaderName: {
    flex: 1,
    fontSize: 12,
    fontWeight: 'bold',
    color: '#666',
    marginLeft: 8,
  },
  itemHeaderCategory: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#666',
    marginLeft: 8,
    width: 80,
  },
  itemHeaderAmount: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#666',
    marginLeft: 8,
    width: 80,
  },
  itemHeaderAction: {
    width: 36,
  },
  receiptCategorySection: {
    backgroundColor: '#f0f8ff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#b3d9ff',
  },
  receiptCategoryLabel: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#1976d2',
    marginBottom: 10,
  },
  categoryHintText: {
    fontSize: 11,
    color: '#666',
    marginTop: 8,
    fontStyle: 'italic',
  },
  categoryChipsScrollView: {
    maxHeight: 100,
  },
  categoryChipsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingRight: 10,
  },
  categoryChip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
  },
  categoryChipSelected: {
    backgroundColor: '#2196F3',
    borderColor: '#2196F3',
  },
  categoryChipText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  categoryChipTextSelected: {
    color: '#fff',
    fontWeight: 'bold',
  },
  parentCategoryChip: {
    borderWidth: 2,
  },
  emptySubcategoryMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#f8f9fa',
  },
  emptySubcategoryText: {
    fontSize: 13,
    color: '#999',
    marginLeft: 8,
    flex: 1,
  },
  categorySelectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    padding: 8,
    backgroundColor: '#fff',
    marginBottom: 6,
  },
  categorySelectButtonDisabled: {
    backgroundColor: '#f5f5f5',
    borderColor: '#e0e0e0',
  },
  categorySelectText: {
    flex: 1,
    fontSize: 13,
    color: '#333',
    marginLeft: 6,
  },
  categorySelectTextDisabled: {
    color: '#ccc',
  },
  categoryDropdownContainer: {
    backgroundColor: '#fff',
    marginLeft: 30,
    marginRight: 10,
    marginBottom: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    overflow: 'hidden',
  },
  categoryPickerTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#fff',
    backgroundColor: '#2196F3',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  categoryDropdownList: {
    maxHeight: 200,
  },
  categoryDropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  categoryDropdownItemParent: {
    backgroundColor: '#f5f5f5',
    borderBottomWidth: 2,
    borderBottomColor: '#2196F3',
  },
  categoryDropdownItemSelected: {
    backgroundColor: '#e3f2fd',
  },
  categoryDropdownText: {
    fontSize: 15,
    color: '#333',
    marginLeft: 10,
    flex: 1,
  },
  categoryDropdownTextParent: {
    fontWeight: 'bold',
    color: '#1976d2',
  },
  categoryDropdownTextSelected: {
    color: '#2196F3',
    fontWeight: '600',
  },
  addSubcategoryTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    backgroundColor: '#f8f9fa',
    borderTopWidth: 2,
    borderTopColor: '#e0e0e0',
  },
  addSubcategoryTriggerText: {
    fontSize: 14,
    color: '#4CAF50',
    marginLeft: 8,
    fontWeight: '600',
  },
  addSubcategoryForm: {
    padding: 12,
    backgroundColor: '#f0f8ff',
    borderTopWidth: 2,
    borderTopColor: '#2196F3',
  },
  addSubcategoryInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    padding: 10,
    fontSize: 14,
    backgroundColor: '#fff',
    marginBottom: 8,
  },
  addSubcategoryButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  addSubcategoryButtonConfirm: {
    flex: 1,
    backgroundColor: '#4CAF50',
    borderRadius: 6,
    padding: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addSubcategoryButtonCancel: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    borderRadius: 6,
    padding: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemEditSection: {
    flex: 1,
    marginHorizontal: 8,
  },
  itemNameInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    padding: 8,
    fontSize: 14,
    color: '#333',
    backgroundColor: '#fafafa',
    marginBottom: 6,
  },
  itemAmountRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  yenSymbol: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#666',
    marginRight: 4,
  },
  itemAmountInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    padding: 8,
    fontSize: 14,
    color: '#333',
    backgroundColor: '#fafafa',
    fontWeight: 'bold',
  },
  deleteItemButton: {
    padding: 8,
  },
  itemNumber: {
    width: 24,
    fontSize: 13,
    fontWeight: 'bold',
    color: '#999',
    textAlign: 'center',
  },
  itemName: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    marginHorizontal: 10,
  },
  itemAmount: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#333',
    minWidth: 80,
    textAlign: 'right',
  },
  negativeAmount: {
    color: '#f44336',
  },
  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    marginTop: 10,
    fontSize: 14,
    color: '#999',
    marginBottom: 20,
  },
  addItemButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    marginTop: 10,
    backgroundColor: '#f0f8f0',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#4CAF50',
    borderStyle: 'dashed',
  },
  addItemButtonEmpty: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    backgroundColor: '#f0f8f0',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  addItemButtonText: {
    fontSize: 15,
    color: '#4CAF50',
    fontWeight: '600',
    marginLeft: 8,
  },
  buttonSection: {
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
  },
  editButton: {
    backgroundColor: '#FF9800',
  },
  useButton: {
    backgroundColor: '#4CAF50',
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});
