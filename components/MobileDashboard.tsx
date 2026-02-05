
import React from 'react';
import { Room, RoomStatus } from '../types';
import { translations, Language } from '../translations';
import { OccupancyGauge } from './OccupancyGauge';
import { ArrowRight, LogIn, LogOut, BedDouble, CalendarDays, Users } from 'lucide-react';

interface MobileDashboardProps {
  rooms: Room[];
  onRoomClick: (room: Room) => void;
  lang: Language;
}

export const MobileDashboard: React.FC<MobileDashboardProps> = ({ rooms, onRoomClick, lang }) => {
  const t = translations[lang];

  // Helper to match Today's date string YYYY-MM-DD
  const getTodayStr = () => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const todayStr = getTodayStr();

  // 1. Calculate Occupancy
  const occupiedCount = rooms.filter(r => r.status === RoomStatus.OCCUPIED).length;
  const occupancyPercentage = rooms.length > 0 ? (occupiedCount / rooms.length) * 100 : 0;

  // 2. Filter Arrivals (Rooms with upcoming reservation checking in today)
  const arrivals = rooms.filter(r => 
    r.upcomingReservation && r.upcomingReservation.checkInDate === todayStr
  );

  // 3. Filter Departures (Rooms occupied and checking out today)
  const departures = rooms.filter(r => 
    r.status === RoomStatus.OCCUPIED && r.checkOutDate === todayStr
  );

  return (
    <div className="p-4 space-y-6 pb-24">
      {/* Occupancy Section */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 flex items-center justify-between">
         <div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-1">{t.mobile.quickStats}</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">{occupiedCount} / {rooms.length} Rooms Occupied</p>
         </div>
         <div className="-my-4">
             <OccupancyGauge percentage={occupancyPercentage} label={t.mobile.occupancy} />
         </div>
      </div>

      {/* Departures Section */}
      <div className="space-y-3">
          <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-bold uppercase text-xs tracking-wider px-1">
              <LogOut className="w-4 h-4" /> {t.mobile.departures}
          </div>
          
          {departures.length === 0 ? (
              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-6 text-center text-slate-400 text-sm border border-dashed border-slate-200 dark:border-slate-700">
                  {t.mobile.noDepartures}
              </div>
          ) : (
              <div className="grid gap-3">
                  {departures.map(room => (
                      <div 
                        key={room.id}
                        onClick={() => onRoomClick(room)}
                        className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border-l-4 border-rose-500 flex justify-between items-center cursor-pointer active:scale-95 transition-transform"
                      >
                          <div>
                              <div className="flex items-center gap-2 mb-1">
                                  <span className="font-black text-lg text-slate-800 dark:text-white">{room.number}</span>
                                  {room.name && <span className="text-xs text-slate-400 font-medium px-2 py-0.5 bg-slate-100 dark:bg-slate-700 rounded-full">{room.name}</span>}
                              </div>
                              <div className="text-sm font-bold text-slate-700 dark:text-slate-300">{room.guestName}</div>
                          </div>
                          <button className="bg-rose-50 dark:bg-rose-900/20 text-rose-600 p-2 rounded-full">
                              <ArrowRight className="w-5 h-5" />
                          </button>
                      </div>
                  ))}
              </div>
          )}
      </div>

      {/* Arrivals Section */}
      <div className="space-y-3">
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold uppercase text-xs tracking-wider px-1">
              <LogIn className="w-4 h-4" /> {t.mobile.arrivals}
          </div>
          
          {arrivals.length === 0 ? (
              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-6 text-center text-slate-400 text-sm border border-dashed border-slate-200 dark:border-slate-700">
                  {t.mobile.noArrivals}
              </div>
          ) : (
              <div className="grid gap-3">
                  {arrivals.map(room => (
                      <div 
                        key={room.id}
                        onClick={() => onRoomClick(room)}
                        className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border-l-4 border-emerald-500 flex justify-between items-center cursor-pointer active:scale-95 transition-transform"
                      >
                          <div>
                              <div className="flex items-center gap-2 mb-1">
                                  <span className="font-black text-lg text-slate-800 dark:text-white">{room.number}</span>
                                  <span className="text-xs text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded-full font-bold">Reserved</span>
                              </div>
                              <div className="text-sm font-bold text-slate-700 dark:text-slate-300">{room.upcomingReservation?.guestName}</div>
                          </div>
                          <button className="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 p-2 rounded-full">
                              <ArrowRight className="w-5 h-5" />
                          </button>
                      </div>
                  ))}
              </div>
          )}
      </div>
    </div>
  );
};
