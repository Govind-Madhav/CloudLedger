import React from 'react';
import type { DashboardData } from '../api';
import { 
  DollarSign, Users, Server, ArrowUpRight, 
  ShieldAlert, Sparkles, CheckCircle2 
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  CartesianGrid 
} from 'recharts';

interface OverviewViewProps {
  data: DashboardData;
  onNavigateToStudents: () => void;
  onNavigateToResources: (untaggedOnly?: boolean) => void;
}

export const OverviewView: React.FC<OverviewViewProps> = ({ 
  data, 
  onNavigateToStudents, 
  onNavigateToResources 
}) => {
  const { kpis, daily_trends, service_breakdown, top_spenders } = data;

  return (
    <div className="space-y-6">
      {/* Demo Mode Notice Banner */}
      {kpis.is_demo_mode && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-semibold text-amber-300">Demo Simulation Active</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 font-mono">IS_DEMO=TRUE</span>
              </div>
              <p className="text-xs text-amber-400/80 mt-0.5">
                Displaying realistic academic cloud lab records. Live AWS data will seamlessly populate when AWS credentials and IAM roles are configured.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 4 Hero Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Cost */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Total Account Spend</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-3xl font-bold text-white">${kpis.total_cost.toFixed(2)}</span>
            <span className="text-xs text-slate-400 font-mono">USD</span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-800/60 grid grid-cols-3 gap-1 text-[11px]">
            <div>
              <span className="text-emerald-400 font-semibold block">${kpis.direct_cost.toFixed(1)}</span>
              <span className="text-slate-500">Direct</span>
            </div>
            <div>
              <span className="text-sky-400 font-semibold block">${kpis.estimated_cost.toFixed(1)}</span>
              <span className="text-slate-500">Estimated</span>
            </div>
            <div>
              <span className="text-slate-400 font-semibold block">${kpis.unallocated_cost.toFixed(1)}</span>
              <span className="text-slate-500">Overhead</span>
            </div>
          </div>
        </div>

        {/* Active Students */}
        <div 
          onClick={onNavigateToStudents}
          className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-sm hover:border-slate-700 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Monitored Students</span>
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-3xl font-bold text-white">{kpis.student_count}</span>
            <span className="text-xs text-slate-400">Enrolled IAM users</span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-800/60 flex items-center text-xs text-indigo-400 group-hover:text-indigo-300 font-medium">
            <span>View Student Roster</span>
            <ArrowUpRight className="w-3.5 h-3.5 ml-1" />
          </div>
        </div>

        {/* Active AWS Resources */}
        <div 
          onClick={() => onNavigateToResources(false)}
          className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-sm hover:border-slate-700 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Active AWS Resources</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Server className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-3xl font-bold text-white">{kpis.active_resource_count}</span>
            <span className="text-xs text-slate-400">Instances, Buckets, DBs</span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-800/60 flex items-center text-xs text-emerald-400 font-medium">
            <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
            <span>Resource Catalog Discovery</span>
          </div>
        </div>

        {/* Untagged / Non-Compliant */}
        <div 
          onClick={() => onNavigateToResources(true)}
          className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-sm hover:border-slate-700 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Untagged Non-Compliant</span>
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-3xl font-bold text-rose-400">{kpis.untagged_resource_count}</span>
            <span className="text-xs text-slate-400">Missing 'Owner' Tag</span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-800/60 flex items-center text-xs text-rose-400 font-medium">
            <span>Audit Untagged Resources</span>
            <ArrowUpRight className="w-3.5 h-3.5 ml-1" />
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cost Trends Area Chart */}
        <div className="lg:col-span-2 bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-semibold text-white">Daily Cost Attribution Trend</h2>
              <p className="text-xs text-slate-400">Attributed to Students vs Unallocated Overhead</p>
            </div>
            <div className="flex items-center space-x-3 text-xs">
              <span className="flex items-center text-emerald-400">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 mr-1.5" /> Direct
              </span>
              <span className="flex items-center text-sky-400">
                <span className="w-2.5 h-2.5 rounded-full bg-sky-500 mr-1.5" /> Estimated
              </span>
              <span className="flex items-center text-slate-400">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-500 mr-1.5" /> Unallocated
              </span>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={daily_trends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="date" stroke="#64748b" tick={{ fontSize: 11 }} />
                <YAxis stroke="#64748b" tick={{ fontSize: 11 }} tickFormatter={(v) => `$${v}`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem', fontSize: '12px' }} 
                  formatter={(val: any) => [`$${Number(val).toFixed(2)}`, '']}
                />
                <Area type="monotone" dataKey="direct" stackId="1" stroke="#10b981" fill="#10b981" fillOpacity={0.6} />
                <Area type="monotone" dataKey="estimated" stackId="1" stroke="#0ea5e9" fill="#0ea5e9" fillOpacity={0.5} />
                <Area type="monotone" dataKey="unallocated" stackId="1" stroke="#64748b" fill="#64748b" fillOpacity={0.4} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Service Breakdown Bar Chart */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-sm">
          <div className="mb-4">
            <h2 className="text-base font-semibold text-white">Spend by AWS Service</h2>
            <p className="text-xs text-slate-400">Aggregated AWS account billings</p>
          </div>

          <div className="space-y-3">
            {service_breakdown.map((item, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-300 font-medium">{item.service}</span>
                  <span className="text-slate-400 font-mono">${item.cost.toFixed(2)} ({item.percentage}%)</span>
                </div>
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div 
                    className="bg-indigo-500 h-full rounded-full transition-all duration-500" 
                    style={{ width: `${Math.min(100, item.percentage)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top Spenders Table */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-semibold text-white">Top Student Spenders</h2>
            <p className="text-xs text-slate-400">Students closest to or exceeding budget limits</p>
          </div>
          <button 
            onClick={onNavigateToStudents}
            className="text-xs text-indigo-400 hover:text-indigo-300 font-medium cursor-pointer"
          >
            View All Students →
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="pb-3 font-medium">Student</th>
                <th className="pb-3 font-medium">Student ID</th>
                <th className="pb-3 font-medium">Total Incurred</th>
                <th className="pb-3 font-medium">Budget Limit</th>
                <th className="pb-3 font-medium">Utilization</th>
                <th className="pb-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {top_spenders.map((s) => {
                const isOver = s.percentage_used >= 100;
                const isWarning = s.percentage_used >= 80 && !isOver;
                return (
                  <tr key={s.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 font-medium text-white">{s.full_name}</td>
                    <td className="py-3 text-slate-400 font-mono">{s.student_id}</td>
                    <td className="py-3 text-white font-mono font-semibold">${s.total_spent.toFixed(2)}</td>
                    <td className="py-3 text-slate-400 font-mono">${s.budget_limit.toFixed(2)}</td>
                    <td className="py-3">
                      <div className="flex items-center space-x-2">
                        <div className="w-24 bg-slate-800 h-1.5 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${isOver ? 'bg-rose-500' : isWarning ? 'bg-amber-500' : 'bg-emerald-500'}`}
                            style={{ width: `${Math.min(100, s.percentage_used)}%` }}
                          />
                        </div>
                        <span className={`font-mono text-[11px] ${isOver ? 'text-rose-400 font-bold' : isWarning ? 'text-amber-400' : 'text-slate-400'}`}>
                          {s.percentage_used}%
                        </span>
                      </div>
                    </td>
                    <td className="py-3">
                      {isOver ? (
                        <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[10px] font-semibold">
                          Over Budget
                        </span>
                      ) : isWarning ? (
                        <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px] font-semibold">
                          Warning 80%
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-semibold">
                          Healthy
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
