"use client";
export const dynamic = "force-dynamic";
import { useEffect, useState, useMemo } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { tableService } from "@/services/tableService";
import { restaurantService } from "@/services/restaurantService";
import { menuService } from "@/services/menuService";
import { orderService } from "@/services/orderService";
import { staffRequestService } from "@/services/staffRequestService";
import { useCart } from "@/hooks/useCart";
import { Restaurant, MenuCategory, MenuItem, Order } from "@/types";
import { Modal } from "@/components/ui/modal";
import { LoadingScreen, Spinner } from "@/components/ui/spinner";
import { formatCurrency, cn } from "@/utils";
import {
  ShoppingCart, Plus, Minus, UtensilsCrossed, Bell, Receipt,
  ChevronRight, CheckCircle, Clock, ImageOff,
  ClipboardList, ChefHat, Star, Bike, X,
} from "lucide-react";

/* ── constants ── */
const STATUS_STEPS = ["PLACED", "ACCEPTED", "PREPARING", "READY", "SERVED"] as const;

const STATUS_META: Record<string, { label: string; icon: React.ElementType; pill: string }> = {
  PLACED:    { label: "Placed",    icon: ClipboardList, pill: "bg-blue-50 text-blue-600 border-blue-100"    },
  ACCEPTED:  { label: "Accepted",  icon: CheckCircle,   pill: "bg-orange-50 text-orange-600 border-orange-100" },
  PREPARING: { label: "Preparing", icon: ChefHat,       pill: "bg-amber-50 text-amber-600 border-amber-100"  },
  READY:     { label: "Ready!",    icon: Star,          pill: "bg-emerald-50 text-emerald-600 border-emerald-100" },
  SERVED:    { label: "Served",    icon: Bike,          pill: "bg-gray-50 text-gray-500 border-gray-100"     },
  COMPLETED: { label: "Done",      icon: CheckCircle,   pill: "bg-gray-50 text-gray-400 border-gray-100"     },
  CANCELLED: { label: "Cancelled", icon: X,             pill: "bg-red-50 text-red-400 border-red-100"        },
};

