import { useState, useEffect, useRef } from "react";
import {
  Search,
  X,
  Layers3,
  Users,
  CreditCard,
  Gavel,
  BarChart3,
  Settings as SettingsIcon,
  LayoutDashboard,
  ShieldCheck,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import {
  SEED_SCHEMES,
  SEED_MEMBERS,
  SEED_PAYMENTS,
  SEED_AUCTIONS,
} from "../lib/supabase";

const PAGES = [
  {
    id: "page-1",
    name: "Dashboard",
    category: "Navigation",
    description: "Financial performance overview, recent activity & stats",
    icon: <LayoutDashboard size={16} />,
    targetPage: "Dashboard",
  },
  {
    id: "page-2",
    name: "User Management",
    category: "Navigation",
    description: "Manage chit members, approve KYC verification and profiles",
    icon: <Users size={16} />,
    targetPage: "User Management",
  },
  {
    id: "page-3",
    name: "Chit Schemes",
    category: "Navigation",
    description: "Active chit funds, fund pools, monthly installments",
    icon: <Layers3 size={16} />,
    targetPage: "Chit Schemes",
  },
  {
    id: "page-4",
    name: "Live Auctions",
    category: "Navigation",
    description: "Real-time reverse auction hall, competitive bidding",
    icon: <Gavel size={16} />,
    targetPage: "Live Auctions",
  },
  {
    id: "page-5",
    name: "Payments & Collections",
    category: "Navigation",
    description: "Installment ledger, UPI receipts, payout verifications",
    icon: <CreditCard size={16} />,
    targetPage: "Payments",
  },
  {
    id: "page-6",
    name: "Financial Reports",
    category: "Navigation",
    description: "Foreman commission yield, audit balance statements",
    icon: <BarChart3 size={16} />,
    targetPage: "Reports",
  },
  {
    id: "page-7",
    name: "System Settings",
    category: "Navigation",
    description: "Chit fund regulations, statutory commission & Supabase",
    icon: <SettingsIcon size={16} />,
    targetPage: "Settings",
  },
  {
    id: "page-8",
    name: "KYC Verification",
    category: "Navigation",
    description: "Identity documents, Aadhaar, PAN compliance records",
    icon: <ShieldCheck size={16} />,
    targetPage: "KYC Verification",
  },
];

const SearchBar = ({ onNavigate, role = "admin" }) => {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);
  const containerRef = useRef(null);

  // Global Ctrl+K / Cmd+K shortcut
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      }
    };
    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, []);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const trimmed = query.trim().toLowerCase();

  // Search through all categories
  const matchedPages = PAGES.filter((p) => {
    if (role === "member" && ["User Management", "Reports", "Settings"].includes(p.name)) {
      return false;
    }
    if (!trimmed) return false;
    return (
      p.name.toLowerCase().includes(trimmed) ||
      p.description.toLowerCase().includes(trimmed)
    );
  });

  const matchedSchemes = (SEED_SCHEMES || []).filter((s) => {
    if (!trimmed) return false;
    return (
      s.name.toLowerCase().includes(trimmed) ||
      s.category.toLowerCase().includes(trimmed) ||
      s.description?.toLowerCase().includes(trimmed) ||
      s.status?.toLowerCase().includes(trimmed)
    );
  });

  const matchedMembers = (SEED_MEMBERS || []).filter((m) => {
    if (role === "member") return false; // Hide members list from regular member
    if (!trimmed) return false;
    return (
      m.full_name?.toLowerCase().includes(trimmed) ||
      m.email?.toLowerCase().includes(trimmed) ||
      m.phone?.toLowerCase().includes(trimmed) ||
      m.kyc_status?.toLowerCase().includes(trimmed)
    );
  });

  const matchedPayments = (SEED_PAYMENTS || []).filter((p) => {
    if (!trimmed) return false;
    return (
      p.reference_id?.toLowerCase().includes(trimmed) ||
      p.member_name?.toLowerCase().includes(trimmed) ||
      p.scheme_name?.toLowerCase().includes(trimmed) ||
      p.payment_type?.toLowerCase().includes(trimmed) ||
      p.formatted_amount?.toLowerCase().includes(trimmed)
    );
  });

  const matchedAuctions = (SEED_AUCTIONS || []).filter((a) => {
    if (!trimmed) return false;
    return (
      a.name?.toLowerCase().includes(trimmed) ||
      a.scheme_name?.toLowerCase().includes(trimmed) ||
      a.bidder?.toLowerCase().includes(trimmed) ||
      a.status?.toLowerCase().includes(trimmed)
    );
  });

  // Flat list for keyboard navigation
  const allResults = [
    ...matchedPages.map((p) => ({ ...p, itemType: "page" })),
    ...matchedSchemes.map((s) => ({
      id: s.id,
      name: s.name,
      description: `${s.category} · Monthly: ₹${s.monthly_installment?.toLocaleString()} · ${s.status}`,
      icon: <Layers3 size={16} />,
      targetPage: role === "member" ? "My Schemes" : "Chit Schemes",
      itemType: "scheme",
      badge: s.status,
    })),
    ...matchedMembers.map((m) => ({
      id: m.id,
      name: m.full_name,
      description: `${m.phone} · ${m.email} · KYC: ${m.kyc_status}`,
      icon: <Users size={16} />,
      targetPage: "User Management",
      itemType: "member",
      badge: `KYC: ${m.kyc_status}`,
    })),
    ...matchedPayments.map((pay) => ({
      id: pay.id,
      name: `${pay.formatted_amount} - ${pay.scheme_name}`,
      description: `${pay.member_name} · ${pay.reference_id} · ${pay.payment_method}`,
      icon: <CreditCard size={16} />,
      targetPage: role === "member" ? "My Payments" : "Payments",
      itemType: "payment",
      badge: pay.status,
    })),
    ...matchedAuctions.map((auc) => ({
      id: auc.id,
      name: auc.name,
      description: `Current Bid: ${auc.bid} by ${auc.bidder} · ${auc.live ? "Live Now" : "Upcoming"}`,
      icon: <Gavel size={16} />,
      targetPage: "Live Auctions",
      itemType: "auction",
      badge: auc.live ? "Live" : "Scheduled",
    })),
  ];

  const handleSelectResult = (item) => {
    if (onNavigate && item.targetPage) {
      onNavigate(item.targetPage);
    }
    setIsOpen(false);
    setQuery("");
  };

  const handleKeyDown = (e) => {
    if (!isOpen) {
      if (e.key === "ArrowDown" || e.key === "Enter") {
        setIsOpen(true);
      }
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) =>
        prev < allResults.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) =>
        prev > 0 ? prev - 1 : allResults.length - 1
      );
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (allResults[selectedIndex]) {
        handleSelectResult(allResults[selectedIndex]);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      setIsOpen(false);
      inputRef.current?.blur();
    }
  };

  const hasMatches = allResults.length > 0;

  return (
    <div className="search-box-wrapper" ref={containerRef}>
      <div className={`search-box ${isOpen ? "focused" : ""}`}>
        <Search size={19} className="search-icon" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
            setSelectedIndex(0);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search schemes, members, payments, auctions..."
          aria-label="Search across LedgerOne"
        />

        {query ? (
          <button
            type="button"
            className="search-clear-btn"
            onClick={() => {
              setQuery("");
              inputRef.current?.focus();
            }}
            aria-label="Clear search query"
          >
            <X size={15} />
          </button>
        ) : (
          <span className="search-shortcut-hint">
            <kbd>Ctrl</kbd> <kbd>K</kbd>
          </span>
        )}
      </div>

      {/* Live Search Results Dropdown */}
      {isOpen && (
        <div className="search-dropdown-menu">
          {!query.trim() ? (
            /* Quick Suggestions when empty */
            <div className="search-suggestions-box">
              <span className="search-group-title">
                <Sparkles size={13} /> POPULAR SHORTCUTS
              </span>
              <div className="search-chips-row">
                <button
                  type="button"
                  className="search-chip"
                  onClick={() => {
                    setQuery("Live Auctions");
                    setIsOpen(true);
                  }}
                >
                  <Gavel size={13} /> Live Auctions
                </button>
                <button
                  type="button"
                  className="search-chip"
                  onClick={() => {
                    setQuery("Gold Chit");
                    setIsOpen(true);
                  }}
                >
                  <Layers3 size={13} /> Gold Chit Schemes
                </button>
                <button
                  type="button"
                  className="search-chip"
                  onClick={() => {
                    setQuery("Priya");
                    setIsOpen(true);
                  }}
                >
                  <Users size={13} /> Priya Menon
                </button>
                <button
                  type="button"
                  className="search-chip"
                  onClick={() => {
                    setQuery("UPI");
                    setIsOpen(true);
                  }}
                >
                  <CreditCard size={13} /> UPI Collections
                </button>
              </div>

              <div className="search-pages-quick">
                <span className="search-group-title">NAVIGATION</span>
                {PAGES.slice(0, 4).map((page) => (
                  <div
                    key={page.id}
                    className="search-result-row"
                    onClick={() => handleSelectResult(page)}
                  >
                    <div className="result-icon-badge">{page.icon}</div>
                    <div className="result-text">
                      <strong>{page.name}</strong>
                      <span>{page.description}</span>
                    </div>
                    <ChevronRight size={14} className="result-arrow" />
                  </div>
                ))}
              </div>
            </div>
          ) : !hasMatches ? (
            /* No Results Found */
            <div className="search-no-results">
              <Search size={28} />
              <h4>No matches found for "{query}"</h4>
              <p>Try searching for scheme names, subscriber phone, receipt ID, or pages</p>
            </div>
          ) : (
            /* Grouped Results */
            <div className="search-results-list">
              {/* Pages */}
              {matchedPages.length > 0 && (
                <div className="search-category-group">
                  <span className="search-group-title">
                    PAGES & VIEWS ({matchedPages.length})
                  </span>
                  {matchedPages.map((page) => {
                    const idx = allResults.findIndex((r) => r.id === page.id);
                    return (
                      <div
                        key={page.id}
                        className={`search-result-row ${selectedIndex === idx ? "active" : ""}`}
                        onClick={() => handleSelectResult(page)}
                      >
                        <div className="result-icon-badge">{page.icon}</div>
                        <div className="result-text">
                          <strong>{page.name}</strong>
                          <span>{page.description}</span>
                        </div>
                        <span className="result-tag page-tag">View</span>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Chit Schemes */}
              {matchedSchemes.length > 0 && (
                <div className="search-category-group">
                  <span className="search-group-title">
                    CHIT SCHEMES ({matchedSchemes.length})
                  </span>
                  {matchedSchemes.map((scheme) => {
                    const idx = allResults.findIndex((r) => r.id === scheme.id);
                    return (
                      <div
                        key={scheme.id}
                        className={`search-result-row ${selectedIndex === idx ? "active" : ""}`}
                        onClick={() =>
                          handleSelectResult({
                            ...scheme,
                            targetPage: role === "member" ? "My Schemes" : "Chit Schemes",
                          })
                        }
                      >
                        <div className="result-icon-badge">
                          <Layers3 size={16} />
                        </div>
                        <div className="result-text">
                          <strong>{scheme.name}</strong>
                          <span>
                            {scheme.category} · Monthly: ₹
                            {scheme.monthly_installment?.toLocaleString()} · Total: ₹
                            {scheme.total_pool_value?.toLocaleString()}
                          </span>
                        </div>
                        <span className={`result-tag status-${scheme.status?.toLowerCase()}`}>
                          {scheme.status}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Members */}
              {matchedMembers.length > 0 && (
                <div className="search-category-group">
                  <span className="search-group-title">
                    SUBSCRIBERS & MEMBERS ({matchedMembers.length})
                  </span>
                  {matchedMembers.map((member) => {
                    const idx = allResults.findIndex((r) => r.id === member.id);
                    return (
                      <div
                        key={member.id}
                        className={`search-result-row ${selectedIndex === idx ? "active" : ""}`}
                        onClick={() =>
                          handleSelectResult({
                            ...member,
                            targetPage: "User Management",
                          })
                        }
                      >
                        <div className="result-icon-badge member-avatar-initials">
                          {member.avatar_initials || member.full_name?.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="result-text">
                          <strong>{member.full_name}</strong>
                          <span>
                            {member.phone} · {member.email} · {member.address}
                          </span>
                        </div>
                        <span
                          className={`result-tag kyc-${member.kyc_status?.toLowerCase()}`}
                        >
                          KYC {member.kyc_status}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Payments */}
              {matchedPayments.length > 0 && (
                <div className="search-category-group">
                  <span className="search-group-title">
                    PAYMENTS & RECEIPTS ({matchedPayments.length})
                  </span>
                  {matchedPayments.map((pay) => {
                    const idx = allResults.findIndex((r) => r.id === pay.id);
                    return (
                      <div
                        key={pay.id}
                        className={`search-result-row ${selectedIndex === idx ? "active" : ""}`}
                        onClick={() =>
                          handleSelectResult({
                            ...pay,
                            targetPage: role === "member" ? "My Payments" : "Payments",
                          })
                        }
                      >
                        <div className="result-icon-badge">
                          <CreditCard size={16} />
                        </div>
                        <div className="result-text">
                          <strong>
                            {pay.formatted_amount} — {pay.scheme_name}
                          </strong>
                          <span>
                            {pay.member_name} · {pay.reference_id} · {pay.date}
                          </span>
                        </div>
                        <span
                          className={`result-tag pay-${pay.status?.toLowerCase()}`}
                        >
                          {pay.status}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Auctions */}
              {matchedAuctions.length > 0 && (
                <div className="search-category-group">
                  <span className="search-group-title">
                    AUCTION ROOMS ({matchedAuctions.length})
                  </span>
                  {matchedAuctions.map((auc) => {
                    const idx = allResults.findIndex((r) => r.id === auc.id);
                    return (
                      <div
                        key={auc.id}
                        className={`search-result-row ${selectedIndex === idx ? "active" : ""}`}
                        onClick={() =>
                          handleSelectResult({
                            ...auc,
                            targetPage: "Live Auctions",
                          })
                        }
                      >
                        <div className="result-icon-badge">
                          <Gavel size={16} />
                        </div>
                        <div className="result-text">
                          <strong>{auc.name}</strong>
                          <span>
                            Current Bid: {auc.bid} ({auc.bidder}) · Pot: {auc.value}
                          </span>
                        </div>
                        <span
                          className={`result-tag ${auc.live ? "tag-live" : "tag-scheduled"}`}
                        >
                          {auc.live ? "LIVE" : "Upcoming"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Bottom keyboard helper */}
          <div className="search-dropdown-footer">
            <span className="footer-shortcut">
              <kbd>↑</kbd> <kbd>↓</kbd> navigate
            </span>
            <span className="footer-shortcut">
              <kbd>↵</kbd> select
            </span>
            <span className="footer-shortcut">
              <kbd>esc</kbd> close
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchBar;
