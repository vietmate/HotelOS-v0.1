
import { Room, RoomStatus, Booking } from '../types';

/**
 * Checks if a new booking interval overlaps with existing room commitments.
 * 
 * Logic: Two time intervals (StartA, EndA) and (StartB, EndB) overlap if:
 * StartA < EndB AND StartB < EndA
 * 
 * @param room The room object containing current status and future reservations.
 * @param newCheckIn The proposed check-in date (YYYY-MM-DD).
 * @param newCheckOut The proposed check-out date (YYYY-MM-DD).
 * @param ignoreCurrentStay If true, skips checking against the current occupied dates (useful when editing the current stay itself).
 * @returns true if an overlap exists, false otherwise.
 */
export const hasBookingConflict = (
  room: Room,
  newCheckIn: string,
  newCheckOut: string,
  ignoreCurrentStay: boolean = false
): boolean => {
  // 1. Validate inputs
  if (!newCheckIn || !newCheckOut) return false;
  if (newCheckIn >= newCheckOut) return false; 

  // 2. Check against Current Stay
  if (!ignoreCurrentStay && room.status === RoomStatus.OCCUPIED && room.checkInDate && room.checkOutDate) {
      if (newCheckIn < room.checkOutDate && room.checkInDate < newCheckOut) {
          return true;
      }
  }

  // 3. Check against ALL Future Reservations
  if (room.futureReservations && room.futureReservations.length > 0) {
      for (const res of room.futureReservations) {
          if (newCheckIn < res.checkOutDate && res.checkInDate < newCheckOut) {
              return true;
          }
      }
  }

  return false;
};

/**
 * Checks if a specific time slot is available given a list of existing bookings.
 */
export const isTimeSlotAvailable = (
  existingBookings: Booking[],
  newStart: string,
  newEnd: string
): boolean => {
  const start = new Date(newStart).getTime();
  const end = new Date(newEnd).getTime();

  for (const booking of existingBookings) {
    if (booking.status === 'CANCELLED') continue;

    const bStart = new Date(booking.check_in_at).getTime();
    const bEnd = new Date(booking.check_out_at).getTime();

    if (start < bEnd && bStart < end) {
      return false;
    }
  }
  return true;
};
