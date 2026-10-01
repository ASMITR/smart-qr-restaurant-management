"use client";
export const dynamic = "force-dynamic";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { menuService } from "@/services/menuService";
import { MenuCategory, MenuItem } from "@/types";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { formatCurrency } from "@/utils";
import { cn } from "@/utils";
import { Plus, Edit2, Trash2, Leaf, Drumstick, ImageOff, UtensilsCrossed } from "lucide-react";
import { toast } from "sonner";

const emptyItem = (): Omit<MenuItem, "id"> => ({
  restaurantId: "", categoryId: "", name: "", description: "",
  price: 0, imageUrl: "", isVeg: true, isAvailable: true,
  preparationTimeMinutes: undefined, sortOrder: 0,
});

export default function MenuPage() {
  const { restaurantId } = useAuth();
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [activeCategory, setActiveCategory] = useState("all");
  const [showCatModal, setShowCatModal] = useState(false);
  const [showItemModal, setShowItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [editingCat, setEditingCat] = useState<MenuCategory | null>(null);
  const [catName, setCatName] = useState("");
  const [itemForm, setItemForm] = useState(emptyItem());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!restaurantId) return;
    const u1 = menuService.subscribeCategories(restaurantId, setCategories);
    const u2 = menuService.subscribeItems(restaurantId, setItems);
    return () => { u1(); u2(); };
  }, [restaurantId]);

  const filteredItems = activeCategory === "all" ? items : items.filter((i) => i.categoryId === activeCategory);

  const openAddItem = () => {
    setEditingItem(null);
    setItemForm({ ...emptyItem(), restaurantId: restaurantId!, categoryId: categories[0]?.id ?? "" });
    setShowItemModal(true);
  };

  const openEditItem = (item: MenuItem) => { setEditingItem(item); setItemForm({ ...item }); setShowItemModal(true); };

  const saveItem = async () => {
    if (!restaurantId || !itemForm.name || !itemForm.price) return;
    setSaving(true);
    try {
      if (editingItem) { await menuService.updateItem(restaurantId, editingItem.id, itemForm); toast.success("Item updated"); }
      else { await menuService.createItem(restaurantId, { ...itemForm, restaurantId }); toast.success("Item added"); }
      setShowItemModal(false);
    } catch { toast.error("Failed to save item"); }
    finally { setSaving(false); }
  };

  const deleteItem = async (item: MenuItem) => {
    if (!restaurantId || !confirm(`Delete "${item.name}"?`)) return;
    await menuService.deleteItem(restaurantId, item.id);
    toast.success("Item deleted");
  };

  const toggleAvailability = async (item: MenuItem) => {
    if (!restaurantId) return;
    await menuService.updateItem(restaurantId, item.id, { isAvailable: !item.isAvailable });
  };

  const saveCat = async () => {
    if (!restaurantId || !catName) return;
    setSaving(true);
    try {
      if (editingCat) { await menuService.updateCategory(restaurantId, editingCat.id, { name: catName }); toast.success("Category updated"); }
      else { await menuService.createCategory(restaurantId, { restaurantId, name: catName, isActive: true, sortOrder: categories.length }); toast.success("Category added"); }
      setShowCatModal(false); setCatName(""); setEditingCat(null);
    } finally { setSaving(false); }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Menu</h1>
          <p className="text-gray-400 text-sm mt-0.5">{items.length} items · {categories.length} categories</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { setEditingCat(null); setCatName(""); setShowCatModal(true); }}
            className="flex items-center gap-2 bg-white border border-gray-200 hover:border-gray-300 text-gray-700 font-semibold text-sm px-4 py-2.5 rounded-xl transition-all"
          >
            <Plus className="h-4 w-4" /> Category
          </button>
          <button
            onClick={openAddItem}
            className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm px-4 py-2.5 rounded-xl shadow-sm shadow-orange-200 transition-all"
          >
            <Plus className="h-4 w-4" /> Add Item
          </button>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        <button
          onClick={() => setActiveCategory("all")}
          className={cn(
            "shrink-0 rounded-full px-4 py-2 text-sm font-semibold border transition-all",
            activeCategory === "all" ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-500 border-gray-200 hover:border-gray-300"
          )}
        >
          All <span className="ml-1 opacity-60">{items.length}</span>
        </button>
        {categories.map((cat) => {
          const count = items.filter((i) => i.categoryId === cat.id).length;
          const active = activeCategory === cat.id;
          return (
            <div key={cat.id} className={cn(
              "shrink-0 flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold border cursor-pointer transition-all",
              active ? "bg-orange-500 text-white border-orange-500" : "bg-white text-gray-500 border-gray-200 hover:border-gray-300"
            )} onClick={() => setActiveCategory(cat.id)}>
              {cat.name} <span className="opacity-70">{count}</span>
              <button
                onClick={(e) => { e.stopPropagation(); setEditingCat(cat); setCatName(cat.name); setShowCatModal(true); }}
                className={cn("rounded-full p-0.5 transition-colors", active ? "hover:bg-white/20" : "hover:bg-gray-100")}
              >
                <Edit2 className="h-3 w-3" />
              </button>
            </div>
          );
        })}
      </div>

      {/* Items Grid */}
      {filteredItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-dashed border-gray-200">
          <UtensilsCrossed className="h-10 w-10 text-gray-200 mb-3" />
          <p className="font-semibold text-gray-400">No items here</p>
          <p className="text-sm text-gray-300 mt-1">Add your first menu item</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredItems.map((item) => (
            <div key={item.id} className={cn("bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col hover:shadow-md transition-shadow", !item.isAvailable && "opacity-60")}>
              {/* Image */}
              {item.imageUrl ? (
                <img src={item.imageUrl} alt={item.name} className="w-full h-36 object-cover" />
              ) : (
                <div className="w-full h-36 bg-gray-50 flex items-center justify-center">
                  <ImageOff className="h-8 w-8 text-gray-200" />
                </div>
              )}

              <div className="p-4 flex flex-col flex-1 gap-3">
                {/* Name + veg */}
                <div className="flex items-start gap-2">
                  {item.isVeg !== undefined && (
                    <span className={cn("mt-0.5 shrink-0 h-4 w-4 rounded-sm border-2 flex items-center justify-center", item.isVeg ? "border-green-600" : "border-red-500")}>
                      <span className={cn("h-2 w-2 rounded-full", item.isVeg ? "bg-green-600" : "bg-red-500")} />
                    </span>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-900 text-sm leading-tight">{item.name}</p>
                    {item.description && <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{item.description}</p>}
                  </div>
                </div>

                {/* Price + prep time */}
                <div className="flex items-center justify-between">
                  <p className="font-black text-gray-900">{formatCurrency(item.price)}</p>
                  {item.preparationTimeMinutes && (
                    <span className="text-[11px] text-gray-400 bg-gray-50 border border-gray-100 rounded-full px-2 py-0.5">
                      ~{item.preparationTimeMinutes}m
                    </span>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-2 border-t border-gray-100 mt-auto">
                  <button
                    onClick={() => toggleAvailability(item)}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-1.5 rounded-xl py-1.5 text-xs font-bold border transition-all",
                      item.isAvailable
                        ? "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100"
                        : "bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100"
                    )}
                  >
                    <span className={cn("h-1.5 w-1.5 rounded-full", item.isAvailable ? "bg-emerald-500" : "bg-gray-400")} />
                    {item.isAvailable ? "Available" : "Off"}
                  </button>
                  <button onClick={() => openEditItem(item)} className="p-2 rounded-xl hover:bg-blue-50 hover:text-blue-600 text-gray-400 border border-transparent hover:border-blue-100 transition-all">
                    <Edit2 className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => deleteItem(item)} className="p-2 rounded-xl hover:bg-red-50 hover:text-red-500 text-gray-400 border border-transparent hover:border-red-100 transition-all">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Category Modal */}
      <Modal open={showCatModal} onClose={() => setShowCatModal(false)} title={editingCat ? "Edit Category" : "Add Category"}>
        <div className="space-y-4">
          <div>
            <Label>Category Name</Label>
            <Input value={catName} onChange={(e) => setCatName(e.target.value)} className="mt-1" autoFocus />
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => setShowCatModal(false)}>Cancel</Button>
            <Button className="flex-1" onClick={saveCat} disabled={saving || !catName}>Save</Button>
          </div>
        </div>
      </Modal>

      {/* Item Modal */}
      <Modal open={showItemModal} onClose={() => setShowItemModal(false)} title={editingItem ? "Edit Item" : "Add Menu Item"}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label>Name *</Label>
              <Input value={itemForm.name} onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })} className="mt-1" autoFocus />
            </div>
            <div>
              <Label>Price (₹) *</Label>
              <Input type="number" value={itemForm.price} onChange={(e) => setItemForm({ ...itemForm, price: parseFloat(e.target.value) })} className="mt-1" />
            </div>
            <div>
              <Label>Category</Label>
              <select
                value={itemForm.categoryId}
                onChange={(e) => setItemForm({ ...itemForm, categoryId: e.target.value })}
                className="mt-1 flex h-10 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <Label>Description</Label>
              <Textarea value={itemForm.description ?? ""} onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })} className="mt-1" rows={2} />
            </div>
            <div className="col-span-2">
              <Label>Image URL</Label>
              <Input value={itemForm.imageUrl ?? ""} onChange={(e) => setItemForm({ ...itemForm, imageUrl: e.target.value })} className="mt-1" placeholder="https://..." />
            </div>
            <div>
              <Label>Prep Time (min)</Label>
              <Input type="number" value={itemForm.preparationTimeMinutes ?? ""} onChange={(e) => setItemForm({ ...itemForm, preparationTimeMinutes: parseInt(e.target.value) || undefined })} className="mt-1" />
            </div>
            <div>
              <Label>Type</Label>
              <select
                value={itemForm.isVeg === undefined ? "na" : itemForm.isVeg ? "veg" : "nonveg"}
                onChange={(e) => setItemForm({ ...itemForm, isVeg: e.target.value === "na" ? undefined : e.target.value === "veg" })}
                className="mt-1 flex h-10 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="na">Not specified</option>
                <option value="veg">🟢 Vegetarian</option>
                <option value="nonveg">🔴 Non-Vegetarian</option>
              </select>
            </div>
          </div>
          <div className="flex gap-3 pt-1">
            <Button variant="outline" className="flex-1" onClick={() => setShowItemModal(false)}>Cancel</Button>
            <Button className="flex-1" onClick={saveItem} disabled={saving || !itemForm.name || !itemForm.price}>
              {saving ? "Saving…" : "Save Item"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
