# Changelog

Tutti i cambiamenti significativi a questo progetto verranno documentati in questo file.

Il formato è basato su [Keep a Changelog](https://keepachangelog.com/it/1.0.0/)
e questo progetto aderisce a [Semantic Versioning](https://semver.org/lang/it/).

---

## [1.0.0] - 2026-07-15

Prima release pubblica di **DonTesta FatturaPA**.

### Aggiunto
- **Visualizzatore FatturaPA (XML)**: Rendering ad alta fedeltà dei documenti XML standard (FPA12, FPR12) con supporto a tutte le sezioni ministeriali (Cedente/Prestatore, Cessionario/Committente, Dettaglio Linee, Aliquote IVA, Dati di Pagamento, Allegati).
- **Supporto file firmati CAdES (`.xml.p7m`)**: Estrazione affidabile del payload XML dal contenuto PKCS#7 tramite la libreria open-source **node-forge**.
- **Estrazione metadati firma digitale eIDAS/CAdES**: Lettura dei dati reali del certificato X.509 incluso nel file `.p7m`:
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
- **Pipeline GitHub Pages**: Deploy automatico della landing page in `/docs` ad ogni push sul ramo principale.
- **Sito di presentazione GitHub Pages**: Pagina promozionale e descrittiva con istruzioni di download e panoramica delle funzionalità.
- **Licenza MIT**: Rilascio open-source con licenza MIT.

### Tecnologie principali
- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4, Lucide Icons, Motion, Recharts.
- **Parsing firma digitale**: `node-forge` (PKCS#7 / CMS / X.509).
- **Persistenza locale**: IndexedDB via `idb`.
- **Desktop runtime**: Rust, Tauri v2.
- **CI/CD**: GitHub Actions (`tauri-apps/tauri-action@v1`, `actions/checkout@v4`, `dtolnay/rust-toolchain@stable`).
