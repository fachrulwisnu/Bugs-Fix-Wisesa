import React, { useState, useMemo } from "react";
import { BugRecord } from "../types";
import { 
  Folder, 
  User, 
  Users, 
  ChevronDown, 
  ChevronRight, 
  Search, 
  Layers, 
  FileDown, 
  ShieldCheck, 
  Calendar, 
  Info,
  Bug,
  RefreshCcw,
  CheckCircle,
  AlertCircle
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../lib/utils";
import * as XLSX from "xlsx";
import { format } from "date-fns";
import { exportComprehensiveExcel } from "../lib/excelExport";

interface ProjectTreeViewProps {
  bugs: BugRecord[];
  isCompact?: boolean;
  filterType?: string;
  setFilterType?: (type: string) => void;
}

export interface AdvancedProjectNode {
  key: string;
  projectName: string;
  totalBugs: number;
  totalCRs: number;
  fsdYaCount: number;
  fsdTidakCount: number;
  pics: string[];
  devsList: { devName: string; totalScore: number; taskCount: number }[];
  earliestStart: string | null;
  latestFinish: string | null;
  bugsList: BugRecord[];
  crsList: BugRecord[];
}

export function buildAdvancedProjectTree(bugsData: BugRecord[]): AdvancedProjectNode[] {
  const projectMap: Record<string, {
    projectName: string;
    totalBugs: number;
    totalCRs: number;
    fsdYaCount: number;
    fsdTidakCount: number;
    picsSet: Set<string>;
    devMap: Record<string, { totalScore: number; taskCount: number }>;
    earliestStart: Date | null;
    latestFinish: Date | null;
    bugsList: BugRecord[];
    crsList: BugRecord[];
  }> = {};

  bugsData.forEach(bug => {
    // Handling Unmapped Project name
    let project = (bug.projectName || '').trim();
    if (!project) {
      project = "Unmapped Project";
    }

    const typeLower = (bug.type || '').toLowerCase();
    const isBug = typeLower.includes('bug');
    const isCR = typeLower.includes('cr') || typeLower.includes('change request');

    // FSD Status
    const fsdVal = (bug.includedInFsd || '').trim().toLowerCase();
    const isFsdYa = fsdVal === 'ya' || fsdVal === 'yes';
    const isFsdTidak = fsdVal === 'tidak' || fsdVal === 'no';

    const pic = bug.picName || 'Unassigned PIC';
    const dev = bug.devName || 'Unassigned Dev';
    const score = Number(bug.bugScore) || 0;

    if (!projectMap[project]) {
      projectMap[project] = {
        projectName: project,
        totalBugs: 0,
        totalCRs: 0,
        fsdYaCount: 0,
        fsdTidakCount: 0,
        picsSet: new Set<string>(),
        devMap: {},
        earliestStart: null,
        latestFinish: null,
        bugsList: [],
        crsList: []
      };
    }

    const proj = projectMap[project];

    if (isBug) {
      proj.totalBugs += 1;
      proj.bugsList.push(bug);
    } else if (isCR) {
      proj.totalCRs += 1;
      proj.crsList.push(bug);
    } else {
      // Fallback: put unmapped type under bugs
      proj.totalBugs += 1;
      proj.bugsList.push(bug);
    }

    if (isFsdYa) {
      proj.fsdYaCount += 1;
    } else if (isFsdTidak) {
      proj.fsdTidakCount += 1;
    }

    proj.picsSet.add(pic);

    if (!proj.devMap[dev]) {
      proj.devMap[dev] = { totalScore: 0, taskCount: 0 };
    }
    proj.devMap[dev].totalScore += score;
    proj.devMap[dev].taskCount += 1;

    // Minimum & Maximum Date Aggregation
    if (bug.startDate && bug.startDate !== "-") {
      try {
        const sD = new Date(bug.startDate);
        if (!isNaN(sD.getTime())) {
          if (!proj.earliestStart || sD < proj.earliestStart) {
            proj.earliestStart = sD;
          }
        }
      } catch (e) {}
    }
    
    if (bug.finishAt && bug.finishAt !== "-") {
      try {
        const fD = new Date(bug.finishAt);
        if (!isNaN(fD.getTime())) {
          if (!proj.latestFinish || fD > proj.latestFinish) {
            proj.latestFinish = fD;
          }
        }
      } catch (e) {}
    }
  });

  return Object.values(projectMap).map(p => {
    const pics = Array.from(p.picsSet);
    const devsList = Object.entries(p.devMap).map(([devName, stats]) => ({
      devName,
      totalScore: stats.totalScore,
      taskCount: stats.taskCount
    }));

    return {
      key: p.projectName,
      projectName: p.projectName,
      totalBugs: p.totalBugs,
      totalCRs: p.totalCRs,
      fsdYaCount: p.fsdYaCount,
      fsdTidakCount: p.fsdTidakCount,
      pics,
      devsList,
      earliestStart: p.earliestStart ? p.earliestStart.toISOString().split('T')[0] : null,
      latestFinish: p.latestFinish ? p.latestFinish.toISOString().split('T')[0] : null,
      bugsList: p.bugsList,
      crsList: p.crsList
    };
  });
}

export function exportToExcel(treeData: AdvancedProjectNode[]) {
  const tableData = treeData.map((node, index) => {
    const hasFsd = node.fsdYaCount > 0 ? "Include FSD" : "Not Include FSD";
    const detailFsd = `Include FSD: ${node.fsdYaCount}, Not Include FSD: ${node.fsdTidakCount}`;
    return {
      "No": index + 1,
      "Project Name": node.projectName,
      "Total Bug": node.totalBugs,
      "Total CR": node.totalCRs,
      "Status FSD": hasFsd,
      "Rincian FSD (Ya/Tidak)": detailFsd,
      "Start Date": node.earliestStart ? format(new Date(node.earliestStart), "dd MMM yyyy") : "—",
      "Finish Date": node.latestFinish ? format(new Date(node.latestFinish), "dd MMM yyyy") : "—"
    };
  });

  const ws = XLSX.utils.json_to_sheet(tableData);
  
  // Auto-fit Column widths
  if (tableData.length > 0) {
    const colWidths = Object.keys(tableData[0]).map(key => {
      let maxLen = key.length;
      tableData.forEach(row => {
        const val = String((row as any)[key] || "");
        if (val.length > maxLen) {
          maxLen = val.length;
        }
      });
      return { wch: maxLen + 4 };
    });
    ws["!cols"] = colWidths;
  }

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Project Governance Summary");
  XLSX.writeFile(wb, `Wisesa_Project_Governance_Summary_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

export function ProjectTreeView({ bugs, isCompact = false, filterType = "All", setFilterType }: ProjectTreeViewProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedKeys, setExpandedKeys] = useState<Record<string, boolean>>({});
  const [selectedProjectDetail, setSelectedProjectDetail] = useState<AdvancedProjectNode | null>(null);

  const treeData = useMemo(() => {
    return buildAdvancedProjectTree(bugs);
  }, [bugs]);

  const filteredTreeData = useMemo(() => {
    if (!searchTerm.trim()) return treeData;
    const lower = searchTerm.toLowerCase();
    return treeData.filter(node => 
      node.projectName.toLowerCase().includes(lower) ||
      node.pics.some(pic => pic.toLowerCase().includes(lower)) ||
      node.devsList.some(dev => dev.devName.toLowerCase().includes(lower))
    );
  }, [treeData, searchTerm]);

  const toggleExpand = (key: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedKeys(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleProjectClick = (node: AdvancedProjectNode) => {
    setSelectedProjectDetail(node);
  };

  const handleExport = () => {
    exportComprehensiveExcel(bugs, filterType);
  };

  const expandAll = () => {
    const next: Record<string, boolean> = {};
    filteredTreeData.forEach(node => {
      next[node.key] = true;
    });
    setExpandedKeys(next);
  };

  const collapseAll = () => {
    setExpandedKeys({});
  };

  const formatProjectDateRange = (node: AdvancedProjectNode) => {
    if (!node.earliestStart && !node.latestFinish) return "Latest Update";
    const startStr = node.earliestStart ? format(new Date(node.earliestStart), "dd MMM yyyy") : "Ongoing";
    const finishStr = node.latestFinish ? format(new Date(node.latestFinish), "dd MMM yyyy") : "Ongoing";
    return `${startStr} - ${finishStr}`;
  };

  const formatDateCompact = (dateStr: string | null | undefined) => {
    if (!dateStr || dateStr === "-" || dateStr === "N/A" || dateStr === "") return "—";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return format(d, "dd MMM yyyy");
    } catch (e) {
      return dateStr;
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-3xl flex flex-col relative overflow-hidden shadow-sm">
      {/* Header */}
      <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white shrink-0">
        <div>
          <h2 className="text-base font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-600" />
            List Bug
          </h2>
          <p className="text-xs text-gray-500 font-medium mt-1">
            Collapsible Hierarchical Analyzer showing Project Dates, Bug Details, and Dev Performance.
          </p>
        </div>
        
        {/* Actions Group */}
        <div className="flex items-center gap-2 shrink-0">
          {setFilterType && (
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="bg-white border border-gray-200 rounded-lg text-sm text-gray-750 focus:ring-blue-500 focus:border-blue-500 px-3 py-1.5 font-semibold outline-none h-10 cursor-pointer shadow-sm text-xs md:text-sm"
            >
              <option value="All">Lihat Semua (All)</option>
              <option value="Bug">Hanya Bug</option>
              <option value="CR">Hanya Change Request (CR)</option>
            </select>
          )}
          <button 
            onClick={handleExport}
            className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100/80 border border-indigo-100 rounded-xl text-xs font-semibold text-indigo-700 transition-all flex items-center gap-1.5 active:scale-95"
            title="Export Summary Excel"
          >
            <FileDown className="w-4 h-4" />
            Export Governance XLS
          </button>
          <button 
            onClick={expandAll}
            className="px-3 py-2 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl text-xs font-semibold text-gray-600 transition-all"
          >
            + Expand All
          </button>
          <button 
            onClick={collapseAll}
            className="px-3 py-2 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl text-xs font-semibold text-gray-600 transition-all"
          >
            - Collapse All
          </button>
        </div>
      </div>

      {/* Internal Search */}
      <div className="p-4 border-b border-gray-100 shrink-0 bg-gray-50/40">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search project, PIC name, or dev..."
            className="w-full h-10 pl-10 pr-4 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600/15 focus:border-indigo-600 transition-all font-medium text-sm text-gray-900 placeholder:text-gray-400 shadow-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Tree list */}
      <div className="p-6 space-y-4">
        {filteredTreeData.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400 text-sm font-medium">
            No matching projects found
          </div>
        ) : (
          filteredTreeData.map((node) => {
            const isExpanded = !!expandedKeys[node.key];
            const hasFsd = node.fsdYaCount > 0;
            const dateRangeText = formatProjectDateRange(node);
            
            return (
              <div 
                key={node.key} 
                className="bg-white border border-gray-200 rounded-2xl overflow-hidden transition-all duration-300 shadow-xs hover:border-gray-300"
              >
                {/* Node Row Header */}
                <div 
                  onClick={() => handleProjectClick(node)}
                  className="p-4.5 px-5 flex flex-col md:flex-row md:items-center justify-between cursor-pointer select-none group gap-4 bg-gray-50/20 hover:bg-gray-50/40"
                  title="Click to view full governance audit"
                >
                  <div className="flex items-center gap-3.5 min-w-0 flex-1">
                    <div className="bg-white border border-gray-200 w-9 h-9 rounded-xl flex items-center justify-center text-gray-700 group-hover:scale-105 transition-transform shrink-0 shadow-xs">
                      <Folder className="w-5 h-5 text-indigo-500" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-semibold text-gray-900 truncate group-hover:text-indigo-600 transition-colors">
                        {node.projectName}
                      </h3>
                      <div className="text-xs text-gray-500 font-medium mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-gray-400" />
                          <span className="font-semibold text-gray-700">{dateRangeText}</span>
                        </span>
                        {node.earliestStart && (
                          <span className="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-mono">
                            Start: {formatDateCompact(node.earliestStart)}
                          </span>
                        )}
                        {node.latestFinish && (
                          <span className="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-mono">
                            Finish: {formatDateCompact(node.latestFinish)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between md:justify-end gap-4 shrink-0 border-t md:border-none pt-3 md:pt-0">
                    <div className="flex gap-2 text-xs font-semibold">
                      <span className="text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-100 flex items-center gap-1 shadow-xs">
                        <Bug className="w-3.5 h-3.5 text-amber-500" />
                        {node.totalBugs} Bug
                      </span>
                      <span className="text-cyan-700 bg-cyan-50 px-2.5 py-1 rounded-lg border border-cyan-100 flex items-center gap-1 shadow-xs">
                        <RefreshCcw className="w-3.5 h-3.5 text-cyan-500 animate-spin-slow" />
                        {node.totalCRs} CR
                      </span>
                      <span className={cn(
                        "px-2.5 py-1 rounded-lg border font-bold shadow-xs",
                        hasFsd 
                          ? "bg-emerald-50 text-emerald-700 border-emerald-100" 
                          : "bg-rose-50 text-rose-700 border-rose-100"
                      )}>
                        {hasFsd ? "Include FSD" : "Not Include FSD"}
                      </span>
                    </div>
                    <button 
                      onClick={(e) => toggleExpand(node.key, e)}
                      className="p-1.5 hover:bg-gray-100 rounded-lg transition-all border border-gray-200"
                    >
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-gray-600" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-gray-600" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Children Collapsible Accordion (Detailed Multi-Part Tables & Lists) */}
                <AnimatePresence initial={false}>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="border-t border-gray-200 bg-white"
                    >
                      <div className="p-6 space-y-6">
                        
                        {/* 3-Column Area Layout for Bug Lists, CR Lists, and Team Scoreboards */}
                        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                          
                          {/* 1. DAFTAR BUGS TABLE */}
                          <div className="xl:col-span-1 bg-white border border-gray-100 rounded-xl p-4.5 space-y-3.5 shadow-xs">
                            <div className="flex items-center justify-between">
                              <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                                <AlertCircle className="w-4 h-4 text-amber-500" />
                                Daftar Bugs ({node.bugsList.length})
                              </h4>
                              <span className="text-[10px] bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full font-bold">
                                Active Defects
                              </span>
                            </div>
                            
                            <div className="overflow-x-auto">
                              <table className="w-full text-left border-collapse">
                                <thead>
                                  <tr className="border-b border-gray-100 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                    <th className="py-2 w-8">No</th>
                                    <th className="py-2">Remarks / Deskripsi</th>
                                    <th className="py-2 text-center w-16">Severity</th>
                                    <th className="py-2 text-right">Discovery</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50 text-xs font-semibold text-gray-700">
                                  {node.bugsList.map((item, idx) => (
                                    <tr key={`bug-item-${item.no || idx}`} className="hover:bg-slate-50/40">
                                      <td className="py-2.5 text-gray-400">{item.no || idx + 1}</td>
                                      <td className="py-2.5 whitespace-normal break-words">
                                        {item.remarks || "—"}
                                      </td>
                                      <td className="py-2.5 text-center">
                                        <span className={cn(
                                          "px-1.5 py-0.5 rounded text-[9px] font-bold uppercase",
                                          item.severity === "Critical" ? "bg-rose-50 text-rose-700 border border-rose-100" :
                                          item.severity === "Major" ? "bg-orange-50 text-orange-700 border border-orange-100" :
                                          "bg-slate-100 text-slate-700"
                                        )}>
                                          {item.severity}
                                        </span>
                                      </td>
                                      <td className="py-2.5 text-right font-mono text-[10px] text-gray-500">
                                        {formatDateCompact(item.discoveryDate)}
                                      </td>
                                    </tr>
                                  ))}
                                  {node.bugsList.length === 0 && (
                                    <tr>
                                      <td colSpan={4} className="py-6 text-center text-gray-400 italic font-medium">
                                        No bug issues in this project
                                      </td>
                                    </tr>
                                  )}
                                </tbody>
                              </table>
                            </div>
                          </div>

                          {/* 2. DAFTAR CR TABLE */}
                          <div className="xl:col-span-1 bg-white border border-gray-100 rounded-xl p-4.5 space-y-3.5 shadow-xs">
                            <div className="flex items-center justify-between">
                              <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                                <RefreshCcw className="w-4 h-4 text-cyan-500" />
                                Daftar CR ({node.crsList.length})
                              </h4>
                              <span className="text-[10px] bg-cyan-50 text-cyan-700 px-2 py-0.5 rounded-full font-bold">
                                Change Requests
                              </span>
                            </div>
                            
                            <div className="overflow-x-auto">
                              <table className="w-full text-left border-collapse">
                                <thead>
                                  <tr className="border-b border-gray-100 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                    <th className="py-2 w-8">No</th>
                                    <th className="py-2">Remarks / Deskripsi</th>
                                    <th className="py-2 text-right">Status Dev</th>
                                    <th className="py-2 text-right">Start Date</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50 text-xs font-semibold text-gray-700">
                                  {node.crsList.map((item, idx) => (
                                    <tr key={`cr-item-${item.no || idx}`} className="hover:bg-slate-50/40">
                                      <td className="py-2.5 text-gray-400">{item.no || idx + 1}</td>
                                      <td className="py-2.5 whitespace-normal break-words">
                                        {item.remarks || "—"}
                                      </td>
                                      <td className="py-2.5 text-right">
                                        <span className={cn(
                                          "px-2 py-0.5 rounded-full text-[9px] font-bold uppercase",
                                          item.statusDev === "DONE" ? "bg-emerald-50 text-emerald-700" : "bg-blue-50 text-blue-700"
                                        )}>
                                          {item.statusDev || "QUEUE"}
                                        </span>
                                      </td>
                                      <td className="py-2.5 text-right font-mono text-[10px] text-gray-500">
                                        {formatDateCompact(item.startDate)}
                                      </td>
                                    </tr>
                                  ))}
                                  {node.crsList.length === 0 && (
                                    <tr>
                                      <td colSpan={4} className="py-6 text-center text-gray-400 italic font-medium">
                                        No change requests recorded
                                      </td>
                                    </tr>
                                  )}
                                </tbody>
                              </table>
                            </div>
                          </div>

                          {/* 3. TIM AND DEVELOPER SCOREBOARD */}
                          <div className="xl:col-span-1 bg-white border border-gray-100 rounded-xl p-4.5 space-y-4 shadow-xs">
                            {/* PIC Title & List */}
                            <div className="space-y-2">
                              <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                                <User className="w-4 h-4 text-indigo-500" />
                                Tim PIC Terlibat
                              </h4>
                              <div className="flex flex-wrap gap-1.5 pt-1">
                                {node.pics.map((pic, id) => (
                                  <span 
                                    key={`pic-${pic}-${id}`}
                                    className="px-2.5 py-1 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold text-gray-700 flex items-center gap-1.5 shadow-xs"
                                  >
                                    <div className="w-2 h-2 rounded-full bg-indigo-500" />
                                    {pic}
                                  </span>
                                ))}
                                {node.pics.length === 0 && (
                                  <span className="text-xs text-gray-400 italic">No PIC assigned</span>
                                )}
                              </div>
                            </div>

                            {/* Dev Scoreboard */}
                            <div className="space-y-3 pt-2 border-t border-gray-100">
                              <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                                <Users className="w-4 h-4 text-emerald-500" />
                                Developer Scoreboard
                              </h4>
                              <div className="space-y-2.5 max-h-[160px] overflow-y-auto pr-1">
                                {node.devsList.map((dev, id) => {
                                  // Risks logic
                                  const isRisky = dev.totalScore > 15;
                                  const isModerate = dev.totalScore > 5;
                                  const riskLabel = isRisky ? "High Penalty" : isModerate ? "Moderate" : "Healthy";
                                  const colorBar = isRisky ? "bg-rose-600" : isModerate ? "bg-yellow-500" : "bg-emerald-600";
                                  const colorText = isRisky ? "text-rose-700" : isModerate ? "text-yellow-700" : "text-emerald-700";
                                  const colorBg = isRisky ? "bg-rose-50" : isModerate ? "bg-yellow-105" : "bg-emerald-50";
                                  const barPercent = Math.min(100, Math.max(12, (dev.totalScore / 30) * 100));

                                  return (
                                    <div key={`dev-${dev.devName}-${id}`} className="bg-slate-50/50 hover:bg-slate-50 border border-gray-100 p-2.5 rounded-lg transition-all">
                                      <div className="flex items-center justify-between text-xs font-semibold mb-1">
                                        <span className="text-gray-900 font-bold">{dev.devName}</span>
                                        <span className={cn("text-[9px] px-2 py-0.5 rounded-full font-bold uppercase", colorBg, colorText)}>
                                          Score: {dev.totalScore} ({riskLabel})
                                        </span>
                                      </div>
                                      
                                      {/* Visual Progress Bar */}
                                      <div className="flex items-center gap-2.5 mt-2">
                                        <div className="flex-1 h-2 bg-gray-200/60 rounded-full overflow-hidden">
                                          <div 
                                            className={cn("h-full transition-all duration-500 rounded-full", colorBar)}
                                            style={{ width: `${barPercent}%` }}
                                          />
                                        </div>
                                        <span className="text-[10px] font-bold text-gray-500 shrink-0 font-mono">{dev.taskCount} Tasks</span>
                                      </div>
                                    </div>
                                  );
                                })}
                                {node.devsList.length === 0 && (
                                  <span className="text-xs text-slate-400 italic">No devs evaluated</span>
                                )}
                              </div>
                            </div>

                          </div>

                        </div>

                        {/* Extra Global Governance Summary Info Card (showing other dates) */}
                        <div className="bg-slate-50 border border-gray-200/60 rounded-xl p-4.5 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs font-semibold text-gray-700">
                          <div className="flex items-center gap-2">
                            <Info className="w-5 h-5 text-indigo-500 shrink-0" />
                            <div>
                              <span className="text-gray-950 font-bold">Project Governance Compliance Audit:</span>
                              <p className="text-gray-500 font-medium text-xs mt-0.5">
                                FSD Coverage ratio: {node.fsdYaCount} of {node.fsdYaCount + node.fsdTidakCount} documents verified ({(node.fsdYaCount / Math.max(1, node.fsdYaCount + node.fsdTidakCount) * 100).toFixed(0)}%).
                              </p>
                            </div>
                          </div>
                          
                          {/* Display and format the key project timeline dates */}
                          <div className="grid grid-cols-2 md:flex gap-4">
                            <div className="bg-white border border-gray-200 p-2 rounded-lg text-center min-w-[90px] shadow-2xs">
                              <div className="text-[9px] text-gray-400 font-bold uppercase">Start Date</div>
                              <div className="text-xs font-bold text-gray-900 mt-0.5">{formatDateCompact(node.earliestStart)}</div>
                            </div>
                            <div className="bg-white border border-gray-200 p-2 rounded-lg text-center min-w-[90px] shadow-2xs">
                              <div className="text-[9px] text-gray-400 font-bold uppercase">Finish Date</div>
                              <div className="text-xs font-bold text-indigo-600 mt-0.5">{formatDateCompact(node.latestFinish)}</div>
                            </div>
                          </div>
                        </div>

                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })
        )}
      </div>

      {/* Pop-up Modal View Detail (FSD Status Compliance Modal) */}
      <AnimatePresence>
        {selectedProjectDetail && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedProjectDetail(null)}
              className="absolute inset-0 bg-gray-950/40 backdrop-blur-xs"
            />

            {/* Modal Box */}
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-md bg-white border border-gray-100 rounded-3xl p-6 shadow-2xl overflow-hidden text-gray-900"
            >
              <div className="absolute top-0 right-0 p-4">
                <button 
                  onClick={() => setSelectedProjectDetail(null)}
                  className="p-1.5 hover:bg-gray-100 rounded-xl text-gray-400 hover:text-gray-650 transition-all border border-gray-100"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Title & Badge */}
              <div className="mb-6">
                <span className="text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-3 py-1 rounded-full uppercase tracking-wider">
                  Real-time SIT Integrity Audit
                </span>
                <h3 className="text-lg font-bold text-gray-900 tracking-tight mt-3">
                  {selectedProjectDetail.projectName}
                </h3>
                <div className="text-xs text-gray-500 font-semibold mt-1 uppercase flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  Timeline: {formatProjectDateRange(selectedProjectDetail)}
                </div>
              </div>

              {/* Stats Box */}
              <div className="grid grid-cols-2 gap-4 mb-6 text-gray-900">
                <div className="bg-gray-50 border border-gray-100 p-3.5 rounded-2xl">
                  <div className="text-[10px] text-amber-700 font-bold uppercase tracking-widest mb-1">Total Bugs</div>
                  <div className="text-xl font-bold text-gray-900">{selectedProjectDetail.totalBugs}</div>
                </div>
                <div className="bg-gray-50 border border-gray-100 p-3.5 rounded-2xl">
                  <div className="text-[10px] text-indigo-750 font-bold uppercase tracking-widest mb-1">Total CRs</div>
                  <div className="text-xl font-bold text-indigo-600">{selectedProjectDetail.totalCRs}</div>
                </div>
              </div>

              {/* FSD Detail Analysis block */}
              <div className="bg-indigo-50/20 border border-indigo-100/50 p-4 rounded-2xl mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-indigo-850 font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-indigo-500" />
                    FSD Governance Analysis
                  </span>
                  <span className={cn(
                    "text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded border shadow-xs",
                    selectedProjectDetail.fsdYaCount > 0 
                      ? "text-emerald-700 bg-emerald-50 border-emerald-100" 
                      : "text-rose-700 bg-rose-50 border-rose-100"
                  )}>
                    {selectedProjectDetail.fsdYaCount > 0 ? "Include FSD" : "Not Include FSD"}
                  </span>
                </div>
                <p className="text-xs text-gray-700 font-medium leading-relaxed">
                  {selectedProjectDetail.fsdYaCount > 0 
                  ? "Sistem memvalidasi kelengkapan dokumen FSD. Project terintegrasi dengan struktur dokumen yang valid." 
                  : "Perhatian khusus! Deteksi audit menunjukkan bahwa tidak ada satupun item yang melampirkan berkas dokumen FSD."}
                </p>
                
                {/* Specific counts details */}
                <div className="mt-3.5 pt-3 border-t border-indigo-100/40 grid grid-cols-2 gap-2 text-center text-xs font-bold">
                  <div className="bg-emerald-50/40 border border-emerald-100/30 p-1.5 rounded-lg text-emerald-600">
                    Include FSD: {selectedProjectDetail.fsdYaCount}
                  </div>
                  <div className="bg-rose-50/40 border border-rose-100/30 p-1.5 rounded-lg text-rose-600">
                    Not Include FSD: {selectedProjectDetail.fsdTidakCount}
                  </div>
                </div>
              </div>

              {/* Close Button */}
              <button 
                onClick={() => setSelectedProjectDetail(null)}
                className="w-full py-3 bg-[#2B3674] hover:bg-slate-900 text-white font-bold text-xs uppercase tracking-widest rounded-2xl transition-all active:scale-95 shadow-lg shadow-indigo-500/10"
              >
                Close Report
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
