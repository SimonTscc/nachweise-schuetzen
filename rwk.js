/* Rundenwettkämpfe (Vorstand): Saison → Mannschaften → Wettkämpfe.
   Gespeichert in „nachweise-schuetzen“:
     rwk_saisons/{auto}       = { name }
     rwk_mannschaften/{auto}  = { saison, name, disziplin, klasse, mitglieder:[nr] }
     rwk_wettkaempfe/{auto}   = { saison, mannschaft, runde, datum, ort, gegner,
                                  jahr, ergebnisse:{ nr: ringe }, teilnehmer:[nr] }
   „teilnehmer“ und „jahr“ braucht der Nachweis zum Suchen je Schütze. */
(function () {
  "use strict";
  const N = window.NW;
  const esc = N.esc;
  const el = (id) => document.getElementById(id);
  const MERK = "nw:saison";

  let kader = [];
  let saisons = [], saison = "";
  let mannschaften = [], mannschaft = null;
  let wettkaempfe = [];

  const name = (nr) => N.nameVon(kader, nr);
  const sortNr = (a, b) => (parseInt(a, 10) || 0) - (parseInt(b, 10) || 0);

  document.querySelectorAll("dialog [data-schliessen]").forEach((b) => b.addEventListener("click", () => b.closest("dialog").close()));

  // ------------------------------------------------------------- Saisons
  async function ladeSaisons(wahl) {
    saisons = (await N.liste("rwk_saisons")).sort((a, b) => String(b.name).localeCompare(String(a.name), "de", { numeric: true }));
    const merk = (() => { try { return localStorage.getItem(MERK); } catch (e) { return null; } })();
    saison = wahl || (saisons.some((s) => s.id === merk) ? merk : (saisons[0] || {}).id || "");
    el("saison").innerHTML = saisons.length
      ? saisons.map((s) => `<option value="${esc(s.id)}"${s.id === saison ? " selected" : ""}>${esc(s.name)}</option>`).join("")
      : "<option value=\"\">– noch keine Saison –</option>";
    await ladeMannschaften();
  }
  el("saison").addEventListener("change", () => { saison = el("saison").value; ladeMannschaften(); });

  el("btnSaison").addEventListener("click", () => {
    const f = el("formSaison");
    f.reset();
    const y = new Date().getFullYear();
    f.elements.name.value = new Date().getMonth() >= 6 ? y + "/" + (y + 1) : (y - 1) + "/" + y;
    el("dlgSaison").showModal();
  });
  el("formSaison").addEventListener("submit", async (e) => {
    e.preventDefault();
    const n = el("formSaison").elements.name.value.trim();
    if (!n) return;
    const id = await N.speichere("rwk_saisons", null, { name: n });
    el("dlgSaison").close();
    await ladeSaisons(id);
  });
  el("btnSaisonLoeschen").addEventListener("click", async () => {
    if (mannschaften.length) { alert("Erst alle Mannschaften dieser Saison löschen."); return; }
    if (!confirm("Leere Saison löschen?")) return;
    await N.loesche("rwk_saisons", saison);
    await ladeSaisons();
  });

  // --------------------------------------------------------- Mannschaften
  async function ladeMannschaften(wahlId) {
    try { if (saison) localStorage.setItem(MERK, saison); } catch (e) { /* egal */ }
    el("arbeit").hidden = !saison;
    mannschaften = saison ? (await N.liste("rwk_mannschaften", [["saison", "==", saison]])).sort((a, b) => String(a.name).localeCompare(String(b.name), "de", { numeric: true })) : [];
    el("btnSaisonLoeschen").hidden = !saison || mannschaften.length > 0;
    mannschaft = mannschaften.find((m) => m.id === (wahlId || (mannschaft && mannschaft.id))) || null;
    renderMannschaften();
    await ladeDetail();
  }
  function renderMannschaften() {
    el("mannschaften").innerHTML = mannschaften.length
      ? mannschaften.map((m) => `<li><button type="button" data-m="${esc(m.id)}" class="${mannschaft && mannschaft.id === m.id ? "aktiv" : ""}">${esc(m.name)}<small>${esc(N.diszLabel(m.disziplin))}${m.klasse ? " · " + esc(m.klasse) : ""} · ${(m.mitglieder || []).length} Schützen</small></button></li>`).join("")
      : '<li class="leer">Noch keine Mannschaft in dieser Saison.</li>';
  }
  el("mannschaften").addEventListener("click", (e) => {
    const b = e.target.closest("[data-m]");
    if (!b) return;
    mannschaft = mannschaften.find((m) => m.id === b.dataset.m);
    renderMannschaften();
    ladeDetail();
  });

  const dlgM = el("dlgMannschaft"), formM = el("formMannschaft");
  let mEdit = null;
  function mannschaftDialog(m) {
    mEdit = m;
    formM.reset();
    el("dlgMannschaftTitel").textContent = m ? "Mannschaft bearbeiten" : "Neue Mannschaft";
    el("mannschaftLoeschen").hidden = !m;
    formM.elements.disziplin.innerHTML = N.diszOptionen([], m ? m.disziplin : "");
    if (m) { formM.elements.name.value = m.name || ""; formM.elements.klasse.value = m.klasse || ""; }
    dlgM.showModal();
  }
  el("btnMannschaft").addEventListener("click", () => mannschaftDialog(null));
  formM.addEventListener("submit", async (e) => {
    e.preventDefault();
    const f = formM.elements;
    const doc = Object.assign({ saison: saison, mitglieder: [] }, mEdit || {}, { name: f.name.value.trim(), disziplin: f.disziplin.value, klasse: f.klasse.value.trim() });
    const id = await N.speichere("rwk_mannschaften", mEdit ? mEdit.id : null, doc);
    dlgM.close();
    await ladeMannschaften(id);
  });
  el("mannschaftLoeschen").addEventListener("click", async () => {
    if (!mEdit) return;
    const wk = await N.liste("rwk_wettkaempfe", [["mannschaft", "==", mEdit.id]]);
    if (!confirm("Mannschaft „" + mEdit.name + "“ löschen?" + (wk.length ? " Dabei werden auch ihre " + wk.length + " Wettkämpfe mit allen Ergebnissen gelöscht." : ""))) return;
    for (const w of wk) await N.loesche("rwk_wettkaempfe", w.id);
    await N.loesche("rwk_mannschaften", mEdit.id);
    dlgM.close();
    mannschaft = null;
    await ladeMannschaften();
  });

  // --------------------------------------------------------------- Detail
  async function ladeDetail() {
    if (!mannschaft) {
      el("detail").innerHTML = '<section class="panel"><p class="leer">Links eine Mannschaft wählen oder neu anlegen.</p></section>';
      return;
    }
    wettkaempfe = (await N.liste("rwk_wettkaempfe", [["mannschaft", "==", mannschaft.id]]))
      .sort((a, b) => (a.datum || "").localeCompare(b.datum || "") || (a.runde || 0) - (b.runde || 0));
    renderDetail();
  }

  // Alle Schützen, die in dieser Mannschaft vorkommen (Mitglieder + Ergebnisse von Ehemaligen)
  function spalten() {
    const set = new Set(mannschaft.mitglieder || []);
    wettkaempfe.forEach((w) => Object.keys(w.ergebnisse || {}).forEach((nr) => set.add(nr)));
    return [...set].sort(sortNr);
  }

  function renderDetail() {
    const m = mannschaft;
    const mitglieder = (m.mitglieder || []).slice().sort(sortNr);
    const sp = spalten();
    const tabelle = wettkaempfe.length
      ? '<div class="tabelle-wrap"><table class="tab"><thead><tr><th>Nr.</th><th>Datum</th><th>Ort / Gegner</th>' +
        sp.map((nr) => `<th class="zahl" title="${esc(name(nr))}">${esc(name(nr).split(" ").slice(-1)[0])}<br><small>${esc(nr)}</small></th>`).join("") +
        "<th></th></tr></thead><tbody>" +
        wettkaempfe.map((w) => `<tr><td>${esc(w.runde || "")}</td><td>${esc(N.datum(w.datum))}</td><td>${esc(w.ort || "")}${w.gegner ? "<br><small>gegen " + esc(w.gegner) + "</small>" : ""}</td>` +
          sp.map((nr) => `<td class="zahl">${esc(N.fmt((w.ergebnisse || {})[nr]))}</td>`).join("") +
          `<td><button type="button" class="btn btn--klein" data-wk="${esc(w.id)}">Ergebnisse</button></td></tr>`).join("") +
        "</tbody></table></div>"
      : '<p class="leer">Noch kein Wettkampf eingetragen.</p>';

    el("detail").innerHTML = `
      <section class="panel">
        <div class="leiste" style="justify-content:space-between;align-items:center">
          <div><h2>${esc(m.name)}</h2><p class="hinweis" style="margin:0">${esc(N.diszLabel(m.disziplin))}${m.klasse ? " · " + esc(m.klasse) : ""}</p></div>
          <button type="button" class="btn btn--klein" id="btnMEdit">Bearbeiten</button>
        </div>
        <h2 style="margin-top:14px;font-size:.95rem">Schützen der Mannschaft</h2>
        <div class="mitglieder">${mitglieder.length ? mitglieder.map((nr) => `<span class="chip">${esc(nr)} · ${esc(name(nr))}<button type="button" data-raus="${esc(nr)}" aria-label="${esc(name(nr))} entfernen">×</button></span>`).join("") : '<span class="leer">Noch niemand zugeordnet.</span>'}</div>
        <div class="feld">Schütze hinzufügen (anklicken = in die Mannschaft)
          <div id="neuMitglied"></div>
        </div>
      </section>
      <section class="panel">
        <div class="leiste" style="justify-content:space-between;align-items:center">
          <h2>Wettkämpfe und Ergebnisse</h2>
          <button type="button" class="btn btn--primary" id="btnWk"${mitglieder.length ? "" : " disabled"}>Neuer Wettkampf</button>
        </div>
        ${tabelle}
      </section>`;

    el("btnMEdit").addEventListener("click", () => mannschaftDialog(mannschaft));
    const neu = N.schuetzenAuswahl(el("neuMitglied"), { leerenNachWahl: true, onChange: mitgliedRein });
    neu.setKader(kader.filter((s) => mitglieder.indexOf(String(s.nr)) < 0));
    if (mitgliedFokus) { mitgliedFokus = false; neu.focus(); }
    el("detail").querySelectorAll("[data-raus]").forEach((b) => b.addEventListener("click", () => mitgliedRaus(b.dataset.raus)));
    el("btnWk").addEventListener("click", () => wettkampfDialog(null));
    el("detail").querySelectorAll("[data-wk]").forEach((b) => b.addEventListener("click", () => wettkampfDialog(wettkaempfe.find((w) => w.id === b.dataset.wk))));
  }

  async function speichereMannschaft() {
    await N.speichere("rwk_mannschaften", mannschaft.id, mannschaft);
    renderMannschaften();
    renderDetail();
  }
  let mitgliedFokus = false; // nach dem Hinzufügen gleich den nächsten suchen können
  async function mitgliedRein(nr) {
    if (!nr || (mannschaft.mitglieder || []).indexOf(nr) >= 0) return;
    mannschaft.mitglieder = (mannschaft.mitglieder || []).concat([nr]);
    mitgliedFokus = true;
    await speichereMannschaft();
  }
  async function mitgliedRaus(nr) {
    if (!confirm(name(nr) + " aus der Mannschaft nehmen? Bereits eingetragene Ergebnisse bleiben erhalten.")) return;
    mannschaft.mitglieder = (mannschaft.mitglieder || []).filter((x) => x !== nr);
    await speichereMannschaft();
  }

  // ------------------------------------------------------------ Wettkampf
  const dlgW = el("dlgWettkampf"), formW = el("formWettkampf");
  let wEdit = null;
  function wettkampfDialog(w) {
    wEdit = w;
    formW.reset();
    el("dlgWettkampfTitel").textContent = w ? "Wettkampf bearbeiten" : "Neuer Wettkampf";
    el("wettkampfLoeschen").hidden = !w;
    const f = formW.elements;
    if (w) { f.runde.value = w.runde || ""; f.datum.value = w.datum || ""; f.ort.value = w.ort || ""; f.gegner.value = w.gegner || ""; }
    else { f.runde.value = wettkaempfe.length + 1; f.datum.value = N.heuteIso(); }
    const erg = (w && w.ergebnisse) || {};
    const nrs = [...new Set((mannschaft.mitglieder || []).concat(Object.keys(erg)))].sort(sortNr);
    el("wkErgebnisse").innerHTML = '<table class="tab"><tbody>' +
      nrs.map((nr) => `<tr><td>${esc(nr)}</td><td>${esc(name(nr))}${(mannschaft.mitglieder || []).indexOf(nr) < 0 ? ' <span class="marke">nicht mehr in der Mannschaft</span>' : ""}</td><td class="zahl"><input class="erg-eingabe" type="text" inputmode="decimal" data-nr="${esc(nr)}" value="${esc(N.fmt(erg[nr]))}" aria-label="Ringe ${esc(name(nr))}"></td></tr>`).join("") +
      "</tbody></table>";
    dlgW.showModal();
  }
  formW.addEventListener("submit", async (e) => {
    e.preventDefault();
    const f = formW.elements;
    const ergebnisse = {};
    el("wkErgebnisse").querySelectorAll("[data-nr]").forEach((i) => { const z = N.zahl(i.value); if (z != null) ergebnisse[i.dataset.nr] = z; });
    const doc = {
      saison: saison, mannschaft: mannschaft.id, runde: N.zahl(f.runde.value), datum: f.datum.value,
      ort: f.ort.value.trim(), gegner: f.gegner.value.trim(), jahr: Number(f.datum.value.slice(0, 4)),
      ergebnisse: ergebnisse, teilnehmer: Object.keys(ergebnisse),
    };
    await N.speichere("rwk_wettkaempfe", wEdit ? wEdit.id : null, doc);
    dlgW.close();
    await ladeDetail();
  });
  el("wettkampfLoeschen").addEventListener("click", async () => {
    if (!wEdit || !confirm("Diesen Wettkampf mit allen Ergebnissen löschen?")) return;
    await N.loesche("rwk_wettkaempfe", wEdit.id);
    dlgW.close();
    await ladeDetail();
  });

  // --------------------------------------------------------------- Start
  (async function () {
    await N.ready;
    kader = await N.kader();
    await ladeSaisons();
  })();
})();
