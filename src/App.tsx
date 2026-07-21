import React, { useState, useEffect, useMemo, useRef } from "react";
import { 
  Building2, 
  HelpCircle, 
  Info, 
  Sparkles, 
  Upload, 
  FileCheck2, 
  Trash2,
  ListFilter,
  CheckCircle2,
  AlertTriangle,
  FolderOpen,
  MoreVertical,
  RotateCw,
  Folder,
  Play,
  Pause,
  Clock,
  Settings,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Building,
  ExternalLink,
  Github,
  Globe,
  BarChart3
} from "lucide-react";

import Sidebar from "./components/Sidebar";
import InvoiceList from "./components/InvoiceList";
import InvoiceViewer from "./components/InvoiceViewer";
import AnalyticsDashboard from "./components/AnalyticsDashboard";
import DatabaseStatus from "./components/DatabaseStatus";
import MultiSelect from "./components/MultiSelect";
import CompanyModal from "./components/CompanyModal";
import { parseFatturaXML, validateFatturaXML, extractXmlFromP7m, decodeXmlBytes } from "./utils/parser";
import { loadInvoicesFromDB, saveInvoicesToDB, clearInvoicesDB, migrateFromLocalStorage } from "./utils/db";
import { loadCompaniesFromDB, saveCompanyToDB, deleteCompanyFromDB, getActiveCompanyIdFromLS, setActiveCompanyIdInLS, DUMMY_GUEST_COMPANY } from "./utils/companyDb";
import { FatturaElettronica, Azienda } from "./types";
import appMetadata from "../metadata.json";

interface Toast {
  id: string;
  message: string;
  type: "success" | "error" | "info";
}

const MONTHS = [
  { name: "TUTTI I MESI", value: null },
  { name: "GENNAIO", value: "01" },
  { name: "FEBBRAIO", value: "02" },
  { name: "MARZO", value: "03" },
  { name: "APRILE", value: "04" },
  { name: "MAGGIO", value: "05" },
  { name: "GIUGNO", value: "06" },
  { name: "LUGLIO", value: "07" },
  { name: "AGOSTO", value: "08" },
  { name: "SETTEMBRE", value: "09" },
  { name: "OTTOBRE", value: "10" },
  { name: "NOVEMBRE", value: "11" },
  { name: "DICEMBRE", value: "12" }
];

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

function base64ToBytes(base64?: string): Uint8Array | undefined {
  if (!base64) return undefined;
  try {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  } catch {
    return undefined;
  }
}

function deduplicateInvoices(list: FatturaElettronica[]): FatturaElettronica[] {
  const seen = new Set<string>();
  return list.filter((inv) => {
    if (!inv || !inv.id) return false;
    if (seen.has(inv.id)) return false;
    seen.add(inv.id);
    return true;
  });
}

