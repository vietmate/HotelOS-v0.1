
import React, { useState, useEffect, useRef } from 'react';
import { Room, RoomStatus, RoomType, BookingSource, Guest, RoomHistoryEntry, Employee, TimeEntry, EmployeeRole } from './types';
import { RoomCard } from './components/RoomCard';
import { RoomDetailPanel } from './components/RoomDetailPanel';
import { OccupancyGauge } from './components/OccupancyGauge';
import { StatsChart } from './components/StatsChart';
import { ClockWidget } from './components/ClockWidget';
import { PettyCashWidget } from './components/PettyCashWidget';
import { QuickActionsWidget } from './components/QuickActionsWidget';
import { CalendarView } from './components/CalendarView';
import { NotesView } from './components/NotesView';
import { GuestFinder } from './components/GuestFinder';
import { EmployeesView } from './components/EmployeesView';
import { MobileDashboard } from './components/MobileDashboard';
import { Building2, Plus, Filter, Search, Pencil, LayoutGrid, CalendarDays, NotebookPen, AlertTriangle, FileWarning, Settings2, Check, GripVertical, WifiOff, CloudLightning, Moon, Sun, X, Users, Smartphone, LayoutTemplate, RotateCcw, Lock } from 'lucide-react';
import { translations, Language } from './translations';
import { supabase, isSupabaseConfigured } from './services/supabaseClient';

const STORAGE_KEY_ROOMS = 'hotel_os_rooms_data';
const STORAGE_KEY_HOTEL_NAME = 'hotel_os_name';
const STORAGE_KEY_EMPLOYEES = 'hotel_os_employees';
const STORAGE_KEY_TIME_ENTRIES = 'hotel_os_time_entries';

const generateInitialRooms = (): Room[] => {
  const today = new Date();
  const yesterday = new Date(today); 
  yesterday.setDate(today.getDate() - 1);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const dayAfter = new Date(today);
  dayAfter.setDate(today.getDate() + 3);

  const formatDate = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  return Array.from({ length: 15 }, (_, i) => {
    const isSuite = (i + 1) % 5 === 0;
    const isDouble = i % 2 === 0;
    const type = isSuite ? RoomType.SUITE : (isDouble ? RoomType.DOUBLE : RoomType.SINGLE);
    
    let status = Math.random() > 0.7 ? RoomStatus.OCCUPIED : (Math.random() > 0.8 ? RoomStatus.DIRTY : RoomStatus.AVAILABLE);
    const sources = [BookingSource.BOOKING_COM, BookingSource.AGODA, BookingSource.G2J, BookingSource.WALK_IN];
    const source = (status === RoomStatus.OCCUPIED) ? sources[Math.floor(Math.random() * sources.length)] : undefined;
    const isCheckingOutToday = Math.random() > 0.6;
    const stayDuration = isCheckingOutToday ? 1 : (Math.floor(Math.random() * 3) + 2); 
    const checkOut = new Date(yesterday);
    checkOut.setDate(yesterday.getDate() + stayDuration);
    const isIdScanned = status === RoomStatus.OCCUPIED ? Math.random() > 0.2 : undefined;
    const basePrice = isSuite ? 1200000 : (isDouble ? 600000 : 400000); 
    let salePrice = undefined;
    if (status === RoomStatus.OCCUPIED) {
        salePrice = basePrice * (Math.random() > 0.5 ? 1 : 0.9); 
    }

    const history: RoomHistoryEntry[] = [];
    if (status === RoomStatus.OCCUPIED) {
        history.push({
            date: new Date().toISOString(),
            action: 'CHECK_IN',
            description: `Guest checked in: John Doe`,
            staffName: 'Reception'
        });
    } else if (status === RoomStatus.DIRTY) {
         history.push({
            date: new Date(Date.now() - 3600000 * 2).toISOString(),
            action: 'CHECK_OUT',
            description: `Guest checked out`,
            staffName: 'Reception'
        });
    }

    return {
      id: `room-${i + 1}`,
      number: `${100 + i + 1}`,
      name: isSuite ? `Suite ${100 + i + 1}` : undefined,
      capacity: isSuite ? 4 : (isDouble ? 2 : 1),
      type: type,
      status: status,
      price: basePrice,
      salePrice: salePrice,
      guestName: status === RoomStatus.OCCUPIED ? "John Doe" : undefined,
      checkInDate: status === RoomStatus.OCCUPIED ? formatDate(yesterday) : undefined,
      checkOutDate: status === RoomStatus.OCCUPIED ? formatDate(checkOut) : undefined,
      bookingSource: source,
      isIdScanned: isIdScanned,
      history: history
    };
  });
};

