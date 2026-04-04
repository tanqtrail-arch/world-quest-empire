-- World Quest Empire - Supabase Schema

-- Game results table
CREATE TABLE IF NOT EXISTS game_results (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  player_name TEXT NOT NULL,
  victory_points INT NOT NULL,
  rank INT NOT NULL,
  turns_used INT NOT NULL,
  settlements_count INT NOT NULL DEFAULT 0,
  cities_count INT NOT NULL DEFAULT 0,
  roads_count INT NOT NULL DEFAULT 0,
  difficulty TEXT NOT NULL DEFAULT 'normal',
  player_count INT NOT NULL DEFAULT 3,
  played_at TIMESTAMPTZ DEFAULT now()
);

-- RLS: public read/write (no auth required)
ALTER TABLE game_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert game results"
  ON game_results FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can read game results"
  ON game_results FOR SELECT
  USING (true);

-- Ranking function: aggregate by player_name
-- Points: rank 1 = 10pt, rank 2 = 5pt, rank 3 = 3pt, else = 1pt
CREATE OR REPLACE FUNCTION get_ranking()
RETURNS TABLE (
  player_name TEXT,
  total_points BIGINT,
  wins BIGINT,
  games BIGINT,
  max_vp INT
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    gr.player_name,
    SUM(
      CASE gr.rank
        WHEN 1 THEN 10
        WHEN 2 THEN 5
        WHEN 3 THEN 3
        ELSE 1
      END
    ) AS total_points,
    COUNT(*) FILTER (WHERE gr.rank = 1) AS wins,
    COUNT(*) AS games,
    MAX(gr.victory_points) AS max_vp
  FROM game_results gr
  GROUP BY gr.player_name
  ORDER BY total_points DESC, wins DESC
  LIMIT 100;
$$;
