
import React, { useState } from 'react';
import { Employee, TimeEntry, EmployeeRole } from '../types';
import { translations, Language } from '../translations';
import { User, Users, Plus, Briefcase, History, X, Shield, Wrench, Sparkles, Search, Edit2, Trash2, Trophy, Star, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';

interface EmployeesViewProps {
  lang: Language;
  employees: Employee[];
  onEmployeesUpdate: (updated: Employee[]) => void;
  timeEntries: TimeEntry[];
  onTimeEntriesUpdate: (updated: TimeEntry[]) => void;
}

export const EmployeesView: React.FC<EmployeesViewProps> = ({ lang, employees, onEmployeesUpdate, timeEntries, onTimeEntriesUpdate }) => {
  const t = translations[lang];
  
  const [isAddingEmp, setIsAddingEmp] = useState(false);
  const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [leaderboardDate, setLeaderboardDate] = useState(new Date());

  const [filterName, setFilterName] = useState('');
  const [filterRole, setFilterRole] = useState<string>('ALL');
  const [filterDateStart, setFilterDateStart] = useState('');
  const [filterDateEnd, setFilterDateEnd] = useState('');

  const [newEmp, setNewEmp] = useState<Partial<Employee>>({
    name: '',
    role: 'Reception',
    hourlyRate: 0
  });

  const [entryForm, setEntryForm] = useState<{
    employeeId: string;
    start: string;
    end: string;
  }>({ employeeId: '', start: '', end: '' });

  const getMonthKey = (date: Date) => {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      return `${y}-${m}`;
  };

  const currentMonthKey = getMonthKey(leaderboardDate);
  const getReviewCount = (emp: Employee, key: string) => (emp.reviewsHistory || {})[key] || 0;

  const changeLeaderboardMonth = (delta: number) => {
      const newDate = new Date(leaderboardDate);
      newDate.setMonth(newDate.getMonth() + delta);
      setLeaderboardDate(newDate);
  };

  const handleAddEmployee = async () => {
    if (!newEmp.name) return;
    const emp: Employee = {
        id: Date.now().toString(),
        name: newEmp.name,
        role: newEmp.role as EmployeeRole,
        hourlyRate: 0,
        isWorking: false,
        phone: '',
        reviewsHistory: {} 
    };
    onEmployeesUpdate([...employees, emp]);
    setIsAddingEmp(false);
    setNewEmp({ name: '', role: 'Reception', hourlyRate: 0 });
  };
  
  const handleUpdateEmployee = async () => {
      if (!editingEmployee || !editingEmployee.name) return;
      onEmployeesUpdate(employees.map(e => e.id === editingEmployee.id ? editingEmployee : e));
      setIsStaffModalOpen(false);
      setEditingEmployee(null);
  };

  const handleDeleteEmployee = async (id: string) => {
      if (!confirm(t.employees.deleteStaffConfirm)) return;
      onEmployeesUpdate(employees.filter(e => e.id !== id));
  };

  const handleIncrementReview = async (empId: string) => {
      const updatedEmps = employees.map(e => {
          if (e.id === empId) {
              const currentHistory = e.reviewsHistory || {};
              const newCount = (currentHistory[currentMonthKey] || 0) + 1;
              return { 
                  ...e, 
                  reviewsHistory: { ...currentHistory, [currentMonthKey]: newCount },
                  monthlyReviews: newCount
              };
          }
          return e;
      });
      onEmployeesUpdate(updatedEmps);
  };

  const handleResetLeaderboardMonth = async () => {
      if (!confirm(`Reset reviews to 0 for ${leaderboardDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}?`)) return;
      onEmployeesUpdate(employees.map(e => ({
          ...e,
          reviewsHistory: { ...(e.reviewsHistory || {}), [currentMonthKey]: 0 }
      })));
  };

  const handleClockIn = async (empId: string) => {
    onEmployeesUpdate(employees.map(e => e.id === empId ? { ...e, isWorking: true } : e));
    const newEntry: TimeEntry = { id: Date.now().toString(), employeeId: empId, clockIn: new Date().toISOString() };
    onTimeEntriesUpdate([newEntry, ...timeEntries]);
  };

  const handleClockOut = async (empId: string) => {
     const activeEntryIndex = timeEntries.findIndex(t => t.employeeId === empId && !t.clockOut);
     if (activeEntryIndex === -1) return;
     const updatedEntries = [...timeEntries];
     updatedEntries[activeEntryIndex] = { ...timeEntries[activeEntryIndex], clockOut: new Date().toISOString(), totalPay: 0 };
     onEmployeesUpdate(employees.map(e => e.id === empId ? { ...e, isWorking: false } : e));
     onTimeEntriesUpdate(updatedEntries);
  };

  const openEntryModal = (entry?: TimeEntry) => {
      if (entry) {
          setEditingEntry(entry);
          const toLocalInput = (isoStr: string) => {
              const d = new Date(isoStr);
              d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
              return d.toISOString().slice(0, 16);
          };
          setEntryForm({ employeeId: entry.employeeId, start: toLocalInput(entry.clockIn), end: entry.clockOut ? toLocalInput(entry.clockOut) : '' });
      } else {
          setEditingEntry(null);
          setEntryForm({ employeeId: employees[0]?.id || '', start: '', end: '' });
      }
      setIsEntryModalOpen(true);
  };

  const handleSaveEntry = async () => {
      if (!entryForm.employeeId || !entryForm.start) return;
      const emp = employees.find(e => e.id === entryForm.employeeId);
      if (!emp) return;
      const startDate = new Date(entryForm.start);
      const endDate = entryForm.end ? new Date(entryForm.end) : undefined;
      let updatedEntries = [...timeEntries];
      if (editingEntry) {
          updatedEntries = updatedEntries.map(e => e.id === editingEntry.id ? { ...e, employeeId: entryForm.employeeId, clockIn: startDate.toISOString(), clockOut: endDate?.toISOString() } : e);
          const wasWorking = !editingEntry.clockOut;
          const isNowWorking = !endDate;
          if (wasWorking !== isNowWorking) onEmployeesUpdate(employees.map(e => e.id === emp.id ? { ...e, isWorking: isNowWorking } : e));
      } else {
          updatedEntries = [{ id: Date.now().toString(), employeeId: entryForm.employeeId, clockIn: startDate.toISOString(), clockOut: endDate?.toISOString() }, ...updatedEntries];
          if (!endDate) onEmployeesUpdate(employees.map(e => e.id === emp.id ? { ...e, isWorking: true } : e));
      }
      onTimeEntriesUpdate(updatedEntries);
      setIsEntryModalOpen(false);
  };

  const handleDeleteEntry = async (id: string) => {
      if (!confirm(t.employees.deleteConfirm)) return;
      const entry = timeEntries.find(e => e.id === id);
      if (entry && !entry.clockOut) onEmployeesUpdate(employees.map(e => e.id === entry.employeeId ? { ...e, isWorking: false } : e));
      onTimeEntriesUpdate(timeEntries.filter(e => e.id !== id));
  };

  const formatDuration = (start: string, end?: string) => {
      const s = new Date(start);
      const e = end ? new Date(end) : new Date();
      const diffMs = e.getTime() - s.getTime();
      const hrs = Math.floor(diffMs / (1000 * 60 * 60));
      const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      return `${hrs}h ${mins}m`;
  };

  const getRoleIcon = (role: EmployeeRole) => {
      switch(role) {
          case 'Manager': return <Briefcase className="w-4 h-4 text-purple-500" />;
          case 'Housekeeping': return <Sparkles className="w-4 h-4 text-amber-500" />;
          case 'Security': return <Shield className="w-4 h-4 text-blue-500" />;
          case 'Maintenance': return <Wrench className="w-4 h-4 text-slate-500" />;
          default: return <User className="w-4 h-4 text-indigo-500" />;
      }
  };
  
  const sortedByReviews = [...employees].map(e => ({...e, currentCount: getReviewCount(e, currentMonthKey)})).filter(e => e.currentCount > 0).sort((a, b) => b.currentCount - a.currentCount);
  const filteredEntries = timeEntries.filter(entry => {
      const emp = employees.find(e => e.id === entry.employeeId);
      if (!emp) return false;
      const matchesName = emp.name.toLowerCase().includes(filterName.toLowerCase());
      const matchesRole = filterRole === 'ALL' || emp.role === filterRole;
      let matchesDate = true;
      const entryDate = new Date(entry.clockIn);
      if (filterDateStart) matchesDate = matchesDate && entryDate >= new Date(filterDateStart);
      if (filterDateEnd) { const endDate = new Date(filterDateEnd); endDate.setHours(23, 59, 59); matchesDate = matchesDate && entryDate <= endDate; }
      return matchesName && matchesRole && matchesDate;
  });

  return (
    <div className="h-full flex gap-6 relative">
      <div className="w-1/3 flex flex-col gap-4">
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col h-full overflow-hidden">
             <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800">
                 <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2"><Users className="w-5 h-5 text-indigo-600" /> {t.employees.title}</h3>
                 <button onClick={() => setIsAddingEmp(true)} className="p-1.5 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 rounded-lg hover:bg-indigo-200 transition-colors"><Plus className="w-4 h-4" /></button>
             </div>
             {isAddingEmp && (
                 <div className="p-4 border-b border-slate-100 dark:border-slate-700 bg-indigo-50/50 dark:bg-indigo-900/10 animate-in slide-in-from-top-2">
                     <div className="space-y-3">
                         <input className="w-full p-2 text-sm border border-slate-300 rounded bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder={t.employees.name} value={newEmp.name} onChange={e => setNewEmp({...newEmp, name: e.target.value})} />
                         <select className="w-full p-2 text-sm border border-slate-300 rounded bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500" value={newEmp.role} onChange={e => setNewEmp({...newEmp, role: e.target.value as EmployeeRole})}><option value="Reception">Reception</option><option value="Housekeeping">Housekeeping</option><option value="Maintenance">Maintenance</option><option value="Security">Security</option><option value="Manager">Manager</option></select>
                         <div className="flex gap-2 justify-end"><button onClick={() => setIsAddingEmp(false)} className="text-xs font-bold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200">{t.employees.cancel}</button><button onClick={handleAddEmployee} className="text-xs font-bold bg-indigo-600 text-white px-3 py-1.5 rounded hover:bg-indigo-700 transition-colors">{t.employees.save}</button></div>
                     </div>
                 </div>
             )}
             <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
                 {employees.length === 0 && <div className="p-4 text-center text-slate-400 text-sm italic">No staff added yet.</div>}
                 {employees.map(emp => {
                     const count = getReviewCount(emp, currentMonthKey);
                     return (
                     <div key={emp.id} className="p-3 rounded-lg border border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors flex justify-between items-center group relative">
                         <div className="flex items-center gap-3">
                             <div className="relative"><div className={`w-10 h-10 rounded-full flex items-center justify-center ${emp.isWorking ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30' : 'bg-slate-100 text-slate-500 dark:bg-slate-700'}`}>{getRoleIcon(emp.role)}</div><div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white dark:border-slate-800 ${emp.isWorking ? 'bg-emerald-500' : 'bg-slate-300'}`}></div></div>
                             <div><div className="font-bold text-sm text-slate-800 dark:text-white flex items-center gap-1">{emp.name} {count > 0 && <span className="flex items-center text-[10px] bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 px-1 rounded-full font-bold"><Star className="w-2.5 h-2.5 fill-current mr-0.5" />{count}</span>}</div><div className="text-xs text-slate-500 dark:text-slate-400">{emp.role}</div></div>
                         </div>
                         <div className="flex items-center gap-2">
                             <button onClick={() => handleIncrementReview(emp.id)} className="p-1.5 text-amber-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg transition-colors opacity-0 group-hover:opacity-100"><Star className="w-4 h-4" /></button>
                             <button onClick={() => { setEditingEmployee({...emp, reviewsHistory: emp.reviewsHistory || {}}); setIsStaffModalOpen(true); }} className="p-1.5 text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors opacity-0 group-hover:opacity-100"><Edit2 className="w-4 h-4" /></button>
                             <button onClick={() => handleDeleteEmployee(emp.id)} className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors opacity-0 group-hover:opacity-100"><Trash2 className="w-4 h-4" /></button>
                             {emp.isWorking ? <button onClick={() => handleClockOut(emp.id)} className="px-3 py-1.5 bg-rose-50 text-rose-600 border border-rose-200 rounded-lg text-xs font-bold hover:bg-rose-100 dark:bg-rose-900/20 dark:border-rose-800 dark:text-rose-400">{t.employees.clockOut}</button> : <button onClick={() => handleClockIn(emp.id)} className="px-3 py-1.5 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-lg text-xs font-bold hover:bg-emerald-100 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-400">{t.employees.clockIn}</button>}
                         </div>
                     </div>
                 )})}
             </div>
        </div>
      </div>
      <div className="w-2/3 flex flex-col gap-4">
          <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-xl shadow-lg p-4 text-white relative overflow-hidden flex-shrink-0">
             <div className="absolute top-0 right-0 p-4 opacity-10"><Trophy className="w-32 h-32 rotate-12" /></div>
             <div className="flex justify-between items-start relative z-10 mb-4">
                 <h3 className="flex items-center gap-2 font-bold text-lg"><Trophy className="w-5 h-5 text-amber-300" /> {t.employees.leaderboardTitle}</h3>
                 <div className="flex items-center gap-2">
                     <div className="flex items-center bg-white/10 rounded-lg p-1"><button onClick={() => changeLeaderboardMonth(-1)} className="p-1 hover:bg-white/20 rounded-md transition-colors"><ChevronLeft className="w-4 h-4 text-indigo-100" /></button><span className="text-xs font-bold px-3 min-w-[80px] text-center">{leaderboardDate.toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}</span><button onClick={() => changeLeaderboardMonth(1)} className="p-1 hover:bg-white/20 rounded-md transition-colors"><ChevronRight className="w-4 h-4 text-indigo-100" /></button></div>
                     <button onClick={handleResetLeaderboardMonth} className="p-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 text-indigo-100 hover:text-white"><RefreshCw className="w-3.5 h-3.5" /></button>
                 </div>
             </div>
             {sortedByReviews.length === 0 ? <div className="text-center py-6 text-indigo-100 italic relative z-10 bg-white/10 rounded-lg border border-white/10">No reviews logged for {leaderboardDate.toLocaleDateString(undefined, {month:'long'})}.</div> : (
                 <div className="relative z-10">
                    <div className="grid grid-cols-3 gap-4 items-end mb-4">
                        <div className="flex flex-col items-center">{sortedByReviews[1] ? <><div className="w-16 h-16 rounded-full bg-slate-200 border-4 border-slate-300 flex items-center justify-center text-slate-600 font-bold text-xl shadow-lg mb-2 relative">{sortedByReviews[1].name.charAt(0)}<div className="absolute -bottom-2 bg-slate-300 text-slate-800 text-[10px] font-bold px-2 py-0.5 rounded-full">2nd</div></div><div className="font-bold text-sm text-center truncate w-full">{sortedByReviews[1].name}</div><div className="text-xs text-indigo-200 flex items-center gap-1"><Star className="w-3 h-3 fill-amber-300 text-amber-300" /> {sortedByReviews[1].currentCount}</div></> : <div className="w-16"></div>}</div>
                        <div className="flex flex-col items-center -mt-4"><div className="w-20 h-20 rounded-full bg-amber-300 border-4 border-amber-400 flex items-center justify-center text-amber-800 font-bold text-2xl shadow-xl mb-2 relative">{sortedByReviews[0].name.charAt(0)}<div className="absolute -top-6"><div className="text-3xl">👑</div></div><div className="absolute -bottom-2 bg-amber-400 text-amber-900 text-[10px] font-bold px-3 py-0.5 rounded-full">1st</div></div><div className="font-bold text-lg text-center truncate w-full">{sortedByReviews[0].name}</div><div className="text-sm font-bold text-amber-200 flex items-center gap-1 bg-white/20 px-2 py-0.5 rounded-full mt-1"><Star className="w-3.5 h-3.5 fill-current" /> {sortedByReviews[0].currentCount} Reviews</div></div>
                        <div className="flex flex-col items-center">{sortedByReviews[2] ? <><div className="w-16 h-16 rounded-full bg-orange-200 border-4 border-orange-300 flex items-center justify-center text-orange-700 font-bold text-xl shadow-lg mb-2 relative">{sortedByReviews[2].name.charAt(0)}<div className="absolute -bottom-2 bg-orange-300 text-orange-900 text-[10px] font-bold px-2 py-0.5 rounded-full">3rd</div></div><div className="font-bold text-sm text-center truncate w-full">{sortedByReviews[2].name}</div><div className="text-xs text-indigo-200 flex items-center gap-1"><Star className="w-3 h-3 fill-amber-300 text-amber-300" /> {sortedByReviews[2].currentCount}</div></> : <div className="w-16"></div>}</div>
                    </div>
                    {sortedByReviews.length > 3 && <div className="bg-white/10 rounded-xl p-1 max-h-48 overflow-y-auto custom-scrollbar border border-white/10">{sortedByReviews.slice(3).map((emp, idx) => (<div key={emp.id} className="flex items-center justify-between p-2 hover:bg-white/10 rounded-lg transition-colors"><div className="flex items-center gap-3"><div className="w-6 text-center font-mono font-bold text-indigo-300 text-xs">#{idx + 4}</div><div className="flex items-center gap-2"><div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold">{emp.name.charAt(0)}</div><span className="text-sm font-medium">{emp.name}</span></div></div><div className="flex items-center gap-1 text-xs font-bold text-amber-300 bg-black/20 px-2 py-1 rounded-full"><Star className="w-3 h-3 fill-current" /> {emp.currentCount}</div></div>))}</div>}
                 </div>
             )}
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col flex-1 overflow-hidden">
              <div className="p-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 space-y-3">
                  <div className="flex justify-between items-center"><h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2"><History className="w-5 h-5 text-slate-500" /> {t.employees.history}</h3><button onClick={() => openEntryModal()} className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-bold hover:border-indigo-300 dark:hover:border-indigo-500 transition-colors"><Plus className="w-4 h-4" /> {t.employees.manualEntry}</button></div>
                  <div className="flex flex-wrap gap-2">
                      <div className="flex-1 min-w-[150px] relative"><Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" /><input type="text" placeholder={t.employees.searchHistory} value={filterName} onChange={(e) => setFilterName(e.target.value)} className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:text-white" /></div>
                      <div className="w-[120px]"><select value={filterRole} onChange={(e) => setFilterRole(e.target.value)} className="w-full px-2 py-1.5 text-xs border border-slate-200 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:text-white"><option value="ALL">All Roles</option><option value="Reception">Reception</option><option value="Housekeeping">Housekeeping</option><option value="Maintenance">Maintenance</option><option value="Security">Security</option><option value="Manager">Manager</option></select></div>
                      <div className="flex items-center gap-2"><input type="date" value={filterDateStart} onChange={(e) => setFilterDateStart(e.target.value)} className="px-2 py-1.5 text-xs border border-slate-200 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 dark:text-white" /><span className="text-slate-400">-</span><input type="date" value={filterDateEnd} onChange={(e) => setFilterDateEnd(e.target.value)} className="px-2 py-1.5 text-xs border border-slate-200 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 dark:text-white" /></div>
                  </div>
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar">
                  <table className="w-full text-sm text-left">
                      <thead className="bg-slate-50 dark:bg-slate-900 text-xs uppercase text-slate-500 font-bold sticky top-0 z-10"><tr><th className="px-4 py-3">{t.employees.name}</th><th className="px-4 py-3">{t.employees.clockIn}</th><th className="px-4 py-3">{t.employees.clockOut}</th><th className="px-4 py-3">{t.employees.duration}</th><th className="px-4 py-3 text-center w-20">Actions</th></tr></thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                          {filteredEntries.map(entry => {
                              const emp = employees.find(e => e.id === entry.employeeId) || { name: 'Unknown', role: 'Staff' };
                              return (<tr key={entry.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors group"><td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200"><div className="flex items-center gap-2">{emp.name}<span className="text-[10px] bg-slate-100 dark:bg-slate-700 px-1.5 rounded text-slate-500">{emp.role}</span></div></td><td className="px-4 py-3 text-slate-600 dark:text-slate-400">{new Date(entry.clockIn).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</td><td className="px-4 py-3 text-slate-600 dark:text-slate-400">{!entry.clockOut ? <span className="text-emerald-600 dark:text-emerald-400 font-bold text-xs px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/30 rounded-full animate-pulse">{t.employees.working}</span> : new Date(entry.clockOut).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}</td><td className="px-4 py-3 font-mono text-slate-600 dark:text-slate-400">{formatDuration(entry.clockIn, entry.clockOut)}</td><td className="px-4 py-3 flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity"><button onClick={() => openEntryModal(entry)} className="p-1 hover:bg-indigo-50 dark:hover:bg-indigo-900 text-indigo-500 rounded"><Edit2 className="w-3.5 h-3.5" /></button><button onClick={() => handleDeleteEntry(entry.id)} className="p-1 hover:bg-rose-50 dark:hover:bg-rose-900 text-rose-500 rounded"><Trash2 className="w-3.5 h-3.5" /></button></td></tr>);
                          })}
                          {filteredEntries.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400 italic">No shifts found matching your filters.</td></tr>}
                      </tbody>
                  </table>
              </div>
          </div>
      </div>
      {isEntryModalOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
                  <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center"><h3 className="font-bold text-slate-900 dark:text-white">{editingEntry ? t.employees.editEntry : t.employees.manualEntry}</h3><button onClick={() => setIsEntryModalOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full"><X className="w-5 h-5 text-slate-500" /></button></div>
                  <div className="p-4 space-y-4">
                      <div><label className="block text-xs uppercase text-slate-500 dark:text-slate-400 font-bold mb-1">{t.employees.selectStaff}</label><select className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 dark:text-white" value={entryForm.employeeId} onChange={(e) => setEntryForm({...entryForm, employeeId: e.target.value})}>{employees.map(e => (<option key={e.id} value={e.id}>{e.name} ({e.role})</option>))}</select></div>
                      <div><label className="block text-xs uppercase text-slate-500 dark:text-slate-400 font-bold mb-1">{t.employees.startTime}</label><input type="datetime-local" className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 dark:text-white" value={entryForm.start} onChange={(e) => setEntryForm({...entryForm, start: e.target.value})} /></div>
                      <div><label className="block text-xs uppercase text-slate-500 dark:text-slate-400 font-bold mb-1">{t.employees.endTime}</label><input type="datetime-local" className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 dark:text-white" value={entryForm.end} onChange={(e) => setEntryForm({...entryForm, end: e.target.value})} /><p className="text-[10px] text-slate-400 mt-1 italic">Leave blank if currently working</p></div>
                      <button onClick={handleSaveEntry} disabled={!entryForm.employeeId || !entryForm.start} className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition-colors disabled:opacity-50">{t.employees.save}</button>
                  </div>
              </div>
          </div>
      )}
      {isStaffModalOpen && editingEmployee && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
                  <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center"><h3 className="font-bold text-slate-900 dark:text-white">{t.employees.editStaff}</h3><button onClick={() => setIsStaffModalOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full"><X className="w-5 h-5 text-slate-500" /></button></div>
                  <div className="p-4 space-y-4">
                      <div><label className="block text-xs uppercase text-slate-500 dark:text-slate-400 font-bold mb-1">{t.employees.name}</label><input className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 dark:text-white text-sm" value={editingEmployee.name} onChange={e => setEditingEmployee({...editingEmployee, name: e.target.value})} /></div>
                      <div><label className="block text-xs uppercase text-slate-500 dark:text-slate-400 font-bold mb-1">{t.employees.role}</label><select className="w-full p-2 text-sm border border-slate-300 rounded bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500" value={editingEmployee.role} onChange={e => setEditingEmployee({...editingEmployee, role: e.target.value as EmployeeRole})}><option value="Reception">Reception</option><option value="Housekeeping">Housekeeping</option><option value="Maintenance">Maintenance</option><option value="Security">Security</option><option value="Manager">Manager</option></select></div>
                      <div><label className="block text-xs uppercase text-slate-500 dark:text-slate-400 font-bold mb-1">{t.employees.adjustReviews} ({leaderboardDate.toLocaleDateString(undefined, {month:'short'})})</label><div className="