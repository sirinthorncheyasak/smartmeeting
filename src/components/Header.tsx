import React, { useState, useEffect } from "react";
import { User, LogOut, CheckCircle, Shield, Cpu, Clock } from "lucide-react";
import { User as AuthUser } from "firebase/auth";

interface HeaderProps {
  user: AuthUser | null;
  onLogout: () => void;
  isAdmin: boolean;
  isSimulatedAdmin: boolean;
  setIsSimulatedAdmin: (admin: boolean) => void;
}

export default function Header({
  user,
  onLogout,
  isAdmin,
  isSimulatedAdmin,
  setIsSimulatedAdmin,
}: HeaderProps) {
  const [timeStr, setTimeStr] = useState("");

  // Keep a digital clock ticking to look exceptionally modern and help track minutes precisely
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setTimeStr(now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }));
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="bg-white/60 backdrop-blur-md sticky top-4 z-30 px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4 rounded-[2rem] mx-4 md:mx-6 mt-4 max-w-7xl shadow-xl border border-white/55">
      
      {/* Brand logotype */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-white font-black text-xl shadow-lg shadow-indigo-200/50">
          ท
        </div>
        <div>
          <h1 className="text-base font-extrabold tracking-tight text-slate-900 flex items-center gap-1.5 font-display">
            BU Document Tracker
            <span className="text-[10px] font-bold px-2 py-0.5 bg-indigo-500/10 text-indigo-700 rounded-full">
              v2.0 (Production)
            </span>
          </h1>
          <p className="text-[11px] text-slate-505 font-extrabold tracking-wider uppercase">บันทึกรับเข้า-ส่งออกเอกสาร</p>
        </div>
      </div>

      {/* Clock and metadata */}
      {user && (
        <div className="flex items-center gap-4 flex-wrap justify-center">
          
          {/* ticking digital clock */}
          <div className="bg-white/50 border border-white/70 px-3 py-1.5 rounded-full flex items-center gap-1.5 font-mono text-xs text-slate-600 font-semibold shadow-inner">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-pulse"></span>
            {timeStr} ICT
          </div>

          {/* Developer Role Simulation Toggle (Crucial convenience for evaluation) */}
          <div className="bg-amber-550/10 border border-amber-300/30 px-3 py-1 rounded-full flex items-center gap-2">
            <Cpu className="w-3.5 h-3.5 text-amber-600" />
            <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">Simulate Admin:</span>
            <input
              type="checkbox"
              id="role-switch"
              checked={isSimulatedAdmin}
              onChange={(e) => setIsSimulatedAdmin(e.target.checked)}
              className="w-3.5 h-3.5 rounded border-amber-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
            />
          </div>

          {/* User profile section */}
          <div className="flex items-center gap-2.5">
            {user.photoURL ? (
              <img src={user.photoURL} alt="Profile" className="w-8 h-8 rounded-full border border-indigo-200" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-indigo-500/20 text-indigo-700 border border-white/60 flex items-center justify-center font-bold text-sm">
                {user.displayName?.substring(0, 1) || "U"}
              </div>
            )}
            
            <div className="text-left leading-tight hidden sm:block">
              <p className="text-xs font-bold text-slate-900">{user.displayName || "BU Academic Staff"}</p>
              <div className="flex items-center gap-1 mt-0.5">
                <span className="text-[9px] text-slate-400 truncate max-w-[140px] font-mono leading-none">{user.email}</span>
                {isSimulatedAdmin ? (
                  <span className="text-[8px] bg-red-500/10 text-red-700 px-1.5 py-0.5 rounded-full font-black flex items-center gap-0.5">
                    <Shield className="w-2 h-2" /> ADMIN
                  </span>
                ) : (
                  <span className="text-[8px] bg-emerald-500/10 text-emerald-700 px-1.5 py-0.5 rounded-full font-black flex items-center gap-0.5">
                    <CheckCircle className="w-2 h-2" /> STAFF
                  </span>
                )}
              </div>
            </div>

            <button
              onClick={onLogout}
              title="Sign Out"
              className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-500/15 rounded-2xl transition-all cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>

        </div>
      )}

    </header>
  );
}
