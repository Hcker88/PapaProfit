import React, { useState } from 'react';
import { UserProfile } from '../types';

interface OnboardingQuizProps {
  profile: UserProfile;
  onComplete: (updatedProfile: UserProfile) => void;
}

export function OnboardingQuiz({ profile, onComplete }: OnboardingQuizProps) {
  const [step, setStep] = useState(0);
  
  // Income states
  const [salary, setSalary] = useState('');
  const [bonuses, setBonuses] = useState('');
  const [sideIncome, setSideIncome] = useState('');
  
  // Expense states
  const [rent, setRent] = useState('');
  const [groceries, setGroceries] = useState('');
  const [bills, setBills] = useState('');
  const [lifestyle, setLifestyle] = useState('');
  
  // Other states
  const [savings, setSavings] = useState('');
  const [investments, setInvestments] = useState('');
  const [loans, setLoans] = useState('');
  const [risk, setRisk] = useState<'conservative' | 'moderate' | 'aggressive' | null>(null);

  const handleNext = () => {
    if (step < 10) {
      setStep(step + 1);
    } else {
      // Finish onboarding
      const totalIncome = (parseFloat(salary) || 0) + (parseFloat(bonuses) || 0) + (parseFloat(sideIncome) || 0);
      const totalExpenses = (parseFloat(rent) || 0) + (parseFloat(groceries) || 0) + (parseFloat(bills) || 0) + (parseFloat(lifestyle) || 0);
      
      const newProfile = { ...profile };
      newProfile.income = totalIncome;
      newProfile.expenses = totalExpenses;
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
      section: "Income",
      title: "Primary Salary",
      question: "What is your monthly take-home salary?",
      description: "Your regular monthly income after all deductions.",
      input: (
        <div className="relative mt-4">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">₹</span>
          <input 
            type="number" 
            value={salary} 
            onChange={(e) => setSalary(e.target.value)} 
            placeholder="e.g. 60,000"
            className="w-full pl-8 pr-4 py-3 text-lg border-2 border-gray-200 rounded-xl focus:border-[#1a7a4a] focus:outline-none transition-colors"
            autoFocus
          />
        </div>
      )
    },
    {
      section: "Income",
      title: "Bonuses & Incentives",
      question: "What is your average monthly bonus or incentive?",
      description: "Enter 0 if not applicable.",
      input: (
        <div className="relative mt-4">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">₹</span>
          <input 
            type="number" 
            value={bonuses} 
            onChange={(e) => setBonuses(e.target.value)} 
            placeholder="e.g. 5,000"
            className="w-full pl-8 pr-4 py-3 text-lg border-2 border-gray-200 rounded-xl focus:border-[#1a7a4a] focus:outline-none transition-colors"
            autoFocus
          />
        </div>
      )
    },
    {
      section: "Income",
      title: "Side Income",
      question: "Do you have any other monthly side income?",
      description: "Freelancing, rentals, or other sources.",
      input: (
        <div className="relative mt-4">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">₹</span>
          <input 
            type="number" 
            value={sideIncome} 
            onChange={(e) => setSideIncome(e.target.value)} 
            placeholder="e.g. 10,000"
            className="w-full pl-8 pr-4 py-3 text-lg border-2 border-gray-200 rounded-xl focus:border-[#1a7a4a] focus:outline-none transition-colors"
            autoFocus
          />
        </div>
      )
    },
    {
      section: "Expenses",
      title: "Rent & Housing",
      question: "What is your monthly rent or home EMI?",
      description: "Include maintenance or property taxes if applicable.",
      input: (
        <div className="relative mt-4">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">₹</span>
          <input 
            type="number" 
            value={rent} 
            onChange={(e) => setRent(e.target.value)} 
            placeholder="e.g. 20,000"
            className="w-full pl-8 pr-4 py-3 text-lg border-2 border-gray-200 rounded-xl focus:border-[#1a7a4a] focus:outline-none transition-colors"
            autoFocus
          />
        </div>
      )
    },
    {
      section: "Expenses",
      title: "Groceries & Food",
      question: "How much do you spend on groceries and dining out?",
      description: "Average monthly spend on food and household essentials.",
      input: (
        <div className="relative mt-4">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">₹</span>
          <input 
            type="number" 
            value={groceries} 
            onChange={(e) => setGroceries(e.target.value)} 
            placeholder="e.g. 8,000"
            className="w-full pl-8 pr-4 py-3 text-lg border-2 border-gray-200 rounded-xl focus:border-[#1a7a4a] focus:outline-none transition-colors"
            autoFocus
          />
        </div>
      )
    },
    {
      section: "Expenses",
      title: "Utility Bills",
      question: "What are your average monthly utility bills?",
      description: "Electricity, water, internet, and mobile.",
      input: (
        <div className="relative mt-4">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">₹</span>
          <input 
            type="number" 
            value={bills} 
            onChange={(e) => setBills(e.target.value)} 
            placeholder="e.g. 4,000"
            className="w-full pl-8 pr-4 py-3 text-lg border-2 border-gray-200 rounded-xl focus:border-[#1a7a4a] focus:outline-none transition-colors"
            autoFocus
          />
        </div>
      )
    },
    {
      section: "Expenses",
      title: "Lifestyle & Misc",
      question: "How much do you spend on lifestyle and leisure?",
      description: "Shopping, travel, entertainment, and hobbies.",
      input: (
        <div className="relative mt-4">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">₹</span>
          <input 
            type="number" 
            value={lifestyle} 
            onChange={(e) => setLifestyle(e.target.value)} 
            placeholder="e.g. 8,000"
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
    <div className="fixed inset-0 bg-gray-50/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-10 shadow-2xl border border-gray-100">
        <div className="mb-10">
          <div className="flex gap-1.5 mb-8">
            {steps.map((_, i) => (
              <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-500 ${i <= step ? 'bg-[#1a7a4a]' : 'bg-gray-100'}`} />
            ))}
          </div>
          
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 bg-[#f0faf4] text-[#1a7a4a] text-[10px] font-bold uppercase tracking-widest rounded-md">
                {currentStep.section}
              </span>
              <span className="text-gray-400 text-xs font-medium">Step {step + 1} of {steps.length}</span>
            </div>
          </div>
          
          <h2 className="text-xs font-bold tracking-[0.2em] text-gray-400 uppercase mb-3">{currentStep.title}</h2>
          <h3 className="text-3xl font-bold text-gray-900 leading-tight mb-3">{currentStep.question}</h3>
          <p className="text-gray-500 text-base leading-relaxed">{currentStep.description}</p>
        </div>

        <div className="min-h-[120px] flex flex-col justify-center">
          {currentStep.input}
        </div>

        <div className="mt-12 flex justify-between items-center pt-8 border-t border-gray-50">
          <button 
            onClick={() => setStep(Math.max(0, step - 1))}
            className={`text-gray-400 font-semibold text-sm px-6 py-3 rounded-xl hover:text-gray-900 hover:bg-gray-50 transition-all ${step === 0 ? 'invisible' : ''}`}
          >
            Back
          </button>
          <button 
            onClick={handleNext}
            disabled={step === steps.length - 1 && !risk}
            className="bg-[#1a7a4a] text-white px-10 py-4 rounded-2xl font-bold text-lg shadow-lg shadow-green-900/10 hover:bg-[#145c37] hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
          >
            {step === steps.length - 1 ? 'Complete Setup' : 'Continue'}
          </button>
        </div>
      </div>
    </div>
  );
}
