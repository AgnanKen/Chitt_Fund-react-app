import { useState, useEffect } from "react";
import {
  Bell,
  Settings,
  ChevronDown,
  Menu,
  LogOut,
  Sliders,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import SearchBar from "./SearchBar";
import NotificationCenter from "./NotificationCenter";
import { isSupabaseConfigured } from "../lib/supabase";

const Navbar = ({
  title = "Dashboard",
  subtitle = "Welcome back, Admin",
  onMenuClick,
  sidebarHidden = false,
  onSettingsClick,
  onNavigate,
  user,
  profile,
  role = "admin",
  onLogout,
}) => {
  const [notifOpen, setNotifOpen] = useState(false);
  const isConnected = isSupabaseConfigured();

  // Read unread notification count from localStorage if available
  const [unreadCount, setUnreadCount] = useState(3);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("ledgerone_notifications");
      if (saved) {
        const parsed = JSON.parse(saved);
        setUnreadCount(parsed.filter((n) => !n.read).length);
      }
    } catch {
      // ignore
    }
  }, [notifOpen]);

  const displayName = profile?.full_name || user?.email?.split("@")[0] || "User";
  const initials = profile?.avatar_initials || displayName.slice(0, 2).toUpperCase();
  const roleLabel = role === "member" ? "Member" : "Super Admin";

  return (
    <header className="top-header">
      {/* Left side: 3 lines hamburger button and page title */}
      <div className="header-left">
        <button
          type="button"
          className={`mobile-menu-btn menu-toggle-btn ${sidebarHidden ? "sidebar-is-hidden" : ""}`}
          onClick={onMenuClick}
          title={sidebarHidden ? "Show Left Navigation Bar" : "Hide Left Navigation Bar"}
          aria-label={sidebarHidden ? "Show left navigation sidebar" : "Hide left navigation sidebar"}
        >
          <Menu size={22} className="menu-icon-svg" />
        </button>

        <div className="page-heading">
          <h1>{title}</h1>
          <p>{subtitle}</p>
        </div>
      </div>

      {/* Center: Live Search Bar */}
      <SearchBar onNavigate={onNavigate} role={role} />

      {/* Right side: Database Badge, Notification Center, Settings Bar, User Info */}
      <div className="header-right">
        {/* Supabase status badge: clicking opens Settings Drawer */}
        <div
          className={`conn-badge ${isConnected ? "live" : "demo"}`}
          onClick={onSettingsClick}
          title={isConnected ? "Supabase Live Database Connected (Click to view)" : "Running in Demo Mode (Click to configure)"}
          style={{ cursor: "pointer" }}
        >
          <span className="conn-dot"></span>
          <span>{isConnected ? "Supabase Live" : "Demo Mode"}</span>
        </div>

        {/* Notifications Button */}
        <div className="notif-wrapper">
          <button
            type="button"
            className={`header-icon notification-btn ${notifOpen ? "active" : ""}`}
            title="Recent Alerts & Updates"
            onClick={() => setNotifOpen((prev) => !prev)}
            aria-label="View notifications"
          >
            <Bell size={19} />
            {unreadCount > 0 && <span className="notification-dot" />}
          </button>

          {/* Interactive Notifications Popover */}
          <NotificationCenter
            isOpen={notifOpen}
            onClose={() => setNotifOpen(false)}
            onNavigate={onNavigate}
          />
        </div>

        {/* Settings Bar trigger button */}
        <button
          type="button"
          className="header-icon settings-btn"
          title="Open Settings Bar"
          onClick={onSettingsClick}
          aria-label="Open Settings Bar"
        >
          <Settings size={19} />
        </button>

        <div className="header-divider"></div>

        {/* User Card */}
        {user ? (
          <div
            className="header-user"
            onClick={onSettingsClick}
            title="Open Account & Settings"
            style={{ cursor: "pointer" }}
          >
            <div className="header-user-avatar">{initials}</div>

            <div className="header-user-info">
              <strong>{displayName}</strong>
              <span>{roleLabel}</span>
            </div>

            <div className="header-user-actions">
              <ChevronDown size={17} />
              {onLogout && (
                <button
                  type="button"
                  className="logout-inline-button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onLogout();
                  }}
                  title="Sign Out"
                >
                  <LogOut size={16} />
                </button>
              )}
            </div>
          </div>
        ) : (
          <button className="primary-button" type="button" onClick={onSettingsClick}>
            Login
          </button>
        )}
      </div>
    </header>
  );
};

export default Navbar;