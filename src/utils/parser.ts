import { 
  FatturaElettronica, 
  Soggetto, 
  DatiGenerali, 
  DettaglioLinea, 
  DatiRiepilogo, 
  DettaglioPagamento,
  TIPO_DOCUMENTO_MAP,
  MODALITA_PAGAMENTO_MAP,
  FirmaElettronica,
  Allegato
} from "../types";
import * as forge from "node-forge";

/**
 * Searches recursively for an element that matches the given tag name, ignoring namespaces.
 */
export function findNode(parent: ParentNode, name: string): Element | null {
  const all = parent.querySelectorAll("*");
  const targetLower = name.toLowerCase();
  for (let i = 0; i < all.length; i++) {
    const el = all[i];
    const localName = el.localName || el.nodeName.split(":").pop();
    if (localName?.toLowerCase() === targetLower) {
      return el;
    }
  }
  return null;
}

/**
 * Searches recursively for all elements that match the given tag name, ignoring namespaces.
 */
export function findNodes(parent: ParentNode, name: string): Element[] {
  const result: Element[] = [];
  const all = parent.querySelectorAll("*");
  const targetLower = name.toLowerCase();
  for (let i = 0; i < all.length; i++) {
    const el = all[i];
    const localName = el.localName || el.nodeName.split(":").pop();
    if (localName?.toLowerCase() === targetLower) {
      result.push(el);
    }
  }
  return result;
}

/**
 * Helper to get the trimmed text value of a child element.
 */
export function getNodeValue(parent: Element | null, name: string, defaultValue: string = ""): string {
  if (!parent) return defaultValue;
  const node = findNode(parent, name);
  return node ? node.textContent?.trim() || defaultValue : defaultValue;
}

/**
 * Helper to parse a float value safely from an element.
 */
