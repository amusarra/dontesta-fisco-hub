import React, { useState, useRef } from "react";
import { 
  Search, 
  FileText, 
  Calendar, 
  CheckCircle, 
  User, 
  Send, 
  Plus, 
  RotateCcw,
  FileSpreadsheet,
  AlertCircle,
  Trash2,
  CheckSquare,
  Square,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Paperclip,
  Eye,
  X,
  Download
} from "lucide-react";
import { FatturaElettronica, TIPO_DOCUMENTO_MAP, Allegato } from "../types";

interface InvoiceListProps {
  invoices: FatturaElettronica[];
  selectedInvoice: FatturaElettronica | null;
  onSelectInvoice: (invoice: FatturaElettronica) => void;
  onUploadInvoices: (files: FileList) => void;
  onResetDatabase: () => void;
  onDeleteInvoices: (ids: string[]) => void;
  onShowNotification?: (message: string, type: "success" | "error" | "info") => void;
}

export default function InvoiceList({
  invoices,
  selectedInvoice,
  onSelectInvoice,
  onUploadInvoices,
  onResetDatabase,
  onDeleteInvoices,
  onShowNotification,
}: InvoiceListProps) {
  const [docTypeFilter, setDocTypeFilter] = useState("Tutta"); // "Tutta" means All
  const [searchTerm, setSearchTerm] = useState("");
  const [multiSelectActive, setMultiSelectActive] = useState<boolean>(false);
  const [selectedForDelete, setSelectedForDelete] = useState<string[]>([]);
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(5);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // States for card attachments preview modal
  const [previewModalData, setPreviewModalData] = useState<{ invoice: FatturaElettronica, allegati: Allegato[] } | null>(null);
  const [activePreviewIndex, setActivePreviewIndex] = useState<number>(0);
  const [previewIframeUrl, setPreviewIframeUrl] = useState<string | null>(null);

  // Reset pagination to page 1 if filters, search, raw list, or itemsPerPage changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [docTypeFilter, searchTerm, invoices, itemsPerPage]);

  // Clean up object URLs on preview change
  React.useEffect(() => {
    if (!previewModalData) {
      setPreviewIframeUrl(null);
      return;
    }
    const activeAtt = previewModalData.allegati[activePreviewIndex];
    if (!activeAtt) return;

    const ext = (activeAtt.formato || activeAtt.nome.split('.').pop() || '').toLowerCase();
    if (ext === 'pdf') {
      try {
        const cleanBase64 = activeAtt.attachmentData.replace(/\s/g, '');
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
  }, [previewModalData, activePreviewIndex]);

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

  // Helper to convert base64 to Blob safely
  const base64ToBlob = (base64: string, mimeType: string): Blob => {
    const clean = base64.replace(/\s/g, '');
    const byteCharacters = atob(clean);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mimeType });
  };

  const handleDownloadCardAttachments = (allegati: Allegato[]) => {
    let successCount = 0;
    allegati.forEach((att) => {
      try {
        const mimeType = getMimeType(att.formato, att.nome);
        const blob = base64ToBlob(att.attachmentData, mimeType);
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = att.nome;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        successCount++;
      } catch (err) {
        console.error("Errore nel download dell'allegato:", err);
      }
    });

    if (successCount > 0 && onShowNotification) {
      if (successCount === 1) {
        onShowNotification(`Allegato "${allegati[0].nome}" scaricato con successo.`, "success");
      } else {
        onShowNotification(`${successCount} allegati scaricati con successo.`, "success");
      }
    } else if (successCount === 0 && allegati.length > 0 && onShowNotification) {
      onShowNotification("Errore durante il download degli allegati.", "error");
    }
  };

  const handlePreviewCardAttachments = (invoice: FatturaElettronica, allegati: Allegato[]) => {
    setPreviewModalData({ invoice, allegati });
    setActivePreviewIndex(0);
  };

  // Filter invoices based on Document Type dropdown and text search
  const filteredInvoices = invoices.filter((inv) => {
    // 1. Doc Type filter
    if (docTypeFilter !== "Tutta" && inv.datiGenerali.tipoDocumento !== docTypeFilter) {
      return false;
    }

    // 2. Text Search (Matches number, supplier name, customer name, or description)
    const query = searchTerm.toLowerCase();
    if (!query) return true;

    const numMatch = inv.datiGenerali.numero.toLowerCase().includes(query);
    const supplierMatch = inv.cedentePrestatore.anagrafica.denominazione.toLowerCase().includes(query);
    const customerMatch = inv.cessionarioCommittente.anagrafica.denominazione.toLowerCase().includes(query);
    const lineMatch = inv.linee.some(line => line.descrizione.toLowerCase().includes(query));
    
    return numMatch || supplierMatch || customerMatch || lineMatch;
  });

  // Sort invoices by date
  const sortedInvoices = [...filteredInvoices].sort((a, b) => {
    const dateA = a.datiGenerali.data || "";
    const dateB = b.datiGenerali.data || "";
    if (sortOrder === "desc") {
      return dateB.localeCompare(dateA);
    } else {
      return dateA.localeCompare(dateB);
    }
  });

  const totalPages = Math.max(1, Math.ceil(sortedInvoices.length / itemsPerPage));
  const activePage = Math.min(currentPage, totalPages);

  const startIndex = (activePage - 1) * itemsPerPage;
  const paginatedInvoices = sortedInvoices.slice(startIndex, startIndex + itemsPerPage);

  // Extract unique document types present in current database for filter dropdown
  const uniqueDocTypes = Array.from(
    new Set(invoices.map((inv) => inv.datiGenerali.tipoDocumento))
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onUploadInvoices(e.target.files);
      // Reset input value so same file can be uploaded again if needed
      e.target.value = "";
    }
  };

  const handleTriggerUpload = () => {
    fileInputRef.current?.click();
  };

  // Export current list to CSV
  const handleExportCSV = () => {
    if (filteredInvoices.length === 0) return;
    
    // Header
    const headers = ["ID", "Nome File", "Tipo Documento", "Numero", "Data", "Cedente", "Cedente P.IVA", "Cessionario", "Cessionario CF", "Imponibile", "Imposta", "Totale"];
    const rows = filteredInvoices.map(inv => [
      inv.id,
      inv.fileName,
      inv.datiGenerali.tipoDocumentoDecodificato,
      inv.datiGenerali.numero,
      inv.datiGenerali.data,
      inv.cedentePrestatore.anagrafica.denominazione,
      inv.cedentePrestatore.anagrafica.partitaIva || "",
      inv.cessionarioCommittente.anagrafica.denominazione,
      inv.cessionarioCommittente.anagrafica.codiceFiscale || "",
      inv.totaleImponibile.toString(),
      inv.totaleImposta.toString(),
      inv.totaleDocumento.toString()
    ]);

    const csvContent = [
      headers.join(";"),
      ...rows.map(row => row.map(val => `"${val.replace(/"/g, '""')}"`).join(";"))
    ].join("\n");

    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `elenco_fatture_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Helper to format Date from YYYY-MM-DD to DD/MM/YYYY
  const formatDateStr = (dateStr: string): string => {
    if (!dateStr) return "";
    const parts = dateStr.split("-");
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  };

  return (
    <div className="flex-1 min-w-[360px] max-w-lg flex flex-col bg-white border-r border-slate-200 h-full select-none" id="dontesta-invoice-list">
      {/* Top Filter and Actions Row */}
      <div className="p-4 border-b border-slate-100 flex flex-col gap-3">
        {/* Dropdown & Search & Actions Row */}
        <div className="flex items-center gap-2">
          {/* Doc Type Dropdown */}
          <select
            value={docTypeFilter}
            onChange={(e) => setDocTypeFilter(e.target.value)}
            className="text-xs bg-white border border-slate-200 rounded-md px-2.5 py-2 font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer shrink-0"
            id="doc-type-filter"
          >
            <option value="Tutta">Tutte le tipologie</option>
            {uniqueDocTypes.map((type) => (
              <option key={type} value={type}>
                {type} - {TIPO_DOCUMENTO_MAP[type]?.split(" ").slice(1).join(" ") || "Documento"}
              </option>
            ))}
          </select>

          {/* Search bar */}
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Cerca fattura..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-slate-800"
              id="invoice-text-search"
            />
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
          </div>

          {/* Hidden File Input for uploading */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            multiple
            accept=".xml,.p7m"
            className="hidden"
            id="upload-file-input"
          />

          {/* Action buttons */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Upload XML Button */}
            <button
              onClick={handleTriggerUpload}
              className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors shadow-sm cursor-pointer"
              title="Carica Fatture XML/P7M"
              id="upload-xml-btn"
            >
              <Plus className="h-4 w-4 stroke-[2.5]" />
            </button>

            {/* Export CSV Button */}
            <button
              onClick={handleExportCSV}
              disabled={filteredInvoices.length === 0}
              className={`p-2 rounded-md transition-colors border shadow-sm ${
                filteredInvoices.length > 0 
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 cursor-pointer" 
                  : "bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed"
              }`}
              title="Esporta elenco in CSV (Excel)"
              id="export-csv-btn"
            >
              <FileSpreadsheet className="h-4 w-4" />
            </button>

            {/* Multi-Selection Toggle Button */}
            <button
              onClick={() => {
                setMultiSelectActive(!multiSelectActive);
                setSelectedForDelete([]); // Clear selections on toggle
              }}
              className={`p-2 rounded-md transition-colors border shadow-sm ${
                multiSelectActive 
                  ? "bg-red-50 text-red-700 border-red-200 hover:bg-red-100 cursor-pointer" 
                  : "bg-white hover:bg-slate-50 text-slate-600 border-slate-200 cursor-pointer"
              }`}
              title={multiSelectActive ? "Disattiva Selezione Multipla" : "Attiva Selezione Multipla"}
              id="toggle-multiselect-btn"
            >
              <CheckSquare className="h-4 w-4" />
            </button>

            {/* Reset Database Button */}
            <button
              onClick={onResetDatabase}
              className="p-2 bg-white hover:bg-red-50 text-slate-600 hover:text-red-600 rounded-md transition-colors border border-slate-200 hover:border-red-200 cursor-pointer"
              title="Elimina tutti i dati caricati"
              id="reset-db-btn"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Sorting and Total Results Sub-row */}
        <div className="flex items-center justify-between text-xs font-semibold pt-1 border-t border-slate-100 select-none">
          <div className="text-slate-500">
            Fatture: <span className="font-extrabold text-slate-800">{filteredInvoices.length}</span>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <div className="flex items-center gap-1">
              <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Ordina:</span>
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as "desc" | "asc")}
                className="bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 text-[11px] font-black text-slate-700 hover:bg-slate-100 hover:text-slate-900 cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                id="invoice-sort-order"
              >
                <option value="desc">Data decrescente</option>
                <option value="asc">Data crescente</option>
              </select>
            </div>

            <div className="flex items-center gap-1">
              <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Mostra:</span>
              <select
                value={itemsPerPage}
                onChange={(e) => setItemsPerPage(Number(e.target.value))}
                className="bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 text-[11px] font-black text-slate-700 hover:bg-slate-100 hover:text-slate-900 cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                id="invoice-items-per-page"
              >
                {[5, 10, 15, 20, 25, 30].map(val => (
                  <option key={val} value={val}>{val}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Invoices List Panel */}
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2.5 bg-[#F8FAFC]">
        {multiSelectActive && filteredInvoices.length > 0 && (
          <div className="bg-red-50/60 border border-red-100 rounded-sm p-2.5 flex flex-col gap-2 shrink-0 animate-fade-in text-xs mb-1">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-red-800">
                {selectedForDelete.length} di {filteredInvoices.length} selezionate
              </span>
              <div className="flex gap-1.5">
                <button
                  onClick={() => {
                    if (selectedForDelete.length === filteredInvoices.length) {
                      setSelectedForDelete([]);
                    } else {
                      setSelectedForDelete(filteredInvoices.map((i) => i.id));
                    }
                  }}
                  className="px-2 py-1 bg-white hover:bg-slate-50 border border-slate-200 rounded text-slate-700 font-bold cursor-pointer text-[10px] transition-colors"
                >
                  {selectedForDelete.length === filteredInvoices.length ? "Deseleziona tutti" : "Seleziona tutti"}
                </button>
                <button
                  onClick={() => {
                    onDeleteInvoices(selectedForDelete);
                    setSelectedForDelete([]);
                  }}
                  disabled={selectedForDelete.length === 0}
                  className={`px-2.5 py-1 rounded font-bold flex items-center gap-1 cursor-pointer text-[10px] transition-colors ${
                    selectedForDelete.length > 0
                      ? "bg-red-600 hover:bg-red-700 text-white"
                      : "bg-slate-100 text-slate-350 cursor-not-allowed border border-slate-200"
                  }`}
                >
                  <Trash2 className="h-3 w-3" /> Elimina selezionate
                </button>
              </div>
            </div>
          </div>
        )}

        {paginatedInvoices.map((inv) => {
          const isSelected = selectedInvoice?.id === inv.id;
          const isChecked = selectedForDelete.includes(inv.id);
          
          return (
            <div
              key={inv.id}
              onClick={() => onSelectInvoice(inv)}
              className={`p-3.5 text-left transition-all duration-150 cursor-pointer border flex gap-3 items-center ${
                isSelected
                  ? "bg-blue-50/50 border-y border-r border-l-4 border-l-blue-600 border-y-blue-100/80 border-r-blue-100/80 rounded-r-sm rounded-l-none shadow-2xs font-medium"
                  : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50 rounded-sm shadow-2xs"
              }`}
              id={`invoice-card-${inv.id}`}
            >
              {multiSelectActive && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (isChecked) {
                      setSelectedForDelete((prev) => prev.filter((id) => id !== inv.id));
                    } else {
                      setSelectedForDelete((prev) => [...prev, inv.id]);
                    }
                  }}
                  className="p-1 rounded-sm text-slate-400 hover:text-slate-600 cursor-pointer transition-colors shrink-0"
                >
                  {isChecked ? (
                    <CheckSquare className="h-5 w-5 text-red-600 fill-red-50" />
                  ) : (
                    <Square className="h-5 w-5 text-slate-300" />
                  )}
                </button>
              )}
              
              <div className="flex-1 min-w-0">
                {/* Row 1: Document ID + Date + DocType + Actions */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    {/* Status Indicator circle */}
                    <span className={`w-2 h-2 rounded-full inline-block shrink-0 ${
                      isSelected ? "bg-blue-500" : "bg-emerald-500"
                    }`}></span>

                    {/* Document icon & Number */}
                    <div className="flex items-center gap-1 text-slate-900 font-bold text-xs shrink-0 bg-slate-100 px-1.5 py-0.5 rounded-sm">
                      <FileText className="h-3 w-3 text-slate-500" />
                      <span>{inv.datiGenerali.numero}</span>
                    </div>

                    {/* Document Type (TDxx) Tag */}
                    <span className="text-[10px] px-1.5 py-0.5 rounded-sm bg-blue-50 text-blue-700 border border-blue-100 font-semibold truncate">
                      {inv.datiGenerali.tipoDocumento}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 ml-auto">
                    {/* Invoice Date */}
                    <div className="flex items-center gap-1 text-[11px] text-slate-400 font-medium font-mono">
                      <Calendar className="h-3 w-3 text-slate-300" />
                      <span>{formatDateStr(inv.datiGenerali.data)}</span>
                    </div>
                    
                    {/* Single Delete Action */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteInvoices([inv.id]);
                      }}
                      className="p-1 text-slate-300 hover:text-red-600 hover:bg-red-55 rounded transition-all cursor-pointer ml-1"
                      title="Elimina questa fattura"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Row 2: Supplier info (Cedente) */}
                <div className="mt-2.5 flex items-center gap-1.5 text-xs text-slate-700">
                  <User className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  <span className="font-semibold truncate text-slate-800" title={inv.cedentePrestatore.anagrafica.denominazione}>
                    {inv.cedentePrestatore.anagrafica.denominazione}
                  </span>
                </div>

                {/* Row 3: Recipient info (Cessionario) with Paper Plane icon */}
                <div className="mt-1 flex items-center justify-between gap-2 text-[11px] text-slate-500">
                  <div className="flex items-center gap-1 min-w-0">
                    <Send className="h-3 w-3 text-slate-400 shrink-0 rotate-[-15deg] mt-0.5" />
                    <span className="truncate" title={inv.cessionarioCommittente.anagrafica.denominazione}>
                      {inv.cessionarioCommittente.anagrafica.denominazione}
                    </span>
                  </div>

                  {/* Amount / Price Tag */}
                  <div className="font-bold text-slate-700 text-xs shrink-0 font-mono">
                    € {inv.totaleDocumento.toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>

                {/* Row 4: Attachments info (if present) */}
                {inv.allegati && inv.allegati.length > 0 && (
                  <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between gap-2 text-[11px]">
                    <div className="flex items-center gap-1 text-blue-600 font-extrabold font-mono">
                      <Paperclip className="h-3 w-3 shrink-0 text-blue-500" />
                      <span>N° allegati: ({inv.allegati.length})</span>
                    </div>
                    
                    <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                      {/* Download attachment(s) */}
                      <button
                        onClick={() => handleDownloadCardAttachments(inv.allegati!)}
                        className="p-1 rounded-full border border-blue-200 text-blue-600 hover:bg-blue-50 hover:border-blue-300 active:scale-90 transition-all cursor-pointer bg-white"
                        title={inv.allegati.length === 1 ? "Scarica l'allegato" : "Scarica tutti gli allegati"}
                      >
                        <Download className="h-3 w-3" />
                      </button>
                      
                      {/* Preview attachment(s) */}
                      <button
                        onClick={() => handlePreviewCardAttachments(inv, inv.allegati!)}
                        className="p-1 rounded-full border border-blue-200 text-blue-600 hover:bg-blue-50 hover:border-blue-300 active:scale-90 transition-all cursor-pointer bg-white"
                        title="Anteprima allegati"
                      >
                        <Eye className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {filteredInvoices.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-slate-400 bg-white border border-dashed border-slate-200 rounded-sm gap-2 mt-2">
            <AlertCircle className="h-8 w-8 text-slate-300" />
            <div className="text-sm font-medium text-slate-500">Nessuna fattura trovata</div>
            <p className="text-xs text-slate-400 text-center max-w-[240px]">
              Modifica i filtri o premi il pulsante <strong className="text-slate-600 font-semibold">+</strong> in alto per caricare nuove fatture XML.
            </p>
          </div>
        )}
      </div>

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="p-3 border-t border-slate-100 bg-white flex items-center justify-between gap-2 shrink-0 select-none shadow-sm" id="invoice-pagination">
          <div className="flex gap-1">
            {/* First Page */}
            <button
              onClick={() => setCurrentPage(1)}
              disabled={activePage === 1}
              className={`p-1.5 rounded-md border transition-all cursor-pointer active:scale-95 ${
                activePage === 1
                  ? "text-slate-350 border-slate-100 bg-slate-50 cursor-not-allowed"
                  : "text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-blue-600 hover:border-blue-200"
              }`}
              title="Prima pagina"
              id="pag-first-btn"
            >
              <ChevronsLeft className="h-4 w-4" />
            </button>

            {/* Previous Page */}
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={activePage === 1}
              className={`p-1.5 rounded-md border transition-all cursor-pointer active:scale-95 ${
                activePage === 1
                  ? "text-slate-350 border-slate-100 bg-slate-50 cursor-not-allowed"
                  : "text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-blue-600 hover:border-blue-200"
              }`}
              title="Pagina precedente"
              id="pag-prev-btn"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          </div>

          <span className="text-[11px] font-extrabold text-slate-600 font-mono">
            Pagina {activePage} di {totalPages}
          </span>

          <div className="flex gap-1">
            {/* Next Page */}
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={activePage === totalPages}
              className={`p-1.5 rounded-md border transition-all cursor-pointer active:scale-95 ${
                activePage === totalPages
                  ? "text-slate-350 border-slate-100 bg-slate-50 cursor-not-allowed"
                  : "text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-blue-600 hover:border-blue-200"
              }`}
              title="Pagina successiva"
              id="pag-next-btn"
            >
              <ChevronRight className="h-4 w-4" />
            </button>

            {/* Last Page */}
            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={activePage === totalPages}
              className={`p-1.5 rounded-md border transition-all cursor-pointer active:scale-95 ${
                activePage === totalPages
                  ? "text-slate-350 border-slate-100 bg-slate-50 cursor-not-allowed"
                  : "text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-blue-600 hover:border-blue-200"
              }`}
              title="Ultima pagina"
              id="pag-last-btn"
            >
              <ChevronsRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
      {/* CARD ATTACHMENTS PREVIEW OVERLAY MODAL */}
      {previewModalData && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-[9999] animate-fade-in" id="card-attachments-preview-modal">
          <div className="bg-white border border-slate-200 rounded-xl max-w-4xl w-full h-[80vh] overflow-hidden shadow-2xl flex flex-col">
            
            {/* Modal Header */}
            <div className="bg-slate-50 border-b border-slate-200 p-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Paperclip className="h-5 w-5 text-blue-600 shrink-0" />
                <div>
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">
                    Allegati Fattura n. {previewModalData.invoice.datiGenerali.numero}
                  </h3>
                  <p className="text-[10px] text-slate-500 font-medium">
                    {previewModalData.invoice.cedentePrestatore.anagrafica.denominazione}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setPreviewModalData(null)}
                className="p-1.5 rounded-full hover:bg-slate-200 text-slate-500 transition-colors cursor-pointer"
                title="Chiudi anteprima"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 min-h-0 flex bg-slate-100">
              {/* Left Panel: Attachments List */}
              {previewModalData.allegati.length > 1 && (
                <div className="w-64 border-r border-slate-250 bg-white flex flex-col shrink-0 min-h-0 overflow-y-auto p-2 gap-1 select-none">
                  <div className="text-[10px] uppercase font-bold text-slate-400 p-2 tracking-wider">Elenco file ({previewModalData.allegati.length})</div>
                  {previewModalData.allegati.map((att, idx) => {
                    const isActive = idx === activePreviewIndex;
                    return (
                      <button
                        key={idx}
                        onClick={() => setActivePreviewIndex(idx)}
                        className={`w-full text-left p-2.5 rounded-md flex items-center gap-2.5 transition-all text-xs cursor-pointer ${
                          isActive
                            ? "bg-blue-50 text-blue-700 font-bold border-l-4 border-l-blue-600"
                            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 border-l-4 border-l-transparent"
                        }`}
                      >
                        <FileText className={`h-4 w-4 shrink-0 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                        <span className="truncate flex-1" title={att.nome}>{att.nome}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Right Panel: Active Preview Container */}
              <div className="flex-1 flex flex-col min-h-0 min-w-0 bg-slate-50">
                {(() => {
                  const activeAtt = previewModalData.allegati[activePreviewIndex];
                  if (!activeAtt) return null;

                  const ext = (activeAtt.formato || activeAtt.nome.split('.').pop() || '').toLowerCase();
                  const cleanBase64 = activeAtt.attachmentData.replace(/\s/g, '');

                  return (
                    <React.Fragment>
                      {/* Active Preview Action Bar */}
                      <div className="bg-white border-b border-slate-200 px-4 py-2.5 flex items-center justify-between gap-4 shrink-0">
                        <div className="min-w-0">
                          <div className="font-mono text-[10px] font-bold text-slate-400 truncate uppercase">File visualizzato</div>
                          <div className="font-bold text-slate-800 text-xs truncate mt-0.5" title={activeAtt.nome}>
                            {activeAtt.nome}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {activeAtt.descrizione && (
                            <span className="hidden md:inline text-[10px] text-slate-500 italic truncate max-w-xs" title={activeAtt.descrizione}>
                              {activeAtt.descrizione}
                            </span>
                          )}
                          <button
                            onClick={() => handleDownloadCardAttachments([activeAtt])}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-3 py-1.5 rounded-md transition-all active:scale-95 cursor-pointer flex items-center gap-1 shadow-2xs"
                          >
                            <Download className="h-3.5 w-3.5" /> Scarica
                          </button>
                        </div>
                      </div>

                      {/* Actual Content Preview Box */}
                      <div className="flex-1 min-h-0 overflow-auto p-4 flex items-center justify-center">
                        {ext === 'pdf' && previewIframeUrl ? (
                          <iframe
                            src={previewIframeUrl}
                            className="w-full h-full border border-slate-200 rounded-sm bg-white"
                            title={activeAtt.nome}
                          />
                        ) : ext === 'txt' ? (
                          <div className="w-full h-full bg-white border border-slate-200 rounded-sm p-4 overflow-auto text-xs leading-relaxed font-mono whitespace-pre-wrap text-slate-800 select-text">
                            {(() => {
                              try {
                                const bytes = new Uint8Array(atob(cleanBase64).split("").map(c => c.charCodeAt(0)));
                                return new TextDecoder("utf-8").decode(bytes);
                              } catch (e) {
                                return "Impossibile decodificare il file di testo.";
                              }
                            })()}
                          </div>
                        ) : ['png', 'jpg', 'jpeg', 'gif'].includes(ext) ? (
                          <div className="max-w-full max-h-full overflow-auto flex items-center justify-center bg-white border border-slate-200 rounded-sm p-2 shadow-2xs">
                            <img
                              src={`data:image/${ext === 'jpg' ? 'jpeg' : ext};base64,${cleanBase64}`}
                              alt={activeAtt.nome}
                              className="max-w-full max-h-[60vh] object-contain"
                              referrerPolicy="no-referrer"
                            />
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center text-center p-8 bg-white border border-slate-200 rounded-lg max-w-md shadow-2xs gap-3">
                            <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-slate-400">
                              <FileText className="h-6 w-6" />
                            </div>
                            <h4 className="text-sm font-bold text-slate-700">Nessuna anteprima disponibile</h4>
                            <p className="text-xs text-slate-500 max-w-xs">
                              L'anteprima non è disponibile per i file con estensione <span className="font-mono bg-slate-100 px-1 py-0.5 rounded font-bold">.{ext}</span>. Puoi comunque scaricare il file per aprirlo sul tuo dispositivo.
                            </p>
                            <button
                              onClick={() => handleDownloadCardAttachments([activeAtt])}
                              className="mt-1 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-250 font-bold text-xs px-4 py-2 rounded-md cursor-pointer transition-all active:scale-95 flex items-center gap-1.5"
                            >
                              <Download className="h-4 w-4 text-slate-500" /> Scarica file sul computer
                            </button>
                          </div>
                        )}
                      </div>
                    </React.Fragment>
                  );
                })()}
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
