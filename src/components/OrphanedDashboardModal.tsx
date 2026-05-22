import React from "react";
import { X, AlertTriangle, UserCheck, ShieldAlert } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { BugRecord } from "../types";
import { DashboardCharts } from "./Charts";
import { ExecutivePerformance } from "./ExecutivePerformance";

interface OrphanedDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  orphanedData: BugRecord[];
}

export function OrphanedDashboardModal({ isOpen, onClose, orphanedData }: OrphanedDashboardModalProps) {
  if (!isOpen) return null;

  const devStats = React.useMemo(() => {
    const stats: Record<string, any> = {};
    orphanedData.forEach((bug) => {
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
          recurringCount: 0
        };
      }
      if (bug.type === 'Bug') stats[dev].bugCount += 1;
      stats[dev].totalScore += (bug.bugScore || 0);
      const severity = bug.severity || "";
      if (severity === "Critical") stats[dev].criticalCount += 1;
      else if (severity === "Major") stats[dev].majorCount += 1;
      else if (severity === "Minor") stats[dev].minorCount += 1;
      else if (severity === "Trivia") stats[dev].triviaCount += 1;
      else if (severity === "Recurring") stats[dev].recurringCount += 1;
    });
    return Object.values(stats).sort((a, b) => b.totalScore - a.totalScore);
  }, [orphanedData]);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 overflow-hidden">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-950/90 backdrop-blur-md"
        />
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          className="relative z-[10000] bg-[#0B1120] w-[95vw] h-[90vh] rounded-[2.5rem] border border-slate-800 shadow-2xl overflow-hidden flex flex-col"
        >
          {/* Modal Header */}
          <div className="p-8 border-b border-white/5 flex items-center justify-between shrink-0 bg-slate-900/40">
            <div className="flex items-center gap-6">
              <div className="w-14 h-14 bg-orange-500/10 border border-orange-500/20 rounded-[1.5rem] flex items-center justify-center">
                <AlertTriangle className="w-7 h-7 text-orange-500" />
              </div>
              <div>
                <h2 className="text-2xl font-black text-white tracking-tight">Orphaned Anomaly Dashboard</h2>
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em] px-3 py-1 bg-slate-800 rounded-lg">
                    {orphanedData.length} Anomalies Detected
                  </span>
                  <span className="text-[10px] text-orange-500/80 font-black uppercase tracking-[0.2em] animate-pulse">
                    Critical Audit Requirement
                  </span>
                </div>
              </div>
            </div>
            <button 
              onClick={onClose} 
              className="p-4 bg-slate-800 hover:bg-slate-700 rounded-2xl transition-all group"
            >
              <X className="w-6 h-6 text-white group-hover:rotate-90 duration-300" />
            </button>
          </div>

          {/* Modal Body - Dashboard Replication */}
          <div className="flex-1 overflow-y-auto p-10 space-y-12">
            
            {/* Row 1: Grid cols-2 (Personnel Ranking & Severity) */}
            <div className="grid grid-cols-1 gap-8">
              <section className="bg-slate-900/40 border border-slate-800/50 rounded-[2rem] p-8 shadow-xl">
                 <h3 className="text-sm font-black text-white uppercase tracking-widest mb-8 flex items-center gap-3">
                   <div className="w-1.5 h-6 bg-indigo-500 rounded-full" />
                   Analytical Governance Overview (Orphaned)
                 </h3>
                 <div className="min-h-[500px]">
                    <DashboardCharts 
                      matrixViewType="BUG"
                      devStats={devStats}
                      allBugs={orphanedData}
                      unfilteredBugs={orphanedData}
                      onChartClick={() => {}} 
                    />
                 </div>
              </section>
            </div>

            {/* Row 4: Personnel Performance Audit Leaderboards */}
            <div className="bg-slate-900/20 border border-white/5 rounded-[2.5rem] p-8 shadow-2xl">
               <ExecutivePerformance 
                 matrixViewType="BUG"
                 devStats={devStats}
                 onDevClick={() => {}}
               />
            </div>

            <div className="bg-orange-500/5 border border-orange-500/10 p-6 rounded-3xl flex items-start gap-5">
               <AlertTriangle className="w-6 h-6 text-orange-500 shrink-0 mt-1" />
               <div>
                  <p className="text-[10px] font-black text-orange-500 uppercase tracking-widest mb-2">Audit Notice</p>
                  <p className="text-xs text-orange-200/60 leading-relaxed font-medium">
                    This view displays only records with missing or invalid audit periods. These items must be resolved to ensure global SIT resilience compliance. 
                    Standard SIT metrics exclude these records to prevent data contamination.
                  </p>
               </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
