import React, { useState } from "react";
import { Booking, BookingStatus } from "../types";
import { 
  Check, 
  X, 
  Trash2, 
  Search, 
  ArrowUpDown, 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  User, 
  Calendar, 
  Info, 
  AlertCircle 
} from "lucide-react";
import { doc, updateDoc, deleteDoc } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../firebase";
import { triggerWebhook } from "./IntegrationConfig";

interface BookingsListProps {
  bookings: Booking[];
  isAdmin: boolean;
  currentUserEmail: string | null;
  emailWebhookUrl: string;
  calendarWebhookUrl: string;
}

type SortField = "startTime" | "title" | "roomName" | "requesterName" | "createdAt";
type SortOrder = "asc" | "desc";

export default function BookingsList({
  bookings,
  isAdmin,
  currentUserEmail,
  emailWebhookUrl,
  calendarWebhookUrl,
}: BookingsListProps) {
  // Query & Sort state
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortField, setSortField] = useState<SortField>("startTime");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

  // Pagination
  const [page, setPage] = useState(1);
  const itemsPerPage = 8;

  // Inline Reason state
  const [cancelTargetId, setCancelTargetId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState("");

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
    setPage(1);
  };

  // 1. Approve booking (Admin Only)
  const handleApprove = async (booking: Booking) => {
    try {
      const ref = doc(db, "bookings", booking.id);
      await updateDoc(ref, {
        status: "approved" as BookingStatus,
        approvedBy: currentUserEmail || "Administrator",
        approvedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      // Send Email Webhook
      await triggerWebhook("Email", {
        type: "Booking Approved Notification",
        title: booking.title,
        room: booking.roomName,
        startTime: new Date(booking.startTime).toLocaleString(),
        endTime: new Date(booking.endTime).toLocaleString(),
        status: "approved",
        email: booking.requesterEmail,
        payload: { ...booking, status: "approved" }
      }, emailWebhookUrl);

      // Create Calendar Event Webhook
      await triggerWebhook("Calendar", {
        type: "Create Calendar Invitation",
        title: booking.title,
        room: booking.roomName,
        startTime: booking.startTime,
        endTime: booking.endTime,
        email: booking.requesterEmail,
      }, calendarWebhookUrl);

    } catch (err) {
      console.error(err);
      handleFirestoreError(err, OperationType.UPDATE, `bookings/${booking.id}`);
    }
  };

  // 2. Setup Inline Cancellation Reason Dialog
  const openCancelPrompt = (id: string) => {
    setCancelTargetId(id);
    setCancelReason("");
  };

  // 3. Confirm cancellation
  const handleConfirmCancel = async (booking: Booking) => {
    if (!cancelReason.trim()) return;

    try {
      const ref = doc(db, "bookings", booking.id);
      await updateDoc(ref, {
        status: "cancelled" as BookingStatus,
        cancelledReason: cancelReason,
        updatedAt: new Date().toISOString(),
      });

      // Send Email Webhook
      await triggerWebhook("Email", {
        type: "Booking Cancelled Notification",
        title: booking.title,
        room: booking.roomName,
        startTime: new Date(booking.startTime).toLocaleString(),
        endTime: new Date(booking.endTime).toLocaleString(),
        status: "cancelled",
        email: booking.requesterEmail,
        payload: { ...booking, status: "cancelled", cancelledReason: cancelReason }
      }, emailWebhookUrl);

      setCancelTargetId(null);
    } catch (err) {
      console.error(err);
      handleFirestoreError(err, OperationType.UPDATE, `bookings/${booking.id}`);
    }
  };

  // 4. Delete booking (Admin Only)
  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to permanently delete this booking?")) return;
    try {
      const ref = doc(db, "bookings", id);
      await deleteDoc(ref);
    } catch (err) {
      console.error(err);
      handleFirestoreError(err, OperationType.DELETE, `bookings/${id}`);
    }
  };

  // 5. Filter & sort algorithms
  const filtered = bookings.filter((b) => {
    const isSearchMatch =
      b.title.toLowerCase().includes(search.toLowerCase()) ||
      b.roomName.toLowerCase().includes(search.toLowerCase()) ||
      b.requesterName.toLowerCase().includes(search.toLowerCase()) ||
      b.requesterEmail.toLowerCase().includes(search.toLowerCase());

    const isStatusMatch = statusFilter === "all" || b.status === statusFilter;

    return isSearchMatch && isStatusMatch;
  });

  const sorted = [...filtered].sort((a, b) => {
    let propA = a[sortField] || "";
    let propB = b[sortField] || "";

    if (sortField === "startTime" || sortField === "createdAt") {
      propA = new Date(propA).getTime();
      propB = new Date(propB).getTime();
    } else {
      propA = String(propA).toLowerCase();
      propB = String(propB).toLowerCase();
    }

    if (propA < propB) return sortOrder === "asc" ? -1 : 1;
    if (propA > propB) return sortOrder === "asc" ? 1 : -1;
    return 0;
  });

  // pagination indices
  const pageCount = Math.ceil(sorted.length / itemsPerPage);
  const paginated = sorted.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  // Status Badge Component
  const Badge = ({ status }: { status: BookingStatus }) => {
    const map = {
      pending: "bg-amber-500/10 text-amber-700 border-amber-300/30",
      approved: "bg-emerald-500/10 text-emerald-700 border-emerald-300/30",
      cancelled: "bg-rose-500/10 text-rose-700 border-rose-300/30",
    };
    return (
      <span className={`px-2.5 py-1 text-[10px] font-black border rounded-full uppercase tracking-wider ${map[status]}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="glass-panel rounded-[2rem] p-6 shadow-xl border border-white/55" id="bookings-live-table">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h3 className="text-lg font-bold text-slate-900 font-display">University Room Bookings</h3>
          <p className="text-xs text-slate-500 font-medium">Real-time room scheduling status and supervisor controls.</p>
        </div>

        {/* Search & Filter Controls */}
        <div className="flex flex-wrap gap-2.5 w-full md:w-auto">
          <div className="relative flex-1 md:flex-initial">
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search bookings..."
              className="w-full md:w-64 pl-9 pr-4 py-2 text-xs rounded-2xl leading-none focus:outline-none glass-input text-slate-800"
            />
            <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="text-xs border border-white/50 rounded-2xl px-3 py-2 text-slate-600 font-semibold glass-input cursor-pointer bg-white/40"
          >
            <option value="all" className="text-slate-900">All Status</option>
            <option value="pending" className="text-slate-900">Pending</option>
            <option value="approved" className="text-slate-900">Approved</option>
            <option value="cancelled" className="text-slate-900">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Main Table Interface */}
      <div className="overflow-x-auto rounded-[1.5rem] border border-white/55 bg-white/25 shadow-inner">
        <table className="w-full text-left text-xs text-slate-500">
          <thead className="bg-white/40 border-b border-white/40 text-slate-800 uppercase tracking-widest font-extrabold text-[10px]">
            <tr>
              <th className="py-4 px-4">Status</th>
              <th className="py-4 px-4 cursor-pointer hover:text-indigo-600 transition-colors" onClick={() => handleSort("title")}>
                <div className="flex items-center gap-1">Meeting Title <ArrowUpDown className="w-3 h-3 text-indigo-505" /></div>
              </th>
              <th className="py-4 px-4 cursor-pointer hover:text-indigo-600 transition-colors" onClick={() => handleSort("roomName")}>
                <div className="flex items-center gap-1">Room <ArrowUpDown className="w-3 h-3 text-indigo-505" /></div>
              </th>
              <th className="py-4 px-4 cursor-pointer hover:text-indigo-600 transition-colors" onClick={() => handleSort("startTime")}>
                <div className="flex items-center gap-1">Date & Time <ArrowUpDown className="w-3 h-3 text-indigo-505" /></div>
              </th>
              <th className="py-4 px-4 cursor-pointer hover:text-indigo-600 transition-colors" onClick={() => handleSort("requesterName")}>
                <div className="flex items-center gap-1">Requester <ArrowUpDown className="w-3 h-3 text-indigo-505" /></div>
              </th>
              <th className="py-4 px-4">Department</th>
              <th className="py-4 px-4 cursor-pointer hover:text-indigo-600 transition-colors" onClick={() => handleSort("createdAt")}>
                <div className="flex items-center gap-1">Created At <ArrowUpDown className="w-3 h-3 text-indigo-505" /></div>
              </th>
              <th className="py-4 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/20">
            {paginated.length > 0 ? (
              paginated.map((booking) => {
                const start = new Date(booking.startTime);
                const end = new Date(booking.endTime);
                const created = new Date(booking.createdAt);
                const canCancel = isAdmin || (currentUserEmail && booking.requesterEmail === currentUserEmail);

                return (
                  <React.Fragment key={booking.id}>
                    <tr className="hover:bg-white/45 transition-all text-slate-700 duration-100">
                      <td className="py-3.5 px-4 font-medium">
                        <Badge status={booking.status} />
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-900">
                        {booking.title}
                        {booking.cancelledReason && (
                          <div className="text-[10px] text-red-650 font-bold bg-red-500/10 px-2 py-0.5 rounded-md inline-flex items-center gap-1 mt-1">
                            <AlertCircle className="w-3 h-3 flex-shrink-0" />
                            Reason: {booking.cancelledReason}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-slate-800 font-bold">{booking.roomName}</td>
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col text-slate-800">
                           <span className="font-bold flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-indigo-500" strokeWidth={3} />
                            {start.toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" })}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono font-semibold">
                            {start.toTimeString().substring(0, 5)} - {end.toTimeString().substring(0, 5)}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-800">
                        <div className="flex flex-col">
                          <span>{booking.requesterName}</span>
                          <span className="text-[10px] text-slate-500 font-normal font-mono leading-tight">{booking.requesterEmail}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 font-medium">{booking.requesterDepartment}</td>
                      <td className="py-3.5 px-4 text-[10px] text-slate-500 font-mono font-semibold">
                        {created.toLocaleString("en-US", { dateStyle: "short", timeStyle: "short" })}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5Packed flex-wrap">
                          
                          {/* Approve Action */}
                          {isAdmin && booking.status === "pending" && (
                            <button
                              onClick={() => handleApprove(booking)}
                              title="Approve Booking"
                              className="p-1 px-2.5 bg-emerald-500/15 hover:bg-emerald-550/25 text-emerald-700 rounded-lg transition-all flex items-center gap-1 cursor-pointer font-bold duration-150 border border-emerald-500/20"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span className="text-[10px]">Approve</span>
                            </button>
                          )}

                          {/* Cancel Logic */}
                          {canCancel && booking.status !== "cancelled" && (
                            <button
                              onClick={() => openCancelPrompt(booking.id)}
                              title="Cancel Booking"
                              className="p-1 px-2.5 text-rose-700 bg-rose-550/15 hover:bg-rose-500/25 rounded-lg transition-all flex items-center gap-1 cursor-pointer font-bold duration-150 border border-rose-500/20"
                            >
                              <X className="w-3.5 h-3.5" />
                              <span className="text-[10px]">Cancel</span>
                            </button>
                          )}

                          {/* Delete Logic (Admin only) */}
                          {isAdmin && (
                            <button
                              onClick={() => handleDelete(booking.id)}
                              title="Delete Permanently"
                              className="p-1.5 text-red-600 hover:text-red-800 bg-white/50 border border-red-200/50 hover:bg-red-500/10 rounded-lg transition-all cursor-pointer shadow-sm"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}

                        </div>
                      </td>
                    </tr>

                    {/* Expandable cancellation inline view */}
                    {cancelTargetId === booking.id && (
                      <tr className="bg-rose-500/5 backdrop-blur-md">
                        <td colSpan={8} className="p-4 border-l-4 border-rose-500">
                          <div className="flex flex-col gap-2 max-w-lg">
                            <label className="text-xs font-bold text-rose-800">Reason for cancellation:</label>
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={cancelReason}
                                onChange={(e) => setCancelReason(e.target.value)}
                                placeholder="State reason (e.g., Conflict, changed plans...)"
                                required
                                className="flex-1 text-xs px-3 py-1.5 border border-rose-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-rose-450 bg-white/70"
                              />
                              <button
                                onClick={() => handleConfirmCancel(booking)}
                                className="px-3.5 py-1.5 bg-rose-600 text-white rounded-xl text-xs font-extrabold hover:bg-rose-700 cursor-pointer shadow-md shadow-rose-200"
                              >
                                Confirm Cancel
                              </button>
                              <button
                                onClick={() => setCancelTargetId(null)}
                                className="px-3.5 py-1.5 bg-white/80 text-slate-700 border border-slate-350 rounded-xl text-xs font-extrabold hover:bg-white cursor-pointer"
                              >
                                Back
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            ) : (
              <tr>
                <td colSpan={8} className="py-8 text-center text-slate-400 italic font-semibold">
                  No matching reservations found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination component */}
      {pageCount > 1 && (
        <div className="flex items-center justify-between mt-4 text-xs">
          <p className="text-slate-500 font-semibold">
            Showing <strong className="text-slate-800 font-extrabold">{(page - 1) * itemsPerPage + 1}</strong> to{" "}
            <strong className="text-slate-800 font-extrabold">{Math.min(page * itemsPerPage, sorted.length)}</strong> of{" "}
            <strong className="text-slate-800 font-extrabold">{sorted.length}</strong> items
          </p>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setPage((p) => Math.max(p - 1, 1))}
              disabled={page === 1}
              className="p-1 px-2.5 bg-white/60 hover:bg-white/90 border border-white/70 rounded-lg text-slate-600 font-extrabold disabled:opacity-40 cursor-pointer transition-all"
            >
              <div className="flex items-center"><ChevronLeft className="w-3.5 h-3.5" /> Previous</div>
            </button>
            <span className="px-2 text-slate-600 font-bold">
              Page {page} of {pageCount}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(p + 1, pageCount))}
              disabled={page === pageCount}
              className="p-1 px-2.5 bg-white/60 hover:bg-white/90 border border-white/70 rounded-lg text-slate-600 font-extrabold disabled:opacity-40 cursor-pointer transition-all"
            >
              <div className="flex items-center font-extrabold">Next <ChevronRight className="w-3.5 h-3.5" /></div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
