/**
 * db.ts — IndexedDB persistence layer for Fattura PA Reader
 *
 * Replaces localStorage for invoice storage.
 * Preferences (sidebar state, work directory, etc.) remain in localStorage.
 *
 * Database : fattura_pa_reader_db  (version 1)
 * Object Store: invoices
 *   - keyPath : "id"  (fileName used as unique key)
 *   - Record  : { id: string; fileName: string; rawXml: string; rawP7mBase64?: string }
 */

import { openDB, IDBPDatabase } from "idb";

const DB_NAME = "fattura_pa_reader_db";
const DB_VERSION = 6;  // Increased for uploadedBy field (Guest isolation)
const STORE_NAME = "invoices";
const COMPANY_STORE_NAME = "companies";
const CORRISPETTIVI_STORE_NAME = "corrispettivi";
const LINE_ITEMS_STORE_NAME = "dettaglioLinee";

// Legacy localStorage key used before this migration
const LS_LEGACY_KEY = "dontesta_uploaded_invoices";

export interface InvoiceRecord {
  id: string;       // equals fileName — used as keyPath
  fileName: string;
  rawXml: string;
  rawP7mBase64?: string;
  uploadedBy?: string;  // Company ID or "GUEST" for guest uploads (v6)
}

export interface CorrispettivoRecord {
  id: string;       // equals fileName — used as keyPath
  fileName: string;
  rawXml: string;
  uploadedBy?: string;  // Company ID or "GUEST" for guest uploads (v6)
}

export interface LineItemRecord {
  id: string;           // composite: `${fatturaId}_${numeroLinea}`
  fatturaId: string;     // invoice fileName
  numeroLinea: number;
  
  // Supplier info for filtering
  cedenteId: string;     // P.IVA or CF del fornitore
  cedenteDenominazione: string;
  
  // Customer info for filtering (NEW in v5)
  cessionarioId: string;     // P.IVA or CF del cliente
  cessionarioDenominazione: string;
  
  // Line details
  descrizione: string;
  quantita: number;
  unitaMisura?: string;
  prezzoUnitario: number;
  aliquotaIva: number;
  prezzoTotale: number;
  codiceArticolo?: string;
  
  // For tracking
  dataFattura: string;   // YYYY-MM-DD
  numeroFattura: string;
}

type FatturaDB = {
  [STORE_NAME]: {
    key: string;
    value: InvoiceRecord;
  };
  [CORRISPETTIVI_STORE_NAME]: {
    key: string;
    value: CorrispettivoRecord;
  };
  [LINE_ITEMS_STORE_NAME]: {
    key: string;
    value: LineItemRecord;
    indexes: { cedenteId: string; cessionarioId: string; descrizione: string };
  };
};

let _db: IDBPDatabase<any> | null = null;

/** Opens (or reuses) the IndexedDB connection. */
async function getDB(): Promise<IDBPDatabase<any>> {
  if (_db) return _db;
  _db = await openDB(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(COMPANY_STORE_NAME)) {
        db.createObjectStore(COMPANY_STORE_NAME, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(CORRISPETTIVI_STORE_NAME)) {
        db.createObjectStore(CORRISPETTIVI_STORE_NAME, { keyPath: "id" });
      }
      
      // Line items store - handle v4 to v5 migration
      if (oldVersion < 5 && db.objectStoreNames.contains(LINE_ITEMS_STORE_NAME)) {
        // Delete old store and recreate with new schema
        console.log("[DB] Migrating line items store from v4 to v5 (adding cessionarioId)");
        db.deleteObjectStore(LINE_ITEMS_STORE_NAME);
      }
      
      if (!db.objectStoreNames.contains(LINE_ITEMS_STORE_NAME)) {
        // Creating store from scratch (v4+) or recreating (v5 migration)
        const lineStore = db.createObjectStore(LINE_ITEMS_STORE_NAME, { keyPath: "id" });
        lineStore.createIndex("cedenteId", "cedenteId", { unique: false });
        lineStore.createIndex("cessionarioId", "cessionarioId", { unique: false });
        lineStore.createIndex("descrizione", "descrizione", { unique: false });
        lineStore.createIndex("fatturaId", "fatturaId", { unique: false });
      }
      
      // v5 → v6: uploadedBy field added to invoices and corrispettivi
      // No schema change needed - just add field to new records
      // Existing records will have uploadedBy = undefined (treated as legacy data visible to all)
      if (oldVersion < 6) {
        console.log("[DB] Upgraded to v6: uploadedBy field added for Guest isolation");
        console.log("[DB] Legacy records without uploadedBy are visible to all users");
      }
    },
  });
  return _db;
}

