/**
 * dbInfo.ts — Utility to get IndexedDB information (status, size, location)
 */

export interface DatabaseInfo {
  status: 'online' | 'offline' | 'error';
  name: string;
  version: number;
  storageType: string;  // 'Browser Storage' or 'Application Storage'
  browserInfo: string;  // Browser/platform info
  estimatedSize: string;
  invoicesCount?: number;
  companiesCount?: number;
  corrispettiviCount?: number;
  error?: string;
}

/**
 * Gets information about the browser's IndexedDB storage
 */
export async function getDatabaseInfo(): Promise<DatabaseInfo> {
  const dbName = 'fattura_pa_reader_db';
  
  try {
    // Check if IndexedDB is available
    if (!window.indexedDB) {
      return {
        status: 'offline',
        name: dbName,
        version: 0,
        storageType: 'N/A',
        browserInfo: 'IndexedDB non supportato',
        estimatedSize: 'N/A',
        invoicesCount: 0,
        companiesCount: 0,
        corrispettiviCount: 0,
        error: 'IndexedDB non supportato dal browser'
      };
    }

    // Try to open the database to check if it exists and get info
    const request = indexedDB.open(dbName);
    
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

// Helper per contare i record in uno store specifico
    const countStore = (storeName: string): Promise<number> => {
      return new Promise((resolve) => {
        try {
          if (!db.objectStoreNames.contains(storeName)) {
            return resolve(0);
          }
          const transaction = db.transaction(storeName, 'readonly');
          const store = transaction.objectStore(storeName);
          const countReq = store.count();
          countReq.onsuccess = () => resolve(countReq.result);
          countReq.onerror = () => resolve(0);
        } catch {
          resolve(0);
        }
      });
    };

    // Lettura simultanea dei conteggi
    const [invoicesCount, companiesCount, corrispettiviCount] = await Promise.all([
      countStore('invoices'),
      countStore('companies'),
      countStore('corrispettivi')
    ]);

    // Get storage estimate (browser API)
    let estimatedSize = 'N/A';
    if (navigator.storage && navigator.storage.estimate) {
      try {
        const estimate = await navigator.storage.estimate();
        const usageInMB = estimate.usage ? (estimate.usage / (1024 * 1024)).toFixed(2) : '0';
        const quotaInMB = estimate.quota ? (estimate.quota / (1024 * 1024)).toFixed(0) : 'N/A';
        estimatedSize = `${usageInMB} MB / ${quotaInMB} MB`;
      } catch {
        estimatedSize = 'N/A';
      }
    }

    // Determine storage type and browser info
    // NOTE: IndexedDB API does NOT expose the actual filesystem path
    // This is by design for security and privacy reasons
    const userAgent = navigator.userAgent;
    
    let storageType = 'Browser Storage';
    let browserInfo = 'Unknown Browser';
    
    if (userAgent.toLowerCase().includes('tauri')) {
      storageType = 'Application Storage';
      browserInfo = 'Tauri Desktop App (WebView)';
    } else if (userAgent.includes('Chrome')) {
      browserInfo = 'Google Chrome';
    } else if (userAgent.includes('Firefox')) {
      browserInfo = 'Mozilla Firefox';
    } else if (userAgent.includes('Safari')) {
      browserInfo = 'Apple Safari';
    } else if (userAgent.includes('Edg')) {
      browserInfo = 'Microsoft Edge';
    } else {
      browserInfo = userAgent.split(' ')[0] || 'Unknown Browser';
    }

    db.close();

    return {
      status: 'online',
      name: dbName,
      version: db.version,
      storageType,
      browserInfo,
      estimatedSize,
      invoicesCount,
      companiesCount,
      corrispettiviCount
    };

  } catch (error) {
    return {
      status: 'error',
      name: dbName,
      version: 0,
      storageType: 'N/A',
      browserInfo: 'N/A',
      estimatedSize: 'N/A',
      invoicesCount: 0,
      companiesCount: 0,
      corrispettiviCount: 0,
      error: error instanceof Error ? error.message : 'Errore sconosciuto'
    };
  }
}

/**
 * Returns instructions on how to find the actual database location
 */
export function getLocationInstructions(): { title: string; steps: string[] } {
  const userAgent = navigator.userAgent.toLowerCase();
  
  if (userAgent.includes('chrome') || userAgent.includes('edg')) {
    return {
      title: 'Come trovare il database Chrome/Edge:',
      steps: [
        '1. Apri Chrome DevTools (F12 o Cmd+Option+I)',
        '2. Vai alla tab "Application"',
        '3. Nella sidebar sinistra, espandi "Storage" > "IndexedDB"',
        '4. Troverai "fattura_pa_reader_db"',
        '',
        'Per il path fisico (terminale):',
        'macOS: ~/Library/Application Support/Google Chrome/[Profile]/IndexedDB/',
        'Windows: %LOCALAPPDATA%\\Google\\Chrome\\User Data\\[Profile]\\IndexedDB\\'
      ]
    };
  } else if (userAgent.includes('firefox')) {
    return {
      title: 'Come trovare il database Firefox:',
      steps: [
        '1. Apri Firefox DevTools (F12)',
        '2. Vai alla tab "Storage"',
        '3. Espandi "IndexedDB"',
        '4. Troverai "fattura_pa_reader_db"',
        '',
        'Per il path fisico:',
        '• Digita about:support nella barra indirizzi',
        '• Cerca "Profile Directory" e clicca "Open Directory"',
        '• Vai in storage/default/[origin]/idb/'
      ]
    };
  } else if (userAgent.includes('safari')) {
    return {
      title: 'Come trovare il database Safari:',
      steps: [
        '1. Abilita il menu Sviluppo (Preferenze > Avanzate)',
        '2. Menu Sviluppo > Mostra Web Inspector',
        '3. Tab "Storage" > "IndexedDB"',
        '',
        'Path fisico: ~/Library/Safari/Databases/'
      ]
    };
  } else {
    return {
      title: 'Come trovare il database:',
      steps: [
        '1. Apri gli strumenti per sviluppatori del browser (F12)',
        '2. Cerca la sezione "Storage" o "Application"',
        '3. Espandi "IndexedDB"',
        '4. Troverai "fattura_pa_reader_db"'
      ]
    };
  }
}
