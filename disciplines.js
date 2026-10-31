/* =========================================================================
   DSB-Disziplin-Katalog (Gewehr + Pistole, ringbasiert)
   -------------------------------------------------------------------------
   Quellen: DSB Sportordnung 2026, Übersichten Sächsischer Schützenbund,
   SV Tell-Kirchen, Vegesacker SV. SpO-Nummern und Namen nach dieser
   Sportordnung; Schussprogramme als übliche Wettkampf-/Rundenwettkampf-
   Programme. Alles frei editierbar – bei abweichender Ausschreibung
   (z. B. Kreis Stuttgart) einfach die Werte unten anpassen.

   Ringbasiert mit Schuss-Eingabe: Gewehr 1.xx, Pistole 2.xx und die
   WSV-Landesdisziplinen (WT, DSB „Liste B“). Flinte, Bogen, Armbrust,
   Laufende Scheibe, Vorderlader und Klappscheibe (WT 4.1) nur mit
   Endergebnis.

   Zwei Programmlängen (Liga 40 / Meisterschaft 60) gibt es nur dort, wo sie
   tatsächlich Standard sind: Luftgewehr, Luftpistole.
   VM-Vorgaben des Vereins: Freie Pistole 30 Schuss, Sportpistole 15 + 15.

   Auflage-Disziplinen sind mit `dezimal: true` markiert und werden in
   Zehnteln erfasst (0,0–10,9); alle übrigen in ganzen Ringen.

   Feldbeschreibung je teil: key, label, schuss, serie (Schuss je Serie),
   cssClass ("teil-praezision" grün | "teil-20s" blau), startNr (optional).
   ========================================================================= */

