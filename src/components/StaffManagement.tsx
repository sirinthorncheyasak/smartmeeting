import React, { useState, useEffect } from "react";
import { 
  collection, 
  onSnapshot, 
  doc, 
  setDoc, 
  deleteDoc 
} from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../firebase";
import { Staff } from "../types";
import { 
  Upload, 
  Users, 
  Check, 
  AlertCircle, 
  Search, 
  Trash2, 
  Plus, 
  FileSpreadsheet, 
  RefreshCw 
} from "lucide-react";

export default function StaffManagement() {
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);

  // CSV State
  const [csvPreview, setCsvPreview] = useState<any[]>([]);
  const [csvError, setCsvError] = useState("");
  const [csvSuccess, setCsvSuccess] = useState("");
  const [csvLoading, setCsvLoading] = useState(false);

  // Inline single manual addition fields
  const [manualMode, setManualMode] = useState(false);
  const [employeeId, setEmployeeId] = useState("");
  const [fullName, setFullName] = useState("");
  const [department, setDepartment] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [extension, setExtension] = useState("");

  // 1. Snapshot Listener for Staff
  useEffect(() => {
    setLoading(true);
    const unsub = onSnapshot(collection(db, "staff"), (snap) => {
      const items = snap.docs.map(d => ({ id: d.id, ...d.data() } as Staff));
      setStaffList(items);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "staff");
    });
    return () => unsub();
  }, []);

  // 2. Parse CSV text
  const parseCSV = (text: string) => {
    const lines = text.split(/\r?\n/).map(line => line.trim()).filter(line => line.length > 0);
    if (lines.length < 2) {
      throw new Error("CSV file must contain a header row and at least one data row.");
    }

    const headers = lines[0].split(",").map(h => h.trim().replace(/^"|"$/g, ""));
    const requiredHeaders = ["employeeid", "fullname", "department", "email", "phone", "extension"];
    
    // Check missing headers
    const headerIndices: Record<string, number> = {};
    headers.forEach((h, index) => {
      headerIndices[h.toLowerCase()] = index;
    });

    const isMissingHeaders = requiredHeaders.some(req => headerIndices[req] === undefined);
    if (isMissingHeaders) {
      throw new Error(`CSV Headers must include exactly: employeeId, fullName, department, email, phone, extension`);
    }

    const rows: any[] = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(",").map(v => v.trim().replace(/^"|"$/g, ""));
      // safety length check
      if (values.length < headers.length) continue;

      const obj: any = {};
      requiredHeaders.forEach(req => {
        const index = headerIndices[req];
        obj[req] = values[index];
      });

      rows.push({
        employeeId: obj.employeeid,
        fullName: obj.fullname,
        department: obj.department,
        email: obj.email,
        phone: obj.phone,
        extension: obj.extension,
        isValid: true,
        errors: [] as string[]
      });
    }

    // 3. Validation Pass on CSV Rows
    const emailsSeen = new Set<string>();
    rows.forEach((row, k) => {
      const errs: string[] = [];
      
      // email regex checking
      if (!row.email) {
        errs.push("Email is required.");
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) {
        errs.push("Invalid email format.");
      } else if (!row.email.endsWith("@bu.ac.th") && row.email !== "kulachet.l@bu.ac.th") {
        errs.push("Domain must end with @bu.ac.th.");
      }

      if (emailsSeen.has(row.email.toLowerCase())) {
        errs.push("Duplicate email inside the same CSV.");
      } else if (row.email) {
        emailsSeen.add(row.email.toLowerCase());
      }

      if (!row.employeeId) errs.push("Employee ID is required.");
      if (!row.fullName) errs.push("Full name is required.");
      if (!row.department) errs.push("Department is required.");

      row.isValid = errs.length === 0;
      row.errors = errs;
    });

    return rows;
  };

  // CSV File Handler
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCsvError("");
    setCsvSuccess("");
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const text = evt.target?.result as string;
        const parsed = parseCSV(text);
        setCsvPreview(parsed);
      } catch (err) {
        setCsvError(err instanceof Error ? err.message : "Error reading or parsing CSV.");
        setCsvPreview([]);
      }
    };
    reader.readAsText(file);
  };

  // Perform Bulk Upsert to Firestore
  const handleBulkUpsert = async () => {
    const validRows = csvPreview.filter(r => r.isValid);
    if (validRows.length === 0) {
      setCsvError("No valid records found in the uploaded file to import.");
      return;
    }

    setCsvLoading(true);
    setCsvError("");
    setCsvSuccess("");

    try {
      let count = 0;
      for (const row of validRows) {
        // Document ID is of email key (replacing invalid Firestore chars)
        const docId = row.email.toLowerCase().replace(/[@.]/g, "_");
        const ref = doc(db, "staff", docId);
        
        await setDoc(ref, {
          id: docId,
          employeeId: row.employeeId,
          fullName: row.fullName,
          department: row.department,
          email: row.email,
          phone: row.phone,
          extension: row.extension,
          updatedAt: new Date().toISOString()
        });
        count++;
      }

      setCsvSuccess(`Successfully upserted ${count} staff records!`);
      setCsvPreview([]);
      
      // Reset input element
      const el = document.getElementById("csv-file-input") as HTMLInputElement;
      if (el) el.value = "";

    } catch (err) {
      console.error(err);
      setCsvError("Failed to import staff records: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setCsvLoading(false);
    }
  };

  // Manual Creation (fallback helper option)
  const handleManualAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setCsvError("");
    setCsvSuccess("");

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setCsvError("Invalid email format.");
      return;
    }

    try {
      const docId = email.toLowerCase().replace(/[@.]/g, "_");
      const ref = doc(db, "staff", docId);
      
      await setDoc(ref, {
        id: docId,
        employeeId,
        fullName,
        department,
        email: email.toLowerCase(),
        phone,
        extension,
        updatedAt: new Date().toISOString()
      });

      setCsvSuccess(`Staff entry ${fullName} updated successfully.`);
      setManualMode(false);
      clearManualFields();
    } catch (err) {
      console.error(err);
      setCsvError("Failed to save manual profile record.");
    }
  };

  const clearManualFields = () => {
    setEmployeeId("");
    setFullName("");
    setDepartment("");
    setEmail("");
    setPhone("");
    setExtension("");
  };

  // Delete staff entry
  const handleDeleteStaff = async (id: string, name: string) => {
    if (!window.confirm(`Delete entry of ${name} permanently?`)) return;
    try {
      await deleteDoc(doc(db, "staff", id));
    } catch (err) {
      console.error(err);
      handleFirestoreError(err, OperationType.DELETE, `staff/${id}`);
    }
  };

  // Filter list by search term
  const searchedList = staffList.filter(s => 
    s.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.employeeId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8" id="staff-management-panel">
      
      {/* CSV importer section */}
      <div className="glass-panel rounded-[2rem] p-6 shadow-xl border border-white/55 grid grid-cols-1 md:grid-cols-12 gap-6">
        <div className="md:col-span-4 space-y-4">
          <div>
            <span className="bg-indigo-500/10 text-indigo-700 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-widest border border-white/40">
              Faculty Records Import
            </span>
            <h3 className="text-base font-black text-slate-900 mt-2 font-display">CSV Upload Utility</h3>
            <p className="text-xs text-slate-500 font-medium">
              Bulk update the database of authorized teachers or faculties dynamically.
            </p>
          </div>

          <div className="border border-dashed border-white/60 hover:border-indigo-550 bg-white/15 p-6 rounded-2xl flex flex-col items-center justify-center text-center cursor-pointer relative hover:bg-white/30 transition-all shadow-inner">
            <input
              id="csv-file-input"
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <Upload className="w-8 h-8 text-indigo-600 mb-2" />
            <p className="text-xs font-extrabold text-slate-800">Choose CSV File</p>
            <p className="text-[10px] text-slate-500 mt-1 font-semibold">Requires standard headers (employeeId, fullName, etc.)</p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setManualMode(!manualMode)}
              className="w-full py-2 bg-white/70 border border-white/60 text-slate-700 rounded-xl text-xs font-black hover:bg-white transition-all shadow-sm cursor-pointer"
            >
              {manualMode ? "Close Manual Form" : "Add Manually"}
            </button>
          </div>
        </div>

        {/* CSV Preview Section */}
        <div className="md:col-span-8 flex flex-col justify-between">
          <div className="min-h-48 border border-white/40 rounded-2xl bg-white/20 p-4 overflow-y-auto max-h-56 shadow-inner">
            <h4 className="text-xs font-bold text-slate-700 uppercase mb-2 flex items-center gap-1 font-display">
              <FileSpreadsheet className="w-3.5 h-3.5 text-indigo-600" />
              Upload Summary Preview
            </h4>

            {csvPreview.length > 0 ? (
              <div className="space-y-1.5 animate-fade-in">
                {csvPreview.map((row, idx) => (
                  <div key={idx} className={`p-2 rounded-xl text-xs border flex justify-between items-center bg-white/50 ${row.isValid ? "border-white/60" : "border-red-200 bg-red-500/10 text-red-850"}`}>
                    <div>
                      <p className="font-extrabold text-slate-900">{row.fullName || "Unlabeled Name"} ({row.employeeId || "No ID"})</p>
                      <p className="text-[10px] text-slate-500 font-semibold">{row.email} | {row.department}</p>
                    </div>
                    {row.isValid ? (
                      <span className="text-[10px] bg-emerald-500/10 text-emerald-750 px-2.5 py-0.5 border border-emerald-300/30 rounded-full font-black">Valid</span>
                    ) : (
                      <div className="text-right">
                        <span className="text-[10px] bg-red-500/10 text-red-700 px-2.5 py-0.5 border border-red-350/30 rounded-full font-black">Error</span>
                        <p className="text-[9px] text-red-650 font-bold mt-0.5">{row.errors[0]}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-40 text-slate-500 text-xs text-center">
                <p className="font-semibold">No file loaded yet. Select a CSV file to inspect columns.</p>
                <p className="text-[10px] text-slate-400 mt-1.5 font-mono font-bold bg-white/30 px-3 py-1.5 rounded-xl border border-white/20">employeeId,fullName,department,email,phone,extension</p>
              </div>
            )}
          </div>

          <div className="space-y-2 mt-4">
            {csvError && (
              <div className="p-3 bg-red-500/10 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-1.5 backdrop-blur-md">
                <AlertCircle className="w-4 h-4 text-red-650" /> {csvError}
              </div>
            )}
            {csvSuccess && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-1.5 backdrop-blur-md">
                <Check className="w-4 h-4 text-emerald-600" /> {csvSuccess}
              </div>
            )}

            {csvPreview.length > 0 && (
              <button
                onClick={handleBulkUpsert}
                disabled={csvLoading}
                className="w-full py-2.5 bg-indigo-600 hover:opacity-95 text-white rounded-xl text-xs font-black cursor-pointer disabled:bg-indigo-400 transition-all shadow-md shadow-indigo-150"
              >
                {csvLoading ? "Processing Bulk Import..." : `Import ${csvPreview.filter(r => r.isValid).length} Valid Entries`}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Manual Input Form */}
      {manualMode && (
        <form onSubmit={handleManualAdd} className="glass-panel rounded-[2rem] p-6 shadow-xl border border-indigo-400/40 grid grid-cols-1 md:grid-cols-3 gap-4 animate-fade-in">
          <div className="md:col-span-3 border-b border-white/20 pb-2 flex justify-between items-center">
            <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider font-display">Manual Faculty Form</h4>
            <button type="button" onClick={() => { setManualMode(false); clearManualFields(); }} className="text-slate-500 hover:text-slate-800 text-xs font-bold transition-colors">Cancel</button>
          </div>

          <div>
            <label className="text-[10px] font-black text-slate-500 block mb-1">Employee ID</label>
            <input type="text" required value={employeeId} onChange={e => setEmployeeId(e.target.value)} placeholder="e.g. 1001" className="text-xs w-full px-3 py-1.5 rounded-xl outline-none glass-input text-slate-900" />
          </div>
          <div>
            <label className="text-[10px] font-black text-slate-500 block mb-1">Full Name</label>
            <input type="text" required value={fullName} onChange={e => setFullName(e.target.value)} placeholder="e.g. John Doe" className="text-xs w-full px-3 py-1.5 rounded-xl outline-none glass-input text-slate-900" />
          </div>
          <div>
            <label className="text-[10px] font-black text-slate-500 block mb-1">Department</label>
            <input type="text" required value={department} onChange={e => setDepartment(e.target.value)} placeholder="e.g. Computer Science" className="text-xs w-full px-3 py-1.5 rounded-xl outline-none glass-input text-slate-900" />
          </div>
          <div>
            <label className="text-[10px] font-black text-slate-500 block mb-1">BU Email Address (@bu.ac.th)</label>
            <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="john@bu.ac.th" className="text-xs w-full px-3 py-1.5 rounded-xl outline-none glass-input text-slate-900" />
          </div>
          <div>
            <label className="text-[10px] font-black text-slate-500 block mb-1">Phone Number</label>
            <input type="text" required value={phone} onChange={e => setPhone(e.target.value)} placeholder="0812345678" className="text-xs w-full px-3 py-1.5 rounded-xl outline-none glass-input text-slate-900" />
          </div>
          <div>
            <label className="text-[10px] font-black text-slate-500 block mb-1">Office Extension</label>
            <input type="text" required value={extension} onChange={e => setExtension(e.target.value)} placeholder="1234" className="text-xs w-full px-3 py-1.5 rounded-xl outline-none glass-input text-slate-900" />
          </div>

          <div className="md:col-span-3 border-t border-white/20 pt-3 text-right">
            <button type="submit" className="px-4 py-2 bg-slate-950 hover:bg-slate-800 text-white rounded-xl text-xs font-black cursor-pointer transition-all shadow-md">
              Add Faculty Member
            </button>
          </div>
        </form>
      )}

      {/* Staff Directory View */}
      <div className="glass-panel rounded-[2rem] p-6 shadow-xl border border-white/55">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5 font-display">
              <Users className="w-4 h-4 text-indigo-600" />
              Faculty & Staff Directory ({searchedList.length})
            </h3>
            <p className="text-xs text-slate-500 font-semibold">Manage individuals entitled for auto-fill credentials.</p>
          </div>

          <div className="relative w-full md:w-64">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search faculty name / details..."
              className="w-full pl-9 pr-4 py-2 text-xs rounded-2xl focus:outline-none glass-input text-slate-900"
            />
            <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
          </div>
        </div>

        {/* Directory grid/table */}
        <div className="overflow-x-auto rounded-[1.5rem] border border-white/55 bg-white/25 shadow-inner">
          <table className="w-full text-xs text-slate-500 text-left">
            <thead className="bg-white/40 border-b border-white/40 uppercase text-slate-800 font-extrabold tracking-widest text-[10px]">
              <tr>
                <th className="py-3 px-4">Emp ID</th>
                <th className="py-3 px-4">Full Name</th>
                <th className="py-3 px-4">Department</th>
                <th className="py-3 px-4">Email</th>
                <th className="py-3 px-4">Phone (Ext)</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/15">
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-6 text-slate-500 font-bold animate-pulse">
                    <RefreshCw className="w-4 h-4 animate-spin inline mr-1 text-indigo-600" /> Syncing database directories...
                  </td>
                </tr>
              ) : searchedList.length > 0 ? (
                searchedList.map((staff) => (
                  <tr key={staff.id} className="hover:bg-white/45 transition-all text-slate-700 duration-100">
                    <td className="py-3.5 px-4 font-black text-slate-800 font-mono">{staff.employeeId}</td>
                    <td className="py-3.5 px-4 font-bold text-slate-900">{staff.fullName}</td>
                    <td className="py-3.5 px-4 text-slate-800 font-semibold">{staff.department}</td>
                    <td className="py-3.5 px-4 font-mono text-slate-600 font-medium">{staff.email}</td>
                    <td className="py-3.5 px-4 text-slate-650 font-semibold font-mono">
                      {staff.phone} {staff.extension ? `(ext. ${staff.extension})` : ""}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleDeleteStaff(staff.id, staff.fullName)}
                        className="p-1 px-2 text-rose-600 bg-rose-500/10 border border-rose-300/20 hover:bg-rose-500/20 rounded-lg transition-all cursor-pointer shadow-sm"
                        title="Remove Entry"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="text-center py-6 text-slate-500 italic bg-white/10 font-bold">
                    No faculty entries found matching query.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
