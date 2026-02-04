
export enum RoomStatus {
  AVAILABLE = 'AVAILABLE',
  OCCUPIED = 'OCCUPIED',
  DIRTY = 'DIRTY',
  MAINTENANCE = 'MAINTENANCE',
  RESERVED = 'RESERVED'
}

export enum RoomType {
  SINGLE = 'Single',
  DOUBLE = 'Double',
  SUITE = 'Suite'
}

export enum BookingSource {
  BOOKING_COM = 'Booking.com',
  AGODA = 'Agoda',
  G2J = 'G2J',
  WALK_IN = 'Walk-In',
  OTHER = 'Other'
}

export interface Reservation {
  id: string;
  guestName: string;
  checkInDate: string;
  checkOutDate: string;
  source?: BookingSource;
}

export interface Guest {
  id?: string;
  full_name: string;
  id_number?: string;
  phone?: string;
  email?: string;
  nationality?: string;
  notes?: string;
}

export interface Room {
  id: string;
  number: string;
  name?: string;
  capacity: number;
  type: RoomType;
  status: RoomStatus;
  price: number; // Base price
  salePrice?: number; // Actual sold price in VND
  guestName?: string;
  guestId?: string; // Link to the Guest Table
  checkInDate?: string;
  checkOutDate?: string;
  checkInTime?: string;
  checkOutTime?: string;
  isHourly?: boolean;
  notes?: string;
  maintenanceIssue?: string;
  bookingSource?: BookingSource;
  upcomingReservation?: Reservation;
  isIdScanned?: boolean; // KBTTT Compliance
  icalUrl?: string; // Booking.com Calendar Link
}

export interface OccupancyData {
  name: string;
  occupied: number;
  total: number;
}

export enum Currency {
  VND = 'VND', // Vietnam
  USD = 'USD', // USA
  EUR = 'EUR', // Europe
  KRW = 'KRW', // South Korea
  JPY = 'JPY', // Japan
  CNY = 'CNY', // China
  GBP = 'GBP', // UK
  AUD = 'AUD', // Australia
  SGD = 'SGD', // Singapore
  THB = 'THB'  // Thailand
}

export interface CashTransaction {
  id: string;
  amount: number;
  currency: Currency;
  description: string;
  date: string; // ISO string
  type: 'IN' | 'OUT';
}

export type EmployeeRole = 'Reception' | 'Housekeeping' | 'Manager' | 'Maintenance' | 'Security';

export interface Employee {
  id: string;
  name: string;
  role: EmployeeRole;
  phone?: string;
  hourlyRate?: number; // In VND
  isWorking?: boolean; // Currently clocked in?
}

export interface TimeEntry {
  id: string;
  employeeId: string;
  clockIn: string; // ISO String
  clockOut?: string; // ISO String
  totalPay?: number; // Calculated on clock out
  notes?: string;
}
