import React, { useState, useEffect } from 'react';
import { api } from '../api';
import type { AWSResourceItem, Student } from '../api';
import { 
  Search, ShieldAlert, CheckCircle2, X 
} from 'lucide-react';

interface ResourcesViewProps {
  initialUntaggedOnly?: boolean;
}

export const ResourcesView: React.FC<ResourcesViewProps> = ({ initialUntaggedOnly = false }) => {
  const [resources, setResources] = useState<AWSResourceItem[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [serviceFilter, setServiceFilter] = useState('');
  const [untaggedOnly, setUntaggedOnly] = useState(initialUntaggedOnly);
  const [search, setSearch] = useState('');

  // Reassignment Modal
  const [reassignTarget, setReassignTarget] = useState<AWSResourceItem | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [reassignLoading, setReassignLoading] = useState(false);

  const fetchResources = async () => {
    setLoading(true);
    try {
      const data = await api.listResources({
        service_name: serviceFilter || undefined,
        untagged_only: untaggedOnly || undefined,
        search: search || undefined,
      });
      setResources(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async () => {
    try {
      const data = await api.listStudents();
      setStudents(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchResources();
    fetchStudents();
  }, [serviceFilter, untaggedOnly, search]);

  const handleReassign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reassignTarget) return;
    setReassignLoading(true);
    try {
      await api.reassignResource(reassignTarget.id, selectedStudentId || null);
      setReassignTarget(null);
      fetchResources();
    } catch (err: any) {
      alert(err.message || 'Failed to reassign resource');
    } finally {
      setReassignLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">AWS Resource Inventory & Tag Governance</h1>
          <p className="text-xs text-slate-400">Discover live cloud resources, audit tag compliance, and resolve ownership</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/60 border border-slate-800/80 rounded-2xl p-3 backdrop-blur-sm">
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
            <input
              type="text"
              placeholder="Search resource ID or ARN..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-indigo-500"
            />
          </div>

          <select
            value={serviceFilter}
            onChange={(e) => setServiceFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-indigo-500"
          >
            <option value="">All AWS Services</option>
            <option value="ec2">Amazon EC2</option>
            <option value="s3">Amazon S3</option>
            <option value="rds">Amazon RDS</option>
            <option value="lambda">AWS Lambda</option>
            <option value="vpc">Amazon VPC / NAT</option>
          </select>
        </div>

        <div className="flex items-center space-x-3 w-full sm:w-auto justify-end">
          <label className="flex items-center space-x-2 text-xs text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={untaggedOnly}
              onChange={(e) => setUntaggedOnly(e.target.checked)}
              className="rounded bg-slate-950 border-slate-800 text-rose-500 focus:ring-0"
            />
            <span className={untaggedOnly ? 'text-rose-400 font-semibold' : ''}>Untagged Only</span>
          </label>
        </div>
      </div>

      {/* Table */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl overflow-hidden backdrop-blur-sm">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400">Scanning resource catalog...</div>
        ) : resources.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400">No resources found matching filter criteria.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/40 text-slate-400">
                  <th className="py-3.5 px-4 font-medium">Resource ID</th>
                  <th className="py-3.5 px-4 font-medium">Service / Type</th>
                  <th className="py-3.5 px-4 font-medium">Region</th>
                  <th className="py-3.5 px-4 font-medium">Attributed Owner</th>
                  <th className="py-3.5 px-4 font-medium">Tags</th>
                  <th className="py-3.5 px-4 font-medium">Compliance</th>
                  <th className="py-3.5 px-4 font-medium">Status</th>
                  <th className="py-3.5 px-4 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {resources.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-4">
                      <span className="font-mono font-semibold text-white block">{r.resource_id}</span>
                      <span className="text-[10px] text-slate-500 font-mono truncate max-w-xs block">{r.resource_arn}</span>
                    </td>
                    <td className="py-3 px-4 uppercase font-mono text-[11px] text-slate-300">
                      <span className="px-1.5 py-0.5 rounded bg-slate-800 text-indigo-300 font-semibold mr-1.5">
                        {r.service_name}
                      </span>
                      {r.resource_type}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-400 text-[11px]">{r.region}</td>
                    <td className="py-3 px-4">
                      {r.attributed_student_name ? (
                        <span className="text-white font-medium block">{r.attributed_student_name}</span>
                      ) : (
                        <span className="text-slate-500 italic">Unassigned (Overhead)</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {Object.keys(r.tags).length === 0 ? (
                        <span className="text-rose-400 text-[10px] italic">No tags</span>
                      ) : (
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {Object.entries(r.tags).map(([k, v]) => (
                            <span key={k} className="px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 text-[10px] font-mono text-slate-300">
                              {k}:{v}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {r.is_tagged_compliant ? (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] flex items-center space-x-1 w-max">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Compliant</span>
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[10px] flex items-center space-x-1 w-max font-semibold">
                          <ShieldAlert className="w-3 h-3" />
                          <span>Untagged</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px]">
                      <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300">
                        {r.current_status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => {
                          setReassignTarget(r);
                          setSelectedStudentId(r.attributed_student_id || '');
                        }}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-indigo-300 text-xs font-medium transition-colors cursor-pointer"
                      >
                        Reassign
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Reassign Ownership Modal */}
      {reassignTarget && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
              <h2 className="text-base font-bold text-white">Reassign Resource Ownership</h2>
              <button
                onClick={() => setReassignTarget(null)}
                className="w-7 h-7 rounded-lg bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleReassign} className="space-y-4 text-xs">
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <span className="text-slate-500 block text-[11px]">Selected Resource</span>
                <span className="font-mono text-white font-semibold text-xs">{reassignTarget.resource_id}</span>
                <span className="text-slate-400 block text-[10px] uppercase mt-0.5">{reassignTarget.service_name} • {reassignTarget.resource_type}</span>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Assign Ownership To:</label>
                <select
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-indigo-500"
                >
                  <option value="">None / Unassigned (Shared Infrastructure)</option>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.full_name} ({s.student_id})
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={reassignLoading}
                  className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {reassignLoading ? 'Updating Ownership...' : 'Confirm Ownership Assignment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
