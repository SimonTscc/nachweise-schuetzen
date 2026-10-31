/* =========================================================================
   Nachweise für Schützen – Konfiguration
   -------------------------------------------------------------------------
   Zwei Firebase-Projekte:
   - NACHWEIS_CONFIG: eigenes Projekt „nachweise-schuetzen“. Hier wird
     geschrieben (Meisterschaften, Sonstiges, Rundenwettkämpfe).
   - VM_CONFIG: Projekt „schiessen“ der Vereinsmeisterschaft. Wird NUR
     GELESEN (Kader, VM-Ergebnisse, Durchgänge, Disziplinen). Der Code
     enthält für dieses Projekt keinen einzigen Schreibaufruf.
   Web-Configs sind nicht geheim. Das Passwort steht nirgends im Code.
   ========================================================================= */

window.NACHWEIS_CONFIG = {
  apiKey: "AIzaSyA8JCC-kXLxc79iBYfPqP1NDaOZHY16CPw",
  authDomain: "nachweise-schuetzen.firebaseapp.com",
  projectId: "nachweise-schuetzen",
  storageBucket: "nachweise-schuetzen.firebasestorage.app",
  messagingSenderId: "898586542065",
  appId: "1:898586542065:web:41b768b6e0f6b0245d0e50"
};

window.VM_CONFIG = {
  apiKey: "AIzaSyBPlvaWZm1OqFAxAe17xHzyqLxQa10xLwQ",
  authDomain: "schiessen.firebaseapp.com",
  projectId: "schiessen",
  storageBucket: "schiessen.firebasestorage.app",
  messagingSenderId: "991836675868",
  appId: "1:991836675868:web:5d5a8dd7e6e39be37564d9"
};

/* Geteilter Vereinslogin, in beiden Projekten mit derselben E-Mail angelegt.
   Mit einem Passwort meldet sich das Programm bei beiden an. */
window.AUTH_EMAIL = "verein@ssv-untertuerkheim.de";

/* Jahr, das im Nachweis vorausgewählt ist (= aktuelles Schießjahr der VM) */
window.STANDARD_JAHR = 2027;

/* Texte für den Ausdruck */
window.VEREIN = {
  name: "Sportschützenverein Stuttgart Untertürkheim e. V.",
  vmOrt: "Schützenhaus Untertürkheim", // Ort, der bei VM-Ergebnissen eingesetzt wird
};
