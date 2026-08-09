import React from "react";
import {
  Bell,
  Settings,
  Search,
  ChevronDown,
  Menu,
} from "lucide-react";

const Navbar = ({
  title = "Dashboard",
  subtitle = "Welcome back, Admin",
  onMenuClick,
}) => {
  return (
    <header className="top-header">

      {/* =========================
          LEFT SIDE
      ========================= */}

      <div className="header-left">

        {/* Mobile Menu */}
        <button
          className="mobile-menu-btn"
          onClick={onMenuClick}
        >
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
          placeholder="Search members, schemes, payments..."
        />

      </div>


      {/* =========================
          RIGHT SIDE
      ========================= */}

      <div className="header-right">

        {/* Notifications */}

        <button className="header-icon notification-btn">

          <Bell size={19} />

          <span className="notification-dot"></span>

        </button>


        {/* Settings */}

        <button className="header-icon">

          <Settings size={19} />

        </button>


        {/* Divider */}

        <div className="header-divider"></div>


        {/* Admin Profile */}

        <div className="header-user">

          <div className="header-user-avatar">
            R
          </div>

          <div className="header-user-info">

            <strong>
              Rahul Sharma
            </strong>

            <span>
              Super Admin
            </span>

          </div>

          <ChevronDown size={17} />

        </div>

      </div>

    </header>
  );
};

export default Navbar;