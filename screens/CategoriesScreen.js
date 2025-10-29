import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import {
  DEFAULT_EXPENSE_CATEGORIES,
  DEFAULT_INCOME_CATEGORIES,
  UNCATEGORIZED,
  CATEGORY_SEPARATOR,
  flattenCategories,
  isSubcategory,
  getSubcategoryName,
  getParentCategory
} from '../constants/categories';
import {
  loadCustomCategories,
  saveCustomCategories,
  loadDeletedCategories,
  saveDeletedCategories,
  loadTransactions,
  saveTransactions,
} from '../utils/storage';
import CategoryMigrationModal from '../components/CategoryMigrationModal';
import { useTheme } from '../contexts/ThemeContext';

export default function CategoriesScreen() {
  const { colors } = useTheme();
  const [selectedTab, setSelectedTab] = useState('expense'); // 'expense' or 'income'
  const [customExpenseCategories, setCustomExpenseCategories] = useState([]);
  const [customIncomeCategories, setCustomIncomeCategories] = useState([]);
  const [deletedExpenseCategories, setDeletedExpenseCategories] = useState([]);
  const [deletedIncomeCategories, setDeletedIncomeCategories] = useState([]);
  const [newCategoryInput, setNewCategoryInput] = useState('');
  const [transactions, setTransactions] = useState([]);
  const [showMigrationModal, setShowMigrationModal] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState(null);
  const [isDefaultCategory, setIsDefaultCategory] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState({}); // {categoryName: true/false}
  const [addingSubcategoryFor, setAddingSubcategoryFor] = useState(null); // 親カテゴリ名
  const [subcategoryInput, setSubcategoryInput] = useState('');

  // カテゴリと取引を読み込む
  useEffect(() => {
    const loadData = async () => {
      const { expense, income } = await loadCustomCategories();
      setCustomExpenseCategories(expense);
      setCustomIncomeCategories(income);

      const deleted = await loadDeletedCategories();
      setDeletedExpenseCategories(deleted.expense);
      setDeletedIncomeCategories(deleted.income);

      const loadedTransactions = await loadTransactions();
      setTransactions(loadedTransactions);
    };

    loadData();
  }, []);

  // 現在のタブに応じたカテゴリリストを取得（削除されたものを除外）
  const getCurrentCategories = () => {
    if (selectedTab === 'expense') {
      const flatDefaults = flattenCategories(DEFAULT_EXPENSE_CATEGORIES);
      return {
        default: flatDefaults.filter(
          cat => !deletedExpenseCategories.includes(cat)
        ),
        custom: customExpenseCategories,
      };
    } else {
      const flatDefaults = flattenCategories(DEFAULT_INCOME_CATEGORIES);
      return {
        default: flatDefaults.filter(
          cat => !deletedIncomeCategories.includes(cat)
        ),
        custom: customIncomeCategories,
      };
    }
  };

  // 親カテゴリを追加（トップレベルのみ）
  const addCategory = () => {
    if (!newCategoryInput.trim()) {
      Alert.alert('エラー', 'カテゴリ名を入力してください');
      return;
    }

    const { default: defaultCategories, custom: customCategories } = getCurrentCategories();
    const allCategories = [...defaultCategories, ...customCategories];

    if (allCategories.includes(newCategoryInput.trim())) {
      Alert.alert('エラー', 'このカテゴリは既に存在します');
      return;
    }

    if (selectedTab === 'expense') {
      const newCategories = [...customExpenseCategories, newCategoryInput.trim()];
      setCustomExpenseCategories(newCategories);
      saveCustomCategories(newCategories, customIncomeCategories);
    } else {
      const newCategories = [...customIncomeCategories, newCategoryInput.trim()];
      setCustomIncomeCategories(newCategories);
      saveCustomCategories(customExpenseCategories, newCategories);
    }

    setNewCategoryInput('');
    Alert.alert('成功', 'カテゴリを追加しました');
  };

  // 子カテゴリを追加
  const addSubcategory = (parentCategory) => {
    if (!subcategoryInput.trim()) {
      Alert.alert('エラー', '子カテゴリ名を入力してください');
      return;
    }

    const categoryName = `${parentCategory}${CATEGORY_SEPARATOR}${subcategoryInput.trim()}`;
    const { default: defaultCategories, custom: customCategories } = getCurrentCategories();
    const allCategories = [...defaultCategories, ...customCategories];

    if (allCategories.includes(categoryName)) {
      Alert.alert('エラー', 'この子カテゴリは既に存在します');
      return;
    }

    if (selectedTab === 'expense') {
      const newCategories = [...customExpenseCategories, categoryName];
      setCustomExpenseCategories(newCategories);
      saveCustomCategories(newCategories, customIncomeCategories);
    } else {
      const newCategories = [...customIncomeCategories, categoryName];
      setCustomIncomeCategories(newCategories);
      saveCustomCategories(customExpenseCategories, newCategories);
    }

    setSubcategoryInput('');
    setAddingSubcategoryFor(null);
    Alert.alert('成功', '子カテゴリを追加しました');
  };

  // 親カテゴリのリストを取得（子カテゴリを除外）
  const getParentCategories = () => {
    const { default: defaultCategories, custom: customCategories } = getCurrentCategories();
    const allCategories = [...defaultCategories, ...customCategories];
    return allCategories.filter(cat => !isSubcategory(cat));
  };

  // 特定の親カテゴリの子カテゴリを取得
  const getSubcategoriesForParent = (parentCategory) => {
    const { default: defaultCategories, custom: customCategories } = getCurrentCategories();
    const allCategories = [...defaultCategories, ...customCategories];
    return allCategories.filter(cat => {
      const parent = getParentCategory(cat);
      return parent === parentCategory;
    });
  };

  // カテゴリの展開/折りたたみをトグル
  const toggleCategory = (categoryName) => {
    setExpandedCategories(prev => ({
      ...prev,
      [categoryName]: !prev[categoryName]
    }));
  };

  // カテゴリを削除（デフォルト・カスタム両方対応）
  const deleteCategory = (categoryName, isDefault) => {
    // このカテゴリを使用している取引の数をカウント
    const affectedTransactions = transactions.filter(
      t => t.category === categoryName
    );
    const affectedCount = affectedTransactions.length;

    if (affectedCount > 0) {
      // 使用中の場合は移行モーダルを表示
      setCategoryToDelete(categoryName);
      setIsDefaultCategory(isDefault);
      setShowMigrationModal(true);
    } else {
      // 使用していない場合は直接削除
      Alert.alert(
        '確認',
        `「${categoryName}」を削除しますか？`,
        [
          { text: 'キャンセル', style: 'cancel' },
          {
            text: '削除',
            style: 'destructive',
            onPress: () => performCategoryDeletion(categoryName, isDefault),
          },
        ]
      );
    }
  };

  // カテゴリ削除を実行
  const performCategoryDeletion = (categoryName, isDefault) => {
    if (isDefault) {
      // デフォルトカテゴリの場合は削除リストに追加
      if (selectedTab === 'expense') {
        const newDeleted = [...deletedExpenseCategories, categoryName];
        setDeletedExpenseCategories(newDeleted);
        saveDeletedCategories(newDeleted, deletedIncomeCategories);
      } else {
        const newDeleted = [...deletedIncomeCategories, categoryName];
        setDeletedIncomeCategories(newDeleted);
        saveDeletedCategories(deletedExpenseCategories, newDeleted);
      }
    } else {
      // カスタムカテゴリの場合は配列から削除
      if (selectedTab === 'expense') {
        const newCategories = customExpenseCategories.filter(c => c !== categoryName);
        setCustomExpenseCategories(newCategories);
        saveCustomCategories(newCategories, customIncomeCategories);
      } else {
        const newCategories = customIncomeCategories.filter(c => c !== categoryName);
        setCustomIncomeCategories(newCategories);
        saveCustomCategories(customExpenseCategories, newCategories);
      }
    }
  };

  // 取引を別のカテゴリに移行してから削除
  const handleMigrate = (targetCategory) => {
    const updatedTransactions = transactions.map(t =>
      t.category === categoryToDelete
        ? { ...t, category: targetCategory }
        : t
    );

    setTransactions(updatedTransactions);
    saveTransactions(updatedTransactions);
    performCategoryDeletion(categoryToDelete, isDefaultCategory);
    setShowMigrationModal(false);
    Alert.alert('成功', `${categoryToDelete}から${targetCategory}に移行しました`);
  };

  // 移行せずに削除（UNCATEGORIZEDに変更）
  const handleDeleteWithoutMigration = () => {
    const updatedTransactions = transactions.map(t =>
      t.category === categoryToDelete
        ? { ...t, category: UNCATEGORIZED }
        : t
    );

    setTransactions(updatedTransactions);
    saveTransactions(updatedTransactions);
    performCategoryDeletion(categoryToDelete, isDefaultCategory);
    setShowMigrationModal(false);
    Alert.alert('完了', 'カテゴリを削除しました');
  };

  // 移行モーダルのキャンセル
  const handleMigrationCancel = () => {
    setShowMigrationModal(false);
    setCategoryToDelete(null);
    setIsDefaultCategory(false);
  };

  // 移行モーダル内でカテゴリを追加
  const handleAddCategoryInModal = (newCategory) => {
    if (selectedTab === 'expense') {
      const newCategories = [...customExpenseCategories, newCategory];
      setCustomExpenseCategories(newCategories);
      saveCustomCategories(newCategories, customIncomeCategories);
    } else {
      const newCategories = [...customIncomeCategories, newCategory];
      setCustomIncomeCategories(newCategories);
      saveCustomCategories(customExpenseCategories, newCategories);
    }
  };

  // 移行先として利用可能なカテゴリ（削除対象を除く）
  const getAvailableCategoriesForMigration = () => {
    const { default: defaultCats, custom: customCats } = getCurrentCategories();
    return [...defaultCats, ...customCats].filter(cat => cat !== categoryToDelete);
  };

  // 削除対象カテゴリを使用している取引の数
  const getAffectedCount = () => {
    if (!categoryToDelete) return 0;
    return transactions.filter(t => t.category === categoryToDelete).length;
  };

  const { default: defaultCategories, custom: customCategories } = getCurrentCategories();

  const styles = createStyles(colors);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Text style={styles.title}>カテゴリ管理</Text>
      </View>

      {/* タブ切り替え */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[
            styles.tab,
            selectedTab === 'expense' && styles.tabActive,
          ]}
          onPress={() => setSelectedTab('expense')}>
          <Text
            style={[
              styles.tabText,
              selectedTab === 'expense' && styles.tabTextActive,
            ]}>
            支出
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tab,
            selectedTab === 'income' && styles.tabActive,
          ]}
          onPress={() => setSelectedTab('income')}>
          <Text
            style={[
              styles.tabText,
              selectedTab === 'income' && styles.tabTextActive,
            ]}>
            収入
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView}>
        {/* 新しい親カテゴリを追加 */}
        <View style={styles.addSection}>
          <Text style={styles.sectionTitle}>新しいカテゴリを追加</Text>
          <View style={styles.addInputContainer}>
            <TextInput
              style={styles.input}
              placeholder="カテゴリ名を入力"
              placeholderTextColor={colors.textTertiary}
              value={newCategoryInput}
              onChangeText={setNewCategoryInput}
            />
            <TouchableOpacity style={styles.addButton} onPress={addCategory}>
              <MaterialIcons name="add" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        {/* デフォルトカテゴリ */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>デフォルトカテゴリ</Text>
          <View style={styles.categoryList}>
            {getParentCategories().filter(cat => defaultCategories.includes(cat)).map((category, index) => {
              const subcategories = getSubcategoriesForParent(category);
              const isExpanded = expandedCategories[category];

              return (
                <View key={index}>
                  {/* 親カテゴリ */}
                  <View style={styles.categoryItem}>
                    <TouchableOpacity
                      style={styles.categoryMainRow}
                      onPress={() => toggleCategory(category)}>
                      <MaterialIcons
                        name={isExpanded ? "expand-more" : "chevron-right"}
                        size={24}
                        color="#666"
                      />
                      <MaterialIcons name="label" size={20} color="#2196F3" style={{marginLeft: 8}} />
                      <Text style={styles.categoryName}>{category}</Text>
                      {subcategories.length > 0 && (
                        <View style={styles.subcategoryCount}>
                          <Text style={styles.subcategoryCountText}>{subcategories.length}</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={() => deleteCategory(category, true)}>
                      <MaterialIcons name="delete" size={20} color="#f44336" />
                    </TouchableOpacity>
                  </View>

                  {/* 展開時に子カテゴリを表示 */}
                  {isExpanded && (
                    <View style={styles.subcategoriesContainer}>
                      {subcategories.map((subcat, subIndex) => (
                        <View key={subIndex} style={styles.subcategoryRow}>
                          <View style={styles.subcategoryInfo}>
                            <MaterialIcons
                              name="subdirectory-arrow-right"
                              size={16}
                              color="#999"
                              style={styles.subcategoryIcon}
                            />
                            <Text style={styles.subcategoryName}>
                              {getSubcategoryName(subcat)}
                            </Text>
                          </View>
                          <TouchableOpacity
                            style={styles.deleteButton}
                            onPress={() => deleteCategory(subcat, true)}>
                            <MaterialIcons name="delete" size={18} color="#f44336" />
                          </TouchableOpacity>
                        </View>
                      ))}

                      {/* 子カテゴリ追加UI */}
                      {addingSubcategoryFor === category ? (
                        <View style={styles.addSubcategoryRow}>
                          <MaterialIcons
                            name="subdirectory-arrow-right"
                            size={16}
                            color="#999"
                            style={styles.subcategoryIcon}
                          />
                          <TextInput
                            style={styles.subcategoryInput}
                            placeholder="子カテゴリ名を入力"
                            placeholderTextColor={colors.textTertiary}
                            value={subcategoryInput}
                            onChangeText={setSubcategoryInput}
                            autoFocus
                          />
                          <TouchableOpacity
                            style={styles.addSubcategoryButton}
                            onPress={() => addSubcategory(category)}>
                            <MaterialIcons name="check" size={20} color="#4CAF50" />
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.cancelSubcategoryButton}
                            onPress={() => {
                              setAddingSubcategoryFor(null);
                              setSubcategoryInput('');
                            }}>
                            <MaterialIcons name="close" size={20} color="#999" />
                          </TouchableOpacity>
                        </View>
                      ) : (
                        <TouchableOpacity
                          style={styles.addSubcategoryTrigger}
                          onPress={() => setAddingSubcategoryFor(category)}>
                          <MaterialIcons name="add" size={18} color={colors.primary} />
                          <Text style={styles.addSubcategoryText}>子カテゴリを追加</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        </View>

        {/* カスタムカテゴリ */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            カスタムカテゴリ ({getParentCategories().filter(cat => customCategories.includes(cat)).length})
          </Text>
          {getParentCategories().filter(cat => customCategories.includes(cat)).length > 0 ? (
            <View style={styles.categoryList}>
              {getParentCategories().filter(cat => customCategories.includes(cat)).map((category, index) => {
                const subcategories = getSubcategoriesForParent(category);
                const isExpanded = expandedCategories[category];

                return (
                  <View key={index}>
                    {/* 親カテゴリ */}
                    <View style={styles.categoryItem}>
                      <TouchableOpacity
                        style={styles.categoryMainRow}
                        onPress={() => toggleCategory(category)}>
                        <MaterialIcons
                          name={isExpanded ? "expand-more" : "chevron-right"}
                          size={24}
                          color="#666"
                        />
                        <MaterialIcons name="label" size={20} color="#4CAF50" style={{marginLeft: 8}} />
                        <Text style={styles.categoryName}>{category}</Text>
                        {subcategories.length > 0 && (
                          <View style={styles.subcategoryCount}>
                            <Text style={styles.subcategoryCountText}>{subcategories.length}</Text>
                          </View>
                        )}
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.deleteButton}
                        onPress={() => deleteCategory(category, false)}>
                        <MaterialIcons name="delete" size={20} color="#f44336" />
                      </TouchableOpacity>
                    </View>

                    {/* 展開時に子カテゴリを表示 */}
                    {isExpanded && (
                      <View style={styles.subcategoriesContainer}>
                        {subcategories.map((subcat, subIndex) => (
                          <View key={subIndex} style={styles.subcategoryRow}>
                            <View style={styles.subcategoryInfo}>
                              <MaterialIcons
                                name="subdirectory-arrow-right"
                                size={16}
                                color="#999"
                                style={styles.subcategoryIcon}
                              />
                              <Text style={styles.subcategoryName}>
                                {getSubcategoryName(subcat)}
                              </Text>
                            </View>
                            <TouchableOpacity
                              style={styles.deleteButton}
                              onPress={() => deleteCategory(subcat, false)}>
                              <MaterialIcons name="delete" size={18} color="#f44336" />
                            </TouchableOpacity>
                          </View>
                        ))}

                        {/* 子カテゴリ追加UI */}
                        {addingSubcategoryFor === category ? (
                          <View style={styles.addSubcategoryRow}>
                            <MaterialIcons
                              name="subdirectory-arrow-right"
                              size={16}
                              color="#999"
                              style={styles.subcategoryIcon}
                            />
                            <TextInput
                              style={styles.subcategoryInput}
                              placeholder="子カテゴリ名を入力"
                              placeholderTextColor={colors.textTertiary}
                              value={subcategoryInput}
                              onChangeText={setSubcategoryInput}
                              autoFocus
                            />
                            <TouchableOpacity
                              style={styles.addSubcategoryButton}
                              onPress={() => addSubcategory(category)}>
                              <MaterialIcons name="check" size={20} color="#4CAF50" />
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={styles.cancelSubcategoryButton}
                              onPress={() => {
                                setAddingSubcategoryFor(null);
                                setSubcategoryInput('');
                              }}>
                              <MaterialIcons name="close" size={20} color="#999" />
                            </TouchableOpacity>
                          </View>
                        ) : (
                          <TouchableOpacity
                            style={styles.addSubcategoryTrigger}
                            onPress={() => setAddingSubcategoryFor(category)}>
                            <MaterialIcons name="add" size={18} color={colors.primary} />
                            <Text style={styles.addSubcategoryText}>子カテゴリを追加</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <MaterialIcons name="category" size={48} color="#ccc" />
              <Text style={styles.emptyText}>
                カスタムカテゴリがありません
              </Text>
              <Text style={styles.emptySubText}>
                上のフォームから新しいカテゴリを追加できます
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* 移行モーダル */}
      <CategoryMigrationModal
        visible={showMigrationModal}
        categoryToDelete={categoryToDelete}
        affectedCount={getAffectedCount()}
        availableCategories={getAvailableCategoriesForMigration()}
        onMigrate={handleMigrate}
        onDeleteWithoutMigration={handleDeleteWithoutMigration}
        onCancel={handleMigrationCancel}
        onAddCategory={handleAddCategoryInModal}
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
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: colors.surfaceSecondary,
    marginHorizontal: 5,
    borderRadius: 8,
  },
  tabActive: {
    backgroundColor: colors.primary,
  },
  tabText: {
    fontSize: 16,
    color: colors.textSecondary,
    fontWeight: 'bold',
  },
  tabTextActive: {
    color: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  addSection: {
    backgroundColor: colors.surface,
    padding: 20,
    marginTop: 10,
  },
  section: {
    backgroundColor: colors.surface,
    padding: 20,
    marginTop: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 15,
  },
  addInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: colors.surface,
    color: colors.text,
    marginRight: 10,
  },
  addButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryMainRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  subcategoryCount: {
    marginLeft: 8,
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subcategoryCountText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: 'bold',
  },
  subcategoriesContainer: {
    backgroundColor: colors.background,
    paddingLeft: 20,
    paddingRight: 10,
    paddingVertical: 8,
    borderLeftWidth: 2,
    borderLeftColor: colors.border,
    marginLeft: 30,
    marginBottom: 8,
  },
  subcategoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 6,
    marginBottom: 6,
  },
  subcategoryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  addSubcategoryTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    marginTop: 4,
  },
  addSubcategoryText: {
    fontSize: 14,
    color: colors.primary,
    marginLeft: 6,
    fontWeight: '500',
  },
  addSubcategoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    backgroundColor: colors.surface,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.primary,
    marginTop: 4,
  },
  subcategoryInput: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  addSubcategoryButton: {
    padding: 6,
    marginLeft: 4,
  },
  cancelSubcategoryButton: {
    padding: 6,
    marginLeft: 4,
  },
  categoryList: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  categoryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 15,
    backgroundColor: colors.surfaceSecondary,
    marginBottom: 8,
    borderRadius: 8,
  },
  categoryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  subcategoryIcon: {
    marginRight: 4,
  },
  categoryName: {
    fontSize: 16,
    color: colors.text,
    marginLeft: 10,
    flex: 1,
  },
  subcategoryName: {
    fontSize: 14,
    color: colors.text,
    flex: 1,
  },
  defaultBadge: {
    backgroundColor: colors.primaryLight + '30',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  defaultBadgeText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: 'bold',
  },
  deleteButton: {
    padding: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: colors.textTertiary,
    marginTop: 15,
    fontWeight: 'bold',
  },
  emptySubText: {
    fontSize: 14,
    color: colors.textTertiary,
    marginTop: 5,
    textAlign: 'center',
  },
});
