
import React from 'react';
import { Room, RoomStatus, RoomType, InvoiceStatus } from '../types';
import { BedDouble, User, Wrench, SprayCan, CalendarCheck, Users, Clock, AlertTriangle, Calendar, CheckSquare, Square, FileCheck, DollarSign, FileText, Heart } from 'lucide-react';
import { translations, Language } from '../translations';

interface RoomCardProps {
  room: Room;
  onClick: (room: Room) => void;
  lang: Language;
}

const getStatusColor = (status: RoomStatus, checkoutStatus: 'none' | 'soon' | 'overdue', isHourly: boolean) => {
  // Overdue and Soon take visual precedence but if hourly, we want the pink theme
  // Updated: Now applies to both OCCUPIED and RESERVED status if marked as hourly
  if ((status === RoomStatus.OCCUPIED || status === RoomStatus.RESERVED) && isHourly) {
    return 'bg-pink-50 border-pink-300 text-pink-700 ring-2 ring-pink-100 ring-offset-0 animate-hourly dark:bg-pink-950/40 dark:border-pink-800/60 dark:text-pink-300 dark:ring-pink-900/30';
  }

  if (checkoutStatus === 'overdue') return 'bg-white border-rose-500 text-rose-700 ring-2 ring-rose-200 ring-offset-1 dark:bg-slate-800 dark:border-rose-700 dark:text-rose-400 dark:ring-rose-900';
  if (checkoutStatus === 'soon') return 'bg-white border-amber-500 text-amber-700 ring-2 ring-amber-200 ring-offset-1 dark:bg-slate-800 dark:border-amber-600 dark:text-amber-400 dark:ring-amber-900';

  switch (status) {
    case RoomStatus.AVAILABLE: return 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/40 dark:border-emerald-900/50 dark:text-emerald-400';
    case RoomStatus.OCCUPIED: return 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-950/40 dark:border-blue-900/50 dark:text-blue-400';
    case RoomStatus.DIRTY: return 'bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-950/40 dark:border-amber-900/50 dark:text-amber-400';
    case RoomStatus.MAINTENANCE: return 'bg-rose-50 border-rose-200 text-rose-700 dark:bg-rose-950/40 dark:border-rose-900/50 dark:text-rose-400';
    case RoomStatus.RESERVED: return 'bg-purple-50 border-purple-200 text-purple-700 dark:bg-purple-950/40 dark:border-purple-900/50 dark:text-purple-400';
    default: return 'bg-slate-50 border-slate-200 text-slate-700 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300';
  }
};

const getStatusIcon = (status: RoomStatus, isHourly: boolean) => {
  if ((status === RoomStatus.OCCUPIED || status === RoomStatus.RESERVED) && isHourly) {
    return <Heart className="w-5 h-5 text-pink-500" />;
  }
  switch (status) {
    case RoomStatus.AVAILABLE: return <BedDouble className="w-5 h-5" />;
    case RoomStatus.OCCUPIED: return <User className="w-5 h-5" />;
    case RoomStatus.DIRTY: return <SprayCan className="w-5 h-5" />;
    case RoomStatus.MAINTENANCE: return <Wrench className="w-5 h-5" />;
    case RoomStatus.RESERVED: return <CalendarCheck className="w-5 h-5" />;
    default: return null;
  }
};

