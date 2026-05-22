import React, { useState, useRef, useEffect } from "react";
import { Calendar, ChevronLeft, ChevronRight, X } from "lucide-react";
import { cn } from "../lib/utils";

interface MonthPickerProps {
  value: string | null; // Expected format: MMM-yyyy
  onChange: (value: string | null) => void;
  dark?: boolean;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function MonthPicker({ value, onChange, dark = true }: MonthPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [viewYear, setViewYear] = useState(new Date().getFullYear());
  const containerRef = useRef<HTMLDivElement>(null);

  // Initialize viewYear from value if present
  useEffect(() => {
    if (value && value.includes("-")) {
      const year = parseInt(value.split("-")[1]);
      if (!isNaN(year)) setViewYear(year);
    }
  }, [value]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleMonthSelect = (month: string) => {
    const newValue = `${month.toUpperCase()}-${viewYear}`;
    onChange(newValue);
    setIsOpen(false);
  };

  const clearSelection = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
  };

  return (
    <div className="relative" ref={containerRef}>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "h-10 px-4 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-between cursor-pointer group transition-all hover:border-blue-500/50 min-w-[180px]",
          !dark && "bg-white border-slate-200 hover:border-blue-500/30"
        )}
      >
        <div className="flex items-center gap-2">
          <Calendar className={cn("w-4 h-4", dark ? "text-slate-500" : "text-slate-400")} />
          <span className={cn("text-xs font-bold", !value && (dark ? "text-slate-500" : "text-slate-400"), value && (dark ? "text-white" : "text-slate-900"))}>
            {value || "Select Month"}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {value && (
            <button 
              onClick={clearSelection}
              className="p-1 hover:bg-slate-800 rounded-md transition-colors"
            >
              <X className="w-3 h-3 text-slate-500" />
            </button>
          )}
          <ChevronRight className={cn("w-4 h-4 text-slate-600 transition-transform", isOpen && "rotate-90")} />
        </div>
      </div>

      {isOpen && (
        <div className={cn(
          "absolute top-full mt-2 left-0 z-[100] w-[280px] bg-[#0f172a] border border-slate-800 rounded-2xl shadow-2xl p-4 animate-in fade-in zoom-in duration-200",
          !dark && "bg-white border-slate-200"
        )}>
          {/* Year Navigator */}
          <div className="flex items-center justify-between mb-4 px-2">
            <button 
              onClick={() => setViewYear(prev => prev - 1)}
              className="p-2 hover:bg-slate-800 rounded-lg transition-colors border border-slate-800"
            >
              <ChevronLeft className="w-4 h-4 text-slate-400" />
            </button>
            <span className={cn("text-sm font-black tracking-widest", dark ? "text-white" : "text-slate-900")}>
              {viewYear}
            </span>
            <button 
              onClick={() => setViewYear(prev => prev + 1)}
              className="p-2 hover:bg-slate-800 rounded-lg transition-colors border border-slate-800"
            >
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </button>
          </div>

          {/* Month Grid */}
          <div className="grid grid-cols-3 gap-2">
            {MONTHS.map((month) => {
              const itemValue = `${month.toUpperCase()}-${viewYear}`;
              const isSelected = value === itemValue;
              
              return (
                <button
                  key={month}
                  onClick={() => handleMonthSelect(month)}
                  className={cn(
                    "py-2.5 px-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                    isSelected 
                      ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20" 
                      : dark 
                        ? "hover:bg-slate-800 text-slate-400 hover:text-slate-100 border border-transparent" 
                        : "hover:bg-slate-50 text-slate-500 hover:text-slate-900 border border-transparent"
                  )}
                >
                  {month}
                </button>
              );
            })}
          </div>
          
          <div className="mt-4 pt-4 border-t border-slate-800 flex justify-center">
             <button 
               onClick={() => {
                 setViewYear(new Date().getFullYear());
                 handleMonthSelect(MONTHS[new Date().getMonth()]);
               }}
               className="text-[9px] font-black uppercase tracking-[0.2em] text-blue-500 hover:text-blue-400 cursor-pointer"
             >
               Go to Current Month
             </button>
          </div>
        </div>
      )}
    </div>
  );
}
