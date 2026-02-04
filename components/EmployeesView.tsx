
import React, { useState, useEffect } from 'react';
import { Employee, TimeEntry, EmployeeRole } from '../types';
import { translations, Language } from '../translations';
import { supabase, isSupabaseConfigured } from '../services/supabaseClient';
import { User, Users, Plus, Clock, Briefcase, History, Check, X, Shield, Wrench, Sparkles } from 'lucide-react';

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
  const [isAdding, setIsAdding] = useState(false);

  // New Employee Form
  const [newEmp, setNewEmp] = useState<Partial<Employee>>({
    name: '',
    role: 'Reception',
    hourlyRate: 25000
  });

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
          // Simplistic sync for now
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
          // Find the one that changed or just upsert all (not efficient for production but fine for small scale)
          // Better: just insert new ones, update modified ones.
          // For simplicity in this demo:
          for (const entry of updated.slice(0, 5)) { // Sync recent ones to be safe
             await supabase.from('time_entries').upsert({ id: entry.id, data: entry });
          }
      } else {
          localStorage.setItem(STORAGE_KEY_TIME_ENTRIES, JSON.stringify(updated));
      }
  };

  const handleAddEmployee = async () => {
    if (!newEmp.name) return;
    const emp: Employee = {
        id: Date.now().toString(),
        name: newEmp.name,
        role: newEmp.role as EmployeeRole,
        hourlyRate: newEmp.hourlyRate || 0,
        isWorking: false,
        phone: ''
    };
    const updated = [...employees, emp];
    await saveEmployees(updated);
    setIsAdding(false);
    setNewEmp({ name: '', role: 'Reception', hourlyRate: 25000 });
  };

  const handleClockIn = async (empId: string) => {
    // Update Employee Status
    const updatedEmps = employees.map(e => e.id === empId ? { ...e, isWorking: true } : e);
    
    // Create Time Entry
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
     
     // Find the active entry
     const activeEntryIndex = timeEntries.findIndex(t => t.employeeId === empId && !t.clockOut);
     if (activeEntryIndex === -1) return; // Should not happen

     const entry = timeEntries[activeEntryIndex];
     const start = new Date(entry.clockIn);
     const diffMs = now.getTime() - start.getTime();
     const diffHrs = diffMs / (1000 * 60 * 60);

     const emp = employees.find(e => e.id === empId);
     const pay = emp?.hourlyRate ? Math.round(diffHrs * emp.hourlyRate) : 0;

     const updatedEntry = {
         ...entry,
         clockOut: now.toISOString(),
         totalPay: pay
     };

     const updatedEntries = [...timeEntries];
     updatedEntries[activeEntryIndex] = updatedEntry;

     const updatedEmps = employees.map(e => e.id === empId ? { ...e, isWorking: false } : e);

     await saveEmployees(updatedEmps);
     await saveTimeEntries(updatedEntries);
  };

  const formatDuration = (start: string, end?: string) => {
      const s = new Date(start);
      const e = end ? new Date(end) : new Date();
      const diffMs = e.getTime() - s.getTime();
      const hrs = Math.floor(diffMs / (1000 * 60 * 60));
      const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      return `${hrs}h ${mins}m`;
  };

  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat(lang === 'vi' ? 'vi-VN' : 'en-US', { style: 'currency', currency: 'VND' }).format(amount);
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
    <div className="h-full flex gap-6">
      {/* Left Column: Employee List */}
      <div className="w-1/3 flex flex-col gap-4">
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col h-full overflow-hidden">
             <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800">
                 <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                     <Users className="w-5 h-5 text-indigo-600" /> {t.employees.title}
                 </h3>
                 <button 
                    onClick={() => setIsAdding(true)}
                    className="p-1.5 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 rounded-lg hover:bg-indigo-200 transition-colors"
                 >
                     <Plus className="w-4 h-4" />
                 </button>
             </div>
             
             {isAdding && (
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
                                className="w-1/2 p-2 text-sm border rounded dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                                value={newEmp.role}
                                onChange={e => setNewEmp({...newEmp, role: e.target.value as EmployeeRole})}
                             >
                                 <option value="Reception">Reception</option>
                                 <option value="Housekeeping">Housekeeping</option>
                                 <option value="Maintenance">Maintenance</option>
                                 <option value="Security">Security</option>
                                 <option value="Manager">Manager</option>
                             </select>
                             <input 
                                type="number"
                                className="w-1/2 p-2 text-sm border rounded dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                                placeholder={t.employees.rate}
                                value={newEmp.hourlyRate}
                                onChange={e => setNewEmp({...newEmp, hourlyRate: parseInt(e.target.value)})}
                             />
                         </div>
                         <div className="flex gap-2 justify-end">
                             <button onClick={() => setIsAdding(false)} className="text-xs font-bold text-slate-500">{t.employees.cancel}</button>
                             <button onClick={handleAddEmployee} className="text-xs font-bold bg-indigo-600 text-white px-3 py-1.5 rounded">{t.employees.save}</button>
                         </div>
                     </div>
                 </div>
             )}

             <div className="flex-1 overflow-y-auto p-2 space-y-2">
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

      {/* Right Column: Timesheet History */}
      <div className="w-2/3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col overflow-hidden">
          <div className="p-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
             <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                 <History className="w-5 h-5 text-slate-500" /> {t.employees.history}
             </h3>
          </div>
          
          <div className="flex-1 overflow-y-auto">
              <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 dark:bg-slate-900 text-xs uppercase text-slate-500 font-bold sticky top-0 z-10">
                      <tr>
                          <th className="px-4 py-3">{t.employees.name}</th>
                          <th className="px-4 py-3">{t.employees.clockIn}</th>
                          <th className="px-4 py-3">{t.employees.clockOut}</th>
                          <th className="px-4 py-3">{t.employees.duration}</th>
                          <th className="px-4 py-3 text-right">{t.employees.totalPay}</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                      {timeEntries.map(entry => {
                          const emp = employees.find(e => e.id === entry.employeeId) || { name: 'Unknown', role: 'Staff' };
                          const isActive = !entry.clockOut;
                          
                          return (
                              <tr key={entry.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                  <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200">
                                      {emp.name}
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
                                  <td className="px-4 py-3 text-right font-mono font-bold text-slate-800 dark:text-slate-200">
                                      {isActive ? '-' : formatMoney(entry.totalPay || 0)}
                                  </td>
                              </tr>
                          );
                      })}
                      {timeEntries.length === 0 && (
                          <tr>
                              <td colSpan={5} className="px-4 py-8 text-center text-slate-400 italic">No shifts recorded yet.</td>
                          </tr>
                      )}
                  </tbody>
              </table>
          </div>
      </div>
    </div>
  );
};
