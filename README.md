# <img src="https://raw.githubusercontent.com/pezzaliapp/MVP/main/icons/icon-192.png" alt="Logo" width="32" style="vertical-align:middle;margin-right:6px;"> Preventivo PRO — Quoting & Margini (PWA)

**Preventivo PRO** è una Progressive Web App (PWA) per creare preventivi professionali **direttamente dal browser**.  
Funziona **offline**, salva i dati in **locale** (LocalStorage) e non richiede alcun server.

---

## Funzionalità

- **Immagini per riga** (thumbnail ridimensionate automaticamente per stampa/PDF).
- **Modalità prezzo**:
  - **Margine** → calcolo da margine vero.
  - **Ricarico** → calcolo da ricarico percentuale.
- **Auto-prezzo** → calcola i prezzi per raggiungere un **target di margine medio** (post-sconto).
- **Doppia stampa**:
  - **Stampa Interna** → con costi, ricavi e modalità prezzo.
  - **Stampa Cliente** → senza costi, ricavi e modalità prezzo.
- **Import CSV** (schema dedicato, vedi sotto).
- **PWA installabile** su desktop e mobile.
- **Donazione facoltativa** via PayPal.

---

## Donazioni

L’app è gratuita. Se vuoi supportarne lo sviluppo, puoi donare a partire da **5 €** dal pulsante **“Dona ☕︎”**.

Imposta il tuo link PayPal.Me in `app.js`:

// app.jS
const PAYPAL_URL = "https://paypal.me/tuoHandle/5"; // precompila 5 €, modificabile dall'utente

L’importo è solo precompilato: il donatore può variarlo prima del pagamento.

⸻

## Stampa / PDF

Sono disponibili due pulsanti:
	•	Stampa Interna (#printInternalBtn)
	•	Include: Modalità prezzo, Costi, Ricavi netti, Totali.
	•	Stampa Cliente (#printClientBtn)
	•	Nasconde: Modalità prezzo, Costi, Ricavi netti.
	•	Mostra: Prezzi, Sconti, Totali.

Tecnicamente, prima della stampa viene generato HTML pulito dentro #printView e il CSS @media print mostra solo questa sezione.

Suggerimenti:
	•	Desktop: “Stampa → Salva come PDF”.
	•	Mobile: dalla finestra di stampa condividi/esporta PDF.

⸻

## Import CSV

Il pulsante Importa CSV accetta file con separatore , o ; e intestazione opzionale.
Ordine delle colonne:

desc, cost, margin, price, qty, disc

Significato colonne
	•	desc  → Descrizione voce.
	•	cost  → Costo unitario.
	•	margin→ Percentuale margine/ricarico (si interpreta in base alla modalità attiva).
	•	price → Prezzo netto unitario (se 0 o vuoto viene ricalcolato).
	•	qty   → Quantità.
	•	disc  → Sconto % applicato alla riga.

Le immagini non si importano via CSV (si caricano dalla UI per ogni riga).

Esempio

desc,cost,margin,price,qty,disc
"Piattaforma sollevamento PFA50",1000,30,0,1,0
"Smontagomme FT26SN",1450,35,0,1,5
"Bilanciatrice MEC 200 Truck",2800,28,0,1,0


⸻

## Dati & Privacy
	•	Tutti i dati sono salvati solo nel browser via LocalStorage.
	•	Nessun backend o invio a server esterni.
	•	Donazioni gestite direttamente da PayPal.

Chiavi LocalStorage utilizzate:
	•	preventivo.pro.v1 → preventivo corrente (campi + righe).
	•	preventivo.pro.mode → modalità prezzo (margin/markup).
	•	preventivo.pro.layout → vista tabella/card.
	•	preventivo.pro.donated → flag di ringraziamento (cosmetico).

⸻

## PWA
	1.	Apri l’app nel browser.
	2.	Clicca Aggiungi alla Home / Installa.
	3.	L’app sarà disponibile come icona e funzionerà anche offline.

⸻

## Struttura
	•	index.html — layout + stile + script di bootstrap.
	•	app.js — logica: calcoli, CSV, stampa, donazione, immagini.
	•	sw.js — service worker per cache offline.
	•	manifest.webmanifest — manifest PWA.
	•	icons/ — icone app (192/512).

⸻

## Troubleshooting
	•	Stampa vuota → usa i pulsanti Stampa Interna o Stampa Cliente (riempiono #printView prima di aprire il dialog).
	•	CSV non importato → controlla separatore e ordine colonne.
	•	PWA non installabile / aggiornamenti non visibili → svuota cache e ricarica forzando:
	•	Windows/Linux: Ctrl + Shift + R
	•	macOS: Cmd + Shift + R

⸻

## Licenza

Questo progetto è rilasciato con **licenza MIT**, che ne consente l’uso, la modifica e la redistribuzione, anche per fini commerciali, purché venga sempre mantenuta la nota di copyright e la stessa licenza.  

⚖️ La versione MIT garantisce libertà d’uso, ma tutela anche l’autore tramite l’obbligo di attribuzione e l’esclusione di responsabilità.  

Per i dettagli completi consulta il file [LICENSE](./LICENSE).
