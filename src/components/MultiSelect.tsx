import React, { useState, useRef, useEffect } from "react";
import { Check, ChevronDown, X } from "lucide-react";

interface MultiSelectProps {
  options: { value: string; label: string }[];
  selectedValues: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  allLabel?: string;
  className?: string;
  id?: string;
}

export default function MultiSelect({
  options,
  selectedValues,
  onChange,
  placeholder = "Seleziona...",
  allLabel = "TUTTI",
  className = "",
  id,
}: MultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleToggleOption = (value: string) => {
    if (selectedValues.includes(value)) {
      // Remove
      onChange(selectedValues.filter((v) => v !== value));
    } else {
      // Add
      onChange([...selectedValues, value]);
    }
  };

  const handleSelectAll = () => {
    onChange([]);
    setIsOpen(false);
  };

  const handleClearAll = () => {
    onChange([]);
  };

  const displayText = () => {
    if (selectedValues.length === 0) {
      return allLabel;
    }
    if (selectedValues.length === 1) {
      return options.find((opt) => opt.value === selectedValues[0])?.label || "";
    }
    return `${selectedValues.length} selezionati`;
  };

  const isAllSelected = selectedValues.length === 0;

  return (
    <div ref={containerRef} className={`relative ${className}`} id={id}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="bg-slate-800 text-slate-100 text-[11px] font-extrabold rounded px-2.5 py-1.5 border border-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer hover:bg-slate-700 hover:text-white transition-colors flex items-center gap-1.5 w-auto max-w-[180px] justify-between"
      >
        <span className="truncate flex-1 min-w-0">{displayText()}</span>
        <div className="flex items-center gap-0.5 flex-shrink-0">
          {selectedValues.length > 0 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleClearAll();
              }}
              className="hover:bg-slate-600 rounded p-0.5 transition-colors flex-shrink-0"
              title="Cancella selezione"
            >
              <X className="h-3 w-3" />
            </button>
          )}
          <ChevronDown className={`h-3.5 w-3.5 transition-transform flex-shrink-0 ${isOpen ? "rotate-180" : ""}`} />
        </div>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-full right-0 mt-1 bg-slate-900 border border-slate-700 rounded shadow-lg z-50 w-[200px] max-h-[300px] overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-800">
          {/* Select All Option */}
          <div
            onClick={handleSelectAll}
            className={`px-3 py-2 text-[11px] font-bold cursor-pointer transition-colors flex items-center justify-between gap-2 border-b border-slate-700 ${
              isAllSelected 
                ? "bg-blue-600 text-white" 
                : "text-slate-300 hover:bg-slate-800"
            }`}
          >
            <span className="truncate flex-1">{allLabel}</span>
            {isAllSelected && <Check className="h-3.5 w-3.5 flex-shrink-0" />}
          </div>

          {/* Options */}
          {options.map((option) => {
            const isSelected = selectedValues.includes(option.value);
            return (
              <div
                key={option.value}
                onClick={() => handleToggleOption(option.value)}
                className={`px-3 py-2 text-[11px] font-semibold cursor-pointer transition-colors flex items-center justify-between gap-2 whitespace-nowrap ${
                  isSelected 
                    ? "bg-blue-600/20 text-blue-200 border-l-2 border-blue-500" 
                    : "text-slate-300 hover:bg-slate-800"
                }`}
              >
                <span className="truncate flex-1">{option.label}</span>
                {isSelected && <Check className="h-3.5 w-3.5 flex-shrink-0 text-blue-400" />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
