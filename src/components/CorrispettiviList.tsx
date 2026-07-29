import React, { useState, useRef, useMemo } from "react";
import { 
  Search, 
  Upload, 
  Trash2, 
  ChevronLeft, 
  ChevronRight, 
  ChevronsLeft, 
  ChevronsRight,
  Filter,
  Cpu,
  Moon,
  Plus,
  Receipt,
  RotateCcw
} from "lucide-react";
import { DatiCorrispettivi, Azienda, TIPO_DISPOSITIVO_MAP } from "../types";
import CorrispettivoCard from "./CorrispettivoCard";
import CorrispettiviDashboardCards from "./CorrispettiviDashboardCards";
import CorrispettivoDetailModal from "./CorrispettivoDetailModal";

interface CorrispettiviListProps {
  corrispettivi: DatiCorrispettivi[];
  selectedYears: string[];
  selectedMonths: string[];
  onUploadCorrispettivi: (files: FileList) => void;
  onDeleteCorrispettivo: (id: string) => void;
  onClearAllCorrispettivi: () => void;
  activeCompany?: Azienda | null;
  onShowNotification?: (message: string, type: "success" | "error" | "info") => void;
}

export default function CorrispettiviList({
  corrispettivi,
  selectedYears,
  selectedMonths,
  onUploadCorrispettivi,
  onDeleteCorrispettivo,
  onClearAllCorrispettivi,
  activeCompany,
  onShowNotification
}: CorrispettiviListProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [deviceTypeFilter, setDeviceTypeFilter] = useState<string>("TUTTI");
  const [inactiveFilter, setInactiveFilter] = useState<"TUTTI" | "ATTIVI" | "INATTIVI">("TUTTI");
  const [selectedDetail, setSelectedDetail] = useState<DatiCorrispettivi | null>(null);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filter corrispettivi by Active Company, Search Term, Years, Months, Device Type, and Inactivity
  const filteredCorrispettivi = useMemo(() => {
    return corrispettivi.filter((corr) => {
      // Company Filter matching PIVAEsercente or CodiceFiscaleEsercente
      if (activeCompany && !activeCompany.isDummy) {
        const matchesPiva = corr.pivaEsercente === activeCompany.partitaIva;
        const matchesCf = activeCompany.codiceFiscale && corr.cfEsercente === activeCompany.codiceFiscale;
        if (!matchesPiva && !matchesCf) return false;
      }

      // Year Filter
      if (selectedYears.length > 0 && corr.dataRilevazione) {
        const year = corr.dataRilevazione.split("-")[0];
        if (!selectedYears.includes(year)) return false;
      }

      // Month Filter
      if (selectedMonths.length > 0 && corr.dataRilevazione) {
        const month = corr.dataRilevazione.split("-")[1];
        if (!selectedMonths.includes(month)) return false;
      }

      // Device Type Filter
      if (deviceTypeFilter !== "TUTTI" && corr.tipoDispositivo !== deviceTypeFilter) {
        return false;
      }

      // Inactivity Filter
      if (inactiveFilter === "ATTIVI" && corr.isPeriodoInattivo) return false;
      if (inactiveFilter === "INATTIVI" && !corr.isPeriodoInattivo) return false;

      // Search Term
      if (searchTerm.trim() !== "") {
        const term = searchTerm.toLowerCase();
        const matchesId = corr.idDispositivo.toLowerCase().includes(term);
        const matchesPiva = corr.pivaEsercente.toLowerCase().includes(term);
        const matchesCf = corr.cfEsercente?.toLowerCase().includes(term) || false;
        const matchesProg = String(corr.progressivo).includes(term);
        const matchesFile = corr.fileName.toLowerCase().includes(term);
        if (!matchesId && !matchesPiva && !matchesCf && !matchesProg && !matchesFile) {
          return false;
        }
      }

      return true;
    });
  }, [corrispettivi, activeCompany, selectedYears, selectedMonths, deviceTypeFilter, inactiveFilter, searchTerm]);

  // Pagination calculation
  const totalPages = Math.ceil(filteredCorrispettivi.length / itemsPerPage) || 1;
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredCorrispettivi.slice(start, start + itemsPerPage);
  }, [filteredCorrispettivi, currentPage, itemsPerPage]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onUploadCorrispettivi(e.target.files);
    }
  };

  return (
    <div className="flex-1 flex flex-col p-6 overflow-y-auto bg-slate-50 select-none space-y-6">
      
      {/* HEADER & TOP CONTROLS */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-slate-200 p-4 rounded-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded bg-blue-50 text-blue-600 border border-blue-200">
            <Receipt className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              Dati Corrispettivi
              <span className="text-xs font-mono bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded font-bold">
                XSD COR10
              </span>
            </h2>
            <p className="text-xs text-slate-600">
              {activeCompany && !activeCompany.isDummy ? (
                <>Corrispettivi associati a: <strong className="text-slate-800">{activeCompany.denominazione}</strong> ({activeCompany.partitaIva})</>
              ) : (
                "Gestione e analisi dei registri corrispettivi telematici"
              )}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            multiple
            accept=".xml"
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded transition-all flex items-center gap-2 shadow-sm cursor-pointer"
          >
            <Upload className="h-4 w-4" />
            <span>Importa XML Corrispettivi</span>
          </button>

          {corrispettivi.length > 0 && (
            <button
              onClick={onClearAllCorrispettivi}
              className="px-3 py-2 bg-white hover:bg-red-50 text-red-600 border border-slate-200 hover:border-red-200 text-xs font-semibold rounded transition-all flex items-center gap-1.5 cursor-pointer"
              title="Cancella tutti i corrispettivi salvati"
            >
              <RotateCcw className="h-4 w-4" />
              <span>Svuota Lista</span>
            </button>
          )}
        </div>
      </div>

      {/* DASHBOARD KPI CARDS */}
      <CorrispettiviDashboardCards corrispettivi={filteredCorrispettivi} />

      {/* FILTERS & SEARCH BAR */}
      <div className="bg-white border border-slate-200 rounded-sm p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <input
            type="text"
            placeholder="Cerca per ID Dispositivo, P.IVA..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
        </div>

        {/* Filter dropdowns */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Device Type */}
          <div className="flex items-center gap-1.5 text-xs text-slate-600">
            <Cpu className="h-4 w-4 text-slate-500" />
            <span>Dispositivo:</span>
            <select
              value={deviceTypeFilter}
              onChange={(e) => {
                setDeviceTypeFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-white border border-slate-200 text-slate-700 rounded text-xs py-1.5 px-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold cursor-pointer"
            >
              <option value="TUTTI">Tutti i Tipi</option>
              <option value="RT">RT (Registratore Telematico)</option>
              <option value="DA">DA (Distributore Automatico)</option>
              <option value="DC">DC (Documenti Commerciali)</option>
              <option value="MC">MC (Multi cassa)</option>
              <option value="DM">DM (Dispositivo Multimediale)</option>
            </select>
          </div>

          {/* Inactive State Filter */}
          <div className="flex items-center gap-1.5 text-xs text-slate-600">
            <Moon className="h-4 w-4 text-slate-500" />
            <span>Stato:</span>
            <select
              value={inactiveFilter}
              onChange={(e) => {
                setInactiveFilter(e.target.value as any);
                setCurrentPage(1);
              }}
              className="bg-white border border-slate-200 text-slate-700 rounded text-xs py-1.5 px-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold cursor-pointer"
            >
              <option value="TUTTI">Tutti gli Stati</option>
              <option value="ATTIVI">Solo Attivi</option>
              <option value="INATTIVI">Solo Periodo Inattivo</option>
            </select>
          </div>
        </div>
      </div>

      {/* CORRISPETTIVI CARDS LIST */}
      {paginatedItems.length > 0 ? (
        <div className="grid grid-cols-1 gap-4">
          {paginatedItems.map((corr) => (
            <CorrispettivoCard
              key={corr.id}
              corrispettivo={corr}
              onSelectDetail={() => setSelectedDetail(corr)}
              onDelete={() => onDeleteCorrispettivo(corr.id)}
            />
          ))}
        </div>
      ) : (
        <div className="bg-white border border-dashed border-slate-200 rounded-sm p-12 text-center flex flex-col items-center justify-center space-y-3">
          <div className="p-3 rounded-full bg-slate-50 text-slate-400">
            <Receipt className="h-8 w-8" />
          </div>
          <div className="text-sm font-bold text-slate-700">
            Nessun corrispettivo trovato
          </div>
          <p className="text-xs text-slate-600 max-w-sm">
            Importa i tuoi file XML "Dati Corrispettivi" (schema COR10) oppure modifica i filtri di ricerca impostati.
          </p>
        </div>
      )}

      {/* PAGINATION CONTROLS */}
      {filteredCorrispettivi.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white border border-slate-200 p-4 rounded-sm text-xs text-slate-600">
          <div>
            Mostrando <strong className="text-slate-800">{(currentPage - 1) * itemsPerPage + 1}</strong> - <strong className="text-slate-800">{Math.min(currentPage * itemsPerPage, filteredCorrispettivi.length)}</strong> di <strong className="text-slate-800">{filteredCorrispettivi.length}</strong> corrispettivi
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              className="p-1.5 rounded bg-white hover:bg-slate-50 disabled:opacity-40 text-slate-700 border border-slate-200 transition-colors cursor-pointer"
            >
              <ChevronsLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded bg-white hover:bg-slate-50 disabled:opacity-40 text-slate-700 border border-slate-200 transition-colors cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <span className="px-3 py-1 bg-slate-50 border border-slate-200 rounded text-slate-800 font-mono font-bold">
              {currentPage} / {totalPages}
            </span>

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded bg-white hover:bg-slate-50 disabled:opacity-40 text-slate-700 border border-slate-200 transition-colors cursor-pointer"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded bg-white hover:bg-slate-50 disabled:opacity-40 text-slate-700 border border-slate-200 transition-colors cursor-pointer"
            >
              <ChevronsRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* DETAIL MODAL */}
      {selectedDetail && (
        <CorrispettivoDetailModal
          corrispettivo={selectedDetail}
          onClose={() => setSelectedDetail(null)}
        />
      )}

    </div>
  );
}
