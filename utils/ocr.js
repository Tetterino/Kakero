// Firebase Cloud Function経由でOCR処理
import { functions } from '../App';
import { httpsCallable } from 'firebase/functions';

export const performOCR = async (imageUri) => {
  try {
    // 画像をBase64に変換
    const imageBase64 = await uriToBase64(imageUri);

    // Cloud Functionを呼び出し
    const ocrProxy = httpsCallable(functions, 'ocrProxy');
    const result = await ocrProxy({
      base64Image: `data:image/jpeg;base64,${imageBase64}`,
      isOverlayRequired: false,
    });

    if (!result.data.IsErroredOnProcessing && result.data.ParsedResults?.[0]?.ParsedText) {
      return result.data.ParsedResults[0].ParsedText;
    } else {
      throw new Error('OCR処理に失敗しました');
    }
  } catch (error) {
    console.error('OCR Error:', error);
    throw error;
  }
};

// URIをBase64に変換
const uriToBase64 = async (uri) => {
  try {
    const response = await fetch(uri);
    const blob = await response.blob();

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64data = reader.result.split(',')[1];
        resolve(base64data);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Base64 conversion error:', error);
    throw error;
  }
};

// OCR結果から金額を抽出
export const extractAmountFromText = (text) => {
  if (!text) return null;

  const lines = text.split('\n');

  // 除外する行のパターン（これらの行は金額抽出から除外）
  const excludeLinePatterns = [
    /ポイント|point/gi,
    /番号|tel|fax/gi,
    /残高|balance/gi,
    /waon|ワオン/gi,
    /id|登録/gi,
    /お釣り|おつり|お預かり|預り|change/gi,
    /対象|累計|獲得/gi,
    /支払/gi,  // WAON支払、WAON支払額など
  ];

  // 優先順位の高い合計パターン
  const totalPatterns = [
    { pattern: /^計\s+[¥￥]\s*([0-9,]+)$/i, priority: 1, name: '計（行全体）' },  // 「計 ¥2,679」（行全体）
    { pattern: /^[¥￥]\s*([0-9,]+)\s+計$/i, priority: 1, name: '計（逆順）' },  // 「¥2,679 計」
    { pattern: /(?:合計|お会計|total)\s*[:：]?\s*[¥￥]?\s*([0-9,]+)/gi, priority: 2, name: '合計' },
  ];

  let bestMatch = null;  // 最も優先度の高い候補を保持

  console.log(`🔍 [DEBUG] ocr.js version: 2025-01-15-v3 (外税修正版)`);
  console.log(`🔍 [DEBUG] lines.length: ${lines.length}`);

  // まず合計パターンを探す（優先度順）
  for (const { pattern, priority, name } of totalPatterns.sort((a, b) => a.priority - b.priority)) {
    for (let i = 0; i < lines.length; i++) {
      const trimmedLine = lines[i].trim();

      // 除外パターンに該当する行はスキップ
      if (excludeLinePatterns.some(excludePattern => excludePattern.test(trimmedLine))) {
        continue;
      }

      const match = trimmedLine.match(pattern);
      if (match) {
        const amountStr = match[1].replace(/,/g, '');
        const amount = parseInt(amountStr, 10);
        console.log(`金額候補（${name}, priority=${priority}）: ${trimmedLine} -> ¥${amount}`);
        if (!isNaN(amount) && amount > 0 && amount < 1000000) {
          // より優先度が高い候補が見つかったら更新
          if (!bestMatch || priority < bestMatch.priority) {
            bestMatch = { amount, priority, name, line: trimmedLine };
          }
        }
      }
    }
  }

  // 「合計」「小計」だけの行がある場合、次の数行に金額があるかチェック（最大15行先まで）
  for (let i = 0; i < lines.length - 1; i++) {
    const trimmedLine = lines[i].trim();

    // 「合計」「小計」「計」の単独行をチェック
    if (/^(合計|小計|計|お会計|total|subtotal)$/i.test(trimmedLine)) {
      console.log(`🔍 [DEBUG] 単独行発見: "${trimmedLine}" at line ${i}`);

      const candidates = []; // 複数の金額候補を収集

      // 次の15行までチェック（WAON支払などの行をスキップ）
      for (let j = i + 1; j < Math.min(i + 16, lines.length); j++) {
        const nextLine = lines[j].trim();

        // 除外パターンに該当する行はスキップ
        if (excludeLinePatterns.some(excludePattern => excludePattern.test(nextLine))) {
          console.log(`🔍 [DEBUG]   行${j}: "${nextLine}" は除外パターン`);
          continue;
        }

        // 金額パターンをチェック
        const amountMatch = nextLine.match(/^[¥￥]\s*([0-9,]+)$/);
        if (amountMatch) {
          const amountStr = amountMatch[1].replace(/,/g, '');
          const amount = parseInt(amountStr, 10);
          console.log(`🔍 [DEBUG] 金額候補発見: ${j-i}行後: ${nextLine} -> ¥${amount}`);

          // 前後の行もチェックして除外パターンがないか確認
          const prevLine = j > 0 ? lines[j - 1].trim() : '';
          const nextNextLine = j < lines.length - 1 ? lines[j + 1].trim() : '';
          const contextExcluded = excludeLinePatterns.some(excludePattern =>
            excludePattern.test(prevLine) || excludePattern.test(nextNextLine)
          );

          if (contextExcluded) {
            console.log(`🔍 [DEBUG]   行${j}: "${nextLine}" は前後の行により除外 (前: "${prevLine}", 次: "${nextNextLine}")`);
            continue;
          }

          if (!isNaN(amount) && amount > 0 && amount < 1000000) {
            candidates.push({ amount, distance: j - i, line: nextLine });
          }
        }
      }

      // 候補がある場合、最大の金額を選択
      if (candidates.length > 0) {
        const maxCandidate = candidates.reduce((max, curr) => curr.amount > max.amount ? curr : max);
        const priority = /^計$/i.test(trimmedLine) ? 1 : 2;
        const name = `${trimmedLine}（${maxCandidate.distance}行後）`;
        console.log(`金額候補（次行パターン）: ${trimmedLine} -> ${maxCandidate.distance}行後: ${maxCandidate.line} -> ¥${maxCandidate.amount}`);
        if (!bestMatch || priority < bestMatch.priority) {
          bestMatch = { amount: maxCandidate.amount, priority, name, line: `${trimmedLine} -> ${maxCandidate.line}` };
          console.log(`✓ bestMatch更新: priority=${priority}, amount=¥${maxCandidate.amount}`);
        }
      }
    }
  }

  // 最も優先度の高い候補があれば返す
  if (bestMatch) {
    console.log(`✓ 金額確定（${bestMatch.name}）: ¥${bestMatch.amount} from "${bestMatch.line}"`);
    return bestMatch.amount;
  }

  // 合計が見つからない場合は小計を探す
  const subtotalPattern = /(?:小計|subtotal)\s*[:：]?\s*[¥￥]?\s*([0-9,]+)/gi;
  for (const line of lines) {
    const trimmedLine = line.trim();

    // 除外パターンに該当する行はスキップ
    if (excludeLinePatterns.some(excludePattern => excludePattern.test(trimmedLine))) {
      continue;
    }

    const match = trimmedLine.match(subtotalPattern);
    if (match) {
      const amountStr = match[1].replace(/,/g, '');
      const amount = parseInt(amountStr, 10);
      console.log(`金額候補（小計パターン）: ${trimmedLine} -> ¥${amount}`);
      if (!isNaN(amount) && amount > 0 && amount < 1000000) {
        console.log(`✓ 金額確定（小計）: ¥${amount}`);
        return amount;
      }
    }
  }

  // それでも見つからない場合は、全ての金額から最大値を取得
  const amounts = [];
  const generalPattern = /[¥￥]\s*([0-9,]+)/g;

  console.log(`=== 一般パターンで金額を検索 ===`);
  for (const line of lines) {
    const trimmedLine = line.trim();

    // 除外パターンに該当する行はスキップ
    if (excludeLinePatterns.some(excludePattern => excludePattern.test(trimmedLine))) {
      continue;
    }

    const matches = trimmedLine.matchAll(generalPattern);
    for (const match of matches) {
      const amountStr = match[1].replace(/,/g, '');
      const amount = parseInt(amountStr, 10);
      if (!isNaN(amount) && amount > 0 && amount < 1000000) {
        console.log(`  金額候補: ${trimmedLine} -> ¥${amount}`);
        amounts.push({ amount, line: trimmedLine });
      }
    }
  }

  if (amounts.length > 0) {
    const maxEntry = amounts.reduce((max, curr) => curr.amount > max.amount ? curr : max);
    console.log(`✓ 金額確定（最大値）: ¥${maxEntry.amount} (from: ${maxEntry.line})`);
    return maxEntry.amount;
  }

  console.log(`✗ 金額が見つかりませんでした`);
  return null;
};

