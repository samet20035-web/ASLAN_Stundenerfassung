# 🔗 Integration Guide - Neue Features in index.html

## Übersicht

Diese Anleitung zeigt, wie du die neuen Supabase-Features in deine bestehende `index.html` integrierst.

---

## 📋 Checkliste

- [ ] **1. Script-Links hinzufügen** (im `<head>`)
- [ ] **2. HTML-Elemente einfügen** (in entsprechende Seiten)
- [ ] **3. Event-Listener verbinden**
- [ ] **4. Testen**

---

## 1️⃣ Script-Links im `<head>` einfügen

Füge diese Zeilen am ENDE des `<head>`-Sections ein (vor `</head>`):

```html
<!-- Supabase Client -->
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.38.0/dist/module.js"></script>

<!-- Supabase API Wrapper -->
<script src="supabase-api.js"></script>

<!-- UI Integration -->
<script src="ui-integration.js"></script>
```

---

## 2️⃣ HTML-Elemente in Seiten einfügen

### A) Startseite (Home)

Finde die Home-Seite (`<div class="pg" id="pg-home">`). Füge diesen Block **nach den Statistics-Blöcken** ein:

```html
<!-- WARNUNG: Fehlende Einträge -->
<div id="miss-info-cnt" style="background:#fcebeb;border-radius:var(--r);margin:9px 16px 0;padding:0;border:.5px solid #e8b8b8;overflow:hidden;display:none">
  <div style="padding:12px 15px;border-bottom:.5px solid #e8b8b8">
    <div style="display:flex;align-items:center;gap:8px">
      <div style="font-size:18px">⚠️</div>
      <div>
        <div style="font-size:13px;font-weight:700;color:#c0392b">Einträge fehlen</div>
        <div style="font-size:12px;color:#c0392b;opacity:.8">Letzte 2 Tage nicht erfasst</div>
      </div>
    </div>
  </div>
  <div id="miss-info-list" class="crd" style="border:none;margin:0;border-radius:0"></div>
</div>
```

### B) Dashboard/Statistik-Seite

Finde die Statistik-Seite. Füge diesen Block **oben in der Scroll-Area** ein:

```html
<!-- UNABGERECHNETE STUNDEN -->
<div id="dc-unbilled" class="ba" style="background:var(--gl);border-color:var(--gm);display:none">
  <div class="ai" style="background:rgba(31,110,82,.15);color:var(--gd)">💰</div>
  <div>
    <div class="at">Unabgerechnete Stunden</div>
    <div class="as" id="s-ub">0.00 €</div>
  </div>
  <div class="ar">›</div>
</div>
```

### C) Rechnungen-Seite (pg-rg)

Finde die Rechnungs-Seite. Ersetze die **alte Rechnungsliste** mit:

```html
<!-- SAMMELRECHNUNG BLÖCKE -->
<div id="rg-dash-list" style="padding:0 16px;margin-top:12px">
  <!-- Wird dynamisch gefüllt -->
</div>
```

### D) Editor-Seite (pg-editor)

Finde die Editor-Seite. Ersetze die **bestehenden Tabs** mit:

```html
<!-- EDITOR TABS -->
<div class="stp" style="padding:0 18px 10px;background:var(--c)">
  <div class="sp on"></div>
  <div class="sp dn"></div>
  <div class="sp"></div>
</div>
<div id="editor-tabs" style="display:flex;gap:6px;padding:10px 16px;background:var(--c);border-bottom:.5px solid var(--b);overflow-x:auto;white-space:nowrap">
  <button class="stattab on" onclick="showEditorTab('main')">⏱️ Stunden</button>
  <button class="stattab" onclick="showEditorTab('absences')">📋 Abwesenheit</button>
  <button class="stattab" onclick="showEditorTab('leaves')">🏖️ Urlaub</button>
  <button class="stattab" onclick="showEditorTab('notifications')">🔔 Benachrichtigungen</button>
</div>
```

---

## 3️⃣ Event-Listener verbinden

Füge diesen Code **am Ende von index.html** (vor `</body>`) ein:

