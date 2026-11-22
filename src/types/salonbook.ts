export type UserRole = 'client' | 'admin';

export type AppointmentStatus = 'Pending' | 'Confirmed' | 'Cancelled';
export type PaymentStatus = 'Unpaid' | 'Paid';

export interface User {
  _id: string;
  name: string;
  email: string;
  role: UserRole;
  phone?: string;
  avatarUrl?: string;
  isBlocked?: boolean;
  createdAt?: string;
}

export interface Service {
  _id: string;
  title: string;
  description: string;
  category: string;
  durationMinutes: number;
  priceCents: number;
  imageUrl?: string;
  isActive: boolean;
  createdAt?: string;
}

export interface Appointment {
  _id: string;
  clientId: string;
  customerName: string;
  customerEmail: string;
  serviceId: string;
  serviceTitle: string;
  serviceCategory: string;
  serviceImage?: string;
  servicePriceCents: number;
  date: string;
  startTime: string;
  message?: string;
  status: AppointmentStatus;
  paymentStatus: PaymentStatus;
  stripeSessionId?: string;
  createdAt: string;
}

export interface Transaction {
  _id: string;
  appointmentId: string;
  clientId: string;
  customerName: string;
  customerEmail: string;
  serviceId: string;
  serviceTitle: string;
  appointmentDate: string;
  amountCents: number;
  currency: string;
  stripeSessionId: string;
  paymentStatus: 'Paid';
  createdAt: string;
}

export const SERVICE_CATEGORIES = [
  'Haircut & Styling',
  'Hair Coloring',
  'Hair Treatment',
  'Facial & Skincare',
  'Makeup',
  'Manicure & Pedicure',
  'Spa & Massage',
] as const;

export const AVAILABLE_TIME_SLOTS = [
  '09:30 AM',
  '11:00 AM',
  '12:30 PM',
  '02:00 PM',
  '03:30 PM',
  '05:00 PM',
  '06:30 PM',
] as const;