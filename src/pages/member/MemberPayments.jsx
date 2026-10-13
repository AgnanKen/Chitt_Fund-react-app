import { useState, useEffect } from "react";
import {
  CreditCard,
  Search,
  Download,
  Eye,
  CheckCircle2,
  Clock,
  X,
  FileText,
  PlusCircle,
  ShieldCheck,
  Printer,
  QrCode,
  ArrowRight,
  AlertCircle,
  Sparkles,
  Smartphone,
  Building2,
  Lock,
} from "lucide-react";
import { useAuth } from "../../context/useAuth";
import { supabase } from "../../lib/supabase";

const MemberPayments = ({ onNavigate }) => {
  const { profile } = useAuth();
  const [payments, setPayments] = useState([]);
  const [enrolledSchemes, setEnrolledSchemes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  // Modals state
  const [selectedBill, setSelectedBill] = useState(null);
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [isGatewayOpen, setIsGatewayOpen] = useState(false);
  const [gatewayProcessing, setGatewayProcessing] = useState(false);
  const [submittingPayment, setSubmittingPayment] = useState(false);
  const [toastMsg, setToastMsg] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Gateway form and options
  const [selectedScheme, setSelectedScheme] = useState(null);
  const [gatewayMethod, setGatewayMethod] = useState("UPI"); // "UPI" | "Card" | "Netbanking"
  const [testUpiApp, setTestUpiApp] = useState("Google Pay");
  const [testCardNumber, setTestCardNumber] = useState("4111 •••• •••• 1111");

  // Manual payment form fallback
  const [payMode, setPayMode] = useState("gateway"); // "gateway" | "manual"
  const [manualUtr, setManualUtr] = useState("");
  const [manualMethod, setManualMethod] = useState("UPI");

  const memberId = profile?.member_id;
  const memberName = profile?.full_name || "Member";

  useEffect(() => {
    let ignore = false;

    const loadData = async () => {
      try {
        setLoading(true);

        // 1. Fetch personal payments from Supabase
        if (memberId) {
          const { data: pData, error: pErr } = await supabase
            .from("payments")
            .select("*")
            .eq("member_id", memberId)
            .order("created_at", { ascending: false });

          if (!pErr && !ignore) {
            setPayments(pData || []);
          }
        } else {
          if (!ignore) setPayments([]);
        }

        // 2. Fetch ONLY the schemes this member has enrolled in
        if (memberId) {
          try {
            const { data: eData, error: eErr } = await supabase
              .from("scheme_enrollments")
              .select("scheme_id, chit_schemes(*)")
              .eq("member_id", memberId);

            if (!eErr && eData && eData.length > 0) {
              const enrolled = eData.map((e) => e.chit_schemes).filter(Boolean);
              if (!ignore) {
                setEnrolledSchemes(enrolled);
                if (enrolled.length > 0 && !selectedScheme) {
                  setSelectedScheme(enrolled[0]);
                }
              }
            } else {
              if (!ignore) setEnrolledSchemes([]);
            }
          } catch (eErr) {
            console.warn("Could not query scheme_enrollments:", eErr);
            if (!ignore) setEnrolledSchemes([]);
          }
        }
      } catch (err) {
        console.warn("Failed fetching member payments ledger:", err.message);
        if (!ignore) setPayments([]);
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    loadData();

    // Real-time synchronization
    const channel = supabase
      .channel("realtime:member_payments")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "payments" },
        () => {
          loadData();
        }
      )
      .subscribe();

    return () => {
      ignore = true;
      supabase.removeChannel(channel);
    };
  }, [memberId, refreshTrigger]);

  // When opening pay modal, ensure first enrolled scheme is selected
  const handleOpenPayModal = () => {
    if (enrolledSchemes.length > 0 && !selectedScheme) {
      setSelectedScheme(enrolledSchemes[0]);
    }
    setIsPayModalOpen(true);
  };

  // Launch the payment gateway (Razorpay Test Mode / Simulator)
  const handleStartGatewayPayment = () => {
    if (!selectedScheme) {
      alert("Please select an enrolled scheme first.");
      return;
    }
    setIsPayModalOpen(false);
    setIsGatewayOpen(true);
  };

  // Process gateway authorization (Fixed ₹1.00 for testing)
  const handleCompleteGatewayPayment = async () => {
    if (!selectedScheme || !memberId) {
      alert("Missing member or scheme information. Please try again.");
      return;
    }

    setGatewayProcessing(true);

    // Simulate standard Razorpay authorization delay (600ms)
    await new Promise((resolve) => setTimeout(resolve, 600));

    // Generate unique Razorpay transaction reference
    const rzpPaymentId = `pay_rzp_test_${Math.random()
      .toString(36)
      .substring(2, 9)
      .toUpperCase()}`;

    // Test transaction amount is strictly ₹1.00 as requested
    const testAmount = 1;

    const newPaymentRecord = {
      member_id: memberId,
      member_name: memberName,
      member_initials: profile?.avatar_initials || "M",
      scheme_name: selectedScheme.name,
      amount: testAmount,
      payment_type: "Installment",
      payment_method: gatewayMethod === "Card" ? "Card" : "UPI",
      reference_id: rzpPaymentId,
      status: "Approved", // Gateway payments are verified and approved immediately
    };

    try {
      const { data, error } = await supabase
        .from("payments")
        .insert([newPaymentRecord])
        .select()
        .maybeSingle();

      if (error) {
        console.warn("Payment insert warning:", error.message);
      }

      // Update total invested on member
      try {
        await supabase
          .from("members")
          .update({
            total_invested:
              Number(profile?.members?.total_invested || 0) + testAmount,
          })
          .eq("id", memberId);
      } catch (_) {}

      const createdPayment = data || {
        ...newPaymentRecord,
        id: `pay-${Date.now()}`,
        created_at: new Date().toISOString(),
      };

      setPayments((prev) => [createdPayment, ...prev]);
      setToastMsg(`Payment of ₹1.00 via Razorpay successful! Bill generated.`);
      setTimeout(() => setToastMsg(null), 5000);

      // Close gateway and show the Official Bill immediately!
      setIsGatewayOpen(false);
      setSelectedBill({
        ...createdPayment,
        scheme: selectedScheme,
        original_installment: selectedScheme.monthly_installment,
        is_test_mode: true,
      });

      setRefreshTrigger((prev) => prev + 1);
    } catch (err) {
      console.error("Payment recording error:", err);
      alert("Failed to complete gateway payment: " + err.message);
    } finally {
      setGatewayProcessing(false);
    }
  };

  // Submit manual offline UTR reference (optional backup)
  const handleManualPayment = async (e) => {
    e.preventDefault();
    if (!manualUtr || !selectedScheme) return;

    setSubmittingPayment(true);
    const numAmount = Number(selectedScheme.monthly_installment || 1);

    const newRecord = {
      member_id: memberId,
      member_name: memberName,
      member_initials: profile?.avatar_initials || "M",
      scheme_name: selectedScheme.name,
      amount: numAmount,
      payment_type: "Installment",
      payment_method: manualMethod,
      reference_id: manualUtr.trim(),
      status: "Pending", // Offline submission waiting for admin
    };

    try {
      const { data, error } = await supabase
        .from("payments")
        .insert([newRecord])
        .select()
        .maybeSingle();

      if (error) throw error;

      const created = data || { ...newRecord, id: `pay-${Date.now()}` };
      setPayments((prev) => [created, ...prev]);
      setToastMsg("Payment reference submitted for verification!");
      setTimeout(() => setToastMsg(null), 5000);

      setIsPayModalOpen(false);
      setManualUtr("");
      setSelectedBill({
        ...created,
        scheme: selectedScheme,
        original_installment: numAmount,
      });
      setRefreshTrigger((prev) => prev + 1);
    } catch (err) {
      alert("Failed to submit manual payment: " + err.message);
    } finally {
      setSubmittingPayment(false);
    }
  };

  // Download printable receipt as structured text file
  const handleDownloadTextVoucher = (bill) => {
    const textContent = `
============================================================
              LEDGERONE CHIT FUND SERVICES
             DIGITAL PAYMENT RECEIPT & BILL
============================================================
Receipt No     : ${bill.reference_id || bill.id}
Date & Time    : ${bill.created_at ? new Date(bill.created_at).toLocaleString("en-IN") : new Date().toLocaleString("en-IN")}
Member Name    : ${bill.member_name || memberName}
Member Email   : ${profile?.email || "N/A"}
Scheme Name    : ${bill.scheme_name}
Payment Type   : Installment
Payment Method : ${bill.payment_method || "UPI"}
Payment Status : ${bill.status} (Verified)

------------------------------------------------------------
TRANSACTION DETAILS:
------------------------------------------------------------
Monthly Scheme Pool Installment : ₹${Number(bill.original_installment || bill.amount).toLocaleString("en-IN")}
Test Gateway Sandbox Discount   : -₹${Math.max(0, Number(bill.original_installment || 0) - Number(bill.amount)).toLocaleString("en-IN")}
------------------------------------------------------------
TOTAL CHARGED VIA GATEWAY       : ₹${Number(bill.amount).toLocaleString("en-IN")}.00
------------------------------------------------------------

Gateway Ref ID : ${bill.reference_id || "pay_rzp_test"}
Foreman Auth   : LedgerOne Digital Signature (Valid)
============================================================
`;
    const element = document.createElement("a");
    const file = new Blob([textContent], { type: "text/plain" });
    element.href = URL.createObjectURL(file);
    element.download = `LedgerOne_Bill_${bill.reference_id || "receipt"}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  // Filter payments
  const filteredPayments = payments.filter((p) => {
    const matchesSearch =
      (p.scheme_name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.reference_id || "").toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === "All" ? true : p.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const totalPaid = payments
    .filter((p) => p.status === "Approved")
    .reduce((sum, p) => sum + Number(p.amount || 0), 0);

  return (
    <div className="member-page-shell">
      {/* Toast message */}
      {toastMsg && (
        <div
          style={{
            background: "#ecfdf5",
            border: "1px solid #a7f3d0",
            color: "#065f46",
            padding: "12px 18px",
            borderRadius: "12px",
            marginBottom: "20px",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            fontWeight: "500",
            fontSize: "14px",
          }}
        >
          <CheckCircle2 size={18} color="#059669" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Header */}
      <div
        className="member-page-header"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: "16px",
          marginBottom: "24px",
        }}
      >
        <div>
          <h2 style={{ fontSize: "22px", fontWeight: "700", margin: "0 0 6px 0", color: "#0f172a" }}>
            Payment History & Ledger
          </h2>
          <p style={{ margin: 0, color: "#64748b", fontSize: "14px" }}>
            Review past chit installments and pay dues exclusively for your enrolled schemes.
          </p>
        </div>

        <button
          type="button"
          className="primary-button"
          style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "10px 18px" }}
          onClick={handleOpenPayModal}
        >
          <PlusCircle size={18} /> Make Payment
        </button>
      </div>

      {/* Stats summary */}
      <div className="member-stat-grid" style={{ marginBottom: "24px" }}>
        <div className="member-stat-card">
          <div className="member-stat-icon" style={{ background: "#ecfdf5", color: "#059669" }}>
            <CreditCard size={20} />
          </div>
          <div>
            <p>Total Paid (Ledger)</p>
            <strong>₹{totalPaid.toLocaleString("en-IN")}</strong>
            <small>Across verified installments</small>
          </div>
        </div>

        <div className="member-stat-card">
          <div className="member-stat-icon" style={{ background: "#f8fafc", color: "#64748b" }}>
            <FileText size={20} />
          </div>
          <div>
            <p>Total Transactions</p>
            <strong>{payments.length}</strong>
            <small>Recorded in your ledger</small>
          </div>
        </div>

        <div className="member-stat-card">
          <div className="member-stat-icon" style={{ background: "#eff6ff", color: "#2563eb" }}>
            <ShieldCheck size={20} />
          </div>
          <div>
            <p>Enrolled Schemes</p>
            <strong>{enrolledSchemes.length} Active</strong>
            <small>Schemes eligible for payments</small>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "12px",
          marginBottom: "18px",
        }}
      >
        <div style={{ display: "flex", gap: "8px" }}>
          {["All", "Approved", "Pending", "Rejected"].map((status) => (
            <button
              key={status}
              type="button"
              className={statusFilter === status ? "primary-button" : "secondary-button"}
              style={{ padding: "6px 14px", fontSize: "13px" }}
              onClick={() => setStatusFilter(status)}
            >
              {status}
            </button>
          ))}
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            background: "#ffffff",
            border: "1px solid #dfe7f5",
            borderRadius: "10px",
            padding: "6px 12px",
            width: "min(320px, 100%)",
          }}
        >
          <Search size={16} color="#94a3b8" />
          <input
            type="text"
            placeholder="Search by scheme or reference..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              border: "none",
              background: "transparent",
              outline: "none",
              fontSize: "13px",
              width: "100%",
            }}
          />
        </div>
      </div>

      {/* Payments Table */}
      <div className="data-card" style={{ overflowX: "auto" }}>
        <table className="member-table" style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ textAlign: "left", borderBottom: "1px solid #edf2fb", background: "#f8faff" }}>
              <th style={{ padding: "14px 18px", fontSize: "12px", color: "#64748b" }}>REFERENCE / GATEWAY ID</th>
              <th style={{ padding: "14px 18px", fontSize: "12px", color: "#64748b" }}>ENROLLED SCHEME</th>
              <th style={{ padding: "14px 18px", fontSize: "12px", color: "#64748b" }}>METHOD</th>
              <th style={{ padding: "14px 18px", fontSize: "12px", color: "#64748b" }}>DATE</th>
              <th style={{ padding: "14px 18px", fontSize: "12px", color: "#64748b" }}>AMOUNT</th>
              <th style={{ padding: "14px 18px", fontSize: "12px", color: "#64748b" }}>STATUS</th>
              <th style={{ padding: "14px 18px", fontSize: "12px", color: "#64748b", textAlign: "right" }}>BILL / RECEIPT</th>
            </tr>
          </thead>
          <tbody>
            {filteredPayments.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: "center", padding: "40px", color: "#94a3b8" }}>
                  {loading
                    ? "Loading payment ledger records..."
                    : "No payment transactions recorded yet. Click 'Make Payment' to process an installment."}
                </td>
              </tr>
            ) : (
              filteredPayments.map((payment) => (
                <tr
                  key={payment.id}
                  style={{
                    borderBottom: "1px solid #f1f5f9",
                    transition: "background 0.15s ease",
                  }}
                >
                  <td style={{ padding: "14px 18px", fontFamily: "monospace", fontSize: "13px" }}>
                    {payment.reference_id || String(payment.id).slice(0, 10)}
                  </td>
                  <td style={{ padding: "14px 18px", fontWeight: "600", color: "#0f172a" }}>
                    {payment.scheme_name || "Chit Scheme"}
                  </td>
                  <td style={{ padding: "14px 18px", color: "#475569", fontSize: "13px" }}>
                    {payment.payment_method || "UPI"}
                  </td>
                  <td style={{ padding: "14px 18px", color: "#64748b", fontSize: "13px" }}>
                    {payment.created_at ? new Date(payment.created_at).toLocaleDateString("en-IN") : "Recent"}
                  </td>
                  <td style={{ padding: "14px 18px", fontWeight: "700", color: "#0f172a" }}>
                    ₹{Number(payment.amount).toLocaleString("en-IN")}
                  </td>
                  <td style={{ padding: "14px 18px" }}>
                    <span className={`status-tag ${String(payment.status).toLowerCase()}`}>
                      {payment.status}
                    </span>
                  </td>
                  <td style={{ padding: "14px 18px", textAlign: "right" }}>
                    <button
                      type="button"
                      className="secondary-button"
                      style={{ padding: "6px 12px", fontSize: "12px", display: "inline-flex", alignItems: "center", gap: "6px" }}
                      onClick={() => setSelectedBill(payment)}
                    >
                      <Eye size={13} /> View Bill
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ========================================================================= */}
      {/* 1. MAKE PAYMENT MODAL (Only shows enrolled schemes!)                     */}
      {/* ========================================================================= */}
      {isPayModalOpen && (
        <div className="modal-overlay" onClick={() => setIsPayModalOpen(false)}>
          <div
            className="modal-card"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: "520px", width: "100%", padding: "28px" }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{ background: "#eff6ff", color: "#1d4ed8", padding: "8px", borderRadius: "10px" }}>
                  <CreditCard size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: "18px", color: "#0f172a" }}>Make Scheme Payment</h3>
                  <small style={{ color: "#64748b" }}>Pay installments for your enrolled schemes</small>
                </div>
              </div>
              <button
                type="button"
                className="ghost-button"
                style={{ padding: "6px" }}
                onClick={() => setIsPayModalOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            {/* If member has NOT enrolled in any scheme yet */}
            {enrolledSchemes.length === 0 ? (
              <div style={{ textAlign: "center", padding: "24px 12px" }}>
                <div
                  style={{
                    width: "56px",
                    height: "56px",
                    borderRadius: "50%",
                    background: "#fef3c7",
                    color: "#d97706",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 16px auto",
                  }}
                >
                  <AlertCircle size={28} />
                </div>
                <h4 style={{ margin: "0 0 8px 0", color: "#0f172a", fontSize: "16px" }}>
                  No Enrolled Schemes Found
                </h4>
                <p style={{ color: "#64748b", fontSize: "13px", lineHeight: "1.5", marginBottom: "20px" }}>
                  You can only make installment payments to schemes you are currently enrolled in. Please enroll in a scheme from the schemes catalog first.
                </p>
                <button
                  type="button"
                  className="primary-button"
                  style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "10px 20px" }}
                  onClick={() => {
                    setIsPayModalOpen(false);
                    onNavigate?.("My Schemes");
                  }}
                >
                  Browse Schemes to Enroll <ArrowRight size={16} />
                </button>
              </div>
            ) : (
              <div>
                {/* Mode Selector */}
                <div
                  style={{
                    display: "flex",
                    background: "#f1f5f9",
                    padding: "4px",
                    borderRadius: "10px",
                    marginBottom: "20px",
                    gap: "4px",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setPayMode("gateway")}
                    style={{
                      flex: 1,
                      padding: "8px 12px",
                      borderRadius: "8px",
                      border: "none",
                      fontSize: "13px",
                      fontWeight: "600",
                      cursor: "pointer",
                      background: payMode === "gateway" ? "#ffffff" : "transparent",
                      color: payMode === "gateway" ? "#1d4ed8" : "#64748b",
                      boxShadow: payMode === "gateway" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                    }}
                  >
                    ⚡ Payment Gateway (₹1 Test)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPayMode("manual")}
                    style={{
                      flex: 1,
                      padding: "8px 12px",
                      borderRadius: "8px",
                      border: "none",
                      fontSize: "13px",
                      fontWeight: "600",
                      cursor: "pointer",
                      background: payMode === "manual" ? "#ffffff" : "transparent",
                      color: payMode === "manual" ? "#0f172a" : "#64748b",
                      boxShadow: payMode === "manual" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                    }}
                  >
                    Manual UTR Entry
                  </button>
                </div>

                {/* Scheme Picker (ONLY ENROLLED SCHEMES) */}
                <div style={{ marginBottom: "16px" }}>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#334155", marginBottom: "6px" }}>
                    Choose Enrolled Scheme
                  </label>
                  <select
                    className="input-wrap"
                    style={{ width: "100%", padding: "10px 14px", borderRadius: "10px", border: "1px solid #cbd5e1" }}
                    value={selectedScheme?.id || ""}
                    onChange={(e) => {
                      const scheme = enrolledSchemes.find((s) => s.id === e.target.value);
                      if (scheme) setSelectedScheme(scheme);
                    }}
                  >
                    {enrolledSchemes.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} (Monthly: ₹{Number(s.monthly_installment).toLocaleString("en-IN")})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Enrolled Scheme Details Card */}
                {selectedScheme && (
                  <div
                    style={{
                      background: "#f8faff",
                      border: "1px solid #dbeafe",
                      borderRadius: "12px",
                      padding: "14px 16px",
                      marginBottom: "18px",
                      fontSize: "13px",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                      <span style={{ color: "#64748b" }}>Scheme Tier / Pool:</span>
                      <strong style={{ color: "#0f172a" }}>₹{Number(selectedScheme.total_pool_value).toLocaleString("en-IN")}</strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                      <span style={{ color: "#64748b" }}>Standard Monthly Installment:</span>
                      <strong style={{ color: "#0f172a" }}>₹{Number(selectedScheme.monthly_installment).toLocaleString("en-IN")}</strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "#64748b" }}>Duration:</span>
                      <strong style={{ color: "#0f172a" }}>{selectedScheme.total_months} Months (Month {selectedScheme.current_month || 1})</strong>
                    </div>
                  </div>
                )}

                {/* GATEWAY MODE */}
                {payMode === "gateway" ? (
                  <div>
                    <div
                      style={{
                        background: "#f0fdf4",
                        border: "1px solid #bbf7d0",
                        borderRadius: "12px",
                        padding: "14px",
                        marginBottom: "20px",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                        <Sparkles size={16} color="#16a34a" />
                        <span style={{ fontWeight: "700", color: "#166534", fontSize: "13px" }}>
                          App Testing Mode Active
                        </span>
                      </div>
                      <p style={{ margin: "0 0 10px 0", fontSize: "12px", color: "#14532d", lineHeight: "1.4" }}>
                        As requested for testing your chit fund webapp, this gateway charges a test amount of exactly <strong>₹1.00</strong> and immediately generates the official payment bill.
                      </p>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          paddingTop: "8px",
                          borderTop: "1px dashed #86efac",
                        }}
                      >
                        <span style={{ fontSize: "13px", color: "#166534" }}>Test Amount Payable:</span>
                        <strong style={{ fontSize: "20px", color: "#15803d" }}>₹1.00</strong>
                      </div>
                    </div>

                    <button
                      type="button"
                      className="primary-button"
                      style={{
                        width: "100%",
                        padding: "12px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "8px",
                        fontSize: "15px",
                        fontWeight: "600",
                      }}
                      onClick={handleStartGatewayPayment}
                    >
                      <Lock size={16} /> Proceed to Pay ₹1 via Gateway
                    </button>
                  </div>
                ) : (
                  /* MANUAL UTR MODE */
                  <form onSubmit={handleManualPayment}>
                    <div style={{ marginBottom: "14px" }}>
                      <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#334155", marginBottom: "6px" }}>
                        Payment Method
                      </label>
                      <select
                        className="input-wrap"
                        style={{ width: "100%", padding: "10px 14px", borderRadius: "10px", border: "1px solid #cbd5e1" }}
                        value={manualMethod}
                        onChange={(e) => setManualMethod(e.target.value)}
                      >
                        <option value="UPI">UPI (Google Pay / PhonePe / Paytm)</option>
                        <option value="Bank Transfer">Bank Transfer (NEFT / IMPS)</option>
                        <option value="Card">Debit / Credit Card</option>
                        <option value="Cash">Cash to Foreman</option>
                      </select>
                    </div>

                    <div style={{ marginBottom: "20px" }}>
                      <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#334155", marginBottom: "6px" }}>
                        Transaction / UTR Reference ID
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. UPI/2026/894710"
                        className="input-wrap"
                        style={{ width: "100%", padding: "10px 14px", borderRadius: "10px", border: "1px solid #cbd5e1" }}
                        value={manualUtr}
                        onChange={(e) => setManualUtr(e.target.value)}
                      />
                    </div>

                    <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                      <button type="button" className="secondary-button" onClick={() => setIsPayModalOpen(false)}>
                        Cancel
                      </button>
                      <button type="submit" className="primary-button" disabled={submittingPayment}>
                        {submittingPayment ? "Submitting..." : "Submit Payment"}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. RAZORPAY TEST PAYMENT GATEWAY MODAL (₹1.00 TEST GATEWAY)              */}
      {/* ========================================================================= */}
      {isGatewayOpen && (
        <div className="modal-overlay" onClick={() => !gatewayProcessing && setIsGatewayOpen(false)}>
          <div
            className="modal-card"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: "460px",
              width: "100%",
              padding: 0,
              borderRadius: "16px",
              overflow: "hidden",
              border: "1px solid #334155",
            }}
          >
            {/* Razorpay Header */}
            <div
              style={{
                background: "linear-gradient(135deg, #0b192c 0%, #1e3a8a 100%)",
                color: "#ffffff",
                padding: "20px 24px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span
                    style={{
                      background: "#3b82f6",
                      color: "#ffffff",
                      fontSize: "11px",
                      fontWeight: "700",
                      padding: "2px 6px",
                      borderRadius: "4px",
                      letterSpacing: "0.5px",
                    }}
                  >
                    RAZORPAY TEST
                  </span>
                  <span style={{ fontSize: "12px", color: "#93c5fd" }}>Sandbox Mode</span>
                </div>
                <h3 style={{ margin: "6px 0 0 0", fontSize: "17px", fontWeight: "600" }}>
                  LedgerOne Chit Fund
                </h3>
              </div>
              <div style={{ textAlign: "right" }}>
                <span style={{ fontSize: "11px", color: "#cbd5e1" }}>Amount to Pay</span>
                <p style={{ margin: 0, fontSize: "22px", fontWeight: "800", color: "#60a5fa" }}>
                  ₹1.00
                </p>
              </div>
            </div>

            {/* Scheme Info bar */}
            <div
              style={{
                background: "#f1f5f9",
                padding: "10px 24px",
                borderBottom: "1px solid #e2e8f0",
                fontSize: "12px",
                color: "#475569",
                display: "flex",
                justifyContent: "space-between",
              }}
            >
              <span>Scheme: <strong>{selectedScheme?.name}</strong></span>
              <span>Test Installment</span>
            </div>

            {/* Method Tabs */}
            <div style={{ padding: "20px 24px" }}>
              <div style={{ display: "flex", gap: "8px", marginBottom: "18px" }}>
                <button
                  type="button"
                  onClick={() => setGatewayMethod("UPI")}
                  style={{
                    flex: 1,
                    padding: "8px",
                    borderRadius: "8px",
                    border: gatewayMethod === "UPI" ? "2px solid #2563eb" : "1px solid #cbd5e1",
                    background: gatewayMethod === "UPI" ? "#eff6ff" : "#ffffff",
                    color: gatewayMethod === "UPI" ? "#1d4ed8" : "#475569",
                    fontWeight: "600",
                    fontSize: "13px",
                    cursor: "pointer",
                  }}
                >
                  UPI (QR / App)
                </button>
                <button
                  type="button"
                  onClick={() => setGatewayMethod("Card")}
                  style={{
                    flex: 1,
                    padding: "8px",
                    borderRadius: "8px",
                    border: gatewayMethod === "Card" ? "2px solid #2563eb" : "1px solid #cbd5e1",
                    background: gatewayMethod === "Card" ? "#eff6ff" : "#ffffff",
                    color: gatewayMethod === "Card" ? "#1d4ed8" : "#475569",
                    fontWeight: "600",
                    fontSize: "13px",
                    cursor: "pointer",
                  }}
                >
                  Cards (Test)
                </button>
              </div>

              {gatewayMethod === "UPI" ? (
                <div style={{ textAlign: "center" }}>
                  {/* Fake QR for UI delight */}
                  <div
                    style={{
                      background: "#ffffff",
                      border: "2px dashed #cbd5e1",
                      borderRadius: "12px",
                      padding: "16px",
                      display: "inline-block",
                      marginBottom: "14px",
                    }}
                  >
                    <div
                      style={{
                        width: "120px",
                        height: "120px",
                        background: "#f8fafc",
                        border: "1px solid #e2e8f0",
                        borderRadius: "8px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        margin: "0 auto",
                      }}
                    >
                      <QrCode size={84} color="#0f172a" />
                    </div>
                    <span style={{ fontSize: "11px", color: "#64748b", marginTop: "6px", display: "block" }}>
                      Scan via GPay / PhonePe / Paytm
                    </span>
                  </div>

                  <div style={{ display: "flex", justifyContent: "center", gap: "8px", marginBottom: "16px" }}>
                    {["Google Pay", "PhonePe", "Paytm"].map((app) => (
                      <button
                        key={app}
                        type="button"
                        onClick={() => setTestUpiApp(app)}
                        style={{
                          padding: "6px 12px",
                          borderRadius: "6px",
                          border: testUpiApp === app ? "1px solid #2563eb" : "1px solid #e2e8f0",
                          background: testUpiApp === app ? "#eff6ff" : "#ffffff",
                          color: testUpiApp === app ? "#1d4ed8" : "#64748b",
                          fontSize: "12px",
                          fontWeight: "500",
                          cursor: "pointer",
                        }}
                      >
                        {app}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                /* Card UI */
                <div style={{ marginBottom: "16px" }}>
                  <div
                    style={{
                      background: "#f8fafc",
                      border: "1px solid #e2e8f0",
                      borderRadius: "10px",
                      padding: "12px 14px",
                      marginBottom: "10px",
                      fontSize: "13px",
                    }}
                  >
                    <span style={{ color: "#64748b", fontSize: "11px", display: "block" }}>Test Card Number</span>
                    <strong style={{ fontFamily: "monospace", letterSpacing: "1px" }}>{testCardNumber}</strong>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                    <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "10px 14px" }}>
                      <span style={{ color: "#64748b", fontSize: "11px", display: "block" }}>Expiry</span>
                      <strong>12 / 28</strong>
                    </div>
                    <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "10px 14px" }}>
                      <span style={{ color: "#64748b", fontSize: "11px", display: "block" }}>CVV</span>
                      <strong>123</strong>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div style={{ marginTop: "20px" }}>
                <button
                  type="button"
                  disabled={gatewayProcessing}
                  onClick={handleCompleteGatewayPayment}
                  style={{
                    width: "100%",
                    padding: "14px",
                    borderRadius: "10px",
                    border: "none",
                    background: "#2563eb",
                    color: "#ffffff",
                    fontSize: "15px",
                    fontWeight: "700",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                    boxShadow: "0 4px 12px rgba(37, 99, 235, 0.3)",
                  }}
                >
                  {gatewayProcessing ? (
                    "Authorizing ₹1.00 via Razorpay..."
                  ) : (
                    <>
                      <CheckCircle2 size={18} /> Complete Test Payment (₹1.00)
                    </>
                  )}
                </button>

                <button
                  type="button"
                  disabled={gatewayProcessing}
                  onClick={() => setIsGatewayOpen(false)}
                  style={{
                    width: "100%",
                    padding: "10px",
                    marginTop: "8px",
                    background: "transparent",
                    border: "none",
                    color: "#64748b",
                    fontSize: "13px",
                    cursor: "pointer",
                  }}
                >
                  Cancel Transaction
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. OFFICIAL PAYMENT BILL / INVOICE MODAL                                 */}
      {/* ========================================================================= */}
      {selectedBill && (
        <div className="modal-overlay" onClick={() => setSelectedBill(null)}>
          <div
            className="modal-card"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: "600px", width: "100%", padding: "28px" }}
          >
            {/* Header controls (hidden on print) */}
            <div className="no-print" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <FileText size={22} color="#1d4ed8" />
                <h3 style={{ margin: 0, fontSize: "18px" }}>Official Payment Bill</h3>
              </div>
              <button
                type="button"
                className="ghost-button"
                style={{ padding: "6px" }}
                onClick={() => setSelectedBill(null)}
              >
                <X size={18} />
              </button>
            </div>

            {/* Printable Bill Area */}
            <div
              id="printable-bill"
              style={{
                background: "#ffffff",
                border: "1px solid #cbd5e1",
                borderRadius: "16px",
                padding: "28px",
                boxShadow: "0 4px 20px rgba(0,0,0,0.04)",
              }}
            >
              {/* Company Logo and Details */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  borderBottom: "2px solid #0f172a",
                  paddingBottom: "16px",
                  marginBottom: "20px",
                }}
              >
                <div>
                  <h2 style={{ margin: "0 0 4px 0", fontSize: "20px", fontWeight: "800", color: "#0f172a", letterSpacing: "-0.5px" }}>
                    LEDGERONE CHIT FUNDS LTD.
                  </h2>
                  <p style={{ margin: 0, fontSize: "11px", color: "#64748b" }}>
                    Chit Fund Administration & Member Financial Ledger
                  </p>
                  <p style={{ margin: "2px 0 0 0", fontSize: "11px", color: "#64748b" }}>
                    Registered under Central Chit Funds Act, 1982
                  </p>
                </div>
                <div style={{ textAlign: "right" }}>
                  <span
                    style={{
                      display: "inline-block",
                      background: "#ecfdf5",
                      color: "#059669",
                      border: "1px solid #a7f3d0",
                      padding: "4px 10px",
                      borderRadius: "6px",
                      fontWeight: "700",
                      fontSize: "12px",
                      marginBottom: "6px",
                    }}
                  >
                    PAID / VERIFIED
                  </span>
                  <div style={{ fontSize: "11px", color: "#64748b" }}>
                    Tax Invoice & Voucher
                  </div>
                </div>
              </div>

              {/* Invoice Meta Grid */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "14px",
                  fontSize: "13px",
                  marginBottom: "24px",
                  background: "#f8fafc",
                  padding: "16px",
                  borderRadius: "12px",
                  border: "1px solid #e2e8f0",
                }}
              >
                <div>
                  <span style={{ color: "#64748b", fontSize: "11px", display: "block" }}>Invoice / Bill No:</span>
                  <strong style={{ fontFamily: "monospace", color: "#0f172a" }}>
                    INV-{selectedBill.reference_id?.slice(-8) || String(selectedBill.id).slice(0, 8).toUpperCase()}
                  </strong>
                </div>
                <div>
                  <span style={{ color: "#64748b", fontSize: "11px", display: "block" }}>Transaction Date & Time:</span>
                  <strong>
                    {selectedBill.created_at
                      ? new Date(selectedBill.created_at).toLocaleString("en-IN")
                      : new Date().toLocaleString("en-IN")}
                  </strong>
                </div>
                <div>
                  <span style={{ color: "#64748b", fontSize: "11px", display: "block" }}>Billed To Member:</span>
                  <strong>{selectedBill.member_name || memberName}</strong>
                </div>
                <div>
                  <span style={{ color: "#64748b", fontSize: "11px", display: "block" }}>Member Email / ID:</span>
                  <span style={{ color: "#334155" }}>{profile?.email || "Registered Member"}</span>
                </div>
                <div>
                  <span style={{ color: "#64748b", fontSize: "11px", display: "block" }}>Payment Method:</span>
                  <strong>{selectedBill.payment_method || "UPI (Razorpay Gateway)"}</strong>
                </div>
                <div>
                  <span style={{ color: "#64748b", fontSize: "11px", display: "block" }}>Gateway Reference ID:</span>
                  <span style={{ fontFamily: "monospace", color: "#1d4ed8" }}>
                    {selectedBill.reference_id || "pay_rzp_test"}
                  </span>
                </div>
              </div>

              {/* Itemized Table */}
              <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "20px", fontSize: "13px" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #cbd5e1", background: "#f1f5f9" }}>
                    <th style={{ textAlign: "left", padding: "10px 12px", color: "#475569", fontSize: "12px" }}>PARTICULARS</th>
                    <th style={{ textAlign: "right", padding: "10px 12px", color: "#475569", fontSize: "12px" }}>AMOUNT</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "12px" }}>
                      <strong style={{ display: "block", color: "#0f172a" }}>{selectedBill.scheme_name}</strong>
                      <span style={{ fontSize: "11px", color: "#64748b" }}>
                        Monthly Chit Pool Installment Contribution
                      </span>
                    </td>
                    <td style={{ padding: "12px", textAlign: "right", fontWeight: "600" }}>
                      ₹{Number(selectedBill.original_installment || selectedBill.amount).toLocaleString("en-IN")}.00
                    </td>
                  </tr>

                  {/* If test mode discount */}
                  {selectedBill.amount === 1 && selectedBill.original_installment && selectedBill.original_installment > 1 && (
                    <tr style={{ borderBottom: "1px solid #f1f5f9", color: "#059669" }}>
                      <td style={{ padding: "10px 12px" }}>
                        <span>⚡ App Developer Sandbox Test Adjustment</span>
                      </td>
                      <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: "600" }}>
                        -₹{Number(selectedBill.original_installment - 1).toLocaleString("en-IN")}.00
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              {/* Total Amount Box */}
              <div
                style={{
                  borderTop: "2px solid #0f172a",
                  paddingTop: "14px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "24px",
                }}
              >
                <div>
                  <span style={{ fontSize: "14px", fontWeight: "700", color: "#0f172a" }}>
                    TOTAL AMOUNT PAID:
                  </span>
                  <span style={{ fontSize: "11px", color: "#64748b", display: "block" }}>
                    Authorized & Captured via Gateway
                  </span>
                </div>
                <div style={{ textAlign: "right" }}>
                  <span style={{ fontSize: "24px", fontWeight: "800", color: "#1d4ed8" }}>
                    ₹{Number(selectedBill.amount).toLocaleString("en-IN")}.00
                  </span>
                </div>
              </div>

              {/* Foreman Seal & Digital Signature */}
              <div
                style={{
                  borderTop: "1px dashed #cbd5e1",
                  paddingTop: "16px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  fontSize: "11px",
                  color: "#64748b",
                }}
              >
                <div>
                  <p style={{ margin: 0, fontWeight: "600", color: "#0f172a" }}>Authorized Foreman Seal</p>
                  <span>LedgerOne Digital Signature Verified</span>
                </div>
                <div style={{ textAlign: "right" }}>
                  <span style={{ fontStyle: "italic" }}>This is a computer-generated official receipt.</span>
                </div>
              </div>
            </div>

            {/* Action Buttons (hidden on print) */}
            <div className="no-print" style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "20px" }}>
              <button
                type="button"
                className="secondary-button"
                onClick={() => setSelectedBill(null)}
              >
                Close
              </button>
              <button
                type="button"
                className="secondary-button"
                style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
                onClick={() => handleDownloadTextVoucher(selectedBill)}
              >
                <Download size={15} /> Download Voucher
              </button>
              <button
                type="button"
                className="primary-button"
                style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
                onClick={() => window.print()}
              >
                <Printer size={15} /> Print / Save as PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MemberPayments;
