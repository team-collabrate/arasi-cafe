import { Document, Page, View, Text, Image, Font, StyleSheet } from "@react-pdf/renderer";

Font.register({
  family: "NotoSansTamil",
  fonts: [
    { src: "/NotoSansTamil-Regular.ttf", fontWeight: 400, fontStyle: "normal" },
    { src: "/NotoSansTamil-Regular.ttf", fontWeight: 400, fontStyle: "italic" },
  ],
});

Font.registerHyphenationCallback(() => []);

const styles = StyleSheet.create({
  page: {
    fontFamily: "NotoSansTamil",
    padding: 30,
    fontSize: 11,
    color: "#000",
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 18,
    marginBottom: 20,
  },
  logo: {
    width: 85,
    height: 85,
  },
  brandText: {
    flex: 1,
  },
  brandTitle: {
    fontSize: 34,
    letterSpacing: 1,
  },
  brandSubtitle: {
    fontSize: 16,
    marginTop: 4,
  },
  brandLine: {
    fontSize: 11,
    color: "#555",
    marginTop: 2,
  },
  hr: {
    borderTop: "2px solid #8B0000",
    marginVertical: 20,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  billInfo: {
    width: "58%",
  },
  infoText: {
    fontSize: 11,
    marginBottom: 3,
  },
  bankBox: {
    border: "1px solid #ccc",
    padding: 12,
    marginTop: 10,
    backgroundColor: "#fafafa",
  },
  bankLabel: {
    fontWeight: "bold",
    marginBottom: 4,
  },
  bankText: {
    fontSize: 11,
    marginBottom: 3,
  },
  qrBox: {
    width: 220,
    alignItems: "center",
  },
  qrImg: {
    width: 190,
    height: 190,
  },
  qrLabel: {
    fontSize: 11,
    marginTop: 4,
  },
  customerBox: {
    border: "1px solid #ccc",
    padding: 15,
    marginBottom: 20,
  },
  customerLabel: {
    fontWeight: "bold",
    marginBottom: 4,
  },
  customerText: {
    fontSize: 11,
    marginBottom: 3,
  },
  itemsTable: {
    width: "100%",
    borderCollapse: "collapse",
  },
  itemsHeader: {
    flexDirection: "row",
    backgroundColor: "#333",
    color: "#fff",
  },
  itemsHeaderCell: {
    padding: 10,
    textAlign: "center",
    fontWeight: "bold",
    fontSize: 11,
    border: "1px solid #333",
  },
  itemsRow: {
    flexDirection: "row",
  },
  itemsCell: {
    padding: 10,
    textAlign: "center",
    fontSize: 11,
    border: "1px solid #ddd",
  },
  totalBox: {
    width: 320,
    marginLeft: "auto",
    marginTop: 20,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
  },
  totalLabel: {
    fontSize: 11,
  },
  totalValue: {
    fontSize: 11,
  },
  grandRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
  },
  grandLabel: {
    fontSize: 22,
    fontWeight: "bold",
  },
  grandValue: {
    fontSize: 22,
    fontWeight: "bold",
  },
  footer: {
    marginTop: 70,
    alignItems: "center",
  },
  footerLine: {
    borderTop: "1px solid #000",
    marginBottom: 8,
    width: 250,
  },
  footerText: {
    fontSize: 11,
  },
  thanks: {
    textAlign: "center",
    marginTop: 60,
    color: "#555",
    fontStyle: "italic",
    fontSize: 11,
  },
});

interface BillItem {
  name: string;
  qty: number;
  price: number;
  uom?: string;
  cgst: number;
  sgst: number;
}

interface ReceiptPDFProps {
  vendorName: string;
  vendorAddress?: string;
  vendorPhone?: string;
  vendorGstin?: string;
  date: string;
  invoiceNoFormatted: string;
  isPayment: boolean;
  items?: BillItem[];
  subtotal: number;
  totalCGST: number;
  totalSGST: number;
  grandTotal: number;
}

