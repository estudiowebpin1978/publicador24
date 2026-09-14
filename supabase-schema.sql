-- Create tables for Publicador24 in Supabase
-- Does NOT affect Convex data (safe migration)

-- Projects table
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  website VARCHAR(255),
  status VARCHAR(50) DEFAULT 'ACTIVE',
  campaign_count INTEGER DEFAULT 0,
  created_at BIGINT DEFAULT extract(epoch from now()) * 1000
);

-- Campaigns table
CREATE TABLE IF NOT EXISTS campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  idea TEXT,
  objective TEXT,
  target_audience TEXT,
  pain_points TEXT,
  desires TEXT,
  value_proposition TEXT,
  funnel_stage VARCHAR(100),
  platforms TEXT[],
  style VARCHAR(100),
  offer TEXT,
  url VARCHAR(500),
  start_date VARCHAR(20),
  end_date VARCHAR(20),
  budget NUMERIC,
  autopilot_level VARCHAR(50) DEFAULT 'MANUAL',
  status VARCHAR(50) DEFAULT 'DRAFT',
  content_count INTEGER DEFAULT 0,
  published_count INTEGER DEFAULT 0,
  scheduled_count INTEGER DEFAULT 0,
  health_score INTEGER DEFAULT 50,
  created_at BIGINT DEFAULT extract(epoch from now()) * 1000
);

-- Content packs table
CREATE TABLE IF NOT EXISTS content_packs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES campaigns(id),
  name VARCHAR(255),
  total_pieces INTEGER DEFAULT 0,
  generated_pieces INTEGER DEFAULT 0,
  status VARCHAR(50) DEFAULT 'active',
  created_at BIGINT DEFAULT extract(epoch from now()) * 1000
);

-- Content pieces table
CREATE TABLE IF NOT EXISTS content_pieces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_pack_id UUID REFERENCES content_packs(id),
  campaign_id UUID REFERENCES campaigns(id),
  title VARCHAR(500),
  hook TEXT,
  body TEXT,
  cta VARCHAR(255),
  content_type VARCHAR(50) DEFAULT 'post',
  funnel_stage VARCHAR(100) DEFAULT 'interest',
  platform VARCHAR(50),
  hashtags TEXT[],
  keywords TEXT[],
  score INTEGER DEFAULT 0,
  status VARCHAR(50) DEFAULT 'DRAFT',
  scheduled_at BIGINT,
  created_at BIGINT DEFAULT extract(epoch from now()) * 1000,
  updated_at BIGINT DEFAULT extract(epoch from now()) * 1000
);

-- Users/auth table (for real auth)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  salt VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  created_at BIGINT DEFAULT extract(epoch from now()) * 1000
);

-- Analytics/posts table
CREATE TABLE IF NOT EXISTS analytics_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  published_post_id UUID,
  platform VARCHAR(50),
  metrics JSONB,
  collected_at BIGINT DEFAULT extract(epoch from now()) * 1000
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_content_pieces_campaign ON content_pieces(campaign_id);
CREATE INDEX IF NOT EXISTS idx_content_pieces_status ON content_pieces(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_project ON campaigns(project_id);
CREATE INDEX IF NOT EXISTS idx_content_packs_campaign ON content_packs(campaign_id);

-- Insert existing data (optional - for manual migration)
INSERT INTO users (email, password_hash, salt, name, created_at)
SELECT 'test@publicador24.netlify.app', 'testhash123', 'testsalt456', 'Test User', extract(epoch from now()) * 1000
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'test@publicador24.netlify.app');
