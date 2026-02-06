
import React, { useState, useMemo } from 'react';
import { Room, RoomStatus } from '../types';
import { translations, Language } from '../translations';
import { Users, ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';

interface CalendarViewProps {
  rooms: Room[];
  onRoomClick: (room: Room) => void;
  lang: Language;
}

export const CalendarView: React.FC<CalendarViewProps> = ({ rooms, onRoomClick, lang }) => {
  const t = translations[lang];
  const [startDate, setStartDate] = useState(new Date());

  // Generate 14 days based on startDate
  const dates = useMemo(() => Array.from({ length: 14 }, (_, i) => {
    const d = new Date(startDate);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + i);
    return d;
  }), [startDate]);

  const windowStartTime = dates[0].getTime();
  const windowEndTime = dates[13].getTime() + 86400000; // End of the 14th day

  const getDateString = (date: Date) => {
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    const y = date.getFullYear();
    return `${y}-${m}-${d}`;
  };

  const isSameDay = (d1: Date, dateStr?: string) => {
    if (!dateStr) return false;
    return getDateString(d1) === dateStr;
  };

  const handlePrev = () => {
    const newDate = new Date(startDate);
    newDate.setDate(newDate.getDate() - 1);
    setStartDate(newDate);
  };

  const handleNext = () => {
    const newDate = new Date(startDate);
    newDate.setDate(newDate.getDate() + 1);
    setStartDate(newDate);
  };

  const handleToday = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    setStartDate(today);
  };

  const handleDateInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.value) {
      const selected = new Date(e.target.value);
      selected.setHours(0, 0, 0, 0);
      setStartDate(selected);
    }
  };

  const getStatusColor = (status: RoomStatus) => {
    switch (status) {
        case RoomStatus.OCCUPIED: return 'bg-blue-500 border-blue-600 text-white dark:bg-blue-600 dark:border-blue-700';
        case RoomStatus.RESERVED: return 'bg-purple-500 border-purple-600 text-white dark:bg-purple-600 dark:border-purple-700';
        case RoomStatus.MAINTENANCE: return 'bg-rose-500 border-rose-600 text-white dark:bg-rose-600 dark:border-rose-700';
        case RoomStatus.DIRTY: return 'bg-amber-400 border-amber-500 text-white dark:bg-amber-600 dark:border-amber-700';
        default: return 'bg-slate-100 dark:bg-slate-700';
    }
  };

  const timeToMinutes = (timeStr?: string) => {
    if (!timeStr) return 0;
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  };

  /**
   * Calculates the left and width percentage for a booking bar relative to the 14-day grid.
   */
  const calculateBarPosition = (startStr: string, endStr: string, startTimeStr?: string, endTimeStr?: string) => {
    const start = new Date(`${startStr}T${startTimeStr || '14:00'}:00`).getTime();
    const end = new Date(`${endStr}T${endTimeStr || '12:00'}:00`).getTime();

    // Check if it overlaps with the 14-day window
    if (end <= windowStartTime || start >= windowEndTime) return null;

    // Clamp to window
    const effectiveStart = Math.max(start, windowStartTime);
    const effectiveEnd = Math.min(end, windowEndTime);

    const totalWindowMs = windowEndTime - windowStartTime;
    const left = ((effectiveStart - windowStartTime) / totalWindowMs) * 100;
    const width = ((effectiveEnd - effectiveStart) / totalWindowMs) * 100;

    return { left, width, isClippedLeft: start < windowStartTime, isClippedRight: end > windowEndTime };
  };

  const renderBarsForRow = (room: Room) => {
    const items: React.ReactNode[] = [];

    // 1. Current Active Stay/Reservation
    if ((room.status === RoomStatus.OCCUPIED || room.status === RoomStatus.RESERVED) && room.checkInDate && room.checkOutDate) {
      const pos = calculateBarPosition(room.checkInDate, room.checkOutDate, room.checkInTime, room.checkOutTime);
      if (pos) {
        items.push(
          <div
            key={`current-${room.id}`}
            className={`absolute top-2 bottom-2 flex items-center justify-center text-[10px] font-bold shadow-sm px-2 border-y ${getStatusColor(room.status)} ${!pos.isClippedLeft ? 'rounded-l-md border-l' : ''} ${!pos.isClippedRight ? 'rounded-r-md border-r' : ''}`}
            style={{ left: `${pos.left}%`, width: `${pos.width}%`, zIndex: 20 }}
          >
            <span className="truncate w-full text-center px-1">
              {room.guestName || t.status[room.status]}
            </span>
          </div>
        );
      }
    }

    // 2. Future Reservations
    if (room.futureReservations && room.futureReservations.length > 0) {
      room.futureReservations.forEach((res, idx) => {
        const pos = calculateBarPosition(res.checkInDate, res.checkOutDate, res.checkInTime, res.checkOutTime);
        if (pos) {
          items.push(
            <div
              key={`future-${room.id}-${idx}`}
              className={`absolute top-2 bottom-2 flex items-center justify-center text-[10px] font-bold shadow-sm px-2 border-y bg-purple-500 border-purple-600 text-white dark:bg-purple-600 dark:border-purple-700 ${!pos.isClippedLeft ? 'rounded-l-md border-l' : ''} ${!pos.isClippedRight ? 'rounded-r-md border-r' : ''}`}
              style={{ left: `${pos.left}%`, width: `${pos.width}%`, zIndex: 10 }}
            >
              <span className="truncate w-full text-center px-1">
                {res.guestName}
              </span>
            </div>
          );
        }
      });
    }

    // 3. Maintenance/Dirty status indicators (Today only)
    const todayStr = getDateString(new Date());
    const todayPos = calculateBarPosition(todayStr, todayStr, '00:00', '23:59');
    
    if (todayPos && (room.status === RoomStatus.MAINTENANCE || room.status === RoomStatus.DIRTY || (room.status === RoomStatus.AVAILABLE))) {
      // Only show static background indicators if no booking overlaps the current moment significantly
      // But user specifically asked for "bars" to be continuous. Maintenance/Dirty are usually room-level states.
      // We'll render them as background highlights for today if they are the current status.
      if (room.status === RoomStatus.MAINTENANCE) {
        items.push(
          <div 
            key={`maint-${room.id}`}
            className="absolute inset-y-1 rounded-md bg-rose-100 dark:bg-rose-900/30 border border-rose-200 dark:border-rose-800 flex items-center justify-center opacity-50 pointer-events-none"
            style={{ left: `${todayPos.left}%`, width: `${todayPos.width}%` }}
          >
             <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
          </div>
        );
      } else if (room.status === RoomStatus.DIRTY) {
        items.push(
          <div 
            key={`dirty-${room.id}`}
            className="absolute inset-y-1 rounded-md bg-amber-100 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 flex items-center justify-center opacity-50 pointer-events-none"
            style={{ left: `${todayPos.left}%`, width: `${todayPos.width}%` }}
          >
             <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
          </div>
        );
      }
    }

    return items;
  };

  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden shadow-sm flex flex-col h-full">
      <div className="flex items-center justify-between p-3 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
        <div className="flex items-center gap-2">
            <button onClick={handlePrev} className="p-1.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900 transition-colors"><ChevronLeft className="w-5 h-5" /></button>
            <button onClick={handleToday} className="px-3 py-1.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm font-bold text-slate-600 dark:text-slate-300">{t.calendar.today}</button>
            <button onClick={handleNext} className="p-1.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900 transition-colors"><ChevronRight className="w-5 h-5" /></button>
        </div>
        <div className="flex items-center gap-2">
            <CalendarIcon className="w-4 h-4 text-slate-400" />
            <input type="date" value={getDateString(startDate)} onChange={handleDateInput} className="text-sm font-bold bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg py-1 px-2 focus:outline-none focus:border-indigo-500 text-slate-700 dark:text-white" />
        </div>
      </div>
      
      <div className="overflow-auto flex-1 custom-scrollbar">
        <div className="min-w-[1200px] relative">
          {/* Header Row */}
          <div className="flex border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 sticky top-0 z-30">
            <div className="w-32 p-3 font-bold text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider sticky left-0 bg-slate-50 dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 z-40 shadow-sm">Room</div>
            {dates.map(date => {
                const isToday = isSameDay(date, getDateString(new Date()));
                return (
                    <div key={date.toISOString()} className={`flex-1 min-w-[80px] p-2 text-center border-r border-slate-100 dark:border-slate-700/50 ${isToday ? 'bg-indigo-50/50 dark:bg-indigo-900/20' : ''}`}>
                        <div className={`text-[10px] font-bold uppercase mb-1 ${isToday ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500'}`}>{date.toLocaleDateString(lang === 'vi' ? 'vi-VN' : 'en-US', { weekday: 'short' })}</div>
                        <div className={`text-sm font-bold ${isToday ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-700 dark:text-slate-300'}`}>{date.getDate()}</div>
                    </div>
                );
            })}
          </div>

          {/* Room Rows */}
          {rooms.map(room => (
            <div key={room.id} className="flex border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors group relative h-14">
                {/* Room Identifier Label */}
                <div onClick={() => onRoomClick(room)} className="w-32 p-3 border-r border-slate-200 dark:border-slate-700 sticky left-0 bg-white dark:bg-slate-800 group-hover:bg-slate-50 dark:group-hover:bg-slate-700/30 z-20 cursor-pointer flex flex-col justify-center">
                    <div className="font-bold text-slate-800 dark:text-slate-200 text-sm">{room.number}</div>
                    <div className="flex items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400">
                        <span>{t.roomType[room.type]}</span>
                        <span>•</span>
                        <span className="flex items-center"><Users className="w-3 h-3" /> {room.capacity}</span>
                    </div>
                </div>

                {/* Date Grid Cells (Background Layer) */}
                <div className="flex-1 flex relative">
                   {dates.map(date => {
                     const isToday = isSameDay(date, getDateString(new Date()));
                     return (
                       <div 
                         key={`${room.id}-${date.toISOString()}`} 
                         onClick={() => onRoomClick(room)}
                         className={`flex-1 min-w-[80px] border-r border-slate-100 dark:border-slate-700/30 cursor-pointer ${isToday ? 'bg-indigo-50/10 dark:bg-indigo-900/5' : ''}`}
                       />
                     );
                   })}
                   
                   {/* Continuous Bars (Overlay Layer) */}
                   <div className="absolute inset-0 pointer-events-none">
                      {renderBarsForRow(room)}
                   </div>
                </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
