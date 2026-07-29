import React, { useState } from "react";
import { 
  X, 
  Cpu, 
  MapPin, 
  Clock, 
  Building2, 
  Receipt, 
  Banknote, 
  CreditCard, 
  Ticket, 
  Calculator, 
  FileText, 
  Info,
  Hash
} from "lucide-react";
import { DatiCorrispettivi, TIPO_DISPOSITIVO_MAP, NATURA_IVA_MAP } from "../types";

interface CorrispettivoDetailModalProps {
  corrispettivo: DatiCorrispettivi | null;
  onClose: () => void;
}

export default function CorrispettivoDetailModal({
  corrispettivo,
  onClose
}: CorrispettivoDetailModalProps) {
  const [activeTab, setActiveTab] = useState<"dispositivo" | "riepilogo" | "finanziario">("dispositivo");

  if (!corrispettivo) return null;

  const formatEuro = (val?: number) => {
    if (val === undefined || val === null) return "€ 0,00";
    return new Intl.NumberFormat("it-IT", {
      style: "currency",
      currency: "EUR"
    }).format(val);
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "N/D";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return new Intl.DateTimeFormat("it-IT", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
      }).format(d);
    } catch {
      return dateStr;
    }
  };

  const deviceLabel = TIPO_DISPOSITIVO_MAP[corrispettivo.tipoDispositivo] || corrispettivo.tipoDispositivo;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-100/80 backdrop-blur-sm animate-fadeIn select-none">
      <div className="bg-white border border-slate-300/80 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* MODAL HEADER */}
        <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-white/90">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 border border-blue-200">
              <Cpu className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900">
                  Dettaglio Corrispettivo XML
                </h2>
                <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-slate-50 text-blue-600 border border-slate-300">
                  {corrispettivo.versione}
                </span>
                {corrispettivo.isPeriodoInattivo && (
                  <span className="px-2 py-0.5 rounded text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    PERIODO INATTIVO
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-600 mt-0.5">
                File: <span className="font-mono text-slate-700">{corrispettivo.fileName}</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-600 hover:text-slate-800 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* TAB NAVIGATION */}
        <div className="flex border-b border-slate-200 bg-white/60 px-5 gap-2 pt-2">
          <button
            onClick={() => setActiveTab("dispositivo")}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-lg transition-all flex items-center gap-2 cursor-pointer border-b-2 ${
              activeTab === "dispositivo"
                ? "bg-slate-50 text-blue-600 border-blue-300"
                : "text-slate-600 hover:text-slate-800 border-transparent"
            }`}
          >
            <Cpu className="h-4 w-4" />
            <span>1. Dati Invio & Dispositivo</span>
          </button>

          <button
            onClick={() => setActiveTab("riepilogo")}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-lg transition-all flex items-center gap-2 cursor-pointer border-b-2 ${
              activeTab === "riepilogo"
                ? "bg-slate-50 text-blue-600 border-blue-300"
                : "text-slate-600 hover:text-slate-800 border-transparent"
            }`}
          >
            <Calculator className="h-4 w-4" />
            <span>2. Riepilogo IVA & Normativo</span>
          </button>

          <button
            onClick={() => setActiveTab("finanziario")}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-lg transition-all flex items-center gap-2 cursor-pointer border-b-2 ${
              activeTab === "finanziario"
                ? "bg-slate-50 text-blue-600 border-blue-300"
                : "text-slate-600 hover:text-slate-800 border-transparent"
            }`}
          >
            <Banknote className="h-4 w-4" />
            <span>3. Finanziario e Incassi</span>
          </button>
        </div>

        {/* MODAL BODY CONTENT */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">

          {/* TAB 1: DATI INVIO & DISPOSITIVO */}
          {activeTab === "dispositivo" && (
            <div className="space-y-6">
              {/* Esercente Section */}
              <div className="bg-slate-50/80 border border-slate-200 rounded-xl p-4 space-y-3">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-blue-600" />
                  <span>Soggetto Esercente</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="text-[11px] text-slate-500">Partita IVA Esercente</div>
                    <div className="text-sm font-mono font-bold text-slate-800">{corrispettivo.pivaEsercente}</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-500">Codice Fiscale Esercente</div>
                    <div className="text-sm font-mono font-bold text-slate-800">{corrispettivo.cfEsercente || "N/D"}</div>
                  </div>
                </div>
              </div>

              {/* Dispositivo Section */}
              <div className="bg-slate-50/80 border border-slate-200 rounded-xl p-4 space-y-3">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-2">
                  <Cpu className="h-4 w-4 text-blue-600" />
                  <span>Dispositivo Rilevatore</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <div className="text-[11px] text-slate-500">ID Dispositivo</div>
                    <div className="text-sm font-mono font-bold text-blue-600">{corrispettivo.idDispositivo}</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-500">Tipo Dispositivo</div>
                    <div className="text-xs font-bold text-slate-800">{deviceLabel}</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-500">Progressivo Invio</div>
                    <div className="text-sm font-mono font-bold text-slate-800">#{corrispettivo.progressivo}</div>
                  </div>
                </div>

                {corrispettivo.geoLocalizzazione && (
                  <div className="pt-3 border-t border-slate-200/60 flex items-center gap-2 text-xs text-slate-700">
                    <MapPin className="h-4 w-4 text-emerald-400" />
                    <span>Geolocalizzazione: Lat <strong className="font-mono text-emerald-300">{corrispettivo.geoLocalizzazione.lat}</strong>, Long <strong className="font-mono text-emerald-300">{corrispettivo.geoLocalizzazione.long}</strong></span>
                  </div>
                )}
              </div>

              {/* Tempi & Date Section */}
              <div className="bg-slate-50/80 border border-slate-200 rounded-xl p-4 space-y-3">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-2">
                  <Clock className="h-4 w-4 text-blue-600" />
                  <span>Tempistiche Rilevazione & Trasmissione</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="text-[11px] text-slate-500">Data e Ora Rilevazione</div>
                    <div className="text-sm font-semibold text-slate-800">{formatDate(corrispettivo.dataOraRilevazione)}</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-500">Data e Ora Trasmissione</div>
                    <div className="text-sm font-semibold text-slate-800">{formatDate(corrispettivo.dataOraTrasmissione)}</div>
                  </div>
                </div>

                {corrispettivo.isPeriodoInattivo && (
                  <div className="p-3 bg-amber-950/30 border border-amber-500/30 rounded-lg text-amber-200 text-xs font-semibold flex items-center justify-between">
                    <span>Dispositivo Inattivo / Chiusura Periodica</span>
                    <span className="font-mono bg-white px-2 py-1 rounded border border-amber-500/30">
                      Dal {formatDate(corrispettivo.periodoInattivoDal)} al {formatDate(corrispettivo.periodoInattivoAl)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: RIEPILOGO IVA & NORMATIVO */}
          {activeTab === "riepilogo" && (
            <div className="space-y-4">
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 uppercase font-bold text-[10px] tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="p-3">Aliquota / Natura</th>
                      <th className="p-3 text-right">Ammontare Lordo</th>
                      <th className="p-3 text-right">Imponibile</th>
                      <th className="p-3 text-right">Imposta</th>
                      <th className="p-3 text-right">Resi</th>
                      <th className="p-3 text-right">Annulli</th>
                      <th className="p-3">Riferimento Normativo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    {corrispettivo.riepilogo.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/40 transition-colors">
                        <td className="p-3 font-semibold text-slate-800">
                          {item.aliquotaIva !== undefined ? `${item.aliquotaIva}%` : item.natura ? NATURA_IVA_MAP[item.natura] || item.natura : "N/D"}
                        </td>
                        <td className="p-3 text-right text-slate-900 font-bold">{formatEuro(item.ammontare)}</td>
                        <td className="p-3 text-right text-slate-700">{formatEuro(item.imponibileCalcolato)}</td>
                        <td className="p-3 text-right text-blue-600 font-bold">{formatEuro(item.imposta)}</td>
                        <td className="p-3 text-right text-amber-400">{formatEuro(item.totaleAmmontareResi)}</td>
                        <td className="p-3 text-right text-red-400">{formatEuro(item.totaleAmmontareAnnulli)}</td>
                        <td className="p-3 text-slate-600 font-sans text-[11px] truncate max-w-xs" title={item.rifNormativo}>
                          {item.rifNormativo || "-"}
                        </td>
                      </tr>
                    ))}
                    {corrispettivo.riepilogo.length === 0 && (
                      <tr>
                        <td colSpan={7} className="p-4 text-center text-slate-500 font-sans">
                          Nessun elemento di riepilogo IVA presente.
                        </td>
                      </tr>
                    )}
                  </tbody>
                  <tfoot className="bg-slate-50/90 border-t border-slate-200 font-bold text-xs">
                    <tr>
                      <td className="p-3 font-sans text-slate-700">TOTALE COMPLESSIVO</td>
                      <td className="p-3 text-right text-emerald-400 font-mono text-sm">{formatEuro(corrispettivo.totaleAmmontare)}</td>
                      <td className="p-3 text-right text-slate-800 font-mono">{formatEuro(corrispettivo.totaleImponibile)}</td>
                      <td className="p-3 text-right text-blue-600 font-mono">{formatEuro(corrispettivo.totaleImposta)}</td>
                      <td colSpan={3} className="p-3"></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: FINANZIARIO E INCASSI */}
          {activeTab === "finanziario" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Cash */}
                <div className="bg-slate-50/80 border border-slate-200 rounded-xl p-4 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-600 uppercase">Pagato Contanti</span>
                    <Banknote className="h-5 w-5 text-emerald-400" />
                  </div>
                  <div className="mt-3 text-xl font-mono font-bold text-emerald-400">
                    {formatEuro(corrispettivo.pagatoContanti)}
                  </div>
                </div>

                {/* Electronic */}
                <div className="bg-slate-50/80 border border-slate-200 rounded-xl p-4 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-600 uppercase">Pagato Elettronico</span>
                    <CreditCard className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="mt-3 text-xl font-mono font-bold text-blue-600">
                    {formatEuro(corrispettivo.pagatoElettronico)}
                  </div>
                </div>

                {/* Ticket / Buoni Pasto */}
                <div className="bg-slate-50/80 border border-slate-200 rounded-xl p-4 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-600 uppercase">Buoni Pasto / Ticket</span>
                    <Ticket className="h-5 w-5 text-amber-400" />
                  </div>
                  <div className="mt-3 text-xl font-mono font-bold text-amber-400">
                    {formatEuro(corrispettivo.ticketPagato)}
                    {corrispettivo.numeroTicket ? (
                      <span className="text-xs font-normal text-slate-600 block mt-0.5 font-sans">
                        N° Ticket: {corrispettivo.numeroTicket}
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>

              {/* Sconti & Documenti Commerciali Details */}
              <div className="bg-slate-50/80 border border-slate-200 rounded-xl p-4 space-y-3">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-2">
                  <Receipt className="h-4 w-4 text-blue-600" />
                  <span>Documenti Commerciali & Sconti</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center justify-between bg-white p-3 rounded-lg border border-slate-200">
                    <span className="text-xs text-slate-700">Numero Documenti Commerciali Emessi</span>
                    <span className="text-sm font-mono font-bold text-amber-300">{corrispettivo.numeroDocCommerciali}</span>
                  </div>
                  <div className="flex items-center justify-between bg-white p-3 rounded-lg border border-slate-200">
                    <span className="text-xs text-slate-700">Sconto a Pagare</span>
                    <span className="text-sm font-mono font-bold text-purple-400">{formatEuro(corrispettivo.scontoApagare)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* MODAL FOOTER */}
        <div className="p-4 border-t border-slate-200 bg-white/90 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-50 hover:bg-slate-700 text-slate-800 font-bold text-xs rounded-xl transition-colors cursor-pointer border border-slate-300"
          >
            Chiudi Dettaglio
          </button>
        </div>

      </div>
    </div>
  );
}
