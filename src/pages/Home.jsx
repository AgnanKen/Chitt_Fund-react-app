import { useState, useEffect } from "react";
import {
  IndianRupee,
  Layers3,
  Users,
  Gavel,
  TrendingUp,
  TrendingDown,
  UserCheck,
  AlertCircle,
  ArrowUpRight,
  Clock3,
} from "lucide-react";
import {
  supabase,
  isSupabaseConfigured,
  SEED_ACTIVITIES,
  SEED_AUCTIONS,
} from "../lib/supabase";

const Home = ({ onNavigate }) => {
  const [activities, setActivities] = useState(SEED_ACTIVITIES);
  const [auctions, setAuctions] = useState(SEED_AUCTIONS);

  // Fetch live activities and auctions
  useEffect(() => {
    const fetchHomeData = async () => {
      if (isSupabaseConfigured()) {
        try {
          const { data: actData } = await supabase
            .from("activities")
            .select("*")
            .order("created_at", { ascending: false })
            .limit(8);

          if (actData && actData.length > 0) {
            setActivities(actData);
          }

          const { data: aucData } = await supabase
            .from("auctions")
            .select("*")
            .order("is_live", { ascending: false })
            .limit(2);

          if (aucData && aucData.length > 0) {
            setAuctions(aucData);
          }
        } catch (err) {
          console.warn("Supabase fetch failed on Dashboard, using seed data:", err.message);
        }
      }
    };

    fetchHomeData();

    // Supabase Real-time Listeners for Dashboard
    if (isSupabaseConfigured()) {
      const activitiesChannel = supabase
        .channel("realtime:dashboard_activities")
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "activities" },
          (payload) => {
            setActivities((prev) => [payload.new, ...prev.slice(0, 7)]);
          }
        )
        .subscribe();

      const auctionsChannel = supabase
        .channel("realtime:dashboard_auctions")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "auctions" },
          (payload) => {
            if (payload.eventType === "UPDATE") {
              setAuctions((prev) =>
                prev.map((a) => (a.id === payload.new.id ? payload.new : a))
              );
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(activitiesChannel);
        supabase.removeChannel(auctionsChannel);
      };
    }
  }, []);

  /* =========================
     TOP METRICS
  ========================= */
  const mainStats = [
    {
      title: "TOTAL FUND VALUE",
      value: "₹4.82 Cr",
      change: "+12.4% this month",
      positive: true,
      icon: <IndianRupee size={23} />,
      type: "blue",
      targetPage: "Chit Schemes",
    },
    {
      title: "ACTIVE CHITS",
      value: "18",
      change: "+2 new this month",
      positive: true,
      icon: <Layers3 size={23} />,
      type: "green",
      targetPage: "Chit Schemes",
    },
    {
      title: "PENDING KYC",
      value: "47",
      change: "9 added today",
      positive: false,
      icon: <UserCheck size={23} />,
      type: "yellow",
      targetPage: "User Management",
    },
    {
      title: "DEFAULTED PAYMENTS",
      value: "13",
      change: "-3 vs last month",
      positive: false,
      icon: <AlertCircle size={23} />,
      type: "red",
      targetPage: "Payments",
    },
  ];

  /* =========================
     SECONDARY STATS
  ========================= */
  const secondaryStats = [
    {
      title: "Total Members",
      value: "2,841",
      subtitle: "+34 this week",
      icon: <Users size={19} />,
      targetPage: "User Management",
    },
    {
      title: "Schemes Running",
      value: "18",
      subtitle: "+2 this month",
      icon: <Layers3 size={19} />,
      targetPage: "Chit Schemes",
    },
    {
      title: "Monthly Collections",
      value: "₹38.2L",
      subtitle: "+8.1% vs last",
      icon: <IndianRupee size={19} />,
      targetPage: "Payments",
    },
    {
      title: "Auction Wins Today",
      value: "6",
      subtitle: "3 pending payout",
      icon: <Gavel size={19} />,
      targetPage: "Live Auctions",
    },
  ];

  return (
    <div className="dashboard-content">
      {/* =========================
          MAIN STAT CARDS
      ========================= */}
      <section className="main-stats-grid">
        {mainStats.map((stat, index) => (
          <div
            className="main-stat-card"
            key={index}
            style={{ cursor: onNavigate ? "pointer" : "default" }}
            onClick={() => onNavigate && onNavigate(stat.targetPage)}
          >
            <div className="stat-card-top">
              <div className={`stat-icon ${stat.type}`}>{stat.icon}</div>

              <div
                className={`stat-change ${
                  stat.type === "yellow" || stat.type === "red" ? "negative" : ""
                }`}
              >
                {stat.type === "red" || stat.type === "yellow" ? (
                  <TrendingDown size={14} />
                ) : (
                  <TrendingUp size={14} />
                )}
                <span>{stat.change}</span>
              </div>
            </div>

            <div className="stat-card-content">
              <p>{stat.title}</p>
              <h2>{stat.value}</h2>
            </div>
          </div>
        ))}
      </section>

      {/* =========================
          SECONDARY STATS
      ========================= */}
      <section className="secondary-stats-grid">
        {secondaryStats.map((stat, index) => (
          <div
            className="secondary-stat-card"
            key={index}
            style={{ cursor: onNavigate ? "pointer" : "default" }}
            onClick={() => onNavigate && onNavigate(stat.targetPage)}
          >
            <div className="secondary-icon">{stat.icon}</div>

            <div className="secondary-info">
              <span>{stat.title}</span>
              <strong>{stat.value}</strong>
              <small>{stat.subtitle}</small>
            </div>
          </div>
        ))}
      </section>

      {/* =========================
          LOWER DASHBOARD
      ========================= */}
      <section className="dashboard-lower">
        {/* =========================
            RECENT ACTIVITY
        ========================= */}
        <div className="activity-card">
          <div className="section-header">
            <div>
              <h2>Recent Activity</h2>
              <p>Latest payments, member actions, and KYC events</p>
            </div>

            <button
              className="view-all-btn"
              onClick={() => onNavigate && onNavigate("Payments")}
            >
              View all
              <ArrowUpRight size={17} />
            </button>
          </div>

          <div className="activity-table-wrapper">
            <table className="activity-table">
              <thead>
                <tr>
                  <th>MEMBER</th>
                  <th>TYPE</th>
                  <th>SCHEME</th>
                  <th>AMOUNT</th>
                  <th>STATUS</th>
                  <th>DATE</th>
                </tr>
              </thead>

              <tbody>
                {activities.map((activity, index) => (
                  <tr key={activity.id || index}>
                    {/* MEMBER */}
                    <td>
                      <div className="member-cell">
                        <div className="member-avatar">
                          {activity.initials ||
                            (activity.name ? activity.name.slice(0, 2).toUpperCase() : "PM")}
                        </div>
                        <strong>{activity.name}</strong>
                      </div>
                    </td>

                    {/* TYPE */}
                    <td>
                      <span className="activity-type">{activity.type}</span>
                    </td>

                    {/* SCHEME */}
                    <td>{activity.scheme || "—"}</td>

                    {/* AMOUNT */}
                    <td className="amount-cell">
                      {activity.amount || "—"}
                    </td>

                    {/* STATUS */}
                    <td>
                      <span
                        className={`status-badge ${(
                          activity.status || "pending"
                        ).toLowerCase()}`}
                      >
                        {activity.status}
                      </span>
                    </td>

                    {/* DATE */}
                    <td className="date-cell">
                      {activity.date ||
                        (activity.created_at
                          ? new Date(activity.created_at).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "Today")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* =========================
            LIVE AUCTIONS PREVIEW
        ========================= */}
        <div className="auction-card">
          <div className="section-header auction-header">
            <div>
              <h2>Live Auctions</h2>
              <p>Real-time bidding activity</p>
            </div>

            <div
              className="live-indicator"
              style={{ cursor: "pointer" }}
              onClick={() => onNavigate && onNavigate("Live Auctions")}
            >
              <span></span>
              2 Active
            </div>
          </div>

          <div className="auction-list">
            {auctions.map((auction, index) => (
              <div
                key={auction.id || index}
                className={`auction-item ${
                  auction.live || auction.is_live ? "auction-live" : ""
                }`}
                style={{ cursor: onNavigate ? "pointer" : "default" }}
                onClick={() => onNavigate && onNavigate("Live Auctions")}
              >
                {/* AUCTION TOP */}
                <div className="auction-top">
                  <div>
                    <h3>{auction.name || auction.scheme_name}</h3>
                    <p>{auction.members || auction.members_info || "20 members · 18 enrolled"}</p>
                  </div>

                  {(auction.live || auction.is_live) && (
                    <span className="live-badge">LIVE</span>
                  )}
                </div>

                {/* TIMER */}
                <div className="auction-timer">
                  <Clock3 size={17} />
                  <span>Ends in</span>
                  <strong>{auction.time || "00:47:22"}</strong>
                </div>

                {/* AUCTION DETAILS */}
                <div className="auction-details">
                  <div>
                    <span>Highest Bid</span>
                    <strong className="highest-bid">
                      {auction.bid || `₹${Number(auction.highest_bid || 12400).toLocaleString("en-IN")}`}
                    </strong>
                    <small>by {auction.bidder || auction.highest_bidder_name || "Priya M."}</small>
                  </div>

                  <div className="prize-value">
                    <span>Prize Value</span>
                    <strong>
                      {auction.value ||
                        `₹${(
                          Number(auction.base_pot_value || 100000) -
                          Number(auction.highest_bid || 12400)
                        ).toLocaleString("en-IN")}`}
                    </strong>
                  </div>
                </div>

                {/* PARTICIPATION */}
                <div className="participation">
                  <div className="participation-label">
                    <span>Participation</span>
                    <span>{auction.participation || `${auction.participation_pct || 90}%`}</span>
                  </div>

                  <div className="progress-bar">
                    <div
                      className="progress-fill"
                      style={{
                        width:
                          auction.participation ||
                          `${auction.participation_pct || 90}%`,
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;