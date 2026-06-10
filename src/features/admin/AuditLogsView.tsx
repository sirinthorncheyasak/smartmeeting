import React, { useState, useMemo } from "react";
import { AuditLog } from "../../types";
import { Search, ShieldAlert, History, User, Activity, Clock } from "lucide-react";

interface AuditLogsViewProps {
  auditLogs: AuditLog[];
}

export default function AuditLogsView({ auditLogs }: AuditLogsViewProps) {
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("all");

  const filteredLogs = useMemo(() => {
    let result = [...auditLogs];

    // Simple search match on Actor, ID or Metadata
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      result = result.filter(log => 
        log.actor.toLowerCase().includes(q) ||
        log.documentId.toLowerCase().includes(q) ||
        log.action.toLowerCase().includes(q) ||
        (log.metadata && JSON.stringify(log.metadata).toLowerCase().includes(q))
      );
    }

    if (actionFilter !== "all") {
      result = result.filter(log => log.action === actionFilter);
    }

    // Sort by latest timestamp
    result.sort((a, b) => {
      const tA = a.timestamp?.seconds ? a.timestamp.seconds * 1000 : new Date(a.timestamp).getTime();
      const tB = b.timestamp?.seconds ? b.timestamp.seconds * 1000 : new Date(b.timestamp).getTime();
      return tB - tA;
    });

    return result;
  }, [auditLogs, search, actionFilter]);

  // Helper date renderer
  const renderTimestamp = (ts: any) => {
    if (!ts) return "Syncing...";
    const date = ts.seconds ? new Date(ts.seconds * 1000) : new Date(ts);
    return date.toLocaleString("th-TH") + " น.";
  };

  return (
    <div className="bg-white/60 backdrop-blur-md border border-white/80 rounded-[2rem] p-6 md:p-8 shadow-xl space-y-6">
      
      <div className="flex items-center gap-3 mb-2">
        <div className="p-3 bg-indigo-50 text-indigo-750 rounded-2xl border border-indigo-150">
          <ShieldAlert className="w-6 h-6 animate-pulse" />
        </div>
        <div>
          <h4 className="text-sm font-black text-slate-900">System Integration Audit Trails</h4>
          <p className="text-[11px] text-slate-400 font-medium">Real-time immutable ledger registering system interactions, workflow transitions, and authorization cycles</p>
        </div>
      </div>

      {/* Filter panel */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between pt-2 border-t border-slate-100">
        
        <div className="relative w-full md:max-w-md">
          <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search log items by administrator email, document serial ID..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-150 rounded-xl text-xs font-semibold focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100 transition-all text-slate-800"
          />
        </div>

        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="px-3.5 py-2.5 bg-white border border-slate-150 rounded-xl text-xs font-semibold focus:outline-none focus:border-indigo-400 text-slate-700 cursor-pointer w-full md:w-auto"
        >
          <option value="all">All Action Classes</option>
          <option value="create_inbound">Inbound Filings</option>
          <option value="create_outbound">Outbound Filings</option>
          <option value="approve_document">Document Approvals</option>
          <option value="reject_document">Document Rejections</option>
        </select>

      </div>

      {/* Logs Table Grid */}
      <div className="border border-slate-110 rounded-2xl overflow-hidden bg-white/40">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-100/50 text-slate-500 text-[10px] uppercase font-extrabold tracking-widest border-b border-slate-150">
                <th className="p-4">Action</th>
                <th className="p-4">Actor Email</th>
                <th className="p-4">Reference Document ID</th>
                <th className="p-4">Timestamp (UTC +7)</th>
                <th className="p-4">Payload Spec</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400 italic font-semibold">
                    No matching audit activities found in the datastore.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-white/70 transition-colors">
                    
                    {/* Action pill */}
                    <td className="p-4">
                      <span className={`px-2.5 py-1 text-[10px] font-black rounded-lg ${
                        log.action.includes("create_inbound") ? "bg-indigo-50 text-indigo-700 border border-indigo-150" :
                        log.action.includes("create_outbound") ? "bg-pink-50 text-pink-700 border border-pink-150" :
                        log.action.includes("approve") ? "bg-emerald-50 text-emerald-750 border border-emerald-150" :
                        "bg-red-50 text-red-750 border border-red-150"
                      }`}>
                        {log.action.toUpperCase()}
                      </span>
                    </td>

                    {/* Actor */}
                    <td className="p-4 font-bold text-slate-700 flex items-center gap-1.5 mt-2 md:mt-0">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      <span>{log.actor}</span>
                    </td>

                    {/* Document ID */}
                    <td className="p-4 font-mono font-medium text-slate-500">
                      {log.documentId}
                    </td>

                    {/* Timestamp */}
                    <td className="p-4 font-semibold text-slate-600">
                      {renderTimestamp(log.timestamp)}
                    </td>

                    {/* Metadata Payload code */}
                    <td className="p-4">
                      {log.metadata ? (
                        <code className="text-[10px] bg-slate-100 p-1 px-1.5 rounded text-indigo-600 block max-w-xs truncate font-mono">
                          {JSON.stringify(log.metadata)}
                        </code>
                      ) : (
                        <span className="text-slate-350 italic font-medium">None</span>
                      )}
                    </td>

                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
