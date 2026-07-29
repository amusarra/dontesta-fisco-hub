/**
 * Types representing an Italian Electronic Invoice (Fattura Elettronica / FatturaPA)
 */

export interface Anagrafica {
  denominazione: string;
  nome?: string;
  cognome?: string;
  codiceFiscale?: string;
  partitaIva?: string; // combination of IdPaese + IdCodice
}

export interface Azienda {
  id: string;
  denominazione: string;
  partitaIva: string;
  codiceFiscale?: string;
  indirizzo?: string;
  cap?: string;
  comune?: string;
  provincia?: string;
  nazione?: string;
  isDummy?: boolean;
  createdAt: string;
  updatedAt: string;
}

export type InvoiceDirection = "EMESSA" | "RICEVUTA" | "UNCLASSIFIED";


export interface Sede {
  indirizzo: string;
  numeroCivico?: string;
  cap: string;
  comune: string;
  provincia: string;
  nazione: string;
}

export interface Soggetto {
  anagrafica: Anagrafica;
  sede: Sede;
}

export interface DatiGenerali {
  tipoDocumento: string; // e.g. TD01
  tipoDocumentoDecodificato: string; // e.g. Fattura
  divisa: string; // e.g. EUR
  data: string; // YYYY-MM-DD
  numero: string;
  causale: string[];
}

export interface DettaglioLinea {
  numeroLinea: number;
  codiceArticolo?: string;
  descrizione: string;
  quantita: number;
  unitaMisura?: string;
  prezzoUnitario: number;
  aliquotaIva: number;
  prezzoTotale: number;
}

export interface DatiRiepilogo {
  aliquotaIva: number;
  speseAccessorie?: number;
  imponibileImporto: number;
  imposta: number;
  esigibilitaIva?: string; // e.g. S (Scissione pagamenti), I (Immediata)
  riferimentoNormativo?: string;
}

export interface DettaglioPagamento {
  modalitaPagamento: string; // e.g. MP05
  modalitaPagamentoDecodificato: string; // e.g. Bonifico
  dataScadenzaPagamento?: string;
  importo: number;
  iban?: string;
}

export interface DettagliCertificato {
  rilasciatoDa: string;
  rilasciatoA: string;
  numeroSeriale: string;
  validoDa: string;
  validoAl: string;
  utilizzoChiavi: string;
  versione?: string;
  algoritmoFirma?: string;
  algoritmoChiavePubblica?: string;
  crlDistributionPoints?: string[];
  authorityInfoAccess?: string[];
  soggettoAlternativo?: string[];
  keyUsageDettaglio?: string;
  infoAggiuntive?: string;
}

export interface FirmaElettronica {
  tipo: string; // e.g. "CAdES" or "PAdES"
  firmatario: string;
  dataFirma: string;
  stato: "VALIDA" | "NON_VALIDA" | "SCADUTA";
  certificato: DettagliCertificato;
}

export interface Allegato {
  nome: string;
  algoritmoCompressione?: string;
  formato?: string;
  descrizione?: string;
  attachmentData: string; // Base64 encoded string
}

export interface FatturaElettronica {
  id: string; // unique internal ID
  fileName: string;
  rawXml: string;
  versione: string; // "FPA12" (Pubblica Amministrazione) | "FPR12" (Privati)
  
  // Header
  cedentePrestatore: Soggetto; // Supplier / Fornitore
  cessionarioCommittente: Soggetto; // Customer / Cliente
  codiceDestinatario?: string;
  pecDestinatario?: string;
  pecCedente?: string;
  pecCessionario?: string;
  
  // Body
  datiGenerali: DatiGenerali;
  linee: DettaglioLinea[];
  riepilogo: DatiRiepilogo[];
  pagamenti: DettaglioPagamento[];
  
  // Totals calculated or parsed
  totaleDocumento: number;
  totaleImponibile: number;
  totaleImposta: number;

  // Digital Signature
  firmaElettronica?: FirmaElettronica;

  // Attachments
  allegati?: Allegato[];

  // Internal persistence field used to re-hydrate certificate details for .p7m files.
  rawP7mBase64?: string;
}

