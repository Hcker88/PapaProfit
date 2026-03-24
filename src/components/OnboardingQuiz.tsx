import React, { useState } from 'react';
import { UserProfile } from '../types';

interface OnboardingQuizProps {
  profile: UserProfile;
  onComplete: (updatedProfile: UserProfile) => void;
}

export function OnboardingQuiz({ profile, onComplete }: OnboardingQuizProps) {
  const [step, setStep] = useState(0);
  const [income, setIncome] = useState('');
  const [expenses, setExpenses] = useState('');
  const [savings, setSavings] = useState('');
  const [investments, setInvestments] = useState('');
  const [loans, setLoans] = useState('');
  const [risk, setRisk] = useState<'conservative' | 'moderate' | 'aggressive' | null>(null);

  const handleNext = () => {
    if (step < 5) {
      setStep(step + 1);
    } else {
      // Finish onboarding
      const newProfile = { ...profile };
      newProfile.income = parseFloat(income) || 0;
      newProfile.expenses = parseFloat(expenses) || 0;
      newProfile.savings = parseFloat(savings) || 0;
      
      const investmentValue = parseFloat(investments) || 0;
      newProfile.assets = { 
        ...profile.assets, 
        cash: parseFloat(savings) || 0,
        other: investmentValue > 0 ? [{ name: 'Existing Investments', value: investmentValue }] : []
      };
      
      const loanAmount = parseFloat(loans) || 0;
      if (loanAmount > 0) {
        newProfile.loans = [{ name: 'Existing Loans', amount: loanAmount, rate: 10, emi: 0 }];
      }
      
      newProfile.riskProfile = risk;
      newProfile.onboardingCompleted = true;
      newProfile.lastUpdated = new Date().toISOString();
      
      onComplete(newProfile);
    }
  };

  const steps = [
    {
      section: "Cash Flow",
      title: "Monthly Income",
      question: "What is your total net monthly income (after tax)?",
      description: "Include salary, bonuses, and any side income.",
      input: (
        <div className="relative mt-4">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">₹</span>
          <input 
            type="number" 
            value={income} 
            onChange={(e) => setIncome(e.target.value)} 
            placeholder="e.g. 75,000"
            className="w-full pl-8 pr-4 py-3 text-lg border-2 border-gray-200 rounded-xl focus:border-[#1a7a4a] focus:outline-none transition-colors"
            autoFocus
          />
        </div>
      )
    },
    {
      section: "Cash Flow",
      title: "Monthly Expenses",
      question: "What are your average monthly outflows?",
      description: "Include rent, groceries, bills, and lifestyle spending.",
      input: (
        <div className="relative mt-4">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">₹</span>
          <input 
            type="number" 
            value={expenses} 
            onChange={(e) => setExpenses(e.target.value)} 
            placeholder="e.g. 40,000"
            className="w-full pl-8 pr-4 py-3 text-lg border-2 border-gray-200 rounded-xl focus:border-[#1a7a4a] focus:outline-none transition-colors"
            autoFocus
          />
        </div>
      )
    },
    {
      section: "Assets",
      title: "Liquid Savings",
      question: "How much cash do you have in savings/bank accounts?",
      description: "This is your immediate safety net.",
      input: (
        <div className="relative mt-4">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">₹</span>
          <input 
            type="number" 
            value={savings} 
            onChange={(e) => setSavings(e.target.value)} 
            placeholder="e.g. 1,50,000"
            className="w-full pl-8 pr-4 py-3 text-lg border-2 border-gray-200 rounded-xl focus:border-[#1a7a4a] focus:outline-none transition-colors"
            autoFocus
          />
        </div>
      )
    },
    {
      section: "Assets",
      title: "Investments",
      question: "What is the current value of your other investments?",
      description: "Stocks, Mutual Funds, Gold, FDs, etc.",
      input: (
        <div className="relative mt-4">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">₹</span>
          <input 
            type="number" 
            value={investments} 
            onChange={(e) => setInvestments(e.target.value)} 
            placeholder="e.g. 3,00,000"
            className="w-full pl-8 pr-4 py-3 text-lg border-2 border-gray-200 rounded-xl focus:border-[#1a7a4a] focus:outline-none transition-colors"
            autoFocus
          />
        </div>
      )
    },
    {
      section: "Liabilities",
      title: "Outstanding Debt",
      question: "What is your total outstanding loan/debt amount?",
      description: "Enter 0 if you are debt-free.",
      input: (
        <div className="relative mt-4">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">₹</span>
          <input 
            type="number" 
            value={loans} 
            onChange={(e) => setLoans(e.target.value)} 
            placeholder="e.g. 5,00,000"
            className="w-full pl-8 pr-4 py-3 text-lg border-2 border-gray-200 rounded-xl focus:border-[#1a7a4a] focus:outline-none transition-colors"
            autoFocus
          />
        </div>
      )
    },
    {
      section: "Strategy",
      title: "Risk Appetite",
      question: "How would you describe your investment style?",
      description: "This helps us tailor your portfolio recommendations.",
      input: (
        <div className="flex flex-col gap-3 mt-4">
          <button 
            onClick={() => setRisk('conservative')}
            className={`p-4 text-left border-2 rounded-xl transition-all ${risk === 'conservative' ? 'border-[#1a7a4a] bg-[#f0faf4]' : 'border-gray-200 hover:border-gray-300'}`}
          >
            <div className="font-semibold text-gray-900">Conservative</div>
            <div className="text-sm text-gray-500">I prefer safety over high returns. (FDs, Bonds)</div>
          </button>
          <button 
            onClick={() => setRisk('moderate')}
            className={`p-4 text-left border-2 rounded-xl transition-all ${risk === 'moderate' ? 'border-[#1a7a4a] bg-[#f0faf4]' : 'border-gray-200 hover:border-gray-300'}`}
          >
            <div className="font-semibold text-gray-900">Moderate</div>
            <div className="text-sm text-gray-500">I want balanced growth with some risk. (Mutual Funds)</div>
          </button>
          <button 
            onClick={() => setRisk('aggressive')}
            className={`p-4 text-left border-2 rounded-xl transition-all ${risk === 'aggressive' ? 'border-[#1a7a4a] bg-[#f0faf4]' : 'border-gray-200 hover:border-gray-300'}`}
          >
            <div className="font-semibold text-gray-900">Aggressive</div>
            <div className="text-sm text-gray-500">I want maximum growth and can handle volatility. (Stocks, Crypto)</div>
          </button>
        </div>
      )
    }
  ];

  const currentStep = steps[step];

  return (
    <div className="fixed inset-0 bg-gray-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full p-8 shadow-xl">
        <div className="mb-8">
          <div className="flex gap-2 mb-6">
            {steps.map((_, i) => (
              <div key={i} className={`h-1.5 flex-1 rounded-full ${i <= step ? 'bg-[#1a7a4a]' : 'bg-gray-200'}`} />
            ))}
          </div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2 py-0.5 bg-[#f0faf4] text-[#1a7a4a] text-[10px] font-bold uppercase tracking-wider rounded">
              {currentStep.section}
            </span>
            <span className="text-gray-400 text-xs">Step {step + 1} of {steps.length}</span>
          </div>
          <h2 className="text-sm font-bold tracking-wider text-gray-500 uppercase mb-1">{currentStep.title}</h2>
          <h3 className="text-2xl font-semibold text-gray-900 mb-2">{currentStep.question}</h3>
          <p className="text-gray-500 text-sm">{currentStep.description}</p>
        </div>

        {currentStep.input}

        <div className="mt-8 flex justify-between items-center">
          <button 
            onClick={() => setStep(Math.max(0, step - 1))}
            className={`text-gray-500 font-medium px-4 py-2 hover:text-gray-900 ${step === 0 ? 'invisible' : ''}`}
          >
            Back
          </button>
          <button 
            onClick={handleNext}
            disabled={step === steps.length - 1 && !risk}
            className="bg-[#1a7a4a] text-white px-8 py-3 rounded-xl font-semibold hover:bg-[#145c37] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {step === steps.length - 1 ? 'Complete Setup' : 'Continue'}
          </button>
        </div>
      </div>
    </div>
  );
}
