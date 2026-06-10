export type BookingStatus = 'pending' | 'approved' | 'cancelled';

export interface Booking {
  id: string;
  title: string;
  roomId: string;
  roomName: string;
  startTime: string; // ISO string for TS, stored as String/Timestamp in Firestore
  endTime: string;   // ISO string for TS, stored as String/Timestamp in Firestore
  status: BookingStatus;
  requesterEmail: string;
  requesterName: string;
  requesterDepartment: string;
  requesterPhone: string;
  createdAt: string;
  updatedAt: string;
  approvedBy?: string;
  approvedAt?: string;
  cancelledReason?: string;
}

export interface Room {
  id: string;
  name: string;
  capacity: number;
  location: string;
  active: boolean;
}

export interface Staff {
  id: string;
  employeeId: string;
  fullName: string;
  department: string;
  email: string;
  phone: string;
  extension: string;
  updatedAt: string;
}

export interface Admin {
  email: string;
}

export interface BookingFilters {
  academicYear: string;
  month: string; // "all" or "01".."12"
  search: string;
  status: string; // "all", "pending", "approved", "cancelled"
}
