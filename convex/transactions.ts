import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const getTransactions = query({
  handler: async (ctx) => {
    const transactions = await ctx.db.query("transactions").order("desc").collect();
    const transactionsWithVendor = await Promise.all(
      transactions.map(async (tx) => {
        const vendor = await ctx.db.get(tx.vendorId);
        return {
          ...tx,
          vendorPhone: vendor?.phone || null,
          vendorGstin: vendor?.gstin || null,
          vendorAddress: vendor?.address || null,
        };
      })
    );
    return transactionsWithVendor;
  },
});

export const getTransactionsByVendor = query({
  args: { vendorId: v.id("vendors") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("transactions")
      .withIndex("by_vendor", (q) => q.eq("vendorId", args.vendorId))
      .order("desc")
      .collect();
  },
});

export const createTransaction = mutation({
  args: {
    type: v.union(v.literal("payment"), v.literal("bill")),
    vendorId: v.id("vendors"),
    vendorName: v.string(),
    amount: v.number(),
    profit: v.optional(v.number()),
    date: v.string(),
    notes: v.optional(v.string()),
    paymentMethod: v.optional(v.string()),
    items: v.optional(v.array(v.object({
      productId: v.optional(v.id("products")),
      cost: v.optional(v.number()),
      name: v.string(),
      qty: v.number(),
      price: v.number(),
      uom: v.optional(v.string()),
      cgst: v.number(),
      sgst: v.number(),
      profit: v.number(),
    }))),
  },
  handler: async (ctx, args) => {
    let invoiceNo: number | undefined;

    if (args.type === "bill") {
      const existingBills = await ctx.db
        .query("transactions")
        .withIndex("by_vendor_type", (q) => q.eq("vendorId", args.vendorId).eq("type", "bill"))
        .collect();
      const maxInvoiceNo = existingBills.reduce(
        (max, b) => (b.invoiceNo && b.invoiceNo > max ? b.invoiceNo : max),
        0,
      );
      invoiceNo = maxInvoiceNo + 1;
    }

    const txId = await ctx.db.insert("transactions", {
      type: args.type,
      vendorId: args.vendorId,
      vendorName: args.vendorName,
      amount: args.amount,
      profit: args.profit ?? 0,
      date: args.date,
      invoiceNo,
      notes: args.notes,
      paymentMethod: args.paymentMethod,
      items: args.items,
    });

    const vendor = await ctx.db.get(args.vendorId);
    if (vendor) {
      const delta = args.type === "bill" ? args.amount : -args.amount;
      await ctx.db.patch(args.vendorId, {
        dueAmount: Math.max(0, vendor.dueAmount + delta),
        lastTransaction: args.date,
        daysOverdue: 0,
      });
    }

    return txId;
  },
});

export const backfillInvoiceNumbers = mutation({
  handler: async (ctx) => {
    const vendors = await ctx.db.query("vendors").collect();
    let updated = 0;

    for (const vendor of vendors) {
      const bills = await ctx.db
        .query("transactions")
        .withIndex("by_vendor_type", (q) => q.eq("vendorId", vendor._id).eq("type", "bill"))
        .order("asc")
        .collect();

      let seq = 0;
      for (const bill of bills) {
        if (!bill.invoiceNo) {
          seq++;
          await ctx.db.patch(bill._id, { invoiceNo: seq });
          updated++;
        }
      }
    }

    return { updated };
  },
});

export const updateTransaction = mutation({
  args: {
    id: v.id("transactions"),
    date: v.optional(v.string()),
    notes: v.optional(v.string()),
    amount: v.optional(v.number()),
    profit: v.optional(v.number()),
    items: v.optional(v.array(v.object({
      productId: v.optional(v.id("products")),
      cost: v.optional(v.number()),
      name: v.string(),
      qty: v.number(),
      price: v.number(),
      uom: v.optional(v.string()),
      cgst: v.number(),
      sgst: v.number(),
      profit: v.number(),
    }))),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    const tx = await ctx.db.get(id);
    if (!tx) throw new Error("Transaction not found");

    await ctx.db.patch(id, updates);

    const vendor = await ctx.db.get(tx.vendorId);
    if (vendor && updates.date) {
      await ctx.db.patch(tx.vendorId, {
        lastTransaction: updates.date,
      });
    }

    return id;
  },
});

export const deleteTransaction = mutation({
  args: { id: v.id("transactions") },
  handler: async (ctx, args) => {
    const tx = await ctx.db.get(args.id);
    if (!tx) throw new Error("Transaction not found");

    const vendor = await ctx.db.get(tx.vendorId);
    if (vendor) {
      const delta = tx.type === "bill" ? -tx.amount : tx.amount;
      await ctx.db.patch(tx.vendorId, {
        dueAmount: Math.max(0, vendor.dueAmount + delta),
      });
    }

    await ctx.db.delete(args.id);
    return args.id;
  },
});
