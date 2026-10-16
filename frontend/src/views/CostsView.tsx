import React, { useState, useEffect } from 'react';
import { api } from '../api';
import type { CostAttributionItem } from '../api';
import { Info } from 'lucide-react';

export const CostsView: React.FC = () => {
  const [attributions, setAttributions] = useState<CostAttributionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [tierFilter, setTierFilter] = useState<string>('');

  const fetchAttributions = async () => {
    setLoading(true);
    try {
      const data = await api.listAttributions(tierFilter || undefined);
      setAttributions(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttributions();
  }, [tierFilter]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-white tracking-tight">AWS Cost Allocation & Attribution Ledger</h1>
        <p className="text-xs text-slate-400">Reconciled financial records with auditable attribution classifications</p>
      </div>

      {/* FinOps Principles Educational Callout */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 backdrop-blur-sm space-y-2">
        <div className="flex items-center space-x-2 text-indigo-400 font-semibold text-xs">
          <Info className="w-4 h-4" />
          <span>FinOps Attribution Architecture Principles</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/60">
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span className="font-semibold text-emerald-400">Direct Attribution</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Exact correlation via User-Defined Cost Allocation Tags (<code className="text-slate-300">Owner</code>) or verified CloudTrail resource creation provenance.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/60">
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-500" />
              <span className="font-semibold text-sky-400">Estimated Allocation</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Pro-rata estimation for shared hourly usage (e.g., regional data egress) where student instances were active during that billing window.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/60">
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-500" />
              <span className="font-semibold text-slate-300">Unallocated Baseline</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Account-level shared overhead (shared NAT Gateways, Route 53 zones, AWS Support, Tax) not attributable to any individual student.
            </p>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center space-x-2">
        {[
          { label: 'All Records', value: '' },
          { label: 'Direct Only', value: 'direct' },
          { label: 'Estimated Only', value: 'estimated' },
          { label: 'Unallocated Only', value: 'unallocated' },
        ].map((tab) => (
          <button
            key={tab.value}
            onClick={() => setTierFilter(tab.value)}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
              tierFilter === tab.value
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-900/60 border border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl overflow-hidden backdrop-blur-sm">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400">Fetching attribution records...</div>
        ) : attributions.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400">No cost records found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/40 text-slate-400">
                  <th className="py-3.5 px-4 font-medium">Billing Date</th>
                  <th className="py-3.5 px-4 font-medium">Attributed Amount</th>
                  <th className="py-3.5 px-4 font-medium">Classification</th>
                  <th className="py-3.5 px-4 font-medium">Confidence Score</th>
                  <th className="py-3.5 px-4 font-medium">Assigned Student</th>
                  <th className="py-3.5 px-4 font-medium">Provenance Justification</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {attributions.map((ca) => (
                  <tr key={ca.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-4 font-mono text-slate-300 text-[11px]">{ca.billing_date}</td>
                    <td className="py-3 px-4 font-mono font-bold text-white text-xs">
                      ${ca.attributed_amount.toFixed(2)}
                    </td>
                    <td className="py-3 px-4">
                      {ca.attribution_tier === 'direct' ? (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-semibold">
                          DIRECT
                        </span>
                      ) : ca.attribution_tier === 'estimated' ? (
                        <span className="px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20 text-[10px] font-semibold">
                          ESTIMATED
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 text-[10px] font-semibold">
                          UNALLOCATED
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-400">
                      {(ca.confidence_score * 100).toFixed(0)}%
                    </td>
                    <td className="py-3 px-4 font-medium text-white">
                      {ca.student_name || <span className="text-slate-500 italic">Unallocated (Shared Lab)</span>}
                    </td>
                    <td className="py-3 px-4 text-slate-400 text-[11px]">
                      {ca.notes || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
