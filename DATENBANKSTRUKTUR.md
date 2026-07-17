# 🏗️ ASLAN Stundenerfassung - Datenbankstruktur & API Dokumentation

Vollständige Dokumentation der Supabase-Integration für die ASLAN Stundenerfassungs-App mit allen neuen Features.

## 📋 Übersicht

Diese Dokumentation beschreibt:
- ✅ **Supabase-Datenbankstruktur** (13 Tabellen)
- ✅ **SQL-Funktionen** für komplexe Berechnungen
- ✅ **JavaScript API Wrapper** für alle Operationen
- ✅ **Synchronisation & Offline-Mode**
- ✅ **Neue Features** (unbilled hours, Abwesenheiten, etc.)

---

## 🗄️ Datenbankstruktur

### 1. **Employees** (Mitarbeiter)
```sql
CREATE TABLE employees (
  id TEXT PRIMARY KEY,
  name TEXT,
  short_code TEXT,
  hourly_rate DECIMAL,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

### 2. **Site Managers** (Bauleiter)
```sql
CREATE TABLE site_managers (
  id TEXT PRIMARY KEY,
  name TEXT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

### 3. **Construction Sites** (Baustellen/BV)
```sql
CREATE TABLE construction_sites (
  bv_nr TEXT UNIQUE PRIMARY KEY,
  name TEXT,
  manager_id TEXT REFERENCES site_managers,
  hourly_rate DECIMAL,
  budget_hours DECIMAL,
  is_archived BOOLEAN,
  skip_missing_warning BOOLEAN
);
```

### 4. **Time Entries** (Stunden-Einträge)
```sql
CREATE TABLE time_entries (
  id UUID PRIMARY KEY,
  date DATE,
  bv_nr TEXT REFERENCES construction_sites,
  employee_id TEXT REFERENCES employees,
  start_time TIME,
  end_time TIME,
  pause_minutes INTEGER,
  hours_worked DECIMAL
);
```
**Besonderheit**: `UNIQUE(date, bv_nr, employee_id)` - Ein Mitarbeiter kann pro Tag und BV nur einen Eintrag haben.

### 5. **Absences** (Abwesenheiten)
```sql
CREATE TABLE absences (
  id UUID PRIMARY KEY,
  date DATE,
  employee_id TEXT REFERENCES employees,
  reason TEXT, -- 'urlaub', 'krankheit', 'feiertag'
  is_company_wide BOOLEAN -- TRUE für Feiertage
);
```

### 6. **Leave Periods** (Urlaubs-Zeiträume)
```sql
CREATE TABLE leave_periods (
  id UUID PRIMARY KEY,
  employee_id TEXT REFERENCES employees,
  start_date DATE,
  end_date DATE,
  leave_type TEXT, -- 'urlaub', 'krankheit'
  is_company_wide BOOLEAN -- TRUE für Betriebsfeiertage
);
```

### 7. **Invoices** (Rechnungen)
```sql
CREATE TABLE invoices (
  id UUID PRIMARY KEY,
  bv_nr TEXT REFERENCES construction_sites,
  invoice_date DATE,
  amount DECIMAL,
  status TEXT, -- 'open', 'overdue', 'paid'
  due_date DATE,
  invoice_number TEXT,
  company_name TEXT
);
```

### 8. **BV Invoice Tracking** (Letzter Rechnungsstand pro BV)
```sql
CREATE TABLE bv_invoice_tracking (
  bv_nr TEXT UNIQUE PRIMARY KEY,
  last_invoice_date DATE,
  last_invoice_id UUID REFERENCES invoices
);
```
**Wichtig**: Dies ist der **Schlüssel** für die Berechnung von "noch nicht abgerechneten Stunden"!

### 9. **Notification Settings** (Benachrichtigungen)
```sql
CREATE TABLE notification_settings (
  setting_key TEXT UNIQUE,
  enabled BOOLEAN,
  time_threshold_minutes INTEGER, -- z.B. 30
  check_days_back INTEGER, -- z.B. 2 (letzte 2 Tage)
  reminder_time TIME -- z.B. '18:00:00'
);
```

**Standard-Einstellungen**:
- `missing_hours_warning`: 30 Min Schwelle, letzte 2 Tage, 18:00 Uhr
- `collect_invoice_deadlines`: aktiviert
- `overdue_invoice_alert`: 09:00 Uhr
- `budget_warning`: aktiviert

### 10. **Dashboard Pins** (Dashboard-Anpassung)
```sql
CREATE TABLE dashboard_pins (
  pin_key TEXT UNIQUE,
  enabled BOOLEAN,
  position INTEGER
);
```

**Standard Pins** (standardmäßig aus):
- `hours_today`, `hours_week`, `entries_count`, `revenue_week` ✅ AN
- `invoices_open`, `invoices_overdue`, `invoices_total` ❌ AUS
- `next_deadline`, `unbilled_revenue` ❌ AUS

### 11. **Daily Attendance** (Tägliche Anwesenheit)
```sql
CREATE TABLE daily_attendance (
  date DATE,
  employee_id TEXT REFERENCES employees,
  was_present BOOLEAN,
  absence_reason TEXT
);
```

---

## 🔧 SQL-Funktionen

### `calculate_unbilled_hours(p_bv_nr TEXT)`
Berechnet **alle unabgerechneten Stunden** für eine Baustelle nach der letzten Rechnung.

**Beispiel**:
```javascript
const unbilled = await DB.getUnbilledHours('65547');
// Rückgabe:
// [
//   {
//     employee_id: 'sa',
//     employee_name: 'Sayim Aslan',
//     total_hours: 24.5,
//     total_amount: 1102.50,
//     first_entry_date: '2026-07-09'
//   }
// ]
```

### `mark_as_invoiced(p_bv_nr, p_invoice_id, p_invoice_date)`
Markiert alle Stunden einer BV als abgerechnet.

**Beispiel**:
```javascript
await DB.markAsInvoiced('65547', invoiceId, '2026-07-10');
// Ab jetzt: Alle Einträge VOR 2026-07-10 gelten als abgerechnet
```

### `is_employee_present(p_employee_id, p_date)`
Prüft ob Mitarbeiter an einem Tag da war (keine Abwesenheit).

```javascript
const isPresent = await DB.isEmployeePresent('ak', '2026-07-15');
// FALSE wenn Urlaub/Krankheit/Feiertag
```

### `get_missing_entries_last_days(p_days DEFAULT 2)`
Findet alle Mitarbeiter, die in den letzten X Tagen **NICHT** eingetragen wurden.

**Beispiel**:
```javascript
const missing = await DB.getMissingEntries(2);
// Rückgabe:
// [
//   { employee_id: 'ak', employee_name: 'Ali Kantar', missing_date: '2026-07-16' },
//   { employee_id: 'ak', employee_name: 'Ali Kantar', missing_date: '2026-07-15' }
// ]
```

### `get_employees_with_entries(p_date)`
Findet alle Mitarbeiter, die an einem **bestimmten Tag** eingetragen wurden.

```javascript
const withEntries = await DB.getEmployeesWithEntries('2026-07-17');
// Rückgabe:
// [
//   { employee_id: 'sa', name: 'Sayim Aslan', hours_worked: 8.0, bv_count: 2 }
// ]
```

---

## 📊 SQL-Views (Abfragen)

### `v_unbilled_by_bv`
Zeigt **alle unabgerechneten Stunden pro BV** an (kompiliert).

```sql
SELECT * FROM v_unbilled_by_bv;
-- bv_nr | bv_name | total_hours | total_amount | last_entry_date | last_invoice_date
-- 65547 | Weingarten... | 24.5 | 1102.50 | 2026-07-16 | 2026-07-10
```

### `v_employee_statistics`
**Monatliche Statistik pro Mitarbeiter**.

```sql
SELECT * FROM v_employee_statistics 
WHERE id = 'sa' AND month >= '2026-07-01';
-- work_days | total_hours | avg_hours_per_day | total_revenue | sites_worked
-- 12 | 96.0 | 8.0 | 4320.00 | 2
```

### `v_invoice_summary`
**Überblick über alle Rechnungen** nach Status.

```sql
SELECT * FROM v_invoice_summary;
-- status | count | total_amount | oldest | newest
-- open | 3 | 5000.00 | ... | ...
-- paid | 15 | 45000.00 | ... | ...
```

---

## 🚀 JavaScript API - Verwendungsbeispiele

### Stunde eintragen
```javascript
await DB.addTimeEntry(
  '2026-07-17',        // date
  '65547',             // bv_nr
  'ak',                // employee_id
  '07:00',             // startTime
  '16:00',             // endTime
  30                   // pauseMinutes
);
// Berechnet automatisch: hours_worked = 8.5
```

### Abwesenheit erfassen
```javascript
// Einzeln
await DB.addAbsence('2026-07-17', 'ak', 'urlaub');

// Betriebsfeiertag (alle Mitarbeiter)
await DB.addAbsence('2026-08-15', null, 'feiertag', true);
```

### Urlaub-Zeitraum erfassen
```javascript
await DB.addLeavePeriod(
  'ak',              // employee_id
  '2026-08-01',      // start_date
  '2026-08-15',      // end_date
  'urlaub'
);
```

### Rechnung hinzufügen & Stunden markieren
```javascript
// 1. Rechnung erstellen
const invoice = await DB.addInvoice(
  '65547',                    // bv_nr
  '2026-07-17',              // invoice_date
  1102.50,                   // amount
  'open',                    // status
  '2026-07-31'               // due_date
);

// 2. Stunden als abgerechnet markieren
await DB.markAsInvoiced('65547', invoice[0].id, '2026-07-17');

// Ab jetzt: Alle Einträge NACH 2026-07-17 gelten als unabgerechnet!
```

### Warnungen abrufen
```javascript
// Fehlende Einträge
const missing = await DB.getMissingEntries(2);
// → Mitarbeiter ohne Eintrag in letzten 2 Tagen

// Überfällige Rechnungen
const overdue = await BUSINESS.getOverdueInvoices();
// → Rechnungen mit due_date < heute

// Total unabgerechnete Stunden
const totalUnbilled = await BUSINESS.calculateTotalUnbilledRevenue();
// → Summe aller unabgerechneten € pro alle BVs
```

---

## 💾 Synchronisation & Offline-Mode

### Queue-basiertes System
```javascript
// 1. Operation wird lokal gespeichert
await SYNC.queueOperation('insert', 'time_entries', {
  date: '2026-07-17',
  bv_nr: '65547',
  employee_id: 'ak',
  ...
});

// 2. Später: Synchronisieren wenn Online
const result = await SYNC.syncQueue();
console.log(result); 
// { success: 2, failed: 0 }
```

### Real-time Subscriptions
```javascript
// Echtzeitwarnungen für Stunden-Einträge
SYNC.subscribeToTimeEntries('2026-07-17', (payload) => {
  console.log('Neue Einträge:', payload);
  updateUI();
});

// Echtzeitwarnungen für Rechnungen
SYNC.subscribeToInvoices((payload) => {
  if (payload.new.status === 'paid') {
    showNotification('Rechnung bezahlt!');
  }
});
```

---

## ⚙️ Integration in index.html

Füge diese Zeilen in den `<head>` ein:

```html
<!-- Supabase Client -->
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.38.0/dist/module.js"></script>

<!-- Dein API Wrapper -->
<script src="supabase-api.js"></script>
```

Jetzt stehen folgende Objekte zur Verfügung:
- `window.DB` - Datenbankoperationen
- `window.SYNC` - Synchronisation
- `window.BUSINESS` - Business-Logik

**Beispiel**:
```javascript
// Heute alle Stunden eintragen
async function loadTodaysEntries() {
  const today = new Date().toISOString().split('T')[0];
  const entries = await DB.getTimeEntriesByDate(today);
  console.log(entries);
}
```

---

## 🔌 Neue Features für die App

### 1. ✅ Noch nicht abgerechnete Stunden
- Automatisch berechnet via `v_unbilled_by_bv` View
- Zeigt exakt an, ab wann (nach letzter Rechnung) Stunden unabgerechnet sind
- Button zum Markieren als "abgerechnet"

### 2. ✅ Sammelrechnungs-Übersicht
- Kompakte Block-Ansicht in `pg-rg` (Rechnungen-Seite)
- Click → Detail-Ansicht mit Dropdown
- Standardmäßig GESCHLOSSEN (aus) als `is_expanded = FALSE`

### 3. ✅ Statistiken-Rubrik
- **Pro Mitarbeiter/Woche/Monat**: via `v_employee_statistics`
- **Durchschnittliche Mitarbeiter pro Tag**: via `v_avg_employees_per_day`
- **Abwesenheitserfassung**: via `daily_attendance` Tabelle

### 4. ✅ Abwesenheits-Management im Editor
- Neue Tab: **Urlaub/Feiertage** in `pg-editor`
- Zeitraum eingeben → automatisch in `leave_periods` speichern
- Mitarbeiter oder ganze Firma (is_company_wide)

### 5. ✅ Warnungen verbessert
- Letzte 2 Tage: via `get_missing_entries_last_days(2)`
- Nach 30 Min fehlt: via `check_days_back=2, time_threshold_minutes=30`
- Nur wenn TODAY noch leer → sonst keine Warnung für heute

### 6. ✅ Stunden-Eintrag Flow
- **Zuerst**: "Wer war heute da?" → `daily_attendance` eintragen
- Dann: Baustelle → Stunden
- Verhindert vergessene Mitarbeiter

---

## 📝 Häufige Queries

### Unabgerechnete Stunden für BV 65547 in € anzeigen
```javascript
const unbilled = await DB.getUnbilledHours('65547');
const total = unbilled.reduce((s, e) => s + (e.total_amount || 0), 0);
console.log(`Noch abzurechnen: ${total.toFixed(2)} €`);
```

### Alle überfälligen Rechnungen
```javascript
const overdue = await DB.getInvoicesByStatus('open');
const today = new Date().toISOString().split('T')[0];
const overdueList = overdue.filter(inv => inv.due_date < today);
```

### Statistik: durchschnittlicher Verdienst pro Tag
```javascript
const stats = await DB.getEmployeeStatistics('sa', '2026-07-01');
const dailyAvg = stats.total_revenue / stats.work_days;
console.log(`Durchschnitt pro Tag: ${dailyAvg.toFixed(2)} €`);
```

### Wer hat in den letzten 2 Tagen nichts eingetragen?
```javascript
const missing = await DB.getMissingEntries(2);
missing.forEach(emp => {
  console.log(`⚠️ ${emp.employee_name} - ${emp.missing_date}`);
});
```

---

## 🆘 Troubleshooting

### "Fehler: Nicht genug Stunden"
→ Prüfe: Ist die Pause zu lang? `hours_worked = (end - start - pause) / 60`

### "Unabgerechnete Stunden falsch berechnet"
→ Prüfe: `bv_invoice_tracking` - last_invoice_date richtig gespeichert?

### "Offline-Mode funktioniert nicht"
→ Prüfe: Browser-LocalStorage aktiviert? `localStorage.getItem('aslan_sync_queue')`

### "Warnungen zeigen nicht"
→ Prüfe: `notification_settings` - enabled=TRUE? `check_days_back` stimmt?

---

## 📌 Checkliste für Setup

- [ ] Supabase Projekt erstellt
- [ ] `supabase_schema.sql` in SQL-Editor importiert
- [ ] Tabellen & Funktionen erstellen
- [ ] `supabase-api.js` in `index.html` eingebunden
- [ ] Supabase URL + Key in `supabase-api.js` aktualisiert (bereits im Code)
- [ ] Test: `await DB.getTimeEntriesByDate('2026-07-17')` → Sollte funktionieren
- [ ] Beispiel-Daten eingefügt (Mitarbeiter, Bauleiter, BVs)
- [ ] Dashboard Pins konfiguriert
- [ ] Benachrichtigungseinstellungen angepasst

---

## 🎯 Nächste Schritte

1. **UI-Integration**: Die neuen Features in `index.html` einbauen
2. **Warnungs-System**: Hintergrund-Check für fehlende Einträge
3. **Statistik-Dashboard**: Neue Rubrik mit Grafiken
4. **Offline-Tests**: Ohne Internetverbindung speichern & synchronisieren

Viel Erfolg beim Implementieren! 🚀
