// Service Worker: App funktioniert offline (z. B. im Supermarkt-Funkloch).
// Die Dateiliste (PRECACHE) wird beim Build automatisch eingetragen.
const VERSION = 'mwzfwvcp';
const CACHE = 'family-orga-' + VERSION;
const OCR_CACHE = 'family-orga-ocr-e50d898969';
const PRECACHE = ["./","./assets/index-CRIRZYYA.js","./assets/index-DZvEMn4Y.css","./assets/jspdf.es.min-Bp7lKBUN.js","./assets/letterPdf-Dw2j_wWZ.js","./assets/ocr-CeDIpvxV.js","./icons/apple-touch-icon.png","./icons/icon-192.png","./icons/icon-512.png","./icons/icon-maskable-512.png","./index.html","./manifest.webmanifest"];
// SHA-256 je Datei (Pfad relativ zur App). Schutz, falls jemand den Zwischenspeicher manipuliert.
const HASHES = {"/assets/html2canvas.esm-BfxBtG_O.js":"b471b10e16146893cfa97e18fc83cacd3996b63ce527b10dad4b44d232c64884","/assets/index-CRIRZYYA.js":"7305df9964838b7152e9304343a9e41917b705d61cb8ad41ada9a001cf1e7d88","/assets/index-DZvEMn4Y.css":"1b62a3daec32567a699031ca2526c2dc4d8b4190860dc48535405721ae47a670","/assets/index.es-BqVttAbI.js":"f5bd309d44b3be117d5bbcc89568c38264b7821095f50afc4bfc5c41da9d443c","/assets/jspdf.es.min-Bp7lKBUN.js":"c71b6e4b03ce939964eadccf1a1cac41880392cd21e9ba1ce625c777e3026c16","/assets/letterPdf-Dw2j_wWZ.js":"28665a1bc16a1c55262a907ad7d871c9034ccdc6e238db2be8f660caf3b12e9f","/assets/ocr-CeDIpvxV.js":"e67456fcd7caf1339ba4240e16a8f948b62380df3d31228aab0549fc88cd3b10","/assets/purify.es-BwoZCkIS.js":"0917726fedf3b7ad791784f09f89d85a858d76a6ada18d24aefaeb3c5b94311a","/icons/apple-touch-icon.png":"2a6b7cbb1dadf0d97bb7fe980141191d0d07e95764d90c409dff666bab2a25b5","/icons/icon-192.png":"de944230bc58b0f1b4048353ab12eb15de62ae32c0dab548ce84d31f43bc78d5","/icons/icon-512.png":"f14828236af7df48cae627a4899ac3f461f62c111d071a2a62381a3ee34a2335","/icons/icon-maskable-512.png":"d9a9f61bac653d11e6e6a965e1b0888efaf6a7e9bdb343436e87abb0329b9160","/index.html":"2e7e5aaea59db873c2fadf9c249754f9a88ae9771a9c8f49d9d6e3cb59b3b4f7","/manifest.webmanifest":"0bda864c2c495236a318443b65fa62460b3377a4ccd47ffa09ff66b5fb209d3f","/ocr/core/tesseract-core-lstm.wasm.js":"8f04aa0cc81e7bde33f80e92fa01a7a665f0b4884d098acf5de9c7104a11dfaa","/ocr/core/tesseract-core-simd-lstm.wasm.js":"ce20eda9533cbed1e6c2b4276fbae1e0adc61b6754b5513084be601787b457cf","/ocr/lang/deu.traineddata.gz":"306c4280d0cbed46fbff727486bd43b92730181bae80f56941a091f363bdf28b","/ocr/worker.min.js":"aca1229639fc9907d86f96e825955a2b7c5716d17f3bc3acd71f9c7ab66181fc"};
// true nur auf der alten Adresse: dort keine Benachrichtigungen mehr (sonst kommt alles doppelt)
const RETIRED = false;
const retirePush = () => self.registration.pushManager.getSubscription().then((s) => s && s.unsubscribe()).catch(() => {});
const BASE = new URL(self.registration.scope).pathname.replace(/\/$/, '');
const verified = new Set();
const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
async function intact(path, res) {
  const want = HASHES[path];
  if (!want) return true; // nicht gelistet (z. B. ./): keine Prüfung möglich
  if (verified.has(path)) return true;
  const got = hex(await crypto.subtle.digest('SHA-256', await res.clone().arrayBuffer()));
  if (got === want) { verified.add(path); return true; }
  return false;
}

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE && k !== OCR_CACHE && k !== 'family-orga-pushlog').map((k) => caches.delete(k))))
      .then(() => (RETIRED ? retirePush() : null))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  // Seitenaufrufe: erst Netz (für Updates), sonst Cache. „no-cache“: nie die bis zu 10 Minuten alte
  // Kopie aus dem Browser-Zwischenspeicher nehmen, sonst kommt ein Update erst verspätet an.
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req.url, { cache: 'no-cache', credentials: 'same-origin' }).then((res) => { const copy = res.clone(); caches.open(CACHE).then((c) => c.put('./', copy)); return res; })
        .catch(() => caches.open(CACHE).then((c) => c.match('./', { ignoreSearch: true })).then((r) => r || caches.match('./index.html'))),
    );
    return;
  }
  // Texterkennungs-Dateien: beim ersten Scan laden, dann dauerhaft offline
  const isOcr = url.pathname.includes('/ocr/');
  const path = url.pathname.startsWith(BASE) ? url.pathname.slice(BASE.length) : url.pathname;
  const cacheName = isOcr ? OCR_CACHE : CACHE;
  e.respondWith((async () => {
    const c = await caches.open(cacheName); // nur im eigenen Zwischenspeicher suchen
    const hit = await c.match(req, { ignoreSearch: true });
    if (hit) {
      if (await intact(path, hit)) return hit;
      await c.delete(req, { ignoreSearch: true }); // manipuliert oder veraltet → verwerfen
    }
    const res = await fetch(req);
    if (res.ok && await intact(path, res)) c.put(req, res.clone());
    return res;
  })());
});

