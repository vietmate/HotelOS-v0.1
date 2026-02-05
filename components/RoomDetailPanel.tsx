import React, { useState, useEffect } from 'react';
import { Room, RoomStatus, BookingSource, Guest, RoomHistoryEntry, Booking, BookingType } from '../types';
import { X, Sparkles, Check, Trash2, Save, ArrowRight, Settings, Users, Clock, CalendarDays, FileCheck, DollarSign, UserCheck, History, ArrowDown, ShieldAlert, PlayCircle, StopCircle, RefreshCw, AlertOctagon } from 'lucide-react';
import { generateWelcomeMessage, getMaintenanceAdvice } from '../services/geminiService';
import { hasBookingConflict, isTimeSlotAvailable } from '../services/validationService';
import { translations, Language } from '../translations';
import { GuestFinder } from './GuestFinder';
import { supabase, isSupabaseConfigured } from '../services/supabaseClient';

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

const DateInput = ({ label, value, onChange, lang, error }: { label: string, value: string | undefined, onChange: (val: string) => void, lang: Language, error?: boolean }) => {
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
  const years = Array.from({length: 7}, (_, i) => currentYear - 1 + i); 
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const days = Array.from({length: daysInMonth}, (_, i) => i + 1);

  return (
    <div>
      <label className={`block text-xs uppercase font-bold mb-1 ${error ? 'text-rose-600' : 'text-slate-700 dark:text-slate-300'}`}>{label}</label>
      <div className={`flex gap-2 rounded-lg p-1 ${error ? 'bg-rose-50 dark:bg-rose-900/20 ring-1 ring-rose-500' : ''}`}>
         <div className="relative flex-1">
            <select value={d} onChange={(e) => updateDate(y, m, parseInt(e.target.value))} className="w-full appearance-none p-2 border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 text-center font-medium">{days.map(day => <option key={day} value={day}>{day}</option>)}</select>
         </div>
         <div className="relative flex-[1.5]">
             <select value={m} onChange={(e) => updateDate(y, parseInt(e.target.value), d)} className="w-full appearance-none p-2 border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 text-center font-medium">{months.map((name, idx) => <option key={idx} value={idx}>{name}</option>)}</select>
         </div>
         <div className="relative flex-[1.2]">
            <select value={y} onChange={(e) => updateDate(parseInt(e.target.value), m, d)} className="w-full appearance-none p-2 border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 text-center font-medium">{years.map(year => <option key={year} value={year}>{year}</option>)}</select>
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
  const [showHistory, setShowHistory] = useState(false);
  
  const [existingBookings, setExistingBookings] = useState<Booking[]>([]);
  const [isConflict, setIsConflict] = useState(false);

  const t = translations[lang];

  useEffect(() => {
      const fetchBookings = async () => {
          if (room && isSupabaseConfigured()) {
              const { data } = await supabase
                  .from('bookings')
                  .select('*')
                  .eq('room_id', room.id)
                  .neq('status', 'CANCELLED');
              if (data) setExistingBookings(data as Booking[]);
          }
      };
      fetchBookings();
  }, [room]);

  useEffect(() => {
    if (room) {
      const nextRoom = { ...room };
      
      if (!nextRoom.checkInDate) {
          const now = new Date();
          const m = String(now.getMonth() + 1).padStart(2, '0');
          const d = String(now.getDate()).padStart(2, '0');
          nextRoom.checkInDate = `${now.getFullYear()}-${m}-${d}`;
          nextRoom.checkInTime = "14:00"; 
      }

      if (!nextRoom.checkOutDate) {
          const tmr = new Date();
          tmr.setDate(tmr.getDate() + 1);
          const m = String(tmr.getMonth() + 1).padStart(2, '0');
          const d = String(tmr.getDate()).padStart(2, '0');
          nextRoom.checkOutDate = `${tmr.getFullYear()}-${m}-${d}`;
          nextRoom.checkOutTime = "12:00"; 
      }
      
      if (nextRoom.isIdScanned === undefined) nextRoom.isIdScanned = false;
      if (nextRoom.salePrice === undefined) nextRoom.salePrice = nextRoom.price;
      if (!nextRoom.history) nextRoom.history = [];

      setEditedRoom(nextRoom);
      setAiResponse('');
      setShowConfig(false);
      setShowHistory(false);
    }
  }, [room]);

  useEffect(() => {
      if (!room || !editedRoom || !editedRoom.checkInDate || !editedRoom.checkOutDate) return;

      const startDateTime = `${editedRoom.checkInDate}T${editedRoom.checkInTime || '14:00'}:00`;
      const endDateTime = `${editedRoom.checkOutDate}T${editedRoom.checkOutTime || '12:00'}:00`;

      let conflict = false;

      if (isSupabaseConfigured() && existingBookings.length > 0) {
          conflict = !isTimeSlotAvailable(existingBookings, startDateTime, endDateTime);
      } else {
          const isEditingCurrentStay = editedRoom.status === RoomStatus.OCCUPIED;
          conflict = hasBookingConflict(room, editedRoom.checkInDate, editedRoom.checkOutDate, isEditingCurrentStay);
      }
      
      setIsConflict(conflict);

  }, [editedRoom, existingBookings, room]);

  if (!room || !editedRoom) return null;

  const handleSave = async () => {
    if (editedRoom) {
      if (isConflict) {
          if (!confirm(`${t.detail.dateConflict} This overlaps with another booking. Save anyway (Force)?`)) {
              return;
          }
      }

      if (isSupabaseConfigured() && editedRoom.status === RoomStatus.OCCUPIED && editedRoom.guestName) {
           const startDateTime = `${editedRoom.checkInDate}T${editedRoom.checkInTime || '14:00'}:00`;
           const endDateTime = `${editedRoom.checkOutDate}T${editedRoom.checkOutTime || '12:00'}:00`;
           
           let type = BookingType.STANDARD;
           if (editedRoom.isHourly) type = BookingType.HOURLY;
           
           await supabase.from('bookings').insert({
               room_id: editedRoom.id,
               guest_name: editedRoom.guestName,
               guest_id: editedRoom.guestId,
               check_in_at: new Date(startDateTime).toISOString(),
               check_out_at: new Date(endDateTime).toISOString(),
               booking_type: type,
               status: 'CHECKED_IN'
           });
      }

      const newHistory: RoomHistoryEntry[] = [...(editedRoom.history || [])];
      const now = new Date().toISOString();
      let historyAdded = false;

      if (room.status !== editedRoom.status) {
         let action: RoomHistoryEntry['action'] = 'STATUS_CHANGE';
         let desc = `Status changed: ${t.status[room.status]} -> ${t.status[editedRoom.status]}`;
         if (room.status === RoomStatus.AVAILABLE && editedRoom.status === RoomStatus.OCCUPIED) {
             action = 'CHECK_IN';
             desc = `Check-in: ${editedRoom.guestName || 'Unknown Guest'} (${editedRoom.isHourly ? 'Hourly' : 'Standard'})`;
         } else if (room.status === RoomStatus.OCCUPIED && (editedRoom.status === RoomStatus.DIRTY || editedRoom.status === RoomStatus.AVAILABLE)) {
             action = 'CHECK_OUT';
             desc = `Check-out: ${room.guestName || 'Unknown Guest'}`;
         }
         newHistory.unshift({ date: now, action, description: desc });
         historyAdded = true;
      }
      
      if (!historyAdded && room.guestName !== editedRoom.guestName && editedRoom.status === RoomStatus.OCCUPIED) {
          newHistory.unshift({ date: now, action: 'INFO', description: `Guest details updated: ${editedRoom.guestName}` });
      }

      const roomToSave = { ...editedRoom, history: newHistory };
      onUpdate(roomToSave);
      onClose();
    }
  };

  const handleTransition = (targetStatus: RoomStatus, logAction: RoomHistoryEntry['action'], logDesc: string) => {
      if (!editedRoom) return;
      const newHistory = [...(editedRoom.history || [])];
      newHistory.unshift({ date: new Date().toISOString(), action: logAction, description: logDesc });
      let updates: Partial<Room> = { status: targetStatus, history: newHistory };
      if (editedRoom.status === RoomStatus.OCCUPIED && (targetStatus === RoomStatus.DIRTY || targetStatus === RoomStatus.AVAILABLE)) {
          updates = {
              ...updates,
              guestName: undefined,
              guestId: undefined,
              isIdScanned: false,
              checkInDate: undefined,
              checkOutDate: undefined,
              bookingSource: undefined,
              maintenanceIssue: undefined,
              salePrice: undefined
          };
      }
      const roomToSave = { ...editedRoom, ...updates };
      onUpdate(roomToSave);
      onClose();
  };

  const handleGuestSelect = (guest: Guest) => {
      setEditedRoom({
          ...editedRoom,
          guestName: guest.full_name,
          guestId: guest.id,
          isIdScanned: !!guest.id_number
      });
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

  const renderWorkflowActions = () => {
      const status = editedRoom.status;
      if (status === RoomStatus.DIRTY) {
        return (
            <div className="grid grid-cols-2 gap-3 mb-6">
                <button onClick={() => handleTransition(RoomStatus.AVAILABLE, 'STATUS_CHANGE', 'Room cleaned')} className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl font-bold text-emerald-800 flex flex-col items-center"><Sparkles className="w-5 h-5 mb-1" />{t.workflow.markClean}</button>
                <button onClick={() => setEditedRoom({...editedRoom, status: RoomStatus.MAINTENANCE})} className="p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 flex flex-col items-center"><WrenchIcon />{t.workflow.startMaintenance}</button>
            </div>
        );
      }
      if (status === RoomStatus.OCCUPIED) return <div className="mb-6"><button onClick={() => handleTransition(RoomStatus.DIRTY, 'CHECK_OUT', `Check-out: ${editedRoom.guestName}`)} className="w-full p-4 bg-rose-50 text-rose-700 border border-rose-200 rounded-xl font-bold flex items-center justify-center gap-2"><ArrowRight className="w-5 h-5" />{t.workflow.checkOut}</button></div>;
      if (status === RoomStatus.RESERVED) return <div className="grid grid-cols-2 gap-3 mb-6"><button onClick={() => setEditedRoom({...editedRoom, status: RoomStatus.OCCUPIED})} className="p-3 bg-indigo-600 text-white rounded-xl font-bold flex items-center justify-center gap-2"><UserCheck className="w-4 h-4" />{t.workflow.checkIn}</button><button onClick={() => handleTransition(RoomStatus.AVAILABLE, 'STATUS_CHANGE', 'Reservation Cancelled')} className="p-3 bg-slate-100 text-slate-600 border rounded-xl font-bold flex items-center justify-center gap-2"><X className="w-4 h-4" />{t.workflow.cancelRes}</button></div>;
      return null;
  };

  return (
    <div className="fixed inset-y-0 right-0 w-full md:w-[500px] bg-white dark:bg-slate-900 shadow-2xl transform transition-transform duration-300 ease-in-out border-l border-slate-200 dark:border-slate-800 z-50 overflow-y-auto">
      <div className="p-6 pb-24">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white break-words">{editedRoom.name || `Room ${editedRoom.number}`}</h2>
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
               <span>{t.roomType[editedRoom.type]}</span>
               <span className="w-1 h-1 rounded-full bg-current opacity-50"></span>
               <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {editedRoom.capacity}</span>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
            <X className="w-6 h-6 text-slate-600 dark:text-slate-400" />
          </button>
        </div>

        {renderWorkflowActions()}

        {/* Manual Override */}
        <div className="mb-6 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-100 dark:border-slate-700">
             <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t.detail.manualOverride}</label>
             </div>
             <select value={editedRoom.status} onChange={(e) => setEditedRoom({...editedRoom, status: e.target.value as RoomStatus})} className="w-full mt-2 p-2 border border-slate-200 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm font-medium">
                {Object.values(RoomStatus).map((status) => <option key={status} value={status}>{t.status[status]}</option>)}
            </select>
        </div>

        {/* Upcoming Reservation Banner */}
        {editedRoom.upcomingReservation && (
            <div className={`mb-6 border p-4 rounded-xl flex justify-between items-start ${isConflict ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800/50' : 'bg-purple-50 dark:bg-purple-900/20 border-purple-100 dark:border-purple-800/50'}`}>
                 <div>
                     <h4 className={`flex items-center gap-2 font-bold text-sm mb-2 ${isConflict ? 'text-red-800 dark:text-red-300' : 'text-purple-800 dark:text-purple-300'}`}>
                         <CalendarDays className="w-4 h-4" /> Upcoming Reservation
                     </h4>
                     <div className={`text-sm ${isConflict ? 'text-red-900 dark:text-red-200' : 'text-purple-900 dark:text-purple-200'}`}>
                         <div className="font-semibold">{editedRoom.upcomingReservation.guestName}</div>
                         <div className="text-xs mt-1 opacity-80">{editedRoom.upcomingReservation.checkInDate} to {editedRoom.upcomingReservation.checkOutDate}</div>
                         {isConflict && <div className="flex items-center gap-1 mt-2 text-xs font-bold text-red-600 dark:text-red-400"><AlertOctagon className="w-3 h-3" /> CONFLICT DETECTED</div>}
                     </div>
                 </div>
                 <button onClick={() => setEditedRoom({...editedRoom, upcomingReservation: undefined})} className="p-1.5 rounded transition-colors hover:bg-purple-100 dark:hover:bg-purple-800 text-purple-700 dark:text-purple-300"><Trash2 className="w-4 h-4" /></button>
            </div>
        )}

        <div className="space-y-6">
          {(canCheckIn || isOccupied) && (
            <div className={`p-4 rounded-xl border shadow-sm animate-in fade-in slide-in-from-bottom-4 ${isConflict ? 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800' : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700'}`}>
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                    <UserCheck className="w-5 h-5 text-indigo-600 dark:text-indigo-400" /> {t.detail.guestInfo}
                </h3>
                {isConflict && <span className="text-[10px] font-bold bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-300 px-2 py-1 rounded-full animate-pulse border border-red-200 dark:border-red-800">{t.detail.dateConflict}</span>}
              </div>
              
              <div className="space-y-4">
                {!editedRoom.guestName && <GuestFinder onSelectGuest={handleGuestSelect} lang={lang} />}
                {editedRoom.guestName && (
                    <div className="bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-800 p-3 rounded-lg flex justify-between items-center mb-2 shadow-sm">
                         <div className="flex items-center gap-2">
                             <div className="bg-indigo-100 dark:bg-indigo-900/50 p-1.5 rounded-full text-indigo-700 dark:text-indigo-300"><UserIcon /></div>
                             <div>
                                 <div className="font-bold text-slate-900 dark:text-white text-sm">{editedRoom.guestName}</div>
                                 <div className="text-xs text-slate-500 dark:text-slate-400">Guest ID Linked</div>
                             </div>
                         </div>
                         <button onClick={() => setEditedRoom({...editedRoom, guestName: undefined, guestId: undefined, isIdScanned: false})} className="text-xs text-rose-500 hover:text-rose-700 dark:hover:text-rose-400 underline">Change</button>
                    </div>
                )}

                {/* Hourly Toggle */}
                <div className="flex items-center gap-3 pb-2 border-b border-slate-200 dark:border-slate-700">
                    <button 
                        type="button"
                        onClick={() => setEditedRoom({...editedRoom, isHourly: !editedRoom.isHourly})}
                        className={`
                            relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent 
                            transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2
                            ${editedRoom.isHourly ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-700'}
                        `}
                    >
                        <span className="sr-only">Use setting</span>
                        <span
                            aria-hidden="true"
                            className={`
                                pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 
                                transition duration-200 ease-in-out
                                ${editedRoom.isHourly ? 'translate-x-5' : 'translate-x-0'}
                            `}
                        />
                    </button>
                    <span 
                        className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2 cursor-pointer"
                        onClick={() => setEditedRoom({...editedRoom, isHourly: !editedRoom.isHourly})}
                    >
                        <Clock className="w-4 h-4 text-slate-600 dark:text-slate-400" /> {t.detail.hourly}
                    </span>
                </div>

                {/* Sale Price Input */}
                <div>
                   <label className="block text-xs uppercase text-slate-700 dark:text-slate-300 font-bold mb-1">{t.detail.salePrice}</label>
                   <div className="relative">
                       <input 
                            type="number"
                            value={editedRoom.salePrice}
                            onChange={(e) => setEditedRoom({...editedRoom, salePrice: parseFloat(e.target.value) || 0})}
                            className="w-full p-2 pl-8 pr-12 border border-slate-300 dark:border-slate-600 rounded focus:outline-none focus:border-indigo-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-white font-mono"
                       />
                       <DollarSign className="w-4 h-4 absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                       <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">VND</span>
                   </div>
                   <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 text-right">
                       {new Intl.NumberFormat(lang === 'vi' ? 'vi-VN' : 'en-US', { style: 'currency', currency: 'VND' }).format(editedRoom.salePrice || 0)}
                   </div>
                </div>

                <div>
                   <label className="block text-xs uppercase text-slate-700 dark:text-slate-300 font-bold mb-1">{t.detail.bookingSource}</label>
                   <select
                        value={editedRoom.bookingSource || ''}
                        onChange={(e) => setEditedRoom({...editedRoom, bookingSource: e.target.value as BookingSource})}
                        className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded focus:outline-none focus:border-indigo-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
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
                        ${editedRoom.isIdScanned ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20' : 'border-rose-200 dark:border-rose-800 bg-white dark:bg-slate-700 hover:border-rose-300'}
                    `}
                >
                     <div className={`
                         w-5 h-5 rounded border flex items-center justify-center transition-colors
                         ${editedRoom.isIdScanned ? 'bg-emerald-500 border-emerald-500' : 'bg-white dark:bg-slate-600 border-slate-300 dark:border-slate-500'}
                     `}>
                         {editedRoom.isIdScanned && <Check className="w-3.5 h-3.5 text-white" />}
                     </div>
                     <div className="flex-1">
                         <div className={`font-bold text-sm ${editedRoom.isIdScanned ? 'text-emerald-800 dark:text-emerald-400' : 'text-slate-800 dark:text-slate-200'}`}>
                             {t.detail.kbtttLabel}
                         </div>
                         <div className="text-xs text-slate-500 dark:text-slate-400">
                             {t.detail.kbtttDesc}
                         </div>
                     </div>
                     <FileCheck className={`w-5 h-5 ${editedRoom.isIdScanned ? 'text-emerald-600 dark:text-emerald-500' : 'text-slate-300 dark:text-slate-500'}`} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <DateInput label={t.detail.checkIn} value={editedRoom.checkInDate} onChange={(val) => setEditedRoom({...editedRoom, checkInDate: val})} lang={lang} error={isConflict} />
                    <div className="space-y-2 mt-2">
                        <select value={editedRoom.checkInTime || '14:00'} onChange={(e) => setEditedRoom({...editedRoom, checkInTime: e.target.value})} className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded focus:outline-none focus:border-indigo-500 font-mono text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-white">
                           {TIME_SLOTS.map(t => <option key={`in-${t}`} value={t}>{t}</option>)}
                        </select>
                    </div>
                  </div>
                  <div>
                    <DateInput label={t.detail.checkOut} value={editedRoom.checkOutDate} onChange={(val) => setEditedRoom({...editedRoom, checkOutDate: val})} lang={lang} error={isConflict} />
                    <div className="space-y-2 mt-2">
                        <select value={editedRoom.checkOutTime || '12:00'} onChange={(e) => setEditedRoom({...editedRoom, checkOutTime: e.target.value})} className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded focus:outline-none focus:border-indigo-500 font-mono text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-white">
                            {TIME_SLOTS.map(t => <option key={`out-${t}`} value={t}>{t}</option>)}
                        </select>
                    </div>
                  </div>
                </div>

                {editedRoom.guestName && (
                   <div className="pt-2">
                      <button onClick={handleGenerateWelcome} disabled={aiLoading} className="w-full py-2 px-3 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-lg text-sm font-bold hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors flex items-center justify-center gap-2 border border-indigo-200 dark:border-indigo-800">
                        {aiLoading ? <span className="animate-spin">⏳</span> : <Sparkles className="w-4 h-4" />}{t.detail.genWelcome}
                      </button>
                      {aiResponse && !isMaintenance && <div className="mt-3 p-3 bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-900 rounded-lg text-sm text-slate-800 dark:text-slate-200 italic shadow-sm">"{aiResponse}"</div>}
                   </div>
                )}
              </div>
            </div>
          )}

          {/* Maintenance Section (Keep unchanged) */}
          {isMaintenance && (
             <div className="bg-rose-50 dark:bg-rose-900/20 p-4 rounded-xl border border-rose-200 dark:border-rose-800/50 shadow-sm animate-in fade-in slide-in-from-bottom-4">
               <h3 className="text-lg font-bold text-rose-800 dark:text-rose-400 mb-4 flex items-center gap-2"><WrenchIcon /> {t.detail.maintenance}</h3>
               <div>
                  <label className="block text-xs uppercase text-rose-700 dark:text-rose-400 font-bold mb-1">{t.detail.issueDesc}</label>
                  <textarea value={editedRoom.maintenanceIssue || ''} onChange={(e) => setEditedRoom({...editedRoom, maintenanceIssue: e.target.value})} placeholder={t.detail.issuePlaceholder} rows={3} className="w-full p-2 border border-rose-300 dark:border-rose-700 rounded focus:outline-none focus:border-rose-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-rose-300" />
               </div>
               {editedRoom.maintenanceIssue && (
                   <div className="pt-2 mt-2">
                      <button onClick={handleGenerateMaintenance} disabled={aiLoading} className="w-full py-2 px-3 bg-white dark:bg-slate-800 text-rose-700 dark:text-rose-400 border border-rose-300 dark:border-rose-700 rounded-lg text-sm font-bold hover:bg-rose-50 dark:hover:bg-rose-900/30 transition-colors flex items-center justify-center gap-2">
                         {aiLoading ? <span className="animate-spin">⏳</span> : <Sparkles className="w-4 h-4" />}{t.detail.askAi}
                      </button>
                      {aiResponse && <div className="mt-3 p-3 bg-white dark:bg-slate-800 border border-rose-200 dark:border-rose-900 rounded-lg text-sm text-slate-900 dark:text-white whitespace-pre-wrap shadow-sm">{aiResponse}</div>}
                   </div>
                )}
             </div>
          )}

          {/* History (Simplified for view) */}
          <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden shadow-sm bg-white dark:bg-slate-800">
             <button onClick={() => setShowHistory(!showHistory)} className="w-full p-4 flex items-center justify-between bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-200"><History className="w-4 h-4" /> {t.detail.history}</div>
                <div className={`transform transition-transform text-slate-600 dark:text-slate-400 ${showHistory ? 'rotate-180' : ''}`}><ArrowDown className="w-4 h-4" /></div>
             </button>
             {showHistory && (
                <div className="p-4 bg-slate-50/50 dark:bg-slate-900/50 max-h-96 overflow-y-auto custom-scrollbar">
                    {(!editedRoom.history || editedRoom.history.length === 0) ? (
                        <div className="text-center text-slate-400 text-sm py-4 italic">{t.detail.noHistory}</div>
                    ) : (
                        <div className="space-y-4">
                            {editedRoom.history.map((entry, idx) => (
                                <div key={idx} className="bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
                                    <div className="text-[10px] font-bold text-slate-400 uppercase">{new Date(entry.date).toLocaleString()}</div>
                                    <div className="text-sm font-medium text-slate-800 dark:text-slate-200">{entry.description}</div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
             )}
          </div>

          <div className="flex gap-3 pt-6 border-t border-slate-200 dark:border-slate-700">
             <button onClick={handleSave} disabled={isConflict && !confirm} className={`flex-1 py-3 rounded-lg font-bold transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 ${isConflict ? 'bg-rose-600 text-white animate-pulse' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}>
               <Save className="w-4 h-4" /> {t.detail.save}
             </button>
          </div>

        </div>
      </div>
    </div>
  );
};

const UserIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>);
const WrenchIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>);