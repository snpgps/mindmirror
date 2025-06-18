
"use client";
import type { User, UserRole, Patient, Doctor } from '@/lib/types';
import { useRouter } from 'next/navigation';
import React, { useState, useEffect, createContext, useContext, useCallback, useRef } from 'react';
import { 
  getAuth, 
  onAuthStateChanged, 
  signInWithPopup, 
  signOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile as updateFirebaseAuthProfile,
  type User as FirebaseUserType
} from 'firebase/auth';
import { auth, googleProvider, db } from '@/lib/firebase';
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';

// pendingUserProfileDataRef is no longer used for email signups post this change,
// but might be useful for other scenarios or future refactors if needed.
// For now, its direct usage in email signup document creation is removed.
interface PendingUserProfile {
  uid: string;
  name: string;
  email: string;
  role: UserRole;
  doctorCode?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  isProcessingAuth: boolean;
  signInWithGoogle: () => Promise<void>;
  signUpWithEmail: (email: string, password: string, name: string, role: UserRole, doctorCode?: string) => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUserInContext: (updatedProfileData: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isProcessingAuth, setIsProcessingAuth] = useState(false);
  const router = useRouter();

  const updateUserInContext = useCallback(async (updatedProfileData: Partial<User>) => {
    if (!user) return;
    const userDocRef = doc(db, "users", user.id);
    try {
      await updateDoc(userDocRef, updatedProfileData);
      setUser(currentUser => {
        if (!currentUser) return null;
        const newUserData = { ...currentUser, ...updatedProfileData };
        return newUserData;
      });
    } catch (error) {
        console.error("Error updating user profile in Firestore or context:", error);
        // Optionally re-throw or handle with a toast
    }
  }, [user]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUserType | null) => {
      setLoading(true);
      setIsProcessingAuth(true);
      let appUser: User | null = null;

      if (firebaseUser) {
        const userDocRef = doc(db, "users", firebaseUser.uid);
        try {
          const userProfileSnap = await getDoc(userDocRef);

          if (userProfileSnap.exists()) {
            const profileData = userProfileSnap.data() as any;
            appUser = {
              id: firebaseUser.uid,
              email: firebaseUser.email || profileData.email || '',
              name: firebaseUser.displayName || profileData.name || 'User',
              role: profileData.role as UserRole,
              ...(profileData.role === 'patient' && { linkedDoctorCode: profileData.linkedDoctorCode }),
              ...(profileData.role === 'doctor' && { doctorCode: profileData.doctorCode }),
            };
            setUser(appUser);
          } else {
            // Document doesn't exist. This is expected for Google first-time sign-in.
            // For email/password, doc should have been created by signUpWithEmail.
            const providerId = firebaseUser.providerData?.[0]?.providerId;
            if (providerId === 'google.com') {
              console.log(`onAuthStateChanged: Creating Firestore doc for new Google user ${firebaseUser.uid}`);
              const defaultRole: UserRole = 'patient'; // Or prompt user for role
              const name = firebaseUser.displayName || 'New User';
              const email = firebaseUser.email || '';
              const newUserFirestoreData: Patient = { id: firebaseUser.uid, name, email, role: defaultRole };
              await setDoc(userDocRef, newUserFirestoreData);
              appUser = newUserFirestoreData;
              setUser(appUser);
            } else if (providerId === 'password') {
              // This is now an unexpected state if signUpWithEmail is supposed to create the doc.
              console.error(`CRITICAL: Firestore document for email user ${firebaseUser.uid} is missing. This should have been created during signup. User will be signed out.`);
              await signOut(auth); // This will re-trigger onAuthStateChanged with firebaseUser = null
              appUser = null; // Ensure appUser is null before further processing
            } else {
              console.warn(`User ${firebaseUser.uid} authenticated with unhandled provider ${providerId}. Firestore document missing. Signing out.`);
              await signOut(auth);
              appUser = null;
            }
          }
          
          // Redirection logic (only if appUser was successfully determined)
          if (appUser && (window.location.pathname === '/login' || window.location.pathname === '/signup' || window.location.pathname === '/')) {
              if (appUser.role === 'patient') router.push('/patient/dashboard');
              else if (appUser.role === 'doctor') router.push('/doctor/dashboard');
          }

        } catch (error) {
            console.error("Error in onAuthStateChanged processing user profile:", error);
            await signOut(auth); // Sign out on error to prevent inconsistent state
            appUser = null; // setUser(null) handled by subsequent onAuthStateChanged
        }
      } else { // No firebaseUser (logged out)
        setUser(null);
        appUser = null;
        if (window.location.pathname.startsWith('/patient') || window.location.pathname.startsWith('/doctor')) {
            router.push('/login');
        }
      }
      setLoading(false);
      setIsProcessingAuth(false);
    });
    return () => unsubscribe();
  }, [router, updateUserInContext]); 

  const signInWithGoogle = async () => {
    setIsProcessingAuth(true);
    try {
      await signInWithPopup(auth, googleProvider);
      // onAuthStateChanged will handle Firestore doc creation if needed and user state update.
    } catch (error: any) {
      console.error("Google Sign-In error", error);
      setIsProcessingAuth(false); // Explicitly set false on error for this direct action
      throw error; 
    }
    // setIsProcessingAuth(false) will be handled by onAuthStateChanged after this.
  };

  const signUpWithEmail = async (email: string, password: string, name: string, role: UserRole, doctorCode?: string) => {
    setIsProcessingAuth(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const newAuthUser = userCredential.user;
      await updateFirebaseAuthProfile(newAuthUser, { displayName: name });
      
      // Directly create Firestore document
      const userDocRef = doc(db, "users", newAuthUser.uid);
      let userProfileData: Patient | Doctor;

      if (role === 'doctor') {
        if (!doctorCode) throw new Error("Doctor code is required for doctor role.");
        userProfileData = { id: newAuthUser.uid, name, email: newAuthUser.email!, role, doctorCode };
      } else {
        userProfileData = { id: newAuthUser.uid, name, email: newAuthUser.email!, role };
      }
      
      await setDoc(userDocRef, userProfileData);
      
      // Directly set user in context
      setUser(userProfileData as User); 
      // onAuthStateChanged will still run, find the doc, and confirm the user state.
      // Redirection will be handled by onAuthStateChanged.

    } catch (error: any) {
      console.error("Email Sign-Up error:", error);
      // setUser(null) is not called here; onAuthStateChanged handles auth state if user creation failed.
      setIsProcessingAuth(false); // Explicitly set false on error for this direct action
      throw error; 
    }
    // setIsProcessingAuth(false) will be handled by onAuthStateChanged after this.
  };

  const signInWithEmail = async (email: string, password: string) => {
    setIsProcessingAuth(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // onAuthStateChanged will handle user state update and redirection.
    } catch (error: any) {
      console.error("Email Sign-In error", error);
      setIsProcessingAuth(false); // Explicitly set false on error for this direct action
      throw error;
    }
    // setIsProcessingAuth(false) will be handled by onAuthStateChanged after this.
  };

  const logoutUser = async () => {
    setIsProcessingAuth(true);
    try {
      await signOut(auth);
      // onAuthStateChanged will set user to null.
    } catch (error: any) {
      console.error("Sign Out error", error);
      // setIsProcessingAuth(false) will be handled by onAuthStateChanged
      // even if error, onAuthStateChanged will reflect current auth state
    }
    // setIsProcessingAuth(false) will be handled by onAuthStateChanged.
  };
  
  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      isAuthenticated: !!user && !loading, 
      isProcessingAuth,
      signInWithGoogle,
      signUpWithEmail,
      signInWithEmail,
      logout: logoutUser,
      updateUserInContext
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

