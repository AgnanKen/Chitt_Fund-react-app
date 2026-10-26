import { useState, useEffect } from "react";
import {
  ArrowRight,
  IndianRupee,
  Layers3,
  PiggyBank,
  Wallet,
  CalendarClock,
  Activity,
  Gavel,
  CreditCard,
  Sparkles,
  ShieldCheck,
  ShieldAlert,
  Clock,
  Trophy,
} from "lucide-react";
import { useAuth } from "../../context/useAuth";
import { supabase } from "../../lib/supabase";
import { getAdjustedInstallmentDetails } from "../../lib/chitCalculations";

const MemberDashboard = ({ onNavigate }) => {
  const { profile } = useAuth();
  const [memberPayments, setMemberPayments] = useState([]);
  const [enrolledSchemes, setEnrolledSchemes] = useState([]);
  const [auctions, setAuctions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        const memberId = profile?.member_id;

        // 1. Fetch personal payments from Supabase
        if (memberId) {
          const { data: pData } = await supabase
            .from("payments")
            .select("*")
            .eq("member_id", memberId)
            .order("created_at", { ascending: false });

          if (isMounted && pData) {
            setMemberPayments(pData);
          }

          // 2. Fetch enrolled schemes from scheme_enrollments
          const { data: enrollData } = await supabase
            .from("scheme_enrollments")
            .select("*, chit_schemes(*)")
            .eq("member_id", memberId);

          if (isMounted && enrollData) {
            setEnrolledSchemes(enrollData.map((e) => e.chit_schemes).filter(Boolean));
          }
        } else {
          setMemberPayments([]);
          setEnrolledSchemes([]);
        }

        // 3. Fetch active auctions from Supabase
        const { data: aData } = await supabase
          .from("auctions")
          .select("*")
          .order("is_live", { ascending: false })
          .limit(2);

        if (isMounted && aData) {
          setAuctions(aData);
        }
      } catch (err) {
        console.warn("Error loading member dashboard:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchDashboardData();

    return () => {
      isMounted = false;
    };
  }, [profile]);

  // Calculations based on REAL user data (starts from 0 if new)
  const approvedTotal = memberPayments
    .filter((p) => p.status === "Approved")
    .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

  const displayInvested =
    approvedTotal > 0
      ? `₹${approvedTotal.toLocaleString("en-IN")}`
      : "₹0";

  const latestPayment = memberPayments[0] || null;

  const nextDueScheme = enrolledSchemes[0] || null;
  const nextDueAdj = nextDueScheme ? getAdjustedInstallmentDetails(nextDueScheme) : null;
  const nextDueText = nextDueAdj
    ? `₹${Number(nextDueAdj.netAdjustedInstallment || 0).toLocaleString("en-IN")}`
    : "None";

  // Check for pending winner prize disbursements
  const pendingDisbursements = memberPayments.filter(
    (p) => p.payment_type === "Payout" || p.payment_type === "Prize Disbursement"
  );

  const summaryCards = [
    {
      label: "Enrolled schemes",
      value: String(enrolledSchemes.length),
      icon: <Layers3 size={18} />,
      detail: enrolledSchemes.length > 0 ? `${enrolledSchemes.length} active pool(s)` : "Start your first savings",
      onClick: () => onNavigate?.("My Schemes"),
    },
    {
      label: "Total invested",
      value: displayInvested,
      icon: <IndianRupee size={18} />,
      detail: approvedTotal > 0 ? "Verified by Foreman" : "Zero installments paid yet",
      onClick: () => onNavigate?.("My Payments"),
    },
    {
      label: "Last payment",
      value: latestPayment ? latestPayment.status : "No payments",
      icon: <PiggyBank size={18} />,
      detail: latestPayment ? `${latestPayment.scheme_name} • ₹${Number(latestPayment.amount).toLocaleString("en-IN")}` : "No recorded dues yet",
      onClick: () => onNavigate?.("My Payments"),
    },
    {
      label: "Next installment",
      value: nextDueText,
      icon: <CalendarClock size={18} />,
      detail:
        nextDueAdj && nextDueAdj.isAdjusted
          ? `Adjusted (-₹${nextDueAdj.dividendCredit.toLocaleString("en-IN")} dividend)`
          : nextDueScheme
          ? `${nextDueScheme.name} due next`
          : "No upcoming dues",
      onClick: () => onNavigate?.("My Schemes"),
    },
  ];

  return (
    <div className="member-dashboard">
      {/* WINNER PRIZE DISBURSEMENT PENDING BANNER */}
      {pendingDisbursements.length > 0 && (
        <div
          style={{
            background: "linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)",
            border: "1px solid #fde68a",
            borderRadius: "14px",
            padding: "16px 20px",
            marginBottom: "20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "12px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                width: "42px",
                height: "42px",
                borderRadius: "10px",
                background: "#fef3c7",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "22px",
              }}
            >
              🏆
            </div>
            <div>
              <div style={{ fontSize: "11px", fontWeight: "700", color: "#92400e", textTransform: "uppercase" }}>
                Auction Prize Winning Notification
              </div>
              <strong style={{ fontSize: "16px", color: "#78350f" }}>
                Prize Payout: ₹{Number(pendingDisbursements[0].amount).toLocaleString("en-IN")} ({pendingDisbursements[0].scheme_name})
              </strong>
              <div style={{ fontSize: "12px", color: "#b45309", marginTop: "2px" }}>
                Winner disbursement is marked <strong>PENDING</strong> while the Foreman verifies statutory suretyship/guarantees under Section 16.
              </div>
            </div>
          </div>

          <span
            style={{
              background: "#fef3c7",
              color: "#b45309",
              border: "1px solid #fde68a",
              padding: "6px 14px",
              borderRadius: "20px",
              fontSize: "12px",
              fontWeight: "800",
              letterSpacing: "0.5px",
            }}
          >
            DISBURSEMENT PENDING
          </span>
        </div>
      )}

      <section className="member-hero">
        <div>
          <p className="eyebrow subtle">Member Portal</p>
          <h2>Welcome, {profile?.full_name || "Member"}</h2>
          <p style={{ color: "#64748b", fontSize: "14px", marginTop: "4px" }}>
            Track your personal chit funds, verified installments, and live auction bids.
          </p>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          {enrolledSchemes.length > 0 ? (
            <button
              className="primary-button"
              type="button"
              onClick={() => onNavigate?.("My Payments")}
              style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
            >
              <CreditCard size={16} /> Pay Installment
            </button>
          ) : (
            <button
              className="primary-button"
              type="button"
              onClick={() => onNavigate?.("My Schemes")}
              style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
            >
              <Sparkles size={16} /> Enroll in Scheme
            </button>
          )}
          <button
            className="ghost-button"
            type="button"
            onClick={() => onNavigate?.("My Payments")}
            style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
          >
            View statements <ArrowRight size={16} />
          </button>
        </div>
      </section>

      {/* KYC Verification Status Banner */}
      {(() => {
        const kycStatus = profile?.members?.kyc_status || "Pending";
        if (kycStatus === "Approved") {
          return (
            <div
              style={{
                background: "#f0fdf4",
                border: "1px solid #bbf7d0",
                borderRadius: "14px",
                padding: "12px 18px",
                marginBottom: "20px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "10px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <ShieldCheck size={18} color="#16a34a" />
                <span style={{ fontSize: "13px", color: "#166534", fontWeight: "600" }}>
                  KYC Verified Member — Full Live Bidding & Payout Authorization Active
                </span>
              </div>
              <button
                type="button"
                onClick={() => onNavigate?.("KYC Verification")}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#15803d",
                  fontSize: "12px",
                  fontWeight: "600",
                  cursor: "pointer",
                  textDecoration: "underline",
                }}
              >
                View KYC Details
              </button>
            </div>
          );
        } else if (kycStatus === "Rejected") {
          return (
            <div
              style={{
                background: "#fef2f2",
                border: "1px solid #fecaca",
                borderRadius: "14px",
                padding: "14px 18px",
                marginBottom: "20px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "10px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <ShieldAlert size={20} color="#dc2626" />
                <div>
                  <strong style={{ fontSize: "13px", color: "#991b1b", display: "block" }}>
                    KYC Verification Rejected by Foreman
                  </strong>
                  <span style={{ fontSize: "12px", color: "#b91c1c" }}>
                    Please re-submit your PAN and Aadhaar identity documents to enable live auction bidding.
                  </span>
                </div>
              </div>
              <button
                type="button"
                className="primary-button"
                style={{ padding: "6px 14px", fontSize: "12px", background: "#dc2626" }}
                onClick={() => onNavigate?.("KYC Verification")}
              >
                Re-submit KYC
              </button>
            </div>
          );
        } else {
          return (
            <div
              style={{
                background: "#fffbeb",
                border: "1px solid #fde68a",
                borderRadius: "14px",
                padding: "14px 18px",
                marginBottom: "20px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "10px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <Clock size={20} color="#d97706" />
                <div>
                  <strong style={{ fontSize: "13px", color: "#92400e", display: "block" }}>
                    KYC Verification In Progress / Required
                  </strong>
                  <span style={{ fontSize: "12px", color: "#b45309" }}>
                    Complete your identity verification under the Chit Funds Act, 1982 to unlock live auction bidding.
                  </span>
                </div>
              </div>
              <button
                type="button"
                className="secondary-button"
                style={{ padding: "6px 14px", fontSize: "12px", border: "1px solid #d97706", color: "#92400e" }}
                onClick={() => onNavigate?.("KYC Verification")}
              >
                Complete KYC
              </button>
            </div>
          );
        }
      })()}

      {/* Zero State Call to Action Banner if new user */}
      {enrolledSchemes.length === 0 && !loading && (
        <div
          style={{
            background: "linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)",
            border: "1px solid #bfdbfe",
            borderRadius: "16px",
            padding: "20px 24px",
            marginBottom: "24px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "14px",
          }}
        >
          <div>
            <h4 style={{ margin: "0 0 4px", color: "#1e3a8a", fontSize: "16px" }}>
              Welcome to LedgerOne Chit Funds!
            </h4>
            <p style={{ margin: 0, color: "#3b82f6", fontSize: "13px" }}>
              You are currently not enrolled in any chit fund pool. Choose a scheme to start saving and participating in monthly auctions.
            </p>
          </div>
          <button
            className="primary-button"
            type="button"
            onClick={() => onNavigate?.("My Schemes")}
            style={{ padding: "8px 18px", fontSize: "13px" }}
          >
            Browse Available Schemes
          </button>
        </div>
      )}

      {/* KPI Cards */}
      <section className="member-stats-grid">
        {summaryCards.map((card) => (
          <div
            className="member-stat-card"
            key={card.label}
            onClick={card.onClick}
            style={{ cursor: "pointer" }}
            title={`View ${card.label}`}
          >
            <div className="member-stat-icon">{card.icon}</div>
            <div>
              <p>{card.label}</p>
              <strong>{card.value}</strong>
              <small>{card.detail}</small>
            </div>
          </div>
        ))}
      </section>

      {/* Activity and Auctions Grid */}
      <section className="member-panels">
        {/* Personal Activity Panel */}
        <div className="member-panel">
          <div className="panel-header">
            <div>
              <h3>Recent activity</h3>
              <span>Your personal transactions</span>
            </div>
            <Activity size={18} />
          </div>

          {memberPayments.length === 0 ? (
            <div style={{ padding: "40px 20px", textAlign: "center", color: "#94a3b8", fontSize: "14px" }}>
              <p style={{ margin: 0 }}>No personal activity yet.</p>
              <small style={{ color: "#cbd5e1" }}>
                Installment payments and KYC updates will appear here.
              </small>
            </div>
          ) : (
            <ul className="activity-list">
              {memberPayments.slice(0, 4).map((item) => (
                <li key={item.id}>
                  <div>
                    <strong>{item.payment_type || "Installment"}</strong>
                    <small>
                      {item.scheme_name} • ₹{Number(item.amount).toLocaleString("en-IN")}
                    </small>
                  </div>
                  <span className={`status-tag ${String(item.status).toLowerCase()}`}>
                    {item.status}
                  </span>
                </li>
              ))}
            </ul>
          )}

          {memberPayments.length > 0 && (
            <div style={{ padding: "14px 20px", borderTop: "1px solid #edf2fb", textAlign: "right" }}>
              <button
                className="ghost-button"
                type="button"
                onClick={() => onNavigate?.("My Payments")}
                style={{ fontSize: "13px", padding: "4px 8px" }}
              >
                View all payments <ArrowRight size={14} />
              </button>
            </div>
          )}
        </div>

        {/* Live Auctions Panel */}
        <div className="member-panel">
          <div className="panel-header">
            <div>
              <h3>Active auctions</h3>
              <span>Live community bidding</span>
            </div>
            <Wallet size={18} />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "12px", padding: "16px 20px" }}>
            {auctions.length === 0 ? (
              <p style={{ color: "#94a3b8", fontSize: "13px", margin: "20px 0", textAlign: "center" }}>
                No active auctions right now.
              </p>
            ) : (
              auctions.map((auc) => (
                <div
                  key={auc.id}
                  className={`auction-card ${!auc.is_live && !auc.live ? "muted" : ""}`}
                  onClick={() => onNavigate?.("Live Auctions")}
                  style={{ cursor: "pointer" }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <p style={{ margin: 0, fontWeight: "600" }}>{auc.name || auc.scheme_name}</p>
                    {(auc.is_live || auc.live) && (
                      <span className="status-tag active" style={{ fontSize: "11px", padding: "2px 8px" }}>
                        ● Live
                      </span>
                    )}
                  </div>
                  <strong>
                    {auc.highest_bid
                      ? `₹${Number(auc.highest_bid).toLocaleString("en-IN")}`
                      : auc.bid || "₹12,400"}
                  </strong>
                  <small>
                    Highest bid by {auc.highest_bidder_name || auc.bidder || "Member"} · {auc.members_info || "20 members"}
                  </small>
                </div>
              ))
            )}
          </div>

          <div style={{ padding: "14px 20px", borderTop: "1px solid #edf2fb", textAlign: "right" }}>
            <button
              className="secondary-button"
              type="button"
              onClick={() => onNavigate?.("Live Auctions")}
              style={{ fontSize: "13px", display: "inline-flex", alignItems: "center", gap: "6px" }}
            >
              <Gavel size={14} /> Enter Bidding Hall
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default MemberDashboard;
