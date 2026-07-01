import { useState, useMemo } from "react";
import { useNavigate } from "react-router";
import { motion } from "motion/react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell,
} from "recharts";
import {
  Plus, CreditCard, UserPlus, Package, Truck,
  TrendingUp, Users, Receipt, Wallet, ChevronRight, ArrowUpRight,
} from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { formatCurrency, formatShortDate, isToday } from "../lib/utils";

function StatCard({ label, value, sub, icon: Icon, accent }: {
  label: string; value: string; sub?: string; icon: React.ElementType; accent?: boolean;
}) {
  return (
    <div className={`rounded-2xl p-4 ${accent ? "bg-[#8B1E24] text-[#FFF8F4]" : "bg-white border border-[#EDE0DB]"} shadow-sm`}>
      <div className={`w-8 h-8 rounded-xl flex items-center justify-center mb-3 ${accent ? "bg-white/15" : "bg-[#FFF8F4]"}`}>
        <Icon size={16} className={accent ? "text-[#FFF8F4]" : "text-[#8B1E24]"} />
      </div>
      <p className={`text-xs font-semibold uppercase tracking-wider mb-1 ${accent ? "text-[#FFF8F4]/70" : "text-[#6B4C4F]"}`}>{label}</p>
      <p className={`text-xl font-bold leading-none ${accent ? "text-[#FFF8F4]" : "text-[#1A0A0C]"}`}>{value}</p>
      {sub && <p className={`text-xs mt-1 ${accent ? "text-[#FFF8F4]/60" : "text-[#6B4C4F]"}`}>{sub}</p>}
    </div>
  );
}

function QuickAction({ label, icon: Icon, color, onClick }: {
  label: string; icon: React.ElementType; color: string; onClick: () => void;
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className="flex flex-col items-center gap-2"
    >
      <div className={`w-13 h-13 rounded-2xl flex items-center justify-center ${color} shadow-sm`} style={{ width: 52, height: 52 }}>
        <Icon size={22} className="text-white" />
      </div>
      <span className="text-xs font-semibold text-[#1A0A0C] text-center leading-tight">{label}</span>
    </motion.button>
  );
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload?.length) {
    return (
      <div className="bg-white border border-[#EDE0DB] rounded-xl px-3 py-2 shadow-lg">
        <p className="text-xs text-[#6B4C4F] font-medium">{label}</p>
        <p className="text-sm font-bold text-[#8B1E24]">{formatCurrency(payload[0].value)}</p>
      </div>
    );
  }
  return null;
};

type Period = "daily" | "weekly" | "monthly";

