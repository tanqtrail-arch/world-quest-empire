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
  quiz_correct INT NOT NULL DEFAULT 0,
  quiz_total INT NOT NULL DEFAULT 0,
  sevens_rolled INT NOT NULL DEFAULT 0,
  had_longest_road BOOLEAN NOT NULL DEFAULT false,
  came_from_behind BOOLEAN NOT NULL DEFAULT false,
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

-- =============================================
-- Ranking point calculation (shared formula)
-- rank: 1→10pt, 2→5pt, 3→3pt, else 1pt
-- quiz bonus (per game): ≥80%→+3pt, ≥60%→+1pt
-- =============================================

-- Lifetime ranking
CREATE OR REPLACE FUNCTION get_ranking()
RETURNS TABLE (
  player_name TEXT,
  total_points BIGINT,
  wins BIGINT,
  games BIGINT,
  max_vp INT,
  avg_quiz_rate NUMERIC
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
      +
      CASE
        WHEN gr.quiz_total > 0 AND (gr.quiz_correct::NUMERIC / gr.quiz_total) >= 0.8 THEN 3
        WHEN gr.quiz_total > 0 AND (gr.quiz_correct::NUMERIC / gr.quiz_total) >= 0.6 THEN 1
        ELSE 0
      END
    ) AS total_points,
    COUNT(*) FILTER (WHERE gr.rank = 1) AS wins,
    COUNT(*) AS games,
    MAX(gr.victory_points) AS max_vp,
    CASE
      WHEN SUM(gr.quiz_total) > 0
        THEN ROUND(SUM(gr.quiz_correct)::NUMERIC / SUM(gr.quiz_total) * 100, 1)
      ELSE 0
    END AS avg_quiz_rate
  FROM game_results gr
  GROUP BY gr.player_name
  ORDER BY total_points DESC, wins DESC
  LIMIT 100;
$$;

-- Weekly ranking (current ISO week, Monday start)
CREATE OR REPLACE FUNCTION get_weekly_ranking()
RETURNS TABLE (
  player_name TEXT,
  total_points BIGINT,
  wins BIGINT,
  games BIGINT,
  max_vp INT,
  avg_quiz_rate NUMERIC
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
      +
      CASE
        WHEN gr.quiz_total > 0 AND (gr.quiz_correct::NUMERIC / gr.quiz_total) >= 0.8 THEN 3
        WHEN gr.quiz_total > 0 AND (gr.quiz_correct::NUMERIC / gr.quiz_total) >= 0.6 THEN 1
        ELSE 0
      END
    ) AS total_points,
    COUNT(*) FILTER (WHERE gr.rank = 1) AS wins,
    COUNT(*) AS games,
    MAX(gr.victory_points) AS max_vp,
    CASE
      WHEN SUM(gr.quiz_total) > 0
        THEN ROUND(SUM(gr.quiz_correct)::NUMERIC / SUM(gr.quiz_total) * 100, 1)
      ELSE 0
    END AS avg_quiz_rate
  FROM game_results gr
  WHERE gr.played_at >= date_trunc('week', now())
  GROUP BY gr.player_name
  ORDER BY total_points DESC, wins DESC
  LIMIT 100;
$$;

-- Hall of fame: weekly champions (past weeks only, most recent first)
CREATE OR REPLACE FUNCTION get_hall_of_fame()
RETURNS TABLE (
  week_start DATE,
  player_name TEXT,
  week_points BIGINT,
  wins BIGINT,
  games BIGINT
)
LANGUAGE sql
STABLE
AS $$
  WITH weekly AS (
    SELECT
      date_trunc('week', gr.played_at)::DATE AS wk,
      gr.player_name,
      SUM(
        CASE gr.rank
          WHEN 1 THEN 10
          WHEN 2 THEN 5
          WHEN 3 THEN 3
          ELSE 1
        END
        +
        CASE
          WHEN gr.quiz_total > 0 AND (gr.quiz_correct::NUMERIC / gr.quiz_total) >= 0.8 THEN 3
          WHEN gr.quiz_total > 0 AND (gr.quiz_correct::NUMERIC / gr.quiz_total) >= 0.6 THEN 1
          ELSE 0
        END
      ) AS pts,
      COUNT(*) FILTER (WHERE gr.rank = 1) AS w,
      COUNT(*) AS g
    FROM game_results gr
    WHERE gr.played_at < date_trunc('week', now())
    GROUP BY wk, gr.player_name
  ),
  ranked AS (
    SELECT wk, player_name, pts, w, g,
      ROW_NUMBER() OVER (PARTITION BY wk ORDER BY pts DESC, w DESC) AS rn
    FROM weekly
  )
  SELECT wk AS week_start, player_name, pts AS week_points, w AS wins, g AS games
  FROM ranked
  WHERE rn = 1
  ORDER BY wk DESC
  LIMIT 50;
$$;
