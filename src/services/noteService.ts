import { collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';

export type NoteVisibility = 'staff' | 'admin';

export interface BookingNote {
  id?: string;
  bookingId: string;
  text: string;
  visibility: NoteVisibility;
  createdAt: any;
  createdBy: string;
  authorName: string;
}

export const fetchNotesByBookingId = async (
  bookingId: string,
  isAdmin: boolean
): Promise<BookingNote[]> => {
  const notesRef = collection(db, 'notes');
  const q = query(notesRef, where('bookingId', '==', bookingId));
  const querySnapshot = await getDocs(q);

  const allNotes = querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as BookingNote[];

  // Filtra lato client: lo staff vede solo le note 'staff' (o senza visibility per retrocompat), l'admin vede tutto
  const filtered = isAdmin
    ? allNotes
    : allNotes.filter(n => !n.visibility || n.visibility === 'staff');

  return filtered.sort((a, b) => {
    const tA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
    const tB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
    return tB - tA;
  });
};

export const addBookingNote = async (
  note: Omit<BookingNote, 'id' | 'createdAt'>
) => {
  const notesRef = collection(db, 'notes');
  return await addDoc(notesRef, {
    ...note,
    createdAt: serverTimestamp()
  });
};
