import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { useGameStore } from "./lib/gameStore";

// Pages
import TitleScreen from "./pages/TitleScreen";
import CreateRoom from "./pages/CreateRoom";
import JoinRoom from "./pages/JoinRoom";
import RulesScreen from "./pages/RulesScreen";
import GameScreen from "./pages/GameScreen";
import ResultScreen from "./pages/ResultScreen";

function ScreenRouter() {
  const screen = useGameStore(s => s.screen);

  switch (screen) {
    case 'title':
      return <TitleScreen />;
    case 'create':
      return <CreateRoom />;
    case 'join':
      return <JoinRoom />;
    case 'rules':
      return <RulesScreen />;
    case 'game':
      return <GameScreen />;
    case 'result':
      return <ResultScreen />;
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
