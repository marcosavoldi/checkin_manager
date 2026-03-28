import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  type User, onAuthStateChanged, signInWithPopup, signOut, 
  signInWithEmailAndPassword 
} from 'firebase/auth';
import { doc, getDoc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { auth, googleProvider, db } from '../lib/firebase';

export interface AppUser extends User {
  appRole: 'admin' | 'user';
}

interface AuthContextType {
  user: AppUser | null;
  loading: boolean;
  error: string | null;
  loginWithGoogle: () => Promise<void>;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
  setError: (err: string | null) => void;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setError(null);
      if (firebaseUser) {
        try {
          // Check if Google user is an authorized admin
          const isGoogle = firebaseUser.providerData.some(p => p.providerId === 'google.com');
          
          if (isGoogle) {
            const adminCheck = await getDocs(query(
              collection(db, 'authorized_admins'), 
              where('email', '==', firebaseUser.email)
            ));
            
            // Check if user is already an admin in the users collection (Bootstrap)
            const userDocRef = doc(db, 'users', firebaseUser.uid);
            const userDoc = await getDoc(userDocRef);
            const isExistingAdmin = userDoc.exists() && userDoc.data().role === 'admin';

            if (adminCheck.empty && !isExistingAdmin) {
              await signOut(auth);
              setUser(null);
              setError('Accesso non autorizzato. Contatta l\'amministratore.');
              setLoading(false);
              return;
            }
          }

          // Fetch custom role
          const userDocRef = doc(db, 'users', firebaseUser.uid);
          const userDoc = await getDoc(userDocRef);
          
          let appRole: 'admin' | 'user' = isGoogle ? 'admin' : 'user';
          
          if (userDoc.exists()) {
            appRole = userDoc.data().role as 'admin' | 'user';
          } else {
            await setDoc(userDocRef, {
              name: firebaseUser.displayName || firebaseUser.email?.split('@')[0],
              email: firebaseUser.email,
              role: appRole
            });
          }

          setUser({ ...firebaseUser, appRole } as AppUser);
        } catch (err) {
          console.error('Auth error:', err);
          setError('Errore durante l\'autenticazione.');
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const loginWithGoogle = async () => {
    setError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      if (err.code !== 'auth/popup-closed-by-user') {
        setError('Impossibile accedere con Google.');
      }
    }
  };

  const loginWithEmail = async (email: string, pass: string) => {
    setError(null);
    try {
      await signInWithEmailAndPassword(auth, email, pass);
    } catch (err: any) {
      setError('Credenziali non valide.');
      throw err;
    }
  };

  const logout = () => signOut(auth);

  return (
    <AuthContext.Provider value={{ user, loading, error, loginWithGoogle, loginWithEmail, logout, setError }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
