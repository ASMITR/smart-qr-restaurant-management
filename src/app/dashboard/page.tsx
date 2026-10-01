"use client";
export const dynamic = "force-dynamic";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { orderService } from "@/services/orderService";
import { tableService } from "@/services/tableService";
import { staffRequestService as srs } from "@/services/staffRequestService";
import { Order, Table, StaffRequest } from "@/types";
import { StatusBadge } from "@/components/ui/badge";
import { formatCurrency, formatTime } from "@/utils";
import {
  TrendingUp, ShoppingBag, Table2, Clock, Bell, CheckCircle,
  ChevronRight, Zap, Users, Receipt, UtensilsCrossed,
} from "lucide-react";
import { cn } from "@/utils";

const NEXT_STATUS: Partial<Record<Order["status"], { label: string; status: Order["status"]; color: string }>> = {
  PLACED:    { label: "Accept",    status: "ACCEPTED",  color: "bg-blue-500 hover:bg-blue-600" },
  ACCEPTED:  { label: "Preparing", status: "PREPARING", color: "bg-amber-500 hover:bg-amber-600" },
  PREPARING: { label: "Mark Ready",status: "READY",     color: "bg-violet-500 hover:bg-violet-600" },
  READY:     { label: "Served ✓",  status: "SERVED",    color: "bg-emerald-500 hover:bg-emerald-600" },
};

const STATUS_PIPELINE: { status: Order["status"]; label: string; color: string; dot: string }[] = [
  { status: "PLACED",    label: "New",       color: "bg-blue-50 border-blue-200 text-blue-700",    dot: "bg-blue-500" },
  { status: "ACCEPTED",  label: "Accepted",  color: "bg-orange-50 border-orange-200 text-orange-700", dot: "bg-orange-500" },
  { status: "PREPARING", label: "Preparing", color: "bg-amber-50 border-amber-200 text-amber-700", dot: "bg-amber-500" },
  { status: "READY",     label: "Ready",     color: "bg-violet-50 border-violet-200 text-violet-700", dot: "bg-violet-500" },
];

const REQUEST_ICONS: Record<string, string> = {
  CALL_STAFF: "🔔",
  REQUEST_BILL: "🧾",
  ADD_FOOD: "🍽️",
};

