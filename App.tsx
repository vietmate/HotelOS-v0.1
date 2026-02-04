import React, { useState, useEffect, useRef } from 'react';
import { Room, RoomStatus, RoomType, BookingSource } from './types';
import { RoomCard } from './components/RoomCard';
import { RoomDetailPanel } from './components/RoomDetailPanel';
import { OccupancyGauge } from './components/OccupancyGauge';
import { StatsChart } from './components/StatsChart';
import { ClockWidget } from './components/ClockWidget';
import { PettyCashWidget } from './components/PettyCashWidget';
import { CalendarView } from './components/CalendarView';
import { NotesView } from './components/NotesView';
import { Building2, Plus, Filter, Search, Pencil, LayoutGrid, CalendarDays, NotebookPen, AlertTriangle, FileWarning, Settings2, Check, GripVertical, WifiOff } from 'lucide-react';
import { translations, Language } from './translations';
import { supabase, isSupabaseConfigured } from './services/supabaseClient';

const STORAGE_KEY_ROOMS = 'hotel_os_rooms_data';
const STORAGE_KEY_HOTEL_NAME = 'hotel_os_name';

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
    
    // Logic to determine initial status
    let status = Math.random() > 0.7 ? RoomStatus.OCCUPIED : (Math.random() > 0.8 ? RoomStatus.DIRTY : RoomStatus.AVAILABLE);
    
    if (i === 2) status = RoomStatus.DIRTY;

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

    const room: Room = {
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
    };

    if (i === 2) {
      room.upcomingReservation = {
        id: `res-${i}`,
        guestName: "Alice Wonderland",
        checkInDate: formatDate(tomorrow),
        checkOutDate: formatDate(dayAfter),
        source: BookingSource.BOOKING_COM
      };
    }

    return room;
  });
};

type ViewMode = 'grid' | 'calendar' | 'notes';
type WidgetId = 'clock' | 'pettyCash' | 'alerts' | 'occupancy' | 'stats';

const DEFAULT_WIDGET_ORDER: WidgetId[] = ['clock', 'pettyCash', 'alerts', 'occupancy', 'stats'];

