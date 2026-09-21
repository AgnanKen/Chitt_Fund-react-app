import { useState } from "react";
import {
  BarChart3,
  TrendingUp,
  Download,
  IndianRupee,
  ShieldCheck,
  FileSpreadsheet,
  CheckCircle,
} from "lucide-react";

const Reports = () => {
  const [reportPeriod, setReportPeriod] = useState("FY 2025-26");
  const [downloadMsg, setDownloadMsg] = useState(null);

  const handleExport = (type) => {
    setDownloadMsg(`Generating ${type} report...`);
    setTimeout(() => {
      setDownloadMsg(`${type} report exported successfully!`);
      setTimeout(() => setDownloadMsg(null), 3000);
    }, 800);
  };

  const monthlyCollectionsData = [
    { month: "Oct", collected: "₹32.4L", target: "₹30.0L", pct: 100 },
    { month: "Nov", collected: "₹34.1L", target: "₹32.0L", pct: 100 },
    { month: "Dec", collected: "₹36.8L", target: "₹35.0L", pct: 100 },
    { month: "Jan", collected: "₹37.5L", target: "₹36.0L", pct: 100 },
    { month: "Feb", collected: "₹35.9L", target: "₹36.0L", pct: 98 },
    { month: "Mar", collected: "₹38.2L", target: "₹37.0L", pct: 100 },
  ];

  const schemePerformance = [
    { name: "Gold Chit Schemes", count: 8, pool: "₹1.80 Cr", yield: "9.2%", color: "#2850c7" },
    { name: "Silver Chit Schemes", count: 6, pool: "₹1.10 Cr", yield: "8.6%", color: "#10b486" },
    { name: "Platinum High Net", count: 3, pool: "₹1.45 Cr", yield: "11.4%", color: "#f2a20a" },
    { name: "Micro Starter Pools", count: 4, pool: "₹0.47 Cr", yield: "7.8%", color: "#65748a" },
  ];

  return (
    <div className="dashboard-content">
      {downloadMsg && (
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
          {downloadMsg}
        </div>
      )}

      {/* TOP STATS */}
      <section className="main-stats-grid" style={{ marginBottom: "26px" }}>
        <div className="main-stat-card">
          <div className="stat-card-top">
            <div className="stat-icon blue">
              <IndianRupee size={22} />
            </div>
            <span className="stat-change">+14.2% YoY</span>
          </div>
          <div className="stat-card-content">
            <p>ANNUAL MANAGED TURNOVER</p>
            <h2>₹4.82 Crore</h2>
          </div>
        </div>

        <div className="main-stat-card">
          <div className="stat-card-top">
            <div className="stat-icon green">
              <TrendingUp size={22} />
            </div>
            <span className="stat-change">Foreman P&L</span>
          </div>
          <div className="stat-card-content">
            <p>NET COMMISSIONS COLLECTED</p>
            <h2>₹24.10 Lakh</h2>
          </div>
        </div>

        <div className="main-stat-card">
          <div className="stat-card-top">
            <div className="stat-icon yellow">
              <ShieldCheck size={22} />
            </div>
            <span className="stat-change">Healthy Ratio</span>
          </div>
          <div className="stat-card-content">
            <p>COLLECTION COMPLIANCE RATE</p>
            <h2>97.8%</h2>
          </div>
        </div>

        <div className="main-stat-card">
          <div className="stat-card-top">
            <div className="stat-icon red">
              <BarChart3 size={22} />
            </div>
            <span className="stat-change negative">Under Recovery</span>
          </div>
          <div className="stat-card-content">
            <p>DEFAULT EXPOSURE</p>
            <h2>₹1.25 Lakh</h2>
          </div>
        </div>
      </section>

      {/* ACTION BAR */}
      <div className="page-action-bar">
        <div className="action-bar-left">
          <div className="filter-pills">
            {["FY 2025-26", "Q4 Jan-Mar", "Past 30 Days", "All Time"].map((period) => (
              <button
                key={period}
                className={`filter-pill ${reportPeriod === period ? "active" : ""}`}
                onClick={() => setReportPeriod(period)}
              >
                {period}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", gap: "10px" }}>
          <button className="btn-secondary" onClick={() => handleExport("CSV Spreadsheet")}>
            <FileSpreadsheet size={16} />
            <span>Export CSV</span>
          </button>
          <button className="btn-primary" onClick={() => handleExport("Audit Statement PDF")}>
            <Download size={16} />
            <span>Audit Statement</span>
          </button>
        </div>
      </div>

      {/* REPORTS SECTION GRID */}
      <div className="reports-summary-grid">
        {/* MONTHLY COLLECTION METRICS */}
        <div className="activity-card" style={{ padding: "24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
            <div>
              <h3 style={{ fontSize: "16px", fontWeight: "700", color: "#1a2436" }}>
                Monthly Collection Trajectory
              </h3>
              <p style={{ fontSize: "12px", color: "#8a94a4", marginTop: "3px" }}>
                Target vs Actual Realized Collections
              </p>
            </div>
            <span style={{ fontSize: "12px", fontWeight: "700", color: "#10b486" }}>
              Avg 101% of Target
            </span>
          </div>

          <div className="progress-list">
            {monthlyCollectionsData.map((item) => (
              <div key={item.month}>
                <div className="progress-item-label">
                  <span>{item.month} 2026</span>
                  <strong>
                    {item.collected}{" "}
                    <span style={{ color: "#8a94a4", fontWeight: "400" }}>/ target {item.target}</span>
                  </strong>
                </div>
                <div className="progress-bar" style={{ height: "7px" }}>
                  <div
                    className="progress-fill"
                    style={{
                      width: `${Math.min(item.pct, 100)}%`,
                      background: item.pct >= 100 ? "#2850c7" : "#f2a20a",
                    }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* SCHEME PORTFOLIO BREAKDOWN */}
        <div className="activity-card" style={{ padding: "24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
            <div>
              <h3 style={{ fontSize: "16px", fontWeight: "700", color: "#1a2436" }}>
                Scheme Portfolio Distribution
              </h3>
              <p style={{ fontSize: "12px", color: "#8a94a4", marginTop: "3px" }}>
                Capital allocation across active tiers
              </p>
            </div>
            <span style={{ fontSize: "12px", fontWeight: "700", color: "#2850c7" }}>
              21 Schemes Running
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {schemePerformance.map((scheme) => (
              <div
                key={scheme.name}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "13px 16px",
                  background: "#f9fafc",
                  borderRadius: "10px",
                  border: "1px solid #eef2f6",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div
                    style={{
                      width: "10px",
                      height: "10px",
                      borderRadius: "50%",
                      background: scheme.color,
                    }}
                  ></div>
                  <div>
                    <strong style={{ color: "#1f293b", fontSize: "13px" }}>{scheme.name}</strong>
                    <div style={{ fontSize: "11px", color: "#8894a6" }}>
                      {scheme.count} Active Schemes · Yield {scheme.yield}
                    </div>
                  </div>
                </div>

                <div style={{ textAlign: "right" }}>
                  <strong style={{ fontSize: "14px", color: "#1e293b" }}>{scheme.pool}</strong>
                  <div style={{ fontSize: "11px", color: "#10b486", fontWeight: "600" }}>Healthy</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;
