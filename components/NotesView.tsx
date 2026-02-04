import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar, NotebookPen } from 'lucide-react';
import { translations, Language } from '../translations';
import { supabase, isSupabaseConfigured } from '../services/supabaseClient';

interface NotesViewProps {
  lang: Language;
}

export const NotesView: React.FC<NotesViewProps> = ({ lang }) => {
  const t = translations[lang];
  const [currentDate, setCurrentDate] = useState(new Date());
  const [noteContent, setNoteContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Helper to format date key for localStorage/DB (YYYY-MM-DD)
  const getDateKey = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const getLocalStorageKey = (date: Date) => `hotel_notes_${getDateKey(date)}`;

  const getDisplayDate = (date: Date) => {
    return date.toLocaleDateString(lang === 'vi' ? 'vi-VN' : 'en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Load notes when date changes
  useEffect(() => {
    const key = getDateKey(currentDate);
    
    const loadNote = async () => {
        if (isSupabaseConfigured()) {
            const { data, error } = await supabase.from('notes').select('content').eq('date_key', key).single();
            if (data) {
                setNoteContent(data.content);
            } else {
                setNoteContent('');
            }
        } else {
            const savedNote = localStorage.getItem(getLocalStorageKey(currentDate));
            setNoteContent(savedNote || '');
        }
    };
    loadNote();
  }, [currentDate]);

  // Save notes with a slight debounce
  useEffect(() => {
    const key = getDateKey(currentDate);
    setIsSaving(true);
    
    const timer = setTimeout(async () => {
      if (isSupabaseConfigured()) {
          const { error } = await supabase.from('notes').upsert({ date_key: key, content: noteContent, updated_at: new Date().toISOString() });
          if (error) console.error("Error saving note:", error);
      } else {
          localStorage.setItem(getLocalStorageKey(currentDate), noteContent);
      }
      setIsSaving(false);
    }, 800);

    return () => clearTimeout(timer);
  }, [noteContent, currentDate]);

  const changeDate = (days: number) => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + days);
    setCurrentDate(newDate);
  };

  return (
    <div className="h-full flex flex-col bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
      {/* Header / Date Navigator */}
      <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50">
        <div className="flex items-center gap-4">
          <div className="p-2 bg-indigo-100 text-indigo-700 rounded-lg">
            <NotebookPen className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-bold text-slate-800 text-lg">{t.notes.title}</h2>
            <div className="flex items-center gap-2 text-slate-500 text-sm font-medium">
               <Calendar className="w-4 h-4" />
               <span className="capitalize">{getDisplayDate(currentDate)}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
           <button 
             onClick={() => changeDate(-1)}
             className="p-2 hover:bg-white hover:shadow-sm rounded-lg transition-all text-slate-600 border border-transparent hover:border-slate-200"
           >
             <ChevronLeft className="w-5 h-5" />
           </button>
           
           <button 
             onClick={() => setCurrentDate(new Date())}
             className="px-3 py-1 text-xs font-bold uppercase tracking-wider bg-white border border-slate-200 rounded-md text-slate-600 hover:text-indigo-600 hover:border-indigo-200 transition-colors shadow-sm"
           >
             {lang === 'vi' ? 'Hôm nay' : 'Today'}
           </button>

           <button 
             onClick={() => changeDate(1)}
             className="p-2 hover:bg-white hover:shadow-sm rounded-lg transition-all text-slate-600 border border-transparent hover:border-slate-200"
           >
             <ChevronRight className="w-5 h-5" />
           </button>
        </div>
      </div>

      {/* Editor Area */}
      <div className="flex-1 relative flex flex-col bg-white">
        <textarea
          value={noteContent}
          onChange={(e) => setNoteContent(e.target.value)}
          placeholder={t.notes.placeholder}
          className="flex-1 w-full p-6 resize-none focus:outline-none bg-white text-black leading-relaxed text-lg"
          spellCheck={false}
        />
        
        {/* Status Bar */}
        <div className="absolute bottom-4 right-4 flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-full text-xs font-medium text-slate-500 transition-opacity duration-300">
           {isSaving ? (
             <>
               <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
               {t.notes.typing}
             </>
           ) : (
             <>
               <CheckIcon />
               {isSupabaseConfigured() ? "Saved to Cloud" : t.notes.saved}
             </>
           )}
        </div>
      </div>
    </div>
  );
};

const CheckIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-500"><polyline points="20 6 9 17 4 12"/></svg>
);