export default function DashboardPage() {
  const navigate = useNavigate();
  const vendors = useQuery(api.vendors.getVendors) ?? [];
  const transactions = useQuery(api.transactions.getTransactions) ?? [];
  const [period, setPeriod] = useState<Period>("weekly");

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const today = new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" });

  const stats = useMemo(() => {
    const todayBills = transactions.filter((t) => t.type === "bill" && isToday(t.date));
    const todaySales = todayBills.reduce((s, t) => s + t.amount, 0);
    const totalDue = vendors.reduce((s, v) => s + v.dueAmount, 0);
    const totalBills = transactions.filter((t) => t.type === "bill").length;
    const totalPayments = transactions.filter((t) => t.type === "payment").reduce((s, t) => s + t.amount, 0);
    return { todaySales, totalDue, totalBills, totalPayments };
  }, [vendors, transactions]);

  const chartData = useMemo(() => {
    const days: { date: string; label: string; revenue: number; outstanding: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toDateString();
      const label = i === 0 ? "Today" : d.toLocaleDateString("en-IN", { weekday: "short" });
      const revenue = transactions
        .filter((t) => t.type === "bill" && new Date(t.date).toDateString() === dateStr)
        .reduce((s, t) => s + t.amount, 0);
      const outstanding = vendors.reduce((s, v) => s + v.dueAmount, 0);
      days.push({ date: dateStr, label, revenue, outstanding });
    }
    return days;
  }, [vendors, transactions]);

  const topProducts = useMemo(() => {
    const freq: Record<string, { name: string; count: number; revenue: number }> = {};
    transactions.filter((t) => t.type === "bill").forEach((t) => {
      (t.items || []).forEach((item) => {
        if (!freq[item.name]) freq[item.name] = { name: item.name, count: 0, revenue: 0 };
        freq[item.name].count += item.qty;
        freq[item.name].revenue += item.qty * item.price;
      });
    });
    return Object.values(freq).sort((a, b) => b.revenue - a.revenue).slice(0, 4);
  }, [transactions]);

  const recentActivity = useMemo(() =>
    [...transactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5),
    [transactions]
  );

  const topDue = useMemo(() =>
    [...vendors].filter((v) => v.dueAmount > 0).sort((a, b) => b.dueAmount - a.dueAmount).slice(0, 3),
    [vendors]
  );

  const revenueChartData = useMemo(() => {
    const n = period === "daily" ? 7 : period === "weekly" ? 8 : 6;
    const points: { label: string; revenue: number; payments: number }[] = [];
    for (let i = n - 1; i >= 0; i--) {
      const d = new Date();
      let label: string;
      let start: Date;
      let end: Date;
      if (period === "daily") {
        d.setDate(d.getDate() - i);
        label = i === 0 ? "Today" : d.toLocaleDateString("en-IN", { weekday: "short" });
        start = new Date(d); start.setHours(0, 0, 0, 0);
        end = new Date(d); end.setHours(23, 59, 59, 999);
      } else if (period === "weekly") {
        d.setDate(d.getDate() - i * 7);
        const weekStart = new Date(d);
        weekStart.setDate(d.getDate() - d.getDay());
        label = `W${n - i}`;
        start = weekStart; end = new Date(weekStart); end.setDate(weekStart.getDate() + 6);
      } else {
        d.setMonth(d.getMonth() - i);
        label = d.toLocaleDateString("en-IN", { month: "short" });
        start = new Date(d.getFullYear(), d.getMonth(), 1);
        end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
      }
      const revenue = transactions
        .filter((t) => { const dt = new Date(t.date); return t.type === "bill" && dt >= start && dt <= end; })
        .reduce((s, t) => s + t.amount, 0);
      const payments = transactions
        .filter((t) => { const dt = new Date(t.date); return t.type === "payment" && dt >= start && dt <= end; })
        .reduce((s, t) => s + t.amount, 0);
      points.push({ label, revenue, payments });
    }
    return points;
  }, [transactions, period]);

  const { collectionRate, totalCollected, totalDue, collectionPie } = useMemo(() => {
    const totalRevenue = transactions.filter((t) => t.type === "bill").reduce((s, t) => s + t.amount, 0);
    const totalDue = vendors.reduce((s, v) => s + v.dueAmount, 0);
    const totalCollected = Math.max(0, totalRevenue - totalDue);
    const rate = totalRevenue > 0 ? (totalCollected / totalRevenue) * 100 : 0;
    return {
      collectionRate: rate,
      totalCollected,
      totalDue,
      collectionPie: [
        { name: "Collected", value: totalCollected, color: "#16A34A" },
        { name: "Due", value: totalDue, color: "#8B1E24" },
      ],
    };
  }, [vendors, transactions]);

  const stagger = { container: { animate: { transition: { staggerChildren: 0.07 } } }, item: { initial: { y: 16, opacity: 0 }, animate: { y: 0, opacity: 1, transition: { duration: 0.35, ease: "easeOut" } } } };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="pb-6"
    >
      <div className="px-5 pt-12 pb-6 bg-gradient-to-b from-[#FFF8F4] to-white">
        <motion.div initial={{ y: -10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.4 }}>
          <p className="text-sm font-semibold text-[#C99A4B] uppercase tracking-wider">{greeting}</p>
          <h1 className="text-2xl font-bold text-[#1A0A0C] mt-0.5">Arasi</h1>
          <p className="text-sm text-[#6B4C4F] mt-0.5">{today}</p>
        </motion.div>
      </div>

      <motion.div variants={stagger.container} initial="initial" animate="animate" className="px-5 grid grid-cols-2 gap-3">
        <motion.div variants={stagger.item}>
          <StatCard label="Today's Sales" value={formatCurrency(stats.todaySales)} icon={TrendingUp} accent />
        </motion.div>
        <motion.div variants={stagger.item}>
          <StatCard label="Total Due" value={formatCurrency(stats.totalDue)} sub="Outstanding" icon={Wallet} />
        </motion.div>
        <motion.div variants={stagger.item}>
          <StatCard label="Customers" value={String(vendors.length)} sub="Total active" icon={Users} />
        </motion.div>
        <motion.div variants={stagger.item}>
          <StatCard label="Total Bills" value={String(stats.totalBills)} sub="All time" icon={Receipt} />
        </motion.div>
      </motion.div>

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.4 }}
        className="mx-5 mt-5 bg-white rounded-2xl border border-[#EDE0DB] shadow-sm overflow-hidden"
      >
        <div className="px-4 pt-4 pb-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-[#6B4C4F]">Revenue Trend</p>
              <p className="text-lg font-bold text-[#1A0A0C] mt-0.5">Last 7 Days</p>
            </div>
            <div className="flex items-center gap-1 bg-[#FFF8F4] rounded-lg px-2.5 py-1.5">
              <ArrowUpRight size={13} className="text-[#16A34A]" />
              <span className="text-xs font-semibold text-[#16A34A]">Weekly</span>
            </div>
          </div>
        </div>
        <div className="h-44 px-2 pb-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8B1E24" stopOpacity={0.18} />
                  <stop offset="95%" stopColor="#8B1E24" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#EDE0DB" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#6B4C4F", fontWeight: 600 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 9, fill: "#6B4C4F" }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="revenue" stroke="#8B1E24" strokeWidth={2.5} fill="url(#revGrad)" dot={{ fill: "#8B1E24", r: 3, strokeWidth: 0 }} activeDot={{ r: 5, strokeWidth: 0 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.38, duration: 0.4 }}
        className="mx-5 mt-5 bg-white rounded-2xl border border-[#EDE0DB] shadow-sm p-4"
      >
        <p className="text-xs font-semibold uppercase tracking-wider text-[#6B4C4F] mb-4">Quick Actions</p>
        <div className="flex flex-col gap-4">
          <div className="flex justify-around">
            <QuickAction label="New Bill" icon={Plus} color="bg-[#8B1E24]" onClick={() => navigate("/bills/new")} />
            <QuickAction label="Receive Payment" icon={CreditCard} color="bg-[#C99A4B]" onClick={() => navigate("/payments/new")} />
            <QuickAction label="Add Customer" icon={UserPlus} color="bg-[#16A34A]" onClick={() => navigate("/customers/new")} />
          </div>
          <div className="flex justify-center gap-12">
            <QuickAction label="Add Product" icon={Package} color="bg-[#6B4C4F]" onClick={() => navigate("/products/new")} />
            <QuickAction label="Suppliers" icon={Truck} color="bg-[#A51D24]" onClick={() => navigate("/suppliers")} />
          </div>
        </div>
      </motion.div>

      {topDue.length > 0 && (
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.45, duration: 0.4 }}
          className="mx-5 mt-5"
        >
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#6B4C4F]">Top Outstanding</p>
            <button onClick={() => navigate("/customers")} className="text-xs font-semibold text-[#8B1E24] flex items-center gap-0.5">
              See all <ChevronRight size={12} />
            </button>
          </div>
          <div className="space-y-2.5">
            {topDue.map((v, i) => (
              <motion.button
                key={v._id}
                initial={{ x: -12, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.5 + i * 0.07, duration: 0.3 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate(`/customers/${v._id}`)}
                className="w-full flex items-center gap-3 bg-white border border-[#EDE0DB] rounded-2xl p-3.5 shadow-sm"
              >
                <div className="w-10 h-10 rounded-xl bg-[#FFF8F4] border border-[#EDE0DB] flex items-center justify-center font-bold text-[#8B1E24] text-sm flex-shrink-0">
                  {v.avatar}
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-semibold text-[#1A0A0C]">{v.name}</p>
                  <p className="text-xs text-[#6B4C4F] mt-0.5">{v.daysOverdue > 0 ? `${v.daysOverdue}d overdue` : "Due today"}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-[#8B1E24]">{formatCurrency(v.dueAmount)}</p>
                  <ChevronRight size={14} className="text-[#6B4C4F] ml-auto mt-0.5" />
                </div>
              </motion.button>
            ))}
          </div>
        </motion.div>
      )}

      {topProducts.length > 0 && (
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.4 }}
          className="mx-5 mt-5"
        >
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#6B4C4F]">Best Selling</p>
            <button onClick={() => navigate("/products")} className="text-xs font-semibold text-[#8B1E24] flex items-center gap-0.5">
              View all <ChevronRight size={12} />
            </button>
          </div>
          <div className="bg-white border border-[#EDE0DB] rounded-2xl shadow-sm overflow-hidden">
            {topProducts.map((p, i) => (
              <div key={p.name} className={`flex items-center gap-3 px-4 py-3.5 ${i < topProducts.length - 1 ? "border-b border-[#EDE0DB]" : ""}`}>
                <div className="w-7 h-7 rounded-lg bg-[#FFF8F4] flex items-center justify-center">
                  <span className="text-xs font-bold text-[#C99A4B]">{i + 1}</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-[#1A0A0C]">{p.name}</p>
                  <p className="text-xs text-[#6B4C4F]">{p.count} units sold</p>
                </div>
                <p className="text-sm font-bold text-[#8B1E24]">{formatCurrency(p.revenue)}</p>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.35, duration: 0.4 }}
        className="mx-5 mt-5 bg-white border border-[#EDE0DB] rounded-2xl shadow-sm overflow-hidden"
      >
        <div className="px-4 pt-4 pb-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#6B4C4F]">Revenue vs Collections</p>
          <p className="text-base font-bold text-[#1A0A0C] mt-0.5">
            {period === "daily" ? "Last 7 Days" : period === "weekly" ? "Last 8 Weeks" : "Last 6 Months"}
          </p>
        </div>
        <div className="h-48 px-2 pb-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={revenueChartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }} barCategoryGap="30%">
              <CartesianGrid strokeDasharray="3 3" stroke="#EDE0DB" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#6B4C4F", fontWeight: 600 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 9, fill: "#6B4C4F" }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="revenue" fill="#8B1E24" radius={[4, 4, 0, 0]} name="Revenue" />
              <Bar dataKey="payments" fill="#C99A4B" radius={[4, 4, 0, 0]} name="Collected" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="flex gap-4 px-4 pb-3">
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-[#8B1E24]" /><span className="text-xs text-[#6B4C4F]">Revenue</span></div>
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-[#C99A4B]" /><span className="text-xs text-[#6B4C4F]">Collected</span></div>
        </div>
        <div className="flex gap-2 px-4 pb-4">
          {(["daily", "weekly", "monthly"] as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-colors capitalize ${period === p ? "bg-[#8B1E24] text-white border-[#8B1E24]" : "bg-white text-[#6B4C4F] border-[#EDE0DB]"}`}
            >
              {p}
            </button>
          ))}
        </div>
      </motion.div>

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.52, duration: 0.4 }}
        className="mx-5 mt-5 bg-white border border-[#EDE0DB] rounded-2xl shadow-sm p-4 flex items-center gap-4"
      >
        <div className="flex-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#6B4C4F]">Collection Rate</p>
          <p className="text-3xl font-bold text-[#1A0A0C] mt-1">{collectionRate.toFixed(0)}%</p>
          <div className="flex gap-3 mt-2">
            <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[#16A34A]" /><span className="text-xs text-[#6B4C4F]">Collected {formatCurrency(totalCollected)}</span></div>
            <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[#8B1E24]" /><span className="text-xs text-[#6B4C4F]">Due {formatCurrency(totalDue)}</span></div>
          </div>
        </div>
        <PieChart width={80} height={80}>
          <Pie data={collectionPie} cx={32} cy={32} innerRadius={22} outerRadius={38} startAngle={90} endAngle={450} dataKey="value" strokeWidth={0}>
            {collectionPie.map((entry, i) => <Cell key={i} fill={entry.color} />)}
          </Pie>
        </PieChart>
      </motion.div>

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.55, duration: 0.4 }}
        className="mx-5 mt-5"
      >
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#6B4C4F]">Recent Activity</p>
          <button onClick={() => navigate("/bills")} className="text-xs font-semibold text-[#8B1E24] flex items-center gap-0.5">
            View all <ChevronRight size={12} />
          </button>
        </div>
        <div className="bg-white border border-[#EDE0DB] rounded-2xl shadow-sm overflow-hidden">
          {recentActivity.map((t, i) => (
            <motion.button
              key={t._id}
              whileTap={{ scale: 0.98 }}
              onClick={() => t.type === "bill" ? navigate(`/bills/${t._id}`) : navigate(`/payments/${t._id}`)}
              className={`w-full flex items-center gap-3 px-4 py-3.5 text-left ${i < recentActivity.length - 1 ? "border-b border-[#EDE0DB]" : ""}`}
            >
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${t.type === "bill" ? "bg-[#FFF8F4]" : "bg-[#F0FDF4]"}`}>
                {t.type === "bill" ? <Receipt size={16} className="text-[#8B1E24]" /> : <CreditCard size={16} className="text-[#16A34A]" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[#1A0A0C] truncate">{t.vendorName}</p>
                <p className="text-xs text-[#6B4C4F]">
                  {t.type === "bill" ? "Bill" : "Payment"} · {formatShortDate(t.date)}
                </p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className={`text-sm font-bold ${t.type === "bill" ? "text-[#8B1E24]" : "text-[#16A34A]"}`}>
                  {t.type === "bill" ? "+" : "-"}{formatCurrency(t.amount)}
                </p>
              </div>
            </motion.button>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}
