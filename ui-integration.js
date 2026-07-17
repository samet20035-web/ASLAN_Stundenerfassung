// ════════════════════════════════════════════════════════════════
// ASLAN UI INTEGRATION - Neue Features
// Integration für Supabase-Features in index.html
// ════════════════════════════════════════════════════════════════

// ═══ 1. MISSING ENTRIES WARNUNGEN (Startbildschirm) ═══
async function loadMissingEntriesWarning() {
  try {
    const missing = await DB.getMissingEntries(2);
    const warnContainer = document.getElementById('miss-info-cnt');
    const warnList = document.getElementById('miss-info-list');
    
    if (missing.length === 0) {
      warnContainer.style.display = 'none';
      return;
    }
    
    warnContainer.style.display = 'block';
    warnList.innerHTML = '';
    
    // Gruppiere nach Mitarbeiter
    const grouped = {};
    missing.forEach(entry => {
      if (!grouped[entry.employee_id]) {
        grouped[entry.employee_id] = [];
      }
      grouped[entry.employee_id].push(entry.missing_date);
    });
    
    // Zeige pro Mitarbeiter
    Object.entries(grouped).forEach(([empId, dates]) => {
      const dateStr = dates.map(d => {
        const [y, m, d_] = d.split('-');
        return `${d_}.${m}`;
      }).join(', ');
      
      const row = document.createElement('div');
      row.className = 'mr';
      row.innerHTML = `
        <div style="width:32px;height:32px;border-radius:50%;background:#fcebeb;display:flex;align-items:center;justify-content:center;font-size:11px;color:#c0392b;font-weight:700">⚠</div>
        <div style="flex:1">
          <div style="font-size:14px;font-weight:700">${
            missing.find(e => e.employee_id === empId).employee_name
          }</div>
          <div style="font-size:12px;color:var(--s);margin-top:2px">${dateStr}</div>
        </div>
      `;
      warnList.appendChild(row);
    });
  } catch (e) {
    console.error('Error loading missing entries:', e);
  }
}

// ═══ 2. UNABGERECHNETE STUNDEN (Dashboard) ═══
async function loadUnbilledHours() {
  try {
    const total = await BUSINESS.calculateTotalUnbilledRevenue();
    const unbilledCard = document.getElementById('dc-unbilled');
    const unbilledValue = document.getElementById('s-ub');
    
    if (total > 0) {
      unbilledCard.style.display = 'block';
      unbilledValue.textContent = total.toFixed(2) + ' €';
      unbilledCard.style.cursor = 'pointer';
      unbilledCard.onclick = () => showUnbilledDetails();
    } else {
      unbilledCard.style.display = 'none';
    }
  } catch (e) {
    console.error('Error loading unbilled hours:', e);
  }
}

// Zeige detaillierte Übersicht unabgerechneter Stunden
async function showUnbilledDetails() {
  try {
    const unbilled = await DB.getUnbilledHoursAll();
    
    if (unbilled.length === 0) {
      alert('Keine unabgerechneten Stunden vorhanden');
      return;
    }
    
    let html = '<div style="padding:16px">';
    html += '<div style="font-size:16px;font-weight:700;margin-bottom:12px">Unabgerechnete Stunden</div>';
    html += '<table class="wt" style="width:100%">';
    html += '<tr><th>BV</th><th>Stunden</th><th style="text-align:right">Betrag</th></tr>';
    
    let totalAmount = 0;
    unbilled.forEach(item => {
      const amount = parseFloat(item.total_amount) || 0;
      totalAmount += amount;
      html += `<tr>
        <td>${item.bv_nr} ${item.bv_name}</td>
        <td>${parseFloat(item.total_hours || 0).toFixed(2)}h</td>
        <td style="text-align:right;font-weight:700">${amount.toFixed(2)}€</td>
      </tr>`;
    });
    
    html += `<tr style="font-weight:700;background:var(--gl)">
      <td colspan="2">GESAMT:</td>
      <td style="text-align:right">${totalAmount.toFixed(2)}€</td>
    </tr>`;
    html += '</table>';
    html += '</div>';
    
    const modal = document.createElement('div');
    modal.className = 'co on';
    modal.innerHTML = `
      <div class="cb">
        ${html}
        <button class="btn" onclick="this.parentElement.parentElement.remove()" style="margin-top:16px">Schließen</button>
      </div>
    `;
    document.body.appendChild(modal);
  } catch (e) {
    console.error('Error showing unbilled details:', e);
  }
}

