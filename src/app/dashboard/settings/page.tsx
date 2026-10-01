"use client";
export const dynamic = "force-dynamic";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { restaurantService } from "@/services/restaurantService";
import { Restaurant } from "@/types";
import { Input, Label } from "@/components/ui/input";
import { cn } from "@/utils";
import { toast } from "sonner";
import { Store, MapPin, Star, Percent, Save, CheckCircle } from "lucide-react";

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
    if (!restaurantId) return;
    setSaving(true);
    try {
      await restaurantService.update(restaurantId, {
        name: form.name, address: form.address, phone: form.phone,
        logoUrl: form.logoUrl || undefined,
        googleReviewUrl: form.googleReviewUrl || undefined,
        location: {
          latitude: parseFloat(form.latitude),
          longitude: parseFloat(form.longitude),
          allowedRadiusMeters: parseInt(form.allowedRadiusMeters),
        },
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
    } catch { toast.error("Failed to save settings"); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-5 max-w-2xl mx-auto pb-24">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-gray-900 tracking-tight">Settings</h1>
        <p className="text-gray-400 text-sm mt-0.5">Configure your restaurant</p>
      </div>

      {/* General */}
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

      {/* Google Review */}
      <Section icon={Star} title="Google Review" color="bg-gradient-to-br from-yellow-400 to-amber-500">
        <div>
          <Label>Google Review URL</Label>
          <Input {...set("googleReviewUrl")} className="mt-1" placeholder="https://g.page/r/..." />
          <p className="text-xs text-gray-400 mt-1.5">Customers are directed here after payment is confirmed</p>
        </div>
      </Section>

      {/* Location */}
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

      {/* Taxes */}
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
