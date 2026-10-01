"use client";
export const dynamic = "force-dynamic";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { tableService } from "@/services/tableService";
import { restaurantService } from "@/services/restaurantService";
import { sessionService } from "@/services/orderService";
import { validateLocation } from "@/lib/location";
import { Table, Restaurant } from "@/types";
import { LoadingScreen } from "@/components/ui/spinner";
import {
  MapPin, AlertCircle, UtensilsCrossed, User, Phone,
  ChevronRight, CheckCircle, Navigation,
} from "lucide-react";

type Step = "loading" | "enter-name" | "verify-location" | "verifying" | "error" | "occupied";

export default function TablePage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();

  const [step, setStep] = useState<Step>("loading");
  const [table, setTable] = useState<Table | null>(null);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [restaurantId, setRestaurantId] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [locationStatus, setLocationStatus] = useState("");

  useEffect(() => {
    let unsub: (() => void) | undefined;
    async function init() {
      const cached = sessionStorage.getItem(`table_${token}`);
      let t: Table, rid: string;
      if (cached) {
        ({ table: t, restaurantId: rid } = JSON.parse(cached));
        setTable(t); setRestaurantId(rid);
      } else {
        const result = await tableService.getByToken(token);
        if (!result) { setStep("error"); setErrorMsg("Invalid QR code. Please scan the correct QR code on your table."); return; }
        t = result.table; rid = result.restaurantId;
        sessionStorage.setItem(`table_${token}`, JSON.stringify({ table: { id: t.id, tableNumber: t.tableNumber }, restaurantId: rid }));
        setTable(t); setRestaurantId(rid);
      }
      const rest = await restaurantService.get(rid);
      if (!rest) { setStep("error"); setErrorMsg("Restaurant not found."); return; }
      setRestaurant(rest);
      const stored = sessionStorage.getItem(`session_${t.id}`);
      if (stored) { router.replace(`/table/${token}/menu?session=${JSON.parse(stored).sessionId}`); return; }
      if (t.status === "OCCUPIED" || t.status === "PAYMENT_PENDING") { setStep("occupied"); return; }
      setStep("enter-name");
      // subscribe to live table status — blocks if another customer takes the table
      unsub = tableService.subscribeOne(rid, t.id, (live) => {
        if (!live) return;
        setTable(live);
        if (live.status === "OCCUPIED" || live.status === "PAYMENT_PENDING") {
          const s = sessionStorage.getItem(`session_${live.id}`);
          if (!s) setStep("occupied");
        }
      });
    }
    init();
    return () => unsub?.();
  }, [token, router]);

  const handleVerifyLocation = async (bypass = false) => {
    if (!name.trim()) return;
    setStep("verifying");
    setLocationStatus("Requesting location permission…");
    const loc = restaurant!.location;
    const result = bypass
      ? { verified: true, distanceMeters: 0, accuracyMeters: 0 }
      : await validateLocation(loc.latitude, loc.longitude, loc.allowedRadiusMeters);

    if (!result.verified) {
      const messages: Record<string, string> = {
        PERMISSION_DENIED: "Location access is required to verify you're at the restaurant. Please enable location and try again.",
        OUTSIDE_RADIUS: `You appear to be ${result.distanceMeters}m away. Please move closer and try again.`,
        POOR_ACCURACY: "We couldn't accurately verify your location. Please enable precise location and try again.",
        POSITION_UNAVAILABLE: "Your location could not be determined. Please check your GPS settings.",
        TIMEOUT: "Location request timed out. Please try again.",
        UNKNOWN: "Location verification failed. Please try again.",
      };
      setStep("verify-location");
      setErrorMsg(messages[result.reason ?? "UNKNOWN"] ?? messages.UNKNOWN);
      return;
    }

    setLocationStatus("Location verified · Setting up your session…");
    const sessionId = await sessionService.create({
      restaurantId,
      tableId: table!.id,
      tableNumber: table!.tableNumber,
      customerName: name.trim(),
      ...(phone.trim() && { customerPhone: phone.trim() }),
      locationVerified: true,
      distanceFromRestaurantMeters: result.distanceMeters,
      locationAccuracyMeters: result.accuracyMeters,
      status: "ACTIVE",
    });
    await tableService.updateStatus(restaurantId, table!.id, "OCCUPIED", sessionId);
    sessionStorage.setItem(`session_${table!.id}`, JSON.stringify({ sessionId, customerName: name.trim() }));
    router.replace(`/table/${token}/menu?session=${sessionId}`);
  };

  if (step === "loading") return <LoadingScreen message="Loading table…" />;

  if (step === "error") return (
    <Shell>
      <div className="flex flex-col items-center text-center gap-4">
        <div className="h-12 w-12 rounded-2xl bg-red-50 flex items-center justify-center">
          <AlertCircle className="h-6 w-6 text-red-400" />
        </div>
        <div>
          <p className="text-gray-800">Invalid QR Code</p>
          <p className="text-sm text-gray-400 mt-1 leading-relaxed max-w-xs">{errorMsg}</p>
        </div>
      </div>
    </Shell>
  );

  if (step === "occupied") return (
    <Shell>
      <div className="flex flex-col items-center text-center gap-4">
        <div className="h-12 w-12 rounded-2xl bg-amber-50 flex items-center justify-center">
          <AlertCircle className="h-6 w-6 text-amber-400" />
        </div>
        <div>
          <p className="text-gray-800">Table Occupied</p>
          <p className="text-sm text-gray-400 mt-1 leading-relaxed max-w-xs">
            This table has an active session. Please ask staff for assistance.
          </p>
        </div>
      </div>
    </Shell>
  );

  const isFormStep = step === "enter-name" || step === "verify-location";
  const isVerifying = step === "verifying";

  /* step progress */
  const STEPS = ["Name", "Location", "Menu"];
  const stepIdx = step === "enter-name" ? 0 : 1;

  return (
    <Shell>
      <div className="w-full space-y-6">

        {/* ── Restaurant identity ── */}
        <div className="flex flex-col items-center text-center gap-3">
          {restaurant?.logoUrl ? (
            <img
              src={restaurant.logoUrl}
              alt={restaurant.name}
              className="h-16 w-16 rounded-2xl object-cover shadow-sm ring-1 ring-black/5"
            />
          ) : (
            <div className="h-16 w-16 rounded-2xl bg-orange-50 border border-orange-100 flex items-center justify-center">
              <UtensilsCrossed className="h-7 w-7 text-orange-400" strokeWidth={1.5} />
            </div>
          )}
          <div>
            <p className="text-lg text-gray-900">{restaurant?.name}</p>
            <div className="flex items-center justify-center gap-1.5 mt-1">
              <span className="text-xs text-gray-400">Table</span>
              <span className="h-1 w-1 rounded-full bg-gray-300" />
              <span className="text-xs text-orange-500">{table?.tableNumber}</span>
            </div>
          </div>
        </div>

        {/* ── Step progress bar ── */}
        <div className="flex items-center gap-2">
          {STEPS.map((label, i) => {
            const done = i < stepIdx;
            const active = i === stepIdx;
            return (
              <div key={label} className="flex items-center gap-2 flex-1 last:flex-none">
                <div className="flex items-center gap-1.5">
                  <div className={[
                    "h-5 w-5 rounded-full flex items-center justify-center text-[10px] transition-all",
                    done   ? "bg-orange-500 text-white" :
                    active ? "bg-orange-500 text-white" :
                             "bg-gray-100 text-gray-400",
                  ].join(" ")}>
                    {done ? <CheckCircle className="h-3 w-3" /> : i + 1}
                  </div>
                  <span className={[
                    "text-xs transition-all",
                    active ? "text-gray-700" : done ? "text-gray-400" : "text-gray-300",
                  ].join(" ")}>{label}</span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={["flex-1 h-px", i < stepIdx ? "bg-orange-300" : "bg-gray-100"].join(" ")} />
                )}
              </div>
            );
          })}
        </div>

        {/* ── Form ── */}
        {isFormStep && (
          <div className="space-y-3">

            {/* Name */}
            <div className="relative">
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none">
                <User className="h-4 w-4" />
              </div>
              <input
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
                onKeyDown={(e) => e.key === "Enter" && name.trim() && handleVerifyLocation(false)}
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-800 text-sm placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition-all"
              />
            </div>

            {/* Phone */}
            <div className="relative">
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none">
                <Phone className="h-4 w-4" />
              </div>
              <input
                placeholder="Phone number (optional)"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                type="tel"
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-800 text-sm placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition-all"
              />
            </div>

            {/* Location error */}
            {step === "verify-location" && errorMsg && (
              <div className="flex gap-2.5 rounded-xl bg-red-50 border border-red-100 px-3.5 py-3">
                <AlertCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
                <p className="text-xs text-red-500 leading-relaxed">{errorMsg}</p>
              </div>
            )}

            {/* Location note */}
            {step === "enter-name" && (
              <div className="flex gap-2.5 rounded-xl bg-gray-50 border border-gray-100 px-3.5 py-3">
                <MapPin className="h-4 w-4 text-gray-400 shrink-0 mt-0.5" />
                <p className="text-xs text-gray-400 leading-relaxed">
                  We'll verify your location to confirm you're at this restaurant.
                </p>
              </div>
            )}

            {/* CTA */}
            <button
              onClick={() => handleVerifyLocation(false)}
              disabled={!name.trim()}
              className="w-full flex items-center justify-between bg-orange-500 hover:bg-orange-600 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm py-3.5 px-5 rounded-xl shadow-sm shadow-orange-200 transition-all"
            >
              <span>{step === "verify-location" ? "Retry & Continue" : "Continue"}</span>
              <ChevronRight className="h-4 w-4 text-white/70" />
            </button>

            {process.env.NODE_ENV === "development" && (
              <button
                onClick={() => handleVerifyLocation(true)}
                disabled={!name.trim()}
                className="w-full text-xs text-gray-300 hover:text-gray-400 py-1 transition-colors"
              >
                Skip location (dev only)
              </button>
            )}
          </div>
        )}

        {/* ── Verifying ── */}
        {isVerifying && (
          <div className="flex flex-col items-center gap-5 py-4 text-center">
            <div className="relative flex items-center justify-center">
              <div className="absolute h-16 w-16 rounded-full bg-orange-100 animate-ping opacity-40" />
              <div className="relative h-11 w-11 rounded-xl bg-orange-500 flex items-center justify-center shadow-sm shadow-orange-200">
                <Navigation className="h-5 w-5 text-white" />
              </div>
            </div>
            <div>
              <p className="text-sm text-gray-700">Verifying location</p>
              <p className="text-xs text-gray-400 mt-1">{locationStatus}</p>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-0.5 overflow-hidden">
              <div className="h-full bg-orange-400 rounded-full animate-pulse w-2/3" />
            </div>
          </div>
        )}

      </div>
    </Shell>
  );
}

/* ── Centered shell ── */
function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-5">
      <div className="w-full max-w-sm bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        {children}
      </div>
    </div>
  );
}
