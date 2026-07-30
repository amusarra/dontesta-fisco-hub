/**
 * useTopLineItems.ts
 *
 * Custom React hook for managing Top Beni e Servizi Ricevuti with:
 * - Supplier filtering via dropdown
 * - Substring/fuzzy text search with debouncing
 * - Real-time aggregation and KPI calculation
 */

import { useState, useEffect, useMemo } from "react";
import { loadAllLineItems, loadLineItemsBySupplierId, LineItemRecord } from "../utils/db";
import { isFuzzyMatch } from "../utils/fuzzySearch";

export interface LineItemAggregate {
  descrizione: string;
  quantitaTotale: number;
  importoTotale: number;
  prezzoUnitarioMedio: number;
  numeroFatture: number;
  numeroLinee: number;
}

export interface FilterSummary {
  totaleSpeso: number;
  quantitaTotale: number;
  conteggioVoci: number;
  fornitoriCoinvolti: number;
}

export interface SupplierOption {
  id: string;
  name: string;
  lineCount: number;
}

export interface UseTopLineItemsParams {
  searchQuery: string;
  selectedSupplierId?: string;
  currentCompanyId?: string;
  limit?: number;
}

export function useTopLineItems({
                                  searchQuery,
                                  selectedSupplierId,
                                  currentCompanyId,
                                  limit = 10
                                }: UseTopLineItemsParams) {
  const [rawLineItems, setRawLineItems] = useState<LineItemRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [debouncedQuery, setDebouncedQuery] = useState(searchQuery);

  // Debounce search query (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Load line items from IndexedDB based on supplier filter
  useEffect(() => {
    let isCancelled = false;

    async function loadData() {
      setIsLoading(true);
      try {
        let items: LineItemRecord[];

        if (selectedSupplierId) {
          // Use index for efficient supplier filtering
          items = await loadLineItemsBySupplierId(selectedSupplierId);
        } else {
          // Load all line items
          items = await loadAllLineItems();
        }

        if (!isCancelled) {
          setRawLineItems(items);
        }
      } catch (error) {
        console.error("[useTopLineItems] Error loading line items:", error);
        if (!isCancelled) {
          setRawLineItems([]);
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    loadData();

    return () => {
      isCancelled = true;
    };
  }, [selectedSupplierId]);

  // Extract unique suppliers for dropdown (excluding current company)
  const suppliersList = useMemo((): SupplierOption[] => {
    const suppliersMap = new Map<string, { name: string; count: number }>();

    for (const item of rawLineItems) {
      if (currentCompanyId && item.cedenteId === currentCompanyId) {
        continue;
      }

      if (suppliersMap.has(item.cedenteId)) {
        suppliersMap.get(item.cedenteId)!.count++;
      } else {
        suppliersMap.set(item.cedenteId, {
          name: item.cedenteDenominazione,
          count: 1,
        });
      }
    }

    return Array.from(suppliersMap.entries())
        .map(([id, data]) => ({
          id,
          name: data.name,
          lineCount: data.count,
        }))
        .sort((a, b) => a.name.localeCompare(b.name));
  }, [rawLineItems, currentCompanyId]);

  // Filter by search query (fuzzy match with Levenshtein)
  const filteredLineItems = useMemo((): LineItemRecord[] => {
    let items = rawLineItems;

    if (currentCompanyId) {
      items = items.filter((item) => item.cedenteId !== currentCompanyId);
    }

    if (!debouncedQuery.trim()) {
      return items;
    }

    return items.filter((item) =>
        isFuzzyMatch(debouncedQuery, item.descrizione, 1)
    );
  }, [rawLineItems, debouncedQuery, currentCompanyId]);

  // Aggregate by description (group by)
  const aggregatedItems = useMemo((): LineItemAggregate[] => {
    const groupsMap = new Map<string, {
      quantita: number;
      totale: number;
      fattureSet: Set<string>;
      lineeCount: number;
    }>();

    for (const item of filteredLineItems) {
      const descNormalized = item.descrizione.trim().toUpperCase();

      if (groupsMap.has(descNormalized)) {
        const group = groupsMap.get(descNormalized)!;
        group.quantita += item.quantita;
        group.totale += item.prezzoTotale;
        group.fattureSet.add(item.fatturaId);
        group.lineeCount++;
      } else {
        groupsMap.set(descNormalized, {
          quantita: item.quantita,
          totale: item.prezzoTotale,
          fattureSet: new Set([item.fatturaId]),
          lineeCount: 1,
        });
      }
    }

    const aggregated = Array.from(groupsMap.entries()).map(([desc, data]): LineItemAggregate => ({
      descrizione: desc,
      quantitaTotale: data.quantita,
      importoTotale: data.totale,
      prezzoUnitarioMedio: data.quantita > 0 ? data.totale / data.quantita : 0,
      numeroFatture: data.fattureSet.size,
      numeroLinee: data.lineeCount,
    }));

    aggregated.sort((a, b) => b.importoTotale - a.importoTotale);

    return aggregated;
  }, [filteredLineItems]);

  // Top N items (for display)
  const topItems = useMemo((): LineItemAggregate[] => {
    return aggregatedItems.slice(0, limit);
  }, [aggregatedItems, limit]);

  // Calculate filter summary (KPI banner)
  const summary = useMemo((): FilterSummary => {
    let totaleSpeso = 0;
    let quantitaTotale = 0;
    const fornitoriSet = new Set<string>();

    for (const item of filteredLineItems) {
      totaleSpeso += item.prezzoTotale;
      quantitaTotale += item.quantita;
      fornitoriSet.add(item.cedenteId);
    }

    return {
      totaleSpeso,
      quantitaTotale,
      conteggioVoci: aggregatedItems.length,
      fornitoriCoinvolti: fornitoriSet.size,
    };
  }, [filteredLineItems, aggregatedItems]);

  return {
    items: topItems,
    allItems: aggregatedItems,
    summary,
    suppliersList,
    isLoading,
    hasActiveFilter: !!selectedSupplierId || !!debouncedQuery.trim(),
  };
}