-- ════════════════════════════════════════════════════════════════
-- ASLAN STUNDENERFASSUNG - SUPABASE SCHEMA
-- Komplette Datenbankstruktur mit RLS & Migrations
-- ════════════════════════════════════════════════════════════════

-- ═══ 1. MITARBEITER & BAULEITER ═══
CREATE TABLE IF NOT EXISTS employees (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  short_code TEXT UNIQUE,
  color_bg TEXT,
  color_text TEXT,
  hourly_rate DECIMAL(10,2),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS site_managers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ═══ 2. BAUSTELLEN (BV) ═══
CREATE TABLE IF NOT EXISTS construction_sites (
  id TEXT PRIMARY KEY,
  bv_nr TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  manager_id TEXT REFERENCES site_managers(id),
  hourly_rate DECIMAL(10,2),
  budget_hours DECIMAL(10,2),
  is_archived BOOLEAN DEFAULT FALSE,
  skip_missing_warning BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ═══ 3. STUNDEN-EINTRÄGE ═══
CREATE TABLE IF NOT EXISTS time_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date DATE NOT NULL,
  bv_nr TEXT NOT NULL REFERENCES construction_sites(bv_nr),
  employee_id TEXT NOT NULL REFERENCES employees(id),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  pause_minutes INTEGER DEFAULT 0,
  hours_worked DECIMAL(10,2),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(date, bv_nr, employee_id)
);

-- Index für schnellere Abfragen
CREATE INDEX idx_time_entries_date ON time_entries(date);
CREATE INDEX idx_time_entries_bv ON time_entries(bv_nr);
CREATE INDEX idx_time_entries_employee ON time_entries(employee_id);

-- ═══ 4. ABWESENHEITEN (ABSENCES) ═══
CREATE TABLE IF NOT EXISTS absences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date DATE NOT NULL,
  employee_id TEXT REFERENCES employees(id),
  reason TEXT NOT NULL,
  -- 'urlaub', 'krankheit', 'feiertag', 'wochenende'
  is_company_wide BOOLEAN DEFAULT FALSE,
  -- Wenn TRUE, betrifft alle Mitarbeiter (Feiertag)
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(date, employee_id, reason)
);

CREATE INDEX idx_absences_date ON absences(date);
CREATE INDEX idx_absences_employee ON absences(employee_id);
CREATE INDEX idx_absences_company_wide ON absences(is_company_wide);

