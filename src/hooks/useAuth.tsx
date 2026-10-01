"use client";
import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, onAuthStateChanged, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { auth } from "@/lib/firebase/config";
import { restaurantService } from "@/services/restaurantService";
import { RestaurantUser } from "@/types";

interface AuthContextType {
  user: User | null;
  restaurantUser: RestaurantUser | null;
  restaurantId: string | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  logOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [restaurantUser, setRestaurantUser] = useState<RestaurantUser | null>(null);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        // restaurantId stored in custom claims or user profile
        const token = await firebaseUser.getIdTokenResult();
        const rid = token.claims.restaurantId as string | undefined;
        if (rid) {
          setRestaurantId(rid);
          const ru = await restaurantService.getUser(rid, firebaseUser.uid);
          setRestaurantUser(ru);
        }
      } else {
        setRestaurantUser(null);
        setRestaurantId(null);
      }
      setLoading(false);
    });
  }, []);

  const signIn = async (email: string, password: string) => {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    // Force token refresh so custom claims (restaurantId, role) are available immediately
    await cred.user.getIdToken(true);
  };

  const logOut = async () => {
    await signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, restaurantUser, restaurantId, loading, signIn, logOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
