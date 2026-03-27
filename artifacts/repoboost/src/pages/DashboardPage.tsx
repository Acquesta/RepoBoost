import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/hooks/use-auth";
import { useListRepositories, useGenerateContent, getGetCreditsQueryKey, getListGenerationsQueryKey } from "@workspace/api-client-react";
import { PremiumButton, Spinner, GeneratingOverlay, Badge } from "@/components/shared";
import { Github, Star, GitBranch, Sparkles, Search, Lock } from "lucide-react";
import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { usePricing } from "@/components/PricingContext";
import { useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";

export default function DashboardPage() {
  const { user, isLoading: authLoading } = useAuth(true);
  const { data, isLoading: reposLoading } = useListRepositories();
  const { mutate: generate, isPending: isGenerating } = useGenerateContent();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { openPricing } = usePricing();
  const queryClient = useQueryClient();
  
  const [search, setSearch] = useState("");

  const filteredRepos = useMemo(() => {
    if (!data?.repos) return [];
    return data.repos.filter(repo => 
      repo.name.toLowerCase().includes(search.toLowerCase()) || 
      (repo.description && repo.description.toLowerCase().includes(search.toLowerCase()))
    ).sort((a, b) => (b.stars || 0) - (a.stars || 0));
  }, [data, search]);

  if (authLoading || reposLoading) {
    return <AppLayout><Spinner /></AppLayout>;
  }

  if (!user) return null;

  const handleGenerate = (repo: any) => {
    generate({
      data: {
        repoFullName: repo.fullName,
        repoName: repo.name,
        repoDescription: repo.description ?? undefined,
        repoUrl: repo.url ?? undefined,
        repoLanguage: repo.language ?? undefined
      }
    }, {
      onSuccess: (res) => {
        queryClient.invalidateQueries({ queryKey: getGetCreditsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getListGenerationsQueryKey() });
        setLocation(`/result/${res.generationId}`);
      },
      onError: (err: any) => {
        const isNoCredits = err?.status === 402 || err?.data?.error === "Insufficient Credits" || err?.message?.toLowerCase().includes("credit");
        if (isNoCredits) {
          openPricing();
          toast({
            title: "Você ficou sem créditos!",
            description: "Compre um pacote via PIX para continuar gerando conteúdo.",
          });
        } else {
          toast({
            title: "Erro ao gerar conteúdo",
            description: err?.data?.message || err?.message || "Ocorreu um erro inesperado. Tente novamente.",
            variant: "destructive"
          });
        }
      }
    });
  };

  return (
    <AppLayout>
      {isGenerating && <GeneratingOverlay />}
      
      <div className="max-w-7xl mx-auto px-4 py-12 w-full">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div>
            <h1 className="text-3xl md:text-4xl font-display font-bold mb-3">Meus Repositórios</h1>
            <p className="text-muted-foreground text-lg">
              Selecione um repositório para gerar o README e posts para o LinkedIn.
            </p>
          </div>
          <div className="relative w-full md:w-72 shrink-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input 
              type="text" 
              placeholder="Buscar repositório..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-card border border-border rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all text-white placeholder:text-muted-foreground"
            />
          </div>
        </div>

        {filteredRepos.length === 0 ? (
          <div className="py-24 text-center bg-card/50 rounded-3xl border border-border border-dashed">
            <Github className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
            <h3 className="text-2xl font-display font-bold mb-2">Nenhum repositório encontrado</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              {search ? "Tente buscar com outro termo." : "Você não possui repositórios públicos no GitHub associados à sua conta."}
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRepos.map((repo, i) => (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                key={repo.id} 
                className="group bg-card border border-border rounded-2xl p-6 hover:border-primary/50 transition-colors flex flex-col h-full relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                
                <div className="flex items-start justify-between mb-4 relative z-10">
                  <h3 className="text-xl font-bold font-display truncate pr-4" title={repo.fullName}>
                    {repo.name}
                  </h3>
                  {repo.private && <Lock className="w-4 h-4 text-muted-foreground shrink-0" />}
                </div>
                
                <p className="text-muted-foreground text-sm line-clamp-3 mb-6 flex-1 relative z-10">
                  {repo.description || "Sem descrição disponível."}
                </p>
                
                <div className="flex items-center gap-4 mb-6 relative z-10">
                  {repo.language && (
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <GitBranch className="w-4 h-4" />
                      {repo.language}
                    </div>
                  )}
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Star className="w-4 h-4" />
                    {repo.stars || 0}
                  </div>
                </div>

                <PremiumButton 
                  onClick={() => handleGenerate(repo)} 
                  className="w-full relative z-10"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Gerar Conteúdo
                </PremiumButton>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
