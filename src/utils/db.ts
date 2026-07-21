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
const DB_VERSION = 2;
const STORE_NAME = "invoices";
const COMPANY_STORE_NAME = "companies";

// Legacy localStorage key used before this migration
const LS_LEGACY_KEY = "dontesta_uploaded_invoices";

export interface InvoiceRecord {
  id: string;       // equals fileName — used as keyPath
  fileName: string;
  rawXml: string;
  rawP7mBase64?: string;
}

type FatturaDB = {
  [STORE_NAME]: {
    key: string;
    value: InvoiceRecord;
  };
};

let _db: IDBPDatabase<any> | null = null;

/** Opens (or reuses) the IndexedDB connection. */
async function getDB(): Promise<IDBPDatabase<any>> {
  if (_db) return _db;
  _db = await openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(COMPANY_STORE_NAME)) {
        db.createObjectStore(COMPANY_STORE_NAME, { keyPath: "id" });
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
