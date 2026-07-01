import { useEffect, useMemo, useCallback } from "react";
import { useParams, useNavigate } from "react-router";
import { ArrowLeft, Printer, Share2 } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

interface BillItemDisplay {
  name: string;
  qty: number;
  price: number;
  cgst: number;
  sgst: number;
  uom?: string;
}

function formatCurrency(amount: number): string {
  return `\u20B9${amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(dateString: string): string {
  return new Date(dateString)
    .toLocaleDateString("en-IN", { day: "numeric", month: "numeric", year: "numeric" })
    .replace(/\//g, "-");
}

function numberToWords(num: number): string {
  const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
  const numToWords = (n: number): string => {
    if (n < 20) return ones[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? " " + ones[n % 10] : "");
    if (n < 1000) return ones[Math.floor(n / 100)] + " Hundred" + (n % 100 ? " " + numToWords(n % 100) : "");
    if (n < 100000) return numToWords(Math.floor(n / 1000)) + " Thousand" + (n % 1000 ? " " + numToWords(n % 1000) : "");
    if (n < 10000000) return numToWords(Math.floor(n / 100000)) + " Lakh" + (n % 100000 ? " " + numToWords(n % 100000) : "");
    return numToWords(Math.floor(n / 10000000)) + " Crore" + (n % 10000000 ? " " + numToWords(n % 10000000) : "");
  };
  return numToWords(Math.floor(num));
}

function generateInvoiceNumber(date: string, index: number): string {
  const d = new Date(date);
  const y = String(d.getFullYear()).slice(-2);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `HO ${y}${m}${day}${String(index).padStart(3, "0")}`;
}

export default function ReceiptPreviewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const transactions = useQuery(api.transactions.getTransactions) ?? [];
  const vendors = useQuery(api.vendors.getVendors) ?? [];

  const tx = useMemo(() => transactions.find((t) => t._id === id), [transactions, id]);
  const vendor = useMemo(() => (tx ? vendors.find((v) => v._id === tx.vendorId) : null), [vendors, tx]);

  const isPayment = tx?.type === "payment";

  const subtotal = useMemo(() => {
    if (!tx?.items) return 0;
    return tx.items.reduce((s, i) => s + i.qty * i.price, 0);
  }, [tx]);

  const totalCGST = useMemo(() => {
    if (!tx?.items) return 0;
    return tx.items.reduce((s, i) => s + i.qty * i.price * (i.cgst / 100), 0);
  }, [tx]);

  const totalSGST = useMemo(() => {
    if (!tx?.items) return 0;
    return tx.items.reduce((s, i) => s + i.qty * i.price * (i.sgst / 100), 0);
  }, [tx]);

  const grandTotal = subtotal + totalCGST + totalSGST;
  const totalQty = useMemo(() => {
    if (!tx?.items) return 0;
    return tx.items.reduce((s, i) => s + i.qty, 0);
  }, [tx]);

  const handlePrint = useCallback(() => window.print(), []);

  const handleShare = useCallback(async () => {
    if (navigator.share) {
      await navigator.share({ title: "Arasi - Bill", text: `Bill from Arasi for ${tx?.vendorName}` });
    } else {
      window.print();
    }
  }, [tx]);

  useEffect(() => {
    if (tx) {
      const t = setTimeout(() => window.print(), 600);
      return () => clearTimeout(t);
    }
  }, [tx]);

  if (!tx) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        <p className="text-[#6B4C4F]">Receipt not found</p>
        <button onClick={() => navigate(-1)} className="text-[#8B1E24] font-semibold">
          Go back
        </button>
      </div>
    );
  }

  const invoiceNo = generateInvoiceNumber(tx.date, tx._id.length);
  const taxableValue = subtotal;

  return (
    <div className="bg-[#F9F6F2] min-h-screen">
      {/* Toolbar - hidden when printing */}
      <div className="px-5 pt-12 pb-4 bg-white border-b border-[#EDE0DB] print:hidden">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-xl bg-white border border-[#EDE0DB] flex items-center justify-center shadow-sm"
          >
            <ArrowLeft size={18} className="text-[#1A0A0C]" />
          </button>
          <h1 className="text-base font-bold text-[#1A0A0C]">Receipt</h1>
          <div className="flex gap-2">
            <button
              onClick={handleShare}
              className="w-9 h-9 rounded-xl bg-[#16A34A] flex items-center justify-center"
            >
              <Share2 size={16} className="text-white" />
            </button>
            <button
              onClick={handlePrint}
              className="w-9 h-9 rounded-xl bg-[#8B1E24] flex items-center justify-center"
            >
              <Printer size={16} className="text-white" />
            </button>
          </div>
        </div>
      </div>

      {/* Bill Template */}
      <div className="px-5 pt-5 pb-8 print:px-0 print:pt-0">
        <div
          id="bill-template"
          style={{
            fontFamily: '"Noto Sans Tamil", "Kapil Unicode", Arial, sans-serif',
            backgroundColor: "#ffffff",
            color: "#000000",
            padding: "40px",
            width: "794px",
            margin: "0 auto",
            boxSizing: "border-box",
            fontSize: "12px",
          }}
        >
          {/* Company Header */}
          <div
            style={{
              textAlign: "center",
              marginBottom: "20px",
              borderBottom: "2px solid #333",
              paddingBottom: "15px",
            }}
          >
            <h1 style={{ margin: 0, fontSize: "24px", fontWeight: "bold", letterSpacing: "2px" }}>
              ARASI
            </h1>
            <h2 style={{ margin: "5px 0", fontSize: "22px", fontWeight: "bold" }}>ARUPPUKKOTTAI</h2>
            <p style={{ margin: "3px 0", fontSize: "11px" }}>Dairy &amp; Meat Products</p>
            <p style={{ margin: "3px 0", fontSize: "11px" }}>Wholesale &amp; Retail</p>
            <p style={{ margin: "3px 0", fontSize: "11px" }}>Tamil Nadu</p>
          </div>

          {/* Bill Info */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: "15px",
              border: "1px solid #333",
              padding: "10px",
            }}
          >
            <div style={{ width: "30%" }}>
              <p style={{ margin: 0, fontWeight: "bold" }}>Bill No : {invoiceNo}</p>
            </div>
            <div style={{ width: "30%", textAlign: "center" }}>
              <p style={{ margin: 0, fontWeight: "bold", fontSize: "14px" }}>Tax Invoice</p>
              <p style={{ margin: "3px 0 0", fontSize: "11px" }}>Original</p>
            </div>
            <div style={{ width: "30%", textAlign: "right" }}>
              <p style={{ margin: "3px 0 0", fontWeight: "bold" }}>
                Bill Date : {formatDate(tx.date)}
              </p>
            </div>
          </div>

          {/* Customer and Shop Details */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: "12px",
              marginBottom: "15px",
              border: "1px solid #333",
              padding: "10px",
            }}
          >
            <div style={{ width: "50%" }}>
              <p style={{ margin: 0, fontWeight: "bold", fontSize: "14px" }}>Arasi</p>
              <div style={{ marginTop: "8px", fontSize: "11px" }}>
                <p style={{ margin: 0 }}>GSTIN : 33HFQPK1834A1ZN</p>
                <p style={{ margin: "3px 0 0" }}>E-Mail.: kugan2077@gmail.com</p>
                <p style={{ margin: "3px 0 0" }}>GPAY No.: 9500614153</p>
              </div>
            </div>
            <div style={{ width: "50%", textAlign: "right" }}>
              <p style={{ margin: 0, fontWeight: "bold", fontSize: "14px" }}>{tx.vendorName}</p>
              <div style={{ marginTop: "8px", fontSize: "11px" }}>
                {vendor?.gstin && <p style={{ margin: 0 }}>GSTIN : {vendor.gstin}</p>}
                {vendor?.address && <p style={{ margin: "3px 0 0" }}>Address : {vendor.address}</p>}
                <p style={{ margin: "3px 0 0" }}>
                  Phone No.: {vendor?.phone || "N/A"}
                </p>
              </div>
            </div>
          </div>

          {/* Items Table */}
          {!isPayment && tx.items && tx.items.length > 0 && (
            <div style={{ marginBottom: "15px" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: "10px",
                  border: "1px solid #333",
                }}
              >
                <thead>
                  <tr style={{ backgroundColor: "#f0f0f0" }}>
                    <th style={{ padding: "8px 4px", border: "1px solid #333", textAlign: "center", fontWeight: "bold" }}>SNo</th>
                    <th style={{ padding: "8px 4px", border: "1px solid #333", textAlign: "center", fontWeight: "bold" }}>Product</th>
                    <th style={{ padding: "8px 4px", border: "1px solid #333", textAlign: "center", fontWeight: "bold" }}>Qty</th>
                    <th style={{ padding: "8px 4px", border: "1px solid #333", textAlign: "center", fontWeight: "bold" }}>UOM</th>
                    <th style={{ padding: "8px 4px", border: "1px solid #333", textAlign: "center", fontWeight: "bold" }}>Rate</th>
                    <th style={{ padding: "8px 4px", border: "1px solid #333", textAlign: "center", fontWeight: "bold" }}>Net Amount</th>
                    <th style={{ padding: "8px 4px", border: "1px solid #333", textAlign: "center", fontWeight: "bold" }}>Taxable Value</th>
                    <th style={{ padding: "8px 4px", border: "1px solid #333", textAlign: "center", fontWeight: "bold" }}>CGST%</th>
                    <th style={{ padding: "8px 4px", border: "1px solid #333", textAlign: "center", fontWeight: "bold" }}>CGST Amt</th>
                    <th style={{ padding: "8px 4px", border: "1px solid #333", textAlign: "center", fontWeight: "bold" }}>SGST%</th>
                    <th style={{ padding: "8px 4px", border: "1px solid #333", textAlign: "center", fontWeight: "bold" }}>SGST Amt</th>
                  </tr>
                </thead>
                <tbody>
                  {tx.items.map((item, index) => {
                    const itemSubtotal = item.qty * item.price;
                    return (
                      <tr key={index}>
                        <td style={{ padding: "6px 4px", border: "1px solid #333", textAlign: "center" }}>{index + 1}</td>
                        <td style={{ padding: "6px 4px", border: "1px solid #333", textAlign: "left" }}>{item.name}</td>
                        <td style={{ padding: "6px 4px", border: "1px solid #333", textAlign: "center" }}>{item.qty.toFixed(2)}</td>
                        <td style={{ padding: "6px 4px", border: "1px solid #333", textAlign: "center" }}>{item.uom || "pcs"}</td>
                        <td style={{ padding: "6px 4px", border: "1px solid #333", textAlign: "right" }}>{formatCurrency(item.price)}</td>
                        <td style={{ padding: "6px 4px", border: "1px solid #333", textAlign: "right" }}>{formatCurrency(itemSubtotal)}</td>
                        <td style={{ padding: "6px 4px", border: "1px solid #333", textAlign: "right" }}>{formatCurrency(itemSubtotal)}</td>
                        <td style={{ padding: "6px 4px", border: "1px solid #333", textAlign: "center" }}>{item.cgst}%</td>
                        <td style={{ padding: "6px 4px", border: "1px solid #333", textAlign: "right" }}>{(itemSubtotal * item.cgst / 100).toFixed(2)}</td>
                        <td style={{ padding: "6px 4px", border: "1px solid #333", textAlign: "center" }}>{item.sgst}%</td>
                        <td style={{ padding: "6px 4px", border: "1px solid #333", textAlign: "right" }}>{(itemSubtotal * item.sgst / 100).toFixed(2)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Payment Only - Summary */}
          {isPayment && (
            <div
              style={{
                marginBottom: "20px",
                padding: "20px",
                backgroundColor: "#f0fdf4",
                borderRadius: "6px",
                border: "2px solid #22c55e",
                textAlign: "center",
              }}
            >
              <p style={{ margin: "0 0 10px", fontSize: "18px", fontWeight: "bold", color: "#16a34a" }}>
                ✓ Payment Received
              </p>
              <p style={{ margin: "0 0 8px", fontSize: "24px", fontWeight: "bold", color: "#15803d" }}>
                {formatCurrency(tx.amount)}
              </p>
              {tx.paymentMethod && (
                <p style={{ margin: 0, fontSize: "14px", color: "#166534" }}>
                  via {tx.paymentMethod}
                </p>
              )}
            </div>
          )}

          {/* Totals Section */}
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "20px" }}>
            <div style={{ width: "45%", fontSize: "10px" }}>
              <p style={{ margin: 0, fontWeight: "bold", borderBottom: "1px solid #333", paddingBottom: "5px" }}>
                GST Details
              </p>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "10px" }}>
                <thead>
                  <tr style={{ backgroundColor: "#f0f0f0" }}>
                    <th style={{ padding: "4px", border: "1px solid #333", textAlign: "center" }}>GST%</th>
                    <th style={{ padding: "4px", border: "1px solid #333", textAlign: "center" }}>CGST%</th>
                    <th style={{ padding: "4px", border: "1px solid #333", textAlign: "center" }}>CGST Tax</th>
                    <th style={{ padding: "4px", border: "1px solid #333", textAlign: "center" }}>SGST%</th>
                    <th style={{ padding: "4px", border: "1px solid #333", textAlign: "center" }}>SGST Tax</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ padding: "4px", border: "1px solid #333", textAlign: "center" }}>5%</td>
                    <td style={{ padding: "4px", border: "1px solid #333", textAlign: "center" }}>2.5%</td>
                    <td style={{ padding: "4px", border: "1px solid #333", textAlign: "right" }}>{formatCurrency(totalCGST)}</td>
                    <td style={{ padding: "4px", border: "1px solid #333", textAlign: "center" }}>2.5%</td>
                    <td style={{ padding: "4px", border: "1px solid #333", textAlign: "right" }}>{formatCurrency(totalSGST)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div style={{ width: "45%", fontSize: "11px" }}>
              {!isPayment && (
                <>
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: "1px solid #ccc" }}>
                    <span>Total Qty :</span>
                    <span style={{ fontWeight: "bold" }}>{totalQty.toFixed(2)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: "1px solid #ccc" }}>
                    <span>Net Amount :</span>
                    <span style={{ fontWeight: "bold" }}>{formatCurrency(subtotal)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: "1px solid #ccc" }}>
                    <span>Discount :</span>
                    <span style={{ fontWeight: "bold" }}>{formatCurrency(0)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: "1px solid #ccc" }}>
                    <span>Taxable Value :</span>
                    <span style={{ fontWeight: "bold" }}>{formatCurrency(taxableValue)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: "1px solid #ccc" }}>
                    <span>CGST Amount :</span>
                    <span style={{ fontWeight: "bold" }}>{formatCurrency(totalCGST)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: "1px solid #ccc" }}>
                    <span>SGST Amount :</span>
                    <span style={{ fontWeight: "bold" }}>{formatCurrency(totalSGST)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: "1px solid #ccc" }}>
                    <span>Round Off :</span>
                    <span style={{ fontWeight: "bold" }}>0.00</span>
                  </div>
                </>
              )}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "8px 0",
                  backgroundColor: isPayment ? "#16a34a" : "#333",
                  color: "white",
                  borderRadius: "4px",
                  marginTop: isPayment ? 0 : "2px",
                }}
              >
                <span style={{ fontWeight: "bold" }}>{isPayment ? "Amount Paid :" : "Grand Total :"}</span>
                <span style={{ fontWeight: "bold" }}>{formatCurrency(isPayment ? tx.amount : grandTotal)}</span>
              </div>
            </div>
          </div>

          {/* Amount in Words */}
          {!isPayment && (
            <div
              style={{
                marginBottom: "20px",
                padding: "10px",
                backgroundColor: "#f9fafb",
                borderRadius: "4px",
                textAlign: "center",
                fontSize: "12px",
              }}
            >
              <p style={{ margin: 0, fontWeight: "bold" }}>
                Rupees {numberToWords(grandTotal)} Only
              </p>
            </div>
          )}

          {/* Notes */}
          {tx.notes && (
            <div
              style={{
                marginBottom: "20px",
                padding: "10px",
                backgroundColor: "#fefce8",
                borderRadius: "4px",
                fontSize: "11px",
              }}
            >
              <p style={{ margin: 0 }}>
                <strong>Note:</strong> {tx.notes}
              </p>
            </div>
          )}

          {/* Bank Details */}
          <div style={{ marginBottom: "20px", fontSize: "11px" }}>
            <p style={{ margin: "0 0 5px", fontWeight: "bold" }}>BANK NAME : TMBANK</p>
            <p style={{ margin: 0 }}>BRANCH : ARUPPUKKOTTAI</p>
            <p style={{ margin: "3px 0 0" }}>A/C No. : 038534600000000</p>
            <p style={{ margin: "3px 0 0" }}>IFSC : TMBL0000038</p>
            <p style={{ margin: "3px 0 0" }}>MICR : 626060202</p>
            <p style={{ margin: "3px 0 0" }}>A/C Type : Current Account</p>
          </div>

          {/* Footer */}
          <div
            style={{
              borderTop: "2px solid #333",
              paddingTop: "10px",
              textAlign: "center",
              fontSize: "10px",
            }}
          >
            <p style={{ margin: 0, fontStyle: "italic" }}>E. &amp; O.E.</p>
            <p style={{ margin: "5px 0 0", fontWeight: "bold" }}>BUYER SIGNATURE</p>
            <p style={{ margin: "5px 0 0", fontStyle: "italic" }}>
              This is a Computer Generated Invoice.
            </p>
            <p style={{ margin: "5px 0 0" }}>Authorised Signature</p>
          </div>
        </div>
      </div>
    </div>
  );
}
