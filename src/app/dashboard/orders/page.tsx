"use client";
export const dynamic = "force-dynamic";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { orderService } from "@/services/orderService";
import { Order, OrderStatus } from "@/types";
import { StatusBadge } from "@/components/ui/badge";
import { formatCurrency, formatTime } from "@/utils";
import { cn } from "@/utils";
import { ShoppingBag, Clock, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";

const FILTERS = [
  { key: "active",    label: "Active",    statuses: ["PLACED", "ACCEPTED", "PREPARING", "READY", "SERVED"] },
  { key: "PLACED",    label: "New",       statuses: ["PLACED"] },
  { key: "PREPARING", label: "Preparing", statuses: ["ACCEPTED", "PREPARING"] },
  { key: "READY",     label: "Ready",     statuses: ["READY"] },
  { key: "completed", label: "Done",      statuses: ["COMPLETED", "SERVED"] },
  { key: "all",       label: "All",       statuses: [] },
] as const;

const NEXT: Partial<Record<OrderStatus, { label: string; status: OrderStatus; color: string }>> = {
  PLACED:    { label: "Accept",     status: "ACCEPTED",  color: "bg-blue-500 hover:bg-blue-600 text-white" },
  ACCEPTED:  { label: "Preparing",  status: "PREPARING", color: "bg-amber-500 hover:bg-amber-600 text-white" },
  PREPARING: { label: "Mark Ready", status: "READY",     color: "bg-violet-500 hover:bg-violet-600 text-white" },
  READY:     { label: "Served ✓",   status: "SERVED",    color: "bg-emerald-500 hover:bg-emerald-600 text-white" },
  SERVED:    { label: "Complete",   status: "COMPLETED", color: "bg-gray-700 hover:bg-gray-800 text-white" },
};

const STATUS_LEFT: Record<string, string> = {
  PLACED: "border-l-blue-400", ACCEPTED: "border-l-orange-400",
  PREPARING: "border-l-amber-400", READY: "border-l-violet-400",
  SERVED: "border-l-emerald-400", COMPLETED: "border-l-gray-300", CANCELLED: "border-l-red-300",
};

export default function OrdersPage() {
  const { restaurantId } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [filter, setFilter] = useState<string>("active");
  const [updating, setUpdating] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!restaurantId) return;
    return orderService.subscribeAll(restaurantId, setOrders);
  }, [restaurantId]);

  const getFiltered = () => {
    const f = FILTERS.find((x) => x.key === filter);
    if (!f || f.statuses.length === 0) return orders;
    return orders.filter((o) => (f.statuses as readonly string[]).includes(o.status));
  };

  const displayed = getFiltered();

  const updateStatus = async (order: Order, status: OrderStatus) => {
    if (!restaurantId) return;
    setUpdating((p) => ({ ...p, [order.id]: true }));
    try {
      await orderService.updateStatus(restaurantId, order.id, status);
      toast.success(`Marked as ${status}`);
    } catch { toast.error("Failed to update order"); }
    finally { setUpdating((p) => ({ ...p, [order.id]: false })); }
  };

  const filterCounts = Object.fromEntries(
    FILTERS.map((f) => [
      f.key,
      f.statuses.length === 0 ? orders.length : orders.filter((o) => (f.statuses as readonly string[]).includes(o.status)).length,
    ])
  );

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Orders</h1>
          <p className="text-gray-400 text-sm mt-0.5">{displayed.length} orders shown</p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={cn(
              "shrink-0 flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold border transition-all",
              filter === f.key
                ? "bg-gray-900 text-white border-gray-900"
                : "bg-white text-gray-500 border-gray-200 hover:border-gray-300"
            )}
          >
            {f.label}
            <span className={cn("rounded-full px-1.5 py-0.5 text-[10px] font-bold", filter === f.key ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500")}>
              {filterCounts[f.key]}
            </span>
          </button>
        ))}
      </div>

      {/* Orders list */}
      {displayed.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-dashed border-gray-200">
          <ShoppingBag className="h-10 w-10 text-gray-200 mb-3" />
          <p className="font-semibold text-gray-400">No orders here</p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayed.map((order) => {
            const next = NEXT[order.status];
            const isDone = ["COMPLETED", "CANCELLED"].includes(order.status);
            return (
              <div
                key={order.id}
                className={cn(
                  "bg-white rounded-2xl border border-gray-100 border-l-4 shadow-sm hover:shadow-md transition-shadow overflow-hidden",
                  STATUS_LEFT[order.status] ?? "border-l-gray-200"
                )}
              >
                <div className="p-4 flex items-start gap-4">
                  {/* Table badge */}
                  <div className="h-11 w-11 rounded-xl bg-gray-900 text-white flex items-center justify-center font-black text-base shrink-0">
                    {order.tableNumber}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-gray-900 text-sm">{order.customerName}</span>
                      <StatusBadge status={order.status} />
                      <span className="text-xs text-gray-400 flex items-center gap-1 ml-auto">
                        <Clock className="h-3 w-3" />{formatTime(order.createdAt)}
                      </span>
                    </div>

                    {/* Items */}
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {order.items.map((item) => (
                        <span key={item.id} className="text-xs bg-gray-50 border border-gray-100 rounded-lg px-2 py-1 text-gray-600">
                          {item.name} <span className="font-bold">×{item.quantity}</span>
                        </span>
                      ))}
                    </div>

                    {/* Total + actions */}
                    <div className="flex items-center gap-2 mt-3">
                      <span className="font-black text-gray-900">{formatCurrency(order.total)}</span>
                      <div className="ml-auto flex items-center gap-2">
                        {!isDone && (
                          <button
                            onClick={() => updateStatus(order, "CANCELLED")}
                            disabled={updating[order.id]}
                            className="flex items-center gap-1 text-xs font-semibold text-red-500 bg-red-50 hover:bg-red-100 border border-red-100 px-3 py-1.5 rounded-xl transition-all disabled:opacity-50"
                          >
                            <XCircle className="h-3.5 w-3.5" /> Cancel
                          </button>
                        )}
                        {next && (
                          <button
                            onClick={() => updateStatus(order, next.status)}
                            disabled={updating[order.id]}
                            className={cn(
                              "flex items-center gap-1.5 text-xs font-bold px-4 py-1.5 rounded-xl shadow-sm transition-all disabled:opacity-50",
                              next.color
                            )}
                          >
                            {updating[order.id] ? "…" : next.label}
                          </button>
                        )}
                        {isDone && (
                          <span className="flex items-center gap-1 text-xs text-gray-400">
                            <CheckCircle className="h-3.5 w-3.5 text-emerald-400" />
                            {order.status === "COMPLETED" ? "Completed" : "Cancelled"}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
