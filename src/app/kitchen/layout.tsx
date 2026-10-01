"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { LoadingScreen } from "@/components/ui/spinner";
import { UtensilsCrossed, LogOut } from "lucide-react";

export default function KitchenLayout({ children }: { children: React.ReactNode }) {
  const { user, restaurantUser, loading, logOut } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
    if (!loading && restaurantUser && !["KITCHEN", "MANAGER", "OWNER"].includes(restaurantUser.role)) {
      router.replace("/dashboard");
    }
  }, [loading, user, restaurantUser, router]);

  if (loading) return <LoadingScreen />;
  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <header className="bg-gray-800 border-b border-gray-700 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-orange-500 flex items-center justify-center">
            <UtensilsCrossed className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="font-bold text-white">Kitchen Display</p>
            <p className="text-xs text-gray-400">{restaurantUser?.name}</p>
          </div>
        </div>
        <button
          onClick={logOut}
          className="flex items-center gap-2 rounded-xl bg-gray-700 px-3 py-2 text-sm text-gray-300 hover:bg-gray-600"
        >
          <LogOut className="h-4 w-4" /> Sign Out
        </button>
      </header>
      <main className="p-4 lg:p-6">{children}</main>
    </div>
  );
}
