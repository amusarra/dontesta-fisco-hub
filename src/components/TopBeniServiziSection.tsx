/**
 * TopBeniServiziSection.tsx
 * 
 * Client-side search and filtering component for Top Beni e Servizi Ricevuti.
 * Features:
 * - Supplier filtering via dropdown
 * - Substring search with debouncing (300ms)
 * - Real-time aggregation and KPI display
 * - CSV export of filtered results
 */

import React, { useEffect, useRef, useState } from "react";
import { Search, Building, FileSpreadsheet, FileText, TrendingDown, X } from "lucide-react";
import { useTopLineItems } from "../hooks/useTopLineItems";

interface TopBeniServiziSectionProps {
  onShowNotification?: (message: string, type: "success" | "error" | "info") => void;
  onSelectInvoice?: (invoiceId: string) => void;
  selectedYears: string[];
  selectedMonths: string[];
}

export function TopBeniServiziSection({
  onShowNotification,
  onSelectInvoice,
  selectedYears,
  selectedMonths,
}: TopBeniServiziSectionProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>("");
  const [displayLimit, setDisplayLimit] = useState(10);
  const [openDocumentsFor, setOpenDocumentsFor] = useState<string | null>(null);
  const documentsPopoverRef = useRef<HTMLTableCellElement>(null);

  useEffect(() => {
    if (!openDocumentsFor) return;

    const closeOnOutsideClick = (event: MouseEvent) => {
      if (
        documentsPopoverRef.current &&
        !documentsPopoverRef.current.contains(event.target as Node)
      ) {
        setOpenDocumentsFor(null);
      }
    };

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpenDocumentsFor(null);
      }
    };

    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);

    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [openDocumentsFor]);

  const { items, allItems, summary, suppliersList, isLoading, hasActiveFilter } = 
    useTopLineItems({ 
      searchQuery, 
      selectedSupplierId: selectedSupplierId || undefined, 
      selectedYears,
      selectedMonths,
      limit: displayLimit 
    });

  const formatEuro = (val: number) => {
    return new Intl.NumberFormat("it-IT", {
      style: "currency",
      currency: "EUR"
    }).format(val);
  };

  const formatNumber = (val: number) => {
    return val.toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const handleExportCSV = () => {
    try {
      const headers = [
        "Descrizione Bene/Servizio",
        "Quantità Totale",
        "Prezzo Medio (€)",
        "Importo Totale (€)",
        "N° Fatture",
        "N° Righe"
      ];

      const rows = allItems.map(item => [
        `"${item.descrizione.replace(/"/g, '""')}"`,
        item.quantitaTotale.toFixed(2).replace(".", ","),
        item.prezzoUnitarioMedio.toFixed(2).replace(".", ","),
        item.importoTotale.toFixed(2).replace(".", ","),
        item.numeroFatture.toString(),
        item.numeroLinee.toString()
      ]);

      const csvContent = "\uFEFF" + [headers.join(";"), ...rows.map(r => r.join(";"))].join("\r\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      
      const timestamp = new Date().toISOString().slice(0, 10);
      const filename = searchQuery.trim() 
        ? `top_beni_servizi_${searchQuery.trim().slice(0, 20)}_${timestamp}.csv`
        : `top_beni_servizi_${timestamp}.csv`;
      
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      if (onShowNotification) {
        onShowNotification(`Esportati ${allItems.length} beni/servizi in formato CSV.`, "success");
      }
    } catch (err) {
      console.error("[TopBeniServizi] CSV export error:", err);
      if (onShowNotification) {
        onShowNotification("Errore durante l'esportazione CSV.", "error");
      }
    }
  };

  return (
    <div className="bg-white p-5 rounded-sm border border-slate-200 shadow-sm flex flex-col gap-4">
      {/* HEADER */}
      <div className="flex justify-between items-center border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <FileText className="h-4.5 w-4.5 text-purple-500" />
          <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-tight">
            Top Beni e Servizi Ricevuti
          </h3>
          <span className="text-[10px] bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full font-bold border border-purple-200">
            Solo Fatture Ricevute
          </span>
        </div>
        <button
          onClick={handleExportCSV}
          disabled={allItems.length === 0}
          className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition-all active:scale-95 flex items-center gap-1 ${
            allItems.length === 0
              ? "bg-slate-100 text-slate-400 cursor-not-allowed"
              : "bg-purple-600 hover:bg-purple-700 text-white cursor-pointer"
          }`}
          title="Esporta risultati filtrati in CSV"
        >
          <FileSpreadsheet className="h-3 w-3" />
          CSV ({allItems.length})
        </button>
      </div>

      {/* FILTERS ROW */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cerca bene o servizio..."
            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        </div>

        {/* Supplier Dropdown */}
        <div className="relative">
          <Building className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          <select
            value={selectedSupplierId}
            onChange={(e) => setSelectedSupplierId(e.target.value)}
            className="w-full pl-9 pr-8 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent appearance-none bg-white cursor-pointer"
          >
            <option value="">Tutti i Fornitori ({suppliersList.length})</option>
            {suppliersList.map((supplier) => (
              <option key={supplier.id} value={supplier.id}>
                {supplier.name} ({supplier.lineCount} righe)
              </option>
            ))}
          </select>
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
            <svg className="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>

        {/* Display Limit Selector */}
        <div className="relative">
          <TrendingDown className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          <select
            value={displayLimit}
            onChange={(e) => setDisplayLimit(Number(e.target.value))}
            className="w-full pl-9 pr-8 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent appearance-none bg-white cursor-pointer"
          >
            <option value={10}>Mostra Top 10</option>
            <option value={25}>Mostra Top 25</option>
            <option value={50}>Mostra Top 50</option>
            <option value={100}>Mostra Top 100</option>
            <option value={999999}>Mostra Tutti</option>
          </select>
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
            <svg className="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </div>

      {/* KPI BANNER (visible when filter active) */}
      {hasActiveFilter && (
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider mb-1">
                Totale Speso
              </div>
              <div className="text-lg font-black text-purple-700">
                {formatEuro(summary.totaleSpeso)}
              </div>
            </div>
            <div className="text-center">
              <div className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider mb-1">
                Quantità Complessiva
              </div>
              <div className="text-lg font-black text-blue-700">
                {formatNumber(summary.quantitaTotale)}
              </div>
            </div>
            <div className="text-center">
              <div className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider mb-1">
                Voci Trovate
              </div>
              <div className="text-lg font-black text-emerald-700">
                {summary.conteggioVoci}
              </div>
            </div>
            <div className="text-center">
              <div className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider mb-1">
                Fornitori Coinvolti
              </div>
              <div className="text-lg font-black text-amber-700">
                {summary.fornitoriCoinvolti}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* LOADING STATE */}
      {isLoading && (
        <div className="py-12 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
          <p className="mt-3 text-xs text-slate-500 font-medium">Caricamento dati...</p>
        </div>
      )}

      {/* DATA TABLE */}
      {!isLoading && (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase text-[9px] tracking-wider bg-slate-50">
                <th className="py-2.5 px-3 w-2/5">Descrizione Bene/Servizio</th>
                <th className="py-2.5 px-3 text-right">Quantità Totale</th>
                <th className="py-2.5 px-3 text-right">Prezzo Medio</th>
                <th className="py-2.5 px-3 text-right">Importo Totale</th>
                <th className="py-2.5 px-3 text-center">N° Fatture</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400 font-medium">
                    {searchQuery.trim() || selectedSupplierId ? (
                      <div>
                        <FileText className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                        <p>Nessun risultato trovato per i filtri selezionati.</p>
                        <p className="text-[10px] mt-1">Prova a modificare la ricerca o il fornitore.</p>
                      </div>
                    ) : (
                      <div>
                        <FileText className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                        <p>Nessun bene o servizio trovato nelle fatture ricevute.</p>
                        <p className="text-[10px] mt-1">Importa fatture per visualizzare i dati.</p>
                      </div>
                    )}
                  </td>
                </tr>
              ) : (
                items.map((item, idx) => (
                  <tr 
                    key={idx} 
                    className="border-b border-slate-100 hover:bg-purple-50/30 transition-colors font-medium text-slate-700"
                  >
                    <td className="py-3 px-3 text-slate-950 font-bold" title={item.descrizione}>
                      <div className="max-w-md truncate">{item.descrizione}</div>
                      <div className="text-[9px] text-slate-400 font-normal mt-0.5">
                        {item.numeroLinee} {item.numeroLinee === 1 ? 'riga' : 'righe'}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-slate-600">
                      {formatNumber(item.quantitaTotale)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-blue-600">
                      {formatEuro(item.prezzoUnitarioMedio)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-purple-600 font-bold">
                      {formatEuro(item.importoTotale)}
                    </td>
                    <td
                      ref={openDocumentsFor === item.descrizione ? documentsPopoverRef : undefined}
                      className="relative py-3 px-3 text-center"
                    >
                      <button
                        type="button"
                        className="inline-block cursor-pointer bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full text-[10px] font-bold hover:bg-purple-100 hover:text-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-400"
                        onClick={() => setOpenDocumentsFor((current) => current === item.descrizione ? null : item.descrizione)}
                        aria-expanded={openDocumentsFor === item.descrizione}
                        aria-label={`Mostra ${item.numeroFatture} documenti per ${item.descrizione}`}
                        title="Mostra i documenti associati"
                      >
                        {item.numeroFatture}
                      </button>
                      {openDocumentsFor === item.descrizione && (
                        <div className="absolute right-3 top-10 z-20 w-80 overflow-hidden rounded-lg border border-purple-200 bg-white text-left shadow-xl">
                          <div className="flex items-center justify-between border-b border-purple-100 bg-purple-50 px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-purple-700">
                            <span>Documenti associati</span>
                            <button
                              type="button"
                              onClick={() => setOpenDocumentsFor(null)}
                              className="rounded p-0.5 text-purple-600 hover:bg-purple-100 hover:text-purple-900 focus:outline-none focus:ring-2 focus:ring-purple-400"
                              aria-label="Chiudi elenco documenti"
                              title="Chiudi"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          <div className="max-h-56 overflow-y-auto p-1">
                            {item.documenti.map(({ fatturaId, fornitore, numeroFattura }) => (
                              <button
                                key={fatturaId}
                                type="button"
                                onClick={() => onSelectInvoice?.(fatturaId)}
                                className="w-full rounded-md px-3 py-2 text-left text-xs transition-colors hover:bg-purple-50 focus:outline-none focus:ring-2 focus:ring-purple-400"
                                title="Apri la fattura nella vista Fatture"
                              >
                                <span className="block truncate font-bold text-slate-800">{fornitore}</span>
                                <span className="block text-[10px] text-slate-500">Fattura n. {numeroFattura}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* FOOTER INFO */}
      {!isLoading && items.length > 0 && (
        <div className="text-[10px] text-slate-500 text-center pt-2 border-t border-slate-100">
          Mostrando {items.length} di {allItems.length} voci totali
          {hasActiveFilter && " (filtrate)"}
        </div>
      )}
    </div>
  );
}
