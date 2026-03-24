import React, { useState } from 'react';
import { FinancialSource, UserProfile } from '../types';

interface FinancialSourceEditorProps {
  title: string;
  sources: FinancialSource[];
  onUpdate: (newSources: FinancialSource[]) => void;
  type: 'income' | 'expense';
}

export function FinancialSourceEditor({ title, sources, onUpdate, type }: FinancialSourceEditorProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newValue, setNewValue] = useState('');

  const handleAdd = () => {
    if (!newName || !newValue) return;
    const val = parseFloat(newValue);
    if (isNaN(val) || val <= 0) return;

    const newSources = [...sources, { name: newName, value: val }];
    onUpdate(newSources);
    setNewName('');
    setNewValue('');
    setIsAdding(false);
  };

  const handleRemove = (index: number) => {
    const newSources = sources.filter((_, i) => i !== index);
    onUpdate(newSources);
  };

  const fmt = (n: number) => '₹' + n.toLocaleString('en-IN');

  return (
    <div className="mb-6">
      <div className="flex justify-between items-center mb-3">
        <h4 className="text-xs font-bold uppercase tracking-widest text-[#1a7a4a]">{title}</h4>
        <button 
          onClick={() => setIsAdding(!isAdding)}
          className="text-[10px] font-bold uppercase tracking-wider text-[#1a7a4a] hover:underline"
        >
          {isAdding ? 'Cancel' : '+ Add Source'}
        </button>
      </div>

      <div className="space-y-2">
        {sources.map((source, i) => (
          <div key={i} className="flex justify-between items-center text-sm py-1 border-b border-gray-50 last:border-0">
            <span className="text-gray-500">{source.name}</span>
            <div className="flex items-center gap-3">
              <span className="font-semibold text-gray-900">{fmt(source.value)}</span>
              <button onClick={() => handleRemove(i)} className="text-red-400 hover:text-red-600">✕</button>
            </div>
          </div>
        ))}
        {sources.length === 0 && !isAdding && (
          <div className="text-xs text-gray-400 italic">No {type} sources added yet.</div>
        )}
      </div>

      {isAdding && (
        <div className="mt-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
          <div className="grid grid-cols-2 gap-2 mb-2">
            <input 
              type="text" 
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Name (e.g. Salary)"
              className="px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-[#1a7a4a]"
            />
            <input 
              type="number" 
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              placeholder="Amount (₹)"
              className="px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-[#1a7a4a]"
            />
          </div>
          <button 
            onClick={handleAdd}
            className="w-full bg-[#1a7a4a] text-white text-[10px] font-bold uppercase py-2 rounded-lg hover:bg-[#145c37] transition-colors"
          >
            Confirm Add
          </button>
        </div>
      )}
    </div>
  );
}