// Benachrichtigungen vom anderen Handy bzw. vom Server (Timer, Ruhezeit, Abholen …)
const PUSH_LOG = 'family-orga-pushlog';
// Merkt sich die letzten Eingänge – die Prüfung in der App sieht so, ob Meldungen hier ankommen
async function logPush(entry) {
  try {
    const c = await caches.open(PUSH_LOG);
    const old = await c.match('/__pushlog').then((r) => (r ? r.json() : [])).catch(() => []);
    const list = [{ at: Date.now(), ...entry }, ...old].slice(0, 10);
    await c.put('/__pushlog', new Response(JSON.stringify(list), { headers: { 'Content-Type': 'application/json' } }));
  } catch (err) { /* Protokoll ist nur Hilfe */ }
}

// Verschlüsselte Meldungen („FOE:…“) mit dem Schlüssel aus dem Familien-Code öffnen (gleiche Rechnung wie src/lib/seal.js)
function readFamilyCode() { return readMeta('familyCode'); }
// Einen Wert aus dem lokalen Speicher der App lesen (nur lesen, nie anlegen)
function readMeta(key) {
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open('family-orga');
      req.onerror = () => resolve(null);
      // Nie selbst eine (leere) Datenbank anlegen und Verbindung immer schließen – sonst blockiert sie die App
      req.onupgradeneeded = () => { try { req.transaction.abort(); } catch { /* egal */ } };
      req.onsuccess = () => {
        const dbh = req.result;
        try {
          const tx = dbh.transaction('meta', 'readonly');
          const g = tx.objectStore('meta').get(key);
          g.onsuccess = () => { resolve(g.result ? g.result.value : null); dbh.close(); };
          g.onerror = () => { resolve(null); dbh.close(); };
        } catch { resolve(null); dbh.close(); }
      };
    } catch { resolve(null); }
  });
}
// Liegt die Uhrzeit in der leisen Zeit? (auch über Mitternacht, z. B. 21:00–06:30)
function inQuietHours(q, d) {
  if (!q || !q.on) return false;
  const m = (s) => { const x = /^(\d{1,2}):(\d{2})$/.exec(String(s || '')); return x ? +x[1] * 60 + +x[2] : null; };
  const f = m(q.from), t = m(q.to), n = d.getHours() * 60 + d.getMinutes();
  if (f === null || t === null || f === t) return false;
  return f < t ? n >= f && n < t : n >= f || n < t;
}
async function unseal(text) {
  const code = String((await readFamilyCode()) || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (!code) return null;
  const enc = new TextEncoder();
  const base = await crypto.subtle.importKey('raw', enc.encode(code), 'HKDF', false, ['deriveKey']);
  const key = await crypto.subtle.deriveKey({ name: 'HKDF', hash: 'SHA-256', salt: enc.encode('family-orga/hkdf/v1'), info: enc.encode('notify') }, base, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
  const s = text.slice(4).replace(/-/g, '+').replace(/_/g, '/');
  const raw = Uint8Array.from(atob(s + '==='.slice((s.length + 3) % 4)), (c) => c.charCodeAt(0));
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: raw.slice(0, 12) }, key, raw.slice(12));
  return JSON.parse(new TextDecoder().decode(plain));
}

