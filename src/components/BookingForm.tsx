import React, { useState, useEffect } from "react";
import { 
  collection, 
  getDocs, 
  query, 
  where, 
  addDoc,
  serverTimestamp,
  doc,
  setDoc
} from "firebase/firestore";
import { db, auth, handleFirestoreError, OperationType } from "../firebase";
import { Room, Staff, Booking, BookingStatus } from "../types";
import { Calendar, Clock, MapPin, Users, Heart, Sparkles, Check, AlertTriangle } from "lucide-react";
import { motion } from "motion/react";
import { triggerWebhook } from "./IntegrationConfig";

interface BookingFormProps {
  rooms: Room[];
  onBookingSuccess: () => void;
  emailWebhookUrl: string;
  calendarWebhookUrl: string;
}

export default function BookingForm({
  rooms,
  onBookingSuccess,
  emailWebhookUrl,
  calendarWebhookUrl,
}: BookingFormProps) {
  const [profile, setProfile] = useState<Staff | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  // Form Fields
  const [title, setTitle] = useState("");
  const [selectedRoomId, setSelectedRoomId] = useState("");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState(""); // hh:mm
  const [endTime, setEndTime] = useState("");     // hh:mm

  // Personal fields (autofill fallback)
  const [fullName, setFullName] = useState("");
  const [department, setDepartment] = useState("");
  const [phone, setPhone] = useState("");
  const [extension, setExtension] = useState("");
  const [employeeId, setEmployeeId] = useState("");

  const [savingProfile, setSavingProfile] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const currentUser = auth.currentUser;

  // 1. Fetch Staff Profile for Autofill
  useEffect(() => {
    async function fetchStaffProfile() {
      if (!currentUser?.email) return;
      setLoadingProfile(true);
      try {
        const staffRef = collection(db, "staff");
        const q = query(staffRef, where("email", "==", currentUser.email));
        const snap = await getDocs(q);

        if (!snap.empty) {
          const docData = snap.docs[0].data();
          const foundProfile = { id: snap.docs[0].id, ...docData } as Staff;
          setProfile(foundProfile);
          setFullName(foundProfile.fullName);
          setDepartment(foundProfile.department);
          setPhone(foundProfile.phone);
          setExtension(foundProfile.extension);
          setEmployeeId(foundProfile.employeeId);
        } else {
          // No profile yet, autofill name from Google Auth if available
          setFullName(currentUser.displayName || "");
        }
      } catch (err) {
        console.error("Error retrieving staff profile:", err);
      } finally {
        setLoadingProfile(false);
      }
    }
    fetchStaffProfile();
  }, [currentUser?.email]);

  // 2. Save Staff Profile (Upsert)
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser?.email) return;
    setSavingProfile(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const docId = profile?.id || currentUser.uid;
      const ref = doc(db, "staff", docId);
      const staffPayload = {
        id: docId,
        fullName,
        department,
        email: currentUser.email,
        phone,
        extension,
        employeeId: employeeId || "STF-" + Math.floor(Math.random() * 9000 + 1000),
        updatedAt: new Date().toISOString()
      };

      await setDoc(ref, staffPayload);
      setProfile(staffPayload as Staff);
      setSuccessMessage("Autofill profile updated successfully!");
    } catch (err) {
      console.error(err);
      setErrorMessage("Failed to update staff profile: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setSavingProfile(false);
    }
  };

  // 3. Complete booking submission with collision validation
  const handleSubmitBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser?.email) return;
    setErrorMessage("");
    setSuccessMessage("");

    // Local Field checks
    if (!title || !selectedRoomId || !date || !startTime || !endTime) {
      setErrorMessage("Please fill in all booking fields.");
      return;
    }

    // 1. Time comparisons
    const startDateTimeStr = `${date}T${startTime}:00`;
    const endDateTimeStr = `${date}T${endTime}:00`;
    const newStart = new Date(startDateTimeStr);
    const newEnd = new Date(endDateTimeStr);

    if (newEnd <= newStart) {
      setErrorMessage("The end time must be greater than the start time.");
      return;
    }

    // 2. No past booking
    const now = new Date();
    if (newStart < now) {
      setErrorMessage("You cannot book rooms in the past. Select a future time.");
      return;
    }

    setBookingLoading(true);

    try {
      // 3. Conflict Detection
      // Fetch bookings for this room. Keep performance up by querying only for bookings on this date
      const startTimeDay = `${date}T00:00:00`;
      const endTimeDay = `${date}T23:59:59`;

      const bookingsRef = collection(db, "bookings");
      const q = query(
        bookingsRef,
        where("roomId", "==", selectedRoomId),
        where("status", "in", ["approved", "pending"])
      );

      const snap = await getDocs(q);
      const bookingsOnDay = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Booking));

      // Overlap checking formula
      const hasConflict = bookingsOnDay.some((existing) => {
        const extStart = new Date(existing.startTime);
        const extEnd = new Date(existing.endTime);
        return newStart < extEnd && newEnd > extStart;
      });

      if (hasConflict) {
        setErrorMessage("Room Conflict Detected: This room is already booked for the selected time slot.");
        setBookingLoading(false);
        return;
      }

      // Save Booking
      const selectedRoom = rooms.find((r) => r.id === selectedRoomId);
      const bookingData = {
        title,
        roomId: selectedRoomId,
        roomName: selectedRoom ? selectedRoom.name : "Meeting Room",
        startTime: newStart.toISOString(),
        endTime: newEnd.toISOString(),
        status: "pending" as BookingStatus,
        requesterEmail: currentUser.email,
        requesterName: fullName || currentUser.displayName || "BU Staff member",
        requesterDepartment: department || "N/A",
        requesterPhone: phone || "N/A",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const result = await addDoc(bookingsRef, bookingData);

      // Trigger notification webhook
      await triggerWebhook("Email", {
        type: "New Booking Notification",
        title: title,
        room: selectedRoom ? selectedRoom.name : "Meeting Room",
        startTime: newStart.toLocaleString(),
        endTime: newEnd.toLocaleString(),
        status: "pending",
        email: currentUser.email,
        payload: bookingData
      }, emailWebhookUrl);

      setSuccessMessage("Booking request submitted! Awaiting administrator approval.");
      
      // Clear Form fields
      setTitle("");
      setSelectedRoomId("");
      setDate("");
      setStartTime("");
      setEndTime("");

      onBookingSuccess();
    } catch (err) {
      console.error(err);
      try {
        handleFirestoreError(err, OperationType.CREATE, "bookings");
      } catch (logErr) {
        setErrorMessage("Failed to save booking details. Database rules might reject unauthorized payloads.");
      }
    } finally {
      setBookingLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-8" id="booking-system">
      {/* Profiler block */}
      <div className="lg:col-span-5 glass-panel rounded-[2rem] p-6 shadow-xl flex flex-col justify-between border border-white/55">
        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div>
            <span className="bg-indigo-500/10 text-indigo-700 text-xs font-bold px-3 py-1.5 rounded-full uppercase tracking-wider">
              Profile Sync & AutoFill
            </span>
            <h3 className="text-lg font-bold text-slate-900 mt-2 flex items-center gap-2 font-display">
              <Sparkles className="w-5 h-5 text-indigo-600" />
              Staff Information
            </h3>
            <p className="text-xs text-slate-500">
              Set up your profile to auto-fill credentials for every booking request.
            </p>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Full Name</label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="John Doe"
                className="w-full text-sm px-4 py-2 rounded-2xl transition-all glass-input focus:outline-none text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Department</label>
              <input
                type="text"
                required
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="Business Information Tech"
                className="w-full text-sm px-4 py-2 rounded-2xl transition-all glass-input focus:outline-none text-slate-900"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Mobile Phone</label>
                <input
                  type="text"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="081XXXXXXX"
                  className="w-full text-sm px-4 py-2 rounded-2xl transition-all glass-input focus:outline-none text-slate-900"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Extension</label>
                <input
                  type="text"
                  required
                  value={extension}
                  onChange={(e) => setExtension(e.target.value)}
                  placeholder="1234"
                  className="w-full text-sm px-4 py-2 rounded-2xl transition-all glass-input focus:outline-none text-slate-900"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Employee ID (Optional)</label>
              <input
                type="text"
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                placeholder="BU-5642"
                className="w-full text-sm px-4 py-2 rounded-2xl transition-all glass-input focus:outline-none text-slate-900"
              />
            </div>

            <div className="text-xs text-indigo-800 bg-indigo-50/50 backdrop-blur-md p-3 rounded-2xl border border-indigo-150 flex items-center justify-between">
              <span>Logged in:</span> <strong className="text-indigo-950 font-semibold">{currentUser?.email}</strong>
            </div>
          </div>

          <button
            type="submit"
            disabled={savingProfile}
            className="w-full py-2.5 bg-slate-950 text-white rounded-2xl text-xs font-extrabold hover:bg-slate-800 transition-all cursor-pointer flex justify-center items-center gap-2 shadow-md shadow-indigo-105"
          >
            {savingProfile ? "Saving Profile..." : "Save Auto-Fill Details"}
          </button>
        </form>
      </div>

      {/* Main Reservation panel */}
      <div className="lg:col-span-7 glass-panel rounded-[2rem] p-6 shadow-xl flex flex-col justify-between border border-white/55">
        <div>
          <span className="bg-violet-550/10 text-violet-700 text-xs font-bold px-3 py-1.5 rounded-full uppercase tracking-wider">
            Smart Room Reservation
          </span>
          <h3 className="text-lg font-bold text-slate-900 mt-2 flex items-center gap-2 font-display">
            <Calendar className="w-5 h-5 text-violet-600" />
            Reserve a Conference Room
          </h3>
          <p className="text-xs text-slate-500">
            Submit a reservation request. Our conflict-checker engine ensures no duplicate slots are booked.
          </p>
        </div>

        <form onSubmit={handleSubmitBooking} className="mt-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Meeting Title</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Senior Project Defense"
                className="w-full text-sm px-4 py-2 rounded-2xl transition-all glass-input focus:outline-none text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Conference Room</label>
              <select
                required
                value={selectedRoomId}
                onChange={(e) => setSelectedRoomId(e.target.value)}
                className="w-full text-sm px-3 py-2 rounded-2xl transition-all glass-input focus:outline-none text-slate-900 bg-white/40"
              >
                <option value="" className="text-slate-900">Select Room...</option>
                {rooms.map((room) => (
                  <option key={room.id} value={room.id} disabled={!room.active} className="text-slate-900">
                    {room.name} ({room.location} - Cap: {room.capacity})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Date</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full text-sm px-3 py-1.5 rounded-2xl transition-all glass-input focus:outline-none text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Start Time</label>
              <input
                type="time"
                required
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full text-sm px-3 py-1.5 rounded-2xl transition-all glass-input focus:outline-none text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">End Time</label>
              <input
                type="time"
                required
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full text-sm px-3 py-1.5 rounded-2xl transition-all glass-input focus:outline-none text-slate-900"
              />
            </div>
          </div>

          {/* Prompt Messages */}
          {errorMessage && (
            <div className="bg-red-500/10 text-red-700 text-xs p-3 rounded-2xl border border-red-200 flex items-center gap-2 backdrop-blur-md">
              <AlertTriangle className="w-5 h-5 flex-shrink-0 animate-bounce text-red-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="bg-emerald-500/10 text-emerald-800 text-xs p-3 rounded-2xl border border-emerald-200 flex items-center gap-2 backdrop-blur-md">
              <Check className="w-5 h-5 flex-shrink-0 font-extrabold text-emerald-600" />
              <span>{successMessage}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={bookingLoading}
            className="w-full py-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-2xl text-xs font-black hover:opacity-90 transition-all flex justify-center items-center gap-2 cursor-pointer disabled:from-indigo-400 disabled:to-violet-400 shadow-md shadow-indigo-150"
          >
            {bookingLoading ? "Validating & Booking Slot..." : "Submit Reservation Request"}
          </button>
        </form>
      </div>
    </div>
  );
}
