/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from "react";
import { 
  BarChart3, 
  FileDown, 
  LayoutDashboard, 
  PieChart as PieChartIcon, 
  Settings, 
  Users, 
  Download,
  Printer,
  ChevronRight,
  TrendingDown,
  AlertTriangle,
  Bug as BugIcon,
  CheckCircle,
  RefreshCcw,
  Plus,
  Loader2,
  Database,
  Calendar,
  X,
  Search,
  ShieldAlert,
  ChevronLeft,
  TrendingUp,
  LogOut,
  History,
  Edit3,
  Save,
  User,
  Layers,
  Clock,
  CheckCircle2,
  Trash2,
  Eye,
  FileUp,
  Undo2
} from "lucide-react";
import { BugRecord, DevStats, SEVERITY_WEIGHTS, DevEvaluation, AppUser } from "./types";
import { ExcelImport } from "./components/ExcelImport";
import { DashboardCharts } from "./components/Charts";
import { DataTable, SummaryCard, MetaRow } from "./components/DataTable";
import { MonthPickerPopover } from "./components/MonthPickerPopover";
import { OrphanedDashboardModal } from "./components/OrphanedDashboardModal";
import { Leaderboard } from "./components/Leaderboard";
import { GlobalControls } from "./components/GlobalControls";
import { AuditLog } from "./components/AuditLog";
import { ExecutivePerformance } from "./components/ExecutivePerformance";
import { ProjectTreeView } from "./components/ProjectTreeView";
import { motion, AnimatePresence } from "motion/react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { supabase, isSupabaseConfigured } from "./lib/supabase";
import { format, subMonths, isAfter, isBefore, parse } from "date-fns";
import { Login } from "./components/Login";
import { cn } from "./lib/utils";
import { exportComprehensiveExcel } from "./lib/excelExport";
import { normalizeStatus, isPeriodeMissing } from "./lib/normalization";
import { AuditEntry } from "./types";

function FilterGroup({ label, value, onChange, children, className = "" }: { label: string, value: string, onChange: (v: string) => void, children: React.ReactNode, className?: string }) {
  return (
    <div className={cn("flex items-center gap-2 bg-slate-950/50 p-1.5 rounded-xl border border-white/5", className)}>
      <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest pl-1 whitespace-nowrap">{label}</span>
      <select 
        value={value} 
        onChange={(e) => onChange(e.target.value)}
        className="bg-slate-900 border border-slate-800 rounded-lg px-2 py-1.5 text-white text-[10px] focus:ring-1 focus:ring-blue-500/30 font-bold outline-none min-w-[90px]"
      >
        {children}
      </select>
    </div>
  );
}

