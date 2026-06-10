import React from "react";
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  BarChart, 
  Bar, 
  Cell, 
  PieChart, 
  Pie, 
  Legend 
} from "recharts";
import { Booking, Room } from "../types";
import { 
  getAcademicYear, 
  getMonthAbbreviation, 
  filterBookingsByAcademicPeriod 
} from "../utils/academicYear";
import { 
  TrendingUp, 
  CheckCircle, 
  Loader, 
  XCircle, 
  Sliders, 
  BarChart2, 
  PieChart as PieIcon 
} from "lucide-react";

interface DashboardProps {
  bookings: Booking[];
  rooms: Room[];
  selectedYear: string;
  setSelectedYear: (yr: string) => void;
  selectedMonth: string;
  setSelectedMonth: (mth: string) => void;
}

export default function Dashboard({
  bookings,
  rooms,
  selectedYear,
  setSelectedYear,
  selectedMonth,
  setSelectedMonth
}: DashboardProps) {

  // List of academic months (August to July)
  const ACADEMIC_MONTHS = [
    "Aug", "Sep", "Oct", "Nov", "Dec", 
    "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul"
  ];

  const ACADEMIC_YEARS = ["all", "2023", "2024", "2025", "2026"];

  // 1. Filter bookings
  const filteredBookings = filterBookingsByAcademicPeriod(bookings, selectedYear, selectedMonth);

  // 2. Compute KPI counts
  const total = filteredBookings.length;
  const approved = filteredBookings.filter(b => b.status === "approved").length;
  const pending = filteredBookings.filter(b => b.status === "pending").length;
  const cancelled = filteredBookings.filter(b => b.status === "cancelled").length;

  // 3. Assemble Line Chart Data: Monthly Trends (using sequence of Academic Months)
  const monthlyTrendData = ACADEMIC_MONTHS.map(mthAbbr => {
    // filter within selected bookings having this month abbreviation
    const count = filteredBookings.filter(b => getMonthAbbreviation(b.startTime) === mthAbbr).length;
    return {
      month: mthAbbr,
      bookings: count
    };
  });

  // 4. Assemble Bar Chart Data: Room Usage Counts
  const roomUsageData = rooms.map(room => {
    const usageCount = filteredBookings.filter(b => b.roomId === room.id).length;
    return {
      roomName: room.name.replace("SaaS ", "").substring(0, 15), // Abbreviated name
      count: usageCount
    };
  });

  // 5. Assemble Pie Chart Data: Approval Rates
  const pieData = [
    { name: "Approved", value: approved, color: "#10B981" }, // Emerald-500
    { name: "Pending", value: pending, color: "#F59E0B" },    // Amber-500
    { name: "Cancelled", value: cancelled, color: "#EF4444" } // Red-500
  ].filter(p => p.value > 0);

  return (
    <div className="space-y-8" id="admin-dashboard">
      
      {/* Filters Section */}
      <div className="glass-panel rounded-[2rem] p-5 shadow-xl border border-white/55 flex flex-wrap gap-4 items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-indigo-500/10 rounded-xl">
            <Sliders className="w-5 h-5 text-indigo-700" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-sm font-display">Dashboard Analytics Filters</h3>
            <p className="text-xs text-slate-500 font-semibold">Slice metrics by academic cycle (Aug - Jul)</p>
          </div>
        </div>
        
        <div className="flex gap-4 flex-wrap">
          {/* Year Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-black text-slate-500 uppercase tracking-widest text-[10px]">Year</span>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="text-xs font-bold border border-white/60 px-3 py-1.5 rounded-xl outline-none glass-input cursor-pointer bg-white/40"
            >
              {ACADEMIC_YEARS.map(yr => (
                <option key={yr} value={yr} className="text-slate-900">
                  {yr === "all" ? "All Academic Years" : `AY ${yr}`}
                </option>
              ))}
            </select>
          </div>

          {/* Month Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-black text-slate-500 uppercase tracking-widest text-[10px]">Month</span>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="text-xs font-bold border border-white/60 px-3 py-1.5 rounded-xl outline-none glass-input cursor-pointer bg-white/40"
            >
              <option value="all" className="text-slate-900">All Months</option>
              {ACADEMIC_MONTHS.map(mth => (
                <option key={mth} value={mth} className="text-slate-900">{mth}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Bookings */}
        <div className="glass-panel rounded-[2rem] p-5 shadow-xl border border-white/55 flex justify-between items-start">
          <div className="space-y-1">
            <p className="text-[10px] font-black text-slate-550 uppercase tracking-wider">Total Bookings</p>
            <h4 className="text-2xl font-black text-slate-900 font-display">{total}</h4>
          </div>
          <div className="p-3 bg-indigo-500/10 text-indigo-750 border border-white/50 rounded-2xl">
            <TrendingUp className="w-5 h-5 text-indigo-700" />
          </div>
        </div>

        {/* Pending Approval */}
        <div className="glass-panel rounded-[2rem] p-5 shadow-xl border border-white/55 flex justify-between items-start">
          <div className="space-y-1">
            <p className="text-[10px] font-black text-amber-800 uppercase tracking-wider">Pending</p>
            <h4 className="text-2xl font-black text-amber-700 font-display">{pending}</h4>
          </div>
          <div className="p-3 bg-amber-500/10 text-amber-750 border border-white/50 rounded-2xl">
            <Loader className="w-5 h-5 animate-spin text-amber-700" />
          </div>
        </div>

        {/* Approved */}
        <div className="glass-panel rounded-[2rem] p-5 shadow-xl border border-white/55 flex justify-between items-start">
          <div className="space-y-1">
            <p className="text-[10px] font-black text-emerald-800 uppercase tracking-wider">Approved</p>
            <h4 className="text-2xl font-black text-emerald-700 font-display">{approved}</h4>
          </div>
          <div className="p-3 bg-emerald-500/10 text-emerald-750 border border-white/50 rounded-2xl">
            <CheckCircle className="w-5 h-5 text-emerald-700" />
          </div>
        </div>

        {/* Cancelled */}
        <div className="glass-panel rounded-[2rem] p-5 shadow-xl border border-white/55 flex justify-between items-start">
          <div className="space-y-1">
            <p className="text-[10px] font-black text-red-850 uppercase tracking-wider">Cancelled</p>
            <h4 className="text-2xl font-black text-rose-700 font-display">{cancelled}</h4>
          </div>
          <div className="p-3 bg-rose-500/10 text-rose-750 border border-white/50 rounded-2xl">
            <XCircle className="w-5 h-5 text-rose-600" />
          </div>
        </div>
      </div>

      {/* Graphical Chart Widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Plot 1: Line Area Monthly Trend */}
        <div className="lg:col-span-8 glass-panel rounded-[2rem] p-6 shadow-xl border border-white/55 flex flex-col justify-between">
          <div className="mb-4">
            <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5 font-display">
              <TrendingUp className="w-4 h-4 text-indigo-600" />
              Monthly Booking Trends
            </h4>
            <p className="text-xs text-slate-500 font-medium">Chronological frequency of bookings in the current academic frame.</p>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyTrendData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorBookings" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#4F46E5" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#475569", fontWeight: "bold" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#475569", fontWeight: "bold" }} axisLine={false} tickLine={false} />
                <Tooltip 
                  contentStyle={{ background: "rgba(255, 255, 255, 0.85)", backdropFilter: "blur(12px)", border: "1px solid rgba(255, 255, 255, 0.6)", borderRadius: "16px", color: "#1e293b", fontSize: 12, boxShadow: "0 10px 15px -3px rgba(0,0,0,0.05)" }} 
                  itemStyle={{ color: "#4F46E5", fontWeight: "bold" }}
                />
                <Area type="monotone" dataKey="bookings" stroke="#4F46E5" strokeWidth={3} fillOpacity={1} fill="url(#colorBookings)" name="Reservations" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Plot 2: Approval Rate Ratio (Pie Chart) */}
        <div className="lg:col-span-4 glass-panel rounded-[2rem] p-6 shadow-xl border border-white/55 flex flex-col justify-between">
          <div className="mb-4">
            <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5 font-display">
              <PieIcon className="w-4 h-4 text-pink-600" />
              Approval Rate Distribution
            </h4>
            <p className="text-xs text-slate-500 font-medium">Current status breakdown representation.</p>
          </div>
          <div className="h-48 flex justify-center items-center">
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={70}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: "rgba(255, 255, 255, 0.85)", backdropFilter: "blur(12px)", border: "1px solid rgba(255, 255, 255, 0.6)", borderRadius: "16px", color: "#1e293b", fontSize: 11, boxShadow: "0 10px 15px -3px rgba(0,0,0,0.05)" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-xs text-slate-450 italic font-semibold">No reservation records found.</div>
            )}
          </div>
          {pieData.length > 0 && (
            <div className="flex justify-center gap-4 text-xs font-bold flex-wrap">
              {pieData.map((d, i) => (
                <div key={i} className="flex items-center gap-1.5 text-slate-700">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }}></span>
                  <span>{d.name}: {d.value}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Plot 3: Bar Chart of Room Popularity */}
        <div className="lg:col-span-12 glass-panel rounded-[2rem] p-6 shadow-xl border border-white/55">
          <div className="mb-4">
            <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5 font-display">
              <BarChart2 className="w-4 h-4 text-emerald-600" />
              Room Usage Analysis
            </h4>
            <p className="text-xs text-slate-500 font-medium">Relative booking frequency per campus room.</p>
          </div>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={roomUsageData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <XAxis dataKey="roomName" tick={{ fontSize: 10, fill: "#475569", fontWeight: "bold" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#475569", fontWeight: "bold" }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: "rgba(255, 255, 255, 0.85)", backdropFilter: "blur(12px)", border: "1px solid rgba(255, 255, 255, 0.6)", borderRadius: "16px", color: "#1e293b", fontSize: 12, boxShadow: "0 10px 15px -3px rgba(0,0,0,0.05)" }}
                />
                <Bar dataKey="count" fill="#4F46E5" radius={[6, 6, 0, 0]} name="Bookings Count">
                  {roomUsageData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index % 2 === 0 ? "#818CF5" : "#4F46E5"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </div>
  );
}
