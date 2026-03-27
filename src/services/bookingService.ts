import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db } from '../lib/firebase';

export type BookingSource = 'airbnb' | 'booking' | 'direct';

export interface Booking {
  id?: string;
  checkIn: Date;
  checkOut: Date;
  source: BookingSource;
  guestName?: string;
  staffNote?: string;   // nota visibile a staff e admin
  adminNote?: string;   // nota visibile solo all'admin
  adults: number;       // numero adulti
  children: number;     // numero bambini
  createdAt?: any;
  createdBy?: string;
}

const COLLECTION = 'bookings';

export async function fetchUpcomingBookings(): Promise<Booking[]> {
  const ref = collection(db, COLLECTION);
  // Mostriamo prenotazioni che non siano terminate più di 7 giorni fa
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const q = query(
    ref,
    where('checkOut', '>=', Timestamp.fromDate(sevenDaysAgo)),
    orderBy('checkOut', 'asc')
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => {
    const data = d.data();
    return {
      id: d.id,
      checkIn: (data.checkIn as Timestamp).toDate(),
      checkOut: (data.checkOut as Timestamp).toDate(),
      source: data.source as BookingSource,
      guestName: data.guestName || '',
      staffNote: data.staffNote || '',
      adminNote: data.adminNote || '',
      adults: data.adults || 0,
      children: data.children || 0,
      createdAt: data.createdAt,
      createdBy: data.createdBy
    };
  });
}

export async function addBooking(booking: Omit<Booking, 'id' | 'createdAt'>, userId: string) {
  const ref = collection(db, COLLECTION);
  return await addDoc(ref, {
    ...booking,
    checkIn: Timestamp.fromDate(booking.checkIn),
    checkOut: Timestamp.fromDate(booking.checkOut),
    createdAt: serverTimestamp(),
    createdBy: userId
  });
}

export async function updateBooking(id: string, booking: Partial<Omit<Booking, 'id' | 'createdAt'>>) {
  const ref = doc(db, COLLECTION, id);
  const data: any = { ...booking };
  if (booking.checkIn) data.checkIn = Timestamp.fromDate(booking.checkIn);
  if (booking.checkOut) data.checkOut = Timestamp.fromDate(booking.checkOut);
  return await updateDoc(ref, data);
}

export async function deleteBooking(id: string) {
  const ref = doc(db, COLLECTION, id);
  return await deleteDoc(ref);
}
