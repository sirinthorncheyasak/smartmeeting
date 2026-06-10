import React, { useState, useEffect } from "react";
import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  onSnapshot, 
  serverTimestamp 
} from "firebase/firestore";
import { db, auth } from "../../firebase";
import { 
  ShieldAlert, 
  UserPlus, 
  Trash2, 
  Mail, 
  UserCheck, 
  CheckCircle, 
  X,
  AlertCircle
} from "lucide-react";

interface AdminUser {
  email: string;
  assignedBy: string;
  assignedAt: any;
}

export default function ManageAdminsView() {
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [newEmail, setNewEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Subscribe to Admins list
  useEffect(() => {
    const q = collection(db, "admins");
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(doc => doc.data() as AdminUser);
      setAdmins(list);
    }, (err) => {
      console.error("Failed to fetch admin list:", err);
      setError("Unable to retrieve administrators list. Access restricted.");
    });
    return () => unsubscribe();
  }, []);

  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    const emailToRegister = newEmail.trim().toLowerCase();

    // Validations
    if (!emailToRegister) {
      setError("Please specify an email address.");
      return;
    }

    if (!emailToRegister.endsWith("@bu.ac.th") && emailToRegister !== "kulachet.l@bu.ac.th") {
      setError("Only Bangkok University emails (@bu.ac.th) are permitted for system administration.");
      return;
    }

    if (admins.some(admin => admin.email === emailToRegister) || emailToRegister === "kulachet.l@bu.ac.th") {
      setError("This user already has administrator privileges.");
      return;
    }

    setLoading(true);
    try {
      const adminDocRef = doc(db, "admins", emailToRegister);
      const currentUserEmail = auth.currentUser?.email || "system";

      // Register admin doc
      await setDoc(adminDocRef, {
        email: emailToRegister,
        assignedBy: currentUserEmail,
        assignedAt: serverTimestamp()
      });

      // Write Audit Log
      const logRef = doc(collection(db, "auditLogs"));
      await setDoc(logRef, {
        id: logRef.id,
        action: "add_admin",
        documentId: "admin_management",
        actor: currentUserEmail,
        timestamp: serverTimestamp(),
        metadata: {
          addedEmail: emailToRegister,
          details: `Granted administrative access to ${emailToRegister}`
        }
      });

      setSuccess(`Successfully granted Admin privileges to ${emailToRegister}`);
      setNewEmail("");
    } catch (err: any) {
      console.error("Error setting admin:", err);
      setError(err?.message || "Failed to elevate user permissions.");
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveAdmin = async (emailToRemove: string) => {
    setError(null);
    setSuccess(null);

    if (emailToRemove === "kulachet.l@bu.ac.th") {
      setError("The primary system administrator cannot be revoked.");
      return;
    }

    if (emailToRemove === auth.currentUser?.email) {
      setError("You cannot revoke your own administrator permissions to prevent lock-out.");
      return;
    }

    if (!window.confirm(`Are you sure you want to revoke Admin rights from ${emailToRemove}?`)) {
      return;
    }

    setLoading(true);
    try {
      const adminDocRef = doc(db, "admins", emailToRemove);
      const currentUserEmail = auth.currentUser?.email || "system";

      await deleteDoc(adminDocRef);

      // Write Audit Log
      const logRef = doc(collection(db, "auditLogs"));
      await setDoc(logRef, {
        id: logRef.id,
        action: "remove_admin",
        documentId: "admin_management",
        actor: currentUserEmail,
        timestamp: serverTimestamp(),
        metadata: {
          removedEmail: emailToRemove,
          details: `Revoked administrative access from ${emailToRemove}`
        }
      });

      setSuccess(`Successfully revoked privileges from ${emailToRemove}`);
    } catch (err: any) {
      console.error("Error deleting admin:", err);
      setError(err?.message || "Failed to revoke user privileges.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/65 p-6 rounded-3xl border border-white/60 shadow-sm backdrop-blur-md">
        <div>
          <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-indigo-600" />
            Admin Role Management (กำหนดสิทธิ์แอดมิน)
          </h2>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Grant or revoke administrative permissions for Bangkok University educators and staff.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Form Box */}
        <div className="lg:col-span-1 bg-white/70 backdrop-blur-md border border-white/60 rounded-3xl p-6 shadow-sm h-fit">
          <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-2 mb-4">
            <UserPlus className="w-4 h-4 text-indigo-600" />
            Add Administrator
          </h3>
          
          <form onSubmit={handleAddAdmin} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                BU Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  placeholder="e.g. sirinthorn.c@bu.ac.th"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-slate-50/50"
                  disabled={loading}
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1.5 leading-normal">
                Must be an active Bangkok University credential email domain (<strong className="text-slate-600 font-semibold">@bu.ac.th</strong>).
              </p>
            </div>

            {error && (
              <div className="p-3 bg-red-50 text-red-600 text-xs rounded-xl flex items-start gap-2 border border-red-100">
                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="p-3 bg-emerald-50 text-emerald-700 text-xs rounded-xl flex items-start gap-2 border border-emerald-100">
                <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                <span>{success}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-gradient-to-r from-indigo-600 to-violet-650 text-white text-xs font-bold rounded-xl shadow-md hover:shadow-indigo-200 transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-98 disabled:opacity-50"
            >
              {loading ? "Activating Privilege..." : "Grant Admin Access"}
            </button>
          </form>
        </div>

        {/* Right Admins List Table */}
        <div className="lg:col-span-2 bg-white/70 backdrop-blur-md border border-white/60 rounded-3xl p-6 shadow-sm overflow-hidden flex flex-col">
          <div className="mb-4">
            <h3 className="text-sm font-extrabold text-slate-800">
              Active Authorized Administrators ({admins.length + 1})
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Individuals listed here possess direct approval clearance and logs viewing permissions.
            </p>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white">
            <table className="min-w-full divide-y divide-slate-100 text-left">
              <thead className="bg-slate-50/75">
                <tr>
                  <th className="px-4 py-3 text-[10px] font-bold uppercase text-slate-400 tracking-wider">Email (ชื่อบัญชีผู้ใช้)</th>
                  <th className="px-4 py-3 text-[10px] font-bold uppercase text-slate-400 tracking-wider">Assigned By</th>
                  <th className="px-4 py-3 text-[10px] font-bold uppercase text-slate-400 tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-600">
                {/* Root Admin static lock row */}
                <tr>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-slate-900">kulachet.l@bu.ac.th</span>
                      <span className="px-2 py-0.5 text-[9px] bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-full font-bold">
                        Super User
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-slate-400 italic">System Initial Boot</td>
                  <td className="px-4 py-3.5 text-right font-medium text-slate-300 pointer-events-none">
                    Immutable
                  </td>
                </tr>

                {admins.map((admin) => (
                  <tr key={admin.email} className="hover:bg-slate-50/40 transition-colors">
                    <td className="px-4 py-3.5 font-semibold text-slate-850">
                      {admin.email}
                    </td>
                    <td className="px-4 py-3.5 text-slate-450 truncate max-w-[150px]">
                      {admin.assignedBy}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <button
                        onClick={() => handleRemoveAdmin(admin.email)}
                        disabled={loading}
                        className="p-1 px-2 hover:bg-red-50 text-red-500 hover:text-red-700 rounded-lg text-[11px] font-bold border border-transparent hover:border-red-100 transition-all cursor-pointer inline-flex items-center gap-1 active:scale-95 disabled:opacity-50"
                        title="Revoke administrative access"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Revoke
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 p-4 bg-amber-50/50 border border-amber-200/50 rounded-2xl flex items-start gap-2.5">
            <ShieldAlert className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <span className="text-[11px] text-slate-500 leading-normal">
              <strong>Security Protocol:</strong> All administrative modifications are permanently written to immutable Security Logs. Access grant/revoke operations require active privileges.
            </span>
          </div>

        </div>
      </div>
    </div>
  );
}
