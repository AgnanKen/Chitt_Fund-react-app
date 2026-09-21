import { useState, useEffect } from "react";
import {
  Layers3,
  IndianRupee,
  Users,
  Search,
  Plus,
  X,
  CheckCircle,
  TrendingUp,
} from "lucide-react";
import { supabase, isSupabaseConfigured, SEED_SCHEMES } from "../lib/supabase";

const ChitSchemes = () => {
  const [schemes, setSchemes] = useState(SEED_SCHEMES);
  const [loading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    category: "Gold Tier",
    total_pool_value: "",
    monthly_installment: "",
    total_months: "20",
    total_members: "20",
    enrolled_members: "0",
    status: "Active",
    description: "",
  });

  // Real-time synchronization
  useEffect(() => {
    const fetchSchemes = async () => {
      if (isSupabaseConfigured()) {
        try {
          const { data, error } = await supabase
            .from("chit_schemes")
            .select("*")
            .order("created_at", { ascending: false });

          if (error) throw error;
          if (data && data.length > 0) {
            setSchemes(data);
          }
        } catch (err) {
          console.warn("Supabase fetch failed, using seed data:", err.message);
        }
      }
    };

    fetchSchemes();

    if (isSupabaseConfigured()) {
      const channel = supabase
        .channel("realtime:chit_schemes")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "chit_schemes" },
          (payload) => {
            if (payload.eventType === "INSERT") {
              setSchemes((prev) => [payload.new, ...prev]);
            } else if (payload.eventType === "UPDATE") {
              setSchemes((prev) =>
                prev.map((s) => (s.id === payload.new.id ? payload.new : s))
              );
            } else if (payload.eventType === "DELETE") {
              setSchemes((prev) => prev.filter((s) => s.id === payload.old.id));
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, []);

  // Handle Create Scheme
  const handleCreateScheme = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    setSubmitting(true);
    const poolVal = Number(formData.total_pool_value) || 100000;
    const months = Number(formData.total_months) || 20;
    const monthlyInstallment =
      Number(formData.monthly_installment) || Math.round(poolVal / months);

    const newSchemeRecord = {
      name: formData.name,
      category: formData.category,
      total_pool_value: poolVal,
      monthly_installment: monthlyInstallment,
      total_months: months,
      current_month: 1,
      total_members: Number(formData.total_members) || 20,
      enrolled_members: Number(formData.enrolled_members) || 0,
      status: formData.status,
      description: formData.description,
      start_date: new Date().toISOString().split("T")[0],
    };

    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from("chit_schemes")
          .insert([newSchemeRecord])
          .select();

        if (error) throw error;
        if (data && data[0]) {
          setSchemes((prev) => [data[0], ...prev]);
        }
      } catch (err) {
        console.error("Supabase insert error:", err.message);
        alert("Insert failed: " + err.message);
      }
    } else {
      const mockScheme = {
        ...newSchemeRecord,
        id: "scheme-" + Date.now(),
        created_at: new Date().toISOString(),
      };
      setSchemes((prev) => [mockScheme, ...prev]);
    }

    setSubmitting(false);
    setIsCreateModalOpen(false);
    setFormData({
      name: "",
      category: "Gold Tier",
      total_pool_value: "",
      monthly_installment: "",
      total_months: "20",
      total_members: "20",
      enrolled_members: "0",
      status: "Active",
      description: "",
    });

    setFeedbackMsg("New Chit Scheme created successfully!");
    setTimeout(() => setFeedbackMsg(null), 3000);
  };

  // Metrics
  const activeCount = schemes.filter((s) => s.status === "Active").length;
  const totalCapital = schemes.reduce(
    (acc, curr) => acc + Number(curr.total_pool_value || 0),
    0
  );
  const totalEnrolled = schemes.reduce(
    (acc, curr) => acc + Number(curr.enrolled_members || 0),
    0
  );
  const totalCapacity = schemes.reduce(
    (acc, curr) => acc + Number(curr.total_members || 1),
    0
  );
  const occupancyRate =
    totalCapacity > 0 ? Math.round((totalEnrolled / totalCapacity) * 100) : 0;

  // Filtered
  const filteredSchemes = schemes.filter((s) => {
    const matchesSearch =
      s.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.category?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === "All" || s.status === statusFilter;
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
            <div className="stat-icon blue">
              <Layers3 size={22} />
            </div>
            <span className="stat-change">+1 new this month</span>
          </div>
          <div className="stat-card-content">
            <p>ACTIVE SCHEMES</p>
            <h2>{activeCount}</h2>
          </div>
        </div>

        <div className="main-stat-card">
          <div className="stat-card-top">
            <div className="stat-icon green">
              <IndianRupee size={22} />
            </div>
            <span className="stat-change">Managed Assets</span>
          </div>
          <div className="stat-card-content">
            <p>TOTAL POOL VALUE</p>
            <h2>₹{(totalCapital / 100000).toFixed(1)} Lakh</h2>
          </div>
        </div>

        <div className="main-stat-card">
          <div className="stat-card-top">
            <div className="stat-icon yellow">
              <Users size={22} />
            </div>
            <span className="stat-change">{totalEnrolled} members</span>
          </div>
          <div className="stat-card-content">
            <p>ENROLLMENT OCCUPANCY</p>
            <h2>{occupancyRate}%</h2>
          </div>
        </div>

        <div className="main-stat-card">
          <div className="stat-card-top">
            <div className="stat-icon blue">
              <TrendingUp size={22} />
            </div>
            <span className="stat-change">Foreman Yield</span>
          </div>
          <div className="stat-card-content">
            <p>ESTIMATED COMMISSION</p>
            <h2>₹{((totalCapital * 0.05) / 1000).toFixed(0)}K</h2>
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
              placeholder="Search scheme name or tier..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="filter-pills">
            {["All", "Active", "Upcoming", "Completed"].map((status) => (
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

        <button className="btn-primary" onClick={() => setIsCreateModalOpen(true)}>
          <Plus size={17} />
          <span>Create Scheme</span>
        </button>
      </div>

      {/* SCHEMES GRID */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "60px", color: "#8993a4" }}>
          Loading chit schemes from Supabase...
        </div>
      ) : filteredSchemes.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px", color: "#8993a4" }}>
          No chit schemes found matching your criteria.
        </div>
      ) : (
        <div className="scheme-grid">
          {filteredSchemes.map((scheme) => {
            const enrollmentPct = Math.round(
              ((scheme.enrolled_members || 0) / (scheme.total_members || 20)) * 100
            );

            return (
              <div className="scheme-card" key={scheme.id}>
                <div className="scheme-card-top">
                  <div>
                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: "700",
                        letterSpacing: "0.5px",
                        textTransform: "uppercase",
                        color: "#2850c7",
                      }}
                    >
                      {scheme.category || "Standard"}
                    </span>
                    <h3 style={{ fontSize: "17px", fontWeight: "700", marginTop: "4px" }}>
                      {scheme.name}
                    </h3>
                  </div>

                  <span
                    className={`scheme-badge ${(scheme.status || "active").toLowerCase()}`}
                  >
                    {scheme.status}
                  </span>
                </div>

                <div className="scheme-card-body">
                  <div className="scheme-pot-display">
                    <span>Total Fund Pool</span>
                    <strong>
                      ₹{Number(scheme.total_pool_value || 0).toLocaleString("en-IN")}
                    </strong>
                  </div>

                  <div>
                    <div className="scheme-detail-row">
                      <span>Monthly Installment</span>
                      <strong>
                        ₹{Number(scheme.monthly_installment || 0).toLocaleString("en-IN")}/mo
                      </strong>
                    </div>
                    <div className="scheme-detail-row">
                      <span>Duration</span>
                      <strong>{scheme.total_months || 20} Months</strong>
                    </div>
                    <div className="scheme-detail-row">
                      <span>Current Cycle</span>
                      <strong>
                        Month {scheme.current_month || 1} of {scheme.total_months || 20}
                      </strong>
                    </div>
                  </div>

                  {/* Enrollment Progress */}
                  <div className="participation" style={{ marginTop: "4px" }}>
                    <div className="participation-label">
                      <span>Enrolled Capacity</span>
                      <strong>
                        {scheme.enrolled_members || 0} / {scheme.total_members || 20} (
                        {enrollmentPct}%)
                      </strong>
                    </div>
                    <div className="progress-bar">
                      <div
                        className="progress-fill"
                        style={{
                          width: `${enrollmentPct}%`,
                          background:
                            enrollmentPct >= 100
                              ? "#10b486"
                              : enrollmentPct > 70
                              ? "#2850c7"
                              : "#f2a20a",
                        }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE SCHEME MODAL */}
      {isCreateModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsCreateModalOpen(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Create New Chit Scheme</h2>
              <button
                className="modal-close-btn"
                onClick={() => setIsCreateModalOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateScheme}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Scheme Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Diamond Wealth - 5L"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Scheme Tier / Category</label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    >
                      <option value="Gold Tier">Gold Tier</option>
                      <option value="Silver Tier">Silver Tier</option>
                      <option value="Platinum Tier">Platinum Tier</option>
                      <option value="Diamond Tier">Diamond Tier</option>
                      <option value="Micro Tier">Micro Tier</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Status</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    >
                      <option value="Active">Active</option>
                      <option value="Upcoming">Upcoming</option>
                      <option value="Completed">Completed</option>
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Total Pool Value (₹) *</label>
                    <input
                      type="number"
                      required
                      placeholder="100000"
                      value={formData.total_pool_value}
                      onChange={(e) =>
                        setFormData({ ...formData, total_pool_value: e.target.value })
                      }
                    />
                  </div>

                  <div className="form-group">
                    <label>Monthly Installment (₹)</label>
                    <input
                      type="number"
                      placeholder="5000"
                      value={formData.monthly_installment}
                      onChange={(e) =>
                        setFormData({ ...formData, monthly_installment: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Duration (Months)</label>
                    <input
                      type="number"
                      min="5"
                      max="60"
                      value={formData.total_months}
                      onChange={(e) =>
                        setFormData({ ...formData, total_months: e.target.value })
                      }
                    />
                  </div>

                  <div className="form-group">
                    <label>Max Members</label>
                    <input
                      type="number"
                      min="5"
                      max="100"
                      value={formData.total_members}
                      onChange={(e) =>
                        setFormData({ ...formData, total_members: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Initial Enrolled Members</label>
                  <input
                    type="number"
                    min="0"
                    max={formData.total_members}
                    value={formData.enrolled_members}
                    onChange={(e) =>
                      setFormData({ ...formData, enrolled_members: e.target.value })
                    }
                  />
                </div>

                <div className="form-group">
                  <label>Description & Rules</label>
                  <textarea
                    placeholder="Provide details on monthly auction dates, dividend rules..."
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setIsCreateModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={submitting}>
                  {submitting ? "Saving to Supabase..." : "Create Scheme"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChitSchemes;
