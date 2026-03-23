import React, { createContext, useContext, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, CheckCircle2 } from "lucide-react";
import { useCreateCheckoutSession } from "@workspace/api-client-react";
import { PremiumButton } from "./shared";
import { useToast } from "@/hooks/use-toast";

const PricingContext = createContext({
  openPricing: () => {},
  closePricing: () => {},
});

export const usePricing = () => useContext(PricingContext);

function PricingCard({ 
  title, 
  credits, 
  price, 
  packageId, 
  highlighted = false,
  onSelect
}: { 
  title: string; 
  credits: number; 
  price: string; 
  packageId: "pack_10" | "pack_25" | "pack_50";
  highlighted?: boolean;
  onSelect: (pkg: "pack_10" | "pack_25" | "pack_50") => void;
}) {
  return (
    <div className={`relative rounded-3xl p-6 md:p-8 flex flex-col ${highlighted ? 'bg-gradient-to-b from-primary/20 to-card border-primary/50' : 'bg-card border-border'} border shadow-xl`}>
      {highlighted && (
        <div className="absolute -top-4 left-0 right-0 flex justify-center">
          <span className="bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">Mais Popular</span>
        </div>
      )}
      <h3 className="text-2xl font-display font-bold mb-2">{title}</h3>
      <div className="flex items-baseline gap-2 mb-6">
        <span className="text-4xl font-bold">{price}</span>
      </div>
      <ul className="space-y-4 mb-8 flex-1">
        <li className="flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-primary" />
          <span className="text-muted-foreground"><strong className="text-white">{credits}</strong> repositórios documentados</span>
        </li>
        <li className="flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-primary" />
          <span className="text-muted-foreground">READMEs em Markdown</span>
        </li>
        <li className="flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-primary" />
          <span className="text-muted-foreground">Posts variados p/ LinkedIn</span>
        </li>
      </ul>
      <PremiumButton 
        variant={highlighted ? "primary" : "secondary"} 
        className="w-full"
        onClick={() => onSelect(packageId)}
      >
        Comprar Agora
      </PremiumButton>
    </div>
  );
}

function PricingModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { mutate: createCheckout, isPending } = useCreateCheckoutSession();
  const { toast } = useToast();

  const handleBuy = (packageId: "pack_10" | "pack_25" | "pack_50") => {
    createCheckout({ data: { packageId } }, {
      onSuccess: (res) => {
        window.location.href = res.checkoutUrl;
      },
      onError: (err: any) => {
        toast({ 
          title: "Erro ao iniciar checkout", 
          description: err?.message || "Por favor, tente novamente.",
          variant: "destructive"
        });
      }
    });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            className="fixed inset-0 bg-background/80 backdrop-blur-sm" 
            onClick={onClose} 
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }} 
            animate={{ opacity: 1, scale: 1, y: 0 }} 
            exit={{ opacity: 0, scale: 0.95, y: 20 }} 
            className="relative bg-card border border-border rounded-3xl p-6 md:p-10 shadow-2xl max-w-5xl w-full z-10 my-auto"
          >
            <button onClick={onClose} className="absolute top-4 right-4 p-2 text-muted-foreground hover:text-white bg-white/5 hover:bg-white/10 rounded-full transition-colors">
              <X className="w-5 h-5" />
            </button>
            
            <div className="text-center max-w-2xl mx-auto mb-10">
              <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">Mais visibilidade, zero mensalidade</h2>
              <p className="text-muted-foreground text-lg">
                Pague apenas pelo que usar. Recarregue seus créditos e continue transformando seus códigos em oportunidades.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6 md:gap-8">
              <PricingCard title="Starter" credits={10} price="R$ 30" packageId="pack_10" onSelect={handleBuy} />
              <PricingCard title="Pro" credits={25} price="R$ 65" packageId="pack_25" highlighted onSelect={handleBuy} />
              <PricingCard title="Agency" credits={50} price="R$ 110" packageId="pack_50" onSelect={handleBuy} />
            </div>

            {isPending && (
              <div className="absolute inset-0 bg-background/50 backdrop-blur-sm flex items-center justify-center rounded-3xl z-20">
                <div className="flex flex-col items-center bg-card p-6 rounded-2xl border border-border shadow-xl">
                  <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
                  <p className="font-medium text-lg">Iniciando pagamento...</p>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export function PricingProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <PricingContext.Provider value={{ openPricing: () => setIsOpen(true), closePricing: () => setIsOpen(false) }}>
      {children}
      <PricingModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </PricingContext.Provider>
  );
}
