
import {
  Bell,
  Settings,
  Search,
  ChevronDown,
  Menu,
  LogOut,
} from "lucide-react";
const Navbar = ({
  title = "Dashboard",
  subtitle = "Welcome back, Admin",
  onMenuClick,
  onSettingsClick,
  user,
  profile,
  role,
  onLogout,
}) => {
  const displayName = profile?.full_name || user?.email?.split("@")[0] || "User";
  const initials = profile?.avatar_initials || displayName.slice(0, 2).toUpperCase();
  const roleLabel = role === "member" ? "Member" : "Admin";

  return (
    <header className="top-header">
      <div className="header-left">
        <button className="mobile-menu-btn" onClick={onMenuClick}>
          <Menu size={22} />
        </button>

        <div className="page-heading">
          <h1>{title}</h1>
          <p>{subtitle}</p>
        </div>
      </div>

      <div className="search-box">
        <Search size={19} />
        <input type="text" placeholder="Search members, schemes, payments, bids..." />
      </div>

      <div className="header-right">
        <div
          className="conn-badge live"
          onClick={onSettingsClick}
          title="Supabase Live Database Connected"
        >
          <span className="conn-dot"></span>
          <span>Supabase Live</span>
        </div>

        <button className="header-icon notification-btn" title="Recent Alerts">
          <Bell size={19} />
          <span className="notification-dot"></span>
        </button>

        <button className="header-icon" title="App & Database Settings" onClick={onSettingsClick}>
          <Settings size={19} />
        </button>

        <div className="header-divider"></div>

        {user ? (
          <div className="header-user" onClick={onSettingsClick}>
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
                  title="Logout"
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