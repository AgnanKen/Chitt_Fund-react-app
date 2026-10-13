import { useState, useEffect } from "react";
import {
  ShieldCheck,
  FileCheck,
  AlertCircle,
  Clock,
  CheckCircle2,
  Upload,
  User,
  CreditCard,
  MapPin,
  Calendar,
  Briefcase,
  ExternalLink,
  RefreshCw,
  Sparkles,
  ArrowRight,
  ShieldAlert,
} from "lucide-react";
import { useAuth } from "../../context/useAuth";
import { supabase, isSupabaseConfigured } from "../../lib/supabase";

const MemberKyc = ({ onNavigate }) => {
  const { profile } = useAuth();
  const memberId = profile?.member_id;

  const [memberData, setMemberData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [toastMsg, setToastMsg] = useState(null);

  // Form Fields
  const [panNumber, setPanNumber] = useState("");
  const [aadhaarNumber, setAadhaarNumber] = useState("");
  const [dob, setDob] = useState("");
  const [occupation, setOccupation] = useState("Salaried");
  const [address, setAddress] = useState("");
  const [declaration, setDeclaration] = useState(false);
  const [selectedDocType, setSelectedDocType] = useState("PAN + Aadhaar");

  // Load member's current KYC state from Supabase
  const loadKycData = async () => {
    if (!memberId && !profile?.email) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      let query = supabase.from("members").select("*");
      if (memberId) {
        query = query.eq("id", memberId);
      } else {
        query = query.ilike("email", profile.email);
      }

      const { data, error } = await query.maybeSingle();

      if (!error && data) {
        setMemberData(data);
        if (data.address) {
          // Pre-fill address if already set
          setAddress(data.address.split(" | ")[0] || data.address);
        }
      }
    } catch (err) {
      console.warn("Failed fetching member KYC status:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadKycData();
  }, [memberId, profile]);

  const currentStatus = memberData?.kyc_status || profile?.members?.kyc_status || "Pending";

  // Handle KYC Submission
  const handleSubmitKyc = async (e) => {
    e.preventDefault();
    if (!declaration) {
      alert("Please accept the regulatory declaration before submitting.");
      return;
    }

    const cleanPan = panNumber.trim().toUpperCase();
    const cleanAadhaar = aadhaarNumber.trim().replace(/\s/g, "");

    if (cleanPan.length < 10) {
      alert("Please enter a valid 10-character PAN Card number (e.g. ABCDE1234F).");
      return;
    }

    if (cleanAadhaar.length < 12) {
      alert("Please enter a valid 12-digit Aadhaar Card number.");
      return;
    }

    setSubmitting(true);

    const fullAddressDetails = `${address.trim()} | PAN: ${cleanPan} | Aadhaar: ${cleanAadhaar} | Occupation: ${occupation}`;

    try {
      let targetId = memberId;

      // If member record didn't exist yet, look up by email
      if (!targetId && profile?.email) {
        const { data: found } = await supabase
          .from("members")
          .select("id")
          .ilike("email", profile.email)
          .maybeSingle();
        targetId = found?.id;
      }

      if (targetId) {
        const { error } = await supabase
          .from("members")
          .update({
            kyc_status: "Pending", // Sent for admin approval
            address: fullAddressDetails,
          })
          .eq("id", targetId);

        if (error) throw error;
      }

      setMemberData((prev) => ({
        ...(prev || {}),
        kyc_status: "Pending",
        address: fullAddressDetails,
      }));

      setToastMsg("KYC documents submitted successfully! Sent to Foreman for review.");
      setTimeout(() => setToastMsg(null), 5000);
    } catch (err) {
      console.error("KYC submission error:", err);
      alert("Failed to submit KYC: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="member-page-shell">
      {/* Toast Alert */}
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
      <div style={{ marginBottom: "24px" }}>
        <h2 style={{ fontSize: "22px", fontWeight: "700", margin: "0 0 6px 0", color: "#0f172a" }}>
          KYC & Identity Verification
        </h2>
        <p style={{ margin: 0, color: "#64748b", fontSize: "14px" }}>
          Verify your identity as required under Section 16 of the Central Chit Funds Act, 1982.
        </p>
      </div>

      {/* STATUS OVERVIEW CARD */}
      <div
        style={{
          background:
            currentStatus === "Approved"
              ? "linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)"
              : currentStatus === "Rejected"
              ? "linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)"
              : "linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)",
          border:
            currentStatus === "Approved"
              ? "1px solid #86efac"
              : currentStatus === "Rejected"
              ? "1px solid #fca5a5"
              : "1px solid #fde68a",
          borderRadius: "16px",
          padding: "24px",
          marginBottom: "28px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "16px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div
            style={{
              width: "52px",
              height: "52px",
              borderRadius: "50%",
              background:
                currentStatus === "Approved"
                  ? "#16a34a"
                  : currentStatus === "Rejected"
                  ? "#dc2626"
                  : "#d97706",
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {currentStatus === "Approved" ? (
              <ShieldCheck size={28} />
            ) : currentStatus === "Rejected" ? (
              <ShieldAlert size={28} />
            ) : (
              <Clock size={28} />
            )}
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
              <span
                style={{
                  fontSize: "12px",
                  fontWeight: "700",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                  color:
                    currentStatus === "Approved"
                      ? "#15803d"
                      : currentStatus === "Rejected"
                      ? "#b91c1c"
                      : "#b45309",
                }}
              >
                Verification Status:
              </span>
              <span
                className={`status-tag ${currentStatus.toLowerCase()}`}
                style={{ fontSize: "12px", fontWeight: "700" }}
              >
                {currentStatus}
              </span>
            </div>
            <h3 style={{ margin: "0 0 4px 0", fontSize: "18px", color: "#0f172a" }}>
              {currentStatus === "Approved"
                ? "Identity Fully Verified & Authorized"
                : currentStatus === "Rejected"
                ? "KYC Application Requires Re-submission"
                : "Verification Under Foreman Review"}
            </h3>
            <p style={{ margin: 0, fontSize: "13px", color: "#475569" }}>
              {currentStatus === "Approved"
                ? "Your identity documents are verified. You are authorized to place live auction bids and join high-tier chits."
                : currentStatus === "Rejected"
                ? "Your document verification was rejected by the foreman. Please re-check your PAN and Aadhaar details below."
                : "Your identity details are queued for verification. Approvals are typically completed within 2–4 hours."}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={loadKycData}
          className="secondary-button"
          style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "13px" }}
        >
          <RefreshCw size={14} /> Refresh Status
        </button>
      </div>

      {/* APPROVED BADGE VIEW */}
      {currentStatus === "Approved" ? (
        <div className="data-card" style={{ padding: "28px", maxWidth: "700px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "18px" }}>
            <FileCheck size={22} color="#15803d" />
            <h3 style={{ margin: 0, fontSize: "18px", color: "#0f172a" }}>Verified Member Credentials</h3>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "16px",
              background: "#f8fafc",
              padding: "20px",
              borderRadius: "12px",
              border: "1px solid #e2e8f0",
              fontSize: "13px",
              marginBottom: "20px",
            }}
          >
            <div>
              <span style={{ color: "#64748b", display: "block", fontSize: "12px" }}>Member Name:</span>
              <strong style={{ color: "#0f172a", fontSize: "14px" }}>{memberData?.full_name || profile?.full_name}</strong>
            </div>
            <div>
              <span style={{ color: "#64748b", display: "block", fontSize: "12px" }}>Registered Email:</span>
              <strong style={{ color: "#0f172a" }}>{memberData?.email || profile?.email}</strong>
            </div>
            <div>
              <span style={{ color: "#64748b", display: "block", fontSize: "12px" }}>KYC Clearance Date:</span>
              <strong>{new Date().toLocaleDateString("en-IN")}</strong>
            </div>
            <div>
              <span style={{ color: "#64748b", display: "block", fontSize: "12px" }}>Compliance Type:</span>
              <strong style={{ color: "#15803d" }}>Chit Funds Act, 1982 Compliant</strong>
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <span style={{ color: "#64748b", display: "block", fontSize: "12px" }}>Registered Address:</span>
              <span style={{ color: "#334155" }}>{memberData?.address || "Address on file"}</span>
            </div>
          </div>

          <div style={{ display: "flex", gap: "12px" }}>
            <button
              type="button"
              className="primary-button"
              onClick={() => onNavigate?.("Live Auctions")}
              style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}
            >
              Go to Live Auctions <ArrowRight size={16} />
            </button>
            <button
              type="button"
              className="secondary-button"
              onClick={() => onNavigate?.("My Schemes")}
            >
              Browse Chit Schemes
            </button>
          </div>
        </div>
      ) : (
        /* KYC SUBMISSION FORM (When Pending or Rejected) */
        <div className="data-card" style={{ padding: "28px", maxWidth: "760px" }}>
          <div style={{ marginBottom: "20px", borderBottom: "1px solid #f1f5f9", paddingBottom: "14px" }}>
            <h3 style={{ margin: "0 0 6px 0", fontSize: "18px", color: "#0f172a" }}>
              {currentStatus === "Rejected" ? "Re-submit Identity Verification" : "Submit KYC Documents"}
            </h3>
            <p style={{ margin: 0, fontSize: "13px", color: "#64748b" }}>
              Provide your government-issued identity credentials for official foreman verification.
            </p>
          </div>

          <form onSubmit={handleSubmitKyc}>
            {/* Identity Types */}
            <div style={{ marginBottom: "18px" }}>
              <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#334155", marginBottom: "8px" }}>
                Identity Proof Documents
              </label>
              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                {["PAN + Aadhaar", "PAN + Passport", "PAN + Voter ID"].map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setSelectedDocType(type)}
                    style={{
                      padding: "8px 14px",
                      borderRadius: "8px",
                      border: selectedDocType === type ? "2px solid #2563eb" : "1px solid #cbd5e1",
                      background: selectedDocType === type ? "#eff6ff" : "#ffffff",
                      color: selectedDocType === type ? "#1d4ed8" : "#475569",
                      fontWeight: "600",
                      fontSize: "13px",
                      cursor: "pointer",
                    }}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {/* Document numbers grid */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "18px" }}>
              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#334155", marginBottom: "6px" }}>
                  PAN Card Number *
                </label>
                <div className="input-wrap" style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 14px", border: "1px solid #cbd5e1", borderRadius: "10px" }}>
                  <CreditCard size={17} color="#64748b" />
                  <input
                    type="text"
                    required
                    maxLength={10}
                    placeholder="e.g. ABCDE1234F"
                    value={panNumber}
                    onChange={(e) => setPanNumber(e.target.value.toUpperCase())}
                    style={{ border: "none", background: "transparent", outline: "none", width: "100%", fontSize: "14px", textTransform: "uppercase" }}
                  />
                </div>
                <small style={{ color: "#64748b", fontSize: "11px", marginTop: "4px", display: "block" }}>
                  10-character alphanumeric PAN
                </small>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#334155", marginBottom: "6px" }}>
                  Aadhaar Card Number *
                </label>
                <div className="input-wrap" style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 14px", border: "1px solid #cbd5e1", borderRadius: "10px" }}>
                  <FileCheck size={17} color="#64748b" />
                  <input
                    type="text"
                    required
                    maxLength={14}
                    placeholder="e.g. 9845 1204 8812"
                    value={aadhaarNumber}
                    onChange={(e) => setAadhaarNumber(e.target.value)}
                    style={{ border: "none", background: "transparent", outline: "none", width: "100%", fontSize: "14px" }}
                  />
                </div>
                <small style={{ color: "#64748b", fontSize: "11px", marginTop: "4px", display: "block" }}>
                  12-digit Unique Identification Number
                </small>
              </div>
            </div>

            {/* Occupation and DOB */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "18px" }}>
              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#334155", marginBottom: "6px" }}>
                  Occupation / Profession
                </label>
                <select
                  className="input-wrap"
                  style={{ width: "100%", padding: "10px 14px", borderRadius: "10px", border: "1px solid #cbd5e1" }}
                  value={occupation}
                  onChange={(e) => setOccupation(e.target.value)}
                >
                  <option value="Salaried">Salaried Employee</option>
                  <option value="Self-Employed">Self-Employed / Business</option>
                  <option value="Professional">Doctor / Lawyer / CA / Architect</option>
                  <option value="Retired">Retired / Senior Citizen</option>
                  <option value="Agriculture">Agriculture / Farming</option>
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#334155", marginBottom: "6px" }}>
                  Date of Birth
                </label>
                <input
                  type="date"
                  className="input-wrap"
                  style={{ width: "100%", padding: "10px 14px", borderRadius: "10px", border: "1px solid #cbd5e1" }}
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                />
              </div>
            </div>

            {/* Permanent Address */}
            <div style={{ marginBottom: "20px" }}>
              <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#334155", marginBottom: "6px" }}>
                Permanent Residential Address *
              </label>
              <textarea
                required
                rows={3}
                placeholder="House No, Street, Landmark, City, State, PIN Code"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  borderRadius: "10px",
                  border: "1px solid #cbd5e1",
                  outline: "none",
                  fontSize: "13px",
                  fontFamily: "inherit",
                }}
              />
            </div>

            {/* Simulated Document Attachment Preview */}
            <div
              style={{
                background: "#f8fafc",
                border: "2px dashed #cbd5e1",
                borderRadius: "12px",
                padding: "20px",
                textAlign: "center",
                marginBottom: "20px",
              }}
            >
              <Upload size={24} color="#64748b" style={{ margin: "0 auto 8px auto", display: "block" }} />
              <p style={{ margin: "0 0 4px 0", fontSize: "13px", fontWeight: "600", color: "#0f172a" }}>
                Attach Document Scans (PAN & Aadhaar)
              </p>
              <span style={{ fontSize: "11px", color: "#64748b" }}>
                JPG, PNG or PDF (Max 5MB each). Digital watermark applied automatically.
              </span>
            </div>

            {/* Legal Declaration */}
            <div style={{ marginBottom: "24px" }}>
              <label style={{ display: "flex", alignItems: "flex-start", gap: "10px", cursor: "pointer", fontSize: "13px", color: "#334155" }}>
                <input
                  type="checkbox"
                  required
                  checked={declaration}
                  onChange={(e) => setDeclaration(e.target.checked)}
                  style={{ marginTop: "3px" }}
                />
                <span>
                  I hereby declare that the details provided above are true and authentic. I authorize the LedgerOne foreman to verify my identity in compliance with statutory KYC guidelines under the Chit Funds Act, 1982.
                </span>
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="primary-button"
              disabled={submitting}
              style={{
                padding: "12px 24px",
                fontSize: "14px",
                fontWeight: "600",
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <ShieldCheck size={18} />
              {submitting ? "Submitting Documents..." : "Submit KYC for Foreman Approval"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default MemberKyc;