export default function App() {
  const [invoices, setInvoices] = useState<FatturaElettronica[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<FatturaElettronica | null>(null);
  const [activeView, setActiveView] = useState<"list" | "charts">("list");
  const [isSidebarExpanded, setIsSidebarExpanded] = useState<boolean>(() => {
    return localStorage.getItem("dontesta_sidebar_expanded") !== "false";
  });
  const [isInvoiceListExpanded, setIsInvoiceListExpanded] = useState<boolean>(() => {
    return localStorage.getItem("dontesta_invoice_list_expanded") !== "false";
  });

  // Company management states
  const [companies, setCompanies] = useState<Azienda[]>([]);
  const [activeCompany, setActiveCompany] = useState<Azienda | null>(null);
  const [isCompanyModalOpen, setIsCompanyModalOpen] = useState<boolean>(false);
  const [companyModalInitialView, setCompanyModalInitialView] = useState<"startup" | "selection" | "form">("selection");

  // Work directory configuration
  const [workDirectory, setWorkDirectory] = useState<string>(() => {
    return localStorage.getItem("dontesta_work_directory") || "/Users/amusarra/Downloads";
  });
  const [isAutoRefresh, setIsAutoRefresh] = useState<boolean>(() => {
    return localStorage.getItem("dontesta_auto_refresh") === "true";
  });
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [lastScanTime, setLastScanTime] = useState<string | null>(() => {
    return localStorage.getItem("dontesta_last_scan_time") || null;
  });
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isInfoOpen, setIsInfoOpen] = useState<boolean>(false);
  const [isEditingPath, setIsEditingPath] = useState<boolean>(false);
  const [tempPath, setTempPath] = useState<string>(workDirectory);
  const [nextScanCountdown, setNextScanCountdown] = useState<number>(15);

  const folderInputRef = useRef<HTMLInputElement>(null);
  const settingsRef = useRef<HTMLDivElement>(null);

  // Initialize companies database and select reference company
  useEffect(() => {
    const initCompanies = async () => {
      try {
        const list = await loadCompaniesFromDB();
        setCompanies(list);

        if (list.length === 0) {
          // Requirement 1: No companies defined -> Ask user on startup
          setActiveCompany(DUMMY_GUEST_COMPANY);
          setCompanyModalInitialView("startup");
          setIsCompanyModalOpen(true);
        } else {
          // Requirement 3: 1 or more companies -> Select reference company
          const savedId = getActiveCompanyIdFromLS();
          if (savedId === DUMMY_GUEST_COMPANY.id) {
            setActiveCompany(DUMMY_GUEST_COMPANY);
          } else {
            const matched = list.find((c) => c.id === savedId);
            if (matched) {
              setActiveCompany(matched);
            } else {
              setActiveCompany(list[0]);
              setActiveCompanyIdInLS(list[0].id);
            }
          }
        }
      } catch (err) {
        console.error("Errore inizializzazione aziende:", err);
        setActiveCompany(DUMMY_GUEST_COMPANY);
      }
    };

    initCompanies();
  }, []);

  const handleSelectCompany = (company: Azienda) => {
    setActiveCompany(company);
    setActiveCompanyIdInLS(company.id);
  };

  const handleSaveCompany = async (company: Azienda) => {
    await saveCompanyToDB(company);
    const updated = await loadCompaniesFromDB();
    setCompanies(updated);
  };

  const handleDeleteCompany = async (id: string) => {
    await deleteCompanyFromDB(id);
    const updated = await loadCompaniesFromDB();
    setCompanies(updated);
    if (activeCompany?.id === id) {
      if (updated.length > 0) {
        setActiveCompany(updated[0]);
        setActiveCompanyIdInLS(updated[0].id);
      } else {
        setActiveCompany(DUMMY_GUEST_COMPANY);
        setActiveCompanyIdInLS(DUMMY_GUEST_COMPANY.id);
      }
    }
  };

  // Trigger folder scanning
  const triggerFolderScan = () => {
    if (isScanning) return;
    setIsScanning(true);
    
    setTimeout(() => {
      const nowStr = new Date().toLocaleTimeString();
      setLastScanTime(nowStr);
      localStorage.setItem("dontesta_last_scan_time", nowStr);

      addToast(`[Cartella] Scansione completata. Nessuna nuova fattura trovata in "${workDirectory}".`, "info");
      setIsScanning(false);
    }, 1200);
  };

  // Auto-refresh periodic check
  useEffect(() => {
    if (!isAutoRefresh) return;
    
    const intervalId = setInterval(() => {
      setNextScanCountdown((prev) => {
        if (prev <= 1) {
          triggerFolderScan();
          return 15; // Reset countdown
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(intervalId);
  }, [isAutoRefresh, invoices, workDirectory]); // Depend on workDirectory too to bind correct context

  // Close settings popup when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) {
        setIsSettingsOpen(false);
        setIsEditingPath(false);
      }
    };
    if (isSettingsOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isSettingsOpen]);

  // Handle external link clicks in Tauri environment
  useEffect(() => {
    const handleExternalLinks = async (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const anchor = target.closest("a");
      if (anchor && anchor.href && (anchor.target === "_blank" || anchor.href.startsWith("http"))) {
        if ((window as any).__TAURI_INTERNALS__) {
          e.preventDefault();
          try {
            const { openUrl } = await import("@tauri-apps/plugin-opener");
            await openUrl(anchor.href);
          } catch (err) {
            console.error("Errore nell'apertura del link esterno in Tauri:", err);
          }
        }
      }
    };

    document.addEventListener("click", handleExternalLinks);
    return () => {
      document.removeEventListener("click", handleExternalLinks);
    };
  }, []);

  // Handle local folder selection with real file uploading
  const handleFolderSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const filesList = e.target.files;
      
      // Extrapolate folder name from webkitRelativePath
      const firstFile = filesList[0];
      if (firstFile && firstFile.webkitRelativePath) {
        const parts = firstFile.webkitRelativePath.split("/");
        if (parts.length > 1) {
          const folderName = parts[0];
          const simulatedPath = `/Users/utente/${folderName}`;
          setWorkDirectory(simulatedPath);
          setTempPath(simulatedPath);
          localStorage.setItem("dontesta_work_directory", simulatedPath);
        }
      }
      
      const newInvoices: FatturaElettronica[] = [];
      const errors: string[] = [];
      
      setIsScanning(true);
      
      for (let i = 0; i < filesList.length; i++) {
        const file = filesList[i];
        const fileName = file.name;
        const lowerName = fileName.toLowerCase();
        
        if (!lowerName.endsWith(".xml") && !lowerName.endsWith(".p7m")) {
          continue;
        }
        
        try {
          const arrayBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (ev) => resolve((ev.target?.result as ArrayBuffer) || new ArrayBuffer(0));
            reader.onerror = (ev) => reject(ev);
            reader.readAsArrayBuffer(file);
          });
          
          const bytes = new Uint8Array(arrayBuffer);
          const isP7m = lowerName.endsWith(".p7m");
          const xmlString = isP7m ? extractXmlFromP7m(bytes) : decodeXmlBytes(bytes);

          // Validate against FatturaPA XSD structural rules before parsing
          const validation = validateFatturaXML(xmlString);
          if (!validation.valid) {
            errors.push(`File "${fileName}" non conforme allo schema FatturaPA: ${validation.error}`);
            continue;
          }

          const parsed = parseFatturaXML(xmlString, fileName, isP7m ? bytes : undefined);
          newInvoices.push(isP7m ? { ...parsed, rawP7mBase64: bytesToBase64(bytes) } : parsed);
        } catch (err: any) {
          console.error(err);
          errors.push(`Errore nel file "${fileName}": XML corrotto o non valido.`);
        }
      }
      
      setIsScanning(false);
      
      if (newInvoices.length > 0) {
        setInvoices((prev) => {
          const filteredPrev = prev.filter((p) => !newInvoices.some((n) => n.id === p.id));
          const updated = deduplicateInvoices([...filteredPrev, ...newInvoices]);
          // Persist asynchronously — no UI blocking
          saveInvoicesToDB(updated.map((u) => ({ fileName: u.fileName, rawXml: u.rawXml, rawP7mBase64: u.rawP7mBase64 }))).catch(
            (err) => console.error("[DB] Errore nel salvataggio fatture (cartella):", err)
          );
          return updated;
        });
        
        setSelectedInvoice(newInvoices[0]);
        addToast(`[Cartella] Caricate con successo ${newInvoices.length} fatture dalla cartella!`, "success");
      } else {
        addToast("[Cartella] Nessuna fattura valida (.xml o .p7m) trovata nella cartella.", "info");
      }
      
      if (errors.length > 0) {
        addToast(`${errors.length} file hanno riscontrato errori.`, "error");
      }
    }
  };
  
  // Custom confirmation dialog state
  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    confirmText?: string;
    isDestructive?: boolean;
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
    confirmText: "Conferma",
    isDestructive: false
  });

  const triggerConfirm = (
    title: string,
    message: string,
    onConfirm: () => void,
    confirmText = "Conferma",
    isDestructive = false
  ) => {
    setConfirmConfig({
      isOpen: true,
      title,
      message,
      onConfirm: () => {
        onConfirm();
        setConfirmConfig((prev) => ({ ...prev, isOpen: false }));
      },
      confirmText,
      isDestructive
    });
  };

  // Filters State - Multi-select arrays
  const [selectedYears, setSelectedYears] = useState<string[]>([]);
  const [selectedMonths, setSelectedMonths] = useState<string[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState<string | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null);

  // Drag and drop overlay
  const [isDragging, setIsDragging] = useState(false);
  
  // Custom Toasts/Notifications
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Add toast notification
  const addToast = (message: string, type: "success" | "error" | "info" = "info") => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  // Initialize data (IndexedDB — with one-shot migration from legacy localStorage)
  useEffect(() => {
    const initDB = async () => {
      try {
        // Migrate existing data from localStorage on first run (no-op afterwards)
        await migrateFromLocalStorage();

        const records = await loadInvoicesFromDB();
        if (records.length > 0) {
          const loadedInvoices = records.map((f) => {
            const isP7m = f.fileName.toLowerCase().endsWith(".p7m");
            const p7mBytes = isP7m ? base64ToBytes(f.rawP7mBase64) : undefined;
            const parsed = parseFatturaXML(f.rawXml, f.fileName, p7mBytes);
            return isP7m && f.rawP7mBase64 ? { ...parsed, rawP7mBase64: f.rawP7mBase64 } : parsed;
          });
          const deduplicated = deduplicateInvoices(loadedInvoices);
          setInvoices(deduplicated);

          // Persist cleaned list back if duplicates were removed
          if (deduplicated.length !== loadedInvoices.length) {
            await saveInvoicesToDB(
              deduplicated.map((u) => ({ fileName: u.fileName, rawXml: u.rawXml, rawP7mBase64: u.rawP7mBase64 }))
            );
          }

          setSelectedInvoice(deduplicated[0]);
          addToast(`Caricate ${deduplicated.length} fatture salvate.`, "success");
        } else {
          // Startup with empty data by default (no demo data loaded)
          setInvoices([]);
          setSelectedInvoice(null);
        }
      } catch (err) {
        console.error("Errore nel caricamento delle fatture da IndexedDB:", err);
        setInvoices([]);
        setSelectedInvoice(null);
      }
    };

    initDB();
  }, []);

  // Calculate dynamic years available in loaded invoices
  const yearsList = useMemo(() => {
    const years = invoices.map((inv) => inv.datiGenerali.data.split("-")[0]);
    const uniqueYears = Array.from(new Set(years)).filter(Boolean).sort();
    return ["TUTTI GLI ANNI", ...uniqueYears];
  }, [invoices]);

  // Handle Drag & Drop uploading events
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleUploadInvoices(e.dataTransfer.files);
    }
  };

  // Process files (XML / P7M) and parse them
  const handleUploadInvoices = async (files: FileList) => {
    const newInvoices: FatturaElettronica[] = [];
    const errors: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileName = file.name;
      const lowerName = fileName.toLowerCase();
      
      if (!lowerName.endsWith(".xml") && !lowerName.endsWith(".p7m")) {
        errors.push(`File "${fileName}" ignorato: formato non supportato (carica solo .xml o .p7m).`);
        continue;
      }

      try {
        const arrayBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve((e.target?.result as ArrayBuffer) || new ArrayBuffer(0));
          reader.onerror = (e) => reject(e);
          reader.readAsArrayBuffer(file);
        });

        const bytes = new Uint8Array(arrayBuffer);
        const isP7m = lowerName.endsWith(".p7m");
        const xmlString = isP7m ? extractXmlFromP7m(bytes) : decodeXmlBytes(bytes);

        // Validate against FatturaPA XSD structural rules before parsing
        const validation = validateFatturaXML(xmlString);
        if (!validation.valid) {
          errors.push(`File "${fileName}" non conforme allo schema FatturaPA: ${validation.error}`);
          continue;
        }

        const parsed = parseFatturaXML(xmlString, fileName, isP7m ? bytes : undefined);
        newInvoices.push(isP7m ? { ...parsed, rawP7mBase64: bytesToBase64(bytes) } : parsed);
      } catch (err: any) {
        console.error(err);
        errors.push(`Errore nel file "${fileName}": XML corrotto o schema non valido.`);
      }
    }

    if (newInvoices.length > 0) {
      setInvoices((prev) => {
        // Prevent duplicate IDs (combination of partitaIva, invoice number, date)
        const filteredPrev = prev.filter((p) => !newInvoices.some((n) => n.id === p.id));
        const updated = deduplicateInvoices([...filteredPrev, ...newInvoices]);

        // Save raw XML files in IndexedDB to survive browser reloads
        saveInvoicesToDB(updated.map((u) => ({ fileName: u.fileName, rawXml: u.rawXml, rawP7mBase64: u.rawP7mBase64 }))).catch(
          (err) => console.error("[DB] Errore nel salvataggio fatture (upload):", err)
        );
        return updated;
      });

      setSelectedInvoice(newInvoices[0]);
      addToast(`Caricate con successo ${newInvoices.length} fatture!`, "success");
    }

    if (errors.length > 0) {
      errors.forEach((err) => addToast(err, "error"));
    }
  };

  // Clear all database files
  const handleResetDatabase = () => {
    triggerConfirm(
      "Elimina Tutti i Dati",
      "Sei sicuro di voler eliminare definitivamente tutte le fatture caricate? Questa operazione non può essere annullata.",
      () => {
        setInvoices([]);
        setSelectedInvoice(null);
        clearInvoicesDB().catch(
          (err) => console.error("[DB] Errore nell'eliminazione del database:", err)
        );
        
        // Reset active filters
        setSelectedYears([]);
        setSelectedMonths([]);
        setSelectedSupplier(null);
        setSelectedCustomer(null);

        addToast("Tutti i dati caricati sono stati eliminati con successo.", "info");
      },
      "Elimina Tutto",
      true
    );
  };

  // Download raw XML
  const handleDownloadXml = (invoice: FatturaElettronica) => {
    const blob = new Blob([invoice.rawXml], { type: "text/xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", invoice.fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addToast(`Download avviato per "${invoice.fileName}".`, "success");
  };

  // Delete invoices (single or multiple) from local state and localStorage
  const handleDeleteInvoices = (idsToDelete: string[]) => {
    if (idsToDelete.length === 0) return;
    const isSingle = idsToDelete.length === 1;
    const confirmMessage = isSingle
      ? "Sei sicuro di voler eliminare questa fattura? Questa operazione è irreversibile."
      : `Sei sicuro di voler eliminare le ${idsToDelete.length} fatture selezionate? Questa operazione è irreversibile.`;
      
    triggerConfirm(
      isSingle ? "Elimina Fattura" : "Elimina Fatture Selezionate",
      confirmMessage,
      () => {
        setInvoices((prev) => {
          const updated = prev.filter((inv) => !idsToDelete.includes(inv.id));
          saveInvoicesToDB(updated.map((u) => ({ fileName: u.fileName, rawXml: u.rawXml, rawP7mBase64: u.rawP7mBase64 }))).catch(
            (err) => console.error("[DB] Errore nel salvataggio dopo eliminazione:", err)
          );
          
          // Update selectedInvoice if it is among the deleted ones
          setSelectedInvoice((prevSelected) => {
            if (prevSelected && idsToDelete.includes(prevSelected.id)) {
              return updated.length > 0 ? updated[0] : null;
            }
            return prevSelected;
          });

          return updated;
        });
        addToast(isSingle ? "Fattura eliminata con successo." : `${idsToDelete.length} fatture eliminate con successo.`, "success");
      },
      "Elimina",
      true
    );
  };

  // Core filtering logic for middle list & left sidebar highlights
  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      // 1. Year Filter (multi-select)
      if (selectedYears.length > 0) {
        const invYear = inv.datiGenerali.data.split("-")[0];
        if (!selectedYears.includes(invYear)) return false;
      }

      // 2. Month Filter (multi-select)
      if (selectedMonths.length > 0) {
        const invMonth = inv.datiGenerali.data.split("-")[1];
        if (!selectedMonths.includes(invMonth)) return false;
      }

      // 3. Supplier (Cedente) Filter
      if (selectedSupplier !== null) {
        const invSupplierVat = inv.cedentePrestatore.anagrafica.partitaIva || inv.cedentePrestatore.anagrafica.codiceFiscale;
        if (invSupplierVat !== selectedSupplier) return false;
      }

      // 4. Customer (Cessionario) Filter
      if (selectedCustomer !== null) {
        const invCustomerVat = inv.cessionarioCommittente.anagrafica.partitaIva || inv.cessionarioCommittente.anagrafica.codiceFiscale;
        if (invCustomerVat !== selectedCustomer) return false;
      }

      return true;
    });
  }, [invoices, selectedYears, selectedMonths, selectedSupplier, selectedCustomer]);

  // Handle smart auto-selection when filters change
  useEffect(() => {
    if (filteredInvoices.length > 0) {
      // If currently selected is still in the list, keep it
      const matchesSelected = filteredInvoices.some((inv) => inv.id === selectedInvoice?.id);
      if (!matchesSelected) {
        setSelectedInvoice(filteredInvoices[0]);
      }
    } else {
      setSelectedInvoice(null);
    }
  }, [filteredInvoices, selectedInvoice]);

  return (
    <div 
      className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans text-slate-800"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      id="dontesta-root-container"
    >
      {/* DRAG AND DROP OVERLAY DETECTOR */}
      {isDragging && (
        <div className="fixed inset-0 bg-[#1E293B]/95 backdrop-blur-xs z-50 flex flex-col items-center justify-center p-10 text-white pointer-events-none select-none transition-all duration-200">
          <div className="p-8 border-2 border-dashed border-blue-500 rounded-md flex flex-col items-center gap-4 max-w-lg bg-slate-900/90 shadow-2xl">
            <Upload className="h-16 w-16 text-blue-400 animate-bounce" />
            <h2 className="text-xl font-extrabold tracking-wide text-center uppercase tracking-widest text-blue-400">Rilascia le fatture qui</h2>
            <p className="text-xs text-slate-400 text-center">
              Puoi trascinare file <strong className="text-white">.xml</strong> o <strong className="text-white">.xml.p7m</strong> firmati per caricarli istantaneamente.
            </p>
          </div>
        </div>
      )}

      {/* TOP HEADER MENU BAR */}
      <header className="bg-[#1E293B] text-white py-3 px-5 flex flex-col gap-3 shrink-0 border-b border-slate-800 md:flex-row md:items-center md:justify-between select-none" id="dontesta-header">
        {/* Brand logo & status info */}
        <div className="flex items-center gap-3">
          {/* Settings / Work Directory synchronization popover (from screenshot) */}
          <div className="relative" ref={settingsRef}>
            <button
              type="button"
              onClick={() => setIsSettingsOpen(!isSettingsOpen)}
              className={`p-1.5 rounded-full transition-colors flex items-center justify-center cursor-pointer active:scale-95 ${
                isSettingsOpen ? "bg-slate-700 text-[#00A3E0]" : "text-blue-400 hover:bg-slate-800 hover:text-white"
              }`}
              title="Configura cartella di lavoro"
              id="settings-trigger-btn"
            >
              <MoreVertical className="h-6 w-6 stroke-[2.5]" />
            </button>

            {/* Simulated/real web directory configuration popover */}
            {isSettingsOpen && (
              <div 
                className="absolute left-0 top-full mt-2.5 bg-white border border-slate-200 shadow-2xl rounded-md p-5 py-4 w-[340px] z-[9999] text-slate-800 animate-fade-in"
                id="work-directory-popover"
              >
                {/* Arrow indicator */}
                <div className="absolute top-0 left-3 -mt-1.5 w-3 h-3 bg-white border-t border-l border-slate-200 rotate-45"></div>

                <div className="relative">
                  {/* IMPOSTAZIONI header */}
                  <div className="text-[#00A3E0] font-bold text-xs tracking-wider uppercase mb-1 flex items-center justify-between">
                    <span>IMPOSTAZIONI:</span>
                    {isScanning && (
                      <span className="flex items-center gap-1 text-[10px] text-blue-500 font-semibold lowercase">
                        <RotateCw className="h-2.5 w-2.5 animate-spin" />
                        ricerca in corso...
                      </span>
                    )}
                  </div>

                  {/* Directory label */}
                  <label className="block text-xs font-bold text-slate-700 mb-3">
                    Seleziona la directory di lavoro:
                  </label>

                  {/* Actions / Folder row */}
                  <div className="flex items-center gap-3 bg-slate-50/50 p-2.5 rounded border border-slate-100 mb-3.5">
                    {/* Manual scan / reload button */}
                    <button
                      type="button"
                      onClick={() => triggerFolderScan()}
                      disabled={isScanning}
                      className={`w-9 h-9 rounded-full bg-white border-2 border-slate-800 flex items-center justify-center shrink-0 cursor-pointer hover:bg-slate-50 transition-all active:scale-95 disabled:opacity-50 ${
                        isScanning ? "animate-spin border-blue-500" : ""
                      }`}
                      title="Sincronizza / Cerca nuove fatture"
                    >
                      <RotateCw className={`h-4 w-4 text-slate-900 ${isScanning ? "text-blue-500" : ""}`} />
                    </button>

                    {/* Open folder picker button */}
                    <button
                      type="button"
                      onClick={() => folderInputRef.current?.click()}
                      disabled={isScanning}
                      className="w-9 h-9 rounded-full bg-white border-2 border-slate-800 flex items-center justify-center shrink-0 cursor-pointer hover:bg-slate-50 transition-all active:scale-95"
                      title="Seleziona cartella dal dispositivo"
                    >
                      <FolderOpen className="h-4 w-4 text-slate-900" />
                    </button>

                    {/* Path Text Display / Input */}
                    <div className="flex-1 min-w-0">
                      {isEditingPath ? (
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            value={tempPath}
                            onChange={(e) => setTempPath(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                if (tempPath.trim()) {
                                  setWorkDirectory(tempPath.trim());
                                  localStorage.setItem("dontesta_work_directory", tempPath.trim());
                                }
                                setIsEditingPath(false);
                              } else if (e.key === "Escape") {
                                setTempPath(workDirectory);
                                setIsEditingPath(false);
                              }
                            }}
                            className="w-full text-[11px] font-mono font-bold text-[#00A3E0] bg-white border border-blue-300 rounded px-1.5 py-0.5 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                            autoFocus
                          />
                          <button
                            type="button"
                            onClick={() => {
                              if (tempPath.trim()) {
                                setWorkDirectory(tempPath.trim());
                                localStorage.setItem("dontesta_work_directory", tempPath.trim());
                              }
                              setIsEditingPath(false);
                            }}
                            className="p-0.5 text-emerald-600 hover:bg-emerald-50 rounded"
                          >
                            <Check className="h-3 w-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setTempPath(workDirectory);
                              setIsEditingPath(false);
                            }}
                            className="p-0.5 text-rose-600 hover:bg-rose-50 rounded"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ) : (
                        <div 
                          className="text-[11px] font-extrabold font-mono text-[#00A3E0] hover:underline cursor-pointer select-all truncate break-all"
                          onClick={() => setIsEditingPath(true)}
                          title="Fai clic per modificare il percorso manualmente"
                        >
                          {workDirectory}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Hidden browser folder upload picker */}
                  <input
                    type="file"
                    ref={folderInputRef}
                    onChange={handleFolderSelected}
                    // @ts-ignore
                    webkitdirectory=""
                    directory=""
                    multiple
                    className="hidden"
                    id="folder-input-picker"
                  />

                  {/* Auto-Refresh control block */}
                  <div className="border-t border-slate-100 pt-3 flex flex-col gap-2">
                    <label className="flex items-center gap-2.5 select-none cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isAutoRefresh}
                        onChange={(e) => {
                          const val = e.target.checked;
                          setIsAutoRefresh(val);
                          localStorage.setItem("dontesta_auto_refresh", String(val));
                          if (val) {
                            addToast("Ricerca automatica ogni 15 secondi attivata.", "success");
                          } else {
                            addToast("Ricerca automatica disattivata.", "info");
                          }
                        }}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4 cursor-pointer"
                      />
                      <span className="text-xs font-semibold text-slate-700">
                        Controllo automatico periodico
                      </span>
                    </label>

                    {isAutoRefresh && (
                      <div className="ml-6 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5 text-slate-400 animate-pulse" />
                          Prossimo controllo in: <strong className="text-blue-500 font-bold">{nextScanCountdown}s</strong>
                        </span>
                        {lastScanTime && (
                          <span>Ultimo: {lastScanTime}</span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Informazioni button */}
                  <div className="border-t border-slate-100 mt-3 pt-3">
                    <button
                      type="button"
                      onClick={() => {
                        setIsInfoOpen(true);
                        setIsSettingsOpen(false);
                      }}
                      className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 rounded-md font-bold text-xs tracking-wide transition-all active:scale-95 cursor-pointer"
                      id="info-modal-trigger-btn"
                    >
                      <Info className="h-4 w-4 text-[#00A3E0]" />
                      Informazioni Software
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="w-8 h-8 bg-blue-500 rounded-sm flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <a 
                href="https://www.dontesta.it" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="hover:opacity-90 transition-opacity flex items-center gap-1"
                id="brand-home-link"
              >
                <h1 className="text-base font-bold tracking-tight text-white flex items-center">
                  DonTesta <span className="text-blue-400 font-black ml-1">FatturaPA</span>
                </h1>
              </a>
              <span className="bg-blue-600/20 text-[9px] text-blue-400 px-1.5 py-0.5 rounded-sm border border-blue-500/30 font-bold uppercase tracking-wider">
                v{appMetadata.version}
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-medium truncate">
              Fatturazione Elettronica Open-Source • Supportato dal Blog <a href="https://www.dontesta.it" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">dontesta.it</a>
            </p>
          </div>

          {/* Collapsible Sidebar Toggle Button */}
          <button
            type="button"
            onClick={() => {
              const newVal = !isSidebarExpanded;
              setIsSidebarExpanded(newVal);
              localStorage.setItem("dontesta_sidebar_expanded", String(newVal));
            }}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 text-xs font-bold border cursor-pointer active:scale-95 shrink-0 ${
              isSidebarExpanded 
                ? "bg-slate-800 text-blue-400 border-slate-700 hover:text-white hover:bg-slate-700" 
                : "bg-blue-600 text-white border-blue-500 hover:bg-blue-500 shadow-sm"
            }`}
            title={isSidebarExpanded ? "Nascondi anagrafiche (Cedenti/Cessionari)" : "Mostra anagrafiche (Cedenti/Cessionari)"}
            id="sidebar-toggle-btn"
          >
            <Building className="h-4 w-4" />
            <span className="hidden sm:inline">Anagrafiche</span>
            {isSidebarExpanded ? (
              <ChevronLeft className="h-3 w-3 opacity-75" />
            ) : (
              <ChevronRight className="h-3 w-3 opacity-75" />
            )}
          </button>

          {/* Toggle Invoice List Button */}
          <button
            type="button"
            onClick={() => {
              const newVal = !isInvoiceListExpanded;
              setIsInvoiceListExpanded(newVal);
              localStorage.setItem("dontesta_invoice_list_expanded", String(newVal));
            }}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 text-xs font-bold border cursor-pointer active:scale-95 shrink-0 ${
              isInvoiceListExpanded 
                ? "bg-slate-800 text-blue-400 border-slate-700 hover:text-white hover:bg-slate-700" 
                : "bg-blue-600 text-white border-blue-500 hover:bg-blue-500 shadow-sm"
            }`}
            title={isInvoiceListExpanded ? "Nascondi lista fatture" : "Mostra lista fatture"}
            id="invoice-list-toggle-btn"
          >
            <ListFilter className="h-4 w-4" />
            <span className="hidden sm:inline">Lista Fatture</span>
            {isInvoiceListExpanded ? (
              <ChevronLeft className="h-3 w-3 opacity-75" />
            ) : (
              <ChevronRight className="h-3 w-3 opacity-75" />
            )}
          </button>

          {/* Company Switcher / Anagrafica Button */}
          <button
            type="button"
            onClick={() => {
              setCompanyModalInitialView("selection");
              setIsCompanyModalOpen(true);
            }}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 text-xs font-bold border cursor-pointer active:scale-95 shrink-0 ${
              activeCompany?.isDummy 
                ? "bg-slate-800 text-amber-300 border-slate-700 hover:bg-slate-700 hover:text-amber-200" 
                : "bg-blue-600 text-white border-blue-500 hover:bg-blue-500 shadow-sm"
            }`}
            title="Cambia o gestisci l'azienda di riferimento"
            id="header-company-toggle-btn"
          >
            <Building2 className="h-4 w-4" />
            <span className="hidden sm:inline">
              {activeCompany?.isDummy
                ? "Modalità Guest"
                : activeCompany?.denominazione || "Seleziona Azienda"}
            </span>
          </button>

          {/* Dashboard Toggle Button */}
          <button
            type="button"
            onClick={() => {
              if (activeCompany?.isDummy) return; // Non permettere switch in modalità Guest
              setActiveView(activeView === "list" ? "charts" : "list");
            }}
            disabled={activeCompany?.isDummy}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 text-xs font-bold border shrink-0 ${
              activeCompany?.isDummy
                ? "bg-slate-200 text-slate-400 border-slate-300 cursor-not-allowed opacity-60"
                : activeView === "charts" 
                  ? "bg-blue-600 text-white border-blue-500 hover:bg-blue-500 shadow-sm font-extrabold cursor-pointer active:scale-95" 
                  : "bg-slate-800 text-blue-400 border-slate-700 hover:text-white hover:bg-slate-700 cursor-pointer active:scale-95"
            }`}
            title={
              activeCompany?.isDummy 
                ? "Grafici e statistiche disponibili solo con un'azienda configurata" 
                : activeView === "charts" 
                  ? "Mostra elenco fatture" 
                  : "Mostra statistiche e grafici analitici"
            }
            id="charts-view-toggle-btn"
          >
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Grafici & Statistiche</span>
          </button>
        </div>

        {/* YEAR & MONTH SELECTOR FILTER - ALWAYS VISIBLE */}
        <div className="flex flex-col gap-2.5 md:flex-row md:items-center shrink-0 min-w-0 max-w-full">
          {/* Year Multi-Select */}
          <div className="flex items-center gap-1.5 bg-slate-900/50 p-1 rounded border border-slate-800 shrink-0 select-none">
            <span className="text-[10px] text-slate-400 font-bold uppercase pl-1.5 pr-0.5 hidden sm:inline">Anno:</span>
            <MultiSelect
              options={yearsList.filter(y => y !== "TUTTI GLI ANNI").map(year => ({ value: year, label: year }))}
              selectedValues={selectedYears}
              onChange={setSelectedYears}
              allLabel="TUTTI GLI ANNI"
              id="year-multi-select"
            />
          </div>

          {/* Month Multi-Select */}
          <div className="flex items-center gap-1.5 bg-slate-900/50 p-1 rounded border border-slate-800 shrink-0 select-none">
            <span className="text-[10px] text-slate-400 font-bold uppercase pl-1.5 pr-0.5 hidden sm:inline">Mese:</span>
            <MultiSelect
              options={MONTHS.filter(m => m.value !== null).map(month => ({ 
                value: month.value!, 
                label: month.name 
              }))}
              selectedValues={selectedMonths}
              onChange={setSelectedMonths}
              allLabel="TUTTI I MESI"
              id="month-multi-select"
            />
          </div>
        </div>
      </header>

      {/* QUICK STATUS INFO BAR / METRICS DISPLAY */}
      <div className="bg-white border-b border-slate-200 px-5 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs select-none shadow-2xs" id="metrics-bar">
        <div className="flex items-center gap-4 text-slate-500 font-medium">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 font-bold uppercase tracking-wider">
            <ListFilter className="h-3.5 w-3.5 text-slate-400" />
            Filtri: 
          </div>
          <div className="flex flex-wrap gap-1.5 items-center">
            {activeCompany && (
              <span 
                onClick={() => {
                  setCompanyModalInitialView("selection");
                  setIsCompanyModalOpen(true);
                }}
                className={`px-2 py-0.5 rounded-sm font-bold text-[10px] border flex items-center gap-1 cursor-pointer transition-colors ${
                  activeCompany.isDummy
                    ? "bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100"
                    : "bg-blue-50 text-blue-800 border-blue-200 hover:bg-blue-100"
                }`}
                title="Azienda di riferimento attiva. Fai clic per cambiare."
                id="active-company-pill"
              >
                <Building2 className="h-3 w-3 shrink-0 text-blue-600" />
                <span>Azienda: {activeCompany.denominazione}</span>
              </span>
            )}

            <span className="bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 rounded-sm font-semibold text-[10px]">
              Anno: {selectedYears.length === 0 ? "TUTTI GLI ANNI" : selectedYears.length === 1 ? selectedYears[0] : `${selectedYears.length} anni`}
            </span>
            <span className="bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 rounded-sm font-semibold text-[10px]">
              Mese: {selectedMonths.length === 0 
                ? "TUTTI I MESI" 
                : selectedMonths.length === 1 
                  ? MONTHS.find(m => m.value === selectedMonths[0])?.name 
                  : `${selectedMonths.length} mesi`
              }
            </span>
            {selectedSupplier && <span className="bg-blue-50 text-blue-700 border border-blue-100 px-2 py-0.5 rounded-sm font-semibold text-[10px]">Cedente filtrato</span>}
            {selectedCustomer && <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-0.5 rounded-sm font-semibold text-[10px]">Cessionario filtrato</span>}
            
            {(selectedYears.length > 0 || selectedMonths.length > 0 || selectedSupplier !== null || selectedCustomer !== null) && (
              <button 
                onClick={() => {
                  setSelectedYears([]);
                  setSelectedMonths([]);
                  setSelectedSupplier(null);
                  setSelectedCustomer(null);
                  addToast("Filtri azzerati con successo", "info");
                }}
                className="text-red-600 hover:text-red-700 font-bold hover:underline cursor-pointer text-[10px] uppercase ml-1.5"
              >
                Azzera filtri
              </button>
            )}
          </div>
        </div>

        {/* Quick database totals */}
        <div className="flex items-center gap-3 text-[11px] text-slate-400 font-mono">
          <div>Fatture: <strong className="text-slate-800 font-bold font-sans">{filteredInvoices.length}</strong> su <strong className="text-slate-600 font-semibold font-sans">{invoices.length}</strong></div>
        </div>
      </div>

      {/* 3-COLUMN LAYOUT BODY OR ANALYTICS DASHBOARD */}
      {activeView === "charts" ? (
        <AnalyticsDashboard
          invoices={invoices}
          selectedYears={selectedYears}
          selectedMonths={selectedMonths}
          onClose={() => setActiveView("list")}
          onShowNotification={addToast}
          activeCompany={activeCompany}
        />
      ) : (
        <main className="flex-1 flex overflow-hidden min-h-0 print:overflow-visible print:h-auto" id="asso-workspace">
          {/* Column 1: Sidebar (Left Filter Lists) */}
          {isSidebarExpanded && (
            <div className="print:hidden h-full">
              <Sidebar
                invoices={invoices}
                selectedSupplier={selectedSupplier}
                setSelectedSupplier={setSelectedSupplier}
                selectedCustomer={selectedCustomer}
                setSelectedCustomer={setSelectedCustomer}
                activeCompany={activeCompany}
                onOpenCompanyManager={() => {
                  setCompanyModalInitialView("selection");
                  setIsCompanyModalOpen(true);
                }}
              />
            </div>
          )}

          {/* Column 2: Invoices List (Middle Panel) */}
          {isInvoiceListExpanded && (
            <div className="print:hidden h-full flex flex-col">
              <InvoiceList
                invoices={filteredInvoices}
                selectedInvoice={selectedInvoice}
                onSelectInvoice={setSelectedInvoice}
                onUploadInvoices={handleUploadInvoices}
                onResetDatabase={handleResetDatabase}
                onDeleteInvoices={handleDeleteInvoices}
                onShowNotification={addToast}
                activeCompany={activeCompany}
              />
            </div>
          )}

          {/* Column 3: Invoice Detailed Viewer (Right Panel) */}
          <InvoiceViewer
            invoice={selectedInvoice}
            onDownloadXml={handleDownloadXml}
            onShowNotification={addToast}
          />
        </main>
      )}

      {/* TOASTS NOTIFICATIONS MANAGER CONTAINER */}
      <div className="fixed bottom-16 right-5 z-50 flex flex-col gap-2 max-w-sm pointer-events-none" id="toasts-container">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`p-3.5 rounded-xl border shadow-lg flex items-start gap-2.5 pointer-events-auto animate-fade-in transition-all bg-white text-xs font-semibold ${
              t.type === "success"
                ? "border-emerald-200 text-emerald-800"
                : t.type === "error"
                ? "border-red-200 text-red-800"
                : "border-slate-200 text-slate-700"
            }`}
          >
            {t.type === "success" && <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />}
            {t.type === "error" && <AlertTriangle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />}
            {t.type === "info" && <Info className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />}
            <span>{t.message}</span>
          </div>
        ))}
      </div>

      {/* CUSTOM CONFIRMATION DIALOG MODAL */}
      {confirmConfig.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-fade-in" id="custom-confirm-modal">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs cursor-pointer" 
            onClick={() => setConfirmConfig((prev) => ({ ...prev, isOpen: false }))}
          />
          
          {/* Modal Card */}
          <div className="relative bg-white rounded-lg shadow-xl border border-slate-200 w-full max-w-md overflow-hidden p-6 animate-scale-in">
            <div className="flex items-start gap-4">
              <div className={`p-2.5 rounded-full shrink-0 ${
                confirmConfig.isDestructive 
                  ? "bg-rose-50 text-rose-600" 
                  : "bg-blue-50 text-blue-600"
              }`}>
                {confirmConfig.isDestructive ? (
                  <Trash2 className="h-5 w-5" />
                ) : (
                  <AlertTriangle className="h-5 w-5" />
                )}
              </div>
              
              <div className="flex-1 min-w-0 animate-fade-in">
                <h3 className="text-base font-bold text-slate-900 leading-6">{confirmConfig.title}</h3>
                <p className="mt-2 text-sm text-slate-500 leading-relaxed">{confirmConfig.message}</p>
              </div>
            </div>
            
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmConfig((prev) => ({ ...prev, isOpen: false }))}
                className="px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 cursor-pointer transition-colors"
                id="confirm-cancel-btn"
              >
                Annulla
              </button>
              <button
                type="button"
                onClick={confirmConfig.onConfirm}
                className={`px-4 py-2 rounded-lg text-xs font-semibold text-white cursor-pointer transition-colors ${
                  confirmConfig.isDestructive 
                    ? "bg-rose-600 hover:bg-rose-700 active:bg-rose-800" 
                    : "bg-blue-600 hover:bg-blue-700 active:bg-blue-800"
                }`}
                id="confirm-submit-btn"
              >
                {confirmConfig.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SOFTWARE INFORMATION MODAL */}
      {isInfoOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-fade-in" id="software-info-modal">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs cursor-pointer" 
            onClick={() => setIsInfoOpen(false)}
          />
          
          {/* Modal Card */}
          <div className="relative bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden p-6 animate-scale-in flex flex-col gap-5 text-slate-800">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Info className="h-5 w-5 text-blue-600" />
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">
                  Informazioni Software
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsInfoOpen(false)}
                className="p-1 rounded-full hover:bg-slate-100 text-slate-450 hover:text-slate-650 transition-colors cursor-pointer"
                title="Chiudi"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content body */}
            <div className="flex flex-col gap-4 text-xs text-left">
              {/* Product Badge */}
              <div className="bg-slate-50 border border-slate-150 p-4 rounded-lg flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center shrink-0 shadow-sm">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                </div>
                <div>
                  <h4 className="font-extrabold text-slate-900 text-sm">{appMetadata.name}</h4>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-1.5 py-0.5 rounded border border-blue-200 uppercase tracking-wider">
                      Versione {appMetadata.version}
                    </span>
                  </div>
                </div>
              </div>

              {/* Description */}
              <p className="text-slate-600 leading-relaxed text-xs">
                Visualizzatore open-source e cross-platform per fatture elettroniche XML (FatturaPA), supportato dal Blog di Antonio Musarra (<a href="https://www.dontesta.it" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline font-semibold">dontesta.it</a>).
              </p>

              {/* Links List */}
              <div className="flex flex-col gap-2.5 pt-1">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Collegamenti Utili</div>
                
                {/* Source Repository */}
                <a
                  href="https://github.com/amusarra/dontesta-fatturapa"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-2.5 rounded-lg border border-slate-150 bg-white hover:bg-slate-50 hover:border-slate-200 transition-all text-slate-700 font-medium group"
                >
                  <div className="flex items-center gap-2">
                    <Github className="h-4 w-4 text-slate-900" />
                    <span>Repository GitHub Sorgenti</span>
                  </div>
                  <ExternalLink className="h-3.5 w-3.5 text-slate-400 group-hover:text-slate-700 transition-colors" />
                </a>

                {/* GitHub Page */}
                <a
                  href="https://amusarra.github.io/dontesta-fatturapa/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-2.5 rounded-lg border border-slate-150 bg-white hover:bg-slate-50 hover:border-slate-200 transition-all text-slate-700 font-medium group"
                >
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-blue-600" />
                    <span>Pagina GitHub Pages</span>
                  </div>
                  <ExternalLink className="h-3.5 w-3.5 text-slate-400 group-hover:text-slate-700 transition-colors" />
                </a>
              </div>

              {/* License Info */}
              <div className="border-t border-slate-100 pt-3 flex flex-col gap-1">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Licenza d'uso</div>
                <div className="text-slate-600 font-medium font-mono text-[11px] leading-tight bg-slate-50 border border-slate-150 p-2.5 rounded-lg">
                  MIT License<br />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">Copyright (c) 2026 Antonio Musarra (dontesta.it)</span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-slate-100 pt-3.5 flex justify-end">
              <button
                type="button"
                onClick={() => setIsInfoOpen(false)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold cursor-pointer transition-colors shadow-2xs"
                id="info-close-btn"
              >
                Chiudi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DATABASE STATUS FOOTER */}
      <DatabaseStatus />

      {/* COMPANY ANAGRAFICA & SELECTION MODAL */}
      <CompanyModal
        isOpen={isCompanyModalOpen}
        onClose={() => setIsCompanyModalOpen(false)}
        companies={companies}
        activeCompany={activeCompany}
        onSelectCompany={handleSelectCompany}
        onSaveCompany={handleSaveCompany}
        onDeleteCompany={handleDeleteCompany}
        initialView={companyModalInitialView}
        onShowNotification={addToast}
      />
    </div>
  );
}
