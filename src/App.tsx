import React, { useState, useEffect } from "react";
import { 
  collection, 
  onSnapshot, 
  query, 
  where,
  doc
} from "firebase/firestore";
import { onAuthStateChanged, User as AuthUser } from "firebase/auth";
import { auth, db, logout, testConnection, handleFirestoreError, OperationType } from "./firebase";
import { Document, AuditLog } from "./types";

// Generic Shell Components
import Header from "./components/Header";

// Feature Modules
import AuthSection from "./features/auth/AuthSection";
import DashboardSection from "./features/dashboard/DashboardSection";
import DocumentRegistration from "./features/documents/DocumentRegistration";
import DocumentTable from "./features/documents/DocumentTable";
import AuditLogsView from "./features/admin/AuditLogsView";
import ManageAdminsView from "./features/admin/ManageAdminsView";

// Icons
import { 
  LayoutDashboard, 
  FileText, 
  FilePlus, 
  ShieldCheck, 
  Lock,
  AlertTriangle,
  Send,
  Workflow
} from "lucide-react";

export default function App() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  
  // Tab Routing: "dashboard" | "register" | "documents" | "auditLogs" | "manageAdmins"
  const [activeTab, setActiveTab] = useState<"dashboard" | "register" | "documents" | "auditLogs" | "manageAdmins">("documents");

  // Live Database states
  const [documents, setDocuments] = useState<Document[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [isAdminUser, setIsAdminUser] = useState(false);

  // Developer Convenience simulation
  const [isSimulatedAdmin, setIsSimulatedAdmin] = useState(false);

  // Authentication & Admin logic
  const isAdmin = user?.email === "kulachet.l@bu.ac.th" || isAdminUser || isSimulatedAdmin;
  const isRealAdmin = user?.email === "kulachet.l@bu.ac.th" || isAdminUser;

  // 1. Auth state listener
  useEffect(() => {
    testConnection();
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setAuthLoading(false);
      
      // Auto-simulate admin for standard developer convenience if requested email matches
      if (firebaseUser?.email === "kulachet.l@bu.ac.th") {
        setIsSimulatedAdmin(true);
      } else {
        setIsSimulatedAdmin(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // 1.5 Real-time dynamic Admin privilege state listener
  useEffect(() => {
    if (!user || !user.email) {
      setIsAdminUser(false);
      return;
    }

    if (user.email === "kulachet.l@bu.ac.th") {
      setIsAdminUser(true);
      return;
    }

    const adminDocRef = doc(db, "admins", user.email);
    const unsubscribe = onSnapshot(adminDocRef, (docSnap) => {
      if (docSnap.exists()) {
        setIsAdminUser(true);
      } else {
        setIsAdminUser(false);
      }
    }, (error) => {
      console.warn("Dynamic admin list lookup returned error or empty:", error);
      setIsAdminUser(false);
    });

    return () => unsubscribe();
  }, [user]);

  // 2. Real-time Document Stream with context-aware security query boundaries
  useEffect(() => {
    if (!user) {
      setDocuments([]);
      return;
    }

    let q;
    if (isRealAdmin) {
      // Admins are cleared to listen to all documents
      q = collection(db, "documents");
    } else {
      // General staff are strictly sandboxed to query and look at their own filings
      q = query(collection(db, "documents"), where("createdBy", "==", user.email || ""));
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const loadedDocs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Document));
      setDocuments(loadedDocs);
    }, (error) => {
      console.error("Firestore onSnapshot error (documents):", error);
      handleFirestoreError(error, OperationType.GET, "documents");
    });

    return () => unsubscribe();
  }, [user, isRealAdmin]);

  // 3. Real-time Audit logs Stream with secure boundaries
  useEffect(() => {
    if (!user) {
      setAuditLogs([]);
      return;
    }

    let q;
    if (isRealAdmin) {
      // Admins can inspect the complete system trail
      q = collection(db, "auditLogs");
    } else {
      // Staff can inspect only audit logs corresponding to their actions
      q = query(collection(db, "auditLogs"), where("actor", "==", user.email || ""));
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const loadedLogs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AuditLog));
      setAuditLogs(loadedLogs);
    }, (error) => {
      console.error("Firestore onSnapshot error (auditLogs):", error);
      handleFirestoreError(error, OperationType.GET, "auditLogs");
    });

    return () => unsubscribe();
  }, [user, isRealAdmin]);

  const handleLogout = async () => {
    await logout();
    setActiveTab("documents");
  };

  if (authLoading) {
    return (
      <div className="relative min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center font-sans overflow-hidden">
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-indigo-200/20 rounded-full blur-[90px] -z-10"></div>
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-violet-200/20 rounded-full blur-[90px] -z-10"></div>
        <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
        <p className="mt-4 text-xs font-bold text-slate-500 animate-pulse tracking-widest uppercase">
          Verifying security gateways...
        </p>
      </div>
    );
  }

  // Not authenticated? Show Access Section
  if (!user) {
    return <AuthSection onAuthSuccess={() => setActiveTab("documents")} />;
  }

  return (
    <div className="relative min-h-screen bg-[#F8FAFC] text-slate-800 flex flex-col pb-16 font-sans selection:bg-indigo-100 leading-relaxed selection:text-indigo-950 overflow-x-hidden">
      
      {/* Background Mesh Decor elements */}
      <div className="absolute top-24 right-12 w-[550px] h-[550px] bg-indigo-200/25 rounded-full blur-[120px] -z-10 pointer-events-none"></div>
      <div className="absolute bottom-24 left-12 w-[500px] h-[500px] bg-violet-200/20 rounded-full blur-[120px] -z-10 pointer-events-none"></div>
      
      {/* App Shell Header */}
      <Header
        user={user}
        onLogout={handleLogout}
        isAdmin={isAdmin}
        isSimulatedAdmin={isSimulatedAdmin}
        setIsSimulatedAdmin={setIsSimulatedAdmin}
      />

      <main className="max-w-7xl w-full mx-auto px-4 md:px-6 mt-8 space-y-8 relative z-10">
        
        {/* Navigation Tabs Switcher */}
        <div className="flex bg-slate-200/40 backdrop-blur-md p-1.5 rounded-2xl shadow-inner max-w-2xl border border-white/50">
          
          <button
            onClick={() => setActiveTab("documents")}
            className={`flex-1 py-2.5 text-xs font-extrabold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === "documents" ? "bg-white text-indigo-755 shadow" : "text-slate-600 hover:text-indigo-650"
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            Document Ledger
          </button>

          <button
            onClick={() => setActiveTab("register")}
            className={`flex-1 py-2.5 text-xs font-extrabold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === "register" ? "bg-white text-indigo-755 shadow" : "text-slate-600 hover:text-indigo-650"
            }`}
          >
            <FilePlus className="w-3.5 h-3.5" />
            New Registration
          </button>

          <button
            onClick={() => setActiveTab("dashboard")}
            className={`flex-1 py-2.5 text-xs font-extrabold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === "dashboard" ? "bg-white text-indigo-755 shadow" : "text-slate-600 hover:text-indigo-650"
            }`}
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            Analytics Portal
          </button>

          {/* Audit Trail only visible to Admins under strict governance */}
          {isAdmin && (
            <>
              <button
                onClick={() => setActiveTab("auditLogs")}
                className={`flex-1 py-2.5 text-xs font-extrabold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  activeTab === "auditLogs" ? "bg-white text-indigo-755 shadow" : "text-slate-600 hover:text-indigo-650"
                }`}
              >
                <Workflow className="w-3.5 h-3.5" />
                Security Logs
              </button>

              <button
                onClick={() => setActiveTab("manageAdmins")}
                className={`flex-1 py-2.5 text-xs font-extrabold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  activeTab === "manageAdmins" ? "bg-white text-indigo-755 shadow" : "text-slate-600 hover:text-indigo-650"
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                Manage Admins
              </button>
            </>
          )}

        </div>

        {/* Mounted Routing Modules */}
        <div className="animate-fade-in duration-250">
          {activeTab === "documents" && (
            <DocumentTable 
              documents={documents}
              auditLogs={auditLogs}
              isAdmin={isAdmin}
              onRefreshNeeded={() => {}}
            />
          )}

          {activeTab === "register" && (
            <DocumentRegistration 
              onSuccess={() => setActiveTab("documents")}
            />
          )}

          {activeTab === "dashboard" && (
            <DashboardSection 
              documents={documents}
            />
          )}

          {activeTab === "auditLogs" && isAdmin && (
            <AuditLogsView 
              auditLogs={auditLogs}
            />
          )}

          {activeTab === "manageAdmins" && isAdmin && (
            <ManageAdminsView />
          )}
        </div>

      </main>
    </div>
  );
}
