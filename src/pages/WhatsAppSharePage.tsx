import { useMemo } from "react";
import { useParams, useNavigate } from "react-router";
import { motion } from "motion/react";
import { ArrowLeft, Send } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { formatDate } from "../lib/utils";

export default function WhatsAppSharePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const transactions = useQuery(api.transactions.getTransactions) ?? [];
  const vendors = useQuery(api.vendors.getVendors) ?? [];

  const tx = useMemo(() => transactions.find((t) => t._id === id), [transactions, id]);
  const vendor = useMemo(() => tx ? vendors.find((v) => v._id === tx.vendorId) : null, [vendors, tx]);

  const message = useMemo(() => {
    if (!tx || !vendor) return "";
    if (tx.type === "payment") {
      return `*🏪 Arasi — Payment Receipt*\n\nDear ${vendor.name},\n\nWe acknowledge receipt of payment:\n\n💰 *Amount:* ₹${tx.amount}\n📅 *Date:* ${formatDate(tx.date)}\n💳 *Method:* ${tx.paymentMethod || "Cash"}\n${tx.notes ? `📝 *Note:* ${tx.notes}\n` : ""}\n✅ Payment recorded. Thank you!\n\n_Arasi · Fresh · Simple · Trusted_ 🙏`;
    }

    const itemLines = (tx.items || []).map((i) => `  🔸 ${i.name} — ${i.qty}${i.uom ? ` ${i.uom}` : ""} × ₹${i.price} = *₹${(i.qty * i.price).toFixed(0)}*`).join("\n");
    const subtotal = (tx.items || []).reduce((s, i) => s + i.qty * i.price, 0);
    const totalTax = (tx.items || []).reduce((s, i) => { const sub = i.qty * i.price; return s + sub * ((i.cgst + i.sgst) / 100); }, 0);

    return `*🏪 Arasi — Bill*\n\nDear ${vendor.name},\n\nYour bill dated ${formatDate(tx.date)}:\n\n${itemLines}\n\n━━━━━━━━━━━━━━━\n💰 Subtotal: ₹${subtotal.toFixed(0)}${totalTax > 0 ? `\n🧾 Tax (GST): ₹${totalTax.toFixed(0)}` : ""}\n*💵 Total: ₹${tx.amount}*\n━━━━━━━━━━━━━━━\n${tx.notes ? `📝 Note: ${tx.notes}\n\n` : "\n"}_Arasi · Fresh · Simple · Trusted_ 🙏`;
  }, [tx, vendor]);

  if (!tx || !vendor) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        <p className="text-[#6B4C4F]">Transaction not found</p>
        <button onClick={() => navigate(-1)} className="text-[#8B1E24] font-semibold">Go back</button>
      </div>
    );
  }

  const handleShare = () => {
    window.open(`https://wa.me/91${vendor.phone}?text=${encodeURIComponent(message)}`, "_blank");
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="pb-8 min-h-screen bg-[#F9F6F2]">
      {/* Header */}
      <div className="px-5 pt-12 pb-4 bg-white border-b border-[#EDE0DB]">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-xl bg-white border border-[#EDE0DB] flex items-center justify-center shadow-sm">
            <ArrowLeft size={18} className="text-[#1A0A0C]" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-[#1A0A0C]">WhatsApp Share</h1>
            <p className="text-xs text-[#6B4C4F]">Preview message before sending</p>
          </div>
        </div>
      </div>

      <div className="px-5 pt-5">
        {/* Chat bubble UI */}
        <div className="bg-[#E5DDD5] rounded-2xl p-4 min-h-64">
          {/* Chat header */}
          <div className="flex items-center gap-2.5 pb-3 border-b border-black/10 mb-4">
            <div className="w-10 h-10 rounded-full bg-[#16A34A] flex items-center justify-center font-bold text-white text-sm">
              {vendor.avatar}
            </div>
            <div>
              <p className="text-sm font-bold text-[#1A0A0C]">{vendor.name}</p>
              <p className="text-xs text-[#6B4C4F]">+91 {vendor.phone}</p>
            </div>
          </div>

          {/* Message bubble */}
          <div className="flex justify-end">
            <div className="max-w-[85%] bg-[#DCF8C6] rounded-tl-2xl rounded-bl-2xl rounded-br-2xl shadow-sm p-3.5">
              <pre className="text-xs font-sans text-[#1A0A0C] whitespace-pre-wrap leading-relaxed">{message}</pre>
              <p className="text-right text-[10px] text-[#6B4C4F] mt-1.5">
                {new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })} ✓✓
              </p>
            </div>
          </div>
        </div>

        {/* Character count */}
        <p className="text-xs text-[#6B4C4F] mt-2 text-right">{message.length} characters</p>

        {/* Customer info */}
        <div className="mt-5 bg-white border border-[#EDE0DB] rounded-2xl p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#6B4C4F] mb-3">Send To</p>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-[#FFF8F4] border border-[#EDE0DB] flex items-center justify-center font-bold text-[#8B1E24]">
              {vendor.avatar}
            </div>
            <div>
              <p className="text-sm font-bold text-[#1A0A0C]">{vendor.name}</p>
              <p className="text-xs text-[#6B4C4F]">+91 {vendor.phone}</p>
            </div>
          </div>
        </div>

        {/* Send button */}
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={handleShare}
          className="w-full mt-5 flex items-center justify-center gap-2.5 bg-[#16A34A] text-white rounded-xl py-4 text-sm font-bold shadow-sm"
        >
          <Send size={18} /> Send on WhatsApp
        </motion.button>

        <button onClick={() => navigate(-1)} className="w-full mt-3 text-[#6B4C4F] text-sm font-medium py-2">
          Cancel
        </button>
      </div>
    </motion.div>
  );
}
