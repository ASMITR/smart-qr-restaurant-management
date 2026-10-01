"use client";
export const dynamic = "force-dynamic";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { tableService } from "@/services/tableService";
import { orderService, sessionService } from "@/services/orderService";
import { paymentService } from "@/services/paymentService";
import { restaurantService } from "@/services/restaurantService";
import { Table, Order, Restaurant } from "@/types";
import { Modal } from "@/components/ui/modal";
import { StatusBadge } from "@/components/ui/badge";
import { formatCurrency } from "@/utils";
import { cn } from "@/utils";
import { Receipt, CheckCircle, Users, Banknote, CreditCard, Smartphone, Globe } from "lucide-react";
import { toast } from "sonner";

const PAYMENT_METHODS = [
  { key: "CASH",   label: "Cash",   icon: Banknote },
  { key: "UPI",    label: "UPI",    icon: Smartphone },
  { key: "CARD",   label: "Card",   icon: CreditCard },
  { key: "ONLINE", label: "Online", icon: Globe },
] as const;

export default function BillingPage() {
  const { restaurantId } = useAuth();
  const [tables, setTables] = useState<Table[]>([]);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [sessionOrders, setSessionOrders] = useState<Order[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "UPI" | "CARD" | "ONLINE">("CASH");
  const [discount, setDiscount] = useState(0);
  const [confirming, setConfirming] = useState(false);
  const [showBill, setShowBill] = useState(false);
  const [pendingPaymentId, setPendingPaymentId] = useState<string | null>(null);
  const [customerChosenMethod, setCustomerChosenMethod] = useState<"CASH" | "UPI" | "CARD" | "ONLINE" | null>(null);

  useEffect(() => {
    if (!restaurantId) return;
    const unsub = tableService.subscribe(restaurantId, setTables);
    restaurantService.get(restaurantId).then(setRestaurant);
    return unsub;
  }, [restaurantId]);

  const openBill = async (table: Table) => {
    if (!table.activeSessionId || !restaurantId) return;
    setSelectedTable(table);
    setPendingPaymentId(null);
    setCustomerChosenMethod(null);
    const orders = await orderService.getBySession(restaurantId, table.activeSessionId);
    setSessionOrders(orders.filter((o) => o.status !== "CANCELLED"));
    setDiscount(0);
    // load any pending payment the customer already submitted
    const payments = await paymentService.getBySession(restaurantId, table.activeSessionId);
    const pending = payments.find((p) => p.status === "PENDING");
    if (pending) {
      setPendingPaymentId(pending.id);
      setCustomerChosenMethod(pending.method as "CASH" | "UPI" | "CARD" | "ONLINE");
      setPaymentMethod(pending.method as "CASH" | "UPI" | "CARD" | "ONLINE");
      setDiscount(pending.discount ?? 0);
    } else {
      setPaymentMethod("CASH");
    }
    setShowBill(true);
  };

  const subtotal = sessionOrders.reduce((s, o) => s + o.subtotal, 0);
  const tax = sessionOrders.reduce((s, o) => s + o.tax, 0);
  const serviceCharge = sessionOrders.reduce((s, o) => s + o.serviceCharge, 0);
  const total = subtotal + tax + serviceCharge - discount;

  const confirmPayment = async () => {
    if (!restaurantId || !selectedTable?.activeSessionId) return;
    setConfirming(true);
    try {
      let paymentId = pendingPaymentId;
      // if manager changed discount or method, create a fresh payment record
      const originalTotal = subtotal + tax + serviceCharge - (pendingPaymentId ? discount : 0);
      const discountChanged = pendingPaymentId && Math.abs(originalTotal - total) > 0.01;
      if (!paymentId || discountChanged) {
        paymentId = await paymentService.create(restaurantId, selectedTable.id, selectedTable.activeSessionId, sessionOrders, paymentMethod, discount);
      }
      await paymentService.confirm(restaurantId, paymentId, paymentMethod);
      for (const order of sessionOrders) await orderService.updateStatus(restaurantId, order.id, "COMPLETED");
      await sessionService.end(restaurantId, selectedTable.activeSessionId);
      await tableService.updateStatus(restaurantId, selectedTable.id, "AVAILABLE", null);
      toast.success("Payment confirmed! Table released.");
      setShowBill(false); setSelectedTable(null);
    } catch { toast.error("Failed to confirm payment"); }
    finally { setConfirming(false); }
  };

  const occupiedTables = tables.filter((t) => ["OCCUPIED", "PAYMENT_PENDING"].includes(t.status));

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-gray-900 tracking-tight">Billing</h1>
        <p className="text-gray-400 text-sm mt-0.5">Generate bills and confirm payments</p>
      </div>

      {occupiedTables.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-dashed border-gray-200">
          <Receipt className="h-10 w-10 text-gray-200 mb-3" />
          <p className="font-semibold text-gray-400">No occupied tables</p>
          <p className="text-sm text-gray-300 mt-1">Tables will appear here when occupied</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {occupiedTables.map((table) => (
            <div key={table.id} className={cn(
              "bg-white rounded-2xl border-2 shadow-sm hover:shadow-md transition-shadow p-5 flex flex-col gap-4",
              table.status === "PAYMENT_PENDING" ? "border-red-200" : "border-orange-200"
            )}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "h-12 w-12 rounded-xl flex items-center justify-center font-black text-xl border-2",
                    table.status === "PAYMENT_PENDING" ? "bg-red-50 border-red-200 text-red-700" : "bg-orange-50 border-orange-200 text-orange-700"
                  )}>
                    {table.tableNumber}
                  </div>
                  <div>
                    <p className="font-bold text-gray-900">Table {table.tableNumber}</p>
                    {table.capacity && (
                      <p className="text-xs text-gray-400 flex items-center gap-1">
                        <Users className="h-3 w-3" /> {table.capacity} seats
                      </p>
                    )}
                  </div>
                </div>
                <StatusBadge status={table.status} />
              </div>

              <button
                onClick={() => openBill(table)}
                disabled={!table.activeSessionId}
                className="w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-bold text-sm py-2.5 rounded-xl shadow-sm shadow-orange-200 transition-all"
              >
                <Receipt className="h-4 w-4" /> Generate Bill
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Bill Modal */}
      <Modal open={showBill} onClose={() => setShowBill(false)} title={`Bill — Table ${selectedTable?.tableNumber}`} className="max-w-md">
        <div className="space-y-5">
          {/* Restaurant header */}
          <div className="text-center pb-4 border-b border-dashed border-gray-200">
            <p className="font-black text-gray-900 text-lg">{restaurant?.name}</p>
            <p className="text-xs text-gray-400 mt-0.5">{restaurant?.address}</p>
          </div>

          {/* Combined items from all orders */}
          <div className="space-y-1 max-h-52 overflow-y-auto">
            <div className="grid grid-cols-12 gap-1 pb-1.5 border-b border-gray-100 text-[10px] text-gray-400 uppercase tracking-wide">
              <span className="col-span-6">Item</span>
              <span className="col-span-2 text-center">Qty</span>
              <span className="col-span-4 text-right">Amount</span>
            </div>
            {sessionOrders.flatMap((o) => o.items).map((item, i) => (
              <div key={i} className="grid grid-cols-12 gap-1 py-1.5 items-center">
                <span className="col-span-6 text-sm text-gray-700 truncate">{item.name}</span>
                <span className="col-span-2 text-sm text-gray-400 text-center">×{item.quantity}</span>
                <span className="col-span-4 text-sm text-gray-900 text-right tabular-nums">{formatCurrency(item.priceAtOrderTime * item.quantity)}</span>
              </div>
            ))}
            {sessionOrders.length > 1 && (
              <p className="text-[10px] text-gray-300 pt-1 border-t border-gray-50">{sessionOrders.length} orders combined</p>
            )}
          </div>

          {/* Totals */}
          <div className="bg-gray-50 rounded-2xl p-4 space-y-2">
            <div className="flex justify-between text-sm text-gray-600"><span>Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
            {tax > 0 && <div className="flex justify-between text-sm text-gray-600"><span>Tax</span><span>{formatCurrency(tax)}</span></div>}
            {serviceCharge > 0 && <div className="flex justify-between text-sm text-gray-600"><span>Service Charge</span><span>{formatCurrency(serviceCharge)}</span></div>}
            <div className="flex items-center justify-between text-sm text-gray-600">
              <span>Discount</span>
              <div className="flex items-center gap-1">
                <span className="text-gray-400">₹</span>
                <input
                  type="number"
                  value={discount}
                  onChange={(e) => setDiscount(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="w-20 text-right border border-gray-200 rounded-lg px-2 py-1 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
              </div>
            </div>
            <div className="flex justify-between font-black text-xl text-gray-900 pt-2 border-t border-gray-200">
              <span>Total</span><span className="text-orange-600">{formatCurrency(total)}</span>
            </div>
          </div>

          {/* Payment Method */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-700">Payment Method</p>
              {customerChosenMethod && (
                <span className="flex items-center gap-1.5 text-[11px] bg-violet-50 text-violet-600 border border-violet-200 rounded-full px-2.5 py-1">
                  <Smartphone className="h-3 w-3" />
                  Customer chose · {customerChosenMethod}
                </span>
              )}
            </div>
            <div className="grid grid-cols-4 gap-2">
              {PAYMENT_METHODS.map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setPaymentMethod(key)}
                  className={cn(
                    "relative flex flex-col items-center gap-1.5 rounded-xl border py-3 text-xs transition-all",
                    paymentMethod === key
                      ? "border-orange-500 bg-orange-50 text-orange-600 shadow-sm"
                      : "border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                  {customerChosenMethod === key && (
                    <span className="absolute -top-1.5 -right-1.5 h-3.5 w-3.5 rounded-full bg-violet-500 border-2 border-white" />
                  )}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={confirmPayment}
            disabled={confirming}
            className="w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 text-white font-black py-3.5 rounded-2xl shadow-sm shadow-emerald-200 transition-all text-sm"
          >
            <CheckCircle className="h-5 w-5" />
            {confirming ? "Processing…" : `Confirm Payment · ${formatCurrency(total)}`}
          </button>
        </div>
      </Modal>
    </div>
  );
}
