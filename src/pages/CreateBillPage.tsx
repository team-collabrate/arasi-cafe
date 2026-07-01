import { useState, useMemo, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import { ArrowLeft, Search, Plus, X, ChevronDown, Receipt, Camera } from "lucide-react";
import QuantityCounter from "../app/components/QuantityCounter";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { formatCurrency } from "../lib/utils";
import { toast } from "sonner";
import type { Doc, Id } from "../convex/_generated/dataModel";

type BillItem = {
  productId: Id<"products">;
  name: string;
  qty: number;
  price: number;
  cost: number;
  uom?: string;
  cgst: number;
  sgst: number;
};

function calcLineTotal(item: BillItem): number {
  const sub = item.qty * item.price;
  return sub + sub * ((item.cgst + item.sgst) / 100);
}

export default function CreateBillPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const vendors = useQuery(api.vendors.getVendors) ?? [];
  const products = useQuery(api.products.getProducts) ?? [];
  const createTransaction = useMutation(api.transactions.createTransaction);

  const preselectedId = searchParams.get("customerId") || "";
  const [customerId, setCustomerId] = useState(preselectedId);
  const [customerSearch, setCustomerSearch] = useState("");
  const [showCustomers, setShowCustomers] = useState(!preselectedId);
  const [productSearch, setProductSearch] = useState("");
  const [showProducts, setShowProducts] = useState(false);
  const [items, setItems] = useState<BillItem[]>([]);
  const [notes, setNotes] = useState("");

  const selectedVendor = useMemo(() => vendors.find((v) => v._id === customerId), [vendors, customerId]);

  const filteredCustomers = useMemo(() =>
    vendors.filter((v) => v.name.toLowerCase().includes(customerSearch.toLowerCase()) || v.phone.includes(customerSearch)),
    [vendors, customerSearch]
  );

  const filteredProducts = useMemo(() =>
    products.filter((p) => p.name.toLowerCase().includes(productSearch.toLowerCase())),
    [products, productSearch]
  );

  const grandTotal = useMemo(() => items.reduce((s, item) => s + calcLineTotal(item), 0), [items]);
  const totalTax = useMemo(() => items.reduce((s, item) => {
    const sub = item.qty * item.price;
    return s + sub * ((item.cgst + item.sgst) / 100);
  }, 0), [items]);
  const subtotal = grandTotal - totalTax;

  const addProduct = (p: Doc<"products">) => {
    const existing = items.findIndex((i) => i.productId === p._id);
    if (existing >= 0) {
      setItems((prev) => prev.map((item, idx) => idx === existing ? { ...item, qty: item.qty + 1 } : item));
    } else {
      setItems((prev) => [...prev, {
        productId: p._id,
        name: p.name,
        qty: p.defaultQty || 1,
        price: p.defaultPrice,
        cost: p.purchasePrice,
        uom: p.uom,
        cgst: p.cgst,
        sgst: p.sgst,
      }]);
    }
    setShowProducts(false);
    setProductSearch("");
  };

  const updateQty = (idx: number, delta: number) => {
    setItems((prev) => prev.map((item, i) => i === idx ? { ...item, qty: Math.max(0, item.qty + delta) } : item));
  };

  const updatePrice = (idx: number, val: string) => {
    const price = parseFloat(val) || 0;
    setItems((prev) => prev.map((item, i) => i === idx ? { ...item, price } : item));
  };

  const removeItem = (idx: number) => {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSave = async (withWhatsApp = false) => {
    if (!customerId) { toast.error("Please select a customer"); return; }
    if (items.length === 0) { toast.error("Add at least one product"); return; }

    const profit = items.reduce((s, item) => s + (item.price - item.cost) * item.qty, 0);
    await createTransaction({
      type: "bill",
      vendorId: customerId as Id<"vendors">,
      vendorName: selectedVendor!.name,
      amount: Math.round(grandTotal),
      profit: Math.round(profit),
      date: new Date().toISOString(),
      notes: notes.trim() || undefined,
      items: items.map((item) => ({
        productId: item.productId,
        name: item.name,
        qty: item.qty,
        price: item.price,
        cost: item.cost,
        uom: item.uom,
        cgst: item.cgst,
        sgst: item.sgst,
        profit: (item.price - item.cost) * item.qty,
      })),
    });
    toast.success("Bill created!");

    if (withWhatsApp && selectedVendor) {
      const itemLines = items.map((i) => `  • ${i.name} x${i.qty} ${i.uom || ""} @ ₹${i.price} = ₹${(i.qty * i.price).toFixed(0)}`).join("\n");
      const msg = encodeURIComponent(`*Arasi - Bill*\n\nCustomer: ${selectedVendor.name}\nDate: ${new Date().toLocaleDateString("en-IN")}\n\n${itemLines}\n\nSubtotal: ₹${subtotal.toFixed(0)}\nTax: ₹${totalTax.toFixed(0)}\n*Total: ₹${grandTotal.toFixed(0)}*\n\nThank you! 🙏`);
      window.open(`https://wa.me/91${selectedVendor.phone}?text=${msg}`, "_blank");
    }
    navigate("/bills");
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="pb-48">
      <div className="px-5 pt-12 pb-4 bg-white sticky top-0 z-10 border-b border-[#EDE0DB]">
        <div className="flex items-center gap-3 mb-1">
          <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-xl bg-white border border-[#EDE0DB] flex items-center justify-center shadow-sm">
            <ArrowLeft size={18} className="text-[#1A0A0C]" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-[#1A0A0C]">Create Bill</h1>
            <p className="text-xs text-[#6B4C4F]">{items.length} items · {formatCurrency(grandTotal)}</p>
          </div>
        </div>
      </div>

      <div className="px-5 pt-4 space-y-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[#6B4C4F] mb-2">Customer *</p>
          {selectedVendor ? (
            <button
              onClick={() => { setShowCustomers(true); setCustomerId(""); }}
              className="w-full flex items-center gap-3 bg-[#FFF8F4] border border-[#8B1E24]/20 rounded-xl px-4 py-3"
            >
              <div className="w-9 h-9 rounded-lg bg-[#8B1E24]/10 flex items-center justify-center font-bold text-[#8B1E24] text-sm">
                {selectedVendor.avatar}
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-semibold text-[#1A0A0C]">{selectedVendor.name}</p>
                <p className="text-xs text-[#6B4C4F]">{selectedVendor.phone}</p>
              </div>
              <ChevronDown size={16} className="text-[#6B4C4F]" />
            </button>
          ) : (
            <div>
              <div className="flex items-center gap-2 bg-[#F9F6F2] rounded-xl px-3.5 py-2.5 border border-[#EDE0DB]">
                <Search size={15} className="text-[#6B4C4F]" />
                <input
                  value={customerSearch}
                  onChange={(e) => { setCustomerSearch(e.target.value); setShowCustomers(true); }}
                  onFocus={() => setShowCustomers(true)}
                  placeholder="Search customers..."
                  className="flex-1 bg-transparent text-sm outline-none placeholder:text-[#6B4C4F]/50"
                  autoFocus
                />
              </div>
              {showCustomers && (
                <div className="mt-1 bg-white border border-[#EDE0DB] rounded-xl shadow-lg overflow-hidden max-h-48 overflow-y-auto">
                  {filteredCustomers.map((v) => (
                    <button
                      key={v._id}
                      onClick={() => { setCustomerId(v._id); setShowCustomers(false); setCustomerSearch(""); }}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#FFF8F4] transition-colors border-b border-[#EDE0DB] last:border-0"
                    >
                      <div className="w-8 h-8 rounded-lg bg-[#FFF8F4] flex items-center justify-center font-bold text-[#8B1E24] text-xs">
                        {v.avatar}
                      </div>
                      <div className="flex-1 text-left">
                        <p className="text-sm font-semibold text-[#1A0A0C]">{v.name}</p>
                        <p className="text-xs text-[#6B4C4F]">{v.phone}</p>
                      </div>
                      {v.dueAmount > 0 && <span className="text-xs text-[#8B1E24] font-semibold">{formatCurrency(v.dueAmount)} due</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#6B4C4F]">Items *</p>
            <motion.button
              whileTap={{ scale: 0.93 }}
              onClick={() => setShowProducts(true)}
              className="flex items-center gap-1.5 bg-[#8B1E24] text-white rounded-lg px-3 py-1.5 text-xs font-semibold"
            >
              <Plus size={13} /> Add Product
            </motion.button>
          </div>

          <AnimatePresence>
            {showProducts && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="mb-3"
              >
                <div className="flex items-center gap-2 bg-[#F9F6F2] rounded-xl px-3.5 py-2.5 border border-[#8B1E24]/30 mb-1">
                  <Search size={15} className="text-[#6B4C4F]" />
                  <input
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    placeholder="Search products..."
                    className="flex-1 bg-transparent text-sm outline-none placeholder:text-[#6B4C4F]/50"
                    autoFocus
                  />
                  <button onClick={() => { setShowProducts(false); setProductSearch(""); }}>
                    <X size={15} className="text-[#6B4C4F]" />
                  </button>
                </div>
                <div className="bg-white border border-[#EDE0DB] rounded-xl shadow-lg overflow-hidden max-h-52 overflow-y-auto">
                  {filteredProducts.map((p) => (
                    <button
                      key={p._id}
                      onClick={() => addProduct(p)}
                      className="w-full flex items-center justify-between px-4 py-3 hover:bg-[#FFF8F4] transition-colors border-b border-[#EDE0DB] last:border-0"
                    >
                      <div className="text-left">
                        <p className="text-sm font-semibold text-[#1A0A0C]">{p.name}</p>
                        <p className="text-xs text-[#6B4C4F]">{p.uom} · {p.type === "A" ? "Meat" : "Dairy"}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-[#8B1E24]">{formatCurrency(p.defaultPrice)}</p>
                        <p className="text-xs text-[#6B4C4F]">Tax: {p.cgst + p.sgst}%</p>
                      </div>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="space-y-2.5">
            {items.length === 0 ? (
              <div className="text-center py-8 bg-[#F9F6F2] rounded-xl border border-dashed border-[#EDE0DB]">
                <Receipt size={24} className="text-[#6B4C4F]/40 mx-auto mb-2" />
                <p className="text-xs text-[#6B4C4F]">No items added yet</p>
              </div>
            ) : (
              items.map((item, idx) => (
                <motion.div
                  key={`${item.productId}-${idx}`}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 12 }}
                  className="bg-white border border-[#EDE0DB] rounded-2xl p-3.5 shadow-sm"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="text-sm font-bold text-[#1A0A0C]">{item.name}</p>
                      <p className="text-xs text-[#6B4C4F]">{item.uom} · Tax {item.cgst + item.sgst}%</p>
                    </div>
                    <button onClick={() => removeItem(idx)} className="w-7 h-7 rounded-lg bg-red-50 flex items-center justify-center ml-2">
                      <X size={13} className="text-red-500" />
                    </button>
                  </div>
                  <div className="flex items-center gap-3">
                    <QuantityCounter
                      value={item.qty}
                      onDecrement={() => updateQty(idx, -1)}
                      onIncrement={() => updateQty(idx, 1)}
                      onChange={(v) => {
                        if (isNaN(v)) return;
                        setItems((prev) => prev.map((item, i) =>
                          i === idx ? { ...item, qty: Math.max(0, v) } : item
                        ));
                      }}
                    />
                    <div className="flex items-center gap-1.5 bg-[#F9F6F2] border border-[#EDE0DB] rounded-lg px-2.5 py-1.5 flex-1">
                      <span className="text-sm text-[#6B4C4F]">₹</span>
                      <input
                        type="number"
                        value={item.price}
                        onChange={(e) => updatePrice(idx, e.target.value)}
                        className="w-full bg-transparent text-sm font-bold text-[#1A0A0C] outline-none"
                      />
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-[#8B1E24]">{formatCurrency(calcLineTotal(item))}</p>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[#6B4C4F] mb-2">Notes</p>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional bill notes..."
            rows={2}
            className="w-full bg-[#F9F6F2] border border-[#EDE0DB] rounded-xl px-4 py-3 text-sm text-[#1A0A0C] placeholder:text-[#6B4C4F]/50 outline-none focus:border-[#8B1E24] resize-none"
          />
        </div>

        <button className="w-full flex items-center gap-3 bg-[#F9F6F2] border border-dashed border-[#EDE0DB] rounded-xl px-4 py-3 hover:border-[#8B1E24] transition-colors">
          <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center border border-[#EDE0DB]">
            <Camera size={16} className="text-[#6B4C4F]" />
          </div>
          <p className="text-sm text-[#6B4C4F] font-medium">Attach bill image / photo</p>
        </button>
      </div>

      {items.length > 0 && (
        <motion.div
          initial={{ y: 100 }}
          animate={{ y: 0 }}
          className="fixed bottom-0 left-0 right-0 flex justify-center"
        >
          <div className="w-full max-w-[430px] bg-white border-t border-[#EDE0DB] px-5 py-4 shadow-2xl">
            <div className="flex justify-between items-center mb-1">
              <p className="text-xs text-[#6B4C4F]">Subtotal</p>
              <p className="text-xs text-[#6B4C4F] font-medium">{formatCurrency(subtotal)}</p>
            </div>
            {totalTax > 0 && (
              <div className="flex justify-between items-center mb-1">
                <p className="text-xs text-[#6B4C4F]">Tax (GST)</p>
                <p className="text-xs text-[#6B4C4F] font-medium">{formatCurrency(totalTax)}</p>
              </div>
            )}
            <div className="flex justify-between items-center mb-4 pt-2 border-t border-[#EDE0DB]">
              <p className="text-base font-bold text-[#1A0A0C]">Grand Total</p>
              <p className="text-lg font-bold text-[#8B1E24]">{formatCurrency(grandTotal)}</p>
            </div>
            <div className="flex gap-2.5">
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => handleSave(false)}
                className="flex-1 bg-[#8B1E24] text-white rounded-xl py-3.5 text-sm font-bold shadow-sm"
              >
                Save Bill
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => handleSave(true)}
                className="flex-1 bg-[#16A34A] text-white rounded-xl py-3.5 text-sm font-bold shadow-sm"
              >
                Save & WhatsApp
              </motion.button>
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