```html
<script>
// Nach dem Laden der Seite: Initialisiere neue Features
document.addEventListener('DOMContentLoaded', function() {
  setTimeout(() => {
    if (typeof loadMissingEntriesWarning === 'function') {
      loadMissingEntriesWarning();
      loadUnbilledHours();
      loadInvoiceBlocks();
    }
  }, 500);
});

// Überschreibe Seiten-Navigation
const origGo = window.go;
window.go = function(page) {
  origGo(page);
  
  // Refresh Daten bei Seiten-Wechsel
  if (page === 'pg-home') {
    setTimeout(loadMissingEntriesWarning, 100);
  } else if (page === 'pg-stats') {
    setTimeout(loadUnbilledHours, 100);
  } else if (page === 'pg-rg') {
    setTimeout(loadInvoiceBlocks, 100);
  }
};

// Auto-Refresh alle 30 Sekunden
setInterval(() => {
  if (document.getElementById('pg-home')?.classList.contains('on')) {
    loadMissingEntriesWarning();
  }
}, 30000);
</script>
```

---

## 4️⃣ Neue Funktionen in Editor

### Stunden-Eintrag mit Anwesenheit-Check

Ändere die bestehende `addTimeEntry()`-Funktion:

```javascript
async function addTimeEntry(date, bvNr, employeeId, startTime, endTime, pauseMinutes) {
  // 1. Prüfe Anwesenheit
  await showAttendanceCheck(date);
  
  // 2. Speichere Stunden
  await DB.addTimeEntry(date, bvNr, employeeId, startTime, endTime, pauseMinutes);
  
  // 3. Aktualisiere UI
  loadMissingEntriesWarning();
}
```

### Urlaub hinzufügen

```javascript
function openLeaveManager() {
  const html = `
    <div style="padding:16px">
      <div class="lbl">Urlaub/Krankheit erfassen</div>
      <div style="margin:12px 0">
        <label class="lbl">Von:</label>
        <input type="date" id="leave-start" style="width:100%;padding:11px;border:.5px solid var(--bs);border-radius:var(--rs)">
      </div>
      <div style="margin:12px 0">
        <label class="lbl">Bis:</label>
        <input type="date" id="leave-end" style="width:100%;padding:11px;border:.5px solid var(--bs);border-radius:var(--rs)">
      </div>
      <div style="margin:12px 0">
        <label class="lbl">Mitarbeiter:</label>
        <select id="leave-emp" style="width:100%;padding:11px;border:.5px solid var(--bs);border-radius:var(--rs)">
          <option>Wählen...</option>
        </select>
      </div>
      <div style="margin:12px 0">
        <label class="lbl">Typ:</label>
        <select id="leave-type" style="width:100%;padding:11px;border:.5px solid var(--bs);border-radius:var(--rs)">
          <option value="urlaub">Urlaub</option>
          <option value="krankheit">Krankheit</option>
        </select>
      </div>
      <button class="btn" onclick="saveLeavePeriod()">Speichern</button>
    </div>
  `;
  const modal = document.createElement('div');
  modal.className = 'ov on';
  modal.innerHTML = `<div class="sh">${html}</div>`;
  document.body.appendChild(modal);
}
```

---

## 🧪 Test-Checklist

```bash
1. ✅ Browser öffnen → Console sollte keine Errors zeigen
2. ✅ Seite Home: "Einträge fehlen" Block sollte erscheinen (falls Daten fehlen)
3. ✅ Dashboard: "Unabgerechnete Stunden" sollte angezeigt werden
4. ✅ Rechnungen: Blöcke nach Status sollten sichtbar sein
5. ✅ Editor: Neue Tabs sollten angezeigt werden
6. ✅ Auto-Refresh: Alle 30 Sekunden sollte Daten aktualisieren
```

---

## 🆘 Häufige Fehler

### Fehler: "DB is not defined"
→ Stelle sicher, dass `supabase-api.js` NACH Supabase-Client geladen wird

### Fehler: "Elemente erscheinen nicht"
→ Prüfe die Konsole (F12) auf JavaScript-Fehler

### Fehler: "Daten werden nicht aktualisiert"
→ Prüfe, dass `loadMissingEntriesWarning()` etc. nach DOMContentLoaded aufgerufen werden

---

## 📝 Nächste Schritte

1. **Responsive Design** - CSS anpassen für kleine Bildschirme
2. **Real-time Updates** - Supabase Subscriptions einbauen
3. **Offline-Mode** - LocalStorage für offline Daten
4. **Notifications** - Browser-Notifications für Warnungen

---

## 📞 Unterstützung

Bei Fragen: Siehe `DATENBANKSTRUKTUR.md` für Datenbankdetails oder `supabase-api.js` für verfügbare Funktionen.
