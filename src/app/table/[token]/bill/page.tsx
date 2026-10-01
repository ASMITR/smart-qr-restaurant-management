"use client";
export const dynamic = "force-dynamic";
import { useEffect, useState } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { tableService } from "@/services/tableService";
import { restaurantService } from "@/services/restaurantService";
import { orderService } from "@/services/orderService";
import { paymentService } from "@/services/paymentService";
import { Restaurant, Order, Payment, PaymentMethod } from "@/types";
import { LoadingScreen } from "@/components/ui/spinner";
import { formatCurrency } from "@/utils";
import { cn } from "@/utils";
import {
  CheckCircle, Star, ExternalLink, UtensilsCrossed,
  Clock, ArrowLeft, Banknote, Smartphone, CreditCard,
  Wifi, ChevronRight, Sparkles, MapPin, Phone, X,
} from "lucide-react";

/* ── payment options ── */
const PAYMENT_OPTIONS: { method: PaymentMethod; label: string; desc: string; icon: React.ElementType; color: string; ring: string }[] = [
  { method: "CASH",   label: "Cash",        desc: "Pay at the counter",      icon: Banknote,    color: "bg-emerald-50 border-emerald-200 text-emerald-700", ring: "ring-emerald-400" },
  { method: "UPI",    label: "UPI",         desc: "GPay, PhonePe, Paytm…",   icon: Smartphone,  color: "bg-violet-50 border-violet-200 text-violet-700",   ring: "ring-violet-400"  },
  { method: "CARD",   label: "Card",        desc: "Debit / Credit card",      icon: CreditCard,  color: "bg-blue-50 border-blue-200 text-blue-700",         ring: "ring-blue-400"    },
  { method: "ONLINE", label: "Online",      desc: "Net banking / Wallet",     icon: Wifi,        color: "bg-orange-50 border-orange-200 text-orange-700",   ring: "ring-orange-400"  },
];

