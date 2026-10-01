"use client";
export const dynamic = "force-dynamic";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { restaurantService } from "@/services/restaurantService";
import { menuService } from "@/services/menuService";
import { Restaurant } from "@/types";
import { Input, Label } from "@/components/ui/input";
import { cn } from "@/utils";
import { toast } from "sonner";
import { Store, MapPin, Star, Percent, Save, CheckCircle, Trash2, Database, RotateCcw, AlertTriangle } from "lucide-react";
import { collection, getDocs, writeBatch } from "firebase/firestore";
import { db } from "@/lib/firebase/config";

const Section = ({ icon: Icon, title, color, children }: {
  icon: React.ElementType; title: string; color: string; children: React.ReactNode;
}) => (
  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
    <div className={cn("flex items-center gap-3 px-6 py-4 border-b border-gray-100")}>
      <div className={cn("h-8 w-8 rounded-xl flex items-center justify-center", color)}>
        <Icon className="h-4 w-4 text-white" />
      </div>
      <h2 className="font-bold text-gray-900 text-sm">{title}</h2>
    </div>
    <div className="px-6 py-5">{children}</div>
  </div>
);

export default function SettingsPage() {
  const { restaurantId } = useAuth();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [form, setForm] = useState({
    name: "", address: "", phone: "", logoUrl: "", googleReviewUrl: "",
    latitude: "", longitude: "", allowedRadiusMeters: "",
    taxPercent: "", serviceChargePercent: "", currency: "INR",
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  useEffect(() => {
    if (!restaurantId) return;
    restaurantService.get(restaurantId).then((r) => {
      if (!r) return;
      setRestaurant(r);
      setForm({
        name: r.name ?? "", address: r.address ?? "", phone: r.phone ?? "",
        logoUrl: r.logoUrl ?? "", googleReviewUrl: r.googleReviewUrl ?? "",
        latitude: String(r.location?.latitude ?? ""),
        longitude: String(r.location?.longitude ?? ""),
        allowedRadiusMeters: String(r.location?.allowedRadiusMeters ?? "100"),
        taxPercent: String(r.settings?.taxPercent ?? "5"),
        serviceChargePercent: String(r.settings?.serviceChargePercent ?? "0"),
        currency: r.settings?.currency ?? "INR",
      });
    });
  }, [restaurantId]);

  const set = (key: keyof typeof form) => ({
    value: form[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [key]: e.target.value }),
  });

  const save = async () => {
    if (!restaurantId) { toast.error("Not authenticated"); return; }
    const lat = parseFloat(form.latitude);
    const lng = parseFloat(form.longitude);
    const radius = parseInt(form.allowedRadiusMeters);
    if (isNaN(lat) || isNaN(lng)) { toast.error("Enter valid latitude and longitude"); return; }
    if (isNaN(radius) || radius <= 0) { toast.error("Enter a valid radius"); return; }
    setSaving(true);
    try {
      const updateData: Parameters<typeof restaurantService.update>[1] = {
        name: form.name, address: form.address, phone: form.phone,
        location: { latitude: lat, longitude: lng, allowedRadiusMeters: radius },
      };
      if (form.logoUrl) updateData.logoUrl = form.logoUrl;
      if (form.googleReviewUrl) updateData.googleReviewUrl = form.googleReviewUrl;
      await restaurantService.update(restaurantId, {
        ...updateData,
        settings: {
          taxPercent: parseFloat(form.taxPercent) || 0,
          serviceChargePercent: parseFloat(form.serviceChargePercent) || 0,
          currency: form.currency,
          isOpen: restaurant?.settings?.isOpen ?? true,
        },
      });
      toast.success("Settings saved");
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error("Settings save error:", err);
      toast.error(err instanceof Error ? err.message : "Failed to save settings");
    } finally { setSaving(false); }
  };

  const clearCache = () => {
    if (!restaurantId) return;
    setClearing(true);
    restaurantService.clearCache(restaurantId);
    menuService.clearCache(restaurantId);
    Object.keys(sessionStorage)
      .filter((k) => k.startsWith("table_"))
      .forEach((k) => sessionStorage.removeItem(k));
    toast.success("Cache cleared — customers will fetch fresh data on next load");
    setTimeout(() => setClearing(false), 1500);
  };

  const resetDemoData = async () => {
    if (!restaurantId) return;
    setResetting(true);
    setConfirmReset(false);
    try {
      for (const col of ["orders", "sessions", "payments", "staffRequests", "auditLogs"]) {
        const snap = await getDocs(collection(db, "restaurants", restaurantId, col));
        if (!snap.empty) {
          const batch = writeBatch(db);
          snap.docs.forEach((d) => batch.delete(d.ref));
          await batch.commit();
        }
      }
      const tables = await getDocs(collection(db, "restaurants", restaurantId, "tables"));
      if (!tables.empty) {
        const batch = writeBatch(db);
        tables.docs.forEach((t) => batch.update(t.ref, { status: "AVAILABLE", activeSessionId: null }));
        await batch.commit();
      }
      restaurantService.clearCache(restaurantId);
      menuService.clearCache(restaurantId);
      Object.keys(sessionStorage)
        .filter((k) => k.startsWith("table_") || k.startsWith("session_"))
        .forEach((k) => sessionStorage.removeItem(k));
      toast.success("All data cleared. Tables reset to available.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Reset failed");
    } finally { setResetting(false); }
  };

  return (
    <div className="space-y-5 max-w-2xl mx-auto pb-24">
      <div>
        <h1 className="text-2xl font-black text-gray-900 tracking-tight">Settings</h1>
        <p className="text-gray-400 text-sm mt-0.5">Configure your restaurant</p>
      </div>

      <Section icon={Store} title="General" color="bg-gradient-to-br from-orange-500 to-orange-600">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Label>Restaurant Name</Label>
            <Input {...set("name")} className="mt-1" placeholder="My Restaurant" />
          </div>
          <div className="col-span-2">
            <Label>Address</Label>
            <Input {...set("address")} className="mt-1" placeholder="123 Main St, City" />
          </div>
          <div>
            <Label>Phone</Label>
            <Input {...set("phone")} className="mt-1" type="tel" placeholder="+91 98765 43210" />
          </div>
          <div>
            <Label>Logo URL</Label>
            <Input {...set("logoUrl")} className="mt-1" placeholder="https://..." />
          </div>
        </div>
      </Section>

      <Section icon={Star} title="Google Review" color="bg-gradient-to-br from-yellow-400 to-amber-500">
        <div>
          <Label>Google Review URL</Label>
          <Input {...set("googleReviewUrl")} className="mt-1" placeholder="https://g.page/r/..." />
          <p className="text-xs text-gray-400 mt-1.5">Customers are directed here after payment is confirmed</p>
        </div>
      </Section>

      <Section icon={MapPin} title="Location & Geofence" color="bg-gradient-to-br from-blue-500 to-indigo-500">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Latitude</Label>
            <Input {...set("latitude")} className="mt-1" placeholder="18.5204" />
          </div>
          <div>
            <Label>Longitude</Label>
            <Input {...set("longitude")} className="mt-1" placeholder="73.8567" />
          </div>
          <div className="col-span-2">
            <Label>Allowed Radius (meters)</Label>
            <Input {...set("allowedRadiusMeters")} className="mt-1" type="number" placeholder="100" />
            <p className="text-xs text-gray-400 mt-1.5">Customers must be within this radius to place orders</p>
          </div>
        </div>
      </Section>

      <Section icon={Percent} title="Taxes & Charges" color="bg-gradient-to-br from-emerald-500 to-teal-500">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <Label>Tax (%)</Label>
            <Input {...set("taxPercent")} className="mt-1" type="number" placeholder="5" />
          </div>
          <div>
            <Label>Service Charge (%)</Label>
            <Input {...set("serviceChargePercent")} className="mt-1" type="number" placeholder="0" />
          </div>
          <div>
            <Label>Currency</Label>
            <Input {...set("currency")} className="mt-1" placeholder="INR" />
          </div>
        </div>
      </Section>

      <Section icon={Database} title="Cache & Data Management" color="bg-gradient-to-br from-violet-500 to-purple-600">
        <div className="space-y-4">
          {/* Clear Cache */}
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm text-gray-700 font-medium">Clear server-side cache</p>
              <p className="text-xs text-gray-400 mt-0.5">
                Clears in-memory restaurant &amp; menu cache. Customers fetch fresh data on next load.
              </p>
            </div>
            <button
              onClick={clearCache}
              disabled={clearing}
              className="shrink-0 flex items-center gap-2 bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 font-bold text-sm px-4 py-2.5 rounded-xl transition-all disabled:opacity-60"
            >
              {clearing ? <CheckCircle className="h-4 w-4 text-emerald-500" /> : <Trash2 className="h-4 w-4" />}
              {clearing ? "Cleared!" : "Clear Cache"}
            </button>
          </div>

          <div className="h-px bg-gray-100" />

          {/* Reset Data */}
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm text-gray-700 font-medium">Reset all data</p>
              <p className="text-xs text-gray-400 mt-0.5">
                Deletes all orders, sessions, payments &amp; staff requests. Resets tables to available. Keeps menu &amp; settings.
              </p>
            </div>
            {!confirmReset ? (
              <button
                onClick={() => setConfirmReset(true)}
                disabled={resetting}
                className="shrink-0 flex items-center gap-2 bg-orange-50 hover:bg-orange-100 border border-orange-200 text-orange-600 font-bold text-sm px-4 py-2.5 rounded-xl transition-all disabled:opacity-60"
              >
                <RotateCcw className="h-4 w-4" /> Reset Data
              </button>
            ) : (
              <div className="flex items-center gap-2 shrink-0">
                <span className="flex items-center gap-1 text-xs text-orange-600">
                  <AlertTriangle className="h-3.5 w-3.5" /> Sure?
                </span>
                <button
                  onClick={resetDemoData}
                  disabled={resetting}
                  className="flex items-center gap-1.5 bg-red-500 hover:bg-red-600 text-white font-bold text-sm px-3 py-2 rounded-xl transition-all disabled:opacity-60"
                >
                  {resetting ? <RotateCcw className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                  {resetting ? "Resetting…" : "Yes, Reset"}
                </button>
                <button
                  onClick={() => setConfirmReset(false)}
                  className="text-xs text-gray-400 hover:text-gray-600 px-2 py-2"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      </Section>

      {/* Sticky save bar */}
      <div className="fixed bottom-0 left-0 right-0 lg:left-60 bg-white border-t border-gray-100 px-6 py-4 flex items-center justify-between shadow-lg z-10">
        <p className="text-sm text-gray-400">Changes are saved to Firestore immediately</p>
        <button
          onClick={save}
          disabled={saving}
          className={cn(
            "flex items-center gap-2 font-bold text-sm px-6 py-2.5 rounded-xl shadow-sm transition-all disabled:opacity-60",
            saved
              ? "bg-emerald-500 text-white shadow-emerald-200"
              : "bg-orange-500 hover:bg-orange-600 text-white shadow-orange-200"
          )}
        >
          {saved ? <CheckCircle className="h-4 w-4" /> : <Save className="h-4 w-4" />}
          {saving ? "Saving…" : saved ? "Saved!" : "Save Settings"}
        </button>
      </div>
    </div>
  );
}
