# Changelog

Tutti i cambiamenti significativi a questo progetto verranno documentati in questo file.

Il formato è basato su [Keep a Changelog](https://keepachangelog.com/it/1.0.0/)
e questo progetto aderisce a [Semantic Versioning](https://semver.org/lang/it/).

---

## [1.2.0] - 2026-08-01

### Aggiunto
- **Isolamento Dati Multi-Utente (v6)**: Sistema completo per l'isolamento dei dati tra utenti e aziende.
  - Campo `uploadedBy` su fatture e corrispettivi per tracciare chi ha caricato i documenti.
  - Modalità Guest: visualizza e gestisce solo i propri documenti (`uploadedBy === "GUEST"`).
  - Modalità Azienda: visualizza e gestisce solo i documenti della propria azienda (`uploadedBy === company.id`).
  - Compatibilità retroattiva: documenti legacy (senza `uploadedBy`) visibili a tutti.
  - Database schema v6 con migrazione automatica da v5.
- **Documentazione Migliorata**: Chiarimento dello scopo dell'applicazione.
  - README aggiornato per evidenziare che NON è un gestionale/contabile.
  - Sezione "Come utilizzare l'applicazione" con flusso di lavoro consigliato.
  - Nuova sezione FAQ per rispondere alle domande più comuni.
  - Enfasi sul target: piccole attività, professionisti, consultazione autonoma.

### Modificato
- **Filtri Fatture e Corrispettivi**: Applicato filtro `uploadedBy` nei `useMemo` per isolamento dati.
  - Guest: mostra solo `uploadedBy === "GUEST"` + legacy (undefined).
  - Azienda: mostra solo `uploadedBy === company.id` + legacy (undefined).
- **Funzioni di Eliminazione**: Rispettano l'isolamento dati.
  - `handleClearAllCorrispettivi` (Guest): elimina solo corrispettivi Guest.
  - `handleResetDatabase` (Guest): elimina solo fatture Guest.
  - Modalità Azienda: elimina solo documenti dell'azienda corrente.

### Corretto
- **Bug eliminazione massiva**: In modalità Guest, "Svuota Lista" ora elimina solo i dati del Guest e non quelli di tutte le aziende.
- **Errore caricamento iniziale**: Gestito caso `activeCompany === null` in `getCurrentUploadedBy()`.
- **Filtri corrispettivi**: Top Beni e Servizi ora filtra correttamente i fornitori per azienda corrente.
- **Contatore header**: "Fatture: k di x" ora mostra il totale specifico dell'azienda corrente.
- **Database migration v5→v6**: Aggiunto campo `uploadedBy` senza breaking changes.

### Tecnologie e Miglioramenti
- Migrazione database da v5 a v6 con schema evolutivo.
- Propagazione campo `uploadedBy` durante caricamento, parsing e salvataggio documenti.
- Filtri reattivi ottimizzati con `useMemo` per performance.

---

## [1.1.0] - 2026-07-21

### Aggiunto
- **Gestione Multi-Azienda**: Sistema completo per gestire più aziende e classificare automaticamente le fatture come emesse o ricevute.
  - Modal di startup per creare nuova azienda o usare modalità Guest/Visualizzatore.
  - CRUD completo per anagrafica aziende (crea, modifica, elimina).
  - Selezione azienda attiva con possibilità di cambio in qualsiasi momento.
  - Classificazione automatica fatture (EMESSA/RICEVUTA/NON CLASSIFICATA) basata su confronto P.IVA/CF.
  - Database IndexedDB dedicato per persistenza aziende.
  - Modalità Guest/Dummy per uso come semplice visualizzatore senza configurazione.
- **Card KPI Totale IVA**: Nuova card nella dashboard analitica che mostra l'IVA totale delle fatture emesse da versare allo Stato.
  - Icona Receipt (scontrino) arancione distintiva.
  - Descrizione "IVA da versare allo Stato".
  - Calcolo automatico da fatture emesse.
- **Toggle UI Flessibili**:
  - Pulsante per nascondere/mostrare la sidebar laterale dei filtri (fornitori/clienti).
  - Pulsante per nascondere/mostrare il pannello centrale con la lista delle fatture.
  - Persistenza delle preferenze UI in localStorage.
  - Icone intuitive con animazioni chevron.
- **Icone Direzione Fatture**: Badge ed icone visive per distinguere fatture emesse da ricevute.
  - Badge colorati "EMESSA" (verde) e "RICEVUTA" (viola) nelle card fatture.
  - Icone allegati con indicazione visiva della direzione.
- **Ricerca Avanzata**: Funzionalità di ricerca fatture per Partita IVA o Codice Fiscale.

### Modificato
- **Dashboard Grafici & Statistiche - Separazione Emesse/Ricevute**:
  - **Andamento del Fatturato**: Ora mostra solo le fatture EMESSE (volume d'affari).
  - **Top 5 Clienti**: Basato solo su fatture EMESSE.
  - **Riepilogo Fornitori / Spese**: Corretto per mostrare solo fatture RICEVUTE (spese sostenute).
  - **Nuovo Grafico**: "Top 10 Beni e Servizi Ricevuti" per analizzare le spese da fatture ricevute (tema viola).
  - Disabilitazione grafici in modalità Guest/Visualizzatore (pulsante grigio con tooltip).
- **KPIs Dashboard - Solo Fatture Emesse**:
  - **Volume d'Affari Totale**: Ora calcola solo su fatture EMESSE (fatturato attivo).
  - **Totale Imponibile**: Ora calcola solo su fatture EMESSE (base imponibile del fatturato).
  - **Totale IVA**: Nuova card che mostra IVA solo su fatture EMESSE.
  - **Fatture Emesse**: Card dettaglio con conteggio e totale (verde).
  - **Fatture Ricevute**: Card dettaglio con conteggio e totale (viola).
  - Layout responsive: 5 colonne su desktop, 2 su tablet, 1 su mobile.

### Tecnologie e Miglioramenti
- Utilizzo di `useMemo` per ottimizzazione filtri emesse/ricevute.
- Separazione logica completa tra fatturato attivo (emesse) e spese (ricevute).
- Interfaccia utente più flessibile e personalizzabile.
- Migliore esperienza utente per gestione multi-azienda.

---

## [1.0.0] - 2026-07-15

Prima release pubblica di **DonTesta FatturaPA**.

### Aggiunto
- **Visualizzatore FatturaPA (XML)**: Rendering dei documenti XML standard (FPA12, FPR12) con supporto a tutte le sezioni ministeriali (Cedente/Prestatore, Cessionario/Committente, Dettaglio Linee, Aliquote IVA, Dati di Pagamento, Allegati).
- **Supporto file firmati CAdES (`.xml.p7m`)**: Estrazione del payload XML dal contenuto PKCS#7 tramite la libreria open-source **node-forge**.
- **Estrazione metadati firma digitale CAdES**: Lettura dei dati reali del certificato X.509 incluso nel file `.p7m`:
  - Firmatario (Common Name), Ente emittente (Issuer DN), Numero seriale.
  - Date di validità (`notBefore` / `notAfter`) con indicazione automatica dello stato `VALIDA` / `SCADUTA`.
  - Key Usage (digitalSignature, nonRepudiation, …).
  - CRL Distribution Points (estensione `2.5.29.31`).
  - Authority Info Access — CA Issuers e OCSP (estensione `1.3.6.1.5.5.7.1.1`).
  - Soggetto Alternativo / Issuer Alt Name (SAN, estensione `2.5.29.17` / `2.5.29.18`).
  - Algoritmo di firma e algoritmo chiave pubblica (con dimensione in bit).
  - Versione certificato.
  - Signing Time dagli attributi autenticati CMS (`id-signingTime`).
- **Persistenza `.p7m` in IndexedDB**: I byte originali del file `.p7m` vengono conservati in base64 nel database locale del browser, così i dati certificato restano disponibili dopo il riavvio dell'applicazione senza dover ricaricare il file.
- **Dashboard Analitica**: Vista riassuntiva con grafici di distribuzione fatture per anno, mese, fornitore e totali.
- **Filtri avanzati**: Filtraggio per anno, mese, fornitore (Cedente) e cliente (Cessionario).
- **Validazione schema XSD FatturaPA**: Controllo strutturale prima del parsing (versione, namespace, nodi obbligatori).
- **Visualizzatore XML sorgente**: Pannello dedicato alla visualizzazione del XML originale con evidenziazione e copia negli appunti.
- **Download XML e stampa PDF**: Esportazione dell'XML decodificato e stampa via browser con foglio di stile ottimizzato.
- **Integrazione Desktop (Tauri v2)**: Applicazione nativa per Windows (`.msi`, `.exe`), Linux (`.deb`, `.AppImage`) e macOS (`.dmg`) sia per architettura Apple Silicon (`aarch64`) sia Intel (`x86_64`).
- **Pipeline Release multi-piattaforma (GitHub Actions)**: Build parallela su `macos-latest`, `ubuntu-22.04` e `windows-latest` con pubblicazione automatica delle release draft tramite `tauri-apps/tauri-action@v1`.
- **Pipeline GitHub Pages**: Deploy automatico della landing page in `/docs` a ogni push sul ramo principale.
- **Sito di presentazione GitHub Pages**: Pagina promozionale e descrittiva con istruzioni di download e panoramica delle funzionalità.
- **Licenza MIT**: Rilascio open-source con licenza MIT.

### Tecnologie principali
- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4, Lucide Icons, Motion, Recharts.
- **Parsing firma digitale**: `node-forge` (PKCS#7 / CMS / X.509).
- **Persistenza locale**: IndexedDB via `idb`.
- **Desktop runtime**: Rust, Tauri v2.
- **CI/CD**: GitHub Actions (`tauri-apps/tauri-action@v1`, `actions/checkout@v4`, `dtolnay/rust-toolchain@stable`).
