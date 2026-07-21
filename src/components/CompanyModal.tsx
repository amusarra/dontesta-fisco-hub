import React, { useState, useEffect } from "react";
import {
  Building2,
  Plus,
  Trash2,
  Edit3,
  Check,
  X,
  Eye,
  Building,
  ArrowRight,
  AlertCircle,
  Briefcase
} from "lucide-react";
import { Azienda } from "../types";
import { DUMMY_GUEST_COMPANY } from "../utils/companyDb";

interface CompanyModalProps {
  isOpen: boolean;
  onClose: () => void;
  companies: Azienda[];
  activeCompany: Azienda | null;
  onSelectCompany: (company: Azienda) => void;
  onSaveCompany: (company: Azienda) => Promise<void>;
  onDeleteCompany: (id: string) => Promise<void>;
  initialView?: "startup" | "selection" | "form";
  onShowNotification?: (message: string, type: "success" | "error" | "info") => void;
}

export default function CompanyModal({
  isOpen,
  onClose,
  companies,
  activeCompany,
  onSelectCompany,
  onSaveCompany,
  onDeleteCompany,
  initialView = "selection",
  onShowNotification
}: CompanyModalProps) {
  const [view, setView] = useState<"startup" | "selection" | "form">(initialView);
  const [editingCompany, setEditingCompany] = useState<Azienda | null>(null);

  // Form State
  const [denominazione, setDenominazione] = useState("");
  const [partitaIva, setPartitaIva] = useState("");
  const [codiceFiscale, setCodiceFiscale] = useState("");
  const [indirizzo, setIndirizzo] = useState("");
  const [cap, setCap] = useState("");
  const [comune, setComune] = useState("");
  const [provincia, setProvincia] = useState("");
  const [nazione, setNazione] = useState("IT");
  const [formError, setFormError] = useState("");

  useEffect(() => {
    setView(initialView);
  }, [initialView, isOpen]);

  if (!isOpen) return null;

  const handleOpenForm = (companyToEdit?: Azienda) => {
    if (companyToEdit) {
      setEditingCompany(companyToEdit);
      setDenominazione(companyToEdit.denominazione || "");
      setPartitaIva(companyToEdit.partitaIva || "");
      setCodiceFiscale(companyToEdit.codiceFiscale || "");
      setIndirizzo(companyToEdit.indirizzo || "");
      setCap(companyToEdit.cap || "");
      setComune(companyToEdit.comune || "");
      setProvincia(companyToEdit.provincia || "");
      setNazione(companyToEdit.nazione || "IT");
    } else {
      setEditingCompany(null);
      setDenominazione("");
      setPartitaIva("");
      setCodiceFiscale("");
      setIndirizzo("");
      setCap("");
      setComune("");
      setProvincia("");
      setNazione("IT");
    }
    setFormError("");
    setView("form");
  };

  const handleSaveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!denominazione.trim()) {
      setFormError("La Denominazione / Ragione Sociale è obbligatoria.");
      return;
    }

    const cleanPiva = partitaIva.trim().replace(/\s/g, "");
    if (!cleanPiva) {
      setFormError("La Partita IVA è obbligatoria.");
      return;
    }

    const companyData: Azienda = {
      id: editingCompany ? editingCompany.id : `az_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      denominazione: denominazione.trim(),
      partitaIva: cleanPiva,
      codiceFiscale: codiceFiscale.trim().toUpperCase() || undefined,
      indirizzo: indirizzo.trim() || undefined,
      cap: cap.trim() || undefined,
      comune: comune.trim() || undefined,
      provincia: provincia.trim().toUpperCase() || undefined,
      nazione: nazione.trim().toUpperCase() || "IT",
      isDummy: false,
      createdAt: editingCompany ? editingCompany.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    try {
      await onSaveCompany(companyData);
      onSelectCompany(companyData);
      if (onShowNotification) {
        onShowNotification(
          editingCompany
            ? `Azienda "${companyData.denominazione}" aggiornata con successo.`
            : `Azienda "${companyData.denominazione}" creata ed impostata come attiva.`,
          "success"
        );
      }
      onClose();
    } catch (err) {
      console.error("Errore salvataggio azienda:", err);
      setFormError("Errore durante il salvataggio nel database.");
    }
  };

  const handleDelete = async (company: Azienda) => {
    if (confirm(`Sei sicuro di voler eliminare l'anagrafica di "${company.denominazione}"?`)) {
      try {
        await onDeleteCompany(company.id);
        if (activeCompany?.id === company.id) {
          // If deleted company was active, fallback to guest
          onSelectCompany(DUMMY_GUEST_COMPANY);
        }
        if (onShowNotification) {
          onShowNotification(`Azienda "${company.denominazione}" eliminata.`, "info");
        }
      } catch (err) {
        console.error("Errore eliminazione azienda:", err);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-lg text-white">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold">Gestione Anagrafica Aziende</h2>
              <p className="text-xs text-slate-300">
                Seleziona o configura l'azienda per identificare le fatture emesse e ricevute
              </p>
            </div>
          </div>
          {companies.length > 0 && initialView !== "startup" && (
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              title="Chiudi"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 bg-slate-50">
          {/* VIEW 1: STARTUP (No Companies Defined) */}
          {view === "startup" && (
            <div className="flex flex-col gap-6 py-2">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 flex items-start gap-4">
                <div className="p-3 bg-blue-600 text-white rounded-lg shrink-0">
                  <Briefcase className="h-6 w-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-bold text-slate-900 text-sm">Nessuna Azienda Configurata</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Per poter classificare automaticamente le fatture in <strong>Emesse</strong> e <strong>Ricevute</strong>, è necessario definire un'anagrafica aziendale con Partita IVA/Codice Fiscale.
                  </p>
                  <p className="text-xs text-slate-500 pt-1">
                    Puoi creare subito la tua prima azienda o proseguire in <strong>Modalità Guest</strong> per utilizzare il programma come semplice visualizzatore di fatture.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Option A: Create Company */}
                <button
                  onClick={() => handleOpenForm()}
                  className="p-5 bg-white hover:bg-blue-50/50 border-2 border-blue-500 hover:border-blue-600 rounded-xl flex flex-col gap-3 text-left transition-all group cursor-pointer shadow-xs hover:shadow-md"
                >
                  <div className="flex items-center justify-between">
                    <div className="p-2.5 bg-blue-100 text-blue-700 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-colors">
                      <Plus className="h-5 w-5" />
                    </div>
                    <ArrowRight className="h-5 w-5 text-blue-500 group-hover:translate-x-1 transition-transform" />
                  </div>
                  <div>
                    <div className="font-bold text-slate-900 text-sm">Crea Nuova Azienda</div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      Inserisci Partita IVA e ragione sociale per la gestione completa emesse/ricevute.
                    </div>
                  </div>
                </button>

                {/* Option B: Guest Viewer Mode */}
                <button
                  onClick={() => {
                    onSelectCompany(DUMMY_GUEST_COMPANY);
                    onClose();
                  }}
                  className="p-5 bg-white hover:bg-slate-100/80 border border-slate-300 hover:border-slate-400 rounded-xl flex flex-col gap-3 text-left transition-all group cursor-pointer shadow-xs"
                >
                  <div className="flex items-center justify-between">
                    <div className="p-2.5 bg-slate-100 text-slate-700 rounded-lg group-hover:bg-slate-800 group-hover:text-white transition-colors">
                      <Eye className="h-5 w-5" />
                    </div>
                    <ArrowRight className="h-5 w-5 text-slate-400 group-hover:translate-x-1 transition-transform" />
                  </div>
                  <div>
                    <div className="font-bold text-slate-900 text-sm">Visualizzatore Guest</div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      Usa il software come semplice lettore XML/P7M senza filtrare per azienda.
                    </div>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* VIEW 2: SELECTION / LIST OF COMPANIES */}
          {view === "selection" && (
            <div className="flex flex-col gap-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Aziende Registrate ({companies.length})
                </span>
                <button
                  onClick={() => handleOpenForm()}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                >
                  <Plus className="h-3.5 w-3.5" /> Nuova Azienda
                </button>
              </div>

              {/* Guest Option Item */}
              <div
                onClick={() => {
                  onSelectCompany(DUMMY_GUEST_COMPANY);
                  onClose();
                }}
                className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                  activeCompany?.isDummy
                    ? "bg-slate-800 text-white border-slate-900 shadow-sm"
                    : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-100/50 text-slate-800"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${activeCompany?.isDummy ? "bg-slate-700 text-slate-200" : "bg-slate-100 text-slate-600"}`}>
                    <Eye className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="font-bold text-sm">Modalità Guest / Visualizzatore Semplice</div>
                    <div className={`text-xs ${activeCompany?.isDummy ? "text-slate-300" : "text-slate-500"}`}>
                      Visualizza tutte le fatture senza classificazione di appartenenza
                    </div>
                  </div>
                </div>

                {activeCompany?.isDummy && (
                  <span className="px-2.5 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full text-[10px] font-extrabold flex items-center gap-1">
                    <Check className="h-3 w-3" /> ATTIVA
                  </span>
                )}
              </div>

              {/* Company Cards List */}
              <div className="flex flex-col gap-3 max-h-[22rem] overflow-y-auto pr-1">
                {companies.map((company) => {
                  const isActive = activeCompany?.id === company.id && !activeCompany?.isDummy;
                  return (
                    <div
                      key={company.id}
                      onClick={() => {
                        onSelectCompany(company);
                        onClose();
                      }}
                      className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-4 ${
                        isActive
                          ? "bg-blue-50 border-2 border-blue-600 shadow-sm"
                          : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-100/50"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className={`p-2.5 rounded-lg shrink-0 ${isActive ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600"}`}>
                          <Building className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-bold text-slate-900 text-sm truncate" title={company.denominazione}>
                            {company.denominazione}
                          </div>
                          <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                            <span className="font-mono font-semibold">P.IVA: {company.partitaIva}</span>
                            {company.codiceFiscale && (
                              <span className="font-mono text-slate-400">CF: {company.codiceFiscale}</span>
                            )}
                          </div>
                          {company.comune && (
                            <div className="text-[11px] text-slate-400 truncate mt-0.5">
                              {company.indirizzo ? `${company.indirizzo}, ` : ""}{company.cap ? `${company.cap} ` : ""}{company.comune} {company.provincia ? `(${company.provincia})` : ""}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                        {isActive ? (
                          <span className="px-2.5 py-1 bg-blue-600 text-white rounded-full text-[10px] font-extrabold flex items-center gap-1 shadow-2xs">
                            <Check className="h-3 w-3" /> ATTIVA
                          </span>
                        ) : (
                          <button
                            onClick={() => {
                              onSelectCompany(company);
                              onClose();
                            }}
                            className="px-3 py-1 bg-white hover:bg-blue-50 text-blue-600 border border-blue-200 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                          >
                            Seleziona
                          </button>
                        )}

                        <button
                          onClick={() => handleOpenForm(company)}
                          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                          title="Modifica Anagrafica"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>

                        <button
                          onClick={() => handleDelete(company)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                          title="Elimina Azienda"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}

                {companies.length === 0 && (
                  <div className="text-center py-8 bg-white rounded-xl border border-dashed border-slate-300">
                    <p className="text-xs text-slate-500">Nessuna azienda definita in anagrafica.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* VIEW 3: FORM CREATE / EDIT COMPANY */}
          {view === "form" && (
            <form onSubmit={handleSaveSubmit} className="flex flex-col gap-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <h3 className="font-bold text-slate-900 text-sm">
                  {editingCompany ? "Modifica Anagrafica Azienda" : "Nuova Anagrafica Azienda"}
                </h3>
                <button
                  type="button"
                  onClick={() => setView(companies.length === 0 ? "startup" : "selection")}
                  className="text-xs text-slate-500 hover:text-slate-800 font-semibold cursor-pointer"
                >
                  Indietro
                </button>
              </div>

              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Dati Generali */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Denominazione / Ragione Sociale <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Es. ACME S.r.l."
                    value={denominazione}
                    onChange={(e) => setDenominazione(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Partita IVA <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Es. 12345678901"
                    value={partitaIva}
                    onChange={(e) => setPartitaIva(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Codice Fiscale
                  </label>
                  <input
                    type="text"
                    placeholder="Es. 12345678901 o RSSMRA80A01H501U"
                    value={codiceFiscale}
                    onChange={(e) => setCodiceFiscale(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 font-mono uppercase focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Dati Sede Legale (Opzionali) */}
              <div className="pt-2 border-t border-slate-200">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                  Sede Legale (Opzionale)
                </span>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="md:col-span-3">
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Indirizzo</label>
                    <input
                      type="text"
                      placeholder="Es. Via Roma, 10"
                      value={indirizzo}
                      onChange={(e) => setIndirizzo(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">CAP</label>
                    <input
                      type="text"
                      placeholder="00100"
                      value={cap}
                      onChange={(e) => setCap(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Comune</label>
                    <input
                      type="text"
                      placeholder="Roma"
                      value={comune}
                      onChange={(e) => setComune(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Provincia</label>
                    <input
                      type="text"
                      maxLength={2}
                      placeholder="RM"
                      value={provincia}
                      onChange={(e) => setProvincia(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 uppercase font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Form Buttons */}
              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setView(companies.length === 0 ? "startup" : "selection")}
                  className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-xs"
                >
                  Salva Anagrafica
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
