
import React, { useState, useEffect } from 'react';
import { Employee, TimeEntry, EmployeeRole } from '../types';
import { translations, Language } from '../translations';
import { supabase, isSupabaseConfigured } from '../services/supabaseClient';
import { User, Users, Plus, Briefcase, History, X, Shield, Wrench, Sparkles, Search, Edit2, Trash2 } from 'lucide-react';

interface EmployeesViewProps {
  lang: Language;
}

const STORAGE_KEY_EMPLOYEES = 'hotel_os_employees';
const STORAGE_KEY_TIME_ENTRIES = 'hotel_os_time_entries';

export const EmployeesView: React.FC<EmployeesViewProps> = ({ lang }) => {
  const t = translations[lang];
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // UI States
  const [isAddingEmp, setIsAddingEmp] = useState(false);
  const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null);

  // Filters
  const [filterName, setFilterName] = useState('');
  const [filterRole, setFilterRole] = useState<string>('ALL');
  const [filterDateStart, setFilterDateStart] = useState('');
  const [filterDateEnd, setFilterDateEnd] = useState('');

  // Forms
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

  // Load Data
  useEffect(() => {
    const fetchData = async () => {
        setIsLoading(true);
        if (isSupabaseConfigured()) {
            const { data: empData } = await supabase.from('employees').select('*');
            const { data: timeData } = await supabase.from('time_entries').select('*').order('created_at', { ascending: false });

            if (empData) setEmployees(empData.map(r => r.data as Employee));
            if (timeData) setTimeEntries(timeData.map(r => r.data as TimeEntry));
        } else {
            const savedEmp = localStorage.getItem(STORAGE_KEY_EMPLOYEES);
            if (savedEmp) setEmployees(JSON.parse(savedEmp));
            
            const savedTime = localStorage.getItem(STORAGE_KEY_TIME_ENTRIES);
            if (savedTime) setTimeEntries(JSON.parse(savedTime));
        }
        setIsLoading(false);
    };
    fetchData();
  }, []);

  const saveEmployees = async (updated: Employee[]) => {
      setEmployees(updated);
      if (isSupabaseConfigured()) {
          for (const emp of updated) {
              await supabase.from('employees').upsert({ id: emp.id, data: emp });
          }
      } else {
          localStorage.setItem(STORAGE_KEY_EMPLOYEES, JSON.stringify(updated));
      }
  };

  const saveTimeEntries = async (updated: TimeEntry[]) => {
      setTimeEntries(updated);
      if (isSupabaseConfigured()) {
          for (const entry of updated.slice(0, 10)) { 
             await supabase.from('time_entries').upsert({ id: entry.id, data: entry });
          }
      } else {
          localStorage.setItem(STORAGE_KEY_TIME_ENTRIES, JSON.stringify(updated));
      }
  };

  // --- Employee Management ---

  const handleAddEmployee = async () => {
    if (!newEmp.name) return;
    const emp: Employee = {
        id: Date.now().toString(),
        name: newEmp.name,
        role: newEmp.role as EmployeeRole,
        hourlyRate: 0,
        isWorking: false,
        phone: ''
    };
    const updated = [...employees, emp];
    await saveEmployees(updated);
    setIsAddingEmp(false);
    setNewEmp({ name: '', role: 'Reception', hourlyRate: 0 });
  };

  // --- Clock In/Out Logic ---

  const handleClockIn = async (empId: string) => {
    const updatedEmps = employees.map(e => e.id === empId ? { ...e, isWorking: true } : e);
    const newEntry: TimeEntry = {
        id: Date.now().toString(),
        employeeId: empId,
        clockIn: new Date().toISOString()
    };
    await saveEmployees(updatedEmps);
    await saveTimeEntries([newEntry, ...timeEntries]);
  };

  const handleClockOut = async (empId: string) => {
     const now = new Date();
     const activeEntryIndex = timeEntries.findIndex(t => t.employeeId === empId && !t.clockOut);
     if (activeEntryIndex === -1) return;

     const entry = timeEntries[activeEntryIndex];
     
     const updatedEntry = { ...entry, clockOut: now.toISOString(), totalPay: 0 };
     const updatedEntries = [...timeEntries];
     updatedEntries[activeEntryIndex] = updatedEntry;

     const updatedEmps = employees.map(e => e.id === empId ? { ...e, isWorking: false } : e);

     await saveEmployees(updatedEmps);
     await saveTimeEntries(updatedEntries);
  };

  // --- Manual Entry & Editing ---

  const openEntryModal = (entry?: TimeEntry) => {
      if (entry) {
          setEditingEntry(entry);
          
          // Convert ISO to local datetime-local string format: YYYY-MM-DDTHH:MM
          const toLocalInput = (isoStr: string) => {
              const d = new Date(isoStr);
              d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
              return d.toISOString().slice(0, 16);
          };

          setEntryForm({
              employeeId: entry.employeeId,
              start: toLocalInput(entry.clockIn),
              end: entry.clockOut ? toLocalInput(entry.clockOut) : ''
          });
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
      let updatedEmps = [...employees];

      if (editingEntry) {
          // Edit existing
          updatedEntries = updatedEntries.map(e => {
              if (e.id === editingEntry.id) {
                  return {
                      ...e,
                      employeeId: entryForm.employeeId,
                      clockIn: startDate.toISOString(),
                      clockOut: endDate?.toISOString(),
                      totalPay: 0
                  };
              }
              return e;
          });
          
          // If editing an active entry to be closed, or closed to active, update employee status logic is complex.
          // For simplicity, we mostly rely on the fact that if 'clockOut' is removed, they are working.
          const wasWorking = !editingEntry.clockOut;
          const isNowWorking = !endDate;

          if (wasWorking !== isNowWorking) {
               updatedEmps = updatedEmps.map(e => e.id === emp.id ? { ...e, isWorking: isNowWorking } : e);
          }

      } else {
          // New Entry
          const newEntry: TimeEntry = {
              id: Date.now().toString(),
              employeeId: entryForm.employeeId,
              clockIn: startDate.toISOString(),
              clockOut: endDate?.toISOString(),
              totalPay: 0
          };
          updatedEntries = [newEntry, ...updatedEntries];
          
          // If adding an open shift, set employee to working
          if (!endDate) {
              updatedEmps = updatedEmps.map(e => e.id === emp.id ? { ...e, isWorking: true } : e);
          }
      }

      await saveEmployees(updatedEmps);
      await saveTimeEntries(updatedEntries);
      setIsEntryModalOpen(false);
  };

  const handleDeleteEntry = async (id: string) => {
      if (!confirm(t.employees.deleteConfirm)) return;
      
      const entry = timeEntries.find(e => e.id === id);
      if (entry && !entry.clockOut) {
          // If deleting an active shift, set employee to not working
          const updatedEmps = employees.map(e => e.id === entry.employeeId ? { ...e, isWorking: false } : e);
          await saveEmployees(updatedEmps);
      }

      const updatedEntries = timeEntries.filter(e => e.id !== id);
      await saveTimeEntries(updatedEntries);
      if (isSupabaseConfigured()) {
          await supabase.from('time_entries').delete().eq('id', id);
      }
  };

  // --- Filtering Logic ---
  
  const filteredEntries = timeEntries.filter(entry => {
      const emp = employees.find(e => e.id === entry.employeeId);
      if (!emp) return false;

      const matchesName = emp.name.toLowerCase().includes(filterName.toLowerCase());
      const matchesRole = filterRole === 'ALL' || emp.role === filterRole;
      
      let matchesDate = true;
      const entryDate = new Date(entry.clockIn);
      if (filterDateStart) {
          matchesDate = matchesDate && entryDate >= new Date(filterDateStart);
      }
      if (filterDateEnd) {
          const endDate = new Date(filterDateEnd);
          endDate.setHours(23, 59, 59); // End of day
          matchesDate = matchesDate && entryDate <= endDate;
      }

      return matchesName && matchesRole && matchesDate;
  });

  // --- Render Helpers ---

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

  return (
    <div className="h-full flex gap-6 relative">
      {/* Left Column: Employee List */}
      <div className="w-1/3 flex flex-col gap-4">
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col h-full overflow-hidden">
             <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800">
                 <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                     <Users className="w-5 h-5 text-indigo-600" /> {t.employees.title}
                 </h3>
                 <button 
                    onClick={() => setIsAddingEmp(true)}
                    className="p-1.5 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 rounded-lg hover:bg-indigo-200 transition-colors"
                 >
                     <Plus className="w-4 h-4" />
                 </button>
             </div>
             
             {isAddingEmp && (
                 <div className="p-4 border-b border-slate-100 dark:border-slate-700 bg-indigo-50/50 dark:bg-indigo-900/10 animate-in slide-in-from-top-2">
                     <div className="space-y-3">
                         <input 
                            className="w-full p-2 text-sm border rounded dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                            placeholder={t.employees.name}
                            value={newEmp.name}
                            onChange={e => setNewEmp({...newEmp, name: e.target.value})}
                         />
                         <div className="flex gap-2">
                             <select 
                                className="w-full p-2 text-sm border rounded dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                                value={newEmp.role}
                                onChange={e => setNewEmp({...newEmp, role: e.target.value as EmployeeRole})}
                             >
                                 <option value="Reception">Reception</option>
                                 <option value="Housekeeping">Housekeeping</option>
                                 <option value="Maintenance">Maintenance</option>
                                 <option value="Security">Security</option>
                                 <option value="Manager">Manager</option>
                             </select>
                         </div>
                         <div className="flex gap-2 justify-end">
                             <button onClick={() => setIsAddingEmp(false)} className="text-xs font-bold text-slate-500">{t.employees.cancel}</button>
                             <button onClick={handleAddEmployee} className="text-xs font-bold bg-indigo-600 text-white px-3 py-1.5 rounded">{t.employees.save}</button>
                         </div>
                     </div>
                 </div>
             )}

             <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
                 {employees.length === 0 && <div className="p-4 text-center text-slate-400 text-sm italic">No staff added yet.</div>}
                 {employees.map(emp => (
                     <div key={emp.id} className="p-3 rounded-lg border border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors flex justify-between items-center group">
                         <div className="flex items-center gap-3">
                             <div className="relative">
                                 <div className={`w-10 h-10 rounded-full flex items-center justify-center ${emp.isWorking ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30' : 'bg-slate-100 text-slate-500 dark:bg-slate-700'}`}>
                                     {getRoleIcon(emp.role)}
                                 </div>
                                 <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white dark:border-slate-800 ${emp.isWorking ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>
                             </div>
                             <div>
                                 <div className="font-bold text-sm text-slate-800 dark:text-white">{emp.name}</div>
                                 <div className="text-xs text-slate-500 dark:text-slate-400">{emp.role}</div>
                             </div>
                         </div>
                         
                         {/* Action Button */}
                         <div>
                             {emp.isWorking ? (
                                 <button 
                                    onClick={() => handleClockOut(emp.id)}
                                    className="px-3 py-1.5 bg-rose-50 text-rose-600 border border-rose-200 rounded-lg text-xs font-bold hover:bg-rose-100 dark:bg-rose-900/20 dark:border-rose-800 dark:text-rose-400"
                                 >
                                     {t.employees.clockOut}
                                 </button>
                             ) : (
                                 <button 
                                    onClick={() => handleClockIn(emp.id)}
                                    className="px-3 py-1.5 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-lg text-xs font-bold hover:bg-emerald-100 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-400"
                                 >
                                     {t.employees.clockIn}
                                 </button>
                             )}
                         </div>
                     </div>
                 ))}
             </div>
        </div>
      </div>

      {/* Right Column: Timesheet History & Filters */}
      <div className="w-2/3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col overflow-hidden">
          
          {/* Header & Actions */}
          <div className="p-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 space-y-3">
              <div className="flex justify-between items-center">
                  <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                      <History className="w-5 h-5 text-slate-500" /> {t.employees.history}
                  </h3>
                  <button 
                    onClick={() => openEntryModal()}
                    className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-bold hover:border-indigo-300 dark:hover:border-indigo-500 transition-colors"
                  >
                      <Plus className="w-4 h-4" /> {t.employees.manualEntry}
                  </button>
              </div>

              {/* Filters Toolbar */}
              <div className="flex flex-wrap gap-2">
                  <div className="flex-1 min-w-[150px] relative">
                      <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input 
                        type="text"
                        placeholder={t.employees.searchHistory}
                        value={filterName}
                        onChange={(e) => setFilterName(e.target.value)}
                        className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:text-white"
                      />
                  </div>
                  <div className="w-[120px]">
                      <select 
                        value={filterRole}
                        onChange={(e) => setFilterRole(e.target.value)}
                        className="w-full px-2 py-1.5 text-xs border border-slate-200 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:text-white"
                      >
                          <option value="ALL">All Roles</option>
                          <option value="Reception">Reception</option>
                          <option value="Housekeeping">Housekeeping</option>
                          <option value="Maintenance">Maintenance</option>
                          <option value="Security">Security</option>
                          <option value="Manager">Manager</option>
                      </select>
                  </div>
                  <div className="flex items-center gap-2">
                      <input 
                        type="date"
                        value={filterDateStart}
                        onChange={(e) => setFilterDateStart(e.target.value)}
                        className="px-2 py-1.5 text-xs border border-slate-200 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 dark:text-white"
                      />
                      <span className="text-slate-400">-</span>
                      <input 
                        type="date"
                        value={filterDateEnd}
                        onChange={(e) => setFilterDateEnd(e.target.value)}
                        className="px-2 py-1.5 text-xs border border-slate-200 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 dark:text-white"
                      />
                  </div>
              </div>
          </div>
          
          <div className="flex-1 overflow-y-auto custom-scrollbar">
              <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 dark:bg-slate-900 text-xs uppercase text-slate-500 font-bold sticky top-0 z-10">
                      <tr>
                          <th className="px-4 py-3">{t.employees.name}</th>
                          <th className="px-4 py-3">{t.employees.clockIn}</th>
                          <th className="px-4 py-3">{t.employees.clockOut}</th>
                          <th className="px-4 py-3">{t.employees.duration}</th>
                          <th className="px-4 py-3 text-center w-20">Actions</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                      {filteredEntries.map(entry => {
                          const emp = employees.find(e => e.id === entry.employeeId) || { name: 'Unknown', role: 'Staff' };
                          const isActive = !entry.clockOut;
                          
                          return (
                              <tr key={entry.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors group">
                                  <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200">
                                      <div className="flex items-center gap-2">
                                          {emp.name}
                                          <span className="text-[10px] bg-slate-100 dark:bg-slate-700 px-1.5 rounded text-slate-500">{emp.role}</span>
                                      </div>
                                  </td>
                                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                                      {new Date(entry.clockIn).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                  </td>
                                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                                      {isActive ? (
                                          <span className="text-emerald-600 dark:text-emerald-400 font-bold text-xs px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/30 rounded-full animate-pulse">
                                              {t.employees.working}
                                          </span>
                                      ) : (
                                          new Date(entry.clockOut!).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
                                      )}
                                  </td>
                                  <td className="px-4 py-3 font-mono text-slate-600 dark:text-slate-400">
                                      {formatDuration(entry.clockIn, entry.clockOut)}
                                  </td>
                                  <td className="px-4 py-3 flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <button 
                                        onClick={() => openEntryModal(entry)}
                                        className="p-1 hover:bg-indigo-50 dark:hover:bg-indigo-900 text-indigo-500 rounded"
                                        title={t.employees.editEntry}
                                      >
                                          <Edit2 className="w-3.5 h-3.5" />
                                      </button>
                                      <button 
                                        onClick={() => handleDeleteEntry(entry.id)}
                                        className="p-1 hover:bg-rose-50 dark:hover:bg-rose-900 text-rose-500 rounded"
                                        title={t.employees.deleteEntry}
                                      >
                                          <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                  </td>
                              </tr>
                          );
                      })}
                      {filteredEntries.length === 0 && (
                          <tr>
                              <td colSpan={5} className="px-4 py-8 text-center text-slate-400 italic">No shifts found matching your filters.</td>
                          </tr>
                      )}
                  </tbody>
              </table>
          </div>
      </div>

      {/* Manual Entry / Edit Modal */}
      {isEntryModalOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
                  <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                      <h3 className="font-bold text-slate-900 dark:text-white">
                          {editingEntry ? t.employees.editEntry : t.employees.manualEntry}
                      </h3>
                      <button onClick={() => setIsEntryModalOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full">
                          <X className="w-5 h-5 text-slate-500" />
                      </button>
                  </div>
                  <div className="p-4 space-y-4">
                      <div>
                          <label className="block text-xs uppercase text-slate-500 dark:text-slate-400 font-bold mb-1">{t.employees.selectStaff}</label>
                          <select 
                            className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 dark:text-white"
                            value={entryForm.employeeId}
                            onChange={(e) => setEntryForm({...entryForm, employeeId: e.target.value})}
                          >
                              {employees.map(e => (
                                  <option key={e.id} value={e.id}>{e.name} ({e.role})</option>
                              ))}
                          </select>
                      </div>
                      <div>
                          <label className="block text-xs uppercase text-slate-500 dark:text-slate-400 font-bold mb-1">{t.employees.startTime}</label>
                          <input 
                            type="datetime-local"
                            className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 dark:text-white"
                            value={entryForm.start}
                            onChange={(e) => setEntryForm({...entryForm, start: e.target.value})}
                          />
                      </div>
                      <div>
                          <label className="block text-xs uppercase text-slate-500 dark:text-slate-400 font-bold mb-1">{t.employees.endTime}</label>
                          <input 
                            type="datetime-local"
                            className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 dark:text-white"
                            value={entryForm.end}
                            onChange={(e) => setEntryForm({...entryForm, end: e.target.value})}
                          />
                          <p className="text-[10px] text-slate-400 mt-1 italic">Leave blank if currently working</p>
                      </div>
                      <button 
                        onClick={handleSaveEntry}
                        disabled={!entryForm.employeeId || !entryForm.start}
                        className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition-colors disabled:opacity-50"
                      >
                          {t.employees.save}
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};
