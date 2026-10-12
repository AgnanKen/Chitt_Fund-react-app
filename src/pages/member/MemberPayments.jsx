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
} from "lucide-react";
import { useAuth } from "../../context/useAuth";
import { supabase } from "../../lib/supabase";

const MemberPayments = () => {
  const { profile } = useAuth();
  const [payments, setPayments] = useState([]);
  const [availableSchemes, setAvailableSchemes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [submittingPayment, setSubmittingPayment] = useState(false);
  const [toastMsg, setToastMsg] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // New payment form
  const [payFormData, setPayFormData] = useState({
    scheme_name: "",
    amount: "",
    payment_method: "UPI",
    reference_id: "",
  });

  const memberId = profile?.member_id;
  const memberName = profile?.full_name || "Member";

  useEffect(() => {
    let ignore = false;

    const loadPayments = async () => {
      try {
        if (memberId) {
          const { data, error } = await supabase
            .from("payments")
            .select("*")
            .eq("member_id", memberId)
            .order("created_at", { ascending: false });

          if (error) throw error;
          if (!ignore) setPayments(data || []);
        } else {
          if (!ignore) setPayments([]);
        }

        // Fetch schemes for the payment dropdown
        const { data: sData } = await supabase
          .from("chit_schemes")
          .select("id, name, monthly_installment")
          .order("name");

        if (!ignore && sData && sData.length > 0) {
          setAvailableSchemes(sData);
          setPayFormData((prev) => {
            if (!prev.scheme_name) {
              return {
                ...prev,
                scheme_name: sData[0].name,
                amount: String(sData[0].monthly_installment || 5000),
              };
            }
            return prev;
          });
        }
      } catch (err) {
        console.warn("Failed fetching member payments:", err.message);
        if (!ignore) setPayments([]);
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    loadPayments();

    // Real-time synchronization
    const channel = supabase
      .channel("realtime:member_payments")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "payments" },
        () => {
          loadPayments();
        }
      )
      .subscribe();

    return () => {
      ignore = true;
      supabase.removeChannel(channel);
    };
  }, [memberId, refreshTrigger]);

  // Handle member submitting an installment payment
  const handleMakePayment = async (e) => {
    e.preventDefault();
    if (!payFormData.amount || !payFormData.reference_id) return;

    setSubmittingPayment(true);
    const numAmount = Number(payFormData.amount);
    const newRecord = {
      member_id: memberId,
      member_name: memberName,
      member_initials: profile?.avatar_initials || "M",
      scheme_name: payFormData.scheme_name,
      amount: numAmount,
      formatted_amount: `₹${numAmount.toLocaleString("en-IN")}`,
      payment_type: "Installment",
      payment_method: payFormData.payment_method,
      reference_id: payFormData.reference_id,
      status: "Pending", // Submitted by member, waiting for admin approval
    };

    try {
      const { data, error } = await supabase
        .from("payments")
        .insert([newRecord])
        .select();

      if (error) throw error;
      if (data && data.length > 0) {
        setPayments((prev) => [data[0], ...prev]);
      }
      setToastMsg("Payment submitted successfully! Status is Pending Admin verification.");
    } catch (err) {
      console.error("Failed to submit payment:", err.message);
      alert("Failed to submit payment to database: " + err.message);
    } finally {
      setSubmittingPayment(false);
      setIsPayModalOpen(false);
      setPayFormData((prev) => ({
        ...prev,
        reference_id: "",
      }));
      setTimeout(() => setToastMsg(null), 5000);
      setRefreshTrigger((prev) => prev + 1);
    }
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

  // Calculate totals from real data
  const totalApproved = payments
    .filter((p) => p.status === "Approved")
    .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

  const totalPending = payments
    .filter((p) => p.status === "Pending")
    .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

  return (
    <div className="member-page-shell">
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
          }}
        >
          <CheckCircle2 size={18} color="#059669" />
          <span>{toastMsg}</span>
        </div>
      )}

      <div className="member-page-header">
        <div>
          <p className="eyebrow subtle">My Finances</p>
          <h2>Payment Ledger & Receipts</h2>
          <p style={{ color: "#64748b", fontSize: "14px", marginTop: "4px" }}>
            View your installment history, download verified transaction receipts, or submit new dues.
          </p>
        </div>
        <button
          className="primary-button"
          type="button"
          onClick={() => setIsPayModalOpen(true)}
          style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}
        >
          <PlusCircle size={18} /> Make Payment
        </button>
      </div>

      {/* Financial Summary */}
      <div className="member-stats-grid" style={{ marginBottom: "24px" }}>
        <div className="member-stat-card">
          <div className="member-stat-icon" style={{ background: "#ecfdf5", color: "#059669" }}>
            <CheckCircle2 size={20} />
          </div>
          <div>
            <p>Total Paid (Approved)</p>
            <strong>₹{totalApproved.toLocaleString("en-IN")}</strong>
            <small>Verified by Foreman</small>
          </div>
        </div>

        <div className="member-stat-card">
          <div className="member-stat-icon" style={{ background: "#fffbeb", color: "#d97706" }}>
            <Clock size={20} />
          </div>
          <div>
            <p>Pending Verification</p>
            <strong>₹{totalPending.toLocaleString("en-IN")}</strong>
            <small>Under review</small>
          </div>
        </div>

        <div className="member-stat-card">
          <div className="member-stat-icon">
            <CreditCard size={20} />
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
            <p>Ledger Status</p>
            <strong>{payments.length > 0 ? "Active Account" : "Starting Zero"}</strong>
            <small>{payments.length > 0 ? "Good standing" : "No dues recorded"}</small>
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
              <th style={{ padding: "14px 18px", fontSize: "12px", color: "#64748b" }}>REFERENCE</th>
              <th style={{ padding: "14px 18px", fontSize: "12px", color: "#64748b" }}>SCHEME</th>
              <th style={{ padding: "14px 18px", fontSize: "12px", color: "#64748b" }}>METHOD</th>
              <th style={{ padding: "14px 18px", fontSize: "12px", color: "#64748b" }}>DATE</th>
              <th style={{ padding: "14px 18px", fontSize: "12px", color: "#64748b" }}>AMOUNT</th>
              <th style={{ padding: "14px 18px", fontSize: "12px", color: "#64748b" }}>STATUS</th>
              <th style={{ padding: "14px 18px", fontSize: "12px", color: "#64748b", textAlign: "right" }}>RECEIPT</th>
            </tr>
          </thead>
          <tbody>
            {filteredPayments.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: "center", padding: "40px", color: "#94a3b8" }}>
                  {loading
                    ? "Loading payment ledger records..."
                    : "No payment transactions recorded yet. Click 'Make Payment' to record your first installment."}
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
                    {payment.scheme_name || "Chit Pool"}
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
                      style={{ padding: "5px 10px", fontSize: "12px", display: "inline-flex", alignItems: "center", gap: "5px" }}
                      onClick={() => setSelectedReceipt(payment)}
                    >
                      <Eye size={13} /> View
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* RECEIPT VIEW MODAL */}
      {selectedReceipt && (
        <div className="modal-overlay" onClick={() => setSelectedReceipt(null)}>
          <div
            className="modal-card"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: "520px", width: "100%", padding: "28px" }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <FileText size={22} color="#1d4ed8" />
                <h3 style={{ margin: 0 }}>Payment Receipt</h3>
              </div>
              <button
                type="button"
                className="ghost-button"
                style={{ padding: "6px" }}
                onClick={() => setSelectedReceipt(null)}
              >
                <X size={18} />
              </button>
            </div>

            <div
              style={{
                background: "#f8faff",
                border: "1px dashed #cbd5e1",
                borderRadius: "16px",
                padding: "24px",
                marginBottom: "20px",
              }}
            >
              <div style={{ textAlign: "center", marginBottom: "18px", borderBottom: "1px solid #e2e8f0", paddingBottom: "14px" }}>
                <p style={{ margin: 0, fontWeight: "700", fontSize: "16px", color: "#0f172a" }}>LEDGERONE CHIT FUNDS</p>
                <span style={{ fontSize: "11px", color: "#64748b" }}>Official Digital Payment Voucher</span>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", fontSize: "13px" }}>
                <div>
                  <span style={{ color: "#64748b", display: "block" }}>Receipt No:</span>
                  <strong style={{ fontFamily: "monospace" }}>{selectedReceipt.reference_id || String(selectedReceipt.id).slice(0, 12)}</strong>
                </div>
                <div>
                  <span style={{ color: "#64748b", display: "block" }}>Date:</span>
                  <strong>{selectedReceipt.created_at ? new Date(selectedReceipt.created_at).toLocaleDateString("en-IN") : "Today"}</strong>
                </div>
                <div>
                  <span style={{ color: "#64748b", display: "block" }}>Member:</span>
                  <strong>{selectedReceipt.member_name || memberName}</strong>
                </div>
                <div>
                  <span style={{ color: "#64748b", display: "block" }}>Scheme:</span>
                  <strong>{selectedReceipt.scheme_name || "Chit Pool"}</strong>
                </div>
                <div>
                  <span style={{ color: "#64748b", display: "block" }}>Payment Method:</span>
                  <strong>{selectedReceipt.payment_method || "UPI"}</strong>
                </div>
                <div>
                  <span style={{ color: "#64748b", display: "block" }}>Verification Status:</span>
                  <span className={`status-tag ${String(selectedReceipt.status).toLowerCase()}`} style={{ display: "inline-block", marginTop: "2px" }}>
                    {selectedReceipt.status}
                  </span>
                </div>
              </div>

              <div
                style={{
                  marginTop: "20px",
                  paddingTop: "14px",
                  borderTop: "1px solid #e2e8f0",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span style={{ fontSize: "14px", fontWeight: "600", color: "#0f172a" }}>Amount Paid:</span>
                <span style={{ fontSize: "22px", fontWeight: "800", color: "#1d4ed8" }}>
                  ₹{Number(selectedReceipt.amount).toLocaleString("en-IN")}
                </span>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button
                type="button"
                className="secondary-button"
                onClick={() => setSelectedReceipt(null)}
              >
                Close
              </button>
              <button
                type="button"
                className="primary-button"
                style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
                onClick={() => {
                  alert("Receipt downloaded for voucher " + (selectedReceipt.reference_id || selectedReceipt.id));
                  setSelectedReceipt(null);
                }}
              >
                <Download size={15} /> Download PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MAKE PAYMENT MODAL */}
      {isPayModalOpen && (
        <div className="modal-overlay" onClick={() => setIsPayModalOpen(false)}>
          <div
            className="modal-card"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: "480px", width: "100%", padding: "28px" }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h3 style={{ margin: 0 }}>Submit Installment Payment</h3>
              <button
                type="button"
                className="ghost-button"
                style={{ padding: "6px" }}
                onClick={() => setIsPayModalOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleMakePayment}>
              <div className="form-group" style={{ marginBottom: "14px" }}>
                <label style={{ display: "block", fontSize: "13px", fontWeight: "600", marginBottom: "6px" }}>
                  Select Scheme
                </label>
                <select
                  className="input-wrap"
                  style={{ width: "100%", padding: "10px 14px", borderRadius: "10px", border: "1px solid #dfe7f5" }}
                  value={payFormData.scheme_name}
                  onChange={(e) => {
                    const selScheme = availableSchemes.find((s) => s.name === e.target.value);
                    setPayFormData({
                      ...payFormData,
                      scheme_name: e.target.value,
                      amount: selScheme ? String(selScheme.monthly_installment) : payFormData.amount,
                    });
                  }}
                >
                  {availableSchemes.length > 0 ? (
                    availableSchemes.map((s) => (
                      <option key={s.id} value={s.name}>
                        {s.name} (Monthly: ₹{Number(s.monthly_installment).toLocaleString("en-IN")})
                      </option>
                    ))
                  ) : (
                    <option value="Gold Chit - 1L">Gold Chit - 1L (Monthly: ₹5,000)</option>
                  )}
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: "14px" }}>
                <label style={{ display: "block", fontSize: "13px", fontWeight: "600", marginBottom: "6px" }}>
                  Installment Amount (₹)
                </label>
                <input
                  type="number"
                  required
                  className="input-wrap"
                  style={{ width: "100%", padding: "10px 14px", borderRadius: "10px", border: "1px solid #dfe7f5" }}
                  value={payFormData.amount}
                  onChange={(e) => setPayFormData({ ...payFormData, amount: e.target.value })}
                />
              </div>

              <div className="form-group" style={{ marginBottom: "14px" }}>
                <label style={{ display: "block", fontSize: "13px", fontWeight: "600", marginBottom: "6px" }}>
                  Payment Method
                </label>
                <select
                  className="input-wrap"
                  style={{ width: "100%", padding: "10px 14px", borderRadius: "10px", border: "1px solid #dfe7f5" }}
                  value={payFormData.payment_method}
                  onChange={(e) => setPayFormData({ ...payFormData, payment_method: e.target.value })}
                >
                  <option value="UPI">UPI (Google Pay / PhonePe / Paytm)</option>
                  <option value="Bank Transfer">Bank Transfer (NEFT / IMPS)</option>
                  <option value="Card">Debit / Credit Card</option>
                  <option value="Cash">Cash to Foreman</option>
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: "22px" }}>
                <label style={{ display: "block", fontSize: "13px", fontWeight: "600", marginBottom: "6px" }}>
                  Transaction / UTR Reference ID
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. UPI/2026/894710"
                  className="input-wrap"
                  style={{ width: "100%", padding: "10px 14px", borderRadius: "10px", border: "1px solid #dfe7f5" }}
                  value={payFormData.reference_id}
                  onChange={(e) => setPayFormData({ ...payFormData, reference_id: e.target.value })}
                />
                <small style={{ color: "#64748b", marginTop: "4px", display: "block" }}>
                  Enter the transaction ID provided by your payment provider.
                </small>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setIsPayModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="primary-button"
                  disabled={submittingPayment}
                >
                  {submittingPayment ? "Submitting to Supabase..." : "Submit Payment for Verification"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MemberPayments;
