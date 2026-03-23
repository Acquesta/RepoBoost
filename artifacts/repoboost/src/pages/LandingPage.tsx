import { Link } from "wouter";
import { motion } from "framer-motion";
import { Github, Code2, Sparkles, TrendingUp, CheckCircle2 } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PremiumButton, buttonVariants } from "@/components/shared";
import { useGetMe } from "@workspace/api-client-react";

export default function LandingPage() {
  const { data: user } = useGetMe({ query: { retry: false } });

  const fadeIn = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6 }
  };

  return (
    <AppLayout>
      <div className="relative overflow-hidden">
        {/* Hero Background */}
        <div className="absolute inset-0 z-[-1]">
          <img 
            src={`${import.meta.env.BASE_URL}images/hero-bg.png`} 
            alt="Hero background" 
            className="w-full h-full object-cover opacity-30 mix-blend-screen"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent" />
        </div>

        {/* Hero Section */}
        <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 px-4 max-w-7xl mx-auto text-center">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }} 
            animate={{ opacity: 1, scale: 1 }} 
            transition={{ duration: 0.7 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-sm text-primary mb-8"
          >
            <Sparkles className="w-4 h-4" />
            <span className="font-medium">IA que escreve por você</span>
          </motion.div>
          
          <motion.h1 {...fadeIn} className="text-5xl md:text-7xl font-display font-bold tracking-tight mb-8 leading-tight">
            Transforme código invisível <br className="hidden md:block" /> em <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">autoridade no LinkedIn</span>
          </motion.h1>
          
          <motion.p {...fadeIn} transition={{ delay: 0.2 }} className="text-xl text-muted-foreground mb-12 max-w-3xl mx-auto leading-relaxed">
            Pare de perder oportunidades. O RepoBoost lê o seu GitHub e gera READMEs profissionais e posts técnicos virais para o LinkedIn em segundos.
          </motion.p>
          
          <motion.div {...fadeIn} transition={{ delay: 0.3 }} className="flex flex-col sm:flex-row items-center justify-center gap-4">
            {user ? (
              <Link href="/dashboard" className={buttonVariants({ variant: "primary", size: "lg" })}>
                Ir para o Dashboard
              </Link>
            ) : (
              <a href="/api/auth/github">
                <PremiumButton size="lg" className="w-full sm:w-auto">
                  <Github className="w-5 h-5 mr-2" />
                  Conectar com GitHub
                </PremiumButton>
              </a>
            )}
            <p className="text-sm text-muted-foreground sm:ml-4">
              O primeiro repositório é por nossa conta! 🎁
            </p>
          </motion.div>
        </section>

        {/* How it works */}
        <section className="py-24 bg-card/50 border-y border-border">
          <div className="max-w-7xl mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-5xl font-display font-bold mb-4">Como funciona na prática?</h2>
              <p className="text-muted-foreground text-lg">Três passos simples para mostrar o seu valor ao mercado.</p>
            </div>

            <div className="grid md:grid-cols-3 gap-8 relative">
              <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-primary/20 to-transparent hidden md:block -translate-y-1/2" />
              
              {[
                {
                  icon: <Github className="w-8 h-8 text-primary" />,
                  title: "1. Conecte e Escolha",
                  desc: "Faça login com seu GitHub em 1 clique e selecione qual repositório você quer documentar."
                },
                {
                  icon: <Code2 className="w-8 h-8 text-accent" />,
                  title: "2. Análise Inteligente",
                  desc: "Nossa IA lê a estrutura, entende as tecnologias usadas e o problema que seu código resolve."
                },
                {
                  icon: <TrendingUp className="w-8 h-8 text-blue-400" />,
                  title: "3. Mágica Feita",
                  desc: "Receba um README impecável e opções de posts engajadores prontos para colar no LinkedIn."
                }
              ].map((step, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.2 }}
                  className="relative glass-panel rounded-3xl p-8 text-center z-10 hover:-translate-y-2 transition-transform duration-300"
                >
                  <div className="w-16 h-16 mx-auto bg-background rounded-2xl flex items-center justify-center border border-border shadow-lg mb-6">
                    {step.icon}
                  </div>
                  <h3 className="text-xl font-display font-bold mb-3">{step.title}</h3>
                  <p className="text-muted-foreground">{step.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing Summary */}
        <section className="py-32 px-4 max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-5xl font-display font-bold mb-6">Justo e sem amarras</h2>
          <p className="text-xl text-muted-foreground mb-12">
            Nós odiamos assinaturas mensais que você esquece de cancelar. Por isso, nosso modelo é 100% Pay-as-you-go (pague pelo uso). Compre pacotes avulsos e resolva sua vitrine profissional de uma vez por todas.
          </p>
          
          <div className="glass-panel rounded-3xl p-8 md:p-12 flex flex-col md:flex-row items-center justify-between text-left gap-8">
            <div>
              <h3 className="text-2xl font-display font-bold mb-4">Pacotes a partir de R$ 30</h3>
              <ul className="space-y-3">
                <li className="flex items-center gap-3 text-muted-foreground">
                  <CheckCircle2 className="w-5 h-5 text-primary" /> Sem assinaturas recorrentes
                </li>
                <li className="flex items-center gap-3 text-muted-foreground">
                  <CheckCircle2 className="w-5 h-5 text-primary" /> Créditos não expiram
                </li>
                <li className="flex items-center gap-3 text-muted-foreground">
                  <CheckCircle2 className="w-5 h-5 text-primary" /> IA de última geração incluída
                </li>
              </ul>
            </div>
            <div className="shrink-0 w-full md:w-auto">
              {user ? (
                <Link href="/dashboard" className={buttonVariants({ variant: "primary", size: "lg", className: "w-full" })}>
                  Ver Pacotes no Dashboard
                </Link>
              ) : (
                <a href="/api/auth/github">
                  <PremiumButton size="lg" className="w-full">Comece Grátis Agora</PremiumButton>
                </a>
              )}
            </div>
          </div>
        </section>
      </div>
    </AppLayout>
  );
}
