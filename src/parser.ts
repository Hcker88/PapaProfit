import { GoogleGenAI, Type, Schema } from '@google/genai';
import { UserProfile } from './types';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export const parser = {
  async parse(msg: string, currentProfile: UserProfile): Promise<{ intent: string; updates: string[]; amount: number; rate: number; months: number; newProfile: UserProfile }> {
    const newProfile = JSON.parse(JSON.stringify(currentProfile)) as UserProfile;
    const updates: string[] = [];
    let intent = 'general';
    let amount = 0;
    let rate = 0;
    let months = 0;

    const fmt = (n: number) => `₹${n.toLocaleString('en-IN')}`;

    const schema: Schema = {
      type: Type.OBJECT,
      properties: {
        intent: { type: Type.STRING, description: "The main intent of the user message (e.g., 'income', 'expense', 'savings', 'loan', 'asset', 'stock', 'goal', 'business', 'health', 'invest', 'tax', 'general')" },
        extracted_data: {
          type: Type.OBJECT,
          properties: {
            income: { type: Type.NUMBER, description: "Monthly income mentioned" },
            expense: { type: Type.NUMBER, description: "Monthly expense mentioned" },
            savings: { type: Type.NUMBER, description: "Savings amount mentioned" },
            loan: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                amount: { type: Type.NUMBER },
                rate: { type: Type.NUMBER }
              }
            },
            asset: {
              type: Type.OBJECT,
              properties: {
                type: { type: Type.STRING, description: "'property', 'gold', 'cash', or 'other'" },
                name: { type: Type.STRING },
                value: { type: Type.NUMBER }
              }
            },
            stock: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                quantity: { type: Type.NUMBER },
                buyPrice: { type: Type.NUMBER }
              }
            },
            goal: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                targetAmount: { type: Type.NUMBER },
                months: { type: Type.NUMBER }
              }
            },
            riskProfile: { type: Type.STRING, description: "'conservative', 'moderate', or 'aggressive'" }
          }
        }
      }
    };

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: `Parse the following user message and extract financial data. Convert all amounts to numbers (e.g., '50k' -> 50000, '2 lakh' -> 200000). Message: "${msg}"`,
        config: {
          responseMimeType: 'application/json',
          responseSchema: schema,
          temperature: 0.1
        }
      });

      if (response.text) {
        const parsed = JSON.parse(response.text);
        intent = parsed.intent || 'general';
        const data = parsed.extracted_data || {};

        if (data.income) {
          newProfile.income = data.income;
          amount = data.income;
          updates.push('income updated to ' + fmt(data.income));
        }
        if (data.expense) {
          newProfile.expenses = data.expense;
          amount = data.expense;
          updates.push('expenses updated to ' + fmt(data.expense));
        }
        if (data.savings) {
          newProfile.savings = data.savings;
          amount = data.savings;
          updates.push('savings updated to ' + fmt(data.savings));
        }
        if (data.loan && data.loan.amount) {
          const existing = newProfile.loans.find(l => l.name === data.loan.name);
          if (existing) {
            existing.amount = data.loan.amount;
            if (data.loan.rate) existing.rate = data.loan.rate;
          } else {
            newProfile.loans.push({ name: data.loan.name || 'Loan', amount: data.loan.amount, rate: data.loan.rate || 0, emi: 0 });
          }
          amount = data.loan.amount;
          rate = data.loan.rate || 0;
          updates.push(`${data.loan.name || 'Loan'} of ${fmt(data.loan.amount)} added`);
        }
        if (data.asset && data.asset.value) {
          if (data.asset.type === 'property') {
            newProfile.assets.property.push({ name: data.asset.name || 'Property', value: data.asset.value, mortgageable: true });
          } else if (data.asset.type === 'gold') {
            newProfile.assets.gold = data.asset.value;
          } else if (data.asset.type === 'cash') {
            newProfile.assets.cash = (newProfile.assets.cash || 0) + data.asset.value;
          } else {
            newProfile.assets.other.push({ name: data.asset.name || 'Asset', value: data.asset.value });
          }
          amount = data.asset.value;
          updates.push(`${data.asset.name || data.asset.type} worth ${fmt(data.asset.value)} added`);
        }
        if (data.stock && data.stock.name && data.stock.quantity && data.stock.buyPrice) {
          const newStock = {
            symbol: data.stock.name.toUpperCase(),
            name: data.stock.name,
            quantity: data.stock.quantity,
            buyPrice: data.stock.buyPrice,
            currentPrice: data.stock.buyPrice
          };
          if (!newProfile.assets.stocks) newProfile.assets.stocks = [];
          newProfile.assets.stocks.push(newStock);
          amount = data.stock.quantity * data.stock.buyPrice;
          updates.push(`Stock ${data.stock.name} added to portfolio`);
        }
        if (data.goal && data.goal.name) {
          const existing = newProfile.goals.find(g => g.name === data.goal.name);
          if (!existing) {
            newProfile.goals.push({ name: data.goal.name, target: data.goal.targetAmount || 0, saved: 0, months: data.goal.months || 60 });
            updates.push('Goal added: ' + data.goal.name);
          }
          amount = data.goal.targetAmount || 0;
          months = data.goal.months || 0;
        }
        if (data.riskProfile) {
          newProfile.riskProfile = data.riskProfile as 'conservative' | 'moderate' | 'aggressive';
          updates.push(`Risk profile: ${data.riskProfile}`);
        }
      }
    } catch (e) {
      console.error("Parsing error", e);
    }

    newProfile.lastUpdated = new Date().toISOString();
    return { intent, updates, amount, rate, months, newProfile };
  }
};
