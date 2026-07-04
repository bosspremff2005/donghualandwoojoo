-- Migration: 0004_episode_servers
-- Adds multi-server support with SUB/DUB audio type per episode

-- ==================== EPISODE SERVERS TABLE ====================
CREATE TABLE IF NOT EXISTS episode_servers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  episode_id INTEGER NOT NULL,
  server_name TEXT NOT NULL,           -- e.g. 'Artplayer', 'Player', 'Megaplay', 'Vidplay'
  audio_type TEXT NOT NULL DEFAULT 'sub', -- 'sub' or 'dub'
  link_type TEXT NOT NULL DEFAULT 'embed', -- 'embed' or 'direct'
  url TEXT NOT NULL,                   -- the actual embed URL or direct video URL
  sort_order INTEGER DEFAULT 0,        -- for ordering servers in UI
  is_active INTEGER DEFAULT 1,         -- enable/disable individual server
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (episode_id) REFERENCES episodes(id) ON DELETE CASCADE
);

-- ==================== INDEXES ====================
CREATE INDEX IF NOT EXISTS idx_ep_servers_episode_id ON episode_servers(episode_id);
CREATE INDEX IF NOT EXISTS idx_ep_servers_audio_type ON episode_servers(audio_type);
CREATE INDEX IF NOT EXISTS idx_ep_servers_active ON episode_servers(is_active);