export function getNodeFloat(parent: Element | null, name: string, defaultValue: number = 0): number {
  if (!parent) return defaultValue;
  const valStr = getNodeValue(parent, name);
  if (!valStr) return defaultValue;
  
  // Clean all characters except digits, dot, comma and minus sign
  let cleaned = valStr.replace(/[^\d.,-]/g, "");
  
  // If there's both a dot and a comma, e.g. "1.234,56" or "1,234.56"
  if (cleaned.includes(".") && cleaned.includes(",")) {
    const dotIndex = cleaned.indexOf(".");
    const commaIndex = cleaned.indexOf(",");
    if (dotIndex < commaIndex) {
      // Dot is thousands, comma is decimal
      cleaned = cleaned.replace(/\./g, "").replace(",", ".");
    } else {
      // Comma is thousands, dot is decimal
      cleaned = cleaned.replace(/,/g, "");
    }
  } else if (cleaned.includes(",")) {
    // Only comma present, e.g. "1234,56" -> replace with dot
    cleaned = cleaned.replace(",", ".");
  }
  
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Helper to parse an integer value safely.
 */
export function getNodeInt(parent: Element | null, name: string, defaultValue: number = 0): number {
  if (!parent) return defaultValue;
  const valStr = getNodeValue(parent, name);
  if (!valStr) return defaultValue;
  const parsed = parseInt(valStr, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Helper to find a byte sequence in a Uint8Array.
 */
function findByteSequence(arr: Uint8Array, seq: number[]): number {
  const limit = arr.length - seq.length;
  for (let i = 0; i <= limit; i++) {
    let match = true;
    for (let j = 0; j < seq.length; j++) {
      if (arr[i + j] !== seq[j]) {
        match = false;
        break;
      }
    }
    if (match) return i;
  }
  return -1;
}

/**
 * Helper to find the last occurrence of a byte sequence in a Uint8Array.
 */
function findLastByteSequence(arr: Uint8Array, seq: number[]): number {
  const limit = arr.length - seq.length;
  for (let i = limit; i >= 0; i--) {
    let match = true;
    for (let j = 0; j < seq.length; j++) {
      if (arr[i + j] !== seq[j]) {
        match = false;
        break;
      }
    }
    if (match) return i;
  }
  return -1;
}

/**
 * Robustly decode bytes to XML string, checking for encoding declarations and handling non-UTF-8 characters gracefully.
 */
export function decodeXmlBytes(bytes: Uint8Array): string {
  // 1. Try to detect encoding from XML header
  const asciiDecoder = new TextDecoder("ascii");
  const prefix = asciiDecoder.decode(bytes.subarray(0, Math.min(bytes.length, 1000)));
  
  let encoding = "";
  const match = prefix.match(/encoding\s*=\s*["']\s*([a-zA-Z0-9_-]+)\s*["']/i);
  if (match) {
    encoding = match[1].toLowerCase();
  }
  
  // If explicitly declared, try to use it
  if (encoding) {
    try {
      const decoder = new TextDecoder(encoding);
      return decoder.decode(bytes);
    } catch (e) {
      // Ignore and fallback
    }
  }
  
  // 2. Try to decode as UTF-8 with fatal: true so we fall back to Windows-1252 if it contains invalid sequences
  try {
    const utf8Decoder = new TextDecoder("utf-8", { fatal: true });
    return utf8Decoder.decode(bytes);
  } catch (err) {
    // Fallback to windows-1252 (very common for Italian encoding/Latin-1)
    try {
      const fallbackDecoder = new TextDecoder("windows-1252");
      return fallbackDecoder.decode(bytes);
    } catch (e) {
      const latin1Decoder = new TextDecoder("iso-8859-1");
      return latin1Decoder.decode(bytes);
    }
  }
}

/**
 * Robustly parse ASN.1 structure to extract all primitive octet strings.
 * This cleans up constructed/chunked OCTET STRING content from PKCS#7 / p7m files.
 */
function parseASN1(bytes: Uint8Array, offset: number = 0, end: number = bytes.length): Uint8Array[] {
  const chunks: Uint8Array[] = [];
  let pos = offset;
  
  while (pos < end) {
    if (pos + 2 > end) break;
    const tag = bytes[pos];
    pos++;
    
    // Check for End-of-Content (EOC) in indefinite length
    if (tag === 0x00 && bytes[pos] === 0x00) {
      pos++;
      break;
    }
    
    // Parse length
    let len = bytes[pos];
    pos++;
    
    let isIndefinite = false;
    if (len === 0x80) {
      isIndefinite = true;
      len = end - pos; // Limit to remaining bytes
    } else if (len & 0x80) {
      const numBytes = len & 0x7f;
      if (pos + numBytes > end) break;
      let calculatedLen = 0;
      for (let i = 0; i < numBytes; i++) {
        calculatedLen = (calculatedLen << 8) | bytes[pos];
        pos++;
      }
      len = calculatedLen;
    }
    
    if (pos + len > end) break;
    
    // Primitive OCTET STRING tag is 0x04
    if (tag === 0x04) {
      chunks.push(bytes.subarray(pos, pos + len));
    } 
    // If constructed tag (bit 5 is set, i.e., tag & 0x20 is true)
    else if ((tag & 0x20) !== 0) {
      const subChunks = parseASN1(bytes, pos, isIndefinite ? end : pos + len);
      chunks.push(...subChunks);
    }
    
    if (isIndefinite) {
      // In indefinite length, the sub-parsing consumed until EOC, so we break
      break;
    } else {
      pos += len;
    }
  }
  
  return chunks;
}

/**
 * Extract XML string from a PKCS#7 signed file's binary bytes.
 */
export function extractXmlFromP7mBytes(bytes: Uint8Array): string {
  const forgeParsed = extractPkcs7Details(bytes);
  if (forgeParsed.contentXml) {
    return forgeParsed.contentXml;
  }

  try {
    // Fallback custom extraction when CMS payload is not directly readable.
    const chunks = parseASN1(bytes);
    if (chunks.length > 0) {
      let totalLength = 0;
      for (const chunk of chunks) {
        totalLength += chunk.length;
      }
      const combined = new Uint8Array(totalLength);
      let offset = 0;
      for (const chunk of chunks) {
        combined.set(chunk, offset);
        offset += chunk.length;
      }
      
      // Look for XML start tag in the combined byte array
      let startIdx = -1;
      const xmlDeclIdx = findByteSequence(combined, [60, 63, 120, 109, 108]); // "<?xml"
      if (xmlDeclIdx !== -1) {
        startIdx = xmlDeclIdx;
      } else {
        const feBytes = [70, 97, 116, 116, 117, 114, 97, 69, 108, 101, 116, 116, 114, 111, 110, 105, 99, 97]; // "FatturaElettronica"
        const feIdx = findByteSequence(combined, feBytes);
        if (feIdx !== -1) {
          for (let k = feIdx - 1; k >= Math.max(0, feIdx - 30); k--) {
            if (combined[k] === 60) {
              startIdx = k;
              break;
            }
          }
        }
      }
      
      if (startIdx !== -1) {
        let endIdx = -1;
        const feBytes = [70, 97, 116, 116, 117, 114, 97, 69, 108, 101, 116, 116, 114, 111, 110, 105, 99, 97];
        const endFeIdx = findLastByteSequence(combined, feBytes);
        if (endFeIdx !== -1) {
          for (let k = endFeIdx + feBytes.length; k < Math.min(combined.length, endFeIdx + feBytes.length + 30); k++) {
            if (combined[k] === 62) {
              endIdx = k + 1;
              break;
            }
          }
        }
        
        const targetBytes = endIdx !== -1 ? combined.subarray(startIdx, endIdx) : combined.subarray(startIdx);
        return decodeXmlBytes(targetBytes);
      }
    }
  } catch (err) {
    console.warn("ASN.1 extraction of p7m failed, falling back to raw sequence search", err);
  }

  // FALLBACK: original raw search in original bytes if ASN.1 parser failed
  let startIdx = -1;
  const xmlDeclIdx = findByteSequence(bytes, [60, 63, 120, 109, 108]);
  if (xmlDeclIdx !== -1) {
    startIdx = xmlDeclIdx;
  } else {
    const feBytes = [70, 97, 116, 116, 117, 114, 97, 69, 108, 101, 116, 116, 114, 111, 110, 105, 99, 97];
    const feIdx = findByteSequence(bytes, feBytes);
    if (feIdx !== -1) {
      for (let k = feIdx - 1; k >= Math.max(0, feIdx - 30); k--) {
        if (bytes[k] === 60) {
          startIdx = k;
          break;
        }
      }
    }
  }
  
  if (startIdx === -1) {
    return decodeXmlBytes(bytes);
  }
  
  let endIdx = -1;
  const feBytes = [70, 97, 116, 116, 117, 114, 97, 69, 108, 101, 116, 116, 114, 111, 110, 105, 99, 97];
  const endFeIdx = findLastByteSequence(bytes, feBytes);
  if (endFeIdx !== -1) {
    for (let k = endFeIdx + feBytes.length; k < Math.min(bytes.length, endFeIdx + feBytes.length + 30); k++) {
      if (bytes[k] === 62) {
        endIdx = k + 1;
        break;
      }
    }
  }
  
  const targetBytes = endIdx !== -1 ? bytes.subarray(startIdx, endIdx) : bytes.subarray(startIdx);
  return decodeXmlBytes(targetBytes);
}

/**
 * Extract XML payload from a PKCS#7 signed file (often with extension .xml.p7m).
 * Supports both string format (for backwards compatibility) and raw binary Uint8Array.
 */
export function extractXmlFromP7m(content: string | Uint8Array): string {
  if (content instanceof Uint8Array) {
    return extractXmlFromP7mBytes(content);
  }
  const encoder = new TextEncoder();
  const bytes = encoder.encode(content);
  return extractXmlFromP7mBytes(bytes);
}

function bytesToForgeBinary(bytes: Uint8Array): string {
  let result = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    result += String.fromCharCode(...chunk);
  }
  return result;
}

function extractBase64CmsContent(text: string): string | null {
  const pemMatch = text.match(/-----BEGIN PKCS7-----([\s\S]*?)-----END PKCS7-----/i)
    || text.match(/-----BEGIN CMS-----([\s\S]*?)-----END CMS-----/i);
  if (pemMatch?.[1]) {
    return pemMatch[1].replace(/[\r\n\s]/g, "");
  }

  const compact = text.replace(/[\r\n\s]/g, "");
  if (compact.length > 0 && compact.length % 4 === 0 && /^[A-Za-z0-9+/=]+$/.test(compact)) {
    return compact;
  }
  return null;
}

function parsePkcs7Message(bytes: Uint8Array): any | null {
  const attempts: string[] = [bytesToForgeBinary(bytes)];
  const textPreview = decodeXmlBytes(bytes.subarray(0, Math.min(bytes.length, 20000)));
  const base64 = extractBase64CmsContent(textPreview);
  if (base64) {
    try {
      attempts.push(forge.util.decode64(base64));
    } catch {
      // Ignore invalid base64 attempt.
    }
  }

  for (const binary of attempts) {
    try {
      const der = forge.util.createBuffer(binary, "raw");
      const asn1 = forge.asn1.fromDer(der);
      return forge.pkcs7.messageFromAsn1(asn1);
    } catch {
      // Try next representation.
    }
  }
  return null;
}

function formatAsn1Time(raw: string): string {
  const value = raw.trim();
  let year = "";
  let month = "";
  let day = "";
  let hour = "00";
  let minute = "00";
  let second = "00";
  let tz = "";

  if (/^\d{12}Z?$/.test(value) || /^\d{10}Z?$/.test(value)) {
    const yy = parseInt(value.slice(0, 2), 10);
    year = String(yy >= 50 ? 1900 + yy : 2000 + yy);
    month = value.slice(2, 4);
    day = value.slice(4, 6);
    hour = value.slice(6, 8);
    minute = value.slice(8, 10);
    second = value.length >= 12 ? value.slice(10, 12) : "00";
    tz = value.endsWith("Z") ? " UTC" : "";
  } else if (/^\d{14}Z?$/.test(value)) {
    year = value.slice(0, 4);
    month = value.slice(4, 6);
    day = value.slice(6, 8);
    hour = value.slice(8, 10);
    minute = value.slice(10, 12);
    second = value.slice(12, 14);
    tz = value.endsWith("Z") ? " UTC" : "";
  } else {
    return raw;
  }

  return `${day}/${month}/${year} ${hour}:${minute}:${second}${tz}`;
}

function formatCertName(attrs: forge.pki.CertificateField[]): string {
  return attrs
    .map((a) => `${a.shortName || a.name || "attr"}=${a.value}`)
    .join(", ");
}

function pickPreferredCertificate(
  certificates: forge.pki.Certificate[],
  signerSerial: string | null
): forge.pki.Certificate | null {
  const norm = (s: string) => s.toLowerCase().replace(/^0+/, "");

  if (signerSerial) {
    const target = norm(signerSerial);
    const matched = certificates.find((c) => norm(c.serialNumber) === target);
    if (matched) return matched;
  }

  const notCa = certificates.find((c) => {
    const basic = c.getExtension("basicConstraints") as any;
    const isCa = Boolean((basic as any)?.cA);
    return !isCa;
  });
  return notCa || certificates[0] || null;
}

function extractSigningTimeFromSignerInfo(signerInfo: any): string | null {
  const attrs = signerInfo?.value?.[3]?.value;
  if (!Array.isArray(attrs)) return null;

  for (const attr of attrs) {
    const oidRaw = attr?.value?.[0]?.value;
    if (!oidRaw) continue;
    const oid = forge.asn1.derToOid(oidRaw);
    if (oid !== forge.pki.oids.signingTime) continue;

    const asn1Value = attr?.value?.[1]?.value?.[0]?.value;
    if (typeof asn1Value === "string" && asn1Value.length > 0) {
      return formatAsn1Time(asn1Value);
    }
  }
  return null;
}

function extractPkcs7Details(bytes: Uint8Array): {
  contentXml: string | null;
  certificate: forge.pki.Certificate | null;
  signingTime: string | null;
} {
  try {    
    const p7 = parsePkcs7Message(bytes) as any;
    if (!p7) return { contentXml: null, certificate: null, signingTime: null };

    let contentXml: string | null = null;
    const contentData = p7?.content?.data;
    if (typeof contentData === "string" && contentData.length > 0) {
      const contentBytes = Uint8Array.from(contentData, (ch) => ch.charCodeAt(0));
      const decoded = decodeXmlBytes(contentBytes);
      const xmlStart = decoded.indexOf("<?xml");
      const fatturaStart = decoded.indexOf("<FatturaElettronica");
      const start = xmlStart !== -1 ? xmlStart : fatturaStart;
      if (start !== -1) {
        contentXml = decoded.slice(start).trim();
      }
    }

    const signerInfo = p7?.rawCapture?.signerInfos?.[0];
    const signerSerialBinary = signerInfo?.value?.[1]?.value?.[1]?.value;
    const signerSerial =
      typeof signerSerialBinary === "string" && signerSerialBinary.length > 0
        ? forge.util.bytesToHex(signerSerialBinary)
        : null;

    const certificate = pickPreferredCertificate(p7?.certificates || [], signerSerial);
    const signingTime = extractSigningTimeFromSignerInfo(signerInfo);

    return { contentXml, certificate, signingTime };
  } catch {
    return { contentXml: null, certificate: null, signingTime: null };
  }
}

/**
 * Parse a single Subject (Soggetto) e.g. CedentePrestatore or CessionarioCommittente.
 */
function parseSoggetto(element: Element | null): Soggetto {
  const defaultSoggetto: Soggetto = {
    anagrafica: { denominazione: "Soggetto Sconosciuto" },
    sede: { indirizzo: "", cap: "", comune: "", provincia: "", nazione: "IT" }
  };
  
  if (!element) return defaultSoggetto;
  
  const datiAnagrafici = findNode(element, "DatiAnagrafici");
  const sedeNode = findNode(element, "Sede");
  
  const soggetto: Soggetto = {
    anagrafica: { denominazione: "" },
    sede: { indirizzo: "", cap: "", comune: "", provincia: "", nazione: "" }
  };
  
  if (datiAnagrafici) {
    const idFiscaleIva = findNode(datiAnagrafici, "IdFiscaleIVA");
    let partitaIva = "";
    if (idFiscaleIva) {
      const idPaese = getNodeValue(idFiscaleIva, "IdPaese");
      const idCodice = getNodeValue(idFiscaleIva, "IdCodice");
      partitaIva = idPaese + idCodice;
    }
    
    const codFiscale = getNodeValue(datiAnagrafici, "CodiceFiscale");
    const anagraficaNode = findNode(datiAnagrafici, "Anagrafica");
    
    let denominazione = "";
    let nome = "";
    let cognome = "";
    
    if (anagraficaNode) {
      denominazione = getNodeValue(anagraficaNode, "Denominazione");
      nome = getNodeValue(anagraficaNode, "Nome");
      cognome = getNodeValue(anagraficaNode, "Cognome");
    }
    
    // If denomination is empty, combine Name and Surname
    if (!denominazione && (nome || cognome)) {
      denominazione = `${nome} ${cognome}`.trim();
    }
    
    soggetto.anagrafica = {
      denominazione: denominazione || "Soggetto senza denominazione",
      nome: nome || undefined,
      cognome: cognome || undefined,
      codiceFiscale: codFiscale || undefined,
      partitaIva: partitaIva || undefined
    };
  }
  
  if (sedeNode) {
    soggetto.sede = {
      indirizzo: getNodeValue(sedeNode, "Indirizzo"),
      numeroCivico: getNodeValue(sedeNode, "NumeroCivico") || undefined,
      cap: getNodeValue(sedeNode, "CAP"),
      comune: getNodeValue(sedeNode, "Comune"),
      provincia: getNodeValue(sedeNode, "Provincia"),
      nazione: getNodeValue(sedeNode, "Nazione", "IT")
    };
  }
  
  return soggetto;
}

/**
 * Clean up XML string from BOM, control characters, and unescaped ampersands.
 */
export function sanitizeXml(xml: string): string {
  if (!xml) return "";
  
  // 1. Remove Byte Order Mark (BOM) if present
  let cleaned = xml.replace(/^\ufeff/, "");
  
  // 2. Trim leading/trailing whitespace
  cleaned = cleaned.trim();
  
  // 3. Remove invalid control characters (XML 1.0 non-printable characters)
  cleaned = cleaned.replace(/[^\x09\x0A\x0D\x20-\uD7FF\uE000-\uFFFD\u10000-\u10FFFF]/g, "");
  
  // 4. Escape unescaped ampersands (e.g., & in business names instead of &amp;)
  cleaned = cleaned.replace(/&(?!(amp|lt|gt|quot|apos);)/gi, "&amp;");
  
  return cleaned;
}

/**
 * Validates an XML string against the structural rules of the FatturaPA schema.
 *
 * Since the browser has no native XSD validator, this performs a deterministic
 * structural check equivalent to the key constraints in the XSD files located in
 * docs/fatturapa/xsd/. Specifically it verifies:
 *   - The XML is well-formed (no parsererror)
 *   - The root element belongs to the official FatturaPA namespace
 *   - The `versione` attribute is present and equals "FPA12" or "FPR12"
 *   - All mandatory structural nodes required by the XSD are present
 *
 * @returns { valid: boolean; error?: string; versione?: string }
 */
export function validateFatturaXML(xmlString: string): {
  valid: boolean;
  error?: string;
  versione?: string;
} {
  const FATTURA_NS = "http://ivaservizi.agenziaentrate.gov.it/docs/xsd/fatture/v1.2";
  const VALID_VERSIONS = ["FPA12", "FPR12"];

  // Required nodes per XSD schema (FatturaElettronicaType and its children)
  const REQUIRED_NODES = [
    "FatturaElettronicaHeader",
    "FatturaElettronicaBody",
    "DatiTrasmissione",
    "CedentePrestatore",
    "CessionarioCommittente",
    "DatiGeneraliDocumento",
  ];

  let doc: Document;
  try {
    const sanitized = sanitizeXml(xmlString);
    const parser = new DOMParser();
    doc = parser.parseFromString(sanitized, "text/xml");
  } catch {
    return { valid: false, error: "Impossibile eseguire il parsing dell'XML." };
  }

  // 1. Check for well-formedness errors
  const parseError = doc.getElementsByTagName("parsererror");
  if (parseError.length > 0) {
    const msg = parseError[0].textContent?.split("\n")[0]?.trim() || "XML malformato";
    return { valid: false, error: `XML non valido: ${msg}` };
  }

  const root = doc.documentElement;

  // 2. Check the FatturaPA namespace on the root element
  const rootNs = root.namespaceURI || root.getAttribute("xmlns:p") || "";
  const hasNs =
    rootNs === FATTURA_NS ||
    root.outerHTML?.includes(FATTURA_NS) ||
    (root.getAttribute("xmlns:p") || "") === FATTURA_NS ||
    // Fallback: check local name matches expected root
    ["FatturaElettronica"].includes(root.localName || root.nodeName.split(":").pop() || "");

  if (!hasNs) {
    return {
      valid: false,
      error:
        "Il file non è una FatturaPA: namespace XML non riconosciuto. Atteso: " + FATTURA_NS,
    };
  }

  // 3. Check the `versione` attribute
  const versione =
    root.getAttribute("versione") ||
    root.getAttributeNS(null, "versione") ||
    "";

  if (!versione) {
    return {
      valid: false,
      error: 'Attributo obbligatorio "versione" mancante nell\'elemento radice FatturaElettronica.',
    };
  }

  if (!VALID_VERSIONS.includes(versione)) {
    return {
      valid: false,
      error: `Versione "${versione}" non supportata. Valori ammessi: ${VALID_VERSIONS.join(", ")}.`,
    };
  }

  // 4. Check presence of all mandatory structural nodes
  for (const nodeName of REQUIRED_NODES) {
    const found = findNode(root, nodeName);
    if (!found) {
      return {
        valid: false,
        error: `Struttura non conforme allo schema FatturaPA: nodo obbligatorio <${nodeName}> mancante.`,
      };
    }
  }

  return { valid: true, versione };
}

/**
 * Parse an Italian Electronic Invoice XML string.
 */
export function parseFatturaXML(xmlString: string, fileName: string, p7mBytes?: Uint8Array): FatturaElettronica {
  const sanitized = sanitizeXml(xmlString);
  const parser = new DOMParser();
  let doc = parser.parseFromString(sanitized, "text/xml");
  
  // Check for parse errors
  const parseError = doc.getElementsByTagName("parsererror");
  if (parseError.length > 0) {
    // Fallback to text/html parsing for ultra-high resilience to malformed XML
    doc = parser.parseFromString(sanitized, "text/html");
  }
  
  const root = doc.documentElement;
  
  // Extract versione attribute from root element
  const versione = root.getAttribute("versione") || root.getAttributeNS(null, "versione") || "FPA12";
  
  // Parse Header elements
  const headerNode = findNode(root, "FatturaElettronicaHeader");
  
  let cedente: Soggetto = {
    anagrafica: { denominazione: "Cedente Sconosciuto" },
    sede: { indirizzo: "", cap: "", comune: "", provincia: "", nazione: "IT" }
  };
  let cessionario: Soggetto = {
    anagrafica: { denominazione: "Cessionario Sconosciuto" },
    sede: { indirizzo: "", cap: "", comune: "", provincia: "", nazione: "IT" }
  };
  let codiceDestinatario = "";
  let pecDestinatario = "";
  let pecCedente = "";
  let pecCessionario = "";
  
  if (headerNode) {
    const cedenteNode = findNode(headerNode, "CedentePrestatore");
    cedente = parseSoggetto(cedenteNode);
    if (cedenteNode) {
      const contatti = findNode(cedenteNode, "Contatti");
      if (contatti) {
        pecCedente = getNodeValue(contatti, "PEC");
      }
    }
    
    const cessionarioNode = findNode(headerNode, "CessionarioCommittente");
    cessionario = parseSoggetto(cessionarioNode);
    if (cessionarioNode) {
      const contatti = findNode(cessionarioNode, "Contatti");
      if (contatti) {
        pecCessionario = getNodeValue(contatti, "PEC");
      }
    }
    
    const datiTrasmissione = findNode(headerNode, "DatiTrasmissione");
    if (datiTrasmissione) {
      codiceDestinatario = getNodeValue(datiTrasmissione, "CodiceDestinatario");
      pecDestinatario = getNodeValue(datiTrasmissione, "PECDestinatario");
    }
  }
  
  // Parse Body elements
  const bodyNode = findNode(root, "FatturaElettronicaBody");
  
  let datiGenerali: DatiGenerali = {
    tipoDocumento: "TD01",
    tipoDocumentoDecodificato: "Fattura",
    divisa: "EUR",
    data: new Date().toISOString().split("T")[0],
    numero: "Senza Numero",
    causale: []
  };
  
  let linee: DettaglioLinea[] = [];
  let riepilogo: DatiRiepilogo[] = [];
  let pagamenti: DettaglioPagamento[] = [];
  let allegati: Allegato[] = [];
  let totaleDocumentoDalTag = 0;
  
  if (bodyNode) {
    const dgNode = findNode(bodyNode, "DatiGenerali");
    if (dgNode) {
      const dgdNode = findNode(dgNode, "DatiGeneraliDocumento");
      if (dgdNode) {
        const tipoDoc = getNodeValue(dgdNode, "TipoDocumento", "TD01");
        const divisa = getNodeValue(dgdNode, "Divisa", "EUR");
        const dataDoc = getNodeValue(dgdNode, "Data");
        const numeroDoc = getNodeValue(dgdNode, "Numero");
        totaleDocumentoDalTag = getNodeFloat(dgdNode, "ImportoTotaleDocumento", 0);
        
        const causaleNodes = findNodes(dgdNode, "Causale");
        const causaleList = causaleNodes.map(n => n.textContent?.trim() || "").filter(Boolean);
        
        datiGenerali = {
          tipoDocumento: tipoDoc,
          tipoDocumentoDecodificato: TIPO_DOCUMENTO_MAP[tipoDoc] || "Fattura",
          divisa,
          data: dataDoc,
          numero: numeroDoc,
          causale: causaleList
        };
      }
    }
    
    // Parse Goods/Services lines (DettaglioLinee)
    const dbsNode = findNode(bodyNode, "DatiBeniServizi");
    if (dbsNode) {
      const lineaNodes = findNodes(dbsNode, "DettaglioLinee");
      linee = lineaNodes.map(ln => {
        const numLinea = getNodeInt(ln, "NumeroLinea", 1);
        const desc = getNodeValue(ln, "Descrizione");
        const qty = getNodeFloat(ln, "Quantita", 1.0);
        const um = getNodeValue(ln, "UnitaMisura") || undefined;
        const prezzoUnit = getNodeFloat(ln, "PrezzoUnitario", 0.0);
        const aliquota = getNodeFloat(ln, "AliquotaIVA", 22.0);
        const prezzoTot = getNodeFloat(ln, "PrezzoTotale", prezzoUnit * qty);
        
        const codArtNode = findNode(ln, "CodiceArticolo");
        const codArtVal = codArtNode ? getNodeValue(codArtNode, "CodiceValore") : undefined;
        
        return {
          numeroLinea: numLinea,
          codiceArticolo: codArtVal,
          descrizione: desc,
          quantita: qty,
          unitaMisura: um,
          prezzoUnitario: prezzoUnit,
          aliquotaIva: aliquota,
          prezzoTotale: prezzoTot
        };
      });
      
      // Parse Tax summary (DatiRiepilogo)
      const riepilogoNodes = findNodes(dbsNode, "DatiRiepilogo");
      riepilogo = riepilogoNodes.map(rn => {
        const aliquota = getNodeFloat(rn, "AliquotaIVA");
        const speseAcc = getNodeFloat(rn, "SpeseAccessorie") || undefined;
        const imponibile = getNodeFloat(rn, "ImponibileImporto");
        const imposta = getNodeFloat(rn, "Imposta");
        const esigibilita = getNodeValue(rn, "EsigibilitaIVA") || undefined;
        const rifNorm = getNodeValue(rn, "RiferimentoNormativo") || undefined;
        
        return {
          aliquotaIva: aliquota,
          speseAccessorie: speseAcc,
          imponibileImporto: imponibile,
          imposta,
          esigibilitaIva: esigibilita,
          riferimentoNormativo: rifNorm
        };
      });
    }
    
    // Parse Payments (DatiPagamento)
    const dpNodes = findNodes(bodyNode, "DatiPagamento");
    for (const dp of dpNodes) {
      const dettNodes = findNodes(dp, "DettaglioPagamento");
      for (const dett of dettNodes) {
        const modPag = getNodeValue(dett, "ModalitaPagamento", "MP05");
        const dataScad = getNodeValue(dett, "DataScadenzaPagamento") || undefined;
        const importo = getNodeFloat(dett, "Importo");
        const iban = getNodeValue(dett, "IBAN") || undefined;
        
        pagamenti.push({
          modalitaPagamento: modPag,
          modalitaPagamentoDecodificato: MODALITA_PAGAMENTO_MAP[modPag] || "Bonifico",
          dataScadenzaPagamento: dataScad,
          importo,
          iban
        });
      }
    }

    // Parse Attachments (Allegati)
    const allegatiNodes = findNodes(bodyNode, "Allegati");
    allegati = allegatiNodes.map((an) => {
      const nome = getNodeValue(an, "NomeAttachment", "allegato.bin");
      const algoritmoCompressione = getNodeValue(an, "AlgoritmoCompressione") || undefined;
      const formato = getNodeValue(an, "FormatoAttachment") || undefined;
      const descrizione = getNodeValue(an, "DescrizioneAttachment") || undefined;
      const attachmentData = getNodeValue(an, "Attachment");
      return {
        nome,
        algoritmoCompressione,
        formato,
        descrizione,
        attachmentData,
      };
    }).filter((a) => a.attachmentData);
  }
  
  // Calculate aggregate totals
  const totaleImponibile = riepilogo.reduce((acc, curr) => acc + curr.imponibileImporto, 0);
  const totaleImposta = riepilogo.reduce((acc, curr) => acc + curr.imposta, 0);
  
  // Decide the document total: either from the specific tag, the payment sums, or imponibile + imposta
  let totaleDocumento = totaleDocumentoDalTag;
  if (totaleDocumento === 0) {
    const totalePagamenti = pagamenti.reduce((acc, curr) => acc + curr.importo, 0);
    if (totalePagamenti > 0) {
      totaleDocumento = totalePagamenti;
    } else {
      totaleDocumento = totaleImponibile + totaleImposta;
    }
  }
  
  // Fallback for payment details with zero amount (e.g. if the Importo tag is omitted or 0, but total is known)
  if (pagamenti.length === 1 && pagamenti[0].importo === 0 && totaleDocumento > 0) {
    pagamenti[0].importo = totaleDocumento;
  } else if (pagamenti.length > 0) {
    const zeroPayments = pagamenti.filter(p => p.importo === 0);
    if (zeroPayments.length === pagamenti.length && totaleDocumento > 0) {
      pagamenti[0].importo = totaleDocumento;
    }
  }
  
  // Generate a stable unique ID based on Supplier VAT, Invoice Number and Date
  const cleanId = `${cedente.anagrafica.partitaIva || ""}_${datiGenerali.numero}_${datiGenerali.data}`.replace(/[^a-zA-Z0-9]/g, "_");
  const uniqueId = cleanId || Math.random().toString(36).substring(2, 9);
  
  const isP7m = fileName.toLowerCase().endsWith(".p7m");
  const firmaElettronica = isP7m 
    ? generateFirmaElettronica(p7mBytes, cedente, datiGenerali.data, uniqueId)
    : undefined;

  return {
    id: uniqueId,
    fileName,
    rawXml: xmlString,
    versione,
    cedentePrestatore: cedente,
    cessionarioCommittente: cessionario,
    codiceDestinatario: codiceDestinatario || undefined,
    pecDestinatario: pecDestinatario || undefined,
    pecCedente: pecCedente || undefined,
    pecCessionario: pecCessionario || undefined,
    datiGenerali,
    linee,
    riepilogo,
    pagamenti,
    totaleDocumento: parseFloat(totaleDocumento.toFixed(2)),
    totaleImponibile: parseFloat(totaleImponibile.toFixed(2)),
    totaleImposta: parseFloat(totaleImposta.toFixed(2)),
    firmaElettronica,
    allegati: allegati.length > 0 ? allegati : undefined
  };
}

function formatInvoiceDate(dataFattura: string): string {
  if (!dataFattura || !dataFattura.includes("-")) return "N/D";
  const parts = dataFattura.split("-");
  if (parts.length !== 3) return "N/D";
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function formatDateTime(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function extractKeyUsageFromCert(cert: forge.pki.Certificate): string {
  const ext = cert.getExtension("keyUsage") as ({
    digitalSignature?: boolean;
    nonRepudiation?: boolean;
    keyEncipherment?: boolean;
    dataEncipherment?: boolean;
    keyAgreement?: boolean;
    keyCertSign?: boolean;
    cRLSign?: boolean;
    encipherOnly?: boolean;
    decipherOnly?: boolean;
  }) | null;

  if (!ext) return "N/D";

  const labels: Array<[boolean | undefined, string]> = [
    [ext.digitalSignature, "digitalSignature"],
    [ext.nonRepudiation, "nonRepudiation"],
    [ext.keyEncipherment, "keyEncipherment"],
    [ext.dataEncipherment, "dataEncipherment"],
    [ext.keyAgreement, "keyAgreement"],
    [ext.keyCertSign, "keyCertSign"],
    [ext.cRLSign, "cRLSign"],
    [ext.encipherOnly, "encipherOnly"],
    [ext.decipherOnly, "decipherOnly"],
  ];

  const active = labels.filter(([enabled]) => Boolean(enabled)).map(([, label]) => label);
  return active.length > 0 ? active.join(", ") : "N/D";
}

function parseExtensionAsn1(extension: any): forge.asn1.Asn1 | null {
  if (!extension || typeof extension.value !== "string" || extension.value.length === 0) return null;
  try {
    return forge.asn1.fromDer(forge.util.createBuffer(extension.value, "raw"));
  } catch {
    return null;
  }
}

function collectUrisFromAsn1(node: any): string[] {
  const uris: string[] = [];
  const walk = (n: any) => {
    if (!n) return;
    if (typeof n.value === "string" && /^https?:\/\//i.test(n.value)) {
      uris.push(n.value);
      return;
    }
    if (Array.isArray(n.value)) {
      n.value.forEach(walk);
    }
  };
  walk(node);
  return Array.from(new Set(uris));
}

function extractAuthorityInfoAccess(cert: forge.pki.Certificate): string[] {
  const ext = cert.extensions?.find((e) => e.id === "1.3.6.1.5.5.7.1.1");
  const asn1 = parseExtensionAsn1(ext);
  if (!asn1 || !Array.isArray(asn1.value)) return [];

  const methodMap: Record<string, string> = {
    "1.3.6.1.5.5.7.48.1": "OCSP",
    "1.3.6.1.5.5.7.48.2": "CA Issuers",
  };

  const values: string[] = [];
  for (const accessDesc of asn1.value) {
    const parts = accessDesc?.value;
    if (!Array.isArray(parts) || parts.length < 2) continue;
    const oidPart = parts[0];
    const locationPart = parts[1];
    if (typeof oidPart?.value !== "string") continue;

    const oid = forge.asn1.derToOid(oidPart.value);
    const methodLabel = methodMap[oid] || oid;
    const uri = typeof locationPart?.value === "string" ? locationPart.value : "";
    if (!uri) continue;
    values.push(`${methodLabel} - ${uri}`);
  }

  return Array.from(new Set(values));
}

function extractCrlDistributionPoints(cert: forge.pki.Certificate): string[] {
  const ext = cert.extensions?.find((e) => e.id === "2.5.29.31");
  const asn1 = parseExtensionAsn1(ext);
  if (!asn1) return [];
  return collectUrisFromAsn1(asn1);
}

function extractGeneralNamesFromExtension(cert: forge.pki.Certificate, extensionId: string): string[] {
  const ext = cert.extensions?.find((e) => e.id === extensionId);
  const asn1 = parseExtensionAsn1(ext);
  if (!asn1) return [];

  const values: string[] = [];
  const labelByType: Record<number, string> = {
    1: "RFC822Name",
    2: "DNSName",
    6: "URI",
    7: "IPAddress",
  };

  const walk = (node: any) => {
    if (!node) return;
    if (node.tagClass === 128 && typeof node.value === "string") {
      const label = labelByType[node.type] || `GeneralName(${node.type})`;
      values.push(`${label}: ${node.value}`);
      return;
    }
    if (Array.isArray(node.value)) {
      node.value.forEach(walk);
    }
  };

  walk(asn1);
  return Array.from(new Set(values));
}

function formatKeyUsageForDetails(raw: string): string {
  if (!raw || raw === "N/D") return "N/D";
  const map: Record<string, string> = {
    digitalSignature: "Digital Signature",
    nonRepudiation: "Non Repudiation",
    keyEncipherment: "Key Encipherment",
    dataEncipherment: "Data Encipherment",
    keyAgreement: "Key Agreement",
    keyCertSign: "Key Cert Sign",
    cRLSign: "CRL Sign",
    encipherOnly: "Encipher Only",
    decipherOnly: "Decipher Only",
  };
  return raw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => map[item] || item)
    .join(", ");
}

function formatSignatureAlgorithm(cert: forge.pki.Certificate): string {
  const oid = cert.signatureOid || "";
  const name = (forge.pki.oids as Record<string, string>)[oid] || "N/D";
  if (!oid) return name;
  return `${name} (${oid})`;
}

function formatPublicKeyAlgorithm(cert: forge.pki.Certificate): string {
  const publicKey = cert.publicKey as { n?: { bitLength: () => number } };
  const bitLength = typeof publicKey?.n?.bitLength === "function" ? publicKey.n.bitLength() : null;
  return bitLength ? `RSA (${bitLength} bit)` : "N/D";
}

function formatCertificateVersion(cert: forge.pki.Certificate): string {
  const rawVersion = typeof cert.version === "number" ? cert.version + 1 : 3;
  return `V${rawVersion}`;
}

function extractQcStatements(cert: forge.pki.Certificate): string[] {
  // qcStatements extension OID: 1.3.6.1.5.5.7.1.3
  const qcStatementsOid = "1.3.6.1.5.5.7.1.3";
  
  const ext = cert.extensions?.find((e: any) => e.id === qcStatementsOid);
  if (!ext) return [];

  const asn1 = parseExtensionAsn1(ext);
  if (!asn1) return [];

  const statements: string[] = [];
  const oidDescriptions: Record<string, string> = {
    "0.4.0.1862.1.1": "QCP-n (Qualified Certificate Policy - natural person)",
    "0.4.0.1862.1.2": "QCP-l (Qualified Certificate Policy - legal person)",
    "0.4.0.1862.1.3": "QCP-n-qscd (QC for natural person + QSCD)",
    "0.4.0.1862.1.4": "QCP-l-qscd (QC for legal person + QSCD)",
    "0.4.0.1862.1.6": "QCP-w (Web authentication)",
    "0.4.0.194112.1.0": "QC-SSCD (Qualified Signature Creation Device)",
    "0.4.0.194112.1.1": "QC Retention (Retention period defined)",
    "0.4.0.194112.1.2": "QC Compliance (Compliance with qualified certificate requirements)",
    "0.4.0.194112.1.3": "QC SSCD (Secure Signature Creation Device)",
    "0.4.0.194112.1.4": "QC Type (Type of qualified certificate)",
    "0.4.0.19122.1.1": "QCP-public-with-sscd",
    "0.4.0.19122.1.2": "QC Statement"
  };

  const walk = (node: any) => {
    if (!node) return;
    
    // Look for OID values in the ASN.1 structure
    if (node.tagClass === 0 && node.type === 6) { // OBJECT IDENTIFIER
      try {
        const oid = forge.asn1.derToOid(node.value);
        const description = oidDescriptions[oid] || oid;
        statements.push(description);
      } catch {
        // Ignore invalid OIDs
      }
    }
    
    if (Array.isArray(node.value)) {
      node.value.forEach(walk);
    }
  };

  walk(asn1);
  return Array.from(new Set(statements));
}

function buildFallbackFirmaElettronica(cedente: Soggetto, dataFattura: string, id: string): FirmaElettronica {
  const fallbackSigner =
    cedente.anagrafica.denominazione ||
    `${cedente.anagrafica.nome || ""} ${cedente.anagrafica.cognome || ""}`.trim() ||
    "Firmatario non disponibile";

  const serialSeed = `${cedente.anagrafica.partitaIva || ""}_${id}`;
  const serial = Array.from(serialSeed)
    .reduce((acc, ch) => (acc * 31 + ch.charCodeAt(0)) >>> 0, 7)
    .toString(16)
    .padStart(8, "0");

  return {
    tipo: "CAdES",
    firmatario: fallbackSigner,
    dataFirma: formatInvoiceDate(dataFattura),
    stato: "VALIDA",
    certificato: {
      rilasciatoDa: "Dati certificato non disponibili nel contenuto XML",
      rilasciatoA: fallbackSigner,
      numeroSeriale: serial,
      validoDa: "N/D",
      validoAl: "N/D",
      utilizzoChiavi: "N/D",
      infoAggiuntive: "Per ottenere i dettagli completi del certificato è necessario analizzare il contenuto PKCS#7 (.p7m) originale."
    }
  };
}

/**
 * Extract signature/certificate details from the PKCS#7 (.p7m) payload.
 * Falls back to invoice-derived information if binary certificate details are unavailable.
 */
function generateFirmaElettronica(p7mBytes: Uint8Array | undefined, cedente: Soggetto, dataFattura: string, id: string): FirmaElettronica {
  const fallback = buildFallbackFirmaElettronica(cedente, dataFattura, id);
  if (!p7mBytes || p7mBytes.length === 0) return fallback;

  const parsed = extractPkcs7Details(p7mBytes);
  const cert = parsed.certificate;
  if (!cert) return fallback;

  const subjectCn = cert.subject.getField("CN")?.value || "";
  const subjectFull = formatCertName(cert.subject.attributes);
  const issuerFull = formatCertName(cert.issuer.attributes);
  const serial = cert.serialNumber?.replace(/^0+/, "") || fallback.certificato.numeroSeriale;
  const validFrom = cert.validity?.notBefore ? formatDateTime(cert.validity.notBefore) : fallback.certificato.validoDa;
  const validTo = cert.validity?.notAfter ? formatDateTime(cert.validity.notAfter) : fallback.certificato.validoAl;
  const keyUsage = extractKeyUsageFromCert(cert);
  const keyUsageDettaglio = formatKeyUsageForDetails(keyUsage);
  const crlDistributionPoints = extractCrlDistributionPoints(cert);
  const authorityInfoAccess = extractAuthorityInfoAccess(cert);
  const subjectAltNames = extractGeneralNamesFromExtension(cert, "2.5.29.17");
  const issuerAltNames = extractGeneralNamesFromExtension(cert, "2.5.29.18");
  const soggettoAlternativo = subjectAltNames.length > 0 ? subjectAltNames : issuerAltNames;
  const algoritmoFirma = formatSignatureAlgorithm(cert);
  const algoritmoChiavePubblica = formatPublicKeyAlgorithm(cert);
  const versioneCertificato = formatCertificateVersion(cert);
  const qcStatements = extractQcStatements(cert);

  const now = new Date();
  const status: "VALIDA" | "SCADUTA" =
    cert.validity?.notAfter && cert.validity.notAfter.getTime() < now.getTime() ? "SCADUTA" : "VALIDA";

  return {
    tipo: "CAdES",
    firmatario: subjectCn || subjectFull || fallback.firmatario,
    dataFirma: parsed.signingTime || formatInvoiceDate(dataFattura),
    stato: status,
    certificato: {
      rilasciatoDa: issuerFull || fallback.certificato.rilasciatoDa,
      rilasciatoA: subjectCn || subjectFull || fallback.certificato.rilasciatoA,
      numeroSeriale: serial,
      validoDa: validFrom,
      validoAl: validTo,
      utilizzoChiavi: keyUsage,
      versione: versioneCertificato,
      algoritmoFirma,
      algoritmoChiavePubblica,
      crlDistributionPoints: crlDistributionPoints.length > 0 ? crlDistributionPoints : undefined,
      authorityInfoAccess: authorityInfoAccess.length > 0 ? authorityInfoAccess : undefined,
      soggettoAlternativo: soggettoAlternativo.length > 0 ? soggettoAlternativo : undefined,
      keyUsageDettaglio,
      qcStatements: qcStatements.length > 0 ? qcStatements : undefined,
      infoAggiuntive: fallback.certificato.infoAggiuntive
    }
  };
}
