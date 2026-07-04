import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  vendors: defineTable({
    name: v.string(),
    phone: v.string(),
    dueAmount: v.number(),
    lastTransaction: v.string(),
    avatar: v.string(),
    daysOverdue: v.number(),
    gstin: v.optional(v.string()),
    address: v.optional(v.string()),
    openingBalance: v.optional(v.number()),
  })
    .index("by_name", ["name"])
    .index("by_dueAmount", ["dueAmount"]),

  transactions: defineTable({
    type: v.union(v.literal("payment"), v.literal("bill")),
    vendorId: v.id("vendors"),
    vendorName: v.string(),
    amount: v.number(),
    profit: v.number(),
    date: v.string(),
    invoiceNo: v.optional(v.number()),
    notes: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
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
  })
    .index("by_vendor", ["vendorId"])
    .index("by_date", ["date"])
    .index("by_vendor_type", ["vendorId", "type"]),

  products: defineTable({
    name: v.string(),
    defaultPrice: v.number(),
    defaultQty: v.number(),
    type: v.union(v.literal("A"), v.literal("B")),
    purchasePrice: v.number(),
    uom: v.optional(v.string()),
    cgst: v.number(),
    sgst: v.number(),
  })
    .index("by_name", ["name"])
    .index("by_type", ["type"]),

  suppliers: defineTable({
    name: v.string(),
    phone: v.string(),
    address: v.optional(v.string()),
    totalPurchases: v.number(),
    totalPaid: v.number(),
    balanceDue: v.number(),
    lastPurchase: v.string(),
    avatar: v.string(),
  })
    .index("by_name", ["name"])
    .index("by_balanceDue", ["balanceDue"]),

  supplierTransactions: defineTable({
    type: v.union(v.literal("purchase"), v.literal("payment")),
    supplierId: v.id("suppliers"),
    supplierName: v.string(),
    amount: v.number(),
    date: v.string(),
    notes: v.optional(v.string()),
    paymentMethod: v.optional(v.string()),
  })
    .index("by_supplier", ["supplierId"])
    .index("by_date", ["date"]),
});
