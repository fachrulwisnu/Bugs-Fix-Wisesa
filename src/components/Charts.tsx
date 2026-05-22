/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from "recharts";
import { BugRecord, DevStats } from "../types";
import { FileDown, Printer, ArrowLeft } from "lucide-react";

interface DashboardChartsProps {
  devStats: DevStats[];
  allBugs: BugRecord[];
  unfilteredBugs: BugRecord[];
  matrixViewType?: 'BUG' | 'CR';
  selectedSeverity?: string;
  onExportPDF?: (id: string, name: string) => void;
  onExportMatrix?: () => void;
  onChartClick?: (type: string, value: string) => void;
  isExporting?: boolean;
}

const COLORS = {
  Recurring: "#8B5CF6", // Purple
  Critical: "#EF4444",  // Red
  Major: "#F59E0B",     // Orange
  Minor: "#3B82F6",     // Blue
  Trivia: "#10B981",    // Green
};

export function DashboardCharts({ devStats = [], allBugs = [], unfilteredBugs = [], matrixViewType, selectedSeverity, onExportPDF, onExportMatrix, onChartClick, isExporting }: DashboardChartsProps) {
  const [trendYear, setTrendYear] = React.useState<string | null>(null);
  const [varianceYear, setVarianceYear] = React.useState<string | null>(null);

  // Intensity & Severity Data (Uses filtered bugs passed via props)
  const severityCounts = allBugs.reduce((acc: any, bug) => {
    acc[bug.severity] = (acc[bug.severity] || 0) + 1;
    return acc;
  }, {});

  const severityData = Object.keys(severityCounts).map((key) => ({
    name: key,
    value: severityCounts[key],
  }));

  // Process Trend Data
  const getTrendData = (targetYear: string | null, dataToUse: BugRecord[]) => {
    if (!targetYear) {
      // Level 1: Yearly
      const yearlyMap = dataToUse.reduce((acc: any, bug) => {
        const periodParts = bug.periode?.split('-');
        const year = periodParts && periodParts.length === 2 ? periodParts[1] : "UNKNOWN";
        if (year === "UNKNOWN") return acc;

        if (!acc[year]) {
          acc[year] = { 
            periode: year, 
            Recurring: 0, Critical: 0, Major: 0, Minor: 0, Trivia: 0,
            value: 0 
          };
        }
        acc[year][bug.severity]++;
        acc[year].value++;
        return acc;
      }, {});

      return Object.values(yearlyMap).sort((a: any, b: any) => a.periode.localeCompare(b.periode));
    } else {
      // Level 2: Monthly for selected year
      const monthlyMap = dataToUse
        .filter(bug => (bug.periode || "").endsWith(`-${targetYear}`))
        .reduce((acc: any, bug) => {
          const month = bug.periode;
          if (!acc[month]) {
            acc[month] = { 
              periode: month, 
              Recurring: 0, Critical: 0, Major: 0, Minor: 0, Trivia: 0,
              value: 0 
            };
          }
          acc[month][bug.severity]++;
          acc[month].value++;
          return acc;
        }, {});

      const monthOrder = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
      return Object.values(monthlyMap).sort((a: any, b: any) => {
        const m1 = (a.periode.split("-")[0] || "").toUpperCase();
        const m2 = (b.periode.split("-")[0] || "").toUpperCase();
        return monthOrder.indexOf(m1) - monthOrder.indexOf(m2);
      });
    }
  };

  const trendChartData = React.useMemo(() => getTrendData(trendYear, unfilteredBugs), [trendYear, unfilteredBugs]);
  const varianceChartData = React.useMemo(() => getTrendData(varianceYear, allBugs), [varianceYear, allBugs]);

  const isBugView = matrixViewType === 'BUG';
  const activeColor = isBugView ? "#F59E0B" : "#10B981";
  const activeGradient = isBugView ? "url(#color-Bug)" : "url(#color-CR)";
  const activeTitle = isBugView ? "BUG" : "CHANGE REQUEST";
  const activeSeriesLabel = isBugView ? "Bug" : "Change Request";

  return (
    <div className="space-y-10 mb-10">
      {/* Combined Group 1: Personnel & Severity */}
      <div id="chart-matrix-group" className="space-y-6">
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-6 bg-blue-500 rounded-full" />
            <div>
              <h2 className="text-xl font-display font-bold text-white tracking-tight">Personnel & Severity Matrix</h2>
              <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mt-0.5">Cross-sectional impact analysis</p>
            </div>
          </div>
          <button 
            onClick={() => onExportMatrix?.()}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-[10px] font-black text-slate-400 hover:text-white transition-all uppercase tracking-widest group shadow-lg no-export"
          >
            <Printer className="w-3.5 h-3.5 transition-transform group-hover:scale-110" />
            Capture Matrix PDF
          </button>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Dev Quality Ranking */}
          <div id="chart-dev-ranking" className="glass-card p-8 relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-3xl rounded-full" />
        
        <div className="flex items-center justify-between mb-8 relative z-10">
          <h3 className="text-lg font-bold text-white tracking-tight">Personnel Governance Ranking</h3>
          <button 
            onClick={() => onExportPDF?.("chart-dev-ranking", "Personnel-Governance-Ranking")}
            className="p-2 transition-all text-slate-500 hover:text-indigo-400 hover:bg-white/5 rounded-xl no-export"
            title="Export to PDF"
          >
            <Printer className="w-5 h-5" />
          </button>
        </div>

        <div className="h-[280px] w-full min-h-0 min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart 
              data={devStats.slice(0, 10)} 
              margin={{ top: 0, right: 0, left: -20, bottom: 0 }}
              onClick={(data: any) => {
                if (data && data.activePayload && data.activePayload[0]) {
                  onChartClick?.("dev", String(data.activePayload[0].payload.devName));
                }
              }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" strokeOpacity={0.5} />
              <XAxis dataKey="devName" fontSize={10} tickLine={false} axisLine={false} tick={{ fill: '#64748b' }} />
              <YAxis fontSize={10} tickLine={false} axisLine={false} tick={{ fill: '#64748b' }} />
              <Tooltip
                cursor={{ fill: 'rgba(255,255,255,0.02)' }}
                contentStyle={{ 
                  backgroundColor: "#0f172a", 
                  borderRadius: "16px", 
                  border: "1px solid #1e293b", 
                  boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)",
                  color: "#f8fafc"
                }}
              />
              <Bar 
                dataKey="totalScore" 
                fill="#3B82F6" 
                radius={[8, 8, 0, 0]} 
                barSize={32}
                isAnimationActive={!isExporting}
              >
                 {devStats.slice(0, 10).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index === 0 ? "#ef4444" : "#3b82f6"} />
                 ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Severity Distribution */}
      <div id="chart-severity-index" className="glass-card p-8 relative overflow-hidden group">
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-purple-500/10 blur-3xl rounded-full" />
        
        <div className="flex items-center justify-between mb-8 relative z-10">
          <h3 className="text-lg font-bold text-white tracking-tight">Systemic Severity Index</h3>
          <button 
            onClick={() => onExportPDF?.("chart-severity-index", "Systemic-Severity-Index")}
            className="p-2 transition-all text-slate-500 hover:text-purple-400 hover:bg-white/5 rounded-xl no-export"
            title="Export to PDF"
          >
            <Printer className="w-5 h-5" />
          </button>
        </div>

        <div className="h-[280px] w-full flex items-center justify-center min-h-0 min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={severityData}
                innerRadius={65}
                outerRadius={95}
                paddingAngle={8}
                dataKey="value"
                label={({ name, percent }) => `${name.toUpperCase()} ${(percent * 100).toFixed(0)}%`}
                labelLine={false}
                isAnimationActive={!isExporting}
                onClick={(data: any) => {
                  if (data && data.name) {
                    onChartClick?.("severity", String(data.name));
                  }
                }}
              >
                {severityData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[entry.name as keyof typeof COLORS] || "#CBD5E1"} stroke="none" />
                ))}
              </Pie>
              <Tooltip contentStyle={{ backgroundColor: "#0f172a", borderRadius: "16px", border: "1px solid #1e293b" }} />
              <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  </div>

  {/* Monthly SIT Trend (Stacked Area) */}
      <div id="chart-sit-trend" className="glass-card p-8 lg:col-span-2 group relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 blur-[100px] rounded-full pointer-events-none" />
        <div className="flex items-center justify-between mb-8 relative z-10">
          <div>
            <h3 className="text-lg font-bold text-white tracking-tight">
              {trendYear ? `Monthly ${activeTitle} Resilience Trend (${trendYear})` : `Yearly ${activeTitle} Resilience Trend`}
            </h3>
            <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mt-1">
              {trendYear ? "Monthly volume analysis" : "Cross-sectional volume analysis"}
            </p>
          </div>
          <div className="flex items-center gap-4">
            {trendYear && (
              <button 
                onClick={() => setTrendYear(null)}
                className="flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-[9px] font-black text-slate-400 hover:text-white transition-all uppercase tracking-widest no-export"
              >
                <ArrowLeft className="w-3 h-3" />
                Back to Yearly
              </button>
            )}
            {selectedSeverity && selectedSeverity !== "All" && (
              <span className="text-[10px] bg-indigo-500/10 text-indigo-400 px-4 py-2 rounded-xl font-black uppercase tracking-widest border border-indigo-500/20 shadow-lg">
                Isolating: {selectedSeverity}
              </span>
            )}
            <button 
              onClick={() => onExportPDF?.("chart-sit-trend", trendYear ? `Monthly-SIT-Trend-${trendYear}` : "Yearly-SIT-Trend")}
              className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black text-slate-400 hover:text-white transition-all uppercase tracking-widest group shadow-lg no-export"
            >
              <Printer className="w-4 h-4 transition-transform group-hover:scale-110" />
              Capture PDF
            </button>
          </div>
        </div>
        <div className="h-[320px] w-full min-h-0 min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart 
              data={trendChartData} 
              margin={{ top: 0, right: 0, left: -20, bottom: 0 }}
              onClick={(data: any) => {
                if (!trendYear && data && data.activeLabel) {
                  setTrendYear(String(data.activeLabel));
                } else if (trendYear && data && data.activeLabel) {
                   onChartClick?.("trend", String(data.activeLabel));
                }
              }}
            >
              <defs>
                <linearGradient id="color-Bug" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#F59E0B" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="color-CR" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" strokeOpacity={0.5} />
              <XAxis dataKey="periode" fontSize={10} tickLine={false} axisLine={false} tick={{ fill: '#64748b' }} />
              <YAxis fontSize={10} tickLine={false} axisLine={false} tick={{ fill: '#64748b' }} />
              <Tooltip
                contentStyle={{ 
                  backgroundColor: "#0f172a", 
                  borderRadius: "20px", 
                  border: "1px solid #1e293b", 
                  boxShadow: "0 30px 60px -12px rgba(0,0,0,1)", 
                  padding: "20px" 
                }}
                itemStyle={{ fontSize: "11px", fontWeight: "700", textTransform: "uppercase" }}
              />
              <Legend 
                verticalAlign="top" 
                align="right" 
                iconType="circle" 
                wrapperStyle={{ paddingBottom: '30px', fontSize: '10px', fontWeight: 'bold' }} 
                formatter={() => activeSeriesLabel}
              />
              <Area
                type="monotone"
                dataKey="value"
                name={activeSeriesLabel}
                stackId="1"
                stroke={activeColor}
                fillOpacity={1}
                fill={activeGradient}
                strokeWidth={3}
                isAnimationActive={!isExporting}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bug vs CR Comparison */}
      <div id="chart-issue-variance" className="glass-card p-8 lg:col-span-2 group relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 blur-[100px] rounded-full pointer-events-none" />
        <div className="flex items-center justify-between mb-8 relative z-10">
          <div>
            <h3 className="text-lg font-bold text-white tracking-tight">
              {varianceYear ? `Monthly ${activeTitle} Volume Distribution (${varianceYear})` : `Yearly ${activeTitle} Volume Distribution`}
            </h3>
            <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mt-1">Isolated {activeTitle} time-series audit</p>
          </div>
          <div className="flex items-center gap-4">
            {varianceYear && (
              <button 
                onClick={() => setVarianceYear(null)}
                className="flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-[9px] font-black text-slate-400 hover:text-white transition-all uppercase tracking-widest no-export"
              >
                <ArrowLeft className="w-3 h-3" />
                Back to Yearly Variance
              </button>
            )}
            <button 
              onClick={() => onExportPDF?.("chart-issue-variance", varianceYear ? `Issue-Type-Variance-${varianceYear}` : "Issue-Type-Variance")}
              className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black text-slate-400 hover:text-white transition-all uppercase tracking-widest group shadow-lg no-export"
            >
              <Printer className="w-4 h-4 transition-transform group-hover:scale-110" />
              Capture PDF
            </button>
          </div>
        </div>
        <div className="h-[280px] w-full min-h-0 min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart 
              data={varianceChartData} 
              margin={{ top: 0, right: 0, left: -20, bottom: 0 }}
              onClick={(data: any) => {
                if (!varianceYear && data && data.activeLabel) {
                  setVarianceYear(String(data.activeLabel));
                } else if (varianceYear && data && data.activeLabel) {
                   onChartClick?.("variance", String(data.activeLabel));
                }
              }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" strokeOpacity={0.5} />
              <XAxis dataKey="periode" fontSize={10} tickLine={false} axisLine={false} tick={{ fill: '#64748b' }} />
              <YAxis fontSize={10} tickLine={false} axisLine={false} tick={{ fill: '#64748b' }} />
              <Tooltip
                contentStyle={{ backgroundColor: "#0f172a", borderRadius: "16px", border: "1px solid #1e293b" }}
              />
              <Legend 
                verticalAlign="top" 
                align="right" 
                iconType="circle" 
                wrapperStyle={{ paddingBottom: '20px', fontSize: '10px', fontWeight: 'bold' }} 
                formatter={() => activeSeriesLabel}
              />
              <Bar 
                dataKey="value" 
                name={activeSeriesLabel}
                fill={activeColor} 
                radius={[4, 4, 0, 0]} 
                barSize={24} 
                isAnimationActive={!isExporting}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