// Map of Document Types (TipoDocumento)
export const TIPO_DOCUMENTO_MAP: Record<string, string> = {
  "TD01": "TD01 fattura",
  "TD02": "TD02 acconto/anticipo su fattura",
  "TD03": "TD03 acconto/anticipo su parcella",
  "TD04": "TD04 nota di variazione (credito)",
  "TD05": "TD05 nota di debito",
  "TD06": "TD06 parcella",
  "TD16": "TD16 integrazione fattura reverse charge interno",
  "TD17": "TD17 integrazione/autofattura acquisto servizi estero",
  "TD18": "TD18 integrazione acquisto beni intracomunitari",
  "TD19": "TD19 integrazione/autofattura acquisto beni art.17",
  "TD20": "TD20 autofattura per regolarizzazione/integrazione",
  "TD21": "TD21 autofattura per splafonamento",
  "TD22": "TD22 estrazione beni da Deposito IVA",
  "TD23": "TD23 estrazione beni da Deposito IVA con versamento IVA",
  "TD24": "TD24 fattura differita",
  "TD25": "TD25 fattura differita per triangolazione interna",
  "TD26": "TD26 cessione di beni ammortizzabili",
  "TD27": "TD27 fattura per autoconsumo / cessioni gratuite",
  "TD28": "TD28 acquisti da San Marino con IVA"
};

// Map of Payment Methods (ModalitaPagamento)
export const MODALITA_PAGAMENTO_MAP: Record<string, string> = {
  "MP01": "MP01 Contanti",
  "MP02": "MP02 Assegno",
  "MP03": "MP03 Assegno circolare",
  "MP04": "MP04 Contanti presso Tesoreria",
  "MP05": "MP05 Bonifico",
  "MP06": "MP06 Vaglia cambiario",
  "MP07": "MP07 Bollettino bancario",
  "MP08": "MP08 Carta di pagamento",
  "MP09": "MP09 RID",
  "MP10": "MP10 RID utenze",
  "MP11": "MP11 RID veloce",
  "MP12": "MP12 Riba",
  "MP13": "MP13 MAV",
  "MP14": "MP14 Quietanza erario",
  "MP15": "MP15 Giroconto su conti tesoreria",
  "MP16": "MP16 Trattenuta su somme già riscosse",
  "MP17": "MP17 F24",
  "MP18": "MP18 Bollettino postale",
  "MP19": "MP19 Sepa Direct Debit",
  "MP20": "MP20 Sepa Direct Debit Core",
  "MP21": "MP21 Sepa Direct Debit B2B",
  "MP22": "MP22 Trattenuta previdenziale"
};

/**
 * Types representing Agenzia delle Entrate Dati Corrispettivi (XSD COR10)
 */

export interface RiepilogoCorrispettivo {
  aliquotaIva?: number;
  imposta?: number;
  natura?: string;
  ammontare: number;
  importoParziale?: number;
  totaleAmmontareResi?: number;
  totaleAmmontareAnnulli?: number;
  rifNormativo?: string;
  imponibileCalcolato?: number;
}

export interface DatiCorrispettivi {
  id: string; // fileName or unique key
  fileName: string;
  rawXml: string;
  versione: string; // e.g. "COR10"
  
  // Trasmissione
  progressivo: number | string;
  formato: string;
  tipoDispositivo: string; // DA, MC, RT, DM, DC
  idDispositivo: string;
  geoLocalizzazione?: { lat: number; long: number };
  pivaEsercente: string;
  cfEsercente?: string;
  dataOraTrasmissione?: string;
  
  // Rilevazione
  dataOraRilevazione: string; // YYYY-MM-DDTHH:mm:ss
  dataRilevazione: string; // YYYY-MM-DD
  
  // Periodo Inattivo
  isPeriodoInattivo: boolean;
  periodoInattivoDal?: string;
  periodoInattivoAl?: string;
  
  // Riepilogo
  riepilogo: RiepilogoCorrispettivo[];
  
  // Totali
  totaleAmmontare: number;
  totaleImposta: number;
  totaleImponibile: number;
  numeroDocCommerciali: number;
  pagatoContanti: number;
  pagatoElettronico: number;
  ticketPagato: number;
  numeroTicket?: number;
  scontoApagare: number;
}

export const TIPO_DISPOSITIVO_MAP: Record<string, string> = {
  "DA": "Distributore Automatico (DA)",
  "MC": "Multi Cassa (MC)",
  "RT": "Registratore Telematico (RT)",
  "DM": "Dispositivo Multimediale (DM)",
  "DC": "Documento Commerciale (DC)"
};

export const NATURA_IVA_MAP: Record<string, string> = {
  "N1": "N1 - Escluse ex art. 15",
  "N2": "N2 - Non soggette",
  "N3": "N3 - Non imponibili",
  "N4": "N4 - Esenti",
  "N5": "N5 - Regime del margine",
  "N6": "N6 - Altro non IVA"
};

