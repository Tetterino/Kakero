import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import CategoryPicker from './CategoryPicker';

export default function CategoryMigrationModal({
  visible,
  categoryToDelete,
  affectedCount,
  availableCategories,
  onMigrate,
  onDeleteWithoutMigration,
  onCancel,
  onAddCategory,
}) {
  const [selectedMigrationCategory, setSelectedMigrationCategory] = useState('');

  const handleMigrate = () => {
    if (selectedMigrationCategory) {
      onMigrate(selectedMigrationCategory);
      setSelectedMigrationCategory('');
    }
  };

  const handleDeleteWithoutMigration = () => {
    onDeleteWithoutMigration();
    setSelectedMigrationCategory('');
  };

  const handleCancel = () => {
    setSelectedMigrationCategory('');
    onCancel();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleCancel}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <MaterialIcons name="warning" size={32} color="#ff9800" />
            <Text style={styles.modalTitle}>カテゴリの削除</Text>
          </View>

          <View style={styles.warningBox}>
            <Text style={styles.warningText}>
              「{categoryToDelete}」は {affectedCount} 件の取引で使用されています。
            </Text>
          </View>

          <Text style={styles.sectionTitle}>削除方法を選択してください：</Text>

          {/* オプション1: 移行 */}
          <View style={styles.optionSection}>
            <View style={styles.optionHeader}>
              <MaterialIcons name="swap-horiz" size={24} color="#2196F3" />
              <Text style={styles.optionTitle}>別のカテゴリに移行</Text>
            </View>
            <Text style={styles.optionDescription}>
              既存の取引を別のカテゴリに移行します
            </Text>

            <CategoryPicker
              selectedCategory={selectedMigrationCategory}
              onSelectCategory={setSelectedMigrationCategory}
              categories={availableCategories}
              onAddCategory={onAddCategory}
            />

            <TouchableOpacity
              style={[
                styles.button,
                styles.migrateButton,
                !selectedMigrationCategory && styles.buttonDisabled,
              ]}
              onPress={handleMigrate}
              disabled={!selectedMigrationCategory}>
              <Text style={styles.buttonText}>
                {selectedMigrationCategory
                  ? `「${selectedMigrationCategory}」に移行して削除`
                  : '移行先を選択してください'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* オプション2: 移行せず削除 */}
          <View style={styles.optionSection}>
            <View style={styles.optionHeader}>
              <MaterialIcons name="delete-forever" size={24} color="#f44336" />
              <Text style={styles.optionTitle}>移行せず削除</Text>
            </View>
            <Text style={styles.optionDescription}>
              既存の取引は「未分類」として表示されます
            </Text>

            <TouchableOpacity
              style={[styles.button, styles.deleteButton]}
              onPress={handleDeleteWithoutMigration}>
              <Text style={styles.buttonText}>移行せず削除</Text>
            </TouchableOpacity>
          </View>

          {/* キャンセル */}
          <TouchableOpacity
            style={[styles.button, styles.cancelButton]}
            onPress={handleCancel}>
            <Text style={styles.cancelButtonText}>キャンセル</Text>
          </TouchableOpacity>
        </View>
      </View>
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
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 10,
  },
  warningBox: {
    backgroundColor: '#fff3e0',
    padding: 15,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#ff9800',
    marginBottom: 20,
  },
  warningText: {
    fontSize: 16,
    color: '#e65100',
    fontWeight: 'bold',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  optionSection: {
    backgroundColor: '#f9f9f9',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
  },
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 10,
  },
  optionDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
  },
  button: {
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  migrateButton: {
    backgroundColor: '#2196F3',
  },
  deleteButton: {
    backgroundColor: '#f44336',
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
