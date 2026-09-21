import { useState } from "react";
import {
  Database,
  Building,
  CheckCircle,
  AlertCircle,
  Save,
} from "lucide-react";
import { isSupabaseConfigured } from "../lib/supabase";

const Settings = () => {
  const isConnected = isSupabaseConfigured();
  const [foremanCommission, setForemanCommission] = useState("5.0");
  const [maxDiscount, setMaxDiscount] = useState("35.0");
  const [orgName, setOrgName] = useState("LedgerOne Financial Services Ltd.");
  const [regNumber, setRegNumber] = useState("TN/CHIT/2026/8942-A");
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSaveSettings = (e) => {
    e.preventDefault();
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  return (
    <div className="dashboard-content">
      {saveSuccess && (
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
          Settings updated successfully!
        </div>
      )}

      {/* SUPABASE BACKEND STATUS CARD */}
      <div className="settings-card">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
              <Database size={20} color="#2850c7" />
              <h3 style={{ margin: 0 }}>Supabase PostgreSQL Backend</h3>
            </div>
            <p style={{ margin: 0 }}>
              Status, schema configuration, and live synchronization engine
            </p>
          </div>

          <div
            className={`conn-badge ${isConnected ? "live" : "demo"}`}
            style={{ fontSize: "13px", padding: "8px 16px" }}
          >
            <span className="conn-dot"></span>
            <span>{isConnected ? "Connected to Live Supabase" : "Running in Demo Mode"}</span>
          </div>
        </div>

        <div
          style={{
            background: isConnected ? "#eaf9f3" : "#fff9ec",
            border: `1px solid ${isConnected ? "#b9eed9" : "#fae5b6"}`,
            borderRadius: "12px",
            padding: "18px 20px",
            marginTop: "20px",
          }}
        >
          <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
            {isConnected ? (
              <CheckCircle size={22} color="#10b486" style={{ flexShrink: 0, marginTop: "2px" }} />
            ) : (
              <AlertCircle size={22} color="#f2a20a" style={{ flexShrink: 0, marginTop: "2px" }} />
            )}
            <div>
              <strong style={{ color: isConnected ? "#0f7a59" : "#b07300", fontSize: "14px" }}>
                {isConnected
                  ? "Live Supabase Database Active & Synced"
                  : "Environment Variables Not Yet Configured"}
              </strong>
              <p
                style={{
                  color: isConnected ? "#195c47" : "#7d5507",
                  fontSize: "12px",
                  marginTop: "5px",
                  lineHeight: 1.5,
                }}
              >
                {isConnected
                  ? "All data reads (.select()), creates (.insert()), status changes (.update()), and real-time event broadcasting are streaming live with your Supabase project."
                  : "To connect your live PostgreSQL database, copy your credentials into a .env file and run the provided supabase_schema.sql script in your Supabase SQL editor."}
              </p>
            </div>
          </div>
        </div>

        <div style={{ marginTop: "20px" }}>
          <span style={{ fontSize: "13px", fontWeight: "600", color: "#344054" }}>
            Quick Setup Instructions:
          </span>
          <ol
            style={{
              paddingLeft: "20px",
              marginTop: "8px",
              fontSize: "12px",
              color: "#5f6c80",
              lineHeight: "1.8",
            }}
          >
            <li>
              Open your <strong>Supabase Dashboard</strong> and navigate to the <strong>SQL Editor</strong>.
            </li>
            <li>
              Copy & run the contents of{" "}
              <code style={{ background: "#edf2f9", padding: "2px 6px", borderRadius: "4px" }}>
                supabase_schema.sql
              </code>{" "}
              (located in your project root).
            </li>
            <li>
              Create a file named <code>.env</code> in the project root with your project credentials:
            </li>
          </ol>

          <div className="code-snippet-box">
            VITE_SUPABASE_URL=https://your-project-ref.supabase.co<br />
            VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
          </div>
        </div>
      </div>

      {/* CHIT FUND RULES & BUSINESS PREFERENCES */}
      <div className="settings-card">
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
          <Building size={20} color="#2850c7" />
          <h3 style={{ margin: 0 }}>Chit Fund Organization & Rules</h3>
        </div>
        <p>Foreman regulations, statutory commission rates, and organization details</p>

        <form onSubmit={handleSaveSettings}>
          <div className="form-row" style={{ marginBottom: "16px" }}>
            <div className="form-group">
              <label>Organization Legal Entity Name</label>
              <input
                type="text"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Registrar Chit Fund License No.</label>
              <input
                type="text"
                value={regNumber}
                onChange={(e) => setRegNumber(e.target.value)}
              />
            </div>
          </div>

          <div className="form-row" style={{ marginBottom: "20px" }}>
            <div className="form-group">
              <label>Foreman Commission Rate (%)</label>
              <input
                type="number"
                step="0.1"
                value={foremanCommission}
                onChange={(e) => setForemanCommission(e.target.value)}
              />
              <span style={{ fontSize: "11px", color: "#8a94a4" }}>
                Statutory cap as per Chit Funds Act (typically 5.0%)
              </span>
            </div>

            <div className="form-group">
              <label>Maximum Auction Bid Discount Cap (%)</label>
              <input
                type="number"
                step="0.1"
                value={maxDiscount}
                onChange={(e) => setMaxDiscount(e.target.value)}
              />
              <span style={{ fontSize: "11px", color: "#8a94a4" }}>
                Protects subscriber prize value (e.g. 35.0% maximum discount)
              </span>
            </div>
          </div>

          <button type="submit" className="btn-primary">
            <Save size={16} />
            <span>Save Preferences</span>
          </button>
        </form>
      </div>
    </div>
  );
};

export default Settings;
