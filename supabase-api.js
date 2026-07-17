// ════════════════════════════════════════════════════════════════
// ASLAN STUNDENERFASSUNG - SUPABASE API WRAPPER
// JavaScript Modul für Datenbankoperationen mit Synchronisation
// ════════════════════════════════════════════════════════════════

const { createClient } = supabase;

const SUPABASE_URL = "https://orluvjqjkngjdmajtwvp.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ybHV2anFqa25namRtYWp0d3ZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0NDkyNDYsImV4cCI6MjA5NzAyNTI0Nn0.DsNorH_TZlT4rMC0IBYmj8Xk0l6n1YhQk8vWx3nI9zk";

// Initialisiere Supabase Client
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY);

// ════════════════════════════════════════════════════════════════
// DATABASE API WRAPPER
// ════════════════════════════════════════════════════════════════

const DB = {
  
  // ═══ TIME ENTRIES ═══
  
  async addTimeEntry(date, bvNr, employeeId, startTime, endTime, pauseMinutes = 0) {
    const hoursWorked = calculateHours(startTime, endTime, pauseMinutes);
    
    const { data, error } = await supabaseClient
      .from('time_entries')
      .insert([{
        date,
        bv_nr: bvNr,
        employee_id: employeeId,
        start_time: startTime,
        end_time: endTime,
        pause_minutes: pauseMinutes,
        hours_worked: hoursWorked
      }]);
    
    if (error) {
      console.error('Error adding time entry:', error);
      throw error;
    }
    return data;
  },

  async updateTimeEntry(id, date, bvNr, employeeId, startTime, endTime, pauseMinutes = 0) {
    const hoursWorked = calculateHours(startTime, endTime, pauseMinutes);
    
    const { data, error } = await supabaseClient
      .from('time_entries')
      .update({
        date,
        bv_nr: bvNr,
        employee_id: employeeId,
        start_time: startTime,
        end_time: endTime,
        pause_minutes: pauseMinutes,
        hours_worked: hoursWorked
      })
      .eq('id', id);
    
    if (error) throw error;
    return data;
  },

  async deleteTimeEntry(id) {
    const { error } = await supabaseClient
      .from('time_entries')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },

  async getTimeEntriesByDate(date) {
    const { data, error } = await supabaseClient
      .from('time_entries')
      .select('*')
      .eq('date', date);
    
    if (error) throw error;
    return data || [];
  },

  async getTimeEntriesByBV(bvNr, startDate, endDate) {
    const { data, error } = await supabaseClient
      .from('time_entries')
      .select('*')
      .eq('bv_nr', bvNr)
      .gte('date', startDate)
      .lte('date', endDate);
    
    if (error) throw error;
    return data || [];
  },

  async getTimeEntriesByEmployee(employeeId, startDate, endDate) {
    const { data, error } = await supabaseClient
      .from('time_entries')
      .select('*')
      .eq('employee_id', employeeId)
      .gte('date', startDate)
      .lte('date', endDate);
    
    if (error) throw error;
    return data || [];
  },

  // ═══ ABSENCES ═══

  async addAbsence(date, employeeId, reason, isCompanyWide = false) {
    const { data, error } = await supabaseClient
      .from('absences')
      .insert([{
        date,
        employee_id: employeeId,
        reason,
        is_company_wide: isCompanyWide
      }]);
    
    if (error) {
      console.error('Error adding absence:', error);
      throw error;
    }
    return data;
  },

  async deleteAbsence(id) {
    const { error } = await supabaseClient
      .from('absences')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },

  async getAbsencesByDate(date) {
    const { data, error } = await supabaseClient
      .from('absences')
      .select('*')
      .eq('date', date);
    
    if (error) throw error;
    return data || [];
  },

  // ═══ LEAVE PERIODS ═══

  async addLeavePeriod(employeeId, startDate, endDate, leaveType, isCompanyWide = false, notes = '') {
    const { data, error } = await supabaseClient
      .from('leave_periods')
      .insert([{
        employee_id: employeeId,
        start_date: startDate,
        end_date: endDate,
        leave_type: leaveType,
        is_company_wide: isCompanyWide,
        notes
      }]);
    
    if (error) throw error;
    return data;
  },

  async deleteLeavePeriod(id) {
    const { error } = await supabaseClient
      .from('leave_periods')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },

  async getLeavePeriods(employeeId, startDate, endDate) {
    const { data, error } = await supabaseClient
      .from('leave_periods')
      .select('*')
      .eq('employee_id', employeeId)
      .gte('start_date', startDate)
      .lte('end_date', endDate);
    
    if (error) throw error;
    return data || [];
  },

  // ═══ INVOICES ═══

  async addInvoice(bvNr, invoiceDate, amount, status = 'open', dueDate = null, invoiceNumber = '', companyName = '', notes = '') {
    const { data, error } = await supabaseClient
      .from('invoices')
      .insert([{
        bv_nr: bvNr,
        invoice_date: invoiceDate,
        amount,
        status,
        due_date: dueDate,
        invoice_number: invoiceNumber,
        company_name: companyName,
        notes
      }]);
    
    if (error) throw error;
    return data;
  },

  async updateInvoice(id, updates) {
    const { data, error } = await supabaseClient
      .from('invoices')
      .update(updates)
      .eq('id', id);
    
    if (error) throw error;
    return data;
  },

  async deleteInvoice(id) {
    const { error } = await supabaseClient
      .from('invoices')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },

  async getInvoicesByBV(bvNr) {
    const { data, error } = await supabaseClient
      .from('invoices')
      .select('*')
      .eq('bv_nr', bvNr)
      .order('invoice_date', { ascending: false });
    
    if (error) throw error;
    return data || [];
  },

  async getInvoicesByStatus(status) {
    const { data, error } = await supabaseClient
      .from('invoices')
      .select('*')
      .eq('status', status)
      .order('due_date', { ascending: true });
    
    if (error) throw error;
    return data || [];
  },

  async getInvoicesSummary() {
    const { data, error } = await supabaseClient
      .from('v_invoice_summary')
      .select('*');
    
    if (error) throw error;
    return data || [];
  },

  // ═══ UNBILLED HOURS ═══

  async getUnbilledHours(bvNr) {
    const { data, error } = await supabaseClient
      .rpc('calculate_unbilled_hours', { p_bv_nr: bvNr });
    
    if (error) throw error;
    return data || [];
  },

  async getUnbilledHoursAll() {
    const { data, error } = await supabaseClient
      .from('v_unbilled_by_bv')
      .select('*');
    
    if (error) throw error;
    return data || [];
  },

  // ═══ INVOICE TRACKING ═══

  async markAsInvoiced(bvNr, invoiceId, invoiceDate) {
    const { error } = await supabaseClient
      .rpc('mark_as_invoiced', {
        p_bv_nr: bvNr,
        p_invoice_id: invoiceId,
        p_invoice_date: invoiceDate
      });
    
    if (error) throw error;
  },

  // ═══ ATTENDANCE & PRESENCE ═══

  async isEmployeePresent(employeeId, date) {
    const { data, error } = await supabaseClient
      .rpc('is_employee_present', {
        p_employee_id: employeeId,
        p_date: date
      });
    
    if (error) throw error;
    return data || false;
  },

  async getEmployeesWithEntries(date) {
    const { data, error } = await supabaseClient
      .rpc('get_employees_with_entries', { p_date: date });
    
    if (error) throw error;
    return data || [];
  },

  // ═══ MISSING ENTRIES ═══

  async getMissingEntries(days = 2) {
    const { data, error } = await supabaseClient
      .rpc('get_missing_entries_last_days', { p_days: days });
    
    if (error) throw error;
    return data || [];
  },

  // ═══ STATISTICS ═══

  async getEmployeeStatistics(employeeId, month) {
    const { data, error } = await supabaseClient
      .from('v_employee_statistics')
      .select('*')
      .eq('id', employeeId)
      .eq('month', month);
    
    if (error) throw error;
    return data?.[0] || null;
  },

  async getAverageEmployeesPerDay(weekStart) {
    const { data, error } = await supabaseClient
      .from('v_avg_employees_per_day')
      .select('*')
      .eq('week_start', weekStart);
    
    if (error) throw error;
    return data?.[0] || null;
  },

  // ═══ NOTIFICATION SETTINGS ═══

  async getNotificationSetting(settingKey) {
    const { data, error } = await supabaseClient
      .from('notification_settings')
      .select('*')
      .eq('setting_key', settingKey);
    
    if (error) throw error;
    return data?.[0] || null;
  },

  async updateNotificationSetting(settingKey, updates) {
    const { data, error } = await supabaseClient
      .from('notification_settings')
      .update(updates)
      .eq('setting_key', settingKey);
    
    if (error) throw error;
    return data;
  },

  async getAllNotificationSettings() {
    const { data, error } = await supabaseClient
      .from('notification_settings')
      .select('*');
    
    if (error) throw error;
    return data || [];
  },

  // ═══ DASHBOARD PINS ═══

  async getDashboardPins() {
    const { data, error } = await supabaseClient
      .from('dashboard_pins')
      .select('*')
      .order('position', { ascending: true });
    
    if (error) throw error;
    return data || [];
  },

  async updateDashboardPin(pinKey, enabled) {
    const { data, error } = await supabaseClient
      .from('dashboard_pins')
      .update({ enabled })
      .eq('pin_key', pinKey);
    
    if (error) throw error;
    return data;
  },

  // ═══ DAILY ATTENDANCE ═══

  async recordAttendance(date, employeeId, wasPresent, absenceReason = null) {
    const { data, error } = await supabaseClient
      .from('daily_attendance')
      .upsert([{
        date,
        employee_id: employeeId,
        was_present: wasPresent,
        absence_reason: absenceReason
      }], { onConflict: 'date,employee_id' });
    
    if (error) throw error;
    return data;
  },

  async getAttendanceByDate(date) {
    const { data, error } = await supabaseClient
      .from('daily_attendance')
      .select('*')
      .eq('date', date);
    
    if (error) throw error;
    return data || [];
  }
};

