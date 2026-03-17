import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import yahooFinance from 'yahoo-finance2';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API routes
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  app.get('/api/stock/search', async (req, res) => {
    const { q } = req.query;
    if (!q || typeof q !== 'string') {
      return res.status(400).json({ error: 'Query parameter q is required' });
    }
    try {
      const results: any = await yahooFinance.search(q);
      const quotes = results.quotes.filter((q: any) => q.isYahooFinance);
      res.json(quotes.slice(0, 5));
    } catch (error) {
      console.error('Stock search error:', error);
      res.status(500).json({ error: 'Failed to search stock' });
    }
  });

  app.get('/api/stock/quote', async (req, res) => {
    const { symbol } = req.query;
    if (!symbol || typeof symbol !== 'string') {
      return res.status(400).json({ error: 'Query parameter symbol is required' });
    }
    try {
      const quote = await yahooFinance.quote(symbol);
      res.json(quote);
    } catch (error) {
      console.error('Stock quote error:', error);
      res.status(500).json({ error: 'Failed to fetch stock quote' });
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
