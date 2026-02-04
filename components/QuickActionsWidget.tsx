
import React from 'react';
import { UserPlus, Search, NotebookPen, Zap } from 'lucide-react';
import { translations, Language } from '../translations';

interface QuickActionsWidgetProps {
  lang: Language;
  onAction: (action: 'ADD_GUEST' | 'FILTER_AVAILABLE' | 'OPEN_NOTES') => void;
}

export const QuickActionsWidget: React.FC<QuickActionsWidgetProps> = ({ lang, onAction }) => {
  const t = translations[lang];

  return (
    <div className="mb-6 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden bg-white dark:bg-slate-800 shadow-sm">
      <div className="p-4 flex items-center gap-2 font-bold text-slate-900 dark:text-slate-100 border-b border-slate-100 dark:border-slate-700">
        <div className="p-1.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 rounded-lg">
           <Zap className="w-4 h-4" />
        </div>
        {t.quick.title}
      </div>

      <div className="p-3 grid gap-2">
        <button 
          onClick={() => onAction('ADD_GUEST')}
          className="w-full flex items-center gap-3 p-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors group text-left"
        >
          <div className="p-2 bg-indigo-500/30 rounded-full">
            <UserPlus className="w-4 h-4" />
          </div>
          <div>
            <div className="text-sm font-bold leading-tight">{t.quick.addGuest}</div>
            <div className="text-[10px] opacity-80 font-medium">Create new client profile</div>
          </div>
        </button>

        <div className="grid grid-cols-2 gap-2">
          <button 
            onClick={() => onAction('FILTER_AVAILABLE')}
            className="flex flex-col items-center justify-center p-3 border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-300 transition-colors"
          >
            <Search className="w-5 h-5 mb-1 text-slate-400" />
            <span className="text-[10px] font-bold text-center leading-tight">{t.quick.filterAvailable}</span>
          </button>
          
          <button 
            onClick={() => onAction('OPEN_NOTES')}
            className="flex flex-col items-center justify-center p-3 border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-300 transition-colors"
          >
            <NotebookPen className="w-5 h-5 mb-1 text-slate-400" />
            <span className="text-[10px] font-bold text-center leading-tight">{t.quick.openNotes}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
