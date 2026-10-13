import { useState } from "react";
import "./App.css";
import Navbar from "./components/Navbar";
import Sidebar from "./components/Sidebar";
import { useAuth } from "./context/useAuth";

// Admin Pages
import Home from "./pages/Home";
import UserManagement from "./pages/UserManagement";
import ChitSchemes from "./pages/ChitSchemes";
import LiveAuctions from "./pages/LiveAuctions";
import Payments from "./pages/Payments";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";

// Member pages
import LoginPage from "./pages/LoginPage";
import MemberDashboard from "./pages/member/MemberDashboard";
import MemberPayments from "./pages/member/MemberPayments";
import MemberSchemes from "./pages/member/MemberSchemes";
import MemberKyc from "./pages/member/MemberKyc";

function App() {
  const { user, role, profile, loading, signOut } = useAuth();
  const [activeMenu, setActiveMenu] = useState("Dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const memberMenuItems = [
    "Dashboard",
    "My Schemes",
    "My Payments",
    "Live Auctions",
    "KYC Verification",
  ];
  const safeActiveMenu = role === "member" && !memberMenuItems.includes(activeMenu) ? "Dashboard" : activeMenu;

  const adminPageMeta = {
    Dashboard: { title: "Dashboard", subtitle: "Welcome back, Admin" },
    "User Management": { title: "User Management", subtitle: "Manage members, KYC verification, and user profiles" },
    "Chit Schemes": { title: "Chit Schemes", subtitle: "Active schemes, fund pools, and enrollment capacities" },
    "Live Auctions": { title: "Live Auctions", subtitle: "Real-time bidding hall, discount rates, and dividend yields" },
    Payments: { title: "Payments & Collections", subtitle: "Installment ledger, verification approvals, and payouts" },
    Reports: { title: "Financial Reports", subtitle: "Audit statements, collection trends, and foreman yield" },
    Settings: { title: "System Settings", subtitle: "Database configuration, chit fund rules, and preferences" },
  };

  const memberPageMeta = {
    Dashboard: { title: "My Dashboard", subtitle: `Welcome back, ${profile?.full_name || "Member"}` },
    "My Schemes": { title: "My Schemes", subtitle: "Your active chit enrollments and schedule" },
    "My Payments": { title: "My Payments", subtitle: "Your payment history and receipts" },
    "Live Auctions": { title: "Live Auctions", subtitle: "Bid participation and auction updates" },
    "KYC Verification": { title: "KYC Verification", subtitle: "Identity verification and regulatory compliance documents" },
  };

  const currentMeta = role === "member" ? memberPageMeta[safeActiveMenu] || memberPageMeta.Dashboard : adminPageMeta[safeActiveMenu] || adminPageMeta.Dashboard;

  const renderAdminPage = () => {
    switch (safeActiveMenu) {
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

  const renderMemberPage = () => {
    switch (safeActiveMenu) {
      case "My Schemes":
        return <MemberSchemes onNavigate={(menu) => setActiveMenu(menu)} />;
      case "My Payments":
        return <MemberPayments onNavigate={(menu) => setActiveMenu(menu)} />;
      case "Live Auctions":
        return <LiveAuctions onNavigate={(menu) => setActiveMenu(menu)} />;
      case "KYC Verification":
        return <MemberKyc onNavigate={(menu) => setActiveMenu(menu)} />;
      case "Dashboard":
      default:
        return <MemberDashboard onNavigate={(menu) => setActiveMenu(menu)} />;
    }
  };

  if (loading) {
    return (
      <div className="auth-loading-screen">
        <div className="auth-loader" />
        <p>Loading LedgerOne...</p>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  if (role === "member") {
    return (
      <div className="LedgerOne-dashboard">
        <Sidebar
          role="member"
          user={user}
          profile={profile}
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          activeMenu={safeActiveMenu}
          onSelectMenu={(menu) => setActiveMenu(menu)}
          onLogout={signOut}
        />

        <main className="main-content">
          <Navbar
            title={currentMeta.title}
            subtitle={currentMeta.subtitle}
            onMenuClick={() => setSidebarOpen(true)}
            onSettingsClick={() => setActiveMenu("Dashboard")}
            user={user}
            profile={profile}
            role={role}
            onLogout={signOut}
          />
          {renderMemberPage()}
        </main>
      </div>
    );
  }

  return (
    <div className="LedgerOne-dashboard">
      <Sidebar
        role="admin"
        user={user}
        profile={profile}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        activeMenu={safeActiveMenu}
        onSelectMenu={(menu) => setActiveMenu(menu)}
        onLogout={signOut}
      />

      <main className="main-content">
        <Navbar
          title={currentMeta.title}
          subtitle={currentMeta.subtitle}
          onMenuClick={() => setSidebarOpen(true)}
          onSettingsClick={() => setActiveMenu("Settings")}
          user={user}
          profile={profile}
          role={role}
          onLogout={signOut}
        />
        {renderAdminPage()}
      </main>
    </div>
  );
}

export default App;
