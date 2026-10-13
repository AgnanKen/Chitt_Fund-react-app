import { createClient } from "@supabase/supabase-js";

// Read environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Clean any leftover demo query params from the browser address bar
if (typeof window !== "undefined") {
  try {
    const url = new URL(window.location.href);
    if (url.searchParams.has("mock") || url.searchParams.has("demo")) {
      url.searchParams.delete("mock");
      url.searchParams.delete("demo");
      window.history.replaceState({}, "", url.pathname + (url.search ? "?" + url.searchParams.toString() : ""));
    }
    window.localStorage?.removeItem("ledgerone_mode");
    window.localStorage?.removeItem("ledgerone_demo_mode");
  } catch {
    // ignore
  }
}

// Check if credentials are set
export const isSupabaseConfigured = () => {
  return Boolean(
    supabaseUrl &&
    supabaseAnonKey &&
    supabaseUrl.startsWith("http") &&
    !supabaseUrl.includes("your-project-ref")
  );
};

// Initialize live Supabase client
const validUrl =
  supabaseUrl && supabaseUrl.startsWith("http") && !supabaseUrl.includes("your-project-ref")
    ? supabaseUrl
    : "https://placeholder-domain.supabase.co";

const validKey = supabaseAnonKey || "placeholder-anon-key";

