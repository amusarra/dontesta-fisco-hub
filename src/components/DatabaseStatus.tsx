/**
 * DatabaseStatus.tsx — Footer component showing database status with tooltip
 */

import React, { useState, useEffect } from 'react';
import { Database, Info, CheckCircle2, XCircle, AlertTriangle, MapPin, HelpCircle } from 'lucide-react';
import { getDatabaseInfo, getLocationInstructions, type DatabaseInfo } from '../utils/dbInfo';

export default function DatabaseStatus() {
  const [dbInfo, setDbInfo] = useState<DatabaseInfo | null>(null);
  const [showTooltip, setShowTooltip] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);

  useEffect(() => {
    // Load database info on mount
    loadDatabaseInfo();

    // Refresh every 30 seconds
    const interval = setInterval(loadDatabaseInfo, 30000);

    return () => clearInterval(interval);
  }, []);

  async function loadDatabaseInfo() {
    const info = await getDatabaseInfo();
    setDbInfo(info);
  }

  if (!dbInfo) {
    return (
      <footer className="fixed bottom-0 left-0 bg-slate-900/95 backdrop-blur-sm border-t border-slate-700 px-4 py-2 z-40 select-none">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Database className="h-3.5 w-3.5 animate-pulse" />
          <span className="font-medium">Caricamento...</span>
        </div>
      </footer>
    );
  }

  const statusIcon = dbInfo.status === 'online' 
    ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
    : dbInfo.status === 'offline'
    ? <XCircle className="h-3.5 w-3.5 text-slate-400" />
    : <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />;

  const statusText = dbInfo.status === 'online'
    ? 'Database Online'
    : dbInfo.status === 'offline'
    ? 'Database Offline'
    : 'Database Error';

  const statusColor = dbInfo.status === 'online'
    ? 'text-emerald-400'
    : dbInfo.status === 'offline'
    ? 'text-slate-400'
    : 'text-amber-400';

  return (
    <footer className="fixed bottom-0 left-0 bg-slate-900/95 backdrop-blur-sm border-t border-slate-700 px-4 py-2 z-40 select-none shadow-lg">
      <div 
        className="relative flex items-center gap-2 cursor-help"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        {/* Status indicator */}
        <div className="flex items-center gap-2">
          {statusIcon}
          <span className={`text-xs font-bold ${statusColor}`}>
            {statusText}
          </span>
        </div>

        {/* Info icon */}
        <Info className="h-3 w-3 text-slate-500" />

        {/* Tooltip */}
        {showTooltip && (
          <div className="absolute bottom-full left-0 mb-2 bg-white border border-slate-200 rounded-lg shadow-xl p-3 w-[420px] animate-fade-in z-50">
            {/* Arrow */}
            <div className="absolute bottom-0 left-4 -mb-1 w-2 h-2 bg-white border-r border-b border-slate-200 rotate-45" />
            
            {/* Content */}
            <div className="relative space-y-2 text-xs">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-2 mb-2">
                <Database className="h-4 w-4 text-blue-600" />
                <h3 className="font-bold text-slate-900 text-sm">Informazioni Database</h3>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-start">
                  <span className="font-semibold text-slate-600">Stato:</span>
                  <div className="flex items-center gap-1.5">
                    {statusIcon}
                    <span className={`font-bold ${statusColor}`}>{statusText}</span>
                  </div>
                </div>

                <div className="flex justify-between items-start">
                  <span className="font-semibold text-slate-600">Nome:</span>
                  <span className="font-mono text-slate-900 text-[10px]">{dbInfo.name}</span>
                </div>

                <div className="flex justify-between items-start">
                  <span className="font-semibold text-slate-600">Versione:</span>
                  <span className="font-bold text-slate-900">{dbInfo.version}</span>
                </div>

                <div className="flex justify-between items-start">
                  <span className="font-semibold text-slate-600">Fatture:</span>
                  <span className="font-bold text-blue-600">{dbInfo.recordCount}</span>
                </div>

                <div className="flex justify-between items-start">
                  <span className="font-semibold text-slate-600">Dimensione:</span>
                  <span className="font-bold text-slate-900">{dbInfo.estimatedSize}</span>
                </div>

                {dbInfo.error && (
                  <div className="bg-amber-50 border border-amber-200 rounded px-2 py-1.5 mt-2">
                    <div className="flex items-start gap-1.5">
                      <AlertTriangle className="h-3 w-3 text-amber-600 shrink-0 mt-0.5" />
                      <span className="text-amber-900 text-[10px]">{dbInfo.error}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </footer>
  );
}