export default function App() {
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [bugs, setBugs] = useState<BugRecord[]>([]);
  const [evaluations, setEvaluations] = useState<Record<string, string>>({});
  const [auditLogs, setAuditLogs] = useState<AuditEntry[]>([]);
  const [trashBugs, setTrashBugs] = useState<BugRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "leaderboard" | "data" | "controls" | "audit" | "trash" | "tree">("overview");
  const [recordToDelete, setRecordToDelete] = useState<BugRecord | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isOrphanedModalOpen, setIsOrphanedModalOpen] = useState(false);
  const [drilldownType, setDrilldownType] = useState<string | null>(null);
  const [drilldownValue, setDrilldownValue] = useState<string | null>(null);
  const [projectInput, setProjectInput] = useState("");
  const [devInput, setDevInput] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");
  const [isExporting, setIsExporting] = useState(false);

  const uniqueProjects = useMemo(() => Array.from(new Set(bugs.map(b => b.projectName))).filter(Boolean), [bugs]);
  const uniqueDevs = useMemo(() => Array.from(new Set(bugs.map(b => b.devName))).filter(Boolean), [bugs]);
  const [selectedDev, setSelectedDev] = useState<string | null>(null);
  const [selectedBugForDetail, setSelectedBugForDetail] = useState<BugRecord | null>(null);

  // States for Inline Editing in Root Modal
  const [isEditingBug, setIsEditingBug] = useState(false);
  const [bugEditFields, setBugEditFields] = useState<Partial<BugRecord>>({});
  const [isSavingBug, setIsSavingBug] = useState(false);

  useEffect(() => {
    if (selectedBugForDetail) {
      setBugEditFields({
        periode: selectedBugForDetail.periode,
        statusDev: selectedBugForDetail.statusDev,
        includedInFsd: selectedBugForDetail.includedInFsd,
        discoveryDate: selectedBugForDetail.discoveryDate,
        sitRealizedDate: selectedBugForDetail.sitRealizedDate,
        responseDev: selectedBugForDetail.responseDev,
        statusPic: selectedBugForDetail.statusPic,
        startDate: selectedBugForDetail.startDate,
        finishAt: selectedBugForDetail.finishAt,
      });
      setIsEditingBug(false);
    }
  }, [selectedBugForDetail]);

  const handleSaveBugEdit = async () => {
    if (!selectedBugForDetail?.id) return;
    setIsSavingBug(true);
    try {
      await handleUpdateBug(selectedBugForDetail.id, bugEditFields);
      setSelectedBugForDetail({ ...selectedBugForDetail, ...bugEditFields });
      setIsEditingBug(false);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSavingBug(false);
    }
  };

  const handleChartClick = (type: string, value: string) => {
    if (type === "dev") {
      setSelectedDev(value);
    } else if (type === "severity") {
      setDrilldownType("severity_filter");
      setDrilldownValue(value);
    } else if (type === "trend") {
      setDrilldownType("trend_filter");
      setDrilldownValue(value);
    } else if (type === "variance") {
      setDrilldownType("variance_filter");
      setDrilldownValue(value);
    }
  };
  const [severityFilter, setSeverityFilter] = useState("All");
  const [typeFilter, setTypeFilter] = useState("All");
  
  const [startPeriod, setStartPeriod] = useState<string | null>(null);
  const [endPeriod, setEndPeriod] = useState<string | null>(null);
  const [showIntegrityOnly, setShowIntegrityOnly] = useState<"none" | "missing_period" | "unmapped_status">("none");

  useEffect(() => {
    const savedUser = localStorage.getItem("wisesa_user");
    if (savedUser) {
      setCurrentUser(JSON.parse(savedUser));
    }
    setAuthLoading(false);
  }, []);

  const handleLogin = (user: AppUser) => {
    setCurrentUser(user);
    localStorage.setItem("wisesa_user", JSON.stringify(user));
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem("wisesa_user");
  };

  const sanitizeTimestamp = (val: any) => {
    if (!val || val === "-" || val === "" || val === "N/A") return null;
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d.toISOString();
  };

  // Fetch data on load
  const loadData = async () => {
    if (!isSupabaseConfigured || !currentUser) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      // Fetch ALL Bugs (Active only) using pagination
      let allBugs: BugRecord[] = [];
      let from = 0;
      const step = 1000;
      let keepFetching = true;

      while (keepFetching) {
        const { data, error: bugError } = await supabase
          .from('bugs')
          .select('*')
          .or('is_deleted.is.null,is_deleted.eq.false')
          .range(from, from + step - 1)
          .order('created_at', { ascending: false });

        if (bugError) {
          if (bugError.code === 'PGRST204' || bugError.code === 'PGRST205') {
            throw new Error(`Table 'bugs' not found in public schema. Please verify your Supabase database structure.`);
          }
          throw bugError;
        }

        if (data && data.length > 0) {
          allBugs = [...allBugs, ...data as BugRecord[]];
          from += step;
          if (data.length < step) {
            keepFetching = false;
          }
        } else {
          keepFetching = false;
        }
      }

      // Fetch Deleted Bugs (Trash)
      const { data: trashData } = await supabase
        .from('bugs')
        .select('*')
        .eq('is_deleted', true)
        .order('deleted_at', { ascending: false });

      // Fetch Evaluations
      const { data: evalData, error: evalError } = await supabase
        .from('dev_evaluations')
        .select('*');

      if (!evalError && evalData) {
        const evalMap: Record<string, string> = {};
        evalData.forEach((e: any) => evalMap[e.dev_name] = e.notes);
        setEvaluations(evalMap);
      }

      // Fetch Audit Logs (Super Admin Only)
      if (currentUser.role === "super_admin") {
        const { data: auditData, error: auditError } = await supabase
          .from('audit_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(100);
        
        if (!auditError && auditData) {
          setAuditLogs(auditData as AuditEntry[]);
        }
      }

      setBugs(allBugs);
      setLastSync(new Date().toLocaleTimeString());
      
      if (trashData) {
        setTrashBugs(trashData as BugRecord[]);
      }
    } catch (err: any) {
      console.error("Error loading data:", err);
      setError(err.message || "Failed to connect to governance database.");
    } finally {
      setLoading(false);
    }
  };

  const handleSoftDeleteBug = (id: string) => {
    if (currentUser?.role !== "super_admin") return;
    const bug = bugs.find(b => b.id === id);
    if (bug) setRecordToDelete(bug);
  };

  const confirmDeleteBug = async () => {
    if (!recordToDelete || !recordToDelete.id) return;

    try {
      const bug = recordToDelete;
      const id = bug.id;

      const updatedFields: any = {
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        last_edited_by: "Fachrul Wisnu Novianto",
        last_edited_at: new Date().toISOString()
      };

      const { error: deleteError } = await supabase
        .from('bugs')
        .update(updatedFields)
        .eq('id', id);

      if (deleteError) throw deleteError;

      // Log action
      await supabase.from('audit_logs').insert({
        actor_name: "Fachrul Wisnu Novianto",
        project_name: bug.projectName,
        bug_id: String(bug.no),
        field_name: "Soft Delete",
        old_value: "Active",
        new_value: "Trashed"
      });

      loadData();
      setRecordToDelete(null);
    } catch (err: any) {
      alert("Soft Delete Failure: " + err.message);
    }
  };

  const handleRestoreBug = async (id: string) => {
    if (currentUser?.role !== "super_admin") return;

    try {
      const bug = trashBugs.find(b => b.id === id);
      if (!bug) return;

      const updatedFields: any = {
        is_deleted: false,
        deleted_at: null,
        last_edited_by: "Fachrul Wisnu Novianto",
        last_edited_at: new Date().toISOString()
      };

      const { error: restoreError } = await supabase
        .from('bugs')
        .update(updatedFields)
        .eq('id', id);

      if (restoreError) throw restoreError;

      // Log action
      await supabase.from('audit_logs').insert({
        actor_name: "Fachrul Wisnu Novianto",
        project_name: bug.projectName,
        bug_id: String(bug.no),
        field_name: "Restore",
        old_value: "Trashed",
        new_value: "Active"
      });

      loadData();
    } catch (err: any) {
      alert("Restore Failure: " + err.message);
    }
  };

  const handleUpdateBug = async (id: string, updates: Partial<BugRecord>) => {
    if (currentUser?.role !== "super_admin") return;

    try {
      const bug = bugs.find(b => b.id === id);
      if (!bug) return;

      // Track changes for auditing
      const changes: Partial<AuditEntry>[] = [];
      const sanitizedUpdates = { ...updates };
      
      // Sanitize date fields if they exist in updates
      const dateFields = ['discoveryDate', 'startDate', 'finishAt', 'sitRealizedDate'];
      dateFields.forEach(field => {
        if (field in sanitizedUpdates) {
          (sanitizedUpdates as any)[field] = sanitizeTimestamp((sanitizedUpdates as any)[field]);
        }
      });

      const updatedFields: any = {
        ...sanitizedUpdates,
        last_edited_by: currentUser.full_name || currentUser.email,
        last_edited_at: new Date().toISOString(),
        last_updated: new Date().toISOString()
      };

      Object.entries(updates).forEach(([key, newValue]) => {
        const oldValue = (bug as any)[key];
        if (oldValue !== newValue) {
          changes.push({
            actor_name: currentUser.full_name || currentUser.email,
            project_name: bug.projectName,
            bug_id: String(bug.no),
            field_name: key,
            old_value: String(oldValue || ""),
            new_value: String(newValue)
          });
        }
      });

      // Update Bug
      const { error: bugUpdateError } = await supabase
        .from('bugs')
        .update(updatedFields)
        .eq('id', id);
      
      if (bugUpdateError) throw bugUpdateError;

      // Log Changes
      if (changes.length > 0) {
        await supabase.from('audit_logs').insert(changes);
      }
      
      loadData();
    } catch (err: any) {
      alert("Accountability Update Failure: " + err.message);
    }
  };

  const handleSaveIntegrity = async (id: string, field: 'periode' | 'statusDev', value: string) => {
    handleUpdateBug(id, { [field]: value });
  };

  const getPeriodeValue = (s: string | undefined | null) => {
    if (!s || s === "-" || s === "UNASSIGNED" || s.toUpperCase() === "ORPHANED") return 0;
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

  // Get unique periodes for selection
  const uniquePeriodes = useMemo(() => {
    const p = Array.from(new Set(bugs.map(b => b.periode))).filter((b): b is string => !!b);
    // Sort chronologically descending (newest at top)
    return p.sort((a, b) => getPeriodeValue(b) - getPeriodeValue(a));
  }, [bugs]);

  const uniquePeriodesAsc = useMemo(() => {
    return [...uniquePeriodes].sort((a, b) => getPeriodeValue(a) - getPeriodeValue(b));
  }, [uniquePeriodes]);

  const handleStartPeriodChange = (val: string) => {
    setStartPeriod(val);
    if (getPeriodeValue(val) > getPeriodeValue(endPeriod)) {
      setEndPeriod(val);
    }
  };

  const handleEndPeriodChange = (val: string) => {
    if (getPeriodeValue(val) < getPeriodeValue(startPeriod)) {
      setStartPeriod(val);
    }
    setEndPeriod(val);
  };

  const globalUnfilteredMetrics = useMemo(() => {
    return {
      totalVolume: bugs.filter(r => r.periode !== 'ORPHANED').length,
      changeRequests: bugs.filter(r => r.periode !== 'ORPHANED').filter(r => (r.type || "").toUpperCase().includes('CHANGE REQUEST') || (r.type || "").toUpperCase() === 'CR').length,
      unmappedProjects: bugs.filter(r => r.projectName?.toUpperCase() === 'UNMAPPED').length,
      missingDevStatus: bugs.filter(r => normalizeStatus(r.statusDev) === 'UNMAPPED').length,
      orphanedPeriods: bugs.filter(r => isPeriodeMissing(r.periode)).length
    };
  }, [bugs]);

  // Default filters on load
  useEffect(() => {
    if (uniquePeriodes.length > 0 && (!startPeriod || !endPeriod)) {
      // uniquePeriodes is sorted descending (latest first)
      const latest = uniquePeriodes[0];
      const earliest = uniquePeriodes[uniquePeriodes.length - 1];
      setStartPeriod(earliest);
      setEndPeriod(latest);
    }
  }, [uniquePeriodes, startPeriod, endPeriod]);

  const filteredBugs = useMemo(() => {
    return bugs.filter(bug => {
      if (showIntegrityOnly === "missing_period") return isPeriodeMissing(bug.periode);
      if (showIntegrityOnly === "unmapped_status") return normalizeStatus(bug.statusDev) === "UNMAPPED";

      const matchesSeverity = severityFilter === "All" || bug.severity === severityFilter;
      const matchesType = typeFilter === "All" || bug.type === typeFilter;
      const matchesProject = projectInput === "" || bug.projectName?.toLowerCase().includes(projectInput.toLowerCase());
      const matchesDev = devInput === "" || bug.devName?.toLowerCase().includes(devInput.toLowerCase());
      
      const consolidatedStatus = normalizeStatus(bug.statusDev);
      
      let matchesStatus = statusFilter === "All" || consolidatedStatus === statusFilter;
      if (statusFilter === "UNMAPPED") matchesStatus = consolidatedStatus === "UNMAPPED";

      const smartSearch = searchTerm.toLowerCase();
      const matchesSearch = searchTerm === "" || 
        bug.projectName?.toLowerCase().includes(smartSearch) || 
        bug.devName?.toLowerCase().includes(smartSearch) || 
        bug.remarks?.toLowerCase().includes(smartSearch);
      
      // Range Filtering Logic
      const bugVal = getPeriodeValue(bug.periode);
      const startVal = getPeriodeValue(startPeriod);
      const endVal = getPeriodeValue(endPeriod);
      
      const matchesPeriode = bugVal >= startVal && bugVal <= endVal;

      return matchesSeverity && matchesType && matchesPeriode && matchesProject && matchesDev && matchesStatus && matchesSearch;
    }).sort((a, b) => {
      const pA = getPeriodeValue(a.periode);
      const pB = getPeriodeValue(b.periode);
      if (pB !== pA) return pB - pA;
      
      const tA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const tB = b.created_at ? new Date(b.created_at).getTime() : 0;
      if (tB !== tA) return tB - tA;

      return (Number(b.no) || 0) - (Number(a.no) || 0);
    });
  }, [bugs, severityFilter, typeFilter, startPeriod, endPeriod, projectInput, devInput, statusFilter, searchTerm, showIntegrityOnly]);

  const [error, setError] = useState<string | null>(null);
  const [isUserManagementOpen, setIsUserManagementOpen] = useState(false);
  const [profiles, setProfiles] = useState<AppUser[]>([]);
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);

  // Body Scroll Lock
  useEffect(() => {
    if (isImportModalOpen || isManualModalOpen || isCreatingUser || editingUser || selectedBugForDetail || selectedDev) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isManualModalOpen, isCreatingUser, editingUser, selectedBugForDetail, selectedDev]);

  const fetchProfiles = async () => {
    if (currentUser?.role !== "super_admin") return;
    const { data, error } = await supabase.from("profiles").select("*");
    if (!error && data) setProfiles(data);
  };

  const createProfile = async (userData: Partial<AppUser>) => {
    try {
      const { data, error } = await supabase.from("profiles").insert([userData]).select();
      if (error) throw error;
      fetchProfiles();
    } catch (err: any) {
      alert("Creation Failed: " + err.message);
    }
  };

  const updateProfile = async (user: AppUser) => {
    try {
      const { error } = await supabase.from("profiles").update(user).eq("id", user.id);
      if (error) throw error;
      fetchProfiles();
    } catch (err: any) {
      alert("Update Failed: " + err.message);
    }
  };

  const deleteProfile = async (id: string) => {
    if (!confirm("Permanently revoke analyst access?")) return;
    const { error } = await supabase.from("profiles").delete().eq("id", id);
    if (!error) fetchProfiles();
  };

  useEffect(() => {
    if (activeTab === "controls") {
      fetchProfiles();
    }
  }, [activeTab]);

  useEffect(() => {
    if (currentUser) {
      loadData();
    }
  }, [currentUser]);

  const normalizeString = (str: any) => String(str || '').toUpperCase().replace(/[^A-Z]/g, '');

  const checkIsFSD = (val: any) => {
    if (!val) return false;
    const s = String(val).toUpperCase().replace(/[^A-Z]/g, '');
    // Matches "YA", "Y", "YES", "TRUE", "INCLUDED", "ADA"
    if (s.includes('YA') || s === 'Y' || s.includes('YES') || s.includes('TRUE') || s.includes('ADA') || s.includes('INCLUDED')) {
        // Exclude false positives like "TIDAK ADA"
        if (s.includes('TIDAK') || s.includes('NO') || s.includes('FALSE')) return false;
        return true;
    }
    return false;
  };

  const isCR = (row: BugRecord) => {
    // Check multiple potential keys for data robustness and aggressive typo matching
    const typeVal = row.type || (row as any)['Type'] || (row as any)['Type (Bug/Change Request)'];
    const t = normalizeString(typeVal);
    // Aggressively match all known CR typo variants from the raw Excel
    return t.includes('CR') || t.includes('CHANGE') || t.includes('REQ') || t.includes('ADDITIONAL') || t === 'C';
  };

  const isBug = (row: BugRecord) => {
    const typeVal = row.type || (row as any)['Type'] || (row as any)['Type (Bug/Change Request)'];
    const t = normalizeString(typeVal);
    return t.includes('BUG');
  };

  const [matrixViewType, setMatrixViewType] = useState<'BUG' | 'CR'>('BUG');
  const [tableTypeFilter, setTableTypeFilter] = useState<'ALL' | 'BUG' | 'CR'>('ALL');

  const validData = useMemo(() => filteredBugs.filter(b => b.periode !== 'ORPHANED'), [filteredBugs]);
  const activeSplitData = useMemo(() => validData.filter(r => matrixViewType === 'CR' ? isCR(r) : isBug(r)), [validData, matrixViewType]);
  
  const cleanTotalBugs = useMemo(() => bugs.filter(b => b.periode !== 'ORPHANED'), [bugs]);

  const totalProjectsCount = useMemo(() => {
    return new Set(validData.map(b => b.projectName).filter(Boolean)).size;
  }, [validData]);

  const devStats = useMemo(() => {
    const stats: Record<string, DevStats> = {};
    
    validData.forEach((bug) => {
      const dev = bug.devName || "Unknown";
      if (!stats[dev]) {
        stats[dev] = {
          devName: dev,
          totalScore: 0,
          bugCount: 0,
          criticalCount: 0,
          majorCount: 0,
          minorCount: 0,
          triviaCount: 0,
          recurringCount: 0,
          evaluationNotes: evaluations[dev] || ""
        };
      }
      
      if (isBug(bug)) {
        stats[dev].bugCount += 1;
      }
      stats[dev].totalScore += (bug.bugScore || 0);
      
      const severity = bug.severity || "";
      if (severity === "Critical") stats[dev].criticalCount += 1;
      else if (severity === "Major") stats[dev].majorCount += 1;
      else if (severity === "Minor") stats[dev].minorCount += 1;
      else if (severity === "Trivia") stats[dev].triviaCount += 1;
      else if (severity === "Recurring") stats[dev].recurringCount += 1;
    });

    // PUNTISHMENT LOGIC: Sort by Highest Score first
    return Object.values(stats).sort((a, b) => b.totalScore - a.totalScore);
  }, [validData, evaluations]);

  const totalFilteredScore = validData.reduce((sum, b) => sum + b.bugScore, 0);
  const openBugsCount = validData.filter(b => b.statusDev === "Open" || b.statusDev === "Reopen").length;
  
  const missingPeriodsCount = useMemo(() => bugs.filter(b => isPeriodeMissing(b.periode)).length, [bugs]);
  const unmappedStatusCount = useMemo(() => validData.filter(b => normalizeStatus(b.statusDev) === "UNMAPPED").length, [validData]);

  const bugsCount = useMemo(() => validData.filter(isBug).length, [validData]);
  const crCount = useMemo(() => validData.filter(isCR).length, [validData]);
  const sitTotalVolume = validData.length;

  const matrixDevStats = useMemo(() => {
    const stats: Record<string, DevStats> = {};
    
    activeSplitData.forEach((bug) => {
      const dev = bug.devName || "Unknown";
      if (!stats[dev]) {
        stats[dev] = {
          devName: dev,
          totalScore: 0,
          bugCount: 0,
          criticalCount: 0,
          majorCount: 0,
          minorCount: 0,
          triviaCount: 0,
          recurringCount: 0,
          evaluationNotes: evaluations[dev] || ""
        };
      }
      
      stats[dev].bugCount += 1;
      stats[dev].totalScore += (bug.bugScore || 0);
      
      const severity = bug.severity || "";
      if (severity === "Critical") stats[dev].criticalCount += 1;
      else if (severity === "Major") stats[dev].majorCount += 1;
      else if (severity === "Minor") stats[dev].minorCount += 1;
      else if (severity === "Trivia") stats[dev].triviaCount += 1;
      else if (severity === "Recurring") stats[dev].recurringCount += 1;
    });

    return Object.values(stats).sort((a, b) => b.totalScore - a.totalScore);
  }, [activeSplitData, evaluations]);

  const fsdMetrics = useMemo(() => {
    let bugFSD = 0, bugNoFSD = 0, crFSD = 0, crNoFSD = 0;
    
    validData.forEach(row => {
      const isFsd = checkIsFSD(row.includedInFsd);
      if (isBug(row)) {
        if (isFsd) bugFSD++; else bugNoFSD++;
      } else if (isCR(row)) {
        if (isFsd) crFSD++; else crNoFSD++;
      }
    });

    return { bugFSD, bugNoFSD, crFSD, crNoFSD };
  }, [validData]);

  const topOffender = matrixDevStats.length > 0 ? matrixDevStats[0].devName : "N/A";

  const exportToExcel = async (bugsToExport?: BugRecord[]) => {
    // Export high-fidelity comprehensive reports using exceljs
    await exportComprehensiveExcel(bugsToExport || filteredBugs);
  };

  const handleFullDashboardExport = async () => {
    setIsExporting(true);
    const pdf = new jsPDF("p", "mm", "a4");
    const timestamp = format(new Date(), 'dd-MMM-yyyy HH:mm');
    
    try {
      // PAGE 1: EXECUTIVE OVERVIEW (PORTRAIT)
      const overviewElement = document.getElementById("executive-overview-content");
      if (overviewElement) {
        const canvas = await html2canvas(overviewElement, {
          scale: 2,
          useCORS: true,
          backgroundColor: "#0f172a",
          logging: false,
          onclone: (clonedDoc) => {
            const root = clonedDoc.documentElement;
            root.classList.add('export-mode');
            root.style.setProperty('--oklab', 'none', 'important');
            root.style.setProperty('--oklch', 'none', 'important');

            const shield = clonedDoc.createElement('style');
            shield.innerHTML = `
              * { 
                oklch: none !important; 
                oklab: none !important; 
                --oklab: none !important;
                --oklch: none !important;
                --tw-shadow: 0 0 #0000 !important;
                border-color: #334155 !important; 
                color-interpolation-filters: sRGB !important; 
              }
              .no-export { display: none !important; }
            `;
            clonedDoc.head.appendChild(shield);
          }
        });
        
        const imgData = canvas.toDataURL("image/png");
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const imgProps = pdf.getImageProperties(imgData);
        const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
        
        pdf.setFontSize(18);
        pdf.setTextColor(15, 23, 42);
        pdf.text("EXECUTIVE QUALITY REPORT", 20, 20);
        pdf.setFontSize(10);
        pdf.text(`Generated: ${timestamp} | Auth: ${currentUser?.full_name || currentUser?.email}`, 20, 28);
        
        pdf.addImage(imgData, "PNG", 5, 35, pdfWidth - 10, Math.min(pdfHeight, 240));
      }

      // PAGE 2: FULL DATA LEDGER (LANDSCAPE)
      pdf.addPage("a4", "l");
      const ledgerElement = document.getElementById("full-data-ledger-export");
      if (ledgerElement) {
        const canvas = await html2canvas(ledgerElement, {
          scale: 2,
          useCORS: true,
          backgroundColor: "#0f172a",
          logging: false,
          onclone: (clonedDoc) => {
            const root = clonedDoc.documentElement;
            root.classList.add('export-mode');
            const el = clonedDoc.getElementById("full-data-ledger-export");
            if (el) el.style.display = "block";
            
            const shield = clonedDoc.createElement('style');
            shield.innerHTML = `
              * { oklch: none !important; oklab: none !important; --oklab: none !important; --oklch: none !important; }
              table { width: 100% !important; font-size: 8px !important; color: #f1f5f9 !important; border-collapse: collapse !important; }
              th, td { border: 1px solid #334155 !important; padding: 4px !important; }
              th { background-color: #1e293b !important; color: #3b82f6 !important; }
            `;
            clonedDoc.head.appendChild(shield);
          }
        });

        const imgData = canvas.toDataURL("image/png");
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const imgProps = pdf.getImageProperties(imgData);
        const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
        pdf.addImage(imgData, "PNG", 10, 10, pdfWidth - 20, Math.min(pdfHeight, 190));
      }

      pdf.save(`Governance-Report-Full-${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (err) {
      console.error("Full Report Export failure:", err);
    } finally {
      setIsExporting(false);
    }
  };

  const drillDownData = useMemo(() => {
    if (!drilldownType) return [];
    
    // SSOT: All drilldowns should respect current filters and matrix view
    const base = activeSplitData;

    switch(drilldownType) {
      case "all": return validData; // Special case for global ledger drilldown
      case "bugs": return validData.filter(isBug);
      case "cr": return validData.filter(isCR);
      case "score": return base.filter(b => b.bugScore > 0);
      case "missing": return bugs.filter(b => isPeriodeMissing(b.periode)); // Full inventory for missing audit
      case "unmapped": return validData.filter(b => normalizeStatus(b.statusDev) === "UNMAPPED");
      case "severity_filter": return base.filter(b => b.severity === drilldownValue);
      case "trend_filter": return base.filter(b => b.periode === drilldownValue);
      case "variance_filter": return base.filter(b => b.periode === drilldownValue);
      default: return [];
    }
  }, [drilldownType, drilldownValue, activeSplitData, validData, bugs]);

  const handleSectionExport = async (targetId: string, filename: string = "Dashboard-Capture") => {
    setIsExporting(true);
    const element = document.getElementById(targetId);
    if (!element) {
      setIsExporting(false);
      return;
    }

    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#0f172a",
        logging: false,
        onclone: (clonedDoc) => {
          const root = clonedDoc.documentElement;
          root.classList.add('export-mode');
          const shield = clonedDoc.createElement('style');
          shield.innerHTML = "* { oklch: none !important; oklab: none !important; --oklab: none !important; --oklch: none !important; --tw-shadow: 0 0 #0000 !important; } .no-export { display: none !important; }";
          clonedDoc.head.appendChild(shield);
        }
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const imgProps = pdf.getImageProperties(imgData);
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

      pdf.addImage(imgData, "PNG", 5, 5, pdfWidth - 10, Math.min(pdfHeight, 287));
      pdf.save(`${filename}-${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (err) {
      console.error("Section Export failure:", err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleMatrixExport = () => {
    handleSectionExport("chart-matrix-group", "Personnel-Severity-Matrix");
  };

  const exportSpecificData = async (data: BugRecord[], filename: string) => {
    // Export with high-fidelity comprehensive reports using exceljs
    await exportComprehensiveExcel(data);
  };

  const addManualRecord = async (newBug: Partial<BugRecord>) => {
    if (!isSupabaseConfigured) {
      setBugs([newBug as BugRecord, ...bugs]);
      return;
    }

    try {
      const bugWithAudit = {
        ...newBug,
        last_edited_at: new Date().toISOString(),
        last_edited_by: currentUser?.full_name || currentUser?.email || "Manual Entry"
      };

      const { data, error } = await supabase
        .from('bugs')
        .insert([bugWithAudit])
        .select();

      if (error) throw error;
      if (data) {
        setBugs([data[0] as BugRecord, ...bugs]);
      }
    } catch (err) {
      console.error("Error adding record:", err);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (!currentUser) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden text-gray-850 font-sans bg-[#F8F9FC] relative">
      {/* Background Mesh Gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500/5 blur-[120px] rounded-full pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-500/5 blur-[120px] rounded-full pointer-events-none"></div>

      {/* HIDDEN EXPORT ELEMENTS */}
      <div id="full-data-ledger-export" className="hidden fixed -left-[9999px] top-0 w-[1100px] bg-slate-950 p-10">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-white mb-1">DATA QUALITY LEDGER (FULL AUDIT)</h2>
          <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Wisesa Governance Command Center | {format(new Date(), 'dd-MMM-yyyy HH:mm')}</p>
        </div>
        <table className="w-full border-collapse border border-slate-800">
          <thead>
            <tr className="bg-slate-900">
              <th className="border border-slate-800 p-2 text-[10px] font-bold text-blue-500 uppercase">No</th>
              <th className="border border-slate-800 p-2 text-[10px] font-bold text-blue-500 uppercase">Project</th>
              <th className="border border-slate-800 p-2 text-[10px] font-bold text-blue-500 uppercase">Dev</th>
              <th className="border border-slate-800 p-2 text-[10px] font-bold text-blue-500 uppercase">Impact</th>
              <th className="border border-slate-800 p-2 text-[10px] font-bold text-blue-500 uppercase">Status</th>
              <th className="border border-slate-800 p-2 text-[10px] font-bold text-blue-500 uppercase">Period</th>
              <th className="border border-slate-800 p-2 text-[10px] font-bold text-blue-500 uppercase">Last Updated</th>
              <th className="border border-slate-800 p-2 text-[10px] font-bold text-blue-500 uppercase">Updated By</th>
            </tr>
          </thead>
          <tbody>
            {filteredBugs.map((bug, idx) => (
              <tr key={bug.id || `export-${idx}`} className={idx % 2 === 0 ? "bg-slate-950" : "bg-slate-900/30"}>
                <td className="border border-slate-800 p-2 text-[10px] text-slate-300">{bug.no}</td>
                <td className="border border-slate-800 p-2 text-[10px] text-white font-bold">{bug.projectName}</td>
                <td className="border border-slate-800 p-2 text-[10px] text-slate-100">{bug.devName}</td>
                <td className="border border-slate-800 p-2 text-[10px] text-slate-300">{bug.severity}</td>
                <td className="border border-slate-800 p-2 text-[10px] text-slate-300">{bug.statusDev}</td>
                <td className="border border-slate-800 p-2 text-[10px] text-slate-300">{bug.periode}</td>
                <td className="border border-slate-800 p-2 text-[10px] text-slate-400">
                  {bug.last_edited_at ? format(new Date(bug.last_edited_at), 'dd-MMM-yyyy HH:mm') : 'INITIAL'}
                </td>
                <td className="border border-slate-800 p-2 text-[10px] text-slate-400">{bug.last_edited_by || 'System'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-1 overflow-hidden relative z-10 p-6 gap-6">
        {/* Sidebar */}
        <aside className={cn(
          "bg-white border border-gray-200 rounded-3xl flex flex-col p-6 transition-all duration-500 shadow-sm relative overflow-hidden group/sidebar shrink-0",
          isSidebarCollapsed ? "w-20" : "w-64"
        )}>
          {/* Logo Section */}
            <div className={cn("flex items-center gap-3 mb-10 transition-all", isSidebarCollapsed && "justify-center")}>
            <div className="w-8 h-8 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl shadow-md shrink-0" />
            {!isSidebarCollapsed && (
              <span className="text-lg md:text-xl font-bold tracking-tight text-gray-900 text-wrap break-words leading-tight">Wisesa Bug Tracker</span>
            )}
          </div>
          
          <nav className="flex-1 space-y-2">
            <NavItem 
              active={activeTab === "overview"} 
              icon={<LayoutDashboard />} 
              label="Overview" 
              onClick={() => setActiveTab("overview")}
              collapsed={isSidebarCollapsed}
            />
            <NavItem 
              active={activeTab === "leaderboard"} 
              icon={<Users />} 
              label="Personel Audit" 
              onClick={() => setActiveTab("leaderboard")}
              collapsed={isSidebarCollapsed}
            />
            <NavItem 
              active={activeTab === "data"} 
              icon={<Database />} 
              label="Bug Issues" 
              onClick={() => setActiveTab("data")}
              collapsed={isSidebarCollapsed}
            />
            <NavItem 
              active={activeTab === "tree"} 
              icon={<Layers />} 
              label="List Bug" 
              onClick={() => setActiveTab("tree")}
              collapsed={isSidebarCollapsed}
            />
            {currentUser?.role === "super_admin" && (
              <>
                <NavItem 
                  active={activeTab === "controls"} 
                  icon={<Settings />} 
                  label="Config" 
                  onClick={() => setActiveTab("controls")}
                  collapsed={isSidebarCollapsed}
                />
                <NavItem 
                  active={activeTab === "audit"} 
                  icon={<History />} 
                  label="Log Audit" 
                  onClick={() => setActiveTab("audit")}
                  collapsed={isSidebarCollapsed}
                />
                <NavItem 
                  active={activeTab === "trash"} 
                  icon={<Trash2 className="w-5 h-5" />} 
                  label="Archive / Trash" 
                  onClick={() => setActiveTab("trash")}
                  collapsed={isSidebarCollapsed}
                />
              </>
            )}
          </nav>

          <div className="mt-auto pt-6 border-t border-gray-100 space-y-4">
            <button 
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className={cn(
                "flex items-center gap-3 w-full p-3 rounded-xl transition-all hover:bg-gray-50 text-gray-500 group",
                isSidebarCollapsed && "justify-center"
              )}
            >
              {isSidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
              {!isSidebarCollapsed && <span className="text-[10px] font-bold uppercase tracking-widest group-hover:text-gray-900">Collapse View</span>}
            </button>

            <div className={cn("flex items-center gap-3", isSidebarCollapsed && "justify-center")}>
              <div className="w-10 h-10 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center shrink-0 overflow-hidden">
                <User className="w-6 h-6 text-gray-500" />
              </div>
              {!isSidebarCollapsed && (
                <div className="overflow-hidden">
                  <p className="text-sm font-semibold text-gray-900 truncate">{currentUser.full_name || "Fachrul Wisnu"}</p>
                  <p className="text-[10px] text-gray-400 truncate uppercase font-bold tracking-widest">{currentUser.role === 'super_admin' ? 'Master Admin' : 'Editor'}</p>
                </div>
              )}
            </div>
            
            <button 
              onClick={handleLogout}
              className={cn(
                "flex items-center gap-3 w-full p-3 rounded-xl transition-all hover:bg-rose-50 text-gray-500 hover:text-rose-600",
                isSidebarCollapsed && "justify-center"
              )}
            >
              <LogOut className="w-5 h-5" />
              {!isSidebarCollapsed && <span className="text-[10px] font-bold uppercase tracking-widest">Logout</span>}
            </button>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col gap-6 overflow-hidden overflow-x-hidden relative p-2">
          {/* Header Controls */}
          <header className="flex flex-col xl:flex-row flex-wrap items-start xl:items-center justify-between gap-4 px-2 py-4 xl:py-0 shrink-0 min-h-[4rem] border-b border-gray-150 w-full mb-2 bg-white rounded-3xl p-6 shadow-xs">
            <div className="flex flex-wrap items-center gap-4">
              {/* Group 1: Date Pickers */}
              <div className="bg-white border border-gray-200 rounded-2xl px-5 py-2 flex items-center gap-8 shadow-xs flex-shrink-0 text-gray-800">
                 <div className="flex items-center gap-6 border-r border-gray-100 pr-6">
                    <MonthPickerPopover 
                       label="START PERIOD" 
                       value={startPeriod} 
                       onChange={handleStartPeriodChange} 
                    />
                 </div>
                 <div className="flex items-center gap-6">
                    <MonthPickerPopover 
                       label="END PERIOD" 
                       value={endPeriod} 
                       onChange={handleEndPeriodChange} 
                    />
                 </div>
              </div>
              
              {/* Group 2: Global DB Index */}
              <div className="flex items-center gap-3 border-l border-gray-200 pl-6 h-auto xl:h-10 flex-shrink-0">
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest leading-none mb-1.5 opacity-80">Global Core Index</span>
                  <div className="flex items-center flex-wrap gap-2">
                    <div className="flex items-center gap-1.5 bg-gray-55 border border-gray-200 px-2.5 py-1 rounded-lg">
                      <span className="text-[9px] font-bold text-gray-500 uppercase tracking-tighter">SIT:</span>
                      <span className="text-[10px] font-bold text-gray-900 tabular-nums">{globalUnfilteredMetrics.totalVolume}</span>
                    </div>
                    <div className="flex items-center gap-1.5 bg-gray-55 border border-gray-200 px-2.5 py-1 rounded-lg">
                      <span className="text-[9px] font-bold text-cyan-600 uppercase tracking-tighter">CR:</span>
                      <span className="text-[10px] font-bold text-cyan-700 tabular-nums">{globalUnfilteredMetrics.changeRequests}</span>
                    </div>
                    <div className="flex items-center gap-1.5 bg-gray-55 border border-gray-200 px-2.5 py-1 rounded-lg">
                      <span className="text-[9px] font-bold text-amber-600 uppercase tracking-tighter">UNMAPPED:</span>
                      <span className="text-[10px] font-bold text-amber-700 tabular-nums">{globalUnfilteredMetrics.unmappedProjects}</span>
                    </div>
                    <div className="flex items-center gap-1.5 bg-gray-55 border border-gray-200 px-2.5 py-1 rounded-lg">
                      <span className="text-[9px] font-bold text-red-650 uppercase tracking-tighter">DEV STATUS:</span>
                      <span className="text-[10px] font-bold text-red-650 tabular-nums">{globalUnfilteredMetrics.missingDevStatus}</span>
                    </div>
                    <div className="flex items-center gap-1.5 bg-gray-55 border border-gray-200 px-2.5 py-1 rounded-lg">
                      <span className="text-[9px] font-bold text-rose-650 uppercase tracking-tighter">ORPHANED:</span>
                      <span className="text-[10px] font-bold text-rose-700 tabular-nums">{globalUnfilteredMetrics.orphanedPeriods}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 border-l border-gray-200 pl-4 h-10">
                <RefreshCcw className={cn("w-4 h-4 text-gray-400 cursor-pointer hover:text-indigo-650 transition-colors", loading && "animate-spin")} onClick={loadData} />
                <span className="text-[10px] font-bold text-gray-450 uppercase tracking-widest tabular-nums">{loading ? "Syncing..." : `v6.0 (Compliance) | ${lastSync}`}</span>
              </div>
            </div>

            {/* Group 3: Actions */}
            <div className="flex items-center gap-4 w-full xl:w-auto flex-1 justify-end font-semibold">
               <div className="flex gap-2 flex-shrink-0">
                 <button 
                  onClick={() => setIsImportModalOpen(true)}
                  className="h-10 px-4 bg-[#2B3674] hover:bg-[#1a2147] rounded-xl text-[10px] font-bold uppercase tracking-widest text-white shadow-xs transition-all flex items-center gap-2 active:scale-95"
                 >
                   <FileUp className="w-4 h-4" />
                   Bulk Import
                 </button>
                 <button 
                  onClick={handleFullDashboardExport}
                  disabled={isExporting}
                  className="h-10 px-4 bg-gray-55 border border-gray-200 hover:bg-gray-100/90 rounded-xl text-[10px] font-bold uppercase tracking-widest text-gray-700 transition-all flex items-center gap-2"
                 >
                   {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
                   Report
                 </button>
                 {currentUser.role === 'super_admin' && (
                    <button 
                      onClick={() => setIsManualModalOpen(true)}
                      className="h-10 px-4 bg-indigo-600 hover:bg-indigo-700 rounded-xl text-[10px] font-bold uppercase tracking-widest text-white shadow-xs transition-all flex items-center gap-2 active:scale-95"
                    >
                      <Plus className="w-4 h-4" />
                      Add record
                    </button>
                 )}
               </div>
            </div>
          </header>

          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="flex-1 flex flex-col h-full overflow-hidden"
            >
              {activeTab === "overview" && (
                <div className="flex-1 flex flex-col gap-6 overflow-y-auto scrollbar-hide">
                  {/* Header Stats */}
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-4">
                    <StatCard 
                      title="TOTAL SIT LEDGER" 
                      value={sitTotalVolume} 
                      icon={<Database />}
                      color="blue"
                      onClick={() => setDrilldownType("all")}
                      clickable
                      subtitle="Data: Bugs + CR + Others"
                    />
                    <StatCard 
                      title="TOTAL BUG" 
                      value={bugsCount} 
                      icon={<BugIcon />}
                      color="orange"
                      onClick={() => setDrilldownType("bugs")}
                      clickable
                      subtitle="Data: Type contains 'BUG'"
                    />
                    <StatCard 
                      title="TOTAL CHANGE REQUEST" 
                      value={crCount} 
                      icon={<RefreshCcw className="w-5 h-5" />}
                      color="emerald"
                      onClick={() => setDrilldownType("cr")}
                      clickable
                      subtitle="Data: Type 'CR' or 'Change Request'"
                    />
                    <StatCard 
                      title="PENALTY SCORE" 
                      value={totalFilteredScore.toFixed(1)} 
                      icon={<TrendingDown />}
                      color="rose"
                      onClick={() => setDrilldownType("score")}
                      clickable
                    />
                    <StatCard 
                       title="ORPHANED" 
                       value={missingPeriodsCount} 
                       icon={<Calendar />}
                       color="rose"
                       onClick={() => setIsOrphanedModalOpen(true)}
                       clickable
                    />
                    <StatCard 
                      title="UNMAPPED" 
                      value={unmappedStatusCount} 
                      icon={<AlertTriangle />}
                      color="amber"
                      onClick={() => setDrilldownType("unmapped")}
                      clickable
                    />
                    <StatCard 
                      title="CRITICAL RISK" 
                      value={topOffender.split(' ')[0] || "N/A"} 
                      icon={<User />}
                      color="purple"
                      onClick={() => {
                        const offender = devStats[0];
                        if (offender) setSelectedDev(offender.devName);
                      }}
                      clickable
                    />
                  </div>

                  {/* List Bug Section (Full Width / 100%) - TEPAT DI BAWAH SUMMARY CARDS */}
                  <div id="project-tree-hierarchy-section" className="w-full">
                    <div className="mb-3 px-1">
                      <h2 className="text-sm font-bold text-[#2B3674] tracking-widest uppercase">List Bug</h2>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Hierarchical visualization grouped by Project Name</p>
                    </div>
                    <ProjectTreeView bugs={activeSplitData} isCompact={false} />
                  </div>

                  {/* Intermediate Sections */}
                  <FSDGovernanceTracker 
                    bugFSD={fsdMetrics.bugFSD}
                    bugNoFSD={fsdMetrics.bugNoFSD}
                    crFSD={fsdMetrics.crFSD}
                    crNoFSD={fsdMetrics.crNoFSD}
                  />

                  <div id="executive-overview-content" className="space-y-6">
                    <div className="flex items-center justify-between bg-slate-900/60 p-4 rounded-2xl border border-white/5 backdrop-blur-md">
                      <div className="flex items-center gap-4">
                        <div className="w-1.5 h-6 bg-indigo-500 rounded-full" />
                        <div>
                          <h3 className="text-xs font-black text-white uppercase tracking-widest">Personnel & Severity Matrix</h3>
                          <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">Isolated performance audit layer</p>
                        </div>
                      </div>
                      <div className="flex bg-slate-950/80 p-1.5 rounded-xl border border-white/5">
                        <button 
                          onClick={() => setMatrixViewType('BUG')}
                          className={cn(
                            "px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                            matrixViewType === 'BUG' 
                              ? "bg-orange-500/20 text-orange-400 border border-orange-500/30 shadow-lg shadow-orange-500/10" 
                              : "text-slate-500 hover:text-slate-300"
                          )}
                        >
                          BUG View
                        </button>
                        <button 
                          onClick={() => setMatrixViewType('CR')}
                          className={cn(
                            "px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                            matrixViewType === 'CR' 
                              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-lg shadow-emerald-500/10" 
                              : "text-slate-500 hover:text-slate-300"
                          )}
                        >
                          CR View
                        </button>
                      </div>
                    </div>

                    <DashboardCharts 
                      matrixViewType={matrixViewType}
                      devStats={matrixDevStats} 
                      allBugs={activeSplitData}
                      unfilteredBugs={cleanTotalBugs} 
                      selectedSeverity={severityFilter}
                      onChartClick={handleChartClick}
                      onExportPDF={handleSectionExport}
                      onExportMatrix={handleMatrixExport}
                      isExporting={isExporting}
                    />
                    
                    <ExecutivePerformance 
                      matrixViewType={matrixViewType}
                      devStats={matrixDevStats}
                      onDevClick={(dev) => setSelectedDev(dev)} 
                      onExportPDF={handleSectionExport}
                      isExporting={isExporting}
                    />

                    {/* Main Data Table utama (100% width) - PALING BAWAH */}
                    <div className="space-y-6 mt-6 pb-20">
                      <div id="live-governance-ledger-section" className="w-full bg-white border border-gray-200 rounded-3xl shadow-xs overflow-hidden flex flex-col">
                        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-white">
                          <div>
                            <h2 className="text-sm font-bold text-[#2B3674] tracking-widest uppercase">Live Governance Ledger</h2>
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">Real-time SIT audit synchronization</p>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="text-[10px] font-bold text-[#2B3674] bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100 uppercase tracking-widest">
                              {filteredBugs.length} Records Loaded
                            </span>
                          </div>
                        </div>
                        <div className="p-4 bg-white overflow-auto">
                          <DataTable 
                            bugs={activeSplitData}
                            dark={false}
                            hideFilters={false}
                            matrixViewType={matrixViewType}
                            currentUser={currentUser}
                            onUpdateBug={handleUpdateBug}
                            onDeleteBug={handleSoftDeleteBug}
                            onViewDetail={(bug) => setSelectedBugForDetail(bug)}
                            isExporting={isExporting}
                            className="border-0 rounded-none bg-white text-gray-800"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "leaderboard" && (
                <Leaderboard 
                  devStats={devStats} 
                  lastSync={lastSync} 
                  onDevClick={(dev) => setSelectedDev(dev)}
                />
              )}

              {activeTab === "data" && (
                <div className="flex-1 flex flex-col min-h-0 bg-[#0B1120] rounded-2xl overflow-hidden border border-slate-800">
                  <DataTable 
                    bugs={activeSplitData}
                    dark
                    matrixViewType={matrixViewType}
                    currentUser={currentUser}
                    onUpdateBug={handleUpdateBug}
                    onDeleteBug={handleSoftDeleteBug}
                    onRestoreBug={handleRestoreBug}
                    onViewDetail={(bug) => setSelectedBugForDetail(bug)}
                    isExporting={isExporting}
                    onExportExcel={exportToExcel}
                    onExportPDF={handleSectionExport}
                    className="border-0 rounded-none h-full"
                  />
                </div>
              )}

              {activeTab === "tree" && (
                <div className="flex-1 flex flex-col min-h-0 bg-[#0B1120] rounded-2xl overflow-hidden border border-slate-800">
                  <ProjectTreeView bugs={activeSplitData} />
                </div>
              )}

              {currentUser.role === "super_admin" && (
                <>
                  {activeTab === "controls" && (
                    <GlobalControls 
                      profiles={profiles}
                      onUpdate={updateProfile}
                      onDelete={deleteProfile}
                      onCreate={createProfile}
                    />
                  )}

                  {activeTab === "audit" && (
                     <AuditLog logs={auditLogs} />
                  )}

                  {activeTab === "trash" && (
                    <div className="flex-1 flex flex-col min-h-0">
                      <div className="px-8 py-6 border-b border-white/5 flex items-center justify-between">
                         <div>
                            <h2 className="text-xl font-bold text-white tracking-tight">Audit Trail / Soft Delete Log</h2>
                            <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mt-1">Recovery terminal for recently removed SIT records</p>
                         </div>
                         <div className="flex items-center gap-3">
                            <span className="text-[10px] font-black text-indigo-400 bg-indigo-500/10 px-3 py-1.5 rounded-lg border border-indigo-500/20 uppercase tracking-widest">
                               {trashBugs.length} Records in Buffer
                            </span>
                         </div>
                      </div>
                      <DataTable 
                        bugs={trashBugs} 
                        dark 
                        isTrashView
                        currentUser={currentUser}
                        onRestoreBug={handleRestoreBug}
                        onViewDetail={setSelectedBugForDetail}
                        className="flex-1 rounded-none border-0"
                      />
                    </div>
                  )}
                </>
              )}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

    {/* Modals are handled below main content */}
    <AnimatePresence>
      {drilldownType && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-md">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-slate-900 w-[95vw] h-[90vh] rounded-[2.5rem] border border-slate-800 shadow-2xl overflow-hidden flex flex-col"
          >
            <div className="p-8 border-b border-slate-800 flex items-center justify-between bg-slate-900/50 shrink-0">
              <div>
                <h2 className="text-3xl font-display font-bold text-white tracking-tight">
                  {drilldownType === "all" && "SIT Global Ledger"}
                  {drilldownType === "bugs" && "Defect Audit Trail"}
                  {drilldownType === "cr" && "SIT Global Ledger: Change Requests"}
                  {drilldownType === "score" && "Governance Quality Audit"}
                  {drilldownType === "missing" && "Orphaned Records Audit"}
                  {drilldownType === "unmapped" && "Normalization Failure Audit"}
                  {drilldownType === "severity_filter" && `Severity Audit: ${drilldownValue}`}
                  {drilldownType === "trend_filter" && `Temporal Audit: ${drilldownValue}`}
                  {drilldownType === "variance_filter" && `Issue Type Variance: ${drilldownValue}`}
                </h2>
                <p className="text-slate-500 text-[10px] mt-1 uppercase font-black tracking-widest">
                  KPI Drill-down Terminal • Access Level: Master superadmin
                </p>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center bg-slate-800 border border-slate-700 divide-x divide-slate-700 rounded-xl">
                   <button 
                    onClick={() => {
                      if (drilldownType === "variance_filter") {
                        const monthData = drillDownData.filter(matrixViewType === 'CR' ? isCR : isBug);
                        exportSpecificData(monthData, `Variance-Audit-${matrixViewType}-${drilldownValue}`);
                        return;
                      }

                      exportSpecificData(drillDownData, `Drilldown-${drilldownType}`);
                    }}
                    className="flex items-center gap-2 px-4 py-2 text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-white transition-all"
                  >
                    <Download className="w-3.5 h-3.5" />
                    {drilldownType === "variance_filter" ? "Export Data" : "Export Excel"}
                  </button>
                  <button 
                    onClick={() => handleSectionExport("drilldown-content", `Drilldown-${drilldownType}`)}
                    className="flex items-center gap-2 px-4 py-2 text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-white transition-all"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    Export PDF
                  </button>
                </div>
                <button 
                  onClick={() => {
                    setDrilldownType(null);
                    setDrilldownValue(null);
                  }}
                  className="p-3 bg-slate-700 hover:bg-slate-600 rounded-2xl transition-colors text-white"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
            
            <div id="drilldown-content" className="flex-1 min-h-0 bg-slate-950 p-0 flex flex-col overflow-y-auto">
              {drilldownType === "variance_filter" ? (
                <div className="flex flex-col h-full">
                  <div className="flex-1 min-h-[400px] flex flex-col">
                    <div className="px-8 py-4 bg-slate-900/30 flex items-center gap-3">
                      <div className={cn("w-1.5 h-4 rounded-full", matrixViewType === 'CR' ? "bg-emerald-500" : "bg-orange-500")} />
                      <h3 className="text-sm font-black uppercase tracking-widest text-slate-400">
                        Detailed {matrixViewType === 'CR' ? "Change Request" : "Bug"} Records ({drilldownValue})
                      </h3>
                    </div>
                    <div className="flex-1 min-h-0">
                      <DataTable 
                        bugs={drillDownData} 
                        dark 
                        hideFilters
                        matrixViewType={matrixViewType}
                        className="h-full rounded-none border-0"
                        currentUser={currentUser}
                        onUpdateBug={handleUpdateBug}
                        onViewDetail={setSelectedBugForDetail}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <DataTable 
                  bugs={drillDownData} 
                  dark 
                  hideFilters
                  className="flex-1 rounded-none border-0"
                  currentUser={currentUser}
                  onUpdateBug={handleUpdateBug}
                  onViewDetail={setSelectedBugForDetail}
                />
              )}
            </div>

            {/* Drilldown Footer with Volume Counter */}
            <div className="px-8 py-4 bg-slate-900 border-t border-slate-800 flex items-center justify-between shrink-0">
               <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                     <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Aggregate Status</span>
                     <div className="h-1 w-1 bg-slate-700 rounded-full" />
                     <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">LIVE DATA TERMINAL</span>
                  </div>
               </div>
               <div className="bg-slate-950 px-4 py-2 rounded-xl flex items-center gap-3 border border-slate-800/50">
                  <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(99,102,241,0.5)]" />
                  <span className="text-xs font-black text-white uppercase tracking-widest">
                    VOLUME: {drillDownData.length} ISSUES
                  </span>
               </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>

    <AnimatePresence>
      {selectedDev && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 overflow-hidden">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedDev(null)}
            className="fixed inset-0 bg-slate-950/90 backdrop-blur-md"
          />
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="relative z-[10000] bg-slate-900 w-[95vw] h-[90vh] rounded-[2.5rem] border border-slate-800 shadow-2xl overflow-hidden flex flex-col"
          >
            <div className="p-8 border-b border-slate-800 flex items-center justify-between bg-slate-900/50 shrink-0">
              <div>
                <h2 className="text-3xl font-display font-bold text-white tracking-tight">Detail Issues: {selectedDev}</h2>
                <p className="text-slate-500 text-[10px] mt-1 uppercase font-black tracking-widest">Incident History Drill-down • Access Level: Master superadmin</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center bg-slate-800 border border-slate-700 divide-x divide-slate-700 rounded-xl">
                   <button 
                    onClick={() => {
                      const data = activeSplitData.filter(b => b.devName === selectedDev);
                      exportSpecificData(data, `Dev-Audit-${selectedDev}`);
                    }}
                    className="flex items-center gap-2 px-4 py-2 text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-white transition-all"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Export Excel
                  </button>
                  <button 
                    onClick={() => handleSectionExport("dev-drilldown-content", `Dev-Audit-${selectedDev}`)}
                    className="flex items-center gap-2 px-4 py-2 text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-white transition-all"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    Export PDF
                  </button>
                </div>
                <button 
                  onClick={() => setSelectedDev(null)}
                  className="p-3 bg-slate-700 hover:bg-slate-600 rounded-2xl transition-colors text-white"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
            <div id="dev-drilldown-content" className="flex-1 min-h-0 bg-slate-950 p-0 flex flex-col">
              <DataTable 
                bugs={activeSplitData.filter(b => b.devName === selectedDev)} 
                dark 
                hideFilters
                matrixViewType={matrixViewType}
                className="flex-1 rounded-none border-0"
                currentUser={currentUser}
                onUpdateBug={handleUpdateBug}
                onDeleteBug={handleSoftDeleteBug}
                onViewDetail={setSelectedBugForDetail}
              />
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>

    <AnimatePresence>
      {recordToDelete && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setRecordToDelete(null)}
            className="fixed inset-0 bg-slate-950/90 backdrop-blur-md"
          />
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="relative z-[10001] bg-slate-900 border border-slate-800 w-full max-w-md rounded-[2.5rem] overflow-hidden shadow-2xl p-10"
          >
            <div className="flex flex-col items-center text-center">
              <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mb-6 border border-red-500/30">
                <Trash2 className="w-10 h-10 text-red-500" />
              </div>
              <h3 className="text-2xl font-bold text-white tracking-tight mb-3">Commit to Archive?</h3>
              <p className="text-slate-400 text-sm leading-relaxed mb-10">
                Record <span className="text-white font-bold">#{recordToDelete.no}</span> will be moved to the Trash terminal. This action is reversible but will remove the item from all active SIT ledgers.
              </p>
              
              <div className="flex gap-4 w-full">
                <button 
                  onClick={() => setRecordToDelete(null)}
                  className="flex-1 h-12 rounded-2xl bg-slate-800 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={confirmDeleteBug}
                  className="flex-1 h-12 rounded-2xl bg-red-600 text-[10px] font-black uppercase tracking-widest text-white shadow-lg shadow-red-500/20 hover:bg-red-500 transition-all active:scale-95"
                >
                  Confirm Delete
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>

    <AnimatePresence>
      {isOrphanedModalOpen && (
        <OrphanedDashboardModal 
          isOpen={isOrphanedModalOpen}
          onClose={() => setIsOrphanedModalOpen(false)}
          orphanedData={bugs.filter(b => isPeriodeMissing(b.periode))}
        />
      )}
    </AnimatePresence>

    <AnimatePresence>
      {isImportModalOpen && (
        <ExcelImport 
          isOpen={isImportModalOpen}
          onClose={() => setIsImportModalOpen(false)}
          onDataLoaded={() => {
            loadData();
            setIsImportModalOpen(false);
          }}
        />
      )}
    </AnimatePresence>

    <AnimatePresence>
      {isManualModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 overflow-hidden">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsManualModalOpen(false)}
            className="fixed inset-0 bg-slate-950/90 backdrop-blur-md"
          />
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="relative z-[10000] bg-[#0f172a] w-full max-w-4xl rounded-2xl border border-slate-800 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
          >
            <div className="bg-slate-950 p-8 text-white flex items-center justify-between shrink-0 border-b border-slate-800">
              <div>
                <h2 className="text-2xl font-display font-bold tracking-tight">Manual Bug Log Entry</h2>
                <p className="text-slate-500 text-sm mt-1 font-medium">Capture SIT issues directly into database</p>
              </div>
              <button 
                onClick={() => setIsManualModalOpen(false)}
                className="w-12 h-12 flex items-center justify-center bg-slate-800 hover:bg-slate-700 rounded-2xl transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form className="p-10 space-y-8 overflow-y-auto" onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const sev = formData.get("severity") as string;
              
      const newBug: Partial<BugRecord> = {
                no: `MAN-${Date.now().toString().slice(-6)}`,
                sectionName: formData.get("sectionName") as string,
                projectName: formData.get("projectName") as string,
                typeTesting: formData.get("typeTesting") as string,
                discoveryDate: new Date().toISOString(),
                type: formData.get("type") as string,
                severity: sev,
                includedInFsd: formData.get("includedInFsd") as string,
                remarks: formData.get("remarks") as string,
                screenshot: "",
                statusPic: formData.get("statusPic") as string,
                devName: formData.get("devName") as string,
                startDate: sanitizeTimestamp(formData.get("startDate")),
                finishAt: sanitizeTimestamp(formData.get("finishAt")),
                responseDev: formData.get("responseDev") as string,
                statusDev: formData.get("statusDev") as string,
                sitRealizedDate: sanitizeTimestamp(formData.get("sitRealizedDate")),
                periode: formData.get("periode") as string,
                bugScore: SEVERITY_WEIGHTS[sev] || 0,
                total_score: SEVERITY_WEIGHTS[sev] || 0,
                last_updated: null,
                created_by: "Fachrul Wisnu Novianto",
                updated_by: "SYSTEM"
              };
              addManualRecord(newBug);
              setIsManualModalOpen(false);
            }}>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-5">
                 <InputField label="Project Name" name="projectName" required placeholder="e.g. Lending Core" list="projects-dl" />
                 <InputField label="Developer" name="devName" required placeholder="John Doe" list="devs-dl" />
                 <datalist id="projects-dl">
                    {uniqueProjects.map(p => <option key={p} value={p} />)}
                 </datalist>
                 <datalist id="devs-dl">
                    {uniqueDevs.map(d => <option key={d} value={d} />)}
                 </datalist>
                 <SelectField label="Severity" name="severity">
                    {Object.keys(SEVERITY_WEIGHTS).map(s => <option key={s} value={s}>{s}</option>)}
                 </SelectField>
                 <InputField label="Section" name="sectionName" placeholder="e.g. API Gateway" />
                 <SelectField label="Type Testing" name="typeTesting">
                    <option value="Testing PIC">Testing PIC</option>
                    <option value="SIT">SIT</option>
                    <option value="Change Request">Change Request</option>
                    <option value="Temuan After Life">Temuan After Life</option>
                 </SelectField>
                 <SelectField label="Type" name="type">
                    <option value="Bug">Bug</option>
                    <option value="Change Request">Change Request</option>
                 </SelectField>
                 <InputField label="Periode" name="periode" required placeholder="e.g. Jan 2026" />
                 <SelectField label="Included in FSD" name="includedInFsd">
                    <option value="Tidak">Tidak</option>
                    <option value="Ya">Ya</option>
                 </SelectField>
                 <InputField label="Status PIC" name="statusPic" placeholder="e.g. In Review" />
                 <InputField label="Start Date" name="startDate" type="date" />
                 <InputField label="Finish Date" name="finishAt" type="date" />
                 <InputField label="SIT Realized Date" name="sitRealizedDate" type="date" />
                 <InputField label="Status Dev" name="statusDev" placeholder="e.g. Fixed" />
                 <InputField label="Response Dev" name="responseDev" className="lg:col-span-2" placeholder="Dev notes..." />
              </div>
              
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Detailed Remarks</label>
                <textarea name="remarks" required rows={3} className="w-full px-6 py-4 border border-slate-800 rounded-3xl focus:ring-4 focus:ring-blue-500/10 bg-slate-950 transition-all outline-none text-white" placeholder="Elaborate on the defect..." />
              </div>

              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setIsManualModalOpen(false)} className="flex-1 h-10 rounded-xl font-black uppercase tracking-widest bg-slate-800 text-slate-500 hover:bg-slate-700 transition-all text-[10px]">Discard</button>
                <button type="submit" className="flex-[2] h-10 bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-widest rounded-xl shadow-lg shadow-blue-500/20 transition-all active:scale-[0.98] text-[10px]">
                  Commit Record
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>

      {/* View Detail Modal (ROOT LEVEL TRANSPLANT) */}
      <AnimatePresence>
        {selectedBugForDetail && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 overflow-hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedBugForDetail(null)}
              className="fixed inset-0 bg-slate-950/80 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative z-[10000] w-full max-w-4xl max-h-[90vh] bg-[#0f172a] border border-slate-800 rounded-[2rem] shadow-2xl flex flex-col overflow-hidden"
            >
              {/* Modal Header */}
              <div className="p-8 pb-6 border-b border-white/5 flex items-start justify-between bg-slate-950/30 shrink-0">
                <div className="flex gap-4">
                  <div className="w-14 h-14 bg-blue-600/20 border border-blue-500/20 rounded-2xl flex items-center justify-center shrink-0">
                    <BugIcon className="w-7 h-7 text-blue-500" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-display font-bold tracking-tight text-white">
                      {selectedBugForDetail.projectName}
                    </h2>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-blue-500 text-[10px] font-black uppercase tracking-widest px-2 py-0.5 bg-blue-500/10 rounded">
                        LOG NO: {selectedBugForDetail.no}
                      </span>
                      <span className="w-1 h-1 rounded-full bg-slate-700" />
                      <span className="text-slate-500 text-[10px] font-black uppercase tracking-widest">{selectedBugForDetail.sectionName}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  {currentUser.role === 'super_admin' && !isEditingBug && (
                    <button 
                      onClick={() => setIsEditingBug(true)}
                      className="px-5 py-2.5 bg-transparent hover:bg-blue-600/10 border border-blue-500/30 rounded-xl text-blue-500 transition-all active:scale-95 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest"
                    >
                      <Edit3 className="w-4 h-4" />
                      Adjust Data
                    </button>
                  )}
                  {isEditingBug && (
                    <button 
                      onClick={handleSaveBugEdit}
                      disabled={isSavingBug}
                      className="px-5 py-2.5 bg-green-600 hover:bg-green-700 border border-green-500/20 rounded-xl text-white transition-all active:scale-95 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest disabled:opacity-50"
                    >
                      {isSavingBug ? <RefreshCcw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      {isSavingBug ? "Persisting..." : "Save Changes"}
                    </button>
                  )}
                  <button 
                    onClick={() => setSelectedBugForDetail(null)}
                    className="p-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-slate-500 transition-all active:scale-90"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Modal Body */}
              <div className="flex-1 overflow-y-auto p-8 pt-6 space-y-8 scrollbar-hide">
                {/* Summary Cards Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <SummaryCard 
                    label="Developer Identity" 
                    value={selectedBugForDetail.devName} 
                    icon={<User className="w-4 h-4" />} 
                    theme="blue" 
                  />
                  <SummaryCard 
                    label="Testing Type" 
                    value={selectedBugForDetail.type} 
                    icon={<Layers className="w-4 h-4" />} 
                    theme={selectedBugForDetail.type === 'Bug' ? 'amber' : 'cyan'} 
                  />
                  <SummaryCard 
                    label="Issue Severity" 
                    value={selectedBugForDetail.severity} 
                    icon={<ShieldAlert className="w-4 h-4" />} 
                    theme="red" 
                  />
                  <SummaryCard 
                    label="Governance Score" 
                    value={String(selectedBugForDetail.bugScore)} 
                    icon={<CheckCircle2 className="w-4 h-4" />} 
                    theme="green" 
                  />
                </div>

                {/* Technical Remarks Box */}
                <div className="space-y-3">
                  <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Technical Remarks & Observations</h4>
                  <div className="p-6 bg-slate-950/40 border border-slate-800/80 rounded-2xl relative group">
                    <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap font-medium">
                      {selectedBugForDetail.remarks || "No technical documentation provided for this anomaly."}
                    </p>
                  </div>
                </div>

                {/* Metadata Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  {/* Left Column: Infrastructure */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                       <BugIcon className="w-3.5 h-3.5 text-blue-500" />
                       <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-500/80">Infrastructure Metadata</h4>
                    </div>
                    <div className="space-y-1.5 p-5 bg-slate-950/20 border border-slate-800/40 rounded-2xl">
                       <MetaRow 
                         label="FSD Included" 
                         value={selectedBugForDetail.includedInFsd} 
                         isEditing={isEditingBug}
                         type="select"
                         options={["Ya", "Tidak"]}
                         editValue={bugEditFields.includedInFsd}
                         onEdit={(val) => setBugEditFields({ ...bugEditFields, includedInFsd: val })}
                       />
                       <MetaRow label="Testing Type" value={selectedBugForDetail.typeTesting} />
                       <MetaRow label="PIC Name" value={selectedBugForDetail.picName || "—"} />
                       <MetaRow 
                         label="Discovery Date" 
                         value={selectedBugForDetail.discoveryDate} 
                         isEditing={isEditingBug}
                         type="date"
                         editValue={bugEditFields.discoveryDate}
                         onEdit={(val) => setBugEditFields({ ...bugEditFields, discoveryDate: val })}
                       />
                       <MetaRow 
                         label="SIT Realization" 
                         value={selectedBugForDetail.sitRealizedDate && selectedBugForDetail.sitRealizedDate !== "-" ? selectedBugForDetail.sitRealizedDate : "Pending Identification"} 
                         isEditing={isEditingBug}
                         type="date"
                         editValue={bugEditFields.sitRealizedDate}
                         onEdit={(val) => setBugEditFields({ ...bugEditFields, sitRealizedDate: val })}
                         highlight={!selectedBugForDetail.sitRealizedDate || selectedBugForDetail.sitRealizedDate === "-"}
                       />
                    </div>
                  </div>

                  {/* Right Column: Traceability */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                       <History className="w-3.5 h-3.5 text-cyan-500" />
                       <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-500/80">Response & Traceability</h4>
                    </div>
                    <div className="space-y-1.5 p-5 bg-slate-950/20 border border-slate-800/40 rounded-2xl relative">
                       <MetaRow 
                        label="Response Dev" 
                        value={selectedBugForDetail.responseDev || "Awaiting Response"} 
                        isEditing={isEditingBug}
                        type="select"
                        options={["DONE", "ON PROGRESS", "ON QUEUE", "PENDING"]}
                        editValue={bugEditFields.responseDev}
                        onEdit={(val) => setBugEditFields({ ...bugEditFields, responseDev: val })}
                       />
                       <MetaRow 
                        label="Status PIC" 
                        value={selectedBugForDetail.statusPic} 
                        isEditing={isEditingBug}
                        type="select"
                        options={["DONE", "ON PROGRESS", "ON QUEUE", "PENDING"]}
                        editValue={bugEditFields.statusPic}
                        onEdit={(val) => setBugEditFields({ ...bugEditFields, statusPic: val })}
                       />
                       <MetaRow 
                        label="Assignment Start" 
                        value={selectedBugForDetail.startDate} 
                        isEditing={isEditingBug}
                        type="date"
                        editValue={bugEditFields.startDate}
                        onEdit={(val) => setBugEditFields({ ...bugEditFields, startDate: val })}
                       />
                       <MetaRow 
                        label="Deployment Finish" 
                        value={selectedBugForDetail.finishAt} 
                        isEditing={isEditingBug}
                        type="date"
                        editValue={bugEditFields.finishAt}
                        onEdit={(val) => setBugEditFields({ ...bugEditFields, finishAt: val })}
                       />

                       {/* Periode Badge Section */}
                       <div className="pt-6 flex justify-end">
                         <div className="flex flex-col items-end">
                           <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest mb-1">Target Periode</span>
                           {isEditingBug ? (
                             <input 
                               value={bugEditFields.periode || ""}
                               onChange={(e) => setBugEditFields({ ...bugEditFields, periode: e.target.value })}
                               placeholder="MMM-yyyy"
                               className="bg-slate-950 border border-blue-500/30 rounded-lg px-3 py-1.5 text-[10px] font-bold text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                             />
                           ) : (
                             <div className={cn(
                               "px-4 py-1.5 rounded-full text-[11px] font-black uppercase tracking-[0.2em] border shadow-lg shadow-blue-500/5",
                               selectedBugForDetail.periode && selectedBugForDetail.periode !== "-" 
                                 ? "bg-blue-600 text-white border-blue-400" 
                                 : "bg-orange-500 text-white border-orange-400"
                             )}>
                               {selectedBugForDetail.periode || "UNASSIGNED"}
                             </div>
                           )}
                         </div>
                       </div>
                    </div>
                   </div>
                </div>
              </div>

              {/* Modal Footer (Audit Metadata) */}
              <div className="px-8 py-5 bg-slate-950/50 border-t border-white/5 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2 group cursor-help">
                   <History className="w-3.5 h-3.5 text-slate-600 group-hover:text-blue-500 transition-colors" />
                   <span className="text-[9px] font-black text-slate-500 group-hover:text-slate-400 uppercase tracking-[0.3em] transition-colors">Audit Metadata</span>
                </div>
                <div className="flex items-center gap-8">
                  <div className="flex flex-col items-end">
                    <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Modified Identity</span>
                    <span className="text-[10px] font-bold text-slate-300">{selectedBugForDetail.last_edited_by || "System Initial"}</span>
                  </div>
                  <div className="w-px h-6 bg-slate-800" />
                  <div className="flex flex-col items-end">
                    <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Chronological Stamp</span>
                    <span className="text-[10px] font-bold text-slate-300">
                      {selectedBugForDetail.last_edited_at ? format(new Date(selectedBugForDetail.last_edited_at), "dd MMM yyyy, HH:mm") : "Genesis State"}
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* User Creation Modal */}
      <AnimatePresence>
        {isCreatingUser && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 overflow-hidden">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCreatingUser(false)}
              className="fixed inset-0 bg-slate-950/90 backdrop-blur-md"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative z-[10000] bg-[#0f172a] w-full max-w-md rounded-2xl border border-slate-800 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
            >
              <div className="p-10 overflow-y-auto scrollbar-hide">
                <h2 className="text-2xl font-display font-bold text-white mb-1">Initialize Analyst</h2>
                <p className="text-slate-500 text-[10px] uppercase font-black tracking-widest mb-8">Grant Terminal Access</p>

                <form onSubmit={async (e) => {
                  e.preventDefault();
                  const fd = new FormData(e.currentTarget);
                  const { error } = await supabase.from("profiles").insert([{
                    full_name: fd.get("full_name"),
                    email: fd.get("email"),
                    password: fd.get("password"),
                    role: fd.get("role")
                  }]);
                  if (!error) {
                    setIsCreatingUser(false);
                    fetchProfiles();
                  } else {
                    alert(error.message);
                  }
                }} className="space-y-4">
                  <InputField label="Full Name" name="full_name" required placeholder="Display Identity" />
                  <InputField label="Email Address" name="email" type="email" required placeholder="auth@wisesa.id" />
                  <InputField label="Security Key" name="password" type="password" required placeholder="••••••••" />
                  <SelectField label="Access Level" name="role">
                    <option value="admin">Standard Analyst</option>
                    <option value="super_admin">Master Superadmin</option>
                  </SelectField>

                  <div className="flex gap-4 pt-6">
                    <button type="button" onClick={() => setIsCreatingUser(false)} className="flex-1 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white transition-colors">Discard</button>
                    <button type="submit" className="flex-[2] bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl text-xs uppercase tracking-widest transition-all">Authorize Profile</button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit User Modal */}
      <AnimatePresence>
        {editingUser && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 overflow-hidden">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingUser(null)}
              className="fixed inset-0 bg-slate-950/90 backdrop-blur-md"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative z-[10000] bg-[#0f172a] w-full max-w-md rounded-2xl border border-slate-800 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
            >
              <div className="p-10 overflow-y-auto scrollbar-hide">
                <h2 className="text-2xl font-display font-bold text-white mb-1">Modify Access</h2>
                <p className="text-slate-500 text-[10px] uppercase font-black tracking-widest mb-8">Update Security Identity</p>

                <form onSubmit={async (e) => {
                  e.preventDefault();
                  const fd = new FormData(e.currentTarget);
                  const { error } = await supabase.from("profiles").update({
                    full_name: fd.get("full_name"),
                    password: fd.get("password"),
                    role: fd.get("role")
                  }).eq("id", editingUser.id);
                  
                  if (!error) {
                    setEditingUser(null);
                    fetchProfiles();
                  } else {
                    alert(error.message);
                  }
                }} className="space-y-4">
                  <InputField label="Full Name" name="full_name" required defaultValue={editingUser.full_name} />
                  <div className="space-y-1.5 opacity-50">
                     <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Email (Immutable)</label>
                     <div className="w-full px-5 h-11 border border-slate-800 rounded-xl bg-slate-800/20 text-slate-400 text-sm flex items-center">{editingUser.email}</div>
                  </div>
                  <InputField label="Security Key" name="password" type="password" required defaultValue={editingUser.password} />
                  <SelectField label="Access Level" name="role" defaultValue={editingUser.role}>
                    <option value="admin">Standard Analyst</option>
                    <option value="super_admin">Master Superadmin</option>
                  </SelectField>

                  <div className="flex gap-4 pt-6">
                    <button type="button" onClick={() => setEditingUser(null)} className="flex-1 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white transition-colors">Abort</button>
                    <button type="submit" className="flex-[2] bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl text-xs uppercase tracking-widest transition-all">Update Identity</button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function FilterChip({ label, onClear }: { label: string, onClear: () => void }) {
  return (
    <div className="flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 px-2.5 py-1 rounded-lg">
      <span className="text-[9px] font-bold text-blue-400 whitespace-nowrap uppercase tracking-tight">{label}</span>
      <button 
        onClick={onClear}
        className="hover:text-white text-blue-500/50 transition-colors"
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  );
}

function NavItem({ active, onClick, icon, label, collapsed }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string, collapsed?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 w-full px-4 py-3 rounded-xl transition-all relative group font-semibold",
        active 
          ? "bg-[#F4F7FE] text-[#2B3674] shadow-2xs" 
          : "text-gray-500 hover:bg-gray-50 hover:text-gray-900",
        collapsed && "justify-center"
      )}
    >
      <div className={cn("shrink-0 transition-transform group-hover:scale-110", active ? "text-[#2B3674]" : "text-gray-400 group-hover:text-gray-905")}>
        {React.cloneElement(icon as React.ReactElement, { className: "w-5 h-5" })}
      </div>
      {!collapsed && <span className="tracking-tight text-sm whitespace-nowrap">{label}</span>}
      {active && !collapsed && (
        <motion.div 
          layoutId="nav-active"
          className="absolute left-0 w-1.5 h-6 bg-[#2B3674] rounded-r-full"
        />
      )}
    </button>
  );
}

function StatCard({ title, value, icon, color, onClick, clickable, subtitle }: { title: string, value: string | number, icon: React.ReactNode, color: string, onClick?: () => void, clickable?: boolean, subtitle?: string }) {
  const colorMap: Record<string, string> = {
    blue: "bg-blue-55 text-blue-605 border border-blue-100",
    orange: "bg-orange-55 text-orange-605 border border-orange-105",
    rose: "bg-rose-55 text-rose-605 border border-rose-105",
    amber: "bg-amber-55 text-amber-700 border border-amber-105",
    purple: "bg-purple-55 text-purple-650 border border-purple-105",
    emerald: "bg-emerald-55 text-emerald-605 border border-emerald-105",
  };

  return (
    <div 
      onClick={onClick}
      className={cn(
        "bg-white border border-gray-200 rounded-2xl p-4 transition-all flex flex-col justify-between group h-[115px] shadow-xs",
        clickable && "cursor-pointer hover:border-gray-350 hover:shadow-sm hover:translate-y-[-1px]"
      )}
    >
      <div>
        <div className="flex items-center gap-2.5">
          <div className={cn("flex items-center justify-center w-8 h-8 rounded-xl shrink-0", colorMap[color] || "bg-gray-55 text-gray-500 border border-gray-150")}>
            {React.cloneElement(icon as React.ReactElement, { className: "w-4 h-4" })}
          </div>
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest line-clamp-1 group-hover:text-gray-950 transition-colors">{title}</p>
        </div>
        <h3 className="text-xl font-bold text-gray-900 mt-2.5 leading-none transition-transform">{value}</h3>
      </div>
      {subtitle && (
        <div className="text-[8px] text-gray-400 font-bold uppercase tracking-wider border-t border-gray-100 pt-1.5 mt-2 line-clamp-1 opacity-95">
          {subtitle}
        </div>
      )}
    </div>
  );
}

function InputField({ label, name, required, placeholder, type = "text", className = "", list }: any) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">{label}</label>
      <input 
        name={name} 
        required={required} 
        type={type}
        list={list}
        className="w-full px-5 h-11 border border-slate-800 rounded-xl focus:ring-4 focus:ring-blue-500/10 bg-slate-950 transition-all outline-none text-white text-sm font-medium placeholder:text-slate-700" 
        placeholder={placeholder} 
      />
    </div>
  );
}

function SelectField({ label, name, children }: any) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">{label}</label>
      <select 
        name={name} 
        className="w-full px-5 h-11 border border-slate-800 rounded-xl focus:ring-4 focus:ring-blue-500/10 bg-slate-950 transition-all outline-none text-white text-sm font-medium appearance-none"
      >
        {children}
      </select>
    </div>
  );
}

function AdminCommand({ label, sub, onClick, isAlert }: { label: string, sub: string, onClick: () => void, isAlert?: boolean }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex items-center justify-between p-5 bg-slate-950/50 border border-slate-800 rounded-2xl hover:bg-slate-800 transition-all text-left group",
        isAlert && "border-red-500/30 bg-red-500/5"
      )}
    >
      <div>
        <div className="text-sm font-bold text-slate-200">{label}</div>
        <div className="text-[10px] text-slate-500 font-bold uppercase tracking-tight mt-1">{sub}</div>
      </div>
      <ChevronRight className={cn("w-4 h-4 text-slate-600 group-hover:text-blue-500 transition-colors", isAlert && "text-red-500")} />
    </button>
  );
}

function FSDGovernanceTracker({ bugFSD, bugNoFSD, crFSD, crNoFSD }: { bugFSD: number, bugNoFSD: number, crFSD: number, crNoFSD: number }) {
  const bugTotal = bugFSD + bugNoFSD || 1;
  const crTotal = crFSD + crNoFSD || 1;
  
  const bugFSDPercent = (bugFSD / bugTotal) * 100;
  const crFSDPercent = (crFSD / crTotal) * 100;

  return (
    <div className="bg-[#0B1120] border border-slate-800 rounded-xl p-5 mb-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Left Column: Bug FSD Compliance */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Bug Root Cause Indicator</h3>
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-tighter">FSD Consistency Audit</span>
          </div>
          <div className="h-4 w-full bg-slate-900 rounded-full overflow-hidden flex shadow-inner">
            <div 
              style={{ width: `${bugFSDPercent}%` }} 
              className="bg-indigo-500 h-full transition-all duration-1000 ease-out" 
            />
            <div 
              style={{ width: `${100 - bugFSDPercent}%` }} 
              className="bg-rose-500 h-full transition-all duration-1000 ease-out" 
            />
          </div>
          <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest">
            <div className="flex items-center gap-2 text-indigo-400">
              <div className="w-2 h-2 bg-indigo-500 rounded-full" />
              Dev Error (In FSD): {bugFSD}
            </div>
            <div className="flex items-center gap-2 text-rose-400">
              PIC Error (No FSD): {bugNoFSD}
              <div className="w-2 h-2 bg-rose-500 rounded-full" />
            </div>
          </div>
        </div>

        {/* Right Column: CR Origin Tracker */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">CR Origin Tracker</h3>
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-tighter">Strategic Impact Audit</span>
          </div>
          <div className="h-4 w-full bg-slate-900 rounded-full overflow-hidden flex shadow-inner">
            <div 
              style={{ width: `${crFSDPercent}%` }} 
              className="bg-emerald-500 h-full transition-all duration-1000 ease-out" 
            />
            <div 
              style={{ width: `${100 - crFSDPercent}%` }} 
              className="bg-amber-500 h-full transition-all duration-1000 ease-out" 
            />
          </div>
          <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest">
            <div className="flex items-center gap-2 text-emerald-400">
              <div className="w-2 h-2 bg-emerald-500 rounded-full" />
              Planned (In FSD): {crFSD}
            </div>
            <div className="flex items-center gap-2 text-amber-400">
              Ad-hoc (No FSD): {crNoFSD}
              <div className="w-2 h-2 bg-amber-500 rounded-full" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DataIntegrityList({ title, icon, bugs, type, onSave }: { title: string, icon: React.ReactNode, bugs: BugRecord[], type: 'periode' | 'status', onSave: (id: string, val: string) => void }) {
  return (
    <div className="flex flex-col bg-slate-900 border border-slate-800 rounded-[2rem] overflow-hidden min-h-[300px]">
      <div className="p-6 border-b border-slate-800 flex items-center gap-3 bg-slate-950/30">
        {icon}
        <h3 className="font-display font-bold text-lg text-white">{title}</h3>
        <span className="ml-auto text-[10px] font-black bg-red-500/10 text-red-500 px-2 py-0.5 rounded-full uppercase tracking-widest">{bugs.length} Issues</span>
      </div>
      <div className="flex-1 overflow-y-auto p-0 scrollbar-hide">
        <table className="w-full text-left text-xs">
          <thead className="sticky top-0 bg-slate-900 border-b border-slate-800">
            <tr>
              <th className="px-4 py-3 text-[9px] font-black uppercase text-slate-500 tracking-widest">No</th>
              <th className="px-4 py-3 text-[9px] font-black uppercase text-slate-500 tracking-widest">Project</th>
              <th className="px-4 py-3 text-[9px] font-black uppercase text-slate-500 tracking-widest">Dev</th>
              <th className="px-4 py-3 text-[9px] font-black uppercase text-slate-500 tracking-widest">Quick Fix</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/20">
            {bugs.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-10 text-center text-slate-600 font-bold uppercase text-[10px] tracking-[0.2em]">All Systems Nominal</td>
              </tr>
            ) : (
              bugs.map((bug, idx) => (
                <tr key={bug.id || `quickfix-${idx}`} className="hover:bg-white/[0.01] transition-colors">
                  <td className="px-4 py-3 font-mono text-blue-500">{bug.no}</td>
                  <td className="px-4 py-3 text-white font-bold">{bug.projectName}</td>
                  <td className="px-4 py-3 text-slate-400">{bug.devName}</td>
                  <td className="px-4 py-3">
                    {type === 'periode' ? (
                      <input 
                        type="text"
                        placeholder="Set Periode..."
                        className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-[10px] text-white focus:outline-none focus:ring-1 focus:ring-blue-500 w-full"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            onSave(bug.id!, (e.target as HTMLInputElement).value);
                          }
                        }}
                      />
                    ) : (
                      <select 
                        className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-[10px] text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 w-full"
                        onChange={(e) => {
                          if (e.target.value) onSave(bug.id!, e.target.value);
                        }}
                      >
                        <option value="">Map Status...</option>
                        <option value="DONE">DONE</option>
                        <option value="ON PROGRESS">ON PROGRESS</option>
                        <option value="ON QUEUE">ON QUEUE</option>
                      </select>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
