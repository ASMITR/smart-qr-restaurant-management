"use client";
export const dynamic = "force-dynamic";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { orderService } from "@/services/orderService";
import { Order } from "@/types";
import { formatCurrency } from "@/utils";
import { cn } from "@/utils";
import { TrendingUp, ShoppingBag, Users, CreditCard, Award } from "lucide-react";

function getStartOf(unit: "day" | "week" | "month"): Date {
  const d = new Date();
  if (unit === "day") { d.setHours(0, 0, 0, 0); return d; }
  if (unit === "week") { d.setDate(d.getDate() - d.getDay()); d.setHours(0, 0, 0, 0); return d; }
  d.setDate(1); d.setHours(0, 0, 0, 0); return d;
}

const PERIODS = [
  { key: "day",   label: "Today" },
  { key: "week",  label: "This Week" },
  { key: "month", label: "This Month" },
] as const;

export default function ReportsPage() {
  const { restaurantId } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [period, setPeriod] = useState<"day" | "week" | "month">("day");

  useEffect(() => {
    if (!restaurantId) return;
    return orderService.subscribeAll(restaurantId, setOrders);
  }, [restaurantId]);

  const since = getStartOf(period);
  const completed = orders.filter((o) => o.status === "COMPLETED");
  const periodCompleted = completed.filter((o) => (o.createdAt?.toDate?.() ?? new Date(0)) >= since);
  const periodOrders = orders.filter((o) => (o.createdAt?.toDate?.() ?? new Date(0)) >= since);

  const revenue = periodCompleted.reduce((s, o) => s + o.total, 0);
  const avgOrderValue = periodCompleted.length ? revenue / periodCompleted.length : 0;
  const cancelledCount = periodOrders.filter((o) => o.status === "CANCELLED").length;

  // Top items from period completed orders
  const itemMap: Record<string, { name: string; qty: number; revenue: number }> = {};
  for (const order of periodCompleted) {
    for (const item of order.items) {
      if (!itemMap[item.menuItemId]) itemMap[item.menuItemId] = { name: item.name, qty: 0, revenue: 0 };
      itemMap[item.menuItemId].qty += item.quantity;
      itemMap[item.menuItemId].revenue += item.priceAtOrderTime * item.quantity;
    }
  }
  const topItems = Object.values(itemMap).sort((a, b) => b.qty - a.qty).slice(0, 8);
  const maxQty = topItems[0]?.qty || 1;

  const stats = [
    { label: "Revenue",        value: formatCurrency(revenue),          icon: TrendingUp, gradient: "from-emerald-500 to-teal-500",   border: "border-emerald-100", text: "text-emerald-700" },
    { label: "Orders",         value: periodOrders.length,              icon: ShoppingBag, gradient: "from-blue-500 to-indigo-500",   border: "border-blue-100",    text: "text-blue-700" },
    { label: "Completed",      value: periodCompleted.length,           icon: Users,       gradient: "from-violet-500 to-purple-500", border: "border-violet-100",  text: "text-violet-700" },
    { label: "Avg Order",      value: formatCurrency(avgOrderValue),    icon: CreditCard,  gradient: "from-orange-500 to-amber-500",  border: "border-orange-100",  text: "text-orange-700" },
    { label: "Cancelled",      value: cancelledCount,                   icon: ShoppingBag, gradient: "from-red-500 to-rose-500",      border: "border-red-100",     text: "text-red-700" },
    { label: "All Time Orders",value: orders.length,                    icon: TrendingUp,  gradient: "from-gray-600 to-gray-800",     border: "border-gray-100",    text: "text-gray-700" },
  ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Reports</h1>
          <p className="text-gray-400 text-sm mt-0.5">Business performance overview</p>
        </div>
        {/* Period toggle */}
        <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={cn(
                "px-4 py-1.5 rounded-lg text-sm font-semibold transition-all",
                period === p.key ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className={cn("bg-white rounded-2xl border p-5 shadow-sm hover:shadow-md transition-shadow", s.border)}>
              <div className={cn("h-10 w-10 rounded-xl bg-gradient-to-br flex items-center justify-center mb-3 shadow-sm", s.gradient)}>
                <Icon className="h-5 w-5 text-white" />
              </div>
              <p className="text-2xl font-black text-gray-900 leading-none">{s.value}</p>
              <p className="text-xs font-medium text-gray-400 mt-1">{s.label}</p>
            </div>
          );
        })}
      </div>

      {/* Top Items */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100">
          <div className="h-8 w-8 rounded-xl bg-amber-100 flex items-center justify-center">
            <Award className="h-4 w-4 text-amber-600" />
          </div>
          <div>
            <h2 className="font-bold text-gray-900 text-sm">Top Selling Items</h2>
            <p className="text-[11px] text-gray-400">{PERIODS.find((p) => p.key === period)?.label}</p>
          </div>
        </div>

        {topItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Award className="h-10 w-10 text-gray-200 mb-2" />
            <p className="text-sm text-gray-400">No completed orders yet</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {topItems.map((item, i) => (
              <div key={item.name} className="flex items-center gap-4 px-6 py-3.5 hover:bg-gray-50/50 transition-colors">
                <span className={cn(
                  "h-7 w-7 rounded-lg flex items-center justify-center text-xs font-black shrink-0",
                  i === 0 ? "bg-amber-100 text-amber-700" : i === 1 ? "bg-gray-100 text-gray-600" : i === 2 ? "bg-orange-50 text-orange-600" : "bg-gray-50 text-gray-400"
                )}>
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{item.name}</p>
                  <div className="mt-1.5 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-orange-400 to-orange-500 rounded-full transition-all duration-500"
                      style={{ width: `${(item.qty / maxQty) * 100}%` }}
                    />
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-black text-gray-900">{item.qty} <span className="font-normal text-gray-400 text-xs">sold</span></p>
                  <p className="text-xs text-gray-400">{formatCurrency(item.revenue)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
