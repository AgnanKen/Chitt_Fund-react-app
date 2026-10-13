import { useState, useEffect } from "react";
import {
  Gavel,
  Clock3,
  IndianRupee,
  Users,
  Sparkles,
  CheckCircle,
} from "lucide-react";
import {
  supabase,
  isSupabaseConfigured,
  SEED_AUCTIONS,
} from "../lib/supabase";
import { useAuth } from "../context/useAuth";

const LiveAuctions = ({ onNavigate }) => {
  const [auctions, setAuctions] = useState(SEED_AUCTIONS);
  const [selectedAuctionId, setSelectedAuctionId] = useState(
    SEED_AUCTIONS[0].id
  );
  const [bidHistory, setBidHistory] = useState([
    {
      id: "b-1",
      bidder_name: "Priya M.",
      bid_amount: 12400,
      time: "3 mins ago",
    },
    {
      id: "b-2",
      bidder_name: "Lakshmi Nair",
      bid_amount: 11000,
      time: "15 mins ago",
    },
    {
      id: "b-3",
      bidder_name: "Vikram Singh",
      bid_amount: 9000,
      time: "30 mins ago",
    },
    {
      id: "b-4",
      bidder_name: "Ramesh K.",
      bid_amount: 7500,
      time: "45 mins ago",
    },
  ]);
  const { profile, user, role } = useAuth();
  const currentUserName =
    profile?.full_name ||
    (user?.email ? user.email.split("@")[0] : "Participant");
  const bidderName = `${currentUserName} (You)`;
  const [bidAmountInput, setBidAmountInput] = useState("");
  const [bidding, setBidding] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState(null);

  // Timer countdown simulation
  const [timeLeft, setTimeLeft] = useState(2842); // seconds

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTimer = (totalSec) => {
    const hrs = Math.floor(totalSec / 3600)
      .toString()
      .padStart(2, "0");
    const mins = Math.floor((totalSec % 3600) / 60)
      .toString()
      .padStart(2, "0");
    const secs = (totalSec % 60).toString().padStart(2, "0");
    return `${hrs}:${mins}:${secs}`;
  };

  // Real-time listener for bids and auction updates
  useEffect(() => {
    const fetchAuctions = async () => {
      if (isSupabaseConfigured()) {
        try {
          const { data, error } = await supabase
            .from("auctions")
            .select("*")
            .order("is_live", { ascending: false });

          if (error) throw error;
          if (data && data.length > 0) {
            setAuctions(data);
            setSelectedAuctionId(data[0].id);
          }
        } catch (err) {
          console.warn("Supabase fetch failed for auctions:", err.message);
        }
      }
    };

    fetchAuctions();

    if (isSupabaseConfigured()) {
      // Listen to bids table
      const bidsChannel = supabase
        .channel("realtime:bids")
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "bids" },
          (payload) => {
            const newBid = payload.new;
            setBidHistory((prev) => [
              {
                id: newBid.id,
                bidder_name: newBid.bidder_name,
                bid_amount: Number(newBid.bid_amount),
                time: "Just now",
              },
              ...prev,
            ]);

            // Update auctions in UI
            setAuctions((prev) =>
              prev.map((a) =>
                a.id === newBid.auction_id
                  ? {
                      ...a,
                      highest_bid: newBid.bid_amount,
                      highest_bidder_name: newBid.bidder_name,
                      bid: `₹${Number(newBid.bid_amount).toLocaleString("en-IN")}`,
                      bidder: newBid.bidder_name,
                    }
                  : a
              )
            );
          }
        )
        .subscribe();

      // Listen to auctions table
      const auctionsChannel = supabase
        .channel("realtime:auctions")
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "auctions" },
          (payload) => {
            setAuctions((prev) =>
              prev.map((a) => (a.id === payload.new.id ? payload.new : a))
            );
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(bidsChannel);
        supabase.removeChannel(auctionsChannel);
      };
    }
  }, []);

  const activeAuction =
    auctions.find((a) => a.id === selectedAuctionId) || auctions[0];

  const currentHighestBid = Number(
    activeAuction.highest_bid ||
      activeAuction.bid_amount ||
      (activeAuction.bid ? activeAuction.bid.replace(/[^0-9]/g, "") : 12400)
  );

  const basePot = Number(activeAuction.base_pot_value || 100000);
  const currentPrizeValue = basePot - currentHighestBid;
  const dividendPerMember = Math.round(currentHighestBid / 20);

  // Place Bid Handler
  const handlePlaceBid = async (amountToBid) => {
    const kycStatus = profile?.members?.kyc_status || "Pending";
    if (role === "member" && kycStatus !== "Approved") {
      alert(
        "KYC Verification Required:\nUnder statutory rules (The Chit Funds Act, 1982), only KYC-approved members are authorized to participate in live auction bidding.\n\nPlease submit or verify your documents under the 'KYC Verification' menu."
      );
      onNavigate?.("KYC Verification");
      return;
    }

    const numAmount = Number(amountToBid);
    if (!numAmount || numAmount <= currentHighestBid) {
      alert(
        `Bid must be higher than current highest bid of ₹${currentHighestBid.toLocaleString(
          "en-IN"
        )}`
      );
      return;
    }

    setBidding(true);

    if (isSupabaseConfigured()) {
      try {
        const { error } = await supabase.from("bids").insert([
          {
            auction_id: activeAuction.id,
            bidder_name: bidderName,
            bid_amount: numAmount,
          },
        ]);

        if (error) throw error;
      } catch (err) {
        console.error("Failed to insert bid:", err.message);
        alert("Failed to place bid on Supabase: " + err.message);
      }
    } else {
      // Local fallback
      setBidHistory((prev) => [
        {
          id: "bid-" + Date.now(),
          bidder_name: bidderName,
          bid_amount: numAmount,
          time: "Just now",
        },
        ...prev,
      ]);

      setAuctions((prev) =>
        prev.map((a) =>
          a.id === activeAuction.id
            ? {
                ...a,
                highest_bid: numAmount,
                highest_bidder_name: bidderName,
                bid: `₹${numAmount.toLocaleString("en-IN")}`,
                bidder: bidderName,
              }
            : a
        )
      );
    }

    setBidAmountInput("");
    setBidding(false);
    setFeedbackMsg(
      `Bid of ₹${numAmount.toLocaleString("en-IN")} placed successfully!`
    );
    setTimeout(() => setFeedbackMsg(null), 3500);
  };

  return (
    <div className="dashboard-content">
      {/* Toast Feedback */}
      {feedbackMsg && (
        <div
          style={{
            position: "fixed",
            bottom: "24px",
            right: "24px",
            background: "#0f192d",
            color: "#ffffff",
            padding: "12px 20px",
            borderRadius: "10px",
            boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            zIndex: 3000,
            fontSize: "13px",
            fontWeight: "500",
          }}
        >
          <CheckCircle size={18} color="#10b486" />
          {feedbackMsg}
        </div>
      )}

      {/* TOP METRICS */}
      <section className="main-stats-grid" style={{ marginBottom: "26px" }}>
        <div className="main-stat-card">
          <div className="stat-card-top">
            <div className="stat-icon blue">
              <Gavel size={22} />
            </div>
            <span className="stat-change">Live Auction Hall</span>
          </div>
          <div className="stat-card-content">
            <p>ACTIVE AUCTIONS</p>
            <h2>{auctions.filter((a) => a.is_live || a.live).length} Live</h2>
          </div>
        </div>

        <div className="main-stat-card">
          <div className="stat-card-top">
            <div className="stat-icon green">
              <IndianRupee size={22} />
            </div>
            <span className="stat-change">+8.4% today</span>
          </div>
          <div className="stat-card-content">
            <p>HIGHEST DISCOUNT BID</p>
            <h2>₹{currentHighestBid.toLocaleString("en-IN")}</h2>
          </div>
        </div>

        <div className="main-stat-card">
          <div className="stat-card-top">
            <div className="stat-icon yellow">
              <Sparkles size={22} />
            </div>
            <span className="stat-change">Member Benefit</span>
          </div>
          <div className="stat-card-content">
            <p>EST. DIVIDEND PER MEMBER</p>
            <h2>₹{dividendPerMember.toLocaleString("en-IN")}</h2>
          </div>
        </div>

        <div className="main-stat-card">
          <div className="stat-card-top">
            <div className="stat-icon blue">
              <Users size={22} />
            </div>
            <span className="stat-change">18 Enrolled</span>
          </div>
          <div className="stat-card-content">
            <p>BIDDER PARTICIPATION</p>
            <h2>90% Active</h2>
          </div>
        </div>
      </section>

      {/* AUCTION HALL MAIN GRID */}
      <div className="auction-layout-grid">
        {/* LEFT: INTERACTIVE BIDDING CONSOLE */}
        <div className="bidding-console-card">
          <div className="bidding-console-header">
            <div>
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: "700",
                  letterSpacing: "0.5px",
                  textTransform: "uppercase",
                  color: "#2850c7",
                }}
              >
                LIVE AUCTION STAGE
              </span>
              <h2 style={{ fontSize: "20px", fontWeight: "700", marginTop: "4px" }}>
                {activeAuction.name || activeAuction.scheme_name}
              </h2>
              <p style={{ fontSize: "12px", color: "#667085", marginTop: "2px" }}>
                Base Pot Value: ₹{basePot.toLocaleString("en-IN")} · 20 Members
              </p>
            </div>

            <div className="live-pulse-badge">
              <div className="live-pulse-dot"></div>
              <span>LIVE BIDDING</span>
            </div>
          </div>

          {/* TIMER BANNER */}
          <div
            style={{
              background: "#0f192d",
              color: "#ffffff",
              padding: "16px 20px",
              borderRadius: "12px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginTop: "20px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <Clock3 size={20} color="#f2a20a" />
              <div>
                <div style={{ fontSize: "11px", color: "#8a96ab" }}>
                  AUCTION CLOSING COUNTDOWN
                </div>
                <div
                  style={{
                    fontSize: "22px",
                    fontWeight: "800",
                    letterSpacing: "1px",
                    fontFamily: "monospace",
                  }}
                >
                  {formatTimer(timeLeft)}
                </div>
              </div>
            </div>

            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: "11px", color: "#8a96ab" }}>WINNER PRIZE PAYOUT</div>
              <div style={{ fontSize: "18px", fontWeight: "700", color: "#10b486" }}>
                ₹{currentPrizeValue.toLocaleString("en-IN")}
              </div>
            </div>
          </div>

          {/* CURRENT HIGHEST BID DISPLAY */}
          <div className="current-bid-highlight">
            <div>
              <span style={{ fontSize: "11px", color: "#65748a", fontWeight: "600" }}>
                CURRENT HIGHEST DISCOUNT BID
              </span>
              <div
                style={{
                  fontSize: "30px",
                  fontWeight: "800",
                  color: "#16ae85",
                  marginTop: "3px",
                }}
              >
                ₹{currentHighestBid.toLocaleString("en-IN")}
              </div>
            </div>

            <div style={{ textAlign: "right" }}>
              <span style={{ fontSize: "11px", color: "#65748a", fontWeight: "600" }}>
                LEADING BIDDER
              </span>
              <div style={{ fontSize: "16px", fontWeight: "700", color: "#1a2436", marginTop: "3px" }}>
                {activeAuction.bidder || activeAuction.highest_bidder_name || "Priya M."}
              </div>
            </div>
          </div>

          {/* QUICK BID INCREMENTS */}
          <div>
            <span style={{ fontSize: "12px", fontWeight: "600", color: "#475467" }}>
              Quick Increment Bids:
            </span>
            <div className="quick-bids">
              <button
                className="quick-bid-btn"
                onClick={() => handlePlaceBid(currentHighestBid + 500)}
                disabled={bidding}
              >
                + ₹500 (₹{(currentHighestBid + 500).toLocaleString("en-IN")})
              </button>
              <button
                className="quick-bid-btn"
                onClick={() => handlePlaceBid(currentHighestBid + 1000)}
                disabled={bidding}
              >
                + ₹1,000 (₹{(currentHighestBid + 1000).toLocaleString("en-IN")})
              </button>
              <button
                className="quick-bid-btn"
                onClick={() => handlePlaceBid(currentHighestBid + 2500)}
                disabled={bidding}
              >
                + ₹2,500 (₹{(currentHighestBid + 2500).toLocaleString("en-IN")})
              </button>
            </div>
          </div>

          {/* CUSTOM BID INPUT */}
          <div style={{ marginTop: "18px" }}>
            <label style={{ fontSize: "12px", fontWeight: "600", color: "#475467" }}>
              Enter Custom Bid Amount (₹):
            </label>
            <div className="bid-input-group">
              <input
                type="number"
                placeholder={`Must be > ₹${currentHighestBid}`}
                value={bidAmountInput}
                onChange={(e) => setBidAmountInput(e.target.value)}
              />
              <button
                className="btn-primary"
                style={{ height: "42px", padding: "0 22px" }}
                disabled={bidding || !bidAmountInput}
                onClick={() => handlePlaceBid(bidAmountInput)}
              >
                {bidding ? "Broadcasting..." : "Place Bid"}
              </button>
            </div>
            <p style={{ fontSize: "11px", color: "#8a94a4", marginTop: "6px" }}>
              * Bids are synchronized in real-time across all connected members via Supabase Realtime.
            </p>
          </div>
        </div>

        {/* RIGHT: REAL-TIME BID HISTORY STREAM */}
        <div className="activity-card" style={{ height: "fit-content" }}>
          <div className="section-header">
            <div>
              <h2>Live Bid Stream</h2>
              <p>Real-time updates via Supabase</p>
            </div>
            <div className="live-indicator">
              <span></span>
              Connected
            </div>
          </div>

          <div style={{ padding: "20px" }}>
            <div className="bid-history-feed">
              {bidHistory.map((bid, index) => (
                <div className="bid-feed-item" key={bid.id || index}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <div
                      style={{
                        width: "32px",
                        height: "32px",
                        borderRadius: "50%",
                        background: index === 0 ? "#e7f8f1" : "#edf2fb",
                        color: index === 0 ? "#10b486" : "#2850c7",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: "700",
                        fontSize: "11px",
                      }}
                    >
                      {bid.bidder_name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <strong style={{ color: "#1e293b", fontSize: "13px" }}>
                        {bid.bidder_name}
                      </strong>
                      <div style={{ fontSize: "10px", color: "#8a94a4" }}>
                        {bid.time || "Just now"}
                      </div>
                    </div>
                  </div>

                  <div style={{ textAlign: "right" }}>
                    <strong
                      style={{
                        fontSize: "14px",
                        color: index === 0 ? "#10b486" : "#284bc0",
                      }}
                    >
                      ₹{Number(bid.bid_amount).toLocaleString("en-IN")}
                    </strong>
                    {index === 0 && (
                      <div style={{ fontSize: "10px", color: "#10b486", fontWeight: "700" }}>
                        Highest Bid
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiveAuctions;
