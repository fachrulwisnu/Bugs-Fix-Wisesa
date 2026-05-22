/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { TrendingDown, Star, ArrowUpRight, ArrowDownRight, AlertCircle, ShieldCheck, Printer } from "lucide-react";
import { DevStats } from "../types";
import { motion } from "motion/react";
import { cn } from "../lib/utils";

interface ExecutivePerformanceProps {
  devStats: DevStats[];
  matrixViewType: 'BUG' | 'CR';
  onDevClick: (devName: string) => void;
  onExportPDF?: (id: string, fileName: string) => void;
  isExporting?: boolean;
}

export function ExecutivePerformance({ devStats = [], matrixViewType, onDevClick, onExportPDF, isExporting }: ExecutivePerformanceProps) {
  // Sort for Top Risk (Highest Score)
  const topRisk = [...devStats].sort((a, b) => b.totalScore - a.totalScore).slice(0, 3);
  
  // Sort for Top Performers (Lowest Score)
  const topPerformers = [...devStats]
    .filter(d => d.totalScore < 10 && d.bugCount > 0) // Only those with minimal issues but active
    .sort((a, b) => a.totalScore - b.totalScore)
    .slice(0, 3);

  // If no one meets the < 10 threshold, just take the bottom 3
  const finalPerformers = topPerformers.length > 0 ? topPerformers : [...devStats].sort((a, b) => a.totalScore - b.totalScore).slice(0, 3);

  const isCR = matrixViewType === 'CR';

  if (isCR) {
    return (
      <div id="executive-performance-section" className="space-y-6 mb-8">
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-6 bg-emerald-500 rounded-full" />
            <h2 className="text-xl font-bold text-white tracking-tight">Personnel Performance Audit</h2>
          </div>
          <div className="flex items-center gap-4">
             <div className="text-right no-export hidden md:block">
               <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">CR Audit Support</p>
               <p className="text-[9px] text-slate-400 font-medium italic mt-0.5">Audit Remarks in Ledger for FSD deviations</p>
             </div>
             <button 
              onClick={() => onExportPDF?.("executive-performance-section", "CR-Workload-Audit")}
              className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black text-slate-400 hover:text-white transition-all uppercase tracking-widest group no-export shadow-xl"
            >
              <Printer className="w-4 h-4 transition-transform group-hover:scale-110" />
              Export Analysis
            </button>
          </div>
        </div>

        <div className="glass-card p-8 relative overflow-hidden group border-emerald-500/20 bg-emerald-500/[0.02]">
           <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
            <ShieldCheck className="w-32 h-32 text-emerald-500" />
          </div>

          <div className="flex items-center justify-between mb-8 relative z-10">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-8 h-8 bg-emerald-500/10 rounded-lg flex items-center justify-center">
                  <Star className="w-5 h-5 text-emerald-400" />
                </div>
                <h3 className="text-xl font-bold text-white tracking-tight font-display">Change Request Workload Distribution</h3>
              </div>
              <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest pl-10">TRACKING FEATURE ENHANCEMENTS & FSD DEVIATIONS</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 relative z-10">
            {devStats.filter(d => d.bugCount > 0).map((dev) => (
              <motion.div 
                key={dev.devName}
                whileHover={isExporting ? {} : { scale: 1.02, backgroundColor: "rgba(255, 255, 255, 0.08)" }}
                onClick={() => onDevClick(dev.devName)}
                className="flex items-center justify-between p-5 bg-white/5 border border-white/10 rounded-2xl cursor-pointer transition-all shadow-md group/card"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400 group-hover/card:bg-emerald-500/20 group-hover/card:text-emerald-400 transition-colors capitalize font-black text-xs">
                    {dev.devName.charAt(0)}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white tracking-tight">{dev.devName}</div>
                    <div className="text-[9px] text-slate-500 font-black uppercase tracking-widest mt-0.5">Development Personnel</div>
                  </div>
                </div>
                <div className="flex flex-col items-end">
                  <div className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400 font-black text-sm tracking-tighter">
                    {dev.bugCount}
                  </div>
                  <div className="text-[8px] text-slate-500 font-bold uppercase tracking-widest mt-1">TOTAL CR ITEMS</div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div id="executive-performance-section" className="space-y-6 mb-8">
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-3">
          <div className="w-1.5 h-6 bg-indigo-500 rounded-full" />
          <h2 className="text-xl font-bold text-white tracking-tight">Personnel Performance Audit</h2>
        </div>
        <button 
          onClick={() => onExportPDF?.("executive-performance-section", "Personnel-Performance-Audit")}
          className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black text-slate-400 hover:text-white transition-all uppercase tracking-widest group no-export shadow-xl"
        >
          <Printer className="w-4 h-4 transition-transform group-hover:scale-110" />
          Export Analysis
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Top Performers (Emerald) */}
        <div className="glass-card p-8 relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
          <Star className="w-32 h-32 text-emerald-500" />
        </div>
        
        <div className="flex items-center justify-between mb-8 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <ShieldCheck className="w-6 h-6 text-emerald-400" />
              <h3 className="text-xl font-bold text-white tracking-tight">Top Efficient Performers</h3>
            </div>
            <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest pl-8">Minimum Impact • High Integrity</p>
          </div>
        </div>

        <div className="space-y-4 relative z-10">
          {finalPerformers.map((dev, idx) => (
            <motion.div 
              key={dev.devName}
              whileHover={isExporting ? {} : { x: 5 }}
              onClick={() => onDevClick(dev.devName)}
              className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 cursor-pointer transition-all shadow-lg"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold text-xs">
                  #{idx + 1}
                </div>
                <div>
                  <div className="text-sm font-bold text-white tracking-tight">{dev.devName}</div>
                  <div className="text-[10px] text-slate-500 font-black uppercase tracking-widest mt-0.5">{dev.bugCount} Items</div>
                  <div className="text-[9px] text-slate-500 font-medium mt-1 lowercase flex flex-wrap gap-x-1.5">
                    {[
                      { label: 'trivia', count: dev.triviaCount },
                      { label: 'minor', count: dev.minorCount },
                      { label: 'major', count: dev.majorCount },
                      { label: 'critical', count: dev.criticalCount },
                      { label: 'recurring', count: dev.recurringCount }
                    ].filter(c => c.count > 0).map((c, i, arr) => (
                      <span key={c.label}>
                        {c.count} {c.label}{i < arr.length - 1 ? ',' : ''}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-end text-sm">
                <div className="font-black text-emerald-400 tracking-tighter flex items-center gap-1">
                  <ArrowDownRight className="w-4 h-4" />
                  {dev.totalScore.toFixed(1)}
                </div>
                <div className="text-[8px] text-slate-500 font-bold uppercase tracking-tighter">Penalty Score</div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Top Risks (Red) */}
      <div className="glass-card p-8 relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
          <AlertCircle className="w-32 h-32 text-rose-500" />
        </div>

        <div className="flex items-center justify-between mb-8 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <TrendingDown className="w-6 h-6 text-rose-400" />
              <h3 className="text-xl font-bold text-white tracking-tight">Critical Accountability Risk</h3>
            </div>
            <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest pl-8">High Governance Liability</p>
          </div>
        </div>

        <div className="space-y-4 relative z-10">
          {topRisk.map((dev, idx) => (
            <motion.div 
              key={dev.devName}
              whileHover={isExporting ? {} : { x: 5 }}
              onClick={() => onDevClick(dev.devName)}
              className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 cursor-pointer transition-all shadow-lg"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 font-bold text-xs font-mono">
                  #{idx + 1}
                </div>
                <div>
                  <div className="text-sm font-bold text-white tracking-tight">{dev.devName}</div>
                  <div className="text-[10px] text-slate-500 font-black uppercase tracking-widest mt-0.5">{dev.bugCount} Items</div>
                  <div className="text-[9px] text-slate-500 font-medium mt-1 lowercase flex flex-wrap gap-x-1.5">
                    {[
                      { label: 'trivia', count: dev.triviaCount },
                      { label: 'minor', count: dev.minorCount },
                      { label: 'major', count: dev.majorCount },
                      { label: 'critical', count: dev.criticalCount },
                      { label: 'recurring', count: dev.recurringCount }
                    ].filter(c => c.count > 0).map((c, i, arr) => (
                      <span key={c.label}>
                        {c.count} {c.label}{i < arr.length - 1 ? ',' : ''}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-end text-sm">
                <div className="font-black text-rose-400 tracking-tighter flex items-center gap-1">
                  <ArrowUpRight className="w-4 h-4" />
                  {dev.totalScore.toFixed(1)}
                </div>
                <div className="text-[8px] text-slate-500 font-bold uppercase tracking-tighter">Critical Score</div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  </div>
);
}
