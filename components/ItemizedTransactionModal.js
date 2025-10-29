import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

export default function ItemizedTransactionModal({
  visible,
  onClose,
  onConfirm,
  initialItems = [],
}) {
  const [items, setItems] = useState([]);
  const [itemName, setItemName] = useState('');
  const [itemAmount, setItemAmount] = useState('');

  useEffect(() => {
    if (visible) {
      console.log('=== ItemizedTransactionModal opened ===');
      console.log('initialItems:', initialItems);
      // initialItemsが空でない場合は、それをコピーして使用
      if (initialItems && initialItems.length > 0) {
        // 深いコピーを作成してIDを確実に維持
        const copiedItems = initialItems.map(item => ({...item}));
        console.log('Setting items:', copiedItems);
        setItems(copiedItems);
      } else {
        console.log('No initial items, setting empty array');
        setItems([]);
      }
      setItemName('');
      setItemAmount('');
    }
  }, [visible]);

  const addItem = () => {
    if (!itemName.trim() || !itemAmount) {
      Alert.alert('エラー', '商品名と金額を入力してください');
      return;
    }

    const amount = parseFloat(itemAmount);
    if (isNaN(amount) || amount === 0) {
      Alert.alert('エラー', '有効な金額を入力してください');
      return;
    }

    const newItem = {
      id: Date.now().toString(),
      name: itemName.trim(),
      amount: amount,
    };

    setItems([...items, newItem]);
    setItemName('');
    setItemAmount('');
  };

  const removeItem = (id) => {
    setItems(items.filter(item => item.id !== id));
  };

  const updateItemName = (id, newName) => {
    setItems(items.map(item =>
      item.id === id ? { ...item, name: newName } : item
    ));
  };

  const updateItemAmount = (id, newAmount) => {
    const amount = parseFloat(newAmount) || 0;
    setItems(items.map(item =>
      item.id === id ? { ...item, amount: amount } : item
    ));
  };

  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + item.amount, 0);
  };

  const handleConfirm = () => {
    if (items.length === 0) {
      Alert.alert('エラー', '少なくとも1つの商品を追加してください');
      return;
    }
    onConfirm(items, calculateTotal());
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>商品明細を編集</Text>
            <TouchableOpacity onPress={onClose}>
              <MaterialIcons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <View style={styles.infoBox}>
            <MaterialIcons name="info-outline" size={20} color="#2196F3" />
            <Text style={styles.infoText}>
              各商品の名前と金額を編集できます
            </Text>
          </View>

          <View style={styles.inputContainer}>
            <TextInput
              style={[styles.input, styles.nameInput]}
              placeholder="商品名"
              value={itemName}
              onChangeText={setItemName}
            />
            <TextInput
              style={[styles.input, styles.amountInput]}
              placeholder="金額"
              keyboardType="numbers-and-punctuation"
              value={itemAmount}
              onChangeText={setItemAmount}
            />
            <TouchableOpacity style={styles.addButton} onPress={addItem}>
              <MaterialIcons name="add" size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.itemsSection}>
            <Text style={styles.sectionTitle}>商品一覧 ({items.length}点)</Text>
            {items.length === 0 ? (
              <Text style={styles.emptyText}>商品が追加されていません</Text>
            ) : (
              <View>
                {items.map((item, index) => (
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
                      keyboardType="numbers-and-punctuation"
                      placeholder="金額"
                    />
                    <TouchableOpacity
                      style={styles.deleteItemButton}
                      onPress={() => removeItem(item.id)}>
                      <MaterialIcons name="delete" size={20} color="#f44336" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </ScrollView>

          <View style={styles.totalSection}>
            <Text style={styles.totalLabel}>合計金額</Text>
            <Text style={styles.totalAmount}>
              ¥{calculateTotal().toLocaleString()}
            </Text>
          </View>

          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={[styles.modalButton, styles.cancelButton]}
              onPress={onClose}>
              <Text style={styles.cancelButtonText}>キャンセル</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, styles.confirmButton]}
              onPress={handleConfirm}>
              <Text style={styles.confirmButtonText}>確定</Text>
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
    marginBottom: 15,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
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
  inputContainer: {
    flexDirection: 'row',
    marginBottom: 15,
    gap: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  nameInput: {
    flex: 2,
  },
  amountInput: {
    flex: 1,
  },
  addButton: {
    backgroundColor: '#2196F3',
    borderRadius: 8,
    width: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemsSection: {
    flex: 1,
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    fontSize: 14,
    paddingVertical: 20,
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
  totalSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 15,
    backgroundColor: '#e3f2fd',
    borderRadius: 8,
    marginBottom: 15,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1976d2',
  },
  totalAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1976d2',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
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
  confirmButton: {
    backgroundColor: '#2196F3',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: 'bold',
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