// ═══ 3. RECHNUNGEN - SAMMELBLÖCKE ═══
async function loadInvoiceBlocks() {
  try {
    const invoices = await DB.getInvoicesSummary();
    const deadlineList = document.getElementById('rg-dash-list');
    
    if (!deadlineList) return;
    
    deadlineList.innerHTML = '';
    
    invoices.forEach(status => {
      if (status.status === 'paid') return; // Nur offene anzeigen
      
      const block = document.createElement('div');
      block.className = 'crd';
      block.style.marginBottom = '8px';
      block.style.cursor = 'pointer';
      
      let statusColor = '#2f6fed'; // blue
      if (status.status === 'overdue') {
        statusColor = '#c0392b'; // red
      } else if (status.status === 'open') {
        statusColor = '#e67e22'; // orange
      }
      
      block.innerHTML = `
        <div style="padding:12px 15px;border-left:4px solid ${statusColor}">
          <div style="display:flex;justify-content:space-between;align-items:center">
            <div>
              <div style="font-size:13px;font-weight:700;color:${statusColor};text-transform:uppercase">${status.status}</div>
              <div style="font-size:15px;font-weight:700;margin-top:4px">${(status.total_amount || 0).toFixed(2)}€</div>
              <div style="font-size:12px;color:var(--s);margin-top:2px">${status.count} Rechnungen</div>
            </div>
            <div style="text-align:right;font-size:12px;color:var(--s)">
              Von: ${new Date(status.oldest).toLocaleDateString('de')}
            </div>
          </div>
        </div>
      `;
      
      block.onclick = () => showInvoiceDetails(status.status);
      deadlineList.appendChild(block);
    });
  } catch (e) {
    console.error('Error loading invoice blocks:', e);
  }
}

