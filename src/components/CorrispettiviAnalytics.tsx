import React, { useMemo, useState } from "react";
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from "recharts";
import { 
  BarChart3, 
  TrendingUp, 
  Calendar as CalendarIcon, 
  Moon, 
  CheckCircle2, 
  AlertTriangle,
  Download,
  Info
} from "lucide-react";
import { DatiCorrispettivi } from "../types";

interface CorrispettiviAnalyticsProps {
  corrispettivi: DatiCorrispettivi[];
  selectedYears: string[];
  selectedMonths: string[];
}

export default function CorrispettiviAnalytics({
  corrispettivi,
  selectedYears,
  selectedMonths
}: CorrispettiviAnalyticsProps) {

  const formatEuro = (val: number) => {
    return new Intl.NumberFormat("it-IT", {
      style: "currency",
      currency: "EUR"
    }).format(val);
  };

  // Filter corrispettivi by selected year/month filters
  const filteredCorrispettivi = useMemo(() => {
    return corrispettivi.filter((corr) => {
      if (!corr.dataRilevazione) return true;
      const parts = corr.dataRilevazione.split("-");
      const year = parts[0];
      const month = parts[1];

      if (selectedYears.length > 0 && !selectedYears.includes(year)) return false;
      if (selectedMonths.length > 0 && !selectedMonths.includes(month)) return false;
      return true;
    });
  }, [corrispettivi, selectedYears, selectedMonths]);

  // 1. STACKED BAR CHART DATA (Trend Incassi Contanti vs Carte per Day)
  const stackedBarData = useMemo(() => {
    const mapByDay: Record<string, { day: string; date: string; contanti: number; elettronico: number; total: number }> = {};

    filteredCorrispettivi.forEach((corr) => {
      const dateKey = corr.dataRilevazione || "N/D";
      if (!mapByDay[dateKey]) {
        mapByDay[dateKey] = {
          day: dateKey.substring(5), // MM-DD
          date: dateKey,
          contanti: 0,
          elettronico: 0,
          total: 0
        };
      }
      if (!corr.isPeriodoInattivo) {
        mapByDay[dateKey].contanti += corr.pagatoContanti || 0;
        mapByDay[dateKey].elettronico += corr.pagatoElettronico || 0;
        mapByDay[dateKey].total += corr.totaleAmmontare || 0;
      }
    });

    const result = Object.values(mapByDay).sort((a, b) => a.date.localeCompare(b.date));
    return result;
  }, [filteredCorrispettivi]);

  // 2. SCONTRINO MEDIO LINE CHART DATA (Daily average receipt value = Totale / NumeroDoc)
  const scontrinoMedioData = useMemo(() => {
    const mapByDay: Record<string, { day: string; date: string; ammontare: number; docs: number; scontrinoMedio: number }> = {};

    filteredCorrispettivi.forEach((corr) => {
      if (corr.isPeriodoInattivo) return;
      const dateKey = corr.dataRilevazione || "N/D";
      if (!mapByDay[dateKey]) {
        mapByDay[dateKey] = {
          day: dateKey.substring(5),
          date: dateKey,
          ammontare: 0,
          docs: 0,
          scontrinoMedio: 0
        };
      }
      mapByDay[dateKey].ammontare += corr.totaleAmmontare || 0;
      mapByDay[dateKey].docs += corr.numeroDocCommerciali || 0;
    });

    Object.values(mapByDay).forEach((item) => {
      item.scontrinoMedio = item.docs > 0 ? Math.round((item.ammontare / item.docs) * 100) / 100 : 0;
    });

    return Object.values(mapByDay).sort((a, b) => a.date.localeCompare(b.date));
  }, [filteredCorrispettivi]);

  // 3. CALENDARIO OPERATIVITÀ / HEATMAP INATTIVITÀ (Monthly Days Activity Grid)
  const activityDays = useMemo(() => {
    // Generate grid for days of month (e.g. current selected month or active days)
    const mapByDay: Record<string, { date: string; dayNum: number; isInactive: boolean; countDocs: number; totalGross: number }> = {};

    filteredCorrispettivi.forEach((corr) => {
      const dateKey = corr.dataRilevazione;
      if (!dateKey) return;
      const dayNum = parseInt(dateKey.split("-")[2], 10);

      if (!mapByDay[dateKey]) {
        mapByDay[dateKey] = {
          date: dateKey,
          dayNum,
          isInactive: corr.isPeriodoInattivo,
          countDocs: corr.numeroDocCommerciali || 0,
          totalGross: corr.totaleAmmontare || 0
        };
      } else {
        if (corr.isPeriodoInattivo) mapByDay[dateKey].isInactive = true;
        mapByDay[dateKey].countDocs += corr.numeroDocCommerciali || 0;
        mapByDay[dateKey].totalGross += corr.totaleAmmontare || 0;
      }
    });

    return Object.values(mapByDay).sort((a, b) => a.date.localeCompare(b.date));
  }, [filteredCorrispettivi]);

  return (
    <div className="space-y-8 select-none">
      
      {/* HEADER SECTION */}
      <div className="flex items-center justify-between bg-white border border-slate-200 p-4 rounded-xl">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-emerald-500/20 text-emerald-700 border border-emerald-200">
            <BarChart3 className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Analisi BI & Grafici Corrispettivi
            </h3>
            <p className="text-xs text-slate-600">
              Indicatori di trend incassi, scontrino medio e calendario operatività registratori telematici.
            </p>
          </div>
        </div>

        <div className="text-xs text-slate-600 bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-300 font-mono">
          Registri analizzati: <strong className="text-blue-400 font-bold">{filteredCorrispettivi.length}</strong>
        </div>
      </div>

      {/* GRAPH 1: Trend Incassi (Stacked Bar Chart: Contanti vs Carte) */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-lg space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div>
            <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-700" />
              1. Trend Incassi: Contanti vs Carte (Stacked Bar Chart)
            </h4>
            <p className="text-xs text-slate-600">
              Ripartizione giornaliera dell'incasso tra contanti (verde) e pagamenti elettronici (blu).
            </p>
          </div>
        </div>

        <div className="h-72 w-full pt-2">
          {stackedBarData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stackedBarData} margin={{ top: 10, right: 30, left: 20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="day" stroke="#94A3B8" fontSize={11} />
                <YAxis stroke="#94A3B8" fontSize={11} tickFormatter={(val) => `€${val}`} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#0F172A", borderColor: "#334155", borderRadius: "8px" }}
                  formatter={(value: any) => [formatEuro(Number(value)), ""]}
                />
                <Legend wrapperStyle={{ paddingTop: "10px" }} />
                <Bar dataKey="contanti" name="Pagato Contanti" stackId="incassi" fill="#10B981" radius={[0, 0, 0, 0]} />
                <Bar dataKey="elettronico" name="Pagato Elettronico" stackId="incassi" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-xs text-slate-500 bg-slate-50 rounded-lg border border-dashed border-slate-200">
              Nessun dato disponibile per il grafico Trend Incassi.
            </div>
          )}
        </div>
      </div>

      {/* GRAPH 2: Scontrino Medio (Line Chart) */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-lg space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div>
            <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-purple-700" />
              2. Scontrino Medio (Line Chart)
            </h4>
            <p className="text-xs text-slate-600">
              Valore medio per transazione commerciale (Incasso Totale / Numero Documenti Commerciali).
            </p>
          </div>
        </div>

        <div className="h-72 w-full pt-2">
          {scontrinoMedioData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={scontrinoMedioData} margin={{ top: 10, right: 30, left: 20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="day" stroke="#94A3B8" fontSize={11} />
                <YAxis stroke="#94A3B8" fontSize={11} tickFormatter={(val) => `€${val}`} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#0F172A", borderColor: "#334155", borderRadius: "8px" }}
                  formatter={(value: any) => [formatEuro(Number(value)), "Scontrino Medio"]}
                />
                <Line
                  type="monotone"
                  dataKey="scontrinoMedio"
                  name="Scontrino Medio (€)"
                  stroke="#A855F7"
                  strokeWidth={3}
                  dot={{ r: 5, fill: "#A855F7" }}
                  activeDot={{ r: 8 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-xs text-slate-500 bg-slate-50 rounded-lg border border-dashed border-slate-200">
              Nessun dato disponibile per lo Scontrino Medio.
            </div>
          )}
        </div>
      </div>

      {/* GRAPH 3: Calendario Operatività / Heatmap Inattività */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-lg space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div>
            <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <CalendarIcon className="h-4 w-4 text-amber-700" />
              3. Calendario Operatività & Heatmap Inattività
            </h4>
            <p className="text-xs text-slate-600">
              Griglia operatività dei registratori telematici: operativi (verde) vs periodi inattivi/chiusura (arancione).
            </p>
          </div>
        </div>

        {activityDays.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3 pt-2">
            {activityDays.map((item) => (
              <div
                key={item.date}
                className={`p-3 rounded-xl border flex flex-col justify-between transition-all ${
                  item.isInactive
                    ? "bg-amber-50 border-amber-200 text-amber-700"
                    : "bg-slate-50 border-slate-300/80 text-slate-800 hover:border-emerald-500/50"
                }`}
              >
                <div className="flex items-center justify-between text-xs font-mono font-bold">
                  <span>{item.date}</span>
                  {item.isInactive ? (
                    <Moon className="h-3.5 w-3.5 text-amber-700" />
                  ) : (
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-700" />
                  )}
                </div>

                <div className="mt-2 text-xs font-semibold">
                  {item.isInactive ? (
                    <span className="text-[10px] uppercase font-bold text-amber-700">Inattivo</span>
                  ) : (
                    <span className="text-xs font-mono text-emerald-700 font-bold">{formatEuro(item.totalGross)}</span>
                  )}
                </div>

                <div className="text-[10px] text-slate-600 mt-1">
                  {item.isInactive ? "Dispositivo fermo" : `${item.countDocs} doc. comm.`}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center text-xs text-slate-500 bg-slate-50 rounded-lg border border-dashed border-slate-200">
            Nessun dato di operatività disponibile.
          </div>
        )}
      </div>

    </div>
  );
}
