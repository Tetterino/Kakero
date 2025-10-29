/**
 * 日付計算ユーティリティ
 */

/**
 * カスタム月初日を考慮した「今月」の範囲を取得
 * @param {number} monthStartDay - 月初日（1-31）
 * @returns {{ startDate: string, endDate: string }} - YYYY-MM-DD形式の開始日と終了日
 */
export const getCurrentMonthRange = (monthStartDay = 1) => {
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth(); // 0-11
  const currentDate = today.getDate(); // 1-31

  let startYear, startMonth, endYear, endMonth;

  // 今日の日付が月初日よりも前の場合、先月の月初日から今月の月初日の前日まで
  if (currentDate < monthStartDay) {
    // 先月の月初日から
    startYear = currentMonth === 0 ? currentYear - 1 : currentYear;
    startMonth = currentMonth === 0 ? 11 : currentMonth - 1;

    // 今月の月初日の前日まで
    endYear = currentYear;
    endMonth = currentMonth;
  } else {
    // 今月の月初日から来月の月初日の前日まで
    startYear = currentYear;
    startMonth = currentMonth;

    endYear = currentMonth === 11 ? currentYear + 1 : currentYear;
    endMonth = currentMonth === 11 ? 0 : currentMonth + 1;
  }

  // 開始日（その月の最終日を超えないように調整）
  const startDate = getValidDateInMonth(startYear, startMonth, monthStartDay);
  const startDateStr = formatDate(startDate);

  // 終了日（次の月初日の前日）
  const endDate = getValidDateInMonth(endYear, endMonth, monthStartDay - 1);
  const endDateStr = formatDate(endDate);

  return { startDate: startDateStr, endDate: endDateStr };
};

/**
 * 指定した年月日が有効かチェックし、その月の最終日を超える場合は最終日を返す
 * @param {number} year
 * @param {number} month - 0-11
 * @param {number} day - 1-31
 * @returns {Date}
 */
const getValidDateInMonth = (year, month, day) => {
  // その月の最終日を取得（次の月の0日目 = その月の最終日）
  const lastDayOfMonth = new Date(year, month + 1, 0).getDate();

  // 指定した日がその月の最終日を超える場合は最終日を使う
  const validDay = Math.min(day, lastDayOfMonth);

  return new Date(year, month, validDay);
};

/**
 * Dateオブジェクトを YYYY-MM-DD 形式にフォーマット
 * @param {Date} date
 * @returns {string} YYYY-MM-DD形式の文字列
 */
export const formatDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
