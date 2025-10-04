# Preventivo PRO — PWA che monetizza (MVP)

**Cosa fa:** genera preventivi professionali con calcolo margine, prezzi suggeriti per target di margine medio, stampa/PDF e salvataggio locale.

**Modello freemium:**
- Gratis: 1 preventivo salvato, stampa con watermark.
- PRO (Stripe Checkout): preventivi illimitati, PDF senza watermark, loghi/branding, esportazione CSV avanzata.

## Come monetizzare
- Abbonamento (es. 9,90 €/mese) o licenza lifetime.
- Sconti annuali + upsell di template PDF/lettere commerciali.
- Versione Android su Google Play via Trusted Web Activity (TWA).
- iOS tramite wrapper (Capacitor) per App Store.

## CSV atteso
`desc,cost,margin,price,qty,disc`
