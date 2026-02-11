
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

export enum InvoiceStatus {
  NONE = 'NONE',
  REQUIRED = 'REQUIRED',
  PROVIDED = 'PROVIDED'
}

export enum PaymentMethod {
  CASH = 'CASH',
  CARD = 'CARD',
  QR_TRANSFER = 'QR_TRANSFER',
  PREPAID = 'PREPAID'
}

export interface Reservation {
  id: string;
  guestName: string;
  checkInDate: string;
  checkOutDate: string;
  checkInTime?: string;
  checkOutTime?: string;
  isHourly?: boolean;
  source?: BookingSource;
  paymentMethod?: PaymentMethod;
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

export interface RoomHistoryEntry {
  date: string;
  action: 'CHECK_IN' | 'CHECK_OUT' | 'STATUS_CHANGE' | 'MAINTENANCE' | 'INFO';
  description: string;
  staffName?: string; 
}

export interface Room {
  id: string;
  number: string;
  name?: string;
  capacity: number;
  type: RoomType;
  status: RoomStatus;
  price: number; 
  salePrice?: number; 
  paymentMethod?: PaymentMethod;
  guestName?: string;
  guestId?: string; 
  checkInDate?: string;
  checkOutDate?: string;
  checkInTime?: string;
  checkOutTime?: string;
  isHourly?: boolean;
  notes?: string;
  maintenanceIssue?: string;
  bookingSource?: BookingSource;
  invoiceStatus?: InvoiceStatus;
  futureReservations?: Reservation[];
  pastReservations?: Reservation[]; // Added to track old stays
  isIdScanned?: boolean; 
  icalUrl?: string; 
  history?: RoomHistoryEntry[];
}

export interface OccupancyData {
  name: string;
  occupied: number;
  total: number;
}

export enum Currency {
  VND = 'VND',
  USD = 'USD',
  EUR = 'EUR',
  KRW = 'KRW',
  JPY = 'JPY',
  CNY = 'CNY',
  GBP = 'GBP',
  AUD = 'AUD',
  SGD = 'SGD',
  THB = 'THB'
}

export interface CashTransaction {
  id: string;
  amount: number;
  currency: Currency;
  description: string;
  date: string; 
  type: 'IN' | 'OUT';
}

export enum BookingType {
  STANDARD = 'STANDARD',
  HOURLY = 'HOURLY'
}

export interface Booking {
  id: string;
  room_id: string;
  guest_name: string;
  guest_id?: string;
  check_in_at: string; 
  check_out_at: string; 
  booking_type: BookingType;
  status: 'CHECKED_IN' | 'CHECKED_OUT' | 'CANCELLED' | 'RESERVED';
  created_at?: string;
  payment_method?: PaymentMethod;
}

export type EmployeeRole = 'Reception' | 'Housekeeping' | 'Maintenance' | 'Security' | 'Manager';

export interface Employee {
  id: string;
  name: string;
  role: EmployeeRole;
  hourlyRate: number;
  isWorking: boolean;
  phone?: string;
  reviewsHistory?: Record<string, number>;
  monthlyReviews?: number;
}

export interface TimeEntry {
  id: string;
  employeeId: string;
  clockIn: string;
  clockOut?: string;
  totalPay?: number;
}
