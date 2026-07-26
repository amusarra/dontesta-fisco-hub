# DonTesta FatturaPA 🚀

> **Visualizzatore open-source e cross-platform per fatture elettroniche XML (FatturaPA), supportato dal Blog di Antonio Musarra ([dontesta.it](https://www.dontesta.it)).**

DonTesta FatturaPA consente di importare, organizzare e visualizzare le fatture elettroniche in modo semplice, veloce ed 
efficiente, direttamente nel tuo browser o come applicazione desktop nativa. **Non è un software di contabilità**.

Vai sulla [pagina delle release](https://github.com/amusarra/fattura-pa-reader/releases) per scaricare l'ultima versione
disponibile per il tuo sistema operativo (Windows, macOS o Linux).

[![Release & Desktop Build Pipeline](https://github.com/amusarra/fattura-pa-reader/actions/workflows/release.yml/badge.svg)](https://github.com/amusarra/fattura-pa-reader/actions/workflows/release.yml)

---

## 🌟 Caratteristiche Principali

- 📄 **Supporto XML & P7M**: Caricamento diretto di file XML standard e file firmati digitalmente in formato CAdES (`.xml.p7m`).
- 🔑 **Firma Digitale Reale (PKCS#7)**: Estrazione dei metadati del certificato X.509 tramite **node-forge**: firmatario (CN), ente emittente, numero seriale, validità, Key Usage, CRL Distribution Points, OCSP, SAN e Signing Time.
- 🏢 **Gestione Multi-Azienda**: Sistema completo per gestire più aziende con classificazione automatica delle fatture come emesse o ricevute.
  - Modal di startup per configurazione azienda o modalità Guest.
  - CRUD completo per anagrafica aziende.
  - Classificazione automatica fatture (EMESSA/RICEVUTA) basata su P.IVA/CF.
  - Cambio azienda attiva in qualsiasi momento.
- 💻 **Desktop Ready (Tauri v2)**: Applicazione nativa ultraleggera e sicura per Windows, macOS (Apple Silicon **e** Intel) e Linux.
- 🔒 **Sicurezza Client-Side**: Tutti i dati rimangono sul tuo dispositivo. Nessuna informazione sensibile viene inviata a server esterni.
- 📊 **Dashboard Analitica Avanzata**: 
  - Grafici separati per fatture emesse (fatturato) e ricevute (spese).
  - KPIs dedicati: Volume d'Affari, Totale Imponibile, **Totale IVA**, conteggi emesse/ricevute.
  - Analisi fornitori, clienti, beni e servizi.
  - Disabilitazione automatica in modalità Guest.
- 🎨 **UI Flessibile**: Toggle per nascondere sidebar filtri e lista fatture, con persistenza preferenze.
- 🔍 **Ricerca Avanzata**: Ricerca fatture per Partita IVA, Codice Fiscale, numero, data.
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
- **Parsing firma digitale**: `node-forge` (PKCS#7 / CMS / X.509).
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

## 🐛 Troubleshooting & Segnalazione Issue

In caso di anomalie o comportamenti inattesi durante l'esecuzione o il build:

- Linux - Schermata Nera all'avvio (GPU legacy / Intel-NVIDIA):
Se l'applicazione mostra uno schermo nero all'avvio su hardware datato o schede grafiche legacy, disabilita il compositing di WebKitGTK avviando l'app con la seguente variabile d'ambiente:

    ```bash
    WEBKIT_DISABLE_COMPOSITING_MODE=1 dontesta-fatturapa
    ```

- Linux - Symbol lookup error (undefined symbol):
Se riscontri errori di caricamento dinamico delle librerie all'avvio, assicurato che il sistema abbia installato la versione aggiornata del pacchetto webkit2gtk4.1 (es. aggiornando la distribuzione o tramite sudo dnf update webkit2gtk4.1 / sudo apt update && sudo apt upgrade).

Hai riscontrato un bug o desideri proporre una nuova funzionalità?
Controlla o apri una segnalazione sulla pagina delle [GitHub Issues](https://github.com/amusarra/fattura-pa-reader/issues).

---

## 📄 Licenza

Questo progetto è rilasciato sotto licenza MIT. Consulta il file [LICENSE](LICENSE) per i dettagli.
Il progetto è supportato dal blog di Antonio Musarra ([dontesta.it](https://www.dontesta.it)).