// OCR結果から店名を抽出（簡易版）
export const extractStoreName = (text) => {
  if (!text) return null;

  const lines = text.split('\n').filter(line => line.trim().length > 0);

  // 除外パターン
  const excludePatterns = [
    /^[\/\\EON]+$/,  // 記号のみ
    /tel|fax|http|www/gi,  // 連絡先、URL
    /株式会社|登録番号|レジ/gi,  // 法人情報など
    /^\d+$/,  // 数字のみ
    /ありがとう|welcome/gi,  // 挨拶文
  ];

  // 最初の10行から店名候補を探す
  for (const line of lines.slice(0, 10)) {
    const trimmed = line.trim();

    // 除外パターンに該当する場合はスキップ
    if (excludePatterns.some(pattern => pattern.test(trimmed))) {
      continue;
    }

    // 日付や時刻が含まれている場合はスキップ
    if (/\d{4}[\/\-]\d{2}[\/\-]\d{2}/.test(trimmed) || /\d{1,2}:\d{2}/.test(trimmed)) {
      continue;
    }

    // 店名として妥当そうな行（2文字以上、記号だけではない）
    if (trimmed.length >= 2 && !/^[\/\\*\-=]+$/.test(trimmed)) {
      // 「〇〇店」のようなパターンを優先
      if (/店$/.test(trimmed)) {
        return trimmed;
      }

      // 数字が少ない行を優先（店名には数字が少ない）
      const digitCount = (trimmed.match(/\d/g) || []).length;
      if (digitCount < trimmed.length * 0.3) {
        return trimmed;
      }
    }
  }

  // 見つからなければ最初の行
  return lines[0]?.trim() || null;
};

