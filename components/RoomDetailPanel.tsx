
import React, { useState, useEffect } from 'react';
import { Room, RoomStatus, BookingSource, Guest, RoomHistoryEntry, Booking, BookingType, Reservation, InvoiceStatus, PaymentMethod } from '../types';
import { X, Sparkles, Check, Trash2, Save, ArrowRight, Settings, Users, Clock, CalendarDays, FileCheck, DollarSign, UserCheck, History, ArrowDown, ShieldAlert, PlayCircle, StopCircle, RefreshCw, AlertOctagon, PlusCircle, User as UserIcon, Lock, Unlock, FileText, LogIn, Pencil, Building2, StickyNote, CreditCard, QrCode, Banknote, Ticket } from 'lucide-react';
import { generateWelcomeMessage, getMaintenanceAdvice } from '../services/geminiService';
import { hasBookingConflict, isTimeSlotAvailable } from '../services/validationService';
import { translations, Language } from '../translations';
import { GuestFinder } from './GuestFinder';
import { supabase, isSupabaseConfigured } from '../services/supabaseClient';

interface RoomDetailPanelProps {
  room: Room | null;
  rooms: Room[]; 
  onClose: () => void;
  onUpdate: (updatedRoom: Room) => void;
  onMoveReservation: (sourceRoomId: string, targetRoomId: string, reservation: Reservation) => void; 
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

export const RoomDetailPanel: React.FC<RoomDetailPanelProps> = ({ room, rooms, onClose, onUpdate, onMoveReservation, lang }) => {
  const [editedRoom, setEditedRoom] = useState<Room | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState<string>('');
  const [showHistory, setShowHistory] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  
  const [isConfigUnlocked, setIsConfigUnlocked] = useState(false);
  const [configPass, setConfigPass] = useState('');

  const [isAddingFutureRes, setIsAddingFutureRes] = useState(false);
  const [editingFutureResId, setEditingFutureResId] = useState<string | null>(null);
  const [futureRes, setFutureRes] = useState<Partial<Reservation>>({});
  const [targetRoomId, setTargetRoomId] = useState<string>('');

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
      if (nextRoom.invoiceStatus === undefined) nextRoom.invoiceStatus = InvoiceStatus.NONE;
      if (nextRoom.salePrice === undefined) nextRoom.salePrice = nextRoom.price;
      if (nextRoom.paymentMethod === undefined) nextRoom.paymentMethod = PaymentMethod.CASH;
      if (!nextRoom.history) nextRoom.history = [];
      if (!nextRoom.futureReservations) nextRoom.futureReservations = [];
      if (!nextRoom.pastReservations) nextRoom.pastReservations = [];
      if (nextRoom.notes === undefined) nextRoom.notes = '';

      setEditedRoom(nextRoom);
      setAiResponse('');
      setShowConfig(false);
      setShowHistory(false);
      setIsConfigUnlocked(false);
      setConfigPass('');
      setIsAddingFutureRes(false);
      setEditingFutureResId(null);
      setTargetRoomId(room.id);
      
      resetFutureResForm();
    }
  }, [room]);

  const resetFutureResForm = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dayAfter = new Date();
    dayAfter.setDate(dayAfter.getDate() + 2);

    const formatDate = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };

    setFutureRes({
      guestName: '',
      checkInDate: formatDate(tomorrow),
      checkOutDate: formatDate(dayAfter),
      checkInTime: '14:00',
      checkOutTime: '12:00',
      isHourly: false,
      source: BookingSource.WALK_IN,
      paymentMethod: PaymentMethod.CASH
    });
  };

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

      let updatedRoom = { ...editedRoom };

      if (isSupabaseConfigured() && updatedRoom.status === RoomStatus.OCCUPIED && updatedRoom.guestName) {
           const startDateTime = `${updatedRoom.checkInDate}T${updatedRoom.checkInTime || '14:00'}:00`;
           const endDateTime = `${updatedRoom.checkOutDate}T${updatedRoom.checkOutTime || '12:00'}:00`;
           
           let type = BookingType.STANDARD;
           if (updatedRoom.isHourly) type = BookingType.HOURLY;
           
           await supabase.from('bookings').insert({
               room_id: updatedRoom.id,
               guest_name: updatedRoom.guestName,
               guest_id: updatedRoom.guestId,
               check_in_at: new Date(startDateTime).toISOString(),
               check_out_at: new Date(endDateTime).toISOString(),
               booking_type: type,
               status: 'CHECKED_IN',
               payment_method: updatedRoom.paymentMethod
           });
      }

      const newHistory: RoomHistoryEntry[] = [...(updatedRoom.history || [])];
      const now = new Date().toISOString();
      let historyAdded = false;

      if (room.status !== updatedRoom.status) {
         let action: RoomHistoryEntry['action'] = 'STATUS_CHANGE';
         let desc = `Status changed: ${t.status[room.status]} -> ${t.status[updatedRoom.status]}`;
         if (room.status === RoomStatus.AVAILABLE && updatedRoom.status === RoomStatus.OCCUPIED) {
             action = 'CHECK_IN';
             desc = `Check-in: ${updatedRoom.guestName || 'Unknown Guest'} (${updatedRoom.isHourly ? 'Hourly' : 'Standard'}) via ${t.payments[updatedRoom.paymentMethod || PaymentMethod.CASH]}`;
         } else if (room.status === RoomStatus.OCCUPIED && (updatedRoom.status === RoomStatus.DIRTY || updatedRoom.status === RoomStatus.AVAILABLE)) {
             action = 'CHECK_OUT';
             desc = `Check-out: ${room.guestName || 'Unknown Guest'}`;
         }
         newHistory.unshift({ date: now, action, description: desc });
         historyAdded = true;
      }
      
      if (!historyAdded && room.guestName !== updatedRoom.guestName && updatedRoom.status === RoomStatus.OCCUPIED) {
          newHistory.unshift({ date: now, action: 'INFO', description: `Guest details updated: ${updatedRoom.guestName}` });
      }

      const roomToSave = { ...updatedRoom, history: newHistory };
      onUpdate(roomToSave);
      onClose();
    }
  };

  const applyFutureReservation = async () => {
    if (!futureRes.guestName || !futureRes.checkInDate || !futureRes.checkOutDate) return;

    const resData: Reservation = {
        id: editingFutureResId || Date.now().toString(),
        guestName: futureRes.guestName,
        checkInDate: futureRes.checkInDate,
        checkOutDate: futureRes.checkOutDate,
        checkInTime: futureRes.checkInTime || '14:00',
        checkOutTime: futureRes.checkOutTime || '12:00',
        isHourly: !!futureRes.isHourly,
        source: futureRes.source || BookingSource.WALK_IN,
        paymentMethod: futureRes.paymentMethod || PaymentMethod.CASH
    };

    if (targetRoomId && targetRoomId !== room.id) {
        onMoveReservation(room.id, targetRoomId, resData);
        setIsAddingFutureRes(false);
        setEditingFutureResId(null);
        resetFutureResForm();
        return;
    }

    let updatedList = [...(editedRoom.futureReservations || [])];
    if (editingFutureResId) {
        updatedList = updatedList.map(r => r.id === editingFutureResId ? resData : r);
    } else {
        updatedList.push(resData);
    }

    setEditedRoom({
        ...editedRoom,
        futureReservations: updatedList,
        history: [{
            date: new Date().toISOString(),
            action: 'INFO',
            description: `${editingFutureResId ? 'Updated' : 'Added'} ${resData.isHourly ? 'hourly' : 'daily'} reservation for ${resData.guestName}`
        }, ...(editedRoom.history || [])]
    });

    setIsAddingFutureRes(false);
    setEditingFutureResId(null);
    resetFutureResForm();
  };

  const handleTransition = (targetStatus: RoomStatus, logAction: RoomHistoryEntry['action'], logDesc: string) => {
      if (!editedRoom) return;
      const newHistory = [...(editedRoom.history || [])];
      newHistory.unshift({ date: new Date().toISOString(), action: logAction, description: logDesc });
      
      let updates: Partial<Room> = { status: targetStatus, history: newHistory };
      
      if (editedRoom.status === RoomStatus.OCCUPIED && (targetStatus === RoomStatus.DIRTY || targetStatus === RoomStatus.AVAILABLE)) {
          // ARCHIVE THE STAY BEFORE WIPING
          const archivedStay: Reservation = {
              id: `arch-${Date.now()}`,
              guestName: editedRoom.guestName || 'Unknown Guest',
              checkInDate: editedRoom.checkInDate || '',
              checkOutDate: editedRoom.checkOutDate || '',
              checkInTime: editedRoom.checkInTime,
              checkOutTime: editedRoom.checkOutTime,
              isHourly: editedRoom.isHourly,
              source: editedRoom.bookingSource,
              paymentMethod: editedRoom.paymentMethod
          };

          const updatedPast = [archivedStay, ...(editedRoom.pastReservations || [])];

          updates = {
              ...updates,
              pastReservations: updatedPast,
              guestName: undefined,
              guestId: undefined,
              isIdScanned: false,
              invoiceStatus: InvoiceStatus.NONE,
              checkInDate: undefined,
              checkOutDate: undefined,
              bookingSource: undefined,
              maintenanceIssue: undefined,
              salePrice: undefined,
              paymentMethod: undefined,
              isHourly: false,
              notes: ''
          };
      }

      const roomToSave = { ...editedRoom, ...updates };
      onUpdate(roomToSave);
      onClose();
  };

  const handleCheckInReservation = (res: Reservation) => {
    if (!editedRoom) return;
    
    if (editedRoom.status === RoomStatus.OCCUPIED) {
        if (!confirm("Room is already occupied. Process check-in for this new guest anyway?")) return;
    }

    const now = new Date().toISOString();
    const newHistory = [...(editedRoom.history || [])];
    newHistory.unshift({ 
        date: now, 
        action: 'CHECK_IN', 
        description: `Check-in from reservation: ${res.guestName} (${res.isHourly ? 'Hourly' : 'Standard'})` 
    });

    const updatedRoom: Room = {
        ...editedRoom,
        status: RoomStatus.OCCUPIED,
        guestName: res.guestName,
        checkInDate: res.checkInDate,
        checkOutDate: res.checkOutDate,
        checkInTime: res.checkInTime || '14:00',
        checkOutTime: res.checkOutTime || '12:00',
        isHourly: !!res.isHourly,
        bookingSource: res.source || BookingSource.WALK_IN,
        paymentMethod: res.paymentMethod || PaymentMethod.CASH,
        futureReservations: editedRoom.futureReservations?.filter(r => r.id !== res.id),
        history: newHistory,
        isIdScanned: false,
        invoiceStatus: InvoiceStatus.NONE,
        maintenanceIssue: undefined,
        notes: ''
    };
    
    onUpdate(updatedRoom);
    onClose();
  };

  const handleEditFutureRes = (res: Reservation) => {
    setFutureRes(res);
    setEditingFutureResId(res.id);
    setTargetRoomId(room.id);
    setIsAddingFutureRes(true);
  };

  const handleGuestSelect = (guest: Guest) => {
      if (isAddingFutureRes) {
        setFutureRes({ ...futureRes, guestName: guest.full_name });
      } else {
        setEditedRoom({
            ...editedRoom,
            guestName: guest.full_name,
            guestId: guest.id,
            isIdScanned: !!guest.id_number
        });
      }
  };

  const removeFutureRes = (id: string) => {
      if (!editedRoom) return;
      const updated = editedRoom.futureReservations?.filter(r => r.id !== id);
      setEditedRoom({ ...editedRoom, futureReservations: updated });
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

  const handleUnlockConfig = () => {
    if (configPass === 'admin123') {
        setIsConfigUnlocked(true);
    } else {
        alert(t.admin.wrongPass);
    }
  };

  const renderWorkflowActions = () => {
      const status = editedRoom.status;
      if (status === RoomStatus.DIRTY) {
        return (
            <div className="grid grid-cols-2 gap-3 mb-6">
                <button onClick={() => handleTransition(RoomStatus.AVAILABLE, 'STATUS_CHANGE', 'Room cleaned')} className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl font-bold text-emerald-800 flex flex-col items-center"><Sparkles className="w-5 h-5 mb-1" />{t.workflow.markClean}</button>
                <button onClick={() => setEditedRoom({...editedRoom, status: RoomStatus.MAINTENANCE})} className="p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 flex flex-col items-center">
                  <WrenchIcon className="mb-1" />
                  <span className="text-xs">{t.detail.maintenance}</span>
                </button>
            </div>
        );
      }
      if (status === RoomStatus.OCCUPIED) return <div className="mb-6"><button onClick={() => handleTransition(RoomStatus.DIRTY, 'CHECK_OUT', `Check-out: ${editedRoom.guestName}`)} className="w-full p-4 bg-rose-50 text-rose-700 border border-rose-200 rounded-xl font-bold flex items-center justify-center gap-2"><ArrowRight className="w-5 h-5" />{t.workflow.checkOut}</button></div>;
      if (status === RoomStatus.RESERVED) return <div className="grid grid-cols-2 gap-3 mb-6"><button onClick={() => setEditedRoom({...editedRoom, status: RoomStatus.OCCUPIED})} className="p-3 bg-indigo-600 text-white rounded-xl font-bold flex items-center justify-center gap-2"><UserCheck className="w-4 h-4" /> {t.workflow.checkIn}</button><button onClick={() => handleTransition(RoomStatus.AVAILABLE, 'STATUS_CHANGE', 'Reservation Cancelled')} className="p-3 bg-slate-100 text-slate-600 border rounded-xl font-bold flex items-center justify-center gap-2"><X className="w-4 h-4" />{t.workflow.cancelRes}</button></div>;
      return null;
  };

  const getPaymentIcon = (method?: PaymentMethod) => {
    switch (method) {
      case PaymentMethod.CASH: return <Banknote className="w-4 h-4" />;
      case PaymentMethod.CARD: return <CreditCard className="w-4 h-4" />;
      case PaymentMethod.QR_TRANSFER: return <QrCode className="w-4 h-4" />;
      case PaymentMethod.PREPAID: return <Ticket className="w-4 h-4" />;
      default: return <DollarSign className="w-4 h-4" />;
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 w-full md:w-[500px] bg-white dark:bg-slate-900 shadow-2xl transform transition-transform duration-300 ease-in-out border-l border-slate-200 dark:border-slate-800 z-50 overflow-y-auto">
      <div className="p-6 pb-24">
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

        <div className="flex flex-col gap-3 mb-6">
            <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-100 dark:border-slate-700">
                 <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t.detail.manualOverride}</label>
                 <select value={editedRoom.status} onChange={(e) => setEditedRoom({...editedRoom, status: e.target.value as RoomStatus})} className="w-full mt-2 p-2 border border-slate-200 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm font-medium">
                    {Object.values(RoomStatus).map((status) => <option key={status} value={status}>{t.status[status]}</option>)}
                </select>
            </div>
        </div>

        <div className="mb-6 space-y-3">
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                <CalendarDays className="w-4 h-4" /> Future Bookings
            </h3>
            {editedRoom.futureReservations?.map((res) => (
                <div key={res.id} className="bg-purple-50 dark:bg-purple-900/10 border border-purple-100 dark:border-purple-800/50 p-3 rounded-xl flex justify-between items-center group animate-in fade-in">
                    <div className="flex-1">
                        <div className="flex items-center gap-2">
                            <div className="font-bold text-sm text-purple-900 dark:text-purple-200">{res.guestName}</div>
                            {res.isHourly && (
                                <span className="text-[9px] bg-pink-100 dark:bg-pink-900/50 text-pink-700 dark:text-pink-300 border border-pink-200 dark:border-pink-800 px-1.5 py-0.5 rounded font-black uppercase flex items-center gap-1">
                                    <Clock className="w-2 h-2" /> {t.card.hourly}
                                </span>
                            )}
                            {res.paymentMethod && (
                                <span className="text-[9px] bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-1.5 py-0.5 rounded font-bold border border-indigo-100 dark:border-indigo-800 flex items-center gap-1">
                                    {getPaymentIcon(res.paymentMethod)}
                                    {t.payments[res.paymentMethod]}
                                </span>
                            )}
                        </div>
                        <div className="text-[10px] text-purple-700 dark:text-purple-400 font-mono">
                            {res.checkInDate} {res.checkInTime} → {res.checkOutDate} {res.checkOutTime}
                        </div>
                    </div>
                    <div className="flex items-center gap-1">
                        <button 
                            onClick={() => handleCheckInReservation(res)} 
                            title="Check In Now"
                            className="p-1.5 rounded opacity-0 group-hover:opacity-100 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 text-emerald-600 transition-all flex items-center gap-1"
                        >
                            <LogIn className="w-4 h-4" />
                            <span className="text-[10px] font-bold">Check In</span>
                        </button>
                        <button 
                            onClick={() => handleEditFutureRes(res)} 
                            title="Edit"
                            className="p-1.5 rounded opacity-0 group-hover:opacity-100 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 text-indigo-600 transition-all"
                        >
                            <Pencil className="w-4 h-4" />
                        </button>
                        <button 
                            onClick={() => removeFutureRes(res.id)} 
                            title="Delete"
                            className="p-1.5 rounded opacity-0 group-hover:opacity-100 hover:bg-rose-100 dark:hover:bg-rose-900/40 text-rose-500 transition-all"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            ))}
            {!isAddingFutureRes && (
                <button onClick={() => { setIsAddingFutureRes(true); resetFutureResForm(); setTargetRoomId(room.id); }} className="w-full py-3 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl text-slate-400 hover:text-indigo-600 hover:border-indigo-200 dark:hover:border-indigo-900 flex items-center justify-center gap-2 transition-all">
                    <PlusCircle className="w-4 h-4" /> <span className="text-xs font-bold uppercase tracking-wider">{t.detail.addFutureRes}</span>
                </button>
            )}
        </div>

        <div className="space-y-6">
          {(editedRoom.status === RoomStatus.AVAILABLE || editedRoom.status === RoomStatus.RESERVED || editedRoom.status === RoomStatus.OCCUPIED) && !isAddingFutureRes && (
            <div className={`p-4 rounded-xl border shadow-sm animate-in fade-in ${isConflict ? 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800' : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700'}`}>
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                    <UserCheck className="w-5 h-5 text-indigo-600 dark:text-indigo-400" /> {t.detail.guestInfo}
                </h3>
              </div>
              <div className="space-y-4">
                {!editedRoom.guestName && <GuestFinder onSelectGuest={handleGuestSelect} lang={lang} />}
                {editedRoom.guestName && (
                    <div className="bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-800 p-3 rounded-lg flex justify-between items-center shadow-sm">
                         <div className="flex items-center gap-2">
                             <div className="bg-indigo-100 dark:bg-indigo-900/50 p-1.5 rounded-full text-indigo-700 dark:text-indigo-300"><UserIcon /></div>
                             <div className="font-bold text-slate-900 dark:text-white text-sm">{editedRoom.guestName}</div>
                         </div>
                         <button onClick={() => setEditedRoom({...editedRoom, guestName: undefined, guestId: undefined, isIdScanned: false})} className="text-xs text-rose-500 hover:underline">Change</button>
                    </div>
                )}
                
                <div className="flex items-center gap-3">
                    <button type="button" onClick={() => setEditedRoom({...editedRoom, isHourly: !editedRoom.isHourly})} className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${editedRoom.isHourly ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-700'}`}><span className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${editedRoom.isHourly ? 'translate-x-5' : 'translate-x-0'}`} /></button>
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2 cursor-pointer" onClick={() => setEditedRoom({...editedRoom, isHourly: !editedRoom.isHourly})}><Clock className="w-4 h-4" /> {t.detail.hourly}</span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <DateInput label={t.detail.checkIn} value={editedRoom.checkInDate} onChange={(val) => setEditedRoom({...editedRoom, checkInDate: val})} lang={lang} error={isConflict} />
                    <select value={editedRoom.checkInTime || '14:00'} onChange={(e) => setEditedRoom({...editedRoom, checkInTime: e.target.value})} className="w-full mt-2 p-2 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 dark:text-white font-mono text-sm">
                        {TIME_SLOTS.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <DateInput label={t.detail.checkOut} value={editedRoom.checkOutDate} onChange={(val) => setEditedRoom({...editedRoom, checkOutDate: val})} lang={lang} error={isConflict} />
                    <select value={editedRoom.checkOutTime || '12:00'} onChange={(e) => setEditedRoom({...editedRoom, checkOutTime: e.target.value})} className="w-full mt-2 p-2 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 dark:text-white font-mono text-sm">
                        {TIME_SLOTS.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs uppercase text-slate-700 dark:text-slate-300 font-bold mb-1">{t.detail.salePrice}</label>
                        <div className="relative">
                            <input 
                                    type="number"
                                    value={editedRoom.salePrice}
                                    onChange={(e) => setEditedRoom({...editedRoom, salePrice: parseFloat(e.target.value) || 0})}
                                    className="w-full p-2 pl-8 pr-4 border border-slate-300 dark:border-slate-600 rounded focus:outline-none focus:border-indigo-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono text-sm"
                            />
                            <div className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-[10px]">VND</div>
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs uppercase text-slate-700 dark:text-slate-300 font-bold mb-1">{t.detail.paymentMethod}</label>
                        <div className="relative">
                            <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400">
                                {getPaymentIcon(editedRoom.paymentMethod)}
                            </div>
                            <select
                                value={editedRoom.paymentMethod || PaymentMethod.CASH}
                                onChange={(e) => setEditedRoom({...editedRoom, paymentMethod: e.target.value as PaymentMethod})}
                                className="w-full pl-9 p-2 border border-slate-300 dark:border-slate-600 rounded focus:outline-none focus:border-indigo-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-bold"
                            >
                                {Object.values(PaymentMethod).map(method => (
                                    <option key={method} value={method}>{t.payments[method]}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs uppercase text-slate-700 dark:text-slate-300 font-bold mb-1">{t.detail.bookingSource}</label>
                    <select
                          value={editedRoom.bookingSource || ''}
                          onChange={(e) => setEditedRoom({...editedRoom, bookingSource: e.target.value as BookingSource})}
                          className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded focus:outline-none focus:border-indigo-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm"
                      >
                          <option value="">-- Select Source --</option>
                          {Object.values(BookingSource).map(src => (
                              <option key={src} value={src}>{t.sources[src]}</option>
                          ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs uppercase text-slate-700 dark:text-slate-300 font-bold mb-1">{t.detail.invoiceStatus}</label>
                    <select
                          value={editedRoom.invoiceStatus || InvoiceStatus.NONE}
                          onChange={(e) => setEditedRoom({...editedRoom, invoiceStatus: e.target.value as InvoiceStatus})}
                          className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded focus:outline-none focus:border-indigo-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm"
                      >
                          {Object.values(InvoiceStatus).map(status => (
                              <option key={status} value={status}>{t.invoice[status]}</option>
                          ))}
                    </select>
                  </div>
                </div>

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

                {editedRoom.guestName && (
                   <button onClick={handleGenerateWelcome} disabled={aiLoading} className="w-full py-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-lg text-sm font-bold hover:bg-indigo-100 transition-colors flex items-center justify-center gap-2 border border-indigo-200 dark:border-indigo-800">
                     {aiLoading ? <span className="animate-spin">⏳</span> : <Sparkles className="w-4 h-4" />}{t.detail.genWelcome}
                   </button>
                )}
                {aiResponse && <div className="mt-3 p-3 bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-900 rounded-lg text-sm italic">"{aiResponse}"</div>}
              </div>
            </div>
          )}

          {!isAddingFutureRes && (
            <div className="bg-amber-50/50 dark:bg-amber-900/10 p-4 rounded-xl border border-amber-100 dark:border-amber-800/50 shadow-sm animate-in fade-in">
              <h3 className="text-sm font-bold text-amber-800 dark:text-amber-400 mb-3 flex items-center gap-2">
                <StickyNote className="w-4 h-4" /> {t.detail.roomNotes}
              </h3>
              <textarea 
                value={editedRoom.notes || ''} 
                onChange={(e) => setEditedRoom({...editedRoom, notes: e.target.value})} 
                placeholder={t.detail.roomNotesPlaceholder} 
                rows={3} 
                className="w-full p-3 border border-amber-200 dark:border-amber-900/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/30 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-amber-300 text-sm"
              />
            </div>
          )}

          {isAddingFutureRes && (
            <div className="p-4 rounded-xl border-2 border-purple-300 dark:border-purple-700 bg-purple-50 dark:bg-purple-900/10 animate-in slide-in-from-right-4 space-y-4 shadow-inner">
                <div className="flex justify-between items-center">
                    <h4 className="font-bold text-purple-800 dark:text-purple-400 flex items-center gap-2 text-sm uppercase tracking-wider">
                        <CalendarDays className="w-4 h-4" /> 
                        {editingFutureResId ? 'Edit Reservation' : t.detail.futureGuest}
                    </h4>
                    <button onClick={() => { setIsAddingFutureRes(false); setEditingFutureResId(null); }} className="text-xs text-rose-500 font-bold underline px-2 py-1 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded transition-colors">{t.detail.cancelFuture}</button>
                </div>
                {!futureRes.guestName ? <GuestFinder onSelectGuest={handleGuestSelect} lang={lang} /> : (
                    <div className="bg-white dark:bg-slate-800 border border-purple-200 dark:border-purple-800 p-3 rounded-lg flex justify-between items-center shadow-sm">
                        <div className="flex items-center gap-2"><UserIcon className="w-5 h-5 text-purple-600" /> <div className="font-bold text-sm text-slate-900 dark:text-white">{futureRes.guestName}</div></div>
                        <button onClick={() => setFutureRes({...futureRes, guestName: undefined})} className="text-xs text-rose-500 hover:underline">Change</button>
                    </div>
                )}
                
                <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                        <label className="block text-xs uppercase text-slate-700 dark:text-slate-300 font-bold mb-1 flex items-center gap-1">
                            <Building2 className="w-3 h-3 text-purple-600" /> Assigned Room
                        </label>
                        <select 
                            value={targetRoomId} 
                            onChange={(e) => setTargetRoomId(e.target.value)}
                            className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm font-bold focus:ring-2 focus:ring-purple-500 outline-none"
                        >
                            {rooms.map(r => (
                                <option key={r.id} value={r.id}>
                                    Room {r.number} {r.name ? `- ${r.name}` : ''}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="col-span-2 flex items-center gap-3 bg-white/40 dark:bg-black/10 p-2 rounded-lg border border-purple-100 dark:border-purple-800/30">
                        <button type="button" onClick={() => setFutureRes({...futureRes, isHourly: !futureRes.isHourly})} className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${futureRes.isHourly ? 'bg-purple-600' : 'bg-slate-200 dark:bg-slate-700'}`}><span className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${futureRes.isHourly ? 'translate-x-5' : 'translate-x-0'}`} /></button>
                        <span className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2 cursor-pointer" onClick={() => setFutureRes({...futureRes, isHourly: !futureRes.isHourly})}><Clock className="w-4 h-4" /> {t.detail.hourly}</span>
                    </div>

                    <div>
                        <DateInput label={t.detail.checkIn} value={futureRes.checkInDate} onChange={(val) => setFutureRes({...futureRes, checkInDate: val})} lang={lang} />
                        <select value={futureRes.checkInTime || '14:00'} onChange={(e) => setFutureRes({...futureRes, checkInTime: e.target.value})} className="w-full mt-2 p-2 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 dark:text-white font-mono text-sm">
                            {TIME_SLOTS.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                    </div>
                    <div>
                        <DateInput label={t.detail.checkOut} value={futureRes.checkOutDate} onChange={(val) => setFutureRes({...futureRes, checkOutDate: val})} lang={lang} />
                        <select value={futureRes.checkOutTime || '12:00'} onChange={(e) => setFutureRes({...futureRes, checkOutTime: e.target.value})} className="w-full mt-2 p-2 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 dark:text-white font-mono text-sm">
                            {TIME_SLOTS.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs uppercase text-slate-700 dark:text-slate-300 font-bold mb-1">{t.detail.bookingSource}</label>
                        <select
                            value={futureRes.source || BookingSource.WALK_IN}
                            onChange={(e) => setFutureRes({...futureRes, source: e.target.value as BookingSource})}
                            className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm"
                        >
                            {Object.values(BookingSource).map(src => (
                                <option key={src} value={src}>{t.sources[src]}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs uppercase text-slate-700 dark:text-slate-300 font-bold mb-1">{t.detail.paymentMethod}</label>
                        <select
                            value={futureRes.paymentMethod || PaymentMethod.CASH}
                            onChange={(e) => setFutureRes({...futureRes, paymentMethod: e.target.value as PaymentMethod})}
                            className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm"
                        >
                            {Object.values(PaymentMethod).map(method => (
                                <option key={method} value={method}>{t.payments[method]}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <button 
                    onClick={applyFutureReservation}
                    disabled={!futureRes.guestName}
                    className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold text-sm shadow-md transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                    {editingFutureResId ? <Save className="w-4 h-4" /> : <PlusCircle className="w-4 h-4" />}
                    {editingFutureResId ? (targetRoomId !== room.id ? 'Move Booking' : 'Update Reservation') : 'Add Reservation'}
                </button>
            </div>
          )}

          {editedRoom.status === RoomStatus.MAINTENANCE && (
            <div className="bg-rose-50 dark:bg-rose-900/20 p-4 rounded-xl border border-rose-200 dark:border-rose-800/50 shadow-sm animate-in fade-in">
               <h3 className="text-lg font-bold text-rose-800 dark:text-rose-400 mb-4 flex items-center gap-2"><WrenchIcon className="w-5 h-5" /> {t.detail.maintenance}</h3>
               <div>
                  <label className="block text-xs uppercase text-rose-700 dark:text-rose-400 font-bold mb-1">{t.detail.issueDesc}</label>
                  <textarea value={editedRoom.maintenanceIssue || ''} onChange={(e) => setEditedRoom({...editedRoom, maintenanceIssue: e.target.value})} placeholder={t.detail.issuePlaceholder} rows={3} className="w-full p-2 border border-rose-300 dark:border-rose-700 rounded focus:outline-none focus:border-rose-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-rose-300 text-sm" />
               </div>
               {editedRoom.maintenanceIssue && (
                   <div className="pt-2 mt-2">
                      <button onClick={handleGenerateMaintenance} disabled={aiLoading} className="w-full py-2 px-3 bg-white dark:bg-slate-800 text-rose-700 dark:text-rose-400 border border-rose-300 dark:border-rose-700 rounded-lg text-sm font-bold hover:bg-rose-50 transition-colors flex items-center justify-center gap-2">
                         {aiLoading ? <span className="animate-spin">⏳</span> : <Sparkles className="w-4 h-4" />}{t.detail.askAi}
                      </button>
                      {aiResponse && <div className="mt-3 p-3 bg-white dark:bg-slate-800 border border-rose-200 rounded-lg text-sm whitespace-pre-wrap">{aiResponse}</div>}
                   </div>
                )}
             </div>
          )}

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

          <div className="border border-amber-200 dark:border-amber-900 rounded-xl overflow-hidden shadow-sm bg-white dark:bg-slate-800">
                 <button onClick={() => setShowConfig(!showConfig)} className="w-full p-4 flex items-center justify-between bg-amber-50 dark:bg-slate-800 hover:bg-amber-100 dark:hover:bg-slate-700 transition-colors">
                    <div className="flex items-center gap-2 font-bold text-amber-800 dark:text-amber-400">
                        {isConfigUnlocked ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />} {t.detail.config}
                    </div>
                    <div className={`transform transition-transform text-slate-600 dark:text-slate-400 ${showConfig ? 'rotate-180' : ''}`}><ArrowDown className="w-4 h-4" /></div>
                 </button>
                 {showConfig && (
                    <div className="p-4 bg-amber-50/30 dark:bg-slate-900/50 space-y-4 animate-in slide-in-from-top-2">
                        {!isConfigUnlocked ? (
                            <div className="flex flex-col gap-3 py-2">
                                <div className="text-xs font-bold text-amber-800 dark:text-amber-500 flex items-center gap-1">
                                    <ShieldAlert className="w-3.5 h-3.5" /> Admin access required to change room basics
                                </div>
                                <div className="flex gap-2">
                                    <input 
                                        type="password" 
                                        placeholder={t.admin.passwordPlaceholder} 
                                        value={configPass}
                                        onChange={(e) => setConfigPass(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleUnlockConfig()}
                                        className="flex-1 p-2 text-sm border border-amber-200 dark:border-slate-700 rounded bg-white dark:bg-slate-800 dark:text-white"
                                    />
                                    <button 
                                        onClick={handleUnlockConfig}
                                        className="px-4 py-2 bg-amber-600 text-white rounded text-sm font-bold hover:bg-amber-700 transition-colors"
                                    >
                                        Unlock
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4 animate-in fade-in">
                                <div>
                                    <label className="block text-xs uppercase text-slate-700 dark:text-slate-300 font-bold mb-1">{t.detail.roomName}</label>
                                    <input 
                                        type="text" 
                                        value={editedRoom.name || ''} 
                                        placeholder="e.g. Lakeside Penthouse"
                                        onChange={(e) => setEditedRoom({...editedRoom, name: e.target.value})} 
                                        className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 dark:text-white text-sm font-medium"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs uppercase text-slate-700 dark:text-slate-300 font-bold mb-1">{t.detail.capacity}</label>
                                    <div className="flex items-center gap-3">
                                        <Users className="w-4 h-4 text-slate-400" />
                                        <input 
                                            type="number" 
                                            value={editedRoom.capacity} 
                                            onChange={(e) => setEditedRoom({...editedRoom, capacity: parseInt(e.target.value) || 1})} 
                                            className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 dark:text-white text-sm font-medium"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                 )}
            </div>

          <div className="flex gap-3 pt-6 border-t border-slate-200 dark:border-slate-700">
             <button onClick={handleSave} className={`flex-1 py-3 rounded-lg font-bold transition-all shadow-md flex items-center justify-center gap-2 ${isConflict ? 'bg-rose-600 text-white animate-pulse' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}>
               <Save className="w-4 h-4" /> {t.detail.save}
             </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const WrenchIcon = ({ className }: { className?: string }) => (<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>);
