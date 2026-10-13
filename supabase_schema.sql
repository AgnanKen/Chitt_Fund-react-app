-- ====================================================================
-- LEDGERONE CHIT FUND - SUPABASE & POSTGRESQL SCHEMA MIGRATION
-- ====================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Clean up existing tables if recreating
DROP TABLE IF EXISTS bids CASCADE;
DROP TABLE IF EXISTS activities CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS auctions CASCADE;
DROP TABLE IF EXISTS chit_schemes CASCADE;
DROP TABLE IF EXISTS members CASCADE;

-- ====================================================================
-- 2. TABLE DEFINITIONS
-- ====================================================================

-- MEMBERS / USERS TABLE
CREATE TABLE members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name VARCHAR(120) NOT NULL,
    email VARCHAR(160) UNIQUE,
    phone VARCHAR(30),
    kyc_status VARCHAR(20) NOT NULL DEFAULT 'Pending' CHECK (kyc_status IN ('Approved', 'Pending', 'Rejected')),
    role VARCHAR(30) NOT NULL DEFAULT 'Member' CHECK (role IN ('Member', 'Agent', 'Admin')),
    avatar_initials VARCHAR(4),
    total_invested NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    chits_enrolled INT NOT NULL DEFAULT 0,
    address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- CHIT SCHEMES TABLE
