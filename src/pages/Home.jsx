import React from "react";

import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";

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


const Home = () => {

  const [sidebarOpen, setSidebarOpen] = React.useState(false);


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
    },
    {
      title: "ACTIVE CHITS",
      value: "18",
      change: "+2 new this month",
      positive: true,
      icon: <Layers3 size={23} />,
      type: "green",
    },
    {
      title: "PENDING KYC",
      value: "47",
      change: "9 added today",
      positive: false,
      icon: <UserCheck size={23} />,
      type: "yellow",
    },
    {
      title: "DEFAULTED PAYMENTS",
      value: "13",
      change: "-3 vs last month",
      positive: false,
      icon: <AlertCircle size={23} />,
      type: "red",
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
    },
    {
      title: "Schemes Running",
      value: "18",
      subtitle: "+2 this month",
      icon: <Layers3 size={19} />,
    },
    {
      title: "Monthly Collections",
      value: "₹38.2L",
      subtitle: "+8.1% vs last",
      icon: <IndianRupee size={19} />,
    },
    {
      title: "Auction Wins Today",
      value: "6",
      subtitle: "3 pending payout",
      icon: <Gavel size={19} />,
    },
  ];


  /* =========================
     RECENT ACTIVITY
  ========================= */

  const activities = [
    {
      name: "Priya Menon",
      initials: "PM",
      type: "Payment",
      scheme: "Gold Chit - 50K",
      amount: "₹5,000",
      status: "Approved",
      date: "Today, 9:42 AM",
    },
    {
      name: "Amit Verma",
      initials: "AV",
      type: "KYC",
      scheme: "—",
      amount: "—",
      status: "Pending",
      date: "Today, 8:15 AM",
    },
    {
      name: "Lakshmi Nair",
      initials: "LN",
      type: "Payment",
      scheme: "Silver Chit - 25K",
      amount: "₹2,500",
      status: "Approved",
      date: "Yesterday",
    },
    {
      name: "Rajesh Kumar",
      initials: "RK",
      type: "Payment",
      scheme: "Gold Chit - 1L",
      amount: "₹10,000",
      status: "Rejected",
      date: "Yesterday",
    },
    {
      name: "Sunita Rao",
      initials: "SR",
      type: "KYC",
      scheme: "—",
      amount: "—",
      status: "Approved",
      date: "2 days ago",
    },
    {
      name: "Vikram Singh",
      initials: "VS",
      type: "Payment",
      scheme: "Platinum Chit - 2L",
      amount: "₹20,000",
      status: "Pending",
      date: "2 days ago",
    },
  ];


  /* =========================
     LIVE AUCTIONS
  ========================= */

  const auctions = [
    {
      name: "Gold Chit - ₹1,00,000",
      members: "20 members · 18 enrolled",
      time: "00:47:22",
      bid: "₹12,400",
      bidder: "Priya M.",
      value: "₹87,600",
      participation: "90%",
      live: true,
    },
    {
      name: "Silver Chit - ₹50,000",
      members: "15 members · 15 enrolled",
      time: "02:12:05",
      bid: "₹6,800",
      bidder: "Amit V.",
      value: "₹43,200",
      participation: "100%",
      live: false,
    },
  ];


  return (

    <div className="LedgerOne-dashboard">

      {/* =========================
          SIDEBAR
      ========================= */}

      <Sidebar
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        activeMenu="Dashboard"
      />


      {/* =========================
          MAIN CONTENT
      ========================= */}

      <main className="main-content">


        {/* =========================
            NAVBAR
        ========================= */}

        <Navbar
          title="Dashboard"
          subtitle="Welcome back, Admin"
          onMenuClick={() => setSidebarOpen(true)}
        />


        {/* =========================
            DASHBOARD CONTENT
        ========================= */}

        <div className="dashboard-content">


          {/* =========================
              MAIN STAT CARDS
          ========================= */}

          <section className="main-stats-grid">

            {mainStats.map((stat, index) => (

              <div
                className="main-stat-card"
                key={index}
              >

                <div className="stat-card-top">

                  <div
                    className={`stat-icon ${stat.type}`}
                  >
                    {stat.icon}
                  </div>


                  <div
                    className={`stat-change ${
                      stat.type === "yellow" ||
                      stat.type === "red"
                        ? "negative"
                        : ""
                    }`}
                  >

                    {stat.type === "red" ||
                    stat.type === "yellow" ? (

                      <TrendingDown size={14} />

                    ) : (

                      <TrendingUp size={14} />

                    )}

                    <span>
                      {stat.change}
                    </span>

                  </div>

                </div>


                <div className="stat-card-content">

                  <p>
                    {stat.title}
                  </p>

                  <h2>
                    {stat.value}
                  </h2>

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
              >

                <div className="secondary-icon">
                  {stat.icon}
                </div>


                <div className="secondary-info">

                  <span>
                    {stat.title}
                  </span>

                  <strong>
                    {stat.value}
                  </strong>

                  <small>
                    {stat.subtitle}
                  </small>

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

                  <h2>
                    Recent Activity
                  </h2>

                  <p>
                    Latest payments and KYC events
                  </p>

                </div>


                <button className="view-all-btn">

                  View all

                  <ArrowUpRight size={17} />

                </button>

              </div>


              <div className="activity-table-wrapper">

                <table className="activity-table">

                  <thead>

                    <tr>

                      <th>
                        MEMBER
                      </th>

                      <th>
                        TYPE
                      </th>

                      <th>
                        SCHEME
                      </th>

                      <th>
                        AMOUNT
                      </th>

                      <th>
                        STATUS
                      </th>

                      <th>
                        DATE
                      </th>

                    </tr>

                  </thead>


                  <tbody>

                    {activities.map((activity, index) => (

                      <tr key={index}>


                        {/* MEMBER */}

                        <td>

                          <div className="member-cell">

                            <div className="member-avatar">
                              {activity.initials}
                            </div>

                            <strong>
                              {activity.name}
                            </strong>

                          </div>

                        </td>


                        {/* TYPE */}

                        <td>

                          <span className="activity-type">
                            {activity.type}
                          </span>

                        </td>


                        {/* SCHEME */}

                        <td>
                          {activity.scheme}
                        </td>


                        {/* AMOUNT */}

                        <td className="amount-cell">
                          {activity.amount}
                        </td>


                        {/* STATUS */}

                        <td>

                          <span
                            className={`status-badge ${activity.status.toLowerCase()}`}
                          >
                            {activity.status}
                          </span>

                        </td>


                        {/* DATE */}

                        <td className="date-cell">
                          {activity.date}
                        </td>


                      </tr>

                    ))}

                  </tbody>

                </table>

              </div>

            </div>


            {/* =========================
                LIVE AUCTIONS
            ========================= */}

            <div className="auction-card">


              <div className="section-header auction-header">

                <div>

                  <h2>
                    Live Auctions
                  </h2>

                  <p>
                    Real-time bidding activity
                  </p>

                </div>


                <div className="live-indicator">

                  <span></span>

                  2 Active

                </div>

              </div>


              <div className="auction-list">

                {auctions.map((auction, index) => (

                  <div
                    key={index}
                    className={`auction-item ${
                      auction.live
                        ? "auction-live"
                        : ""
                    }`}
                  >


                    {/* AUCTION TOP */}

                    <div className="auction-top">

                      <div>

                        <h3>
                          {auction.name}
                        </h3>

                        <p>
                          {auction.members}
                        </p>

                      </div>


                      {auction.live && (

                        <span className="live-badge">
                          LIVE
                        </span>

                      )}

                    </div>


                    {/* TIMER */}

                    <div className="auction-timer">

                      <Clock3 size={17} />

                      <span>
                        Ends in
                      </span>

                      <strong>
                        {auction.time}
                      </strong>

                    </div>


                    {/* AUCTION DETAILS */}

                    <div className="auction-details">


                      <div>

                        <span>
                          Highest Bid
                        </span>

                        <strong className="highest-bid">
                          {auction.bid}
                        </strong>

                        <small>
                          by {auction.bidder}
                        </small>

                      </div>


                      <div className="prize-value">

                        <span>
                          Prize Value
                        </span>

                        <strong>
                          {auction.value}
                        </strong>

                      </div>


                    </div>


                    {/* PARTICIPATION */}

                    <div className="participation">


                      <div className="participation-label">

                        <span>
                          Participation
                        </span>

                        <span>
                          {auction.participation}
                        </span>

                      </div>


                      <div className="progress-bar">

                        <div
                          className="progress-fill"
                          style={{
                            width:
                              auction.participation,
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

      </main>

    </div>

  );
};


export default Home;