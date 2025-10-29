// 削除されたカテゴリの取引用の特殊カテゴリ
export const UNCATEGORIZED = '___UNCATEGORIZED___';

// カテゴリの区切り文字（親カテゴリ > 子カテゴリ の形式で保存）
export const CATEGORY_SEPARATOR = ' > ';

// デフォルトカテゴリ（階層構造対応）
// 文字列の場合は子カテゴリなし、オブジェクトの場合は subcategories に子カテゴリを持つ
export const DEFAULT_EXPENSE_CATEGORIES = [
  '食費',
  '交通費',
  {
    name: '日用品',
    subcategories: ['洗剤', 'トイレットペーパー', 'ティッシュ', 'その他日用品']
  },
  '娯楽',
  '医療費',
  '光熱費',
  '通信費',
  '家賃',
  '衣服',
  '教育'
];

export const DEFAULT_INCOME_CATEGORIES = [
  '給料', 'ボーナス', '副業', '投資', 'その他収入'
];

// カテゴリをフラットなリストに変換（下位互換性のため）
// 例: {name: '日用品', subcategories: ['洗剤']} → ['日用品', '日用品 > 洗剤']
export const flattenCategories = (categories) => {
  const result = [];
  categories.forEach(cat => {
    if (typeof cat === 'string') {
      result.push(cat);
    } else if (cat.name) {
      result.push(cat.name);
      if (cat.subcategories && Array.isArray(cat.subcategories)) {
        cat.subcategories.forEach(sub => {
          result.push(`${cat.name}${CATEGORY_SEPARATOR}${sub}`);
        });
      }
    }
  });
  return result;
};

// フラットなカテゴリ名から親カテゴリを取得
// 例: '日用品 > 洗剤' → '日用品'
export const getParentCategory = (categoryName) => {
  if (!categoryName || typeof categoryName !== 'string') return null;
  const parts = categoryName.split(CATEGORY_SEPARATOR);
  return parts.length > 1 ? parts[0] : null;
};

// フラットなカテゴリ名から子カテゴリを取得
// 例: '日用品 > 洗剤' → '洗剤'
export const getSubcategoryName = (categoryName) => {
  if (!categoryName || typeof categoryName !== 'string') return categoryName;
  const parts = categoryName.split(CATEGORY_SEPARATOR);
  return parts.length > 1 ? parts[1] : categoryName;
};

// カテゴリが子カテゴリかどうかをチェック
export const isSubcategory = (categoryName) => {
  return categoryName && categoryName.includes(CATEGORY_SEPARATOR);
};
