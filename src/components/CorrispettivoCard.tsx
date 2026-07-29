import React from "react";
import { 
  CreditCard, 
  Banknote, 
  Calendar, 
  Eye, 
  Trash2, 
  Cpu, 
  Hash, 
  Receipt, 
  Moon, 
  Clock, 
  Building2, 
  FileText 
} from "lucide-react";
import { DatiCorrispettivi, TIPO_DISPOSITIVO_MAP } from "../types";

interface CorrispettivoCardProps {
  corrispettivo: DatiCorrispettivi;
  onSelectDetail: () => void;
  onDelete: () => void;
}

export default function CorrispettivoCard({
  corrispettivo,
  onSelectDetail,
  onDelete
}: CorrispettivoCardProps) {
  const formatEuro = (val: number) => {
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
        minute: "2-digit"
      }).format(d);
    } catch {
      return dateStr;
    }
  };

  const deviceLabel = TIPO_DISPOSITIVO_MAP[corrispettivo.tipoDispositivo] || corrispettivo.tipoDispositivo;

  if (corrispettivo.isPeriodoInattivo) {
    return (
      <div className="bg-white border border-amber-200 rounded-sm p-4 shadow-sm hover:border-amber-300 transition-all duration-200 flex flex-col gap-3 group">
        {/* HEADER */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
              <Moon className="h-3.5 w-3.5" />
              PERIODO INATTIVO
            </span>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-semibold bg-slate-50 text-slate-700 border border-slate-200">
              <Cpu className="h-3 w-3 text-slate-500" />
              {corrispettivo.tipoDispositivo}: {corrispettivo.idDispositivo}
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono text-slate-600 bg-slate-50 border border-slate-200">
              <Hash className="h-3 w-3" />
              #{corrispettivo.progressivo}
            </span>
          </div>

          <div className="text-xs text-slate-500 flex items-center gap-1">
            <Clock className="h-3.5 w-3.5 text-slate-400" />
            <span>Rilevazione: {formatDate(corrispettivo.dataOraRilevazione)}</span>
          </div>
        </div>

        {/* BODY */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-amber-50/50 border border-amber-100 rounded p-3">
          <div className="flex flex-col gap-1">
            <div className="text-xs font-bold text-amber-800 flex items-center gap-1.5">
              <span>Dispositivo fermo dal</span>
              <span className="font-mono bg-white px-1.5 py-0.5 rounded text-amber-700 border border-amber-200">
                {formatDate(corrispettivo.periodoInattivoDal)}
              </span>
              <span>al</span>
              <span className="font-mono bg-white px-1.5 py-0.5 rounded text-amber-700 border border-amber-200">
                {formatDate(corrispettivo.periodoInattivoAl)}
              </span>
            </div>
            <div className="text-[11px] text-slate-600 flex items-center gap-2">
              <span>Esercente: {corrispettivo.cfEsercente || "N/D"}</span>
              <span>•</span>
              <span>P.IVA: {corrispettivo.pivaEsercente}</span>
            </div>
          </div>

          <div className="text-right sm:text-right shrink-0">
            <div className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Totale Lordo</div>
            <div className="text-lg font-mono font-bold text-slate-700">{formatEuro(0)}</div>
          </div>
        </div>

        {/* FOOTER */}
        <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-xs text-slate-500">
          <div className="flex items-center gap-1 text-[11px] text-slate-600">
            <span>Trasmissione: {formatDate(corrispettivo.dataOraTrasmissione)}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onSelectDetail}
              className="px-2.5 py-1 rounded bg-white hover:bg-slate-50 text-blue-600 hover:text-blue-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-200"
              title="Visualizza Dettaglio XML"
            >
              <Eye className="h-3.5 w-3.5" />
              <span>Dettaglio XML</span>
            </button>

            <button
              onClick={onDelete}
              className="p-1 rounded bg-white hover:bg-red-50 text-red-600 hover:text-red-700 transition-colors cursor-pointer border border-slate-200 hover:border-red-200"
              title="Elimina Corrispettivo"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-sm p-4 shadow-sm hover:border-blue-300 transition-all duration-200 flex flex-col gap-3 group">
      {/* HEADER */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
            <Cpu className="h-3.5 w-3.5 text-blue-600" />
            {corrispettivo.tipoDispositivo}: {corrispettivo.idDispositivo}
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono text-slate-700 bg-slate-50 border border-slate-200">
            <Hash className="h-3 w-3 text-slate-500" />
            #{corrispettivo.progressivo}
          </span>
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <Receipt className="h-3.5 w-3.5" />
            {corrispettivo.numeroDocCommerciali} Doc. Comm.
          </span>
        </div>

        <div className="text-xs text-slate-500 flex items-center gap-1">
          <Clock className="h-3.5 w-3.5 text-slate-400" />
          <span>{formatDate(corrispettivo.dataOraRilevazione)}</span>
        </div>
      </div>

      {/* BODY */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
        {/* Esercente Info */}
        <div className="md:col-span-5 flex flex-col gap-1">
          <div className="text-[10px] uppercase font-bold tracking-wider text-slate-500 flex items-center gap-1">
            <Building2 className="h-3 w-3" />
            <span>Esercente</span>
          </div>
          <div className="text-xs text-slate-800 font-semibold truncate">
            {corrispettivo.cfEsercente || "N/D"}
          </div>
          <div className="text-[11px] font-mono text-slate-600">
            P.IVA: {corrispettivo.pivaEsercente}
          </div>
        </div>

        {/* Metodi di Pagamento */}
        <div className="md:col-span-4 flex flex-col gap-1 bg-slate-50 p-2.5 rounded border border-slate-100">
          <div className="text-[10px] uppercase font-bold tracking-wider text-slate-500">
            Metodi di Pagamento
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1 text-slate-700">
              <Banknote className="h-3.5 w-3.5 text-emerald-600" /> Contanti:
            </span>
            <span className="font-mono font-bold text-emerald-700">
              {formatEuro(corrispettivo.pagatoContanti)}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1 text-slate-700">
              <CreditCard className="h-3.5 w-3.5 text-blue-600" /> Elettronico:
            </span>
            <span className="font-mono font-bold text-blue-700">
              {formatEuro(corrispettivo.pagatoElettronico)}
            </span>
          </div>
        </div>

        {/* Ripartizione Imposta / Totale */}
        <div className="md:col-span-3 flex flex-col items-end justify-center gap-1 text-right">
          <div className="text-[10px] uppercase font-bold tracking-wider text-slate-500">
            Importo Totale
          </div>
          <div className="text-xl font-mono font-black text-emerald-700">
            {formatEuro(corrispettivo.totaleAmmontare)}
          </div>
          
          {/* Ripartizione IVA dettagliata */}
          {corrispettivo.riepilogo && corrispettivo.riepilogo.length > 0 && (
            <div className="space-y-0.5 mt-1">
              {corrispettivo.riepilogo.slice(0, 2).map((riep, idx) => (
                <div key={idx} className="text-[10px] text-slate-600 font-mono flex items-center justify-end gap-2">
                  {riep.aliquotaIva !== undefined && (
                    <span className="px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 font-bold border border-purple-200">
                      IVA {riep.aliquotaIva}%
                    </span>
                  )}
                  {riep.natura && (
                    <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 font-bold text-[9px] border border-amber-200">
                      {riep.natura}
                    </span>
                  )}
                  <span className="text-slate-700">
                    Imp: {formatEuro(riep.imponibileCalcolato || 0)}
                  </span>
                  <span className="text-purple-700">
                    IVA: {formatEuro(riep.imposta || 0)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* FOOTER */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs text-slate-500">
        <div className="flex items-center gap-1 text-[11px] text-slate-600">
          <span>Trasmissione: {formatDate(corrispettivo.dataOraTrasmissione)}</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onSelectDetail}
            className="px-3 py-1.5 rounded bg-blue-50 hover:bg-blue-100 text-blue-700 hover:text-blue-800 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer border border-blue-200"
            title="Visualizza Dettaglio XML"
          >
            <Eye className="h-3.5 w-3.5" />
            <span>Dettaglio XML</span>
          </button>

          <button
            onClick={onDelete}
            className="p-1.5 rounded bg-white hover:bg-red-50 text-red-600 hover:text-red-700 transition-colors cursor-pointer border border-slate-200 hover:border-red-200"
            title="Elimina Corrispettivo"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
