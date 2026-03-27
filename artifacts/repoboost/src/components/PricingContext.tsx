import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, CheckCircle2, Copy, Clock, CheckCheck, Loader2, AlertCircle, RefreshCw } from "lucide-react";
import { useCreateCheckoutSession, useGetPaymentStatus } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { PremiumButton } from "./shared";
import { useToast } from "@/hooks/use-toast";

const PricingContext = createContext({
  openPricing: () => {},
  closePricing: () => {},
});

export const usePricing = () => useContext(PricingContext);

type PixData = {
  pixId: string;
  brCode: string;
  brCodeBase64: string;
  expiresAt: string;
  amount: number;
  credits: number;
  packageName: string;
};

function formatCents(cents: number): string {
  return `R$ ${(cents / 100).toFixed(2).replace(".", ",")}`;
}

function PricingCard({
  title,
  credits,
  price,
  packageId,
  highlighted = false,
  onSelect,
  loading,
}: {
  title: string;
  credits: number;
  price: string;
  packageId: "pack_10" | "pack_25" | "pack_50";
  highlighted?: boolean;
  onSelect: (pkg: "pack_10" | "pack_25" | "pack_50") => void;
  loading: boolean;
}) {
  return (
    <div className={`relative rounded-3xl p-6 md:p-8 flex flex-col ${highlighted ? "bg-gradient-to-b from-primary/20 to-card border-primary/50" : "bg-card border-border"} border shadow-xl`}>
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
        disabled={loading}
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Comprar Agora"}
      </PremiumButton>
    </div>
  );
}

function PixModal({ pixData, onClose, onSuccess }: { pixData: PixData; onClose: () => void; onSuccess: (newBalance: number, credits: number) => void }) {
  const [copied, setCopied] = useState(false);
  const [pollEnabled, setPollEnabled] = useState(true);
  const successFired = useRef(false);
  const { toast } = useToast();

  const { data: statusData } = useGetPaymentStatus(
    { pixId: pixData.pixId },
    { query: { enabled: pollEnabled, refetchInterval: 3000, retry: false } }
  );

  useEffect(() => {
    if (successFired.current) return;
    if (statusData?.status === "PAID") {
      successFired.current = true;
      setPollEnabled(false);
      onSuccess(statusData.newBalance ?? 0, statusData.creditsAdded ?? pixData.credits);
    } else if (statusData?.status === "EXPIRED" || statusData?.status === "CANCELLED") {
      setPollEnabled(false);
      toast({ title: "PIX expirado", description: "Gere um novo QR Code para tentar novamente.", variant: "destructive" });
    }
  }, [statusData]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(pixData.brCode);
      setCopied(true);
      toast({ title: "Copiado!", description: "Código PIX copiado para a área de transferência." });
      setTimeout(() => setCopied(false), 3000);
    } catch {
      toast({ title: "Erro ao copiar", variant: "destructive" });
    }
  };

  const expiresAt = new Date(pixData.expiresAt);
  const isExpired = statusData?.status === "EXPIRED" || statusData?.status === "CANCELLED";
  const isPaid = statusData?.status === "PAID";

  return (
    <div className="flex flex-col items-center text-center max-w-md w-full mx-auto">
      <div className="mb-4">
        <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-semibold mb-2">
          <span>🥑</span> Pague com PIX
        </div>
        <h3 className="text-2xl font-display font-bold">{pixData.packageName.split(" — ")[0]}</h3>
        <p className="text-muted-foreground mt-1">{pixData.credits} créditos por <strong className="text-white">{formatCents(pixData.amount)}</strong></p>
      </div>

      {isPaid ? (
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex flex-col items-center py-8">
          <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mb-4">
            <CheckCheck className="w-10 h-10 text-green-400" />
          </div>
          <p className="text-xl font-bold text-green-400">Pagamento confirmado!</p>
          <p className="text-muted-foreground mt-2">Seus créditos foram adicionados com sucesso.</p>
        </motion.div>
      ) : isExpired ? (
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex flex-col items-center py-8">
          <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center mb-4">
            <AlertCircle className="w-10 h-10 text-red-400" />
          </div>
          <p className="text-xl font-bold text-red-400">PIX expirado</p>
          <p className="text-muted-foreground mt-2">Feche e tente novamente.</p>
        </motion.div>
      ) : (
        <>
          <div className="relative mb-4">
            <div className="bg-white rounded-2xl p-3 shadow-xl">
              <img
                src={pixData.brCodeBase64}
                alt="QR Code PIX"
                className="w-52 h-52 object-contain"
              />
            </div>
            {pollEnabled && (
              <div className="absolute -bottom-2 -right-2 bg-primary text-primary-foreground rounded-full p-1.5">
                <Loader2 className="w-4 h-4 animate-spin" />
              </div>
            )}
          </div>

          <p className="text-sm text-muted-foreground mb-4 flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Expira em {expiresAt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
          </p>

          <div className="w-full bg-muted/30 border border-border rounded-xl p-3 mb-4">
            <p className="text-xs text-muted-foreground mb-2 font-medium">PIX Copia e Cola</p>
            <div className="flex items-center gap-2">
              <code className="text-xs text-left flex-1 truncate font-mono text-muted-foreground">
                {pixData.brCode.slice(0, 40)}...
              </code>
              <button
                onClick={handleCopy}
                className="shrink-0 p-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg transition-colors"
              >
                {copied ? <CheckCheck className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            Aguardando confirmação do pagamento automaticamente...
          </p>
        </>
      )}
    </div>
  );
}

function PricingModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { mutate: createCheckout, isPending } = useCreateCheckoutSession();
  const [pixData, setPixData] = useState<PixData | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleBuy = (packageId: "pack_10" | "pack_25" | "pack_50") => {
    createCheckout(
      { data: { packageId } },
      {
        onSuccess: (res) => {
          setPixData(res as PixData);
        },
        onError: (err: any) => {
          toast({
            title: "Erro ao gerar QR Code",
            description: err?.message || "Por favor, tente novamente.",
            variant: "destructive",
          });
        },
      }
    );
  };

  const handlePaymentSuccess = (newBalance: number, creditsAdded: number) => {
    toast({
      title: "🎉 Pagamento confirmado!",
      description: `${creditsAdded} créditos adicionados à sua conta.`,
    });
    queryClient.invalidateQueries({ queryKey: ["/api/credits"] });
    setTimeout(() => {
      onClose();
      setPixData(null);
    }, 2500);
  };

  const handleClose = () => {
    onClose();
    setTimeout(() => setPixData(null), 400);
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
            onClick={handleClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className={`relative bg-card border border-border rounded-3xl p-6 md:p-10 shadow-2xl w-full z-10 my-auto ${pixData ? "max-w-lg" : "max-w-5xl"}`}
          >
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 p-2 text-muted-foreground hover:text-white bg-white/5 hover:bg-white/10 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <AnimatePresence mode="wait">
              {pixData ? (
                <motion.div key="pix" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                  <PixModal
                    pixData={pixData}
                    onClose={handleClose}
                    onSuccess={handlePaymentSuccess}
                  />
                  <button
                    onClick={() => setPixData(null)}
                    className="mt-4 w-full flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-white transition-colors"
                  >
                    <RefreshCw className="w-4 h-4" /> Escolher outro pacote
                  </button>
                </motion.div>
              ) : (
                <motion.div key="packages" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
                  <div className="text-center max-w-2xl mx-auto mb-10">
                    <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">Mais visibilidade, zero mensalidade</h2>
                    <p className="text-muted-foreground text-lg">
                      Pague com PIX, sem cadastro e sem burocracia. Créditos adicionados na hora.
                    </p>
                  </div>

                  <div className="grid md:grid-cols-3 gap-6 md:gap-8">
                    <PricingCard title="Starter" credits={10} price="R$ 30" packageId="pack_10" onSelect={handleBuy} loading={isPending} />
                    <PricingCard title="Pro" credits={25} price="R$ 65" packageId="pack_25" highlighted onSelect={handleBuy} loading={isPending} />
                    <PricingCard title="Agency" credits={50} price="R$ 110" packageId="pack_50" onSelect={handleBuy} loading={isPending} />
                  </div>

                  {isPending && (
                    <div className="absolute inset-0 bg-background/50 backdrop-blur-sm flex items-center justify-center rounded-3xl z-20">
                      <div className="flex flex-col items-center bg-card p-6 rounded-2xl border border-border shadow-xl">
                        <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
                        <p className="font-medium text-lg">Gerando QR Code PIX...</p>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
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
