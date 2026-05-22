/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { History, User, Box, ArrowRight, Clock, ShieldCheck, Trash2, RefreshCw, AlertCircle, ArrowDownWideNarrow } from "lucide-react";
import { format } from "date-fns";
import { cn } from "../lib/utils";
import { BugRecord } from "../types";

export interface AuditEntry {
  id: string;
  created_at: string;
  actor_name: string;
  project_name: string;
  bug_id: string;
  field_name: string;
  old_value: string;
  new_value: string;
}

interface AuditLogProps {
  logs: AuditEntry[];
  trashBugs?: BugRecord[];
  onRestoreBug?: (id: string) => Promise<void>;
}

export function AuditLog({ logs, trashBugs = [], onRestoreBug }: AuditLogProps) {
  const [activeView, setActiveView] = React.useState<"audit" | "trash">("audit");

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col h-full ring-1 ring-white/5">
      <div className="p-8 border-b border-white/5 flex items-center justify-between bg-slate-900/50">
        <div className="flex items-center gap-8">
          <div>
            <h2 className="text-2xl font-display font-bold text-white tracking-tight flex items-center gap-3">
              {activeView === "audit" ? (
                <>
                  <History className="w-6 h-6 text-orange-500" />
                  System Audit Trail
                </>
              ) : (
                <>
                  <Trash2 className="w-6 h-6 text-red-500" />
                  Governance Trash
                </>
              )}
            </h2>
            <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em] mt-1">
              {activeView === "audit" ? "Data Accountability & Integrity Ledger" : "Recover Deleted SIT Records"}
            </p>
          </div>

          <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button 
              onClick={() => setActiveView("audit")}
              className={cn(
                "px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all",
                activeView === "audit" ? "bg-orange-500/10 text-orange-500 shadow-lg" : "text-slate-500 hover:text-slate-300"
              )}
            >
              Activity
            </button>
            <button 
              onClick={() => setActiveView("trash")}
              className={cn(
                "px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2",
                activeView === "trash" ? "bg-red-500/10 text-red-500 shadow-lg" : "text-slate-500 hover:text-slate-300"
              )}
            >
              Trash
              {trashBugs.length > 0 && (
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              )}
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl">
           <ShieldCheck className="w-4 h-4 text-green-500" />
           <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Security: Verified</span>
        </div>
      </div>

      <div className="flex-1 overflow-auto scrollbar-hide">
        {activeView === "audit" ? (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-950/50 border-b border-white/5 sticky top-0 z-10">
                <th className="px-8 py-5 text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">
                  <div className="flex items-center gap-1.5">
                    Timestamp
                    <ArrowDownWideNarrow className="w-3 h-3 text-orange-500" />
                  </div>
                </th>
                <th className="px-8 py-5 text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">Administrator</th>
                <th className="px-8 py-5 text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">Target Resource</th>
                <th className="px-8 py-5 text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">Mutation Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-8 py-20 text-center">
                    <div className="flex flex-col items-center gap-4 opacity-20">
                      <History className="w-12 h-12" />
                      <span className="text-xs font-black uppercase tracking-widest">No mutations logged in current epoch</span>
                    </div>
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                        <Clock className="w-3.5 h-3.5 text-slate-600" />
                        {log.created_at ? format(new Date(log.created_at), "dd MMM yyyy • HH:mm:ss") : "N/A"}
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                          <User className="w-4 h-4 text-indigo-400" />
                        </div>
                        <span className="text-sm font-bold text-white tracking-tight">{log.actor_name}</span>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                          <Box className="w-4 h-4 text-blue-400" />
                        </div>
                        <div>
                          <div className="text-[10px] font-black uppercase tracking-widest text-white">{log.project_name}</div>
                          <div className="text-[9px] text-slate-500 font-bold">Ref: {log.bug_id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-4">
                        <div className="flex flex-col">
                          <span className="text-[8px] font-black uppercase text-slate-500 tracking-widest mb-1">{log.field_name}</span>
                          <div className="flex items-center gap-3">
                            <span className="px-2 py-0.5 bg-red-500/5 border border-red-500/10 text-red-500 text-[10px] rounded font-medium line-through decoration-red-500/50">{log.old_value || "null"}</span>
                            <ArrowRight className="w-3 h-3 text-slate-700" />
                            <span className="px-2 py-0.5 bg-green-500/5 border border-green-500/10 text-green-500 text-[10px] rounded font-bold">{log.new_value}</span>
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-950/50 border-b border-white/5 sticky top-0 z-10">
                <th className="px-8 py-5 text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">
                  <div className="flex items-center gap-1.5">
                    Deleted At
                    <ArrowDownWideNarrow className="w-3 h-3 text-red-500" />
                  </div>
                </th>
                <th className="px-8 py-5 text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">Project / Ref</th>
                <th className="px-8 py-5 text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">Remarks</th>
                <th className="px-8 py-5 text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {trashBugs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-8 py-20 text-center">
                    <div className="flex flex-col items-center gap-4 opacity-20">
                      <Trash2 className="w-12 h-12" />
                      <span className="text-xs font-black uppercase tracking-widest">Trash is empty</span>
                    </div>
                  </td>
                </tr>
              ) : (
                trashBugs.map((bug) => (
                  <tr key={bug.id} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                        <Clock className="w-3.5 h-3.5 text-slate-600" />
                        {bug.deleted_at ? format(new Date(bug.deleted_at), "dd MMM yyyy • HH:mm:ss") : "N/A"}
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-3">
                         <div className="text-[10px] font-black uppercase tracking-widest text-white">{bug.projectName}</div>
                         <div className="text-[9px] text-slate-500 font-bold">#{bug.no}</div>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                       <div className="text-[10px] text-slate-400 truncate max-w-[300px]">
                         {bug.remarks || "No remarks"}
                       </div>
                    </td>
                    <td className="px-8 py-5 text-right">
                       <button 
                        onClick={() => bug.id && onRestoreBug?.(bug.id)}
                        className="px-4 py-2 bg-blue-600/10 hover:bg-blue-600 border border-blue-500/20 hover:border-blue-500 rounded-xl text-blue-500 hover:text-white transition-all text-[9px] font-black uppercase tracking-widest flex items-center gap-2 ml-auto"
                       >
                         <RefreshCw className="w-3 h-3" />
                         Restore Record
                       </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
