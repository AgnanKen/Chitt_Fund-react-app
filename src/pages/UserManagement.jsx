import { useState, useEffect } from "react";
import {
  Users,
  UserCheck,
  Clock,
  AlertTriangle,
  Search,
  Plus,
  X,
  CheckCircle,
  Mail,
  Phone,
} from "lucide-react";
import { supabase, isSupabaseConfigured, SEED_MEMBERS } from "../lib/supabase";

const UserManagement = () => {
  const [members, setMembers] = useState(SEED_MEMBERS);
  const [loading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedKycFilter, setSelectedKycFilter] = useState("All");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    phone: "",
    kyc_status: "Pending",
    role: "Member",
    total_invested: "",
    chits_enrolled: "1",
    address: "",
  });

  // Real-time synchronization
  useEffect(() => {
    const fetchMembers = async () => {
      if (isSupabaseConfigured()) {
        try {
          const { data, error } = await supabase
            .from("members")
            .select("*")
            .order("created_at", { ascending: false });

          if (error) throw error;
          if (data && data.length > 0) {
            setMembers(data);
          }
        } catch (err) {
          console.warn("Supabase fetch failed, using seed data:", err.message);
        }
      }
    };

    fetchMembers();

    if (isSupabaseConfigured()) {
      const channel = supabase
        .channel("realtime:members")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "members" },
          (payload) => {
            if (payload.eventType === "INSERT") {
              setMembers((prev) => [payload.new, ...prev]);
            } else if (payload.eventType === "UPDATE") {
              setMembers((prev) =>
                prev.map((m) => (m.id === payload.new.id ? payload.new : m))
              );
            } else if (payload.eventType === "DELETE") {
              setMembers((prev) => prev.filter((m) => m.id === payload.old.id));
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, []);

  // Update KYC status
  const handleUpdateKyc = async (id, newStatus) => {
    if (isSupabaseConfigured()) {
      try {
        const { error } = await supabase
          .from("members")
          .update({ kyc_status: newStatus })
          .eq("id", id);

        if (error) throw error;
      } catch (err) {
        console.error("Failed to update KYC status:", err.message);
      }
    } else {
      setMembers((prev) =>
        prev.map((m) => (m.id === id ? { ...m, kyc_status: newStatus } : m))
      );
    }

    setFeedbackMsg(`KYC status updated to ${newStatus}`);
    setTimeout(() => setFeedbackMsg(null), 3000);
  };

  // Handle Add Member Submit
  const handleAddMember = async (e) => {
    e.preventDefault();
    if (!formData.full_name.trim()) return;

    setSubmitting(true);
    const initials = formData.full_name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();

    const newMemberRecord = {
      full_name: formData.full_name,
      email: formData.email,
      phone: formData.phone,
      kyc_status: formData.kyc_status,
      role: formData.role,
      avatar_initials: initials,
      total_invested: Number(formData.total_invested) || 0,
      chits_enrolled: Number(formData.chits_enrolled) || 1,
      address: formData.address,
    };

    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from("members")
          .insert([newMemberRecord])
          .select();

        if (error) throw error;
        if (data && data[0]) {
          setMembers((prev) => [data[0], ...prev]);
        }
      } catch (err) {
        console.error("Supabase insert error:", err.message);
        alert("Insert failed: " + err.message);
      }
    } else {
      // Local addition
      const mockRecord = {
        ...newMemberRecord,
        id: "mem-" + Date.now(),
        created_at: new Date().toISOString(),
      };
      setMembers((prev) => [mockRecord, ...prev]);
    }

    setSubmitting(false);
    setIsAddModalOpen(false);
    setFormData({
      full_name: "",
      email: "",
      phone: "",
      kyc_status: "Pending",
      role: "Member",
      total_invested: "",
      chits_enrolled: "1",
      address: "",
    });

    setFeedbackMsg("New member added successfully!");
    setTimeout(() => setFeedbackMsg(null), 3000);
  };

  // Metrics calculation
  const totalMembersCount = members.length;
  const approvedKycCount = members.filter((m) => m.kyc_status === "Approved").length;
  const pendingKycCount = members.filter((m) => m.kyc_status === "Pending").length;
  const rejectedKycCount = members.filter((m) => m.kyc_status === "Rejected").length;

  // Filtered members
  const filteredMembers = members.filter((m) => {
    const matchesSearch =
      m.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.phone?.includes(searchQuery);

    const matchesKyc =
      selectedKycFilter === "All" || m.kyc_status === selectedKycFilter;

    return matchesSearch && matchesKyc;
  });

  return (
    <div className="dashboard-content">
      {/* Feedback Toast */}
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
            <div className="stat-icon blue">
              <Users size={22} />
            </div>
            <span className="stat-change">+4 this week</span>
          </div>
          <div className="stat-card-content">
            <p>TOTAL ENROLLED MEMBERS</p>
            <h2>{totalMembersCount}</h2>
          </div>
        </div>

        <div className="main-stat-card">
          <div className="stat-card-top">
            <div className="stat-icon green">
              <UserCheck size={22} />
            </div>
            <span className="stat-change">Verified</span>
          </div>
          <div className="stat-card-content">
            <p>APPROVED KYC MEMBERS</p>
            <h2>{approvedKycCount}</h2>
          </div>
        </div>

        <div className="main-stat-card">
          <div className="stat-card-top">
            <div className="stat-icon yellow">
              <Clock size={22} />
            </div>
            <span className="stat-change negative">Action Needed</span>
          </div>
          <div className="stat-card-content">
            <p>PENDING KYC VERIFICATION</p>
            <h2>{pendingKycCount}</h2>
          </div>
        </div>

        <div className="main-stat-card">
          <div className="stat-card-top">
            <div className="stat-icon red">
              <AlertTriangle size={22} />
            </div>
            <span className="stat-change negative">Rejected / Inactive</span>
          </div>
          <div className="stat-card-content">
            <p>REJECTED DOCUMENTS</p>
            <h2>{rejectedKycCount}</h2>
          </div>
        </div>
      </section>

      {/* ACTION BAR */}
      <div className="page-action-bar">
        <div className="action-bar-left">
          {/* Search Box */}
          <div className="action-search">
            <Search size={17} />
            <input
              type="text"
              placeholder="Search member name, email or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Filter Pills */}
          <div className="filter-pills">
            {["All", "Approved", "Pending", "Rejected"].map((status) => (
              <button
                key={status}
                className={`filter-pill ${selectedKycFilter === status ? "active" : ""}`}
                onClick={() => setSelectedKycFilter(status)}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        <button className="btn-primary" onClick={() => setIsAddModalOpen(true)}>
          <Plus size={17} />
          <span>Add Member</span>
        </button>
      </div>

      {/* MEMBERS TABLE */}
      <div className="activity-card">
        <div className="section-header">
          <div>
            <h2>Member Directory</h2>
            <p>
              Showing {filteredMembers.length} member{filteredMembers.length === 1 ? "" : "s"}
            </p>
          </div>
        </div>

        <div className="activity-table-wrapper">
          <table className="activity-table">
            <thead>
              <tr>
                <th>MEMBER</th>
                <th>CONTACT DETAILS</th>
                <th>ROLE</th>
                <th>CHITS</th>
                <th>TOTAL INVESTED</th>
                <th>KYC STATUS</th>
                <th style={{ textAlign: "right" }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: "center", padding: "40px" }}>
                    Loading members from Supabase...
                  </td>
                </tr>
              ) : filteredMembers.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: "center", padding: "40px", color: "#8993a4" }}>
                    No members match the selected filter or search query.
                  </td>
                </tr>
              ) : (
                filteredMembers.map((member) => (
                  <tr key={member.id}>
                    <td>
                      <div className="member-cell">
                        <div className="member-avatar">
                          {member.avatar_initials ||
                            (member.full_name ? member.full_name.slice(0, 2).toUpperCase() : "M")}
                        </div>
                        <div>
                          <strong>{member.full_name}</strong>
                          <div style={{ fontSize: "11px", color: "#8894a6" }}>
                            {member.address || "Location not set"}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td>
                      <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                        <span style={{ display: "flex", alignItems: "center", gap: "5px", color: "#475467" }}>
                          <Mail size={12} color="#8894a6" />
                          {member.email || "—"}
                        </span>
                        <span style={{ display: "flex", alignItems: "center", gap: "5px", color: "#667085" }}>
                          <Phone size={12} color="#8894a6" />
                          {member.phone || "—"}
                        </span>
                      </div>
                    </td>

                    <td>
                      <span style={{ fontWeight: 600, color: "#344054" }}>
                        {member.role || "Member"}
                      </span>
                    </td>

                    <td>
                      <span style={{ fontWeight: 600, color: "#284bc0" }}>
                        {member.chits_enrolled || 1} Chits
                      </span>
                    </td>

                    <td className="amount-cell">
                      ₹{Number(member.total_invested || 0).toLocaleString("en-IN")}
                    </td>

                    <td>
                      <span className={`status-badge ${(member.kyc_status || "pending").toLowerCase()}`}>
                        {member.kyc_status || "Pending"}
                      </span>
                    </td>

                    <td style={{ textAlign: "right", paddingRight: "24px" }}>
                      <div style={{ display: "inline-flex", gap: "6px" }}>
                        {member.kyc_status !== "Approved" && (
                          <button
                            className="btn-sm-action btn-sm-approve"
                            title="Approve KYC"
                            onClick={() => handleUpdateKyc(member.id, "Approved")}
                          >
                            Approve
                          </button>
                        )}
                        {member.kyc_status !== "Rejected" && (
                          <button
                            className="btn-sm-action btn-sm-reject"
                            title="Reject KYC"
                            onClick={() => handleUpdateKyc(member.id, "Rejected")}
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

      {/* ADD MEMBER MODAL */}
      {isAddModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsAddModalOpen(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Add New Member</h2>
              <button className="modal-close-btn" onClick={() => setIsAddModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddMember}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ramesh Krishnan"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Email Address</label>
                    <input
                      type="email"
                      placeholder="ramesh@example.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label>Phone Number</label>
                    <input
                      type="text"
                      placeholder="+91 98765 43210"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>KYC Status</label>
                    <select
                      value={formData.kyc_status}
                      onChange={(e) => setFormData({ ...formData, kyc_status: e.target.value })}
                    >
                      <option value="Pending">Pending</option>
                      <option value="Approved">Approved</option>
                      <option value="Rejected">Rejected</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Role</label>
                    <select
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    >
                      <option value="Member">Member</option>
                      <option value="Agent">Agent</option>
                      <option value="Admin">Admin</option>
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Initial Capital / Investment (₹)</label>
                    <input
                      type="number"
                      placeholder="50000"
                      value={formData.total_invested}
                      onChange={(e) => setFormData({ ...formData, total_invested: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label>Chit Schemes Enrolled</label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={formData.chits_enrolled}
                      onChange={(e) => setFormData({ ...formData, chits_enrolled: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Residential Address / City</label>
                  <textarea
                    placeholder="Enter full address or city..."
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setIsAddModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={submitting}>
                  {submitting ? "Saving to Supabase..." : "Add Member"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
