import React, { useState, useEffect } from 'react';
import { Calendar } from 'lucide-react';
import { Language } from '../translations';

interface ClockWidgetProps {
  lang: Language;
}

export const ClockWidget: React.FC<ClockWidgetProps> = ({ lang }) => {
  const [date, setDate] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setDate(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const timeStr = date.toLocaleTimeString(lang === 'vi' ? 'vi-VN' : 'en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
  
  const dateStr = date.toLocaleDateString(lang === 'vi' ? 'vi-VN' : 'en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });

  return (
    <div className="w-full bg-slate-50 rounded-xl border border-slate-200 p-4 mb-6 flex flex-col items-center justify-center">
      <div className="text-4xl font-black text-slate-800 tracking-tighter mb-1 font-mono">
        {timeStr}
      </div>
      <div className="flex items-center gap-2 text-slate-500 text-xs font-bold uppercase tracking-wider">
         <Calendar className="w-3 h-3" />
         {dateStr}
      </div>
    </div>
  );
};
