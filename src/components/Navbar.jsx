
import {
  Bell,
  Settings,
  Search,
  ChevronDown,
  Menu,
} from "lucide-react";
import { isSupabaseConfigured } from "../lib/supabase";

const Navbar = ({
  title = "Dashboard",
  subtitle = "Welcome back, Admin",
  onMenuClick,
  onSettingsClick,
}) => {
  const isConnected = isSupabaseConfigured();

  return (
    <header className="top-header">
      {/* =========================
          LEFT SIDE
      ========================= */}
      <div className="header-left">
        {/* Mobile Menu */}
        <button className="mobile-menu-btn" onClick={onMenuClick}>
          <Menu size={22} />
        </button>

        <div className="page-heading">
          <h1>{title}</h1>
          <p>{subtitle}</p>
        </div>
      </div>

      {/* =========================
          SEARCH
      ========================= */}
      <div className="search-box">
        <Search size={19} />
        <input
          type="text"
          placeholder="Search members, schemes, payments, bids..."
        />
      </div>

      {/* =========================
          RIGHT SIDE
      ========================= */}
      <div className="header-right">
        {/* Supabase Connection Indicator */}
        <div
          className={`conn-badge ${isConnected ? "live" : "demo"}`}
          onClick={onSettingsClick}
          title={
            isConnected
              ? "Supabase Live Connection Active"
              : "Running in Demo Mode (Seed Data) - Click to configure"
          }
        >
          <span className="conn-dot"></span>
          <span>{isConnected ? "Supabase Live" : "Demo Mode"}</span>
        </div>

        {/* Notifications */}
        <button className="header-icon notification-btn" title="Recent Alerts">
          <Bell size={19} />
          <span className="notification-dot"></span>
        </button>

        {/* Settings */}
        <button
          className="header-icon"
          title="App & Database Settings"
          onClick={onSettingsClick}
        >
          <Settings size={19} />
        </button>

        {/* Divider */}
        <div className="header-divider"></div>

        {/* Admin Profile */}
        <div className="header-user" onClick={onSettingsClick}>
          <div className="header-user-avatar">R</div>

          <div className="header-user-info">
            <strong>Rahul Sharma</strong>
            <span>Super Admin</span>
          </div>

          <ChevronDown size={17} />
        </div>
      </div>
    </header>
  );
};

export default Navbar;