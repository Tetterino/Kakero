# Kakero（カケロ）

シンプルで使いやすい家計簿アプリです。レシート撮影によるOCR機能で、簡単に支出を記録できます。

## 主な機能

### 📸 レシート撮影機能
- カメラまたはギャラリーからレシート画像を選択
- OCR.space APIを使用した高精度な文字認識
- 店舗名、日付、合計金額の自動抽出
- 商品明細の自動抽出とカテゴリ分類

### 💰 収支管理
- 支出・収入の記録
- カテゴリ別の分類（親子カテゴリ対応）
- カスタムカテゴリの追加
- 商品明細の編集機能

### 📊 分析機能
- 月別・カテゴリ別の支出分析
- グラフによる可視化
- カレンダービューでの収支確認

### ⚙️ その他
- ダークモード対応
- データの永続化（AsyncStorage）
- 支出のみモード

## 技術スタック

- **フレームワーク**: React Native (Expo)
- **言語**: JavaScript
- **OCR**: OCR.space API (Cloud Functions経由)
- **バックエンド**: Firebase (Cloud Functions)
- **ストレージ**: AsyncStorage（ローカル）
- **ナビゲーション**: React Navigation
- **UI**: React Native Components, MaterialIcons

## セットアップ

### 必要な環境
- Node.js 18以上
- npm または yarn
- Expo CLI

### インストール

```bash
# リポジトリのクローン
git clone https://github.com/Tetterino/Kakero.git
cd Kakero

# 依存関係のインストール
npm install

# 環境変数の設定
cp .env.example .env
# .envファイルを編集してFirebase APIキーを設定
# EXPO_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key_here

# Cloud Functionsの環境変数設定
cp functions/.env.example functions/.env
# functions/.envファイルを編集してOCR APIキーを設定
# OCR_API_KEY=your_ocr_space_api_key_here

# 開発サーバーの起動
npm start
```

### 環境変数の取得方法

#### Firebase API Key
1. [Firebase Console](https://console.firebase.google.com/)にアクセス
2. プロジェクト「kakero-app」を選択
3. 設定 > 全般 > マイアプリ から「Web API Key」をコピー
4. `.env`ファイルの`EXPO_PUBLIC_FIREBASE_API_KEY`に設定

#### OCR.space API Key
1. [OCR.space](https://ocr.space/ocrapi)にアクセス
2. 無料アカウントを作成（月25,000リクエストまで無料）
3. APIキーをコピー
4. `functions/.env`ファイルの`OCR_API_KEY`に設定

### 実行方法

```bash
# iOS
npm run ios

# Android
npm run android

# Web
npm run web
```

## プロジェクト構造

```
Kakero/
├── components/         # 再利用可能なUIコンポーネント
│   ├── BalanceCard.js
│   ├── CategoryPicker.js
│   ├── TransactionItem.js
│   ├── OCRResultModal.js
│   └── ...
├── screens/           # 画面コンポーネント
│   ├── HomeScreen.js
│   ├── HistoryScreen.js
│   ├── AnalyticsScreen.js
│   ├── CalendarScreen.js
│   ├── CategoriesScreen.js
│   └── SettingsScreen.js
├── utils/             # ユーティリティ関数
│   ├── ocr.js        # OCR処理（Cloud Functions呼び出し）
│   ├── storage.js    # データ永続化
│   ├── config.js     # Firebase設定
│   ├── calculations.js
│   └── categories.js
├── functions/         # Cloud Functions
│   ├── index.js      # OCR Proxy関数
│   ├── package.json
│   └── .env          # 環境変数（APIキー）
├── constants/         # 定数定義
│   ├── categories.js
│   └── storage.js
├── contexts/          # React Context
│   └── ThemeContext.js
├── assets/            # 画像・アイコン
├── App.js            # ルートコンポーネント
├── firebase.json     # Firebase設定
└── package.json
```

## OCR機能の詳細

### アーキテクチャ

OCR処理は以下の流れで実行されます：

1. **クライアント**: レシート画像をBase64に変換
2. **Cloud Functions**: Firebase Cloud Functions (`ocrProxy`) がOCR.space APIを呼び出し
3. **パターンマッチング**: クライアント側で抽出処理を実行

この構成により、APIキーを安全に管理し、無料版でも利用可能です。

### パターンマッチングによる抽出

高精度なパターンマッチングで以下を自動抽出：

1. **店舗名**: レシート上部の店舗情報を認識
2. **日付**: 複数の日付形式に対応
3. **合計金額**: 「合計」「小計」キーワードから判定
4. **商品明細**: 商品名と価格のペアを抽出
5. **値引き**: マイナス金額も正しく認識
6. **消費税**: 外税の場合は商品明細に追加

### 商品明細の処理

- 重複商品の自動統合（「×3」表記）
- スペース・全角半角の正規化
- 除外キーワードによるフィルタリング
- 金額の妥当性チェック

### セキュリティ

- APIキーはCloud Functions内の環境変数で管理
- `.env`ファイルは`.gitignore`で除外（GitHubに公開されない）
- クライアントからAPIキーは一切見えない

## カテゴリ機能

### 親子カテゴリ

デフォルトで以下のカテゴリを用意：

- **日用品**
  - 洗剤
  - トイレットペーパー
  - ティッシュ
  - その他日用品
- 食費
- 交通費
- 娯楽
- 医療費
- 光熱費
- 通信費
- 家賃
- 衣服
- 教育

### カスタムカテゴリ

- 親カテゴリのみ、または子カテゴリも自由に追加可能
- 収支登録時に親・子どちらでも選択可能
- デフォルトカテゴリの削除も可能

## ライセンス

MIT License

## 開発者

Tetterino

## リンク

- [GitHub](https://github.com/Tetterino/Kakero)
