import { doc, getDoc, setDoc, updateDoc, increment } from 'firebase/firestore';
import { db } from '../lib/firebase';

const COLLECTION = 'inventory';
const DOC_ID = 'linen';

export interface LinenInventory {
  bedKits: number;
  towelKits: number;
  lastUpdated: any;
}

export async function getLinenInventory(): Promise<LinenInventory> {
  const ref = doc(db, COLLECTION, DOC_ID);
  const snap = await getDoc(ref);
  
  if (!snap.exists()) {
    const initial = { bedKits: 0, towelKits: 0, lastUpdated: new Date() };
    await setDoc(ref, initial);
    return initial;
  }
  
  return snap.data() as LinenInventory;
}

export async function addCleanLinen(bedCount: number, towelCount: number) {
  const ref = doc(db, COLLECTION, DOC_ID);
  await updateDoc(ref, {
    bedKits: increment(bedCount),
    towelKits: increment(towelCount),
    lastUpdated: new Date()
  });
}

export async function subtractLinen(bedCount: number, towelCount: number) {
  const ref = doc(db, COLLECTION, DOC_ID);
  await updateDoc(ref, {
    bedKits: increment(-bedCount),
    towelKits: increment(-towelCount),
    lastUpdated: new Date()
  });
}

export async function setLinenInventory(bedKits: number, towelKits: number) {
  const ref = doc(db, COLLECTION, DOC_ID);
  await setDoc(ref, {
    bedKits,
    towelKits,
    lastUpdated: new Date()
  });
}
