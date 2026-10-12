import { useState, useEffect } from "react";
import {
  Layers3,
  IndianRupee,
  TrendingUp,
  X,
  CreditCard,
  Award,
  Sparkles,
  CheckCircle2,
} from "lucide-react";
import { useAuth } from "../../context/useAuth";
import { supabase } from "../../lib/supabase";

const MemberSchemes = ({ onNavigate }) => {
  const { profile } = useAuth();
  const [allSchemes, setAllSchemes] = useState([]);
  const [enrolledSchemeIds, setEnrolledSchemeIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [selectedSchemeSchedule, setSelectedSchemeSchedule] = useState(null);
  const [enrollingId, setEnrollingId] = useState(null);
  const [successMsg, setSuccessMsg] = useState("");
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const memberId = profile?.member_id;

  useEffect(() => {
    let ignore = false;

    const loadSchemes = async () => {
      try {
        // 1. Fetch all active schemes from Supabase
        const { data: sData } = await supabase
          .from("chit_schemes")
          .select("*")
          .order("created_at", { ascending: false });

        if (!ignore && sData) {
          setAllSchemes(sData);
        }

        // 2. Fetch member's personal enrollments from Supabase
        if (memberId) {
          const { data: eData } = await supabase
            .from("scheme_enrollments")
            .select("scheme_id")
            .eq("member_id", memberId);

          if (!ignore && eData) {
            setEnrolledSchemeIds(new Set(eData.map((e) => e.scheme_id)));
          }
        } else {
          if (!ignore) setEnrolledSchemeIds(new Set());
        }
      } catch (err) {
        console.warn("Failed fetching schemes data:", err);
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    loadSchemes();

    return () => {
      ignore = true;
    };
  }, [memberId, refreshTrigger]);

  // Handle member enrolling in a new scheme
  const handleEnroll = async (scheme) => {
    if (!memberId) {
      alert("Member account details are loading. Please try again.");
      return;
    }

    setEnrollingId(scheme.id);
    try {
      // Insert into scheme_enrollments
      const { error: enrollError } = await supabase
        .from("scheme_enrollments")
        .insert([
          {
            member_id: memberId,
            scheme_id: scheme.id,
          },
        ]);

      if (enrollError) {
        console.warn("Enrollment insert note:", enrollError.message);
      }

      // Increment enrolled count on scheme
      await supabase
        .from("chit_schemes")
        .update({ enrolled_members: (scheme.enrolled_members || 0) + 1 })
        .eq("id", scheme.id);

      // Increment chits_enrolled on member
      await supabase
        .from("members")
        .update({ chits_enrolled: (profile?.members?.chits_enrolled || 0) + 1 })
        .eq("id", memberId);

      setSuccessMsg(`Successfully enrolled in ${scheme.name}! You can now pay installments.`);
      setTimeout(() => setSuccessMsg(""), 5000);

      // Refresh data
      setRefreshTrigger((prev) => prev + 1);
    } catch (err) {
      console.error("Error enrolling in scheme:", err);
      alert("Failed to enroll: " + err.message);
    } finally {
      setEnrollingId(null);
    }
  };

  const myEnrolledSchemes = allSchemes.filter((s) => enrolledSchemeIds.has(s.id));
  const availableSchemes = allSchemes.filter((s) => !enrolledSchemeIds.has(s.id));

  return (
    <div className="member-page-shell">
      {successMsg && (
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
          <span>{successMsg}</span>
        </div>
      )}

      <div className="member-page-header">
        <div>
          <p className="eyebrow subtle">My Portfolio</p>
          <h2>Chit Schemes & Enrollments</h2>
          <p style={{ color: "#64748b", fontSize: "14px", marginTop: "4px" }}>
            Manage your subscribed chit funds, review schedules, or join new active pools.
          </p>
        </div>
      </div>

      {/* KPI Matrix (Starts from 0 if new user) */}
      <div className="member-stats-grid" style={{ marginBottom: "26px" }}>
        <div className="member-stat-card">
          <div className="member-stat-icon">
            <Layers3 size={20} />
          </div>
          <div>
            <p>Enrolled Schemes</p>
            <strong>{myEnrolledSchemes.length}</strong>
            <small>{myEnrolledSchemes.length > 0 ? "Active in your portfolio" : "0 active subscriptions"}</small>
          </div>
        </div>

        <div className="member-stat-card">
          <div className="member-stat-icon" style={{ background: "#ecfdf5", color: "#059669" }}>
            <IndianRupee size={20} />
          </div>
          <div>
            <p>Pool Subscriptions</p>
            <strong>
              ₹
              {myEnrolledSchemes
                .reduce((sum, s) => sum + (Number(s.total_pool_value) || 0), 0)
                .toLocaleString("en-IN")}
            </strong>
            <small>Total pool commitment</small>
          </div>
        </div>

        <div className="member-stat-card">
          <div className="member-stat-icon" style={{ background: "#eff6ff", color: "#2563eb" }}>
            <TrendingUp size={20} />
          </div>
          <div>
            <p>Monthly Commitment</p>
            <strong>
              ₹
              {myEnrolledSchemes
                .reduce((sum, s) => sum + (Number(s.monthly_installment) || 0), 0)
                .toLocaleString("en-IN")}
            </strong>
            <small>Combined monthly installments</small>
          </div>
        </div>

        <div className="member-stat-card">
          <div className="member-stat-icon" style={{ background: "#fef3c7", color: "#b45309" }}>
            <Award size={20} />
          </div>
          <div>
            <p>Auction Status</p>
            <strong>{myEnrolledSchemes.length > 0 ? "Eligible" : "Not Enrolled"}</strong>
            <small>{myEnrolledSchemes.length > 0 ? "Can place bids" : "Enroll to participate"}</small>
          </div>
        </div>
      </div>

      {/* SECTION 1: MY ENROLLED SCHEMES */}
      <div style={{ marginBottom: "34px" }}>
        <h3 style={{ fontSize: "18px", margin: "0 0 16px" }}>
          My Active Schemes ({myEnrolledSchemes.length})
        </h3>

        {myEnrolledSchemes.length === 0 ? (
          <div
            style={{
              background: "#ffffff",
              border: "1px dashed #cbd5e1",
              borderRadius: "16px",
              padding: "36px",
              textAlign: "center",
              color: "#64748b",
            }}
          >
            <Layers3 size={32} color="#94a3b8" style={{ margin: "0 auto 10px" }} />
            <p style={{ margin: "0 0 6px", fontWeight: "600", color: "#1e293b", fontSize: "16px" }}>
              You are not enrolled in any chit scheme yet.
            </p>
            <p style={{ margin: "0 0 16px", fontSize: "13px" }}>
              Explore the available chit pools below and enroll to start your savings and bidding cycle.
            </p>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
              gap: "22px",
            }}
          >
            {myEnrolledSchemes.map((scheme) => (
              <div
                key={scheme.id}
                className="scheme-card"
                style={{
                  padding: "24px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  gap: "20px",
                }}
              >
                <div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      marginBottom: "12px",
                    }}
                  >
                    <div>
                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: "700",
                          textTransform: "uppercase",
                          color: "#1d4ed8",
                          letterSpacing: "0.05em",
                        }}
                      >
                        {scheme.category || "Standard Tier"}
                      </span>
                      <h3 style={{ margin: "4px 0 0", fontSize: "20px" }}>{scheme.name}</h3>
                    </div>
                    <span className="status-tag active">Enrolled</span>
                  </div>

                  <p style={{ color: "#64748b", fontSize: "13px", margin: "0 0 16px" }}>
                    {scheme.description || "Active monthly chit scheme."}
                  </p>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: "12px",
                      background: "#f8faff",
                      padding: "16px",
                      borderRadius: "14px",
                      border: "1px solid #edf2fb",
                    }}
                  >
                    <div>
                      <small style={{ color: "#64748b", fontSize: "11px", display: "block" }}>
                        POOL VALUE
                      </small>
                      <strong style={{ fontSize: "15px", color: "#0f172a" }}>
                        ₹{Number(scheme.total_pool_value).toLocaleString("en-IN")}
                      </strong>
                    </div>
                    <div>
                      <small style={{ color: "#64748b", fontSize: "11px", display: "block" }}>
                        MONTHLY INSTALLMENT
                      </small>
                      <strong style={{ fontSize: "15px", color: "#1d4ed8" }}>
                        ₹{Number(scheme.monthly_installment).toLocaleString("en-IN")}
                      </strong>
                    </div>
                    <div>
                      <small style={{ color: "#64748b", fontSize: "11px", display: "block" }}>
                        CYCLE DURATION
                      </small>
                      <strong style={{ fontSize: "15px", color: "#0f172a" }}>
                        {scheme.total_months} Months
                      </strong>
                    </div>
                    <div>
                      <small style={{ color: "#64748b", fontSize: "11px", display: "block" }}>
                        CURRENT MONTH
                      </small>
                      <strong style={{ fontSize: "15px", color: "#059669" }}>
                        Month {scheme.current_month || 1}
                      </strong>
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", gap: "10px" }}>
                  <button
                    type="button"
                    className="secondary-button"
                    style={{ flex: 1, fontSize: "13px", padding: "9px" }}
                    onClick={() => setSelectedSchemeSchedule(scheme)}
                  >
                    View Schedule
                  </button>
                  <button
                    type="button"
                    className="primary-button"
                    style={{
                      flex: 1,
                      fontSize: "13px",
                      padding: "9px",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "6px",
                    }}
                    onClick={() => onNavigate?.("My Payments")}
                  >
                    <CreditCard size={15} /> Pay Installment
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SECTION 2: AVAILABLE SCHEMES TO ENROLL */}
      <div>
        <h3 style={{ fontSize: "18px", margin: "0 0 16px" }}>
          Available Schemes to Join ({availableSchemes.length})
        </h3>

        {availableSchemes.length === 0 && !loading ? (
          <p style={{ color: "#94a3b8", fontSize: "14px" }}>
            You are enrolled in all available chit schemes.
          </p>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
              gap: "22px",
            }}
          >
            {availableSchemes.map((scheme) => (
              <div
                key={scheme.id}
                className="scheme-card"
                style={{
                  padding: "24px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  gap: "20px",
                  background: "#ffffff",
                }}
              >
                <div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      marginBottom: "12px",
                    }}
                  >
                    <div>
                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: "700",
                          textTransform: "uppercase",
                          color: "#64748b",
                        }}
                      >
                        {scheme.category || "Open Pool"}
                      </span>
                      <h3 style={{ margin: "4px 0 0", fontSize: "20px" }}>{scheme.name}</h3>
                    </div>
                    <span className="status-tag pending">Open</span>
                  </div>

                  <p style={{ color: "#64748b", fontSize: "13px", margin: "0 0 16px" }}>
                    {scheme.description || "Active community chit scheme."}
                  </p>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: "12px",
                      background: "#f8faff",
                      padding: "16px",
                      borderRadius: "14px",
                      border: "1px solid #edf2fb",
                    }}
                  >
                    <div>
                      <small style={{ color: "#64748b", fontSize: "11px", display: "block" }}>
                        TOTAL POOL
                      </small>
                      <strong style={{ fontSize: "15px", color: "#0f172a" }}>
                        ₹{Number(scheme.total_pool_value).toLocaleString("en-IN")}
                      </strong>
                    </div>
                    <div>
                      <small style={{ color: "#64748b", fontSize: "11px", display: "block" }}>
                        MONTHLY INSTALLMENT
                      </small>
                      <strong style={{ fontSize: "15px", color: "#1d4ed8" }}>
                        ₹{Number(scheme.monthly_installment).toLocaleString("en-IN")}
                      </strong>
                    </div>
                    <div>
                      <small style={{ color: "#64748b", fontSize: "11px", display: "block" }}>
                        DURATION
                      </small>
                      <strong style={{ fontSize: "15px", color: "#0f172a" }}>
                        {scheme.total_months} Months
                      </strong>
                    </div>
                    <div>
                      <small style={{ color: "#64748b", fontSize: "11px", display: "block" }}>
                        CAPACITY
                      </small>
                      <strong style={{ fontSize: "15px", color: "#059669" }}>
                        {scheme.enrolled_members || 0} / {scheme.total_members || 20} Enrolled
                      </strong>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  className="primary-button"
                  style={{
                    width: "100%",
                    fontSize: "14px",
                    padding: "11px",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                  }}
                  disabled={enrollingId === scheme.id}
                  onClick={() => handleEnroll(scheme)}
                >
                  <Sparkles size={16} />
                  {enrollingId === scheme.id ? "Enrolling in Supabase..." : "Enroll in this Scheme"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SCHEDULE MODAL */}
      {selectedSchemeSchedule && (
        <div className="modal-overlay" onClick={() => setSelectedSchemeSchedule(null)}>
          <div
            className="modal-card"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: "680px", width: "100%", padding: "28px" }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "20px",
              }}
            >
              <div>
                <h3 style={{ margin: 0 }}>{selectedSchemeSchedule.name} — Schedule</h3>
                <span style={{ fontSize: "12px", color: "#64748b" }}>
                  Installment details and duration schedule
                </span>
              </div>
              <button
                type="button"
                className="ghost-button"
                style={{ padding: "6px" }}
                onClick={() => setSelectedSchemeSchedule(null)}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ overflowX: "auto", maxHeight: "400px", border: "1px solid #edf2fb", borderRadius: "12px" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                <thead>
                  <tr style={{ background: "#f8faff", borderBottom: "1px solid #e2e8f0", textAlign: "left" }}>
                    <th style={{ padding: "10px 14px", color: "#64748b" }}>MONTH</th>
                    <th style={{ padding: "10px 14px", color: "#64748b" }}>MONTHLY INSTALLMENT</th>
                    <th style={{ padding: "10px 14px", color: "#64748b" }}>TOTAL POOL</th>
                    <th style={{ padding: "10px 14px", color: "#64748b" }}>STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: selectedSchemeSchedule.total_months || 20 }).map((_, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td style={{ padding: "10px 14px", fontWeight: "600" }}>Month {i + 1}</td>
                      <td style={{ padding: "10px 14px" }}>
                        ₹{Number(selectedSchemeSchedule.monthly_installment).toLocaleString("en-IN")}
                      </td>
                      <td style={{ padding: "10px 14px", color: "#64748b" }}>
                        ₹{Number(selectedSchemeSchedule.total_pool_value).toLocaleString("en-IN")}
                      </td>
                      <td style={{ padding: "10px 14px" }}>
                        <span
                          className={`status-tag ${
                            i + 1 < (selectedSchemeSchedule.current_month || 1)
                              ? "approved"
                              : i + 1 === (selectedSchemeSchedule.current_month || 1)
                              ? "pending"
                              : "upcoming"
                          }`}
                          style={{ fontSize: "11px", padding: "2px 8px" }}
                        >
                          {i + 1 < (selectedSchemeSchedule.current_month || 1)
                            ? "Completed"
                            : i + 1 === (selectedSchemeSchedule.current_month || 1)
                            ? "Current Cycle"
                            : "Upcoming"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "20px" }}>
              <button
                type="button"
                className="secondary-button"
                onClick={() => setSelectedSchemeSchedule(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MemberSchemes;
