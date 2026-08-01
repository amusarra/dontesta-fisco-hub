# Changelog

Tutti i cambiamenti significativi a questo progetto verranno documentati in questo file.

Il formato è basato su [Keep a Changelog](https://keepachangelog.com/it/1.0.0/)
e questo progetto aderisce a [Semantic Versioning](https://semver.org/lang/it/).

---

## [1.0.0-1] - 2026-08-01

Prima release candidate di **DonTesta FiscoHub** - strumento open-source per visualizzare e analizzare fatture elettroniche e corrispettivi telematici scaricati dal Portale dell'Agenzia delle Entrate.

⚠️ **Nota importante**: Questa NON è un'applicazione gestionale o contabile. È uno strumento di consultazione e analisi per piccole attività e professionisti.

### 🌟 Funzionalità Principali

#### Visualizzazione Documenti Fiscali
- **Supporto FatturaPA XML (FPA12, FPR12)**: Rendering completo di tutti i campi ministeriali
  - Cedente/Prestatore e Cessionario/Committente
  - Dettaglio linee con descrizione, quantità, prezzi e IVA
  - Riepilogo IVA con aliquote e imponibili
  - Dati di pagamento e scadenze
  - Allegati con preview e download
- **Supporto file firmati CAdES (`.xml.p7m`)**: Estrazione automatica del payload XML da firma digitale PKCS#7
- **Corrispettivi Telematici**: Parsing e visualizzazione corrispettivi giornalieri secondo schema COR10
- **XML Viewer integrato**: Visualizzazione sorgente XML con syntax highlighting e copia negli appunti

#### Firma Digitale
- **Estrazione metadati certificato X.509 reale** tramite **node-forge**:
  - Firmatario (Common Name), Ente emittente (Issuer DN), Numero seriale
  - Date validità (`notBefore` / `notAfter`) con stato automatico (VALIDA/SCADUTA)
  - Key Usage, CRL Distribution Points, OCSP endpoints
  - Subject Alternative Name (SAN), Issuer Alternative Name
  - Algoritmi di firma e chiave pubblica con dimensione in bit
  - Signing Time dagli attributi autenticati CMS
- **Persistenza firma in IndexedDB**: File `.p7m` conservati in base64 per mantenere i dati certificato dopo reload

#### Gestione Multi-Azienda
- **Sistema completo per gestione aziende multiple**:
  - Modal di startup per configurazione iniziale o modalità Guest
  - CRUD completo: crea, modifica, elimina aziende
  - Database IndexedDB dedicato con persistenza locale
  - Cambio azienda attiva in tempo reale
- **Classificazione automatica fatture**:
  - EMESSA: fattura emessa dall'azienda corrente (fatturato)
  - RICEVUTA: fattura ricevuta dall'azienda corrente (spese)
  - UNCLASSIFIED: non associata all'azienda corrente
  - Confronto intelligente P.IVA/CF con normalizzazione (rimozione "IT", trim, uppercase)
- **Modalità Guest**: Utilizzo come semplice visualizzatore senza configurare aziende

#### Isolamento Dati Multi-Utente (Database v6)
- **Campo `uploadedBy` su fatture e corrispettivi**: Traccia chi ha caricato ogni documento
- **Filtri automatici per isolamento**:
  - Guest mode: vede solo documenti con `uploadedBy === "GUEST"`
  - Company mode: vede solo documenti con `uploadedBy === company.id`
  - Documenti legacy (senza uploadedBy): visibili a tutti per retrocompatibilità
- **Protezione eliminazione**:
  - Guest non può eliminare documenti di aziende
  - Aziende non possono eliminare documenti di altre aziende
  - Funzioni "Svuota Lista" rispettano l'isolamento
- **Migrazione automatica database**: Da v4 → v5 → v6 con preservazione dati esistenti

#### Dashboard Analitica
- **KPI Cards separate Emesse/Ricevute**:
  - **Volume d'Affari Totale**: Solo fatture emesse (fatturato attivo)
  - **Totale Imponibile**: Base imponibile del fatturato
  - **Totale IVA**: IVA da versare allo Stato (solo fatture emesse)
  - **Fatture Emesse**: Conteggio e totale con badge verde
  - **Fatture Ricevute**: Conteggio e totale con badge viola
- **Grafici separati Emesse/Ricevute**:
  - **Andamento Fatturato**: Solo fatture EMESSE (volume d'affari nel tempo)
  - **Top 5 Clienti**: Basato solo su fatture EMESSE
  - **Riepilogo Fornitori**: Solo fatture RICEVUTE (analisi spese)
  - **Top 10 Beni e Servizi Ricevuti**: Aggregazione linee fatture ricevute per categoria di spesa
  - **Metodi di Pagamento**: Distribuzione modalità di pagamento
  - **Tipi Documento**: Distribuzione per tipo documento
- **Export dati**: Esportazione CSV di grafici e tabelle
- **Disabilitazione automatica in modalità Guest**: Grafici multi-azienda non disponibili senza configurazione

#### Ricerca e Filtri Avanzati
- **Filtri temporali**: Anno, mese, intervallo date personalizzato
- **Filtri anagrafica**: Fornitore (Cedente), Cliente (Cessionario), Partita IVA, Codice Fiscale
- **Fuzzy search**: Ricerca flessibile nelle descrizioni prodotti/servizi con algoritmo Levenshtein
- **Filtraggio corrispettivi**: Per mese, anno e P.IVA/CF titolare
- **Top Beni e Servizi con filtri**: Ricerca per fornitore, descrizione, periodo

#### UI/UX
- **Toggle visualizzazione pannelli**:
  - Nasconde/mostra sidebar filtri laterale
  - Nasconde/mostra lista centrale fatture
  - Persistenza preferenze in localStorage
- **Badge direzione fatture**: Icone visive (EMESSA verde, RICEVUTA viola)
- **Contatori contestuali**: "Fatture k di x" mostra totale dell'azienda corrente
- **Responsive design**: Layout ottimizzato per desktop, tablet, mobile
- **Dark mode ready**: Palette colori con supporto tema scuro

#### Export e Stampa
- **Download XML**: Estrazione XML decodificato da file P7M
- **Stampa PDF**: Generazione PDF via browser con foglio di stile ottimizzato
- **Export CSV**: Esportazione dati grafici e tabelle
- **Cartella destinazione PDF**: Configurabile su app desktop

#### Persistenza Locale
- **IndexedDB con schema evolutivo**:
  - Store `invoices`: Fatture con XML originale e firma P7M (v6)
  - Store `corrispettivi`: Corrispettivi telematici (v6)
  - Store `companies`: Anagrafica aziende
  - Store `dettaglioLinee`: Righe fatture ricevute per analisi acquisti (v5)
- **Nessun server esterno**: Tutti i dati rimangono sul dispositivo (100% privacy)
- **Migrazione automatica**: Schema database aggiornato automaticamente senza perdita dati

#### Applicazione Desktop (Tauri v2)
- **Build multi-piattaforma**:
  - **Windows**: Installer MSI ed EXE
  - **macOS**: DMG per Apple Silicon (M1/M2/M3) e Intel
  - **Linux**: DEB (Debian/Ubuntu) e AppImage (universale)
- **Runtime nativo leggero**: Tauri v2 + Rust con WebView nativo
- **Accesso filesystem**: Selezione file, cartelle, salvataggio PDF
- **Performance ottimizzate**: Consumo memoria ridotto vs. Electron

### 📚 Documentazione

- **README completo**:
  - Chiarimento: NON è un gestionale/contabile
  - Flusso di lavoro consigliato (scarica da AdE → importa → visualizza → analizza)
  - Sezione FAQ con risposte a domande comuni
  - Target chiaro: piccole attività e professionisti
  - Istruzioni sviluppo locale e build desktop
- **Sezione "Prova Subito"** (README + GitHub Pages):
  - Oltre 130 file XML di esempio pronti all'uso
  - 20 fatture emesse + 20 ricevute + 100 corrispettivi
  - Istruzioni per test in modalità Guest o con azienda configurata
- **Landing Page GitHub Pages**:
  - Sito promozionale con demo visiva
  - Sezioni: funzionalità, workflow, architettura, privacy
  - Download link alle release
  - Enfasi su consultazione locale e privacy

### 🛠️ Tecnologie Utilizzate

- **Frontend**: React 19, TypeScript, Vite 6, Tailwind CSS v4
- **UI Components**: Lucide Icons, Motion (animazioni), Recharts (grafici)
- **Parsing**: DOMParser nativo, node-forge (PKCS#7/X.509)
- **Ricerca**: Algoritmo Levenshtein custom per fuzzy matching
- **Database**: IndexedDB via libreria `idb`
- **Desktop**: Tauri v2, Rust, WebKitGTK 4.1 (Linux), WebView2 (Windows)
- **CI/CD**: GitHub Actions con build multi-piattaforma parallele
  - `tauri-apps/tauri-action@v1` per release automatiche
  - Deploy GitHub Pages automatico su push

### 🔒 Sicurezza e Privacy

- **Elaborazione client-side al 100%**: Nessun dato inviato a server esterni
- **Nessuna telemetria**: Zero tracking o analytics
- **Sandboxing P7M**: Parsing firma digitale isolato con validazione strutturale
- **Sanitizzazione input**: Controlli su nomi file, URL, contenuti XML
- **Licenza MIT**: Codice completamente open-source e ispezionabile

### 📦 Compatibilità

- **Web (Browser moderni)**:
  - Chrome/Edge 90+, Firefox 88+, Safari 14+
  - Richiede supporto IndexedDB e ES2020
- **Desktop**:
  - **macOS**: 15 (Sequoia) o superiore consigliato (Apple Silicon e Intel)
    - *Nota*: Su macOS 14 (Sonoma), sandbox WKWebView può influenzare persistenza IndexedDB
  - **Linux**: Distro con WebKitGTK 4.1 (Ubuntu 22.04+, Fedora 45+)
  - **Windows**: Windows 10/11 con WebView2 runtime

### 🐛 Fix e Miglioramenti

- **Bug eliminazione massiva corretta**: "Svuota Lista" in modalità Guest ora elimina solo i dati del Guest
- **Bug filtri multi-azienda risolti**:
  - Counter corrispettivi ora rispetta azienda corrente
  - Top Beni e Servizi filtra correttamente per cessionario
  - Dropdown fornitori filtrato su dati dell'azienda corrente
  - Header "Fatture k di x" mostra totale azienda corrente
- **Gestione activeCompany null**: `getCurrentUploadedBy()` gestisce caso iniziale (returns "GUEST")
- **uploadedBy salvato in IndexedDB**: Fix persistenza per fatture (prima mancante)
- **Protezione eliminazione singola**: Guest non può eliminare fatture/corrispettivi di altri
- **Database migration v4→v5→v6**: Schema dettaglioLinee ricreato correttamente, uploadedBy aggiunto senza breaking changes

### 🚀 Pipeline di Release

- **Build multi-OS parallele** su GitHub Actions (macOS, Ubuntu, Windows)
- **Release draft automatiche** con artifacts per tutte le piattaforme
- **Versioning centralizzato**: package.json, tauri.conf.json, Cargo.toml
- **Checksum SHA256**: Generati automaticamente per verifica integrità

### 📝 Note per gli Sviluppatori

- Database schema ora a v6 - migrazioni automatiche da v4/v5
- `uploadedBy` campo obbligatorio per nuovi documenti
- Usare `getCurrentUploadedBy()` helper per ottenere l'ID corretto
- Filtri uploadedBy applicati in `useMemo` per performance
- Legacy data (uploadedBy undefined) sempre visibile per retrocompatibilità

---

**Download**: [Releases](https://github.com/amusarra/fattura-pa-reader/releases)  
**Documentazione**: [README.md](README.md)  
**Sito Web**: [https://amusarra.github.io/fattura-pa-reader](https://amusarra.github.io/fattura-pa-reader)  
**Licenza**: MIT