CREATE TABLE chit_schemes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    category VARCHAR(50) DEFAULT 'Standard',
    total_pool_value NUMERIC(14, 2) NOT NULL,
    monthly_installment NUMERIC(12, 2) NOT NULL,
    total_months INT NOT NULL,
    current_month INT NOT NULL DEFAULT 1,
    total_members INT NOT NULL,
    enrolled_members INT NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Upcoming', 'Completed')),
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- AUCTIONS TABLE
CREATE TABLE auctions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scheme_id UUID REFERENCES chit_schemes(id) ON DELETE CASCADE,
    scheme_name VARCHAR(100) NOT NULL,
    members_info VARCHAR(100) DEFAULT '20 members · 18 enrolled',
    base_pot_value NUMERIC(14, 2) NOT NULL,
    highest_bid NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    highest_bidder_id UUID REFERENCES members(id) ON DELETE SET NULL,
    highest_bidder_name VARCHAR(120),
    ends_at TIMESTAMPTZ,
    participation_pct INT NOT NULL DEFAULT 0,
    is_live BOOLEAN NOT NULL DEFAULT false,
    status VARCHAR(20) NOT NULL DEFAULT 'live' CHECK (status IN ('live', 'scheduled', 'completed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- BIDS TABLE
CREATE TABLE bids (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auction_id UUID NOT NULL REFERENCES auctions(id) ON DELETE CASCADE,
    member_id UUID REFERENCES members(id) ON DELETE SET NULL,
    bidder_name VARCHAR(120) NOT NULL,
    bid_amount NUMERIC(12, 2) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- PAYMENTS TABLE
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID REFERENCES members(id) ON DELETE SET NULL,
    member_name VARCHAR(120) NOT NULL,
    member_initials VARCHAR(4),
    scheme_id UUID REFERENCES chit_schemes(id) ON DELETE SET NULL,
    scheme_name VARCHAR(100) NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,
    payment_type VARCHAR(30) NOT NULL DEFAULT 'Installment' CHECK (payment_type IN ('Installment', 'KYC Fee', 'Payout', 'Penalty')),
    payment_method VARCHAR(30) NOT NULL DEFAULT 'UPI' CHECK (payment_method IN ('UPI', 'Bank Transfer', 'Cash', 'Card', 'Cheque')),
    reference_id VARCHAR(80),
    status VARCHAR(20) NOT NULL DEFAULT 'Pending' CHECK (status IN ('Approved', 'Pending', 'Rejected')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- AUDIT & ACTIVITIES LOG TABLE
CREATE TABLE activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(120) NOT NULL,
    initials VARCHAR(4),
    type VARCHAR(40) NOT NULL CHECK (type IN ('Payment', 'KYC', 'Auction', 'Scheme')),
    scheme VARCHAR(100) DEFAULT '—',
    amount VARCHAR(40) DEFAULT '—',
    status VARCHAR(20) NOT NULL CHECK (status IN ('Approved', 'Pending', 'Rejected')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ====================================================================
-- 3. TRIGGERS & AUTOMATION
-- ====================================================================

-- Function to auto-update 'updated_at' timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_members_updated_at BEFORE UPDATE ON members FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_chit_schemes_updated_at BEFORE UPDATE ON chit_schemes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_auctions_updated_at BEFORE UPDATE ON auctions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_payments_updated_at BEFORE UPDATE ON payments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to automatically update highest bid in auction when a new bid is inserted
CREATE OR REPLACE FUNCTION handle_new_bid_insert()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE auctions
    SET highest_bid = NEW.bid_amount,
        highest_bidder_name = NEW.bidder_name,
        highest_bidder_id = NEW.member_id,
        updated_at = now()
    WHERE id = NEW.auction_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_bids_after_insert
AFTER INSERT ON bids
FOR EACH ROW
EXECUTE FUNCTION handle_new_bid_insert();

-- Function to auto-log payment actions into activities table
CREATE OR REPLACE FUNCTION log_payment_to_activities()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO activities (name, initials, type, scheme, amount, status, created_at)
    VALUES (
        NEW.member_name,
        COALESCE(NEW.member_initials, UPPER(LEFT(NEW.member_name, 2))),
        'Payment',
        NEW.scheme_name,
        '₹' || to_char(NEW.amount, 'FM9,99,999.00'),
        NEW.status,
        now()
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_payments_log_activity
AFTER INSERT ON payments
FOR EACH ROW
EXECUTE FUNCTION log_payment_to_activities();

-- ====================================================================
-- 4. ROW-LEVEL SECURITY (RLS) POLICIES
-- ====================================================================

ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE chit_schemes ENABLE ROW LEVEL SECURITY;
ALTER TABLE auctions ENABLE ROW LEVEL SECURITY;
ALTER TABLE bids ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;

-- 4.1 SELECT Policies: Public & Authenticated Read Access
CREATE POLICY "Public & Authenticated read members" ON members FOR SELECT USING (true);
CREATE POLICY "Public & Authenticated read chit_schemes" ON chit_schemes FOR SELECT USING (true);
CREATE POLICY "Public & Authenticated read auctions" ON auctions FOR SELECT USING (true);
CREATE POLICY "Public & Authenticated read bids" ON bids FOR SELECT USING (true);
CREATE POLICY "Public & Authenticated read payments" ON payments FOR SELECT USING (true);
CREATE POLICY "Public & Authenticated read activities" ON activities FOR SELECT USING (true);

-- 4.2 INSERT Policies: Allow creating members, placing bids, submitting payments
CREATE POLICY "Allow insert members" ON members FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow insert chit_schemes" ON chit_schemes FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow insert bids" ON bids FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow insert payments" ON payments FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow insert activities" ON activities FOR INSERT WITH CHECK (true);

-- 4.3 UPDATE Policies: Allow updating statuses (KYC approval, payment approval, auction bids)
CREATE POLICY "Allow update members" ON members FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow update chit_schemes" ON chit_schemes FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow update auctions" ON auctions FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow update payments" ON payments FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow update activities" ON activities FOR UPDATE USING (true) WITH CHECK (true);

-- ====================================================================
-- 5. REALTIME REPLICATION CONFIGURATION
-- ====================================================================

-- Set full replica identity for complete payload diffs in Realtime
ALTER TABLE members REPLICA IDENTITY FULL;
ALTER TABLE chit_schemes REPLICA IDENTITY FULL;
ALTER TABLE auctions REPLICA IDENTITY FULL;
ALTER TABLE bids REPLICA IDENTITY FULL;
ALTER TABLE payments REPLICA IDENTITY FULL;
ALTER TABLE activities REPLICA IDENTITY FULL;

-- Add all tables to supabase_realtime publication
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        CREATE PUBLICATION supabase_realtime;
    END IF;
END $$;

ALTER PUBLICATION supabase_realtime ADD TABLE members, chit_schemes, auctions, bids, payments, activities;

-- ====================================================================
-- 6. SEED DATA (INITIAL DATA MATCHING LEDGERONE FRONTEND)
-- ====================================================================

-- Seed Members
INSERT INTO members (id, full_name, email, phone, kyc_status, role, avatar_initials, total_invested, chits_enrolled, address) VALUES
('b1000000-0000-0000-0000-000000000001', 'Priya Menon', 'priya.menon@example.com', '+91 98450 12345', 'Approved', 'Member', 'PM', 150000.00, 2, 'Kochi, Kerala'),
('b1000000-0000-0000-0000-000000000002', 'Amit Verma', 'amit.verma@example.com', '+91 97110 54321', 'Pending', 'Member', 'AV', 50000.00, 1, 'Bengaluru, Karnataka'),
('b1000000-0000-0000-0000-000000000003', 'Lakshmi Nair', 'lakshmi.n@example.com', '+91 94470 67890', 'Approved', 'Member', 'LN', 75000.00, 2, 'Thiruvananthapuram, Kerala'),
('b1000000-0000-0000-0000-000000000004', 'Rajesh Kumar', 'rajesh.k@example.com', '+91 98200 11223', 'Rejected', 'Member', 'RK', 120000.00, 1, 'Chennai, Tamil Nadu'),
('b1000000-0000-0000-0000-000000000005', 'Sunita Rao', 'sunita.rao@example.com', '+91 99000 88776', 'Approved', 'Member', 'SR', 200000.00, 3, 'Hyderabad, Telangana'),
('b1000000-0000-0000-0000-000000000006', 'Vikram Singh', 'vikram.singh@example.com', '+91 98100 44556', 'Pending', 'Member', 'VS', 180000.00, 2, 'Mumbai, Maharashtra');

-- Seed Chit Schemes
INSERT INTO chit_schemes (id, name, category, total_pool_value, monthly_installment, total_months, current_month, total_members, enrolled_members, status, start_date, description) VALUES
('c1000000-0000-0000-0000-000000000001', 'Gold Chit - 1L', 'Gold Tier', 100000.00, 5000.00, 20, 8, 20, 18, 'Active', CURRENT_DATE - INTERVAL '8 months', 'Flagship 20-month monthly chit fund for gold tier investors.'),
('c1000000-0000-0000-0000-000000000002', 'Silver Chit - 50K', 'Silver Tier', 50000.00, 2500.00, 20, 12, 20, 20, 'Active', CURRENT_DATE - INTERVAL '12 months', 'Popular savings scheme for medium term goals.'),
('c1000000-0000-0000-0000-000000000003', 'Platinum Chit - 2L', 'Platinum Tier', 200000.00, 10000.00, 20, 4, 20, 19, 'Active', CURRENT_DATE - INTERVAL '4 months', 'High-yield investment pool with maximum dividend distribution.'),
('c1000000-0000-0000-0000-000000000004', 'Diamond Wealth - 5L', 'Diamond Tier', 500000.00, 20000.00, 25, 1, 25, 12, 'Upcoming', CURRENT_DATE + INTERVAL '10 days', 'Premium enterprise-grade chit scheme opening next month.'),
('c1000000-0000-0000-0000-000000000005', 'Micro Starter - 25K', 'Micro Tier', 25000.00, 1250.00, 20, 20, 20, 20, 'Completed', CURRENT_DATE - INTERVAL '20 months', 'Successfully closed community micro-chit.');

-- Seed Auctions
INSERT INTO auctions (id, scheme_id, scheme_name, members_info, base_pot_value, highest_bid, highest_bidder_id, highest_bidder_name, ends_at, participation_pct, is_live, status) VALUES
('a1000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000001', 'Gold Chit - ₹1,00,000', '20 members · 18 enrolled', 100000.00, 12400.00, 'b1000000-0000-0000-0000-000000000001', 'Priya M.', now() + INTERVAL '47 minutes 22 seconds', 90, true, 'live'),
('a1000000-0000-0000-0000-000000000002', 'c1000000-0000-0000-0000-000000000002', 'Silver Chit - ₹50,000', '15 members · 15 enrolled', 50000.00, 6800.00, 'b1000000-0000-0000-0000-000000000002', 'Amit V.', now() + INTERVAL '2 hours 12 minutes', 100, false, 'live');

-- Seed Bids
INSERT INTO bids (auction_id, member_id, bidder_name, bid_amount, created_at) VALUES
('a1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000006', 'Vikram Singh', 9000.00, now() - INTERVAL '30 minutes'),
('a1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000003', 'Lakshmi Nair', 11000.00, now() - INTERVAL '15 minutes'),
('a1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001', 'Priya M.', 12400.00, now() - INTERVAL '3 minutes'),
('a1000000-0000-0000-0000-000000000002', 'b1000000-0000-0000-0000-000000000002', 'Amit V.', 6800.00, now() - INTERVAL '25 minutes');

-- Seed Payments
INSERT INTO payments (id, member_id, member_name, member_initials, scheme_id, scheme_name, amount, payment_type, payment_method, reference_id, status, created_at) VALUES
('d1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001', 'Priya Menon', 'PM', 'c1000000-0000-0000-0000-000000000001', 'Gold Chit - 50K', 5000.00, 'Installment', 'UPI', 'UPI/2026/894710', 'Approved', now() - INTERVAL '2 hours'),
('d1000000-0000-0000-0000-000000000003', 'b1000000-0000-0000-0000-000000000003', 'Lakshmi Nair', 'LN', 'c1000000-0000-0000-0000-000000000002', 'Silver Chit - 25K', 2500.00, 'Installment', 'Bank Transfer', 'NEFT/5548912', 'Approved', now() - INTERVAL '1 day'),
('d1000000-0000-0000-0000-000000000004', 'b1000000-0000-0000-0000-000000000004', 'Rajesh Kumar', 'RK', 'c1000000-0000-0000-0000-000000000001', 'Gold Chit - 1L', 10000.00, 'Installment', 'UPI', 'UPI/2026/102948', 'Rejected', now() - INTERVAL '1 day'),
('d1000000-0000-0000-0000-000000000006', 'b1000000-0000-0000-0000-000000000006', 'Vikram Singh', 'VS', 'c1000000-0000-0000-0000-000000000003', 'Platinum Chit - 2L', 20000.00, 'Installment', 'UPI', 'UPI/2026/778899', 'Pending', now() - INTERVAL '2 days');

-- Seed Activities
INSERT INTO activities (name, initials, type, scheme, amount, status, created_at) VALUES
('Priya Menon', 'PM', 'Payment', 'Gold Chit - 50K', '₹5,000', 'Approved', now() - INTERVAL '2 hours'),
('Amit Verma', 'AV', 'KYC', '—', '—', 'Pending', now() - INTERVAL '3 hours'),
('Lakshmi Nair', 'LN', 'Payment', 'Silver Chit - 25K', '₹2,500', 'Approved', now() - INTERVAL '1 day'),
('Rajesh Kumar', 'RK', 'Payment', 'Gold Chit - 1L', '₹10,000', 'Rejected', now() - INTERVAL '1 day'),
('Sunita Rao', 'SR', 'KYC', '—', '—', 'Approved', now() - INTERVAL '2 days'),
('Vikram Singh', 'VS', 'Payment', 'Platinum Chit - 2L', '₹20,000', 'Pending', now() - INTERVAL '2 days');
