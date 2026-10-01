"use client";
export const dynamic = "force-dynamic";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { orderService } from "@/services/orderService";
import { Order, OrderStatus } from "@/types";
import { formatTime } from "@/utils";
import { ChefHat, Clock, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/utils";

const KITCHEN_STATUSES: OrderStatus[] = ["PLACED", "ACCEPTED", "PREPARING", "READY"];

const nextAction: Record<string, { label: string; next: OrderStatus; color: string }> = {
  PLACED:    { label: "Accept Order",   next: "ACCEPTED",  color: "bg-blue-500 hover:bg-blue-600" },
  ACCEPTED:  { label: "Start Preparing", next: "PREPARING", color: "bg-yellow-500 hover:bg-yellow-600" },
  PREPARING: { label: "Mark Ready",     next: "READY",     color: "bg-green-500 hover:bg-green-600" },
  READY:     { label: "Mark Served",    next: "SERVED",    color: "bg-gray-500 hover:bg-gray-600" },
};

const cardColors: Record<string, string> = {
  PLACED:    "border-blue-500 bg-gray-900 shadow-blue-500/20",
  ACCEPTED:  "border-yellow-500 bg-gray-900 shadow-yellow-500/20",
  PREPARING: "border-orange-500 bg-gray-900 shadow-orange-500/20",
  READY:     "border-green-500 bg-gray-900 shadow-green-500/20",
};

const statusLabels: Record<string, string> = {
  PLACED: "NEW ORDER", ACCEPTED: "ACCEPTED", PREPARING: "PREPARING", READY: "READY ✓",
};

export default function KitchenPage() {
  const { restaurantId } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    if (!restaurantId) return;
    return orderService.subscribeActive(restaurantId, setOrders);
  }, [restaurantId]);

  const updateStatus = async (order: Order, status: OrderStatus) => {
    if (!restaurantId) return;
    try {
      await orderService.updateStatus(restaurantId, order.id, status);
    } catch {
      toast.error("Failed to update order");
    }
  };

  const kitchenOrders = orders.filter((o) => KITCHEN_STATUSES.includes(o.status));

  // Group by status for column view
  const columns: { status: OrderStatus; label: string }[] = [
    { status: "PLACED", label: "New Orders" },
    { status: "ACCEPTED", label: "Accepted" },
    { status: "PREPARING", label: "Preparing" },
    { status: "READY", label: "Ready" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ChefHat className="h-7 w-7 text-orange-400" />
          <h1 className="text-2xl font-bold text-white">Kitchen Display</h1>
        </div>
        <div className="flex items-center gap-2 bg-gray-800 rounded-xl px-3 py-2">
          <div className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-sm text-gray-300">{kitchenOrders.length} active</span>
        </div>
      </div>

      {kitchenOrders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-gray-500">
          <CheckCircle className="h-16 w-16 mb-4 text-green-600" />
          <p className="text-xl font-medium">All caught up!</p>
          <p className="text-sm mt-1">No pending orders</p>
        </div>
      ) : (
        /* Mobile: stacked cards | Desktop: kanban columns */
        <>
          {/* Mobile view */}
          <div className="lg:hidden space-y-4">
            {kitchenOrders.map((order) => (
              <KitchenCard key={order.id} order={order} onUpdate={updateStatus} />
            ))}
          </div>

          {/* Desktop kanban */}
          <div className="hidden lg:grid grid-cols-4 gap-4">
            {columns.map(({ status, label }) => {
              const colOrders = kitchenOrders.filter((o) => o.status === status);
              return (
                <div key={status} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h2 className="font-semibold text-gray-300 text-sm uppercase tracking-wide">{label}</h2>
                    <span className="bg-gray-700 text-gray-300 text-xs rounded-full px-2 py-0.5">{colOrders.length}</span>
                  </div>
                  {colOrders.map((order) => (
                    <KitchenCard key={order.id} order={order} onUpdate={updateStatus} compact />
                  ))}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function KitchenCard({
  order, onUpdate, compact = false,
}: {
  order: Order;
  onUpdate: (order: Order, status: OrderStatus) => void;
  compact?: boolean;
}) {
  const action = nextAction[order.status];
  const elapsed = order.createdAt?.toDate
    ? Math.floor((Date.now() - order.createdAt.toDate().getTime()) / 60000)
    : 0;

  return (
    <div className={cn("rounded-2xl border-2 p-4 space-y-3 shadow-lg", cardColors[order.status] ?? "border-gray-600 bg-gray-900")}>
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-lg font-black text-white">TABLE {order.tableNumber}</span>
            <span className={cn(
              "text-xs font-bold px-2 py-0.5 rounded-full",
              order.status === "PLACED" ? "bg-blue-500 text-white animate-pulse" :
              order.status === "PREPARING" ? "bg-orange-500 text-white" :
              order.status === "READY" ? "bg-green-500 text-white" : "bg-yellow-500 text-white"
            )}>
              {statusLabels[order.status]}
            </span>
          </div>
          <p className="text-gray-400 text-sm mt-0.5">{order.customerName}</p>
        </div>
        <div className="flex items-center gap-1 text-gray-400 text-xs">
          <Clock className="h-3.5 w-3.5" />
          <span>{elapsed}m ago</span>
        </div>
      </div>

      {/* Items */}
      <div className="space-y-1.5 border-t border-gray-700 pt-3">
        {order.items.map((item) => (
          <div key={item.id} className="flex items-center gap-3">
            <span className={cn(
              "h-7 w-7 rounded-lg flex items-center justify-center text-sm font-black shrink-0",
              "bg-orange-500 text-white"
            )}>
              {item.quantity}
            </span>
            <span className="text-white font-medium">{item.name}</span>
            {item.notes && <span className="text-xs text-yellow-400 italic">({item.notes})</span>}
          </div>
        ))}
      </div>

      {/* Action */}
      {action && (
        <button
          onClick={() => onUpdate(order, action.next)}
          className={cn(
            "w-full rounded-xl py-3 text-white font-bold text-sm transition-colors",
            action.color
          )}
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