export default function BillPage() {
  const { token } = useParams<{ token: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const sessionId = searchParams.get("session") ?? "";

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [tableNumber, setTableNumber] = useState(0);
  const [customerName, setCustomerName] = useState("");
  const [orders, setOrders] = useState<Order[]>([]);
  const [payment, setPayment] = useState<Payment | null>(null);
  const [loading, setLoading] = useState(true);
  const [paid, setPaid] = useState(false);
  const [restaurantId, setRestaurantId] = useState("");
  const [tableId, setTableId] = useState("");
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    if (!sessionId) { router.replace(`/table/${token}`); return; }
    async function init() {
      const result = await tableService.getByToken(token);
      if (!result) return;
      const { table, restaurantId: rid } = result;
      const rest = await restaurantService.get(rid);
      if (!rest) return;
      setRestaurantId(rid);
      setTableId(table.id);
      setTableNumber(table.tableNumber);
      setRestaurant(rest);
      const stored = sessionStorage.getItem(`session_${table.id}`);
      if (stored) setCustomerName(JSON.parse(stored).customerName);
      setLoading(false);
    }
    init();
  }, [token, sessionId, router]);

  useEffect(() => {
    if (!restaurantId || !sessionId) return;
    return orderService.subscribeToSession(restaurantId, sessionId, setOrders);
  }, [restaurantId, sessionId]);

  useEffect(() => {
    if (!restaurantId || !sessionId) return;
    return paymentService.subscribeBySession(restaurantId, sessionId, (payments) => {
      const p = payments.find((p) => p.status === "PAID");
      if (p) { setPayment(p); setPaid(true); }
      const pending = payments.find((p) => p.status === "PENDING");
      if (pending) setSubmitted(true);
    });
  }, [restaurantId, sessionId]);

  const servedOrders = orders.filter((o) => o.status !== "CANCELLED");
  const subtotal = servedOrders.reduce((s, o) => s + o.subtotal, 0);
  const tax = servedOrders.reduce((s, o) => s + o.tax, 0);
  const serviceCharge = servedOrders.reduce((s, o) => s + o.serviceCharge, 0);
  const discount = payment?.discount ?? 0;
  const total = subtotal + tax + serviceCharge - discount;

  const invoiceNo = `INV-${sessionId.slice(-6).toUpperCase()}`;
  const invoiceDate = (() => {
    try {
      const d = servedOrders[0]?.createdAt?.toDate();
      if (d) return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
    } catch {}
    return new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  })();

  async function handleSubmitPayment() {
    if (!selectedMethod || submitting || !restaurantId) return;
    setSubmitting(true);
    try {
      await paymentService.create(restaurantId, tableId, sessionId, servedOrders, selectedMethod);
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <LoadingScreen message="Loading invoice…" />;

  /* ─────────────────────────────────────────
     PAYMENT SUCCESS SCREEN
  ───────────────────────────────────────── */
  if (paid) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-emerald-50 via-white to-white flex items-center justify-center p-4">
        <div className="w-full max-w-sm space-y-4">

          <div className="bg-white rounded-3xl shadow-xl shadow-emerald-100/50 border border-emerald-100 overflow-hidden">
            {/* Banner */}
            <div className="relative bg-gradient-to-br from-emerald-500 to-teal-500 px-6 pt-10 pb-14 text-center overflow-hidden">
              <div className="absolute -top-8 -right-8 h-32 w-32 rounded-full bg-white/10" />
              <div className="absolute -bottom-6 -left-6 h-24 w-24 rounded-full bg-white/10" />
              <div className="relative">
                <div className="mx-auto h-16 w-16 rounded-2xl bg-white/20 flex items-center justify-center mb-4 shadow-lg">
                  <CheckCircle className="h-8 w-8 text-white" strokeWidth={1.5} />
                </div>
                <p className="text-white text-xl">Payment Confirmed</p>
                <p className="text-emerald-100 text-sm mt-1">Thank you for dining with us 🎉</p>
              </div>
            </div>

            <ScallopEdge />

            <div className="px-6 pb-6 space-y-3">
              <InvoiceRow label="Restaurant" value={restaurant?.name ?? ""} />
              <InvoiceRow label="Table" value={`Table ${tableNumber}`} />
              <InvoiceRow label="Guest" value={customerName} />
              <InvoiceRow label="Invoice" value={invoiceNo} />
              {payment?.method && <InvoiceRow label="Paid via" value={payment.method} />}
              <div className="h-px bg-gray-100" />
              <div className="flex justify-between items-center pt-1">
                <span className="text-sm text-gray-500">Amount Paid</span>
                <span className="text-lg text-emerald-600 tabular-nums">{formatCurrency(payment?.total ?? total)}</span>
              </div>
            </div>
          </div>

          {restaurant?.googleReviewUrl && (
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 text-center space-y-4">
              <div className="flex justify-center gap-0.5">
                {[1,2,3,4,5].map((s) => <Star key={s} className="h-6 w-6 text-amber-400 fill-amber-400" strokeWidth={0} />)}
              </div>
              <div>
                <p className="text-gray-800">Enjoyed your meal?</p>
                <p className="text-sm text-gray-400 mt-1 leading-relaxed">A quick review helps us serve you better.</p>
              </div>
              <a
                href={restaurant.googleReviewUrl}
                target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full bg-[#4285F4] hover:bg-[#3367d6] active:scale-[0.98] text-white text-sm py-3.5 rounded-2xl transition-all"
              >
                <ExternalLink className="h-4 w-4" /> Leave a Google Review
              </a>
            </div>
          )}

          <p className="text-center text-xs text-gray-400 pb-2">Your table will be released shortly 👋</p>
        </div>
      </div>
    );
  }

  /* ─────────────────────────────────────────
     INVOICE + PAYMENT SELECTION
  ───────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-[#f5f5f0] pb-12">

      {/* ── Top bar ── */}
      <div className="bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3 sticky top-0 z-10">
        <button onClick={() => router.back()} className="h-8 w-8 rounded-xl bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors">
          <ArrowLeft className="h-4 w-4 text-gray-600" />
        </button>
        <p className="text-sm text-gray-700">Invoice</p>
        <span className="ml-auto text-xs text-gray-400 tabular-nums">{invoiceNo}</span>
      </div>

      <div className="max-w-sm mx-auto px-4 pt-5 space-y-4">

        {/* ══ INVOICE CARD ══ */}
        <div className="bg-white rounded-3xl shadow-md shadow-gray-200/60 overflow-hidden">

          {/* Invoice header */}
          <div className="relative bg-gradient-to-br from-gray-900 to-gray-800 px-6 pt-8 pb-14 overflow-hidden">
            <div className="absolute -top-8 -right-8 h-32 w-32 rounded-full bg-white/5" />
            <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-black/10 to-transparent" />

            <div className="relative flex items-start justify-between gap-3">
              {/* Logo + name */}
              <div className="flex items-center gap-3 min-w-0">
                {restaurant?.logoUrl ? (
                  <img src={restaurant.logoUrl} alt={restaurant.name} className="h-11 w-11 rounded-xl object-cover ring-2 ring-white/20 shrink-0" />
                ) : (
                  <div className="h-11 w-11 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                    <UtensilsCrossed className="h-5 w-5 text-white/80" strokeWidth={1.5} />
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-white text-[15px] leading-tight truncate">{restaurant?.name}</p>
                  {restaurant?.address && (
                    <p className="text-white/50 text-[11px] mt-0.5 flex items-center gap-1 truncate">
                      <MapPin className="h-2.5 w-2.5 shrink-0" /><span className="truncate">{restaurant.address}</span>
                    </p>
                  )}
                  {restaurant?.phone && (
                    <p className="text-white/50 text-[11px] flex items-center gap-1">
                      <Phone className="h-2.5 w-2.5 shrink-0" />{restaurant.phone}
                    </p>
                  )}
                </div>
              </div>

              {/* Invoice meta */}
              <div className="text-right shrink-0">
                <span className="inline-block bg-orange-500 text-white text-[10px] rounded-lg px-2.5 py-1 tracking-wide">INVOICE</span>
                <p className="text-white/60 text-[11px] mt-2 tabular-nums">{invoiceNo}</p>
                <p className="text-white/40 text-[10px] mt-0.5">{invoiceDate}</p>
              </div>
            </div>

            {/* Billed to */}
            <div className="relative mt-5 pt-4 border-t border-white/10">
              <p className="text-white/40 text-[10px] uppercase tracking-widest mb-1">Billed To</p>
              <p className="text-white/90 text-sm">{customerName}</p>
              <p className="text-white/50 text-xs mt-0.5">Table {tableNumber}</p>
            </div>
          </div>

          {/* Scallop */}
          <ScallopEdge bg="#1f2937" />

          {/* ── Items table ── */}
          <div className="px-5 pt-2 pb-4">
            {/* Table header */}
            <div className="grid grid-cols-12 gap-1 pb-2 border-b border-gray-100">
              <span className="col-span-5 text-[10px] text-gray-400 uppercase tracking-wide">Item</span>
              <span className="col-span-2 text-[10px] text-gray-400 uppercase tracking-wide text-center">Qty</span>
              <span className="col-span-2 text-[10px] text-gray-400 uppercase tracking-wide text-right">Rate</span>
              <span className="col-span-3 text-[10px] text-gray-400 uppercase tracking-wide text-right">Amt</span>
            </div>

            {servedOrders.length === 0 ? (
              <div className="text-center py-8">
                <Clock className="h-7 w-7 mx-auto mb-2 text-gray-200" />
                <p className="text-sm text-gray-400">No orders placed yet</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {servedOrders.flatMap((order) => order.items).map((item, i) => (
                  <div key={i} className="grid grid-cols-12 gap-1 py-2 items-start">
                    <span className="col-span-5 text-xs text-gray-700 leading-snug break-words">{item.name}</span>
                    <span className="col-span-2 text-xs text-gray-500 text-center tabular-nums">{item.quantity}</span>
                    <span className="col-span-2 text-xs text-gray-500 text-right tabular-nums">{formatCurrency(item.priceAtOrderTime)}</span>
                    <span className="col-span-3 text-xs text-gray-700 text-right tabular-nums">{formatCurrency(item.priceAtOrderTime * item.quantity)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Tear line */}
          <TearLine />

          {/* ── Totals ── */}
          <div className="px-5 py-4 space-y-2">
            <InvoiceRow label="Subtotal" value={formatCurrency(subtotal)} />
            {tax > 0 && <InvoiceRow label={`Tax`} value={formatCurrency(tax)} muted />}
            {serviceCharge > 0 && <InvoiceRow label="Service Charge" value={formatCurrency(serviceCharge)} muted />}
            {discount > 0 && (
              <div className="flex justify-between text-sm text-emerald-600">
                <span>Discount</span><span tabular-nums>− {formatCurrency(discount)}</span>
              </div>
            )}
          </div>

          {/* Grand total band */}
          <div className="mx-5 mb-5 rounded-2xl bg-gradient-to-r from-gray-900 to-gray-800 px-5 py-4 flex items-center justify-between">
            <div>
              <p className="text-white/50 text-[10px] uppercase tracking-widest">Total Due</p>
              <p className="text-white text-2xl tabular-nums mt-0.5">{formatCurrency(total)}</p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-white/10 flex items-center justify-center">
              <UtensilsCrossed className="h-5 w-5 text-white/60" strokeWidth={1.5} />
            </div>
          </div>
        </div>

        {/* ══ PAY BUTTON / SUBMITTED STATE ══ */}
        {!submitted ? (
          <button
            onClick={() => setSheetOpen(true)}
            className="w-full flex items-center justify-between bg-gray-900 hover:bg-gray-800 active:scale-[0.98] text-white py-4 px-5 rounded-2xl transition-all shadow-sm"
          >
            <span className="text-sm">Choose Payment Method</span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-white/50 tabular-nums">{formatCurrency(total)}</span>
              <ChevronRight className="h-4 w-4 text-white/50" />
            </div>
          </button>
        ) : (
          <div className="bg-white rounded-2xl border border-amber-100 shadow-sm px-5 py-4 flex gap-3 items-start">
            <div className="h-9 w-9 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
              <Clock className="h-4 w-4 text-amber-500" />
            </div>
            <div>
              <p className="text-sm text-gray-800">Payment request sent</p>
              <p className="text-xs text-gray-400 mt-1 leading-relaxed">Staff will collect your payment shortly.</p>
            </div>
          </div>
        )}

        <div className="flex items-center justify-center gap-1.5 py-1">
          <Sparkles className="h-3 w-3 text-gray-300" />
          <p className="text-xs text-gray-400">Powered by TableFlow</p>
        </div>

      </div>

      {/* ══ PAYMENT BOTTOM SHEET ══ */}
      {sheetOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
            onClick={() => setSheetOpen(false)}
          />

          {/* Sheet */}
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl shadow-2xl animate-in slide-in-from-bottom-4 duration-300 max-w-lg mx-auto">

            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="h-1 w-10 rounded-full bg-gray-200" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
              <div>
                <p className="text-sm text-gray-800">Pay your bill</p>
                <p className="text-xs text-gray-400 mt-0.5">Select how you'd like to pay</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-base text-gray-900 tabular-nums">{formatCurrency(total)}</span>
                <button
                  onClick={() => setSheetOpen(false)}
                  className="h-7 w-7 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
                >
                  <X className="h-3.5 w-3.5 text-gray-500" />
                </button>
              </div>
            </div>

            {/* Options */}
            <div className="px-4 py-3 space-y-2">
              {PAYMENT_OPTIONS.map(({ method, label, desc, icon: Icon, color }) => (
                <button
                  key={method}
                  onClick={() => setSelectedMethod(method)}
                  className={cn(
                    "w-full flex items-center gap-4 rounded-2xl border-2 px-4 py-3.5 text-left transition-all duration-150 active:scale-[0.98]",
                    selectedMethod === method ? cn(color) : "border-gray-100 bg-gray-50 hover:border-gray-200"
                  )}
                >
                  <div className={cn(
                    "h-10 w-10 rounded-xl flex items-center justify-center shrink-0",
                    selectedMethod === method ? "bg-white/70" : "bg-white border border-gray-100"
                  )}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800">{label}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
                  </div>
                  <div className={cn(
                    "h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all",
                    selectedMethod === method ? "border-current bg-current" : "border-gray-200"
                  )}>
                    {selectedMethod === method && (
                      <CheckCircle className="h-3.5 w-3.5 text-white" strokeWidth={2.5} />
                    )}
                  </div>
                </button>
              ))}
            </div>

            {/* Confirm */}
            <div className="px-4 pb-8 pt-2">
              <button
                onClick={async () => { await handleSubmitPayment(); setSheetOpen(false); }}
                disabled={!selectedMethod || submitting}
                className="w-full flex items-center justify-between bg-gray-900 hover:bg-gray-800 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed text-white py-4 px-5 rounded-2xl transition-all"
              >
                <span className="text-sm">
                  {submitting ? "Submitting…" : "Confirm Payment"}
                </span>
                <div className="flex items-center gap-2">
                  {selectedMethod && <span className="text-xs text-white/50">{selectedMethod}</span>}
                  <ChevronRight className="h-4 w-4 text-white/50" />
                </div>
              </button>
            </div>
          </div>
        </>
      )}

    </div>
  );
}

/* ── Scalloped edge ── */
function ScallopEdge({ bg = "#f5f5f0" }: { bg?: string }) {
  return (
    <div
      className="h-5 -mt-px"
      style={{
        background: "white",
        backgroundImage: `radial-gradient(circle at 10px 0px, ${bg} 10px, white 11px)`,
        backgroundSize: "20px 20px",
        backgroundRepeat: "repeat-x",
      }}
    />
  );
}

/* ── Tear / perforation line ── */
function TearLine() {
  return (
    <div className="flex items-center px-5 my-1">
      <div className="h-4 w-4 rounded-full bg-[#f5f5f0] border border-gray-100 -ml-9 shrink-0" />
      <div className="flex-1 border-t-2 border-dashed border-gray-100" />
      <div className="h-4 w-4 rounded-full bg-[#f5f5f0] border border-gray-100 -mr-9 shrink-0" />
    </div>
  );
}

/* ── Row ── */
function InvoiceRow({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex justify-between items-center">
      <span className={cn("text-sm", muted ? "text-gray-400" : "text-gray-500")}>{label}</span>
      <span className={cn("text-sm tabular-nums", muted ? "text-gray-400" : "text-gray-700")}>{value}</span>
    </div>
  );
}
