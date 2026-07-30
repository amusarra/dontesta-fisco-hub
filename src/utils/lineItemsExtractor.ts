/**
 * lineItemsExtractor.ts
 *
 * Utility to extract line items from parsed invoices and populate IndexedDB
 * for efficient filtering and aggregation.
 */

import { FatturaElettronica } from "../types";
import { LineItemRecord, saveLineItemsToDB } from "./db";

/**
 * Helper function to determine if an invoice is an emitted/outgoing invoice (Fattura Emessa).
 */
function isFatturaEmessa(invoice: FatturaElettronica, currentCompanyPiva?: string): boolean {
  const inv = invoice as any;

  // Controlli basati sulle proprietà standard del modello dati
  if (inv.isEmessa === true) return true;
  if (inv.tipo === "emessa" || inv.tipo === "attiva") return true;
  if (inv.isRicevuta === false) return true;

  // Controllo aggiuntivo sul P.IVA/CF del Cedente se viene fornita la P.IVA dell'azienda corrente
  if (currentCompanyPiva) {
    // Helper locale per rimuovere 'IT', spazi e uniformare in maiuscolo
    const cleanId = (id?: string) => (id ? id.trim().toUpperCase().replace(/^IT/, '') : '');

    const normCompanyId = cleanId(currentCompanyPiva);
    const cedentePiva = cleanId(invoice.cedentePrestatore?.anagrafica?.partitaIva);
    const cedenteCf = cleanId(invoice.cedentePrestatore?.anagrafica?.codiceFiscale);

    // Verifica se l'azienda attiva corrisponde al Cedente (sia per P.IVA che per CF)
    const isEmessa =
        (cedentePiva !== '' && cedentePiva === normCompanyId) ||
        (cedenteCf !== '' && cedenteCf === normCompanyId);

    if (isEmessa) {
      console.info(
          `[LineItemsExtractor] Skipping invoice ${invoice.id} as it is emitted by the current company (P.IVA: ${currentCompanyPiva})`
      );
      return true; // oppure 'continue' se sei all'interno di un ciclo for
    }
  }

  return false;
}

/**
 * Extracts line items from a collection of invoices and saves them to IndexedDB.
 * Only line items from received invoices (Fatture Ricevute) are processed.
 *
 * @param invoices - Array of parsed invoice objects
 * @param currentCompanyPiva - Optional current company P.IVA/CF to exclude self-emitted invoices
 * @returns Promise that resolves when line items are saved
 */
export async function extractAndSaveLineItems(
    invoices: FatturaElettronica[],
    currentCompanyPiva?: string
): Promise<void> {
  const lineItems: LineItemRecord[] = [];

  for (const invoice of invoices) {
    // ✋ Salta le fatture emesse: processa SOLO le fatture ricevute
    if (isFatturaEmessa(invoice, currentCompanyPiva)) {
      continue;
    }

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
}

/**
 * Extracts unique supplier list from received invoices for dropdown filtering.
 *
 * @param invoices - Array of parsed invoice objects
 * @param currentCompanyPiva - Optional current company P.IVA/CF to exclude self-emitted invoices
 * @returns Array of unique suppliers with id and name
 */
export function extractUniqueSuppliers(
    invoices: FatturaElettronica[],
    currentCompanyPiva?: string
): Array<{ id: string; name: string }> {
  const suppliersMap = new Map<string, string>();

  for (const invoice of invoices) {
    // ✋ Escludi le fatture emesse
    if (isFatturaEmessa(invoice, currentCompanyPiva)) {
      continue;
    }

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