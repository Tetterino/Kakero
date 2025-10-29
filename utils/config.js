// Firebase設定
// 環境変数から取得（expo-constantsを使用）
import Constants from 'expo-constants';

export const firebaseConfig = {
  apiKey: Constants.expoConfig?.extra?.firebaseApiKey || process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: "kakero-app.firebaseapp.com",
  projectId: "kakero-app",
  storageBucket: "kakero-app.firebasestorage.app",
  messagingSenderId: "512551939589",
  appId: "1:512551939589:web:5f9c6a1a6e4275d390b66c",
  measurementId: "G-53RP131TVZ"
};
