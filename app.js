/* =========================================================================
   Nachweise für Schützen – Login, Datenzugriff, Helfer
   -------------------------------------------------------------------------
   window.NW.ready  -> Promise, löst nach dem Login auf ({ vmOk })
   Schreiben passiert nur im Projekt „nachweise-schuetzen“ (db).
   Aus „schiessen“ (vm) wird nur gelesen: kader, vm/{jahr}, Unterlisten.

   Demo-Modus: nur auf localhost mit ?demo – ohne Firebase, mit erfundenen
   Beispieldaten im Speicher. Zum Ausprobieren der Oberfläche und des
   Ausdrucks, ohne irgendeine Datenbank zu berühren.
   ========================================================================= */
window.NW = (function () {
  "use strict";

  const SDK = "https://www.gstatic.com/firebasejs/10.12.2/";
  const LOKAL = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
  const DEMO = LOKAL && new URLSearchParams(location.search).has("demo");

  let db = null;   // Firestore „nachweise-schuetzen“ (lesen + schreiben)
  let vm = null;   // Firestore „schiessen“ (nur lesen)
  let vmOk = false;

  let resolveReady;
  const ready = new Promise((r) => (resolveReady = r));

  // ---------------------------------------------------------------- Helfer
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  }
  function fmt(n) {
    if (n == null || n === "" || isNaN(n)) return "";
    const r = Math.round(Number(n) * 10) / 10;
    return Number.isInteger(r) ? String(r) : r.toFixed(1).replace(".", ",");
  }
  // "2027-03-14" -> "14.03.2027"
  function datum(iso) {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || "");
    return m ? m[3] + "." + m[2] + "." + m[1] : iso || "";
  }
  function heuteIso() {
    const d = new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }
  function zahl(v) {
    if (v == null || String(v).trim() === "") return null;
    const n = Number(String(v).replace(",", "."));
    return isNaN(n) ? null : n;
  }
  const KAT = window.DISZIPLINEN || {};
  function diszLabel(id) {
    const d = KAT[id];
    return d ? d.nummer + " · " + d.name : id || "";
  }
  function diszName(id) {
    const d = KAT[id];
    return d ? d.name : id || "";
  }
  function jahre() {
    const bis = new Date().getFullYear() + 1;
    const out = [];
    for (let y = bis; y >= 2015; y--) out.push(y);
    return out;
  }
  // <option>-Liste der Disziplinen; zuerst die der VM im Jahr, dann alle anderen
  function diszOptionen(vmIds, gewaehlt) {
    const vmSet = new Set(vmIds || []);
    const opt = (id) => `<option value="${esc(id)}"${id === gewaehlt ? " selected" : ""}>${esc(diszLabel(id))}</option>`;
    const rest = (window.DISZIPLIN_REIHENFOLGE || []).filter((id) => !vmSet.has(id));
    let h = '<option value="">– Disziplin wählen –</option>';
    if (vmSet.size) h += '<optgroup label="Disziplinen der VM">' + [...vmSet].map(opt).join("") + "</optgroup>";
    h += '<optgroup label="' + (vmSet.size ? "Weitere Disziplinen" : "Disziplinen") + '">' + rest.map(opt).join("") + "</optgroup>";
    return h;
  }

  /* Durchsuchbare Schützen-Auswahl wie in der VM: tippen filtert nach Name
     oder Nr., Liste numerisch nach Nr. sortiert. mount = leeres Element.
     opt = { placeholder, onChange(nr), leerenNachWahl } */
  function schuetzenAuswahl(mount, opt) {
    opt = opt || {};
    let options = [], filtered = [], selectedNr = "", hl = -1;
    mount.classList.add("ss");
    mount.innerHTML =
      '<input type="text" class="ss-input" autocomplete="off" placeholder="' + esc(opt.placeholder || "Name oder Nr. tippen …") + '">' +
      '<div class="ss-list" hidden></div>';
    const input = mount.querySelector(".ss-input");
    const list = mount.querySelector(".ss-list");

    function labelFor(nr) { const o = options.find((x) => x.nr === nr); return o ? o.label : ""; }
    function display() { return selectedNr ? selectedNr + " · " + labelFor(selectedNr) : ""; }
    function renderList(q) {
      q = (q || "").trim().toLowerCase();
      filtered = options.filter((o) => !q || o.label.toLowerCase().indexOf(q) >= 0 || o.nr.toLowerCase().indexOf(q) >= 0);
      if (hl >= filtered.length) hl = filtered.length - 1;
      list.innerHTML = filtered.length
        ? filtered.map((o, i) => '<div class="ss-item' + (i === hl ? " is-hl" : "") + (o.nr === selectedNr ? " is-sel" : "") +
            '" data-nr="' + esc(o.nr) + '"><span class="ss-nr">' + esc(o.nr) + "</span>" + esc(o.label) + "</div>").join("")
        : '<div class="ss-empty">Kein Treffer</div>';
    }
    function open(showAll) { renderList(showAll ? "" : input.value); list.hidden = false; }
    function close() { list.hidden = true; hl = -1; }
    function commit(nr, silent) {
      selectedNr = nr;
      input.value = display();
      close();
      if (!silent && opt.onChange) opt.onChange(nr);
      if (opt.leerenNachWahl) { selectedNr = ""; input.value = ""; }
    }
    function scrollHl() { const e = list.querySelector(".ss-item.is-hl"); if (e) e.scrollIntoView({ block: "nearest" }); }

    input.addEventListener("focus", function () { input.select(); open(true); });
    input.addEventListener("click", function () { open(input.value === display()); });
    input.addEventListener("input", function () { hl = -1; renderList(input.value); list.hidden = false; });
    input.addEventListener("keydown", function (e) {
      if (list.hidden && e.key === "ArrowDown") { open(true); return; }
      if (e.key === "ArrowDown") { hl = Math.min(hl + 1, filtered.length - 1); renderList(input.value); scrollHl(); e.preventDefault(); }
      else if (e.key === "ArrowUp") { hl = Math.max(hl - 1, 0); renderList(input.value); scrollHl(); e.preventDefault(); }
      else if (e.key === "Enter") {
        const ziel = hl >= 0 ? filtered[hl] : filtered.length === 1 ? filtered[0] : null;
        if (ziel) commit(ziel.nr);
        e.preventDefault();
      }
      else if (e.key === "Escape") { input.value = display(); close(); }
    });
    list.addEventListener("mousedown", function (e) {
      const it = e.target.closest(".ss-item"); if (!it) return;
      e.preventDefault(); commit(it.getAttribute("data-nr"));
    });
    input.addEventListener("blur", function () { setTimeout(function () { close(); input.value = display(); }, 150); });

    return {
      setKader: function (kader) {
        options = (kader || []).map((s) => ({ nr: String(s.nr), label: s.vorname + " " + s.nachname }))
          .sort((a, b) => (parseInt(a.nr, 10) || 0) - (parseInt(b.nr, 10) || 0) || a.nr.localeCompare(b.nr, "de", { numeric: true }));
        if (selectedNr && !options.find((o) => o.nr === selectedNr)) selectedNr = "";
        input.value = display();
      },
      getValue: () => selectedNr,
      setValue: (nr, silent) => commit(String(nr), silent !== false),
      focus: () => input.focus(),
    };
  }

  // ---------------------------------------------------------- Hinweisbalken
  function balken(text, art) {
    let el = document.getElementById("nwBalken");
    if (!text) { if (el) el.remove(); return; }
    if (!el) {
      el = document.createElement("div");
      el.id = "nwBalken";
      el.setAttribute("role", "alert");
      document.body.prepend(el);
    }
    el.className = "balken balken--" + (art || "fehler");
    el.textContent = text;
  }
  function fehler(was, e) {
    console.error(was, e);
    balken(was + " fehlgeschlagen. Verbindung prüfen und Seite neu laden. (" + (e && e.message ? e.message : e) + ")", "fehler");
    throw e;
  }

  // ------------------------------------------------------------------ Login
  function loadScript(src) {
    return new Promise((res, rej) => {
      const s = document.createElement("script");
      s.src = src;
      s.onload = res;
      s.onerror = () => rej(new Error(src));
      document.head.appendChild(s);
    });
  }
  function fehlerText(code) {
    if (code === "auth/wrong-password" || code === "auth/invalid-credential") return "Falsches Passwort.";
    if (code === "auth/too-many-requests") return "Zu viele Versuche. Bitte kurz warten.";
    if (code === "auth/network-request-failed") return "Keine Verbindung.";
    if (code === "auth/operation-not-allowed") return "Login ist in Firebase noch nicht aktiviert.";
    return "Anmeldung fehlgeschlagen.";
  }
  function overlay(inner) {
    let o = document.getElementById("authOverlay");
    if (!o) {
      o = document.createElement("div");
      o.className = "auth-overlay";
      o.id = "authOverlay";
      document.body.appendChild(o);
    }
    o.innerHTML = inner;
    return o;
  }
  function zeigeLogin() {
    const o = overlay(
      '<form class="auth-card" id="authForm">' +
      '<img class="auth-logo" src="vereinlogo.png" alt="">' +
      '<h1 class="auth-title">Vereinslogin</h1>' +
      '<p class="auth-sub">Nachweise für Schützen</p>' +
      '<label class="auth-label">Passwort<input type="password" id="authPw" autocomplete="current-password" required></label>' +
      '<button type="submit" class="btn btn--primary" id="authBtn">Anmelden</button>' +
      '<p class="auth-err" id="authErr" aria-live="polite"></p>' +
      "</form>"
    );
    o.querySelector("#authPw").focus();
    o.querySelector("#authForm").addEventListener("submit", async function (e) {
      e.preventDefault();
      const pw = o.querySelector("#authPw").value;
      const err = o.querySelector("#authErr");
      const btn = o.querySelector("#authBtn");
      btn.disabled = true;
      err.textContent = "Anmelden …";
      try {
        await firebase.auth().signInWithEmailAndPassword(window.AUTH_EMAIL, pw);
      } catch (ex) {
        err.textContent = fehlerText(ex.code);
        btn.disabled = false;
        return;
      }
      // Dasselbe Passwort für die VM-Datenbank (nur lesen). Klappt das nicht,
      // läuft das Programm trotzdem, nur ohne Kader und VM-Ergebnisse.
      try { await firebase.app("vm").auth().signInWithEmailAndPassword(window.AUTH_EMAIL, pw); }
      catch (ex) { console.warn("VM-Login fehlgeschlagen:", ex.code); }
      fertig();
    });
  }
  function fertig() {
    db = firebase.firestore();
    vmOk = !!firebase.app("vm").auth().currentUser;
    vm = vmOk ? firebase.app("vm").firestore() : null;
    const o = document.getElementById("authOverlay");
    if (o) o.remove();
    if (!vmOk) balken("Keine Verbindung zur VM-Datenbank: Kader und VM-Ergebnisse fehlen. Abmelden und neu anmelden – das Passwort muss dasselbe wie bei der VM sein.", "warnung");
    resolveReady({ vmOk: vmOk });
  }

  async function init() {
    try {
      await loadScript(SDK + "firebase-app-compat.js");
      await loadScript(SDK + "firebase-auth-compat.js");
      await loadScript(SDK + "firebase-firestore-compat.js");
      firebase.initializeApp(window.NACHWEIS_CONFIG);
      firebase.initializeApp(window.VM_CONFIG, "vm");
      const P = firebase.auth.Auth.Persistence.LOCAL;
      await firebase.auth().setPersistence(P);
      await firebase.app("vm").auth().setPersistence(P);
      // Auf beide gespeicherten Anmeldungen warten
      const erst = (a) => new Promise((r) => { const u = a.onAuthStateChanged((x) => { u(); r(x); }); });
      const [u1] = await Promise.all([erst(firebase.auth()), erst(firebase.app("vm").auth())]);
      if (u1) fertig(); else zeigeLogin();
    } catch (e) {
      console.error(e);
      overlay('<div class="auth-card"><img class="auth-logo" src="vereinlogo.png" alt=""><h1 class="auth-title">Keine Verbindung</h1><p class="auth-err">Firebase ist nicht erreichbar. Internet prüfen und neu laden.</p><button class="btn btn--primary" onclick="location.reload()">Neu laden</button></div>');
    }
  }

  function logout() {
    if (DEMO) return location.reload();
    Promise.all([firebase.auth().signOut(), firebase.app("vm").auth().signOut()]).then(() => location.reload());
  }

  // ------------------------------------------------------------- Demo-Daten
  const demo = DEMO ? (function () {
    const store = { meisterschaften: {}, sonstiges: {}, rwk_saisons: {}, rwk_mannschaften: {}, rwk_wettkaempfe: {} };
    let n = 0;
    const id = () => "demo" + ++n;
    store.meisterschaften["2026__7__2.10"] = { jahr: 2026, nr: "7", disziplin: "2.10",
      vm: { qualifiziert: true },
      kreis: { datum: "2026-02-08", ort: "Stuttgart-Feuerbach", ringe: 352, platz: 4, qualifiziert: true },
      land: { datum: "2026-04-18", ort: "Pforzheim", ringe: 349, platz: 31, qualifiziert: false } };
    store.sonstiges.s1 = { jahr: 2026, nr: "7", datum: "2026-07-12", bezeichnung: "Pokalschießen SV Beispielstadt", disziplin: "2.10", ort: "Esslingen", ringe: 361, platz: 2 };
    store.rwk_saisons.sa = { name: "2025/2026" };
    store.rwk_mannschaften.ma = { saison: "sa", name: "Luftpistole I", disziplin: "2.10", klasse: "Kreisliga", mitglieder: ["7", "12", "3"] };
    store.rwk_wettkaempfe.w1 = { saison: "sa", mannschaft: "ma", runde: 1, datum: "2025-10-11", ort: "Heim", gegner: "SV Beispiel", jahr: 2025, ergebnisse: { "7": 355, "12": 341, "3": 338 }, teilnehmer: ["7", "12", "3"] };
    store.rwk_wettkaempfe.w2 = { saison: "sa", mannschaft: "ma", runde: 2, datum: "2026-01-17", ort: "Fellbach", gegner: "SGi Fellbach", jahr: 2026, ergebnisse: { "7": 358, "12": 344 }, teilnehmer: ["7", "12"] };
    store.rwk_wettkaempfe.w3 = { saison: "sa", mannschaft: "ma", runde: 3, datum: "2026-02-21", ort: "Heim", gegner: "SSV Musterhausen", jahr: 2026, ergebnisse: { "7": 350, "3": 336 }, teilnehmer: ["7", "3"] };
    const kader = [
      { nr: "3", vorname: "Max", nachname: "Muster" }, { nr: "7", vorname: "Erika", nachname: "Beispiel" },
      { nr: "12", vorname: "Paul", nachname: "Probe" }, { nr: "21", vorname: "Anna", nachname: "Test" },
    ];
    const vmJahr = {
      2026: { disziplinen: ["1.10", "2.10", "2.40"],
        ergebnisse: { "7__2.10": { summe: 361 }, "12__2.10": { summe: 344 }, "3__2.10": { summe: 365 }, "7__2.40": { summe: 271 } },
        durchgaenge: [{ tag: "2026-01-10", belegung: { 1: { nr: "7", id: "2.10" } } }] },
    };
    return { store, id, kader, vmJahr };
  })() : null;

  function pruefe(doc, filter) {
    return filter.every(([f, op, v]) => op === "array-contains" ? (doc[f] || []).indexOf(v) >= 0 : doc[f] === v);
  }

  // ------------------------------------- Schreib-/Lesezugriff „nachweise“
  async function liste(coll, filter) {
    await ready;
    filter = filter || [];
    if (DEMO) {
      return Object.keys(demo.store[coll]).map((k) => Object.assign({ id: k }, demo.store[coll][k])).filter((d) => pruefe(d, filter));
    }
    try {
      let q = db.collection(coll);
      filter.forEach(([f, op, v]) => { q = q.where(f, op, v); });
      const snap = await q.get();
      return snap.docs.map((d) => Object.assign({ id: d.id }, d.data()));
    } catch (e) { fehler("Laden", e); }
  }
  async function hole(coll, id) {
    await ready;
    if (DEMO) { const d = demo.store[coll][id]; return d ? Object.assign({ id: id }, d) : null; }
    try {
      const d = await db.collection(coll).doc(id).get();
      return d.exists ? Object.assign({ id: d.id }, d.data()) : null;
    } catch (e) { fehler("Laden", e); }
  }
  async function speichere(coll, id, data) {
    await ready;
    const sauber = JSON.parse(JSON.stringify(data)); // undefined-Felder raus
    delete sauber.id;
    if (DEMO) { id = id || demo.id(); demo.store[coll][id] = sauber; return id; }
    try {
      if (id) { await db.collection(coll).doc(id).set(sauber); return id; }
      const ref = await db.collection(coll).add(sauber);
      return ref.id;
    } catch (e) { fehler("Speichern", e); }
  }
  async function loesche(coll, id) {
    await ready;
    if (DEMO) { delete demo.store[coll][id]; return; }
    try { await db.collection(coll).doc(id).delete(); } catch (e) { fehler("Löschen", e); }
  }

  // ------------------------------------------- VM „schiessen“ – nur lesen
  let kaderCache = null;
  async function kader() {
    await ready;
    if (kaderCache) return kaderCache;
    let list = [];
    if (DEMO) list = demo.kader.slice();
    else if (vm) {
      try {
        const snap = await vm.collection("kader").get();
        list = snap.docs.map((d) => Object.assign({ nr: d.id }, d.data()));
      } catch (e) { console.warn("Kader nicht lesbar:", e.message); }
    }
    list.sort((a, b) => (parseInt(a.nr, 10) || 0) - (parseInt(b.nr, 10) || 0));
    kaderCache = list;
    return list;
  }
  function nameVon(list, nr) {
    const s = list.find((x) => String(x.nr) === String(nr));
    return s ? s.vorname + " " + s.nachname : "Nr. " + nr;
  }

  const vmCache = {};
  // { disziplinen:[ids], ergebnisse:{ "nr__disz": {summe,…} }, durchgaenge:[…] }
  async function vmJahr(jahr) {
    await ready;
    if (vmCache[jahr]) return vmCache[jahr];
    const leer = { disziplinen: [], ergebnisse: {}, durchgaenge: [] };
    if (DEMO) return (vmCache[jahr] = demo.vmJahr[jahr] || leer);
    if (!vm) return leer;
    try {
      const ref = vm.collection("vm").doc(String(jahr));
      const doc = await ref.get();
      const d = doc.exists ? doc.data() : {};
      const ergebnisse = Object.assign({}, d.ergebnisse || {});
      const [eSnap, dSnap] = await Promise.all([ref.collection("ergebnisse").get(), ref.collection("durchgaenge").get()]);
      eSnap.forEach((x) => { ergebnisse[x.id] = x.data(); });
      const durchgaenge = [];
      dSnap.forEach((x) => durchgaenge.push(x.data()));
      return (vmCache[jahr] = { disziplinen: d.disziplinen || [], ergebnisse: ergebnisse, durchgaenge: durchgaenge });
    } catch (e) {
      console.warn("VM " + jahr + " nicht lesbar:", e.message);
      return leer;
    }
  }
  // VM-Ergebnisse eines Schützen: [{ disziplin, ringe, platz, von, datum }]
  async function vmFuer(jahr, nr) {
    const v = await vmJahr(jahr);
    const out = [];
    Object.keys(v.ergebnisse).forEach((key) => {
      const [knr, disz] = key.split("__");
      const e = v.ergebnisse[key];
      if (String(knr) !== String(nr) || !e || e.summe == null) return;
      // Platz: Rang unter allen Ergebnissen dieser Disziplin (gleiche Ringzahl = gleicher Platz)
      const alle = Object.keys(v.ergebnisse)
        .filter((k) => k.split("__")[1] === disz && v.ergebnisse[k] && v.ergebnisse[k].summe != null)
        .map((k) => Number(v.ergebnisse[k].summe));
      const platz = alle.filter((s) => s > Number(e.summe)).length + 1;
      let tag = "";
      v.durchgaenge.forEach((dg) => {
        Object.values(dg.belegung || {}).forEach((b) => { if (b && String(b.nr) === String(nr) && b.id === disz) tag = dg.tag || tag; });
      });
      out.push({ disziplin: disz, ringe: Number(e.summe), platz: platz, von: alle.length, datum: tag });
    });
    return out;
  }

  // ---------------------------------------------------------------- Start
  function start() {
    if (DEMO) {
      document.querySelectorAll('a[href$=".html"]').forEach((a) => { a.href = a.getAttribute("href") + "?demo"; });
      balken("Demo-Modus: erfundene Beispieldaten, es wird nichts gespeichert.", "warnung");
      vmOk = true;
      resolveReady({ vmOk: true, demo: true });
      return;
    }
    init();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();

  return {
    ready, DEMO, logout, balken,
    esc, fmt, datum, heuteIso, zahl, diszLabel, diszName, jahre, diszOptionen, schuetzenAuswahl,
    liste, hole, speichere, loesche,
    kader, nameVon, vmJahr, vmFuer,
  };
})();
