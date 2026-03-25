import { UserProfile } from './types';

export const parser = {
  async parse(msg: string, currentProfile: UserProfile): Promise<{ intent: string; updates: string[]; amount: number; rate: number; months: number; newProfile: UserProfile }> {
    const newProfile = JSON.parse(JSON.stringify(currentProfile)) as UserProfile;
    const updates: string[] = [];
    let intent = 'general';
    let amount = 0;
    let rate = 0;
    let months = 0;

    const fmt = (n: number) => `₹${n.toLocaleString('en-IN')}`;

    try {
      const res = await fetch('/api/ai/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ msg })
      });
      const data = await res.json();
      intent = data.intent || 'general';
      const extracted = data.extracted_data || {};

      if (extracted.incomeSources && extracted.incomeSources.length > 0) {
        extracted.incomeSources.forEach((source: any) => {
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

      if (extracted.expenseCategories && extracted.expenseCategories.length > 0) {
        extracted.expenseCategories.forEach((cat: any) => {
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
      if (extracted.savings) {
        newProfile.savings = extracted.savings;
        amount = extracted.savings;
        updates.push('savings updated to ' + fmt(extracted.savings));
      }
      if (extracted.loan && extracted.loan.amount) {
        const existing = newProfile.loans.find(l => l.name === extracted.loan.name);
        if (existing) {
          existing.amount = extracted.loan.amount;
          if (extracted.loan.rate) existing.rate = extracted.loan.rate;
        } else {
          newProfile.loans.push({ name: extracted.loan.name || 'Loan', amount: extracted.loan.amount, rate: extracted.loan.rate || 0, emi: 0 });
        }
        amount = extracted.loan.amount;
        rate = extracted.loan.rate || 0;
        updates.push(`${extracted.loan.name || 'Loan'} of ${fmt(extracted.loan.amount)} added`);
      }
      if (extracted.asset && extracted.asset.value) {
        if (extracted.asset.type === 'property') {
          newProfile.assets.property.push({ name: extracted.asset.name || 'Property', value: extracted.asset.value, mortgageable: true });
        } else if (extracted.asset.type === 'gold') {
          newProfile.assets.gold = extracted.asset.value;
        } else if (extracted.asset.type === 'cash') {
          newProfile.assets.cash = (newProfile.assets.cash || 0) + extracted.asset.value;
        } else {
          newProfile.assets.other.push({ name: extracted.asset.name || 'Asset', value: extracted.asset.value });
        }
        amount = extracted.asset.value;
        updates.push(`${extracted.asset.name || extracted.asset.type} worth ${fmt(extracted.asset.value)} added`);
      }
      if (extracted.stock && extracted.stock.name) {
        const qty = extracted.stock.quantity || 1;
        const price = extracted.stock.buyPrice || extracted.stock.value || 0;
        
        if (price > 0) {
          const newStock = {
            symbol: extracted.stock.name.toUpperCase(),
            name: extracted.stock.name,
            quantity: qty,
            buyPrice: price,
            currentPrice: price
          };
          if (!newProfile.assets.stocks) newProfile.assets.stocks = [];
          newProfile.assets.stocks.push(newStock);
          amount = qty * price;
          updates.push(`Stock/Investment ${extracted.stock.name} added to portfolio`);
        }
      }
      if (extracted.goal && extracted.goal.name) {
        const existing = newProfile.goals.find(g => g.name === extracted.goal.name);
        if (!existing) {
          newProfile.goals.push({ name: extracted.goal.name, target: extracted.goal.targetAmount || 0, saved: 0, months: extracted.goal.months || 60 });
          updates.push('Goal added: ' + extracted.goal.name);
        }
        amount = extracted.goal.targetAmount || 0;
        months = extracted.goal.months || 0;
      }
      if (extracted.riskProfile) {
        newProfile.riskProfile = extracted.riskProfile as 'conservative' | 'moderate' | 'aggressive';
        updates.push(`Risk profile: ${extracted.riskProfile}`);
      }
    } catch (e) {
      console.error("Server parsing failed, using regex fallback", e);
      
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
