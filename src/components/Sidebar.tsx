import React, { useState } from "react";
import { Search, Building, Building2, User, ChevronRight, Eye } from "lucide-react";
import { FatturaElettronica, Azienda } from "../types";

interface SidebarProps {
  invoices: FatturaElettronica[];
  selectedSupplier: string | null;
  setSelectedSupplier: (supplier: string | null) => void;
  selectedCustomer: string | null;
  setSelectedCustomer: (customer: string | null) => void;
  activeCompany?: Azienda | null;
  onOpenCompanyManager?: () => void;
}

export default function Sidebar({
  invoices,
  selectedSupplier,
  setSelectedSupplier,
  selectedCustomer,
  setSelectedCustomer,
  activeCompany,
  onOpenCompanyManager,
}: SidebarProps) {
  const [supplierSearch, setSupplierSearch] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [suppliersLimit, setSuppliersLimit] = useState(15);
  const [customersLimit, setCustomersLimit] = useState(15);

  // Calculate suppliers with count of invoices in current selection (ignoring month/year filters maybe, or overall)
  const supplierCounts = invoices.reduce((acc, inv) => {
    const vat = inv.cedentePrestatore.anagrafica.partitaIva || inv.cedentePrestatore.anagrafica.codiceFiscale || "unknown";
    const name = inv.cedentePrestatore.anagrafica.denominazione;
    if (!acc[vat]) {
      acc[vat] = { name, count: 0 };
    }
    acc[vat].count += 1;
    return acc;
  }, {} as Record<string, { name: string; count: number }>);

  // Calculate customers with count of invoices
  const customerCounts = invoices.reduce((acc, inv) => {
    const vat = inv.cessionarioCommittente.anagrafica.partitaIva || inv.cessionarioCommittente.anagrafica.codiceFiscale || "unknown";
    const name = inv.cessionarioCommittente.anagrafica.denominazione;
    if (!acc[vat]) {
      acc[vat] = { name, count: 0 };
    }
    acc[vat].count += 1;
    return acc;
  }, {} as Record<string, { name: string; count: number }>);

  // Filter lists based on search inputs (this runs on all elements)
  const filteredSuppliers = Object.entries(supplierCounts).filter(([_, info]) =>
    info.name.toLowerCase().includes(supplierSearch.toLowerCase())
  );

  const filteredCustomers = Object.entries(customerCounts).filter(([_, info]) =>
    info.name.toLowerCase().includes(customerSearch.toLowerCase())
  );

  // Slice based on Load More limits
  const visibleSuppliers = filteredSuppliers.slice(0, suppliersLimit);
  const visibleCustomers = filteredCustomers.slice(0, customersLimit);

  return (
    <aside className="w-80 flex flex-col gap-6 bg-[#1E293B] border-r border-slate-800 p-5 h-full overflow-y-auto select-none" id="dontesta-sidebar">
      {/* SECTION 0: Active Company Header */}
      <div className="bg-slate-900/80 border border-slate-700/60 rounded-xl p-3.5 flex flex-col gap-2 shadow-xs">
        <div className="text-[10px] font-bold tracking-widest text-slate-400 uppercase flex items-center justify-between">
          <span>Azienda Selezionata</span>
          {activeCompany?.isDummy ? (
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-extrabold border border-amber-500/30">
              GUEST
            </span>
          ) : (
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-extrabold border border-emerald-500/30">
              ATTIVA
            </span>
          )}
        </div>

        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-2 rounded-lg bg-blue-600/30 border border-blue-500/30 text-blue-400 shrink-0">
            {activeCompany?.isDummy ? <Eye className="h-4 w-4" /> : <Building2 className="h-4 w-4" />}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-bold text-slate-100 truncate" title={activeCompany?.denominazione || "Guest Mode"}>
              {activeCompany?.denominazione || "Visualizzatore Guest"}
            </div>
            {activeCompany && !activeCompany.isDummy && (
              <div className="text-[11px] font-mono text-slate-400 truncate">
                P.IVA: {activeCompany.partitaIva}
              </div>
            )}
          </div>
        </div>

        {onOpenCompanyManager && (
          <button
            onClick={onOpenCompanyManager}
            className="w-full mt-1 py-1.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            id="sidebar-change-company-btn"
          >
            <span>Cambia / Gestisci Aziende</span>
            <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
          </button>
        )}
      </div>

      {/* SECTION 1: Cedenti / Prestatori (Suppliers) */}
      <div className="flex flex-col gap-3">
        {/* Search */}
        <div className="relative">
          <input
            type="text"
            placeholder="Cerca Cedente/Prestatore..."
            value={supplierSearch}
            onChange={(e) => {
              setSupplierSearch(e.target.value);
              setSuppliersLimit(15);
            }}
            className="w-full pl-9 pr-8 py-2 text-sm bg-slate-900/50 border border-slate-800 rounded-md text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-slate-900 transition-all"
            id="search-supplier-input"
          />
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          {supplierSearch && (
            <button
              onClick={() => {
                setSupplierSearch("");
                setSuppliersLimit(15);
              }}
              className="absolute right-3 top-2.5 text-xs text-slate-500 hover:text-slate-300 font-medium"
            >
              Annulla
            </button>
          )}
        </div>

        {/* List Title / Header */}
        <div className="text-[10px] font-bold tracking-widest text-slate-400 uppercase px-1">
          Cedenti / Prestatori
        </div>

        {/* Suppliers List */}
        <div className="flex flex-col gap-1.5 max-h-[28rem] overflow-y-auto pr-1">
          {/* Select All */}
          <button
            onClick={() => setSelectedSupplier(null)}
            className={`w-full text-left px-3 py-2 rounded border transition-all text-xs flex items-center justify-between ${
              selectedSupplier === null
                ? "bg-blue-600/20 text-blue-400 border-blue-500/30 font-semibold"
                : "bg-slate-800/40 hover:bg-slate-800/80 text-slate-300 border-transparent"
            }`}
            id="all-suppliers-btn"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <span
                className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                  selectedSupplier === null ? "bg-blue-400" : "bg-slate-600"
                }`}
              ></span>
              <span className="truncate">Tutti i Cedenti Prestatori</span>
            </div>
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded font-bold shrink-0 ${
                selectedSupplier === null ? "bg-blue-500/30 text-blue-400" : "bg-slate-800 text-slate-500"
              }`}
            >
              {invoices.length}
            </span>
          </button>

          {/* Supplier Items */}
          {visibleSuppliers.map(([vat, info]) => {
            const isSelected = selectedSupplier === vat;
            return (
              <button
                key={vat}
                onClick={() => setSelectedSupplier(vat)}
                className={`w-full text-left px-3 py-2 rounded border transition-all text-xs flex items-center justify-between ${
                  isSelected
                    ? "bg-blue-600/20 text-blue-400 border-blue-500/30 font-semibold"
                    : "bg-slate-800/40 hover:bg-slate-800/80 text-slate-300 border-transparent"
                }`}
                id={`supplier-btn-${vat}`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                      isSelected ? "bg-blue-400" : "bg-slate-600"
                    }`}
                  ></span>
                  <span className="truncate" title={info.name}>
                    {info.name}
                  </span>
                </div>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded font-bold shrink-0 ${
                    isSelected ? "bg-blue-500/30 text-blue-400" : "bg-slate-800 text-slate-500"
                  }`}
                >
                  {info.count}
                </span>
              </button>
            );
          })}

          {filteredSuppliers.length > suppliersLimit && (
            <button
              onClick={() => setSuppliersLimit(prev => prev + 15)}
              className="w-full text-center py-1.5 rounded border border-dashed border-slate-700 hover:border-slate-500 text-[10px] font-black tracking-wider uppercase bg-slate-900/30 hover:bg-slate-900/50 text-blue-400 hover:text-white transition-all cursor-pointer mt-1"
              id="load-more-suppliers-btn"
            >
              Carica Altri (+{filteredSuppliers.length - suppliersLimit})
            </button>
          )}

          {filteredSuppliers.length === 0 && (
            <div className="text-xs text-slate-500 text-center py-4 bg-slate-900/20 rounded-md">
              Nessun cedente trovato
            </div>
          )}
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-slate-800" />

      {/* SECTION 2: Cessionari / Committenti (Customers) */}
      <div className="flex flex-col gap-3">
        {/* Search */}
        <div className="relative">
          <input
            type="text"
            placeholder="Cerca Cessionario/Committente..."
            value={customerSearch}
            onChange={(e) => {
              setCustomerSearch(e.target.value);
              setCustomersLimit(15);
            }}
            className="w-full pl-9 pr-8 py-2 text-sm bg-slate-900/50 border border-slate-800 rounded-md text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-slate-900 transition-all"
            id="search-customer-input"
          />
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          {customerSearch && (
            <button
              onClick={() => {
                setCustomerSearch("");
                setCustomersLimit(15);
              }}
              className="absolute right-3 top-2.5 text-xs text-slate-500 hover:text-slate-300 font-medium"
            >
              Annulla
            </button>
          )}
        </div>

        {/* List Title / Header */}
        <div className="text-[10px] font-bold tracking-widest text-slate-400 uppercase px-1">
          Cessionari / Committenti
        </div>

        {/* Customers List */}
        <div className="flex flex-col gap-1.5 max-h-[28rem] overflow-y-auto pr-1">
          {/* Select All */}
          <button
            onClick={() => setSelectedCustomer(null)}
            className={`w-full text-left px-3 py-2 rounded border transition-all text-xs flex items-center justify-between ${
              selectedCustomer === null
                ? "bg-blue-600/20 text-blue-400 border-blue-500/30 font-semibold"
                : "bg-slate-800/40 hover:bg-slate-800/80 text-slate-300 border-transparent"
            }`}
            id="all-customers-btn"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <span
                className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                  selectedCustomer === null ? "bg-blue-400" : "bg-slate-600"
                }`}
              ></span>
              <span className="truncate">Tutti i Cessionari Committenti</span>
            </div>
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded font-bold shrink-0 ${
                selectedCustomer === null ? "bg-blue-500/30 text-blue-400" : "bg-slate-800 text-slate-500"
              }`}
            >
              {invoices.length}
            </span>
          </button>

          {/* Customer Items */}
          {visibleCustomers.map(([vat, info]) => {
            const isSelected = selectedCustomer === vat;
            return (
              <button
                key={vat}
                onClick={() => setSelectedCustomer(vat)}
                className={`w-full text-left px-3 py-2 rounded border transition-all text-xs flex items-center justify-between ${
                  isSelected
                    ? "bg-blue-600/20 text-blue-400 border-blue-500/30 font-semibold"
                    : "bg-slate-800/40 hover:bg-slate-800/80 text-slate-300 border-transparent"
                }`}
                id={`customer-btn-${vat}`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                      isSelected ? "bg-blue-400" : "bg-slate-600"
                    }`}
                  ></span>
                  <span className="truncate" title={info.name}>
                    {info.name}
                  </span>
                </div>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded font-bold shrink-0 ${
                    isSelected ? "bg-blue-500/30 text-blue-400" : "bg-slate-800 text-slate-500"
                  }`}
                >
                  {info.count}
                </span>
              </button>
            );
          })}

          {filteredCustomers.length > customersLimit && (
            <button
              onClick={() => setCustomersLimit(prev => prev + 15)}
              className="w-full text-center py-1.5 rounded border border-dashed border-slate-700 hover:border-slate-500 text-[10px] font-black tracking-wider uppercase bg-slate-900/30 hover:bg-slate-900/50 text-blue-400 hover:text-white transition-all cursor-pointer mt-1"
              id="load-more-customers-btn"
            >
              Carica Altri (+{filteredCustomers.length - customersLimit})
            </button>
          )}

          {filteredCustomers.length === 0 && (
            <div className="text-xs text-slate-500 text-center py-4 bg-slate-900/20 rounded-md">
              Nessun cessionario trovato
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
