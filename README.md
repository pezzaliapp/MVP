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
- **Omaggio**: link rapido all’app **Il Cubo**.

---

## Omaggio — Il Cubo

All’interno dell’app trovi il pulsante **“🎁 Omaggio: Il Cubo”** che apre l’app dimostrativa **KubeApp (Il Cubo)**:  
**https://www.alessandropezzali.it/KubeApp/**

> È solo un omaggio: non influisce in alcun modo sul funzionamento di Preventivo PRO.

---

## Stampa / PDF

Sono disponibili due pulsanti:

- **Stampa Interna** (`#printInternalBtn`)
  - *Include*: Modalità prezzo, **Costi**, **Ricavi netti**, **Totali**.
- **Stampa Cliente** (`#printClientBtn`)
  - *Nasconde*: Modalità prezzo, **Costi**, **Ricavi netti**.
  - *Mostra*: **Prezzi**, **Sconti**, **Totali**.

Tecnicamente, prima della stampa viene generato HTML pulito dentro `#printView` e il CSS `@media print` mostra solo questa sezione.

**Suggerimenti**
- Desktop: “Stampa → Salva come PDF”.
- Mobile: dalla finestra di stampa condividi/esporta PDF.

---

## Import CSV

Il pulsante **Importa CSV** accetta file con separatore `,` **o** `;` e intestazione **opzionale**.  
**Ordine delle colonne:**

desc, cost, margin, price, qty, disc

**Significato colonne**
- `desc`  → Descrizione voce.  
- `cost`  → Costo unitario.  
- `margin` → Percentuale di margine/ricarico *(interpreta in base alla modalità attiva)*.  
- `price` → Prezzo netto unitario *(se 0 o vuoto viene ricalcolato)*.  
- `qty`   → Quantità.  
- `disc`  → Sconto % applicato alla riga.

Le **immagini** non si importano via CSV (si caricano dalla UI per ogni riga).

**Esempio**

csv
desc,cost,margin,price,qty,disc
"Piattaforma sollevamento PFA50",1000,30,0,1,0
"Smontagomme FT26SN",1450,35,0,1,5
"Bilanciatrice MEC 200 Truck",2800,28,0,1,0


⸻

## Dati & Privacy
	•	Tutti i dati sono salvati solo nel browser via LocalStorage.
	•	Nessun backend o invio a server esterni.

Chiavi LocalStorage utilizzate
	•	preventivo.pro.v1 → preventivo corrente (campi + righe).
	•	preventivo.pro.mode → modalità prezzo (margin/markup).
	•	preventivo.pro.layout → vista tabella/card.
	•	preventivo.pro.donated → storico legacy, non più usata attivamente.

⸻

## PWA
	1.	Apri l’app nel browser.
	2.	Clicca Aggiungi alla Home / Installa.
	3.	L’app sarà disponibile come icona e funzionerà anche offline.

⸻

## Struttura
	•	index.html — layout + stile + script di bootstrap.
	•	app.js — logica: calcoli, CSV, stampa, immagini, link omaggio.
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

Distribuito con licenza MIT. Vedi il file LICENSE.

Nota etica di utilizzo

Oltre alla licenza ufficiale MIT, ti chiediamo di rispettare alcune semplici linee guida etiche:
	•	Mantenere sempre la nota di copyright.
	•	Citare l’autore originale: Alessandro Pezzali — pezzaliAPP.
	•	Segnalare l’uso o le modifiche scrivendo a: info@alessandropezzali.it.

Questa richiesta non modifica i termini della licenza MIT, ma rappresenta un impegno di trasparenza e collaborazione.

