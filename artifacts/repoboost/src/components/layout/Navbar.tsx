import { Link } from "wouter";
import { Sparkles, LayoutDashboard, History, LogOut, Coins, Menu, X } from "lucide-react";
import { useGetMe, useGetCredits, useLogout } from "@workspace/api-client-react";
import { useState } from "react";
import { usePricing } from "../PricingContext";
import { PremiumButton } from "../shared";

export function Navbar() {
  const { data: user } = useGetMe({ query: { retry: false } });
  const { data: creditsData } = useGetCredits({ query: { enabled: !!user } });
  const { mutate: logout } = useLogout();
  const { openPricing } = usePricing();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout(undefined, {
      onSuccess: () => {
        window.location.href = "/";
      }
    });
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-background/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href={user ? "/dashboard" : "/"} className="flex items-center gap-2 group">
          <div className="bg-primary/20 p-1.5 rounded-lg group-hover:bg-primary/30 transition-colors">
            <Sparkles className="text-primary w-5 h-5" />
          </div>
          <span className="font-display font-bold text-xl tracking-tight text-white">
            Repo<span className="text-primary">Boost</span>
          </span>
        </Link>

        {/* Desktop Nav */}
        {user ? (
          <div className="hidden md:flex items-center gap-6">
            <button 
              onClick={openPricing} 
              className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors shadow-sm"
            >
              <Coins className="w-4 h-4" />
              <span className="font-bold">{creditsData?.credits ?? user.credits} Créditos</span>
            </button>
            <div className="h-6 w-px bg-border"></div>
            <Link href="/dashboard" className="text-sm font-medium text-muted-foreground hover:text-white transition-colors flex items-center gap-2">
              <LayoutDashboard className="w-4 h-4" /> Dashboard
            </Link>
            <Link href="/history" className="text-sm font-medium text-muted-foreground hover:text-white transition-colors flex items-center gap-2">
              <History className="w-4 h-4" /> Histórico
            </Link>
            <button onClick={handleLogout} className="text-sm font-medium text-muted-foreground hover:text-red-400 transition-colors flex items-center gap-2 ml-4">
              <LogOut className="w-4 h-4" /> Sair
            </button>
          </div>
        ) : (
          <div className="hidden md:flex items-center gap-4">
             <a href="/api/auth/github">
               <PremiumButton size="sm">Login via GitHub</PremiumButton>
             </a>
          </div>
        )}

        {/* Mobile Toggle */}
        <button 
          className="md:hidden p-2 text-muted-foreground hover:text-white"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden absolute top-16 left-0 right-0 bg-card border-b border-border p-4 flex flex-col gap-4 shadow-xl">
          {user ? (
            <>
              <button 
                onClick={() => { openPricing(); setMobileMenuOpen(false); }} 
                className="flex items-center justify-center gap-2 p-3 rounded-xl bg-primary/10 text-primary border border-primary/20"
              >
                <Coins className="w-5 h-5" />
                <span className="font-bold">{creditsData?.credits ?? user.credits} Créditos - Comprar Mais</span>
              </button>
              <Link href="/dashboard" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 p-3 text-white bg-white/5 rounded-xl">
                <LayoutDashboard className="w-5 h-5" /> Dashboard
              </Link>
              <Link href="/history" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 p-3 text-white bg-white/5 rounded-xl">
                <History className="w-5 h-5" /> Histórico
              </Link>
              <button onClick={handleLogout} className="flex items-center gap-3 p-3 text-red-400 bg-red-400/10 rounded-xl mt-2">
                <LogOut className="w-5 h-5" /> Sair
              </button>
            </>
          ) : (
            <a href="/api/auth/github" className="flex">
              <PremiumButton className="w-full">Login via GitHub</PremiumButton>
            </a>
          )}
        </div>
      )}
    </nav>
  );
}
