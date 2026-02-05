import React, { useState, useEffect } from 'react';
import { Room, RoomStatus, BookingSource, Guest, RoomHistoryEntry } from '../types';
import { X, Sparkles, Check, Trash2, Save, ArrowRight, Settings, Users, Clock, CalendarDays, FileCheck, DollarSign, UserCheck, History, ArrowDown, ShieldAlert, PlayCircle, StopCircle, RefreshCw, AlertOctagon } from 'lucide-react';
import { generateWelcomeMessage, getMaintenanceAdvice } from '../services/geminiService';
import { hasBookingConflict } from '../services/validationService';
import { translations, Language } from '../translations';
import { GuestFinder } from './GuestFinder';

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
  const years = Array.from({length: 7}, (_, i) => currentYear - 1 + i); // Current year - 1 to +5
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const days = Array.from({length: daysInMonth}, (_, i) => i + 1);

  return (
    <div>
      <label className={`block text-xs uppercase font-bold mb-1 ${error ? 'text-rose-600' : 'text-slate-700 dark:text-slate-300'}`}>{label}</label>
      <div className={`flex gap-2 rounded-lg p-1 ${error ? 'bg-rose-50 dark:bg-rose-900/20 ring-1 ring-rose-500' : ''}`}>
         {/* Day */}
         <div className="relative flex-1">
            <select 
              value={d} 
              onChange={(e) => updateDate(y, m, parseInt(e.target.value))}
              className="w-full appearance-none p-2 border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 text-center font-medium"
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
                className="w-full appearance-none p-2 border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 text-center font-medium"
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
               className="w-full appearance-none p-2 border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 text-center font-medium"
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
  const [showHistory, setShowHistory] = useState(false);
  
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

      // Ensure history array exists
      if (!nextRoom.history) {
        nextRoom.history = [];
      }

      setEditedRoom(nextRoom);
      setAiResponse('');
      setShowConfig(false);
      setShowHistory(false);
    }
  }, [room]);

  if (!room || !editedRoom) return null;

  // Validation Check
  // We want to check if the dates currently in 'editedRoom' conflict with any OTHER reservations in 'room' (the prop/source of truth).
  // If we are editing the Current Stay, we should ignore the current stay in the check (pass true).
  const isEditingCurrentStay = editedRoom.status === RoomStatus.OCCUPIED;
  const dateConflict = hasBookingConflict(room, editedRoom.checkInDate || '', editedRoom.checkOutDate || '', isEditingCurrentStay);

  const handleSave = () => {
    if (editedRoom) {
      if (dateConflict) {
          if (!confirm(`${t.detail.dateConflict} Save anyway?`)) {
              return;
          }
      }

      // 1. Detect Changes for History Log
      const newHistory: RoomHistoryEntry[] = [...(editedRoom.history || [])];
      const now = new Date().toISOString();
      let historyAdded = false;

      // Status Change Check
      if (room.status !== editedRoom.status) {
         let action: RoomHistoryEntry['action'] = 'STATUS_CHANGE';
         let desc = `Status changed: ${t.status[room.status]} -> ${t.status[editedRoom.status]}`;

         // Infer Check-In/Check-Out
         if (room.status === RoomStatus.AVAILABLE && editedRoom.status === RoomStatus.OCCUPIED) {
             action = 'CHECK_IN';
             desc = `Check-in: ${editedRoom.guestName || 'Unknown Guest'}`;
         } else if (room.status === RoomStatus.OCCUPIED && (editedRoom.status === RoomStatus.DIRTY || editedRoom.status === RoomStatus.AVAILABLE)) {
             action = 'CHECK_OUT';
             desc = `Check-out: ${room.guestName || 'Unknown Guest'}`;
         } else if (editedRoom.status === RoomStatus.MAINTENANCE) {
             action = 'MAINTENANCE';
             desc = `Maintenance reported: ${editedRoom.maintenanceIssue || 'No details'}`;
         }

         newHistory.unshift({ date: now, action, description: desc });
         historyAdded = true;
      }
      
      // Guest Name Correction (if not status change)
      if (!historyAdded && room.guestName !== editedRoom.guestName && editedRoom.status === RoomStatus.OCCUPIED) {
          newHistory.unshift({ 
              date: now, 
              action: 'INFO', 
              description: `Guest details updated: ${editedRoom.guestName}` 
          });
      }

      const roomToSave = { ...editedRoom, history: newHistory };
      onUpdate(roomToSave);
      onClose();
    }
  };

  // Dedicated function for strict state machine transitions
  const handleTransition = (targetStatus: RoomStatus, logAction: RoomHistoryEntry['action'], logDesc: string) => {
      if (!editedRoom) return;

      const newHistory = [...(editedRoom.history || [])];
      newHistory.unshift({
          date: new Date().toISOString(),
          action: logAction,
          description: logDesc
      });

      let updates: Partial<Room> = { status: targetStatus, history: newHistory };

      // Logic for cleaning up data when leaving Occupied
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
      
      // Logic for cleaning data when entering Available from Dirty
      if (editedRoom.status === RoomStatus.DIRTY && targetStatus === RoomStatus.AVAILABLE) {
           // Keep nothing
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
          // Auto fill ID scanned if guest has an ID number in the system
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

  // --- State Machine Workflow Buttons ---
  const renderWorkflowActions = () => {
    const status = editedRoom.status;

    if (status === RoomStatus.DIRTY) {
      return (
        <div className="grid grid-cols-2 gap-3 mb-6">
            <button 
                onClick={() => handleTransition(RoomStatus.AVAILABLE, 'STATUS_CHANGE', 'Room cleaned and marked Available')}
                className="flex flex-col items-center justify-center p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors group"
            >
                <div className="p-2 bg-emerald-100 dark:bg-emerald-800 rounded-full text-emerald-600 dark:text-emerald-300 mb-1 group-hover:scale-110 transition-transform">
                    <Sparkles className="w-5 h-5" />
                </div>
                <span className="text-sm font-bold text-emerald-800 dark:text-emerald-200">{t.workflow.markClean}</span>
            </button>
             <button 
                onClick={() => setEditedRoom({...editedRoom, status: RoomStatus.MAINTENANCE})}
                className="flex flex-col items-center justify-center p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors group"
            >
                 <div className="p-2 bg-slate-200 dark:bg-slate-700 rounded-full text-slate-600 dark:text-slate-300 mb-1 group-hover:scale-110 transition-transform">
                    <WrenchIcon />
                </div>
                <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{t.workflow.startMaintenance}</span>
            </button>
        </div>
      );
    }

    if (status === RoomStatus.MAINTENANCE) {
        return (
            <div className="mb-6">
                <button 
                    onClick={() => handleTransition(RoomStatus.DIRTY, 'MAINTENANCE', 'Maintenance completed. Room needs cleaning.')}
                    className="w-full flex items-center justify-center gap-2 p-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md transition-all font-bold"
                >
                    <Check className="w-5 h-5" /> {t.workflow.finishMaintenance}
                </button>
            </div>
        );
    }

    if (status === RoomStatus.OCCUPIED) {
         return (
            <div className="mb-6">
                <button 
                    onClick={() => handleTransition(RoomStatus.DIRTY, 'CHECK_OUT', `Check-out processed: ${editedRoom.guestName}`)}
                    className="w-full flex items-center justify-center gap-2 p-4 bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 rounded-xl hover:bg-rose-100 dark:hover:bg-rose-900/40 shadow-sm transition-all font-bold"
                >
                    <ArrowRight className="w-5 h-5" /> {t.workflow.checkOut}
                </button>
            </div>
        );
    }

    if (status === RoomStatus.AVAILABLE) {
        // For available, we usually show the guest form, but we can offer Maintenance blocking
        return (
             <div className="flex justify-end mb-4">
                 <button 
                    onClick={() => setEditedRoom({...editedRoom, status: RoomStatus.MAINTENANCE})}
                    className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-800 rounded-lg transition-colors"
                 >
                    <ShieldAlert className="w-3.5 h-3.5" /> {t.workflow.startMaintenance}
                 </button>
             </div>
        );
    }

    if (status === RoomStatus.RESERVED) {
        return (
            <div className="grid grid-cols-2 gap-3 mb-6">
                <button 
                    onClick={() => setEditedRoom({...editedRoom, status: RoomStatus.OCCUPIED})}
                    className="flex items-center justify-center gap-2 p-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-colors"
                >
                    <UserCheck className="w-4 h-4" /> {t.workflow.checkIn}
                </button>
                <button 
                    onClick={() => handleTransition(RoomStatus.AVAILABLE, 'STATUS_CHANGE', 'Reservation Cancelled')}
                    className="flex items-center justify-center gap-2 p-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-xl font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                    <X className="w-4 h-4" /> {t.workflow.cancelRes}
                </button>
            </div>
        )
    }

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

        {/* State Machine Workflow Area */}
        {renderWorkflowActions()}

        {/* Manual Override & Current Status Display */}
        <div className="mb-6 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-100 dark:border-slate-700">
             <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t.detail.manualOverride}</label>
             </div>
             <select 
                value={editedRoom.status}
                onChange={(e) => setEditedRoom({...editedRoom, status: e.target.value as RoomStatus})}
                className="w-full mt-2 p-2 border border-slate-200 dark:border-slate-600 rounded focus:ring-1 focus:ring-indigo-500 focus:outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm font-medium"
            >
                {Object.values(RoomStatus).map((status) => (
                <option key={status} value={status}>{t.status[status]}</option>
                ))}
            </select>
        </div>

        {/* Upcoming Reservation Banner */}
        {editedRoom.upcomingReservation && (
            <div className={`mb-6 border p-4 rounded-xl flex justify-between items-start ${dateConflict ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800/50' : 'bg-purple-50 dark:bg-purple-900/20 border-purple-100 dark:border-purple-800/50'}`}>
                 <div>
                     <h4 className={`flex items-center gap-2 font-bold text-sm mb-2 ${dateConflict ? 'text-red-800 dark:text-red-300' : 'text-purple-800 dark:text-purple-300'}`}>
                         <CalendarDays className="w-4 h-4" /> Upcoming Reservation
                     </h4>
                     <div className={`text-sm ${dateConflict ? 'text-red-900 dark:text-red-200' : 'text-purple-900 dark:text-purple-200'}`}>
                         <div className="font-semibold">{editedRoom.upcomingReservation.guestName}</div>
                         <div className="text-xs mt-1 opacity-80">
                             {editedRoom.upcomingReservation.checkInDate} to {editedRoom.upcomingReservation.checkOutDate}
                         </div>
                         {dateConflict && (
                             <div className="flex items-center gap-1 mt-2 text-xs font-bold text-red-600 dark:text-red-400">
                                 <AlertOctagon className="w-3 h-3" /> CONFLICT DETECTED
                             </div>
                         )}
                     </div>
                 </div>
                 <button 
                    onClick={() => setEditedRoom({...editedRoom, upcomingReservation: undefined})}
                    className={`p-1.5 rounded transition-colors ${dateConflict ? 'hover:bg-red-100 dark:hover:bg-red-800 text-red-700 dark:text-red-300' : 'hover:bg-purple-100 dark:hover:bg-purple-800 text-purple-700 dark:text-purple-300'}`}
                    title="Remove reservation"
                 >
                    <Trash2 className="w-4 h-4" />
                 </button>
            </div>
        )}

        {/* Dynamic Forms based on State */}
        <div className="space-y-6">
          
          {/* Check In / Guest Info */}
          {(canCheckIn || isOccupied) && (
            <div className={`p-4 rounded-xl border shadow-sm animate-in fade-in slide-in-from-bottom-4 ${dateConflict ? 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800' : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700'}`}>
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                    <UserCheck className="w-5 h-5 text-indigo-600 dark:text-indigo-400" /> {t.detail.guestInfo}
                </h3>
                {dateConflict && (
                    <span className="text-[10px] font-bold bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-300 px-2 py-1 rounded-full animate-pulse border border-red-200 dark:border-red-800">
                        {t.detail.dateConflict}
                    </span>
                )}
              </div>
              
              <div className="space-y-4">
                {/* Guest Finder / Searcher */}
                {!editedRoom.guestName && (
                    <GuestFinder onSelectGuest={handleGuestSelect} lang={lang} />
                )}

                {/* Selected Guest Display */}
                {editedRoom.guestName && (
                    <div className="bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-800 p-3 rounded-lg flex justify-between items-center mb-2 shadow-sm">
                         <div className="flex items-center gap-2">
                             <div className="bg-indigo-100 dark:bg-indigo-900/50 p-1.5 rounded-full text-indigo-700 dark:text-indigo-300">
                                 <UserIcon />
                             </div>
                             <div>
                                 <div className="font-bold text-slate-900 dark:text-white text-sm">{editedRoom.guestName}</div>
                                 <div className="text-xs text-slate-500 dark:text-slate-400">Guest ID Linked</div>
                             </div>
                         </div>
                         <button 
                             onClick={() => setEditedRoom({...editedRoom, guestName: undefined, guestId: undefined, isIdScanned: false})}
                             className="text-xs text-rose-500 hover:text-rose-700 dark:hover:text-rose-400 underline"
                         >
                             Change
                         </button>
                    </div>
                )}

                {/* Fallback Manual Name Input (hidden if name is set via finder, shown if user wants to edit or if legacy data) */}
                <div className={editedRoom.guestName ? 'hidden' : ''}>
                  <label className="block text-xs uppercase text-slate-700 dark:text-slate-300 font-bold mb-1">{t.detail.guestName}</label>
                  <input 
                    type="text" 
                    value={editedRoom.guestName || ''}
                    onChange={(e) => setEditedRoom({...editedRoom, guestName: e.target.value})}
                    placeholder={t.detail.enterGuestName}
                    className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded focus:outline-none focus:border-indigo-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400"
                  />
                </div>

                {/* Hourly Toggle */}
                <div className="flex items-center gap-3 pb-2 border-b border-slate-200 dark:border-slate-700">
                    <button 
                        onClick={() => setEditedRoom({...editedRoom, isHourly: !editedRoom.isHourly})}
                        className={`w-10 h-6 rounded-full transition-colors relative flex-shrink-0 ${editedRoom.isHourly ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-600'}`}
                    >
                        <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${editedRoom.isHourly ? 'translate-x-5' : 'translate-x-1'}`} />
                    </button>
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
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
                    <DateInput 
                        label={t.detail.checkIn}
                        value={editedRoom.checkInDate}
                        onChange={(val) => setEditedRoom({...editedRoom, checkInDate: val})}
                        lang={lang}
                        error={dateConflict}
                    />
                    <div className="space-y-2 mt-2">
                      {editedRoom.isHourly && (
                        <select
                           value={editedRoom.checkInTime || '12:00'}
                           onChange={(e) => setEditedRoom({...editedRoom, checkInTime: e.target.value})}
                           className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded focus:outline-none focus:border-indigo-500 font-mono text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
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
                        error={dateConflict}
                    />
                    <div className="space-y-2 mt-2">
                         {editedRoom.isHourly && (
                            <select
                               value={editedRoom.checkOutTime || '14:00'}
                               onChange={(e) => setEditedRoom({...editedRoom, checkOutTime: e.target.value})}
                               className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded focus:outline-none focus:border-indigo-500 font-mono text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
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
                        className="w-full py-2 px-3 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-lg text-sm font-bold hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors flex items-center justify-center gap-2 border border-indigo-200 dark:border-indigo-800"
                      >
                        {aiLoading ? <span className="animate-spin">⏳</span> : <Sparkles className="w-4 h-4" />}
                        {t.detail.genWelcome}
                      </button>
                      {aiResponse && !isMaintenance && (
                        <div className="mt-3 p-3 bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-900 rounded-lg text-sm text-slate-800 dark:text-slate-200 italic shadow-sm">
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
             <div className="bg-rose-50 dark:bg-rose-900/20 p-4 rounded-xl border border-rose-200 dark:border-rose-800/50 shadow-sm animate-in fade-in slide-in-from-bottom-4">
               <h3 className="text-lg font-bold text-rose-800 dark:text-rose-400 mb-4 flex items-center gap-2">
                 <WrenchIcon /> {t.detail.maintenance}
               </h3>
               <div>
                  <label className="block text-xs uppercase text-rose-700 dark:text-rose-400 font-bold mb-1">{t.detail.issueDesc}</label>
                  <textarea 
                    value={editedRoom.maintenanceIssue || ''}
                    onChange={(e) => setEditedRoom({...editedRoom, maintenanceIssue: e.target.value})}
                    placeholder={t.detail.issuePlaceholder}
                    rows={3}
                    className="w-full p-2 border border-rose-300 dark:border-rose-700 rounded focus:outline-none focus:border-rose-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-rose-300"
                  />
               </div>
               {editedRoom.maintenanceIssue && (
                   <div className="pt-2 mt-2">
                      <button 
                        onClick={handleGenerateMaintenance}
                        disabled={aiLoading}
                        className="w-full py-2 px-3 bg-white dark:bg-slate-800 text-rose-700 dark:text-rose-400 border border-rose-300 dark:border-rose-700 rounded-lg text-sm font-bold hover:bg-rose-50 dark:hover:bg-rose-900/30 transition-colors flex items-center justify-center gap-2"
                      >
                         {aiLoading ? <span className="animate-spin">⏳</span> : <Sparkles className="w-4 h-4" />}
                        {t.detail.askAi}
                      </button>
                      {aiResponse && (
                        <div className="mt-3 p-3 bg-white dark:bg-slate-800 border border-rose-200 dark:border-rose-900 rounded-lg text-sm text-slate-900 dark:text-white whitespace-pre-wrap shadow-sm">
                          {aiResponse}
                        </div>
                      )}
                   </div>
                )}
             </div>
          )}

          {/* Collapsible History Section - NEW IMPLEMENTATION */}
          <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden shadow-sm bg-white dark:bg-slate-800">
             <button 
                onClick={() => setShowHistory(!showHistory)}
                className="w-full p-4 flex items-center justify-between bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
             >
                <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-200">
                   <History className="w-4 h-4" /> {t.detail.history}
                </div>
                <div className={`transform transition-transform text-slate-600 dark:text-slate-400 ${showHistory ? 'rotate-180' : ''}`}>
                    <ArrowDown className="w-4 h-4" />
                </div>
             </button>
             
             {showHistory && (
                <div className="p-4 bg-slate-50/50 dark:bg-slate-900/50 max-h-96 overflow-y-auto custom-scrollbar">
                    {(!editedRoom.history || editedRoom.history.length === 0) ? (
                        <div className="text-center text-slate-400 text-sm py-4 italic">{t.detail.noHistory}</div>
                    ) : (
                        <div className="relative pl-4 space-y-6 mt-2">
                            {/* Timeline Vertical Line */}
                            <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-slate-200 dark:bg-slate-700"></div>

                            {editedRoom.history.map((entry, idx) => (
                                <div key={idx} className="relative pl-8 group">
                                    {/* Timeline Dot */}
                                    <div className={`
                                        absolute left-0 top-1 w-6 h-6 rounded-full border-4 border-slate-50 dark:border-slate-900 flex items-center justify-center z-10 box-content
                                        ${entry.action === 'CHECK_IN' ? 'bg-emerald-500 text-white' : 
                                          entry.action === 'CHECK_OUT' ? 'bg-rose-500 text-white' :
                                          entry.action === 'MAINTENANCE' ? 'bg-amber-500 text-white' :
                                          'bg-slate-400 text-white'}
                                    `}>
                                        {entry.action === 'CHECK_IN' && <ArrowRight className="w-3 h-3" />}
                                        {entry.action === 'CHECK_OUT' && <ArrowRight className="w-3 h-3 rotate-180" />}
                                        {entry.action === 'MAINTENANCE' && <WrenchIcon />}
                                        {entry.action !== 'CHECK_IN' && entry.action !== 'CHECK_OUT' && entry.action !== 'MAINTENANCE' && <History className="w-3 h-3" />}
                                    </div>

                                    {/* Content Card */}
                                    <div className="bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm group-hover:shadow-md transition-all group-hover:translate-x-1">
                                        <div className="flex justify-between items-start mb-1 gap-2">
                                            <div className="font-mono text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
                                                {new Date(entry.date).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                            {entry.staffName && (
                                                <span className="text-[9px] px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 rounded-full text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-600 font-bold">
                                                    {entry.staffName}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-sm text-slate-700 dark:text-slate-200 font-medium leading-relaxed">
                                            {entry.description}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
             )}
          </div>

          {/* Collapsible Configuration Section */}
          <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden shadow-sm">
             <button 
                onClick={() => setShowConfig(!showConfig)}
                className="w-full p-4 flex items-center justify-between bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
             >
                <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-200">
                   <Settings className="w-4 h-4" /> {t.detail.config}
                </div>
                <div className={`transform transition-transform text-slate-600 dark:text-slate-400 ${showConfig ? 'rotate-180' : ''}`}>▼</div>
             </button>
             
             {showConfig && (
                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 space-y-4 border-t border-slate-200 dark:border-slate-700">
                   <div>
                      <label className="block text-xs uppercase text-slate-700 dark:text-slate-400 font-bold mb-1">{t.detail.roomName}</label>
                      <input 
                        type="text" 
                        value={editedRoom.name || ''}
                        onChange={(e) => setEditedRoom({...editedRoom, name: e.target.value})}
                        placeholder={`e.g. Suite ${editedRoom.number}`}
                        className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded focus:outline-none focus:border-indigo-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400"
                      />
                   </div>
                   <div className="grid grid-cols-2 gap-4">
                     <div>
                        <label className="block text-xs uppercase text-slate-700 dark:text-slate-400 font-bold mb-1">{t.detail.roomNumber}</label>
                        <input 
                          type="text" 
                          value={editedRoom.number}
                          onChange={(e) => setEditedRoom({...editedRoom, number: e.target.value})}
                          className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded focus:outline-none focus:border-indigo-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                        />
                     </div>
                     <div>
                        <label className="block text-xs uppercase text-slate-700 dark:text-slate-400 font-bold mb-1">{t.detail.capacity}</label>
                        <input 
                          type="number" 
                          min="1"
                          max="10"
                          value={editedRoom.capacity}
                          onChange={(e) => setEditedRoom({...editedRoom, capacity: parseInt(e.target.value) || 1})}
                          className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded focus:outline-none focus:border-indigo-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                        />
                     </div>
                   </div>
                </div>
             )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-6 border-t border-slate-200 dark:border-slate-700">
             <button 
                onClick={handleSave}
                disabled={dateConflict}
                className={`flex-1 py-3 rounded-lg font-bold transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 ${dateConflict ? 'bg-slate-300 cursor-not-allowed text-slate-500' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}
             >
               <Save className="w-4 h-4" /> {t.detail.save}
             </button>
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
