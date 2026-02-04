import React, { useState, useEffect } from 'react';
import { Room, RoomStatus, BookingSource } from '../types';
import { X, Sparkles, Check, Trash2, Save, ArrowRight, Settings, Users, Clock, CalendarDays, FileCheck, DollarSign } from 'lucide-react';
import { generateWelcomeMessage, getMaintenanceAdvice } from '../services/geminiService';
import { translations, Language } from '../translations';

interface RoomDetailPanelProps {
  room: Room | null;
  onClose: () => void;
  onUpdate: (updatedRoom: Room) => void;
  lang: Language;
}

const TIME_SLOTS = Array.from({ length: 24 * 4 }, (_, i) => {
  const h = Math.floor(i / 4).toString().padStart(2, '0');
  const m = ((i % 4) * 15).toString().padStart(2, '0');
  return `${h}:${m}`;
});

const DateInput = ({ label, value, onChange, lang }: { label: string, value: string | undefined, onChange: (val: string) => void, lang: Language }) => {
  const now = new Date();
  
  let y = now.getFullYear();
  let m = now.getMonth();
  let d = now.getDate();

  if (value) {
    const parts = value.split('-');
    if (parts.length === 3) {
       y = parseInt(parts[0]);
       m = parseInt(parts[1]) - 1;
       d = parseInt(parts[2]);
    }
  }

  const updateDate = (newY: number, newM: number, newD: number) => {
    const maxDay = new Date(newY, newM + 1, 0).getDate();
    const validDay = Math.min(newD, maxDay);
    const mStr = String(newM + 1).padStart(2, '0');
    const dStr = String(validDay).padStart(2, '0');
    onChange(`${newY}-${mStr}-${dStr}`);
  };

  const months = Array.from({length: 12}, (_, i) => {
        const date = new Date(2000, i, 1);
        return date.toLocaleString(lang === 'vi' ? 'vi-VN' : 'en-US', { month: 'short' });
  });
  
  const currentYear = new Date().getFullYear();
  const years = Array.from({length: 7}, (_, i) => currentYear - 1 + i); // Current year - 1 to +5
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const days = Array.from({length: daysInMonth}, (_, i) => i + 1);

  return (
    <div>
      <label className="block text-xs uppercase text-slate-700 font-bold mb-1">{label}</label>
      <div className="flex gap-2">
         {/* Day */}
         <div className="relative flex-1">
            <select 
              value={d} 
              onChange={(e) => updateDate(y, m, parseInt(e.target.value))}
              className="w-full appearance-none p-2 border border-slate-300 rounded bg-white text-slate-900 focus:outline-none focus:border-indigo-500 text-center font-medium"
            >
               {days.map(day => <option key={day} value={day}>{day}</option>)}
            </select>
             <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
               <svg className="fill-current h-3 w-3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
            </div>
         </div>

         {/* Month */}
         <div className="relative flex-[1.5]">
             <select 
                value={m} 
                onChange={(e) => updateDate(y, parseInt(e.target.value), d)}
                className="w-full appearance-none p-2 border border-slate-300 rounded bg-white text-slate-900 focus:outline-none focus:border-indigo-500 text-center font-medium"
             >
                {months.map((name, idx) => <option key={idx} value={idx}>{name}</option>)}
             </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
               <svg className="fill-current h-3 w-3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
            </div>
         </div>

         {/* Year */}
         <div className="relative flex-[1.2]">
            <select 
               value={y} 
               onChange={(e) => updateDate(parseInt(e.target.value), m, d)}
               className="w-full appearance-none p-2 border border-slate-300 rounded bg-white text-slate-900 focus:outline-none focus:border-indigo-500 text-center font-medium"
            >
               {years.map(year => <option key={year} value={year}>{year}</option>)}
            </select>
             <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
               <svg className="fill-current h-3 w-3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
            </div>
         </div>
      </div>
    </div>
  );
};

