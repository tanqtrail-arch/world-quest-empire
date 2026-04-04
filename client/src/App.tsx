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
import RankingScreen from "./pages/RankingScreen";

function ScreenRouter() {
  const screen = useGameStore(s => s.screen);

  switch (screen) {
    case 'title':
      return <TitleScreen />;
    case 'create':
      return <CreateRoom />;
    case 'game':
      return <GameScreen />;
    case 'result':
      return <ResultScreen />;
    case 'ranking':
      return <RankingScreen />;
    default:
      return <TitleScreen />;
  }
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
