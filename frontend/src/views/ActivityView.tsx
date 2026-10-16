import React, { useState, useEffect } from 'react';
import { api } from '../api';
import type { ActivityEventItem } from '../api';
import { Search } from 'lucide-react';

export const ActivityView: React.FC = () => {
  const [events, setEvents] = useState<ActivityEventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchActivity = async () => {
    setLoading(true);
    try {
      const data = await api.listActivity(100);
      setEvents(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivity();
  }, []);

  const filteredEvents = events.filter((e) => {
    if (!search) return true;
    const pat = search.toLowerCase();
    return (
      e.event_name.toLowerCase().includes(pat) ||
      (e.iam_username && e.iam_username.toLowerCase().includes(pat)) ||
      (e.student_name && e.student_name.toLowerCase().includes(pat)) ||
      (e.resource_id && e.resource_id.toLowerCase().includes(pat))
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-white tracking-tight">AWS CloudTrail Activity Audit</h1>
        <p className="text-xs text-slate-400">Chronological management event stream mapped to student identities</p>
      </div>

      {/* Search */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-3 backdrop-blur-sm">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
          <input
            type="text"
            placeholder="Search API action, IAM user, student..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl overflow-hidden backdrop-blur-sm">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400">Ingesting CloudTrail events...</div>
        ) : filteredEvents.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400">No activity events recorded.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/40 text-slate-400">
                  <th className="py-3.5 px-4 font-medium">Timestamp</th>
                  <th className="py-3.5 px-4 font-medium">Event / API Action</th>
                  <th className="py-3.5 px-4 font-medium">Service Source</th>
                  <th className="py-3.5 px-4 font-medium">IAM Identity</th>
                  <th className="py-3.5 px-4 font-medium">Attributed Student</th>
                  <th className="py-3.5 px-4 font-medium">Resource Target</th>
                  <th className="py-3.5 px-4 font-medium">Type</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredEvents.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-4 font-mono text-slate-400 text-[11px] whitespace-nowrap">
                      {new Date(e.event_time).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 font-mono font-semibold text-white">
                      {e.event_name}
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-400">
                      {e.event_source}
                    </td>
                    <td className="py-3 px-4 font-mono text-indigo-300 text-[11px]">
                      {e.iam_username || <span className="text-slate-500 italic">aws-internal</span>}
                    </td>
                    <td className="py-3 px-4">
                      {e.student_name ? (
                        <span className="font-medium text-white">{e.student_name}</span>
                      ) : (
                        <span className="text-slate-500 italic">Unmapped</span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-300 text-[11px]">
                      {e.resource_id || <span className="text-slate-600">-</span>}
                    </td>
                    <td className="py-3 px-4">
                      {e.is_mutation ? (
                        <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-semibold">
                          Mutation
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 text-[10px]">
                          Read-Only
                        </span>
                      )}
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
