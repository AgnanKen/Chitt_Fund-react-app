import { useState } from "react";
import "./App.css";
import Navbar from "./components/Navbar";
import Sidebar from "./components/Sidebar";

// Pages
import Home from "./pages/Home";
import UserManagement from "./pages/UserManagement";
import ChitSchemes from "./pages/ChitSchemes";
import LiveAuctions from "./pages/LiveAuctions";
import Payments from "./pages/Payments";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";

function App() {
  const [activeMenu, setActiveMenu] = useState("Dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Page title mapping
  const pageMeta = {
    Dashboard: {
      title: "Dashboard",
      subtitle: "Welcome back, Admin",
    },
    "User Management": {
      title: "User Management",
      subtitle: "Manage members, KYC verification, and user profiles",
    },
    "Chit Schemes": {
      title: "Chit Schemes",
      subtitle: "Active schemes, fund pools, and enrollment capacities",
    },
    "Live Auctions": {
      title: "Live Auctions",
      subtitle: "Real-time bidding hall, discount rates, and dividend yields",
    },
    Payments: {
      title: "Payments & Collections",
      subtitle: "Installment ledger, verification approvals, and payouts",
    },
    Reports: {
      title: "Financial Reports",
      subtitle: "Audit statements, collection trends, and foreman yield",
    },
    Settings: {
      title: "System Settings",
      subtitle: "Database configuration, chit fund rules, and preferences",
    },
  };

  const currentMeta = pageMeta[activeMenu] || pageMeta.Dashboard;

  // Render current page
  const renderCurrentPage = () => {
    switch (activeMenu) {
      case "Dashboard":
        return <Home onNavigate={(menu) => setActiveMenu(menu)} />;
      case "User Management":
        return <UserManagement />;
      case "Chit Schemes":
        return <ChitSchemes />;
      case "Live Auctions":
        return <LiveAuctions />;
      case "Payments":
        return <Payments />;
      case "Reports":
        return <Reports />;
      case "Settings":
        return <Settings />;
      default:
        return <Home onNavigate={(menu) => setActiveMenu(menu)} />;
    }
  };

  return (
    <div className="LedgerOne-dashboard">
      {/* =========================
          PERSISTENT SIDEBAR
      ========================= */}
      <Sidebar
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        activeMenu={activeMenu}
        onSelectMenu={(menu) => setActiveMenu(menu)}
      />

      {/* =========================
          MAIN CONTENT AREA
      ========================= */}
      <main className="main-content">
        {/* =========================
            PERSISTENT NAVBAR
        ========================= */}
        <Navbar
          title={currentMeta.title}
          subtitle={currentMeta.subtitle}
          onMenuClick={() => setSidebarOpen(true)}
          onSettingsClick={() => setActiveMenu("Settings")}
        />

        {/* =========================
            ACTIVE PAGE COMPONENT
        ========================= */}
        {renderCurrentPage()}
      </main>
    </div>
  );
}

export default App;
