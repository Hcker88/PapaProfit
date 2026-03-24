import { GoogleGenAI, Type, Schema } from '@google/genai';
import { UserProfile } from './types';

const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY || 'AIzaSyDGBHEI5U8EywOKmHuwFge7cnsLx_3hbhw' });

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
            incomeSources: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING, description: "Name of the income source (e.g., 'Salary', 'Bonus', 'Side Income')" },
                  value: { type: Type.NUMBER, description: "Monthly value" }
                }
              }
            },
            expenseCategories: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING, description: "Name of the expense category (e.g., 'Rent', 'Groceries', 'Bills', 'Lifestyle')" },
                  value: { type: Type.NUMBER, description: "Monthly value" }
                }
              }
            },
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
        6. stock: {name, quantity, buyPrice}
        
        Message: "${msg}"`,
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

        if (data.incomeSources && data.incomeSources.length > 0) {
          data.incomeSources.forEach((source: any) => {
            const existing = newProfile.incomeSources.find(s => s.name.toLowerCase() === source.name.toLowerCase());
            if (existing) {
              existing.value = source.value;
            } else {
              newProfile.incomeSources.push(source);
            }
            updates.push(`${source.name} updated to ${fmt(source.value)}`);
          });
          newProfile.income = newProfile.incomeSources.reduce((acc, s) => acc + s.value, 0);
        }

        if (data.expenseCategories && data.expenseCategories.length > 0) {
          data.expenseCategories.forEach((cat: any) => {
            const existing = newProfile.expenseCategories.find(c => c.name.toLowerCase() === cat.name.toLowerCase());
            if (existing) {
              existing.value = cat.value;
            } else {
              newProfile.expenseCategories.push(cat);
            }
            updates.push(`${cat.name} updated to ${fmt(cat.value)}`);
          });
          newProfile.expenses = newProfile.expenseCategories.reduce((acc, c) => acc + c.value, 0);
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
      console.error("Gemini parsing failed, using regex fallback", e);
      
      // Basic Regex Fallback for common patterns
      const parseNum = (s: string) => {
        const n = parseFloat(s.replace(/,/g, ''));
        if (s.toLowerCase().includes('k')) return n * 1000;
        if (s.toLowerCase().includes('lakh')) return n * 100000;
        if (s.toLowerCase().includes('cr')) return n * 10000000;
        return n;
      };

      const incomeMatch = msg.match(/(?:income|salary|earn|earning)s?\s*(?:is|of|:)?\s*₹?\s*([\d,.]+\s*(?:k|lakh|cr)?)/i);
      if (incomeMatch) {
        const val = parseNum(incomeMatch[1]);
        newProfile.income = val;
        updates.push('income updated to ' + fmt(val));
        intent = 'income';
      }

      const expenseMatch = msg.match(/(?:expense|spend|spending|cost)s?\s*(?:is|of|:)?\s*₹?\s*([\d,.]+\s*(?:k|lakh|cr)?)/i);
      if (expenseMatch) {
        const val = parseNum(expenseMatch[1]);
        newProfile.expenses = val;
        updates.push('expenses updated to ' + fmt(val));
        intent = 'expense';
      }

      const savingsMatch = msg.match(/(?:savings?|saved|bank balance)\s*(?:is|of|:)?\s*₹?\s*([\d,.]+\s*(?:k|lakh|cr)?)/i);
      if (savingsMatch) {
        const val = parseNum(savingsMatch[1]);
        newProfile.savings = val;
        updates.push('savings updated to ' + fmt(val));
        intent = 'savings';
      }
    }

    newProfile.lastUpdated = new Date().toISOString();
    return { intent, updates, amount, rate, months, newProfile };
  }
};
