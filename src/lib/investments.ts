import { UserProfile } from './finance';

export const investments = {
  generateRecommendations(profile: UserProfile['profile'], portfolio: UserProfile['portfolio']) {
    const recommendations: string[] = [];
    const riskProfile = profile.riskProfile || 'moderate';
    const totalAssets = profile.assets.cash + profile.assets.gold + profile.assets.property.reduce((s, a) => s + a.value, 0) + portfolio.reduce((s, p) => s + (p.currentPrice * p.quantity), 0);
    const emergencyFund = profile.assets.cash;
    const requiredEmergency = profile.expenses * 6;

    // 1. Emergency Fund Check
    if (emergencyFund < requiredEmergency) {
      recommendations.push(`**Emergency Fund Priority:** Before investing aggressively, build your emergency fund to ₹${requiredEmergency.toLocaleString('en-IN')}. Currently, you have ₹${emergencyFund.toLocaleString('en-IN')}. Consider liquid funds or high-yield savings accounts for this.`);
    }

    // 2. Risk Profile & Asset Allocation
    const equityAllocation = portfolio.reduce((s, p) => s + (p.currentPrice * p.quantity), 0) / (totalAssets || 1);
    const goldAllocation = profile.assets.gold / (totalAssets || 1);

    if (riskProfile === 'conservative') {
      if (equityAllocation > 0.3) {
        recommendations.push(`**Rebalance Portfolio:** Your risk profile is conservative, but your equity exposure is high (${(equityAllocation * 100).toFixed(1)}%). Consider diversifying into fixed-income assets like FDs, PPF, or debt mutual funds.`);
      } else {
        recommendations.push(`**Conservative Strategy:** Focus on capital preservation. Good options include Public Provident Fund (PPF), National Savings Certificate (NSC), and high-rated corporate bonds or debt mutual funds.`);
      }
    } else if (riskProfile === 'moderate') {
      if (equityAllocation < 0.4 || equityAllocation > 0.6) {
        recommendations.push(`**Balanced Approach:** Aim for a 50-50 split between equity and debt. Your current equity allocation is ${(equityAllocation * 100).toFixed(1)}%. Consider balanced advantage funds or index funds for steady growth.`);
      } else {
        recommendations.push(`**Moderate Strategy:** You have a balanced allocation. Continue investing in a mix of large-cap mutual funds and debt instruments like PPF or EPF.`);
      }
    } else if (riskProfile === 'aggressive') {
      if (equityAllocation < 0.7) {
        recommendations.push(`**Increase Equity Exposure:** As an aggressive investor, your equity allocation (${(equityAllocation * 100).toFixed(1)}%) is low. Consider increasing exposure to mid-cap and small-cap mutual funds or direct equities for higher long-term returns.`);
      } else {
        recommendations.push(`**Aggressive Strategy:** Your portfolio aligns with your risk profile. Ensure you are diversified across sectors. You might explore thematic funds or direct stock picking if you have the expertise.`);
      }
    }

    // 3. Gold Allocation
    if (goldAllocation > 0.15) {
      recommendations.push(`**Gold Overweight:** Your gold allocation is high (${(goldAllocation * 100).toFixed(1)}%). While gold is a good hedge, it doesn't generate passive income. Consider limiting it to 5-10% of your portfolio.`);
    } else if (goldAllocation < 0.05 && totalAssets > 1000000) {
      recommendations.push(`**Gold as a Hedge:** Consider adding Sovereign Gold Bonds (SGBs) to your portfolio. They offer a 2.5% annual interest on top of gold price appreciation and are tax-free on maturity.`);
    }

    // 4. Goal-Based Recommendations
    if (profile.goals.length > 0) {
      profile.goals.forEach(goal => {
        if (goal.months <= 36) {
          recommendations.push(`**Short-Term Goal (${goal.name}):** Since this goal is less than 3 years away, avoid equity. Park your savings in Arbitrage Funds, Liquid Funds, or Bank FDs to protect capital.`);
        } else if (goal.months > 36 && goal.months <= 84) {
          recommendations.push(`**Medium-Term Goal (${goal.name}):** For a 3-7 year horizon, consider Balanced Advantage Funds or Aggressive Hybrid Funds to get equity-like returns with lower volatility.`);
        } else {
          recommendations.push(`**Long-Term Goal (${goal.name}):** For goals 7+ years away, pure equity is best. Start a SIP in a Nifty 50 Index Fund or Flexi-Cap Fund to beat inflation and compound wealth.`);
        }
      });
    }

    return recommendations;
  }
};
