import { useState, useEffect, useRef } from "react";
import {
  Bell,
  CheckCheck,
  Trash2,
  Gavel,
  CreditCard,
  ShieldCheck,
  TrendingUp,
  AlertTriangle,
  ChevronRight,
  X,
} from "lucide-react";

const INITIAL_NOTIFICATIONS = [
  {
    id: "notif-1",
    type: "auction",
    title: "Live Auction Starting Now",
    message: "Gold Chit - ₹1,00,000 round #8 is open for bidding with 18 enrolled members.",
    timestamp: "5 mins ago",
    read: false,
    targetPage: "Live Auctions",
    badgeColor: "#2850c7",
  },
  {
    id: "notif-2",
    type: "payment",
    title: "New Installment Received",
    message: "₹5,000 received from Priya Menon via UPI (Ref: UPI/2026/894710).",
    timestamp: "28 mins ago",
    read: false,
    targetPage: "Payments",
    badgeColor: "#10b486",
  },
  {
    id: "notif-3",
    type: "kyc",
    title: "KYC Documents Submitted",
    message: "Amit Verma has submitted identity proofs for verification approval.",
    timestamp: "1 hour ago",
    read: false,
    targetPage: "User Management",
    badgeColor: "#f2a20a",
  },
  {
    id: "notif-4",
    type: "dividend",
    title: "Dividend Distributed",
    message: "₹3,400 monthly chit dividend successfully calculated for Silver Tier subscribers.",
    timestamp: "3 hours ago",
    read: true,
    targetPage: "Reports",
    badgeColor: "#8b5cf6",
  },
  {
    id: "notif-5",
    type: "reminder",
    title: "Upcoming Collection Batch",
    message: "12 installment receipts scheduled for automated bank settlement tomorrow.",
    timestamp: "5 hours ago",
    read: true,
    targetPage: "Payments",
    badgeColor: "#0ea5e9",
  },
];

const NotificationCenter = ({ isOpen, onClose, onNavigate }) => {
  const [notifications, setNotifications] = useState(() => {
    try {
      const saved = localStorage.getItem("ledgerone_notifications");
      return saved ? JSON.parse(saved) : INITIAL_NOTIFICATIONS;
    } catch {
      return INITIAL_NOTIFICATIONS;
    }
  });
  const [filter, setFilter] = useState("all");
  const panelRef = useRef(null);

  // Sync to local storage
  useEffect(() => {
    try {
      localStorage.setItem("ledgerone_notifications", JSON.stringify(notifications));
    } catch {
      // ignore
    }
  }, [notifications]);

  // Close on Escape or click outside
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };

    const handleClickOutside = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        // Check if the click was on the trigger button
        if (!e.target.closest(".notification-btn")) {
          onClose();
        }
      }
    };

    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onClose]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleMarkAllRead = () => {
    setNotifications((prev) => prev.map((item) => ({ ...item, read: true })));
  };

  const handleClearAll = () => {
    setNotifications([]);
  };

  const handleDismissItem = (e, id) => {
    e.stopPropagation();
    setNotifications((prev) => prev.filter((item) => item.id !== id));
  };

  const handleItemClick = (item) => {
    // Mark as read
    setNotifications((prev) =>
      prev.map((n) => (n.id === item.id ? { ...n, read: true } : n))
    );
    if (onNavigate && item.targetPage) {
      onNavigate(item.targetPage);
    }
    onClose();
  };

  const filteredList = notifications.filter((item) => {
    if (filter === "unread") return !item.read;
    if (filter === "auctions") return item.type === "auction";
    if (filter === "payments") return item.type === "payment";
    return true;
  });

  const getIcon = (type) => {
    switch (type) {
      case "auction":
        return <Gavel size={16} />;
      case "payment":
        return <CreditCard size={16} />;
      case "kyc":
        return <ShieldCheck size={16} />;
      case "dividend":
        return <TrendingUp size={16} />;
      default:
        return <AlertTriangle size={16} />;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="notifications-popover" ref={panelRef}>
      {/* Popover Header */}
      <div className="notif-header">
        <div className="notif-header-title">
          <div className="notif-bell-icon">
            <Bell size={17} />
          </div>
          <h3>Notifications</h3>
          {unreadCount > 0 && (
            <span className="notif-unread-badge">{unreadCount} new</span>
          )}
        </div>

        <div className="notif-header-actions">
          {unreadCount > 0 && (
            <button
              type="button"
              className="notif-action-btn"
              onClick={handleMarkAllRead}
              title="Mark all as read"
            >
              <CheckCheck size={15} />
              <span>Read all</span>
            </button>
          )}
          <button
            type="button"
            className="notif-close-btn"
            onClick={onClose}
            aria-label="Close notifications"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="notif-filter-bar">
        <button
          type="button"
          className={`notif-filter-chip ${filter === "all" ? "active" : ""}`}
          onClick={() => setFilter("all")}
        >
          All ({notifications.length})
        </button>
        <button
          type="button"
          className={`notif-filter-chip ${filter === "unread" ? "active" : ""}`}
          onClick={() => setFilter("unread")}
        >
          Unread ({unreadCount})
        </button>
        <button
          type="button"
          className={`notif-filter-chip ${filter === "auctions" ? "active" : ""}`}
          onClick={() => setFilter("auctions")}
        >
          Auctions
        </button>
        <button
          type="button"
          className={`notif-filter-chip ${filter === "payments" ? "active" : ""}`}
          onClick={() => setFilter("payments")}
        >
          Payments
        </button>
      </div>

      {/* Notifications List */}
      <div className="notif-list">
        {filteredList.length === 0 ? (
          <div className="notif-empty-state">
            <div className="empty-bell-icon">
              <CheckCheck size={28} />
            </div>
            <h4>All caught up!</h4>
            <p>
              {filter === "unread"
                ? "You have zero unread notifications"
                : "No notifications found in this category"}
            </p>
          </div>
        ) : (
          filteredList.map((item) => (
            <div
              key={item.id}
              className={`notif-item ${item.read ? "read" : "unread"}`}
              onClick={() => handleItemClick(item)}
            >
              <div
                className="notif-item-icon"
                style={{
                  backgroundColor: `${item.badgeColor}18`,
                  color: item.badgeColor,
                }}
              >
                {getIcon(item.type)}
              </div>

              <div className="notif-item-content">
                <div className="notif-item-header">
                  <strong>{item.title}</strong>
                  <span className="notif-time">{item.timestamp}</span>
                </div>
                <p>{item.message}</p>
                {item.targetPage && (
                  <span className="notif-nav-hint">
                    Go to {item.targetPage} <ChevronRight size={12} />
                  </span>
                )}
              </div>

              <div className="notif-item-actions">
                {!item.read && <span className="notif-unread-dot" />}
                <button
                  type="button"
                  className="notif-item-dismiss"
                  onClick={(e) => handleDismissItem(e, item.id)}
                  title="Dismiss notification"
                >
                  <X size={13} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      {notifications.length > 0 && (
        <div className="notif-footer">
          <button
            type="button"
            className="notif-clear-btn"
            onClick={handleClearAll}
          >
            <Trash2 size={13} />
            <span>Clear all</span>
          </button>
          <span className="notif-live-badge">
            <span className="pulse-dot" /> Live sync active
          </span>
        </div>
      )}
    </div>
  );
};

export default NotificationCenter;