// OCR結果から日付を抽出
export const extractDate = (text) => {
  if (!text) return null;

  // 行ごとに分割して処理
  const lines = text.split('\n');

  // 日付パターン（より厳密に）
  const patterns = [
    // 年月日の明示的なパターン（最優先）
    /(\d{4})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日?/,  // 2025年1月15日
    /(\d{4})[\/\.](\d{1,2})[\/\.](\d{1,2})\s*\([月火水木金土日]\)/,  // 2025/10/7(火)
    /(\d{4})[\/\.](\d{1,2})[\/\.](\d{1,2})/,             // 2025/01/15, 2025.01.15
    // 短縮年のパターン（電話番号との区別を厳密に）
    /(?:^|[^\d])(\d{2})[\/\.](\d{1,2})[\/\.](\d{1,2})(?:[^\d]|$)/,  // 25/01/15
  ];

  // 電話番号パターン（除外用）
  const phonePatterns = [
    /\d{2,4}[\-\s]\d{3,4}[\-\s]\d{4}/,  // 03-1234-5678, 0120-12-3456
    /\d{3,4}\(\d+\)\d{3,4}/,             // 03(1234)5678
  ];

  for (const line of lines) {
    // 電話番号が含まれている行はスキップ
    if (phonePatterns.some(pattern => pattern.test(line))) {
      continue;
    }

    for (const pattern of patterns) {
      const match = line.match(pattern);
      if (match) {
        let year = parseInt(match[1], 10);
        const month = parseInt(match[2], 10);
        const day = parseInt(match[3], 10);

        // 2桁年を4桁に変換
        if (year < 100) {
          year += 2000;
        }

        // 年が妥当な範囲かチェック（2020〜2030年の範囲）
        if (year < 2020 || year > 2030) {
          continue;
        }

        // 月と日が妥当な範囲かチェック
        if (month < 1 || month > 12 || day < 1 || day > 31) {
          continue;
        }

        // 有効な日付かチェック
        const date = new Date(year, month - 1, day);
        if (!isNaN(date.getTime()) &&
            date.getFullYear() === year &&
            date.getMonth() === month - 1 &&
            date.getDate() === day) {
          // YYYY-MM-DD形式で返す（toISOString()だとUTCになってズレる可能性があるため、直接フォーマット）
          const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          console.log(`✓ 日付確定: ${dateStr} (from line: ${line.trim()})`);
          return dateStr;
        }
      }
    }
  }

  console.log(`✗ 日付が見つかりませんでした`);
  return null;
};

