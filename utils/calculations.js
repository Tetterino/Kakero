// 残高を計算
export const calculateBalance = (transactions) => {
  return transactions.reduce((sum, transaction) => {
    return transaction.type === 'income'
      ? sum + transaction.amount
      : sum - transaction.amount;
  }, 0);
};

// 収入の合計を計算
export const calculateTotalIncome = (transactions) => {
  return transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);
};

// 支出の合計を計算
export const calculateTotalExpense = (transactions) => {
  return transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);
};

// 残高に応じたグラデーション色を計算
export const getBalanceGradient = (balance) => {
  if (balance < 0) {
    // マイナス: 深い赤
    return ['#c62828', '#b71c1c'];
  } else if (balance < 10000) {
    // 少額: オレンジ〜赤
    return ['#f57c00', '#e64a19'];
  } else if (balance < 50000) {
    // 中程度: 青〜紫
    return ['#1976d2', '#5e35b1'];
  } else if (balance < 100000) {
    // 多め: 青〜緑
    return ['#0097a7', '#00897b'];
  } else {
    // 高額: 深い緑
    return ['#388e3c', '#2e7d32'];
  }
};
