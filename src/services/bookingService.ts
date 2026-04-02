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
  staffNoteCheckIn?: string;  // Nota specifica per l'arrivo
  staffNoteCheckOut?: string; // Nota specifica per la partenza
  staffNoteBooking?: string;  // Nota generale per l'intera prenotazione
  adminNote?: string;          // nota visibile solo all'admin
  adults: number;              // numero adulti
  children: number;            // numero bambini
  price?: number;              // importo totale della prenotazione (opzionale)
  createdAt?: any;
  createdBy?: string;
  linenAccounted?: boolean;    // Se i kit sono già stati detratti dall'inventario
}

const COLLECTION = 'bookings';

export async function fetchUpcomingBookings(): Promise<Booking[]> {
  const ref = collection(db, COLLECTION);
  const limitDate = new Date();
  limitDate.setDate(limitDate.getDate() - 90);

  const q = query(
    ref,
    where('checkOut', '>=', Timestamp.fromDate(limitDate)),
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
      staffNoteCheckIn: data.staffNoteCheckIn || '',
      staffNoteCheckOut: data.staffNoteCheckOut || '',
      // Migrazione: se esiste la vecchia 'staffNote', caricala qui
      staffNoteBooking: data.staffNoteBooking || data.staffNote || '',
      adminNote: data.adminNote || '',
      adults: data.adults || 0,
      children: data.children || 0,
      price: data.price ? Number(data.price) : undefined,
      createdAt: data.createdAt,
      createdBy: data.createdBy,
      linenAccounted: data.linenAccounted || false
    };
  });
}

export async function addBooking(booking: Omit<Booking, 'id' | 'createdAt'>, userId: string) {
  const ref = collection(db, COLLECTION);
  return await addDoc(ref, {
    ...booking,
    staffNote: '', // Puliamo il vecchio campo se presente per completare la migrazione
    checkIn: Timestamp.fromDate(booking.checkIn),
    checkOut: Timestamp.fromDate(booking.checkOut),
    createdAt: serverTimestamp(),
    createdBy: userId
  });
}

export async function updateBooking(id: string, booking: Partial<Omit<Booking, 'id' | 'createdAt'>>) {
  const ref = doc(db, COLLECTION, id);
  const data: any = { ...booking };
  data.staffNote = ''; // Puliamo il vecchio campo se presente per completare la migrazione
  if (booking.checkIn) data.checkIn = Timestamp.fromDate(booking.checkIn);
  if (booking.checkOut) data.checkOut = Timestamp.fromDate(booking.checkOut);
  return await updateDoc(ref, data);
}

export async function deleteBooking(id: string) {
  const ref = doc(db, COLLECTION, id);
  return await deleteDoc(ref);
}

/**
 * Controlla le prenotazioni che iniziano oggi o nel passato 
 * e detrae i kit dall'inventario se non già fatto.
 */
export async function processLinenConsumption(bookings: Booking[], subtractFn: (beds: number, towels: number) => Promise<void>) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const pending = bookings.filter(b => 
    !b.linenAccounted && 
    (new Date(b.checkIn) <= today)
  );

  if (pending.length === 0) return;

  for (const b of pending) {
    try {
      // 1. Sottrai dall'inventario
      const towels = b.adults || 0;
      await subtractFn(1, towels);

      // 2. Segna come contabilizzato
      const ref = doc(db, COLLECTION, b.id!);
      await updateDoc(ref, { linenAccounted: true });
      
      // Aggiorna l'oggetto in locale
      b.linenAccounted = true;
    } catch (err) {
      console.error(`Errore nel processare biancheria per ${b.id}:`, err);
    }
  }
}
