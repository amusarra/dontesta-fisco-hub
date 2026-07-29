/**
 * companyDb.ts — IndexedDB layer for Aziende (Company Anagrafica)
 */

import { openDB, IDBPDatabase } from "idb";
import { Azienda, FatturaElettronica, InvoiceDirection } from "../types";

const DB_NAME = "fattura_pa_reader_db";
const DB_VERSION = 3;
const COMPANY_STORE = "companies";
const LS_ACTIVE_COMPANY_KEY = "dontesta_active_company_id";

export const DUMMY_GUEST_COMPANY: Azienda = {
  id: "guest_dummy",
  denominazione: "Azienda Guest (Solo Visualizzazione)",
  partitaIva: "00000000000",
  codiceFiscale: "00000000000",
  isDummy: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

let _db: IDBPDatabase<any> | null = null;

async function getDB(): Promise<IDBPDatabase<any>> {
  if (_db) return _db;
  _db = await openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains("invoices")) {
        db.createObjectStore("invoices", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(COMPANY_STORE)) {
        db.createObjectStore(COMPANY_STORE, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("corrispettivi")) {
        db.createObjectStore("corrispettivi", { keyPath: "id" });
      }
    },
  });
  return _db;
}

/**
 * Loads all companies from IndexedDB.
 */
export async function loadCompaniesFromDB(): Promise<Azienda[]> {
  try {
    const db = await getDB();
    const companies = await db.getAll(COMPANY_STORE);
    return companies || [];
  } catch (err) {
    console.error("[CompanyDB] Errore nel caricamento delle aziende:", err);
    return [];
  }
}

/**
 * Persists or updates a company record in IndexedDB.
 */
export async function saveCompanyToDB(company: Azienda): Promise<void> {
  const db = await getDB();
  await db.put(COMPANY_STORE, company);
}

/**
 * Deletes a company record from IndexedDB by ID.
 */
export async function deleteCompanyFromDB(id: string): Promise<void> {
  const db = await getDB();
  await db.delete(COMPANY_STORE, id);
}

/**
 * Gets the active company ID saved in localStorage.
 */
export function getActiveCompanyIdFromLS(): string | null {
  return localStorage.getItem(LS_ACTIVE_COMPANY_KEY);
}

/**
 * Sets or removes the active company ID in localStorage.
 */
export function setActiveCompanyIdInLS(id: string | null): void {
  if (id) {
    localStorage.setItem(LS_ACTIVE_COMPANY_KEY, id);
  } else {
    localStorage.removeItem(LS_ACTIVE_COMPANY_KEY);
  }
}

/**
 * Determines whether an invoice is Emessa, Ricevuta, or Unclassified relative to activeCompany.
 */
export function getInvoiceDirection(
  invoice: FatturaElettronica,
  activeCompany: Azienda | null
): InvoiceDirection {
  if (!activeCompany || activeCompany.isDummy) {
    return "UNCLASSIFIED";
  }

  const companyVat = activeCompany.partitaIva
    ? activeCompany.partitaIva.replace(/^IT/i, "").trim().toLowerCase()
    : "";
  const companyCf = activeCompany.codiceFiscale
    ? activeCompany.codiceFiscale.trim().toLowerCase()
    : "";

  if (!companyVat && !companyCf) {
    return "UNCLASSIFIED";
  }

  // Cedente Prestatore (Supplier / Issuer)
  const supplierVat = invoice.cedentePrestatore?.anagrafica?.partitaIva
    ? invoice.cedentePrestatore.anagrafica.partitaIva.replace(/^IT/i, "").trim().toLowerCase()
    : "";
  const supplierCf = invoice.cedentePrestatore?.anagrafica?.codiceFiscale
    ? invoice.cedentePrestatore.anagrafica.codiceFiscale.trim().toLowerCase()
    : "";

  // Cessionario Committente (Customer / Recipient)
  const customerVat = invoice.cessionarioCommittente?.anagrafica?.partitaIva
    ? invoice.cessionarioCommittente.anagrafica.partitaIva.replace(/^IT/i, "").trim().toLowerCase()
    : "";
  const customerCf = invoice.cessionarioCommittente?.anagrafica?.codiceFiscale
    ? invoice.cessionarioCommittente.anagrafica.codiceFiscale.trim().toLowerCase()
    : "";

  const matchesSupplier =
    (companyVat && supplierVat && companyVat === supplierVat) ||
    (companyCf && supplierCf && companyCf === supplierCf);

  const matchesCustomer =
    (companyVat && customerVat && companyVat === customerVat) ||
    (companyCf && customerCf && companyCf === customerCf);

  if (matchesSupplier) {
    return "EMESSA";
  } else if (matchesCustomer) {
    return "RICEVUTA";
  }

  return "UNCLASSIFIED";
}