-- ═══ 5. URLAUBS-ZEITRÄUME ═══
CREATE TABLE IF NOT EXISTS leave_periods (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id TEXT REFERENCES employees(id),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  leave_type TEXT NOT NULL,
  -- 'urlaub', 'krankheit', 'unbezahlt'
  is_company_wide BOOLEAN DEFAULT FALSE,
  -- Feiertage für alle
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_leave_periods_employee ON leave_periods(employee_id);
CREATE INDEX idx_leave_periods_dates ON leave_periods(start_date, end_date);

-- ═══ 6. RECHNUNGEN (INVOICES) ═══
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bv_nr TEXT NOT NULL REFERENCES construction_sites(bv_nr),
  invoice_date DATE NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  status TEXT DEFAULT 'open',
  -- 'open' (offen), 'overdue' (überfällig), 'paid' (bezahlt)
  due_date DATE,
  invoice_number TEXT,
  company_name TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_invoices_bv ON invoices(bv_nr);
CREATE INDEX idx_invoices_date ON invoices(invoice_date);
CREATE INDEX idx_invoices_status ON invoices(status);

-- ═══ 7. TRACKING DER LETZTEN RECHNUNG PRO BV ═══
CREATE TABLE IF NOT EXISTS bv_invoice_tracking (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bv_nr TEXT UNIQUE NOT NULL REFERENCES construction_sites(bv_nr),
  last_invoice_date DATE,
  last_invoice_id UUID REFERENCES invoices(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ═══ 8. UNBILLED HOURS (NOCH NICHT ABGERECHNETE STUNDEN) ═══
CREATE TABLE IF NOT EXISTS unbilled_hours_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bv_nr TEXT NOT NULL REFERENCES construction_sites(bv_nr),
  employee_id TEXT NOT NULL REFERENCES employees(id),
  date DATE NOT NULL,
  hours DECIMAL(10,2) NOT NULL,
  amount DECIMAL(12,2),
  -- Berechneter Betrag
  invoice_date_reference DATE,
  -- Referenz zur letzten Rechnung für diese BV
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_unbilled_bv ON unbilled_hours_log(bv_nr);
CREATE INDEX idx_unbilled_employee ON unbilled_hours_log(employee_id);
CREATE INDEX idx_unbilled_date ON unbilled_hours_log(date);

-- ═══ 9. BENACHRICHTIGUNGSEINSTELLUNGEN ═══
CREATE TABLE IF NOT EXISTS notification_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  setting_key TEXT UNIQUE NOT NULL,
  enabled BOOLEAN DEFAULT TRUE,
  time_threshold_minutes INTEGER,
  -- z.B. 30 Minuten für "noch 30 Min fehlen"
  check_days_back INTEGER,
  -- z.B. 2 Tage (letzte 2 Tage)
  reminder_time TIME DEFAULT '18:00:00',
  -- Erinnerungszeit
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Standard-Einstellungen einfügen
INSERT INTO notification_settings (setting_key, enabled, time_threshold_minutes, check_days_back, reminder_time)
VALUES 
  ('missing_hours_warning', TRUE, 30, 2, '18:00:00'),
  ('collect_invoice_deadlines', TRUE, NULL, NULL, NULL),
  ('overdue_invoice_alert', TRUE, NULL, NULL, '09:00:00'),
  ('budget_warning', TRUE, NULL, NULL, NULL)
ON CONFLICT (setting_key) DO NOTHING;

-- ═══ 10. DASHBOARD-STATISTIK PINS ═══
CREATE TABLE IF NOT EXISTS dashboard_pins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pin_key TEXT UNIQUE NOT NULL,
  enabled BOOLEAN DEFAULT TRUE,
  position INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Standard Pins einfügen
INSERT INTO dashboard_pins (pin_key, enabled, position)
VALUES 
  ('hours_today', TRUE, 1),
  ('hours_week', TRUE, 2),
  ('entries_count', TRUE, 3),
  ('revenue_week', TRUE, 4),
  ('invoices_open', FALSE, 5),
  ('invoices_overdue', FALSE, 6),
  ('invoices_total', FALSE, 7),
  ('next_deadline', FALSE, 8),
  ('unbilled_revenue', FALSE, 9)
ON CONFLICT (pin_key) DO NOTHING;

-- ═══ 11. SAMMELBETRAG (COLLECTION INVOICES) ═══
CREATE TABLE IF NOT EXISTS collection_invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  collection_date DATE NOT NULL,
  total_amount DECIMAL(12,2),
  due_date DATE,
  status TEXT DEFAULT 'open',
  invoices_included TEXT,
  -- JSON Array von invoice IDs
  is_expanded BOOLEAN DEFAULT FALSE,
  -- Ob Detail-Ansicht offen ist
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_collection_invoices_date ON collection_invoices(collection_date);

-- ═══ 12. TÄGLICHE ANWESENHEIT (ATTENDANCE LOG) ═══
CREATE TABLE IF NOT EXISTS daily_attendance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date DATE NOT NULL,
  employee_id TEXT NOT NULL REFERENCES employees(id),
  was_present BOOLEAN DEFAULT TRUE,
  -- FALSE wenn nicht da / Urlaub / Krankheit
  absence_reason TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(date, employee_id)
);

CREATE INDEX idx_daily_attendance_date ON daily_attendance(date);
CREATE INDEX idx_daily_attendance_employee ON daily_attendance(employee_id);

-- ═══ 13. STATISTIK CACHE (FÜR PERFORMANCE) ═══
CREATE TABLE IF NOT EXISTS statistics_cache (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cache_key TEXT UNIQUE NOT NULL,
  period_start DATE,
  period_end DATE,
  data JSONB,
  -- JSON mit Statistik-Daten
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP
);

-- ════════════════════════════════════════════════════════════════
-- MATERIALIZED VIEWS FÜR HÄUFIG BENUTZTE ABFRAGEN
-- ════════════════════════════════════════════════════════════════

-- View: Ungerechente Stunden pro BV
CREATE OR REPLACE VIEW v_unbilled_by_bv AS
SELECT 
  t.bv_nr,
  c.name as bv_name,
  SUM(t.hours_worked) as total_hours,
  SUM(t.hours_worked * COALESCE(e.hourly_rate, c.hourly_rate, 0)) as total_amount,
  MAX(t.date) as last_entry_date,
  COALESCE(bit.last_invoice_date, '1900-01-01'::DATE) as last_invoice_date
FROM time_entries t
LEFT JOIN construction_sites c ON t.bv_nr = c.bv_nr
LEFT JOIN employees e ON t.employee_id = e.id
LEFT JOIN bv_invoice_tracking bit ON t.bv_nr = bit.bv_nr
WHERE t.date > COALESCE(bit.last_invoice_date, '1900-01-01'::DATE)
GROUP BY t.bv_nr, c.name, c.hourly_rate, bit.last_invoice_date;

-- View: Statistik pro Mitarbeiter & Monat
CREATE OR REPLACE VIEW v_employee_statistics AS
SELECT 
  e.id,
  e.name,
  DATE_TRUNC('month', t.date)::DATE as month,
  COUNT(DISTINCT t.date) as work_days,
  SUM(t.hours_worked) as total_hours,
  AVG(t.hours_worked) as avg_hours_per_day,
  SUM(t.hours_worked * COALESCE(e.hourly_rate, 0)) as total_revenue,
  COUNT(DISTINCT t.bv_nr) as sites_worked
FROM time_entries t
LEFT JOIN employees e ON t.employee_id = e.id
GROUP BY e.id, e.name, DATE_TRUNC('month', t.date);

-- View: Durchschnittliche Mitarbeiter pro Tag
CREATE OR REPLACE VIEW v_avg_employees_per_day AS
SELECT 
  DATE_TRUNC('week', date)::DATE as week_start,
  ROUND(AVG(employee_count)::NUMERIC, 2) as avg_employees_per_day
FROM (
  SELECT 
    date,
    COUNT(DISTINCT employee_id) as employee_count
  FROM time_entries
  GROUP BY date
) sub
GROUP BY DATE_TRUNC('week', date);

-- View: Rechnungsstatus Übersicht
CREATE OR REPLACE VIEW v_invoice_summary AS
SELECT 
  status,
  COUNT(*) as count,
  SUM(amount) as total_amount,
  MIN(created_at) as oldest,
  MAX(created_at) as newest
FROM invoices
GROUP BY status;

-- ════════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY (RLS) - OPTIONAL FÜR MULTI-USER
-- ════════════════════════════════════════════════════════════════

-- Wenn du Multi-User Support brauchst, uncomment diese Policies:

/*
ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE absences ENABLE ROW LEVEL SECURITY;

-- Alle können Daten lesen
CREATE POLICY "Allow read" ON time_entries FOR SELECT USING (true);
CREATE POLICY "Allow read" ON employees FOR SELECT USING (true);
CREATE POLICY "Allow read" ON invoices FOR SELECT USING (true);
CREATE POLICY "Allow read" ON absences FOR SELECT USING (true);

-- Nur authentifizierte User können erstellen/updaten
CREATE POLICY "Allow create/update" ON time_entries 
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Allow create/update" ON time_entries 
  FOR UPDATE WITH CHECK (auth.role() = 'authenticated');
*/

-- ════════════════════════════════════════════════════════════════
-- HILFSFUNKTIONEN (STORED PROCEDURES)
-- ════════════════════════════════════════════════════════════════

-- Funktion: Berechne unabgerechnete Stunden für eine BV
CREATE OR REPLACE FUNCTION calculate_unbilled_hours(p_bv_nr TEXT)
RETURNS TABLE (
  employee_id TEXT,
  employee_name TEXT,
  total_hours DECIMAL,
  total_amount DECIMAL,
  first_entry_date DATE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.employee_id,
    e.name,
    SUM(t.hours_worked)::DECIMAL as total_hours,
    (SUM(t.hours_worked * COALESCE(e.hourly_rate, c.hourly_rate, 0)))::DECIMAL as total_amount,
    MIN(t.date)::DATE as first_entry_date
  FROM time_entries t
  LEFT JOIN employees e ON t.employee_id = e.id
  LEFT JOIN construction_sites c ON t.bv_nr = c.bv_nr
  LEFT JOIN bv_invoice_tracking bit ON t.bv_nr = bit.bv_nr
  WHERE t.bv_nr = p_bv_nr
    AND t.date > COALESCE(bit.last_invoice_date, '1900-01-01'::DATE)
  GROUP BY t.employee_id, e.name, c.hourly_rate;
END;
$$ LANGUAGE plpgsql;

-- Funktion: Markiere Stunden als abgerechnet
CREATE OR REPLACE FUNCTION mark_as_invoiced(
  p_bv_nr TEXT,
  p_invoice_id UUID,
  p_invoice_date DATE
)
RETURNS void AS $$
BEGIN
  -- Update oder Insert in bv_invoice_tracking
  INSERT INTO bv_invoice_tracking (bv_nr, last_invoice_date, last_invoice_id)
  VALUES (p_bv_nr, p_invoice_date, p_invoice_id)
  ON CONFLICT (bv_nr) 
  DO UPDATE SET 
    last_invoice_date = p_invoice_date,
    last_invoice_id = p_invoice_id,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Funktion: Prüfe ob Mitarbeiter an einem Tag da war
CREATE OR REPLACE FUNCTION is_employee_present(
  p_employee_id TEXT,
  p_date DATE
)
RETURNS BOOLEAN AS $$
DECLARE
  v_is_present BOOLEAN;
BEGIN
  -- Prüfe time_entries
  SELECT EXISTS(
    SELECT 1 FROM time_entries 
    WHERE employee_id = p_employee_id AND date = p_date
  ) INTO v_is_present;
  
  IF v_is_present THEN
    RETURN TRUE;
  END IF;
  
  -- Prüfe absences (wenn Abwesenheit, dann FALSE)
  SELECT EXISTS(
    SELECT 1 FROM absences 
    WHERE (employee_id = p_employee_id OR is_company_wide = TRUE)
    AND date = p_date
  ) INTO v_is_present;
  
  RETURN NOT v_is_present;
END;
$$ LANGUAGE plpgsql;

-- Funktion: Hole Mitarbeiter die an einem Tag eingetragen wurden
CREATE OR REPLACE FUNCTION get_employees_with_entries(p_date DATE)
RETURNS TABLE (
  employee_id TEXT,
  name TEXT,
  hours_worked DECIMAL,
  bv_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.employee_id,
    e.name,
    SUM(t.hours_worked)::DECIMAL,
    COUNT(DISTINCT t.bv_nr)::INTEGER
  FROM time_entries t
  LEFT JOIN employees e ON t.employee_id = e.id
  WHERE t.date = p_date
  GROUP BY t.employee_id, e.name;
END;
$$ LANGUAGE plpgsql;

-- Funktion: Berechne durchschnittlichen Stundensatz pro BV
CREATE OR REPLACE FUNCTION get_bv_average_rate(p_bv_nr TEXT)
RETURNS DECIMAL AS $$
DECLARE
  v_avg_rate DECIMAL;
BEGIN
  SELECT COALESCE(hourly_rate, 0)
  INTO v_avg_rate
  FROM construction_sites
  WHERE bv_nr = p_bv_nr;
  
  IF v_avg_rate = 0 THEN
    SELECT COALESCE(AVG(hourly_rate), 50)
    INTO v_avg_rate
    FROM employees
    WHERE hourly_rate IS NOT NULL;
  END IF;
  
  RETURN v_avg_rate;
END;
$$ LANGUAGE plpgsql;

-- ════════════════════════════════════════════════════════════════
-- TRIGGER: AUTO-UPDATE UPDATED_AT
-- ════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_employees_updated_at 
  BEFORE UPDATE ON employees FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_construction_sites_updated_at 
  BEFORE UPDATE ON construction_sites FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_time_entries_updated_at 
  BEFORE UPDATE ON time_entries FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_invoices_updated_at 
  BEFORE UPDATE ON invoices FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_absences_updated_at 
  BEFORE UPDATE ON absences FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_leave_periods_updated_at 
  BEFORE UPDATE ON leave_periods FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_bv_invoice_tracking_updated_at 
  BEFORE UPDATE ON bv_invoice_tracking FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ════════════════════════════════════════════════════════════════
-- BEISPIEL DATEN (für Testing)
-- ════════════════════════════════════════════════════════════════

-- Mitarbeiter
INSERT INTO employees (id, name, short_code, hourly_rate) VALUES
  ('sa', 'Sayim Aslan', 'SA', 45.00),
  ('ak', 'Ali Kantar', 'AK', 40.00)
ON CONFLICT (id) DO NOTHING;

-- Bauleiter
INSERT INTO site_managers (id, name) VALUES
  ('bl1', 'Frau Peters'),
  ('bl2', 'Herr Schmidt')
ON CONFLICT (id) DO NOTHING;

-- Baustellen
INSERT INTO construction_sites (bv_nr, name, manager_id, hourly_rate, budget_hours) VALUES
  ('65410', 'Bietigheim, Rheinstr. K3737', 'bl1', 50.00, 200.00),
  ('65547', 'Weingarten, GWG Sandfeld', 'bl1', 48.00, 180.00),
  ('65605', 'KIT Campus Nord', 'bl2', 55.00, 250.00)
ON CONFLICT (bv_nr) DO NOTHING;

-- ════════════════════════════════════════════════════════════════
-- QUERIES FÜR HÄUFIGE OPERATIONEN
-- ════════════════════════════════════════════════════════════════

-- 1. Alle unabgerechneten Stunden für eine BV anzeigen
-- SELECT * FROM calculate_unbilled_hours('65547');

-- 2. Summe aller unabgerechneten Stunden (in €)
-- SELECT 
--   SUM(total_amount) as total_unbilled
-- FROM v_unbilled_by_bv;

-- 3. Letzte 2 Tage - Wer hat nicht eingetragen?
-- SELECT 
--   e.id, e.name
-- FROM employees e
-- LEFT JOIN time_entries t ON e.id = t.employee_id AND t.date >= CURRENT_DATE - 2
-- WHERE t.id IS NULL;

-- 4. Statistik: Durchschnittlicher Verdienst pro Woche
-- SELECT 
--   DATE_TRUNC('week', date)::DATE as week,
--   SUM(t.hours_worked * e.hourly_rate) / 
--     NULLIF(COUNT(DISTINCT DATE(t.date)), 0) as avg_daily_revenue
-- FROM time_entries t
-- LEFT JOIN employees e ON t.employee_id = e.id
-- GROUP BY DATE_TRUNC('week', date)
-- ORDER BY week DESC;

-- 5. Überfällige Rechnungen
-- SELECT * FROM invoices 
-- WHERE status = 'open' AND due_date < CURRENT_DATE
-- ORDER BY due_date;

-- ════════════════════════════════════════════════════════════════
-- ENDE SCHEMA
-- ════════════════════════════════════════════════════════════════
