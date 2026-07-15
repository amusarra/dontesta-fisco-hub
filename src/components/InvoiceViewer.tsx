import React, { useState } from "react";
import { 
  Printer, 
  Download, 
  Code, 
  Maximize2, 
  Building, 
  User, 
  FileText, 
  Info,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  FileCheck2,
  Lock,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Paperclip,
  Eye,
  X,
  Copy,
  Check
} from "lucide-react";
import { FatturaElettronica, TIPO_DOCUMENTO_MAP, MODALITA_PAGAMENTO_MAP } from "../types";
import jsPDF from "jspdf";
import html2canvas from "html2canvas-pro";

function highlightXmlString(xml: string): string {
  if (!xml) return "";
  
  // Robust single-pass XML tokenizer to avoid recursive replace bugs
  const tokenRegex = /(<!--[\s\S]*?-->)|(<\?[\s\S]*?\?>)|(<!\[CDATA\[[\s\S]*?\]\]>)|(<[^>]+>)|([^<]+)/g;
  
  let match;
  let html = "";
  
  while ((match = tokenRegex.exec(xml)) !== null) {
    const [_, comment, prologue, cdata, tag, text] = match;
    
    if (comment) {
      html += `<span class="text-slate-500 italic">${escapeHtml(comment)}</span>`;
    } else if (prologue) {
      html += `<span class="text-cyan-400 font-medium">${escapeHtml(prologue)}</span>`;
    } else if (cdata) {
      html += `<span class="text-amber-200">${escapeHtml(cdata)}</span>`;
    } else if (tag) {
      html += highlightTag(tag);
    } else if (text) {
      html += escapeHtml(text);
    }
  }
  
  return html;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function highlightTag(tag: string): string {
  // Opening or closing tag, e.g. <p:FatturaElettronica ...> or </p:FatturaElettronica> or <br/>
  const tagNameMatch = tag.match(/^(<\/?)([a-zA-Z0-9_:\.-]+)/);
  if (!tagNameMatch) {
    return escapeHtml(tag);
  }
  
  const prefix = tagNameMatch[1]; // "<" or "</"
  const name = tagNameMatch[2]; // tag name
  const remaining = tag.substring(tagNameMatch[0].length);
  
  let highlighted = `<span class="text-pink-400 font-semibold">${escapeHtml(prefix)}${escapeHtml(name)}</span>`;
  
  // Regex to match attributes: space(s) followed by name, optional spaces, =, optional spaces, and quoted value
  const attrRegex = /(\s+)([a-zA-Z0-9_:\.-]+)(\s*=\s*)("[^"]*"|'[^']*')/g;
  let lastIndex = 0;
  let attrMatch;
  
  while ((attrMatch = attrRegex.exec(remaining)) !== null) {
    // Append any text between last match and current match (such as extra spaces)
    highlighted += escapeHtml(remaining.substring(lastIndex, attrMatch.index));
    
    const [_, space, attrName, eq, value] = attrMatch;
    highlighted += space;
    highlighted += `<span class="text-amber-300">${escapeHtml(attrName)}</span>`;
    highlighted += eq;
    highlighted += `<span class="text-emerald-400">${escapeHtml(value)}</span>`;
    
    lastIndex = attrRegex.lastIndex;
  }
  
  // Append any trailing part of the tag (e.g., " />" or ">")
  highlighted += escapeHtml(remaining.substring(lastIndex));
  return highlighted;
}

interface InvoiceViewerProps {
  invoice: FatturaElettronica | null;
  onDownloadXml: (invoice: FatturaElettronica) => void;
  onShowNotification?: (message: string, type: "success" | "error" | "info") => void;
}

export default function InvoiceViewer({ invoice, onDownloadXml, onShowNotification }: InvoiceViewerProps) {
  const [viewTemplate, setViewTemplate] = useState<"Semplificata" | "Completa" | "SorgenteXML">("Semplificata");
  const [zoomScale, setZoomScale] = useState<number>(100); // Zoom level from 75 to 150%
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isFirmaExpanded, setIsFirmaExpanded] = useState<boolean>(false);
  const [activeCertTab, setActiveCertTab] = useState<"Generale" | "Dettagli">("Generale");
  const [showPrintModal, setShowPrintModal] = useState<boolean>(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);
  const [isCopied, setIsCopied] = useState<boolean>(false);

  const handleCopyXml = () => {
    if (!invoice || !invoice.rawXml) return;
    navigator.clipboard.writeText(invoice.rawXml);
    setIsCopied(true);
    if (onShowNotification) {
      onShowNotification("Codice XML copiato negli appunti!", "success");
    }
    setTimeout(() => setIsCopied(false), 2000);
  };

  // Attachment states
  const [previewAttachment, setPreviewAttachment] = useState<any | null>(null);
  const [previewIframeUrl, setPreviewIframeUrl] = useState<string | null>(null);

  // Attachment PDF preview object URL hook
  React.useEffect(() => {
    if (!previewAttachment) {
      setPreviewIframeUrl(null);
      return;
    }
    const ext = (previewAttachment.formato || previewAttachment.nome.split('.').pop() || '').toLowerCase();
    if (ext === 'pdf') {
      try {
        const cleanBase64 = previewAttachment.attachmentData.replace(/\s/g, '');
        const byteCharacters = atob(cleanBase64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        setPreviewIframeUrl(url);
        return () => URL.revokeObjectURL(url);
      } catch (err) {
        console.error("Errore decodifica PDF per preview:", err);
        setPreviewIframeUrl(null);
      }
    } else {
      setPreviewIframeUrl(null);
    }
  }, [previewAttachment]);

  // Helper to resolve MIME type
  const getMimeType = (formato?: string, nome?: string): string => {
    const ext = (formato || nome?.split('.').pop() || '').toLowerCase();
    if (ext === 'pdf') return 'application/pdf';
    if (ext === 'txt') return 'text/plain';
    if (ext === 'xml') return 'text/xml';
    if (ext === 'png') return 'image/png';
    if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
    if (ext === 'gif') return 'image/gif';
    return 'application/octet-stream';
  };

  const handleDownloadAttachment = (att: any) => {
    try {
      const mimeType = getMimeType(att.formato, att.nome);
      const cleanBase64 = att.attachmentData.replace(/\s/g, '');
      const byteCharacters = atob(cleanBase64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = att.nome;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      if (onShowNotification) {
        onShowNotification(`Allegato "${att.nome}" scaricato con successo.`, "success");
      }
    } catch (err) {
      console.error("Errore nel download dell'allegato:", err);
      if (onShowNotification) {
        onShowNotification(`Errore nel download dell'allegato "${att.nome}".`, "error");
      }
    }
  };

  if (!invoice) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-slate-400 bg-[#F8FAFC] h-full select-none" id="viewer-empty-state">
        <div className="p-4 bg-white rounded-sm border border-slate-200 mb-4 shadow-2xs">
          <FileText className="h-10 w-10 text-slate-400 stroke-[1.5]" />
        </div>
        <h3 className="text-sm font-bold text-slate-700 uppercase tracking-widest">Nessuna fattura selezionata</h3>
        <p className="text-xs text-slate-400 max-w-sm text-center mt-2 leading-relaxed">
          Scegli una fattura dall'elenco centrale per visualizzarne i dettagli analitici, esportarla, stamparla o esaminare il codice XML.
        </p>
      </div>
    );
  }

  // Format Date to DD-MM-YYYY
  const formatDate = (dateStr: string): string => {
    if (!dateStr) return "";
    const parts = dateStr.split("-");
    if (parts.length === 3) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return dateStr;
  };

  const handleExportPdf = async () => {
    if (!invoice) return;

    try {
      setIsGeneratingPdf(true);
      if (onShowNotification) {
        onShowNotification("Generazione del file PDF in corso, attendere...", "info");
      }

      const element = document.getElementById("invoice-printable-area");
      if (!element) {
        throw new Error("Area stampabile non trovata nell'applicazione.");
      }

      // Hide temporary elements or scrollbars if any, but html2canvas handles it mostly.
      const canvas = await html2canvas(element, {
        scale: 2, // 2x scale for premium crisp high-DPI rendering
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff", // Pure white sheet background
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const imgWidth = 210; // A4 standard width in mm
      const pageHeight = 297; // A4 standard height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      // Add first page
      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight, undefined, "FAST");
      heightLeft -= pageHeight;

      // Add other pages if content is taller than A4 height
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight, undefined, "FAST");
        heightLeft -= pageHeight;
      }

      let cleanName = invoice.fileName ? invoice.fileName : "fattura";
      cleanName = cleanName
        .replace(/\.xml\s*(\(\d+\))?\.p7m$/i, "$1")
        .replace(/\.xml$/i, "")
        .replace(/\.p7m$/i, "");
      const pdfFileName = `${cleanName}.pdf`;

      pdf.save(pdfFileName);

      if (onShowNotification) {
        onShowNotification(`File PDF "${pdfFileName}" salvato correttamente!`, "success");
      }
    } catch (err: any) {
      console.error("Errore esportazione PDF:", err);
      if (onShowNotification) {
        onShowNotification(`Impossibile generare il PDF: ${err.message || "Errore sconosciuto"}`, "error");
      }
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handlePrint = () => {
    const isIframe = typeof window !== "undefined" && window.self !== window.top;

    if (isIframe) {
      setShowPrintModal(true);
    } else {
      window.print();
    }
  };

  const handleExportHtml = () => {
    const printContent = document.getElementById("invoice-document-scroll");
    if (!printContent || !invoice) return;

    const invoiceHtml = printContent.innerHTML;

    const fullHtml = `<!DOCTYPE html>
<html lang="it">
  <head>
    <title>Fattura Elettronica - ${invoice.fileName}</title>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;700&display=swap');
      
      body {
        font-family: 'Inter', ui-sans-serif, system-ui, -apple-system, sans-serif;
        padding: 32px 16px;
        background-color: #f8fafc;
        color: #0f172a;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      .font-mono {
        font-family: 'JetBrains Mono', monospace !important;
      }
      
      @media print {
        body {
          padding: 0;
          margin: 0;
          background-color: #ffffff;
        }
        .no-print, #export-notice {
          display: none !important;
        }
        @page {
          size: A4 portrait;
          margin: 15mm;
        }
        tr, .card, blockquote, pre {
          page-break-inside: avoid;
        }
      }
    </style>
  </head>
  <body>
    <div id="export-notice" class="max-w-4xl mx-auto mb-6 bg-blue-50 border border-blue-200 p-4 rounded-lg flex items-center justify-between no-print shadow-xs">
      <div class="flex items-center gap-3">
        <svg class="h-5 w-5 text-blue-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div>
          <h4 class="text-xs font-bold text-blue-900">Documento pronto per la stampa</h4>
          <p class="text-[11px] text-blue-700">Questo file contiene l'anteprima esatta della fattura. Puoi stamparla o salvarla in PDF usando il tuo browser.</p>
        </div>
      </div>
      <button 
        onclick="window.print()" 
        class="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-3.5 py-1.5 rounded shadow-sm transition-all"
      >
        Stampa / Salva PDF
      </button>
    </div>

    <div class="max-w-4xl mx-auto bg-white p-8 border border-slate-200 shadow-sm rounded-lg print:border-none print:shadow-none print:p-0">
      ${invoiceHtml}
    </div>
  </body>
</html>`;

    const blob = new Blob([fullHtml], { type: "text/html;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${invoice.fileName.replace(/\.[^/.]+$/, "")}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const isSigned = invoice.fileName.endsWith(".p7m");

  return (
    <div 
      className={`flex-1 flex flex-col bg-white h-full transition-all duration-300 ${
        isFullscreen ? "fixed inset-0 z-50 p-6 bg-slate-100" : ""
      }`} 
      id="dontesta-invoice-viewer"
    >
      {/* 1. Header Toolbar of the Viewer */}
      <div id="viewer-toolbar" className="px-5 py-3 border-b border-slate-200 flex items-center justify-between bg-white shrink-0 shadow-2xs">
        <div className="flex items-center gap-3">
          {/* Template View Dropdown selector */}
          <select
            value={viewTemplate}
            onChange={(e) => setViewTemplate(e.target.value as any)}
            className="text-xs bg-white border border-slate-200 rounded-md px-2.5 py-1.5 font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer transition-colors hover:bg-slate-50"
            id="viewer-template-select"
          >
            <option value="Semplificata">Visualizzazione Semplificata</option>
            <option value="Completa">Visualizzazione Completa</option>
            <option value="SorgenteXML">Sorgente XML originale</option>
          </select>

          {/* Supplier Name header */}
          <div className="hidden lg:flex items-center gap-2 text-xs font-semibold text-slate-600 bg-[#F8FAFC] border border-slate-200 px-3 py-1.5 rounded-md truncate max-w-xs">
            <Building className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            <span className="truncate">
              {invoice.cedentePrestatore.anagrafica.denominazione}
            </span>
          </div>
        </div>

        {/* Toolbar action buttons */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Zoom Controls */}
          <div className="flex items-center gap-1 border border-slate-200 rounded-md p-1 bg-slate-50/50 shrink-0 mr-1.5">
            <button
              onClick={() => setZoomScale(prev => Math.max(75, prev - 10))}
              disabled={zoomScale <= 75}
              className={`p-1 rounded text-slate-600 transition-colors ${
                zoomScale <= 75 
                  ? "opacity-45 cursor-not-allowed text-slate-300" 
                  : "hover:bg-white hover:text-slate-900 cursor-pointer"
              }`}
              title="Riduci Zoom"
              id="zoom-out-btn"
            >
              <ZoomOut className="h-3.5 w-3.5" />
            </button>
            <span className="text-[10px] font-mono font-bold text-slate-500 w-9 text-center shrink-0">
              {zoomScale}%
            </span>
            <button
              onClick={() => setZoomScale(prev => Math.min(175, prev + 10))}
              disabled={zoomScale >= 175}
              className={`p-1 rounded text-slate-600 transition-colors ${
                zoomScale >= 175 
                  ? "opacity-45 cursor-not-allowed text-slate-300" 
                  : "hover:bg-white hover:text-slate-900 cursor-pointer"
              }`}
              title="Aumenta Zoom"
              id="zoom-in-btn"
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Info toggle */}
          <button
            onClick={() => setViewTemplate(viewTemplate === "SorgenteXML" ? "Semplificata" : "SorgenteXML")}
            className={`p-2 rounded-md transition-colors border ${
              viewTemplate === "SorgenteXML"
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white hover:bg-slate-50 text-slate-600 border-slate-200"
            }`}
            title="Mostra Codice XML"
            id="toggle-xml-code-btn"
          >
            <Code className="h-4 w-4" />
          </button>

          {/* Download Original XML */}
          <button
            onClick={() => onDownloadXml(invoice)}
            className="p-2 bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 rounded-md transition-colors"
            title="Scarica File XML"
            id="download-xml-file-btn"
          >
            <Download className="h-4 w-4" />
          </button>

          {/* Print Button */}
          <button
            onClick={handlePrint}
            className="px-3 py-2 bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 rounded-md transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs text-xs font-semibold"
            title="Stampa Fattura"
            id="print-invoice-btn"
          >
            <Printer className="h-4 w-4 text-slate-500" />
            <span className="hidden sm:inline">Stampa</span>
          </button>

          {/* Export PDF Button */}
          <button
            onClick={handleExportPdf}
            disabled={isGeneratingPdf}
            className={`px-3 py-2 bg-red-50 hover:bg-red-100 text-red-750 border border-red-200 rounded-md transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs text-xs font-bold ${
              isGeneratingPdf ? "opacity-60 cursor-not-allowed" : ""
            }`}
            title="Salva come PDF"
            id="export-pdf-btn"
          >
            {isGeneratingPdf ? (
              <span className="inline-block animate-spin h-3.5 w-3.5 border-2 border-red-600 border-t-transparent rounded-full mr-1" />
            ) : (
              <FileText className="h-4 w-4 text-red-600 font-bold" />
            )}
            <span className="hidden sm:inline text-red-700">
              {isGeneratingPdf ? "Generazione..." : "Esporta PDF"}
            </span>
          </button>

          {/* Maximize Toggle */}
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className={`p-2 rounded-md transition-colors border ${
              isFullscreen 
                ? "bg-red-650 text-white border-red-600 hover:bg-red-600" 
                : "bg-white hover:bg-slate-50 text-slate-600 border-slate-200"
            }`}
            title={isFullscreen ? "Chiudi Schermo Intero" : "Attiva Schermo Intero"}
            id="maximize-viewer-btn"
          >
            <Maximize2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* 2. Main content scroll area with responsive font zoom scale */}
      <div 
        className="flex-1 overflow-y-auto p-6 bg-[#F8FAFC] print:bg-white print:p-0"
        id="invoice-document-scroll"
      >
        <style dangerouslySetInnerHTML={{ __html: `
          #invoice-document-scroll .text-\\[10px\\] { font-size: calc(10px * ${zoomScale / 100}) !important; }
          #invoice-document-scroll .text-\\[11px\\] { font-size: calc(11px * ${zoomScale / 100}) !important; }
          #invoice-document-scroll .text-xs { font-size: calc(12px * ${zoomScale / 100}) !important; }
          #invoice-document-scroll .text-sm { font-size: calc(14px * ${zoomScale / 100}) !important; }
          #invoice-document-scroll .text-base { font-size: calc(16px * ${zoomScale / 100}) !important; }
          #invoice-document-scroll .text-lg { font-size: calc(18px * ${zoomScale / 100}) !important; }
          #invoice-document-scroll .text-xl { font-size: calc(20px * ${zoomScale / 100}) !important; }
          #invoice-document-scroll .text-2xl { font-size: calc(24px * ${zoomScale / 100}) !important; }
        ` }} />
        <div className="max-w-4xl mx-auto flex flex-col gap-5 print:max-w-full" id="invoice-printable-area">
          
          {/* XML File Info / Header */}
          <div className="bg-white border border-slate-200 rounded-sm p-4.5 flex flex-wrap items-center justify-between gap-4 shadow-2xs print:border-none print:shadow-none">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-50 rounded-sm border border-slate-200">
                <FileCheck2 className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <div className="font-mono text-[10px] text-slate-400 uppercase font-semibold">Nome file caricato</div>
                <div className="font-bold text-slate-800 font-mono flex items-center gap-1.5 text-sm mt-0.5">
                  {invoice.fileName}
                  {isSigned && (
                    <button 
                      type="button"
                      onClick={() => setIsFirmaExpanded(prev => !prev)}
                      className="inline-flex items-center gap-1 bg-blue-50 hover:bg-blue-100 hover:border-blue-200 text-blue-700 text-[10px] px-2 py-0.5 rounded-sm border border-blue-100 font-sans cursor-pointer transition-colors active:scale-95"
                      title="Clicca per visualizzare i dettagli della firma digitale"
                    >
                      <Lock className="h-2.5 w-2.5" /> Firmato digitalmente (.p7m)
                    </button>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex gap-4 text-right">
              <div>
                <div className="text-[10px] text-slate-400 uppercase font-semibold">Totale Documento</div>
                <div className="font-bold text-slate-900 text-lg font-mono">
                  € {invoice.totaleDocumento.toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
            </div>
          </div>

          {/* DIGITAL SIGNATURE DETAILS (Collapsible Section resembling screenshots 2 & 3) */}
          {isSigned && (
            <div className="bg-[#E0F2FE] border border-blue-200 rounded-sm overflow-hidden shadow-2xs print:hidden transition-all duration-300" id="digital-signature-panel">
              {/* Header bar (Screenshot 2) */}
              <div 
                className="p-3 px-4 flex items-center justify-between gap-3 cursor-pointer hover:bg-[#D0EBFD] select-none transition-colors"
                onClick={() => setIsFirmaExpanded(prev => !prev)}
                id="signature-header-bar"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="shrink-0 bg-emerald-500 text-white rounded-full p-1 border border-emerald-400 flex items-center justify-center">
                    <svg className="h-3 w-3 fill-none stroke-[3] stroke-white" viewBox="0 0 24 24">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-slate-900 text-xs">
                    <span className="font-bold tracking-tight">
                      Firma ({invoice.firmaElettronica?.tipo || "CAdES"}) {invoice.firmaElettronica?.firmatario || "N/D"}
                    </span>
                    <span className="text-slate-500 font-medium">
                      {invoice.firmaElettronica?.dataFirma || "N/D"}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 text-[10px] font-bold px-2.5 py-0.5 rounded-full tracking-wide">
                    {invoice.firmaElettronica?.stato || "N/D"}
                  </span>
                  
                  <button 
                    type="button"
                    className="text-blue-700 hover:text-blue-900 text-xs font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <span>{isFirmaExpanded ? "Nascondi Dettagli" : "Mostra Dettagli"}</span>
                    {isFirmaExpanded ? (
                      <ChevronUp className="h-4 w-4 shrink-0" />
                    ) : (
                      <ChevronDown className="h-4 w-4 shrink-0" />
                    )}
                  </button>
                </div>
              </div>

              {/* Expandable details area (Screenshot 3) */}
              {isFirmaExpanded && (
                <div className="border-t border-blue-200 bg-white p-5 animate-fade-in text-slate-800">
                  {/* Outer Certificate Line item */}
                  <div className="flex items-center gap-2 mb-3 text-xs font-semibold text-slate-700">
                    <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />
                    <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>Certificato</span>
                  </div>

                  {/* Inner Certificate Qualified Line item */}
                  <div className="ml-4 pl-4 border-l border-slate-200">
                    <div className="flex items-center gap-2 mb-4 bg-sky-50 border border-sky-100 rounded p-2.5">
                      <ShieldCheck className="h-4.5 w-4.5 text-emerald-600 shrink-0" />
                      <span className="text-xs font-bold text-sky-950">Certificato Qualificato</span>
                    </div>

                    {/* Tab Navigation */}
                    <div className="flex border-b border-slate-200 mb-4 gap-1">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveCertTab("Generale");
                        }}
                        className={`px-4 py-2 text-xs font-bold transition-all border-b-2 -mb-px cursor-pointer ${
                          activeCertTab === "Generale"
                            ? "border-blue-600 text-blue-700 bg-slate-50 rounded-t"
                            : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50/50"
                        }`}
                      >
                        Generale
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveCertTab("Dettagli");
                        }}
                        className={`px-4 py-2 text-xs font-bold transition-all border-b-2 -mb-px cursor-pointer ${
                          activeCertTab === "Dettagli"
                            ? "border-blue-600 text-blue-700 bg-slate-50 rounded-t"
                            : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50/50"
                        }`}
                      >
                        Dettagli
                      </button>
                    </div>

                    {/* Tab Content: Generale */}
                    {activeCertTab === "Generale" && (
                      <div className="space-y-4 animate-fade-in">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3.5 text-xs text-slate-700">
                          <div>
                            <span className="font-semibold text-slate-400 block mb-0.5 uppercase tracking-wider text-[10px]">Rilasciato da</span>
                            <span className="font-medium text-slate-950">{invoice.firmaElettronica?.certificato.rilasciatoDa || "N/D"}</span>
                          </div>
                          <div>
                            <span className="font-semibold text-slate-400 block mb-0.5 uppercase tracking-wider text-[10px]">Rilasciato a</span>
                            <span className="font-medium text-slate-950">{invoice.firmaElettronica?.certificato.rilasciatoA || "N/D"}</span>
                          </div>
                          <div>
                            <span className="font-semibold text-slate-400 block mb-0.5 uppercase tracking-wider text-[10px]">Numero seriale</span>
                            <span className="font-mono text-slate-950">{invoice.firmaElettronica?.certificato.numeroSeriale || "N/D"}</span>
                          </div>
                          <div>
                            <span className="font-semibold text-slate-400 block mb-0.5 uppercase tracking-wider text-[10px]">Utilizzo chiavi</span>
                            <span className="font-mono text-slate-950 bg-slate-100 px-1.5 py-0.5 rounded text-[10px] w-fit">{invoice.firmaElettronica?.certificato.utilizzoChiavi || "N/D"}</span>
                          </div>
                          <div>
                            <span className="font-semibold text-slate-400 block mb-0.5 uppercase tracking-wider text-[10px]">Valido da</span>
                            <span className="font-medium text-slate-950">{invoice.firmaElettronica?.certificato.validoDa || "N/D"}</span>
                          </div>
                          <div>
                            <span className="font-semibold text-slate-400 block mb-0.5 uppercase tracking-wider text-[10px]">Valido al</span>
                            <span className="font-medium text-slate-950">{invoice.firmaElettronica?.certificato.validoAl || "N/D"}</span>
                          </div>
                        </div>

                        {/* Framed Information Box from Screenshot 3 */}
                        <div className="border border-slate-200 bg-slate-50/50 p-4 rounded text-xs leading-relaxed text-slate-600 font-medium">
                          <p className="font-bold text-slate-800 mb-1.5">Certificato Qualificato conforme al Regolamento UE N. 910/2014 - eIDAS</p>
                          <p className="mb-2">Periodo di conservazione delle informazioni di certificazione: 20 anni</p>
                          <p className="mb-4">
                            La chiave privata associata al certificato risiede in un dispositivo sicuro conforme al Regolamento (UE) N. 910/2014 (QSCD - Qualified Signature/Seal Creation Device)
                          </p>
                          
                          <div className="space-y-2 mt-4 pt-3 border-t border-slate-200/60">
                            <div>
                              <span className="text-[10px] text-slate-400 uppercase font-semibold block mb-0.5">PKI Disclosure Statements (PDS): (it)</span>
                              <a 
                                href="https://www.pec.it/repository/arubapec-qualif-pds-it.pdf" 
                                target="_blank" 
                                rel="referrer noopener"
                                className="text-blue-600 hover:text-blue-800 hover:underline inline-flex items-center gap-1 font-mono text-[11px]"
                              >
                                https://www.pec.it/repository/arubapec-qualif-pds-it.pdf
                                <ExternalLink className="h-3 w-3 inline shrink-0" />
                              </a>
                            </div>
                            <div>
                              <span className="text-[10px] text-slate-400 uppercase font-semibold block mb-0.5">PKI Disclosure Statements (PDS): (en)</span>
                              <a 
                                href="https://www.pec.it/repository/arubapec-qualif-pds-en.pdf" 
                                target="_blank" 
                                rel="referrer noopener"
                                className="text-blue-600 hover:text-blue-800 hover:underline inline-flex items-center gap-1 font-mono text-[11px]"
                              >
                                https://www.pec.it/repository/arubapec-qualif-pds-en.pdf
                                <ExternalLink className="h-3 w-3 inline shrink-0" />
                              </a>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Tab Content: Dettagli (Technical details) */}
                    {activeCertTab === "Dettagli" && (
                      <div className="space-y-4 animate-fade-in">
                        <div className="border border-slate-200 rounded overflow-hidden">
                          <table className="min-w-full divide-y divide-slate-200 text-xs">
                            <tbody className="bg-white divide-y divide-slate-200 font-mono text-[11px] text-slate-700">
                              <tr className="flex flex-col sm:table-row">
                                <td className="px-4 py-2 font-semibold text-slate-500 bg-slate-50/30 sm:w-1/3">Versione</td>
                                <td className="px-4 py-2 text-slate-900">{invoice.firmaElettronica?.certificato.versione || "N/D"}</td>
                              </tr>
                              <tr className="flex flex-col sm:table-row">
                                <td className="px-4 py-2 font-semibold text-slate-500 bg-slate-50/30">Algoritmo di Firma</td>
                                <td className="px-4 py-2 text-slate-900">{invoice.firmaElettronica?.certificato.algoritmoFirma || "N/D"}</td>
                              </tr>
                              <tr className="flex flex-col sm:table-row">
                                <td className="px-4 py-2 font-semibold text-slate-500 bg-slate-50/30">Algoritmo Chiave Pubblica</td>
                                <td className="px-4 py-2 text-slate-900">{invoice.firmaElettronica?.certificato.algoritmoChiavePubblica || "N/D"}</td>
                              </tr>
                              <tr className="flex flex-col sm:table-row">
                                <td className="px-4 py-2 font-semibold text-slate-500 bg-slate-50/30">CRL Distribution Points</td>
                                <td className="px-4 py-2">
                                  {invoice.firmaElettronica?.certificato.crlDistributionPoints?.length ? (
                                    <div className="space-y-0.5">
                                      {invoice.firmaElettronica.certificato.crlDistributionPoints.map((value, index) => (
                                        <div key={index} className="text-slate-800 break-all">{value}</div>
                                      ))}
                                    </div>
                                  ) : (
                                    <span className="text-slate-800">N/D</span>
                                  )}
                                </td>
                              </tr>
                              <tr className="flex flex-col sm:table-row">
                                <td className="px-4 py-2 font-semibold text-slate-500 bg-slate-50/30">Authority Info Access</td>
                                <td className="px-4 py-2">
                                  {invoice.firmaElettronica?.certificato.authorityInfoAccess?.length ? (
                                    <div className="space-y-0.5">
                                      {invoice.firmaElettronica.certificato.authorityInfoAccess.map((value, index) => (
                                        <div key={index} className="text-slate-800 break-all">{value}</div>
                                      ))}
                                    </div>
                                  ) : (
                                    <span className="text-slate-800">N/D</span>
                                  )}
                                </td>
                              </tr>
                              <tr className="flex flex-col sm:table-row">
                                <td className="px-4 py-2 font-semibold text-slate-500 bg-slate-50/30">Estensione "Key Usage"</td>
                                <td className="px-4 py-2">
                                  <span className="text-emerald-700 font-semibold bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded text-[10px]">
                                    {invoice.firmaElettronica?.certificato.keyUsageDettaglio || invoice.firmaElettronica?.certificato.utilizzoChiavi || "N/D"}
                                  </span>
                                </td>
                              </tr>
                              <tr className="flex flex-col sm:table-row">
                                <td className="px-4 py-2 font-semibold text-slate-500 bg-slate-50/30">Soggetto Alternativo (SAN)</td>
                                <td className="px-4 py-2 text-slate-900 break-all">
                                  {invoice.firmaElettronica?.certificato.soggettoAlternativo?.length ? (
                                    <div className="space-y-0.5">
                                      {invoice.firmaElettronica.certificato.soggettoAlternativo.map((value, index) => (
                                        <div key={index}>{value}</div>
                                      ))}
                                    </div>
                                  ) : (
                                    "N/D"
                                  )}
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* VIEW ROUTING */}
          {viewTemplate === "SorgenteXML" ? (
            /* XML CODE SORGENTE VIEW */
            <div className="bg-slate-950 text-slate-200 rounded-sm p-5 overflow-auto font-mono text-xs leading-relaxed border border-slate-800 shadow-lg max-h-[75vh]" id="raw-xml-inspector">
              <div className="flex justify-between items-center pb-3 border-b border-slate-800 mb-4 shrink-0">
                <span className="text-blue-400 font-semibold flex items-center gap-1.5">
                  <Code className="h-4 w-4 text-blue-500" /> Dettaglio XML Originale
                  {invoice.versione && (
                    <span
                      className={`ml-2 inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest border ${
                        invoice.versione === "FPR12"
                          ? "bg-emerald-950 text-emerald-300 border-emerald-700"
                          : "bg-blue-950 text-blue-300 border-blue-700"
                      }`}
                      title={
                        invoice.versione === "FPR12"
                          ? "Fattura verso Privati (FPR12)"
                          : "Fattura verso Pubblica Amministrazione (FPA12)"
                      }
                    >
                      {invoice.versione}
                    </span>
                  )}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopyXml}
                    className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-slate-300 rounded border border-slate-700 text-[11px] font-medium transition-all cursor-pointer"
                    title="Copia l'intero XML negli appunti"
                  >
                    {isCopied ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Copiato!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5 text-slate-400" />
                        <span>Copia XML</span>
                      </>
                    )}
                  </button>
                  <span className="text-slate-500 text-[10px] uppercase tracking-wider hidden sm:inline">Sola Lettura</span>
                </div>
              </div>
              <pre 
                className="whitespace-pre-wrap break-all select-text"
                dangerouslySetInnerHTML={{ __html: highlightXmlString(invoice.rawXml || "") }}
              />
            </div>
          ) : (
            /* COMPREHENSIVE FATTURA VIEW */
            <div className="flex flex-col gap-5 bg-white border border-slate-200 rounded-sm p-6 shadow-2xs print:border-none print:shadow-none print:p-0">
              
              {/* 2-Column Section: CEDENTE vs CESSIONARIO */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* CEDENTE PRESTATORE (Supplier) */}
                <div className="border border-slate-200 bg-white rounded-sm p-4.5 flex flex-col gap-3">
                  <div className="border-b border-slate-100 pb-2 text-xs font-bold text-slate-950 uppercase tracking-widest flex items-center gap-1.5">
                    <Building className="h-4 w-4 text-blue-600" />
                    Cedente / Prestatore (Fornitore)
                  </div>
                  
                  <div className="flex flex-col gap-2.5 text-xs text-slate-700">
                    <div>
                      <div className="text-[10px] uppercase font-bold text-slate-400">Denominazione</div>
                      <div className="font-bold text-slate-900 text-sm mt-0.5">
                        {invoice.cedentePrestatore.anagrafica.denominazione}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <div className="text-[10px] uppercase font-bold text-slate-400">Identificativo IVA / P.IVA</div>
                        <div className="font-mono font-bold text-slate-900 mt-0.5">
                          {invoice.cedentePrestatore.anagrafica.partitaIva || "Non indicata"}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase font-bold text-slate-400">Codice Fiscale</div>
                        <div className="font-mono font-bold text-slate-900 mt-0.5">
                          {invoice.cedentePrestatore.anagrafica.codiceFiscale || "Non indicato"}
                        </div>
                      </div>
                    </div>

                    <div>
                      <div className="text-[10px] uppercase font-bold text-slate-400">Indirizzo Sede</div>
                      <div className="font-medium text-slate-800 mt-0.5">
                        {invoice.cedentePrestatore.sede.indirizzo} {invoice.cedentePrestatore.sede.numeroCivico && `, ${invoice.cedentePrestatore.sede.numeroCivico}`}
                      </div>
                      <div className="font-medium text-slate-800">
                        {invoice.cedentePrestatore.sede.cap} - {invoice.cedentePrestatore.sede.comune} ({invoice.cedentePrestatore.sede.provincia})
                      </div>
                      <div className="text-[10px] text-slate-500 uppercase mt-0.5 font-bold">Nazione: {invoice.cedentePrestatore.sede.nazione}</div>
                    </div>
                    {invoice.pecCedente && (
                      <div className="mt-1 pt-1.5 border-t border-slate-100">
                        <div className="text-[10px] uppercase font-bold text-slate-400">PEC Fornitore</div>
                        <div className="font-mono text-slate-700 text-[10px] mt-0.5 break-all select-all">
                          {invoice.pecCedente}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* CESSIONARIO COMMITTENTE (Customer) */}
                <div className="border border-slate-200 bg-white rounded-sm p-4.5 flex flex-col gap-3">
                  <div className="border-b border-slate-100 pb-2 text-xs font-bold text-slate-950 uppercase tracking-widest flex items-center gap-1.5">
                    <User className="h-4 w-4 text-blue-600" />
                    Cessionario / Committente (Cliente)
                  </div>
                  
                  <div className="flex flex-col gap-2.5 text-xs text-slate-700">
                    <div>
                      <div className="text-[10px] uppercase font-bold text-slate-400">Denominazione</div>
                      <div className="font-bold text-slate-900 text-sm mt-0.5">
                        {invoice.cessionarioCommittente.anagrafica.denominazione}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <div className="text-[10px] uppercase font-bold text-slate-400">Partita IVA Cliente</div>
                        <div className="font-mono font-bold text-slate-900 mt-0.5">
                          {invoice.cessionarioCommittente.anagrafica.partitaIva || "Non indicata"}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase font-bold text-slate-400">Codice Fiscale</div>
                        <div className="font-mono font-bold text-slate-900 mt-0.5">
                          {invoice.cessionarioCommittente.anagrafica.codiceFiscale || "Non indicato"}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <div className="text-[10px] uppercase font-bold text-slate-400">Indirizzo Sede</div>
                        <div className="font-medium text-slate-800 mt-0.5 truncate font-mono">
                          {invoice.cessionarioCommittente.sede.indirizzo} {invoice.cessionarioCommittente.sede.numeroCivico && `, ${invoice.cessionarioCommittente.sede.numeroCivico}`}
                        </div>
                        <div className="font-medium text-slate-800 font-mono">
                          {invoice.cessionarioCommittente.sede.cap} - {invoice.cessionarioCommittente.sede.comune} ({invoice.cessionarioCommittente.sede.provincia})
                        </div>
                        <div className="text-[10px] text-slate-500 uppercase mt-0.5 font-bold">Nazione: {invoice.cessionarioCommittente.sede.nazione}</div>
                      </div>
                      <div className="flex flex-col gap-2">
                        {invoice.codiceDestinatario && (
                          <div>
                            <div className="text-[10px] uppercase font-bold text-blue-600">Codice Destinatario</div>
                            <div className="font-mono font-extrabold text-blue-700 bg-blue-50/60 border border-blue-200/50 px-2 py-0.5 rounded-sm inline-block mt-0.5 tracking-wider text-xs">
                              {invoice.codiceDestinatario}
                            </div>
                          </div>
                        )}
                        {invoice.pecDestinatario && (
                          <div>
                            <div className="text-[10px] uppercase font-bold text-teal-650">PEC Destinatario (SDI)</div>
                            <div className="font-mono font-semibold text-teal-700 bg-teal-50/60 border border-teal-200/50 px-2 py-0.5 rounded-sm inline-block mt-0.5 text-[10px] break-all select-all">
                              {invoice.pecDestinatario}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    {invoice.pecCessionario && (
                      <div className="mt-1 pt-1.5 border-t border-slate-100">
                        <div className="text-[10px] uppercase font-bold text-slate-400">PEC Cliente</div>
                        <div className="font-mono text-slate-700 text-[10px] mt-0.5 break-all select-all">
                          {invoice.pecCessionario}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Document Meta Section */}
              <div className="border border-slate-200 bg-white rounded-sm p-4.5 flex flex-col gap-3">
                <div className="border-b border-slate-100 pb-2 text-xs font-bold text-slate-950 uppercase tracking-widest flex items-center gap-1.5">
                  <FileText className="h-4 w-4 text-blue-600" />
                  Estremi del Documento
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                  <div>
                    <div className="text-[10px] uppercase font-bold text-slate-400">Tipologia Documento</div>
                    <div className="font-bold text-slate-900 mt-1">
                      {invoice.datiGenerali.tipoDocumentoDecodificato}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase font-bold text-slate-400">Numero Documento</div>
                    <div className="font-mono font-bold text-slate-900 mt-1 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-sm inline-block">
                      {invoice.datiGenerali.numero}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase font-bold text-slate-400">Data Documento</div>
                    <div className="font-bold text-slate-900 mt-1 font-mono">
                      {formatDate(invoice.datiGenerali.data)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase font-bold text-slate-400">Articolo 73</div>
                    <div className="font-bold text-slate-500 mt-1">No</div>
                  </div>
                </div>
              </div>

              {/* Causale (Notes) Box */}
              {invoice.datiGenerali.causale.length > 0 && (
                <div className="border border-slate-200 bg-blue-50/10 rounded-sm p-4.5 border-l-4 border-l-blue-600">
                  <div className="text-[10px] uppercase font-bold text-slate-950 tracking-wider flex items-center gap-1.5 mb-1.5">
                    <Info className="h-4 w-4 text-blue-600" />
                    Causale / Note del Documento
                  </div>
                  <div className="text-xs text-slate-700 italic leading-relaxed flex flex-col gap-1.5 font-sans">
                    {invoice.datiGenerali.causale.map((c, idx) => (
                      <p key={idx}>{c}</p>
                    ))}
                  </div>
                </div>
              )}

              {/* Table of Goods / Services (DettaglioLinee) */}
              <div className="flex flex-col gap-2">
                <div className="text-xs font-bold text-slate-950 uppercase tracking-widest px-1">
                  Dettaglio Linee (Beni / Servizi)
                </div>
                <div className="overflow-x-auto border border-slate-200 rounded-sm shadow-2xs">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-[#F8FAFC] border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                        <th className="py-2.5 px-3 w-10 text-center">N°</th>
                        <th className="py-2.5 px-3 min-w-[200px]">Descrizione Articolo / Servizio</th>
                        <th className="py-2.5 px-3 text-right w-16">Quantità</th>
                        <th className="py-2.5 px-3 text-right w-24">Prezzo Unitario</th>
                        <th className="py-2.5 px-3 text-center w-14">U.M.</th>
                        <th className="py-2.5 px-3 text-center w-16">IVA %</th>
                        <th className="py-2.5 px-3 text-right w-28">Totale riga</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {invoice.linee.map((l, idx) => (
                        <tr key={`${l.numeroLinea}-${idx}`} className="hover:bg-slate-50/50">
                          <td className="py-2.5 px-3 text-center font-mono text-slate-400 font-semibold">{l.numeroLinea}</td>
                          <td className="py-2.5 px-3">
                            <div className="font-semibold text-slate-900">{l.descrizione}</div>
                            {l.codiceArticolo && (
                              <div className="text-[10px] text-slate-400 font-mono mt-0.5">Cod. Art: {l.codiceArticolo}</div>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono">
                            {l.quantita.toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono">
                            € {l.prezzoUnitario.toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="py-2.5 px-3 text-center text-slate-500 font-bold">{l.unitaMisura || "-"}</td>
                          <td className="py-2.5 px-3 text-center font-mono font-semibold text-blue-600">{l.aliquotaIva}%</td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                            € {l.prezzoTotale.toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Dynamic technical section depending on visual mode */}
              {viewTemplate === "Completa" && (
                /* ADVANCED: Tax Summary breakdown (DatiRiepilogo) */
                <div className="flex flex-col gap-2 mt-2">
                  <div className="text-xs font-bold text-slate-950 uppercase tracking-widest px-1 flex items-center gap-1.5">
                    <span className="w-1.5 h-3 bg-blue-600 rounded-sm" />
                    Riepilogo per Aliquota e Totale (Dati di Riepilogo)
                  </div>
                  <div className="overflow-x-auto border border-slate-200 rounded-sm shadow-2xs">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-[#F8FAFC] border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                          <th className="py-2.5 px-3">% IVA</th>
                          <th className="py-2.5 px-3 text-right">Spese Accessorie</th>
                          <th className="py-2.5 px-3 text-right">Imponibile</th>
                          <th className="py-2.5 px-3 text-right">Imposta (IVA)</th>
                          <th className="py-2.5 px-3 text-center">Esigibilità</th>
                          <th className="py-2.5 px-3">Riferimento Normativo</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700 font-mono">
                        {invoice.riepilogo.map((r, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/50">
                            <td className="py-2.5 px-3 font-semibold text-slate-900 font-sans">{r.aliquotaIva}%</td>
                            <td className="py-2.5 px-3 text-right">
                              {r.speseAccessorie ? `€ ${r.speseAccessorie.toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "-"}
                            </td>
                            <td className="py-2.5 px-3 text-right font-bold text-slate-800">
                              € {r.imponibileImporto.toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td className="py-2.5 px-3 text-right font-bold text-blue-600">
                              € {r.imposta.toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td className="py-2.5 px-3 text-center font-bold font-sans">
                              {r.esigibilitaIva === "S" ? "Scissione" : r.esigibilitaIva === "I" ? "Immediata" : r.esigibilitaIva || "-"}
                            </td>
                            <td className="py-2.5 px-3 font-sans text-slate-500 text-[10px] max-w-[200px] truncate" title={r.riferimentoNormativo}>
                              {r.riferimentoNormativo || "-"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Simple Bottom Row: Summary Totals Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border border-slate-200 bg-[#F8FAFC] rounded-sm p-4 mt-1 font-mono text-xs">
                <div className="flex justify-between items-center px-2 py-1 border-b sm:border-b-0 sm:border-r border-slate-200">
                  <span className="text-slate-500 font-sans font-semibold">Tot. Imponibile:</span>
                  <span className="font-bold text-slate-800">
                    € {invoice.totaleImponibile.toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between items-center px-2 py-1 border-b sm:border-b-0 sm:border-r border-slate-200">
                  <span className="text-slate-500 font-sans font-semibold">Tot. Imposta (IVA):</span>
                  <span className="font-bold text-slate-850">
                    € {invoice.totaleImposta.toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between items-center px-2 py-1">
                  <span className="text-blue-700 font-sans font-extrabold">Tot. DOCUMENTO:</span>
                  <span className="font-black text-slate-900 text-sm bg-blue-50/60 px-2.5 py-0.5 rounded-sm border border-blue-200/55">
                    € {invoice.totaleDocumento.toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Payment details Section */}
              {invoice.pagamenti.length > 0 && (
                <div className="border border-slate-200 bg-[#F8FAFC]/50 rounded-sm p-4.5 flex flex-col gap-3">
                  <div className="text-xs font-bold text-slate-950 uppercase tracking-widest px-1">
                    Modalità di Pagamento
                  </div>
                  <div className="flex flex-col gap-2.5 text-xs">
                    {invoice.pagamenti.map((p, idx) => (
                      <div key={idx} className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-white p-3 rounded-sm border border-slate-200 shadow-2xs font-sans">
                        <div>
                          <div className="text-[9px] uppercase font-bold text-slate-400">Metodo di Pagamento</div>
                          <div className="font-bold text-slate-800 mt-0.5">{p.modalitaPagamentoDecodificato}</div>
                        </div>
                        <div>
                          <div className="text-[9px] uppercase font-bold text-slate-400">Scadenza</div>
                          <div className="font-bold text-slate-850 mt-0.5 font-mono">
                            {p.dataScadenzaPagamento ? formatDate(p.dataScadenzaPagamento) : "Immediato / Non specificato"}
                          </div>
                        </div>
                        <div className="sm:col-span-2 flex justify-between items-center gap-4">
                          <div className="min-w-0 flex-1">
                            {p.iban && (
                              <>
                                <div className="text-[9px] uppercase font-bold text-slate-400">IBAN Accreditamento</div>
                                <div className="font-mono text-[10px] font-semibold text-slate-500 truncate select-all mt-0.5" title={p.iban}>
                                  {p.iban}
                                </div>
                              </>
                            )}
                          </div>
                          <div className="text-right shrink-0">
                            <div className="text-[9px] uppercase font-bold text-slate-400">Importo da Pagare</div>
                            <div className="font-extrabold text-slate-900 text-xs mt-0.5 bg-[#F8FAFC] px-2 py-0.5 rounded-sm border border-slate-200 font-mono">
                              € {p.importo.toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ATTACHMENTS (Allegati) - Fulfills Requirement 2 */}
              {invoice.allegati && invoice.allegati.length > 0 && (
                <div className="border border-slate-200 bg-white rounded-sm p-4.5 flex flex-col gap-3 shadow-2xs mt-1" id="invoice-attachments-panel">
                  <div className="border-b border-slate-100 pb-2 text-xs font-bold text-slate-950 uppercase tracking-widest flex items-center gap-1.5">
                    <Paperclip className="h-4 w-4 text-blue-600 shrink-0" />
                    Allegati disponibili ({invoice.allegati.length})
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1">
                    {invoice.allegati.map((att, idx) => {
                      const ext = (att.formato || att.nome.split('.').pop() || '').toLowerCase();
                      return (
                        <div key={idx} className="border border-slate-150 rounded-sm bg-slate-50/50 p-3 flex flex-col justify-between gap-3 hover:border-slate-300 hover:bg-slate-50 transition-colors">
                          <div className="flex items-start gap-2.5 min-w-0">
                            <div className="p-2 bg-blue-50 text-blue-600 border border-blue-100 rounded-sm shrink-0 mt-0.5">
                              <FileText className="h-4.5 w-4.5" />
                            </div>
                            <div className="min-w-0">
                              <div className="font-bold text-slate-800 text-xs truncate" title={att.nome}>
                                {att.nome}
                              </div>
                              <div className="text-[10px] text-slate-400 font-mono mt-0.5 uppercase font-bold">
                                Formato: {ext} {att.algoritmoCompressione && `• Compressione: ${att.algoritmoCompressione}`}
                              </div>
                              {att.descrizione && (
                                <p className="text-[11px] text-slate-500 mt-1 italic line-clamp-2 leading-tight" title={att.descrizione}>
                                  {att.descrizione}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 pt-2 border-t border-slate-100/60 justify-end">
                            <button
                              onClick={() => setPreviewAttachment(att)}
                              className="px-2.5 py-1 text-[11px] font-black text-blue-700 bg-blue-50 border border-blue-100 rounded hover:bg-blue-100 active:scale-95 transition-all cursor-pointer flex items-center gap-1 shrink-0"
                            >
                              <Eye className="h-3 w-3" /> Anteprima
                            </button>
                            
                            <button
                              onClick={() => handleDownloadAttachment(att)}
                              className="px-2.5 py-1 text-[11px] font-black text-slate-700 bg-white border border-slate-200 rounded hover:bg-slate-50 active:scale-95 transition-all cursor-pointer flex items-center gap-1 shrink-0"
                            >
                              <Download className="h-3 w-3" /> Scarica
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

            </div>
          )}
        </div>
      </div>

      {/* 3. Bottom status bar with fully functional Zoom slider and previous/next buttons */}
      <div className="px-5 py-3 border-t border-slate-200 bg-[#F8FAFC] shrink-0 flex flex-wrap items-center justify-between gap-4 select-none print:hidden shadow-2xs">
        {/* Zoom Controls */}
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Dimensioni Vista</span>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setZoomScale(Math.max(75, zoomScale - 10))} 
              className="p-1 text-slate-500 hover:text-slate-850 hover:bg-slate-200/60 rounded transition-colors"
              title="Rimpicciolisci"
            >
              <ZoomOut className="h-3.5 w-3.5" />
            </button>
            <input 
              type="range" 
              min="75" 
              max="150" 
              step="5"
              value={zoomScale} 
              onChange={(e) => setZoomScale(parseInt(e.target.value))}
              className="w-24 h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-650"
            />
            <button 
              onClick={() => setZoomScale(Math.min(150, zoomScale + 10))} 
              className="p-1 text-slate-500 hover:text-slate-850 hover:bg-slate-200/60 rounded transition-colors"
              title="Ingrandisci"
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </button>
            <span className="font-mono text-xs text-slate-600 font-bold min-w-[40px] text-right">
              {zoomScale}%
            </span>
          </div>
        </div>

        {/* Action instruction hints */}
        <div className="text-[11px] text-slate-400 font-medium">
          DonTesta FatturaPA • Visualizzatore di Fattura Elettronica in tempo reale
        </div>
      </div>

      {/* SANDBOX PRINT INSTRUCTION MODAL */}
      {showPrintModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-[9999] animate-fade-in print:hidden">
          <div className="bg-white border border-slate-200 rounded-xl max-w-lg w-full overflow-hidden shadow-2xl flex flex-col">
            {/* Header */}
            <div className="bg-amber-50 border-b border-amber-100 p-4 flex items-center gap-3 shrink-0">
              <div className="w-10 h-10 bg-amber-500/15 text-amber-600 rounded-full flex items-center justify-center shrink-0">
                <Printer className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-amber-900 uppercase tracking-wide">Limiti di Stampa / PDF</h3>
                <p className="text-[11px] text-amber-700 font-medium">L'anteprima protetta di Google AI Studio blocca la stampa diretta</p>
              </div>
            </div>

            {/* Body */}
            <div className="p-5 text-slate-600 space-y-4">
              <p className="text-xs leading-relaxed font-medium">
                Per ragioni di sicurezza, i browser bloccano l'apertura delle finestre di stampa (<code className="font-mono bg-slate-100 px-1 py-0.5 rounded text-red-650">window.print()</code>) all'interno degli iframe protetti (come la console di sviluppo di AI Studio).
              </p>

              <div className="border border-slate-150 rounded-lg overflow-hidden bg-slate-50/50">
                <div className="p-3.5 border-b border-slate-150 hover:bg-slate-50 transition-colors">
                  <div className="flex items-start gap-2.5">
                    <span className="flex-shrink-0 w-5 h-5 bg-red-600 text-white rounded-full text-[10px] font-black flex items-center justify-center mt-0.5">1</span>
                    <div className="flex-1">
                      <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        Esporta direttamente in PDF (Client-Side)
                        <span className="text-[9px] bg-emerald-100 text-emerald-800 font-extrabold px-1.5 py-0.5 rounded-sm">Consigliato!</span>
                      </h4>
                      <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                        Genera e scarica direttamente il file PDF elaborato in tempo reale dal browser. Questa opzione bypassa i blocchi di sicurezza dell'iframe.
                      </p>
                      <button
                        onClick={() => {
                          handleExportPdf();
                          setShowPrintModal(false);
                        }}
                        disabled={isGeneratingPdf}
                        className="mt-2 text-[10px] font-black bg-red-600 hover:bg-red-700 disabled:opacity-60 disabled:cursor-not-allowed active:scale-98 text-white px-3 py-1.5 rounded-md cursor-pointer flex items-center gap-1 transition-all"
                      >
                        <FileText className="h-3 w-3" /> {isGeneratingPdf ? "Generazione..." : "Esporta PDF ora"}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="p-3.5 border-b border-slate-150 hover:bg-slate-50 transition-colors">
                  <div className="flex items-start gap-2.5">
                    <span className="flex-shrink-0 w-5 h-5 bg-blue-600 text-white rounded-full text-[10px] font-black flex items-center justify-center mt-0.5">2</span>
                    <div className="flex-1">
                      <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        Scarica come file HTML autonomo
                      </h4>
                      <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                        Scarica un file HTML pulito con stili e caratteri già pronti. Potrai aprirlo in qualsiasi browser per stamparlo o salvarlo in PDF.
                      </p>
                      <button
                        onClick={() => {
                          handleExportHtml();
                          setShowPrintModal(false);
                        }}
                        className="mt-2 text-[10px] font-black bg-blue-600 hover:bg-blue-700 active:scale-98 text-white px-3 py-1.5 rounded-md cursor-pointer flex items-center gap-1 transition-all"
                      >
                        <Download className="h-3 w-3" /> Scarica ora (.html)
                      </button>
                    </div>
                  </div>
                </div>

                <div className="p-3.5 border-b border-slate-150 hover:bg-slate-50 transition-colors">
                  <div className="flex items-start gap-2.5">
                    <span className="flex-shrink-0 w-5 h-5 bg-slate-700 text-white rounded-full text-[10px] font-black flex items-center justify-center mt-0.5">3</span>
                    <div className="flex-1">
                      <h4 className="text-xs font-bold text-slate-900">Apri l'applicazione in una nuova scheda</h4>
                      <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                        Clicca sull'icona <strong>"Apri in una nuova scheda"</strong> in alto a destra nell'editor di AI Studio. La stampa standard e l'esportazione PDF funzioneranno istantaneamente senza restrizioni dell'iframe.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-3.5 hover:bg-slate-50 transition-colors">
                  <div className="flex items-start gap-2.5">
                    <span className="flex-shrink-0 w-5 h-5 bg-slate-700 text-white rounded-full text-[10px] font-black flex items-center justify-center mt-0.5">4</span>
                    <div className="flex-1">
                      <h4 className="text-xs font-bold text-slate-900">Usa l'applicazione Desktop (Tauri)</h4>
                      <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                        L'applicazione Desktop integrata genererà ed esporterà direttamente il file PDF ad ogni richiesta di stampa o esportazione.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-slate-50 border-t border-slate-150 px-5 py-3.5 flex items-center justify-between shrink-0">
              <button
                onClick={() => {
                  setShowPrintModal(false);
                  window.print(); // Force try anyway
                }}
                className="text-[10px] font-bold text-slate-400 hover:text-slate-600 cursor-pointer transition-colors"
                title="Tenta comunque la stampa del browser"
              >
                Forza Stampa Comunque
              </button>
              
              <button
                onClick={() => setShowPrintModal(false)}
                className="bg-slate-200 hover:bg-slate-300 active:scale-95 text-slate-700 px-4 py-1.5 rounded-md font-bold text-xs cursor-pointer transition-all"
              >
                Chiudi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ATTACHMENT PREVIEW OVERLAY MODAL */}
      {previewAttachment && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-[9999] animate-fade-in print:hidden" id="viewer-attachment-preview-modal">
          <div className="bg-white border border-slate-200 rounded-xl max-w-4xl w-full h-[80vh] overflow-hidden shadow-2xl flex flex-col">
            
            {/* Modal Header */}
            <div className="bg-slate-50 border-b border-slate-200 p-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Paperclip className="h-5 w-5 text-blue-600 shrink-0" />
                <div>
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">
                    Anteprima Allegato
                  </h3>
                  <p className="text-[10px] text-slate-500 font-medium">
                    {previewAttachment.nome}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setPreviewAttachment(null)}
                className="p-1.5 rounded-full hover:bg-slate-200 text-slate-500 transition-colors cursor-pointer"
                title="Chiudi anteprima"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 min-h-0 flex flex-col bg-slate-50">
              {/* Active Preview Action Bar */}
              <div className="bg-white border-b border-slate-200 px-5 py-2.5 flex items-center justify-between gap-4 shrink-0">
                <div className="min-w-0">
                  <div className="font-mono text-[10px] font-bold text-slate-400 uppercase">Dettagli file</div>
                  <div className="font-bold text-slate-850 text-xs truncate mt-0.5" title={previewAttachment.nome}>
                    {previewAttachment.nome} {previewAttachment.formato && `(.${previewAttachment.formato.toLowerCase()})`}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {previewAttachment.descrizione && (
                    <span className="hidden md:inline text-[10px] text-slate-500 italic truncate max-w-sm" title={previewAttachment.descrizione}>
                      {previewAttachment.descrizione}
                    </span>
                  )}
                  <button
                    onClick={() => handleDownloadAttachment(previewAttachment)}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-3 py-1.5 rounded-md transition-all active:scale-95 cursor-pointer flex items-center gap-1 shadow-2xs"
                  >
                    <Download className="h-3.5 w-3.5" /> Scarica
                  </button>
                </div>
              </div>

              {/* Preview Content Container */}
              <div className="flex-1 min-h-0 p-5 overflow-auto flex items-center justify-center">
                {(() => {
                  const ext = (previewAttachment.formato || previewAttachment.nome.split('.').pop() || '').toLowerCase();
                  const cleanBase64 = previewAttachment.attachmentData.replace(/\s/g, '');

                  if (ext === 'pdf' && previewIframeUrl) {
                    return (
                      <iframe
                        src={previewIframeUrl}
                        className="w-full h-full border border-slate-200 rounded-sm bg-white"
                        title={previewAttachment.nome}
                      />
                    );
                  } else if (ext === 'txt') {
                    return (
                      <div className="w-full h-full bg-white border border-slate-200 rounded-sm p-5 overflow-auto text-xs leading-relaxed font-mono whitespace-pre-wrap text-slate-800 select-text">
                        {(() => {
                          try {
                            const bytes = new Uint8Array(atob(cleanBase64).split("").map(c => c.charCodeAt(0)));
                            return new TextDecoder("utf-8").decode(bytes);
                          } catch (e) {
                            return "Impossibile decodificare il file di testo.";
                          }
                        })()}
                      </div>
                    );
                  } else if (['png', 'jpg', 'jpeg', 'gif'].includes(ext)) {
                    return (
                      <div className="max-w-full max-h-full overflow-auto flex items-center justify-center bg-white border border-slate-200 rounded-sm p-2 shadow-2xs">
                        <img
                          src={`data:image/${ext === 'jpg' ? 'jpeg' : ext};base64,${cleanBase64}`}
                          alt={previewAttachment.nome}
                          className="max-w-full max-h-[60vh] object-contain"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    );
                  } else {
                    return (
                      <div className="flex flex-col items-center justify-center text-center p-8 bg-white border border-slate-200 rounded-lg max-w-md shadow-2xs gap-3">
                        <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-slate-400">
                          <FileText className="h-6 w-6" />
                        </div>
                        <h4 className="text-sm font-bold text-slate-700">Nessuna anteprima disponibile</h4>
                        <p className="text-xs text-slate-500 max-w-xs">
                          L'anteprima non è disponibile per i file con estensione <span className="font-mono bg-slate-100 px-1 py-0.5 rounded font-bold">.{ext}</span>. Puoi comunque scaricare il file per aprirlo sul tuo dispositivo.
                        </p>
                        <button
                          onClick={() => handleDownloadAttachment(previewAttachment)}
                          className="mt-1 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-250 font-bold text-xs px-4 py-2 rounded-md cursor-pointer transition-all active:scale-95 flex items-center gap-1.5"
                        >
                          <Download className="h-4 w-4 text-slate-500" /> Scarica file sul computer
                        </button>
                      </div>
                    );
                  }
                })()}
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
