import React, { useState, useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { isSubcategory, getSubcategoryName, getParentCategory, CATEGORY_SEPARATOR } from '../constants/categories';

export default function CategoryPicker({
  selectedCategory,
  onSelectCategory,
  categories,
  onAddCategory,
  type,
}) {
  const [showPicker, setShowPicker] = useState(false);
  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false);
  const [newCategoryInput, setNewCategoryInput] = useState('');
  const [expandedParents, setExpandedParents] = useState({}); // {parentName: true/false}

  // 親カテゴリのみを取得（useMemoで最適化）
  const parentCategories = useMemo(() => {
    return categories.filter(cat => !isSubcategory(cat));
  }, [categories]);

  // 親カテゴリごとの子カテゴリマップを事前計算（useMemoで最適化）
  const subcategoryMap = useMemo(() => {
    const map = {};
    parentCategories.forEach(parentCat => {
      map[parentCat] = categories.filter(cat => {
        const parent = getParentCategory(cat);
        return parent === parentCat;
      });
    });
    return map;
  }, [categories, parentCategories]);

  // 特定の親カテゴリの子カテゴリを取得
  const getSubcategoriesFor = (parentCategory) => {
    return subcategoryMap[parentCategory] || [];
  };

  // 親カテゴリの展開/折りたたみ
  const toggleParent = (parentName) => {
    setExpandedParents(prev => ({
      ...prev,
      [parentName]: !prev[parentName]
    }));
  };

  const handleAddCategory = () => {
    if (!newCategoryInput.trim()) {
      Alert.alert('エラー', 'カテゴリ名を入力してください');
      return;
    }

    if (categories.includes(newCategoryInput.trim())) {
      Alert.alert('エラー', 'このカテゴリは既に存在します');
      return;
    }

    onAddCategory(newCategoryInput.trim());
    setNewCategoryInput('');
    setShowNewCategoryInput(false);
    setShowPicker(false);
  };

  return (
    <View>
      <TouchableOpacity
        style={styles.categoryPickerButton}
        onPress={() => setShowPicker(!showPicker)}>
        <MaterialIcons name="category" size={20} color="#2196F3" />
        <Text style={[styles.categoryPickerText, !selectedCategory && styles.placeholderText]}>
          {selectedCategory || 'カテゴリを選択'}
        </Text>
        <MaterialIcons
          name={showPicker ? "keyboard-arrow-up" : "keyboard-arrow-down"}
          size={20}
          color="#666"
          style={{marginLeft: 'auto'}}
        />
      </TouchableOpacity>

      {showPicker && (
        <View style={styles.categoryList}>
          <ScrollView style={styles.categoryScroll} nestedScrollEnabled={true}>
            {parentCategories.map((parentCat, pIndex) => {
              const subcategories = getSubcategoriesFor(parentCat);
              const hasSubcategories = subcategories.length > 0;
              const isExpanded = expandedParents[parentCat];
              const isSelected = selectedCategory === parentCat;

              return (
                <View key={pIndex}>
                  {/* 親カテゴリ */}
                  <View style={styles.parentCategoryRow}>
                    <TouchableOpacity
                      style={[
                        styles.categoryItem,
                        styles.parentCategoryItem,
                        isSelected && styles.selectedCategoryItem
                      ]}
                      onPress={() => {
                        onSelectCategory(parentCat);
                        setShowPicker(false);
                      }}>
                      <MaterialIcons
                        name="folder"
                        size={20}
                        color={isSelected ? "#2196F3" : "#666"}
                        style={styles.parentIcon}
                      />
                      <Text style={[
                        styles.categoryItemText,
                        styles.parentCategoryText,
                        isSelected && styles.selectedCategoryText
                      ]}>
                        {parentCat}
                      </Text>
                    </TouchableOpacity>

                    {/* 子カテゴリがある場合は展開ボタン */}
                    {hasSubcategories && (
                      <TouchableOpacity
                        style={styles.expandButton}
                        onPress={() => toggleParent(parentCat)}>
                        <MaterialIcons
                          name={isExpanded ? "arrow-drop-up" : "arrow-drop-down"}
                          size={28}
                          color="#2196F3"
                        />
                        <Text style={styles.expandButtonText}>
                          {isExpanded ? '閉じる' : `${subcategoryMap[parentCat]?.length || 0}件`}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* 子カテゴリ（展開時のみ表示） */}
                  {isExpanded && hasSubcategories && (
                    <View style={styles.subcategoriesContainer}>
                      {subcategories.map((subcat, sIndex) => {
                        const isSubSelected = selectedCategory === subcat;
                        return (
                          <TouchableOpacity
                            key={sIndex}
                            style={[
                              styles.categoryItem,
                              styles.subcategoryItem,
                              isSubSelected && styles.selectedCategoryItem
                            ]}
                            onPress={() => {
                              onSelectCategory(subcat);
                              setShowPicker(false);
                            }}>
                            <MaterialIcons
                              name="subdirectory-arrow-right"
                              size={16}
                              color={isSubSelected ? "#2196F3" : "#999"}
                              style={styles.subcategoryIcon}
                            />
                            <Text style={[
                              styles.categoryItemText,
                              styles.subcategoryText,
                              isSubSelected && styles.selectedCategoryText
                            ]}>
                              {getSubcategoryName(subcat)}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}
                </View>
              );
            })}
            <TouchableOpacity
              style={styles.addCategoryButton}
              onPress={() => setShowNewCategoryInput(true)}>
              <MaterialIcons name="add" size={20} color="#2196F3" />
              <Text style={styles.addCategoryButtonText}>新しいカテゴリを追加</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      )}

      {showNewCategoryInput && (
        <View style={styles.newCategoryContainer}>
          <TextInput
            style={styles.input}
            placeholder="新しいカテゴリ名"
            value={newCategoryInput}
            onChangeText={setNewCategoryInput}
            autoFocus
          />
          <View style={styles.newCategoryButtons}>
            <TouchableOpacity
              style={[styles.newCategoryButton, styles.cancelButton]}
              onPress={() => {
                setShowNewCategoryInput(false);
                setNewCategoryInput('');
              }}>
              <Text style={styles.cancelButtonText}>キャンセル</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.newCategoryButton, styles.saveButton]}
              onPress={handleAddCategory}>
              <Text style={styles.saveButtonText}>追加</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  categoryPickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    backgroundColor: '#fff',
  },
  categoryPickerText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 10,
    flex: 1,
  },
  placeholderText: {
    color: '#999',
  },
  categoryList: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginBottom: 10,
    maxHeight: 300,
    backgroundColor: '#fff',
  },
  categoryScroll: {
    maxHeight: 300,
  },
  parentCategoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  parentCategoryItem: {
    backgroundColor: '#fff',
  },
  selectedCategoryItem: {
    backgroundColor: '#e3f2fd',
  },
  parentIcon: {
    marginRight: 8,
  },
  expandButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: '#f0f8ff',
    minWidth: 80,
    justifyContent: 'center',
  },
  expandButtonText: {
    fontSize: 12,
    color: '#2196F3',
    fontWeight: '600',
    marginLeft: 2,
  },
  subcategoriesContainer: {
    backgroundColor: '#f8f9fa',
  },
  subcategoryItem: {
    paddingLeft: 40,
    backgroundColor: '#f8f9fa',
  },
  subcategoryIcon: {
    marginRight: 4,
  },
  categoryItemText: {
    fontSize: 16,
    color: '#333',
  },
  parentCategoryText: {
    fontWeight: '600',
  },
  subcategoryText: {
    fontSize: 15,
    color: '#666',
  },
  selectedCategoryText: {
    color: '#2196F3',
    fontWeight: 'bold',
  },
  addCategoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    backgroundColor: '#f8f8f8',
  },
  addCategoryButtonText: {
    fontSize: 16,
    color: '#2196F3',
    marginLeft: 8,
    fontWeight: 'bold',
  },
  newCategoryContainer: {
    marginBottom: 10,
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
  newCategoryButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  newCategoryButton: {
    flex: 1,
    padding: 12,
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
});
