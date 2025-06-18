
"use client";
import type { User, UserRole, Patient, Doctor } from '@/lib/types';
import { useRouter } from 'next/navigation';
import React, { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { 
  getAuth, 
  onAuthStateChanged, 
  signInWithPopup, 
  signOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  type User as FirebaseUserType
} from 'firebase/auth';
import { auth, googleProvider } from '@/lib/firebase'; // Assuming firebase.ts is in src/lib

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  isProcessingAuth: boolean;
  signInWithGoogle: () => Promise<void>;
  signUpWithEmail: (email: string, password: string, name: string, role: UserRole, doctorCode?: string) => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUserInContext: (updatedProfileData: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true); // For initial auth state check
  const [isProcessingAuth, setIsProcessingAuth] = useState(false); // For ongoing auth operations
  const router = useRouter();

  const updateUserInContext = useCallback((updatedProfileData: Partial<User>) => {
    setUser(currentUser => {
      if (!currentUser) return null;
      const newUserData = { ...currentUser, ...updatedProfileData };
      // Update localStorage profile as well
      localStorage.setItem(`mindmirror-profile-${newUserData.id}`, JSON.stringify({
        name: newUserData.name,
        role: newUserData.role,
        ...(newUserData.role === 'patient' && { linkedDoctorCode: (newUserData as Patient).linkedDoctorCode }),
        ...(newUserData.role === 'doctor' && { doctorCode: (newUserData as Doctor).doctorCode }),
      }));
      return newUserData;
    });
  }, []);


  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser: FirebaseUserType | null) => {
      setLoading(true);
      if (firebaseUser) {
        let userProfile: any = null;
        try {
          const storedProfile = localStorage.getItem(`mindmirror-profile-${firebaseUser.uid}`);
          if (storedProfile) {
            userProfile = JSON.parse(storedProfile);
          }
        } catch (e) { console.error("Failed to parse profile from localStorage", e); }

        if (userProfile) {
          const appUser: User = {
            id: firebaseUser.uid,
            email: firebaseUser.email || userProfile.email || '',
            name: firebaseUser.displayName || userProfile.name || 'User',
            role: userProfile.role,
            ...(userProfile.role === 'patient' && { linkedDoctorCode: userProfile.linkedDoctorCode }),
            ...(userProfile.role === 'doctor' && { doctorCode: userProfile.doctorCode }),
          };
          setUser(appUser);
        } else {
          // New user via Google Sign-In or profile missing, create a default 'patient' profile
          const defaultRole: UserRole = 'patient';
          const newUserProfile = {
            name: firebaseUser.displayName || 'New User',
            email: firebaseUser.email || '',
            role: defaultRole,
          };
          localStorage.setItem(`mindmirror-profile-${firebaseUser.uid}`, JSON.stringify(newUserProfile));
          setUser({
            id: firebaseUser.uid,
            email: newUserProfile.email,
            name: newUserProfile.name,
            role: defaultRole,
          });
        }
        // Determine redirect based on role AFTER user is set
        const finalUserRole = userProfile?.role || 'patient';
         if (window.location.pathname === '/login' || window.location.pathname === '/signup' || window.location.pathname === '/') {
            if (finalUserRole === 'patient') {
                router.push('/patient/dashboard');
            } else {
                router.push('/doctor/dashboard');
            }
        }

      } else {
        setUser(null);
        // When logging out, if on a protected route, redirect to login
        if (window.location.pathname.startsWith('/patient') || window.location.pathname.startsWith('/doctor')) {
            router.push('/login');
        }
      }
      setLoading(false);
    });
    return () => unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]); // router dependency for redirect logic

  const signInWithGoogle = async () => {
    setIsProcessingAuth(true);
    try {
      await signInWithPopup(auth, googleProvider);
      // onAuthStateChanged will handle setting user and redirecting
    } catch (error: any) {
      console.error("Google Sign-In error", error);
      // Handle error (e.g., show toast to user)
      // Example: toast({ variant: "destructive", title: "Google Sign-In Failed", description: error.message });
    } finally {
      setIsProcessingAuth(false);
    }
  };

  const signUpWithEmail = async (email: string, password: string, name: string, role: UserRole, doctorCode?: string) => {
    setIsProcessingAuth(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(userCredential.user, { displayName: name });
      
      const userProfileData: any = { name, email, role };
      if (role === 'doctor' && doctorCode) {
        userProfileData.doctorCode = doctorCode;
      }
      localStorage.setItem(`mindmirror-profile-${userCredential.user.uid}`, JSON.stringify(userProfileData));
      // onAuthStateChanged will handle setting user and redirecting.
      // We need to ensure the profile is available for onAuthStateChanged.
      // Triggering a re-evaluation or explicitly setting user here might be needed if onAuthStateChanged doesn't pick up immediately.
      // For now, relying on onAuthStateChanged.
    } catch (error: any) {
      console.error("Email Sign-Up error", error);
      throw error; // Re-throw to be caught in AuthForm
    } finally {
      setIsProcessingAuth(false);
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    setIsProcessingAuth(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // onAuthStateChanged will handle setting user and redirecting
    } catch (error: any) {
      console.error("Email Sign-In error", error);
      throw error; // Re-throw to be caught in AuthForm
    } finally {
      setIsProcessingAuth(false);
    }
  };

  const logoutUser = async () => {
    setIsProcessingAuth(true);
    try {
      await signOut(auth);
      // onAuthStateChanged will set user to null and handle redirect.
    } catch (error: any) {
      console.error("Sign Out error", error);
    } finally {
      setIsProcessingAuth(false);
    }
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
