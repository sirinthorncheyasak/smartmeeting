import { Booking } from "../types";

/**
 * Calculates academic year for a given date.
 * August of Year N through July of Year N+1 belongs to Academic Year N.
 */
export function getAcademicYear(dateString: string): number {
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = date.getMonth(); // 0 = Jan, 7 = Aug, 11 = Dec

  // August (7) to December (11) -> Academic Year is N
  // January (0) to July (6) -> Academic Year is N - 1
  if (month >= 7) {
    return year;
  } else {
    return year - 1;
  }
}

/**
 * Returns month shorthand (Aug, Sep, etc.) for a date
 */
export function getMonthAbbreviation(dateString: string): string {
  const date = new Date(dateString);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return months[date.getMonth()];
}

/**
 * Filter bookings based on Academic Year and Month selection
 */
export function filterBookingsByAcademicPeriod(
  bookings: Booking[],
  academicYear: string, // "all" or e.g. "2025"
  month: string // "all" or specific month abbreviation ("Aug", "Sep", etc.)
): Booking[] {
  return bookings.filter((booking) => {
    const bookingYear = getAcademicYear(booking.startTime);
    const bookingMonth = getMonthAbbreviation(booking.startTime);

    const yearMatch = academicYear === "all" || bookingYear.toString() === academicYear;
    const monthMatch = month === "all" || bookingMonth === month;

    return yearMatch && monthMatch;
  });
}

/**
 * Generates initial mock/default rooms if none exist.
 */
export const DEFAULT_ROOMS = [
  { id: "room-a", name: "Seminar Room A", capacity: 40, location: "Building 3, Floor 4", active: true },
  { id: "room-b", name: "Conference Room B", capacity: 20, location: "Building 3, Floor 5", active: true },
  { id: "room-c", name: "Creative Studio Lab C", capacity: 15, location: "Building 9, Floor 2", active: true },
  { id: "room-d", name: "Auditorium D", capacity: 120, location: "Building 12, Floor 1", active: true },
  { id: "room-e", name: "Boardroom E", capacity: 10, location: "Building 1, Floor 2", active: true },
];
