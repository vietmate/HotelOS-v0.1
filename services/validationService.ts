
import { Room, RoomStatus } from '../types';

/**
 * Checks if a new booking interval overlaps with existing room commitments.
 * 
 * Logic: Two time intervals (StartA, EndA) and (StartB, EndB) overlap if:
 * StartA < EndB AND StartB < EndA
 * 
 * @param room The room object containing current status and upcoming reservations.
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
  if (newCheckIn >= newCheckOut) return false; // Invalid range is not an overlap, handled by basic validation

  // 2. Check against Current Stay (if Room is Occupied and we are not editing the current stay)
  // This is relevant if we are trying to add a "Future" reservation but the room is currently occupied during that time.
  if (!ignoreCurrentStay && room.status === RoomStatus.OCCUPIED && room.checkInDate && room.checkOutDate) {
      // Overlap formula
      if (newCheckIn < room.checkOutDate && room.checkInDate < newCheckOut) {
          return true;
      }
  }

  // 3. Check against Upcoming Reservation
  // If the room already has a future booking, ensure our new dates don't clash with it.
  if (room.upcomingReservation) {
      // Note: We access the reservation dates. Assuming reservation dates are valid.
      const resStart = room.upcomingReservation.checkInDate;
      const resEnd = room.upcomingReservation.checkOutDate;

      if (newCheckIn < resEnd && resStart < newCheckOut) {
          return true;
      }
  }

  return false;
};