self.addEventListener('push', (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch { d = { title: 'Family Orga', body: e.data && e.data.text() }; }
  const icon = new URL('icons/icon-192.png', self.registration.scope).href;
  e.waitUntil((async () => {
    if (RETIRED) {
      // Eine Meldung muss angezeigt werden – einmalig der Umzugshinweis, danach ist dieses Abo weg
      await retirePush();
      await self.registration.showNotification('🏠 Family Orga ist umgezogen', { body: 'Diese alte App bekommt keine Meldungen mehr. Bitte die neue Family Orga benutzen.', tag: 'umzug', icon, data: { url: self.registration.scope } });
      return;
    }
    let title = String(d.title || 'Family Orga'), body = String(d.body || ''), sealed = false;
    if (title.startsWith('FOE:')) {
      sealed = true;
      try { const m = await unseal(title); title = String(m.t || 'Family Orga'); body = String(m.b || ''); }
      catch { title = 'Family Orga'; body = 'Neue Benachrichtigung – bitte App öffnen.'; }
    }
    // Tagesablauf (Ruhezeit/Schlafenszeit) eigene Gruppe, damit Brief-Erinnerungen nicht verdrängt werden
    const day = /^(⏳|🤫|🟢|😴|☀️|📵|🌙|💬)/u.test(title);
    // Jetzt-Hilfe: zu welcher Lage passt die Meldung? (Android zeigt dann zwei Knöpfe)
    const help = helpFor(title);
    const full = {
      body, tag: day ? 'tagesablauf' : d.tag || 'family-orga', renotify: true, icon, badge: icon,
      vibrate: day ? [300, 150, 300, 150, 600] : [200, 100, 200], data: { url: self.registration.scope, help },
      ...(help ? { actions: [{ action: 'ok', title: '✅ Klappt' }, { action: 'help', title: '😤 Klappt nicht' }] } : {}),
    };
    // 🔕 Leise Zeit (pro Handy eingestellt): Meldung kommt trotzdem, aber ohne Ton und Vibration
    try { if (inQuietHours(await readMeta('quietHours'), new Date())) { full.silent = true; delete full.vibrate; } } catch { /* egal */ }
    // Protokoll (für „Benachrichtigungen prüfen“) ohne Inhalt: nur Art und ob angezeigt
    const kind = String(d.tag || (day ? 'tagesablauf' : 'family-orga')).slice(0, 20);
    try {
      await self.registration.showNotification(title, full);
      await logPush({ kind, sealed, shown: true });
    } catch (err) {
      // Manche Browser lehnen einzelne Optionen ab → einfach nur Titel + Text
      try { await self.registration.showNotification(title, { body }); await logPush({ kind, sealed, shown: true, simple: true, error: String(err).slice(0, 120) }); }
      catch (err2) { await logPush({ kind, sealed, shown: false, error: String(err2).slice(0, 120) }); }
    }
  })());
});

// Lage für die Jetzt-Hilfe aus dem Titel der Meldung
function helpFor(title) {
  if (/^⏳/u.test(title)) return 'stopPlay';
  if (/^🤫/u.test(title)) return 'calm';
  if (/^📵/u.test(title)) return 'screens';
  if (/^🌙/u.test(title)) return 'evening';
  if (/^😴/u.test(title)) return 'bed';
  if (/^☀️/u.test(title) && !/Morgenbriefing/.test(title)) return 'morning';
  return null;
}

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  if (e.action === 'ok') return; // „Klappt“: nichts weiter tun
  // Tagesablauf/Abendroutine → direkt die Kinder-Seite öffnen; „Klappt nicht“ → gleich die Ideen
  const title = e.notification.title || '';
  const kids = /^(⏳|🤫|🟢|😴|☀️|📵|🌙|💬)/u.test(title) && !/Morgenbriefing/.test(title);
  const help = e.notification.data?.help || helpFor(title);
  const direct = e.action === 'help' && help;
  const hash = direct ? `#hilfe=${help}` : help ? `#kinder&hilfe=${help}` : kids ? '#kinder' : '';
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
    const c = list.find((w) => w.url.startsWith(self.registration.scope));
    if (c) { if (kids || help) c.postMessage({ open: 'kids', help, soft: !direct }); return c.focus(); }
    return self.clients.openWindow(self.registration.scope + hash);
  }));
});
