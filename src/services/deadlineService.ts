import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

export interface DeadlineConfirmations {
  ross1000LastConfirmed?: string;   // "YYYY-MM" del mese passato confermato
  touristTaxLastConfirmed?: string; // "YYYY-QN" del trimestre confermato
}

export async function getDeadlineConfirmations(): Promise<DeadlineConfirmations> {
  const ref = doc(db, 'settings', 'deadlines');
  const snap = await getDoc(ref);
  return snap.exists() ? (snap.data() as DeadlineConfirmations) : {};
}

export async function confirmRoss1000(monthKey: string): Promise<void> {
  const ref = doc(db, 'settings', 'deadlines');
  await setDoc(ref, { ross1000LastConfirmed: monthKey }, { merge: true });
}

export async function confirmTouristTax(quarterKey: string): Promise<void> {
  const ref = doc(db, 'settings', 'deadlines');
  await setDoc(ref, { touristTaxLastConfirmed: quarterKey }, { merge: true });
}
