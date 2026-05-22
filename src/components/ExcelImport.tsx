import React, { useRef, useState } from "react";
import * as XLSX from "xlsx";
import { Upload, FileSpreadsheet, Loader2, CheckCircle2, AlertCircle, Download, X, FileCheck, Info, FileUp } from "lucide-react";
import { BugRecord, SEVERITY_WEIGHTS } from "../types";
import { supabase, isSupabaseConfigured } from "../lib/supabase";
import { format, parse } from "date-fns";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../lib/utils";

import { normalizeStatus } from "../lib/normalization";

interface ExcelImportProps {
  onDataLoaded: () => void;
  isOpen: boolean;
  onClose: () => void;
}

const INDO_MONTHS_MAP: Record<string, string> = {
  "JAN": "JAN", "FEB": "FEB", "MAR": "MAR", "APR": "APR", "MAY": "MAY", "JUN": "JUN",
  "JUL": "JUL", "AUG": "AUG", "SEP": "SEP", "OCT": "OCT", "NOV": "NOV", "DEC": "DEC",
  "PEB": "FEB", "MEI": "MAY", "AGU": "AUG", "OKT": "OCT", "NOP": "NOV", "DES": "DEC"
};

export function ExcelImport({ onDataLoaded, isOpen, onClose }: ExcelImportProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [syncStatus, setSyncStatus] = useState<"idle" | "importing" | "syncing" | "success" | "error">("idle");
  const [syncMessage, setSyncMessage] = useState("");
  
  // Confirmation Modal States
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingData, setPendingData] = useState<any[]>([]);

  const downloadTemplate = () => {
    const headers = [
      'No', 'Section Name', 'PIC Name', 'Project Name', 'Type Testing', 'Discovery Date', 
      'Type (Bug/Change Request)', 'Severity (Trivia/Minor/Major/Critical/Recurring)', 
      'Included In FSD (Ya/Tidak)', 'Remarks', 'ScreenShot', 'Status PIC', 'Dev Name', 
      'Start Date', 'Finish Date', 'Respone Dev', 'Status Dev', '(SIT) Realized in Date', 'Periode'
    ];
    
    const sampleData = [
      {
        "No": "1",
        "Section Name": "Backend",
        "PIC Name": "John Doe",
        "Project Name": "Wisesa Ledger",
        "Type Testing": "SIT",
        "Discovery Date": "2024-12-01",
        "Type (Bug/Change Request)": "Bug",
        "Severity (Trivia/Minor/Major/Critical/Recurring)": "Major",
        "Included In FSD (Ya/Tidak)": "Ya",
        "Remarks": "Sample bug for template",
        "Status PIC": "DONE",
        "Dev Name": "System Analyst",
        "Start Date": "2024-12-02",
        "Finish Date": "2024-12-05",
        "Respone Dev": "Fixed by dev",
        "Status Dev": "DONE",
        "(SIT) Realized in Date": "2024-12-06",
        "Periode": "DEC-2024"
      }
    ];

    const ws = XLSX.utils.json_to_sheet(sampleData, { header: headers });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Bulk Upload Template");
    XLSX.writeFile(wb, "Bulk_SIT_Template.xlsx");
  };

  const handleFileSelection = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const bstr = event.target?.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const rawData = XLSX.utils.sheet_to_json(ws) as any[];
        
        setPendingFile(file);
        setPendingData(rawData);
      } catch (err) {
        setSyncStatus("error");
        setSyncMessage("Failed to read file structure.");
      }
    };
    reader.readAsBinaryString(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const executeBulkUpload = async () => {
    if (!pendingData.length) return;
    
    setSyncStatus("importing");
    setSyncMessage("Processing Zero-Data-Loss Engine...");

    try {
      const sanitizeTimestamp = (val: any) => {
        if (!val || val === "-" || val === "" || val === "N/A") return null;
        let d: Date | null = null;
        
        // Handle Excel numeric date serials
        let numVal = typeof val === 'number' ? val : parseFloat(String(val));
        if (!isNaN(numVal) && numVal > 40000 && numVal < 60000) {
          d = new Date(Math.round((numVal - 25569) * 86400 * 1000));
        } else {
          // Attempt parsing strings
          const strVal = String(val).trim();
          d = new Date(strVal);
          
          // Fallback parsing if basic Date constructor fails
          if (isNaN(d.getTime())) {
             const possibleFormats = ["dd-MMM-yy", "dd-MMM-yyyy", "yyyy-MM-dd", "MM/dd/yyyy", "dd/MM/yyyy", "MMM yyyy", "MMM-yyyy"];
             for (const fmt of possibleFormats) {
               try {
                 const parsed = parse(strVal, fmt, new Date());
                 if (!isNaN(parsed.getTime())) {
                   d = parsed;
                   break;
                 }
               } catch (e) {}
             }
          }
        }
        
        return (d && !isNaN(d.getTime())) ? d.toISOString() : null;
      };

      const normalizePeriod = (val: any) => {
        // 1. Handle missing or invalid blanks
        if (!val || val === "N/A" || val === "-" || val === "") return "ORPHANED";
        
        // 2. Handle Excel Numeric Serial Dates (e.g., 45658 for Jan 2026)
        if (typeof val === 'number' && val > 30000) {
            // Excel epoch starts at Dec 30, 1899
            const excelEpoch = new Date(1899, 11, 30);
            const d = new Date(excelEpoch.getTime() + val * 86400000);
            const months = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
            return `${months[d.getMonth()]}-${d.getFullYear()}`;
        }

        // 3. Handle valid Date Objects or ISO Strings
        const d = new Date(val);
        if (!isNaN(d.getTime()) && typeof val !== 'number' && String(val).length > 5) {
            const months = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
            return `${months[d.getMonth()]}-${d.getFullYear()}`;
        }

        // 4. Aggressive String Sanitization (Fixing "JAN 2026" or "JAN/2026")
        let str = String(val).trim().toUpperCase();
        
        // Replace spaces, slashes, or underscores with a DASH (-)
        str = str.replace(/[\s/_]+/g, '-'); 
        
        // Ensure it strictly outputs something like "JAN-2026"
        return str;
      };

      const processedData = pendingData.map((row) => {
        // Raw extraction
        const rawPeriode = row["Periode"];
        const rawStatusDev = String(row["Status Dev"] || "").trim();
        const rawProjectName = String(row["Project Name"] || "").trim();
        const rawDevName = String(row["Dev Name"] || "").trim();
        const rawPicName = String(row["PIC Name"] || row["picName"] || "").trim();

        let finalPeriode = normalizePeriod(rawPeriode);
        let finalProjectName = rawProjectName;

        // Routing Rule 1: ORPHANED
        if (!rawPeriode || String(rawPeriode).trim() === "" || String(rawPeriode).trim() === "-") {
          finalPeriode = "ORPHANED";
        }

        // Routing Rule 2: UNMAPPED
        const isPeriodValid = finalPeriode !== "ORPHANED";
        const isIncomplete = !rawStatusDev || rawStatusDev === "-" || rawStatusDev === "N/A" || 
                           !rawProjectName || rawProjectName === "-" || rawProjectName === "N/A" ||
                           !rawDevName || rawDevName === "-" || rawDevName === "N/A";

        if (isPeriodValid && isIncomplete) {
          finalProjectName = "UNMAPPED";
        }

        // Severity normalization
        const sevKey = Object.keys(row).find(k => k.toLowerCase().includes('severity')) || "Severity";
        const rawSeverity = String(row[sevKey] || "Trivia").toLowerCase();
        let severity: "Recurring" | "Critical" | "Major" | "Minor" | "Trivia" = "Trivia";
        if (/recur/i.test(rawSeverity)) severity = "Recurring";
        else if (/crit/i.test(rawSeverity)) severity = "Critical";
        else if (/major/i.test(rawSeverity)) severity = "Major";
        else if (/minor/i.test(rawSeverity)) severity = "Minor";
        else if (/triv/i.test(rawSeverity)) severity = "Trivia";

        const bugScore = SEVERITY_WEIGHTS[severity] || 0;

        return {
          no: String(row["No"] || "").trim(),
          sectionName: String(row["Section Name"] || ""),
          projectName: finalProjectName,
          typeTesting: String(row["Type Testing"] || ""),
          discoveryDate: sanitizeTimestamp(row["Discovery Date"]),
          type: String(row["Type (Bug/Change Request)"] || "Bug"),
          severity: severity,
          includedInFsd: String(row["Included In FSD (Ya/Tidak)"] || "Tidak"),
          remarks: String(row["Remarks"] || ""),
          screenshot: String(row["ScreenShot"] || ""),
          statusPic: String(row["Status PIC"] || ""),
          devName: rawDevName || "SYSTEM",
          startDate: sanitizeTimestamp(row["Start Date"]),
          finishAt: sanitizeTimestamp(row["Finish Date"]),
          responseDev: String(row["Respone Dev"] || row["Response Dev"] || ""),
          statusDev: rawStatusDev || "OPEN",
          sitRealizedDate: sanitizeTimestamp(row["(SIT) Realized in Date"]),
          periode: finalPeriode,
          picName: rawPicName || null,
          bugScore,
          total_score: bugScore,
          // Strict Metadata Injection
          last_edited_at: new Date().toISOString(),
          last_edited_by: "SYSTEM",
          last_updated: null,
          updated_by: "SYSTEM",
          created_by: "Fachrul Wisnu Novianto"
        };
      });

      if (isSupabaseConfigured) {
        setSyncStatus("syncing");
        setSyncMessage(`Injecting ${processedData.length} records into database...`);
        
        const { error } = await supabase
          .from('bugs')
          .insert(processedData);

        if (error) throw error;
      }

      setSyncStatus("success");
      setSyncMessage("Import successful! Database synchronized.");
      
      setTimeout(() => {
        onDataLoaded();
        onClose();
        setSyncStatus("idle");
        setPendingFile(null);
        setPendingData([]);
      }, 1500);
    } catch (err: any) {
      console.error("Import error:", err);
      setSyncStatus("error");
      setSyncMessage(`Critical Error: ${err.message || "Engine failure"}`);
      setTimeout(() => setSyncStatus("idle"), 4000);
    }
  };

  const closeAndReset = () => {
    onClose();
    setPendingFile(null);
    setPendingData([]);
    setSyncStatus("idle");
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 overflow-hidden">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeAndReset}
            className="fixed inset-0 bg-slate-950/90 backdrop-blur-md"
          />
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="relative z-[10000] bg-[#0B1120] w-full max-w-4xl rounded-[2rem] border border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
          >
            <div className="p-8 border-b border-white/5 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-600/20 border border-blue-500/20 rounded-2xl flex items-center justify-center">
                  <FileUp className="w-6 h-6 text-blue-500" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white tracking-tight">Bulk Data Import (Raw Mode)</h3>
                  <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mt-1">Zero-Data-Loss Processing Terminal</p>
                </div>
              </div>
              <button onClick={closeAndReset} className="p-3 bg-slate-800 hover:bg-slate-700 rounded-2xl transition-colors">
                <X className="w-6 h-6 text-white" />
              </button>
            </div>

            <div className="p-10 space-y-8 overflow-y-auto">
              {syncStatus !== "idle" ? (
                <div className="flex flex-col items-center justify-center py-20">
                   {syncStatus === "importing" || syncStatus === "syncing" ? (
                      <Loader2 className="w-16 h-16 text-blue-600 animate-spin mb-8" />
                    ) : syncStatus === "success" ? (
                      <CheckCircle2 className="w-16 h-16 text-emerald-500 mb-8" />
                    ) : (
                      <AlertCircle className="w-16 h-16 text-red-500 mb-8" />
                    )}
                    <h4 className="text-lg font-bold text-white mb-2">{syncMessage}</h4>
                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em]">Executing Data Stream Synchronization</p>
                </div>
              ) : !pendingFile ? (
                <div className="space-y-8">
                  <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-6 flex flex-col gap-4">
                    <p className="text-sm text-slate-300 leading-relaxed font-medium">
                      Upload your raw SIT ledger. Empty periods will be flagged as <span className="text-orange-400 font-bold">ORPHANED</span>. 
                      Incomplete records will be flagged as <span className="text-blue-400 font-bold">UNMAPPED</span>. 
                      No data will be discarded.
                    </p>
                    <div className="flex justify-start">
                      <button 
                        onClick={downloadTemplate}
                        className="flex items-center gap-2 bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-200 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                      >
                         <Download className="w-3.5 h-3.5" />
                         Download Excel Template
                      </button>
                    </div>
                  </div>

                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-800 hover:border-blue-500/50 bg-slate-950/50 rounded-[3rem] p-16 flex flex-col items-center justify-center cursor-pointer transition-all group"
                  >
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileSelection}
                      accept=".xlsx"
                      className="hidden"
                    />
                    <div className="bg-blue-500/10 p-6 rounded-3xl mb-6 group-hover:scale-110 transition-transform">
                      <Upload className="w-10 h-10 text-blue-500" />
                    </div>
                    <p className="text-xl font-bold text-white mb-2">Drop Raw Ledger Here</p>
                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Only .xlsx files are permitted for Bulk Raw Mode</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
                  <div className="bg-slate-950 border border-slate-800 rounded-[2.5rem] p-10 space-y-8">
                    <div className="flex items-center justify-between">
                       <div className="flex items-center gap-6">
                          <div className="w-16 h-16 bg-blue-600/10 rounded-3xl flex items-center justify-center border border-blue-500/20">
                             <FileSpreadsheet className="w-8 h-8 text-blue-500" />
                          </div>
                          <div>
                             <p className="text-xl font-bold text-white truncate max-w-[400px]">{pendingFile.name}</p>
                             <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mt-1">Source Stream • {Math.round(pendingFile.size / 1024)} KB</p>
                          </div>
                       </div>
                       <button 
                        onClick={() => setPendingFile(null)}
                        className="w-12 h-12 flex items-center justify-center bg-slate-900 hover:bg-red-500/10 rounded-2xl transition-colors group"
                       >
                          <X className="w-6 h-6 text-slate-500 group-hover:text-red-500" />
                       </button>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                       <div className="bg-slate-900/50 rounded-3xl p-6 border border-white/5">
                          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Raw Records Detected</p>
                          <p className="text-4xl font-display font-bold text-blue-500 tabular-nums">{pendingData.length}</p>
                       </div>
                       <div className="bg-slate-900/50 rounded-3xl p-6 border border-white/5">
                          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Target Data Schema</p>
                          <p className="text-lg font-bold text-emerald-500">Wisesa_SIT_Master_v2</p>
                       </div>
                    </div>
                  </div>

                  <div className="bg-blue-500/5 border border-blue-500/10 p-6 rounded-3xl flex items-start gap-5">
                     <Info className="w-6 h-6 text-blue-500 shrink-0 mt-1" />
                     <div>
                        <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-2">Processing Protocol: Zero-Data-Loss</p>
                        <p className="text-xs text-blue-200/60 leading-relaxed font-medium">
                          The system will process all <span className="text-white font-bold">{pendingData.length}</span> rows. Metadata will be injected for auditability. 
                          Routing rules will handle imperfect data points without discarding records.
                        </p>
                     </div>
                  </div>
                </div>
              )}
            </div>

            {pendingFile && syncStatus === "idle" && (
              <div className="p-8 bg-slate-950 border-t border-white/5 flex gap-4 shrink-0">
                <button 
                  onClick={() => setPendingFile(null)}
                  className="flex-1 px-8 py-5 bg-slate-800 hover:bg-slate-700 text-slate-400 font-bold rounded-2xl transition-all uppercase text-[10px] tracking-widest"
                >
                  Discard File
                </button>
                <button 
                  onClick={executeBulkUpload}
                  className="flex-[2] px-8 py-5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl transition-all shadow-2xl shadow-blue-900/40 uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 active:scale-[0.98]"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Execute Bulk Import
                </button>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
