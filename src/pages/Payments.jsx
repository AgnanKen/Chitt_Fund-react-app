import { useState, useEffect } from "react";
import {
  CreditCard,
  IndianRupee,
  Clock,
  AlertCircle,
  Search,
  Plus,
  X,
  CheckCircle,
} from "lucide-react";
import {
  supabase,
  isSupabaseConfigured,
} from "../lib/supabase";

const Payments = () => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    member_name: "",
    scheme_name: "Gold Chit - 1L",
    amount: "",
    payment_type: "Installment",
    payment_method: "UPI",
    reference_id: "",
    status: "Approved",
  });

  // Real-time synchronization
  useEffect(() => {
    const fetchPayments = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("payments")
          .select("*")
          .order("created_at", { ascending: false });

        if (error) throw error;
        setPayments(data || []);
      } catch (err) {
        console.warn("Supabase fetch payments failed:", err.message);
        setPayments([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPayments();

    if (isSupabaseConfigured()) {
      const channel = supabase
        .channel("realtime:payments")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "payments" },
          (payload) => {
            if (payload.eventType === "INSERT") {
              setPayments((prev) => [payload.new, ...prev]);
            } else if (payload.eventType === "UPDATE") {
              setPayments((prev) =>
                prev.map((p) => (p.id === payload.new.id ? payload.new : p))
              );
            } else if (payload.eventType === "DELETE") {
              setPayments((prev) => prev.filter((p) => p.id === payload.old.id));
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, []);

  // Handle Approve / Reject payment
  const handleUpdateStatus = async (id, newStatus) => {
    if (isSupabaseConfigured()) {
      try {
        const { error } = await supabase
          .from("payments")
          .update({ status: newStatus })
          .eq("id", id);

        if (error) throw error;
      } catch (err) {
        console.error("Failed to update payment status:", err.message);
      }
    } else {
      setPayments((prev) =>
        prev.map((p) => (p.id === id ? { ...p, status: newStatus } : p))
      );
    }

    setFeedbackMsg(`Payment #${id.slice(0, 8)} status marked as ${newStatus}`);
    setTimeout(() => setFeedbackMsg(null), 3000);
  };

  // Handle Record Payment
  const handleRecordPayment = async (e) => {
    e.preventDefault();
    if (!formData.member_name.trim() || !formData.amount) return;

    setSubmitting(true);
    const initials = formData.member_name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();

    const ref =
      formData.reference_id ||
      `${formData.payment_method}/2026/${Math.floor(100000 + Math.random() * 900000)}`;

    const newPaymentRecord = {
      member_name: formData.member_name,
      member_initials: initials,
      scheme_name: formData.scheme_name,
      amount: Number(formData.amount),
      payment_type: formData.payment_type,
      payment_method: formData.payment_method,
      reference_id: ref,
      status: formData.status,
    };

    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from("payments")
          .insert([newPaymentRecord])
          .select();

        if (error) throw error;
        if (data && data[0]) {
          setPayments((prev) => [data[0], ...prev]);
        }
      } catch (err) {
        console.error("Supabase payment insert error:", err.message);
        alert("Insert failed: " + err.message);
      }
    } else {
      const mockPayment = {
        ...newPaymentRecord,
        id: "pay-" + Date.now(),
        date: "Just now",
        created_at: new Date().toISOString(),
      };
      setPayments((prev) => [mockPayment, ...prev]);
    }

    setSubmitting(false);
    setIsRecordModalOpen(false);
    setFormData({
      member_name: "",
      scheme_name: "Gold Chit - 1L",
      amount: "",
      payment_type: "Installment",
      payment_method: "UPI",
      reference_id: "",
      status: "Approved",
    });

    setFeedbackMsg("Payment recorded successfully!");
    setTimeout(() => setFeedbackMsg(null), 3000);
  };

  // Metrics
  const totalApprovedAmount = payments
    .filter((p) => p.status === "Approved")
    .reduce((acc, curr) => acc + Number(curr.amount || 0), 0);

  const pendingPaymentsCount = payments.filter(
    (p) => p.status === "Pending"
  ).length;

  const rejectedPaymentsCount = payments.filter(
    (p) => p.status === "Rejected"
  ).length;

  // Filtered
  const filteredPayments = payments.filter((p) => {
    const matchesSearch =
      p.member_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.scheme_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.reference_id?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === "All" || p.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="dashboard-content">
      {/* Toast */}
      {feedbackMsg && (
        <div
          style={{
            position: "fixed",
            bottom: "24px",
            right: "24px",
            background: "#0f192d",
            color: "#ffffff",
            padding: "12px 20px",
            borderRadius: "10px",
            boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            zIndex: 3000,
            fontSize: "13px",
            fontWeight: "500",
          }}
        >
          <CheckCircle size={18} color="#10b486" />
          {feedbackMsg}
        </div>
      )}

      {/* TOP METRICS */}
      <section className="main-stats-grid" style={{ marginBottom: "26px" }}>
        <div className="main-stat-card">
          <div className="stat-card-top">
            <div className="stat-icon green">
              <IndianRupee size={22} />
            </div>
            <span className="stat-change">+8.1% vs last month</span>
          </div>
          <div className="stat-card-content">
            <p>APPROVED COLLECTIONS</p>
            <h2>₹{totalApprovedAmount.toLocaleString("en-IN")}</h2>
          </div>
        </div>

        <div className="main-stat-card">
          <div className="stat-card-top">
            <div className="stat-icon yellow">
              <Clock size={22} />
            </div>
            <span className="stat-change negative">Pending Bank Verification</span>
          </div>
          <div className="stat-card-content">
            <p>PENDING CLEARANCES</p>
            <h2>{pendingPaymentsCount} Receipts</h2>
          </div>
        </div>

        <div className="main-stat-card">
          <div className="stat-card-top">
            <div className="stat-icon red">
              <AlertCircle size={22} />
            </div>
            <span className="stat-change negative">Failed / Rejected</span>
          </div>
          <div className="stat-card-content">
            <p>REJECTED PAYMENTS</p>
            <h2>{rejectedPaymentsCount}</h2>
          </div>
        </div>

        <div className="main-stat-card">
          <div className="stat-card-top">
            <div className="stat-icon blue">
              <CreditCard size={22} />
            </div>
            <span className="stat-change">Active Ledger</span>
          </div>
          <div className="stat-card-content">
            <p>TOTAL RECORDED TRANSACTIONS</p>
            <h2>{payments.length}</h2>
          </div>
        </div>
      </section>

      {/* ACTION BAR */}
      <div className="page-action-bar">
        <div className="action-bar-left">
          <div className="action-search">
            <Search size={17} />
            <input
              type="text"
              placeholder="Search member, scheme, or UTR/Ref..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="filter-pills">
            {["All", "Approved", "Pending", "Rejected"].map((status) => (
              <button
                key={status}
                className={`filter-pill ${statusFilter === status ? "active" : ""}`}
                onClick={() => setStatusFilter(status)}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        <button className="btn-primary" onClick={() => setIsRecordModalOpen(true)}>
          <Plus size={17} />
          <span>Record Payment</span>
        </button>
      </div>

      {/* PAYMENTS TABLE */}
      <div className="activity-card">
        <div className="section-header">
          <div>
            <h2>Payments & Transactions Ledger</h2>
            <p>
              Showing {filteredPayments.length} of {payments.length} transactions
            </p>
          </div>
        </div>

        <div className="activity-table-wrapper">
          <table className="activity-table">
            <thead>
              <tr>
                <th>MEMBER</th>
                <th>SCHEME</th>
                <th>TYPE & METHOD</th>
                <th>REFERENCE / UTR</th>
                <th>AMOUNT</th>
                <th>STATUS</th>
                <th>DATE</th>
                <th style={{ textAlign: "right" }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: "center", padding: "40px" }}>
                    Loading transactions from Supabase...
                  </td>
                </tr>
              ) : filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: "center", padding: "40px", color: "#8993a4" }}>
                    No payment records match your filters.
                  </td>
                </tr>
              ) : (
                filteredPayments.map((payment) => (
                  <tr key={payment.id}>
                    <td>
                      <div className="member-cell">
                        <div className="member-avatar">
                          {payment.member_initials ||
                            (payment.member_name
                              ? payment.member_name.slice(0, 2).toUpperCase()
                              : "P")}
                        </div>
                        <strong>{payment.member_name}</strong>
                      </div>
                    </td>

                    <td>{payment.scheme_name}</td>

                    <td>
                      <div>
                        <span
                          style={{
                            fontWeight: 700,
                            color: payment.payment_type === "Payout" ? "#b45309" : "#344054",
                          }}
                        >
                          {payment.payment_type === "Payout" ? "🏆 Prize Disbursement" : (payment.payment_type || "Installment")}
                        </span>
                        <div style={{ fontSize: "11px", color: "#8894a6" }}>
                          via {payment.payment_method || "UPI"}
                        </div>
                      </div>
                    </td>

                    <td>
                      <span
                        style={{
                          fontFamily: "monospace",
                          fontSize: "11px",
                          color: "#475467",
                          background: "#f1f4f9",
                          padding: "3px 7px",
                          borderRadius: "5px",
                        }}
                      >
                        {payment.reference_id || "—"}
                      </span>
                    </td>

                    <td
                      className="amount-cell"
                      style={{
                        color: payment.payment_type === "Payout" ? "#059669" : "inherit",
                        fontWeight: "700",
                      }}
                    >
                      {payment.payment_type === "Payout" ? "+" : ""}₹{Number(payment.amount || 0).toLocaleString("en-IN")}
                    </td>

                    <td>
                      <span
                        className={`status-badge ${(payment.status || "pending").toLowerCase()}`}
                        style={{
                          background: payment.payment_type === "Payout" && payment.status === "Pending" ? "#fef3c7" : undefined,
                          color: payment.payment_type === "Payout" && payment.status === "Pending" ? "#b45309" : undefined,
                          border: payment.payment_type === "Payout" && payment.status === "Pending" ? "1px solid #fde68a" : undefined,
                        }}
                      >
                        {payment.payment_type === "Payout" && payment.status === "Pending"
                          ? "DISBURSEMENT PENDING"
                          : payment.status || "Pending"}
                      </span>
                    </td>

                    <td className="date-cell">
                      {payment.date ||
                        (payment.created_at
                          ? new Date(payment.created_at).toLocaleDateString()
                          : "Today")}
                    </td>

                    <td style={{ textAlign: "right", paddingRight: "24px" }}>
                      <div style={{ display: "inline-flex", gap: "6px" }}>
                        {payment.status !== "Approved" && (
                          <button
                            className="btn-sm-action btn-sm-approve"
                            title={payment.payment_type === "Payout" ? "Disburse Prize Payout" : "Approve Transaction"}
                            onClick={() => handleUpdateStatus(payment.id, "Approved")}
                          >
                            {payment.payment_type === "Payout" ? "Disburse" : "Approve"}
                          </button>
                        )}
                        {payment.status !== "Rejected" && (
                          <button
                            className="btn-sm-action btn-sm-reject"
                            title="Reject Transaction"
                            onClick={() => handleUpdateStatus(payment.id, "Rejected")}
                          >
                            Reject
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* RECORD PAYMENT MODAL */}
      {isRecordModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsRecordModalOpen(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Record New Payment</h2>
              <button
                className="modal-close-btn"
                onClick={() => setIsRecordModalOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleRecordPayment}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Member Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Priya Menon"
                    value={formData.member_name}
                    onChange={(e) =>
                      setFormData({ ...formData, member_name: e.target.value })
                    }
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Scheme *</label>
                    <select
                      value={formData.scheme_name}
                      onChange={(e) =>
                        setFormData({ ...formData, scheme_name: e.target.value })
                      }
                    >
                      <option value="Gold Chit - 1L">Gold Chit - 1L</option>
                      <option value="Silver Chit - 50K">Silver Chit - 50K</option>
                      <option value="Platinum Chit - 2L">Platinum Chit - 2L</option>
                      <option value="Diamond Wealth - 5L">Diamond Wealth - 5L</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Amount (₹) *</label>
                    <input
                      type="number"
                      required
                      placeholder="5000"
                      value={formData.amount}
                      onChange={(e) =>
                        setFormData({ ...formData, amount: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Payment Type</label>
                    <select
                      value={formData.payment_type}
                      onChange={(e) =>
                        setFormData({ ...formData, payment_type: e.target.value })
                      }
                    >
                      <option value="Installment">Installment</option>
                      <option value="KYC Fee">KYC Fee</option>
                      <option value="Payout">Winner Payout</option>
                      <option value="Penalty">Default Penalty</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Payment Method</label>
                    <select
                      value={formData.payment_method}
                      onChange={(e) =>
                        setFormData({ ...formData, payment_method: e.target.value })
                      }
                    >
                      <option value="UPI">UPI</option>
                      <option value="Bank Transfer">Bank Transfer</option>
                      <option value="Cash">Cash</option>
                      <option value="Card">Debit/Credit Card</option>
                      <option value="Cheque">Cheque</option>
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Reference ID / UTR Number</label>
                    <input
                      type="text"
                      placeholder="e.g. UPI/2026/894710"
                      value={formData.reference_id}
                      onChange={(e) =>
                        setFormData({ ...formData, reference_id: e.target.value })
                      }
                    />
                  </div>

                  <div className="form-group">
                    <label>Initial Status</label>
                    <select
                      value={formData.status}
                      onChange={(e) =>
                        setFormData({ ...formData, status: e.target.value })
                      }
                    >
                      <option value="Approved">Approved</option>
                      <option value="Pending">Pending</option>
                      <option value="Rejected">Rejected</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setIsRecordModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={submitting}>
                  {submitting ? "Saving to Supabase..." : "Save Payment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Payments;