const fmt = (n: number) =>
  `\u20B9${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const fmtDate = (s: string) =>
  new Date(s).toLocaleDateString("en-IN", { day: "numeric", month: "numeric", year: "numeric" }).replace(/\//g, "-");

const cellWidths = [10, 34, 14, 18, 24];

const ReceiptPDF = ({
  vendorName,
  vendorAddress,
  vendorPhone,
  vendorGstin,
  date,
  invoiceNoFormatted,
  isPayment,
  items,
  subtotal,
  totalCGST,
  totalSGST,
  grandTotal,
}: ReceiptPDFProps) => (
  <Document>
    <Page size="A4" style={styles.page}>
      <View style={styles.brandRow}>
        <Image style={styles.logo} src="/logo.png" />
        <View style={styles.brandText}>
          <Text style={styles.brandTitle}>அரசி</Text>
          <Text style={styles.brandSubtitle}>Milk Agency</Text>
          <Text style={styles.brandLine}>New Bus Stand, Opp. Aruppukottai</Text>
          <Text style={styles.brandLine}>Mobile : +91 95245 58005</Text>
        </View>
      </View>

      <View style={styles.hr} />

      <View style={styles.topRow}>
        <View style={styles.billInfo}>
          <Text style={styles.infoText}>
            <Text style={{ fontWeight: "bold" }}>Bill No : </Text>
            {invoiceNoFormatted}
          </Text>
          <Text style={styles.infoText}>
            <Text style={{ fontWeight: "bold" }}>Date : </Text>
            {fmtDate(date)}
          </Text>

          <View style={styles.bankBox}>
            <Text style={styles.bankLabel}>Bank Details</Text>
            <Text style={styles.bankText}>
              <Text style={{ fontWeight: "bold" }}>A/C No : </Text>43520985452
            </Text>
            <Text style={styles.bankText}>
              <Text style={{ fontWeight: "bold" }}>IFSC : </Text>SBIN0061171
            </Text>
            <Text style={styles.bankText}>State Bank of India - Aruppukottai</Text>
          </View>
        </View>

        <View style={styles.qrBox}>
          <Image style={styles.qrImg} src="/qr.png" />
          <Text style={styles.qrLabel}>
            <Text style={{ fontWeight: "bold" }}>Scan & Pay</Text>
          </Text>
        </View>
      </View>

      <View style={styles.customerBox}>
        <Text style={styles.customerLabel}>Bill To</Text>
        <Text style={styles.customerText}>{vendorName}</Text>
        {vendorAddress && <Text style={styles.customerText}>{vendorAddress}</Text>}
        {vendorPhone && <Text style={styles.customerText}>Phone: {vendorPhone}</Text>}
        {vendorGstin && <Text style={styles.customerText}>GSTIN: {vendorGstin}</Text>}
      </View>

      {!isPayment && items && items.length > 0 && (
        <View>
          <View style={styles.itemsHeader}>
            <Text style={[styles.itemsHeaderCell, { width: "10%" }]}>S.No</Text>
            <Text style={[styles.itemsHeaderCell, { width: "34%" }]}>Product</Text>
            <Text style={[styles.itemsHeaderCell, { width: "14%" }]}>Qty</Text>
            <Text style={[styles.itemsHeaderCell, { width: "18%" }]}>Rate</Text>
            <Text style={[styles.itemsHeaderCell, { width: "24%" }]}>Amount</Text>
          </View>
          {items.map((item, i) => (
            <View key={i} style={styles.itemsRow}>
              <Text style={[styles.itemsCell, { width: "10%" }]}>{i + 1}</Text>
              <Text style={[styles.itemsCell, { width: "34%" }]}>{item.name}</Text>
              <Text style={[styles.itemsCell, { width: "14%" }]}>
                {item.qty} {item.uom || ""}
              </Text>
              <Text style={[styles.itemsCell, { width: "18%" }]}>{fmt(item.price)}</Text>
              <Text style={[styles.itemsCell, { width: "24%" }]}>{fmt(item.qty * item.price)}</Text>
            </View>
          ))}
        </View>
      )}

      <View style={styles.totalBox}>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Subtotal</Text>
          <Text style={styles.totalValue}>{fmt(subtotal)}</Text>
        </View>
        {totalCGST > 0 && (
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>CGST @ 2.5%</Text>
            <Text style={styles.totalValue}>{fmt(totalCGST)}</Text>
          </View>
        )}
        {totalSGST > 0 && (
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>SGST @ 2.5%</Text>
            <Text style={styles.totalValue}>{fmt(totalSGST)}</Text>
          </View>
        )}
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Discount</Text>
          <Text style={styles.totalValue}>₹0.00</Text>
        </View>
        <View style={styles.grandRow}>
          <Text style={styles.grandLabel}>Grand Total: </Text>
          <Text style={styles.grandValue}>{fmt(grandTotal)}</Text>
        </View>
      </View>

      <View style={styles.footer}>
        <View style={styles.footerLine} />
        <Text style={styles.footerText}>For அரசி Milk Agency</Text>
      </View>

      <Text style={styles.thanks}>Thank you for your business!</Text>
    </Page>
  </Document>
);

export default ReceiptPDF;
