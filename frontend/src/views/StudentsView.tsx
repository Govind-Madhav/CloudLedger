import React, { useState, useEffect } from 'react';
import { api } from '../api';
import type { Student } from '../api';
import { 
  Search, Plus, X, DollarSign, Key, Server 
} from 'lucide-react';

export const StudentsView: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [overBudgetOnly, setOverBudgetOnly] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  // New Student Form
  const [newRoll, setNewRoll] = useState('');
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newCourse, setNewCourse] = useState('CS401-CLOUD');
  const [newBudget, setNewBudget] = useState(40.0);
  const [newIAM, setNewIAM] = useState('');
  const [createLoading, setCreateLoading] = useState(false);

  // Map IAM Form
  const [mapIAMUsername, setMapIAMUsername] = useState('');
  const [mappingLoading, setMappingLoading] = useState(false);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const data = await api.listStudents({
        search: search || undefined,
        over_budget_only: overBudgetOnly || undefined,
      });
      setStudents(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, [search, overBudgetOnly]);

  const handleOpenDetail = async (studentId: string) => {
    try {
      const detail = await api.getStudentDetail(studentId);
      setSelectedStudent(detail);
      setMapIAMUsername('');
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateLoading(true);
    try {
      await api.createStudent({
        student_id: newRoll,
        full_name: newName,
        email: newEmail,
        course_code: newCourse,
        budget_limit: Number(newBudget),
        iam_username: newIAM || undefined,
      });
      setShowAddModal(false);
      setNewRoll('');
      setNewName('');
      setNewEmail('');
      setNewIAM('');
      fetchStudents();
    } catch (err: any) {
      alert(err.message || 'Failed to create student');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleMapIAM = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent || !mapIAMUsername) return;
    setMappingLoading(true);
    try {
      await api.mapIAM(selectedStudent.student.id, mapIAMUsername);
      const updated = await api.getStudentDetail(selectedStudent.student.id);
      setSelectedStudent(updated);
      setMapIAMUsername('');
      fetchStudents();
    } catch (err: any) {
      alert(err.message || 'Failed to map IAM user');
    } finally {
      setMappingLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Student Roster & IAM Mapping</h1>
          <p className="text-xs text-slate-400">Track student cloud allocations, mapped AWS IAM identities, and incurred costs</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center space-x-2 transition-colors cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Register Student</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/60 border border-slate-800/80 rounded-2xl p-3 backdrop-blur-sm">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
          <input
            type="text"
            placeholder="Search by name, roll no, or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center space-x-3 w-full sm:w-auto justify-end">
          <label className="flex items-center space-x-2 text-xs text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={overBudgetOnly}
              onChange={(e) => setOverBudgetOnly(e.target.checked)}
              className="rounded bg-slate-950 border-slate-800 text-indigo-600 focus:ring-0"
            />
            <span>Over Budget Only</span>
          </label>
        </div>
      </div>

      {/* Table */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl overflow-hidden backdrop-blur-sm">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400">Loading student roster...</div>
        ) : students.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400">No students found matching filters.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/40 text-slate-400">
                  <th className="py-3.5 px-4 font-medium">Student</th>
                  <th className="py-3.5 px-4 font-medium">ID / Course</th>
                  <th className="py-3.5 px-4 font-medium">Mapped IAM User</th>
                  <th className="py-3.5 px-4 font-medium">Incurred Cost</th>
                  <th className="py-3.5 px-4 font-medium">Budget Cap</th>
                  <th className="py-3.5 px-4 font-medium">Active Resources</th>
                  <th className="py-3.5 px-4 font-medium">Status</th>
                  <th className="py-3.5 px-4 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {students.map((s) => {
                  const isOver = s.budget_used_percentage >= 100;
                  const isWarning = s.budget_used_percentage >= 80 && !isOver;
                  const iamUser = s.iam_identities[0]?.iam_username;

                  return (
                    <tr key={s.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-4">
                        <span className="font-semibold text-white block">{s.full_name}</span>
                        <span className="text-[11px] text-slate-500">{s.email}</span>
                      </td>
                      <td className="py-3 px-4 font-mono">
                        <span className="text-slate-300 block">{s.student_id}</span>
                        <span className="text-[10px] text-slate-500">{s.course_code}</span>
                      </td>
                      <td className="py-3 px-4">
                        {iamUser ? (
                          <span className="px-2 py-0.5 rounded-md bg-slate-800 text-indigo-300 font-mono text-[11px] border border-slate-700/60">
                            {iamUser}
                          </span>
                        ) : (
                          <span className="text-rose-400 text-[11px] italic">Not mapped</span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono font-semibold text-white">
                        ${s.total_spend.toFixed(2)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-2">
                          <span className="font-mono text-slate-400">${s.budget_limit.toFixed(2)}</span>
                          <span className={`text-[10px] font-mono ${isOver ? 'text-rose-400 font-bold' : isWarning ? 'text-amber-400' : 'text-slate-500'}`}>
                            ({s.budget_used_percentage}%)
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-300">
                        {s.active_resource_count} active
                      </td>
                      <td className="py-3 px-4">
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
                            Active
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleOpenDetail(s.id)}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-indigo-300 text-xs font-medium transition-colors cursor-pointer"
                        >
                          Details →
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Student Detail Slide-Over / Modal */}
      {selectedStudent && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-end">
          <div className="w-full max-w-xl bg-slate-900 border-l border-slate-800 h-full overflow-y-auto p-6 space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div>
                <h2 className="text-lg font-bold text-white">{selectedStudent.student.full_name}</h2>
                <p className="text-xs text-slate-400">{selectedStudent.student.student_id} • {selectedStudent.student.email}</p>
              </div>
              <button
                onClick={() => setSelectedStudent(null)}
                className="w-8 h-8 rounded-lg bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Budget & Spend Summary */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                <span className="text-xs text-slate-500">Incurred Cloud Cost</span>
                <div className="text-2xl font-bold text-white mt-1 font-mono">
                  ${selectedStudent.student.total_spend.toFixed(2)}
                </div>
                <span className="text-[11px] text-indigo-400">
                  {selectedStudent.student.budget_used_percentage}% of allocated budget
                </span>
              </div>
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                <span className="text-xs text-slate-500">Budget Limit</span>
                <div className="text-2xl font-bold text-slate-300 mt-1 font-mono">
                  ${selectedStudent.student.budget_limit.toFixed(2)}
                </div>
                <span className="text-[11px] text-slate-400">{selectedStudent.student.course_code}</span>
              </div>
            </div>

            {/* Mapped IAM Identities */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-white flex items-center space-x-2">
                <Key className="w-4 h-4 text-indigo-400" />
                <span>Mapped AWS IAM Identities</span>
              </h3>

              {selectedStudent.iam_identities.length === 0 ? (
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-400">
                  No AWS IAM user mapped to this student yet.
                </div>
              ) : (
                <div className="space-y-2">
                  {selectedStudent.iam_identities.map((iam: any) => (
                    <div key={iam.id} className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-mono text-indigo-300 font-semibold">{iam.iam_username}</span>
                        <p className="text-[11px] text-slate-500 font-mono mt-0.5 truncate max-w-sm">{iam.iam_user_arn}</p>
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px]">Active</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Add / Map IAM Form */}
              <form onSubmit={handleMapIAM} className="flex space-x-2 pt-2">
                <input
                  type="text"
                  placeholder="AWS IAM Username (e.g. student-john)"
                  value={mapIAMUsername}
                  onChange={(e) => setMapIAMUsername(e.target.value)}
                  className="flex-1 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-indigo-500"
                />
                <button
                  type="submit"
                  disabled={mappingLoading || !mapIAMUsername}
                  className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {mappingLoading ? 'Mapping...' : 'Link IAM'}
                </button>
              </form>
            </div>

            {/* Discovered AWS Resources */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-white flex items-center space-x-2">
                <Server className="w-4 h-4 text-emerald-400" />
                <span>Active Resources Owned ({selectedStudent.resources.length})</span>
              </h3>

              <div className="space-y-2">
                {selectedStudent.resources.map((r: any) => (
                  <div key={r.id} className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-mono text-slate-200 font-medium">{r.resource_id}</span>
                      <p className="text-[11px] text-slate-500 uppercase">{r.service_name} • {r.resource_type}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      {r.is_tagged_compliant ? (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px]">
                          Tagged
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[10px]">
                          Untagged
                        </span>
                      )}
                      <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 font-mono text-[10px]">
                        {r.current_status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Cost History */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-white flex items-center space-x-2">
                <DollarSign className="w-4 h-4 text-cyan-400" />
                <span>Attributed Cost History</span>
              </h3>

              <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1">
                {selectedStudent.cost_history.map((ca: any) => (
                  <div key={ca.id} className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-slate-400 font-mono text-[11px]">{ca.billing_date}</span>
                      <p className="text-[11px] text-slate-500">{ca.notes}</p>
                    </div>
                    <div className="text-right">
                      <span className="font-mono font-semibold text-white">${ca.attributed_amount.toFixed(2)}</span>
                      <span className="block text-[10px] text-emerald-400 uppercase font-mono">{ca.attribution_tier}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Student Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
              <h2 className="text-base font-bold text-white">Register Student for Lab</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="w-7 h-7 rounded-lg bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateStudent} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Student Roll / ID Number</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. STU-2026-007"
                  value={newRoll}
                  onChange={(e) => setNewRoll(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ananya Sen"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">University Email</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. ananya.s@univ.edu"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Course Code</label>
                  <input
                    type="text"
                    required
                    value={newCourse}
                    onChange={(e) => setNewCourse(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Budget Limit ($USD)</label>
                  <input
                    type="number"
                    step="5"
                    required
                    value={newBudget}
                    onChange={(e) => setNewBudget(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">AWS IAM Username (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. student-ananya"
                  value={newIAM}
                  onChange={(e) => setNewIAM(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="pt-3">
                <button
                  type="submit"
                  disabled={createLoading}
                  className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {createLoading ? 'Registering...' : 'Register Student'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
