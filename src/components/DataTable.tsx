/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from "react";
import { Search, Filter, ArrowUpDown, ChevronLeft, ChevronRight, CheckCircle2, Clock, MoreHorizontal, AlertCircle, Eye, X, Bug, Info, User, Layers, Calendar as CalendarIcon, ShieldAlert, History, Edit3, Save, Trash2, ArrowDownWideNarrow, Undo2 } from "lucide-react";
import { BugRecord, AppUser } from "../types";
import { cn } from "../lib/utils";
import { normalizeStatus } from "../lib/normalization";
import { motion, AnimatePresence } from "motion/react";
import { format } from "date-fns";

interface DataTableProps {
  bugs: BugRecord[];
  dark?: boolean;
  hideFilters?: boolean;
  currentUser?: AppUser | null;
  matrixViewType?: 'BUG' | 'CR';
  onUpdateBug?: (id: string, updates: Partial<BugRecord>) => Promise<void>;
  onDeleteBug?: (id: string) => void;
  onRestoreBug?: (id: string) => void;
  isTrashView?: boolean;
  onExportExcel?: (data: BugRecord[], filename: string) => void;
  onExportPDF?: (id: string, filename: string) => void;
  onViewDetail?: (bug: BugRecord) => void;
  isExporting?: boolean;
}

