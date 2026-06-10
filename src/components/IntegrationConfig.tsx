import React, { useState } from "react";
import { Link2, Mail, Calendar, Settings, FileText, CheckCircle } from "lucide-react";
import { motion } from "motion/react";

interface IntegrationConfigProps {
  emailWebhookUrl: string;
  setEmailWebhookUrl: (url: string) => void;
  calendarWebhookUrl: string;
  setCalendarWebhookUrl: (url: string) => void;
}

export default function IntegrationConfig({
  emailWebhookUrl,
  setEmailWebhookUrl,
  calendarWebhookUrl,
  setCalendarWebhookUrl
}: IntegrationConfigProps) {
  const [logs, setLogs] = useState<{ id: string; type: string; payload: any; timestamp: string }[]>([]);
  const [showConfig, setShowConfig] = useState(false);

  // Load webhook logs on the fly when events occur
  React.useEffect(() => {
    const handleLog = (e: any) => {
      setLogs((prev) => [
        {
          id: Math.random().toString(),
          type: e.detail.type,
          payload: e.detail.payload,
          timestamp: new Date().toLocaleTimeString(),
        },
        ...prev.slice(0, 9),
      ]);
    };
    window.addEventListener("webhook-trigger", handleLog);
    return () => window.removeEventListener("webhook-trigger", handleLog);
  }, []);

  return (
    <div className="glass-panel rounded-[2rem] p-6 shadow-xl border border-white/55 mb-8" id="integration-panel">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2 font-display">
            <Settings className="w-5 h-5 text-indigo-700 font-bold" />
            Google Workspace & Notification Integrations
          </h2>
          <p className="text-sm text-slate-500 font-medium">
            Connect Google Apps Script (GAS) webhooks to trigger calendar invitations and email updates.
          </p>
        </div>
        <button
          onClick={() => setShowConfig(!showConfig)}
          className="px-4 py-2 text-xs font-black text-indigo-700 bg-indigo-500/10 border border-white/45 rounded-full hover:bg-white/40 transition-all cursor-pointer"
        >
          {showConfig ? "Hide Config" : "Show Setup Guide & Webhooks"}
        </button>
      </div>

      {showConfig && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6 pt-2 border-t border-white/10"
        >
          {/* Inputs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-700 flex items-center gap-1.5 uppercase tracking-wider text-[10px]">
                <Mail className="w-4 h-4 text-indigo-650" />
                Email Endpoint (POST /send-booking-email)
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={emailWebhookUrl}
                  onChange={(e) => setEmailWebhookUrl(e.target.value)}
                  placeholder="https://script.google.com/macros/s/.../exec"
                  className="w-full pl-10 pr-4 py-2 text-sm rounded-2xl glass-input text-slate-900 outline-none transition-all placeholder:text-slate-400"
                />
                <Link2 className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black text-slate-700 flex items-center gap-1.5 uppercase tracking-wider text-[10px]">
                <Calendar className="w-4 h-4 text-indigo-650" />
                Calendar Endpoint (POST /create-calendar-event)
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={calendarWebhookUrl}
                  onChange={(e) => setCalendarWebhookUrl(e.target.value)}
                  placeholder="https://script.google.com/macros/s/.../exec"
                  className="w-full pl-10 pr-4 py-2 text-sm rounded-2xl glass-input text-slate-900 outline-none transition-all placeholder:text-slate-400"
                />
                <Link2 className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              </div>
            </div>
          </div>

          {/* Guide Code block */}
          <div className="bg-white/10 rounded-2xl p-4 border border-white/45 shadow-inner">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest mb-2 flex items-center gap-1.5 font-display">
              <FileText className="w-4 h-4 text-indigo-600" />
              Recommended Apps Script (AppsScript Code)
            </h3>
            <pre className="text-[11px] text-slate-800 font-mono overflow-x-auto max-h-40 p-3 bg-white/40 rounded-xl border border-white/45">
{`function doPost(e) {
  var data = JSON.parse(e.postData.contents);
  var path = e.parameter.action || '';
  
  if (data.type === "email" || path === "send-email") {
    // Send Email via Gmail
    MailApp.sendEmail({
      to: data.email,
      subject: "Meeting Room Booking Update: " + data.title,
      htmlBody: "<p>Room: " + data.room + "<br>Time: " + data.startTime + " - " + data.endTime + "<br>Status: " + data.status + "</p>"
    });
    return ContentService.createTextOutput(JSON.stringify({status: "success", message: "Email Sent"})).setMimeType(ContentService.MimeType.JSON);
  }
  
  if (data.type === "calendar" || path === "create-calendar") {
    // Create Calendar Event
    var calendar = CalendarApp.getDefaultCalendar();
    calendar.createEvent(data.title, new Date(data.startTime), new Date(data.endTime), {
      location: data.room,
      description: "Booked by " + data.email
    });
    return ContentService.createTextOutput(JSON.stringify({status: "success", message: "Event Created"})).setMimeType(ContentService.MimeType.JSON);
  }
}`}
            </pre>
          </div>
        </motion.div>
      )}

      {/* Simulator Webhook logs console */}
      {logs.length > 0 && (
        <div className="mt-4 border-t border-white/10 pt-4">
          <p className="text-[10px] font-black text-slate-600 uppercase tracking-wider mb-2 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Real-time Integration Outbound Console
          </p>
          <div className="space-y-1.5 max-h-36 overflow-y-auto">
            {logs.map((log) => (
              <div key={log.id} className="text-xs bg-white/20 hover:bg-white/40 p-2.5 rounded-xl border border-white/45 flex justify-between items-center font-mono text-slate-700">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="font-extrabold text-indigo-700">[{log.type}]</span>
                  <span className="truncate max-w-sm md:max-w-xl text-slate-800 font-semibold">
                    {log.type === "Email" ? "📧 Send email to: " : "📅 Event created for: "} {log.payload.email} ({log.payload.title})
                  </span>
                </div>
                <span className="text-[10px] text-slate-550 font-bold">{log.timestamp}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Utility triggers for background webhook emulation & physical posting
export async function triggerWebhook(type: "Email" | "Calendar", payload: any, customUrl?: string) {
  // Dispatch interface event for our real-time console
  const event = new CustomEvent("webhook-trigger", {
    detail: { type, payload }
  });
  window.dispatchEvent(event);

  // If a URL is configured, let's post actual data to support real-world endpoints
  if (customUrl) {
    try {
      await fetch(customUrl, {
        method: "POST",
        mode: "no-cors", // Standard block bypass for GAS webhooks
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch (e) {
      console.warn("Webhook fetch completed or restricted:", e);
    }
  }
}
export function getDemoWebhookUrl(type: 'email' | 'calendar') {
  return "";
}