export const RoomDetailPanel: React.FC<RoomDetailPanelProps> = ({ room, onClose, onUpdate, lang }) => {
  const [editedRoom, setEditedRoom] = useState<Room | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState<string>('');
  const [showConfig, setShowConfig] = useState(false);
  
  const t = translations[lang];

  useEffect(() => {
    if (room) {
      const nextRoom = { ...room };
      
      // Default check-in to today if missing
      if (!nextRoom.checkInDate) {
          const now = new Date();
          const m = String(now.getMonth() + 1).padStart(2, '0');
          const d = String(now.getDate()).padStart(2, '0');
          nextRoom.checkInDate = `${now.getFullYear()}-${m}-${d}`;
      }

      // Default check-out to tomorrow if missing
      if (!nextRoom.checkOutDate) {
          const tmr = new Date();
          tmr.setDate(tmr.getDate() + 1);
          const m = String(tmr.getMonth() + 1).padStart(2, '0');
          const d = String(tmr.getDate()).padStart(2, '0');
          nextRoom.checkOutDate = `${tmr.getFullYear()}-${m}-${d}`;
      }
      
      // Init ID scanned status if undefined
      if (nextRoom.isIdScanned === undefined) {
          nextRoom.isIdScanned = false;
      }
      
      // Use price as default salePrice if not set
      if (nextRoom.salePrice === undefined) {
          nextRoom.salePrice = nextRoom.price;
      }

      setEditedRoom(nextRoom);
      setAiResponse('');
      setShowConfig(false);
    }
  }, [room]);

  if (!room || !editedRoom) return null;

  const handleSave = () => {
    if (editedRoom) {
      onUpdate(editedRoom);
      onClose();
    }
  };

  const handleGenerateWelcome = async () => {
    if (!editedRoom.guestName) return;
    setAiLoading(true);
    const msg = await generateWelcomeMessage(editedRoom.guestName, editedRoom, lang);
    setAiResponse(msg);
    setAiLoading(false);
  };

  const handleGenerateMaintenance = async () => {
    if (!editedRoom.maintenanceIssue) return;
    setAiLoading(true);
    const advice = await getMaintenanceAdvice(editedRoom.maintenanceIssue, lang);
    setAiResponse(advice);
    setAiLoading(false);
  };

  const canCheckIn = editedRoom.status === RoomStatus.AVAILABLE || editedRoom.status === RoomStatus.RESERVED;
  const isOccupied = editedRoom.status === RoomStatus.OCCUPIED;
  const isMaintenance = editedRoom.status === RoomStatus.MAINTENANCE;

  return (
    <div className="fixed inset-y-0 right-0 w-full md:w-[500px] bg-white shadow-2xl transform transition-transform duration-300 ease-in-out border-l border-slate-200 z-50 overflow-y-auto">
      <div className="p-6 pb-24">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold text-slate-900 break-words">{editedRoom.name || `Room ${editedRoom.number}`}</h2>
            <div className="flex items-center gap-2 text-slate-600">
               <span>{t.roomType[editedRoom.type]}</span>
               <span className="w-1 h-1 rounded-full bg-current opacity-50"></span>
               <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {editedRoom.capacity}</span>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <X className="w-6 h-6 text-slate-600" />
          </button>
        </div>

        {/* Status Selector */}
        <div className="mb-6">
          <label className="block text-sm font-bold text-slate-800 mb-2">{t.detail.currentStatus}</label>
          <select 
            value={editedRoom.status}
            onChange={(e) => setEditedRoom({...editedRoom, status: e.target.value as RoomStatus})}
            className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white text-slate-900 shadow-sm font-medium"
          >
            {Object.values(RoomStatus).map((status) => (
              <option key={status} value={status}>{t.status[status]}</option>
            ))}
          </select>
        </div>

        {/* Upcoming Reservation Banner */}
        {editedRoom.upcomingReservation && (
            <div className="mb-6 bg-purple-50 border border-purple-100 p-4 rounded-xl">
                 <h4 className="flex items-center gap-2 text-purple-800 font-bold text-sm mb-2">
                     <CalendarDays className="w-4 h-4" /> Upcoming Reservation
                 </h4>
                 <div className="text-sm text-purple-900">
                     <div className="font-semibold">{editedRoom.upcomingReservation.guestName}</div>
                     <div className="text-xs mt-1 opacity-80">
                         {editedRoom.upcomingReservation.checkInDate} to {editedRoom.upcomingReservation.checkOutDate}
                     </div>
                 </div>
            </div>
        )}

        {/* Dynamic Forms based on State */}
        <div className="space-y-6">
          
          {/* Check In / Guest Info */}
          {(canCheckIn || isOccupied) && (
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 shadow-sm">
              <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                <UserIcon /> {t.detail.guestInfo}
              </h3>
              
              <div className="space-y-4">
                {/* Hourly Toggle */}
                <div className="flex items-center gap-3 pb-2 border-b border-slate-200">
                    <button 
                        onClick={() => setEditedRoom({...editedRoom, isHourly: !editedRoom.isHourly})}
                        className={`w-10 h-6 rounded-full transition-colors relative flex-shrink-0 ${editedRoom.isHourly ? 'bg-indigo-600' : 'bg-slate-300'}`}
                    >
                        <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${editedRoom.isHourly ? 'translate-x-5' : 'translate-x-1'}`} />
                    </button>
                    <span className="text-sm font-bold text-slate-700 flex items-center gap-2">
                        <Clock className="w-4 h-4 text-slate-600" /> {t.detail.hourly}
                    </span>
                </div>

                <div>
                  <label className="block text-xs uppercase text-slate-700 font-bold mb-1">{t.detail.guestName}</label>
                  <input 
                    type="text" 
                    value={editedRoom.guestName || ''}
                    onChange={(e) => setEditedRoom({...editedRoom, guestName: e.target.value})}
                    placeholder={t.detail.enterGuestName}
                    className="w-full p-2 border border-slate-300 rounded focus:outline-none focus:border-indigo-500 bg-white text-slate-900 placeholder-slate-400"
                  />
                </div>

                {/* Sale Price Input */}
                <div>
                   <label className="block text-xs uppercase text-slate-700 font-bold mb-1">{t.detail.salePrice}</label>
                   <div className="relative">
                       <input 
                            type="number"
                            value={editedRoom.salePrice}
                            onChange={(e) => setEditedRoom({...editedRoom, salePrice: parseFloat(e.target.value) || 0})}
                            className="w-full p-2 pl-8 pr-12 border border-slate-300 rounded focus:outline-none focus:border-indigo-500 bg-white text-slate-900 font-mono"
                       />
                       <DollarSign className="w-4 h-4 absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                       <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">VND</span>
                   </div>
                   <div className="text-xs text-slate-500 mt-1 text-right">
                       {new Intl.NumberFormat(lang === 'vi' ? 'vi-VN' : 'en-US', { style: 'currency', currency: 'VND' }).format(editedRoom.salePrice || 0)}
                   </div>
                </div>

                <div>
                   <label className="block text-xs uppercase text-slate-700 font-bold mb-1">{t.detail.bookingSource}</label>
                   <select
                        value={editedRoom.bookingSource || ''}
                        onChange={(e) => setEditedRoom({...editedRoom, bookingSource: e.target.value as BookingSource})}
                        className="w-full p-2 border border-slate-300 rounded focus:outline-none focus:border-indigo-500 bg-white text-slate-900"
                    >
                        <option value="">-- Select Source --</option>
                        {Object.values(BookingSource).map(src => (
                            <option key={src} value={src}>{t.sources[src]}</option>
                        ))}
                    </select>
                </div>
                
                {/* KBTTT Checkbox */}
                <div 
                    onClick={() => setEditedRoom({...editedRoom, isIdScanned: !editedRoom.isIdScanned})}
                    className={`
                        flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors
                        ${editedRoom.isIdScanned ? 'border-emerald-200 bg-emerald-50' : 'border-rose-200 bg-white hover:border-rose-300'}
                    `}
                >
                     <div className={`
                         w-5 h-5 rounded border flex items-center justify-center transition-colors
                         ${editedRoom.isIdScanned ? 'bg-emerald-500 border-emerald-500' : 'bg-white border-slate-300'}
                     `}>
                         {editedRoom.isIdScanned && <Check className="w-3.5 h-3.5 text-white" />}
                     </div>
                     <div className="flex-1">
                         <div className={`font-bold text-sm ${editedRoom.isIdScanned ? 'text-emerald-800' : 'text-slate-800'}`}>
                             {t.detail.kbtttLabel}
                         </div>
                         <div className="text-xs text-slate-500">
                             {t.detail.kbtttDesc}
                         </div>
                     </div>
                     <FileCheck className={`w-5 h-5 ${editedRoom.isIdScanned ? 'text-emerald-600' : 'text-slate-300'}`} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <DateInput 
                        label={t.detail.checkIn}
                        value={editedRoom.checkInDate}
                        onChange={(val) => setEditedRoom({...editedRoom, checkInDate: val})}
                        lang={lang}
                    />
                    <div className="space-y-2 mt-2">
                      {editedRoom.isHourly && (
                        <select
                           value={editedRoom.checkInTime || '12:00'}
                           onChange={(e) => setEditedRoom({...editedRoom, checkInTime: e.target.value})}
                           className="w-full p-2 border border-slate-300 rounded focus:outline-none focus:border-indigo-500 font-mono text-sm bg-white text-slate-900"
                        >
                           {TIME_SLOTS.map(t => <option key={`in-${t}`} value={t}>{t}</option>)}
                        </select>
                      )}
                    </div>
                  </div>
                  <div>
                    <DateInput 
                        label={t.detail.checkOut}
                        value={editedRoom.checkOutDate}
                        onChange={(val) => setEditedRoom({...editedRoom, checkOutDate: val})}
                        lang={lang}
                    />
                    <div className="space-y-2 mt-2">
                         {editedRoom.isHourly && (
                            <select
                               value={editedRoom.checkOutTime || '14:00'}
                               onChange={(e) => setEditedRoom({...editedRoom, checkOutTime: e.target.value})}
                               className="w-full p-2 border border-slate-300 rounded focus:outline-none focus:border-indigo-500 font-mono text-sm bg-white text-slate-900"
                            >
                                {TIME_SLOTS.map(t => <option key={`out-${t}`} value={t}>{t}</option>)}
                            </select>
                        )}
                    </div>
                  </div>
                </div>

                {editedRoom.guestName && (
                   <div className="pt-2">
                      <button 
                        onClick={handleGenerateWelcome}
                        disabled={aiLoading}
                        className="w-full py-2 px-3 bg-indigo-50 text-indigo-700 rounded-lg text-sm font-bold hover:bg-indigo-100 transition-colors flex items-center justify-center gap-2 border border-indigo-200"
                      >
                        {aiLoading ? <span className="animate-spin">⏳</span> : <Sparkles className="w-4 h-4" />}
                        {t.detail.genWelcome}
                      </button>
                      {aiResponse && !isMaintenance && (
                        <div className="mt-3 p-3 bg-white border border-indigo-200 rounded-lg text-sm text-slate-800 italic shadow-sm">
                          "{aiResponse}"
                        </div>
                      )}
                   </div>
                )}
              </div>
            </div>
          )}

          {/* Maintenance Section */}
          {isMaintenance && (
             <div className="bg-rose-50 p-4 rounded-xl border border-rose-200 shadow-sm">
               <h3 className="text-lg font-bold text-rose-800 mb-4 flex items-center gap-2">
                 <WrenchIcon /> {t.detail.maintenance}
               </h3>
               <div>
                  <label className="block text-xs uppercase text-rose-700 font-bold mb-1">{t.detail.issueDesc}</label>
                  <textarea 
                    value={editedRoom.maintenanceIssue || ''}
                    onChange={(e) => setEditedRoom({...editedRoom, maintenanceIssue: e.target.value})}
                    placeholder={t.detail.issuePlaceholder}
                    rows={3}
                    className="w-full p-2 border border-rose-300 rounded focus:outline-none focus:border-rose-500 bg-white text-slate-900 placeholder-rose-300"
                  />
               </div>
               {editedRoom.maintenanceIssue && (
                   <div className="pt-2 mt-2">
                      <button 
                        onClick={handleGenerateMaintenance}
                        disabled={aiLoading}
                        className="w-full py-2 px-3 bg-white text-rose-700 border border-rose-300 rounded-lg text-sm font-bold hover:bg-rose-50 transition-colors flex items-center justify-center gap-2"
                      >
                         {aiLoading ? <span className="animate-spin">⏳</span> : <Sparkles className="w-4 h-4" />}
                        {t.detail.askAi}
                      </button>
                      {aiResponse && (
                        <div className="mt-3 p-3 bg-white border border-rose-200 rounded-lg text-sm text-slate-900 whitespace-pre-wrap shadow-sm">
                          {aiResponse}
                        </div>
                      )}
                   </div>
                )}
             </div>
          )}

          {/* Collapsible Configuration Section */}
          <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
             <button 
                onClick={() => setShowConfig(!showConfig)}
                className="w-full p-4 flex items-center justify-between bg-slate-50 hover:bg-slate-100 transition-colors"
             >
                <div className="flex items-center gap-2 font-bold text-slate-800">
                   <Settings className="w-4 h-4" /> {t.detail.config}
                </div>
                <div className={`transform transition-transform text-slate-600 ${showConfig ? 'rotate-180' : ''}`}>▼</div>
             </button>
             
             {showConfig && (
                <div className="p-4 bg-slate-50 space-y-4 border-t border-slate-200">
                   <div>
                      <label className="block text-xs uppercase text-slate-700 font-bold mb-1">{t.detail.roomName}</label>
                      <input 
                        type="text" 
                        value={editedRoom.name || ''}
                        onChange={(e) => setEditedRoom({...editedRoom, name: e.target.value})}
                        placeholder={`e.g. Suite ${editedRoom.number}`}
                        className="w-full p-2 border border-slate-300 rounded focus:outline-none focus:border-indigo-500 bg-white text-slate-900 placeholder-slate-400"
                      />
                   </div>
                   <div className="grid grid-cols-2 gap-4">
                     <div>
                        <label className="block text-xs uppercase text-slate-700 font-bold mb-1">{t.detail.roomNumber}</label>
                        <input 
                          type="text" 
                          value={editedRoom.number}
                          onChange={(e) => setEditedRoom({...editedRoom, number: e.target.value})}
                          className="w-full p-2 border border-slate-300 rounded focus:outline-none focus:border-indigo-500 bg-white text-slate-900"
                        />
                     </div>
                     <div>
                        <label className="block text-xs uppercase text-slate-700 font-bold mb-1">{t.detail.capacity}</label>
                        <input 
                          type="number" 
                          min="1"
                          max="10"
                          value={editedRoom.capacity}
                          onChange={(e) => setEditedRoom({...editedRoom, capacity: parseInt(e.target.value) || 1})}
                          className="w-full p-2 border border-slate-300 rounded focus:outline-none focus:border-indigo-500 bg-white text-slate-900"
                        />
                     </div>
                   </div>
                </div>
             )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-6 border-t border-slate-200">
             <button 
                onClick={handleSave}
                className="flex-1 bg-indigo-600 text-white py-3 rounded-lg font-bold hover:bg-indigo-700 transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
             >
               <Save className="w-4 h-4" /> {t.detail.save}
             </button>
             
             {isOccupied && (
                <button 
                  onClick={() => {
                    setEditedRoom({
                      ...editedRoom, 
                      status: RoomStatus.DIRTY, 
                      guestName: undefined, 
                      checkInDate: undefined, 
                      checkOutDate: undefined,
                      notes: '',
                      maintenanceIssue: undefined,
                      bookingSource: undefined,
                      isIdScanned: false,
                      salePrice: undefined,
                    });
                  }}
                  className="px-4 py-3 bg-white border border-slate-300 text-slate-700 rounded-lg font-bold hover:bg-rose-50 hover:text-rose-600 hover:border-rose-300 transition-all shadow-sm"
                  title={t.detail.checkOutBtn}
                >
                  <ArrowRight className="w-5 h-5" />
                </button>
             )}
          </div>

        </div>
      </div>
    </div>
  );
};

const UserIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
);
const WrenchIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
);