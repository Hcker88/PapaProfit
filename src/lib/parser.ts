import { GoogleGenAI, Type } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export interface ParsedData {
  intent: string;
  updates: string[];
  amount: number;
  rate?: number;
  months?: number;
  entities: {
    income?: number;
    expense?: number;
    savings?: number;
    loan?: { name: string; amount: number; rate?: number; emi?: number };
    asset?: { name: string; value: number; type: 'property' | 'gold' | 'cash' | 'other'; mortgageable: boolean };
    goal?: { name: string; target: number; months: number };
    stock?: { name: string; quantity: number; buyPrice: number };
    riskProfile?: 'conservative' | 'moderate' | 'aggressive';
  };
}

export const parser = {
  async parse(msg: string, currentProfile: any): Promise<ParsedData> {
    const prompt = `
      You are an advanced financial NLP parser.
      Analyze the following user message and extract financial entities and intents.
      The user might use colloquialisms, ambiguous statements, or multiple distinct actions.
      
      Current Profile Context:
      ${JSON.stringify(currentProfile, null, 2)}
      
      User Message: "${msg}"
      
      Extract the following information if present:
      - intent: The primary intent (e.g., 'income', 'expense', 'savings', 'loan', 'asset', 'goal', 'stock', 'risk_profile', 'general', 'health', 'invest', 'tax', 'business').
      - updates: A list of human-readable strings describing what was updated (e.g., "Income updated to ₹50,000").
      - amount: The primary amount mentioned.
      - rate: Any interest rate mentioned.
      - months: Any time period mentioned in months.
      - entities: An object containing the extracted data structured as follows:
        - income: number
        - expense: number
        - savings: number
        - loan: { name: string, amount: number, rate: number, emi: number }
        - asset: { name: string, value: number, type: 'property' | 'gold' | 'cash' | 'other', mortgageable: boolean }
        - goal: { name: string, target: number, months: number }
        - stock: { name: string, quantity: number, buyPrice: number }
        - riskProfile: 'conservative' | 'moderate' | 'aggressive'
        
      Return ONLY a valid JSON object matching this structure. Do not include markdown formatting like \`\`\`json.
    `;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-pro-preview',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              intent: { type: Type.STRING },
              updates: { type: Type.ARRAY, items: { type: Type.STRING } },
              amount: { type: Type.NUMBER },
              rate: { type: Type.NUMBER },
              months: { type: Type.NUMBER },
              entities: {
                type: Type.OBJECT,
                properties: {
                  income: { type: Type.NUMBER },
                  expense: { type: Type.NUMBER },
                  savings: { type: Type.NUMBER },
                  loan: {
                    type: Type.OBJECT,
                    properties: {
                      name: { type: Type.STRING },
                      amount: { type: Type.NUMBER },
                      rate: { type: Type.NUMBER },
                      emi: { type: Type.NUMBER }
                    }
                  },
                  asset: {
                    type: Type.OBJECT,
                    properties: {
                      name: { type: Type.STRING },
                      value: { type: Type.NUMBER },
                      type: { type: Type.STRING },
                      mortgageable: { type: Type.BOOLEAN }
                    }
                  },
                  goal: {
                    type: Type.OBJECT,
                    properties: {
                      name: { type: Type.STRING },
                      target: { type: Type.NUMBER },
                      months: { type: Type.NUMBER }
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
                  riskProfile: { type: Type.STRING }
                }
              }
            },
            required: ['intent', 'updates', 'amount', 'entities']
          }
        }
      });

      const jsonStr = response.text?.trim() || '{}';
      const parsed = JSON.parse(jsonStr);
      return parsed as ParsedData;
    } catch (error) {
      console.error("Error parsing message with Gemini:", error);
      // Fallback to basic regex parser if Gemini fails
      return this.basicParse(msg);
    }
  },

  basicParse(msg: string): ParsedData {
    // Basic fallback parser (similar to the original)
    const m = msg.toLowerCase();
    const amount = this.extractAmount(msg);
    const rate = this.extractRate(msg);
    const months = this.extractMonths(msg);
    const updates: string[] = [];
    let intent = 'general';
    const entities: any = {};

    if (m.match(/\b(earn|salary|income|get paid|make|per month|monthly income|ctc|package)\b/) && amount > 0) {
      entities.income = amount;
      updates.push('Income updated to ₹' + amount.toLocaleString('en-IN'));
      intent = 'income';
    } else if (m.match(/\b(spend|expense|expenses|cost|costs|monthly expense|outgoing)\b/) && amount > 0) {
      entities.expense = amount;
      updates.push('Expenses updated to ₹' + amount.toLocaleString('en-IN'));
      intent = 'expense';
    } else if (m.match(/\b(loan|debt|emi|borrowed|owe|credit card|mortgage)\b/) && amount > 0) {
      const loanName = m.includes('home') || m.includes('house') ? 'Home Loan' : 'Loan';
      entities.loan = { name: loanName, amount, rate: rate || 0, emi: 0 };
      updates.push(loanName + ' of ₹' + amount.toLocaleString('en-IN') + ' added');
      intent = 'loan';
    }

    return { intent, updates, amount, rate, months, entities };
  },

  extractAmount(msg: string): number {
    const patterns = [
      { r: /(\d+(?:\.\d+)?)\s*crore/i, mul: 10000000 },
      { r: /(\d+(?:\.\d+)?)\s*(lakh|lac|l\b)/i, mul: 100000 },
      { r: /(\d+(?:\.\d+)?)\s*k\b/i, mul: 1000 },
      { r: /(\d+(?:\.\d+)?)\s*thousand/i, mul: 1000 },
      { r: /[\u20b9rs\.]{0,3}\s*(\d[\d,]+)/i, mul: 1 },
      { r: /(\d[\d,]+)/, mul: 1 }
    ];
    for (const p of patterns) {
      const m = msg.match(p.r);
      if (m) {
        const n = parseFloat(m[1].replace(/,/g, '')) * p.mul;
        if (n > 99) return n;
      }
    }
    return 0;
  },

  extractRate(msg: string): number {
    const m = msg.match(/(\d+(?:\.\d+)?)\s*%/);
    return m ? parseFloat(m[1]) : 0;
  },

  extractMonths(msg: string): number {
    const m1 = msg.match(/(\d+)\s*(to|-)\s*(\d+)\s*month/i);
    if (m1) return Math.round((parseInt(m1[1]) + parseInt(m1[3])) / 2);
    const m2 = msg.match(/(\d+)\s*month/i);
    if (m2) return parseInt(m2[1]);
    const m3 = msg.match(/(\d+(?:\.\d+)?)\s*year/i);
    if (m3) return Math.round(parseFloat(m3[1]) * 12);
    return 0;
  }
};
