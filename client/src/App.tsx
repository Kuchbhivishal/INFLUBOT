import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/Landing";
import Dashboard from "@/pages/Dashboard";
import InfluencerProfile from "@/pages/InfluencerProfile";
import Wallet from "@/pages/Wallet";
import Chat from "@/pages/Chat";
import ChatTest from "@/pages/ChatTest";
import StandaloneChatTest from "@/pages/StandaloneChatTest";
import UserChat from "@/pages/UserChat";
import InfluencerChat from "@/pages/InfluencerChat";
import { Header } from "./components/layout/Header";
import { Footer } from "./components/layout/Footer";
import { AuthProvider } from "./contexts/AuthContext";
import { WalletProvider } from "./contexts/WalletContext";
import { SocketProvider } from "./contexts/SocketContext";
import { useAuth } from "./contexts/AuthContext";

// This component must be used within an AuthProvider
function ProtectedRoutes() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-grow">
        <Switch>
          <Route path="/" component={Landing} />
          <Route path="/chat-test" component={StandaloneChatTest} />
          <Route path="/user-chat" component={UserChat} />
          <Route path="/influencer-chat" component={InfluencerChat} />
          {isAuthenticated && (
            <Switch>
              <Route path="/dashboard" component={Dashboard} />
              <Route path="/influencer/:id" component={InfluencerProfile} />
              <Route path="/wallet" component={Wallet} />
              <Route path="/chat/:id" component={Chat} />
            </Switch>
          )}
          <Route component={NotFound} />
        </Switch>
      </main>
      <Footer />
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <WalletProvider>
          <SocketProvider>
            <ProtectedRoutes />
            <Toaster />
          </SocketProvider>
        </WalletProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
