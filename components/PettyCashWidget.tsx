import React, { useState, useEffect } from 'react';
import { Coins, Plus, Minus, ChevronDown, ChevronUp, History, Trash2, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import { Currency, CashTransaction } from '../types';
import { translations, Language } from '../translations';

interface PettyCashWidgetProps {
  lang: Language;
}

const STORAGE_KEY = 'hotel_petty_cash';

export const PettyCashWidget: React.FC<PettyCashWidgetProps> = ({ lang }) => {
  const t = translations[lang];
  const [expanded, setExpanded] = useState(false);
  const [transactions, setTransactions] = useState<CashTransaction[]>([]);
  
  // Form State
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<Currency>(Currency.VND);
  const [description, setDescription] = useState('');
  const [type, setType] = useState<'IN' | 'OUT'>('IN');

  // Load data
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setTransactions(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse petty cash data");
      }
    } else {
        // Init with some mock data if empty
        const initialData: CashTransaction[] = [
            { id: '1', amount: 500000, currency: Currency.VND, description: 'Opening Balance', date: new Date().toISOString(), type: 'IN' }
        ];
        setTransactions(initialData);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(initialData));
    }
  }, []);

  const handleAdd = () => {
    if (!amount || !description) return;
    
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) return;

    const newTx: CashTransaction = {
      id: Date.now().toString(),
      amount: numAmount,
      currency,
      description,
      date: new Date().toISOString(),
      type: type
    };

    const updated = [newTx, ...transactions];
    setTransactions(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    
    // Reset Form
    setAmount('');
    setDescription('');
    // Keep currency and type as they might be adding multiple similar items
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = transactions.filter(t => t.id !== id);
    setTransactions(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  // Calculate Balances
  const balances = transactions.reduce((acc, tx) => {
    if (!acc[tx.currency]) acc[tx.currency] = 0;
    acc[tx.currency] += tx.type === 'IN' ? tx.amount : -tx.amount;
    return acc;
  }, {} as Record<Currency, number>);

  const getDecimals = (curr: Currency) => {
      return [Currency.VND, Currency.JPY, Currency.KRW].includes(curr) ? 0 : 2;
  }

  const formatMoney = (amount: number, curr: Currency) => {
    return new Intl.NumberFormat(lang === 'vi' ? 'vi-VN' : 'en-US', {
      style: 'currency',
      currency: curr,
      minimumFractionDigits: getDecimals(curr),
      maximumFractionDigits: getDecimals(curr)
    }).format(amount);
  };

  // Get only currencies that have a balance (or have active transaction history, but usually just balance)
  const activeCurrencies = (Object.entries(balances) as [Currency, number][]).filter(([_, val]) => val !== 0);

  return (
    <div className="mb-6 border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
      <div 
        onClick={() => setExpanded(!expanded)}
        className="p-4 flex items-center justify-between cursor-pointer bg-white hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-2 font-bold text-slate-900">
          <div className="p-1.5 bg-emerald-100 text-emerald-700 rounded-lg">
             <Coins className="w-4 h-4" />
          </div>
          {t.pettyCash.title}
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
      </div>

      {/* Summary View (Always Visible if not expanded, but let's show main currency balance) */}
      {!expanded && (
        <div className="px-4 pb-4 bg-white" onClick={() => setExpanded(true)}>
             <div className="text-2xl font-mono font-bold text-emerald-600">
                {balances[Currency.VND] ? formatMoney(balances[Currency.VND], Currency.VND) : '0 ₫'}
             </div>
             {activeCurrencies.length > 1 && (
                 <div className="text-xs text-slate-500 mt-1 font-medium">
                     + {activeCurrencies.length - 1} other currencies
                 </div>
             )}
        </div>
      )}

      {/* Expanded View */}
      {expanded && (
        <div className="p-4 border-t border-slate-100 animate-in slide-in-from-top-2">
            
            {/* Balances List */}
            <div className="mb-4 space-y-2">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{t.pettyCash.balance}</h4>
                {activeCurrencies.length > 0 ? (
                    activeCurrencies.map(([curr, val]) => (
                        <div key={curr} className="flex justify-between items-center text-sm">
                            <span className="font-bold text-slate-800">{curr}</span>
                            <span className={`font-mono font-medium ${val < 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                                {formatMoney(val, curr as Currency)}
                            </span>
                        </div>
                    ))
                ) : (
                    <div className="text-sm text-slate-400 italic">0</div>
                )}
            </div>

            {/* Add Transaction Form */}
            <div className="mb-4 bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{t.pettyCash.add}</h4>
                
                {/* Type Toggle */}
                <div className="flex bg-slate-50 rounded-lg p-1 border border-slate-200 mb-2">
                    <button 
                        onClick={() => setType('IN')}
                        className={`flex-1 flex items-center justify-center gap-1 py-1 text-xs font-bold rounded-md transition-colors ${type === 'IN' ? 'bg-emerald-100 text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <ArrowDownCircle className="w-3 h-3" /> {t.pettyCash.income}
                    </button>
                    <button 
                        onClick={() => setType('OUT')}
                        className={`flex-1 flex items-center justify-center gap-1 py-1 text-xs font-bold rounded-md transition-colors ${type === 'OUT' ? 'bg-rose-100 text-rose-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <ArrowUpCircle className="w-3 h-3" /> {t.pettyCash.expense}
                    </button>
                </div>

                <div className="space-y-2">
                    <div className="flex gap-2">
                         <input 
                            type="number" 
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder="0"
                            className="w-2/3 p-2 border border-slate-300 rounded text-sm focus:outline-none focus:border-indigo-500 font-mono bg-white text-slate-900 placeholder-slate-400"
                         />
                         <select 
                            value={currency}
                            onChange={(e) => setCurrency(e.target.value as Currency)}
                            className="w-1/3 p-2 border border-slate-300 rounded text-xs font-bold focus:outline-none focus:border-indigo-500 bg-white text-slate-900"
                         >
                             {Object.values(Currency).map(c => <option key={c} value={c}>{c}</option>)}
                         </select>
                    </div>
                    <input 
                        type="text"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder={t.pettyCash.descPlaceholder}
                        className="w-full p-2 border border-slate-300 rounded text-sm focus:outline-none focus:border-indigo-500 bg-white text-slate-900 placeholder-slate-400"
                    />
                    <button 
                        onClick={handleAdd}
                        disabled={!amount || !description}
                        className={`w-full py-2 text-white rounded text-xs font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                            ${type === 'IN' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'}
                        `}
                    >
                        {t.pettyCash.add}
                    </button>
                </div>
            </div>

            {/* Recent History */}
            <div>
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                    <History className="w-3 h-3" /> {t.pettyCash.history}
                </h4>
                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                    {transactions.length === 0 && <p className="text-xs text-slate-400 italic text-center py-2">{t.pettyCash.empty}</p>}
                    {transactions.slice(0, 5).map(tx => (
                        <div key={tx.id} className="text-xs border-b border-slate-100 pb-2 last:border-0 group relative">
                             <div className="flex justify-between font-medium items-center mb-0.5">
                                 <span className="text-slate-900 truncate max-w-[100px]" title={tx.description}>{tx.description}</span>
                                 <div className="flex items-center gap-2">
                                     <span className={`whitespace-nowrap font-mono font-bold ${tx.type === 'IN' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                         {tx.type === 'IN' ? '+' : '-'} {formatMoney(tx.amount, tx.currency)}
                                     </span>
                                     <button 
                                        onClick={(e) => handleDelete(tx.id, e)}
                                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-rose-100 text-rose-500 rounded transition-all"
                                        title={t.pettyCash.delete}
                                     >
                                         <Trash2 className="w-3 h-3" />
                                     </button>
                                 </div>
                             </div>
                             <div className="text-[10px] text-slate-500">
                                 {new Date(tx.date).toLocaleDateString()} {new Date(tx.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                             </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
      )}
    </div>
  );
};