export const supabase = createClient(validUrl, validKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

// ====================================================================
// FALLBACK SEED DATA (Used when Supabase credentials are not yet configured)
// ====================================================================

export const SEED_MEMBERS = [
  {
    id: "b1000000-0000-0000-0000-000000000001",
    full_name: "Priya Menon",
    email: "priya.menon@example.com",
    phone: "+91 98450 12345",
    kyc_status: "Approved",
    role: "Member",
    avatar_initials: "PM",
    total_invested: 150000,
    chits_enrolled: 2,
    address: "Kochi, Kerala",
    created_at: new Date(Date.now() - 3600000 * 24 * 60).toISOString(),
  },
  {
    id: "b1000000-0000-0000-0000-000000000002",
    full_name: "Amit Verma",
    email: "amit.verma@example.com",
    phone: "+91 97110 54321",
    kyc_status: "Pending",
    role: "Member",
    avatar_initials: "AV",
    total_invested: 50000,
    chits_enrolled: 1,
    address: "Bengaluru, Karnataka",
    created_at: new Date(Date.now() - 3600000 * 24 * 15).toISOString(),
  },
  {
    id: "b1000000-0000-0000-0000-000000000003",
    full_name: "Lakshmi Nair",
    email: "lakshmi.n@example.com",
    phone: "+91 94470 67890",
    kyc_status: "Approved",
    role: "Member",
    avatar_initials: "LN",
    total_invested: 75000,
    chits_enrolled: 2,
    address: "Thiruvananthapuram, Kerala",
    created_at: new Date(Date.now() - 3600000 * 24 * 40).toISOString(),
  },
  {
    id: "b1000000-0000-0000-0000-000000000004",
    full_name: "Rajesh Kumar",
    email: "rajesh.k@example.com",
    phone: "+91 98200 11223",
    kyc_status: "Rejected",
    role: "Member",
    avatar_initials: "RK",
    total_invested: 120000,
    chits_enrolled: 1,
    address: "Chennai, Tamil Nadu",
    created_at: new Date(Date.now() - 3600000 * 24 * 30).toISOString(),
  },
  {
    id: "b1000000-0000-0000-0000-000000000005",
    full_name: "Sunita Rao",
    email: "sunita.rao@example.com",
    phone: "+91 99000 88776",
    kyc_status: "Approved",
    role: "Member",
    avatar_initials: "SR",
    total_invested: 200000,
    chits_enrolled: 3,
    address: "Hyderabad, Telangana",
    created_at: new Date(Date.now() - 3600000 * 24 * 90).toISOString(),
  },
  {
    id: "b1000000-0000-0000-0000-000000000006",
    full_name: "Vikram Singh",
    email: "vikram.singh@example.com",
    phone: "+91 98100 44556",
    kyc_status: "Pending",
    role: "Member",
    avatar_initials: "VS",
    total_invested: 180000,
    chits_enrolled: 2,
    address: "Mumbai, Maharashtra",
    created_at: new Date(Date.now() - 3600000 * 24 * 5).toISOString(),
  },
];

export const SEED_SCHEMES = [
  {
    id: "c1000000-0000-0000-0000-000000000001",
    name: "Gold Chit - 1L",
    category: "Gold Tier",
    total_pool_value: 100000,
    monthly_installment: 5000,
    total_months: 20,
    current_month: 8,
    total_members: 20,
    enrolled_members: 18,
    status: "Active",
    start_date: "2025-06-01",
    description: "Flagship 20-month monthly chit fund for gold tier investors.",
  },
  {
    id: "c1000000-0000-0000-0000-000000000002",
    name: "Silver Chit - 50K",
    category: "Silver Tier",
    total_pool_value: 50000,
    monthly_installment: 2500,
    total_months: 20,
    current_month: 12,
    total_members: 20,
    enrolled_members: 20,
    status: "Active",
    start_date: "2025-02-01",
    description: "Popular savings scheme for medium term goals.",
  },
  {
    id: "c1000000-0000-0000-0000-000000000003",
    name: "Platinum Chit - 2L",
    category: "Platinum Tier",
    total_pool_value: 200000,
    monthly_installment: 10000,
    total_months: 20,
    current_month: 4,
    total_members: 20,
    enrolled_members: 19,
    status: "Active",
    start_date: "2025-10-01",
    description: "High-yield investment pool with maximum dividend distribution.",
  },
  {
    id: "c1000000-0000-0000-0000-000000000004",
    name: "Diamond Wealth - 5L",
    category: "Diamond Tier",
    total_pool_value: 500000,
    monthly_installment: 20000,
    total_months: 25,
    current_month: 1,
    total_members: 25,
    enrolled_members: 12,
    status: "Upcoming",
    start_date: "2026-04-01",
    description: "Premium enterprise-grade chit scheme opening next month.",
  },
  {
    id: "c1000000-0000-0000-0000-000000000005",
    name: "Micro Starter - 25K",
    category: "Micro Tier",
    total_pool_value: 25000,
    monthly_installment: 1250,
    total_months: 20,
    current_month: 20,
    total_members: 20,
    enrolled_members: 20,
    status: "Completed",
    start_date: "2024-05-01",
    description: "Successfully closed community micro-chit.",
  },
];

export const SEED_AUCTIONS = [
  {
    id: "a1000000-0000-0000-0000-000000000001",
    scheme_id: "c1000000-0000-0000-0000-000000000001",
    name: "Gold Chit - ₹1,00,000",
    scheme_name: "Gold Chit - ₹1,00,000",
    members: "20 members · 18 enrolled",
    time: "00:47:22",
    bid: "₹12,400",
    bid_amount: 12400,
    bidder: "Priya M.",
    highest_bidder_name: "Priya M.",
    value: "₹87,600",
    base_pot_value: 100000,
    participation: "90%",
    participation_pct: 90,
    live: true,
    is_live: true,
    status: "live",
  },
  {
    id: "a1000000-0000-0000-0000-000000000002",
    scheme_id: "c1000000-0000-0000-0000-000000000002",
    name: "Silver Chit - ₹50,000",
    scheme_name: "Silver Chit - ₹50,000",
    members: "15 members · 15 enrolled",
    time: "02:12:05",
    bid: "₹6,800",
    bid_amount: 6800,
    bidder: "Amit V.",
    highest_bidder_name: "Amit V.",
    value: "₹43,200",
    base_pot_value: 50000,
    participation: "100%",
    participation_pct: 100,
    live: false,
    is_live: false,
    status: "scheduled",
  },
];

export const SEED_PAYMENTS = [
  {
    id: "p1000000-0000-0000-0000-000000000001",
    member_name: "Priya Menon",
    member_initials: "PM",
    scheme_name: "Gold Chit - 50K",
    amount: 5000,
    formatted_amount: "₹5,000",
    payment_type: "Installment",
    payment_method: "UPI",
    reference_id: "UPI/2026/894710",
    status: "Approved",
    date: "Today, 9:42 AM",
    created_at: new Date(Date.now() - 7200000).toISOString(),
  },
  {
    id: "p1000000-0000-0000-0000-000000000002",
    member_name: "Amit Verma",
    member_initials: "AV",
    scheme_name: "Silver Chit - 50K",
    amount: 2500,
    formatted_amount: "₹2,500",
    payment_type: "KYC Fee",
    payment_method: "UPI",
    reference_id: "UPI/2026/334412",
    status: "Pending",
    date: "Today, 8:15 AM",
    created_at: new Date(Date.now() - 11000000).toISOString(),
  },
  {
    id: "p1000000-0000-0000-0000-000000000003",
    member_name: "Lakshmi Nair",
    member_initials: "LN",
    scheme_name: "Silver Chit - 25K",
    amount: 2500,
    formatted_amount: "₹2,500",
    payment_type: "Installment",
    payment_method: "Bank Transfer",
    reference_id: "NEFT/5548912",
    status: "Approved",
    date: "Yesterday",
    created_at: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: "p1000000-0000-0000-0000-000000000004",
    member_name: "Rajesh Kumar",
    member_initials: "RK",
    scheme_name: "Gold Chit - 1L",
    amount: 10000,
    formatted_amount: "₹10,000",
    payment_type: "Installment",
    payment_method: "UPI",
    reference_id: "UPI/2026/102948",
    status: "Rejected",
    date: "Yesterday",
    created_at: new Date(Date.now() - 90000000).toISOString(),
  },
  {
    id: "p1000000-0000-0000-0000-000000000005",
    member_name: "Vikram Singh",
    member_initials: "VS",
    scheme_name: "Platinum Chit - 2L",
    amount: 20000,
    formatted_amount: "₹20,000",
    payment_type: "Installment",
    payment_method: "UPI",
    reference_id: "UPI/2026/778899",
    status: "Pending",
    date: "2 days ago",
    created_at: new Date(Date.now() - 172800000).toISOString(),
  },
];

export const SEED_ACTIVITIES = [
  {
    id: "act-1",
    name: "Priya Menon",
    initials: "PM",
    type: "Payment",
    scheme: "Gold Chit - 50K",
    amount: "₹5,000",
    status: "Approved",
    date: "Today, 9:42 AM",
  },
  {
    id: "act-2",
    name: "Amit Verma",
    initials: "AV",
    type: "KYC",
    scheme: "—",
    amount: "—",
    status: "Pending",
    date: "Today, 8:15 AM",
  },
  {
    id: "act-3",
    name: "Lakshmi Nair",
    initials: "LN",
    type: "Payment",
    scheme: "Silver Chit - 25K",
    amount: "₹2,500",
    status: "Approved",
    date: "Yesterday",
  },
  {
    id: "act-4",
    name: "Rajesh Kumar",
    initials: "RK",
    type: "Payment",
    scheme: "Gold Chit - 1L",
    amount: "₹10,000",
    status: "Rejected",
    date: "Yesterday",
  },
  {
    id: "act-5",
    name: "Sunita Rao",
    initials: "SR",
    type: "KYC",
    scheme: "—",
    amount: "—",
    status: "Approved",
    date: "2 days ago",
  },
  {
    id: "act-6",
    name: "Vikram Singh",
    initials: "VS",
    type: "Payment",
    scheme: "Platinum Chit - 2L",
    amount: "₹20,000",
    status: "Pending",
    date: "2 days ago",
  },
];
