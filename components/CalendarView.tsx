
import React, { useState } from 'react';
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
  const dates = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);
    return d;
  });

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
    newDate.setDate(newDate.getDate() - 14);
    setStartDate(newDate);
  };

  const handleNext = () => {
    const newDate = new Date(startDate);
    newDate.setDate(newDate.getDate() + 14);
    setStartDate(newDate);
  };

  const handleToday = () => {
    setStartDate(new Date());
  };

  const handleDateInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.value) {
      setStartDate(new Date(e.target.value));
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

  const timeToPercent = (timeStr?: string) => {
    if (!timeStr) return 0;
    const [hours, minutes] = timeStr.split(':').map(Number);
    return ((hours + (minutes / 60)) / 24) * 100;
  };

  const getCellContent = (room: Room, date: Date) => {
    const dateStr = getDateString(date);
    const isToday = isSameDay(date, getDateString(new Date()));
    const bars: React.ReactNode[] = [];

    // Helper for Continuous Bars with exact time widths
    const renderBar = (
      id: string,
      label: string, 
      colorClass: string, 
      startDateStr: string, 
      endDateStr: string,
      startTime?: string,
      endTime?: string
    ) => {
       const isStart = dateStr === startDateStr;
       const isEnd = dateStr === endDateStr;
       const isMiddle = dateStr > startDateStr && dateStr < endDateStr;
       
       if (!isStart && !isEnd && !isMiddle) return null;

       const startPercent = isStart ? timeToPercent(startTime || '14:00') : 0;
       const endPercent = isEnd ? timeToPercent(endTime || '12:00') : 100;

       // Inline style for precise width
       const barStyle: React.CSSProperties = {
           position: 'absolute',
           left: `${startPercent}%`,
           right: `${100 - endPercent}%`,
           top: '4px',
           bottom: '4px',
           zIndex: isStart || isEnd ? 10 : 0,
       };

       return (
          <div 
            key={id + '-' + dateStr}
            style={barStyle}
            className={`
                flex items-center text-[10px] font-medium shadow-sm truncate px-1 border-y
                ${colorClass}
                ${isStart && !isEnd ? 'rounded-l-md border-l' : ''}
                ${isEnd && !isStart ? 'rounded-r-md border-r' : ''}
                ${isStart && isEnd ? 'rounded-md border-x' : ''}
                ${!isStart && !isEnd ? 'rounded-none border-x-0' : ''}
            `}
          >
             {isStart && <span className="truncate pl-1">{label}</span>}
          </div>
       );
    };

    // 1. Active Occupancy/Reservation
    if ((room.status === RoomStatus.OCCUPIED || room.status === RoomStatus.RESERVED)) {
        if (dateStr >= (room.checkInDate || '') && dateStr <= (room.checkOutDate || '')) {
            const bar = renderBar(
                'current-stay',
                room.guestName || t.status[room.status],
                getStatusColor(room.status),
                room.checkInDate!,
                room.checkOutDate!,
                room.checkInTime,
                room.checkOutTime
            );
            if (bar) bars.push(bar);
        }
    }
    
    // 2. ALL Future Reservations
    if (room.futureReservations && room.futureReservations.length > 0) {
        room.futureReservations.forEach((res, index) => {
            if (dateStr >= res.checkInDate && dateStr <= res.checkOutDate) {
                const bar = renderBar(
                    `future-res-${index}`,
                    res.guestName,
                    'bg-purple-500 border-purple-600 text-white dark:bg-purple-600 dark:border-purple-700',
                    res.checkInDate,
                    res.checkOutDate,
                    res.checkInTime || '14:00',
                    res.checkOutTime || '12:00'
                );
                if (bar) bars.push(bar);
            }
        });
    }

    if (bars.length > 0) return <>{bars}</>;

    // Today indicators for other statuses
    if (room.status === RoomStatus.MAINTENANCE && isToday) {
        return (
            <div className="absolute inset-x-1 top-1 bottom-1 rounded-md bg-rose-100 dark:bg-rose-900/30 border border-rose-200 dark:border-rose-800 flex items-center justify-center">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
            </div>
        );
    }

    if (room.status === RoomStatus.DIRTY && isToday) {
         return (
            <div className="absolute inset-x-1 top-1 bottom-1 rounded-md bg-amber-100 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 flex items-center justify-center">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
            </div>
        );
    }

    if (room.status === RoomStatus.AVAILABLE && isToday) {
        return (
           <div className="absolute inset-x-1 top-1 bottom-1 rounded-md bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-[10px] font-bold shadow-sm">
               {lang === 'vi' ? 'Trống' : 'Free'}
           </div>
       );
    }

    return null;
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
        <div className="min-w-[1000px]">
          <div className="flex border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 sticky top-0 z-10">
            <div className="w-32 p-3 font-bold text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider sticky left-0 bg-slate-50 dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 z-20 shadow-sm">Room</div>
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
          {rooms.map(room => (
            <div key={room.id} className="flex border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors group">
                <div onClick={() => onRoomClick(room)} className="w-32 p-3 border-r border-slate-200 dark:border-slate-700 sticky left-0 bg-white dark:bg-slate-800 group-hover:bg-slate-50 dark:group-hover:bg-slate-700/30 z-10 cursor-pointer">
                    <div className="font-bold text-slate-800 dark:text-slate-200 text-sm">{room.name || room.number}</div>
                    <div className="flex items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400">
                        <span>{t.roomType[room.type]}</span>
                        <span>•</span>
                        <span className="flex items-center"><Users className="w-3 h-3" /> {room.capacity}</span>
                    </div>
                </div>
                {dates.map(date => (
                    <div key={`${room.id}-${date.toISOString()}`} onClick={() => onRoomClick(room)} className="flex-1 min-w-[80px] h-12 border-r border-slate-100 dark:border-slate-700/50 relative cursor-pointer">
                        {getCellContent(room, date)}
                    </div>
                ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
