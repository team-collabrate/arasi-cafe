import { useState, useMemo, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { motion, useMotionValue, useTransform, animate } from "motion/react";
import { ArrowLeft, ChevronDown, ChevronRight } from "lucide-react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { formatCurrency } from "../lib/utils";
import { toast } from "sonner";
import type { Id } from "../convex/_generated/dataModel";

const METHODS = ["Cash", "UPI", "Card", "Bank Transfer", "Cheque"];

export default function ReceivePaymentPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const vendors = useQuery(api.vendors.getVendors) ?? [];
  const createTransaction = useMutation(api.transactions.createTransaction);

  const preId = searchParams.get("customerId") || "";
  const [customerId, setCustomerId] = useState(preId);
  const [showCustomers, setShowCustomers] = useState(!preId);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("Cash");
  const [notes, setNotes] = useState("");
  const [whatsapp, setWhatsapp] = useState(false);
  const [sliding, setSliding] = useState(false);

  const vendor = useMemo(() => vendors.find((v) => v._id === customerId), [vendors, customerId]);
  const outstanding = vendor?.dueAmount || 0;

  const numAmount = parseFloat(amount) || 0;
  const remaining = Math.max(0, outstanding - numAmount);

  const handleSuggest = (pct: number) => {
    const suggested = pct === 1 ? outstanding : Math.ceil(outstanding * pct);
    setAmount(String(suggested));
  };

  const sliderX = useMotionValue(0);
  const trackRef = useRef<HTMLDivElement>(null);
  const KNOB = 56;

  const handleConfirm = async () => {
    if (!customerId) { toast.error("Select a customer"); return; }
    if (numAmount <= 0) { toast.error("Enter a valid amount"); return; }
    if (numAmount > outstanding + 0.01) { toast.error("Amount exceeds outstanding balance"); return; }

    await createTransaction({
      type: "payment",
      vendorId: customerId as Id<"vendors">,
      vendorName: vendor!.name,
      amount: numAmount,
      profit: 0,
      date: new Date().toISOString(),
      notes: notes.trim() || undefined,
      paymentMethod: method,
    });

    if (whatsapp && vendor) {
      const msg = encodeURIComponent(`*Arasi - Payment Receipt*\n\nCustomer: ${vendor.name}\nAmount Paid: ₹${numAmount}\nMethod: ${method}\nDate: ${new Date().toLocaleDateString("en-IN")}\nBalance: ₹${remaining}\n\nThank you! 🙏`);
      window.open(`https://wa.me/91${vendor.phone}?text=${msg}`, "_blank");
    }

    navigate(`/payments/success?amount=${numAmount}&customer=${encodeURIComponent(vendor!.name)}&remaining=${remaining}`, { replace: true });
  };

  const handleDragEnd = () => {
    const trackWidth = (trackRef.current?.offsetWidth || 300) - KNOB;
    if (sliderX.get() >= trackWidth * 0.8) {
      animate(sliderX, trackWidth, { type: "spring", stiffness: 200, damping: 25 });
      setSliding(true);
      setTimeout(handleConfirm, 400);
    } else {
      animate(sliderX, 0, { type: "spring", stiffness: 300, damping: 30 });
    }
  };

  const progress = useTransform(sliderX, [0, 300 - KNOB], [0, 1]);
  const trackBg = useTransform(progress, [0, 1], ["#EDE0DB", "#8B1E24"]);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="pb-10 min-h-screen">
      <div className="px-5 pt-12 pb-5 bg-gradient-to-b from-[#FFF8F4] to-white border-b border-[#EDE0DB]">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-xl bg-white border border-[#EDE0DB] flex items-center justify-center shadow-sm">
            <ArrowLeft size={18} className="text-[#1A0A0C]" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-[#1A0A0C]">Receive Payment</h1>
            <p className="text-xs text-[#6B4C4F]">Record a payment from customer</p>
          </div>
        </div>
      </div>

      <div className="px-5 pt-5 space-y-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[#6B4C4F] mb-2">Customer</p>
          {vendor ? (
            <button
              onClick={() => { setShowCustomers(true); setCustomerId(""); setAmount(""); }}
              className="w-full flex items-center gap-3 bg-[#FFF8F4] border border-[#8B1E24]/20 rounded-xl px-4 py-3"
            >
              <div className="w-9 h-9 rounded-lg bg-[#8B1E24]/10 flex items-center justify-center font-bold text-[#8B1E24] text-sm">
                {vendor.avatar}
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-semibold text-[#1A0A0C]">{vendor.name}</p>
                <p className="text-xs text-[#8B1E24] font-medium">Outstanding: {formatCurrency(outstanding)}</p>
              </div>
              <ChevronDown size={16} className="text-[#6B4C4F]" />
            </button>
          ) : (
            <div className="space-y-1">
              <div className="bg-white border border-[#EDE0DB] rounded-xl shadow-sm overflow-hidden max-h-52 overflow-y-auto">
                {vendors.filter((v) => v.dueAmount > 0).map((v) => (
                  <button
                    key={v._id}
                    onClick={() => { setCustomerId(v._id); setShowCustomers(false); }}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#FFF8F4] border-b border-[#EDE0DB] last:border-0"
                  >
                    <div className="w-8 h-8 rounded-lg bg-[#FFF8F4] flex items-center justify-center font-bold text-[#8B1E24] text-xs">
                      {v.avatar}
                    </div>
                    <div className="flex-1 text-left">
                      <p className="text-sm font-semibold text-[#1A0A0C]">{v.name}</p>
                    </div>
                    <span className="text-xs font-bold text-[#8B1E24]">{formatCurrency(v.dueAmount)}</span>
                    <ChevronRight size={14} className="text-[#EDE0DB]" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {vendor && (
          <>
            <div className="bg-[#8B1E24] rounded-2xl p-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs font-semibold text-white/60 uppercase tracking-wider">Outstanding</p>
                  <p className="text-3xl font-bold text-white mt-1">{formatCurrency(outstanding)}</p>
                </div>
                {numAmount > 0 && (
                  <div className="text-right">
                    <p className="text-xs text-white/60">After payment</p>
                    <p className="text-lg font-bold text-white/80">{formatCurrency(remaining)}</p>
                  </div>
                )}
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-[#6B4C4F] mb-2">Payment Amount</p>
              <div className="flex items-center gap-3 bg-[#F9F6F2] border-2 border-[#8B1E24]/20 rounded-2xl px-4 py-4 focus-within:border-[#8B1E24]">
                <span className="text-2xl font-bold text-[#6B4C4F]">₹</span>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0"
                  min="0"
                  max={outstanding}
                  className="flex-1 text-3xl font-bold text-[#1A0A0C] bg-transparent outline-none placeholder:text-[#6B4C4F]/30"
                />
              </div>
              {numAmount > outstanding + 0.01 && (
                <p className="text-xs text-red-500 mt-1.5">Amount exceeds outstanding balance</p>
              )}
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-[#6B4C4F] mb-2">Suggested</p>
              <div className="flex gap-2">
                {[0.25, 0.5, 0.75, 1].map((pct) => (
                  <button
                    key={pct}
                    onClick={() => handleSuggest(pct)}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-colors ${numAmount === (pct === 1 ? outstanding : Math.ceil(outstanding * pct)) ? "bg-[#8B1E24] text-white border-[#8B1E24]" : "bg-white text-[#1A0A0C] border-[#EDE0DB] hover:border-[#8B1E24]"}`}
                  >
                    {pct === 1 ? "Full" : `${pct * 100}%`}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-[#6B4C4F] mb-2">Payment Method</p>
              <div className="flex flex-wrap gap-2">
                {METHODS.map((m) => (
                  <button
                    key={m}
                    onClick={() => setMethod(m)}
                    className={`rounded-full px-3.5 py-1.5 text-xs font-semibold border transition-colors ${method === m ? "bg-[#8B1E24] text-white border-[#8B1E24]" : "bg-white text-[#6B4C4F] border-[#EDE0DB]"}`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-[#6B4C4F] mb-2">Notes</p>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional payment notes..."
                rows={2}
                className="w-full bg-[#F9F6F2] border border-[#EDE0DB] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#8B1E24] resize-none placeholder:text-[#6B4C4F]/50"
              />
            </div>

            <button
              onClick={() => setWhatsapp(!whatsapp)}
              className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl border transition-colors ${whatsapp ? "bg-green-50 border-green-200" : "bg-white border-[#EDE0DB]"}`}
            >
              <div className="flex items-center gap-2.5">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${whatsapp ? "bg-green-100" : "bg-[#F9F6F2]"}`}>
                  <span className="text-base">💬</span>
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold text-[#1A0A0C]">Send WhatsApp receipt</p>
                  <p className="text-xs text-[#6B4C4F]">Share payment confirmation</p>
                </div>
              </div>
              <div className={`w-11 h-6 rounded-full transition-colors flex items-center px-1 ${whatsapp ? "bg-green-500" : "bg-[#EDE0DB]"}`}>
                <motion.div
                  animate={{ x: whatsapp ? 20 : 0 }}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  className="w-4 h-4 rounded-full bg-white shadow-sm"
                />
              </div>
            </button>

            <div className="pt-2">
              <p className="text-xs text-center text-[#6B4C4F] mb-3 font-medium">Slide to confirm payment</p>
              <div ref={trackRef} className="relative h-14 rounded-full overflow-hidden" style={{ background: "#EDE0DB" }}>
                <motion.div className="absolute inset-0 rounded-full" style={{ backgroundColor: trackBg, opacity: 0.4 }} />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-sm font-semibold text-[#6B4C4F]">
                    {sliding ? "Processing..." : `Confirm ₹${numAmount > 0 ? numAmount.toFixed(0) : "0"}`}
                  </span>
                </div>
                <motion.div
                  drag="x"
                  dragConstraints={{ left: 0, right: (trackRef.current?.offsetWidth || 300) - KNOB }}
                  dragElastic={0}
                  style={{ x: sliderX }}
                  onDragEnd={handleDragEnd}
                  className="absolute top-1 left-1 w-12 h-12 rounded-full bg-[#8B1E24] shadow-lg flex items-center justify-center cursor-grab active:cursor-grabbing z-10"
                >
                  <ChevronRight size={20} className="text-white" />
                </motion.div>
              </div>
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
}