export function DataTable({ bugs, dark, className, hideFilters, currentUser, matrixViewType, onUpdateBug, onDeleteBug, onRestoreBug, isTrashView, onExportExcel, onExportPDF, onViewDetail, isExporting }: DataTableProps & { className?: string }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [projectFilter, setProjectFilter] = useState("All");
  const [devFilter, setDevFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Date Range States
  const [dateFieldFilter, setDateFieldFilter] = useState<"All" | "discoveryDate" | "startDate">("All");
  const [startDateFilter, setStartDateFilter] = useState<string>("");
  const [endDateFilter, setEndDateFilter] = useState<string>("");

  const isSuperAdmin = currentUser?.role === "super_admin";

  const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
  const YEARS = ["2024", "2025", "2026"];
  const PERIODS = useMemo(() => {
    const list: string[] = [];
    YEARS.forEach(y => MONTHS.forEach(m => list.push(`${m}-${y}`)));
    return list;
  }, []);

  const projects = Array.from(new Set(bugs.map((b) => b.projectName))).filter(Boolean);
  const developers = Array.from(new Set(bugs.map((b) => b.devName))).filter(Boolean);
  
  const formatDateSafe = (dateStr: string | null | undefined) => {
    if (!dateStr || dateStr === "-" || dateStr === "N/A" || dateStr === "") return "—";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return format(d, "dd-MMM-yyyy").toUpperCase();
    } catch (e) {
      return dateStr;
    }
  };
  
  // Standardize Statuses for filtering
  const statuses = ["All", "DONE", "ON PROGRESS", "ON QUEUE", "PENDING", "UNMAPPED"];

  const getPeriodeValue = (s: string | undefined | null) => {
    if (!s || s === "-" || s === "UNASSIGNED") return 0;
    // Handle MMM-yyyy or MMM yyyy or MMM-yy or MMM/yyyy
    const parts = s.split(/[- /]/);
    if (parts.length === 2) {
      const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
      const monthStr = parts[0].substring(0, 3).toUpperCase();
      const mIdx = months.indexOf(monthStr);
      let year = parseInt(parts[1]);
      if (parts[1].length === 2) year += 2000; // Handle yy format
      if (!isNaN(year) && mIdx !== -1) {
        return (year * 12) + mIdx;
      }
    }
    const num = parseInt(s);
    return isNaN(num) ? 0 : num;
  };

  const filteredBugs = useMemo(() => {
    const list = bugs.filter((bug) => {
      const consolidatedStatus = normalizeStatus(bug.statusDev);
      
      const matchesSearch =
        (bug.remarks || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (bug.projectName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (bug.devName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (bug.sectionName || "").toLowerCase().includes(searchTerm.toLowerCase());
      const matchesProject = !projectFilter || projectFilter === "All" || bug.projectName?.toLowerCase().includes(projectFilter.toLowerCase());
      const matchesDev = !devFilter || devFilter === "All" || bug.devName?.toLowerCase().includes(devFilter.toLowerCase());
      const matchesStatus = statusFilter === "All" || consolidatedStatus === statusFilter;
      
      // JavaScript Date object parsing and precise range comparison
      let matchesDateRange = true;
      if (dateFieldFilter !== "All" && startDateFilter && endDateFilter) {
        const itemDateVal = dateFieldFilter === "discoveryDate" ? bug.discoveryDate : bug.startDate;
        if (itemDateVal && itemDateVal !== "-" && itemDateVal !== "N/A" && itemDateVal !== "") {
          const itemDate = new Date(itemDateVal);
          const filterStartDate = new Date(startDateFilter);
          const filterEndDate = new Date(endDateFilter);
          
          // Clear hours to ensure date-only comparison is fully inclusive of the target day boundaries
          filterStartDate.setHours(0, 0, 0, 0);
          filterEndDate.setHours(23, 59, 59, 999);
          
          if (!isNaN(itemDate.getTime()) && !isNaN(filterStartDate.getTime()) && !isNaN(filterEndDate.getTime())) {
            matchesDateRange = itemDate >= filterStartDate && itemDate <= filterEndDate;
          } else {
            matchesDateRange = false;
          }
        } else {
          matchesDateRange = false;
        }
      }

      return matchesSearch && matchesProject && matchesDev && matchesStatus && matchesDateRange;
    });

    // Explicit Default Sorting: Periode DESC, then created_at DESC, then No DESC
    return list.sort((a, b) => {
      const pA = getPeriodeValue(a.periode);
      const pB = getPeriodeValue(b.periode);
      
      if (pB !== pA) return pB - pA;
      
      const tA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const tB = b.created_at ? new Date(b.created_at).getTime() : 0;
      if (tB !== tA) return tB - tA;

      const noA = Number(a.no) || 0;
      const noB = Number(b.no) || 0;
      return noB - noA;
    });
  }, [bugs, searchTerm, projectFilter, devFilter, statusFilter, dateFieldFilter, startDateFilter, endDateFilter]);

  // Reset to page 1 when filters or data change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, projectFilter, devFilter, statusFilter, itemsPerPage, bugs, dateFieldFilter, startDateFilter, endDateFilter]);

  const totalPages = Math.ceil(filteredBugs.length / itemsPerPage);
  const currentBugs = filteredBugs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const getScoreColor = (score: number) => {
    if (score < 10) return dark ? "text-green-400 bg-green-500/10" : "text-green-600 bg-green-50";
    if (score <= 20) return dark ? "text-yellow-400 bg-yellow-500/10" : "text-yellow-600 bg-yellow-50";
    return dark ? "text-red-400 bg-red-500/10" : "text-red-600 bg-red-50";
  };

  const getStatusBadge = (status: string) => {
    const normalized = normalizeStatus(status);
    
    if (normalized === "DONE") {
      return (
        <span className={cn(
          "px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-widest inline-flex items-center gap-1",
          dark ? "bg-green-500/10 text-green-400 border border-green-500/20" : "bg-green-100 text-green-700 border border-green-200"
        )}>
          <CheckCircle2 className="w-3 h-3" />
          DONE
        </span>
      );
    }

    if (normalized === "ON PROGRESS") {
      return (
        <span className={cn(
          "px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-widest inline-flex items-center gap-1",
          dark ? "bg-blue-500/10 text-blue-400 border border-blue-500/20" : "bg-blue-100 text-blue-700 border border-blue-200"
        )}>
          <Clock className="w-3 h-3" />
          ON PROGRESS
        </span>
      );
    }

    if (normalized === "ON QUEUE") {
      return (
        <span className={cn(
          "px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-widest inline-flex items-center gap-1",
          dark ? "bg-purple-500/10 text-purple-400 border border-purple-500/20" : "bg-purple-100 text-purple-700 border border-purple-200"
        )}>
          <Clock className="w-3 h-3" />
          ON QUEUE
        </span>
      );
    }

    if (normalized === "UNMAPPED") {
      return (
        <span className={cn(
          "px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-widest inline-flex items-center gap-1",
          dark ? "bg-red-500/10 text-red-500 border border-red-500/20" : "bg-red-100 text-red-700 border border-red-200"
        )}>
          <AlertCircle className="w-3 h-3" />
          UNMAPPED
        </span>
      );
    }

    return (
      <span className={cn(
        "px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-widest inline-flex items-center gap-1",
        dark ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" : "bg-amber-100 text-amber-700 border border-amber-200"
      )}>
        <Clock className="w-3 h-3" />
        PENDING
      </span>
    );
  };  return (
    <div className={cn(
      "bg-white border border-gray-150 rounded-3xl flex flex-col shadow-xs overflow-hidden w-full",
      className
    )}>
      {/* Tier 1: Internal Search/Filters (Fixed) */}
      {!hideFilters && (
        <div id="data-explorer-header" className="p-4 sm:p-6 border-b border-gray-150 flex flex-col lg:flex-row gap-4 items-center justify-between shrink-0 z-30 bg-white">
          <div className="relative flex-1 w-full max-w-sm">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Internal search in this view..."
              className="w-full h-10 pl-11 pr-4 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all font-medium text-sm text-gray-800 placeholder:text-gray-400"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto no-export">
            {/* Real Date Filter */}
            <div className="flex items-center gap-2">
              <select
                className="h-10 px-3 bg-white border border-gray-200 rounded-xl text-[10px] font-bold uppercase tracking-widest text-gray-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                value={dateFieldFilter}
                onChange={(e) => setDateFieldFilter(e.target.value as any)}
              >
                <option value="All">All Dates</option>
                <option value="discoveryDate">Discovery Date</option>
                <option value="startDate">Start Date</option>
              </select>

              {dateFieldFilter !== "All" && (
                <div id="date-range-filter-inputs" className="flex items-center gap-1.5 transition-all">
                  <input
                    type="date"
                    className="h-10 px-2.5 bg-white border border-gray-200 rounded-xl text-xs text-gray-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    value={startDateFilter}
                    onChange={(e) => setStartDateFilter(e.target.value)}
                    placeholder="From"
                  />
                  <span className="text-gray-400 text-xs font-semibold uppercase tracking-wider">to</span>
                  <input
                    type="date"
                    className="h-10 px-2.5 bg-white border border-gray-200 rounded-xl text-xs text-gray-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    value={endDateFilter}
                    onChange={(e) => setEndDateFilter(e.target.value)}
                    placeholder="To"
                  />
                </div>
              )}
            </div>

            <div className="flex items-center bg-white border border-gray-200 rounded-xl overflow-hidden shadow-2xs">
              <button 
                onClick={() => onExportExcel?.(filteredBugs, "Live-Governance-Ledger")}
                className="flex items-center gap-2 px-4 h-10 text-[10px] font-bold uppercase tracking-widest text-gray-650 hover:text-gray-900 transition-all hover:bg-gray-50 border-r border-gray-200"
              >
                <Bug className="w-3.5 h-3.5" />
                Excel
              </button>
            </div>

            <select
              className="h-10 px-4 bg-white border border-gray-200 rounded-xl text-[10px] font-bold uppercase tracking-widest text-gray-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              {statuses.map(s => <option key={s} value={s} className="bg-white text-gray-800">{s} Status</option>)}
            </select>

            <div className="flex items-center gap-2 px-4 h-10 bg-indigo-50 border border-indigo-100 rounded-xl">
               <span className="text-[10px] font-bold uppercase tracking-widest text-[#2B3674] shrink-0">{filteredBugs.length} Items</span>
            </div>
          </div>
        </div>
      )}

      {/* Table Body - Scrollable */}
      <div id="live-governance-ledger-container" className="flex-1 overflow-x-auto overflow-y-auto scrollbar-hide relative min-h-0 bg-white">
        <table className="w-full text-left border-collapse table-auto min-w-[1500px]">
          <thead className="sticky top-0 z-20">
            <tr className="border-b bg-gray-50 border-gray-150 text-gray-500">
              <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest w-[80px] min-w-[80px] whitespace-nowrap">No</th>
              <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest w-[180px] min-w-[150px] whitespace-nowrap">PIC Name</th>
              <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest w-[250px] min-w-[200px] whitespace-nowrap">Project Mapping</th>
              <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest w-[220px] min-w-[180px] whitespace-nowrap">Developer Identity</th>
              <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-center w-[100px] min-w-[80px] whitespace-nowrap">Type</th>
              <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-center w-[120px] min-w-[100px] whitespace-nowrap">Severity</th>
              <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-center w-[80px] min-w-[60px] whitespace-nowrap">Impact</th>
              <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest w-[140px] min-w-[120px] whitespace-nowrap">Discovery</th>
              <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest w-[140px] min-w-[120px] whitespace-nowrap">Start Date</th>
              <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest w-[140px] min-w-[120px] whitespace-nowrap">Finish Date</th>
              <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest w-[180px] min-w-[150px] whitespace-nowrap">SIT Realization</th>
              <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest w-[400px] min-w-[320px] whitespace-nowrap">Dev Status / Remarks</th>
              <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest w-[180px] min-w-[140px] whitespace-nowrap">Last Updated</th>
              <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest w-[180px] min-w-[160px] whitespace-nowrap">Updated By</th>
              <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest w-[120px] min-w-[120px] whitespace-nowrap text-right">Periode</th>
              <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest w-[100px] min-w-[100px] whitespace-nowrap text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {currentBugs.map((bug, idx) => {
              return (
                  <motion.tr 
                    key={bug.id || `${bug.no}-${idx}`} 
                    onClick={() => onViewDetail?.(bug)}
                    initial={false}
                    animate={isExporting ? { opacity: 1, x: 0, scale: 1 } : {}}
                    className="transition-colors group align-middle cursor-pointer h-20 hover:bg-gray-50 text-gray-700 bg-white"
                  >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-xs font-bold text-gray-400">
                      {bug.no}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-col">
                      <div className="font-bold text-xs truncate max-w-[150px] text-gray-900" title={bug.picName || "Unassigned"}>{bug.picName || "—"}</div>
                      <div className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">PIC NAME</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-col">
                      <div className="font-bold text-xs truncate max-w-[200px] text-gray-900" title={bug.projectName}>{bug.projectName}</div>
                      <div className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">PIC PROJECT</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <div className="font-bold text-xs truncate max-w-[130px] text-gray-900">{bug.devName}</div>
                      <span className="text-[8px] text-gray-500 font-bold uppercase tracking-widest px-1.5 py-0.5 bg-gray-50 border border-gray-200 rounded">
                        {bug.statusPic}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center whitespace-nowrap">
                    <span className={cn(
                      "px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-[0.15em] border inline-block min-w-[45px]",
                      (bug.type || "").toUpperCase().includes('BUG') 
                        ? "text-orange-700 bg-orange-50 border-orange-200"
                        : "text-emerald-700 bg-emerald-50 border-emerald-200"
                    )}>
                      {(bug.type || "").toUpperCase().includes('BUG') ? "BUG" : "CR"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center whitespace-nowrap">
                    <span className={cn(
                      "px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-[0.15em] border inline-block min-w-[70px]",
                      bug.severity === "Critical" ? "bg-red-50 text-red-700 border-red-200" :
                      bug.severity === "Major" ? "bg-orange-50 text-orange-700 border-orange-200" :
                      bug.severity === "Minor" ? "bg-blue-50 text-blue-700 border-blue-200" :
                      bug.severity === "Recurring" ? "bg-purple-50 text-purple-700 border-purple-200" :
                      "bg-gray-50 text-gray-500 border-gray-200"
                    )}>
                      {bug.severity?.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center whitespace-nowrap">
                     <div className={cn(
                       "font-bold text-xs",
                       bug.bugScore >= 5 ? "text-red-600" : bug.bugScore >= 3 ? "text-orange-600" : "text-emerald-600"
                     )}>
                       {bug.bugScore}
                     </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-col">
                      <div className="font-bold text-xs text-gray-900">
                        {formatDateSafe(bug.discoveryDate)}
                      </div>
                      <div className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">DISCOVERY</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-col">
                      <div className="font-bold text-xs text-gray-900">
                        {formatDateSafe(bug.startDate)}
                      </div>
                      <div className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">START DATE</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-col">
                      <div className="font-bold text-xs text-gray-900">
                        {formatDateSafe(bug.finishAt)}
                      </div>
                      <div className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">FINISH DATE</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-col gap-1">
                      <span className="text-[9px] text-gray-505 font-bold uppercase tracking-tight">
                        REALIZED: {bug.sitRealizedDate && bug.sitRealizedDate !== "-" ? (
                          /^\d{4}-\d{2}-\d{2}/.test(bug.sitRealizedDate) 
                             ? format(new Date(bug.sitRealizedDate), "dd-MMM-yyyy").toUpperCase()
                             : bug.sitRealizedDate
                        ) : "-"}
                      </span>
                      <span className={cn(
                        "text-[8px] font-bold uppercase tracking-widest px-2 py-0.5 rounded inline-block w-fit",
                        bug.includedInFsd === "Ya" 
                          ? "bg-indigo-600 text-white shadow-xs" 
                          : "border border-gray-200 text-gray-400"
                      )}>
                        {bug.includedInFsd === "Ya" ? "FSD INCLUDED" : "NO FSD"}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-start gap-2.5 w-full">
                      {normalizeStatus(bug.statusDev) === "DONE" && (
                        <div className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-md inline-flex items-center gap-1 text-[9px] font-bold tracking-widest shrink-0 mt-0.5">
                          <CheckCircle2 className="w-3 h-3" />
                          DONE
                        </div>
                      )}
                      <div className="text-xs text-gray-600 font-medium whitespace-normal break-words leading-relaxed pr-2">
                        {bug.remarks || "—"}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                        <Clock className="w-3 h-3 text-gray-400" />
                        {bug.last_updated || bug.last_edited_at ? format(new Date(bug.last_updated || bug.last_edited_at!), "dd-MMM-yyyy").toUpperCase() : "-"}
                      </div>
                      <div className="text-[9px] font-bold text-gray-400 pl-4.5">
                        {bug.last_updated || bug.last_edited_at ? format(new Date(bug.last_updated || bug.last_edited_at!), "HH:mm") : "-"}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2 max-w-[140px]">
                       <User className="w-3 h-3 text-gray-450 shrink-0" />
                       <span className="text-[10px] font-semibold text-gray-505 uppercase tracking-tight truncate">
                         {bug.last_edited_by || "System Bulk Import"}
                       </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                      {bug.periode}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="flex items-center justify-end gap-2">
                      <motion.button 
                        whileHover={{ scale: 1.05 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          onViewDetail?.(bug);
                        }}
                        className="p-1.5 bg-white hover:bg-gray-100 rounded-md transition-all border border-gray-200 shrink-0"
                      >
                        <Eye className="w-3.5 h-3.5 text-blue-600" />
                      </motion.button>
                      {isSuperAdmin && (
                        isTrashView ? (
                          <motion.button 
                            whileHover={{ scale: 1.05 }}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (bug.id && onRestoreBug) onRestoreBug(bug.id);
                            }}
                            className="p-1.5 bg-white hover:bg-emerald-50 rounded-md transition-all border border-emerald-250 shrink-0"
                          >
                            <Undo2 className="w-3.5 h-3.5 text-emerald-600" />
                          </motion.button>
                        ) : (
                          <motion.button 
                            whileHover={{ scale: 1.05 }}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (bug.id && onDeleteBug) onDeleteBug(bug.id);
                            }}
                            className="p-1.5 bg-white hover:bg-red-50 rounded-md transition-all border border-red-200 shrink-0 group/trash"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-red-600 group-hover:text-red-500 transition-colors" />
                          </motion.button>
                        )
                      )}
                    </div>
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Tier 3: Pagination Footer (Fixed - Minimalist Style) */}
      <div className="p-4 sm:p-5 border-t border-gray-150 flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0 px-8 bg-white text-gray-700 z-40 sticky bottom-0 no-export rounded-b-3xl">
        <div className="flex items-center gap-6">
          <div className="text-[10px] text-gray-500 font-bold uppercase tracking-[0.15em] flex items-center gap-2">
            VOLUME: <span className="text-[#2B3674] font-bold text-xs">{filteredBugs.length}</span> ISSUES
          </div>
          <div className="h-4 w-px bg-gray-200" />
          <div className="flex items-center gap-2.5">
            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">ROWS:</span>
            <select 
              value={itemsPerPage}
              onChange={(e) => setItemsPerPage(Number(e.target.value))}
              className="bg-white border border-gray-200 rounded-lg text-[10px] font-bold px-2 py-1 text-gray-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
            >
              {[10, 25, 50].map(v => <option key={v} value={v} className="bg-white text-gray-855">{v}</option>)}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2">
           <button
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(p => p - 1)}
            className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition-all disabled:opacity-40 active:scale-95"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          
          <div className="flex items-center gap-1">
            {(() => {
              const maxVisiblePages = 5;
              let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
              let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
              
              if (endPage - startPage + 1 < maxVisiblePages) {
                startPage = Math.max(1, endPage - maxVisiblePages + 1);
              }
              
              const pages = [];
              for (let i = startPage; i <= endPage; i++) {
                pages.push(i);
              }
              
              return pages.map(pageNum => (
                 <button
                  key={`page-${pageNum}`}
                  onClick={() => setCurrentPage(pageNum)}
                  className={cn(
                    "w-7.5 h-7.5 rounded-lg text-[10px] font-bold transition-all border",
                    currentPage === pageNum 
                      ? "bg-gray-50 border-gray-300 text-gray-950 font-extrabold shadow-3xs" 
                      : "border-transparent text-gray-500 hover:bg-gray-50"
                  )}
                 >
                   {pageNum}
                 </button>
              ));
            })()}
            {totalPages > 5 && currentPage < totalPages - 2 && (
              <>
                <span className="text-gray-400 px-1"><MoreHorizontal className="w-3 h-3" /></span>
                <button
                  onClick={() => setCurrentPage(totalPages)}
                  className="w-7.5 h-7.5 rounded-lg text-[10px] font-bold border border-transparent text-gray-500 hover:bg-gray-50"
                >
                  {totalPages}
                </button>
              </>
            )}
          </div>

          <button
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage(p => p + 1)}
            className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition-all disabled:opacity-40 active:scale-95"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Detail Modal moved to App.tsx */}
    </div>
  );
}

export function SummaryCard({ label, value, icon, theme }: { label: string, value: string, icon: React.ReactNode, theme: string }) {
  const themes: Record<string, string> = {
    blue: "text-blue-400",
    amber: "text-amber-400",
    cyan: "text-cyan-400",
    red: "text-red-400",
    green: "text-green-400",
  };

  const iconColors: Record<string, string> = {
    blue: "bg-blue-500/20 text-blue-500",
    amber: "bg-amber-500/20 text-amber-500",
    cyan: "bg-cyan-500/20 text-cyan-500",
    red: "bg-red-500/20 text-red-500",
    green: "bg-green-500/20 text-green-500",
  };

  return (
    <div className={cn("p-5 rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md flex flex-col gap-3 transition-all hover:bg-white/10 shadow-xl relative overflow-hidden group")}>
      <div className="absolute top-0 right-0 w-20 h-20 bg-white/5 blur-3xl rounded-full -mr-10 -mt-10 group-hover:bg-white/10 transition-all"></div>
      <div className="flex items-center justify-between relative z-10">
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">{label}</span>
        <div className={cn("p-2 rounded-xl shrink-0 shadow-lg", iconColors[theme])}>
          {icon}
        </div>
      </div>
      <div className={cn("text-base font-bold truncate tracking-tight uppercase relative z-10", themes[theme])}>{value}</div>
    </div>
  );
}

export function MetaRow({ 
  label, 
  value, 
  isEditing, 
  type = "text", 
  options = [], 
  editValue, 
  onEdit,
  highlight
}: { 
  label: string;
  value: string;
  isEditing?: boolean;
  type?: "text" | "date" | "select";
  options?: string[];
  editValue?: string;
  onEdit?: (val: string) => void;
  highlight?: boolean;
}) {
  const isPending = !value || value === "-" || value === "Pending" || value === "Awaiting Response" || value === "Pending Identification";
  const displayValue = type === "date" && value 
    ? (!isNaN(new Date(value).getTime()) ? format(new Date(value), "dd-MMM-yyyy").toUpperCase() : value)
    : (value || "—");

  return (
    <div className="flex items-center justify-between py-1.5 border-b border-white/[0.03] last:border-0">
      <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{label}</span>
      
      {isEditing ? (
        <div className="w-[140px]">
          {type === "select" ? (
            <select
              value={editValue || ""}
              onChange={(e) => onEdit?.(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-[10px] text-white focus:outline-none focus:ring-1 focus:ring-blue-500 w-full"
            >
              <option value="">— Select —</option>
              {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          ) : (
            <input
              type={type}
              value={editValue || ""}
              onChange={(e) => onEdit?.(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-[10px] text-white focus:outline-none focus:ring-1 focus:ring-blue-500 w-full"
            />
          )}
        </div>
      ) : (
        <span className={cn(
          "text-[10px] font-bold uppercase tracking-tight",
          isPending || highlight ? "text-orange-500/80 italic" : "text-slate-300"
        )}>
          {displayValue}
        </span>
      )}
    </div>
  );
}

