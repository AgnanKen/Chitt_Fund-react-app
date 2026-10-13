
import {
  LayoutDashboard,
  Users,
  Layers3,
  Gavel,
  CreditCard,
  BarChart3,
  LogOut,
  CircleDollarSign,
  X,
  ShieldCheck,
} from "lucide-react";

const Sidebar = ({
  sidebarOpen,
  setSidebarOpen,
  activeMenu = "Dashboard",
  onSelectMenu,
  role = "admin",
  profile,
  onLogout,
}) => {
  const menuItems =
    role === "member"
      ? [
          { name: "Dashboard", icon: <LayoutDashboard size={19} /> },
          { name: "My Schemes", icon: <Layers3 size={19} /> },
          { name: "My Payments", icon: <CreditCard size={19} /> },
          { name: "Live Auctions", icon: <Gavel size={19} /> },
          { name: "KYC Verification", icon: <ShieldCheck size={19} /> },
        ]
      : [
          { name: "Dashboard", icon: <LayoutDashboard size={19} /> },
          { name: "User Management", icon: <Users size={19} /> },
          { name: "Chit Schemes", icon: <Layers3 size={19} /> },
          { name: "Live Auctions", icon: <Gavel size={19} /> },
          { name: "Payments", icon: <CreditCard size={19} /> },
          { name: "Reports", icon: <BarChart3 size={19} /> },
        ];

  const handleItemClick = (menuName) => {
    if (onSelectMenu) {
      onSelectMenu(menuName);
    }
    setSidebarOpen(false);
  };

  const profileLabel = profile?.full_name || (role === "member" ? "Member" : "Admin");
  const profileSubtitle = role === "member" ? "Member Portal" : "Super Admin";
  const initials = profile?.avatar_initials || profileLabel.slice(0, 2).toUpperCase();

  return (
    <>
      {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}

      <aside className={`sidebar ${sidebarOpen ? "sidebar-open" : ""}`}>
        <div
          className="sidebar-logo"
          style={{ cursor: "pointer" }}
          onClick={() => handleItemClick("Dashboard")}
        >
          <div className="logo-icon">
            <CircleDollarSign size={22} />
          </div>
          <span>LedgerOne</span>

          <button
            className="mobile-close"
            onClick={(e) => {
              e.stopPropagation();
              setSidebarOpen(false);
            }}
          >
            <X size={20} />
          </button>
        </div>

        <div className="menu-section">
          <p className="menu-title">{role === "member" ? "MEMBER MENU" : "MAIN MENU"}</p>

          <div className="sidebar-menu">
            {menuItems.map((item) => (
              <div
                key={item.name}
                className={`menu-item ${activeMenu === item.name ? "active" : ""}`}
                onClick={() => handleItemClick(item.name)}
                style={{ cursor: "pointer" }}
              >
                <span className="menu-icon">{item.icon}</span>
                <span>{item.name}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="sidebar-bottom">
          <div
            className="admin-profile"
            style={{ cursor: "pointer" }}
            onClick={() => {
              if (role === "member") {
                handleItemClick("Dashboard");
              } else {
                handleItemClick("Settings");
              }
            }}
          >
            <div className="admin-avatar">{initials}</div>

            <div className="admin-details">
              <strong>{profileLabel}</strong>
              <span>{profileSubtitle}</span>
            </div>

            <button
              type="button"
              className="sidebar-logout-button"
              onClick={(event) => {
                event.stopPropagation();
                if (onLogout) onLogout();
              }}
              aria-label="Logout"
            >
              <LogOut size={19} className="logout-icon" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;