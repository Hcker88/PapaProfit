import { GoogleGenAI } from '@google/genai';
import { UserProfile } from './types';
import { finance } from './finance';

const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });

export const insights = {
  async generateResponse(userMsg: string, parsedData: any, profile: UserProfile, chatHistory: { role: string; content: string }[]): Promise<string> {
    const fhsScore = finance.fhs(profile);
    const fhsInfo = finance.fhsLabel(fhsScore);
    const collateral = profile.assets.property.find(a => a.mortgageable);
    const highDebt = [...profile.loans].sort((a, b) => b.rate - a.rate)[0];

    const fmt = (n: number) => `₹${n.toLocaleString('en-IN')}`;

    const systemCtx = `You are PapaProfit — a sharp, warm, and direct personal financial advisor for Indian users. You speak like a smart friend who happens to be a financial expert. You give specific, actionable advice using the client's ACTUAL numbers. Never give generic tips.

FORMATTING RULES:
- Use clear sections with bold headers like **📊 Your Numbers** 
- Use line breaks between sections
- Use bullet points for lists
- Keep responses focused — 150 to 250 words
- Always end with a follow-up question OR a clear next action
- Use ₹ symbol and Indian number format (lakh, crore)
- Reference real Indian products: SIP, PPF, NPS, ELSS, LAP, KCC, HDFC/SBI/Bajaj

CLIENT PROFILE (always use these numbers):
Monthly income: ${fmt(profile.income)}
Monthly expenses: ${fmt(profile.expenses)}
Savings: ${fmt(profile.savings)}
Loans: ${profile.loans.map(l => l.name + ': ' + fmt(l.amount) + (l.rate ? ' at ' + l.rate + '%' : '')).join(', ') || 'None'}
Assets: Property: ${profile.assets.property.map(p => p.name + ' (' + fmt(p.value) + ')').join(', ') || 'None'} | Gold: ${fmt(profile.assets.gold)} | Cash: ${fmt(profile.assets.cash)} | Other: ${profile.assets.other.map(p => p.name + ' (' + fmt(p.value) + ')').join(', ') || 'None'}
Goals: ${profile.goals.map(g => g.name + (g.target ? ' (' + fmt(g.target) + ')' : '')).join(', ') || 'None set'}
Risk profile: ${profile.riskProfile || 'Unknown'}

CALCULATED METRICS:
Net worth: ${fmt(finance.netWorth(profile))}
Monthly surplus: ${fmt(finance.surplus(profile))}
Savings rate: ${finance.savingsRate(profile).toFixed(1)}%
Debt ratio: ${finance.debtRatio(profile).toFixed(1)}x monthly income
Financial Health Score: ${fhsScore !== null ? fhsScore + '/100 (' + fhsInfo.label + ')' : 'Not enough data yet'}
${collateral ? 'Collateral available: ' + collateral.name + ' worth ' + fmt(collateral.value) : ''}
${highDebt ? 'Highest interest debt: ' + highDebt.name + ' at ' + highDebt.rate + '%' : ''}

PARSED FROM THIS MESSAGE: intent=${parsedData.intent}, amount=${parsedData.amount > 0 ? fmt(parsedData.amount) : 'none'}, months=${parsedData.months || 'none'}
Profile updates made: ${parsedData.updates.length > 0 ? parsedData.updates.join(', ') : 'none'}
Premium Status: ${profile.isPremium ? 'PRO USER - Give advanced investment and tax advice' : 'FREE USER - Do NOT give specific stock or advanced investment advice. Tell them to upgrade to Pro for personalized investment strategies if they ask.'}`;

    let messages = chatHistory.slice(-6).map(h => ({
      role: h.role === 'user' ? 'user' : 'model',
      parts: [{ text: h.content }]
    }));

    // Gemini API requires the first message to be from the user
    if (messages.length > 0 && messages[0].role === 'model') {
      messages.shift();
    }

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: messages,
        config: {
          systemInstruction: systemCtx,
          temperature: 0.7,
          maxOutputTokens: 600
        }
      });
      return response.text || 'Sorry, I had trouble with that. Please try again.';
    } catch (error) {
      console.error('Gemini error:', error);
      return 'Sorry, I had trouble connecting to my brain. Please try again.';
    }
  }
};