async function showInvoiceDetails(status) {
  try {
    const invoices = await DB.getInvoicesByStatus(status);
    
    let html = '<div style="padding:16px;max-height:60vh;overflow-y:auto">';
    html += `<div style="font-size:16px;font-weight:700;margin-bottom:12px">Rechnungen: ${status}</div>`;
    
    invoices.forEach(inv => {
      html += `
        <div class="crd" style="margin-bottom:10px;padding:12px">
          <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:8px">
            <div>
              <div style="font-weight:700">${inv.invoice_number || `#${inv.id.substring(0, 8)}`}</div>
              <div style="font-size:12px;color:var(--s)">${inv.bv_nr}</div>
            </div>
            <div style="text-align:right">
              <div style="font-weight:700;color:var(--g)">${inv.amount.toFixed(2)}€</div>
              <div style="font-size:12px;color:var(--s)">${new Date(inv.invoice_date).toLocaleDateString('de')}</div>
            </div>
          </div>
          ${inv.due_date ? `<div style="font-size:11px;color:${new Date(inv.due_date) < new Date() ? '#c0392b' : 'var(--s)'}">Fällig: ${new Date(inv.due_date).toLocaleDateString('de')}</div>` : ''}
        </div>
      `;
    });
    
    html += '</div>';
    
    const modal = document.createElement('div');
    modal.className = 'co on';
    modal.innerHTML = `
      <div class="cb">
        ${html}
        <button class="btn" onclick="this.parentElement.parentElement.remove()" style="margin-top:16px">Schließen</button>
      </div>
    `;
    document.body.appendChild(modal);
  } catch (e) {
    console.error('Error showing invoice details:', e);
  }
}

// ═══ 4. SCHRITT 1+ ATTENDANCE CHECK ═══
// Bevor Stunden eingegeben werden: Wer war heute da?
async function showAttendanceCheck(date) {
  try {
    const employees = await DB.getEmployeesWithEntries(date);
    const allEmployees = []; // TODO: Hole alle Mitarbeiter aus DB
    
    const missing = allEmployees.filter(e => !employees.find(entry => entry.employee_id === e.id));
    
    if (missing.length === 0) return;
    
    let html = `
      <div style="padding:16px;text-align:center">
        <div style="font-size:16px;font-weight:700;margin-bottom:12px">Anwesenheit am ${new Date(date).toLocaleDateString('de')}</div>
        <div style="font-size:13px;color:var(--s);margin-bottom:16px">Wer war da?</div>
        <div style="display:flex;flex-direction:column;gap:8px">
    `;
    
    missing.forEach(emp => {
      html += `
        <button class="qbtn" style="text-align:left" onclick="recordAttendance('${emp.id}', '${date}', true); this.parentElement.remove()">
          ✓ ${emp.name}
        </button>
      `;
    });
    
    html += '<button class="bto" onclick="this.parentElement.parentElement.remove()" style="margin-top:8px">Fertig</button></div></div>';
    
    const modal = document.createElement('div');
    modal.className = 'ov on';
    modal.innerHTML = `<div class="sh">${html}</div>`;
    document.body.appendChild(modal);
  } catch (e) {
    console.error('Error showing attendance check:', e);
  }
}

async function recordAttendance(employeeId, date, wasPresent, absenceReason = null) {
  try {
    await DB.recordAttendance(date, employeeId, wasPresent, absenceReason);
  } catch (e) {
    console.error('Error recording attendance:', e);
  }
}

// ═══ 5. EDITOR - NEUE TABS ═══
// Füge "Urlaub & Feiertage" und "Benachrichtigungen" Tabs hinzu

function addLeavePeriodTab() {
  const editorTabs = document.getElementById('editor-tabs');
  if (!editorTabs) return;
  
  const tab = document.createElement('button');
  tab.className = 'stattab';
  tab.textContent = '🏖️ Urlaub';
  tab.onclick = () => showLeaveManager();
  editorTabs.appendChild(tab);
}

async function showLeaveManager() {
  // Neue UI für Urlaub verwalten
  const html = `
    <div style="padding:16px">
      <div class="lbl">Urlaub/Krankheit hinzufügen</div>
      <div class="nbvr" style="margin-top:8px;gap:8px">
        <input type="date" id="leave-start" style="flex:1">
        <input type="date" id="leave-end" style="flex:1">
      </div>
      <select id="leave-emp" style="margin:8px 0">
        <option>Mitarbeiter wählen...</option>
      </select>
      <select id="leave-type" style="margin-bottom:8px">
        <option value="urlaub">Urlaub</option>
        <option value="krankheit">Krankheit</option>
      </select>
      <button class="btn" onclick="saveLeavePeriod()">Speichern</button>
    </div>
  `;
  
  const modal = document.createElement('div');
  modal.className = 'ov on';
  modal.innerHTML = `<div class="sh">${html}</div>`;
  document.body.appendChild(modal);
  
  // Fülle Mitarbeiter-Dropdown
  const empSelect = modal.querySelector('#leave-emp');
  try {
    const employees = await DB.getEmployeesWithEntries(new Date().toISOString().split('T')[0]);
    employees.forEach(emp => {
      const opt = document.createElement('option');
      opt.value = emp.employee_id;
      opt.textContent = emp.name;
      empSelect.appendChild(opt);
    });
  } catch (e) {
    console.error('Error loading employees:', e);
  }
}

async function saveLeavePeriod() {
  const startDate = document.querySelector('#leave-start')?.value;
  const endDate = document.querySelector('#leave-end')?.value;
  const empId = document.querySelector('#leave-emp')?.value;
  const leaveType = document.querySelector('#leave-type')?.value;
  
  if (!startDate || !endDate || !empId || !leaveType) {
    alert('Alle Felder ausfüllen!');
    return;
  }
  
  try {
    await DB.addLeavePeriod(empId, startDate, endDate, leaveType, false);
    alert('Urlaub gespeichert!');
    document.querySelector('.ov').remove();
  } catch (e) {
    console.error('Error saving leave period:', e);
    alert('Fehler beim Speichern');
  }
}

// ═══ 6. NOTIFICATION SETTINGS EDITOR ═══
function addNotificationTab() {
  const editorTabs = document.getElementById('editor-tabs');
  if (!editorTabs) return;
  
  const tab = document.createElement('button');
  tab.className = 'stattab';
  tab.textContent = '🔔 Benachrichtigungen';
  tab.onclick = () => showNotificationSettings();
  editorTabs.appendChild(tab);
}

async function showNotificationSettings() {
  try {
    const settings = await DB.getAllNotificationSettings();
    
    let html = '<div style="padding:16px">';
    html += '<div style="font-size:16px;font-weight:700;margin-bottom:16px">Benachrichtigungen</div>';
    
    settings.forEach(setting => {
      html += `
        <div class="repfld" style="margin-bottom:12px">
          <div style="flex:1">
            <div class="lid">${setting.setting_key}</div>
            <div class="lib">${setting.notes || 'Benachrichtigung'}</div>
          </div>
          <label class="tgl ${setting.enabled ? 'on' : ''}" style="margin-left:auto;cursor:pointer">
            <input type="checkbox" ${setting.enabled ? 'checked' : ''} 
              onchange="updateNotificationSetting('${setting.setting_key}', this.checked)" 
              style="display:none">
          </label>
        </div>
      `;
    });
    
    html += '</div>';
    
    const modal = document.createElement('div');
    modal.className = 'ov on';
    modal.innerHTML = `<div class="sh">${html}</div>`;
    document.body.appendChild(modal);
  } catch (e) {
    console.error('Error loading notification settings:', e);
  }
}

async function updateNotificationSetting(settingKey, enabled) {
  try {
    await DB.updateNotificationSetting(settingKey, { enabled });
  } catch (e) {
    console.error('Error updating notification setting:', e);
  }
}

// ═══ 7. AUTO-REFRESH ALLE 30 SEKUNDEN ═══
function startAutoRefresh() {
  setInterval(async () => {
    if (document.getElementById('pg-home').classList.contains('on')) {
      loadMissingEntriesWarning();
      loadUnbilledHours();
      loadInvoiceBlocks();
    }
  }, 30000); // 30 Sekunden
}

// ═══ 8. INITIALISIERUNG ═══
document.addEventListener('DOMContentLoaded', () => {
  // Starte Auto-Refresh
  startAutoRefresh();
  
  // Lade Anfangsdaten
  loadMissingEntriesWarning();
  loadUnbilledHours();
  loadInvoiceBlocks();
  
  // Überschreibe existierende Funktionen wenn nötig
  const origGo = window.go;
  window.go = function(page) {
    origGo(page);
    
    if (page === 'pg-home') {
      loadMissingEntriesWarning();
      loadUnbilledHours();
      loadInvoiceBlocks();
    }
  };
});

// ════════════════════════════════════════════════════════════════
// ENDE UI INTEGRATION
// ════════════════════════════════════════════════════════════════
