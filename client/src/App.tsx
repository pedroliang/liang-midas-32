import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { MidasProvider } from "./contexts/MidasContext";
import MixerPage from "./pages/MixerPage";

function Router() {
  return (
    <Switch>
      <Route path={"/"} component={MixerPage} />
      <Route path={"/404"} component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <MidasProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </MidasProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
