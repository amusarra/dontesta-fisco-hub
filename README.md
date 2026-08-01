# DonTesta FiscoHub 🚀

> **Visualizzatore open-source e cross-platform per fatture elettroniche XML e corrispettivi telematici, supportato dal Blog di Antonio Musarra ([dontesta.it](https://www.dontesta.it)).**

DonTesta FiscoHub è uno strumento di **visualizzazione e analisi veloce** delle fatture elettroniche e corrispettivi scaricati direttamente dal **Portale dell'Agenzia delle Entrate**. 

**⚠️ Importante: Questa NON è un'applicazione gestionale o contabile.**

L'obiettivo è fornire uno strumento semplice e immediato per:
- 👀 **Visualizzare** fatture emesse e ricevute in formato chiaro e leggibile
- 📊 **Analizzare** volumi d'affari, spese, IVA e andamenti temporali
- 🔍 **Ricercare** fatture e corrispettivi senza dover navigare nel portale AdE
- 📈 **Monitorare** i propri dati fiscali in autonomia

**👥 A chi è utile:**
- Piccole attività e professionisti che non dispongono di un gestionale completo
- Chi desidera una vista rapida dei propri documenti fiscali senza dover contattare il commercialista
- Chiunque voglia consultare le proprie fatture e corrispettivi offline e in modo più pratico

Vai sulla [pagina delle release](https://github.com/amusarra/fattura-pa-reader/releases) per scaricare l'ultima versione
disponibile per il tuo sistema operativo (Windows, macOS o Linux).

[![Release & Desktop Build Pipeline](https://github.com/amusarra/fattura-pa-reader/actions/workflows/release.yml/badge.svg)](https://github.com/amusarra/fattura-pa-reader/actions/workflows/release.yml)

---

## 🚀 Prova Subito con Dati di Esempio

Vuoi testare FiscoHub senza dover prima scaricare i tuoi dati dal Portale AdE? Abbiamo preparato file XML di esempio pronti all'uso!

### 📦 Dati di Test Disponibili

Nel repository trovi oltre **130 file di esempio** in `docs/fatturapa/esempi/`:

- **20 Fatture Emesse** (`fatture/emesse/IT12345678901_FPA*.xml`)
- **20 Fatture Ricevute** (`fatture/ricevute/IT12345678901_FPR*.xml`)
- **~100 Corrispettivi Telematici** (`corrispettivi/CORR_IT12345678901_*.xml`)

Tutti i documenti sono intestati all'azienda di esempio:

```
Ragione Sociale: Judio Alvarez
Partita IVA: IT12345678901
Codice Fiscale: JDOAVZ68A28B202I
Indirizzo: Via Leonardo Da Vinci 1, 95100 Catania (CT)
```

### 🎯 Come Provare

**Opzione 1: Modalità Guest** (senza configurare aziende)
1. Avvia FiscoHub
2. Seleziona "Continua come Guest" nella schermata iniziale
3. Trascina l'intera cartella `docs/fatturapa/esempi` nell'applicazione
4. Esplora fatture, corrispettivi e analytics!

**Opzione 2: Con Azienda Configurata** (esperienza completa)
1. Avvia FiscoHub
2. Crea una nuova azienda con i dati di "Judio Alvarez" (vedi sopra)
3. Importa i file dalla cartella `docs/fatturapa/esempi`
4. Visualizza la classificazione automatica (emesse/ricevute)
5. Esplora le analytics con filtri multi-azienda

### 📍 Dove Trovare i File

Puoi scaricare i file di esempio in due modi:

- **Dal repository GitHub**: [docs/fatturapa/esempi](https://github.com/amusarra/fattura-pa-reader/tree/main/docs/fatturapa/esempi)
- **Clonando il repo**: `git clone https://github.com/amusarra/fattura-pa-reader.git`

---

## 📥 Come utilizzare l'applicazione

### Flusso di lavoro consigliato

1. **Scarica i tuoi dati dal Portale dell'Agenzia delle Entrate**
   - Accedi al [Portale Fatture e Corrispettivi](https://ivaservizi.agenziaentrate.gov.it/portale/)
   - Scarica le fatture elettroniche (file `.xml` o `.xml.p7m`) dalla sezione "Consultazione"
   - Scarica i corrispettivi telematici dalla sezione dedicata

2. **Importa i file in DonTesta FiscoHub**
   - Carica i file XML tramite drag & drop o seleziona una cartella
   - L'applicazione riconosce automaticamente fatture e corrispettivi
   - Tutti i dati rimangono sul tuo dispositivo (elaborazione 100% locale)

3. **Visualizza e analizza**
   - Consulta le fatture emesse (fatturato) e ricevute (spese)
   - Monitora gli andamenti temporali e i KPI fiscali
   - Ricerca fatture per fornitore, cliente, periodo o contenuto
   - Genera report visivi per una comprensione immediata

**💡 Nota**: I file XML scaricati dal portale AdE sono già in formato standard FatturaPA. Non è necessaria alcuna conversione o elaborazione preliminare.

---

## 🌟 Caratteristiche Principali

- 📄 **Supporto XML, P7M e Corrispettivi Telematici**: Caricamento diretto di fatture elettroniche (file XML standard e `.xml.p7m` firmati CAdES) e dei corrispettivi telematici tramite parsing dello schema XML, integrando tutti i dati nei flussi di lavoro.
- 🔑 **Firma Digitale Reale (PKCS#7)**: Estrazione dei metadati del certificato X.509 tramite **node-forge**: firmatario (CN), ente emittente, numero seriale, validità, Key Usage, CRL Distribution Points, OCSP, SAN e Signing Time.
- 🏢 **Gestione Multi-Azienda**: Sistema completo per gestire più aziende con classificazione automatica dei documenti come emessi o ricevuti.
    - Modal di startup per configurazione azienda o modalità Guest.
    - CRUD completo per anagrafica aziende.
    - Classificazione automatica di fatture e corrispettivi (EMESSA/RICEVUTA) basata su normalizzazione dei codici fiscali e Partite IVA.
    - Cambio azienda attiva in qualsiasi momento.
- 💻 **Desktop Ready (Tauri v2)**: Applicazione nativa ultraleggera e sicura per Windows, macOS (Apple Silicon **e** Intel) e Linux.
- 🔒 **Sicurezza Client-Side**: Tutti i dati rimangono sul tuo dispositivo. Nessuna informazione sensibile viene inviata a server esterni. Perfetto per mantenere la privacy dei tuoi documenti fiscali.
- 🗂️ **Isolamento Multi-Utente**: Modalità Guest e gestione multi-azienda con isolamento completo dei dati. Ogni azienda/utente vede e gestisce solo i propri documenti.
- 📊 **Dashboard Analitica Avanzata**:
    - Grafici separati per fatture emesse (fatturato) e ricevute (spese).
    - KPIs dedicati: Volume d'Affari, Totale Imponibile, **Totale IVA**, conteggi emesse/ricevute.
    - Analisi fornitori, clienti, beni e servizi, con esclusione automatica dei record auto-emessi (autofatture) dall'analisi dei beni e servizi ricevuti.
    - Disabilitazione automatica in modalità Guest.
- 🎨 **UI Flessibile**: Toggle per nascondere sidebar filtri e lista fatture, con persistenza preferenze.
- 🔍 **Ricerca Avanzata & Fuzzy Search**: Ricerca fatture e corrispettivi per Partita IVA, Codice Fiscale, numero, data e ricerca flessibile sulle descrizioni dei prodotti/servizi tramite algoritmo di ricerca fuzzy (distanza di Levenshtein).
- 🏷️ **Icone Direzione**: Badge ed icone visive per distinguere fatture emesse da ricevute.
- 🖨️ **Stampa e Download**: Stampa le fatture o scarica l'XML originale decodificato.

---

## 💻 Requisiti di Sistema e Compatibilità Desktop

L'applicazione desktop è distribuita per i principali sistemi operativi con le seguenti note di compatibilità:

* **macOS**: Consigliato **macOS 15 (Sequoia)** o superiore (sia Apple Silicon che Intel). *Nota: su versioni precedenti come macOS 14 (Sonoma), le politiche della sandbox di WKWebView potrebbero influenzare la persistenza del database IndexedDB locale tra le ripartenze.*
* **Linux**: Richiede **WebKitGTK 4.1** (`libwebkit2gtk-4.1`). Si raccomanda l'uso di distribuzioni aggiornate (es. Ubuntu 22.04+, Fedora 45+).
* **Windows**: Compatibile con Windows 10/11 (richiede WebView2 runtime, solitamente preinstallato).

---

## 🛠️ Tecnologie Utilizzate

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4, Lucide Icons, Motion, Recharts.
- **Parsing firma digitale e schemi XML**: `node-forge` (PKCS#7 / CMS / X.509) e parser XML per FatturaPA e Corrispettivi Telematici.
- **Algoritmi di Ricerca**: Algoritmo Levenshtein per il fuzzy matching delle descrizioni.
- **Persistenza locale**: IndexedDB via `idb`.
- **Desktop Runtime**: Rust, Tauri v2.
- **Automazione**: GitHub Actions — build multi-piattaforma e deploy GitHub Pages.
---

## 💻 Sviluppo Locale (Web)

### Requisiti
- **Node.js** v18 o superiore
- **npm**

### Installazione e Avvio
1. Installa le dipendenze:
   ```bash
   npm install
   ```

2. Avvia il server di sviluppo locale:
   ```bash
   npm run dev
   ```
   L'applicazione sarà accessibile all'indirizzo `http://localhost:3000`.

3. Compila l'applicazione web statica:
   ```bash
   npm run build
   ```
   L'output sarà generato nella cartella `dist/`.

---

## 🖥️ Sviluppo e Build Desktop (Tauri)

### Requisiti di Sistema per lo Sviluppo Rust
Tauri richiede il compilatore Rust e alcune librerie di sistema. Per installare Rust:
```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

Consulta la [Guida Ufficiale ai Prerequisiti di Tauri v2](https://v2.tauri.app/start/prerequisites/) per configurare il tuo sistema operativo (C++ Build Tools su Windows, Xcode Command Line Tools su macOS, `libwebkit2gtk-4.1-dev` su Linux).

### Comandi Tauri

- **Avviare l'app desktop in modalità sviluppo**:
  ```bash
  npm run tauri dev
  ```

- **Compilare l'app desktop per la produzione**:
  ```bash
  npm run tauri build
  ```
  Produce i pacchetti di installazione nella cartella `src-tauri/target/release/bundle/`:
  - **Windows**: `.msi` e `.exe`
  - **macOS**: `.dmg` e `.app` — per Apple Silicon (`aarch64`) e Intel (`x86_64`)
  - **Linux**: `.deb` e `.AppImage`

---

## 🚀 Pipeline CI/CD & Gestione delle Release

Il progetto include due pipeline di automazione tramite **GitHub Actions**:

### 1. Rilascio Desktop Multi-Platform (`.github/workflows/release.yml`)
Si attiva automaticamente al push di un tag `v*` (es. `v1.0.0`).

La pipeline esegue le seguenti attività **in parallelo** su quattro runner:
1. **macOS Apple Silicon** — target `aarch64-apple-darwin`, produce `.dmg` / `.app`.
2. **macOS Intel** — target `x86_64-apple-darwin`, produce `.dmg` / `.app`.
3. **Windows** — produce `.msi` e `.exe` su `windows-latest`.
4. **Linux** — installa `libwebkit2gtk-4.1-dev`, produce `.deb` e `.AppImage` su `ubuntu-22.04`.

Tutti gli artefatti vengono raccolti e allegati a una **bozza di release GitHub** tramite `tauri-apps/tauri-action@v1`.

#### Come lanciare una nuova release:
1. Aggiorna la versione in `package.json` e `src-tauri/tauri.conf.json`.
2. Crea un tag git ed esegui il push:
   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```
3. Vai nella scheda **Releases** del repository, completa la bozza generata e pubblicala.

### 2. Pubblicazione di GitHub Pages (`.github/workflows/pages.yml`)
Compila e pubblica automaticamente la landing page in `/docs` a ogni push sul ramo `main`.

La pagina è accessibile all'indirizzo `https://<tuo-utente>.github.io/<nome-repo>/`.

---

## ❓ Domande Frequenti (FAQ)

### Questa applicazione sostituisce il mio commercialista o il gestionale aziendale?
**No.** DonTesta FiscoHub è uno strumento di **visualizzazione e consultazione**, non un software gestionale o contabile. Non gestisce registri IVA, prima nota, bilanci o adempimenti fiscali. Per questi aspetti è sempre necessario affidarsi a un commercialista o utilizzare un software gestionale certificato.

### Devo caricare i dati ogni volta che apro l'applicazione?
**No.** I dati vengono salvati localmente nel tuo dispositivo tramite IndexedDB e persistono tra le sessioni. Devi caricare i file XML solo la prima volta o quando scarichi nuovi documenti dal portale AdE.

### Posso usare questa applicazione per la mia dichiarazione dei redditi?
DonTesta FiscoHub ti aiuta a **consultare e analizzare** i tuoi dati fiscali, ma non genera dichiarazioni fiscali né produce i documenti necessari per gli adempimenti. Utilizza sempre un commercialista o un software fiscale certificato per le dichiarazioni ufficiali.

### I miei dati sono al sicuro?
**Sì.** L'applicazione lavora completamente offline. Tutti i file XML vengono elaborati localmente sul tuo dispositivo e nessun dato viene mai inviato a server esterni. La versione desktop offre un ulteriore livello di sicurezza rispetto alla versione web.

### Posso gestire più attività o partite IVA?
**Sì.** L'applicazione supporta la gestione multi-azienda. Puoi configurare più anagrafiche aziendali e passare da una all'altra. I documenti vengono classificati automaticamente come emessi o ricevuti in base all'azienda attiva, e i dati rimangono isolati tra le diverse aziende.

---

## 🐛 Troubleshooting & Segnalazione Issue

In caso di anomalie o comportamenti inattesi durante l'esecuzione o il build:

- Linux - Schermata Nera all'avvio (GPU legacy / Intel-NVIDIA):
Se l'applicazione mostra uno schermo nero all'avvio su hardware datato o schede grafiche legacy, disabilita il compositing di WebKitGTK avviando l'app con la seguente variabile d'ambiente:

    ```bash
    WEBKIT_DISABLE_COMPOSITING_MODE=1 dontesta-fiscohub
    ```

- Linux - Symbol lookup error (undefined symbol):
Se riscontri errori di caricamento dinamico delle librerie all'avvio, assicurato che il sistema abbia installato la versione aggiornata del pacchetto webkit2gtk4.1 (es. aggiornando la distribuzione o tramite sudo dnf update webkit2gtk4.1 / sudo apt update && sudo apt upgrade).

Hai riscontrato un bug o desideri proporre una nuova funzionalità?
Controlla o apri una segnalazione sulla pagina delle [GitHub Issues](https://github.com/amusarra/fattura-pa-reader/issues).

---

## 📄 Licenza

Questo progetto è rilasciato sotto licenza MIT. Consulta il file [LICENSE](LICENSE) per i dettagli.
Il progetto è supportato dal blog di Antonio Musarra ([dontesta.it](https://www.dontesta.it)).