export default function App() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [hotelName, setHotelName] = useState('HotelOS');
  const [isLoading, setIsLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(true);

  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [filter, setFilter] = useState<RoomStatus | 'ALL'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [isEditingName, setIsEditingName] = useState(false);
  const [lang, setLang] = useState<Language>('en');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  
  // Widget Reordering State
  const [isReordering, setIsReordering] = useState(false);
  const [widgetOrder, setWidgetOrder] = useState<WidgetId[]>(DEFAULT_WIDGET_ORDER);
  
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);

  const t = translations[lang];

  // --- Supabase Data Fetching & Subscriptions ---
  useEffect(() => {
    const fetchData = async () => {
        setIsLoading(true);
        
        // 1. Fallback if no keys
        if (!isSupabaseConfigured()) {
            console.log("Using LocalStorage fallback");
            setIsConnected(false);
            const savedRooms = localStorage.getItem(STORAGE_KEY_ROOMS);
            setRooms(savedRooms ? JSON.parse(savedRooms) : generateInitialRooms());
            setHotelName(localStorage.getItem(STORAGE_KEY_HOTEL_NAME) || 'HotelOS');
            const savedOrder = localStorage.getItem('hotel_widget_order');
            if (savedOrder) setWidgetOrder(JSON.parse(savedOrder));
            setIsLoading(false);
            return;
        }

        try {
            // 2. Fetch Rooms
            const { data: roomsData, error: roomsError } = await supabase.from('rooms').select('*').order('id');
            
            if (roomsError) throw roomsError;

            if (roomsData && roomsData.length > 0) {
                // Parse JSONB data back to Room objects
                // Sort by ID naturally (room-1, room-2, room-10 issue handling if needed, but standard sort usually ok)
                const parsedRooms = roomsData.map(r => r.data as Room).sort((a,b) => {
                    const numA = parseInt(a.number);
                    const numB = parseInt(b.number);
                    return numA - numB;
                });
                setRooms(parsedRooms);
            } else {
                // DB is empty, seed it
                const initialRooms = generateInitialRooms();
                const { error: seedError } = await supabase.from('rooms').insert(
                    initialRooms.map(r => ({ id: r.id, data: r }))
                );
                if (!seedError) setRooms(initialRooms);
            }

            // 3. Fetch Settings
            const { data: settingsData } = await supabase.from('app_settings').select('*');
            if (settingsData) {
                const nameSetting = settingsData.find(s => s.key === 'hotel_name');
                if (nameSetting) setHotelName(nameSetting.value);
                
                const orderSetting = settingsData.find(s => s.key === 'widget_order');
                if (orderSetting) setWidgetOrder(orderSetting.value);
            }

        } catch (error) {
            console.error("Error fetching data:", error);
            setIsConnected(false);
            // Fallback to local
             const savedRooms = localStorage.getItem(STORAGE_KEY_ROOMS);
            setRooms(savedRooms ? JSON.parse(savedRooms) : generateInitialRooms());
        } finally {
            setIsLoading(false);
        }
    };

    fetchData();

    // 4. Realtime Subscription
    if (isSupabaseConfigured()) {
        const channel = supabase.channel('hotel_updates')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms' }, (payload) => {
                if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
                    const newRoomData = payload.new.data as Room;
                    setRooms(prev => {
                        const exists = prev.find(r => r.id === newRoomData.id);
                        if (exists) {
                            return prev.map(r => r.id === newRoomData.id ? newRoomData : r);
                        }
                        return [...prev, newRoomData]; // Should sort here ideally
                    });
                }
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'app_settings' }, (payload) => {
                 if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
                     if (payload.new.key === 'hotel_name') setHotelName(payload.new.value);
                     if (payload.new.key === 'widget_order') setWidgetOrder(payload.new.value);
                 }
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }
  }, []);

  // --- Handlers ---

  const handleRoomUpdate = async (updatedRoom: Room) => {
    // Optimistic Update
    setRooms(prevRooms => prevRooms.map(r => r.id === updatedRoom.id ? updatedRoom : r));
    
    // Save to DB
    if (isSupabaseConfigured()) {
        const { error } = await supabase
            .from('rooms')
            .update({ data: updatedRoom, updated_at: new Date().toISOString() })
            .eq('id', updatedRoom.id);
            
        if (error) console.error("Failed to update room:", error);
    } else {
        // Fallback
        localStorage.setItem(STORAGE_KEY_ROOMS, JSON.stringify(rooms.map(r => r.id === updatedRoom.id ? updatedRoom : r)));
    }
  };

  const handleNameSave = async (newName: string) => {
      setHotelName(newName);
      setIsEditingName(false);
      
      if (isSupabaseConfigured()) {
          const { error } = await supabase.from('app_settings').upsert({ key: 'hotel_name', value: newName });
          if (error) console.error("Failed to save name", error);
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

  // --- Filtering & Stats ---

  const filteredRooms = rooms.filter(room => {
    const matchesFilter = filter === 'ALL' || room.status === filter;
    const matchesSearch = room.number.includes(searchTerm) || 
                          (room.name && room.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
                          (room.guestName && room.guestName.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesFilter && matchesSearch;
  });

  const occupiedCount = rooms.filter(r => r.status === RoomStatus.OCCUPIED).length;
  const occupancyPercentage = rooms.length > 0 ? (occupiedCount / rooms.length) * 100 : 0;

  // Calculate Alerts
  const alerts = rooms.reduce((acc, room) => {
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
          
          if (diffMins < 0) acc.overdue++;
          else if (diffMins < 120) acc.soon++;
      }
      
      if (room.status === RoomStatus.OCCUPIED && !room.isIdScanned) {
          acc.missingId++;
      }
      
      return acc;
  }, { soon: 0, overdue: 0, missingId: 0 });

  // Drag and Drop Handlers
  const handleDragStart = (index: number) => {
      dragItem.current = index;
  };

  const handleDragEnter = (index: number) => {
      if (dragItem.current === null) return;
      if (dragItem.current === index) return;

      const newOrder = [...widgetOrder];
      const draggedItemContent = newOrder[dragItem.current];
      newOrder.splice(dragItem.current, 1);
      newOrder.splice(index, 0, draggedItemContent);
      
      dragItem.current = index;
      setWidgetOrder(newOrder); // Optimistic local
  };

  const handleDragEnd = () => {
      dragItem.current = null;
      dragOverItem.current = null;
      handleWidgetOrderSave(widgetOrder);
  };

  // --- Render Widgets ---

  const renderAlertsWidget = () => {
     const hasAlerts = alerts.soon > 0 || alerts.overdue > 0 || alerts.missingId > 0;
     
     if (!hasAlerts) {
         if (isReordering) {
             return (
                 <div className="mb-6 p-4 border-2 border-dashed border-slate-200 rounded-xl text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-1">
                     <AlertTriangle className="w-4 h-4 opacity-50" />
                     {t.alerts.placeholder}
                 </div>
             );
         }
         return null;
     }

     return (
        <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl animate-in fade-in slide-in-from-top-4">
            <h3 className="flex items-center gap-2 text-red-800 font-bold text-sm mb-3">
                <AlertTriangle className="w-4 h-4" /> {t.alerts.title}
            </h3>
            <div className="space-y-2">
                {alerts.overdue > 0 && (
                    <div className="flex justify-between items-center text-xs">
                        <span className="text-red-700 font-medium">{t.alerts.overdue}</span>
                        <span className="bg-red-200 text-red-800 px-2 py-0.5 rounded-full font-bold">{alerts.overdue}</span>
                    </div>
                )}
                {alerts.soon > 0 && (
                    <div className="flex justify-between items-center text-xs">
                        <span className="text-amber-700 font-medium">{t.alerts.checkoutSoon}</span>
                        <span className="bg-amber-200 text-amber-800 px-2 py-0.5 rounded-full font-bold">{alerts.soon}</span>
                    </div>
                )}
                {alerts.missingId > 0 && (
                    <div className="flex justify-between items-center text-xs">
                        <span className="text-rose-700 font-medium">{t.alerts.kbtttMissing}</span>
                        <span className="bg-white border border-rose-200 text-rose-800 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
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
          case 'clock': return <ClockWidget lang={lang} />;
          case 'pettyCash': return <PettyCashWidget lang={lang} />;
          case 'alerts': return renderAlertsWidget();
          case 'occupancy': return <div className="mb-8 flex flex-col items-center"><OccupancyGauge percentage={occupancyPercentage} label={t.occupancy} /></div>;
          case 'stats': return <div className="mb-8"><h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">{t.roomStatus}</h3><StatsChart rooms={rooms} lang={lang} /></div>;
      }
  };

  const renderContent = () => {
    if (isLoading) {
        return (
            <div className="flex h-full items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
        )
    }

    switch(viewMode) {
      case 'calendar':
        return <CalendarView rooms={filteredRooms} onRoomClick={setSelectedRoom} lang={lang} />;
      case 'notes':
        return <NotesView lang={lang} />;
      case 'grid':
      default:
        return (
           <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 pb-20">
            {filteredRooms.map(room => (
              <RoomCard 
                key={room.id} 
                room={room} 
                onClick={setSelectedRoom}
                lang={lang}
              />
            ))}
            {filteredRooms.length === 0 && (
              <div className="col-span-full h-64 flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 rounded-xl">
                 <Search className="w-8 h-8 mb-2 opacity-50" />
                 <p>{t.noRoomsFound}</p>
              </div>
            )}
          </div>
        );
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 font-sans">
      
      {/* Left Sidebar / Stats Area */}
      <div className="w-80 bg-white border-r border-slate-200 flex flex-col hidden md:flex z-10">
        <div className="p-6 border-b border-slate-100">
          <div className="flex items-center gap-3 mb-3">
             <div className="bg-indigo-600 p-2 rounded-lg">
                <Building2 className="text-white w-6 h-6" />
             </div>
             <div className="flex-1 min-w-0">
               {isEditingName ? (
                 <input
                   type="text"
                   value={hotelName}
                   onChange={(e) => setHotelName(e.target.value)}
                   onBlur={() => handleNameSave(hotelName)}
                   onKeyDown={(e) => e.key === 'Enter' && handleNameSave(hotelName)}
                   autoFocus
                   className="w-full bg-white border border-indigo-300 rounded px-1 py-0.5 text-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                 />
               ) : (
                 <div className="flex items-center gap-2 group cursor-pointer" onClick={() => setIsEditingName(true)} title="Click to edit hotel name">
                   <h1 className="text-xl font-bold text-slate-900 tracking-tight truncate">{hotelName}</h1>
                   <Pencil className="w-3.5 h-3.5 text-slate-300 opacity-0 group-hover:opacity-100 transition-all hover:text-indigo-500" />
                 </div>
               )}
               <div className="flex items-center gap-1">
                   <p className="text-xs text-slate-500 font-medium">{t.dashboard}</p>
                   {!isConnected && (
                       <span className="text-[10px] bg-slate-100 text-slate-500 px-1 rounded flex items-center gap-1" title="Running in offline/local mode">
                           <WifiOff className="w-3 h-3" /> Offline
                       </span>
                   )}
               </div>
             </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
                <button onClick={() => setLang('en')} className={`text-xs px-2 py-1 rounded transition-colors ${lang === 'en' ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-400 hover:text-slate-600'}`}>EN</button>
                <span className="text-slate-200">|</span>
                <button onClick={() => setLang('vi')} className={`text-xs px-2 py-1 rounded transition-colors ${lang === 'vi' ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-400 hover:text-slate-600'}`}>VN</button>
            </div>
            {/* Edit Layout Button */}
            <button 
                onClick={() => setIsReordering(!isReordering)}
                className={`p-1.5 rounded transition-colors flex items-center gap-1 text-xs font-bold ${isReordering ? 'bg-indigo-100 text-indigo-700' : 'text-slate-400 hover:text-slate-600'}`}
                title={t.customizeLayout}
            >
                {isReordering ? <Check className="w-3.5 h-3.5" /> : <Settings2 className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        <div className="p-6 flex-1 overflow-y-auto">
            {widgetOrder.map((id, index) => (
                <div 
                    key={id}
                    draggable={isReordering}
                    onDragStart={() => handleDragStart(index)}
                    onDragEnter={(e) => {
                         e.preventDefault(); // Necessary for drop
                         handleDragEnter(index);
                    }}
                    onDragOver={(e) => e.preventDefault()}
                    onDragEnd={handleDragEnd}
                    className={`transition-all duration-300 ease-in-out relative ${isReordering ? 'cursor-move ring-2 ring-indigo-500/20 rounded-xl mb-4 p-2 bg-slate-50 border border-indigo-100' : ''}`}
                >
                    {isReordering && (
                        <div className="absolute top-1/2 -left-2 -translate-y-1/2 -translate-x-full text-slate-300">
                             <GripVertical className="w-4 h-4" />
                        </div>
                    )}
                    {renderWidgetContent(id)}
                </div>
            ))}
        </div>
        
        <div className="p-4 border-t border-slate-100 text-center">
          <p className="text-[10px] text-slate-400">v1.2.0 • {t.poweredBy}</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        
        {/* Mobile Header */}
        <div className="md:hidden bg-white border-b border-slate-200 p-4 flex justify-between items-center">
           <div className="font-bold text-lg flex items-center gap-2">
              <Building2 className="text-indigo-600 w-5 h-5" /> {hotelName}
           </div>
           <div className="flex items-center gap-3">
              <div className="flex items-center gap-1 bg-slate-100 rounded p-1">
                 <button onClick={() => setLang('en')} className={`text-[10px] px-1.5 rounded ${lang === 'en' ? 'bg-white shadow text-indigo-700 font-bold' : 'text-slate-400'}`}>EN</button>
                 <button onClick={() => setLang('vi')} className={`text-[10px] px-1.5 rounded ${lang === 'vi' ? 'bg-white shadow text-indigo-700 font-bold' : 'text-slate-400'}`}>VN</button>
              </div>
              <div className="text-sm font-medium text-slate-600">
                {occupiedCount}/{rooms.length}
              </div>
           </div>
        </div>

        {/* Top Bar */}
        <div className="p-6 pb-2">
           <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
              <div className="flex items-center gap-4">
                 <div>
                    <h2 className="text-2xl font-bold text-slate-800">{t.roomOverview}</h2>
                    <p className="text-slate-500 text-sm">{t.manageBookings}</p>
                 </div>
                 
                 {/* View Switcher Tabs */}
                 <div className="bg-slate-100 p-1 rounded-lg flex items-center gap-1 ml-0 xl:ml-6">
                    <button 
                      onClick={() => setViewMode('grid')}
                      className={`px-3 py-1.5 rounded-md text-sm font-bold flex items-center gap-2 transition-all ${viewMode === 'grid' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                      <LayoutGrid className="w-4 h-4" />
                      {t.views.grid}
                    </button>
                    <button 
                      onClick={() => setViewMode('calendar')}
                      className={`px-3 py-1.5 rounded-md text-sm font-bold flex items-center gap-2 transition-all ${viewMode === 'calendar' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                      <CalendarDays className="w-4 h-4" />
                      {t.views.calendar}
                    </button>
                    <button 
                      onClick={() => setViewMode('notes')}
                      className={`px-3 py-1.5 rounded-md text-sm font-bold flex items-center gap-2 transition-all ${viewMode === 'notes' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                      <NotebookPen className="w-4 h-4" />
                      {t.views.notes}
                    </button>
                 </div>
              </div>
              
              {viewMode !== 'notes' && (
                <div className="flex flex-wrap gap-3 w-full xl:w-auto">
                   <div className="relative group flex-1 sm:flex-none">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                      <input 
                        type="text" 
                        placeholder={t.searchPlaceholder}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full sm:w-64 pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                      />
                   </div>
                   
                   <div className="relative flex-1 sm:flex-none">
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                         <Filter className="w-4 h-4 text-slate-400" />
                      </div>
                      <select 
                        value={filter} 
                        onChange={(e) => setFilter(e.target.value as RoomStatus | 'ALL')}
                        className="w-full sm:w-auto pl-9 pr-8 py-2 bg-white border border-slate-200 rounded-lg text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500/50 cursor-pointer"
                      >
                         <option value="ALL">{t.allStatus}</option>
                         {Object.values(RoomStatus).map(s => <option key={s} value={s}>{t.status[s]}</option>)}
                      </select>
                   </div>
                </div>
              )}
           </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 pt-4">
          {renderContent()}
        </div>
      </div>

      {/* Side Panel Overlay */}
      {selectedRoom && (
        <div 
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 transition-opacity"
          onClick={() => setSelectedRoom(null)}
        />
      )}
      
      {/* Side Panel */}
      <RoomDetailPanel 
        room={selectedRoom} 
        onClose={() => setSelectedRoom(null)} 
        onUpdate={handleRoomUpdate}
        lang={lang}
      />

    </div>
  );
}