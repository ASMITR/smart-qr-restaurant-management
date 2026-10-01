"use client";
export const dynamic = "force-dynamic";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { tableService } from "@/services/tableService";
import { Table } from "@/types";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { StatusBadge } from "@/components/ui/badge";
import { generateQRDataUrl, printQR, getTableUrl } from "@/lib/qr";
import { Plus, QrCode, Download, Printer, RefreshCw, Trash2, AlertTriangle, Users, CheckCircle, Clock, Sparkles } from "lucide-react";
import { cn } from "@/utils";
import { toast } from "sonner";

const STATUS_META: Record<string, { label: string; border: string; bg: string; text: string; icon: React.ElementType }> = {
  AVAILABLE:       { label: "Available",       border: "border-emerald-200", bg: "bg-emerald-50",  text: "text-emerald-700", icon: CheckCircle },
  OCCUPIED:        { label: "Occupied",         border: "border-orange-200",  bg: "bg-orange-50",   text: "text-orange-700",  icon: Users },
  PAYMENT_PENDING: { label: "Payment Pending",  border: "border-red-200",     bg: "bg-red-50",      text: "text-red-700",     icon: Clock },
  CLEANING:        { label: "Cleaning",         border: "border-blue-200",    bg: "bg-blue-50",     text: "text-blue-700",    icon: Sparkles },
};

