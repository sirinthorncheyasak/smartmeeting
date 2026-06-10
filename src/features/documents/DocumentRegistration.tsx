import React, { useState, useEffect } from "react";
import { createDocumentTransaction, getBuddhistPeriodInfo } from "../../services/documentService";
import { auth, db } from "../../firebase";
import { doc, onSnapshot } from "firebase/firestore";
import { FilePlus2, PlaySquare, ArrowDownLeft, ArrowUpRight, HelpCircle, Copy, Check } from "lucide-react";

interface DocumentRegistrationProps {
  onSuccess: () => void;
}

export default function DocumentRegistration({ onSuccess }: DocumentRegistrationProps) {
  const [type, setType] = useState<"inbound" | "outbound">("inbound");
  const [title, setTitle] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [customName, setCustomName] = useState<string>(auth.currentUser?.displayName || "");
  const [loading, setLoading] = useState<boolean>(false);
  const [notice, setNotice] = useState<{ text: string; success: boolean } | null>(null);

  const [nextNumber, setNextNumber] = useState<string>("กำลังคำนวณ...");
  const [copied, setCopied] = useState<boolean>(false);

  // Real-time counter preview for outbound documents
  useEffect(() => {
    if (type !== "outbound") return;

    const period = getBuddhistPeriodInfo();
    const counterDocRef = doc(db, "counters", period.counterId);

    const unsubscribe = onSnapshot(counterDocRef, (snap) => {
      let nextRun = 1;
      if (snap.exists()) {
        const data = snap.data();
        nextRun = (data.lastRunningNumber || 0) + 1;
      }
      const runStr = String(nextRun).padStart(3, '0');
      setNextNumber(`ทน.${period.yy}${period.mm}${runStr}`);
    }, (err) => {
      console.warn("Failed to listen to counters snapshot:", err);
      const period = getBuddhistPeriodInfo();
      setNextNumber(`ทน.${period.yy}${period.mm}---`);
    });

    return () => unsubscribe();
  }, [type]);

  const handleCopyNumber = () => {
    navigator.clipboard.writeText(nextNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setNotice(null);

    if (!title.trim()) {
      setNotice({ text: "Please enter a valid document title.", success: false });
      return;
    }

    const finalName = customName.trim() || auth.currentUser?.email || "Academic Staff";

    setLoading(true);
    try {
      const docId = await createDocumentTransaction({
        type,
        title: title.trim(),
        description: description.trim(),
        direction: type === "inbound" ? "in" : "out",
        createdByName: finalName
      });

      setNotice({ 
        text: type === "outbound" 
          ? "Outbound document registered successfully under active transaction. Review number generated on table!" 
          : "Inbound document filed and cataloged successfully.", 
        success: true 
      });

      // Reset form fields
      setTitle("");
      setDescription("");
      onSuccess();
    } catch (err: any) {
      console.error(err);
      
      // Attempt friendly translation
      let errorMsg = err.message || "An error occurred writing the document.";
      if (errorMsg.includes("permission-denied") || errorMsg.includes("Permission denied")) {
        errorMsg = "Security Rules Violation: You do not have permissions to execute this write operation.";
      }
      setNotice({ text: errorMsg, success: false });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white/60 backdrop-blur-md border border-white/80 rounded-[2rem] p-6 md:p-8 shadow-xl relative overflow-hidden max-w-3xl mx-auto">
      
      <div className="flex items-center gap-2 mb-6">
        <div className="p-2 bg-indigo-50 text-indigo-700 rounded-xl">
          <FilePlus2 className="w-5 h-5" />
        </div>
        <div>
          <h4 className="text-sm font-black text-slate-900">Document Intake & Registration</h4>
          <p className="text-[11px] text-slate-400 font-medium">Record a new inbound intake or initialize an outbound sequence</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* 1. Document Direction Type Selection */}
        <div>
          <label className="block text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mb-2.5">
            Registration Mode
          </label>
          <div className="grid grid-cols-2 gap-4">
            
            {/* Inbound Button */}
            <button
              type="button"
              onClick={() => {
                setType("inbound");
                setNotice(null);
              }}
              className={`p-4 rounded-2xl border text-left transition-all flex items-start gap-3.5 cursor-pointer ${
                type === "inbound"
                  ? "bg-indigo-50/50 border-indigo-400 ring-2 ring-indigo-50"
                  : "bg-white/40 border-slate-150 hover:bg-slate-50"
              }`}
            >
              <div className={`p-2 rounded-xl flex-shrink-0 ${type === "inbound" ? "bg-indigo-600 text-white" : "bg-indigo-50 text-indigo-600"}`}>
                <ArrowDownLeft className="w-5 h-5" />
              </div>
              <div className="leading-tight">
                <span className="block text-xs font-bold text-slate-950">Inbound (รับเข้า)</span>
                <span className="text-[10px] text-slate-500 mt-1 block">Catalog external mail, letters, or received packages immediately.</span>
              </div>
            </button>

            {/* Outbound Button */}
            <button
              type="button"
              onClick={() => {
                setType("outbound");
                setNotice(null);
              }}
              className={`p-4 rounded-2xl border text-left transition-all flex items-start gap-3.5 cursor-pointer ${
                type === "outbound"
                  ? "bg-pink-50/50 border-pink-400 ring-2 ring-pink-50"
                  : "bg-white/40 border-slate-150 hover:bg-slate-50"
              }`}
            >
              <div className={`p-2 rounded-xl flex-shrink-0 ${type === "outbound" ? "bg-pink-600 text-white" : "bg-pink-50 text-pink-600"}`}>
                <ArrowUpRight className="w-5 h-5" />
              </div>
              <div className="leading-tight">
                <span className="block text-xs font-bold text-slate-950">Outbound (ส่งออก)</span>
                <span className="text-[10px] text-slate-500 mt-1 block">Initiate a formal outbound document. Generates code automatically.</span>
              </div>
            </button>

          </div>
        </div>

        {/* 2. Title */}
        <div className="space-y-1.5">
          <label htmlFor="doc-title" className="block text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
            Document Title <span className="text-red-500">*</span>
          </label>
          <input
            id="doc-title"
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={type === "inbound" ? "e.g., หนังสือรับเข้าจากสำนักงานวิทยาการบริการวิชาการ" : "e.g., คำร้องขอเปลี่ยนเวลาเข้าใช้อาคารอเนกประสงค์คณะ"}
            className="w-full px-4 py-3 bg-white/40 backdrop-blur-sm border border-slate-200 focus:border-indigo-400 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-all text-slate-800"
          />
        </div>

        {/* 3. Description (Optional) */}
        <div className="space-y-1.5">
          <label htmlFor="doc-desc" className="block text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
            Detailed Summary / Internal Note
          </label>
          <textarea
            id="doc-desc"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add relevant document details, physical folder location numbers, file reference URL links, or tracking notes..."
            className="w-full px-4 py-3 bg-white/40 backdrop-blur-sm border border-slate-200 focus:border-indigo-400 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-all text-slate-800"
          />
        </div>

        {/* 4. Display Signee Full Name */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label htmlFor="doc-signee" className="block text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
              Registrant Name
            </label>
            <input
              id="doc-signee"
              type="text"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder="e.g. ดร.สิรินธร สุทธารัตน์"
              className="w-full px-4 py-3 bg-white/40 backdrop-blur-sm border border-slate-200 focus:border-indigo-400 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-all text-slate-800"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
              Verification Account
            </label>
            <div className="px-4 py-3 bg-slate-100/70 border border-slate-200 text-slate-500 rounded-xl text-xs font-mono font-medium truncate">
              {auth.currentUser?.email}
            </div>
          </div>
        </div>

        {/* Info panel dynamically rendered with pre-generated number information */}
        {type === "outbound" && (
          <div className="bg-gradient-to-br from-pink-50 to-rose-50/50 border border-pink-100 rounded-2xl p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-4.5 h-4.5 text-pink-500" />
                <span className="text-xs font-black text-slate-800">
                  หมายเลขเอกสารขาออกถัดไป (Next Outbound Number)
                </span>
              </div>
              <span className="text-[9px] bg-pink-100/60 text-pink-750 font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                Live Preview
              </span>
            </div>
            
            <div className="flex items-center justify-between bg-white/80 p-3.5 rounded-xl border border-pink-100/70 shadow-xs">
              <div className="space-y-0.5">
                <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">
                  Outbound Ref ID
                </span>
                <span className="text-lg font-black font-mono text-pink-600 tracking-wider">
                  {nextNumber}
                </span>
              </div>
              <button
                type="button"
                onClick={handleCopyNumber}
                className="px-3.5 py-2 bg-pink-50 hover:bg-pink-100 active:scale-95 text-pink-750 text-[11px] font-bold rounded-lg border border-pink-150 transition-all cursor-pointer flex items-center gap-1.5 font-sans"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                    คัดลอกสำเร็จ
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    คัดลอกหมายเลข
                  </>
                )}
              </button>
            </div>

            <p className="text-[10px] text-slate-500 leading-normal">
              💡 <strong>คำแนะนำ:</strong> สามารถคัดลอกหมายเลข <strong>{nextNumber}</strong> ไปใช้เขียนระบุหัวเอกสารตัวจริงหรือหน้าซองขาออกของคุณ <em>ก่อนกดบันทึกข้อมูลเข้าระบบด้านล่าง</em> เพื่อความถูกต้องและตรงกันของหมายเลขนำส่ง
            </p>
          </div>
        )}

        {/* Notifications */}
        {notice && (
          <div className={`p-4 rounded-xl border text-xs flex gap-2.5 leading-normal ${
            notice.success 
              ? "bg-emerald-50 border-emerald-200 text-emerald-800" 
              : "bg-red-50 border-red-200 text-red-800"
          }`}>
            <span className="font-black">{notice.success ? "Success:" : "Notice:"}</span>
            <span>{notice.text}</span>
          </div>
        )}

        {/* Action Button */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 bg-indigo-650 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-indigo-200 transition-all disabled:opacity-50 cursor-pointer flex items-center gap-2 active:scale-95"
          >
            {loading ? (
              <>
                <svg className="w-4 h-4 animate-spin text-white" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Processing Transaction...
              </>
            ) : (
              <>
                <PlaySquare className="w-4 h-4" />
                File Document Record
              </>
            )}
          </button>
        </div>

      </form>
    </div>
  );
}
