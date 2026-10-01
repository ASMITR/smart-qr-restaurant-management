import { cn } from "@/utils";
import { UtensilsCrossed } from "lucide-react";

export function Spinner({ className }: { className?: string }) {
  return (
    <div className={cn("animate-spin rounded-full border-[3px] border-gray-200 border-t-orange-500", className ?? "h-6 w-6")} />
  );
}

export function LoadingScreen({ message = "Loading..." }: { message?: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-orange-50 via-white to-amber-50">
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-200">
            <UtensilsCrossed className="h-8 w-8 text-white" />
          </div>
          <div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-white flex items-center justify-center shadow">
            <Spinner className="h-3.5 w-3.5" />
          </div>
        </div>
        <p className="text-sm font-medium text-gray-500">{message}</p>
      </div>
    </div>
  );
}
