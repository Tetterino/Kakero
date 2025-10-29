const functions = require('firebase-functions');
const fetch = require('node-fetch');
const FormData = require('form-data');
require('dotenv').config();

// OCR.space APIをプロキシする関数
exports.ocrProxy = functions.https.onCall(async (data, context) => {
  try {
    const { base64Image, isOverlayRequired } = data;

    if (!base64Image) {
      throw new functions.https.HttpsError('invalid-argument', 'base64Image is required');
    }

    // 環境変数からAPIキーを取得
    const apiKey = process.env.OCR_API_KEY;
    if (!apiKey) {
      throw new functions.https.HttpsError('failed-precondition', 'OCR API key not configured');
    }

    // OCR.space APIにリクエスト
    const formData = new URLSearchParams();
    formData.append('apikey', apiKey);
    formData.append('base64Image', base64Image);
    formData.append('language', 'jpn');
    formData.append('isOverlayRequired', isOverlayRequired || 'false');
    formData.append('detectOrientation', 'true');
    formData.append('scale', 'true');
    formData.append('OCREngine', '2');

    const response = await fetch('https://api.ocr.space/parse/image', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    if (!response.ok) {
      throw new functions.https.HttpsError('internal', `OCR API returned ${response.status}`);
    }

    const result = await response.json();

    if (result.IsErroredOnProcessing) {
      throw new functions.https.HttpsError('internal', result.ErrorMessage || 'OCR processing failed');
    }

    return result;
  } catch (error) {
    console.error('OCR Proxy Error:', error);
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    throw new functions.https.HttpsError('internal', error.message || 'Unknown error occurred');
  }
});