/* ══════════════════════════════════════════════
   PAGE
══════════════════════════════════════════════ */
export default function MenuPage() {
  const { token } = useParams<{ token: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const sessionId = searchParams.get("session") ?? "";

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [restaurantId, setRestaurantId] = useState("");
  const [tableId, setTableId] = useState("");
  const [tableNumber, setTableNumber] = useState(0);
  const [customerName, setCustomerName] = useState("");
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [activeCategory, setActiveCategory] = useState("all");
  const [orders, setOrders] = useState<Order[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [showOrders, setShowOrders] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [staffCalled, setStaffCalled] = useState(false);

  const { items: cartItems, addItem, removeItem, clearCart, total: cartTotal, count: cartCount } = useCart(sessionId);

  useEffect(() => {
    if (!sessionId) { router.replace(`/table/${token}`); return; }
    async function init() {
      const result = await tableService.getByToken(token);
      if (!result) return;
      const { table, restaurantId: rid } = result;
      const rest = await restaurantService.get(rid);
      if (!rest) return;
      setRestaurantId(rid); setTableId(table.id); setTableNumber(table.tableNumber); setRestaurant(rest);
      const stored = sessionStorage.getItem(`session_${table.id}`);
      if (stored) setCustomerName(JSON.parse(stored).customerName);
      const [cats, menuItems] = await Promise.all([menuService.getCategories(rid), menuService.getItems(rid)]);
      setCategories(cats.filter((c) => c.isActive));
      setItems(menuItems);
      setLoading(false);
    }
    init();
  }, [token, sessionId, router]);

  useEffect(() => {
    if (!restaurantId || !sessionId) return;
    return orderService.subscribeToSession(restaurantId, sessionId, setOrders);
  }, [restaurantId, sessionId]);

  const availableItems = useMemo(() => items.filter((i) => i.isAvailable), [items]);
  const filteredItems = useMemo(() =>
    activeCategory === "all" ? availableItems : availableItems.filter((i) => i.categoryId === activeCategory),
    [availableItems, activeCategory]
  );

  const taxPercent = restaurant?.settings?.taxPercent ?? 5;
  const serviceChargePercent = restaurant?.settings?.serviceChargePercent ?? 0;
  const tax = Math.round(cartTotal * taxPercent) / 100;
  const serviceCharge = Math.round(cartTotal * serviceChargePercent) / 100;
  const grandTotal = cartTotal + tax + serviceCharge;

  const placeOrder = async () => {
    if (!cartItems.length || placing) return;
    setPlacing(true);
    try {
      await orderService.create(restaurantId, sessionId, tableId, tableNumber, customerName, cartItems, taxPercent, serviceChargePercent);
      clearCart(); setShowCart(false); setShowOrders(true);
    } finally { setPlacing(false); }
  };

  const callStaff = async () => {
    await staffRequestService.create({ restaurantId, tableId, tableNumber, sessionId, customerName, type: "CALL_STAFF" });
    setStaffCalled(true);
    setTimeout(() => setStaffCalled(false), 3000);
  };

  const requestBill = async () => {
    await staffRequestService.create({ restaurantId, tableId, tableNumber, sessionId, customerName, type: "REQUEST_BILL" });
    router.push(`/table/${token}/bill?session=${sessionId}`);
  };

  const getQty = (id: string) => cartItems.find((i) => i.menuItemId === id)?.quantity ?? 0;
  const activeOrders = orders.filter((o) => !["COMPLETED", "CANCELLED"].includes(o.status));
  const groupedCategories = categories.filter((c) => availableItems.some((i) => i.categoryId === c.id));

  /* latest active order status for header icon */
  const latestStatus = activeOrders[0]?.status ?? null;
  const latestMeta = latestStatus ? STATUS_META[latestStatus] : null;

  if (loading) return <LoadingScreen message="Loading menu…" />;

  return (
    /* outer shell — on lg+ we use a 2-panel layout */
    <div className="min-h-screen bg-gray-50 flex flex-col">

      {/* ══ HEADER ══ */}
      <header className="sticky top-0 z-30 bg-white shadow-[0_1px_0_0_#f3f4f6,0_4px_16px_-4px_rgba(0,0,0,0.06)]">
        <div className="max-w-6xl mx-auto w-full">

          {/* ── info row ── */}
          <div className="flex items-center gap-4 px-4 md:px-8 h-16 md:h-[72px]">

            {/* logo */}
            <div className="shrink-0">
              {restaurant?.logoUrl ? (
                <img
                  src={restaurant.logoUrl}
                  alt={restaurant.name}
                  className="h-10 w-10 md:h-11 md:w-11 rounded-xl object-cover ring-1 ring-black/5"
                />
              ) : (
                <div className="h-10 w-10 md:h-11 md:w-11 rounded-xl bg-gradient-to-br from-orange-500 to-amber-400 flex items-center justify-center shadow-sm">
                  <UtensilsCrossed className="h-5 w-5 text-white" />
                </div>
              )}
            </div>

            {/* name + badges */}
            <div className="flex-1 min-w-0">
              <p className="font-bold text-gray-900 text-[15px] md:text-base leading-snug truncate tracking-tight">
                {restaurant?.name}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                {/* table badge */}
                <span className="inline-flex items-center gap-1 bg-orange-500 text-white text-[10px] md:text-[11px] font-bold rounded-md px-2 py-0.5 leading-none">
                  Table {tableNumber}
                </span>
                {/* divider dot */}
                <span className="h-1 w-1 rounded-full bg-gray-300" />
                {/* customer */}
                <span className="text-[11px] md:text-xs text-gray-400 font-medium truncate">
                  {customerName}
                </span>
              </div>
            </div>

            {/* right actions */}
            <div className="flex items-center gap-2 shrink-0">

              {/* order status button */}
              {latestMeta && (() => {
                const Icon = latestMeta.icon;
                return (
                  <button
                    onClick={() => setShowOrders(true)}
                    aria-label="View orders"
                    className={cn(
                      "relative flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold transition-all hover:shadow-sm active:scale-95",
                      latestMeta.pill
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="hidden sm:inline">{latestMeta.label}</span>
                    {activeOrders.length > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-red-500 text-white text-[9px] font-black flex items-center justify-center shadow-sm">
                        {activeOrders.length}
                      </span>
                    )}
                  </button>
                );
              })()}

              {/* cart — desktop header */}
              {cartCount > 0 && (
                <button
                  onClick={() => setShowCart(true)}
                  className="hidden lg:flex items-center gap-2.5 bg-orange-500 hover:bg-orange-600 active:scale-95 text-white text-sm font-bold px-4 py-2 rounded-xl shadow-sm shadow-orange-200 transition-all"
                >
                  <ShoppingCart className="h-4 w-4" />
                  <span>{cartCount} item{cartCount > 1 ? "s" : ""}</span>
                  <span className="h-4 w-px bg-white/30" />
                  <span>{formatCurrency(grandTotal)}</span>
                </button>
              )}
            </div>
          </div>

          {/* ── category slider ── */}
          <div className="border-t border-gray-100">
            <div className="flex gap-1.5 px-4 md:px-8 py-2.5 overflow-x-auto scrollbar-none">
              {[{ id: "all", name: "All" }, ...categories].map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={cn(
                    "shrink-0 rounded-lg px-3.5 py-1.5 text-xs md:text-[13px] font-semibold transition-all whitespace-nowrap",
                    activeCategory === cat.id
                      ? "bg-orange-500 text-white shadow-sm shadow-orange-200"
                      : "text-gray-500 hover:text-gray-800 hover:bg-gray-100"
                  )}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* ══ BODY — two-panel on lg+ ══ */}
      <div className="flex-1 max-w-6xl mx-auto w-full flex gap-6 px-4 md:px-6 py-5 pb-36 lg:pb-8">

        {/* ── menu items ── */}
        <main className="flex-1 min-w-0 space-y-8">
          {filteredItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="h-16 w-16 rounded-3xl bg-gray-100 flex items-center justify-center mb-4">
                <UtensilsCrossed className="h-8 w-8 text-gray-300" />
              </div>
              <p className="font-bold text-gray-400">No items available</p>
            </div>
          ) : activeCategory === "all" ? (
            groupedCategories.map((cat) => {
              const catItems = availableItems.filter((i) => i.categoryId === cat.id);
              if (!catItems.length) return null;
              return (
                <section key={cat.id}>
                  <div className="flex items-center gap-2 mb-4">
                    <span className="h-5 w-1 rounded-full bg-orange-500" />
                    <h2 className="text-sm md:text-base font-black text-gray-900 uppercase tracking-wide">{cat.name}</h2>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 md:gap-4">
                    {catItems.map((item) => (
                      <MenuItemCard key={item.id} item={item} qty={getQty(item.id)}
                        onAdd={() => addItem(item)} onRemove={() => removeItem(item.id)} />
                    ))}
                  </div>
                </section>
              );
            })
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 md:gap-4">
              {filteredItems.map((item) => (
                <MenuItemCard key={item.id} item={item} qty={getQty(item.id)}
                  onAdd={() => addItem(item)} onRemove={() => removeItem(item.id)} />
              ))}
            </div>
          )}
        </main>

        {/* ── desktop sidebar ── */}
        <aside className="hidden lg:flex flex-col gap-4 w-80 xl:w-96 shrink-0">

          {/* cart summary card */}
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden sticky top-[88px]">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-black text-gray-900">Your Cart</h3>
              {cartCount > 0 && (
                <span className="h-6 w-6 rounded-xl bg-orange-500 text-white text-xs font-black flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </div>

            {cartCount === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center px-5">
                <ShoppingCart className="h-10 w-10 text-gray-200 mb-3" />
                <p className="text-sm font-semibold text-gray-400">Your cart is empty</p>
                <p className="text-xs text-gray-300 mt-1">Add items from the menu</p>
              </div>
            ) : (
              <div className="px-5 py-4 space-y-4">
                <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                  {cartItems.map((item) => (
                    <div key={item.menuItemId} className="flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 text-sm truncate">{item.name}</p>
                        <p className="text-xs text-gray-400">{formatCurrency(item.price)}</p>
                      </div>
                      <div className="flex items-center gap-1.5 bg-orange-50 rounded-xl p-1 shrink-0">
                        <button onClick={() => removeItem(item.menuItemId)}
                          className="h-6 w-6 rounded-lg bg-white shadow-sm flex items-center justify-center">
                          <Minus className="h-3 w-3 text-orange-600" />
                        </button>
                        <span className="font-black text-orange-600 w-4 text-center text-xs">{item.quantity}</span>
                        <button onClick={() => addItem({ id: item.menuItemId, name: item.name, price: item.price } as MenuItem)}
                          className="h-6 w-6 rounded-lg bg-orange-500 flex items-center justify-center">
                          <Plus className="h-3 w-3 text-white" />
                        </button>
                      </div>
                      <span className="text-sm font-black text-gray-900 w-14 text-right shrink-0">
                        {formatCurrency(item.price * item.quantity)}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="bg-gray-50 rounded-2xl p-3 space-y-2 text-sm">
                  <div className="flex justify-between text-gray-500"><span>Subtotal</span><span className="font-semibold text-gray-700">{formatCurrency(cartTotal)}</span></div>
                  {tax > 0 && <div className="flex justify-between text-gray-500"><span>Tax ({taxPercent}%)</span><span className="font-semibold text-gray-700">{formatCurrency(tax)}</span></div>}
                  {serviceCharge > 0 && <div className="flex justify-between text-gray-500"><span>Service</span><span className="font-semibold text-gray-700">{formatCurrency(serviceCharge)}</span></div>}
                  <div className="h-px bg-gray-200" />
                  <div className="flex justify-between font-black text-gray-900 text-base">
                    <span>Total</span><span className="text-orange-500">{formatCurrency(grandTotal)}</span>
                  </div>
                </div>

                <button onClick={placeOrder} disabled={placing}
                  className="w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 active:scale-[0.98] disabled:opacity-60 text-white font-black py-3.5 rounded-2xl shadow-md shadow-orange-200 transition-all">
                  {placing ? <Spinner className="h-4 w-4" /> : <ShoppingCart className="h-4 w-4" />}
                  {placing ? "Placing…" : `Place Order · ${formatCurrency(grandTotal)}`}
                </button>
              </div>
            )}

            {/* call staff + request bill */}
            <div className="px-5 pb-5 grid grid-cols-2 gap-2">
              <button onClick={callStaff}
                className={cn(
                  "flex items-center justify-center gap-1.5 rounded-2xl border py-3 text-sm font-bold transition-all",
                  staffCalled
                    ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                    : "bg-white border-gray-200 text-gray-700 hover:border-orange-200 hover:bg-orange-50 hover:text-orange-600"
                )}>
                {staffCalled ? <CheckCircle className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
                {staffCalled ? "Notified!" : "Call Staff"}
              </button>
              <button onClick={requestBill}
                className="flex items-center justify-center gap-1.5 rounded-2xl border border-gray-200 bg-white py-3 text-sm font-bold text-gray-700 hover:border-orange-200 hover:bg-orange-50 hover:text-orange-600 transition-all">
                <Receipt className="h-4 w-4" /> Request Bill
              </button>
            </div>
          </div>
        </aside>
      </div>

      {/* ══ MOBILE BOTTOM BAR ══ */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-20 bg-white border-t border-gray-100 px-4 pt-3 pb-6 space-y-2.5 shadow-[0_-8px_30px_rgba(0,0,0,0.08)]">
        {cartCount > 0 && (
          <button onClick={() => setShowCart(true)}
            className="w-full flex items-center justify-between bg-orange-500 hover:bg-orange-600 active:scale-[0.98] text-white font-black py-4 px-5 rounded-2xl shadow-lg shadow-orange-200 transition-all">
            <span className="flex items-center gap-2.5">
              <span className="h-7 w-7 rounded-xl bg-white/20 flex items-center justify-center text-sm font-black">{cartCount}</span>
              View Cart
            </span>
            <span className="flex items-center gap-1 text-sm font-bold">
              {formatCurrency(grandTotal)}<ChevronRight className="h-4 w-4" />
            </span>
          </button>
        )}
        <div className="flex gap-2">
          <button onClick={callStaff}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 rounded-2xl border py-3 text-sm font-bold transition-all",
              staffCalled
                ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                : "bg-white border-gray-200 text-gray-700 hover:border-orange-200 hover:bg-orange-50 hover:text-orange-600"
            )}>
            {staffCalled ? <CheckCircle className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
            {staffCalled ? "Staff Notified!" : "Call Staff"}
          </button>
          <button onClick={requestBill}
            className="flex-1 flex items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white py-3 text-sm font-bold text-gray-700 hover:border-orange-200 hover:bg-orange-50 hover:text-orange-600 transition-all">
            <Receipt className="h-4 w-4" /> Request Bill
          </button>
        </div>
      </div>

      {/* ══ CART MODAL (mobile) ══ */}
      <Modal open={showCart} onClose={() => setShowCart(false)} title="Your Cart">
        <div className="space-y-5">
          <div className="space-y-3">
            {cartItems.map((item) => (
              <div key={item.menuItemId} className="flex items-center gap-3 bg-gray-50 rounded-2xl p-3">
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-900 text-sm truncate">{item.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{formatCurrency(item.price)} each</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <div className="flex items-center gap-1.5 bg-white rounded-xl p-1 shadow-sm border border-gray-100">
                    <button onClick={() => removeItem(item.menuItemId)}
                      className="h-7 w-7 rounded-lg bg-gray-100 hover:bg-red-50 hover:text-red-500 flex items-center justify-center transition-colors">
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="font-black text-gray-900 w-5 text-center text-sm">{item.quantity}</span>
                    <button onClick={() => addItem({ id: item.menuItemId, name: item.name, price: item.price } as MenuItem)}
                      className="h-7 w-7 rounded-lg bg-orange-500 flex items-center justify-center">
                      <Plus className="h-3.5 w-3.5 text-white" />
                    </button>
                  </div>
                  <span className="w-16 text-right font-black text-sm text-gray-900">{formatCurrency(item.price * item.quantity)}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="bg-gray-50 rounded-2xl p-4 space-y-2.5">
            <div className="flex justify-between text-sm text-gray-500"><span>Subtotal</span><span className="font-semibold text-gray-700">{formatCurrency(cartTotal)}</span></div>
            {tax > 0 && <div className="flex justify-between text-sm text-gray-500"><span>Tax ({taxPercent}%)</span><span className="font-semibold text-gray-700">{formatCurrency(tax)}</span></div>}
            {serviceCharge > 0 && <div className="flex justify-between text-sm text-gray-500"><span>Service Charge</span><span className="font-semibold text-gray-700">{formatCurrency(serviceCharge)}</span></div>}
            <div className="h-px bg-gray-200" />
            <div className="flex justify-between font-black text-gray-900 text-lg">
              <span>Total</span><span className="text-orange-500">{formatCurrency(grandTotal)}</span>
            </div>
          </div>
          <button onClick={placeOrder} disabled={placing}
            className="w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 active:scale-[0.98] disabled:opacity-60 text-white font-black py-4 rounded-2xl shadow-lg shadow-orange-200 transition-all">
            {placing ? <Spinner className="h-5 w-5" /> : <ShoppingCart className="h-5 w-5" />}
            {placing ? "Placing Order…" : `Place Order · ${formatCurrency(grandTotal)}`}
          </button>
        </div>
      </Modal>

      {/* ══ ORDERS MODAL ══ */}
      <Modal open={showOrders} onClose={() => setShowOrders(false)} title="Your Orders">
        <div className="space-y-4">
          {orders.length === 0 ? (
            <div className="text-center py-12">
              <div className="h-16 w-16 rounded-3xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
                <ShoppingCart className="h-8 w-8 text-gray-300" />
              </div>
              <p className="font-bold text-gray-400">No orders yet</p>
              <p className="text-sm text-gray-300 mt-1">Add items from the menu to get started</p>
            </div>
          ) : (
            orders.map((order) => <OrderCard key={order.id} order={order} />)
          )}
        </div>
      </Modal>
    </div>
  );
}

/* ══════════════════════════════════════════════
   MENU ITEM CARD
   Mobile  → horizontal (image left, info right)
   sm/md+  → vertical (image top, info bottom)
══════════════════════════════════════════════ */
function MenuItemCard({ item, qty, onAdd, onRemove }: {
  item: MenuItem; qty: number; onAdd: () => void; onRemove: () => void;
}) {
  return (
    <div className={cn(
      "bg-white rounded-2xl overflow-hidden border transition-all",
      "flex flex-row sm:flex-col",
      qty > 0 ? "border-orange-200 shadow-md shadow-orange-50" : "border-gray-100 shadow-sm hover:shadow-md"
    )}>
      {/* image — fixed height on vertical, fixed width on horizontal */}
      <div className={cn(
        "relative bg-gray-50 flex items-center justify-center overflow-hidden shrink-0",
        "w-28 h-auto sm:w-full sm:h-40"
      )}>
        {item.imageUrl ? (
          <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
        ) : (
          <ImageOff className="h-7 w-7 text-gray-200" />
        )}
        {item.isVeg !== undefined && (
          <span className={cn(
            "absolute top-2 left-2 h-4 w-4 rounded-sm border-2 bg-white flex items-center justify-center",
            item.isVeg ? "border-green-600" : "border-red-500"
          )}>
            <span className={cn("h-2 w-2 rounded-full", item.isVeg ? "bg-green-600" : "bg-red-500")} />
          </span>
        )}
      </div>

      {/* info — always grows, price+button always at bottom */}
      <div className="flex-1 p-3 flex flex-col justify-between min-w-0">
        <div>
          <p className="font-bold text-gray-900 text-sm leading-tight">{item.name}</p>
          {item.description && (
            <p className="text-xs text-gray-400 mt-1 line-clamp-2 leading-relaxed">{item.description}</p>
          )}
          {item.preparationTimeMinutes && (
            <p className="text-[11px] text-gray-400 mt-1 flex items-center gap-1">
              <Clock className="h-3 w-3" /> ~{item.preparationTimeMinutes} min
            </p>
          )}
        </div>
        {/* price + add — always rendered, never clipped */}
        <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-50">
          <span className="font-black text-gray-900 text-sm">{formatCurrency(item.price)}</span>
          {qty === 0 ? (
            <button onClick={onAdd}
              className="flex items-center gap-1 bg-orange-500 hover:bg-orange-600 active:scale-95 text-white text-xs font-black px-3 py-1.5 rounded-xl shadow-sm shadow-orange-200 transition-all">
              <Plus className="h-3.5 w-3.5" /> ADD
            </button>
          ) : (
            <div className="flex items-center gap-1.5 bg-orange-50 rounded-xl p-1">
              <button onClick={onRemove}
                className="h-7 w-7 rounded-lg bg-white shadow-sm flex items-center justify-center active:scale-95 transition-transform">
                <Minus className="h-3.5 w-3.5 text-orange-600" />
              </button>
              <span className="font-black text-orange-600 w-5 text-center text-sm">{qty}</span>
              <button onClick={onAdd}
                className="h-7 w-7 rounded-lg bg-orange-500 flex items-center justify-center shadow-sm active:scale-95 transition-transform">
                <Plus className="h-3.5 w-3.5 text-white" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════
   ORDER CARD
══════════════════════════════════════════════ */
function OrderCard({ order }: { order: Order }) {
  const meta = STATUS_META[order.status] ?? STATUS_META.PLACED;
  const Icon = meta.icon;
  const currentIdx = STATUS_STEPS.indexOf(order.status as typeof STATUS_STEPS[number]);
  const isActive = !["COMPLETED", "CANCELLED"].includes(order.status);

  return (
    <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">

      {/* ── header ── */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-orange-50 flex items-center justify-center">
            <ClipboardList className="h-3.5 w-3.5 text-orange-500" />
          </div>
          <div>
            <p className="text-[11px] text-gray-400 leading-none">Order</p>
            <p className="text-sm text-gray-800 leading-tight tracking-wide">
              #{order.id.slice(-6).toUpperCase()}
            </p>
          </div>
        </div>
        <div className={cn("flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs border", meta.pill)}>
          <Icon className="h-3.5 w-3.5" />
          {meta.label}
        </div>
      </div>

      {/* ── items ── */}
      <div className="px-4 pt-3 pb-2 space-y-2">
        {order.items.map((item) => (
          <div key={item.id} className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <span className="shrink-0 h-5 w-5 rounded-md bg-gray-100 text-gray-500 text-[10px] flex items-center justify-center">
                {item.quantity}
              </span>
              <span className="text-sm text-gray-700 truncate">{item.name}</span>
            </div>
            <span className="text-sm text-gray-600 shrink-0">{formatCurrency(item.priceAtOrderTime * item.quantity)}</span>
          </div>
        ))}
      </div>

      {/* ── total ── */}
      <div className="mx-4 mb-3 mt-1 flex items-center justify-between rounded-xl bg-orange-50 px-3 py-2.5">
        <span className="text-xs text-orange-700">Total</span>
        <span className="text-sm text-orange-600">{formatCurrency(order.total)}</span>
      </div>

      {/* ── tracker ── */}
      {isActive && <OrderStatusTracker currentIdx={currentIdx} />}
    </div>
  );
}

/* ══════════════════════════════════════════════
   ORDER STATUS TRACKER
══════════════════════════════════════════════ */
function OrderStatusTracker({ currentIdx }: { currentIdx: number }) {
  const STEPS = [
    { icon: ClipboardList, label: "Placed"    },
    { icon: CheckCircle,   label: "Accepted"  },
    { icon: ChefHat,       label: "Preparing" },
    { icon: Star,          label: "Ready"     },
  ];

  return (
    <div className="px-4 pb-4 pt-1 border-t border-gray-100">
      <p className="text-[10px] text-gray-400 mb-3 mt-2">Order Progress</p>
      <div className="relative flex items-start justify-between">
        {/* base track */}
        <div className="absolute left-4 right-4 top-3.5 h-px bg-gray-100" />
        {/* filled track */}
        <div
          className="absolute left-4 top-3.5 h-px bg-orange-400 transition-all duration-500"
          style={{ width: currentIdx > 0 ? `calc(${(currentIdx / (STEPS.length - 1)) * 100}% - 2rem)` : "0%" }}
        />
        {STEPS.map(({ icon: Icon, label }, i) => {
          const done   = i < currentIdx;
          const active = i === currentIdx;
          return (
            <div key={label} className="relative z-10 flex flex-col items-center gap-1.5 w-12">
              <div className={cn(
                "h-7 w-7 rounded-full flex items-center justify-center transition-all duration-300 border",
                done   ? "bg-orange-500 border-orange-500" :
                active ? "bg-white border-orange-400 ring-2 ring-orange-100" :
                         "bg-white border-gray-200"
              )}>
                <Icon className={cn(
                  "h-3.5 w-3.5",
                  done ? "text-white" : active ? "text-orange-500" : "text-gray-300"
                )} />
              </div>
              <span className={cn(
                "text-[9px] text-center leading-tight",
                active ? "text-orange-500" : done ? "text-gray-500" : "text-gray-300"
              )}>
                {label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