const formatDate = (dateStr: string) => {
    try {
        if (dateStr.includes('-')) {
            const [year, month, day] = dateStr.split('-');
            const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        }
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch (e) {
        return dateStr;
    }
}

const formatPriceShort = (price: number) => {
    if (price >= 1000000) {
        return `${(price / 1000000).toLocaleString(undefined, { maximumFractionDigits: 1 })}M`;
    }
    if (price >= 1000) {
        return `${(price / 1000).toLocaleString(undefined, { maximumFractionDigits: 0 })}k`;
    }
    return price.toString();
}

const RoomCard: React.FC<RoomCardProps> = ({ room, onClick, lang }) => {
  const t = translations[lang];
  const showDates = (room.status === RoomStatus.OCCUPIED || room.status === RoomStatus.RESERVED) && (room.checkInDate || room.checkOutDate);

  let checkoutStatus: 'none' | 'soon' | 'overdue' = 'none';
  if (room.status === RoomStatus.OCCUPIED && room.checkOutDate) {
      const now = new Date();
      const [y, m, d] = room.checkOutDate.split('-').map(Number);
      const checkout = new Date(y, m - 1, d);
      
      if (room.checkOutTime) {
          const [h, min] = room.checkOutTime.split(':').map(Number);
          checkout.setHours(h, min, 0, 0);
      } else {
          checkout.setHours(12, 0, 0, 0);
      }

      const diffMins = (checkout.getTime() - now.getTime()) / (1000 * 60);
      
      if (diffMins < 0) checkoutStatus = 'overdue';
      else if (diffMins < 120) checkoutStatus = 'soon'; 
  }

  const closestFuture = room.futureReservations && room.futureReservations.length > 0 
      ? [...room.futureReservations].sort((a, b) => a.checkInDate.localeCompare(b.checkInDate))[0]
      : null;

  // Show primary guest name for both Occupied and Reserved status
  const isDirectlyBooked = (room.status === RoomStatus.OCCUPIED || room.status === RoomStatus.RESERVED) && room.guestName;
  
  // Updated: isHourly now accounts for Reserved status if the room has the flag
  const isHourly = (room.status === RoomStatus.OCCUPIED || room.status === RoomStatus.RESERVED) && room.isHourly;

  return (
    <div 
      onClick={() => onClick(room)}
      className={`
        relative p-4 rounded-xl border-2 cursor-pointer transition-all duration-300 ease-in-out
        hover:shadow-xl hover:scale-[1.03] group flex flex-col
        ${getStatusColor(room.status, checkoutStatus, !!room.isHourly)}
      `}
    >
      <div className="flex justify-between items-start mb-2">
        <span className="text-xl font-bold truncate pr-2" title={room.name || room.number}>
          {room.name || room.number}
        </span>
        <div className="opacity-70 group-hover:opacity-100 transition-opacity flex-shrink-0">
            {getStatusIcon(room.status, !!room.isHourly)}
        </div>
      </div>
      
      <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5 text-[10px] font-bold opacity-80 uppercase tracking-wider">
            <span>{t.roomType[room.type] || room.type}</span>
            <span className="w-1 h-1 rounded-full bg-current opacity-50"></span>
            <span className="flex items-center gap-0.5">
            <Users className="w-3 h-3" /> {room.capacity}
            </span>
          </div>
          
          {room.salePrice && (room.status === RoomStatus.OCCUPIED || room.status === RoomStatus.RESERVED) && (
              <div className={`px-2 py-1 rounded-md text-[10px] font-bold shadow-sm border border-current/10 flex items-center gap-1 ${isHourly ? 'bg-pink-100 dark:bg-pink-900/50' : 'bg-white/80 dark:bg-black/30'}`}>
                  <DollarSign className="w-3 h-3 opacity-80" />
                  <span className="text-xs font-black">{formatPriceShort(room.salePrice)}</span>
              </div>
          )}
      </div>

      <div className="text-sm truncate min-h-[32px] mb-2">
        {isDirectlyBooked ? (
          <div className="space-y-2">
              <div className="flex items-center">
                  <span className={`px-2.5 py-1 rounded-lg border border-current/20 font-bold text-sm block truncate flex-1 shadow-sm ${isHourly ? 'bg-pink-200/50 dark:bg-pink-900/30' : 'bg-white/40 dark:bg-black/20'}`}>
                      {room.guestName}
                  </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {room.bookingSource && (
                    <span className={`text-[9px] border border-current/10 px-1.5 py-0.5 rounded-md inline-block font-bold opacity-80 ${isHourly ? 'bg-pink-200/40 dark:bg-pink-900/20' : 'bg-white/50 dark:bg-black/20'}`}>
                        {t.sources[room.bookingSource]}
                    </span>
                )}
                {room.status === RoomStatus.OCCUPIED && room.invoiceStatus && room.invoiceStatus !== InvoiceStatus.NONE && (
                    <div 
                        className={`flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded-md font-bold border
                        ${room.invoiceStatus === InvoiceStatus.PROVIDED 
                            ? 'bg-emerald-100/50 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300 border-emerald-200/50 dark:border-emerald-800/50' 
                            : 'bg-amber-100/80 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800'}`}
                    >
                        <FileText className="w-2.5 h-2.5" />
                        <span>{room.invoiceStatus === InvoiceStatus.PROVIDED ? t.card.invoiceOk : t.card.invoicePending}</span>
                    </div>
                )}
                {room.status === RoomStatus.OCCUPIED && (
                  <div 
                      className={`flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded-md font-bold border
                      ${room.isIdScanned 
                          ? 'bg-emerald-100/50 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300 border-emerald-200/50 dark:border-emerald-800/50' 
                          : 'bg-rose-100/80 dark:bg-rose-900/50 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800'}`}
                  >
                      {room.isIdScanned ? <FileCheck className="w-2.5 h-2.5" /> : <AlertTriangle className="w-2.5 h-2.5" />}
                      <span>{room.isIdScanned ? t.card.kbtttOk : t.card.kbtttMissing}</span>
                  </div>
                )}
              </div>
          </div>
        ) : (
          <span className="opacity-60 text-xs font-medium uppercase tracking-tight">{t.status[room.status]}</span>
        )}
      </div>

      {showDates && (
        <div className={`mt-auto pt-3 border-t text-[10px] grid grid-cols-2 gap-2 opacity-80 font-bold ${isHourly ? 'border-pink-200 dark:border-pink-800' : 'border-black/5 dark:border-white/10'}`}>
            {room.checkInDate && (
                <div>
                    <div className="uppercase opacity-60 text-[9px]">{t.card.in}</div>
                    <div className="font-mono leading-tight">
                        {formatDate(room.checkInDate)}
                        {isHourly && room.checkInTime && (
                          <span className="block text-[11px] text-pink-600 dark:text-pink-400 font-black mt-0.5">
                            {room.checkInTime}
                          </span>
                        )}
                    </div>
                </div>
            )}
            {room.checkOutDate && (
                <div>
                    <div className="uppercase opacity-60 text-[9px]">{t.card.out}</div>
                    <div className="font-mono leading-tight">
                        {formatDate(room.checkOutDate)}
                        {isHourly && room.checkOutTime && (
                          <span className="block text-[11px] text-pink-600 dark:text-pink-400 font-black mt-0.5">
                            {room.checkOutTime}
                          </span>
                        )}
                    </div>
                </div>
            )}
        </div>
      )}

      {closestFuture && (room.status === RoomStatus.DIRTY || room.status === RoomStatus.AVAILABLE) && (
          <div className="mt-auto pt-2 border-t border-black/5 dark:border-white/10">
              <div className="flex items-center gap-1.5 text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-900/30 px-2 py-1 rounded text-[10px] font-bold">
                  <Calendar className="w-3 h-3 flex-shrink-0" />
                  <span className="truncate flex-1">
                      {closestFuture.guestName} ({formatDate(closestFuture.checkInDate)})
                  </span>
              </div>
          </div>
      )}

      {(checkoutStatus !== 'none' || isHourly) && (
          <div className={`
              absolute -top-2 -right-2 px-2 py-1 rounded-full text-[10px] font-bold shadow-sm border flex items-center gap-1
              ${isHourly ? 'bg-pink-600 text-white border-pink-700' : 
                checkoutStatus === 'overdue' ? 'bg-rose-600 text-white border-rose-700 animate-pulse' : 
                'bg-amber-400 text-amber-900 border-amber-500'}
          `}>
              {isHourly ? <Heart className="w-3 h-3" /> : (checkoutStatus === 'overdue' ? <AlertTriangle className="w-3 h-3" /> : <Clock className="w-3 h-3" />)}
              {isHourly ? t.card.hourly : (checkoutStatus === 'overdue' ? t.card.overdue : t.card.checkoutSoon)}
          </div>
      )}
    </div>
  );
};

export { RoomCard };
