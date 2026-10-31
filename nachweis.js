/* Nachweis je Schütze und Jahr: Meisterschaften, RWK, Sonstiges + Ausdruck.
   Gespeichert wird in „nachweise-schuetzen“:
     meisterschaften/{jahr__nr__disziplin} = { jahr, nr, disziplin,
       vm:{qualifiziert}, kreis:{datum,ort,ringe,platz,qualifiziert}, land:{…}, dm:{…} }
     sonstiges/{auto} = { jahr, nr, datum, bezeichnung, disziplin, ort, ringe, platz }
   VM-Ergebnisse werden nur gelesen (NW.vmFuer). */
(function () {
  "use strict";
  const N = window.NW;
  const esc = N.esc;

  const STUFEN = [
    { key: "kreis", name: "Kreismeisterschaft", quali: "qualifiziert für Land" },
    { key: "land", name: "Landesmeisterschaft", quali: "qualifiziert für Deutsche" },
    { key: "dm", name: "Deutsche Meisterschaft" },
  ];

  const el = (id) => document.getElementById(id);
  const elSchuetze = el("schuetze"), elJahr = el("jahr"), elDruck = el("btnDruck");
  const elMeldung = el("auswahlMeldung"), elInhalt = el("inhalt");

  let kader = [];
  let nr = "", jahr = new Date().getFullYear();
  let vmIds = [];          // Disziplinen der VM im Jahr
  let vmErg = [];          // VM-Ergebnisse des Schützen
  let meister = {};        // disziplin -> gespeichertes Dokument
  let extraDisz = [];      // neu hinzugefügt, noch nichts gespeichert
  let sonst = [];
  let rwk = [];            // [{ datum, ort, ringe, mannschaft, klasse, disziplin, runde, gegner }]

  // ------------------------------------------------------------ Auswahl
  elJahr.innerHTML = N.jahre().map((y) => `<option>${y}</option>`).join("");

  const auswahlFeld = N.schuetzenAuswahl(elSchuetze, { onChange: () => auswahl() });

  function urlMerken() {
    const p = new URLSearchParams(location.search);
    if (nr) p.set("nr", nr); else p.delete("nr");
    p.set("jahr", jahr);
    history.replaceState(null, "", "?" + p.toString().replace("demo=", "demo"));
  }

  async function auswahl() {
    const neu = auswahlFeld.getValue();
    jahr = Number(elJahr.value);
    if (!neu) {
      nr = "";
      elInhalt.hidden = true;
      elDruck.disabled = true;
      urlMerken();
      return;
    }
    nr = neu;
    elMeldung.textContent = "Lade …";
    urlMerken();
    await laden();
    elMeldung.textContent = "";
  }
  elJahr.addEventListener("change", auswahl);

  // -------------------------------------------------------------- Laden
  async function laden() {
    const [vmJ, erg, mDocs, sDocs, wks, mannschaften] = await Promise.all([
      N.vmJahr(jahr),
      N.vmFuer(jahr, nr),
      N.liste("meisterschaften", [["nr", "==", nr], ["jahr", "==", jahr]]),
      N.liste("sonstiges", [["nr", "==", nr], ["jahr", "==", jahr]]),
      N.liste("rwk_wettkaempfe", [["teilnehmer", "array-contains", nr]]),
      N.liste("rwk_mannschaften"),
    ]);
    vmIds = vmJ.disziplinen || [];
    vmErg = erg;
    meister = {};
    mDocs.forEach((d) => { meister[d.disziplin] = d; });
    extraDisz = [];
    sonst = sDocs.sort((a, b) => (a.datum || "").localeCompare(b.datum || ""));
    const mById = {};
    mannschaften.forEach((m) => { mById[m.id] = m; });
    rwk = wks
      .filter((w) => String(w.datum || "").slice(0, 4) === String(jahr))
      .map((w) => {
        const m = mById[w.mannschaft] || {};
        return { datum: w.datum, ort: w.ort, ringe: (w.ergebnisse || {})[nr], mannschaft: m.name || "", klasse: m.klasse || "", disziplin: m.disziplin || "", runde: w.runde, gegner: w.gegner || "" };
      })
      .filter((r) => r.ringe != null)
      .sort((a, b) => (a.datum || "").localeCompare(b.datum || ""));

    el("neueDisz").innerHTML = N.diszOptionen(vmIds, "");
    el("formSonst").elements.disziplin.innerHTML = N.diszOptionen(vmIds, "");
    elInhalt.hidden = false;
    elDruck.disabled = false;
    renderAlles();
  }

  function disziplinen() {
    const set = new Set();
    vmErg.forEach((e) => set.add(e.disziplin));
    Object.keys(meister).forEach((d) => set.add(d));
    extraDisz.forEach((d) => set.add(d));
    const reihe = window.DISZIPLIN_REIHENFOLGE || [];
    return [...set].sort((a, b) => reihe.indexOf(a) - reihe.indexOf(b));
  }
  const vmVon = (d) => vmErg.find((e) => e.disziplin === d) || null;

  // ------------------------------------------------------ Meisterschaften
  function renderMeister() {
    const liste = disziplinen();
    const box = el("meister");
    if (!liste.length) {
      box.innerHTML = '<p class="leer">Noch keine Meisterschaft in ' + jahr + ". Keine VM-Ergebnisse gefunden – Disziplin unten hinzufügen.</p>";
      return;
    }
    box.innerHTML = liste.map((d) => {
      const doc = meister[d] || {};
      const v = vmVon(d);
      const vmQ = doc.vm && doc.vm.qualifiziert;
      const vmZelle = v
        ? `<div class="vm-wert"><b>${esc(N.fmt(v.ringe))}</b> Ringe · Platz ${v.platz} von ${v.von}</div>` +
          (v.datum ? `<div class="vm-leer" style="font-style:normal">${esc(N.datum(v.datum))}</div>` : "") +
          '<span class="marke marke--blau">aus der VM</span>'
        : '<div class="vm-leer">kein VM-Ergebnis</div>';
      const stufen = STUFEN.map((s) => {
        const w = doc[s.key] || {};
        return `<div class="stufe" data-stufe="${s.key}">
          <h4>${s.name}</h4>
          <label>Datum<input type="date" data-f="datum" value="${esc(w.datum || "")}"></label>
          <label>Ort<input type="text" data-f="ort" value="${esc(w.ort || "")}"></label>
          <div class="zwei">
            <label>Ringe<input type="text" inputmode="decimal" data-f="ringe" value="${esc(N.fmt(w.ringe))}"></label>
            <label>Platz<input type="number" min="1" step="1" data-f="platz" value="${esc(w.platz || "")}"></label>
          </div>
          ${s.quali ? `<label class="check"><input type="checkbox" data-f="qualifiziert"${w.qualifiziert ? " checked" : ""}> ${s.quali}</label>` : ""}
        </div>`;
      }).join("");
      return `<div class="disz-block" data-disz="${esc(d)}">
        <div class="disz-kopf"><h3>${esc(N.diszLabel(d))}</h3>
          <span><span class="meldung ok" data-status></span>
          ${meister[d] ? '<button type="button" class="btn btn--klein btn--gefahr" data-loeschen>Einträge löschen</button>' : ""}</span>
        </div>
        <div class="stufen">
          <div class="stufe" data-stufe="vm"><h4>Vereinsmeisterschaft</h4>${vmZelle}
            <label class="check"><input type="checkbox" data-f="qualifiziert"${vmQ ? " checked" : ""}> gemeldet für Kreis</label>
          </div>
          ${stufen}
        </div>
      </div>`;
    }).join("");
    box.querySelectorAll(".disz-block").forEach(sperren);
  }

  // Land erst nach „qualifiziert für Land“ (Kreis), Deutsche erst nach
  // „qualifiziert für Deutsche“ (Land) eingebbar.
  const quali = (block, key) => { const c = block.querySelector(`[data-stufe="${key}"] [data-f="qualifiziert"]`); return !!(c && c.checked && !c.disabled); };
  function sperren(block) {
    const setze = (key, frei) => {
      const st = block.querySelector(`[data-stufe="${key}"]`);
      st.classList.toggle("gesperrt", !frei);
      st.querySelectorAll("[data-f]").forEach((i) => { i.disabled = !frei; });
    };
    setze("land", quali(block, "kreis"));
    setze("dm", quali(block, "land")); // erst nach Land, sonst gilt dessen alter Sperrzustand
  }
  function hatDaten(block, keys) {
    return keys.some((key) => [...block.querySelectorAll(`[data-stufe="${key}"] [data-f]`)].some((i) => i.type === "checkbox" ? i.checked : i.value.trim()));
  }

  function blockLesen(block) {
    const d = block.dataset.disz;
    const doc = { jahr: jahr, nr: nr, disziplin: d };
    block.querySelectorAll(".stufe").forEach((st) => {
      const key = st.dataset.stufe;
      if (st.classList.contains("gesperrt")) return; // gesperrte Stufe wird nicht gespeichert
      const w = {};
      st.querySelectorAll("[data-f]").forEach((i) => {
        const f = i.dataset.f;
        if (f === "qualifiziert") { if (i.checked) w.qualifiziert = true; }
        else if (f === "ringe") { const z = N.zahl(i.value); if (z != null) w.ringe = z; }
        else if (f === "platz") { const z = N.zahl(i.value); if (z != null) w.platz = z; }
        else if (i.value.trim()) w[f] = i.value.trim();
      });
      if (Object.keys(w).length) doc[key] = w;
    });
    return doc;
  }

  el("meister").addEventListener("change", async function (e) {
    const block = e.target.closest(".disz-block");
    if (!block) return;
    const t = e.target;
    if (t.dataset.f === "qualifiziert" && !t.checked) {
      const stufe = t.closest(".stufe").dataset.stufe;
      const folgende = stufe === "kreis" ? ["land", "dm"] : stufe === "land" ? ["dm"] : [];
      if (folgende.length && hatDaten(block, folgende) &&
          !confirm("Ohne diesen Haken werden die Einträge bei " + (folgende.length > 1 ? "Landes- und Deutscher Meisterschaft" : "Deutscher Meisterschaft") + " gelöscht. Fortfahren?")) {
        t.checked = true;
        return;
      }
      folgende.forEach((key) => block.querySelectorAll(`[data-stufe="${key}"] [data-f]`).forEach((i) => { if (i.type === "checkbox") i.checked = false; else i.value = ""; }));
    }
    sperren(block);
    const doc = blockLesen(block);
    const status = block.querySelector("[data-status]");
    status.className = "meldung";
    status.textContent = "speichert …";
    const id = jahr + "__" + nr + "__" + doc.disziplin;
    await N.speichere("meisterschaften", id, doc);
    const warNeu = !meister[doc.disziplin];
    meister[doc.disziplin] = Object.assign({ id: id }, doc);
    if (warNeu) { renderMeister(); }
    else { status.className = "meldung ok"; status.textContent = "gespeichert"; setTimeout(() => { status.textContent = ""; }, 2000); }
    renderDruck();
  });

  el("meister").addEventListener("click", async function (e) {
    const b = e.target.closest("[data-loeschen]");
    if (!b) return;
    const d = b.closest(".disz-block").dataset.disz;
    if (!confirm("Alle nachgetragenen Meisterschaften für " + N.diszLabel(d) + " (" + jahr + ") löschen? Das VM-Ergebnis bleibt.")) return;
    await N.loesche("meisterschaften", meister[d].id);
    delete meister[d];
    renderAlles();
  });

  el("btnDisz").addEventListener("click", function () {
    const d = el("neueDisz").value;
    if (!d) return;
    if (disziplinen().indexOf(d) < 0) extraDisz.push(d);
    el("neueDisz").value = "";
    renderMeister();
    const block = el("meister").querySelector(`[data-disz="${CSS.escape(d)}"]`);
    if (block) { block.scrollIntoView({ behavior: "smooth", block: "center" }); block.querySelector('[data-stufe="kreis"] input').focus(); }
  });

  // ---------------------------------------------------------------- RWK
  function renderRwk() {
    const box = el("rwk");
    if (!rwk.length) { box.innerHTML = '<p class="leer">Keine Rundenwettkämpfe in ' + jahr + ".</p>"; return; }
    box.innerHTML = '<div class="tabelle-wrap"><table class="tab"><thead><tr><th>Datum</th><th>Disziplin</th><th>Mannschaft</th><th>Ort</th><th class="zahl">Ringe</th></tr></thead><tbody>' +
      rwk.map((r) => `<tr><td>${esc(N.datum(r.datum))}</td><td>${esc(N.diszLabel(r.disziplin))}</td><td>${esc(r.mannschaft)}${r.klasse ? " · " + esc(r.klasse) : ""}</td><td>${esc(r.ort)}</td><td class="zahl">${esc(N.fmt(r.ringe))}</td></tr>`).join("") +
      "</tbody></table></div>";
  }

  // ----------------------------------------------------------- Sonstiges
  function renderSonst() {
    const box = el("sonstiges");
    if (!sonst.length) { box.innerHTML = '<p class="leer">Keine Einträge.</p>'; return; }
    box.innerHTML = '<div class="tabelle-wrap"><table class="tab"><thead><tr><th>Datum</th><th>Wettkampf</th><th>Disziplin</th><th>Ort</th><th class="zahl">Ringe</th><th class="zahl">Platz</th><th></th></tr></thead><tbody>' +
      sonst.map((s) => `<tr><td>${esc(N.datum(s.datum))}</td><td>${esc(s.bezeichnung)}</td><td>${esc(N.diszLabel(s.disziplin))}</td><td>${esc(s.ort)}</td><td class="zahl">${esc(N.fmt(s.ringe))}</td><td class="zahl">${esc(s.platz || "")}</td><td><button type="button" class="btn btn--klein" data-sonst="${esc(s.id)}">Ändern</button></td></tr>`).join("") +
      "</tbody></table></div>";
  }

  const dlg = el("dlgSonst"), form = el("formSonst");
  let sonstId = null;
  function sonstOeffnen(s) {
    sonstId = s ? s.id : null;
    form.reset();
    el("sonstFehler").textContent = "";
    el("dlgSonstTitel").textContent = s ? "Wettkampf ändern" : "Sonstiger Wettkampf";
    el("sonstLoeschen").hidden = !s;
    const f = form.elements;
    if (s) {
      f.bezeichnung.value = s.bezeichnung || ""; f.disziplin.value = s.disziplin || "";
      f.datum.value = s.datum || ""; f.ort.value = s.ort || "";
      f.ringe.value = N.fmt(s.ringe); f.platz.value = s.platz || "";
    } else {
      f.datum.value = String(jahr) === N.heuteIso().slice(0, 4) ? N.heuteIso() : jahr + "-01-01";
    }
    dlg.showModal();
  }
  el("btnSonst").addEventListener("click", () => sonstOeffnen(null));
  el("sonstiges").addEventListener("click", (e) => {
    const b = e.target.closest("[data-sonst]");
    if (b) sonstOeffnen(sonst.find((s) => s.id === b.dataset.sonst));
  });
  el("sonstAbbrechen").addEventListener("click", () => dlg.close());
  form.addEventListener("submit", async function (e) {
    e.preventDefault();
    const f = form.elements;
    if (f.datum.value.slice(0, 4) !== String(jahr)) {
      el("sonstFehler").textContent = "Das Datum liegt nicht im Jahr " + jahr + ". Für ein anderes Jahr oben das Jahr wechseln.";
      return;
    }
    const doc = {
      jahr: jahr, nr: nr, bezeichnung: f.bezeichnung.value.trim(), disziplin: f.disziplin.value,
      datum: f.datum.value, ort: f.ort.value.trim(), ringe: N.zahl(f.ringe.value), platz: N.zahl(f.platz.value),
    };
    const id = await N.speichere("sonstiges", sonstId, doc);
    sonst = sonst.filter((s) => s.id !== id).concat([Object.assign({ id: id }, doc)]).sort((a, b) => (a.datum || "").localeCompare(b.datum || ""));
    dlg.close();
    renderSonst(); renderDruck();
  });
  el("sonstLoeschen").addEventListener("click", async function () {
    if (!sonstId || !confirm("Diesen Eintrag löschen?")) return;
    await N.loesche("sonstiges", sonstId);
    sonst = sonst.filter((s) => s.id !== sonstId);
    dlg.close();
    renderSonst(); renderDruck();
  });

  // ------------------------------------------------------------ Ausdruck
  function zelle(w, quali) {
    if (!w || (!w.datum && !w.ort && w.ringe == null && w.platz == null)) {
      return quali ? '<span class="q">' + quali + " ✓</span>" : "–";
    }
    const z1 = [N.datum(w.datum), w.ort].filter(Boolean).map(esc).join(", ");
    const z2 = [w.ringe != null ? '<span class="r">' + esc(N.fmt(w.ringe)) + " Ringe</span>" : "", w.platz ? "Platz " + esc(w.platz) : ""].filter(Boolean).join(" · ");
    return `<div class="zelle-stufe">${z1 ? z1 + "<br>" : ""}${z2}${quali ? '<br><span class="q">' + quali + " ✓</span>" : ""}</div>`;
  }

  function renderDruck() {
    const name = N.nameVon(kader, nr);
    let anzahl = 0;
    const zeilen = disziplinen().map((d) => {
      const doc = meister[d] || {};
      const v = vmVon(d);
      if (v) anzahl++;
      const vmQ = doc.vm && doc.vm.qualifiziert ? "gemeldet für Kreis" : "";
      const vmW = v ? { datum: v.datum, ort: v.datum ? window.VEREIN.vmOrt : "", ringe: v.ringe, platz: v.platz } : null;
      const zellen = STUFEN.map((s) => {
        const w = doc[s.key];
        if (w && (w.datum || w.ringe != null || w.platz != null)) anzahl++;
        return `<td>${zelle(w, w && w.qualifiziert ? s.quali : "")}</td>`;
      }).join("");
      return `<tr><td><b>${esc(N.diszName(d))}</b><br><span style="color:#555">${esc((window.DISZIPLINEN[d] || {}).nummer || "")}</span></td><td>${zelle(vmW, vmQ)}</td>${zellen}</tr>`;
    });
    const meisterHtml = zeilen.length
      ? '<table><thead><tr><th style="width:18%">Disziplin</th><th>Vereinsmeisterschaft</th><th>Kreismeisterschaft</th><th>Landesmeisterschaft</th><th>Deutsche Meisterschaft</th></tr></thead><tbody>' + zeilen.join("") + "</tbody></table>"
      : '<p class="nichts">Keine Meisterschaften.</p>';

    // RWK nach Disziplin gruppiert
    let rwkHtml = '<p class="nichts">Keine Rundenwettkämpfe.</p>';
    if (rwk.length) {
      const gruppen = {};
      rwk.forEach((r) => { (gruppen[r.disziplin] = gruppen[r.disziplin] || []).push(r); });
      rwkHtml = '<table><thead><tr><th style="width:14%">Datum</th><th>Mannschaft / Klasse</th><th>Begegnung</th><th>Ort</th><th class="zahl">Ringe</th></tr></thead><tbody>' +
        Object.keys(gruppen).map((d) =>
          `<tr class="disz-zwischen"><td colspan="5">${esc(N.diszLabel(d))} · ${gruppen[d].length} Wettkämpfe</td></tr>` +
          gruppen[d].map((r) => `<tr><td>${esc(N.datum(r.datum))}</td><td>${esc(r.mannschaft)}${r.klasse ? ", " + esc(r.klasse) : ""}</td><td>${r.runde ? esc(r.runde) + ". Wettkampf" : ""}${r.gegner ? " gegen " + esc(r.gegner) : ""}</td><td>${esc(r.ort)}</td><td class="zahl">${esc(N.fmt(r.ringe))}</td></tr>`).join("")
        ).join("") + "</tbody></table>";
      anzahl += rwk.length;
    }

    let sonstHtml = '<p class="nichts">Keine sonstigen Wettkämpfe.</p>';
    if (sonst.length) {
      sonstHtml = '<table><thead><tr><th style="width:14%">Datum</th><th>Wettkampf</th><th>Disziplin</th><th>Ort</th><th class="zahl">Ringe</th><th class="zahl">Platz</th></tr></thead><tbody>' +
        sonst.map((s) => `<tr><td>${esc(N.datum(s.datum))}</td><td>${esc(s.bezeichnung)}</td><td>${esc(N.diszName(s.disziplin))}</td><td>${esc(s.ort)}</td><td class="zahl">${esc(N.fmt(s.ringe))}</td><td class="zahl">${esc(s.platz || "")}</td></tr>`).join("") +
        "</tbody></table>";
      anzahl += sonst.length;
    }

    el("druck").innerHTML = `
      <div class="druck-kopf">
        <img src="vereinlogo.png" alt="">
        <div><div class="verein">${esc(window.VEREIN.name)}</div><h1>Wettkampfnachweis ${jahr}</h1></div>
      </div>
      <div class="druck-person"><span>Schütze: <b>${esc(name)}</b></span><span>Mitgliedsnummer: <b>${esc(nr)}</b></span></div>
      <h2>Meisterschaften</h2>${meisterHtml}
      <h2>Rundenwettkämpfe</h2>${rwkHtml}
      <h2>Sonstige Wettkämpfe</h2>${sonstHtml}
      <p class="summe">Wettkampfteilnahmen im Jahr ${jahr} insgesamt: <b>${anzahl}</b></p>
      <div class="druck-fuss">
        <p>Der Verein bestätigt, dass die oben aufgeführten Wettkämpfe von ${esc(name)} geschossen wurden.</p>
        <div class="unterschriften">
          <div>Ort, Datum</div>
          <div>Unterschrift und Stempel des Vereins</div>
        </div>
      </div>
      <p class="druck-ausgabe">Erstellt am ${esc(N.datum(N.heuteIso()))} mit „Nachweise für Schützen“</p>`;
  }

  function renderAlles() { renderMeister(); renderRwk(); renderSonst(); renderDruck(); }

  elDruck.addEventListener("click", () => { renderDruck(); window.print(); });

  // --------------------------------------------------------------- Start
  (async function () {
    await N.ready;
    kader = await N.kader();
    auswahlFeld.setKader(kader);
    const p = new URLSearchParams(location.search);
    if (p.get("jahr")) elJahr.value = p.get("jahr");
    else elJahr.value = String(new Date().getFullYear());
    if (p.get("nr")) { auswahlFeld.setValue(p.get("nr")); auswahl(); }
  })();
})();