(function () {
  "use strict";

  // ---- Programm-Bausteine ------------------------------------------------

  // Ein durchgehender Block (z. B. Luftgewehr, Liegendkampf)
  function einzel(schuss, serie) {
    return [{ key: "wertung", label: "Wertung", schuss: schuss, serie: serie || 10, cssClass: "teil-praezision" }];
  }

  // Dreistellungskampf: Kniend / Liegend / Stehend (Anzeigereihenfolge)
  function stellung(proStellung) {
    return [
      { key: "kniend", label: "Kniend", schuss: proStellung, serie: 10, cssClass: "teil-praezision" },
      { key: "liegend", label: "Liegend", schuss: proStellung, serie: 10, cssClass: "teil-20s" },
      { key: "stehend", label: "Stehend", schuss: proStellung, serie: 10, cssClass: "teil-praezision" },
    ];
  }

  // 25-m-Pistole: Präzision + Duell, je Serien à 5
  function praezisionDuell(proTeil) {
    return [
      { key: "praezision", label: "Präzision", schuss: proTeil, serie: 5, cssClass: "teil-praezision" },
      { key: "duell", label: "Duell", schuss: proTeil, serie: 5, cssClass: "teil-20s" },
    ];
  }

  // Zwei Zeit-Teile à Serien zu 5 (z. B. 150 s + 20 s)
  function zeitTeile(zeitA, zeitB, proTeil) {
    return [
      { key: "s" + zeitA, label: zeitA + " s", schuss: proTeil, serie: 5, cssClass: "teil-praezision" },
      { key: "s" + zeitB, label: zeitB + " s", schuss: proTeil, serie: 5, cssClass: "teil-20s" },
    ];
  }

  // Zwei Anschläge nacheinander (z. B. stehend + liegend)
  function zweiAnschlaege(a, b, proTeil, serie) {
    return [
      { key: a.toLowerCase(), label: a, schuss: proTeil, serie: serie, cssClass: "teil-praezision" },
      { key: b.toLowerCase(), label: b, schuss: proTeil, serie: serie, cssClass: "teil-20s" },
    ];
  }

  // Endergebnis-Disziplin: kein Ringraster, es wird nur das Gesamtergebnis
  // eingetragen (z. B. Flinte = Treffer, Bogen/Vorderlader/Laufende Scheibe).
  function ende(nr, name, kategorie) {
    return { id: nr, nummer: nr, name: name, kategorie: kategorie, endergebnis: true };
  }

  // ---- Disziplinen (Reihenfolge = Anzeigereihenfolge) --------------------
  // kategorie gruppiert die Auswahlseite.
  const LISTE = [
    // ===== Gewehr – Luftdruck =====
    { id: "1.10", nummer: "1.10", name: "Luftgewehr", kategorie: "Gewehr · Luftdruck",
      beschreibung: "10 m, stehend, 40 Schuss (Rundenwettkampf).", teile: einzel(40, 10) },
    { id: "1.10-m", nummer: "1.10", name: "Luftgewehr (Meisterschaft)", kategorie: "Gewehr · Luftdruck",
      beschreibung: "10 m, stehend, 60 Schuss.", teile: einzel(60, 10) },
    { id: "1.11", nummer: "1.11", name: "Luftgewehr Auflage", kategorie: "Gewehr · Luftdruck",
      beschreibung: "10 m, aufgelegt, 30 Schuss, Zehntelwertung.", dezimal: true, teile: einzel(30, 10) },
    { id: "1.20", nummer: "1.20", name: "Luftgewehr 3-Stellung", kategorie: "Gewehr · Luftdruck",
      beschreibung: "10 m, kniend/liegend/stehend, 3 × 20 Schuss.", teile: stellung(20) },

    // ===== Gewehr – Zimmerstutzen =====
    { id: "1.30", nummer: "1.30", name: "Zimmerstutzen", kategorie: "Gewehr · Zimmerstutzen",
      beschreibung: "15 m, 30 Schuss.", teile: einzel(30, 10) },
    { id: "1.31", nummer: "1.31", name: "Zimmerstutzen Auflage", kategorie: "Gewehr · Zimmerstutzen",
      beschreibung: "15 m, aufgelegt, 30 Schuss, Zehntelwertung.", dezimal: true, teile: einzel(30, 10) },

    // ===== Gewehr – Kleinkaliber =====
    { id: "1.35", nummer: "1.35", name: "KK-Gewehr 100 m", kategorie: "Gewehr · Kleinkaliber",
      beschreibung: "100 m, 30 Schuss.", teile: einzel(30, 10) },
    { id: "1.36", nummer: "1.36", name: "KK-Gewehr 100 m Auflage", kategorie: "Gewehr · Kleinkaliber",
      beschreibung: "100 m, aufgelegt (Diopter), 30 Schuss, Zehntelwertung.", dezimal: true, teile: einzel(30, 10) },
    { id: "1.40", nummer: "1.40", name: "KK-Sportgewehr 50 m 3-Stellung", kategorie: "Gewehr · Kleinkaliber",
      beschreibung: "50 m, kniend/liegend/stehend, 3 × 20 Schuss.", teile: stellung(20) },
    { id: "1.41", nummer: "1.41", name: "KK-Sportgewehr Auflage 50 m", kategorie: "Gewehr · Kleinkaliber",
      beschreibung: "50 m, aufgelegt, 30 Schuss, Zehntelwertung.", dezimal: true, teile: einzel(30, 10) },
    { id: "1.42", nummer: "1.42", name: "KK-Gewehr 50 m Zielfernrohr", kategorie: "Gewehr · Kleinkaliber",
      beschreibung: "50 m, Zielfernrohr, 30 Schuss.", teile: einzel(30, 10) },
    { id: "1.43", nummer: "1.43", name: "KK-Gewehr 50 m Zielfernrohr aufgelegt", kategorie: "Gewehr · Kleinkaliber",
      beschreibung: "50 m, Zielfernrohr, aufgelegt, 30 Schuss, Zehntelwertung.", dezimal: true, teile: einzel(30, 10) },
    { id: "1.44", nummer: "1.44", name: "KK-Gewehr 100 m Zielfernrohr aufgelegt", kategorie: "Gewehr · Kleinkaliber",
      beschreibung: "100 m, Zielfernrohr, aufgelegt, 30 Schuss, Zehntelwertung.", dezimal: true, teile: einzel(30, 10) },
    { id: "1.45", nummer: "1.45", name: "KK-Sportgewehr 50 m Mehrlader", kategorie: "Gewehr · Kleinkaliber",
      beschreibung: "50 m, Mehrlader, 30 Schuss.", teile: einzel(30, 10) },
    { id: "1.60", nummer: "1.60", name: "KK-Freigewehr 50 m 3 × 40", kategorie: "Gewehr · Kleinkaliber",
      beschreibung: "50 m, kniend/liegend/stehend, 3 × 40 Schuss.", teile: stellung(40) },
    { id: "1.80", nummer: "1.80", name: "KK-Liegendkampf 50 m", kategorie: "Gewehr · Kleinkaliber",
      beschreibung: "50 m, liegend, 60 Schuss.", teile: einzel(60, 10) },
    { id: "1.85", nummer: "1.85", name: "KK-Liegendkampf Mehrlader 50 m", kategorie: "Gewehr · Kleinkaliber",
      beschreibung: "50 m, liegend, Mehrlader, 60 Schuss.", teile: einzel(60, 10) },

    // ===== Gewehr – Großkaliber =====
    { id: "1.37", nummer: "1.37", name: "GK-Feuerstutzen 50 m", kategorie: "Gewehr · Großkaliber",
      beschreibung: "50 m, 60 Schuss.", teile: einzel(60, 10) },
    { id: "1.38", nummer: "1.38", name: "GK-Feuerstutzen 100 m", kategorie: "Gewehr · Großkaliber",
      beschreibung: "100 m, 60 Schuss.", teile: einzel(60, 10) },
    { id: "1.50", nummer: "1.50", name: "GK-Standardgewehr 300 m 3 × 40", kategorie: "Gewehr · Großkaliber",
      beschreibung: "300 m, Dreistellung, 3 × 40 Schuss.", teile: stellung(40) },
    { id: "1.51", nummer: "1.51", name: "GK-Standardgewehr 300 m 3 × 20", kategorie: "Gewehr · Großkaliber",
      beschreibung: "300 m, Dreistellung, 3 × 20 Schuss.", teile: stellung(20) },
    { id: "1.52", nummer: "1.52", name: "GK-Standardgewehr 300 m liegend", kategorie: "Gewehr · Großkaliber",
      beschreibung: "300 m, liegend, 40 Schuss.", teile: einzel(40, 10) },
    { id: "1.53", nummer: "1.53", name: "GK-Standardgewehr Mehrlader 3 × 40", kategorie: "Gewehr · Großkaliber",
      beschreibung: "300 m, Mehrlader, Dreistellung, 3 × 40 Schuss.", teile: stellung(40) },
    { id: "1.54", nummer: "1.54", name: "GK-Standardgewehr Mehrlader 3 × 20", kategorie: "Gewehr · Großkaliber",
      beschreibung: "300 m, Mehrlader, Dreistellung, 3 × 20 Schuss.", teile: stellung(20) },
    { id: "1.55", nummer: "1.55", name: "GK-Standardgewehr Mehrlader liegend", kategorie: "Gewehr · Großkaliber",
      beschreibung: "300 m, Mehrlader, liegend, 40 Schuss.", teile: einzel(40, 10) },
    { id: "1.56", nummer: "1.56", name: "Unterhebelrepetierer 3 × 40", kategorie: "Gewehr · Großkaliber",
      beschreibung: "300 m, Dreistellung, 3 × 40 Schuss.", teile: stellung(40) },
    { id: "1.57", nummer: "1.57", name: "Unterhebelrepetierer 3 × 20", kategorie: "Gewehr · Großkaliber",
      beschreibung: "300 m, Dreistellung, 3 × 20 Schuss.", teile: stellung(20) },
    { id: "1.58-o", nummer: "1.58 O", name: "Ordonnanzgewehr 100 m 3 × 40", kategorie: "Gewehr · Großkaliber",
      beschreibung: "100 m, Dreistellung, 3 × 40 Schuss.", teile: stellung(40) },
    { id: "1.58-g", nummer: "1.58 G", name: "Ordonnanzgewehr 100 m 3 × 20", kategorie: "Gewehr · Großkaliber",
      beschreibung: "100 m, Dreistellung, 3 × 20 Schuss.", teile: stellung(20) },
    { id: "1.59", nummer: "1.59", name: "GK-Sportgewehr 300 m", kategorie: "Gewehr · Großkaliber",
      beschreibung: "300 m, Dreistellung, 3 × 40 Schuss.", teile: stellung(40) },
    { id: "1.70", nummer: "1.70", name: "GK-Freigewehr 300 m", kategorie: "Gewehr · Großkaliber",
      beschreibung: "300 m, Dreistellung, 3 × 40 Schuss.", teile: stellung(40) },
    { id: "1.71", nummer: "1.71", name: "GK-Freigewehr 50 m", kategorie: "Gewehr · Großkaliber",
      beschreibung: "50 m, Dreistellung, 3 × 40 Schuss.", teile: stellung(40) },
    { id: "1.72", nummer: "1.72", name: "GK-Freigewehr 100 m", kategorie: "Gewehr · Großkaliber",
      beschreibung: "100 m, Dreistellung, 3 × 40 Schuss.", teile: stellung(40) },
    { id: "1.90", nummer: "1.90", name: "GK-Liegendkampf 300 m", kategorie: "Gewehr · Großkaliber",
      beschreibung: "300 m, liegend, 40 Schuss.", teile: einzel(40, 10) },
    { id: "1.91", nummer: "1.91", name: "GK-Liegendkampf 50 m", kategorie: "Gewehr · Großkaliber",
      beschreibung: "50 m, liegend, 40 Schuss.", teile: einzel(40, 10) },
    { id: "1.92", nummer: "1.92", name: "GK-Liegendkampf 100 m", kategorie: "Gewehr · Großkaliber",
      beschreibung: "100 m, liegend, 40 Schuss.", teile: einzel(40, 10) },
    { id: "1.95", nummer: "1.95", name: "GK-Liegendkampf Mehrlader 300 m", kategorie: "Gewehr · Großkaliber",
      beschreibung: "300 m, liegend, Mehrlader, 40 Schuss.", teile: einzel(40, 10) },
    { id: "1.96", nummer: "1.96", name: "GK-Liegendkampf Mehrlader 50 m", kategorie: "Gewehr · Großkaliber",
      beschreibung: "50 m, liegend, Mehrlader, 40 Schuss.", teile: einzel(40, 10) },
    { id: "1.97", nummer: "1.97", name: "GK-Liegendkampf Mehrlader 100 m", kategorie: "Gewehr · Großkaliber",
      beschreibung: "100 m, liegend, Mehrlader, 40 Schuss.", teile: einzel(40, 10) },

    // ===== Pistole – Luftdruck =====
    { id: "2.10", nummer: "2.10", name: "Luftpistole", kategorie: "Pistole · Luftdruck",
      beschreibung: "10 m, 40 Schuss (Rundenwettkampf).", teile: einzel(40, 10) },
    { id: "2.10-m", nummer: "2.10", name: "Luftpistole (Meisterschaft)", kategorie: "Pistole · Luftdruck",
      beschreibung: "10 m, 60 Schuss.", teile: einzel(60, 10) },
    { id: "2.11", nummer: "2.11", name: "Luftpistole Auflage", kategorie: "Pistole · Luftdruck",
      beschreibung: "10 m, aufgelegt, 30 Schuss, Zehntelwertung.", dezimal: true, teile: einzel(30, 10) },
    { id: "2.16", nummer: "2.16", name: "Mehrschüssige Luftpistole", kategorie: "Pistole · Luftdruck",
      beschreibung: "10 m, mehrschüssig, 40 Schuss.", teile: einzel(40, 10) },
    { id: "2.17", nummer: "2.17", name: "Luftpistole Mehrkampf", kategorie: "Pistole · Luftdruck",
      beschreibung: "10 m, 5-schüssige LP, 4 × 5 Präzision (150 s) + 4 × 5 Duell (3 s / 7 s).",
      teile: praezisionDuell(20) },
    { id: "2.18", nummer: "2.18", name: "Luftpistole Standard", kategorie: "Pistole · Luftdruck",
      beschreibung: "10 m, 5-schüssige LP, 4 × 5 Präzision (150 s) + 4 × 5 Schnellfeuer (20 s).",
      teile: zeitTeile(150, 20, 20) },

    // ===== Pistole – 25 m =====
    { id: "2.30", nummer: "2.30", name: "Schnellfeuerpistole", kategorie: "Pistole · 25 m",
      beschreibung: "25 m, 2 Durchgänge à 30 Schuss, Serien à 5.",
      teile: [
        { key: "durchgang1", label: "Durchgang 1", schuss: 30, serie: 5, cssClass: "teil-praezision" },
        { key: "durchgang2", label: "Durchgang 2", schuss: 30, serie: 5, cssClass: "teil-20s" },
      ] },
    { id: "2.40", nummer: "2.40", name: "Sportpistole 25 m", kategorie: "Pistole · 25 m",
      beschreibung: "25 m, 15 Präzision + 15 Duell, Serien à 5.", teile: praezisionDuell(15) },
    { id: "2.42", nummer: "2.42", name: "Sportpistole 25 m Auflage", kategorie: "Pistole · 25 m",
      beschreibung: "25 m, sitzend/stehend aufgelegt, 6 × 5 Schuss Präzision (je 150 s), Zehntelwertung.",
      dezimal: true, teile: einzel(30, 5) },
    { id: "2.45", nummer: "2.45", name: "Zentralfeuerpistole 25 m", kategorie: "Pistole · 25 m",
      beschreibung: "25 m, 30 Präzision + 30 Duell, Serien à 5.", teile: praezisionDuell(30) },
    { id: "2.51", nummer: "2.51", name: "Großkaliberpistole .30", kategorie: "Pistole · 25 m",
      beschreibung: "25 m, 20 Präzision + 20 Duell, Serien à 5.", teile: praezisionDuell(20) },
    { id: "2.52", nummer: "2.52", name: "Großkaliberpistole .32", kategorie: "Pistole · 25 m",
      beschreibung: "25 m, 20 Präzision + 20 Duell, Serien à 5.", teile: praezisionDuell(20) },
    { id: "2.53", nummer: "2.53", name: "Pistole 9 mm (Präzision + 20 s)", kategorie: "Pistole · 25 m",
      beschreibung: "25 m, 20 Schuss Präzision + 20 Schuss 20 s, Serien à 5.",
      teile: [
        { key: "praezision", label: "Präzision", schuss: 20, serie: 5, cssClass: "teil-praezision" },
        { key: "schnell", label: "20 s", schuss: 20, serie: 5, cssClass: "teil-20s" },
      ] },
    { id: "2.54", nummer: "2.54", name: "Großkaliberpistole .38", kategorie: "Pistole · 25 m",
      beschreibung: "25 m, 20 Präzision + 20 Duell, Serien à 5.", teile: praezisionDuell(20) },
    { id: "2.55", nummer: "2.55", name: "Revolver .357 Magnum", kategorie: "Pistole · 25 m",
      beschreibung: "25 m, 20 Präzision + 20 Duell, Serien à 5.", teile: praezisionDuell(20) },
    { id: "2.56", nummer: "2.56", name: "Großkaliberpistole 10 mm", kategorie: "Pistole · 25 m",
      beschreibung: "25 m, 20 Präzision + 20 Duell, Serien à 5.", teile: praezisionDuell(20) },
    { id: "2.57", nummer: "2.57", name: "Großkaliberrevolver .41", kategorie: "Pistole · 25 m",
      beschreibung: "25 m, 20 Präzision + 20 Duell, Serien à 5.", teile: praezisionDuell(20) },
    { id: "2.58", nummer: "2.58", name: "Revolver .44 Magnum", kategorie: "Pistole · 25 m",
      beschreibung: "25 m, 20 Präzision + 20 Duell, Serien à 5.", teile: praezisionDuell(20) },
    { id: "2.59", nummer: "2.59", name: "Pistole .45", kategorie: "Pistole · 25 m",
      beschreibung: "25 m, 20 Präzision + 20 Duell, Serien à 5.", teile: praezisionDuell(20) },
    { id: "2.60", nummer: "2.60", name: "Standardpistole 25 m", kategorie: "Pistole · 25 m",
      beschreibung: "25 m, 3 × 20 Schuss (150 s / 20 s / 10 s), Serien à 5.",
      teile: [
        { key: "s150", label: "150 s", schuss: 20, serie: 5, cssClass: "teil-praezision" },
        { key: "s20", label: "20 s", schuss: 20, serie: 5, cssClass: "teil-20s" },
        { key: "s10", label: "10 s", schuss: 20, serie: 5, cssClass: "teil-praezision" },
      ] },

    // ===== Pistole – 50 m =====
    { id: "2.20", nummer: "2.20", name: "Freie Pistole 50 m", kategorie: "Pistole · 50 m",
      beschreibung: "50 m, 30 Schuss.", teile: einzel(30, 10) },
    { id: "2.21", nummer: "2.21", name: "Pistole 50 m Auflage", kategorie: "Pistole · 50 m",
      beschreibung: "50 m, sitzend/stehend aufgelegt, KK, 30 Schuss, Zehntelwertung.",
      dezimal: true, teile: einzel(30, 10) },

    // ===== WSV-Landesdisziplinen (DSB Liste B, Württemberg) =====
    // Quelle: DSB „Liste B“ Stand 08.07.2025, Abschnitt WT; WSV-Ausschreibung
    // WT-Disziplinen 2026 (dort WT 1.4 / 1.41 als 50 m / 100 m getrennt).
    { id: "wt-1.1", nummer: "WT 1.1", name: "Ordonnanzgewehr Auflage", kategorie: "WSV · Gewehr",
      beschreibung: "100 m, liegend aufgelegt, Kimme/Korn, 3 × 10 Schuss.", teile: einzel(30, 10) },
    { id: "wt-1.2", nummer: "WT 1.2", name: "Ordonnanzgewehr Dreistellungskampf", kategorie: "WSV · Gewehr",
      beschreibung: "100 m, kniend/liegend/stehend, 3 × 10 Schuss.", teile: stellung(10) },
    { id: "wt-1.3", nummer: "WT 1.3", name: "KK-Freigewehr Auflage", kategorie: "WSV · Gewehr",
      beschreibung: "50 m, stehend oder sitzend aufgelegt, 30 Schuss.", teile: einzel(30, 10) },
    { id: "wt-1.4", nummer: "WT 1.4", name: "KK-Zielfernrohr Auflage 50 m", kategorie: "WSV · Gewehr",
      beschreibung: "50 m, liegend oder sitzend aufgelegt, Zielfernrohr, 30 Schuss.", teile: einzel(30, 10) },
    { id: "wt-1.41", nummer: "WT 1.41", name: "KK-Zielfernrohr Auflage 100 m", kategorie: "WSV · Gewehr",
      beschreibung: "100 m, liegend oder sitzend aufgelegt, Zielfernrohr, 30 Schuss.", teile: einzel(30, 10) },
    { id: "wt-1.5", nummer: "WT 1.5", name: "GK-Freigewehr Liegendkampf", kategorie: "WSV · Gewehr",
      beschreibung: "100 m, liegend, 30 Schuss.", teile: einzel(30, 10) },
    { id: "wt-1.6", nummer: "WT 1.6", name: "GK-Zielfernrohr Auflage 100 m", kategorie: "WSV · Gewehr",
      beschreibung: "100 m, liegend oder sitzend aufgelegt, Zielfernrohr, 30 Schuss.", teile: einzel(30, 10) },
    { id: "wt-1.7", nummer: "WT 1.7", name: "Feuerstutzen", kategorie: "WSV · Gewehr",
      beschreibung: "100 m oder 50 m, stehend, 30 Schuss.", teile: einzel(30, 10) },
    { id: "wt-1.8", nummer: "WT 1.8", name: "Ordonnanzgewehr Kleinkaliber", kategorie: "WSV · Gewehr",
      beschreibung: "50 m, 20 Schuss stehend + 20 Schuss liegend.", teile: zweiAnschlaege("Stehend", "Liegend", 20, 10) },

    { id: "wt-2.1", nummer: "WT 2.1", name: "Ordonnanzpistole / Dienstpistole", kategorie: "WSV · Pistole",
      beschreibung: "25 m, 4 × 5 in 150 s + 4 × 5 in 20 s.", teile: zeitTeile(150, 20, 20) },
    { id: "wt-2.2", nummer: "WT 2.2", name: "Schnellfeuerpistole National", kategorie: "WSV · Pistole",
      beschreibung: "25 m, 2 Durchgänge à 30 Schuss (je 2 × 8 s, 2 × 6 s, 2 × 4 s).",
      teile: [
        { key: "durchgang1", label: "Durchgang 1", schuss: 30, serie: 5, cssClass: "teil-praezision" },
        { key: "durchgang2", label: "Durchgang 2", schuss: 30, serie: 5, cssClass: "teil-20s" },
      ] },
    { id: "wt-2.3", nummer: "WT 2.3", name: "Vorderlader Drehscheibe", kategorie: "WSV · Pistole",
      beschreibung: "25 m, Perkussionsrevolver, 3 × 5 Schuss (3 s sichtbar / 7 s abgewandt).", teile: einzel(15, 5) },
    { id: "wt-2.4", nummer: "WT 2.4", name: "KK-Revolver", kategorie: "WSV · Pistole",
      beschreibung: "25 m, 4 × 5 in 50 s + 4 × 5 in 20 s.", teile: zeitTeile(50, 20, 20) },

    { id: "wt-3.1", nummer: "WT 3.1", name: "Western Revolver Großkaliber", kategorie: "WSV · Western",
      beschreibung: "25 m, Single-Action-Revolver, 4 × 5 Schuss (je 150 s).", teile: einzel(20, 5) },
    { id: "wt-3.2", nummer: "WT 3.2", name: "Western Revolver Kleinkaliber", kategorie: "WSV · Western",
      beschreibung: "25 m, Single-Action-Revolver, 4 × 5 Schuss (je 150 s).", teile: einzel(20, 5) },
    { id: "wt-3.3", nummer: "WT 3.3", name: "Western Unterhebelrepetierer KK", kategorie: "WSV · Western",
      beschreibung: "50 m, stehend, 2 × 10 Schuss, Elchscheibe.", teile: einzel(20, 10) },
    { id: "wt-3.4", nummer: "WT 3.4", name: "Western Unterhebelrepetierer GK", kategorie: "WSV · Western",
      beschreibung: "50 m, stehend, 2 × 10 Schuss, Bisonscheibe.", teile: einzel(20, 10) },
    { id: "wt-3.5", nummer: "WT 3.5", name: "Western Unterhebelrepetierer Kurzwaffenpatrone", kategorie: "WSV · Western",
      beschreibung: "25 m, stehend, 4 × 5 Schuss (je 20 s), Bisonscheibe.", teile: einzel(20, 5) },
    { id: "wt-3.6", nummer: "WT 3.6", name: "Western Langwaffe KK", kategorie: "WSV · Western",
      beschreibung: "50 m, stehend, Einzellader, 2 × 10 Schuss, Elchscheibe.", teile: einzel(20, 10) },
    { id: "wt-3.7", nummer: "WT 3.7", name: "Western Langwaffe GK", kategorie: "WSV · Western",
      beschreibung: "100 m, liegend aufgelegt, Einzellader, 2 × 10 Schuss, Bisonscheibe.", teile: einzel(20, 10) },

    { id: "wt-4.1", nummer: "WT 4.1", name: "KK-Mehrlader (Klappscheibe, Treffer)", kategorie: "WSV · Selbstlader", endergebnis: true },
    { id: "wt-4.2", nummer: "WT 4.2", name: "Selbstladegewehr GK", kategorie: "WSV · Selbstlader",
      beschreibung: "50 m (laut Liste B auch 100 m), liegend + stehend, 6 × 5 in 10 s + 6 × 5 in 20 s.", teile: zeitTeile(10, 20, 30) },
    { id: "wt-4.3", nummer: "WT 4.3", name: "Selbstladegewehr GK Zielfernrohr", kategorie: "WSV · Selbstlader",
      beschreibung: "50 m (laut Liste B auch 100 m), liegend + stehend, 6 × 5 in 10 s + 6 × 5 in 20 s.", teile: zeitTeile(10, 20, 30) },
    { id: "wt-4.4", nummer: "WT 4.4", name: "Selbstladegewehr Kurzwaffenpatrone", kategorie: "WSV · Selbstlader",
      beschreibung: "50 m (laut Liste B auch 100 m), liegend + stehend, 6 × 5 in 10 s + 6 × 5 in 20 s.", teile: zeitTeile(10, 20, 30) },

    { id: "wt-5.1", nummer: "WT 5.1", name: "Skeet Halle (20 Scheiben)", kategorie: "WSV · Flinte", endergebnis: true },
    { id: "wt-5.2", nummer: "WT 5.2", name: "Trap Halle (20 Scheiben)", kategorie: "WSV · Flinte", endergebnis: true },

    // ===== Flinte (Endergebnis) =====
    ende("3.10", "Trap", "Flinte"),
    ende("3.15", "Doppeltrap", "Flinte"),
    ende("3.20", "Skeet", "Flinte"),
    ende("3.30", "Compak Sporting", "Flinte"),
    ende("3.35", "Sporting", "Flinte"),

    // ===== Laufende Scheibe (Endergebnis) =====
    ende("4.10", "Laufende Scheibe 10 m", "Laufende Scheibe"),
    ende("4.11", "Laufende Scheibe 10 m (Schüler)", "Laufende Scheibe"),
    ende("4.15", "Laufende Scheibe 10 m Mix", "Laufende Scheibe"),
    ende("4.20", "Laufende Scheibe 50 m", "Laufende Scheibe"),
    ende("4.25", "Laufende Scheibe 50 m Mix", "Laufende Scheibe"),

    // ===== Armbrust (Endergebnis) =====
    ende("5.10", "Armbrust 10 m", "Armbrust"),
    ende("5.11", "Armbrust 10 m Auflage", "Armbrust"),
    ende("5.20", "Armbrust international 30 m", "Armbrust"),
    ende("5.31", "Armbrust national Scheibe", "Armbrust"),
    ende("5.32", "Armbrust national Stern", "Armbrust"),
    ende("5.33", "Armbrust national Kombiniert", "Armbrust"),
    ende("5.34", "Armbrust national Adler", "Armbrust"),
    ende("5.41", "Feldarmbrust IAU 600 · 18 m", "Armbrust"),
    ende("5.42", "Feldarmbrust IAU 600 · 25 m", "Armbrust"),
    ende("5.43", "Feldarmbrust IAU 900", "Armbrust"),

    // ===== Bogen (Endergebnis) =====
    ende("6.10", "WA im Freien · Recurve", "Bogen"),
    ende("6.15", "WA im Freien · Compound", "Bogen"),
    ende("6.16", "WA im Freien · Blankbogen", "Bogen"),
    ende("6.20", "WA Halle · Recurve", "Bogen"),
    ende("6.25", "WA Halle · Compound", "Bogen"),
    ende("6.26", "WA Halle · Blankbogen", "Bogen"),
    ende("6.30", "Feldbogen · Recurve", "Bogen"),
    ende("6.40", "Feldbogen · Blankbogen", "Bogen"),
    ende("6.50", "Feldbogen · Compound", "Bogen"),
    ende("6.60", "WA 3D · Recurve", "Bogen"),
    ende("6.65", "WA 3D · Compound", "Bogen"),
    ende("6.66", "WA 3D · Blankbogen", "Bogen"),
    ende("6.67", "WA 3D · Langbogen", "Bogen"),
    ende("6.68", "WA 3D · Instinktivbogen", "Bogen"),

    // ===== Vorderlader (Endergebnis) =====
    ende("7.10", "Perkussionsgewehr 50 m", "Vorderlader"),
    ende("7.15", "Perkussions-Freigewehr 100 m", "Vorderlader"),
    ende("7.16", "Perkussions-Freigewehr 300 m", "Vorderlader"),
    ende("7.20", "Perkussions-Dienstgewehr 100 m", "Vorderlader"),
    // SpO 2027, Vorderladertabelle: Perkussionsdienstgewehr ≥ 13,5 mm,
    // Original-Visierung fest, kein Diopter/Stecher, stehend 50 m, 15 Schuss.
    ende("7.21", "Perkussions-Dienstgewehr 50 m", "Vorderlader"),
    ende("7.30", "Steinschlossgewehr", "Vorderlader"),
    ende("7.31", "Steinschlossgewehr 100 m", "Vorderlader"),
    ende("7.32", "Luntenschlossgewehr", "Vorderlader"),
    ende("7.35", "Muskete 50 m", "Vorderlader"),
    ende("7.40", "Perkussionsrevolver 25 m", "Vorderlader"),
    ende("7.50", "Perkussionspistole 25 m", "Vorderlader"),
    ende("7.60", "Steinschlosspistole 25 m", "Vorderlader"),
    ende("7.61", "Luntenschlosspistole", "Vorderlader"),
    ende("7.71", "Perkussionsflinte", "Vorderlader"),
    ende("7.72", "Steinschlossflinte", "Vorderlader"),

    // ===== Sommerbiathlon (Endergebnis) =====
    { id: "8.10", nummer: "8.11–8.15", name: "Sommerbiathlon 10 m", kategorie: "Sommerbiathlon", endergebnis: true },
    { id: "8.20", nummer: "8.21–8.25", name: "Sommerbiathlon 50 m", kategorie: "Sommerbiathlon", endergebnis: true },
  ];

  // ---- In Map + Reihenfolge überführen -----------------------------------
  const DISZIPLINEN = {};
  const REIHENFOLGE = [];
  for (const d of LISTE) {
    d.schuetzenProTeam = 5;
    d.ringMax = 10;
    DISZIPLINEN[d.id] = d;
    REIHENFOLGE.push(d.id);
  }

  window.DISZIPLINEN = DISZIPLINEN;
  window.DISZIPLIN_REIHENFOLGE = REIHENFOLGE;
})();
