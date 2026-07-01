import { useMemo } from "react";
import { useParams, useNavigate } from "react-router";
import { motion } from "motion/react";
import { ArrowLeft, CreditCard, Share2, Printer, Trash2, User, Calendar, FileText } from "lucide-react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { formatCurrency, formatDate } from "../lib/utils";
import { toast } from "sonner";

export default function BillDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const transactions = useQuery(api.transactions.getTransactions) ?? [];
  const vendors = useQuery(api.vendors.getVendors) ?? [];
  const deleteTransaction = useMutation(api.transactions.deleteTransaction);

  const tx = useMemo(() => transactions.find((t) => t._id === id), [transactions, id]);
  const vendor = useMemo(() => tx ? vendors.find((v) => v._id === tx.vendorId) : null, [vendors, tx]);

  if (!tx || tx.type !== "bill") {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        <p className="text-[#6B4C4F]">Bill not found</p>
        <button onClick={() => navigate(-1)} className="text-[#8B1E24] font-semibold">Go back</button>
      </div>
    );
  }

  const subtotal = (tx.items || []).reduce((s, i) => s + i.qty * i.price, 0);
  const totalTax = (tx.items || []).reduce((s, i) => {
    const sub = i.qty * i.price;
    return s + sub * ((i.cgst + i.sgst) / 100);
  }, 0);

  const handleDelete = async () => {
    if (confirm("Delete this bill?")) {
      await deleteTransaction({ id: tx._id });
      toast.error("Bill deleted");
      navigate(-1);
    }
  };

  const shareWhatsApp = () => {
    if (!vendor) return;
    const itemLines = (tx.items || []).map((i) => `  • ${i.name} x${i.qty} ${i.uom || ""} = ₹${(i.qty * i.price).toFixed(0)}`).join("\n");
    const msg = encodeURIComponent(`*Arasi - Bill*\n\nCustomer: ${vendor.name}\nDate: ${formatDate(tx.date)}\n\n${itemLines}\n\nSubtotal: ₹${subtotal.toFixed(0)}\nTax: ₹${totalTax.toFixed(0)}\n*Total: ₹${tx.amount}*\n\n${tx.notes ? `Note: ${tx.notes}\n\n` : ""}Thank you! 🙏`);
    window.open(`https://wa.me/91${vendor?.phone}?text=${msg}`, "_blank");
  };

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="pb-8">
      <div className="px-5 pt-12 pb-5 bg-gradient-to-b from-[#FFF8F4] to-white border-b border-[#EDE0DB]">
        <div className="flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-xl bg-white border border-[#EDE0DB] flex items-center justify-center shadow-sm">
            <ArrowLeft size={18} className="text-[#1A0A0C]" />
          </button>
          <h1 className="text-base font-bold text-[#1A0A0C]">Bill Details</h1>
          <button onClick={handleDelete} className="w-9 h-9 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center">
            <Trash2 size={16} className="text-red-500" />
          </button>
        </div>
      </div>

      <div className="px-5 pt-5 space-y-4">
        <div className="bg-[#8B1E24] rounded-2xl p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold text-white/60 uppercase tracking-wider">Bill Amount</p>
              <p className="text-3xl font-bold text-white mt-1">{formatCurrency(tx.amount)}</p>
            </div>
            <span className={`text-xs font-bold px-3 py-1.5 rounded-full ${vendor && vendor.dueAmount > 0 ? "bg-white/15 text-white" : "bg-white/20 text-white"}`}>
              {vendor && vendor.dueAmount > 0 ? "Outstanding" : "Settled"}
            </span>
          </div>
          {tx.profit > 0 && (
            <p className="text-xs text-white/50 mt-2">Profit: {formatCurrency(tx.profit)}</p>
          )}
        </div>

        <div className="bg-white border border-[#EDE0DB] rounded-2xl shadow-sm overflow-hidden">
          <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[#EDE0DB]">
            <div className="w-8 h-8 rounded-lg bg-[#FFF8F4] flex items-center justify-center">
              <User size={15} className="text-[#8B1E24]" />
            </div>
            <div>
              <p className="text-xs text-[#6B4C4F]">Customer</p>
              <p className="text-sm font-semibold text-[#1A0A0C]">{tx.vendorName}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[#EDE0DB]">
            <div className="w-8 h-8 rounded-lg bg-[#FFF8F4] flex items-center justify-center">
              <Calendar size={15} className="text-[#8B1E24]" />
            </div>
            <div>
              <p className="text-xs text-[#6B4C4F]">Date</p>
              <p className="text-sm font-semibold text-[#1A0A0C]">{formatDate(tx.date)}</p>
            </div>
          </div>
          {tx.notes && (
            <div className="flex items-center gap-3 px-4 py-3.5">
              <div className="w-8 h-8 rounded-lg bg-[#FFF8F4] flex items-center justify-center">
                <FileText size={15} className="text-[#8B1E24]" />
              </div>
              <div>
                <p className="text-xs text-[#6B4C4F]">Notes</p>
                <p className="text-sm text-[#1A0A0C]">{tx.notes}</p>
              </div>
            </div>
          )}
        </div>

        {tx.items && tx.items.length > 0 && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[#6B4C4F] mb-2">Items</p>
            <div className="bg-white border border-[#EDE0DB] rounded-2xl shadow-sm overflow-hidden">
              <div className="flex items-center px-4 py-2.5 bg-[#F9F6F2] border-b border-[#EDE0DB]">
                <p className="flex-1 text-xs font-bold text-[#6B4C4F] uppercase tracking-wider">Product</p>
                <p className="w-10 text-xs font-bold text-[#6B4C4F] text-center">Qty</p>
                <p className="w-16 text-xs font-bold text-[#6B4C4F] text-right">Price</p>
                <p className="w-20 text-xs font-bold text-[#6B4C4F] text-right">Total</p>
              </div>
              {tx.items.map((item, i) => {
                const lineSub = item.qty * item.price;
                const lineTax = lineSub * ((item.cgst + item.sgst) / 100);
                return (
                  <div key={i} className={`flex items-center px-4 py-3.5 ${i < tx.items!.length - 1 ? "border-b border-[#EDE0DB]" : ""}`}>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[#1A0A0C] truncate">{item.name}</p>
                      {(item.cgst || item.sgst) ? (
                        <p className="text-xs text-[#6B4C4F]">GST {item.cgst + item.sgst}% = ₹{lineTax.toFixed(0)}</p>
                      ) : (
                        <p className="text-xs text-[#6B4C4F]">{item.uom}</p>
                      )}
                    </div>
                    <p className="w-10 text-xs font-semibold text-[#1A0A0C] text-center">{item.qty}{item.uom ? ` ${item.uom}` : ""}</p>
                    <p className="w-16 text-xs text-[#1A0A0C] text-right">₹{item.price}</p>
                    <p className="w-20 text-sm font-bold text-[#8B1E24] text-right">₹{(lineSub + lineTax).toFixed(0)}</p>
                  </div>
                );
              })}
              <div className="border-t border-[#EDE0DB] px-4 py-3 bg-[#F9F6F2]">
                <div className="flex justify-between text-xs text-[#6B4C4F] mb-1">
                  <span>Subtotal</span><span>₹{subtotal.toFixed(0)}</span>
                </div>
                {totalTax > 0 && (
                  <div className="flex justify-between text-xs text-[#6B4C4F] mb-1">
                    <span>Tax (GST)</span><span>₹{totalTax.toFixed(0)}</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-bold text-[#1A0A0C] pt-2 border-t border-[#EDE0DB]">
                  <span>Grand Total</span><span className="text-[#8B1E24]">{formatCurrency(tx.amount)}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-2.5">
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={() => navigate(`/payments/new?customerId=${tx.vendorId}`)}
            className="flex-1 flex items-center justify-center gap-2 bg-[#8B1E24] text-white rounded-xl py-3.5 text-sm font-bold shadow-sm"
          >
            <CreditCard size={16} /> Record Payment
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={shareWhatsApp}
            className="w-12 flex items-center justify-center bg-white border border-[#EDE0DB] rounded-xl shadow-sm"
          >
            <Share2 size={16} className="text-[#16A34A]" />
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={() => navigate(`/receipts/${tx._id}`)}
            className="w-12 flex items-center justify-center bg-white border border-[#EDE0DB] rounded-xl shadow-sm"
          >
            <Printer size={16} className="text-[#6B4C4F]" />
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}
