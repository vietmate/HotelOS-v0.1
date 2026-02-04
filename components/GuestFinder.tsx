
import React, { useState, useEffect } from 'react';
import { Search, Plus, User, CreditCard, Phone, Mail, Globe, ArrowRight, Loader2 } from 'lucide-react';
import { Guest } from '../types';
import { translations, Language } from '../translations';
import { supabase, isSupabaseConfigured } from '../services/supabaseClient';

interface GuestFinderProps {
  onSelectGuest: (guest: Guest) => void;
  lang: Language;
}

export const GuestFinder: React.FC<GuestFinderProps> = ({ onSelectGuest, lang }) => {
  const t = translations[lang];
  const [searchTerm, setSearchTerm] = useState('');
  const [mode, setMode] = useState<'SEARCH' | 'CREATE'>('SEARCH');
  const [results, setResults] = useState<Guest[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // New Guest Form State
  const [newGuest, setNewGuest] = useState<Guest>({
    full_name: '',
    id_number: '',
    phone: '',
    email: '',
    nationality: ''
  });

  // Search Logic
  useEffect(() => {
    if (mode === 'CREATE') return;
    
    const searchGuests = async () => {
        if (!searchTerm.trim()) {
            setResults([]);
            return;
        }

        setIsLoading(true);
        if (isSupabaseConfigured()) {
            const { data, error } = await supabase
                .from('guests')
                .select('*')
                .or(`full_name.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%`)
                .limit(5);
            
            if (data && !error) {
                setResults(data as Guest[]);
            }
        } else {
            // Local Mock Search (Since we can't easily query localStorage array without full load)
            setResults([]); 
        }
        setIsLoading(false);
    };

    const timer = setTimeout(searchGuests, 500);
    return () => clearTimeout(timer);
  }, [searchTerm, mode]);

  const handleCreateGuest = async () => {
      if (!newGuest.full_name) return;
      
      setIsLoading(true);
      
      if (isSupabaseConfigured()) {
          const { data, error } = await supabase
              .from('guests')
              .insert([newGuest])
              .select()
              .single();
          
          if (data && !error) {
              onSelectGuest(data as Guest);
          }
      } else {
          // Offline fallback - just pass the object back
          onSelectGuest({ ...newGuest, id: 'local-' + Date.now() });
      }
      setIsLoading(false);
  };

  if (mode === 'CREATE') {
      return (
          <div className="bg-slate-50 border border-indigo-100 rounded-xl p-4 animate-in slide-in-from-right-4">
              <div className="flex justify-between items-center mb-4">
                  <h4 className="font-bold text-indigo-800 flex items-center gap-2">
                      <User className="w-4 h-4" /> {t.guest.addNew}
                  </h4>
                  <button onClick={() => setMode('SEARCH')} className="text-xs text-slate-500 hover:text-slate-800 underline">
                      {t.guest.cancel}
                  </button>
              </div>
              
              <div className="space-y-3">
                  <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">{t.guest.fullName} *</label>
                      <input 
                        className="w-full p-2 border border-slate-300 rounded text-sm bg-white" 
                        value={newGuest.full_name}
                        onChange={(e) => setNewGuest({...newGuest, full_name: e.target.value})}
                        autoFocus
                      />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">{t.guest.idNumber}</label>
                        <div className="relative">
                            <CreditCard className="w-3 h-3 absolute left-2.5 top-2.5 text-slate-400" />
                            <input 
                                className="w-full pl-8 p-2 border border-slate-300 rounded text-sm bg-white" 
                                value={newGuest.id_number}
                                onChange={(e) => setNewGuest({...newGuest, id_number: e.target.value})}
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">{t.guest.phone}</label>
                        <div className="relative">
                            <Phone className="w-3 h-3 absolute left-2.5 top-2.5 text-slate-400" />
                            <input 
                                className="w-full pl-8 p-2 border border-slate-300 rounded text-sm bg-white" 
                                value={newGuest.phone}
                                onChange={(e) => setNewGuest({...newGuest, phone: e.target.value})}
                            />
                        </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">{t.guest.email}</label>
                         <div className="relative">
                            <Mail className="w-3 h-3 absolute left-2.5 top-2.5 text-slate-400" />
                            <input 
                                className="w-full pl-8 p-2 border border-slate-300 rounded text-sm bg-white" 
                                value={newGuest.email}
                                onChange={(e) => setNewGuest({...newGuest, email: e.target.value})}
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">{t.guest.nationality}</label>
                        <div className="relative">
                            <Globe className="w-3 h-3 absolute left-2.5 top-2.5 text-slate-400" />
                            <input 
                                className="w-full pl-8 p-2 border border-slate-300 rounded text-sm bg-white" 
                                value={newGuest.nationality}
                                onChange={(e) => setNewGuest({...newGuest, nationality: e.target.value})}
                            />
                        </div>
                    </div>
                  </div>

                  <button 
                    onClick={handleCreateGuest}
                    disabled={!newGuest.full_name || isLoading}
                    className="w-full mt-2 py-2 bg-indigo-600 text-white rounded font-bold text-sm hover:bg-indigo-700 transition-colors flex justify-center items-center gap-2"
                  >
                     {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                     {t.guest.save}
                  </button>
              </div>
          </div>
      );
  }

  return (
    <div className="mb-4">
        <label className="block text-xs uppercase text-slate-700 font-bold mb-2">{t.guest.findTitle}</label>
        
        <div className="flex gap-2 mb-2">
            <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                    type="text" 
                    placeholder={t.guest.searchPlaceholder}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white text-slate-900"
                />
            </div>
            <button 
                onClick={() => {
                    setMode('CREATE');
                    setNewGuest({...newGuest, full_name: searchTerm}); // Pre-fill name
                }}
                className="bg-indigo-100 hover:bg-indigo-200 text-indigo-700 p-2 rounded transition-colors"
                title={t.guest.addNew}
            >
                <Plus className="w-5 h-5" />
            </button>
        </div>

        {/* Results List */}
        {searchTerm && (
            <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm max-h-48 overflow-y-auto">
                {isLoading ? (
                    <div className="p-3 text-center text-slate-400 text-xs"><Loader2 className="w-4 h-4 animate-spin inline mr-2" />Searching...</div>
                ) : results.length > 0 ? (
                    <div>
                        <div className="px-3 py-1 bg-slate-50 text-[10px] font-bold text-slate-500 uppercase border-b border-slate-100">
                            {t.guest.found}
                        </div>
                        {results.map(guest => (
                            <div 
                                key={guest.id} 
                                onClick={() => onSelectGuest(guest)}
                                className="p-3 hover:bg-indigo-50 cursor-pointer border-b border-slate-100 last:border-0 group"
                            >
                                <div className="flex justify-between items-center">
                                    <div>
                                        <div className="font-bold text-slate-800 text-sm">{guest.full_name}</div>
                                        <div className="text-xs text-slate-500 flex items-center gap-2">
                                            {guest.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {guest.phone}</span>}
                                            {guest.id_number && <span className="flex items-center gap-1"><CreditCard className="w-3 h-3" /> {guest.id_number}</span>}
                                        </div>
                                    </div>
                                    <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-500" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="p-4 text-center">
                        <p className="text-xs text-slate-500 mb-2">{t.guest.noResults}</p>
                        <button 
                            onClick={() => {
                                setMode('CREATE');
                                setNewGuest({...newGuest, full_name: searchTerm});
                            }}
                            className="text-xs font-bold text-indigo-600 hover:text-indigo-800"
                        >
                            + {t.guest.addNew}
                        </button>
                    </div>
                )}
            </div>
        )}
    </div>
  );
};
