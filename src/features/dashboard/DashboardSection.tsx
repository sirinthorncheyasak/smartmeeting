import React from "react";
import { Document } from "../../types";
import { 
  FileText, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Clock, 
  CheckCircle, 
  XSquare, 
  TrendingUp, 
  Activity, 
  PieChart as PieIcon 
} from "lucide-react";
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  PieChart, 
  Pie, 
  Cell, 
  BarChart, 
  Bar, 
  Legend 
} from "recharts";

interface DashboardSectionProps {
  documents: Document[];
}

export default function DashboardSection({ documents }: DashboardSectionProps) {
  // 1. Calculations & Metrics
  const totalInbound = documents.filter(d => d.type === "inbound").length;
  const totalOutbound = documents.filter(d => d.type === "outbound").length;
  
  const outboundPending = documents.filter(d => d.type === "outbound" && d.status === "pending").length;
  const outboundApproved = documents.filter(d => d.type === "outbound" && d.status === "approved").length;
  const outboundRejected = documents.filter(d => d.type === "outbound" && d.status === "rejected").length;

  // 2. Trend Calculations (Last 6 Months)
  // Let's build a timeline of document submission grouped by Month.
  const getMonthlyTimelineData = () => {
    const monthlyMap: Record<string, { inbound: number; outbound: number }> = {};
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    // Pre-initialize previous months leading to June 2026
    const currentYear = 2026;
    for (let i = 0; i < 6; i++) {
      const d = new Date(currentYear, 5 - i, 1);
      const key = `${monthNames[d.getMonth()]} ${String(d.getFullYear()).slice(-2)}`;
      monthlyMap[key] = { inbound: 0, outbound: 0 };
    }

    documents.forEach(doc => {
      if (!doc.createdAt) return;
      const date = doc.createdAt.seconds 
        ? new Date(doc.createdAt.seconds * 1000) 
        : new Date(doc.createdAt);
      
      const key = `${monthNames[date.getMonth()]} ${String(date.getFullYear()).slice(-2)}`;
      if (monthlyMap[key]) {
        if (doc.type === "inbound") monthlyMap[key].inbound += 1;
        else monthlyMap[key].outbound += 1;
      }
    });

    return Object.entries(monthlyMap)
      .map(([name, val]) => ({ name, Inbound: val.inbound, Outbound: val.outbound }))
      .reverse();
  };

  const monthlyTimeline = getMonthlyTimelineData();

  // 3. Ratio Data (Pie Chart)
  const ratioData = [
    { name: "Inbound (รับเข้า)", value: totalInbound, color: "#6366F1" }, // indigo-500
    { name: "Outbound (ส่งออก)", value: totalOutbound, color: "#EC4899" }  // pink-500
  ].filter(item => item.value > 0);

  // Fallback if empty to make UI beautiful
  const finalRatioData = ratioData.length > 0 ? ratioData : [
    { name: "Inbound (รับเข้า)", value: 0, color: "#E2E8F0" },
    { name: "Outbound (ส่งออก)", value: 0, color: "#E2E8F0" }
  ];

  // 4. Daily Activities (Last 7 Days)
  const getDailyActivityData = () => {
    const dailyMap: Record<string, number> = {};
    const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = `${daysOfWeek[d.getDay()]} (${d.getDate()}/${d.getMonth()+1})`;
      dailyMap[key] = 0;
    }

    documents.forEach(doc => {
      if (!doc.createdAt) return;
      const date = doc.createdAt.seconds 
        ? new Date(doc.createdAt.seconds * 1000) 
        : new Date(doc.createdAt);
      
      const daysOfWeekIndex = date.getDay();
      const key = `${daysOfWeek[daysOfWeekIndex]} (${date.getDate()}/${date.getMonth()+1})`;
      if (key in dailyMap) {
        dailyMap[key] += 1;
      }
    });

    return Object.entries(dailyMap).map(([day, count]) => ({ day, Documents: count }));
  };

  const dailyActivity = getDailyActivityData();

  return (
    <div className="space-y-8">
      {/* 1. Real-time KPI Card Dashboard Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Total Documents */}
        <div className="bg-gradient-to-br from-slate-50 to-white/70 backdrop-blur-md border border-white/80 rounded-2xl p-6 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[11px] text-slate-400 font-extrabold uppercase tracking-wider">เอกสารนำส่งทั้งหมด (Total Records)</p>
            <h3 className="text-3xl font-black text-slate-900">{documents.length}</h3>
            <p className="text-[10px] text-slate-500 font-bold flex items-center gap-0.5">
              รวมเอกสารรับเข้าและส่งออก
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center border border-slate-200">
            <FileText className="w-6 h-6" />
          </div>
        </div>

        {/* Total Inbound */}
        <div className="bg-white/60 backdrop-blur-md border border-white/80 rounded-2xl p-6 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[11px] text-slate-400 font-extrabold uppercase tracking-wider">เอกสารรับเข้า (Total Inbound)</p>
            <h3 className="text-3xl font-black text-indigo-650">{totalInbound}</h3>
            <p className="text-[10px] text-indigo-600 font-bold flex items-center gap-0.5">
              <ArrowDownLeft className="w-3.5 h-3.5" /> บันทึกสถิติรับเข้าระบบ
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center border border-indigo-100">
            <ArrowDownLeft className="w-6 h-6" />
          </div>
        </div>

        {/* Total Outbound */}
        <div className="bg-white/60 backdrop-blur-md border border-white/80 rounded-2xl p-6 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[11px] text-slate-400 font-extrabold uppercase tracking-wider">เอกสารส่งออก (Total Outbound)</p>
            <h3 className="text-3xl font-black text-pink-650">{totalOutbound}</h3>
            <p className="text-[10px] text-pink-600 font-bold flex items-center gap-0.5">
              <ArrowUpRight className="w-3.5 h-3.5" /> บันทึกหมายเลข ทน. สำเร็จ
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-pink-50 text-pink-700 flex items-center justify-center border border-pink-100">
            <ArrowUpRight className="w-6 h-6" />
          </div>
        </div>

      </div>

      {/* 2. Graphical Reports Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Line Chart: Monthly submissions */}
        <div className="lg:col-span-2 bg-white/60 backdrop-blur-md border border-white/80 rounded-[2rem] p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <TrendingUp className="w-4 h-4 text-indigo-600" />
              <h4 className="text-sm font-black text-slate-900">Monthly Document Frequency</h4>
            </div>
            <p className="text-xs text-slate-400 font-medium mb-6">Real-time processing patterns over active calendar intervals</p>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyTimeline}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="name" stroke="#94A3B8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} />
                <Tooltip />
                <Legend iconType="circle" wrapperStyle={{ fontSize: "11px" }} />
                <Line type="monotone" dataKey="Inbound" stroke="#6366F1" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="Outbound" stroke="#EC4899" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pie Chart: Document Direction Ratio */}
        <div className="bg-white/60 backdrop-blur-md border border-white/80 rounded-[2rem] p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <PieIcon className="w-4 h-4 text-pink-500" />
              <h4 className="text-sm font-black text-slate-900">Classification Distribution</h4>
            </div>
            <p className="text-xs text-slate-400 font-medium mb-6">Breakdown of Inbound vs Outbound tracking documents</p>
          </div>

          <div className="h-56 relative flex items-center justify-center">
            {documents.length === 0 ? (
              <div className="text-xs text-slate-400 font-semibold italic text-center">No document data for visualization</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={finalRatioData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {finalRatioData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `${value} Documents`} />
                </PieChart>
              </ResponsiveContainer>
            )}
            <div className="absolute text-center">
              <span className="text-[10px] text-slate-400 font-semibold block uppercase">Total Records</span>
              <span className="text-xl font-extrabold text-slate-800 leading-none">{documents.length}</span>
            </div>
          </div>

          {/* Color Indicators */}
          <div className="flex items-center justify-center gap-4 mt-2">
            {finalRatioData.map((item, idx) => (
              <div key={idx} className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }}></span>
                <span>{item.name} ({item.value})</span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* 3. Bar Chart: Daily Document Submissions */}
      <div className="bg-white/60 backdrop-blur-md border border-white/80 rounded-[2rem] p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-1.5">
          <Activity className="w-4 h-4 text-indigo-600 animate-pulse" />
          <h4 className="text-sm font-black text-slate-900">Weekly Performance Speed</h4>
        </div>
        <p className="text-xs text-slate-400 font-medium mb-6">Number of inbound and outbound records filed per day over the last 7 calendar days</p>
        
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dailyActivity}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
              <XAxis dataKey="day" stroke="#94A3B8" fontSize={11} tickLine={false} />
              <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} />
              <Tooltip />
              <Bar dataKey="Documents" fill="#6366F1" radius={[4, 4, 0, 0]} barSize={28}>
                {dailyActivity.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.Documents > 0 ? "#6366F1" : "#E2E8F0"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
