import React, { useState, useEffect, useRef } from 'react';
import { signInWithPopup, onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db, googleProvider } from './firebase';
import { UserProfile } from './types';
import { parser } from './parser';
import { finance } from './finance';
import { insights } from './insights';
import { Portfolio } from './components/Portfolio';
import { OnboardingQuiz } from './components/OnboardingQuiz';
import { FinancialSourceEditor } from './components/FinancialSourceEditor';
import { investments } from './investments';

const DEFAULT_PROFILE: UserProfile = {
  income: 0,
  incomeSources: [],
  expenses: 0,
  expenseCategories: [],
  savings: 0,
  loans: [],
  assets: { property: [], gold: 0, cash: 0, stocks: [], crypto: [], other: [] },
  subscriptions: [],
  goals: [],
  riskProfile: null,
  onboardingCompleted: false,
  lastUpdated: null
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE);
  const [chatHistory, setChatHistory] = useState<{ role: string; content: string; updates?: string[] }[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        setLoginError(null);
        await loadProfile(currentUser.uid);
      }
    });
    return () => unsubscribe();
  }, []);

  // Add welcome message after profile loads if chat is empty
  useEffect(() => {
    if (user && profile.onboardingCompleted && chatHistory.length === 0) {
      const welcomeMsg = `**Welcome back to PapaProfit, ${user.displayName?.split(' ')[0]}! 👋**\n\nI'm ready to help you manage your finances. Your current net worth is **₹${finance.netWorth(profile).toLocaleString('en-IN')}**.\n\nWhat would you like to focus on today?`;
      setChatHistory([{ role: 'ai', content: welcomeMsg }]);
    }
  }, [user, profile.onboardingCompleted, chatHistory.length]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, isTyping]);

  const loadProfile = async (uid: string) => {
    try {
      const docRef = doc(db, 'users', uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.profile) {
          const loadedProfile = data.profile as UserProfile;
          // Fetch live prices for stocks
          if (loadedProfile.assets.stocks && loadedProfile.assets.stocks.length > 0) {
            const updatedStocks = await Promise.all(loadedProfile.assets.stocks.map(async (stock) => {
              try {
                const res = await fetch(`/api/stock/quote?symbol=${stock.symbol}`);
                if (res.ok) {
                  const quote = await res.json();
                  if (quote && quote.regularMarketPrice) {
                    return { ...stock, currentPrice: quote.regularMarketPrice };
                  }
                }
              } catch (e) {
                console.error("Failed to fetch price for", stock.symbol);
              }
              return stock;
            }));
            loadedProfile.assets.stocks = updatedStocks;
          }
          setProfile(loadedProfile);
        }
      }
    } catch (error) {
      console.error("Error loading profile:", error);
    }
  };

  const saveProfile = async (newProfile: UserProfile) => {
    if (!user) return;
    try {
      await setDoc(doc(db, 'users', user.uid), {
        name: user.displayName,
        email: user.email,
        profile: newProfile,
        lastUpdated: new Date().toISOString()
      }, { merge: true });
    } catch (error) {
      console.error("Error saving profile:", error);
    }
  };

  const handleLogin = async () => {
    try {
      setLoginError(null);
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      console.error("Login failed:", error);
      if (error.code === 'auth/popup-blocked') {
        setLoginError("Popup blocked. Please allow popups or open in a new tab.");
      } else if (error.code === 'auth/unauthorized-domain') {
        setLoginError("Domain not authorized. Add this URL to 'Authorized domains' in Firebase Console.");
      } else {
        setLoginError("Login failed: " + (error.message || "Unknown error"));
      }
    }
  };

  const formatAIResponse = (text: string) => {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n\n/g, '<br><br>')
      .replace(/\n/g, '<br>')
      .replace(/^• /gm, '&bull; ')
      .replace(/^\d+\. /gm, m => m);
  };

  const fmt = (n: number) => {
    if (!n || isNaN(n)) return '₹0';
    const abs = Math.round(Math.abs(n));
    const sign = n < 0 ? '-' : '';
    if (abs >= 10000000) return sign + '₹' + (abs / 10000000).toFixed(2) + ' Cr';
    if (abs >= 100000) return sign + '₹' + (abs / 100000).toFixed(2) + ' L';
    return sign + '₹' + abs.toLocaleString('en-IN');
  };

  const handleSend = async (text: string = input) => {
    if (!text.trim()) return;
    
    const userMsg = text.trim();
    setInput('');
    setShowSuggestions(false);
    
    // 1. Add user message
    const newHistory = [...chatHistory, { role: 'user', content: userMsg }];
    setChatHistory(newHistory);
    
    // 2. Parse message & update profile
    const parsed = await parser.parse(userMsg, profile);
    
    if (parsed && parsed.updates && parsed.updates.length > 0) {
      setProfile(parsed.newProfile);
      await saveProfile(parsed.newProfile);
    }
    
    // 3. Show typing indicator
    setIsTyping(true);
    
    // 4. Generate AI response
    const reply = await insights.generateResponse(userMsg, parsed, parsed?.newProfile || profile, newHistory);
    
    // 5. Add AI response
    setIsTyping(false);
    setChatHistory(prev => [...prev, { role: 'ai', content: reply, updates: parsed.updates }]);
  };

  if (!user) {
    return (
      <div id="loginScreen">
        <div className="logo-wrap">
          <h1>PapaProfit</h1>
          <p>Your AI-powered financial operating system</p>
        </div>
        <div className="login-card">
          <h2>Welcome back</h2>
          <p>Sign in to access your financial dashboard and AI advisor.</p>
          {loginError && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-xs p-3 rounded-lg mb-4 text-left">
              <strong>Login Error:</strong> {loginError}
            </div>
          )}
          <button className="google-btn" onClick={handleLogin}>
            <svg width="20" height="20" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
            Continue with Google
          </button>
        </div>
      </div>
    );
  }

  if (!profile.onboardingCompleted) {
    return (
      <OnboardingQuiz 
        profile={profile} 
        onComplete={(updatedProfile) => {
          setProfile(updatedProfile);
          saveProfile(updatedProfile);
          
          // Add a personalized welcome message based on their quiz answers
          const welcomeMsg = `**Welcome to PapaProfit, ${user.displayName?.split(' ')[0]}! 👋**\n\nI've analyzed your initial profile. Your net worth is **₹${finance.netWorth(updatedProfile).toLocaleString('en-IN')}** and your monthly surplus is **₹${finance.surplus(updatedProfile).toLocaleString('en-IN')}**.\n\nI'm your personal AI financial advisor. You can ask me anything about your finances, like:\n• "How can I improve my savings rate?"\n• "I want to buy a house in 5 years"\n• "Should I invest in mutual funds?"\n\nWhat would you like to focus on first?`;
          setChatHistory([{ role: 'ai', content: welcomeMsg }]);
        }} 
      />
    );
  }

  const fhsScore = finance.fhs(profile);
  const fhsInfo = finance.fhsLabel(fhsScore);
  const nw = finance.netWorth(profile);
  const surplus = finance.surplus(profile);
  const sr = finance.savingsRate(profile);
  const dr = finance.debtRatio(profile);
  const nudges = finance.generateNudges(profile);
  const recs = investments.generateRecommendations(profile);

  return (
    <div id="appShell">
      <div className="topbar">
        <div className="topbar-logo">PapaProfit</div>
        <div className="topbar-right">
          <div className="fhs-badge" onClick={() => setShowProfile(!showProfile)}>
            <div className="fhs-dot" style={{ background: fhsInfo.cls === 'good' ? '#1a7a4a' : fhsInfo.cls === 'ok' ? '#d4851a' : '#c0392b' }}></div>
            <span>FHS: <strong>{fhsScore !== null ? fhsScore : '--'}</strong></span>
          </div>
          <div className="topbar-user">
            <span>{user.displayName}</span>
            <div className="avatar">{user.displayName?.charAt(0).toUpperCase()}</div>
          </div>
        </div>
      </div>

      <div className="app-layout">
        {/* SIDEBAR */}
        <div className="sidebar">
          <div className="sidebar-section">
            <div className="sidebar-title">Financial Health Score</div>
            <div className="fhs-circle-wrap">
              <div className={`fhs-circle ${fhsInfo.cls}`}>
                <div className="fhs-num">{fhsScore !== null ? fhsScore : '--'}</div>
                <div className="fhs-label">/ 100</div>
              </div>
              <div className="fhs-desc">{fhsInfo.label || 'Chat to get your score'}</div>
            </div>
          </div>

          <div className="sidebar-section">
            <div className="sidebar-title">Key Metrics</div>
            <div className="metric-card">
              <div className="metric-label">Net Worth</div>
              <div className={`metric-value ${nw >= 0 ? 'green' : 'red'}`}>{fhsScore !== null ? fmt(nw) : '--'}</div>
            </div>
            <div className="metric-card">
              <div className="metric-label">Monthly Surplus</div>
              <div className={`metric-value ${surplus >= 0 ? 'green' : 'red'}`}>{profile.income > 0 ? fmt(surplus) : '--'}</div>
            </div>
            <div className="metric-card">
              <div className="metric-label">Savings Rate</div>
              <div className={`metric-value ${sr >= 20 ? 'green' : sr >= 10 ? 'amber' : 'red'}`}>{profile.income > 0 ? `${sr.toFixed(1)}%` : '--'}</div>
            </div>
            <div className="metric-card">
              <div className="metric-label">Debt Ratio</div>
              <div className={`metric-value ${dr <= 3 ? 'green' : dr <= 6 ? 'amber' : 'red'}`}>{profile.income > 0 ? `${dr.toFixed(1)}x` : '--'}</div>
            </div>
          </div>

          {profile.goals.length > 0 && (
            <div className="sidebar-section">
              <div className="sidebar-title">Goals</div>
              {profile.goals.map((g, i) => {
                const monthly = finance.goalMonthlyNeeded(g);
                const pct = g.target > 0 ? Math.round((g.saved / g.target) * 100) : 0;
                return (
                  <div key={i} className="goal-card">
                    <div className="goal-name">{g.name}</div>
                    <div className="goal-progress"><div className="goal-progress-fill" style={{ width: `${pct}%` }}></div></div>
                    <div className="goal-detail">{g.target > 0 ? `${fmt(g.target)} target` : 'Set a target amount'} {monthly > 0 ? `· Save ${fmt(monthly)}/mo` : ''}</div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="sidebar-section">
            <div className="sidebar-title">Insights</div>
            <div>
              {nudges.length > 0 ? nudges.map((n, i) => <div key={i} className="nudge">{n}</div>) : <div style={{ fontSize: '13px', color: '#aaa', padding: '4px' }}>Chat to unlock insights</div>}
            </div>
          </div>

          <div className="sidebar-section">
            <div className="sidebar-title">Investment Recommendations</div>
            {profile.isPremium ? (
              <div>
                {recs.length > 0 ? recs.map((r, i) => <div key={i} className="nudge" dangerouslySetInnerHTML={{ __html: formatAIResponse(r) }}></div>) : <div style={{ fontSize: '13px', color: '#aaa', padding: '4px' }}>Add income to get recommendations</div>}
              </div>
            ) : (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
                <div className="text-2xl mb-2">🔒</div>
                <h4 className="text-sm font-semibold text-gray-900 mb-1">Premium Feature</h4>
                <p className="text-xs text-gray-500 mb-3">Upgrade to Pro to unlock personalized investment strategies.</p>
                <button onClick={() => setShowPremiumModal(true)} className="bg-[#1a7a4a] text-white text-xs font-medium px-4 py-1.5 rounded-full hover:bg-[#145c37] transition-colors">
                  Unlock Pro
                </button>
              </div>
            )}
          </div>

          {!profile.isPremium && (
            <div className="premium-lock">
              <p>🔒 Advanced analytics, tax optimisation & investment tracking</p>
              <button className="premium-btn" onClick={() => setShowPremiumModal(true)}>Upgrade to Pro</button>
            </div>
          )}
        </div>

        {/* CHAT AREA */}
        <div className="chat-area">
          <div className="chat-header">
            <h2>Your AI Financial Advisor</h2>
            <p>Tell me about your finances — income, expenses, loans, goals, anything.</p>
          </div>

          <div className="chat-messages">
            {chatHistory.map((msg, i) => (
              <div key={i} className={`msg ${msg.role}`}>
                <div className="msg-avatar">{msg.role === 'user' ? user.displayName?.charAt(0).toUpperCase() : 'AI'}</div>
                <div className="msg-bubble">
                  <div dangerouslySetInnerHTML={{ __html: formatAIResponse(msg.content) }} />
                  {msg.updates && msg.updates.length > 0 && (
                    <div className="profile-update">✓ Profile updated: {msg.updates.join(' · ')}</div>
                  )}
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="msg ai">
                <div className="msg-avatar">AI</div>
                <div className="msg-bubble">
                  <div className="typing-dots"><span></span><span></span><span></span></div>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {showSuggestions && (
            <div className="suggestions">
              <div className="sug" onClick={() => handleSend('I earn ₹60,000/month')}>I earn ₹60,000/month</div>
              <div className="sug" onClick={() => handleSend('I have a home loan of ₹20 lakh')}>I have a home loan of ₹20 lakh</div>
              <div className="sug" onClick={() => handleSend('I want to buy a house in 5 years')}>I want to buy a house in 5 years</div>
              <div className="sug" onClick={() => handleSend('Should I start a business?')}>Should I start a business?</div>
            </div>
          )}

          <div className="chat-input-wrap">
            <div className="chat-input-row">
              <input 
                type="text" 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type anything about your finances..." 
                onKeyDown={(e) => { if (e.key === 'Enter') handleSend(); }}
                disabled={isTyping}
              />
              <button className="send-btn" onClick={() => handleSend()} disabled={isTyping || !input.trim()}>➤</button>
            </div>
          </div>
        </div>
      </div>

      {/* PROFILE PANEL */}
      {showProfile && (
        <div id="profilePanel" style={{ display: 'block' }}>
          <h3>Financial Profile <button className="close-btn" onClick={() => setShowProfile(false)}>✕</button></h3>
          <div>
            <div className="profile-section">
              <FinancialSourceEditor 
                title="Income Sources" 
                sources={profile.incomeSources || []} 
                type="income"
                onUpdate={(newSources) => {
                  const total = newSources.reduce((acc, s) => acc + s.value, 0);
                  const newProfile = { ...profile, incomeSources: newSources, income: total };
                  setProfile(newProfile);
                  saveProfile(newProfile);
                }}
              />
              <FinancialSourceEditor 
                title="Expense Categories" 
                sources={profile.expenseCategories || []} 
                type="expense"
                onUpdate={(newSources) => {
                  const total = newSources.reduce((acc, s) => acc + s.value, 0);
                  const newProfile = { ...profile, expenseCategories: newSources, expenses: total };
                  setProfile(newProfile);
                  saveProfile(newProfile);
                }}
              />
              <div className="profile-row"><span className="key">Monthly Savings</span><span className="val">{fmt(profile.savings)}</span></div>
            </div>
            <div className="profile-section">
              <h4>Assets ({fmt(finance.totalAssets(profile))})</h4>
              {profile.assets.property.map((p, i) => <div key={i} className="profile-row"><span className="key">{p.name}</span><span className="val">{fmt(p.value)}</span></div>)}
              {profile.assets.gold > 0 && <div className="profile-row"><span className="key">Gold</span><span className="val">{fmt(profile.assets.gold)}</span></div>}
              {profile.assets.cash > 0 && <div className="profile-row"><span className="key">Cash/Bank</span><span className="val">{fmt(profile.assets.cash)}</span></div>}
              {profile.assets.crypto?.map((c, i) => <div key={`c-${i}`} className="profile-row"><span className="key">{c.name}</span><span className="val">{fmt(c.value)}</span></div>)}
              {profile.assets.other.map((p, i) => <div key={`o-${i}`} className="profile-row"><span className="key">{p.name}</span><span className="val">{fmt(p.value)}</span></div>)}
              {finance.totalAssets(profile) === 0 && <div className="profile-row"><span className="key" style={{ color: '#ccc' }}>None added yet</span></div>}
              
              <div className="mt-4">
                <Portfolio profile={profile} onUpdate={(newProfile) => {
                  setProfile(newProfile);
                  saveProfile(newProfile);
                }} />
              </div>
            </div>
            <div className="profile-section">
              <h4>Liabilities ({fmt(finance.totalLiabilities(profile))})</h4>
              {profile.loans.map((l, i) => <div key={i} className="profile-row"><span className="key">{l.name}</span><span className="val" style={{ color: '#c0392b' }}>{fmt(l.amount)}{l.rate ? ` @ ${l.rate}%` : ''}</span></div>)}
              {profile.loans.length === 0 && <div className="profile-row"><span className="key" style={{ color: '#ccc' }}>None added yet</span></div>}
            </div>
            <div className="profile-section">
              <h4>Goals</h4>
              {profile.goals.map((g, i) => <div key={i} className="profile-row"><span className="key">{g.name}</span><span className="val">{g.target > 0 ? fmt(g.target) : 'No target set'}</span></div>)}
              {profile.goals.length === 0 && <div className="profile-row"><span className="key" style={{ color: '#ccc' }}>No goals yet</span></div>}
            </div>
            <div className="profile-section">
              <h4>Risk Profile</h4>
              <div className="profile-row"><span className="key">Appetite</span><span className="val">{profile.riskProfile ? profile.riskProfile.charAt(0).toUpperCase() + profile.riskProfile.slice(1) : 'Not set'}</span></div>
            </div>
          </div>
        </div>
      )}
      {/* PREMIUM MODAL */}
      {showPremiumModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-900">PapaProfit Pro</h3>
              <button onClick={() => setShowPremiumModal(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            
            <div className="space-y-4 mb-8">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-[#e8f5ee] text-[#1a7a4a] flex items-center justify-center shrink-0 mt-0.5">✓</div>
                <div>
                  <h4 className="font-semibold text-gray-900">Personalized Investment Strategies</h4>
                  <p className="text-sm text-gray-500">Get AI-driven recommendations based on your risk profile and goals.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-[#e8f5ee] text-[#1a7a4a] flex items-center justify-center shrink-0 mt-0.5">✓</div>
                <div>
                  <h4 className="font-semibold text-gray-900">Advanced Tax Optimization</h4>
                  <p className="text-sm text-gray-500">Discover ways to save on taxes legally and efficiently.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-[#e8f5ee] text-[#1a7a4a] flex items-center justify-center shrink-0 mt-0.5">✓</div>
                <div>
                  <h4 className="font-semibold text-gray-900">Live Portfolio Tracking</h4>
                  <p className="text-sm text-gray-500">Monitor your stocks and assets in real-time.</p>
                </div>
              </div>
            </div>
            
            <div className="bg-gray-50 rounded-xl p-4 mb-6 border border-gray-100">
              <div className="flex justify-between items-center mb-2">
                <span className="font-medium text-gray-900">Pro Plan</span>
                <span className="font-bold text-xl text-gray-900">₹499<span className="text-sm font-normal text-gray-500">/mo</span></span>
              </div>
              <p className="text-xs text-gray-500">Cancel anytime. Billed monthly.</p>
            </div>
            
            <button 
              onClick={() => {
                const newProfile = { ...profile, isPremium: true };
                setProfile(newProfile);
                saveProfile(newProfile);
                setShowPremiumModal(false);
                setChatHistory(prev => [...prev, { role: 'ai', content: '🎉 **Welcome to PapaProfit Pro!** You now have access to personalized investment recommendations and advanced analytics. Let me know if you want to explore your new features!' }]);
              }}
              className="w-full bg-[#1a7a4a] text-white py-3 rounded-xl font-semibold hover:bg-[#145c37] transition-colors"
            >
              Upgrade Now
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
