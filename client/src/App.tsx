import type React from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { useGameStore } from "./lib/gameStore";

// Pages
import TitleScreen from "./pages/TitleScreen";
import CreateRoom from "./pages/CreateRoom";
import GameScreen from "./pages/GameScreen";
import ResultScreen from "./pages/ResultScreen";

function ScreenRouter() {
  const screen = useGameStore(s => s.screen);

  let content: React.ReactNode;
  switch (screen) {
    case 'title':         content = <TitleScreen />; break;
    case 'create':        content = <CreateRoom />; break;
    case 'game':          content = <GameScreen />; break;
    case 'result':        content = <ResultScreen />; break;
    case 'ranking':       content = <RankingScreen />; break;
    case 'quiz_practice': content = <QuizPracticeScreen />; break;
    default:              content = <TitleScreen />;
  }
  // `key` forces React to remount on every screen change so the fade-in
  // animation re-plays. The wrapper itself is plain CSS — no framer-motion.
  return (
    <div key={screen} className="fade-in" style={{ minHeight: '100dvh' }}>
      {content}
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <ScreenRouter />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
