import { DatiCorrispettivi, RiepilogoCorrispettivo } from "../types";
import { findNode, findNodes, getNodeValue, getNodeFloat, getNodeInt } from "./parser";

/**
 * Validates whether an XML string conforms to the DatiCorrispettivi schema structure.
 */
export function validateCorrispettivoXML(xmlString: string): { valid: boolean; error?: string } {
  try {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlString, "text/xml");

    // Check for XML parsing errors
    const parserError = xmlDoc.getElementsByTagName("parsererror")[0];
    if (parserError) {
      return {
        valid: false,
        error: `Errore sintattico XML: ${parserError.textContent || "Sintassi XML non valida."}`
      };
    }

    const rootNode = findNode(xmlDoc, "DatiCorrispettivi");
    if (!rootNode) {
      return {
        valid: false,
        error: "Elemento radice <DatiCorrispettivi> non trovato nel file XML."
      };
    }

    return { valid: true };
  } catch (err: any) {
    return {
      valid: false,
      error: `Impossibile analizzare il file XML: ${err.message || String(err)}`
    };
  }
}

/**
 * Parses an XML string into a DatiCorrispettivi data structure.
 */
export function parseCorrispettivoXML(xmlString: string, fileName: string): DatiCorrispettivi {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlString, "text/xml");
  const rootNode = findNode(xmlDoc, "DatiCorrispettivi");

  if (!rootNode) {
    throw new Error(`File "${fileName}" non contiene l'elemento radice <DatiCorrispettivi>.`);
  }

  const versione = rootNode.getAttribute("versione") || "COR10";

  // 1. Trasmissione
  const trasmissioneNode = findNode(rootNode, "Trasmissione");
  const progressivo = getNodeValue(trasmissioneNode, "Progressivo", "0");
  const formato = getNodeValue(trasmissioneNode, "Formato", "COR10");

  const dispositivoNode = findNode(trasmissioneNode, "Dispositivo");
  const tipoDispositivo = getNodeValue(dispositivoNode, "Tipo", "RT");
  const idDispositivo = getNodeValue(dispositivoNode, "IdDispositivo", "N/D");

  const geoNode = findNode(dispositivoNode, "GeoLocalizzazione");
  let geoLocalizzazione: { lat: number; long: number } | undefined = undefined;
  if (geoNode) {
    const lat = getNodeFloat(geoNode, "Lat", 0);
    const long = getNodeFloat(geoNode, "Long", 0);
    if (lat !== 0 || long !== 0) {
      geoLocalizzazione = { lat, long };
    }
  }

  const pivaEsercente = getNodeValue(trasmissioneNode, "PIVAEsercente", "");
  const cfEsercente = getNodeValue(trasmissioneNode, "CodiceFiscaleEsercente", "");
  const dataOraTrasmissione = getNodeValue(trasmissioneNode, "DataOraTrasmissione", "");

  // 2. DataOraRilevazione
  const dataOraRilevazione = getNodeValue(rootNode, "DataOraRilevazione", "");
  let dataRilevazione = "";
  if (dataOraRilevazione) {
    dataRilevazione = dataOraRilevazione.split("T")[0];
  } else if (dataOraTrasmissione) {
    dataRilevazione = dataOraTrasmissione.split("T")[0];
  } else {
    dataRilevazione = new Date().toISOString().split("T")[0];
  }

  // 3. PeriodoInattivo
  const periodoInattivoNode = findNode(rootNode, "PeriodoInattivo");
  const isPeriodoInattivo = !!periodoInattivoNode;
  const periodoInattivoDal = getNodeValue(periodoInattivoNode, "Dal", "");
  const periodoInattivoAl = getNodeValue(periodoInattivoNode, "Al", "");

  // 4. Riepilogo & Totali
  const riepilogoList: RiepilogoCorrispettivo[] = [];
  let totaleAmmontare = 0;
  let totaleImposta = 0;
  let totaleImponibile = 0;

  // Search in DatiRT
  const datiRTNode = findNode(rootNode, "DatiRT");
  const datiDCNode = findNode(rootNode, "DatiDC");
  const targetParent = datiRTNode || datiDCNode || rootNode;

  const riepilogoNodes = findNodes(targetParent, "Riepilogo");
  if (riepilogoNodes.length > 0) {
    riepilogoNodes.forEach((riepNode) => {
      const ivaNode = findNode(riepNode, "IVA");
      const aliquotaIva = ivaNode ? getNodeFloat(ivaNode, "AliquotaIVA", 0) : undefined;
      const imposta = ivaNode ? getNodeFloat(ivaNode, "Imposta", 0) : 0;
      const natura = getNodeValue(riepNode, "Natura", "");
      const ammontare = getNodeFloat(riepNode, "Ammontare", 0);
      const importoParziale = getNodeFloat(riepNode, "ImportoParziale", 0);
      const totaleAmmontareResi = getNodeFloat(riepNode, "TotaleAmmontareResi", 0);
      const totaleAmmontareAnnulli = getNodeFloat(riepNode, "TotaleAmmontareAnnulli", 0);
      const rifNormativo = getNodeValue(riepNode, "RifNormativo", "");

      // Imponibile calculation
      let imponibileCalcolato = 0;
      if (aliquotaIva !== undefined && aliquotaIva > 0) {
        imponibileCalcolato = ammontare - imposta;
      } else {
        imponibileCalcolato = ammontare;
      }

      totaleAmmontare += ammontare;
      totaleImposta += imposta;
      totaleImponibile += imponibileCalcolato;

      riepilogoList.push({
        aliquotaIva,
        imposta,
        natura,
        ammontare,
        importoParziale,
        totaleAmmontareResi,
        totaleAmmontareAnnulli,
        rifNormativo,
        imponibileCalcolato
      });
    });
  } else if (datiDCNode) {
    // Handling DocumentoCommercialeType (<DatiDC>)
    const imponibile = getNodeFloat(datiDCNode, "Imponibile", 0);
    const iva = getNodeFloat(datiDCNode, "Iva", 0);
    const resi = getNodeFloat(datiDCNode, "TotaleResi", 0);
    const annulli = getNodeFloat(datiDCNode, "TotaleAnnulli", 0);
    totaleAmmontare = imponibile + iva;
    totaleImposta = iva;
    totaleImponibile = imponibile;

    riepilogoList.push({
      aliquotaIva: 22,
      imposta: iva,
      ammontare: totaleAmmontare,
      totaleAmmontareResi: resi,
      totaleAmmontareAnnulli: annulli,
      imponibileCalcolato: imponibile
    });
  }

  // Parse Totali
  const totaliNode = findNode(targetParent, "Totali") || datiDCNode;
  const numeroDocCommerciali = totaliNode ? getNodeInt(totaliNode, "NumeroDocCommerciali", 0) : 0;
  const pagatoContanti = totaliNode ? getNodeFloat(totaliNode, "PagatoContanti", 0) : 0;
  const pagatoElettronico = totaliNode ? getNodeFloat(totaliNode, "PagatoElettronico", 0) : 0;
  const scontoApagare = totaliNode ? getNodeFloat(totaliNode, "ScontoApagare", 0) : 0;

  const ticketNode = totaliNode ? findNode(totaliNode, "Ticket") : null;
  const ticketPagato = ticketNode ? getNodeFloat(ticketNode, "PagatoTicket", 0) : 0;
  const numeroTicket = ticketNode ? getNodeInt(ticketNode, "NumeroTicket", 0) : 0;

  // Rounding decimals to 2 places
  totaleAmmontare = Math.round(totaleAmmontare * 100) / 100;
  totaleImposta = Math.round(totaleImposta * 100) / 100;
  totaleImponibile = Math.round(totaleImponibile * 100) / 100;

  return {
    id: fileName,
    fileName,
    rawXml: xmlString,
    versione,
    progressivo,
    formato,
    tipoDispositivo,
    idDispositivo,
    geoLocalizzazione,
    pivaEsercente,
    cfEsercente,
    dataOraTrasmissione,
    dataOraRilevazione,
    dataRilevazione,
    isPeriodoInattivo,
    periodoInattivoDal,
    periodoInattivoAl,
    riepilogo: riepilogoList,
    totaleAmmontare,
    totaleImposta,
    totaleImponibile,
    numeroDocCommerciali,
    pagatoContanti,
    pagatoElettronico,
    ticketPagato,
    numeroTicket,
    scontoApagare
  };
}
