/**
 * lineItemsExtractor.ts
 * 
 * Utility to extract line items from parsed invoices and populate IndexedDB
 * for efficient filtering and aggregation.
 */

import { FatturaElettronica } from "../types";
import { LineItemRecord, saveLineItemsToDB } from "./db";

/**
 * Extracts line items from a collection of invoices and saves them to IndexedDB.
 * This should be called after invoices are loaded/imported.
 * 
 * @param invoices - Array of parsed invoice objects
 * @returns Promise that resolves when line items are saved
 */
export async function extractAndSaveLineItems(invoices: FatturaElettronica[]): Promise<void> {
  const lineItems: LineItemRecord[] = [];

  for (const invoice of invoices) {
    // Extract supplier ID (P.IVA or CF as fallback)
    const cedenteId = 
      invoice.cedentePrestatore.anagrafica.partitaIva ||
      invoice.cedentePrestatore.anagrafica.codiceFiscale ||
      "UNKNOWN";

    const cedenteDenominazione =
      invoice.cedentePrestatore.anagrafica.denominazione ||
      `${invoice.cedentePrestatore.anagrafica.nome || ""} ${invoice.cedentePrestatore.anagrafica.cognome || ""}`.trim() ||
      "Fornitore Sconosciuto";

    // Extract each line from the invoice
    for (const linea of invoice.linee) {
      const lineItem: LineItemRecord = {
        id: `${invoice.id}_${linea.numeroLinea}`,
        fatturaId: invoice.id,
        numeroLinea: linea.numeroLinea,
        cedenteId,
        cedenteDenominazione,
        descrizione: linea.descrizione || "",
        quantita: linea.quantita || 0,
        unitaMisura: linea.unitaMisura,
        prezzoUnitario: linea.prezzoUnitario || 0,
        aliquotaIva: linea.aliquotaIva || 0,
        prezzoTotale: linea.prezzoTotale || 0,
        codiceArticolo: linea.codiceArticolo,
        dataFattura: invoice.datiGenerali.data,
        numeroFattura: invoice.datiGenerali.numero,
      };

      lineItems.push(lineItem);
    }
  }

  // Save all extracted line items to IndexedDB
  await saveLineItemsToDB(lineItems);
  
  console.info(`[LineItemsExtractor] Extracted and saved ${lineItems.length} line items from ${invoices.length} invoices`);
}

/**
 * Extracts unique supplier list from invoices for dropdown filtering.
 * 
 * @param invoices - Array of parsed invoice objects
 * @returns Array of unique suppliers with id and name
 */
export function extractUniqueSuppliers(invoices: FatturaElettronica[]): Array<{ id: string; name: string }> {
  const suppliersMap = new Map<string, string>();

  for (const invoice of invoices) {
    const cedenteId =
      invoice.cedentePrestatore.anagrafica.partitaIva ||
      invoice.cedentePrestatore.anagrafica.codiceFiscale ||
      "UNKNOWN";

    const cedenteDenominazione =
      invoice.cedentePrestatore.anagrafica.denominazione ||
      `${invoice.cedentePrestatore.anagrafica.nome || ""} ${invoice.cedentePrestatore.anagrafica.cognome || ""}`.trim() ||
      "Fornitore Sconosciuto";

    if (!suppliersMap.has(cedenteId)) {
      suppliersMap.set(cedenteId, cedenteDenominazione);
    }
  }

  return Array.from(suppliersMap.entries())
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name));
}