export default function TablesPage() {
  const { restaurantId } = useAuth();
  const [tables, setTables] = useState<Table[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [showQR, setShowQR] = useState<Table | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [tableNumber, setTableNumber] = useState("");
  const [capacity, setCapacity] = useState("");
  const [adding, setAdding] = useState(false);
  const [restaurantName] = useState("Restaurant");

  useEffect(() => {
    if (!restaurantId) return;
    return tableService.subscribe(restaurantId, setTables);
  }, [restaurantId]);

  const openQR = async (table: Table) => {
    setShowQR(table);
    const url = await generateQRDataUrl(table.qrToken);
    setQrDataUrl(url);
  };

  const addTable = async () => {
    if (!tableNumber || !restaurantId) return;
    setAdding(true);
    try {
      await tableService.create(restaurantId, parseInt(tableNumber), capacity ? parseInt(capacity) : undefined);
      setShowAdd(false); setTableNumber(""); setCapacity("");
      toast.success("Table created");
    } catch { toast.error("Failed to create table"); }
    finally { setAdding(false); }
  };

  const regenerateQR = async (table: Table) => {
    if (!restaurantId || !confirm("Regenerate QR? The old QR code will become invalid.")) return;
    try {
      await tableService.regenerateQR(restaurantId, table.id, table.qrToken);
      toast.success("QR regenerated"); setShowQR(null);
    } catch { toast.error("Failed to regenerate QR"); }
  };

  const deleteTable = async (table: Table) => {
    if (!restaurantId || !confirm(`Delete Table ${table.tableNumber}? This cannot be undone.`)) return;
    try { await tableService.delete(restaurantId, table.id, table.qrToken); toast.success("Table deleted"); }
    catch { toast.error("Failed to delete table"); }
  };

  const releaseTable = async (table: Table) => {
    if (!restaurantId || !confirm(`Manually release Table ${table.tableNumber}?`)) return;
    try { await tableService.updateStatus(restaurantId, table.id, "AVAILABLE", null); toast.success("Table released"); }
    catch { toast.error("Failed to release table"); }
  };

  const counts = Object.fromEntries(
    Object.keys(STATUS_META).map((s) => [s, tables.filter((t) => t.status === s).length])
  );

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Tables</h1>
          <p className="text-gray-400 text-sm mt-0.5">{tables.length} tables configured</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm px-4 py-2.5 rounded-xl shadow-sm shadow-orange-200 transition-all"
        >
          <Plus className="h-4 w-4" /> Add Table
        </button>
      </div>

      {/* Status summary strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Object.entries(STATUS_META).map(([status, meta]) => {
          const Icon = meta.icon;
          return (
            <div key={status} className={cn("rounded-2xl border p-4 flex items-center gap-3", meta.bg, meta.border)}>
              <Icon className={cn("h-5 w-5 shrink-0", meta.text)} />
              <div>
                <p className={cn("text-2xl font-black leading-none", meta.text)}>{counts[status] ?? 0}</p>
                <p className="text-[11px] text-gray-500 mt-0.5">{meta.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Table Grid */}
      {tables.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center bg-white rounded-2xl border border-dashed border-gray-200">
          <div className="h-14 w-14 rounded-2xl bg-gray-100 flex items-center justify-center mb-3">
            <Users className="h-7 w-7 text-gray-300" />
          </div>
          <p className="font-semibold text-gray-500">No tables yet</p>
          <p className="text-sm text-gray-400 mt-1">Add your first table to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {tables.map((table) => {
            const meta = STATUS_META[table.status] ?? STATUS_META.AVAILABLE;
            const Icon = meta.icon;
            return (
              <div key={table.id} className={cn("rounded-2xl border-2 p-4 flex flex-col gap-3 bg-white shadow-sm hover:shadow-md transition-shadow", meta.border)}>
                {/* Top */}
                <div className="flex items-start justify-between">
                  <div className={cn("h-11 w-11 rounded-xl flex items-center justify-center font-black text-lg border", meta.bg, meta.border, meta.text)}>
                    {table.tableNumber}
                  </div>
                  <StatusBadge status={table.status} />
                </div>

                {/* Info */}
                <div>
                  <p className="font-bold text-gray-900 text-sm">Table {table.tableNumber}</p>
                  {table.capacity && (
                    <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                      <Users className="h-3 w-3" /> {table.capacity} seats
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-1.5 pt-1 border-t border-gray-100">
                  <button
                    onClick={() => openQR(table)}
                    className="flex items-center gap-1 rounded-lg bg-gray-50 border border-gray-200 hover:bg-orange-50 hover:border-orange-200 hover:text-orange-600 px-2.5 py-1.5 text-xs font-semibold text-gray-600 transition-all"
                  >
                    <QrCode className="h-3 w-3" /> QR
                  </button>
                  {(table.status === "OCCUPIED" || table.status === "PAYMENT_PENDING") && (
                    <button
                      onClick={() => releaseTable(table)}
                      className="flex items-center gap-1 rounded-lg bg-red-50 border border-red-200 px-2.5 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100 transition-all"
                    >
                      <AlertTriangle className="h-3 w-3" /> Release
                    </button>
                  )}
                  <button
                    onClick={() => deleteTable(table)}
                    className="ml-auto flex items-center gap-1 rounded-lg bg-gray-50 border border-gray-200 hover:bg-red-50 hover:border-red-200 hover:text-red-500 px-2.5 py-1.5 text-xs font-semibold text-gray-400 transition-all"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Table Modal */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add New Table">
        <div className="space-y-4">
          <div>
            <Label>Table Number *</Label>
            <Input type="number" placeholder="e.g. 12" value={tableNumber} onChange={(e) => setTableNumber(e.target.value)} className="mt-1" autoFocus />
          </div>
          <div>
            <Label>Seating Capacity (optional)</Label>
            <Input type="number" placeholder="e.g. 4" value={capacity} onChange={(e) => setCapacity(e.target.value)} className="mt-1" />
          </div>
          <div className="flex gap-3 pt-1">
            <Button variant="outline" className="flex-1" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button className="flex-1" onClick={addTable} disabled={adding || !tableNumber}>
              {adding ? "Creating…" : "Create Table"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* QR Modal */}
      <Modal open={!!showQR} onClose={() => setShowQR(null)} title={`Table ${showQR?.tableNumber} — QR Code`}>
        {showQR && (
          <div className="space-y-4">
            {qrDataUrl && (
              <div className="flex justify-center">
                <img src={qrDataUrl} alt="QR Code" className="w-52 h-52 rounded-2xl border-4 border-gray-100 shadow-sm" />
              </div>
            )}
            <p className="text-[11px] text-gray-400 text-center break-all">{getTableUrl(showQR.qrToken)}</p>
            <a href={getTableUrl(showQR.qrToken)} target="_blank" rel="noreferrer" className="block text-xs text-orange-500 hover:underline text-center font-medium">
              Open table link ↗
            </a>
            <div className="grid grid-cols-3 gap-2">
              <a
                href={qrDataUrl}
                download={`table-${showQR.tableNumber}-qr.png`}
                className="flex flex-col items-center gap-1.5 rounded-xl border border-gray-200 py-3 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-all"
              >
                <Download className="h-4 w-4" /> Download
              </a>
              <button
                onClick={() => printQR(showQR.tableNumber, restaurantName, showQR.qrToken)}
                className="flex flex-col items-center gap-1.5 rounded-xl border border-gray-200 py-3 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-all"
              >
                <Printer className="h-4 w-4" /> Print
              </button>
              <button
                onClick={() => regenerateQR(showQR)}
                className="flex flex-col items-center gap-1.5 rounded-xl border border-orange-200 py-3 text-xs font-semibold text-orange-600 hover:bg-orange-50 transition-all"
              >
                <RefreshCw className="h-4 w-4" /> Regen
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
