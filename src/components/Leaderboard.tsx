/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { Users, AlertCircle, TrendingUp, History, ClipboardEdit, Trophy } from "lucide-react";
import { DevStats } from "../types";
import { motion } from "motion/react";
import { cn } from "../lib/utils";

interface LeaderboardProps {
  devStats: DevStats[];
  lastSync?: string | null;
  onDevClick?: (devName: string) => void;
}

export function Leaderboard({ devStats = [], lastSync, onDevClick }: LeaderboardProps) {
  return (
    <div className="glass-card flex flex-col h-full relative overflow-hidden">
      <div className="p-8 border-b border-white/10 flex items-center justify-between bg-white/5 backdrop-blur-xl shrink-0">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
            <Trophy className="w-6 h-6 text-indigo-500" />
            Performance Audit Matrix
          </h2>
          <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em] mt-1">Cross-Sectional Risk Evaluation</p>
        </div>
        <div className="text-right">
          <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 flex items-center justify-end gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
            Live Governance Sync
          </div>
          <div className="text-[10px] font-bold text-blue-500/80 uppercase tabular-nums">
            {lastSync || "Syncing..."}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto scrollbar-hide relative min-h-0">
        <table className="w-full text-left border-collapse min-w-[800px] table-fixed">
          <thead className="sticky top-0 z-20">
            <tr className="border-b border-white/5 bg-slate-900/95 backdrop-blur-md">
              <th className="px-6 py-4 text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 w-[80px] whitespace-nowrap">Rank</th>
              <th className="px-6 py-4 text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 whitespace-nowrap">Developer Identity</th>
              <th className="px-6 py-4 text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 text-center w-[120px] whitespace-nowrap">Total Defects</th>
              <th className="px-6 py-4 text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 text-center whitespace-nowrap">Severity Breakdown</th>
              <th className="px-6 py-4 text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 text-right w-[150px] whitespace-nowrap">Penalty Score</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {devStats.map((stat, index) => {
              const isExtremeRisk = stat.totalScore >= 30;
              const isAtRisk = stat.totalScore > 15;
              const isTopPerformer = stat.totalScore < 5 && stat.bugCount > 0;
              
              return (
                <motion.tr
                  key={stat.devName}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                  onClick={() => onDevClick?.(stat.devName)}
                  className={cn(
                    "group cursor-pointer transition-all hover:bg-white/[0.02]",
                    isExtremeRisk ? "bg-red-500/[0.03]" : isAtRisk ? "bg-amber-500/[0.02]" : isTopPerformer ? "bg-emerald-500/[0.03]" : ""
                  )}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs border shadow-sm",
                      index === 0 && !isTopPerformer ? "bg-blue-600 border-blue-400 text-white" : 
                      isTopPerformer ? "bg-emerald-600 border-emerald-400 text-white" :
                      "bg-slate-900 border-slate-800 text-slate-500"
                    )}>
                      {index + 1}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-3">
                        <span className={cn(
                          "font-bold text-sm tracking-tight truncate max-w-[200px] whitespace-nowrap",
                          isExtremeRisk ? "text-red-400" : isTopPerformer ? "text-emerald-400" : "text-slate-200 group-hover:text-white"
                        )}>
                          {stat.devName}
                        </span>
                        {isExtremeRisk && (
                          <span className="shrink-0 bg-red-500 text-white text-[7px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest animate-pulse whitespace-nowrap">
                            Critical Audit
                          </span>
                        )}
                        {isAtRisk && !isExtremeRisk && (
                          <span className="shrink-0 bg-amber-500/20 text-amber-500 border border-amber-500/30 text-[7px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest whitespace-nowrap">
                            Risk Warning
                          </span>
                        )}
                        {isTopPerformer && (
                          <span className="shrink-0 bg-emerald-500 text-white text-[7px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest whitespace-nowrap">
                            Star Performer
                          </span>
                        )}
                      </div>
                      <span className="text-[9px] font-medium text-slate-500 uppercase tracking-wider mt-0.5 whitespace-nowrap">SIT Primary Analyst</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center whitespace-nowrap">
                    <span className={cn(
                      "text-sm font-bold tabular-nums",
                      stat.bugCount > 10 ? "text-red-400" : "text-slate-400"
                    )}>
                      {stat.bugCount}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center justify-center gap-1.5">
                      <SeverityBadge label="CRIT" count={stat.criticalCount} color="red" />
                      <SeverityBadge label="MAJ" count={stat.majorCount} color="orange" />
                      <SeverityBadge label="MIN" count={stat.minorCount} color="blue" />
                      <SeverityBadge label="TRIV" count={stat.triviaCount} color="slate" />
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right whitespace-nowrap">
                    <div className={cn(
                      "text-lg font-black font-display tracking-tight tabular-nums",
                      isExtremeRisk ? "text-red-500" : isAtRisk ? "text-amber-500" : "text-green-500"
                    )}>
                      {stat.totalScore.toFixed(1)}
                    </div>
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SeverityBadge({ label, count, color }: { label: string, count: number, color: 'red' | 'orange' | 'blue' | 'slate' }) {
  const colorMap = {
    red: "bg-red-500/10 text-red-500 border-red-500/20",
    orange: "bg-orange-500/10 text-orange-500 border-orange-500/20",
    blue: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    slate: "bg-slate-500/10 text-slate-500 border-slate-500/20"
  };

  return (
    <div className={cn(
      "px-2 py-1 rounded-md border flex flex-col items-center min-w-[45px] transition-all group-hover:scale-105",
      count > 0 ? colorMap[color] : "bg-slate-900/50 text-slate-700 border-slate-800"
    )}>
      <span className="text-[7px] font-black uppercase tracking-tighter opacity-70 leading-none mb-0.5">{label}</span>
      <span className="text-[10px] font-black leading-none">{count}</span>
    </div>
  );
}
