import React, { useMemo } from "react";
import { 
  DollarSign, 
  CreditCard, 
  Banknote, 
  Receipt, 
  Moon, 
  PieChart, 
  Ticket, 
  Calculator,
  TrendingUp
} from "lucide-react";
import { DatiCorrispettivi } from "../types";

interface CorrispettiviDashboardCardsProps {
  corrispettivi: DatiCorrispettivi[];
}

export default function CorrispettiviDashboardCards({
  corrispettivi
}: CorrispettiviDashboardCardsProps) {
  const formatEuro = (val: number) => {
    return new Intl.NumberFormat("it-IT", {
      style: "currency",
      currency: "EUR"
    }).format(val);
  };

  const metrics = useMemo(() => {
    let pagatoElettronico = 0;
    let pagatoContanti = 0;
    let ticketPagato = 0;
    let totaleAmmontare = 0;
    let totaleImposta = 0;
    let numeroDocCommerciali = 0;
    let periodiInattiviCount = 0;

    corrispettivi.forEach((corr) => {
      if (corr.isPeriodoInattivo) {
        periodiInattiviCount += 1;
      } else {
        pagatoElettronico += corr.pagatoElettronico || 0;
        pagatoContanti += corr.pagatoContanti || 0;
        ticketPagato += corr.ticketPagato || 0;
        totaleAmmontare += corr.totaleAmmontare || 0;
        totaleImposta += corr.totaleImposta || 0;
        numeroDocCommerciali += corr.numeroDocCommerciali || 0;
      }
    });

    // Totale Incassati = somma dei metodi di pagamento
    const totalIncassati = pagatoContanti + pagatoElettronico + ticketPagato;

    return {
      totalIncassati,
      pagatoElettronico,
      pagatoContanti,
      ticketPagato,
      totaleAmmontare,
      totaleImposta,
      numeroDocCommerciali,
      periodiInattiviCount
    };
  }, [corrispettivi]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {/* CARD 1: Totali Incassati */}
      <div className="bg-white border border-slate-200 rounded-sm p-4 shadow-sm flex flex-col justify-between relative overflow-hidden group hover:border-emerald-300 transition-all">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Totali Incassati
          </span>
          <div className="p-2 rounded bg-emerald-50 text-emerald-600 border border-emerald-100">
            <TrendingUp className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-3">
          <div className="text-2xl font-mono font-black text-emerald-700">
            {formatEuro(metrics.totalIncassati)}
          </div>
          <div className="text-[11px] text-slate-600 mt-1">
            Somma corrispettivi attivi nel periodo
          </div>
        </div>
      </div>

      {/* CARD 2: Metodi di Pagamento */}
      <div className="bg-white border border-slate-200 rounded-sm p-4 shadow-sm flex flex-col justify-between relative overflow-hidden group hover:border-blue-300 transition-all">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Metodi di Pagamento
          </span>
          <div className="p-2 rounded bg-blue-50 text-blue-600 border border-blue-100">
            <CreditCard className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-2 space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 text-slate-700">
              <CreditCard className="h-3.5 w-3.5 text-blue-600" /> Elettronico:
            </span>
            <span className="font-mono font-bold text-blue-700">
              {formatEuro(metrics.pagatoElettronico)}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 text-slate-700">
              <Banknote className="h-3.5 w-3.5 text-emerald-600" /> Contanti:
            </span>
            <span className="font-mono font-bold text-emerald-700">
              {formatEuro(metrics.pagatoContanti)}
            </span>
          </div>
          {metrics.ticketPagato > 0 && (
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-slate-700">
                <Ticket className="h-3.5 w-3.5 text-amber-600" /> Ticket:
              </span>
              <span className="font-mono font-bold text-amber-700">
                {formatEuro(metrics.ticketPagato)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* CARD 3: Imponibile & Imposta */}
      <div className="bg-white border border-slate-200 rounded-sm p-4 shadow-sm flex flex-col justify-between relative overflow-hidden group hover:border-purple-300 transition-all">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Imponibile & Imposta
          </span>
          <div className="p-2 rounded bg-purple-50 text-purple-600 border border-purple-100">
            <Calculator className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-2 space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-600">Ammontare Totale:</span>
            <span className="font-mono font-bold text-slate-800">
              {formatEuro(metrics.totaleAmmontare)}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-600">Totale IVA:</span>
            <span className="font-mono font-bold text-purple-700">
              {formatEuro(metrics.totaleImposta)}
            </span>
          </div>
        </div>
      </div>

      {/* CARD 4: Documenti Commerciali */}
      <div className="bg-white border border-slate-200 rounded-sm p-4 shadow-sm flex flex-col justify-between relative overflow-hidden group hover:border-amber-300 transition-all">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Documenti Commerciali
          </span>
          <div className="p-2 rounded bg-amber-50 text-amber-600 border border-amber-100">
            <Receipt className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-2">
          <div className="text-2xl font-mono font-black text-amber-700">
            {metrics.numeroDocCommerciali}{" "}
            <span className="text-xs font-normal text-slate-600">emessi</span>
          </div>
          <div className="text-[11px] text-slate-600 mt-1 flex items-center gap-1.5">
            <Moon className="h-3.5 w-3.5 text-amber-600" />
            <span>{metrics.periodiInattiviCount} periodi inattivi registrati</span>
          </div>
        </div>
      </div>
    </div>
  );
}
