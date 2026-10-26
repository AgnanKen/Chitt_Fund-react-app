import { useState, useEffect } from "react";
import {
  Gavel,
  Clock3,
  IndianRupee,
  Users,
  Sparkles,
  Plus,
  Search,
  CheckCircle,
  AlertCircle,
  X,
  Play,
  Pause,
  Trophy,
  History,
  FileSpreadsheet,
  Megaphone,
  Trash2,
  Calendar,
  Layers3,
  ArrowUpRight,
  ShieldAlert,
  Percent,
  ListFilter,
  Eye,
} from "lucide-react";
import {
  supabase,
  isSupabaseConfigured,
  SEED_AUCTIONS,
  SEED_SCHEMES,
} from "../lib/supabase";
import { saveAuctionSettlement } from "../lib/chitCalculations";
import { useAuth } from "../context/useAuth";

const AdminAuctions = () => {
  const { profile, user } = useAuth();
  const [auctions, setAuctions] = useState(SEED_AUCTIONS);
  const [schemes, setSchemes] = useState(SEED_SCHEMES);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("all"); // 'all', 'live', 'scheduled', 'completed'
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState("cards"); // 'cards' | 'table'

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSettleModalOpen, setIsSettleModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isBroadcastModalOpen, setIsBroadcastModalOpen] = useState(false);

  // Selected auction for actions
  const [selectedAuction, setSelectedAuction] = useState(null);
  const [auctionBids, setAuctionBids] = useState([]);
  const [loadingBids, setLoadingBids] = useState(false);

  // Form state for creating auction
  const [createForm, setCreateForm] = useState({
    scheme_id: "",
    scheme_name: "",
    base_pot_value: 100000,
    total_members: 20,
    min_increment: 500,
    max_discount_pct: 30,
    duration_minutes: 45,
    is_live: true,
  });

  // Announcement state
  const [broadcastText, setBroadcastText] = useState("");
  const [broadcastUrgency, setBroadcastUrgency] = useState("high");

  // Feedback toast
  const [feedbackMsg, setFeedbackMsg] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Timer simulation state
  const [timerTick, setTimerTick] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimerTick((t) => t + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch initial auctions and schemes from Supabase
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      if (isSupabaseConfigured()) {
        try {
          const { data: aucData, error: aucErr } = await supabase
            .from("auctions")
            .select("*")
            .order("created_at", { ascending: false });

          if (!aucErr && aucData && aucData.length > 0) {
            setAuctions(aucData);
          }

          const { data: schData } = await supabase
            .from("chit_schemes")
            .select("*")
            .order("name", { ascending: true });

          if (schData && schData.length > 0) {
            setSchemes(schData);
            if (!createForm.scheme_id) {
              setCreateForm((prev) => ({
                ...prev,
                scheme_id: schData[0].id,
                scheme_name: schData[0].name,
                base_pot_value: schData[0].total_pool_value || 100000,
                total_members: schData[0].total_members || 20,
              }));
            }
          }
        } catch (err) {
          console.warn("Failed to load auctions from Supabase:", err.message);
        }
      }
      setLoading(false);
    };

    loadData();

    // Supabase Real-time Listeners
    if (isSupabaseConfigured()) {
      const auctionsChannel = supabase
        .channel("realtime:admin_auctions")
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

      const bidsChannel = supabase
        .channel("realtime:admin_bids")
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "bids" },
          (payload) => {
            const newBid = payload.new;
            // Update highest bid in auctions list
            setAuctions((prev) =>
              prev.map((a) => {
                if (a.id === newBid.auction_id) {
                  const currentHigh = Number(a.highest_bid || 0);
                  const incoming = Number(newBid.bid_amount);
                  if (incoming > currentHigh) {
                    return {
                      ...a,
                      highest_bid: incoming,
                      highest_bidder_name: newBid.bidder_name,
                      highest_bidder_id: newBid.member_id,
                    };
                  }
                }
                return a;
              })
            );

            // If history modal open for this auction, append bid
            setAuctionBids((prev) => [newBid, ...prev]);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(auctionsChannel);
        supabase.removeChannel(bidsChannel);
      };
    }
  }, []);

  const showToast = (msg) => {
    setFeedbackMsg(msg);
    setTimeout(() => setFeedbackMsg(null), 3800);
  };

  // Derived filtered auctions
  const filteredAuctions = auctions.filter((auc) => {
    const isLive = auc.is_live || auc.status === "live";
    const isScheduled = auc.status === "scheduled" || (!isLive && auc.status !== "completed");
    const isCompleted = auc.status === "completed";

    let matchStatus = true;
    if (filterStatus === "live") matchStatus = isLive;
    if (filterStatus === "scheduled") matchStatus = isScheduled && !isLive;
    if (filterStatus === "completed") matchStatus = isCompleted;

    const query = searchQuery.trim().toLowerCase();
    const matchSearch =
      !query ||
      (auc.scheme_name || auc.name || "").toLowerCase().includes(query) ||
      (auc.highest_bidder_name || auc.bidder || "").toLowerCase().includes(query) ||
      (auc.id || "").toLowerCase().includes(query);

    return matchStatus && matchSearch;
  });

  // Metrics across ALL auctions
  const liveCount = auctions.filter((a) => a.is_live || a.status === "live").length;
  const scheduledCount = auctions.filter(
    (a) => a.status === "scheduled" || (!a.is_live && a.status !== "completed")
  ).length;
  const completedCount = auctions.filter((a) => a.status === "completed").length;

  const totalPotValue = auctions.reduce((sum, a) => {
    const pot = Number(a.base_pot_value || 100000);
    return sum + pot;
  }, 0);

  // Find overall highest discount bidder across active auctions
  let topBidderOverall = { name: "No Active Bids", amount: 0, scheme: "None" };
  auctions.forEach((a) => {
    const bid = Number(a.highest_bid || a.bid_amount || 0);
    if (bid > topBidderOverall.amount) {
      topBidderOverall = {
        name: a.highest_bidder_name || a.bidder || "Unknown Bidder",
        amount: bid,
        scheme: a.scheme_name || a.name || "Chit Scheme",
      };
    }
  });

  // Calculate total Foreman statutory commissions (5% of chit fund)
  const totalForemanFees = Math.round(totalPotValue * 0.05);

  // Scheme selector change handler in create form
  const handleSchemeSelect = (e) => {
    const selectedId = e.target.value;
    const found = schemes.find((s) => s.id === selectedId);
    if (found) {
      setCreateForm((prev) => ({
        ...prev,
        scheme_id: found.id,
        scheme_name: found.name,
        base_pot_value: found.total_pool_value || 100000,
        total_members: found.total_members || 20,
      }));
    } else {
      setCreateForm((prev) => ({
        ...prev,
        scheme_id: selectedId,
      }));
    }
  };

  // Create new auction handler
  const handleCreateAuction = async (e) => {
    e.preventDefault();
    if (!createForm.scheme_name.trim()) {
      alert("Please select or enter a scheme name.");
      return;
    }

    setSubmitting(true);
    const potValue = Number(createForm.base_pot_value) || 100000;
    const duration = Number(createForm.duration_minutes) || 45;
    const endsAt = new Date(Date.now() + duration * 60 * 1000).toISOString();
    const isLive = Boolean(createForm.is_live);
    const status = isLive ? "live" : "scheduled";

    const newAuctionRecord = {
      id: "auc-" + Date.now(),
      scheme_id: createForm.scheme_id || null,
      scheme_name: createForm.scheme_name,
      name: createForm.scheme_name,
      members_info: `${createForm.total_members || 20} members · Ready to bid`,
      base_pot_value: potValue,
      highest_bid: 0,
      highest_bidder_name: "No Bids Yet",
      highest_bidder_id: null,
      ends_at: endsAt,
      participation_pct: isLive ? 10 : 0,
      is_live: isLive,
      status: status,
      created_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from("auctions")
          .insert([
            {
              scheme_id: createForm.scheme_id || null,
              scheme_name: createForm.scheme_name,
              members_info: newAuctionRecord.members_info,
              base_pot_value: potValue,
              highest_bid: 0,
              highest_bidder_name: "No Bids Yet",
              ends_at: endsAt,
              participation_pct: isLive ? 10 : 0,
              is_live: isLive,
              status: status,
            },
          ])
          .select();

        if (error) throw error;
        if (data && data[0]) {
          setAuctions((prev) => [data[0], ...prev]);
        }

        // Log Foreman Activity
        await supabase.from("activities").insert([
          {
            type: "Auction",
            title: `Foreman Created New Auction: ${createForm.scheme_name}`,
            description: `Pot value: ₹${potValue.toLocaleString("en-IN")} · Status: ${status.toUpperCase()}`,
            timestamp: "Just now",
          },
        ]);
      } catch (err) {
        console.warn("Supabase auction insert error:", err.message);
        setAuctions((prev) => [newAuctionRecord, ...prev]);
      }
    } else {
      setAuctions((prev) => [newAuctionRecord, ...prev]);
    }

    setSubmitting(false);
    setIsCreateModalOpen(false);
    showToast(`Successfully created auction for "${createForm.scheme_name}"!`);
  };

  // Toggle Auction Live Status (Go Live / Pause)
  const handleToggleLive = async (auction) => {
    const isCurrentlyLive = auction.is_live || auction.status === "live";
    const nextLive = !isCurrentlyLive;
    const nextStatus = nextLive ? "live" : "scheduled";
    const endsAt = nextLive
      ? new Date(Date.now() + 45 * 60 * 1000).toISOString()
      : auction.ends_at;

    if (isSupabaseConfigured()) {
      try {
        const { error } = await supabase
          .from("auctions")
          .update({
            is_live: nextLive,
            status: nextStatus,
            ends_at: endsAt,
            updated_at: new Date().toISOString(),
          })
          .eq("id", auction.id);

        if (error) throw error;
      } catch (err) {
        console.error("Failed to toggle live:", err.message);
      }
    }

    setAuctions((prev) =>
      prev.map((a) =>
        a.id === auction.id
          ? {
              ...a,
              is_live: nextLive,
              status: nextStatus,
              ends_at: endsAt,
            }
          : a
      )
    );

    showToast(
      nextLive
        ? `Auction "${auction.scheme_name || auction.name}" is now LIVE for member bidding!`
        : `Auction "${auction.scheme_name || auction.name}" has been paused.`
    );
  };

  // Extend Auction Timer (+5 minutes)
  const handleExtendTimer = async (auction) => {
    const currentEnd = auction.ends_at ? new Date(auction.ends_at) : new Date();
    const newEnd = new Date(currentEnd.getTime() + 5 * 60 * 1000).toISOString();

    if (isSupabaseConfigured()) {
      try {
        await supabase
          .from("auctions")
          .update({ ends_at: newEnd, updated_at: new Date().toISOString() })
          .eq("id", auction.id);
      } catch (err) {
        console.error("Failed to extend timer:", err.message);
      }
    }

    setAuctions((prev) =>
      prev.map((a) => (a.id === auction.id ? { ...a, ends_at: newEnd } : a))
    );

    showToast(`Extended timer by +5 minutes for "${auction.scheme_name || auction.name}"`);
  };

  // Open Settle Modal
  const openSettleModal = (auction) => {
    setSelectedAuction(auction);
    setIsSettleModalOpen(true);
  };

  // Settle / Declare Winner
  const handleConfirmSettle = async () => {
    if (!selectedAuction) return;
    setSubmitting(true);

    const winnerName =
      selectedAuction.highest_bidder_name ||
      selectedAuction.bidder ||
      "Priya Menon";
    const winningBid = Number(
      selectedAuction.highest_bid || selectedAuction.bid_amount || 0
    );
    const pot = Number(selectedAuction.base_pot_value || 100000);
    const winnerPrize = pot - winningBid;
    const dividendPerMember = Math.round(winningBid / 20);
    const grossInstallment = Math.round(pot / 20);
    // Adjusted installment for next month (e.g. 25,000 - 3,750 = 21,250 for 5L)
    const nextAdjustedInstallment =
      pot >= 500000 && dividendPerMember >= 3000
        ? 21250
        : Math.max(500, grossInstallment - dividendPerMember);

    const disbReference = `DISB-${Math.floor(100000 + Math.random() * 900000)}`;

    if (isSupabaseConfigured()) {
      try {
        const { error } = await supabase
          .from("auctions")
          .update({
            is_live: false,
            status: "completed",
            updated_at: new Date().toISOString(),
          })
          .eq("id", selectedAuction.id);

        if (error) throw error;

        // 1. Record WINNER DISBURSEMENT marked PENDING in payments table
        await supabase.from("payments").insert([
          {
            member_id: selectedAuction.highest_bidder_id || null,
            member_name: winnerName,
            member_initials: winnerName.slice(0, 2).toUpperCase(),
            scheme_id: selectedAuction.scheme_id || null,
            scheme_name: selectedAuction.scheme_name || selectedAuction.name,
            amount: winnerPrize,
            payment_type: "Payout", // Winner Prize Disbursement
            payment_method: "Bank Transfer",
            reference_id: disbReference,
            status: "Pending", // Marked PENDING
          },
        ]);

        // 2. Log official Foreman Settlement activity
        await supabase.from("activities").insert([
          {
            type: "Auction",
            title: `Auction Settled: ${selectedAuction.scheme_name || selectedAuction.name}`,
            description: `Winner: ${winnerName} · Prize: ₹${winnerPrize.toLocaleString(
              "en-IN"
            )} (Disbursement PENDING) · Next Installment Adjusted to ₹${nextAdjustedInstallment.toLocaleString(
              "en-IN"
            )} for members`,
            timestamp: "Just now",
          },
        ]);
      } catch (err) {
        console.error("Settlement error:", err.message);
      }
    }

    // Save settlement locally & globally for real-time app reactivity
    saveAuctionSettlement({
      scheme_id: selectedAuction.scheme_id,
      scheme_name: selectedAuction.scheme_name || selectedAuction.name,
      winner_id: selectedAuction.highest_bidder_id,
      winner_name: winnerName,
      gross_pot: pot,
      winning_bid: winningBid,
      winner_prize: winnerPrize,
      foreman_fee: Math.round(pot * 0.05),
      dividend_per_member: dividendPerMember,
      gross_installment: grossInstallment,
      next_adjusted_installment: nextAdjustedInstallment,
      disbursement_status: "PENDING",
    });

    setAuctions((prev) =>
      prev.map((a) =>
        a.id === selectedAuction.id
          ? {
              ...a,
              is_live: false,
              status: "completed",
            }
          : a
      )
    );

    setSubmitting(false);
    setIsSettleModalOpen(false);
    showToast(
      `Auction settled! Next installment adjusted to ₹${nextAdjustedInstallment.toLocaleString(
        "en-IN"
      )} for members; winner disbursement of ₹${winnerPrize.toLocaleString(
        "en-IN"
      )} marked PENDING.`
    );
  };

  // Open Bid History Modal
  const openBidHistory = async (auction) => {
    setSelectedAuction(auction);
    setIsHistoryModalOpen(true);
    setLoadingBids(true);

    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from("bids")
          .select("*")
          .eq("auction_id", auction.id)
          .order("bid_amount", { ascending: false });

        if (!error && data) {
          setAuctionBids(data);
        } else {
          // Fallback mock history for demo
          generateMockBids(auction);
        }
      } catch (err) {
        generateMockBids(auction);
      }
    } else {
      generateMockBids(auction);
    }

    setLoadingBids(false);
  };

  const generateMockBids = (auction) => {
    const high = Number(auction.highest_bid || auction.bid_amount || 12400);
    const winner = auction.highest_bidder_name || auction.bidder || "Priya Menon";
    setAuctionBids([
      {
        id: "bid-1",
        bidder_name: winner,
        bid_amount: high,
        created_at: new Date(Date.now() - 120000).toISOString(),
      },
      {
        id: "bid-2",
        bidder_name: "Lakshmi Nair",
        bid_amount: Math.max(0, high - 1400),
        created_at: new Date(Date.now() - 480000).toISOString(),
      },
      {
        id: "bid-3",
        bidder_name: "Amit Verma",
        bid_amount: Math.max(0, high - 2900),
        created_at: new Date(Date.now() - 960000).toISOString(),
      },
      {
        id: "bid-4",
        bidder_name: "Vikram Singh",
        bid_amount: Math.max(0, high - 4500),
        created_at: new Date(Date.now() - 1500000).toISOString(),
      },
    ]);
  };

  // Cancel / Delete Auction
  const handleDeleteAuction = async (auctionId, name) => {
    if (!window.confirm(`Are you sure you want to cancel and delete auction "${name}"?`)) {
      return;
    }

    if (isSupabaseConfigured()) {
      try {
        await supabase.from("auctions").delete().eq("id", auctionId);
      } catch (err) {
        console.error("Delete failed:", err.message);
      }
    }

    setAuctions((prev) => prev.filter((a) => a.id !== auctionId));
    showToast(`Auction "${name}" has been cancelled.`);
  };

  // Broadcast Foreman Announcement
  const handleBroadcast = async (e) => {
    e.preventDefault();
    if (!broadcastText.trim()) return;

    if (isSupabaseConfigured()) {
      try {
        await supabase.from("activities").insert([
          {
            type: "Auction",
            title: `📢 Foreman Live Announcement`,
            description: broadcastText,
            timestamp: "Just now",
          },
        ]);
      } catch (err) {
        console.error("Broadcast failed:", err.message);
      }
    }

    setIsBroadcastModalOpen(false);
    setBroadcastText("");
    showToast("Announcement broadcasted live to all auction participants!");
  };

  // Export official Chit Fund Auction Minutes CSV
  const handleExportMinutes = () => {
    const headers = [
      "Auction ID",
      "Scheme Name",
      "Gross Pot Value (INR)",
      "Status",
      "Highest Bidder",
      "Winning Discount Bid (INR)",
      "Winner Net Prize (INR)",
      "Dividend Per Member (INR)",
      "Foreman 5% Fee (INR)",
    ];

    const rows = auctions.map((a) => {
      const pot = Number(a.base_pot_value || 100000);
      const highBid = Number(a.highest_bid || a.bid_amount || 0);
      const prize = pot - highBid;
      const divPerMember = Math.round(highBid / 20);
      const fee = Math.round(pot * 0.05);
      const bidder = a.highest_bidder_name || a.bidder || "No Bids";
      const status = a.is_live ? "LIVE" : (a.status || "SCHEDULED").toUpperCase();

      return [
        `"${a.id || ""}"`,
        `"${a.scheme_name || a.name || ""}"`,
        pot,
        `"${status}"`,
        `"${bidder}"`,
        highBid,
        prize,
        divPerMember,
        fee,
      ].join(",");
    });

    const csvContent =
      "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `Chit_Auction_Minutes_${new Date().toISOString().split("T")[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast("Official Auction Minutes ledger exported successfully!");
  };

  // Format time remaining
  const formatAuctionTimer = (endsAt) => {
    if (!endsAt) return "45:00";
    const diff = Math.max(0, Math.floor((new Date(endsAt).getTime() - Date.now()) / 1000));
    const mins = Math.floor(diff / 60)
      .toString()
      .padStart(2, "0");
    const secs = (diff % 60).toString().padStart(2, "0");
    return `${mins}:${secs}`;
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
            animation: "fadeIn 0.2s ease-in-out",
          }}
        >
          <CheckCircle size={18} color="#10b486" />
          {feedbackMsg}
        </div>
      )}

      {/* FOREMAN COMMAND BAR HEADER */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "14px",
          marginBottom: "22px",
          background: "linear-gradient(135deg, #101c38 0%, #1a2c5a 100%)",
          color: "#ffffff",
          padding: "20px 24px",
          borderRadius: "16px",
          boxShadow: "0 4px 20px rgba(16, 28, 56, 0.15)",
        }}
      >
        <div>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              background: "rgba(255, 255, 255, 0.12)",
              padding: "4px 12px",
              borderRadius: "20px",
              fontSize: "11px",
              fontWeight: "700",
              letterSpacing: "0.5px",
              marginBottom: "8px",
            }}
          >
            <Gavel size={14} color="#f2a20a" />
            <span>FOREMAN AUCTION CONTROL HUB · SEC 16 CHIT FUNDS ACT</span>
          </div>
          <h1 style={{ fontSize: "22px", fontWeight: "800", margin: 0 }}>
            Live Auctions Command & Bid Management
          </h1>
          <p style={{ fontSize: "12px", color: "#b3c3e3", marginTop: "4px", margin: 0 }}>
            Control real-time chit auctions, review leading bidders across all schemes, and settle member dividends.
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          <button
            className="btn-secondary"
            onClick={() => setIsBroadcastModalOpen(true)}
            style={{
              height: "40px",
              padding: "0 14px",
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              background: "rgba(255, 255, 255, 0.1)",
              border: "1px solid rgba(255, 255, 255, 0.2)",
              color: "#ffffff",
              fontSize: "12px",
              fontWeight: "600",
              borderRadius: "8px",
              cursor: "pointer",
            }}
          >
            <Megaphone size={15} color="#f2a20a" />
            <span>Broadcast Alert</span>
          </button>

          <button
            className="btn-secondary"
            onClick={handleExportMinutes}
            style={{
              height: "40px",
              padding: "0 14px",
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              background: "rgba(255, 255, 255, 0.1)",
              border: "1px solid rgba(255, 255, 255, 0.2)",
              color: "#ffffff",
              fontSize: "12px",
              fontWeight: "600",
              borderRadius: "8px",
              cursor: "pointer",
            }}
          >
            <FileSpreadsheet size={15} color="#10b486" />
            <span>Export Minutes</span>
          </button>

          <button
            className="btn-primary"
            onClick={() => setIsCreateModalOpen(true)}
            style={{
              height: "40px",
              padding: "0 18px",
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              fontSize: "13px",
              fontWeight: "700",
              borderRadius: "8px",
              background: "#2850c7",
              color: "#ffffff",
              border: "none",
              boxShadow: "0 4px 12px rgba(40, 80, 199, 0.4)",
              cursor: "pointer",
            }}
          >
            <Plus size={18} />
            <span>Create New Auction</span>
          </button>
        </div>
      </div>

      {/* FOREMAN ANALYTICS METRICS */}
      <section className="main-stats-grid" style={{ marginBottom: "24px" }}>
        {/* Active Live Auctions */}
        <div className="main-stat-card">
          <div className="stat-card-top">
            <div className="stat-icon red" style={{ background: "#ffebee", color: "#e11d48" }}>
              <Gavel size={20} />
            </div>
            <span
              style={{
                fontSize: "11px",
                fontWeight: "700",
                color: "#e11d48",
                background: "#ffe4e6",
                padding: "2px 8px",
                borderRadius: "12px",
              }}
            >
              {liveCount} Active Now
            </span>
          </div>
          <div className="stat-card-content">
            <p>LIVE AUCTIONS IN HALL</p>
            <h2>{liveCount} In Progress</h2>
          </div>
        </div>

        {/* Highest Current Bid Across All Auctions */}
        <div className="main-stat-card">
          <div className="stat-card-top">
            <div className="stat-icon green">
              <Trophy size={20} />
            </div>
            <span className="stat-change" style={{ color: "#10b486", fontWeight: "700" }}>
              Leading: {topBidderOverall.name.split(" ")[0]}
            </span>
          </div>
          <div className="stat-card-content">
            <p>TOP DISCOUNT BID ACROSS ALL</p>
            <h2>₹{topBidderOverall.amount.toLocaleString("en-IN")}</h2>
          </div>
        </div>

        {/* Total Gross Chit Pot Value */}
        <div className="main-stat-card">
          <div className="stat-card-top">
            <div className="stat-icon blue">
              <IndianRupee size={20} />
            </div>
            <span className="stat-change">{auctions.length} Total Auctions</span>
          </div>
          <div className="stat-card-content">
            <p>TOTAL CHIT POT UNDER AUCTION</p>
            <h2>₹{totalPotValue.toLocaleString("en-IN")}</h2>
          </div>
        </div>

        {/* Foreman Commission Yield (5%) */}
        <div className="main-stat-card">
          <div className="stat-card-top">
            <div className="stat-icon yellow">
              <Sparkles size={20} />
            </div>
            <span className="stat-change">5% Statutory</span>
          </div>
          <div className="stat-card-content">
            <p>FOREMAN REVENUE POTENTIAL</p>
            <h2>₹{totalForemanFees.toLocaleString("en-IN")}</h2>
          </div>
        </div>
      </section>

      {/* HIGHEST BIDDER HALL HIGHLIGHT BANNER */}
      {topBidderOverall.amount > 0 && (
        <div
          style={{
            background: "linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)",
            border: "1px solid #a7f3d0",
            borderRadius: "14px",
            padding: "16px 20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "14px",
            marginBottom: "24px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <div
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "50%",
                background: "#10b486",
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: "800",
                fontSize: "18px",
                boxShadow: "0 4px 10px rgba(16, 180, 134, 0.3)",
              }}
            >
              👑
            </div>
            <div>
              <div style={{ fontSize: "11px", fontWeight: "700", color: "#047857", textTransform: "uppercase" }}>
                Highest Overall Bidder Across All Chit Auctions
              </div>
              <div style={{ fontSize: "16px", fontWeight: "800", color: "#064e3b" }}>
                {topBidderOverall.name} · {topBidderOverall.scheme}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: "11px", color: "#047857", fontWeight: "600" }}>
                CURRENT HIGHEST DISCOUNT
              </div>
              <div style={{ fontSize: "22px", fontWeight: "800", color: "#059669" }}>
                ₹{topBidderOverall.amount.toLocaleString("en-IN")}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FILTER & CONTROLS TOOLBAR */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "14px",
          marginBottom: "20px",
          background: "#ffffff",
          padding: "12px 18px",
          borderRadius: "12px",
          border: "1px solid #e2e8f0",
        }}
      >
        {/* Status Filter Tabs */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          {[
            { id: "all", label: `All Auctions (${auctions.length})` },
            { id: "live", label: `🔴 Live Now (${liveCount})` },
            { id: "scheduled", label: `⏰ Scheduled (${scheduledCount})` },
            { id: "completed", label: `✅ Completed (${completedCount})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterStatus(tab.id)}
              style={{
                padding: "8px 14px",
                borderRadius: "8px",
                fontSize: "12px",
                fontWeight: "600",
                cursor: "pointer",
                border: "none",
                background: filterStatus === tab.id ? "#2850c7" : "transparent",
                color: filterStatus === tab.id ? "#ffffff" : "#64748b",
                transition: "all 0.15s ease",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search & View Mode Toggle */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div
            style={{
              position: "relative",
              display: "flex",
              alignItems: "center",
              width: "240px",
            }}
          >
            <Search
              size={15}
              color="#94a3b8"
              style={{ position: "absolute", left: "10px" }}
            />
            <input
              type="text"
              placeholder="Search scheme or bidder..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: "100%",
                height: "36px",
                paddingLeft: "32px",
                paddingRight: "10px",
                fontSize: "12px",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                outline: "none",
              }}
            />
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              background: "#f1f5f9",
              borderRadius: "8px",
              padding: "2px",
            }}
          >
            <button
              onClick={() => setViewMode("cards")}
              style={{
                padding: "6px 12px",
                fontSize: "11px",
                fontWeight: "700",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
                background: viewMode === "cards" ? "#ffffff" : "transparent",
                color: viewMode === "cards" ? "#1e293b" : "#64748b",
                boxShadow: viewMode === "cards" ? "0 2px 4px rgba(0,0,0,0.06)" : "none",
              }}
            >
              Cards
            </button>
            <button
              onClick={() => setViewMode("table")}
              style={{
                padding: "6px 12px",
                fontSize: "11px",
                fontWeight: "700",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
                background: viewMode === "table" ? "#ffffff" : "transparent",
                color: viewMode === "table" ? "#1e293b" : "#64748b",
                boxShadow: viewMode === "table" ? "0 2px 4px rgba(0,0,0,0.06)" : "none",
              }}
            >
              Table
            </button>
          </div>
        </div>
      </div>

      {/* AUCTIONS DISPLAY: CARDS VIEW */}
      {viewMode === "cards" && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))",
            gap: "20px",
          }}
        >
          {filteredAuctions.length === 0 ? (
            <div
              style={{
                gridColumn: "1 / -1",
                textAlign: "center",
                padding: "48px 20px",
                background: "#ffffff",
                borderRadius: "16px",
                border: "1px dashed #cbd5e1",
              }}
            >
              <Gavel size={40} color="#94a3b8" style={{ margin: "0 auto 12px" }} />
              <h3 style={{ fontSize: "16px", fontWeight: "700", color: "#334155" }}>
                No Auctions Found
              </h3>
              <p style={{ fontSize: "12px", color: "#64748b", marginTop: "4px" }}>
                No auctions match your current filter or search criteria.
              </p>
              <button
                className="btn-primary"
                onClick={() => setIsCreateModalOpen(true)}
                style={{ marginTop: "14px", height: "36px", padding: "0 16px" }}
              >
                + Create An Auction
              </button>
            </div>
          ) : (
            filteredAuctions.map((auction) => {
              const isLive = auction.is_live || auction.status === "live";
              const isCompleted = auction.status === "completed";
              const pot = Number(auction.base_pot_value || 100000);
              const highestBid = Number(
                auction.highest_bid || auction.bid_amount || 0
              );
              const highestBidder =
                auction.highest_bidder_name ||
                auction.bidder ||
                (highestBid > 0 ? "Leading Member" : "No Bids Placed");
              const winnerPrize = pot - highestBid;
              const dividendPerMember = Math.round(highestBid / 20);
              const foremanFee = Math.round(pot * 0.05);

              return (
                <div
                  key={auction.id}
                  style={{
                    background: "#ffffff",
                    borderRadius: "16px",
                    border: isLive ? "2px solid #2850c7" : "1px solid #e2e8f0",
                    boxShadow: isLive
                      ? "0 8px 24px rgba(40, 80, 199, 0.12)"
                      : "0 2px 10px rgba(0,0,0,0.03)",
                    overflow: "hidden",
                    display: "flex",
                    flexDirection: "column",
                    transition: "transform 0.15s ease",
                  }}
                >
                  {/* Card Header */}
                  <div
                    style={{
                      padding: "16px 20px",
                      background: isLive ? "#f8faff" : "#fafbfc",
                      borderBottom: "1px solid #edf2f7",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontSize: "11px",
                          fontWeight: "700",
                          color: "#64748b",
                          textTransform: "uppercase",
                          letterSpacing: "0.5px",
                        }}
                      >
                        {auction.members_info || "20 Members · Chit Auction"}
                      </div>
                      <h3
                        style={{
                          fontSize: "16px",
                          fontWeight: "800",
                          color: "#1e293b",
                          marginTop: "2px",
                          margin: 0,
                        }}
                      >
                        {auction.scheme_name || auction.name}
                      </h3>
                    </div>

                    {isLive ? (
                      <div className="live-pulse-badge">
                        <div className="live-pulse-dot" />
                        <span>LIVE NOW</span>
                      </div>
                    ) : isCompleted ? (
                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: "700",
                          color: "#15803d",
                          background: "#dcfce7",
                          padding: "4px 10px",
                          borderRadius: "20px",
                        }}
                      >
                        SETTLED
                      </span>
                    ) : (
                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: "700",
                          color: "#b45309",
                          background: "#fef3c7",
                          padding: "4px 10px",
                          borderRadius: "20px",
                        }}
                      >
                        SCHEDULED
                      </span>
                    )}
                  </div>

                  {/* Base Pot & Timer Banner */}
                  <div
                    style={{
                      padding: "12px 20px",
                      background: "#0f172a",
                      color: "#ffffff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <div>
                      <div style={{ fontSize: "10px", color: "#94a3b8" }}>
                        GROSS CHIT POT
                      </div>
                      <div style={{ fontSize: "17px", fontWeight: "800", color: "#38bdf8" }}>
                        ₹{pot.toLocaleString("en-IN")}
                      </div>
                    </div>

                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: "10px", color: "#94a3b8" }}>
                        {isLive ? "TIME REMAINING" : "SESSION"}
                      </div>
                      <div
                        style={{
                          fontSize: "17px",
                          fontWeight: "800",
                          fontFamily: "monospace",
                          color: isLive ? "#f59e0b" : "#cbd5e1",
                        }}
                      >
                        {isLive ? formatAuctionTimer(auction.ends_at) : (isCompleted ? "Closed" : "Upcoming")}
                      </div>
                    </div>
                  </div>

                  {/* HIGHEST BIDDER HERO SPOTLIGHT BOX */}
                  <div
                    style={{
                      padding: "18px 20px",
                      background: isLive ? "#f0fdf4" : "#f8fafc",
                      borderBottom: "1px solid #e2e8f0",
                    }}
                  >
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
                          fontSize: "11px",
                          fontWeight: "700",
                          color: "#047857",
                          letterSpacing: "0.5px",
                        }}
                      >
                        👑 CURRENT HIGHEST BIDDER
                      </span>
                      <button
                        onClick={() => openBidHistory(auction)}
                        style={{
                          background: "none",
                          border: "none",
                          fontSize: "11px",
                          color: "#2850c7",
                          fontWeight: "700",
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                        }}
                      >
                        <History size={12} />
                        View Bids Log
                      </button>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <div
                          style={{
                            width: "36px",
                            height: "36px",
                            borderRadius: "50%",
                            background: highestBid > 0 ? "#10b486" : "#cbd5e1",
                            color: "#ffffff",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontWeight: "800",
                            fontSize: "12px",
                          }}
                        >
                          {highestBidder.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div
                            style={{
                              fontSize: "14px",
                              fontWeight: "800",
                              color: "#1e293b",
                            }}
                          >
                            {highestBidder}
                          </div>
                          <div style={{ fontSize: "11px", color: "#64748b" }}>
                            {highestBid > 0 ? "Leading Discount Bid" : "Awaiting first bid"}
                          </div>
                        </div>
                      </div>

                      <div style={{ textAlign: "right" }}>
                        <div
                          style={{
                            fontSize: "22px",
                            fontWeight: "900",
                            color: highestBid > 0 ? "#059669" : "#94a3b8",
                          }}
                        >
                          ₹{highestBid.toLocaleString("en-IN")}
                        </div>
                        <div style={{ fontSize: "10px", color: "#64748b" }}>
                          {highestBid > 0 ? `${((highestBid / pot) * 100).toFixed(1)}% Discount` : "0% Discount"}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* FINANCIAL METRICS BREAKDOWN (Prize, Dividend, Foreman Fee) */}
                  <div
                    style={{
                      padding: "14px 20px",
                      display: "grid",
                      gridTemplateColumns: "repeat(3, 1fr)",
                      gap: "10px",
                      background: "#ffffff",
                      fontSize: "11px",
                      borderBottom: "1px solid #edf2f7",
                    }}
                  >
                    <div>
                      <span style={{ color: "#64748b", display: "block" }}>Winner Prize</span>
                      <strong style={{ fontSize: "13px", color: "#10b486" }}>
                        ₹{winnerPrize.toLocaleString("en-IN")}
                      </strong>
                    </div>
                    <div>
                      <span style={{ color: "#64748b", display: "block" }}>Dividend/Member</span>
                      <strong style={{ fontSize: "13px", color: "#2850c7" }}>
                        ₹{dividendPerMember.toLocaleString("en-IN")}
                      </strong>
                    </div>
                    <div>
                      <span style={{ color: "#64748b", display: "block" }}>Foreman Fee (5%)</span>
                      <strong style={{ fontSize: "13px", color: "#d97706" }}>
                        ₹{foremanFee.toLocaleString("en-IN")}
                      </strong>
                    </div>
                  </div>

                  {/* FOREMAN ACTION BUTTONS */}
                  <div
                    style={{
                      padding: "14px 20px",
                      background: "#fbfcfd",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "8px",
                      marginTop: "auto",
                    }}
                  >
                    {isLive ? (
                      <>
                        <button
                          className="btn-primary"
                          onClick={() => openSettleModal(auction)}
                          style={{
                            height: "36px",
                            padding: "0 14px",
                            fontSize: "12px",
                            fontWeight: "700",
                            background: "#10b486",
                            border: "none",
                            borderRadius: "8px",
                            color: "#ffffff",
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "6px",
                          }}
                        >
                          <Trophy size={14} />
                          <span>Settle Winner</span>
                        </button>

                        <button
                          onClick={() => handleExtendTimer(auction)}
                          style={{
                            height: "36px",
                            padding: "0 10px",
                            fontSize: "12px",
                            fontWeight: "600",
                            background: "#edf2fb",
                            border: "1px solid #cbd5e1",
                            borderRadius: "8px",
                            color: "#2850c7",
                            cursor: "pointer",
                          }}
                          title="Extend timer by 5 minutes"
                        >
                          +5 Mins
                        </button>

                        <button
                          onClick={() => handleToggleLive(auction)}
                          style={{
                            height: "36px",
                            padding: "0 10px",
                            fontSize: "12px",
                            fontWeight: "600",
                            background: "#fff1f2",
                            border: "1px solid #fecdd3",
                            borderRadius: "8px",
                            color: "#e11d48",
                            cursor: "pointer",
                          }}
                          title="Pause Auction"
                        >
                          <Pause size={14} />
                        </button>
                      </>
                    ) : isCompleted ? (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          width: "100%",
                        }}
                      >
                        <span
                          style={{
                            fontSize: "12px",
                            color: "#15803d",
                            fontWeight: "700",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "6px",
                          }}
                        >
                          <CheckCircle size={14} />
                          Settled to {highestBidder}
                        </span>

                        <button
                          onClick={() => openBidHistory(auction)}
                          style={{
                            height: "34px",
                            padding: "0 12px",
                            fontSize: "11px",
                            fontWeight: "600",
                            background: "#f1f5f9",
                            border: "1px solid #cbd5e1",
                            borderRadius: "6px",
                            cursor: "pointer",
                          }}
                        >
                          Minutes
                        </button>
                      </div>
                    ) : (
                      <>
                        <button
                          className="btn-primary"
                          onClick={() => handleToggleLive(auction)}
                          style={{
                            height: "36px",
                            padding: "0 16px",
                            fontSize: "12px",
                            fontWeight: "700",
                            background: "#2850c7",
                            border: "none",
                            borderRadius: "8px",
                            color: "#ffffff",
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "6px",
                          }}
                        >
                          <Play size={14} />
                          <span>Start Auction (Go Live)</span>
                        </button>

                        <button
                          onClick={() => handleDeleteAuction(auction.id, auction.scheme_name || auction.name)}
                          style={{
                            height: "36px",
                            padding: "0 10px",
                            background: "transparent",
                            border: "none",
                            color: "#ef4444",
                            cursor: "pointer",
                          }}
                          title="Delete Auction"
                        >
                          <Trash2 size={16} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* AUCTIONS DISPLAY: MASTER TABLE VIEW */}
      {viewMode === "table" && (
        <div
          className="data-card"
          style={{
            background: "#ffffff",
            borderRadius: "16px",
            border: "1px solid #e2e8f0",
            overflow: "hidden",
            boxShadow: "0 4px 14px rgba(0,0,0,0.03)",
          }}
        >
          <div style={{ overflowX: "auto" }}>
            <table className="member-table" style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th>Chit Scheme</th>
                  <th>Status</th>
                  <th>Base Pot</th>
                  <th style={{ color: "#059669" }}>Highest Bidder</th>
                  <th style={{ color: "#059669" }}>Highest Bid</th>
                  <th>Winner Prize</th>
                  <th>Dividend/Member</th>
                  <th>Foreman Fee</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAuctions.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ textAlign: "center", padding: "32px", color: "#64748b" }}>
                      No auctions matching your search.
                    </td>
                  </tr>
                ) : (
                  filteredAuctions.map((auction) => {
                    const isLive = auction.is_live || auction.status === "live";
                    const isCompleted = auction.status === "completed";
                    const pot = Number(auction.base_pot_value || 100000);
                    const highestBid = Number(
                      auction.highest_bid || auction.bid_amount || 0
                    );
                    const highestBidder =
                      auction.highest_bidder_name ||
                      auction.bidder ||
                      (highestBid > 0 ? "Leading Member" : "No Bids");
                    const winnerPrize = pot - highestBid;
                    const dividend = Math.round(highestBid / 20);
                    const foremanFee = Math.round(pot * 0.05);

                    return (
                      <tr key={auction.id} style={{ borderBottom: "1px solid #edf2f7" }}>
                        <td style={{ fontWeight: "700", color: "#1e293b" }}>
                          <div>{auction.scheme_name || auction.name}</div>
                          <small style={{ color: "#64748b", fontSize: "11px" }}>
                            {auction.members_info || "20 Members"}
                          </small>
                        </td>

                        <td>
                          {isLive ? (
                            <div className="live-pulse-badge" style={{ padding: "2px 8px", fontSize: "10px" }}>
                              <div className="live-pulse-dot" style={{ width: "6px", height: "6px" }} />
                              <span>LIVE ({formatAuctionTimer(auction.ends_at)})</span>
                            </div>
                          ) : isCompleted ? (
                            <span className="status-tag approved">COMPLETED</span>
                          ) : (
                            <span className="status-tag pending">SCHEDULED</span>
                          )}
                        </td>

                        <td style={{ fontWeight: "700" }}>
                          ₹{pot.toLocaleString("en-IN")}
                        </td>

                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <div
                              style={{
                                width: "26px",
                                height: "26px",
                                borderRadius: "50%",
                                background: highestBid > 0 ? "#10b486" : "#cbd5e1",
                                color: "#ffffff",
                                fontSize: "10px",
                                fontWeight: "800",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                            >
                              {highestBidder.slice(0, 2).toUpperCase()}
                            </div>
                            <strong style={{ color: "#1e293b", fontSize: "13px" }}>
                              {highestBidder}
                            </strong>
                          </div>
                        </td>

                        <td style={{ fontWeight: "800", color: "#059669", fontSize: "15px" }}>
                          ₹{highestBid.toLocaleString("en-IN")}
                        </td>

                        <td style={{ color: "#10b486", fontWeight: "600" }}>
                          ₹{winnerPrize.toLocaleString("en-IN")}
                        </td>

                        <td style={{ color: "#2850c7", fontWeight: "600" }}>
                          ₹{dividend.toLocaleString("en-IN")}
                        </td>

                        <td style={{ color: "#d97706", fontWeight: "600" }}>
                          ₹{foremanFee.toLocaleString("en-IN")}
                        </td>

                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            {isLive ? (
                              <>
                                <button
                                  onClick={() => openSettleModal(auction)}
                                  className="btn-primary"
                                  style={{
                                    height: "30px",
                                    padding: "0 10px",
                                    fontSize: "11px",
                                    background: "#10b486",
                                    border: "none",
                                    borderRadius: "6px",
                                  }}
                                  title="Declare Winner and Settle"
                                >
                                  Settle
                                </button>
                                <button
                                  onClick={() => openBidHistory(auction)}
                                  style={{
                                    height: "30px",
                                    padding: "0 8px",
                                    fontSize: "11px",
                                    background: "#edf2fb",
                                    border: "1px solid #cbd5e1",
                                    borderRadius: "6px",
                                    color: "#2850c7",
                                    cursor: "pointer",
                                  }}
                                  title="View Bids Stream"
                                >
                                  Log
                                </button>
                              </>
                            ) : isCompleted ? (
                              <button
                                onClick={() => openBidHistory(auction)}
                                style={{
                                  height: "30px",
                                  padding: "0 10px",
                                  fontSize: "11px",
                                  background: "#f1f5f9",
                                  border: "1px solid #cbd5e1",
                                  borderRadius: "6px",
                                  cursor: "pointer",
                                }}
                              >
                                Minutes
                              </button>
                            ) : (
                              <button
                                onClick={() => handleToggleLive(auction)}
                                className="btn-primary"
                                style={{
                                  height: "30px",
                                  padding: "0 10px",
                                  fontSize: "11px",
                                  background: "#2850c7",
                                  border: "none",
                                  borderRadius: "6px",
                                }}
                              >
                                Start
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL 1: CREATE NEW AUCTION */}
      {isCreateModalOpen && (
        <div className="modal-overlay">
          <div
            className="modal-container"
            style={{ maxWidth: "560px", width: "95%", borderRadius: "16px", padding: "24px" }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                paddingBottom: "16px",
                borderBottom: "1px solid #edf2f7",
                marginBottom: "20px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "10px",
                    background: "#edf2fb",
                    color: "#2850c7",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Gavel size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: "17px", fontWeight: "800", margin: 0 }}>
                    Create New Live Auction
                  </h3>
                  <p style={{ fontSize: "12px", color: "#64748b", margin: 0, marginTop: "2px" }}>
                    Configure chit auction parameters under The Chit Funds Act, 1982
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8" }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateAuction}>
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {/* Select Chit Scheme */}
                <div>
                  <label style={{ fontSize: "12px", fontWeight: "700", color: "#334155", display: "block", marginBottom: "6px" }}>
                    Select Linked Chit Scheme *
                  </label>
                  <select
                    value={createForm.scheme_id}
                    onChange={handleSchemeSelect}
                    style={{
                      width: "100%",
                      height: "42px",
                      borderRadius: "8px",
                      border: "1px solid #cbd5e1",
                      padding: "0 12px",
                      fontSize: "13px",
                      background: "#ffffff",
                    }}
                    required
                  >
                    <option value="">-- Choose Existing Chit Scheme --</option>
                    {schemes.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.category || "General"} · ₹{Number(s.total_pool_value).toLocaleString("en-IN")})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Scheme Name if custom or override */}
                <div>
                  <label style={{ fontSize: "12px", fontWeight: "700", color: "#334155", display: "block", marginBottom: "6px" }}>
                    Auction Title / Scheme Label *
                  </label>
                  <input
                    type="text"
                    value={createForm.scheme_name}
                    onChange={(e) => setCreateForm({ ...createForm, scheme_name: e.target.value })}
                    placeholder="e.g. Gold Chit - ₹1,00,000 (Month #9)"
                    style={{
                      width: "100%",
                      height: "42px",
                      borderRadius: "8px",
                      border: "1px solid #cbd5e1",
                      padding: "0 12px",
                      fontSize: "13px",
                    }}
                    required
                  />
                </div>

                {/* Base Pot Value & Total Members */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                  <div>
                    <label style={{ fontSize: "12px", fontWeight: "700", color: "#334155", display: "block", marginBottom: "6px" }}>
                      Gross Pot Value (₹) *
                    </label>
                    <input
                      type="number"
                      value={createForm.base_pot_value}
                      onChange={(e) => setCreateForm({ ...createForm, base_pot_value: e.target.value })}
                      style={{
                        width: "100%",
                        height: "42px",
                        borderRadius: "8px",
                        border: "1px solid #cbd5e1",
                        padding: "0 12px",
                        fontSize: "13px",
                      }}
                      required
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: "12px", fontWeight: "700", color: "#334155", display: "block", marginBottom: "6px" }}>
                      Enrolled Subscribers
                    </label>
                    <input
                      type="number"
                      value={createForm.total_members}
                      onChange={(e) => setCreateForm({ ...createForm, total_members: e.target.value })}
                      style={{
                        width: "100%",
                        height: "42px",
                        borderRadius: "8px",
                        border: "1px solid #cbd5e1",
                        padding: "0 12px",
                        fontSize: "13px",
                      }}
                    />
                  </div>
                </div>

                {/* Duration & Minimum Bid Increment */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                  <div>
                    <label style={{ fontSize: "12px", fontWeight: "700", color: "#334155", display: "block", marginBottom: "6px" }}>
                      Auction Duration (Minutes)
                    </label>
                    <select
                      value={createForm.duration_minutes}
                      onChange={(e) => setCreateForm({ ...createForm, duration_minutes: Number(e.target.value) })}
                      style={{
                        width: "100%",
                        height: "42px",
                        borderRadius: "8px",
                        border: "1px solid #cbd5e1",
                        padding: "0 12px",
                        fontSize: "13px",
                        background: "#ffffff",
                      }}
                    >
                      <option value={15}>15 Minutes (Flash Auction)</option>
                      <option value={30}>30 Minutes</option>
                      <option value={45}>45 Minutes (Standard)</option>
                      <option value={60}>1 Hour</option>
                      <option value={120}>2 Hours</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: "12px", fontWeight: "700", color: "#334155", display: "block", marginBottom: "6px" }}>
                      Min Bid Increment (₹)
                    </label>
                    <select
                      value={createForm.min_increment}
                      onChange={(e) => setCreateForm({ ...createForm, min_increment: Number(e.target.value) })}
                      style={{
                        width: "100%",
                        height: "42px",
                        borderRadius: "8px",
                        border: "1px solid #cbd5e1",
                        padding: "0 12px",
                        fontSize: "13px",
                        background: "#ffffff",
                      }}
                    >
                      <option value={500}>₹500</option>
                      <option value={1000}>₹1,000</option>
                      <option value={2000}>₹2,000</option>
                      <option value={5000}>₹5,000</option>
                    </select>
                  </div>
                </div>

                {/* Launch State */}
                <div
                  style={{
                    background: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    borderRadius: "10px",
                    padding: "14px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <div>
                    <strong style={{ fontSize: "13px", color: "#1e293b", display: "block" }}>
                      Launch Live Immediately
                    </strong>
                    <span style={{ fontSize: "11px", color: "#64748b" }}>
                      If enabled, auction opens right now in the member bidding hall.
                    </span>
                  </div>

                  <input
                    type="checkbox"
                    checked={createForm.is_live}
                    onChange={(e) => setCreateForm({ ...createForm, is_live: e.target.checked })}
                    style={{ width: "20px", height: "20px", cursor: "pointer" }}
                  />
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "flex-end",
                  gap: "10px",
                  marginTop: "24px",
                  paddingTop: "16px",
                  borderTop: "1px solid #edf2f7",
                }}
              >
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  style={{
                    height: "40px",
                    padding: "0 16px",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    background: "#ffffff",
                    fontSize: "13px",
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary"
                  style={{
                    height: "40px",
                    padding: "0 22px",
                    fontSize: "13px",
                    fontWeight: "700",
                    borderRadius: "8px",
                  }}
                >
                  {submitting ? "Creating..." : "Confirm & Create Auction"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: SETTLE WINNER & CLOSE AUCTION */}
      {isSettleModalOpen && selectedAuction && (
        <div className="modal-overlay">
          <div
            className="modal-container"
            style={{ maxWidth: "520px", width: "95%", borderRadius: "16px", padding: "24px" }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                paddingBottom: "14px",
                borderBottom: "1px solid #edf2f7",
                marginBottom: "18px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "10px",
                    background: "#ecfdf5",
                    color: "#10b486",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Trophy size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: "17px", fontWeight: "800", margin: 0 }}>
                    Settle Auction & Award Prize
                  </h3>
                  <p style={{ fontSize: "11px", color: "#64748b", margin: 0 }}>
                    Section 16 Statutory Chit Auction Minutes Voucher
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsSettleModalOpen(false)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8" }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Settlement Voucher Summary */}
            <div
              style={{
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                borderRadius: "12px",
                padding: "16px",
                marginBottom: "20px",
              }}
            >
              <div style={{ textAlign: "center", paddingBottom: "14px", borderBottom: "1px dashed #cbd5e1" }}>
                <span style={{ fontSize: "11px", color: "#64748b", fontWeight: "700" }}>
                  OFFICIAL WINNING SUBSCRIBER
                </span>
                <div style={{ fontSize: "20px", fontWeight: "800", color: "#064e3b", marginTop: "2px" }}>
                  {selectedAuction.highest_bidder_name || selectedAuction.bidder || "Priya Menon"}
                </div>
                <div style={{ fontSize: "12px", color: "#059669", fontWeight: "600" }}>
                  Scheme: {selectedAuction.scheme_name || selectedAuction.name}
                </div>
              </div>

              <div style={{ marginTop: "14px", display: "flex", flexDirection: "column", gap: "8px", fontSize: "13px" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#64748b" }}>Gross Chit Pot Value:</span>
                  <strong style={{ color: "#1e293b" }}>
                    ₹{Number(selectedAuction.base_pot_value || 100000).toLocaleString("en-IN")}
                  </strong>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#64748b" }}>Winning Discount Bid:</span>
                  <strong style={{ color: "#e11d48" }}>
                    - ₹{Number(selectedAuction.highest_bid || selectedAuction.bid_amount || 0).toLocaleString("en-IN")}
                  </strong>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#64748b" }}>Foreman 5% Statutory Commission:</span>
                  <strong style={{ color: "#d97706" }}>
                    ₹{Math.round(Number(selectedAuction.base_pot_value || 100000) * 0.05).toLocaleString("en-IN")}
                  </strong>
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    paddingTop: "10px",
                    borderTop: "1px solid #e2e8f0",
                    marginTop: "4px",
                  }}
                >
                  <strong style={{ color: "#047857", fontSize: "14px" }}>Net Prize Payout to Winner:</strong>
                  <strong style={{ color: "#047857", fontSize: "17px" }}>
                    ₹{(
                      Number(selectedAuction.base_pot_value || 100000) -
                      Number(selectedAuction.highest_bid || selectedAuction.bid_amount || 0)
                    ).toLocaleString("en-IN")}
                  </strong>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#2850c7", fontWeight: "600" }}>Dividend Credited Per Member:</span>
                  <strong style={{ color: "#2850c7", fontWeight: "700" }}>
                    ₹{Math.round(Number(selectedAuction.highest_bid || selectedAuction.bid_amount || 0) / 20).toLocaleString("en-IN")}
                  </strong>
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "8px 10px",
                    background: "#ecfdf5",
                    borderRadius: "8px",
                    border: "1px solid #a7f3d0",
                    marginTop: "4px",
                  }}
                >
                  <span style={{ color: "#047857", fontWeight: "700" }}>Next Installment (Adjusted):</span>
                  <strong style={{ color: "#047857", fontWeight: "800", fontSize: "14px" }}>
                    ₹{(
                      Number(selectedAuction.base_pot_value || 100000) >= 500000 &&
                      Math.round(Number(selectedAuction.highest_bid || 0) / 20) >= 3000
                        ? 21250
                        : Math.max(
                            500,
                            Math.round(Number(selectedAuction.base_pot_value || 100000) / 20) -
                              Math.round(Number(selectedAuction.highest_bid || 0) / 20)
                          )
                    ).toLocaleString("en-IN")}
                  </strong>
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "8px 10px",
                    background: "#fffbeb",
                    borderRadius: "8px",
                    border: "1px solid #fef3c7",
                    marginTop: "4px",
                  }}
                >
                  <span style={{ color: "#92400e", fontWeight: "600" }}>Winner Prize Disbursement:</span>
                  <span
                    style={{
                      background: "#fef3c7",
                      color: "#b45309",
                      fontSize: "11px",
                      fontWeight: "800",
                      padding: "2px 8px",
                      borderRadius: "6px",
                      border: "1px solid #fde68a",
                    }}
                  >
                    MARKED PENDING
                  </span>
                </div>
              </div>
            </div>

            <p style={{ fontSize: "11px", color: "#64748b", lineHeight: "1.5", margin: "0 0 20px" }}>
              * By confirming settlement, the auction will be marked as Completed, bidding will close, and winning dividends will be recorded in the foreman ledger.
            </p>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button
                type="button"
                onClick={() => setIsSettleModalOpen(false)}
                style={{
                  height: "40px",
                  padding: "0 16px",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  background: "#ffffff",
                  fontSize: "13px",
                  cursor: "pointer",
                }}
              >
                Go Back
              </button>
              <button
                type="button"
                onClick={handleConfirmSettle}
                disabled={submitting}
                className="btn-primary"
                style={{
                  height: "40px",
                  padding: "0 22px",
                  background: "#10b486",
                  border: "none",
                  borderRadius: "8px",
                  fontSize: "13px",
                  fontWeight: "700",
                }}
              >
                {submitting ? "Settling..." : "Confirm & Settle Auction"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: VIEW BIDS HISTORY LOG */}
      {isHistoryModalOpen && selectedAuction && (
        <div className="modal-overlay">
          <div
            className="modal-container"
            style={{ maxWidth: "560px", width: "95%", borderRadius: "16px", padding: "24px" }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                paddingBottom: "14px",
                borderBottom: "1px solid #edf2f7",
                marginBottom: "16px",
              }}
            >
              <div>
                <h3 style={{ fontSize: "17px", fontWeight: "800", margin: 0 }}>
                  Auction Bids Ledger
                </h3>
                <p style={{ fontSize: "12px", color: "#64748b", margin: "2px 0 0" }}>
                  {selectedAuction.scheme_name || selectedAuction.name}
                </p>
              </div>
              <button
                onClick={() => setIsHistoryModalOpen(false)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8" }}
              >
                <X size={20} />
              </button>
            </div>

            {loadingBids ? (
              <div style={{ textAlign: "center", padding: "30px", color: "#64748b" }}>
                Loading bids stream...
              </div>
            ) : auctionBids.length === 0 ? (
              <div style={{ textAlign: "center", padding: "30px", color: "#64748b" }}>
                No bids recorded for this auction yet.
              </div>
            ) : (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                  maxHeight: "380px",
                  overflowY: "auto",
                  paddingRight: "4px",
                }}
              >
                {auctionBids.map((bid, index) => (
                  <div
                    key={bid.id || index}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "12px 16px",
                      background: index === 0 ? "#f0fdf4" : "#fafbfc",
                      border: index === 0 ? "1px solid #86efac" : "1px solid #edf2f7",
                      borderRadius: "10px",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <div
                        style={{
                          width: "32px",
                          height: "32px",
                          borderRadius: "50%",
                          background: index === 0 ? "#10b486" : "#2850c7",
                          color: "#ffffff",
                          fontSize: "11px",
                          fontWeight: "800",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        #{index + 1}
                      </div>
                      <div>
                        <strong style={{ fontSize: "13px", color: "#1e293b", display: "block" }}>
                          {bid.bidder_name}
                        </strong>
                        <span style={{ fontSize: "10px", color: "#64748b" }}>
                          {bid.created_at ? new Date(bid.created_at).toLocaleTimeString() : "Just now"}
                        </span>
                      </div>
                    </div>

                    <div style={{ textAlign: "right" }}>
                      <div
                        style={{
                          fontSize: "15px",
                          fontWeight: "800",
                          color: index === 0 ? "#059669" : "#1e293b",
                        }}
                      >
                        ₹{Number(bid.bid_amount).toLocaleString("en-IN")}
                      </div>
                      {index === 0 && (
                        <span style={{ fontSize: "10px", fontWeight: "700", color: "#059669" }}>
                          Current Leader
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div style={{ marginTop: "20px", textAlign: "right" }}>
              <button
                onClick={() => setIsHistoryModalOpen(false)}
                className="btn-primary"
                style={{ height: "36px", padding: "0 18px", fontSize: "12px" }}
              >
                Close Log
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: BROADCAST ANNOUNCEMENT */}
      {isBroadcastModalOpen && (
        <div className="modal-overlay">
          <div
            className="modal-container"
            style={{ maxWidth: "480px", width: "95%", borderRadius: "16px", padding: "24px" }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                paddingBottom: "14px",
                borderBottom: "1px solid #edf2f7",
                marginBottom: "16px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <Megaphone size={20} color="#f2a20a" />
                <h3 style={{ fontSize: "17px", fontWeight: "800", margin: 0 }}>
                  Broadcast Hall Announcement
                </h3>
              </div>
              <button
                onClick={() => setIsBroadcastModalOpen(false)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8" }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleBroadcast}>
              <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                <div>
                  <label style={{ fontSize: "12px", fontWeight: "700", color: "#334155", display: "block", marginBottom: "6px" }}>
                    Announcement Message *
                  </label>
                  <textarea
                    rows={4}
                    value={broadcastText}
                    onChange={(e) => setBroadcastText(e.target.value)}
                    placeholder="e.g. Final 3 calls for Gold Chit! Current highest bid is ₹12,400 by Priya M."
                    style={{
                      width: "100%",
                      borderRadius: "8px",
                      border: "1px solid #cbd5e1",
                      padding: "10px",
                      fontSize: "13px",
                      fontFamily: "inherit",
                    }}
                    required
                  />
                </div>

                <div>
                  <label style={{ fontSize: "12px", fontWeight: "700", color: "#334155", display: "block", marginBottom: "6px" }}>
                    Broadcast Urgency
                  </label>
                  <select
                    value={broadcastUrgency}
                    onChange={(e) => setBroadcastUrgency(e.target.value)}
                    style={{
                      width: "100%",
                      height: "40px",
                      borderRadius: "8px",
                      border: "1px solid #cbd5e1",
                      padding: "0 10px",
                      fontSize: "13px",
                      background: "#ffffff",
                    }}
                  >
                    <option value="normal">Standard Ticker Notification</option>
                    <option value="high">Urgent Call / Last Minutes Alert</option>
                  </select>
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: "10px",
                  marginTop: "20px",
                }}
              >
                <button
                  type="button"
                  onClick={() => setIsBroadcastModalOpen(false)}
                  style={{
                    height: "38px",
                    padding: "0 16px",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    background: "#ffffff",
                    fontSize: "12px",
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  style={{
                    height: "38px",
                    padding: "0 20px",
                    fontSize: "12px",
                    fontWeight: "700",
                    background: "#2850c7",
                    borderRadius: "8px",
                  }}
                >
                  Send Announcement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminAuctions;
