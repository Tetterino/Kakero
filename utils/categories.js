import {
  DEFAULT_EXPENSE_CATEGORIES,
  DEFAULT_INCOME_CATEGORIES,
  UNCATEGORIZED,
  flattenCategories
} from '../constants/categories';

// 削除されたデフォルトカテゴリを除外したカテゴリリストを取得
export const getAvailableCategories = (
  type,
  customCategories,
  deletedCategories
) => {
  const defaultCategories = type === 'expense'
    ? DEFAULT_EXPENSE_CATEGORIES
    : DEFAULT_INCOME_CATEGORIES;

  // 階層構造のカテゴリをフラットなリストに変換
  const flatDefaults = flattenCategories(defaultCategories);

  // 削除されていないデフォルトカテゴリとカスタムカテゴリを結合
  // UNCATEGORIZEDは除外（ユーザーが選択できないようにする）
  const availableDefaults = flatDefaults.filter(
    cat => !deletedCategories.includes(cat)
  );

  return [...availableDefaults, ...customCategories].filter(
    cat => cat !== UNCATEGORIZED
  );
};