// OCR結果から消費税（外税）を抽出
export const extractTax = (text) => {
  if (!text) return null;

  const lines = text.split('\n').map(line => line.trim());

  // パターン1: 同一行に「外税」と金額がある場合
  const sameLinePatterns = [
    { pattern: /(?:外税|消費税|tax)\s*[:：]?\s*[¥￥]?\s*([0-9,]+)/i, index: 1 },
    { pattern: /^[¥￥]\s*([0-9,]+)\s*(?:外税|消費税|tax)/i, index: 1 },
  ];

  for (const line of lines) {
    for (const { pattern, index } of sameLinePatterns) {
      const match = line.match(pattern);
      if (match && match[index]) {
        const amountStr = match[index].replace(/,/g, '');
        const amount = parseInt(amountStr, 10);
        // パーセント（8%, 10%など）は除外
        if (!isNaN(amount) && amount > 0 && amount < 10000 && amount !== 8 && amount !== 10) {
          console.log(`✓ 消費税確定（同一行）: ¥${amount} (from line: ${line})`);
          return amount;
        }
      }
    }
  }

  // パターン2: 「外税 8%」のような行の次に金額がある場合
  for (let i = 0; i < lines.length - 1; i++) {
    const line = lines[i];

    // 「外税 8%」「外税 10%」「消費税」などの行を探す（「対象額」などが含まれていない行のみ）
    if (/^(?:外税|消費税|tax)\s*(?:8%|10%)?$/i.test(line) && !/対象/.test(line)) {
      console.log(`🔍 [DEBUG] 外税ラベル発見: "${line}" at line ${i}`);

      // 次の1〜15行をチェック（範囲を広げる）
      for (let j = i + 1; j < Math.min(i + 16, lines.length); j++) {
        const nextLine = lines[j];

        // 除外パターン（WAON、支払、お釣りなど）をスキップ
        if (/waon|支払|お釣り|おつり|合計|小計|商品数|印は|対象商品/i.test(nextLine)) {
          console.log(`🔍 [DEBUG] 除外行スキップ: ${nextLine}`);
          continue;
        }

        // 金額パターンをチェック
        const amountMatch = nextLine.match(/^[¥￥]?\s*([0-9,]+)\s*円?$/);
        if (amountMatch) {
          const amountStr = amountMatch[1].replace(/,/g, '');
          const amount = parseInt(amountStr, 10);
          console.log(`🔍 [DEBUG] 金額候補: ${nextLine} -> ¥${amount}`);

          // 妥当な税額の範囲（10円〜9,999円、かつ8や10ではない）
          // 3,000円を超える金額は税額としては大きすぎるので除外
          if (!isNaN(amount) && amount >= 10 && amount < 3000 && amount !== 8 && amount !== 10) {
            console.log(`✓ 消費税確定（次行パターン）: ¥${amount} (from "${line}" -> "${nextLine}")`);
            return amount;
          }
        }
      }
    }
  }

  console.log(`✗ 消費税が見つかりませんでした`);
  return null;
};

