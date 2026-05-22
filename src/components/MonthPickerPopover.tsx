import React, { useState, useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { cn } from "../lib/utils";

interface MonthPickerPopoverProps {
  label: string;
  value: string | null;
  onChange: (value: string) => void;
}

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

export function MonthPickerPopover({ label, value, onChange }: MonthPickerPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [displayYear, setDisplayYear] = useState(new Date().getFullYear());
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value) {
      const parts = value.split("-");
      if (parts.length === 2) {
        const year = parseInt(parts[1]);
        if (!isNaN(year)) setDisplayYear(year);
      }
    }
  }, [value, isOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
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

  const handleMonthClick = (month: string) => {
    onChange(`${month}-${displayYear}`);
    setIsOpen(false);
  };

  const handleGoToCurrentMonth = () => {
    const now = new Date();
    const month = MONTHS[now.getMonth()];
    const year = now.getFullYear();
    onChange(`${month}-${year}`);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={popoverRef}>
      <div className="flex flex-col gap-1.5">
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</span>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="bg-slate-900 border border-slate-800 rounded-lg px-4 py-2 flex items-center gap-3 text-white text-xs font-bold hover:bg-slate-800 transition-all min-w-[140px] justify-between shadow-lg"
        >
          <div className="flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5 text-indigo-400" />
            <span className="tracking-tight">{value || "Select Month"}</span>
          </div>
        </button>
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 mt-3 bg-[#0B1120] border border-slate-800 rounded-2xl shadow-2xl z-[50] w-64 p-5 animate-in fade-in zoom-in duration-200">
          {/* Year Navigator */}
          <div className="flex items-center justify-between mb-6">
            <button 
              type="button"
              onClick={() => setDisplayYear(displayYear - 1)}
              className="p-1.5 hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-white"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-black text-white tracking-[0.2em]">{displayYear}</span>
            <button 
              type="button"
              onClick={() => setDisplayYear(displayYear + 1)}
              className="p-1.5 hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-white"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Month Grid */}
          <div className="grid grid-cols-3 gap-y-4 gap-x-2 text-center">
            {MONTHS.map((month) => {
              const isSelected = value === `${month}-${displayYear}`;
              return (
                <button
                  key={month}
                  type="button"
                  onClick={() => handleMonthClick(month)}
                  className={cn(
                    "py-2.5 text-[11px] font-black uppercase tracking-widest rounded-xl transition-all",
                    isSelected 
                      ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20" 
                      : "text-slate-400 hover:bg-slate-800 hover:text-white"
                  )}
                >
                  {month}
                </button>
              );
            })}
          </div>

          {/* Footer */}
          <div className="border-t border-slate-800 mt-6 pt-5 flex justify-center">
            <button
              type="button"
              onClick={handleGoToCurrentMonth}
              className="text-blue-500 font-black text-[9px] uppercase tracking-[0.2em] hover:text-blue-400 transition-colors"
            >
              Go to Current Month
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
