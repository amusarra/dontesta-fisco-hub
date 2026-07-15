import React, { useMemo } from "react";
import {
  TrendingUp,
  Users,
  Building,
  CreditCard,
  Download,
  FileSpreadsheet,
  Calendar,
  DollarSign,
  ArrowLeft,
  PieChart as PieIcon,
  BarChart2,
  FileText
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from "recharts";
import { FatturaElettronica, TIPO_DOCUMENTO_MAP, MODALITA_PAGAMENTO_MAP } from "../types";
import html2canvas from "html2canvas-pro";

interface AnalyticsDashboardProps {
  invoices: FatturaElettronica[];
  selectedYear: string;
  selectedMonth: string | null;
  onClose: () => void;
  onShowNotification?: (message: string, type: "success" | "error" | "info") => void;
}

const COLORS = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899", "#14B8A6", "#6366F1"];

const MONTH_NAMES = [
  "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
  "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"
];

export default function AnalyticsDashboard({
  invoices,
  selectedYear,
  selectedMonth,
  onClose,
  onShowNotification
}: AnalyticsDashboardProps) {

  // Format currency in Italian style
  const formatEuro = (val: number) => {
    return new Intl.NumberFormat("it-IT", {
      style: "currency",
      currency: "EUR"
    }).format(val);
  };

  // Helper to trigger CSV download
  const downloadCSV = (data: any[], filename: string, headers: string[], displayLabels?: Record<string, string>) => {
    try {
      const csvRows = [];
      const headerRow = headers.map(h => displayLabels?.[h] || h);
      csvRows.push(headerRow.join(";"));

      for (const item of data) {
        const values = headers.map(h => {
          const val = item[h];
          if (val === undefined || val === null) return "";
          
          // Format numbers to Italian format with comma if they are floats
          if (typeof val === "number") {
            return val.toFixed(2).replace(".", ",");
          }
          
          const stringVal = String(val);
          const escaped = stringVal.replace(/"/g, '""');
          if (escaped.includes(";") || escaped.includes(",") || escaped.includes('"') || escaped.includes("\n")) {
            return `"${escaped}"`;
          }
          return escaped;
        });
        csvRows.push(values.join(";"));
      }

      const csvContent = "\uFEFF" + csvRows.join("\r\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${filename}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      if (onShowNotification) {
        onShowNotification(`Dati CSV "${filename}.csv" esportati con successo.`, "success");
      }
    } catch (err) {
      console.error(err);
      if (onShowNotification) {
        onShowNotification("Errore durante l'esportazione CSV.", "error");
      }
    }
  };

  // Helper to trigger PNG download of a card
  const downloadCardAsImage = async (cardId: string, filename: string) => {
    try {
      const element = document.getElementById(cardId);
      if (!element) {
        if (onShowNotification) onShowNotification("Elemento grafico non trovato.", "error");
        return;
      }

      // Briefly add extra padding or style if needed, or render as is
      const canvas = await html2canvas(element, {
        scale: 2, // high res
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false
      });

      const dataUrl = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = `${filename}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      if (onShowNotification) {
        onShowNotification(`Grafico "${filename}.png" esportato con successo.`, "success");
      }
    } catch (err) {
      console.error(err);
      if (onShowNotification) {
        onShowNotification("Errore durante l'esportazione del grafico.", "error");
      }
    }
  };

  // --------------------------------------------------------
  // DATA FILTERING & KPI CALCULATIONS
  // --------------------------------------------------------
  const filteredData = useMemo(() => {
    return invoices.filter(inv => {
      // Year filter
      if (selectedYear !== "TUTTI GLI ANNI") {
        const year = inv.datiGenerali.data.split("-")[0];
        if (year !== selectedYear) return false;
      }
      // Month filter
      if (selectedMonth !== null) {
        const month = inv.datiGenerali.data.split("-")[1];
        if (month !== selectedMonth) return false;
      }
      return true;
    });
  }, [invoices, selectedYear, selectedMonth]);

  // KPIs
  const kpis = useMemo(() => {
    let imponibile = 0;
    let imposta = 0;
    let totale = 0;
    
    filteredData.forEach(inv => {
      imponibile += inv.totaleImponibile || 0;
      imposta += inv.totaleImposta || 0;
      totale += inv.totaleDocumento || 0;
    });

    return {
      count: filteredData.length,
      imponibile,
      imposta,
      totale
    };
  }, [filteredData]);

  // --------------------------------------------------------
  // CHART 1: Trend over Time (Monthly, Annual, or Daily)
  // --------------------------------------------------------
  const trendData = useMemo(() => {
    if (selectedYear === "TUTTI GLI ANNI") {
      // Group by Year
      const groups: Record<string, { period: string; imponibile: number; imposta: number; totale: number }> = {};
      filteredData.forEach(inv => {
        const year = inv.datiGenerali.data.split("-")[0] || "N.D.";
        if (!groups[year]) {
          groups[year] = { period: year, imponibile: 0, imposta: 0, totale: 0 };
        }
        groups[year].imponibile += inv.totaleImponibile || 0;
        groups[year].imposta += inv.totaleImposta || 0;
        groups[year].totale += inv.totaleDocumento || 0;
      });
      return Object.values(groups).sort((a, b) => a.period.localeCompare(b.period));
    } else if (selectedMonth === null) {
      // Group by Month for selected year
      const monthlyArray = Array.from({ length: 12 }, (_, i) => {
        const monthNum = String(i + 1).padStart(2, "0");
        return {
          period: MONTH_NAMES[i],
          monthKey: monthNum,
          imponibile: 0,
          imposta: 0,
          totale: 0
        };
      });

      filteredData.forEach(inv => {
        const month = inv.datiGenerali.data.split("-")[1];
        const monthIdx = parseInt(month, 10) - 1;
        if (monthIdx >= 0 && monthIdx < 12) {
          monthlyArray[monthIdx].imponibile += inv.totaleImponibile || 0;
          monthlyArray[monthIdx].imposta += inv.totaleImposta || 0;
          monthlyArray[monthIdx].totale += inv.totaleDocumento || 0;
        }
      });
      return monthlyArray;
    } else {
      // Group by Day for selected month and year
      const daysInMonth = new Date(parseInt(selectedYear, 10), parseInt(selectedMonth, 10), 0).getDate();
      const dailyMap: Record<string, { period: string; imponibile: number; imposta: number; totale: number }> = {};
      
      for (let d = 1; d <= daysInMonth; d++) {
        const dayStr = String(d).padStart(2, "0");
        dailyMap[dayStr] = { period: dayStr, imponibile: 0, imposta: 0, totale: 0 };
      }

      filteredData.forEach(inv => {
        const parts = inv.datiGenerali.data.split("-");
        const day = parts[2];
        if (day && dailyMap[day]) {
          dailyMap[day].imponibile += inv.totaleImponibile || 0;
          dailyMap[day].imposta += inv.totaleImposta || 0;
          dailyMap[day].totale += inv.totaleDocumento || 0;
        }
      });

      return Object.keys(dailyMap)
        .sort((a, b) => parseInt(a, 10) - parseInt(b, 10))
        .map(day => ({
          period: `Giorno ${parseInt(day, 10)}`,
          ...dailyMap[day]
        }));
    }
  }, [filteredData, selectedYear, selectedMonth]);

  // --------------------------------------------------------
  // CHART 2: Top Clients (Cessionari)
  // --------------------------------------------------------
  const topClientsData = useMemo(() => {
    const clients: Record<string, { name: string; partitaIva: string; imponibile: number; totale: number }> = {};
    
    filteredData.forEach(inv => {
      const client = inv.cessionarioCommittente;
      const vat = client.anagrafica.partitaIva || client.anagrafica.codiceFiscale || "N.D.";
      const name = client.anagrafica.denominazione || 
                   `${client.anagrafica.nome || ""} ${client.anagrafica.cognome || ""}`.trim() || 
                   vat;

      if (!clients[vat]) {
        clients[vat] = { name, partitaIva: vat, imponibile: 0, totale: 0 };
      }
      clients[vat].imponibile += inv.totaleImponibile || 0;
      clients[vat].totale += inv.totaleDocumento || 0;
    });

    return Object.values(clients)
      .sort((a, b) => b.totale - a.totale)
      .slice(0, 5);
  }, [filteredData]);

  // --------------------------------------------------------
  // CHART 3: Top Suppliers (Cedenti)
  // --------------------------------------------------------
  const topSuppliersData = useMemo(() => {
    const suppliers: Record<string, { name: string; partitaIva: string; imponibile: number; totale: number }> = {};

    filteredData.forEach(inv => {
      const supplier = inv.cedentePrestatore;
      const vat = supplier.anagrafica.partitaIva || supplier.anagrafica.codiceFiscale || "N.D.";
      const name = supplier.anagrafica.denominazione || 
                   `${supplier.anagrafica.nome || ""} ${supplier.anagrafica.cognome || ""}`.trim() || 
                   vat;

      if (!suppliers[vat]) {
        suppliers[vat] = { name, partitaIva: vat, imponibile: 0, totale: 0 };
      }
      suppliers[vat].imponibile += inv.totaleImponibile || 0;
      suppliers[vat].totale += inv.totaleDocumento || 0;
    });

    return Object.values(suppliers)
      .sort((a, b) => b.totale - a.totale)
      .slice(0, 5);
  }, [filteredData]);

  // --------------------------------------------------------
  // CHART 4: Document Type split
  // --------------------------------------------------------
  const docTypeData = useMemo(() => {
    const types: Record<string, { code: string; type: string; count: number; total: number }> = {};

    filteredData.forEach(inv => {
      const code = inv.datiGenerali.tipoDocumento || "N.D.";
      const decoded = TIPO_DOCUMENTO_MAP[code] || inv.datiGenerali.tipoDocumentoDecodificato || code;
      
      if (!types[code]) {
        types[code] = { code, type: decoded, count: 0, total: 0 };
      }
      types[code].count += 1;
      types[code].total += inv.totaleDocumento || 0;
    });

    return Object.values(types).sort((a, b) => b.total - a.total);
  }, [filteredData]);

  // --------------------------------------------------------
  // CHART 5: Payment Methods split
  // --------------------------------------------------------
  const paymentMethodData = useMemo(() => {
    const methods: Record<string, { code: string; method: string; count: number; total: number }> = {};

    filteredData.forEach(inv => {
      // Use the first payment detail or fallback
      const pag = inv.pagamenti?.[0];
      const code = pag?.modalitaPagamento || "N.D.";
      const decoded = MODALITA_PAGAMENTO_MAP[code] || pag?.modalitaPagamentoDecodificato || "N.D. / Altro";

      if (!methods[code]) {
        methods[code] = { code, method: decoded, count: 0, total: 0 };
      }
      methods[code].count += 1;
      methods[code].total += inv.totaleDocumento || 0;
    });

    return Object.values(methods).sort((a, b) => b.total - a.total);
  }, [filteredData]);

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 p-6 flex flex-col gap-6 animate-fade-in" id="analytics-dashboard-page">
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-4 shrink-0">
        <div>
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline mb-1 transition-all cursor-pointer"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Torna alla Lista Fatture
          </button>
          <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <BarChart2 className="h-5 w-5 text-blue-600" /> Dashboard Analitica & Statistiche
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            Analisi dettagliata del fatturato basata sul database caricato. Filtri attivi: 
            <strong className="text-slate-800 ml-1">Anno: {selectedYear}</strong>
            {selectedMonth && <strong className="text-slate-800 ml-1">• Mese: {MONTH_NAMES[parseInt(selectedMonth, 10) - 1]}</strong>}
          </p>
        </div>
        
        <button
          onClick={() => {
            // Overall CSV export of all filtered invoices
            const exportRows = filteredData.map(inv => ({
              ID: inv.id,
              NomeFile: inv.fileName,
              Numero: inv.datiGenerali.numero,
              Data: inv.datiGenerali.data,
              TipoDocumento: inv.datiGenerali.tipoDocumentoDecodificato,
              Fornitore: inv.cedentePrestatore.anagrafica.denominazione || `${inv.cedentePrestatore.anagrafica.nome || ""} ${inv.cedentePrestatore.anagrafica.cognome || ""}`.trim(),
              FornitorePIVA: inv.cedentePrestatore.anagrafica.partitaIva || inv.cedentePrestatore.anagrafica.codiceFiscale || "",
              Cliente: inv.cessionarioCommittente.anagrafica.denominazione || `${inv.cessionarioCommittente.anagrafica.nome || ""} ${inv.cessionarioCommittente.anagrafica.cognome || ""}`.trim(),
              ClientePIVA: inv.cessionarioCommittente.anagrafica.partitaIva || inv.cessionarioCommittente.anagrafica.codiceFiscale || "",
              Imponibile: inv.totaleImponibile,
              Imposta: inv.totaleImposta,
              TotaleDocumento: inv.totaleDocumento
            }));
            
            downloadCSV(
              exportRows,
              `elenco_fatture_${selectedYear}_${selectedMonth || "tutti"}`,
              ["ID", "NomeFile", "Numero", "Data", "TipoDocumento", "Fornitore", "FornitorePIVA", "Cliente", "ClientePIVA", "Imponibile", "Imposta", "TotaleDocumento"],
              {
                ID: "ID Interno",
                NomeFile: "Nome File",
                Numero: "Numero Fattura",
                Data: "Data Emissione",
                TipoDocumento: "Tipo Documento",
                Fornitore: "Fornitore / Cedente",
                FornitorePIVA: "P.IVA/CF Fornitore",
                Cliente: "Cliente / Cessionario",
                ClientePIVA: "P.IVA/CF Cliente",
                Imponibile: "Importo Imponibile (€)",
                Imposta: "Importo IVA (€)",
                TotaleDocumento: "Totale Documento (€)"
              }
            );
          }}
          className="flex items-center gap-2 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-sm transition-all active:scale-95 cursor-pointer shrink-0"
          title="Esporta tutte le fatture filtrate in formato CSV"
        >
          <FileSpreadsheet className="h-4 w-4" />
          Esporta Lista in CSV
        </button>
      </div>

      {/* KPI METRICS GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 shrink-0">
        {/* KPI 1: Total Volume */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-lg shrink-0">
            <DollarSign className="h-5 w-5" />
          </div>
          <div>
            <div className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Volume d'Affari Totale</div>
            <div className="text-base font-black text-slate-900 leading-tight mt-0.5">{formatEuro(kpis.totale)}</div>
            <div className="text-[10px] text-slate-500 font-medium">Somma importi documenti</div>
          </div>
        </div>

        {/* KPI 2: Taxable */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg shrink-0">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div>
            <div className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Totale Imponibile</div>
            <div className="text-base font-black text-slate-900 leading-tight mt-0.5">{formatEuro(kpis.imponibile)}</div>
            <div className="text-[10px] text-slate-500 font-medium">Basi imponibili complessive</div>
          </div>
        </div>

        {/* KPI 3: Taxes (IVA) */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-lg shrink-0">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <div className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Totale IVA (Imposta)</div>
            <div className="text-base font-black text-slate-900 leading-tight mt-0.5">{formatEuro(kpis.imposta)}</div>
            <div className="text-[10px] text-slate-500 font-medium">Imposta calcolata</div>
          </div>
        </div>

        {/* KPI 4: Count */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-violet-50 text-violet-600 rounded-lg shrink-0">
            <Calendar className="h-5 w-5" />
          </div>
          <div>
            <div className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Fatture Caricate</div>
            <div className="text-base font-black text-slate-900 leading-tight mt-0.5">{kpis.count}</div>
            <div className="text-[10px] text-slate-500 font-medium">Fatture nel periodo corrente</div>
          </div>
        </div>
      </div>

      {/* CHARTS CONTAINER GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-0">
        
        {/* CHART 1: TREND */}
        <div 
          className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-4 min-h-[360px]"
          id="chart-trend-card"
        >
          <div className="flex justify-between items-center border-b border-slate-100 pb-2.5">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4.5 w-4.5 text-blue-500" />
              <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-tight">Andamento del Fatturato</h3>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => downloadCSV(trendData, `trend_fatturato_${selectedYear}`, ["period", "imponibile", "imposta", "totale"], {
                  period: "Periodo",
                  imponibile: "Imponibile (€)",
                  imposta: "IVA (€)",
                  totale: "Totale (€)"
                })}
                className="p-1 rounded hover:bg-slate-100 text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
                title="Esporta dati in CSV"
              >
                <Download className="h-4 w-4" />
              </button>
              <button
                onClick={() => downloadCardAsImage("chart-trend-card", `andamento_fatturato_${selectedYear}`)}
                className="p-1 rounded hover:bg-slate-100 text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
                title="Esporta grafico come immagine"
              >
                <BarChart2 className="h-4 w-4" />
              </button>
            </div>
          </div>
          
          <div className="flex-1 min-h-0 w-full" style={{ height: 260 }}>
            {trendData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400 font-medium">Nessun dato disponibile</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="period" stroke="#94A3B8" fontSize={10} tickLine={false} />
                  <YAxis stroke="#94A3B8" fontSize={10} tickLine={false} tickFormatter={(val) => `€${val}`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#0F172A", border: "none", borderRadius: 8 }}
                    labelStyle={{ color: "#F8FAFC", fontWeight: "bold", fontSize: 11 }}
                    itemStyle={{ color: "#3B82F6", fontSize: 11 }}
                    formatter={(value: any) => [formatEuro(Number(value)), "Totale"]}
                  />
                  <Legend verticalAlign="top" height={36} iconSize={10} wrapperStyle={{ fontSize: 10, fontWeight: "bold" }} />
                  <Line name="Totale Documenti (€)" type="monotone" dataKey="totale" stroke="#3B82F6" strokeWidth={2.5} activeDot={{ r: 6 }} />
                  <Line name="Totale Imponibile (€)" type="monotone" dataKey="imponibile" stroke="#10B981" strokeWidth={1.5} strokeDasharray="4 4" />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* CHART 2: TOP CLIENTS */}
        <div 
          className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-4 min-h-[360px]"
          id="chart-clients-card"
        >
          <div className="flex justify-between items-center border-b border-slate-100 pb-2.5">
            <div className="flex items-center gap-2">
              <Users className="h-4.5 w-4.5 text-emerald-500" />
              <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-tight">Top 5 Clienti (Volume d'Affari)</h3>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => downloadCSV(topClientsData, "top_clienti", ["name", "partitaIva", "imponibile", "totale"], {
                  name: "Cliente",
                  partitaIva: "P.IVA/CF",
                  imponibile: "Imponibile (€)",
                  totale: "Totale (€)"
                })}
                className="p-1 rounded hover:bg-slate-100 text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
                title="Esporta dati in CSV"
              >
                <Download className="h-4 w-4" />
              </button>
              <button
                onClick={() => downloadCardAsImage("chart-clients-card", "top_clienti")}
                className="p-1 rounded hover:bg-slate-100 text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
                title="Esporta grafico come immagine"
              >
                <BarChart2 className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="flex-1 min-h-0 w-full" style={{ height: 260 }}>
            {topClientsData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400 font-medium">Nessun dato disponibile</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topClientsData} layout="vertical" margin={{ top: 10, right: 10, left: 30, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
                  <XAxis type="number" stroke="#94A3B8" fontSize={10} tickLine={false} tickFormatter={(val) => `€${val}`} />
                  <YAxis type="category" dataKey="name" stroke="#64748B" fontSize={9} tickLine={false} width={120} tickFormatter={(val) => val.substring(0, 15) + (val.length > 15 ? "..." : "")} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#0F172A", border: "none", borderRadius: 8 }}
                    labelStyle={{ color: "#F8FAFC", fontWeight: "bold", fontSize: 11 }}
                    itemStyle={{ color: "#10B981", fontSize: 11 }}
                    formatter={(value: any) => [formatEuro(Number(value)), "Importo Totale"]}
                  />
                  <Bar dataKey="totale" fill="#10B981" radius={[0, 4, 4, 0]} maxBarSize={28}>
                    {topClientsData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* CHART 3: DOCUMENT TYPES */}
        <div 
          className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-4 min-h-[360px]"
          id="chart-types-card"
        >
          <div className="flex justify-between items-center border-b border-slate-100 pb-2.5">
            <div className="flex items-center gap-2">
              <PieIcon className="h-4.5 w-4.5 text-amber-500" />
              <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-tight">Distribuzione Tipi Documento</h3>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => downloadCSV(docTypeData, "tipologie_documento", ["code", "type", "count", "total"], {
                  code: "Codice TD",
                  type: "Tipologia Documento",
                  count: "Numero Documenti",
                  total: "Totale Importo (€)"
                })}
                className="p-1 rounded hover:bg-slate-100 text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
                title="Esporta dati in CSV"
              >
                <Download className="h-4 w-4" />
              </button>
              <button
                onClick={() => downloadCardAsImage("chart-types-card", "tipologie_documento")}
                className="p-1 rounded hover:bg-slate-100 text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
                title="Esporta grafico come immagine"
              >
                <BarChart2 className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="flex-1 flex flex-col sm:flex-row items-center justify-center gap-4 min-h-0 w-full" style={{ height: 260 }}>
            {docTypeData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400 font-medium">Nessun dato disponibile</div>
            ) : (
              <>
                <div className="w-full sm:w-1/2 h-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={docTypeData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={80}
                        paddingAngle={4}
                        dataKey="count"
                        nameKey="code"
                      >
                        {docTypeData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ backgroundColor: "#0F172A", border: "none", borderRadius: 8 }}
                        itemStyle={{ color: "#F8FAFC", fontSize: 11 }}
                        formatter={(value: any, name: any, props: any) => {
                          const item = props.payload;
                          return [`${value} fatture (${formatEuro(item.total)})`, `${item.code} - ${item.type.substring(0, 20)}...`];
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                
                {/* Custom Legend to fit full labels without overlap */}
                <div className="w-full sm:w-1/2 flex flex-col gap-1.5 max-h-[220px] overflow-y-auto pr-2 scrollbar-thin">
                  {docTypeData.map((item, index) => (
                    <div key={item.code} className="flex items-start gap-2.5 text-slate-700 text-xs font-semibold">
                      <div className="w-3 h-3 rounded-xs shrink-0 mt-0.5" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-extrabold text-slate-900 truncate" title={`${item.code}: ${item.type}`}>
                            {item.code} - {item.type.substring(0, 18)}{item.type.length > 18 ? "..." : ""}
                          </span>
                          <span className="text-slate-450 text-[10px] shrink-0">x{item.count}</span>
                        </div>
                        <div className="text-[10.5px] font-mono text-slate-500 mt-0.5">{formatEuro(item.total)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* CHART 4: PAYMENT METHODS */}
        <div 
          className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-4 min-h-[360px]"
          id="chart-payments-card"
        >
          <div className="flex justify-between items-center border-b border-slate-100 pb-2.5">
            <div className="flex items-center gap-2">
              <CreditCard className="h-4.5 w-4.5 text-violet-500" />
              <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-tight">Metodi di Pagamento Preferiti</h3>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => downloadCSV(paymentMethodData, "metodi_pagamento", ["code", "method", "count", "total"], {
                  code: "Codice MP",
                  method: "Metodo di Pagamento",
                  count: "Utilizzi",
                  total: "Valore Totale (€)"
                })}
                className="p-1 rounded hover:bg-slate-100 text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
                title="Esporta dati in CSV"
              >
                <Download className="h-4 w-4" />
              </button>
              <button
                onClick={() => downloadCardAsImage("chart-payments-card", "metodi_pagamento")}
                className="p-1 rounded hover:bg-slate-100 text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
                title="Esporta grafico come immagine"
              >
                <BarChart2 className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="flex-1 min-h-0 w-full" style={{ height: 260 }}>
            {paymentMethodData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400 font-medium">Nessun dato disponibile</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={paymentMethodData} margin={{ top: 15, right: 10, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                  <XAxis dataKey="code" stroke="#64748B" fontSize={10} tickLine={false} />
                  <YAxis stroke="#94A3B8" fontSize={10} tickLine={false} tickFormatter={(val) => `€${val}`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#0F172A", border: "none", borderRadius: 8 }}
                    labelStyle={{ color: "#F8FAFC", fontWeight: "bold", fontSize: 11 }}
                    itemStyle={{ color: "#8B5CF6", fontSize: 11 }}
                    formatter={(value: any, name: any, props: any) => [
                      `${formatEuro(Number(value))} (${props.payload.count} transazioni)`,
                      "Importo Gestito"
                    ]}
                  />
                  <Bar dataKey="total" fill="#8B5CF6" radius={[4, 4, 0, 0]} maxBarSize={35}>
                    {paymentMethodData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

      </div>

      {/* DETAILED DATA TABLE */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-4">
        <div className="flex justify-between items-center border-b border-slate-100 pb-2.5">
          <div className="flex items-center gap-2">
            <Building className="h-4.5 w-4.5 text-blue-500" />
            <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-tight">Riepilogo Fornitori / Spese</h3>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase text-[9px] tracking-wider bg-slate-50">
                <th className="py-2.5 px-3">Fornitore / Cedente</th>
                <th className="py-2.5 px-3">Partita IVA / Codice Fiscale</th>
                <th className="py-2.5 px-3 text-right">Imponibile Complessivo</th>
                <th className="py-2.5 px-3 text-right">Totale Documentato</th>
              </tr>
            </thead>
            <tbody>
              {topSuppliersData.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-4 text-center text-slate-400 font-medium">Nessuna spesa o fornitore caricato nel periodo corrente.</td>
                </tr>
              ) : (
                topSuppliersData.map((sup, idx) => (
                  <tr key={sup.partitaIva} className="border-b border-slate-100 hover:bg-slate-50/70 transition-colors font-medium text-slate-700">
                    <td className="py-3 px-3 text-slate-950 font-bold">{sup.name}</td>
                    <td className="py-3 px-3 font-mono text-slate-500">{sup.partitaIva}</td>
                    <td className="py-3 px-3 text-right font-mono text-slate-600">{formatEuro(sup.imponibile)}</td>
                    <td className="py-3 px-3 text-right font-mono text-blue-600 font-bold">{formatEuro(sup.totale)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
