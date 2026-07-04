import { useEffect, useMemo, useCallback, useRef } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router";
import { ArrowLeft, Download, Share2 } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import html2pdf from "html2pdf.js";
import { Share } from "@capacitor/share";
import { Filesystem, Directory } from "@capacitor/filesystem";
import { toast } from "sonner";
import "./receipt.css";

function formatCurrency(amount: number): string {
  return `\u20B9${amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(dateString: string): string {
  return new Date(dateString)
    .toLocaleDateString("en-IN", { day: "numeric", month: "numeric", year: "numeric" })
    .replace(/\//g, "-");
}

function formatInvoiceNumber(date: string, seq: number, vendorName?: string): string {
  const d = new Date(date);
  const y = String(d.getFullYear()).slice(-2);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const prefix = vendorName
    ? vendorName.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 4)
    : "XX";
  return `${prefix}/${y}${m}${day}/${String(seq).padStart(3, "0")}`;
}

export default function ReceiptPreviewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const invoiceRef = useRef<HTMLDivElement>(null);
  const sharedRef = useRef(false);
  const transactions = useQuery(api.transactions.getTransactions) ?? [];
  const vendors = useQuery(api.vendors.getVendors) ?? [];

  const tx = useMemo(() => transactions.find((t) => t._id === id), [transactions, id]);
  const vendor = useMemo(() => (tx ? vendors.find((v) => v._id === tx.vendorId) : null), [vendors, tx]);

  const isPayment = tx?.type === "payment";

  const isNative = window.Capacitor?.getPlatform?.() !== "web" && window.Capacitor?.getPlatform?.() !== undefined;

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

  const generatePdfBlob = useCallback(async () => {
    const el = invoiceRef.current;
    if (!el || !tx) return null;
    try {
      const pdf = await html2pdf()
        .set({
          margin: 0,
          filename: `bill-${tx._id?.slice(-6) || "invoice"}.pdf`,
          image: { type: "jpeg", quality: 0.98 },
          html2canvas: { scale: 3, useCORS: true, logging: false },
          jsPDF: { unit: "mm", format: [210, 297], orientation: "portrait" },
        })
        .from(el)
        .toPdf()
        .get("pdf");
      return pdf.output("blob");
    } catch (e) {
      console.error("PDF generation failed:", e);
      return null;
    }
  }, [tx]);

  const downloadPDF = useCallback(async () => {
    const blob = await generatePdfBlob();
    if (!blob) return;

    if (isNative) {
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
      const saved = await Filesystem.writeFile({
        path: `bill-${tx?._id?.slice(-6) || "invoice"}.pdf`,
        data: base64,
        directory: Directory.Cache,
      });
      await Share.share({
        title: "Bill",
        text: `Bill for ${tx?.vendorName}`,
        files: [saved.uri],
      });
    } else {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `bill-${tx?._id?.slice(-6) || "invoice"}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  }, [tx, generatePdfBlob]);

  const handleShare = useCallback(async () => {
    const blob = await generatePdfBlob();
    if (!blob || !tx) return;

    if (isNative) {
      try {
        const base64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });
        const saved = await Filesystem.writeFile({
          path: `bill-${tx._id?.slice(-6)}.pdf`,
          data: base64,
          directory: Directory.Cache,
        });
        await Share.share({
          title: "Bill",
          text: `Bill from Arasi for ${tx.vendorName}`,
          files: [saved.uri],
        });
      } catch (e) {
        console.error("Share failed:", e);
      }
    } else {
      const file = new File([blob], `bill-${tx._id?.slice(-6)}.pdf`, { type: "application/pdf" });
      if (navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: "Bill", text: `Bill from Arasi for ${tx.vendorName}` });
        } catch (e) {
          if (e instanceof Error && e.name !== "AbortError") {
            toast.error("Share failed");
          }
        }
      } else {
        toast.info("Sharing not supported on this browser");
      }
    }
  }, [tx, generatePdfBlob]);

  useEffect(() => {
    if (tx && searchParams.get("share") === "1" && !sharedRef.current) {
      sharedRef.current = true;
      handleShare();
    }
  }, [tx, searchParams, handleShare]);

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

  const invoiceNo = tx.invoiceNo
    ? formatInvoiceNumber(tx.date, tx.invoiceNo, tx.vendorName)
    : "—";

  return (
    <div>
      <div className="px-5 pt-12 pb-4 bg-white border-b border-[#EDE0DB]">
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
            {!isNative && (
              <button
                onClick={downloadPDF}
                className="w-9 h-9 rounded-xl bg-[#8B1E24] flex items-center justify-center"
              >
                <Download size={16} className="text-white" />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="receipt-wrapper" ref={invoiceRef}>
        <div className="invoice">
          <div className="header">
            <div className="brand">
              <img src="/logo.png" alt="Arasi Logo" className="logo" />
              <div className="brand-text">
                <h1>அரசி</h1>
                <h2>Milk Agency</h2>
                <p>New Bus Stand, Opp. Aruppukottai</p>
                <p>Mobile : +91 95245 58005</p>
              </div>
            </div>
          </div>

          <hr />

          <div className="top">
            <div className="bill-info">
              <table>
                <tbody>
                  <tr><td><b>Bill No :</b></td><td>{invoiceNo}</td></tr>
                  <tr><td><b>Date :</b></td><td>{formatDate(tx.date)}</td></tr>
                </tbody>
              </table>

              <div className="bank">
                <b>Bank Details</b>
                <p><b>A/C No :</b> 43520985452</p>
                <p><b>IFSC :</b> SBIN0061171</p>
                <p>State Bank of India - Aruppukottai</p>
              </div>
            </div>

            <div className="qr">
              <img src="/qr.png" alt="Scan & Pay" />
              <p><b>Scan & Pay</b></p>
            </div>
          </div>

          <div className="customer">
            <b>Bill To</b>
            <p>{tx.vendorName}</p>
            {vendor?.address && <p>{vendor.address}</p>}
            {vendor?.phone && <p>Phone: {vendor.phone}</p>}
            {vendor?.gstin && <p>GSTIN: {vendor.gstin}</p>}
          </div>

          {!isPayment && tx.items && tx.items.length > 0 && (
            <table className="items">
              <thead>
                <tr>
                  <th>S.No</th>
                  <th>Product</th>
                  <th>Qty</th>
                  <th>Rate</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {tx.items.map((item, i) => (
                  <tr key={i}>
                    <td>{i + 1}</td>
                    <td>{item.name}</td>
                    <td>{item.qty} {item.uom || ""}</td>
                    <td>{formatCurrency(item.price)}</td>
                    <td>{formatCurrency(item.qty * item.price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <div className="total">
            <table>
              <tbody>
                <tr><td>Subtotal</td><td align="right">{formatCurrency(subtotal)}</td></tr>
                {totalCGST > 0 && (
                  <tr><td>CGST @ 2.5%</td><td align="right">{formatCurrency(totalCGST)}</td></tr>
                )}
                {totalSGST > 0 && (
                  <tr><td>SGST @ 2.5%</td><td align="right">{formatCurrency(totalSGST)}</td></tr>
                )}
                <tr><td>Discount</td><td align="right">₹0.00</td></tr>
                <tr className="grand"><td>Grand Total</td><td align="right">{formatCurrency(grandTotal)}</td></tr>
              </tbody>
            </table>
          </div>

          <div className="footer">
            <div><div className="line"></div>For அரசி Milk Agency</div>
          </div>

          <div className="thanks">Thank you for your business!</div>
        </div>
      </div>
    </div>
  );
}