// ════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ════════════════════════════════════════════════════════════════

function calculateHours(startTime, endTime, pauseMinutes = 0) {
  // "07:00" -> 420 (minutes)
  const start = timeToMinutes(startTime);
  const end = timeToMinutes(endTime);
  const diff = end - start;
  const hours = Math.max(0, (diff - pauseMinutes) / 60);
  return parseFloat(hours.toFixed(2));
}

function timeToMinutes(time) {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + (minutes || 0);
}

// ════════════════════════════════════════════════════════════════
// SYNCHRONISATION & OFFLINE SUPPORT
// ════════════════════════════════════════════════════════════════

const SYNC = {
  
  // LocalStorage für Offline-Mode
  QUEUE_KEY: 'aslan_sync_queue',
  
  async queueOperation(type, table, data) {
    try {
      const queue = JSON.parse(localStorage.getItem(SYNC.QUEUE_KEY) || '[]');
      queue.push({
        id: Date.now() + Math.random(),
        type, // 'insert', 'update', 'delete'
        table,
        data,
        timestamp: new Date().toISOString()
      });
      localStorage.setItem(SYNC.QUEUE_KEY, JSON.stringify(queue));
      return true;
    } catch (e) {
      console.error('Error queueing operation:', e);
      return false;
    }
  },
  
  async getQueue() {
    try {
      return JSON.parse(localStorage.getItem(SYNC.QUEUE_KEY) || '[]');
    } catch {
      return [];
    }
  },
  
  async syncQueue() {
    const queue = await SYNC.getQueue();
    if (queue.length === 0) return { success: 0, failed: 0 };
    
    let success = 0;
    let failed = 0;
    const remainingQueue = [];
    
    for (const op of queue) {
      try {
        switch (op.type) {
          case 'insert':
            await supabaseClient.from(op.table).insert([op.data]);
            success++;
            break;
          case 'update':
            await supabaseClient.from(op.table).update(op.data.updates).eq('id', op.data.id);
            success++;
            break;
          case 'delete':
            await supabaseClient.from(op.table).delete().eq('id', op.data.id);
            success++;
            break;
        }
      } catch (error) {
        console.error(`Sync failed for ${op.type} on ${op.table}:`, error);
        failed++;
        remainingQueue.push(op);
      }
    }
    
    // Speichere nur die fehlgeschlagenen Operationen
    if (remainingQueue.length > 0) {
      localStorage.setItem(SYNC.QUEUE_KEY, JSON.stringify(remainingQueue));
    } else {
      localStorage.removeItem(SYNC.QUEUE_KEY);
    }
    
    return { success, failed };
  },

  // Real-time Subscriptions
  async subscribeToTimeEntries(date, callback) {
    const subscription = supabaseClient
      .from(`time_entries:date=eq.${date}`)
      .on('*', payload => {
        callback(payload);
      })
      .subscribe();
    
    return subscription;
  },

  async subscribeToInvoices(callback) {
    const subscription = supabaseClient
      .from('invoices')
      .on('*', payload => {
        callback(payload);
      })
      .subscribe();
    
    return subscription;
  }
};

