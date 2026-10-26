import { useState, useEffect } from "react";
import {
  Gavel,
  Clock3,
  IndianRupee,
  Users,
  Sparkles,
  CheckCircle,
  AlertTriangle,
  ChevronRight,
  ShieldCheck,
  Trophy,
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
  const bidderName = `${currentUserName}`;
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
            if (!selectedAuctionId || !data.some((a) => a.id === selectedAuctionId)) {
              setSelectedAuctionId(data[0].id);
            }
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
        .channel("realtime:member_bids")
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "bids" },
          (payload) => {
            const newBid = payload.new;
            if (newBid.auction_id === selectedAuctionId) {
              setBidHistory((prev) => [
                {
                  id: newBid.id,
                  bidder_name: newBid.bidder_name,
                  bid_amount: Number(newBid.bid_amount),
                  time: "Just now",
                },
                ...prev,
              ]);
            }

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
        .channel("realtime:member_auctions")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "auctions" },
          (payload) => {
            if (payload.eventType === "INSERT") {
              setAuctions((prev) => [payload.new, ...prev]);
            } else if (payload.eventType === "UPDATE") {
              setAuctions((prev) =>
                prev.map((a) => (a.id === payload.new.id ? payload.new : a))
              );
            } else if (payload.eventType === "DELETE") {
              setAuctions((prev) => prev.filter((a) => a.id !== payload.old.id));
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(bidsChannel);
        supabase.removeChannel(auctionsChannel);
      };
    }
  }, [selectedAuctionId]);

  // Fetch bids history when selected auction changes
  useEffect(() => {
    const fetchAuctionBids = async () => {
      if (isSupabaseConfigured() && selectedAuctionId) {
        try {
          const { data } = await supabase
            .from("bids")
            .select("*")
            .eq("auction_id", selectedAuctionId)
            .order("created_at", { ascending: false });

          if (data && data.length > 0) {
            setBidHistory(
              data.map((b) => ({
                id: b.id,
                bidder_name: b.bidder_name,
                bid_amount: Number(b.bid_amount),
                time: new Date(b.created_at).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                }),
              }))
            );
          }
        } catch (err) {
          console.warn("Could not fetch bids for auction:", err);
        }
      }
    };

    fetchAuctionBids();
  }, [selectedAuctionId]);

  const activeAuction =
    auctions.find((a) => a.id === selectedAuctionId) || auctions[0] || {};

  const isLive = activeAuction.is_live || activeAuction.status === "live";
  const isCompleted = activeAuction.status === "completed";
  const isScheduled = activeAuction.status === "scheduled" && !isLive;

  const currentHighestBid = Number(
    activeAuction.highest_bid ||
      activeAuction.bid_amount ||
      (activeAuction.bid ? activeAuction.bid.replace(/[^0-9]/g, "") : 12400)
  );

  const basePot = Number(activeAuction.base_pot_value || 100000);
  const currentPrizeValue = basePot - currentHighestBid;
  const dividendPerMember = Math.round(currentHighestBid / 20);

  const leadingBidderName =
    activeAuction.highest_bidder_name || activeAuction.bidder || "Priya M.";
  const isUserLeading =
    leadingBidderName.toLowerCase().includes(currentUserName.toLowerCase()) ||
    leadingBidderName.toLowerCase().includes("you");

  // Place Bid Handler
  const handlePlaceBid = async (amountToBid) => {
    if (!isLive) {
      alert("This auction is not currently open for live bidding.");
      return;
    }

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

    // Statutory Cap check (max 30% discount under Chit Funds Act)
    const maxDiscountAllowed = Math.round(basePot * 0.4);
    if (numAmount > maxDiscountAllowed) {
      alert(
        `Discount bid exceeds statutory cap under The Chit Funds Act (Max ₹${maxDiscountAllowed.toLocaleString(
          "en-IN"
        )})`
      );
      return;
    }

    setBidding(true);

    if (isSupabaseConfigured()) {
      try {
        const { error } = await supabase.from("bids").insert([
          {
            auction_id: activeAuction.id,
            member_id: profile?.member_id || null,
            bidder_name: `${currentUserName} (You)`,
            bid_amount: numAmount,
          },
        ]);

        if (error) throw error;

        // Also update auctions table
        await supabase
          .from("auctions")
          .update({
            highest_bid: numAmount,
            highest_bidder_name: `${currentUserName} (You)`,
            highest_bidder_id: profile?.member_id || null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", activeAuction.id);
      } catch (err) {
        console.error("Failed to insert bid:", err.message);
        alert("Failed to place bid on Supabase: " + err.message);
      }
    } else {
      // Local fallback
      setBidHistory((prev) => [
        {
          id: "bid-" + Date.now(),
          bidder_name: `${currentUserName} (You)`,
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
                highest_bidder_name: `${currentUserName} (You)`,
                bid: `₹${numAmount.toLocaleString("en-IN")}`,
                bidder: `${currentUserName} (You)`,
              }
            : a
        )
      );
    }

    setBidAmountInput("");
    setBidding(false);
    setFeedbackMsg(
      `Your bid of ₹${numAmount.toLocaleString("en-IN")} has been placed successfully!`
    );
    setTimeout(() => setFeedbackMsg(null), 3800);
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
            boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            zIndex: 4000,
            fontSize: "13px",
            fontWeight: "500",
          }}
        >
          <CheckCircle size={18} color="#10b486" />
          {feedbackMsg}
        </div>
      )}

      {/* AUCTION SELECTOR BAR (Choose from all available auctions) */}
      <div style={{ marginBottom: "20px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "10px",
          }}
        >
          <span
            style={{
              fontSize: "12px",
              fontWeight: "700",
              color: "#475467",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
            }}
          >
            Select Chit Auction Hall ({auctions.length} Available)
          </span>
          <span style={{ fontSize: "11px", color: "#64748b" }}>
            Click an auction below to enter and bid
          </span>
        </div>

        <div
          style={{
            display: "flex",
            gap: "12px",
            overflowX: "auto",
            paddingBottom: "8px",
          }}
        >
          {auctions.map((auc) => {
            const isSelected = auc.id === activeAuction.id;
            const isAucLive = auc.is_live || auc.status === "live";
            const isAucCompleted = auc.status === "completed";
            const highBid = Number(auc.highest_bid || auc.bid_amount || 0);

            return (
              <div
                key={auc.id}
                onClick={() => setSelectedAuctionId(auc.id)}
                style={{
                  minWidth: "240px",
                  background: isSelected ? "#ffffff" : "#f8fafc",
                  border: isSelected ? "2px solid #2850c7" : "1px solid #e2e8f0",
                  borderRadius: "12px",
                  padding: "12px 16px",
                  cursor: "pointer",
                  boxShadow: isSelected ? "0 4px 14px rgba(40, 80, 199, 0.12)" : "none",
                  transition: "all 0.15s ease",
                  flexShrink: 0,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: "4px",
                  }}
                >
                  <strong
                    style={{
                      fontSize: "13px",
                      color: isSelected ? "#2850c7" : "#1e293b",
                    }}
                  >
                    {auc.scheme_name || auc.name}
                  </strong>
                  {isAucLive ? (
                    <div className="live-pulse-badge" style={{ padding: "2px 6px", fontSize: "9px" }}>
                      <div className="live-pulse-dot" style={{ width: "5px", height: "5px" }} />
                      <span>LIVE</span>
                    </div>
                  ) : isAucCompleted ? (
                    <span style={{ fontSize: "9px", color: "#15803d", fontWeight: "700" }}>CLOSED</span>
                  ) : (
                    <span style={{ fontSize: "9px", color: "#b45309", fontWeight: "700" }}>UPCOMING</span>
                  )}
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: "11px",
                    color: "#64748b",
                    marginTop: "6px",
                  }}
                >
                  <span>Pot: ₹{Number(auc.base_pot_value || 100000).toLocaleString("en-IN")}</span>
                  <span style={{ fontWeight: "700", color: "#059669" }}>
                    High: ₹{highBid.toLocaleString("en-IN")}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* TOP METRICS FOR SELECTED AUCTION */}
      <section className="main-stats-grid" style={{ marginBottom: "24px" }}>
        <div className="main-stat-card">
          <div className="stat-card-top">
            <div className="stat-icon blue">
              <Gavel size={20} />
            </div>
            <span className="stat-change">{activeAuction.scheme_name || activeAuction.name}</span>
          </div>
          <div className="stat-card-content">
            <p>GROSS CHIT POT</p>
            <h2>₹{basePot.toLocaleString("en-IN")}</h2>
          </div>
        </div>

        <div className="main-stat-card">
          <div className="stat-card-top">
            <div className="stat-icon green">
              <IndianRupee size={20} />
            </div>
            <span className="stat-change" style={{ color: "#10b486", fontWeight: "700" }}>
              Winner: {leadingBidderName}
            </span>
          </div>
          <div className="stat-card-content">
            <p>LEADING DISCOUNT BID</p>
            <h2>₹{currentHighestBid.toLocaleString("en-IN")}</h2>
          </div>
        </div>

        <div className="main-stat-card">
          <div className="stat-card-top">
            <div className="stat-icon yellow">
              <Sparkles size={20} />
            </div>
            <span className="stat-change">Your Dividend</span>
          </div>
          <div className="stat-card-content">
            <p>EST. DIVIDEND PER MEMBER</p>
            <h2>₹{dividendPerMember.toLocaleString("en-IN")}</h2>
          </div>
        </div>

        <div className="main-stat-card">
          <div className="stat-card-top">
            <div className="stat-icon blue">
              <Users size={20} />
            </div>
            <span className="stat-change">{activeAuction.members_info || "20 Members"}</span>
          </div>
          <div className="stat-card-content">
            <p>WINNER PRIZE PAYOUT</p>
            <h2>₹{currentPrizeValue.toLocaleString("en-IN")}</h2>
          </div>
        </div>
      </section>

      {/* PERSONAL BIDDER STATUS BANNER */}
      {isLive && (
        <div
          style={{
            background: isUserLeading
              ? "linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)"
              : "#f8fafc",
            border: isUserLeading ? "1px solid #86efac" : "1px solid #e2e8f0",
            borderRadius: "12px",
            padding: "14px 18px",
            marginBottom: "20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "10px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            {isUserLeading ? (
              <div
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "50%",
                  background: "#10b486",
                  color: "#ffffff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "16px",
                }}
              >
                👑
              </div>
            ) : (
              <div
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "50%",
                  background: "#e2e8f0",
                  color: "#64748b",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "16px",
                }}
              >
                ⚡
              </div>
            )}
            <div>
              <strong style={{ fontSize: "14px", color: isUserLeading ? "#064e3b" : "#1e293b" }}>
                {isUserLeading
                  ? "🎉 You are currently the HIGHEST BIDDER in this auction!"
                  : `Leading Bidder: ${leadingBidderName} at ₹${currentHighestBid.toLocaleString("en-IN")}`}
              </strong>
              <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>
                {isUserLeading
                  ? `If no higher bids are placed, you will take home the net prize of ₹${currentPrizeValue.toLocaleString("en-IN")}.`
                  : "Place a higher discount bid to claim the chit fund prize for this month."}
              </div>
            </div>
          </div>

          <div style={{ fontSize: "12px", color: "#64748b" }}>
            Min next bid: <strong style={{ color: "#1e293b" }}>₹{(currentHighestBid + 500).toLocaleString("en-IN")}</strong>
          </div>
        </div>
      )}

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
                ACTIVE AUCTION STAGE
              </span>
              <h2 style={{ fontSize: "20px", fontWeight: "700", marginTop: "4px", margin: 0 }}>
                {activeAuction.name || activeAuction.scheme_name}
              </h2>
              <p style={{ fontSize: "12px", color: "#667085", marginTop: "2px", margin: 0 }}>
                Gross Chit Value: ₹{basePot.toLocaleString("en-IN")} · 20 Subscribers
              </p>
            </div>

            {isLive ? (
              <div className="live-pulse-badge">
                <div className="live-pulse-dot" />
                <span>LIVE BIDDING</span>
              </div>
            ) : isCompleted ? (
              <span className="status-tag approved">SETTLED</span>
            ) : (
              <span className="status-tag pending">UPCOMING SCHEDULED</span>
            )}
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
                  {isLive ? "AUCTION CLOSING COUNTDOWN" : "AUCTION STATUS"}
                </div>
                <div
                  style={{
                    fontSize: "22px",
                    fontWeight: "800",
                    letterSpacing: "1px",
                    fontFamily: "monospace",
                    color: isLive ? "#ffffff" : "#94a3b8",
                  }}
                >
                  {isLive ? formatTimer(timeLeft) : (isCompleted ? "AUCTION CLOSED" : "STARTS SHORTLY")}
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
                {leadingBidderName}
              </div>
            </div>
          </div>

          {/* QUICK BID INCREMENTS & CUSTOM BID */}
          {isLive ? (
            <>
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
            </>
          ) : isCompleted ? (
            <div
              style={{
                textAlign: "center",
                padding: "24px",
                background: "#f0fdf4",
                borderRadius: "12px",
                border: "1px solid #bbf7d0",
                marginTop: "16px",
              }}
            >
              <Trophy size={32} color="#15803d" style={{ margin: "0 auto 8px" }} />
              <strong style={{ fontSize: "16px", color: "#166534", display: "block" }}>
                Auction Has Ended
              </strong>
              <p style={{ fontSize: "12px", color: "#15803d", marginTop: "4px" }}>
                Awarded to <strong>{leadingBidderName}</strong> for discount bid of ₹{currentHighestBid.toLocaleString("en-IN")}.
              </p>
            </div>
          ) : (
            <div
              style={{
                textAlign: "center",
                padding: "24px",
                background: "#fffbeb",
                borderRadius: "12px",
                border: "1px solid #fde68a",
                marginTop: "16px",
              }}
            >
              <Clock3 size={32} color="#b45309" style={{ margin: "0 auto 8px" }} />
              <strong style={{ fontSize: "16px", color: "#92400e", display: "block" }}>
                Auction Scheduled
              </strong>
              <p style={{ fontSize: "12px", color: "#b45309", marginTop: "4px" }}>
                This auction is scheduled and will open as soon as the Foreman initiates live bidding.
              </p>
            </div>
          )}
        </div>

        {/* RIGHT: REAL-TIME BID HISTORY STREAM */}
        <div className="activity-card" style={{ height: "fit-content" }}>
          <div className="section-header">
            <div>
              <h2>Live Bid Stream</h2>
              <p>{activeAuction.scheme_name || activeAuction.name}</p>
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