type ViewMode = 'grid' | 'calendar' | 'notes' | 'employees';
type WidgetId = 'quickActions' | 'clock' | 'pettyCash' | 'alerts' | 'occupancy' | 'stats';

const DEFAULT_WIDGET_ORDER: WidgetId[] = ['quickActions', 'clock', 'pettyCash', 'alerts', 'occupancy', 'stats'];

export default function App() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [hotelName, setHotelName] = useState('HotelOS');
  const [isLoading, setIsLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(true);

  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [filter, setFilter] = useState<RoomStatus | 'ALL'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [isEditingName, setIsEditingName] = useState(false);
  const [lang, setLang] = useState<Language>('en');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [isMobileMode, setIsMobileMode] = useState(false); 
  
  const [isGuestModalOpen, setIsGuestModalOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [resetPassword, setResetPassword] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
        return localStorage.getItem('hotel_theme') === 'dark' ? 'dark' : 'light';
    }
    return 'light';
  });

  const [isReordering, setIsReordering] = useState(false);
  const [widgetOrder, setWidgetOrder] = useState<WidgetId[]>(DEFAULT_WIDGET_ORDER);
  
  const dragItem = useRef<number | null>(null);
  const t = translations[lang];

  useEffect(() => {
    if (theme === 'dark') {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('hotel_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
      setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  useEffect(() => {
    const fetchData = async () => {
        setIsLoading(true);
        
        const savedRooms = localStorage.getItem(STORAGE_KEY_ROOMS);
        const savedEmp = localStorage.getItem(STORAGE_KEY_EMPLOYEES);
        const savedTime = localStorage.getItem(STORAGE_KEY_TIME_ENTRIES);
        const savedOrder = localStorage.getItem('hotel_widget_order');
        
        setRooms(savedRooms ? JSON.parse(savedRooms) : generateInitialRooms());
        setEmployees(savedEmp ? JSON.parse(savedEmp) : []);
        setTimeEntries(savedTime ? JSON.parse(savedTime) : []);
        setHotelName(localStorage.getItem(STORAGE_KEY_HOTEL_NAME) || 'HotelOS');
        if (savedOrder) setWidgetOrder(JSON.parse(savedOrder));

        if (!isSupabaseConfigured()) {
            setIsConnected(false);
            setIsLoading(false);
            return;
        }

        try {
            const { data: roomsData } = await supabase.from('rooms').select('*').order('id');
            if (roomsData && roomsData.length > 0) {
                const parsedRooms = roomsData.map(r => r.data as Room).sort((a,b) => parseInt(a.number) - parseInt(b.number));
                setRooms(parsedRooms);
                localStorage.setItem(STORAGE_KEY_ROOMS, JSON.stringify(parsedRooms));
            }

            const { data: empData } = await supabase.from('employees').select('*');
            if (empData && empData.length > 0) {
                const cloudEmployees = empData.map(r => r.data as Employee);
                setEmployees(cloudEmployees);
                localStorage.setItem(STORAGE_KEY_EMPLOYEES, JSON.stringify(cloudEmployees));
            }

            const { data: timeData } = await supabase.from('time_entries').select('*').order('created_at', { ascending: false });
            if (timeData && timeData.length > 0) {
                const cloudEntries = timeData.map(r => r.data as TimeEntry);
                setTimeEntries(cloudEntries);
                localStorage.setItem(STORAGE_KEY_TIME_ENTRIES, JSON.stringify(cloudEntries));
            }

            const { data: settingsData } = await supabase.from('app_settings').select('*');
            if (settingsData) {
                const nameSetting = settingsData.find(s => s.key === 'hotel_name');
                if (nameSetting) setHotelName(nameSetting.value);
                const orderSetting = settingsData.find(s => s.key === 'widget_order');
                if (orderSetting) setWidgetOrder(orderSetting.value);
            }

            setIsConnected(true);
        } catch (error) {
            console.error("Supabase load error:", error);
            setIsConnected(false);
        } finally {
            setIsLoading(false);
        }
    };

    fetchData();
  }, []);

  const handleRoomUpdate = async (updatedRoom: Room) => {
    const updatedRooms = rooms.map(r => r.id === updatedRoom.id ? updatedRoom : r);
    setRooms(updatedRooms);
    localStorage.setItem(STORAGE_KEY_ROOMS, JSON.stringify(updatedRooms));
    
    if (isSupabaseConfigured()) {
        await supabase.from('rooms').update({ data: updatedRoom, updated_at: new Date().toISOString() }).eq('id', updatedRoom.id);
    }
  };

  const handleEmployeesUpdate = async (updated: Employee[]) => {
      setEmployees(updated);
      localStorage.setItem(STORAGE_KEY_EMPLOYEES, JSON.stringify(updated));
      if (isSupabaseConfigured()) {
          for (const emp of updated) {
              await supabase.from('employees').upsert({ id: emp.id, data: emp });
          }
      }
  };

  const handleTimeEntriesUpdate = async (updated: TimeEntry[]) => {
      setTimeEntries(updated);
      localStorage.setItem(STORAGE_KEY_TIME_ENTRIES, JSON.stringify(updated));
      if (isSupabaseConfigured()) {
          for (const entry of updated) {
              await supabase.from('time_entries').upsert({ id: entry.id, data: entry });
          }
      }
  };

  const handleNameSave = async (newName: string) => {
      setHotelName(newName);
      setIsEditingName(false);
      if (isSupabaseConfigured()) {
          await supabase.from('app_settings').upsert({ key: 'hotel_name', value: newName });
      } else {
          localStorage.setItem(STORAGE_KEY_HOTEL_NAME, newName);
      }
  };

  const handleWidgetOrderSave = async (newOrder: WidgetId[]) => {
      setWidgetOrder(newOrder);
      if (isSupabaseConfigured()) {
          await supabase.from('app_settings').upsert({ key: 'widget_order', value: newOrder });
      } else {
          localStorage.setItem('hotel_widget_order', JSON.stringify(newOrder));
      }
  };

  const handleQuickAction = (action: 'ADD_GUEST' | 'FILTER_AVAILABLE' | 'OPEN_NOTES') => {
      if (action === 'ADD_GUEST') setIsGuestModalOpen(true);
      else if (action === 'FILTER_AVAILABLE') { setFilter(RoomStatus.AVAILABLE); setViewMode('grid'); }
      else if (action === 'OPEN_NOTES') setViewMode('notes');
  };

  const handleGuestCreated = (guest: Guest) => {
      setIsGuestModalOpen(false);
      alert(`${translations[lang].guest.onboardSuccess}: ${guest.full_name}`);
  };

  const handleFactoryReset = async () => {
      if (resetPassword !== 'admin123') { alert(t.admin.wrongPass); return; }
      if (!confirm(t.admin.warning)) return;
      setIsResetting(true);
      if (isSupabaseConfigured()) {
          try {
            await supabase.from('bookings').delete().neq('id', '0');
            await supabase.from('guests').delete().neq('id', '0');
            await supabase.from('time_entries').delete().neq('id', '0');
            await supabase.from('petty_cash').delete().neq('id', '0');
            await supabase.from('notes').delete().neq('date_key', '0');
            await supabase.from('employees').delete().neq('id', '0');
            await supabase.from('rooms').delete().neq('id', '0');
            const initialRooms = generateInitialRooms();
            await supabase.from('rooms').insert(initialRooms.map(r => ({ id: r.id, data: r })));
            await supabase.from('app_settings').upsert({ key: 'hotel_name', value: 'HotelOS' });
            await supabase.from('app_settings').upsert({ key: 'widget_order', value: DEFAULT_WIDGET_ORDER });
          } catch (e) { console.error("Reset failed", e); }
      } else { localStorage.clear(); }
      setTimeout(() => { window.location.reload(); }, 1000);
  };

  const filteredRooms = rooms.filter(room => {
    const matchesFilter = filter === 'ALL' || room.status === filter;
    const matchesSearch = room.number.includes(searchTerm) || 
                          (room.name && room.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
                          (room.guestName && room.guestName.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesFilter && matchesSearch;
  });

  const occupiedCount = rooms.filter(r => r.status === RoomStatus.OCCUPIED).length;
  const occupancyPercentage = rooms.length > 0 ? (occupiedCount / rooms.length) * 100 : 0;

  const alerts = rooms.reduce((acc, room) => {
      if (room.status === RoomStatus.OCCUPIED && room.checkOutDate) {
          const now = new Date();
          const [y, m, d] = room.checkOutDate.split('-').map(Number);
          const checkout = new Date(y, m - 1, d);
          if (room.checkOutTime) { const [h, min] = room.checkOutTime.split(':').map(Number); checkout.setHours(h, min, 0, 0); }
          else checkout.setHours(12, 0, 0, 0);
          const diffMins = (checkout.getTime() - now.getTime()) / (1000 * 60);
          if (diffMins < 0) acc.overdue++;
          else if (diffMins < 120) acc.soon++;
      }
      if (room.status === RoomStatus.OCCUPIED && !room.isIdScanned) acc.missingId++;
      return acc;
  }, { soon: 0, overdue: 0, missingId: 0 });

  const handleDragStart = (index: number) => { dragItem.current = index; };
  const handleDragEnter = (index: number) => {
      if (dragItem.current === null || dragItem.current === index) return;
      const newOrder = [...widgetOrder];
      const draggedItemContent = newOrder[dragItem.current];
      newOrder.splice(dragItem.current, 1);
      newOrder.splice(index, 0, draggedItemContent);
      dragItem.current = index;
      setWidgetOrder(newOrder); 
  };
  const handleDragEnd = () => { dragItem.current = null; handleWidgetOrderSave(widgetOrder); };

  const renderAlertsWidget = () => {
     const hasAlerts = alerts.soon > 0 || alerts.overdue > 0 || alerts.missingId > 0;
     if (!hasAlerts) {
         return isReordering ? (
             <div className="mb-6 p-4 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-1">
                 <AlertTriangle className="w-4 h-4 opacity-50" /> {t.alerts.placeholder}
             </div>
         ) : null;
     }
     return (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/50 rounded-xl animate-in fade-in slide-in-from-top-4">
            <h3 className="flex items-center gap-2 text-red-800 dark:text-red-400 font-bold text-sm mb-3">
                <AlertTriangle className="w-4 h-4" /> {t.alerts.title}
            </h3>
            <div className="space-y-2">
                {alerts.overdue > 0 && (
                    <div className="flex justify-between items-center text-xs">
                        <span className="text-red-700 dark:text-red-300 font-medium">{t.alerts.overdue}</span>
                        <span className="bg-red-200 dark:bg-red-900 text-red-800 dark:text-red-200 px-2 py-0.5 rounded-full font-bold">{alerts.overdue}</span>
                    </div>
                )}
                {alerts.soon > 0 && (
                    <div className="flex justify-between items-center text-xs">
                        <span className="text-amber-700 dark:text-amber-400 font-medium">{t.alerts.checkoutSoon}</span>
                        <span className="bg-amber-200 dark:bg-amber-900 text-amber-800 dark:text-amber-200 px-2 py-0.5 rounded-full font-bold">{alerts.soon}</span>
                    </div>
                )}
                {alerts.missingId > 0 && (
                    <div className="flex justify-between items-center text-xs">
                        <span className="text-rose-700 dark:text-rose-400 font-medium">{t.alerts.kbtttMissing}</span>
                        <span className="bg-white dark:bg-slate-800 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-300 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                            <FileWarning className="w-3 h-3" /> {alerts.missingId}
                        </span>
                    </div>
                )}
            </div>
        </div>
     );
  };

  const renderWidgetContent = (id: WidgetId) => {
      switch(id) {
          case 'quickActions': return <QuickActionsWidget lang={lang} onAction={handleQuickAction} />;
          case 'clock': return <ClockWidget lang={lang} />;
          case 'pettyCash': return <PettyCashWidget lang={lang} />;
          case 'alerts': return renderAlertsWidget();
          case 'occupancy': return <div className="mb-8 flex flex-col items-center"><OccupancyGauge percentage={occupancyPercentage} label={t.occupancy} /></div>;
          case 'stats': return <div className="mb-8"><h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-4">{t.roomStatus}</h3><StatsChart rooms={rooms} lang={lang} /></div>;
      }
  };

  const renderContent = () => {
    if (isLoading) {
        return <div className="flex h-full items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div></div>;
    }
    if (isMobileMode) return <MobileDashboard rooms={rooms} onRoomClick={setSelectedRoom} lang={lang} />;
    switch(viewMode) {
      case 'calendar': return <CalendarView rooms={filteredRooms} onRoomClick={setSelectedRoom} lang={lang} />;
      case 'notes': return <NotesView lang={lang} />;
      case 'employees': return <EmployeesView lang={lang} employees={employees} onEmployeesUpdate={handleEmployeesUpdate} timeEntries={timeEntries} onTimeEntriesUpdate={handleTimeEntriesUpdate} />;
      case 'grid':
      default:
        return (
           <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 pb-20">
            {filteredRooms.map(room => (
              <RoomCard key={room.id} room={room} onClick={setSelectedRoom} lang={lang} />
            ))}
            {filteredRooms.length === 0 && (
              <div className="col-span-full h-64 flex flex-col items-center justify-center text-slate-400 dark:text-slate-600 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                 <Search className="w-8 h-8 mb-2 opacity-50" /> <p>{t.noRoomsFound}</p>
              </div>
            )}
          </div>
        );
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 font-sans transition-colors duration-200">
      {!isMobileMode && (
        <div className="w-80 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col hidden md:flex z-10 transition-colors duration-200">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3 mb-3">
                <div className="bg-indigo-600 p-2 rounded-lg"><Building2 className="text-white w-6 h-6" /></div>
                <div className="flex-1 min-w-0">
                {isEditingName ? (
                    <input type="text" value={hotelName} onChange={(e) => setHotelName(e.target.value)} onBlur={() => handleNameSave(hotelName)} onKeyDown={(e) => e.key === 'Enter' && handleNameSave(hotelName)} autoFocus className="w-full bg-white dark:bg-slate-800 border border-indigo-300 rounded px-1 py-0.5 text-xl font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                ) : (
                    <div className="flex items-center gap-2 group cursor-pointer" onClick={() => setIsEditingName(true)} title="Click to edit hotel name">
                    <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight truncate">{hotelName}</h1>
                    <Pencil className="w-3.5 h-3.5 text-slate-300 opacity-0 group-hover:opacity-100 transition-all hover:text-indigo-500" />
                    </div>
                )}
                <div className="flex items-center gap-1">
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{t.dashboard}</p>
                    {isConnected ? (
                        <span className="text-[10px] bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/50 px-1.5 py-0.5 rounded flex items-center gap-1.5 font-bold" title="Connected to Supabase Cloud">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div> Online
                        </span>
                    ) : (
                        <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500 px-1.5 py-0.5 rounded flex items-center gap-1.5 border border-slate-200 dark:border-slate-700" title="Running in offline/local mode">
                            <WifiOff className="w-3 h-3" /> Offline
                        </span>
                    )}
                </div>
                </div>
            </div>
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <button onClick={() => setLang('en')} className={`text-xs px-2 py-1 rounded transition-colors ${lang === 'en' ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 font-bold' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}>EN</button>
                    <span className="text-slate-200 dark:text-slate-700">|</span>
                    <button onClick={() => setLang('vi')} className={`text-xs px-2 py-1 rounded transition-colors ${lang === 'vi' ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 font-bold' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}>VN</button>
                </div>
                <div className="flex items-center gap-1">
                    <button onClick={toggleTheme} className="p-1.5 rounded transition-colors flex items-center gap-1 text-xs font-bold text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300" title={theme === 'dark' ? "Switch to Light Mode" : "Switch to Dark Mode"}>{theme === 'dark' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}</button>
                    <button onClick={() => setIsReordering(!isReordering)} className={`p-1.5 rounded transition-colors flex items-center gap-1 text-xs font-bold ${isReordering ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300' : 'text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300'}`} title={t.customizeLayout}>{isReordering ? <Check className="w-3.5 h-3.5" /> : <Settings2 className="w-3.5 h-3.5" />}</button>
                </div>
            </div>
            </div>
            <div className="p-6 flex-1 overflow-y-auto custom-scrollbar">
                {widgetOrder.map((id, index) => (
                    <div key={id} draggable={isReordering} onDragStart={() => handleDragStart(index)} onDragEnter={(e) => { e.preventDefault(); handleDragEnter(index); }} onDragOver={(e) => e.preventDefault()} onDragEnd={handleDragEnd} className={`transition-all duration-300 ease-in-out relative ${isReordering ? 'cursor-move ring-2 ring-indigo-500/20 rounded-xl mb-4 p-2 bg-slate-50 dark:bg-slate-800 border border-indigo-100 dark:border-indigo-900' : ''}`}>
                        {isReordering && <div className="absolute top-1/2 -left-2 -translate-y-1/2 -translate-x-full text-slate-300"><GripVertical className="w-4 h-4" /></div>}
                        {renderWidgetContent(id)}
                    </div>
                ))}
            </div>
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
               <p className="text-[10px] text-slate-400">© 2026 Zukoforge.com</p>
               <button onClick={() => { setIsResetModalOpen(true); setResetPassword(''); }} className="text-[10px] flex items-center gap-1 text-rose-300 hover:text-rose-500 transition-colors" title={t.admin.resetTitle}><RotateCcw className="w-3 h-3" /> {t.admin.resetBtn}</button>
            </div>
        </div>
      )}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        <div className={`md:hidden bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-4 flex justify-between items-center ${isMobileMode ? 'shadow-sm z-20' : ''}`}>
           <div className="font-bold text-lg flex items-center gap-2 dark:text-white"><Building2 className="text-indigo-600 w-5 h-5" /> {hotelName}</div>
           <div className="flex items-center gap-3">
               <button onClick={toggleTheme} className="p-1.5 rounded transition-colors text-slate-400 dark:text-slate-300">{theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}</button>
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 rounded p-1">
                 <button onClick={() => setLang('en')} className={`text-[10px] px-1.5 rounded ${lang === 'en' ? 'bg-white dark:bg-slate-700 shadow text-indigo-700 dark:text-indigo-300 font-bold' : 'text-slate-400'}`}>EN</button>
                 <button onClick={() => setLang('vi')} className={`text-[10px] px-1.5 rounded ${lang === 'vi' ? 'bg-white dark:bg-slate-700 shadow text-indigo-700 dark:text-indigo-300 font-bold' : 'text-slate-400'}`}>VN</button>
              </div>
           </div>
        </div>
        {!isMobileMode && (
             <div className="p-6 pb-2">
                <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
                   <div className="flex items-center gap-4 w-full xl:w-auto">
                      <div><h2 className="text-2xl font-bold text-slate-800 dark:text-white">{t.roomOverview}</h2><p className="text-slate-500 dark:text-slate-400 text-sm">{t.manageBookings}</p></div>
                       <button onClick={() => setIsMobileMode(!isMobileMode)} className={`ml-auto xl:ml-4 px-3 py-1.5 rounded-lg border text-sm font-bold flex items-center gap-2 transition-all ${isMobileMode ? 'bg-indigo-600 border-indigo-600 text-white shadow-md ring-2 ring-indigo-200' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-indigo-300'}`}>
                           {isMobileMode ? <LayoutTemplate className="w-4 h-4" /> : <Smartphone className="w-4 h-4" />} <span className="hidden sm:inline">{t.mobile.toggle}</span>
                       </button>
                   </div>
                   {!isMobileMode && (
                    <div className="flex flex-col sm:flex-row w-full xl:w-auto gap-4 items-center">
                        <div className="bg-slate-100 dark:bg-slate-900 p-1 rounded-lg flex items-center gap-1">
                             <button onClick={() => setViewMode('grid')} className={`px-3 py-1.5 rounded-md text-sm font-bold flex items-center gap-2 transition-all ${viewMode === 'grid' ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-300 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}><LayoutGrid className="w-4 h-4" /> {t.views.grid}</button>
                             <button onClick={() => setViewMode('calendar')} className={`px-3 py-1.5 rounded-md text-sm font-bold flex items-center gap-2 transition-all ${viewMode === 'calendar' ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-300 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}><CalendarDays className="w-4 h-4" /> {t.views.calendar}</button>
                             <button onClick={() => setViewMode('notes')} className={`px-3 py-1.5 rounded-md text-sm font-bold flex items-center gap-2 transition-all ${viewMode === 'notes' ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-300 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}><NotebookPen className="w-4 h-4" /> {t.views.notes}</button>
                             <button onClick={() => setViewMode('employees')} className={`px-3 py-1.5 rounded-md text-sm font-bold flex items-center gap-2 transition-all ${viewMode === 'employees' ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-300 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}><Users className="w-4 h-4" /> {t.views.employees}</button>
                        </div>
                        {viewMode === 'grid' && (
                            <div className="flex flex-wrap gap-3 w-full sm:w-auto">
                            <div className="relative group flex-1 sm:flex-none"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" /><input type="text" placeholder={t.searchPlaceholder} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full sm:w-64 pl-9 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 dark:text-white" /></div>
                            <div className="relative flex-1 sm:flex-none"><div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"><Filter className="w-4 h-4 text-slate-400" /></div><select value={filter} onChange={(e) => setFilter(e.target.value as RoomStatus | 'ALL')} className="w-full sm:w-auto pl-9 pr-8 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500/50 cursor-pointer dark:text-white"><option value="ALL">{t.allStatus}</option>{Object.values(RoomStatus).map(s => <option key={s} value={s}>{t.status[s]}</option>)}</select></div>
                            </div>
                        )}
                    </div>
                   )}
                </div>
             </div>
        )}
        {isMobileMode && (
             <div className="p-4 flex items-center justify-between border-b border-slate-100 dark:border-slate-800"><h2 className="text-xl font-bold text-slate-800 dark:text-white">{t.mobile.toggle}</h2><button onClick={() => setIsMobileMode(false)} className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-700"><LayoutTemplate className="w-4 h-4" /> Desktop View</button></div>
        )}
        <div className={`flex-1 overflow-y-auto ${!isMobileMode ? 'p-6 pt-4' : ''}`}>
          {renderContent()}
        </div>
      </div>
      {selectedRoom && <div className="fixed inset-0 bg-black/20 dark:bg-black/50 backdrop-blur-sm z-40 transition-opacity" onClick={() => setSelectedRoom(null)} />}
      <RoomDetailPanel room={selectedRoom} onClose={() => setSelectedRoom(null)} onUpdate={handleRoomUpdate} lang={lang} />
      {isGuestModalOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                  <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center"><h3 className="font-bold text-lg dark:text-white">{translations[lang].guest.addNew}</h3><button onClick={() => setIsGuestModalOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full"><X className="w-5 h-5 text-slate-500" /></button></div>
                  <div className="p-4"><GuestFinder onSelectGuest={handleGuestCreated} lang={lang} initialMode="CREATE" /></div>
              </div>
          </div>
      )}
      {isResetModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
             <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-200 dark:border-slate-700">
                  <div className="p-6">
                      <div className="w-12 h-12 bg-rose-100 dark:bg-rose-900/30 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4"><AlertTriangle className="w-6 h-6" /></div>
                      <h3 className="font-bold text-xl text-center text-slate-900 dark:text-white mb-2">{t.admin.resetTitle}</h3>
                      <p className="text-center text-sm text-slate-500 dark:text-slate-400 mb-6">{t.admin.warning}</p>
                      <div className="relative mb-4"><Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input type="password" placeholder={t.admin.passwordPlaceholder} value={resetPassword} onChange={(e) => setResetPassword(e.target.value)} className="w-full pl-9 p-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-rose-500 outline-none" autoFocus /></div>
                      <button onClick={handleFactoryReset} disabled={isResetting || !resetPassword} className="w-full py-3 bg-rose-600 text-white font-bold rounded-lg hover:bg-rose-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mb-3">{isResetting ? t.admin.resetting : t.admin.confirm}</button>
                      <button onClick={() => setIsResetModalOpen(false)} className="w-full py-3 text-slate-500 dark:text-slate-400 font-bold hover:text-slate-700 dark:hover:text-slate-200 transition-colors">{t.admin.cancel}</button>
                  </div>
             </div>
        </div>
      )}
    </div>
  );
}
