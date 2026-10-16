import React, { useState, useEffect } from 'react';
import { api } from '../api';
import type { SyncStatusItem, AlertItem } from '../api';
import { 
  RefreshCw, AlertTriangle, CheckCircle2, Sparkles 
} from 'lucide-react';

export const SystemView: React.FC = () => {
  const [syncHistory, setSyncHistory] = useState<SyncStatusItem[]>([]);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  const fetchSystemData = async () => {
    try {
      const [runs, alertList] = await Promise.all([
        api.getSyncStatus(),
        api.listAlerts(),
      ]);
      setSyncHistory(runs);
      setAlerts(alertList);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchSystemData();
  }, []);

  const handleTriggerSync = async () => {
    setSyncing(true);
    setSyncMessage(null);
    try {
      const res = await api.triggerSync();
      setSyncMessage(res.message);
      fetchSystemData();
    } catch (err: any) {
      alert(err.message || 'Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  const handleSeedDemo = async () => {
    if (!confirm('Re-seed the academic demo cloud environment dataset?')) return;
    setSeeding(true);
    try {
      await api.seedDemo();
      fetchSystemData();
      alert('Demo dataset re-seeded successfully.');
    } catch (err: any) {
      alert(err.message || 'Seeding failed');
    } finally {
      setSeeding(false);
    }
  };

  const handleAcknowledgeAlert = async (id: string) => {
    try {
      await api.acknowledgeAlert(id);
      fetchSystemData();
    } catch (err: any) {
      alert(err.message || 'Failed to acknowledge alert');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">System Health & Ingestion Pipeline</h1>
          <p className="text-xs text-slate-400">Manage Boto3 collectors, trigger ingestion cycles, and audit operational alerts</p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleTriggerSync}
            disabled={syncing}
            className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center space-x-2 transition-colors disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
            <span>{syncing ? 'Syncing...' : 'Trigger Ingestion Sync'}</span>
          </button>

          <button
            onClick={handleSeedDemo}
            disabled={seeding}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-semibold flex items-center space-x-1.5 transition-colors disabled:opacity-50 cursor-pointer border border-slate-700/60"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Re-seed Demo Data</span>
          </button>
        </div>
      </div>

      {syncMessage && (
        <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 text-indigo-400" />
          <span>{syncMessage}</span>
        </div>
      )}

      {/* Security & Budget Alerts Section */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-rose-400" />
            <h2 className="text-sm font-semibold text-white">Security & Budget Overrun Alerts</h2>
          </div>
          <span className="text-xs text-slate-400">
            {alerts.filter((a) => !a.is_acknowledged).length} unacknowledged
          </span>
        </div>

        {alerts.length === 0 ? (
          <div className="p-6 rounded-xl bg-slate-950/40 text-center text-xs text-slate-500">
            All systems clear. No open budget or compliance alerts.
          </div>
        ) : (
          <div className="space-y-2">
            {alerts.map((a) => (
              <div
                key={a.id}
                className={`p-3.5 rounded-xl border flex items-start justify-between text-xs transition-colors ${
                  a.is_acknowledged
                    ? 'bg-slate-950/30 border-slate-800/40 text-slate-500'
                    : a.severity === 'critical'
                    ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                    : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                }`}
              >
                <div className="space-y-1 max-w-xl">
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold uppercase tracking-wider text-[10px] px-1.5 py-0.5 rounded bg-slate-950">
                      {a.alert_type}
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {new Date(a.created_at).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-xs text-slate-200">{a.message}</p>
                </div>

                {!a.is_acknowledged && (
                  <button
                    onClick={() => handleAcknowledgeAlert(a.id)}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-medium transition-colors cursor-pointer flex-shrink-0"
                  >
                    Acknowledge
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Collector Runs History */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl overflow-hidden backdrop-blur-sm">
        <div className="p-4 border-b border-slate-800 bg-slate-950/40">
          <h2 className="text-sm font-semibold text-white">Boto3 Collector Execution Log</h2>
          <p className="text-xs text-slate-400">Audit trail of automated CloudTrail, resource scan, and billing runs</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="py-3 px-4 font-medium">Timestamp</th>
                <th className="py-3 px-4 font-medium">Collector Type</th>
                <th className="py-3 px-4 font-medium">Mode</th>
                <th className="py-3 px-4 font-medium">Records Processed</th>
                <th className="py-3 px-4 font-medium">Run Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {syncHistory.map((run, i) => (
                <tr key={i} className="hover:bg-slate-800/30 transition-colors">
                  <td className="py-3 px-4 font-mono text-slate-300 text-[11px]">
                    {run.last_sync ? new Date(run.last_sync).toLocaleString() : 'Just now'}
                  </td>
                  <td className="py-3 px-4 font-mono font-semibold text-white uppercase text-[11px]">
                    {run.collector_type}
                  </td>
                  <td className="py-3 px-4">
                    {run.is_mock ? (
                      <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 text-[10px]">
                        Demo Adapter
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px]">
                        Live AWS
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-300">
                    {run.records_processed} records
                  </td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 text-[10px] font-semibold">
                      {run.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
