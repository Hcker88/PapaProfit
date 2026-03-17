export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  createdAt: string;
  lastUpdated?: string;
  profile: {
    income: number;
    expenses: number;
    savings: number;
    loans: { name: string; amount: number; rate: number; emi: number }[];
    assets: {
      property: { name: string; value: number; mortgageable: boolean }[];
      gold: number;
      cash: number;
      other: any[];
    };
    subscriptions: any[];
    goals: { name: string; target: number; saved: number; months: number }[];
    riskProfile?: string;
  };
  portfolio: { name: string; quantity: number; buyPrice: number; currentPrice: number }[];
}

export const finance = {
  totalAssets(profile: UserProfile['profile']) {
    const p = profile.assets.property.reduce((s, a) => s + (a.value || 0), 0);
    return p + (profile.assets.gold || 0) + (profile.assets.cash || 0);
  },

  totalLiabilities(profile: UserProfile['profile']) {
    return profile.loans.reduce((s, l) => s + (l.amount || 0), 0);
  },

  totalEMI(profile: UserProfile['profile']) {
    return profile.loans.reduce((s, l) => s + (l.emi || 0), 0);
  },

  netWorth(profile: UserProfile['profile']) {
    return this.totalAssets(profile) - this.totalLiabilities(profile);
  },

  surplus(profile: UserProfile['profile']) {
    return profile.income - profile.expenses - this.totalEMI(profile);
  },

  savingsRate(profile: UserProfile['profile']) {
    if (!profile.income) return 0;
    return (this.surplus(profile) / profile.income) * 100;
  },

  debtRatio(profile: UserProfile['profile']) {
    if (!profile.income) return 0;
    return this.totalLiabilities(profile) / profile.income;
  },

  // Advanced Financial Health Score 0-100
  fhs(profile: UserProfile['profile']) {
    if (!profile.income) return null;
    let score = 50; // base

    // 1. Savings Rate (max +20, min -15)
    const sr = this.savingsRate(profile);
    if (sr >= 30) score += 20;
    else if (sr >= 20) score += 15;
    else if (sr >= 10) score += 10;
    else if (sr >= 0) score += 5;
    else score -= 15;

    // 2. Debt Ratio (max +15, min -15)
    const dr = this.debtRatio(profile);
    if (dr === 0) score += 15;
    else if (dr <= 3) score += 10;
    else if (dr <= 6) score += 5;
    else if (dr <= 10) score += 0;
    else score -= 15;

    // 3. Net Worth (max +15, min -5)
    const nw = this.netWorth(profile);
    if (nw > profile.income * 24) score += 15;
    else if (nw > profile.income * 12) score += 10;
    else if (nw > profile.income * 6) score += 5;
    else if (nw < 0) score -= 5;

    // 4. Emergency Fund Status (max +15)
    const emergencyNeeded = (profile.expenses || 0) * 6;
    if (emergencyNeeded > 0) {
      if (profile.assets.cash >= emergencyNeeded) score += 15;
      else if (profile.assets.cash >= emergencyNeeded * 0.5) score += 8;
      else if (profile.assets.cash >= emergencyNeeded * 0.25) score += 3;
    }

    // 5. Investment Diversification (max +10)
    let assetClasses = 0;
    if (profile.assets.property.length > 0) assetClasses++;
    if (profile.assets.gold > 0) assetClasses++;
    if (profile.assets.cash > 0) assetClasses++;
    // Assuming portfolio is passed or checked elsewhere, but we only have profile here.
    // Let's assume 'other' contains stocks/mutual funds for now.
    if (profile.assets.other && profile.assets.other.length > 0) assetClasses++;
    
    if (assetClasses >= 3) score += 10;
    else if (assetClasses === 2) score += 5;

    // 6. Long-term Goal Progress (max +10)
    if (profile.goals.length > 0) {
      let totalProgress = 0;
      profile.goals.forEach(g => {
        if (g.target > 0) totalProgress += (g.saved / g.target);
      });
      const avgProgress = totalProgress / profile.goals.length;
      if (avgProgress >= 0.8) score += 10;
      else if (avgProgress >= 0.5) score += 7;
      else if (avgProgress >= 0.2) score += 4;
      else score += 2; // Bonus just for having goals
    }

    // 7. Spending Habits (max +5, min -10)
    // If expenses are > 80% of income, penalize
    const expenseRatio = profile.income > 0 ? (profile.expenses / profile.income) : 1;
    if (expenseRatio < 0.5) score += 5;
    else if (expenseRatio > 0.8) score -= 10;
    else if (expenseRatio > 0.6) score -= 5;

    // 8. Risk Profile Set (+5 bonus)
    if (profile.riskProfile) score += 5;

    return Math.max(0, Math.min(100, Math.round(score)));
  },

  fhsLabel(score: number | null) {
    if (score === null) return { label: 'No data yet', cls: '' };
    if (score >= 80) return { label: 'Excellent', cls: 'good' };
    if (score >= 60) return { label: 'Good', cls: 'good' };
    if (score >= 40) return { label: 'Average', cls: 'ok' };
    if (score >= 20) return { label: 'Needs work', cls: 'bad' };
    return { label: 'Critical', cls: 'bad' };
  },

  goalMonthlyNeeded(goal: { target: number; saved: number; months: number }) {
    if (!goal.months || goal.months <= 0) return 0;
    const remaining = (goal.target || 0) - (goal.saved || 0);
    const r = 0.10 / 12;
    if (r === 0) return remaining / goal.months;
    return remaining * r / (Math.pow(1 + r, goal.months) - 1);
  },

  generateNudges(profile: UserProfile['profile']) {
    const nudges = [];
    const sr = this.savingsRate(profile);
    const dr = this.debtRatio(profile);
    const nw = this.netWorth(profile);
    const surplus = this.surplus(profile);
    const collateral = profile.assets.property.find(a => a.mortgageable);
    const highDebt = [...profile.loans].sort((a, b) => b.rate - a.rate)[0];

    if (sr < 10 && profile.income > 0) nudges.push('⚠️ Your savings rate is below 10%. Target is 20%+.');
    if (sr >= 20) nudges.push('✅ Great savings rate! Make sure this money is being invested.');
    if (dr > 6) nudges.push('🚨 Your debt is ' + dr.toFixed(1) + 'x your monthly income — this is high.');
    if (profile.assets.cash < (profile.expenses * 3) && profile.income > 0) nudges.push('⚠️ Emergency fund is low. Build up 6 months of expenses.');
    if (surplus > 5000 && profile.assets.cash < profile.expenses * 6) nudges.push('💡 You have surplus of ₹' + surplus.toLocaleString('en-IN') + '/month — prioritise emergency fund first.');
    if (collateral && this.totalLiabilities(profile) > 0 && highDebt && highDebt.rate > 11) nudges.push('💡 Your ' + collateral.name + ' can be used for a Loan Against Property at 8–10%, cheaper than your current debt.');
    if (nw < 0) nudges.push('🚨 Net worth is negative. Debts exceed assets — focus on debt reduction.');
    if (profile.goals.length === 0 && profile.income > 0) nudges.push('💡 No goals set. Define a financial goal to get a savings roadmap.');
    if (!profile.riskProfile && profile.income > 0) nudges.push('💡 Tell me your risk appetite (conservative / moderate / aggressive) for investment advice.');

    return nudges.slice(0, 4);
  }
};