export default function DashboardPage() {
  const { restaurantId } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [requests, setRequests] = useState<StaffRequest[]>([]);
  const [updating, setUpdating] = useState<Record<string, boolean>>({});
  const [resolving, setResolving] = useState<Record<string, boolean>>({});
  const [activeTab, setActiveTab] = useState<"all" | Order["status"]>("all");

  useEffect(() => {
    if (!restaurantId) return;
    const u1 = orderService.subscribeAll(restaurantId, setOrders);
    const u2 = tableService.subscribe(restaurantId, setTables);
    const u3 = srs.subscribePending(restaurantId, setRequests);
    return () => { u1(); u2(); u3(); };
  }, [restaurantId]);

  async function advanceOrder(orderId: string, status: Order["status"]) {
    if (!restaurantId) return;
    setUpdating((p) => ({ ...p, [orderId]: true }));
    await orderService.updateStatus(restaurantId, orderId, status);
    setUpdating((p) => ({ ...p, [orderId]: false }));
  }

  async function resolveRequest(reqId: string) {
    if (!restaurantId) return;
    setResolving((p) => ({ ...p, [reqId]: true }));
    await srs.resolve(restaurantId, reqId);
    setResolving((p) => ({ ...p, [reqId]: false }));
  }

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const todayOrders = orders.filter((o) => { const d = o.createdAt?.toDate?.(); return d && d >= today; });
  const todayRevenue = todayOrders.filter((o) => o.status === "COMPLETED").reduce((s, o) => s + o.total, 0);
  const activeOrders = orders.filter((o) => ["PLACED", "ACCEPTED", "PREPARING", "READY"].includes(o.status));

  const occupied   = tables.filter((t) => t.status === "OCCUPIED").length;
  const available  = tables.filter((t) => t.status === "AVAILABLE").length;
  const payPending = tables.filter((t) => t.status === "PAYMENT_PENDING").length;

  const pipelineCounts = Object.fromEntries(
    STATUS_PIPELINE.map((s) => [s.status, activeOrders.filter((o) => o.status === s.status).length])
  );

  const filteredOrders = activeTab === "all" ? activeOrders : activeOrders.filter((o) => o.status === activeTab);

  const stats = [
    { label: "Today's Revenue", value: formatCurrency(todayRevenue), icon: TrendingUp, gradient: "from-emerald-500 to-teal-500", light: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-100" },
    { label: "Today's Orders",  value: todayOrders.length,           icon: ShoppingBag, gradient: "from-blue-500 to-indigo-500",  light: "bg-blue-50",    text: "text-blue-700",    border: "border-blue-100" },
    { label: "Active Orders",   value: activeOrders.length,          icon: Zap,         gradient: "from-orange-500 to-amber-500", light: "bg-orange-50",  text: "text-orange-700",  border: "border-orange-100" },
    { label: "Occupied Tables", value: occupied,                     icon: Users,       gradient: "from-violet-500 to-purple-500",light: "bg-violet-50",  text: "text-violet-700",  border: "border-violet-100" },
    { label: "Payment Pending", value: payPending,                   icon: Clock,       gradient: "from-red-500 to-rose-500",     light: "bg-red-50",     text: "text-red-700",     border: "border-red-100" },
    { label: "Staff Requests",  value: requests.length,              icon: Bell,        gradient: "from-pink-500 to-rose-400",    light: "bg-pink-50",    text: "text-pink-700",    border: "border-pink-100" },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Good day 👋</h1>
          <p className="text-gray-400 text-sm mt-0.5">Here's what's happening at your restaurant</p>
        </div>
        <div className="hidden sm:flex items-center gap-2 text-xs text-gray-400">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Updates in real-time
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className={cn("rounded-2xl border p-4 bg-white shadow-sm hover:shadow-md transition-shadow", s.border)}>
              <div className={cn("h-9 w-9 rounded-xl bg-gradient-to-br flex items-center justify-center mb-3 shadow-sm", s.gradient)}>
                <Icon className="h-4 w-4 text-white" />
              </div>
              <p className="text-2xl font-black text-gray-900 leading-none">{s.value}</p>
              <p className="text-[11px] font-medium text-gray-400 mt-1 leading-tight">{s.label}</p>
            </div>
          );
        })}
      </div>

      {/* Main grid */}
      <div className="grid xl:grid-cols-3 gap-5">

        {/* ── Active Orders (2/3 width) ── */}
        <div className="xl:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {/* Card header */}
          <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
            <div className="h-8 w-8 rounded-xl bg-orange-100 flex items-center justify-center">
              <ShoppingBag className="h-4 w-4 text-orange-600" />
            </div>
            <div>
              <h2 className="font-bold text-gray-900 text-sm">Active Orders</h2>
              <p className="text-[11px] text-gray-400">{activeOrders.length} orders need attention</p>
            </div>
            <a href="/dashboard/orders" className="ml-auto flex items-center gap-1 text-xs font-semibold text-orange-600 hover:text-orange-700">
              View all <ChevronRight className="h-3.5 w-3.5" />
            </a>
          </div>

          {/* Pipeline tabs */}
          <div className="flex gap-2 px-5 py-3 border-b border-gray-50 overflow-x-auto scrollbar-none">
            <button
              onClick={() => setActiveTab("all")}
              className={cn(
                "shrink-0 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold border transition-all",
                activeTab === "all"
                  ? "bg-gray-900 text-white border-gray-900"
                  : "bg-white text-gray-500 border-gray-200 hover:border-gray-300"
              )}
            >
              All
              <span className={cn("rounded-full px-1.5 py-0.5 text-[10px] font-bold", activeTab === "all" ? "bg-white/20 text-white" : "bg-gray-100 text-gray-600")}>
                {activeOrders.length}
              </span>
            </button>
            {STATUS_PIPELINE.map((p) => (
              <button
                key={p.status}
                onClick={() => setActiveTab(p.status)}
                className={cn(
                  "shrink-0 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold border transition-all",
                  activeTab === p.status
                    ? cn(p.color, "shadow-sm")
                    : "bg-white text-gray-500 border-gray-200 hover:border-gray-300"
                )}
              >
                <span className={cn("h-1.5 w-1.5 rounded-full", p.dot)} />
                {p.label}
                {pipelineCounts[p.status] > 0 && (
                  <span className={cn("rounded-full px-1.5 py-0.5 text-[10px] font-bold", activeTab === p.status ? "bg-white/30" : "bg-gray-100 text-gray-600")}>
                    {pipelineCounts[p.status]}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Order list */}
          <div className="divide-y divide-gray-50">
            {filteredOrders.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <CheckCircle className="h-10 w-10 text-emerald-200 mb-2" />
                <p className="text-sm font-medium text-gray-400">All clear!</p>
                <p className="text-xs text-gray-300">No orders in this stage</p>
              </div>
            ) : (
              filteredOrders.slice(0, 8).map((order) => {
                const next = NEXT_STATUS[order.status];
                const pipeline = STATUS_PIPELINE.find((p) => p.status === order.status);
                return (
                  <div key={order.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50/70 transition-colors">
                    {/* Table badge */}
                    <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center shrink-0 border font-black text-sm", pipeline?.color ?? "bg-gray-50 border-gray-200 text-gray-600")}>
                      {order.tableNumber}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-sm text-gray-900 truncate">{order.customerName}</p>
                        <StatusBadge status={order.status} />
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5 truncate">
                        {order.items.map((i) => `${i.name} ×${i.quantity}`).join(", ")}
                      </p>
                    </div>

                    {/* Meta + action */}
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-gray-400 hidden sm:block">{formatTime(order.createdAt)}</span>
                      {next && (
                        <button
                          disabled={updating[order.id]}
                          onClick={() => advanceOrder(order.id, next.status)}
                          className={cn(
                            "text-xs font-bold text-white px-3 py-1.5 rounded-xl transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed",
                            next.color
                          )}
                        >
                          {updating[order.id] ? "…" : next.label}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ── Right column ── */}
        <div className="space-y-5">

          {/* Table Status Mini-Grid */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
              <div className="h-8 w-8 rounded-xl bg-violet-100 flex items-center justify-center">
                <Table2 className="h-4 w-4 text-violet-600" />
              </div>
              <div>
                <h2 className="font-bold text-gray-900 text-sm">Tables</h2>
                <p className="text-[11px] text-gray-400">{tables.length} total</p>
              </div>
              <a href="/dashboard/tables" className="ml-auto flex items-center gap-1 text-xs font-semibold text-violet-600 hover:text-violet-700">
                Manage <ChevronRight className="h-3.5 w-3.5" />
              </a>
            </div>
            <div className="grid grid-cols-3 divide-x divide-gray-100">
              {[
                { label: "Available", value: available,  color: "text-emerald-600", bg: "bg-emerald-50" },
                { label: "Occupied",  value: occupied,   color: "text-orange-600",  bg: "bg-orange-50" },
                { label: "Payment",   value: payPending, color: "text-red-600",     bg: "bg-red-50" },
              ].map((t) => (
                <div key={t.label} className={cn("flex flex-col items-center py-4 gap-1", t.bg)}>
                  <span className={cn("text-2xl font-black", t.color)}>{t.value}</span>
                  <span className="text-[10px] font-medium text-gray-500">{t.label}</span>
                </div>
              ))}
            </div>
            {/* Table dots grid */}
            <div className="px-4 py-3 flex flex-wrap gap-1.5">
              {tables.slice(0, 20).map((t) => (
                <div
                  key={t.id}
                  title={`Table ${t.tableNumber} — ${t.status}`}
                  className={cn(
                    "h-7 w-7 rounded-lg flex items-center justify-center text-[10px] font-bold border transition-all",
                    t.status === "AVAILABLE"      && "bg-emerald-50 border-emerald-200 text-emerald-700",
                    t.status === "OCCUPIED"       && "bg-orange-50 border-orange-200 text-orange-700",
                    t.status === "PAYMENT_PENDING"&& "bg-red-50 border-red-200 text-red-700",
                    t.status === "CLEANING"       && "bg-blue-50 border-blue-200 text-blue-700",
                  )}
                >
                  {t.tableNumber}
                </div>
              ))}
            </div>
          </div>

          {/* Staff Requests */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
              <div className="h-8 w-8 rounded-xl bg-pink-100 flex items-center justify-center">
                <Bell className="h-4 w-4 text-pink-600" />
              </div>
              <div>
                <h2 className="font-bold text-gray-900 text-sm">Staff Requests</h2>
                <p className="text-[11px] text-gray-400">{requests.length} pending</p>
              </div>
              {requests.length > 0 && (
                <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-pink-500 text-[10px] font-black text-white animate-pulse">
                  {requests.length}
                </span>
              )}
            </div>
            <div className="divide-y divide-gray-50">
              {requests.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <CheckCircle className="h-9 w-9 text-emerald-200 mb-2" />
                  <p className="text-sm font-medium text-gray-400">All clear</p>
                  <p className="text-xs text-gray-300">No pending requests</p>
                </div>
              ) : (
                requests.map((req) => (
                  <div key={req.id} className="flex items-center gap-3 px-4 py-3 hover:bg-pink-50/50 transition-colors">
                    <span className="text-xl shrink-0">{REQUEST_ICONS[req.type] ?? "📋"}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900">Table {req.tableNumber}</p>
                      <p className="text-xs text-gray-400 truncate">{req.type.replace(/_/g, " ")} · {formatTime(req.createdAt)}</p>
                    </div>
                    <button
                      disabled={resolving[req.id]}
                      onClick={() => resolveRequest(req.id)}
                      className="shrink-0 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-3 py-1.5 rounded-xl transition-all disabled:opacity-50"
                    >
                      {resolving[req.id] ? "…" : "Done"}
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Quick Links */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Quick Actions</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "New Bill",    href: "/dashboard/billing",  icon: Receipt,         color: "bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-100" },
                { label: "Add Item",    href: "/dashboard/menu",     icon: UtensilsCrossed, color: "bg-orange-50 text-orange-700 hover:bg-orange-100 border-orange-100" },
                { label: "All Orders",  href: "/dashboard/orders",   icon: ShoppingBag,     color: "bg-violet-50 text-violet-700 hover:bg-violet-100 border-violet-100" },
                { label: "Reports",     href: "/dashboard/reports",  icon: TrendingUp,      color: "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-100" },
              ].map((q) => {
                const Icon = q.icon;
                return (
                  <a
                    key={q.href}
                    href={q.href}
                    className={cn("flex items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-semibold border transition-all", q.color)}
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0" />
                    {q.label}
                  </a>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


