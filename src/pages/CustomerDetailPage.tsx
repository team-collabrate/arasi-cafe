import { useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router";
import { motion } from "motion/react";
import {
  ArrowLeft, Plus, CreditCard, Phone, MessageCircle, Share2,
  Receipt, ChevronRight, MapPin, Hash, Trash2, Edit3,
} from "lucide-react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { formatCurrency, formatDate } from "../lib/utils";
import { toast } from "sonner";

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const vendors = useQuery(api.vendors.getVendors) ?? [];
  const transactions = useQuery(api.transactions.getTransactions) ?? [];
  const deleteVendor = useMutation(api.vendors.deleteVendor);
  const [tab, setTab] = useState<"all" | "bills" | "payments">("all");

  const vendor = useMemo(() => vendors.find((v) => v._id === id), [vendors, id]);
  const vendorTxs = useMemo(() =>
    transactions.filter((t) => t.vendorId === id).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [transactions, id]
  );

  if (!vendor) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        <p className="text-[#6B4C4F]">Customer not found</p>
        <button onClick={() => navigate("/customers")} className="text-[#8B1E24] font-semibold">Go back</button>
      </div>
    );
  }

  const bills = vendorTxs.filter((t) => t.type === "bill");
  const payments = vendorTxs.filter((t) => t.type === "payment");
  const totalBilled = bills.reduce((s, t) => s + t.amount, 0);
  const totalPaid = payments.reduce((s, t) => s + t.amount, 0);

  const visible = tab === "all" ? vendorTxs : tab === "bills" ? bills : payments;

  const handleDelete = async () => {
    if (confirm(`Delete ${vendor.name} and all their transactions?`)) {
      await deleteVendor({ id: vendor._id });
      toast.error("Customer deleted");
      navigate("/customers");
    }
  };

  const shareStatement = () => {
    const msg = encodeURIComponent(
      `*Arasi - Customer Statement*\n\nCustomer: ${vendor.name}\nPhone: ${vendor.phone}\n\nTotal Billed: ₹${totalBilled}\nTotal Paid: ₹${totalPaid}\nOutstanding: ₹${vendor.dueAmount}\n\nThank you for your business! 🙏`
    );
    window.open(`https://wa.me/91${vendor.phone}?text=${msg}`, "_blank");
  };

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }} className="pb-6">
      <div className="bg-gradient-to-b from-[#FFF8F4] to-white px-5 pt-12 pb-5">
        <div className="flex items-center justify-between mb-5">
          <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-xl bg-white border border-[#EDE0DB] flex items-center justify-center shadow-sm">
            <ArrowLeft size={18} className="text-[#1A0A0C]" />
          </button>
          <div className="flex items-center gap-2">
            <button onClick={() => navigate(`/customers/${id}/edit`)} className="w-9 h-9 rounded-xl bg-white border border-[#EDE0DB] flex items-center justify-center shadow-sm">
              <Edit3 size={16} className="text-[#6B4C4F]" />
            </button>
            <button onClick={handleDelete} className="w-9 h-9 rounded-xl bg-white border border-[#EDE0DB] flex items-center justify-center shadow-sm">
              <Trash2 size={16} className="text-red-500" />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-[#8B1E24]/10 border border-[#8B1E24]/20 flex items-center justify-center font-bold text-[#8B1E24] text-xl">
            {vendor.avatar}
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-[#1A0A0C]">{vendor.name}</h1>
            <div className="flex items-center gap-1.5 mt-1">
              <Phone size={12} className="text-[#6B4C4F]" />
              <p className="text-sm text-[#6B4C4F]">{vendor.phone}</p>
            </div>
            {vendor.address && (
              <div className="flex items-center gap-1.5 mt-0.5">
                <MapPin size={12} className="text-[#6B4C4F]" />
                <p className="text-xs text-[#6B4C4F] truncate">{vendor.address}</p>
              </div>
            )}
            {vendor.gstin && (
              <div className="flex items-center gap-1.5 mt-0.5">
                <Hash size={12} className="text-[#6B4C4F]" />
                <p className="text-xs text-[#6B4C4F]">GSTIN: {vendor.gstin}</p>
              </div>
            )}
          </div>
        </div>

        <div className={`mt-4 rounded-2xl p-4 ${vendor.dueAmount > 0 ? "bg-[#8B1E24]" : "bg-[#16A34A]"}`}>
          <p className="text-xs font-semibold text-white/70 uppercase tracking-wider">Outstanding Balance</p>
          <p className="text-3xl font-bold text-white mt-1">{formatCurrency(vendor.dueAmount)}</p>
          {vendor.dueAmount > 0 && vendor.daysOverdue > 0 && (
            <p className="text-xs text-white/60 mt-1">{vendor.daysOverdue} days overdue</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 mt-3">
          <div className="bg-white border border-[#EDE0DB] rounded-xl p-3 shadow-sm">
            <p className="text-xs text-[#6B4C4F] font-medium">Total Billed</p>
            <p className="text-base font-bold text-[#1A0A0C] mt-0.5">{formatCurrency(totalBilled)}</p>
          </div>
          <div className="bg-white border border-[#EDE0DB] rounded-xl p-3 shadow-sm">
            <p className="text-xs text-[#6B4C4F] font-medium">Total Paid</p>
            <p className="text-base font-bold text-[#16A34A] mt-0.5">{formatCurrency(totalPaid)}</p>
          </div>
        </div>

        <div className="flex gap-2.5 mt-3">
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={() => navigate(`/bills/new?customerId=${vendor._id}`)}
            className="flex-1 flex items-center justify-center gap-2 bg-[#8B1E24] text-white rounded-xl py-3 text-sm font-semibold shadow-sm"
          >
            <Plus size={16} /> New Bill
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={() => navigate(`/payments/new?customerId=${vendor._id}`)}
            className="flex-1 flex items-center justify-center gap-2 bg-white border border-[#EDE0DB] text-[#1A0A0C] rounded-xl py-3 text-sm font-semibold shadow-sm"
          >
            <CreditCard size={16} className="text-[#C99A4B]" /> Payment
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={shareStatement}
            className="w-11 flex items-center justify-center bg-white border border-[#EDE0DB] rounded-xl shadow-sm"
          >
            <Share2 size={16} className="text-[#16A34A]" />
          </motion.button>
        </div>

        <div className="flex gap-2.5 mt-2">
          <a href={`tel:${vendor.phone}`} className="flex-1 flex items-center justify-center gap-1.5 bg-white border border-[#EDE0DB] rounded-xl py-2.5 text-xs font-semibold text-[#6B4C4F] shadow-sm">
            <Phone size={13} /> Call
          </a>
          <a href={`https://wa.me/91${vendor.phone}`} target="_blank" rel="noopener noreferrer" className="flex-1 flex items-center justify-center gap-1.5 bg-white border border-[#EDE0DB] rounded-xl py-2.5 text-xs font-semibold text-[#16A34A] shadow-sm">
            <MessageCircle size={13} /> WhatsApp
          </a>
        </div>
      </div>

      <div className="px-5 mt-5">
        <div className="flex gap-2 mb-4">
          {(["all", "bills", "payments"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-colors ${tab === t ? "bg-[#8B1E24] text-white" : "bg-[#F9F6F2] text-[#6B4C4F] border border-[#EDE0DB]"}`}
            >
              {t === "all" ? "All" : t === "bills" ? `Bills (${bills.length})` : `Payments (${payments.length})`}
            </button>
          ))}
        </div>

        <div className="space-y-2.5">
          {visible.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-sm text-[#6B4C4F]">No {tab === "all" ? "transactions" : tab} yet</p>
            </div>
          ) : (
            visible.map((t) => (
              <motion.button
                key={t._id}
                whileTap={{ scale: 0.98 }}
                onClick={() => t.type === "bill" ? navigate(`/bills/${t._id}`) : navigate(`/payments/${t._id}`)}
                className="w-full flex items-center gap-3 bg-white border border-[#EDE0DB] rounded-2xl shadow-sm px-4 py-3.5 text-left"
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${t.type === "bill" ? "bg-[#FFF8F4]" : "bg-[#F0FDF4]"}`}>
                  {t.type === "bill" ? <Receipt size={16} className="text-[#8B1E24]" /> : <CreditCard size={16} className="text-[#16A34A]" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-[#1A0A0C]">
                      {t.type === "bill" ? "Bill" : "Payment"}
                    </p>
                    {t.paymentMethod && <span className="text-xs bg-[#F9F6F2] text-[#6B4C4F] px-2 py-0.5 rounded-full">{t.paymentMethod}</span>}
                  </div>
                  <p className="text-xs text-[#6B4C4F] mt-0.5">{formatDate(t.date)}</p>
                  {t.notes && <p className="text-xs text-[#6B4C4F] mt-0.5 truncate">{t.notes}</p>}
                </div>
                <div className="text-right flex-shrink-0">
                  <p className={`text-sm font-bold ${t.type === "bill" ? "text-[#8B1E24]" : "text-[#16A34A]"}`}>
                    {t.type === "bill" ? "+" : "-"}{formatCurrency(t.amount)}
                  </p>
                  <ChevronRight size={14} className="text-[#EDE0DB] ml-auto mt-1" />
                </div>
              </motion.button>
            ))
          )}
        </div>
      </div>
    </motion.div>
  );
}
