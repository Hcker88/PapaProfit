import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import YahooFinance from 'yahoo-finance2';
import { GoogleGenAI, Type, Schema } from '@google/genai';
import dotenv from 'dotenv';
import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';

dotenv.config();

const yahooFinance = new YahooFinance();

const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
const appUrl = process.env.APP_URL || 'http://localhost:3000/';
console.log('GEMINI_API_KEY present:', !!process.env.GEMINI_API_KEY);
console.log('APP_URL:', appUrl);
const ai = new GoogleGenAI({ apiKey: apiKey || '' });

let firestore: any;

// Initialize Firebase Admin
const firebaseConfigPath = path.join(process.cwd(), 'firebase-applet-config.json');
if (fs.existsSync(firebaseConfigPath)) {
  const config = JSON.parse(fs.readFileSync(firebaseConfigPath, 'utf-8'));
  const adminApp = admin.initializeApp({
    projectId: config.projectId,
  });
  firestore = getFirestore(adminApp, config.firestoreDatabaseId);
} else {
  firestore = admin.firestore();
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API routes
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  app.post('/api/premium/upgrade', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const idToken = authHeader.split('Bearer ')[1];
    try {
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      const uid = decodedToken.uid;

      // Update user profile in Firestore to set isPremium: true
      await firestore.collection('users').doc(uid).set({
        profile: {
          isPremium: true
        }
      }, { merge: true });

      res.json({ success: true });
    } catch (error) {
      console.error('Premium upgrade error:', error);
      res.status(500).json({ error: 'Failed to upgrade' });
    }
  });

  app.post('/api/ai/parse', async (req, res) => {
    const { msg } = req.body;
    if (!apiKey) return res.status(500).json({ error: 'API Key missing' });

    const schema: Schema = {
      type: Type.OBJECT,
      properties: {
        intent: { type: Type.STRING },
        extracted_data: {
          type: Type.OBJECT,
          properties: {
            incomeSources: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, value: { type: Type.NUMBER } } } },
            expenseCategories: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, value: { type: Type.NUMBER } } } },
            savings: { type: Type.NUMBER },
            loan: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, amount: { type: Type.NUMBER }, rate: { type: Type.NUMBER } } },
            asset: { type: Type.OBJECT, properties: { type: { type: Type.STRING }, name: { type: Type.STRING }, value: { type: Type.NUMBER } } },
            stock: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, quantity: { type: Type.NUMBER }, buyPrice: { type: Type.NUMBER }, value: { type: Type.NUMBER } } },
            goal: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, targetAmount: { type: Type.NUMBER }, months: { type: Type.NUMBER } } },
            riskProfile: { type: Type.STRING }
          }
        }
      }
    };

    try {
      console.log('Calling AI Parse for message:', msg.substring(0, 50) + '...');
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `You are a financial data extractor. Parse the user message and extract ALL financial entities.
        
        RULES:
        - Income/Expenses are ALWAYS MONTHLY.
        - Assets/Loans/Savings are ALWAYS TOTAL/CURRENT BALANCE.
        - Convert 'k' to 1000, 'lakh' to 100000, 'cr' to 10000000.
        
        EXTRACT THESE:
        1. incomeSources: {name, value} (Monthly)
        2. expenseCategories: {name, value} (Monthly)
        3. savings: total current balance
        4. loan: {name, amount, rate} (Total outstanding)
        5. asset: {type: 'property'|'gold'|'cash'|'other', name, value} (Total current value)
        6. stock: {name, quantity, buyPrice, value} (Use value if quantity/buyPrice not given)
        
        Message: "${msg}"`,
        config: {
          responseMimeType: 'application/json',
          responseSchema: schema,
          temperature: 0.1
        }
      });
      console.log('AI Parse success');
      res.json(JSON.parse(response.text || '{}'));
    } catch (error: any) {
      console.error('AI Parse error:', error.message || error);
      res.status(500).json({ error: 'AI Parse failed', details: error.message });
    }
  });

  app.post('/api/ai/insights', async (req, res) => {
    const { chatHistory, systemCtx } = req.body;
    if (!apiKey) return res.status(500).json({ error: 'API Key missing' });

    let messages = chatHistory.slice(-6).map((h: any) => ({
      role: h.role === 'user' ? 'user' : 'model',
      parts: [{ text: h.content }]
    }));

    if (messages.length > 0 && messages[0].role === 'model') {
      messages.shift();
    }

    try {
      console.log('Calling AI Insights...');
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: messages,
        config: {
          systemInstruction: systemCtx,
          temperature: 0.7,
          maxOutputTokens: 600
        }
      });
      console.log('AI Insights success');
      res.json({ text: response.text });
    } catch (error: any) {
      console.error('AI Insights error:', error.message || error);
      res.status(500).json({ error: 'AI Insights failed', details: error.message });
    }
  });

  app.get('/api/stock/search', async (req, res) => {
    const { q } = req.query;
    if (!q || typeof q !== 'string') {
      return res.status(400).json({ error: 'Query parameter q is required' });
    }
    try {
      console.log('Searching stock:', q);
      const results = await yahooFinance.search(q);
      const quotes = results.quotes.filter((q: any) => q.isYahooFinance || q.quoteType === 'EQUITY');
      res.json(quotes.slice(0, 5));
    } catch (error: any) {
      console.error('Stock search error:', error.message || error);
      res.status(500).json({ error: 'Failed to search stock', details: error.message });
    }
  });

  app.get('/api/stock/quote', async (req, res) => {
    const { symbol } = req.query;
    if (!symbol || typeof symbol !== 'string') {
      return res.status(400).json({ error: 'Query parameter symbol is required' });
    }
    try {
      console.log('Fetching quote for:', symbol);
      const quote = await yahooFinance.quote(symbol);
      res.json(quote);
    } catch (error: any) {
      console.error('Stock quote error:', error.message || error);
      res.status(500).json({ error: 'Failed to fetch stock quote', details: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
