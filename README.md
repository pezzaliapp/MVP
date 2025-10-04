# Preventivo PRO — PWA per preventivi con margini

**Preventivo PRO** è una Progressive Web App (PWA) che permette di creare preventivi professionali direttamente dal browser, con calcolo automatico dei margini, gestione sconti e suggeritore prezzi in base a un target di margine medio.
Funziona offline, è installabile su smartphone/desktop ed è pensata per venditori e aziende che vogliono semplificare la preventivazione.

---

## ✨ Funzionalità principali
- Righe di preventivo con: descrizione, costo, margine %, prezzo netto, quantità, sconto %
- Calcoli automatici: ricavi netti, margine assoluto, imponibile, totale IVA inclusa
- Suggeritore prezzi: ottimizza i prezzi netti per raggiungere un **target di margine medio %**
- Import CSV + Demo CSV
- Salvataggio locale (offline-first, PWA)
- Stampa/PDF (con watermark in versione Free)
- Installabile su Android/iOS/Desktop

---

## 🆓 Free vs 💼 PRO
**Free**
- 1 preventivo salvato
- Stampa con watermark *“DEMO — NON PER USO COMMERCIALE”*

**PRO**
- Salvataggi illimitati
- PDF/Stampa senza watermark
- Branding personalizzato
- Esportazioni CSV avanzate
- Supporto e aggiornamenti

> La versione PRO si sblocca tramite **Stripe Checkout** (pulsante in-app).

---

## 📊 Formato CSV atteso
Colonne obbligatorie:
```
desc,cost,margin,price,qty,disc
```
Esempio:
```
Piattaforma sollevamento PFA50,3200,30,,1,0
Smontagomme FT26SN,1450,35,,1,5
Bilanciatrice MEC 200 Truck,2800,28,,1,0
```

---

## 🚀 Installazione
1. Copia i file su un hosting statico (GitHub Pages, Netlify, dominio personale)
2. Apri `index.html` nel browser
3. (Opzionale) Aggiungi alla Home come PWA

Per test locale della modalità PRO, puoi aprire `index.html?pro=1`.

---

## 📜 Licenza
- La **versione base** di Preventivo PRO è distribuita con licenza **MIT** (vedi `LICENSE`).
- I **moduli PRO** (funzioni premium a pagamento) sono distribuiti con **licenza proprietaria** (vedi `LICENSE-PRO`).

👉 In pratica: puoi usare e condividere liberamente la versione base (MIT), ma le feature PRO restano riservate e protette.

---

## 👤 Autore
**Alessandro Pezzali — pezzaliAPP**  
📧 info@alessandropezzali.it  
🌐 https://pezzaliapp.com
