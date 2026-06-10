import React, { useState, useMemo } from "react";
import { Document, AuditLog } from "../../types";
import { auth } from "../../firebase";
import { approveDocument, rejectDocument, updateDocumentDetails, deleteDocument } from "../../services/documentService";
import { 
  Search, 
  Filter, 
  SlidersHorizontal, 
  Calendar, 
  ArrowDownLeft, 
  ArrowUpRight, 
  FileText, 
  Clock, 
  CheckCircle, 
  XSquare, 
  ChevronLeft, 
  ChevronRight, 
  Eye, 
  AlertTriangle,
  Send,
  User,
  History,
  Edit,
  Trash2,
  Download
} from "lucide-react";

interface DocumentTableProps {
  documents: Document[];
  auditLogs: AuditLog[];
  isAdmin: boolean;
  onRefreshNeeded: () => void;
}

export default function DocumentTable({ documents, auditLogs, isAdmin, onRefreshNeeded }: DocumentTableProps) {
  // Query Filtering states
  const [searchQuery, setSearchQuery] = useState("");
  const [directionFilter, setDirectionFilter] = useState<"all" | "in" | "out">("all");
  const [sorting, setSorting] = useState<"newest" | "oldest" | "alphabetical">("newest");
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Selected Detail Modal
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [rejectionTextInput, setRejectionTextInput] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [modalActionLoading, setModalActionLoading] = useState(false);
  const [modalError, setModalError] = useState("");

  // Editing state for admin
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");

  // Process and Filter records
  const filteredDocs = useMemo(() => {
    let result = [...documents];

    // Search query
    if (searchQuery.trim()) {
      const sq = searchQuery.toLowerCase().trim();
      result = result.filter(d => 
        d.title.toLowerCase().includes(sq) ||
        d.documentNumber?.toLowerCase().includes(sq) ||
        d.createdBy.toLowerCase().includes(sq) ||
        d.createdByName.toLowerCase().includes(sq) ||
        d.description?.toLowerCase().includes(sq)
      );
    }

    // Direction Matcher
    if (directionFilter !== "all") {
      result = result.filter(d => d.direction === directionFilter);
    }

    // Custom Sorter
    if (sorting === "newest") {
      result.sort((a, b) => {
        const tA = a.createdAt?.seconds ? a.createdAt.seconds * 1000 : new Date(a.createdAt).getTime();
        const tB = b.createdAt?.seconds ? b.createdAt.seconds * 1000 : new Date(b.createdAt).getTime();
        return tB - tA;
      });
    } else if (sorting === "oldest") {
      result.sort((a, b) => {
        const tA = a.createdAt?.seconds ? a.createdAt.seconds * 1000 : new Date(a.createdAt).getTime();
        const tB = b.createdAt?.seconds ? b.createdAt.seconds * 1000 : new Date(b.createdAt).getTime();
        return tA - tB;
      });
    } else if (sorting === "alphabetical") {
      result.sort((a, b) => a.title.localeCompare(b.title));
    }

    return result;
  }, [documents, searchQuery, directionFilter, sorting]);

  // Paginated List
  const paginatedDocs = useMemo(() => {
    const startIdx = (currentPage - 1) * itemsPerPage;
    return filteredDocs.slice(startIdx, startIdx + itemsPerPage);
  }, [filteredDocs, currentPage]);

  const totalPages = Math.ceil(filteredDocs.length / itemsPerPage) || 1;

  // Active Audit timeline for selected doc
  const docAuditLogs = useMemo(() => {
    if (!selectedDoc) return [];
    return auditLogs
      .filter(l => l.documentId === selectedDoc.id)
      .sort((a, b) => {
        const tA = a.timestamp?.seconds ? a.timestamp.seconds * 1000 : new Date(a.timestamp).getTime();
        const tB = b.timestamp?.seconds ? b.timestamp.seconds * 1000 : new Date(b.timestamp).getTime();
        return tB - tA; // latest logs first
      });
  }, [selectedDoc, auditLogs]);

  // ----------------------------------------------------
  // Action triggers for review panel (Admins Only)
  // ----------------------------------------------------
  const handleApprove = async () => {
    if (!selectedDoc) return;
    const adminEmail = auth.currentUser?.email || "kulachet.l@bu.ac.th";
    setModalActionLoading(true);
    setModalError("");
    try {
      await approveDocument(selectedDoc.id, adminEmail);
      // Synchronize the modal data view from the latest stream
      const refreshedDoc = documents.find(d => d.id === selectedDoc.id);
      setSelectedDoc(refreshedDoc || null);
      onRefreshNeeded();
    } catch (err: any) {
      setModalError(err.message || "Failed to approve document.");
    } finally {
      setModalActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selectedDoc || !rejectionTextInput.trim()) {
      setModalError("Please enter a clear reason for rejecting the document.");
      return;
    }
    const adminEmail = auth.currentUser?.email || "kulachet.l@bu.ac.th";
    setModalActionLoading(true);
    setModalError("");
    try {
      await rejectDocument(selectedDoc.id, adminEmail, rejectionTextInput);
      const refreshedDoc = documents.find(d => d.id === selectedDoc.id);
      setSelectedDoc(refreshedDoc || null);
      setRejectionTextInput("");
      setShowRejectForm(false);
      onRefreshNeeded();
    } catch (err: any) {
      setModalError(err.message || "Failed to reject document.");
    } finally {
      setModalActionLoading(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!selectedDoc) return;
    if (!editTitle.trim()) {
      setModalError("Please enter a valid document title.");
      return;
    }

    const adminEmail = auth.currentUser?.email || "sirinthorn.c@bu.ac.th";
    setModalActionLoading(true);
    setModalError("");
    try {
      await updateDocumentDetails(selectedDoc.id, editTitle, editDescription, adminEmail);
      
      // Update selected doc locally
      const updated = {
        ...selectedDoc,
        title: editTitle.trim(),
        description: editDescription.trim(),
      };
      setSelectedDoc(updated);
      setIsEditing(false);
      onRefreshNeeded();
    } catch (err: any) {
      setModalError(err.message || "Failed to update document details.");
    } finally {
      setModalActionLoading(false);
    }
  };

  const handleDeleteDocument = async () => {
    if (!selectedDoc) return;
    if (!window.confirm("Are you absolutely sure you want to permanently delete this document? This action is IRREVERSIBLE and will write a secure audit log.")) {
      return;
    }

    const adminEmail = auth.currentUser?.email || "sirinthorn.c@bu.ac.th";
    setModalActionLoading(true);
    setModalError("");
    try {
      await deleteDocument(selectedDoc.id, adminEmail);
      setSelectedDoc(null);
      setIsEditing(false);
      onRefreshNeeded();
    } catch (err: any) {
      setModalError(err.message || "Failed to delete document.");
    } finally {
      setModalActionLoading(false);
    }
  };

  const handleDownloadCSV = () => {
    // Only outbound documents
    const outboundDocs = documents.filter(d => d.type === "outbound");
    if (outboundDocs.length === 0) {
      alert("No outbound documents available to export.");
      return;
    }

    // Define columns
    const headers = ["Document ID", "Outbound Ref ID", "Title", "Description", "Registrant Name", "Registrant Email", "Submission Date", "Status"];
    
    // Map data rows
    const rows = outboundDocs.map(docItem => {
      const ts = docItem.createdAt;
      const dateStr = ts 
        ? (ts.seconds ? new Date(ts.seconds * 1000) : new Date(ts)).toISOString()
        : "";
      return [
        docItem.id,
        docItem.documentNumber || "",
        `"${(docItem.title || "").replace(/"/g, '""')}"`,
        `"${(docItem.description || "").replace(/"/g, '""')}"`,
        `"${(docItem.createdByName || "").replace(/"/g, '""')}"`,
        docItem.createdBy || "",
        dateStr,
        docItem.status || ""
      ];
    });

    // Create CSV content with correct UTF-8 BOM so Thai characters display correctly in Excel!
    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    
    // Download triggers
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("id", "download-csv-link");
    link.setAttribute("href", url);
    link.setAttribute("download", `outbound_documents_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Helper date rendering
  const renderTimestamp = (ts: any) => {
    if (!ts) return "Processing...";
    const date = ts.seconds ? new Date(ts.seconds * 1000) : new Date(ts);
    return date.toLocaleString("th-TH", {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    }) + " น.";
  };

  return (
    <div className="space-y-6">
      
      {/* Search and Filters Strip */}
      <div className="bg-white/60 backdrop-blur-md border border-white/80 rounded-[2rem] p-5 shadow-sm space-y-4">
        
        {/* Row 1: Search & sorting */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          
          <div className="relative w-full md:max-w-md">
            <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search documents by serial number, description, signee..."
              className="w-full pl-10 pr-4 py-2.5 bg-white/50 border border-slate-150 rounded-xl text-xs font-semibold focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100 transition-all text-slate-800"
            />
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <SlidersHorizontal className="w-4 h-4 text-slate-400 hidden sm:inline" />
            <select
              value={sorting}
              onChange={(e: any) => setSorting(e.target.value)}
              className="px-3.5 py-2.5 bg-white/50 border border-slate-150 rounded-xl text-xs font-semibold focus:outline-none focus:border-indigo-400 text-slate-700 cursor-pointer flex-1 sm:flex-initial"
            >
              <option value="newest">Latest uploads</option>
              <option value="oldest">Historical uploads</option>
              <option value="alphabetical">Title A-Z</option>
            </select>
          </div>

        </div>

        {/* Row 2: Filtering pill groups */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-slate-100">
          
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Classification (ประเภท):</span>
            <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-150">
              <button 
                onClick={() => { setDirectionFilter("all"); setCurrentPage(1); }}
                className={`px-3 py-1 text-[11px] font-bold rounded-md transition-colors ${directionFilter === "all" ? "bg-white text-indigo-755 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
              >
                All
              </button>
              <button 
                onClick={() => { setDirectionFilter("in"); setCurrentPage(1); }}
                className={`px-3 py-1 text-[11px] font-bold rounded-md transition-colors flex items-center gap-1 ${directionFilter === "in" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
              >
                <ArrowDownLeft className="w-3 h-3 text-indigo-505" /> Inbound (รับเข้า)
              </button>
              <button 
                onClick={() => { setDirectionFilter("out"); setCurrentPage(1); }}
                className={`px-3 py-1 text-[11px] font-bold rounded-md transition-colors flex items-center gap-1 ${directionFilter === "out" ? "bg-white text-pink-600 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
              >
                <ArrowUpRight className="w-3 h-3 text-pink-505" /> Outbound (ส่งออก)
              </button>
            </div>
          </div>

          {isAdmin && (
            <button
              onClick={handleDownloadCSV}
              className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-650 hover:from-emerald-700 hover:to-teal-750 text-white text-[11px] font-black rounded-xl shadow-sm hover:shadow-emerald-250 transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <Download className="w-3.5 h-3.5" />
              Download Outbound (.csv)
            </button>
          )}

        </div>

      </div>

      {/* Grid List View Table */}
      <div className="bg-white/60 backdrop-blur-md border border-white/80 rounded-[2rem] shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-100/50 text-slate-550 border-b border-white">
                <th className="p-4 text-[10px] font-extrabold uppercase tracking-widest">Serial Code / Type</th>
                <th className="p-4 text-[10px] font-extrabold uppercase tracking-widest">Document Title</th>
                <th className="p-4 text-[10px] font-extrabold uppercase tracking-widest">Registrant</th>
                <th className="p-4 text-[10px] font-extrabold uppercase tracking-widest">Submission Date</th>
                <th className="p-4 text-[10px] font-extrabold uppercase tracking-widest">Status</th>
                <th className="p-4 text-[10px] font-extrabold uppercase tracking-widest text-center">{isAdmin ? "Manage / Edit" : "Details"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedDocs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-xs text-slate-400 font-semibold italic">
                    No document records matching selection parameters have been registered.
                  </td>
                </tr>
              ) : (
                paginatedDocs.map((docItem) => (
                  <tr key={docItem.id} className="hover:bg-white/40 transition-colors">
                    
                    {/* Serial / Type */}
                    <td className="p-4">
                      {docItem.type === "outbound" ? (
                        <div className="space-y-1">
                          <span className="px-2 py-0.5 bg-pink-100 text-pink-700 rounded-full font-mono font-bold text-[10px] inline-block tracking-wide">
                            {docItem.documentNumber || "Generating..."}
                          </span>
                          <span className="block text-[9px] text-pink-500 font-bold uppercase tracking-wider flex items-center gap-0.5">
                            <ArrowUpRight className="w-2.5 h-2.5" /> Outbound (ส่งออก)
                          </span>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full font-mono font-bold text-[10px] inline-block tracking-wide">
                            IN-{docItem.id.slice(0, 5).toUpperCase()}
                          </span>
                          <span className="block text-[9px] text-indigo-500 font-bold uppercase tracking-wider flex items-center gap-0.5">
                            <ArrowDownLeft className="w-2.5 h-2.5" /> Inbound (รับเข้า)
                          </span>
                        </div>
                      )}
                    </td>

                    {/* Document Title */}
                    <td className="p-4">
                      <div className="max-w-xs md:max-w-sm">
                        <div className="text-xs font-extrabold text-slate-900 truncate">{docItem.title}</div>
                        {docItem.description && (
                          <div className="text-[10px] text-slate-400 font-medium truncate mt-0.5">
                            {docItem.description}
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Registrant details */}
                    <td className="p-4">
                      <div className="space-y-0.5">
                        <div className="text-xs font-bold text-slate-800">{docItem.createdByName}</div>
                        <div className="text-[10px] text-slate-400 font-mono font-medium truncate max-w-[150px]">
                          {docItem.createdBy}
                        </div>
                      </div>
                    </td>

                    {/* Date */}
                    <td className="p-4 text-xs font-semibold text-slate-500">
                      {renderTimestamp(docItem.createdAt)}
                    </td>

                    {/* Workflow status bubble */}
                    <td className="p-4">
                      {docItem.type === "inbound" ? (
                        <span className="px-2.5 py-1 bg-indigo-50 text-indigo-600 rounded-xl text-[10px] font-black inline-flex items-center gap-1 border border-indigo-100">
                          <CheckCircle className="w-3 h-3 text-indigo-500" /> นำส่งแล้ว (Received)
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 bg-pink-50 text-pink-700 rounded-xl text-[10px] font-black inline-flex items-center gap-1 border border-pink-100">
                          <CheckCircle className="w-3 h-3 text-pink-500" /> นำส่งสำเร็จ (Dispatched)
                        </span>
                      )}
                    </td>

                    {/* Quick View or Edit Button */}
                    <td className="p-4 text-center">
                      <button
                        onClick={() => {
                          setSelectedDoc(docItem);
                          setShowRejectForm(false);
                          setRejectionTextInput("");
                          setModalError("");
                        }}
                        className={`p-2 rounded-xl transition-colors cursor-pointer ${
                          isAdmin 
                            ? "bg-indigo-50 hover:bg-indigo-100 text-indigo-700 hover:text-indigo-800"
                            : "bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-800"
                        }`}
                        title={isAdmin ? "แก้ไข / จัดการข้อมูล (Edit / Manage)" : "ดูรายละเอียด (View Details)"}
                      >
                        {isAdmin ? <Edit className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </td>

                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Dynamic Pagination Controls */}
        {totalPages > 1 && (
          <div className="bg-slate-100/50 px-6 py-4 flex items-center justify-between border-t border-white">
            <span className="text-[11px] text-slate-500 font-bold">
              Showing page <strong className="text-slate-800 font-extrabold">{currentPage}</strong> of <strong className="text-slate-800 font-extrabold">{totalPages}</strong> ({filteredDocs.length} total records)
            </span>
            <div className="flex gap-2">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                className="p-1.5 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 disabled:opacity-40 transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                className="p-1.5 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 disabled:opacity-40 transition-colors cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

      </div>

      {/* ----------------------------------------------------
          DOCUMENT DETAIL OVERLAY PANEL DISPLAY (Modal) 
          ---------------------------------------------------- */}
      {selectedDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          
          <div className="w-full max-w-2xl bg-white rounded-3xl p-6 md:p-8 border border-slate-100 shadow-2xl relative max-h-[90vh] overflow-y-auto space-y-6">
            
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-4 border-b border-slate-100">
              <div className="space-y-1 flex-1 pr-4">
                {selectedDoc.type === "outbound" ? (
                  <span className="px-2.5 py-0.5 bg-pink-100 text-pink-700 rounded-full font-mono font-bold text-[10px] inline-block tracking-wide">
                    {selectedDoc.documentNumber || "Pending Number"}
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 bg-indigo-100 text-indigo-700 rounded-full font-mono font-bold text-[10px] inline-block tracking-wide">
                    Inbound File Reference
                  </span>
                )}
                {isEditing ? (
                  <div className="w-full mt-2">
                    <label className="block text-[10px] font-bold text-indigo-600 uppercase mb-1">Document Title (หัวข้อเอกสาร)</label>
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="w-full px-3 py-2 border border-indigo-250 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-100 bg-white"
                    />
                  </div>
                ) : (
                  <h3 className="text-lg font-black text-slate-900">{selectedDoc.title}</h3>
                )}
              </div>
              <button
                onClick={() => {
                  setSelectedDoc(null);
                  setIsEditing(false);
                }}
                className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-lg transition-colors cursor-pointer text-xs font-bold font-mono"
              >
                [Esc] Close
              </button>
            </div>

            {/* Document stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl text-xs">
              <div>
                <span className="text-slate-400 font-bold uppercase tracking-wider block text-[9px] mb-0.5">Classification (ประเภทเอกสาร)</span>
                <span className="font-extrabold text-slate-800 uppercase">{selectedDoc.type === "inbound" ? "Inbound (รับเข้า)" : "Outbound (ส่งออก)"}</span>
              </div>
              <div>
                <span className="text-slate-400 font-bold uppercase tracking-wider block text-[9px] mb-0.5">Filing Date (วันที่นำส่ง)</span>
                <span className="font-bold text-slate-650">{renderTimestamp(selectedDoc.createdAt)}</span>
              </div>
              <div>
                <span className="text-slate-400 font-bold uppercase tracking-wider block text-[9px] mb-0.5">Owner (ผู้บันทึก)</span>
                <span className="font-bold text-slate-750 truncate block max-w-xs">{selectedDoc.createdByName} ({selectedDoc.createdBy})</span>
              </div>
            </div>

            {/* Description Segment */}
            {isEditing ? (
              <div className="space-y-1.5">
                <span className="block text-[10px] text-indigo-600 font-extrabold uppercase tracking-wider">Internal Reference Note / รายละเอียดแฝงบันทึก (แก้ไขได้)</span>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-indigo-250 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-100 bg-white"
                  placeholder="Insert additional descriptions..."
                />
              </div>
            ) : selectedDoc.description ? (
              <div className="space-y-1.5">
                <span className="block text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Internal Reference Note / รายละเอียดแฝงบันทึก</span>
                <p className="text-xs text-slate-600 bg-slate-50/50 p-3 rounded-xl border border-slate-100 leading-normal whitespace-pre-line">
                  {selectedDoc.description}
                </p>
              </div>
            ) : (
              <div className="text-xs text-slate-400 italic font-semibold font-sans">No reference notes registered under this document record.</div>
            )}

            {/* Error Display inside Modal */}
            {modalError && (
              <div className="p-3 bg-red-50 text-red-600 border border-red-100 text-xs rounded-xl flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                <span>{modalError}</span>
              </div>
            )}

            {/* Admin Action Bar */}
            {isAdmin && (
              <div className="flex flex-col sm:flex-row border-t border-slate-100 pt-4 items-center justify-between gap-3">
                <div className="text-xs font-bold text-indigo-900 bg-indigo-50/50 p-2 px-3 rounded-lg border border-indigo-150">
                  ⚡ Administrative Permissions Active (สิทธิ์ผู้ดูแลระบบ)
                </div>
                {!isEditing ? (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setIsEditing(true);
                        setEditTitle(selectedDoc.title);
                        setEditDescription(selectedDoc.description || "");
                        setModalError("");
                      }}
                      className="px-3.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 hover:text-indigo-800 text-[11px] font-extrabold rounded-xl transition-all cursor-pointer inline-flex items-center gap-1 active:scale-95 border border-indigo-100"
                    >
                      <Edit className="w-3.5 h-3.5" />
                      Edit Details (แก้ไขเอกสาร)
                    </button>
                    <button
                      onClick={handleDeleteDocument}
                      className="px-3.5 py-1.5 bg-red-50 hover:bg-red-150 text-red-650 hover:text-red-700 text-[11px] font-extrabold rounded-xl transition-all cursor-pointer inline-flex items-center gap-1 active:scale-95 border border-red-100"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Delete Document (ลบถาวร)
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleSaveEdit}
                      disabled={modalActionLoading}
                      className="px-3.5 py-1.5 bg-gradient-to-r from-indigo-600 to-violet-650 hover:from-indigo-700 text-white text-[11px] font-extrabold rounded-xl transition-all cursor-pointer inline-flex items-center gap-1 active:scale-95 shadow-sm disabled:opacity-50"
                    >
                      {modalActionLoading ? "Saving Details..." : "Save Details (บันทึกข้อมูล)"}
                    </button>
                    <button
                      onClick={() => {
                        setIsEditing(false);
                        setModalError("");
                      }}
                      className="px-3.5 py-1.5 bg-slate-105 hover:bg-slate-200 text-slate-600 text-[11px] font-extrabold rounded-xl transition-all cursor-pointer inline-flex items-center gap-1 active:scale-95 border border-slate-200"
                    >
                      Cancel (ยกเลิก)
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ----------------------------------------------------
                AUDIT LOGS / WORKFLOW TIMELINE MOUNT
                ---------------------------------------------------- */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-indigo-500" />
                <h4 className="text-xs font-black text-slate-900">Blockchain / Security Logs Timeline</h4>
              </div>

              {docAuditLogs.length === 0 ? (
                <div className="text-[11px] text-slate-400 italic font-semibold">No audit trail entries found.</div>
              ) : (
                <div className="relative border-l border-indigo-100 pl-4 space-y-4 text-xs">
                  {docAuditLogs.map((log) => (
                    <div key={log.id} className="relative space-y-1">
                      {/* Timeline Node Icon/Dot */}
                      <span className={`absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full border-2 border-white ${
                        log.action.includes("create") ? "bg-indigo-500" : log.action.includes("approve") ? "bg-emerald-500" : "bg-rose-500"
                      }`} />
                      
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                        <span className="font-extrabold text-slate-800 capitalize">
                          {log.action.replace("_", " ")}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono font-medium">
                          {renderTimestamp(log.timestamp)}
                        </span>
                      </div>

                      <div className="text-[11px] text-slate-500 font-medium">
                        Triggered by <span className="font-semibold text-slate-700 underline">{log.actor}</span>
                      </div>
                      
                      {log.metadata && Object.keys(log.metadata).length > 0 && (
                        <div className="text-[10px] bg-slate-50 text-slate-500 font-mono p-1 px-2 rounded mt-0.5 inline-block">
                          {JSON.stringify(log.metadata)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