// OCR結果から商品明細を抽出
export const extractItems = (text) => {
  if (!text) return [];

  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  const items = [];

  // 商品行のパターン（複数のパターンに対応）
  const patterns = [
    // パターン1: 商品名 スペース 金額 (最も一般的)
    /^(.+?)\s+[¥￥]?\s*([0-9,]+)\s*円?$/,
    // パターン2: 商品名 2つ以上のスペース 金額
    /^(.+?)\s{2,}([0-9,]+)$/,
    // パターン3: 商品名と金額の間にタブがある場合
    /^(.+?)\t+[¥￥]?\s*([0-9,]+)\s*円?$/,
    // パターン4: 金額だけが行にある場合（前の行が商品名の可能性）
    /^[¥￥]?\s*([0-9,]+)\s*円?$/,
    // パターン5: 商品名 * 個数 金額
    /^(.+?)\s*[*×xX]\s*\d+\s+[¥￥]?\s*([0-9,]+)\s*円?$/,
    // パターン6: より緩いパターン（商品名っぽい文字列 + 数字3桁以上）
    /^([^\d]+?)\s+([0-9,]{3,})$/,
  ];

  // 除外キーワード（合計、小計などの行は商品ではない）
  // 注意: 短い単語（2文字以下）は部分一致で誤検出しやすいので慎重に
  const excludeKeywords = [
    '合計', '小計', '税込', '税抜', '消費税', 'total', 'subtotal',
    'お会計', 'おつり', 'お預かり', '預り', '釣銭', '釣り',
    '現金', 'クレジット', 'カード', 'payment', 'change', 'cash',
    '承認番号', '伝票番号', '担当者', 'tel', '電話', '住所',
    'レジ', '領収', '印紙', 'no.', '管理', 'お客様',
    'book-off', 'bookoff', 'ブックオフ', '駅前店',
    '割引', '値引', 'waon', 'ポイント', 'point', '残高',
    '会員様', '登録', '対象額', '獲得', '累計', '基本', 'ボーナス',
    'お買上', 'ありがとう', '買上', '商品数', '印は', '対象商品',
    '外税', '内税', 'fax', 'http', 'www', '株式会社',
    '責任者', 'レジ担当',  // レジ関係の除外
    'paypay', 'ペイペイ', 'line pay', 'd払い', 'au pay', '楽天pay', 'メルペイ',  // 電子決済
    'edy', 'id', 'quicpay', 'pitapa', 'icoca',  // 電子マネー
    'ダウンロード', 'アプリ', 'キャンペーン', 'プレゼント', '公式',  // 広告テキスト
  ];

  // 除外する商品名パターン（1文字だけ、数字だけなど）
  const excludeNamePatterns = [
    /^[0-9]+$/,  // 数字のみ
    /^[*\-=]+$/,  // 記号のみ
    /^.$/,  // 1文字のみ
    /^\d{2,4}[\/\-]\d{2}[\/\-]\d{2}/,  // 日付パターン
    /^\d{3,4}\-\d{3,4}\-\d{3,4}/,  // 電話番号パターン
    /^[0-9]{6,}$/,  // 6桁以上の数字のみ（ID、管理番号など）
    /^[iI]+$/,  // iだけの行（iAEONのような誤認識を除外）
  ];

  // 商品名をクリーニングする関数
  const cleanItemName = (name) => {
    // 先頭の記号や空白を削除
    name = name.replace(/^[\-\+\*\s]+/, '');
    // 末尾の空白を削除
    name = name.trim();
    // 括弧内の情報を削除（個数や単価など）
    name = name.replace(/\([^)]*\)/g, '').trim();
    // 「×数字」のようなパターンを削除
    name = name.replace(/[×xX]\s*\d+$/, '').trim();
    // 先頭の「i」や「l」などの誤認識文字を削除（iAEON、lDOLEなど）
    name = name.replace(/^[iIlL](?=[A-Z])/, '').trim();
    return name;
  };

  // 商品名として妥当かチェックする関数
  const isValidItemName = (name) => {
    // 除外パターンチェック
    if (excludeNamePatterns.some(p => p.test(name))) {
      return false;
    }
    // 除外キーワードチェック（完全一致または含まれる）
    if (excludeKeywords.some(k => {
      const lowerName = name.toLowerCase();
      const lowerKeyword = k.toLowerCase();
      // 短いキーワード（3文字以下）は完全一致のみ
      if (k.length <= 3) {
        return lowerName === lowerKeyword;
      }
      // 長いキーワードは部分一致
      return lowerName.includes(lowerKeyword);
    })) {
      return false;
    }
    // 商品名に年月日が含まれている場合は除外
    if (/\d{4}年|年\d|月\d|日/.test(name)) {
      return false;
    }
    // 商品名が数字とスラッシュ/ハイフンだけの場合は除外
    if (/^[\d\/\-\(\)]+$/.test(name)) {
      return false;
    }
    // 商品名が短すぎる場合は除外（1文字は除外、2文字以上はOK）
    if (name.length < 2) {
      return false;
    }
    // ¥や円が含まれている場合は除外（金額行の可能性）
    if (/[¥￥円]/.test(name)) {
      return false;
    }
    // 時刻パターン（10:23など）が含まれている場合は除外
    if (/\d{1,2}:\d{2}/.test(name)) {
      return false;
    }
    // 英字、数字、ひらがな、カタカナ、漢字のいずれかが含まれていればOK
    // 人名（今満忠昭など）も商品名として許可
    if (!/[a-zA-Z0-9ぁ-んァ-ヶー一-龠]/.test(name)) {
      return false;
    }
    return true;
  };

  let previousLine = null;
  let previousLines = []; // 複数の前行を保持（改行された商品名用）

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // 除外キーワードが含まれている場合はスキップ
    if (excludeKeywords.some(keyword => line.toLowerCase().includes(keyword.toLowerCase()))) {
      previousLine = line;
      previousLines = [];  // リセット
      continue;
    }

    // 割引行や引き落とし行はスキップ（会員様割引など）
    if (/割引|引き|値引/.test(line) && !/[¥￥]/.test(line)) {
      previousLine = line;
      previousLines = [];  // リセット（割引行の後は新しい商品が始まる）
      continue;
    }

    // パーセント記号だけの行もスキップ
    if (/^\d+%$/.test(line.trim())) {
      previousLine = line;
      continue;  // previousLinesはリセットしない（次の行が商品名の可能性）
    }

    // マイナス金額の行（値引き）を商品として抽出
    const discountMatch = line.match(/^-[¥￥]?\s*([0-9,]+)/);
    if (discountMatch) {
      const amountStr = discountMatch[1].replace(/,/g, '');
      const amount = -parseInt(amountStr, 10);  // マイナスにする

      // 前の行から値引き名を取得（「値割引金額」など）
      let discountName = '値引き';
      if (previousLines.length > 0) {
        const prevText = previousLines.join('').trim();
        if (prevText.includes('割引') || prevText.includes('値引')) {
          discountName = prevText;
        }
      }

      console.log(`✓ 商品追加（値引きパターン）: ${discountName} - ¥${amount}`);
      items.push({
        id: `${Date.now()}_${items.length}_${Math.random()}`,
        name: discountName,
        amount: amount,
      });
      previousLine = line;
      previousLines = [];  // リセット
      continue;
    }

    // パターン4: 金額だけの行の場合、前の行（複数行の場合は結合）を商品名として使う
    const amountOnlyMatch = line.match(/^[¥￥]?\s*([0-9,]+)\s*円?$/);
    if (amountOnlyMatch && previousLines.length > 0) {
      // 複数行の商品名を結合（改行された商品名に対応）
      let name = previousLines.join('').trim();
      const amountStr = amountOnlyMatch[1].replace(/,/g, '');
      let amount = parseInt(amountStr, 10);

      // 商品名をクリーニング
      name = cleanItemName(name);

      // 前の行が商品名として妥当かチェック
      console.log(`[金額のみパターン] 候補: "${name}" (クリーニング前: "${previousLines.join('')}"), 金額: ${amount}`);
      if (name.length > 1 &&
          isValidItemName(name) &&
          !isNaN(amount) && amount > 0 && amount < 100000) {
        console.log(`✓ 商品追加（金額のみパターン）: ${name} - ¥${amount}`);
        items.push({
          id: `${Date.now()}_${items.length}_${Math.random()}`,
          name: name,
          amount: amount,
        });
        previousLine = line;
        previousLines = []; // リセット
        continue;
      } else {
        if (name.length > 1) {
          console.log(`✗ 商品却下（金額のみパターン）: ${name} - ¥${amount}`);
          console.log(`  理由: 商品名妥当性=${isValidItemName(name)}, 金額範囲=${!isNaN(amount) && amount > 0 && amount < 100000}`);
        }
      }
    }

    // 他のパターンを試行
    let matched = false;
    for (let j = 0; j < patterns.length - 1; j++) { // パターン4（インデックス3）を除く
      if (j === 3) continue; // パターン4はスキップ（上で処理済み）

      const pattern = patterns[j];
      const match = line.match(pattern);
      if (match) {
        let name, amountStr;
        if (match[1] && match[2]) {
          name = match[1].trim();
          amountStr = match[2].replace(/,/g, '');
        } else if (match[3] && match[4]) {
          name = match[3].trim();
          amountStr = match[4].replace(/,/g, '');
        } else {
          continue;
        }

        let amount = parseInt(amountStr, 10);

        // 商品名をクリーニング
        name = cleanItemName(name);

        // 商品名と金額が妥当かチェック
        if (name.length > 0 &&
            isValidItemName(name) &&
            !isNaN(amount) && amount > 0 && amount < 100000) {
          console.log(`商品追加（パターン${j}）: ${name} - ¥${amount}`);
          items.push({
            id: `${Date.now()}_${items.length}_${Math.random()}`,
            name: name,
            amount: amount,
          });
          matched = true;
          previousLines = []; // マッチしたので履歴をリセット
          break;
        } else if (name.length > 0) {
          console.log(`商品却下（パターン${j}）: ${name} - ¥${amount} (理由: ${!isValidItemName(name) ? '無効な商品名' : '金額が範囲外'})`);
        }
      }
    }

    // マッチしなかった場合は、次の金額行のために保持
    if (!matched && !amountOnlyMatch) {
      // 数字のみの行や記号のみの行、割引行は履歴に追加しない
      if (!excludeNamePatterns.some(p => p.test(line)) &&
          !/^[0-9,]+$/.test(line) &&
          !/^-[¥￥]?\s*[0-9,]+/.test(line) &&
          !/割引|引き|値引/.test(line)) {
        previousLines.push(line);
        // 履歴が長くなりすぎないように制限（最大3行）
        if (previousLines.length > 3) {
          previousLines.shift();
        }
      }
    }

    previousLine = line;
  }

  // 重複商品は個数を付与（同じ商品名・同じ金額の場合）
  // スペースや全角半角の違いを正規化して判定
  const normalizeProductName = (name) => {
    return name
      .replace(/\s+/g, '') // 全てのスペースを削除
      .replace(/[Ａ-Ｚａ-ｚ０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xFEE0)) // 全角英数字を半角に
      .toLowerCase();
  };

  const itemGroups = {};
  for (const item of items) {
    const normalizedName = normalizeProductName(item.name);
    const key = `${normalizedName}_${item.amount}`;
    if (!itemGroups[key]) {
      itemGroups[key] = { ...item, count: 1, normalizedName };
    } else {
      itemGroups[key].count += 1;
    }
  }

  // 個数が2個以上の商品は名前に個数を追加
  const deduplicatedItems = Object.values(itemGroups).map(item => {
    if (item.count > 1) {
      return {
        ...item,
        name: `${item.name} ×${item.count}`,
        amount: item.amount * item.count  // 合計金額にする
      };
    }
    return item;
  });

  console.log(`=== 商品明細抽出結果 ===`);
  console.log(`抽出された商品数: ${items.length}件`);
  console.log(`重複統合後: ${deduplicatedItems.length}件`);
  deduplicatedItems.forEach(item => {
    console.log(`  - ${item.name}: ¥${item.amount}`);
  });

  // 金額の合計が妥当か確認（明らかに多すぎる商品を除外）
  const totalAmount = deduplicatedItems.reduce((sum, item) => sum + item.amount, 0);
  console.log(`商品明細の合計金額: ¥${totalAmount}`);

  if (totalAmount > 1000000) {
    // 合計が100万円を超える場合は、金額の大きい商品を除外
    console.log(`⚠️ 合計金額が100万円を超えているため、50,000円以上の商品を除外`);
    return deduplicatedItems.filter(item => item.amount < 50000);
  }

  return deduplicatedItems;
};
