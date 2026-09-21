
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
} from "lucide-react";

const Sidebar = ({
  sidebarOpen,
  setSidebarOpen,
  activeMenu = "Dashboard",
  onSelectMenu,
}) => {
  const menuItems = [
    {
      name: "Dashboard",
      icon: <LayoutDashboard size={19} />,
    },
    {
      name: "User Management",
      icon: <Users size={19} />,
    },
    {
      name: "Chit Schemes",
      icon: <Layers3 size={19} />,
    },
    {
      name: "Live Auctions",
      icon: <Gavel size={19} />,
    },
    {
      name: "Payments",
      icon: <CreditCard size={19} />,
    },
    {
      name: "Reports",
      icon: <BarChart3 size={19} />,
    },
  ];

  const handleItemClick = (menuName) => {
    if (onSelectMenu) {
      onSelectMenu(menuName);
    }
    setSidebarOpen(false);
  };

  return (
    <>
      {/* =========================
          MOBILE OVERLAY
      ========================= */}
      {sidebarOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* =========================
          SIDEBAR
      ========================= */}
      <aside className={`sidebar ${sidebarOpen ? "sidebar-open" : ""}`}>
        {/* =========================
            LOGO
        ========================= */}
        <div
          className="sidebar-logo"
          style={{ cursor: "pointer" }}
          onClick={() => handleItemClick("Dashboard")}
        >
          <div className="logo-icon">
            <CircleDollarSign size={22} />
          </div>
          <span>LedgerOne</span>

          {/* Mobile Close */}
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

        {/* =========================
            MENU
        ========================= */}
        <div className="menu-section">
          <p className="menu-title">MAIN MENU</p>

          <div className="sidebar-menu">
            {menuItems.map((item) => (
              <div
                key={item.name}
                className={`menu-item ${
                  activeMenu === item.name ? "active" : ""
                }`}
                onClick={() => handleItemClick(item.name)}
                style={{ cursor: "pointer" }}
              >
                <span className="menu-icon">{item.icon}</span>
                <span>{item.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* =========================
            ADMIN PROFILE / FOOTER
        ========================= */}
        <div className="sidebar-bottom">
          <div
            className="admin-profile"
            style={{ cursor: "pointer" }}
            onClick={() => handleItemClick("Settings")}
          >
            <div className="admin-avatar">A</div>

            <div className="admin-details">
              <strong>Admin</strong>
              <span>Super Admin</span>
            </div>

            <LogOut size={19} className="logout-icon" />
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;