/**
 * Loads all invoice records from IndexedDB.
 * Returns an array of { id, fileName, rawXml } ready for parsing.
 */
export async function loadInvoicesFromDB(): Promise<InvoiceRecord[]> {
  const db = await getDB();
  return db.getAll(STORE_NAME);
}

/**
 * Persists the full invoice list to IndexedDB.
 * Uses a single transaction for atomicity.
 * Clears the store first so deleted invoices are removed.
 */
export async function saveInvoicesToDB(
  invoices: { fileName: string; rawXml: string; rawP7mBase64?: string }[]
): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(STORE_NAME, "readwrite");
  await tx.store.clear();
  for (const inv of invoices) {
    await tx.store.put({
      id: inv.fileName,
      fileName: inv.fileName,
      rawXml: inv.rawXml,
      rawP7mBase64: inv.rawP7mBase64
    });
  }
  await tx.done;
}

/**
 * Deletes all records from the invoices store.
 */
export async function clearInvoicesDB(): Promise<void> {
  const db = await getDB();
  await db.clear(STORE_NAME);
}

/**
 * Loads all corrispettivi records from IndexedDB.
 */
export async function loadCorrispettiviFromDB(): Promise<CorrispettivoRecord[]> {
  const db = await getDB();
  return db.getAll(CORRISPETTIVI_STORE_NAME);
}

/**
 * Persists the full corrispettivi list to IndexedDB.
 * @param corrispettivi Array of corrispettivi records to save
 * @param uploadedBy Optional company ID or "GUEST" to track ownership
 */
export async function saveCorrispettiviToDB(
  corrispettivi: { fileName: string; rawXml: string }[],
  uploadedBy?: string
): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(CORRISPETTIVI_STORE_NAME, "readwrite");
  await tx.store.clear();
  for (const corr of corrispettivi) {
    await tx.store.put({
      id: corr.fileName,
      fileName: corr.fileName,
      rawXml: corr.rawXml,
      uploadedBy,  // v6: track who uploaded this corrispettivo
    });
  }
  await tx.done;
}

/**
 * Deletes all records from the corrispettivi store.
 */
export async function clearCorrispettiviDB(): Promise<void> {
  const db = await getDB();
  await db.clear(CORRISPETTIVI_STORE_NAME);
}

/**
 * One-shot migration from localStorage to IndexedDB.
 *
 * If the legacy key `dontesta_uploaded_invoices` is present in localStorage,
 * its data is imported into IndexedDB and the key is then removed.
 * This runs silently and is a no-op on subsequent calls.
 */
export async function migrateFromLocalStorage(): Promise<void> {
  const raw = localStorage.getItem(LS_LEGACY_KEY);
  if (!raw) return; // nothing to migrate

  try {
    const parsed = JSON.parse(raw) as { fileName: string; rawXml: string; rawP7mBase64?: string }[];
    if (Array.isArray(parsed) && parsed.length > 0) {
      await saveInvoicesToDB(parsed);
      console.info(
        `[DB] Migrated ${parsed.length} invoice(s) from localStorage to IndexedDB.`
      );
    }
  } catch (err) {
    console.error("[DB] Migration from localStorage failed:", err);
  } finally {
    // Always remove the legacy key to avoid re-migration attempts
    localStorage.removeItem(LS_LEGACY_KEY);
  }
}

// ============================================================================
// LINE ITEMS OPERATIONS (New in v4)
// ============================================================================

/**
 * Saves line items extracted from invoices to IndexedDB for efficient filtering and search.
 * This should be called after invoices are imported/parsed.
 */
export async function saveLineItemsToDB(lineItems: LineItemRecord[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(LINE_ITEMS_STORE_NAME, "readwrite");
  await tx.store.clear();
  for (const item of lineItems) {
    await tx.store.put(item);
  }
  await tx.done;
}

/**
 * Loads all line items from IndexedDB.
 */
export async function loadAllLineItems(): Promise<LineItemRecord[]> {
  const db = await getDB();
  return db.getAll(LINE_ITEMS_STORE_NAME);
}

/**
 * Loads line items filtered by supplier (cedenteId).
 * Uses index for efficient query.
 */
export async function loadLineItemsBySupplierId(cedenteId: string): Promise<LineItemRecord[]> {
  const db = await getDB();
  const tx = db.transaction(LINE_ITEMS_STORE_NAME, "readonly");
  const index = tx.store.index("cedenteId");
  return index.getAll(cedenteId);
}

/**
 * Clears all line items from the store.
 */
export async function clearLineItemsDB(): Promise<void> {
  const db = await getDB();
  await db.clear(LINE_ITEMS_STORE_NAME);
}