// ════════════════════════════════════════════════════════════════
// BUSINESS LOGIC HELPERS
// ════════════════════════════════════════════════════════════════

const BUSINESS = {
  
  // Berechne unabgerechnete Stunden für Dashboard
  async calculateTotalUnbilledRevenue() {
    const unbilled = await DB.getUnbilledHoursAll();
    return unbilled.reduce((sum, item) => sum + (parseFloat(item.total_amount) || 0), 0);
  },

  // Hole Warnungen für fehlende Einträge
  async getMissingEntriesWarnings() {
    const missing = await DB.getMissingEntries(2);
    return missing.reduce((acc, entry) => {
      const key = entry.employee_id;
      if (!acc[key]) {
        acc[key] = {
          employeeId: entry.employee_id,
          employeeName: entry.employee_name,
          dates: []
        };
      }
      acc[key].dates.push(entry.missing_date);
      return acc;
    }, {});
  },

  // Prüfe überfällige Rechnungen
  async getOverdueInvoices() {
    const invoices = await DB.getInvoicesByStatus('open');
    const today = new Date().toISOString().split('T')[0];
    return invoices.filter(inv => inv.due_date && inv.due_date < today);
  },

  // Berechne Statistik für einen Mitarbeiter in einem Monat
  async getEmployeeMonthStats(employeeId) {
    const now = new Date();
    const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    const stats = await DB.getEmployeeStatistics(employeeId, monthStart);
    return stats;
  }
};

// ════════════════════════════════════════════════════════════════
// EXPORT FÜR VERWENDUNG IN DER APP
// ════════════════════════════════════════════════════════════════

// Für direkte Verwendung im HTML:
window.DB = DB;
window.SYNC = SYNC;
window.BUSINESS = BUSINESS;
