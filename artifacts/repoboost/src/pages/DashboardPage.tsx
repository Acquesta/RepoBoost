import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/hooks/use-auth";
import { useListRepositories, useGenerateContent, getGetCreditsQueryKey, getListGenerationsQueryKey } from "@workspace/api-client-react";
import { PremiumButton, Spinner, GeneratingOverlay } from "@/components/shared";
import { Github, Star, GitBranch, Sparkles, Search, Lock, SlidersHorizontal, Clock, ArrowDownAZ, ChevronDown, X } from "lucide-react";
import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { usePricing } from "@/components/PricingContext";
import { useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";

type SortOption = "recent" | "stars" | "name";

const SORT_LABELS: Record<SortOption, { label: string; icon: React.ReactNode }> = {
  recent: { label: "Mais recentes", icon: <Clock className="w-4 h-4" /> },
  stars: { label: "Mais estrelas", icon: <Star className="w-4 h-4" /> },
  name: { label: "Nome (A-Z)", icon: <ArrowDownAZ className="w-4 h-4" /> },
};

function LanguageTag({ color }: { color: string }) {
  const colors: Record<string, string> = {
    TypeScript: "bg-blue-500", JavaScript: "bg-yellow-400", Python: "bg-green-500",
    Rust: "bg-orange-500", Go: "bg-cyan-400", Java: "bg-red-500",
    "C++": "bg-pink-500", "C#": "bg-purple-500", PHP: "bg-indigo-400",
    Ruby: "bg-red-400", Swift: "bg-orange-400", Kotlin: "bg-violet-500",
    Dart: "bg-blue-400", HTML: "bg-orange-300", CSS: "bg-blue-300",
    Shell: "bg-gray-400",
  };
  return (
    <span className={`inline-block w-2.5 h-2.5 rounded-full ${colors[color] ?? "bg-gray-500"}`} />
  );
}

function timeAgo(dateStr: string | undefined): string {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}min atrás`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h atrás`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d atrás`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} meses atrás`;
  return `${Math.floor(months / 12)} anos atrás`;
}

export default function DashboardPage() {
  const { user, isLoading: authLoading } = useAuth(true);
  const { data, isLoading: reposLoading } = useListRepositories();
  const { mutate: generate, isPending: isGenerating } = useGenerateContent();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { openPricing } = usePricing();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("recent");
  const [langFilter, setLangFilter] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);

  const allLanguages = useMemo(() => {
    if (!data?.repos) return [];
    const langs = [...new Set(data.repos.map(r => r.language).filter(Boolean) as string[])];
    return langs.sort();
  }, [data]);

  const filteredRepos = useMemo(() => {
    if (!data?.repos) return [];
    let repos = data.repos.filter(repo => {
      const matchSearch =
        repo.name.toLowerCase().includes(search.toLowerCase()) ||
        (repo.description?.toLowerCase().includes(search.toLowerCase()) ?? false);
      const matchLang = langFilter === "all" || repo.language === langFilter;
      return matchSearch && matchLang;
    });

    repos = [...repos].sort((a, b) => {
      if (sortBy === "recent") return new Date(b.updatedAt ?? 0).getTime() - new Date(a.updatedAt ?? 0).getTime();
      if (sortBy === "stars") return (b.stars ?? 0) - (a.stars ?? 0);
      if (sortBy === "name") return a.name.localeCompare(b.name);
      return 0;
    });

    return repos;
  }, [data, search, sortBy, langFilter]);

  const activeFiltersCount = (langFilter !== "all" ? 1 : 0) + (sortBy !== "recent" ? 1 : 0);

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
        repoLanguage: repo.language ?? undefined,
      },
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
          toast({ title: "Você ficou sem créditos!", description: "Compre um pacote via PIX para continuar." });
        } else {
          toast({ title: "Erro ao gerar conteúdo", description: err?.data?.message || err?.message || "Tente novamente.", variant: "destructive" });
        }
      },
    });
  };

  return (
    <AppLayout>
      {isGenerating && <GeneratingOverlay />}

      <div className="max-w-7xl mx-auto px-4 py-10 w-full">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-display font-bold mb-2">Meus Repositórios</h1>
          <p className="text-muted-foreground text-base">
            Selecione um repositório para gerar o README e posts para o LinkedIn.
          </p>
        </div>

        <div className="flex flex-col gap-3 mb-8">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Buscar repositório..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-card border border-border rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all text-white placeholder:text-muted-foreground"
              />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="flex gap-2">
              <div className="relative">
                <button
                  onClick={() => { setSortOpen(o => !o); setShowFilters(false); }}
                  className="flex items-center gap-2 bg-card border border-border rounded-xl px-4 py-2.5 text-sm text-white hover:border-primary/50 transition-colors whitespace-nowrap"
                >
                  {SORT_LABELS[sortBy].icon}
                  {SORT_LABELS[sortBy].label}
                  <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${sortOpen ? "rotate-180" : ""}`} />
                </button>
                <AnimatePresence>
                  {sortOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      className="absolute top-full mt-2 right-0 bg-card border border-border rounded-xl shadow-xl overflow-hidden z-30 min-w-[180px]"
                    >
                      {(Object.entries(SORT_LABELS) as [SortOption, typeof SORT_LABELS[SortOption]][]).map(([key, val]) => (
                        <button
                          key={key}
                          onClick={() => { setSortBy(key); setSortOpen(false); }}
                          className={`w-full flex items-center gap-2.5 px-4 py-3 text-sm text-left hover:bg-white/5 transition-colors ${sortBy === key ? "text-primary" : "text-muted-foreground"}`}
                        >
                          {val.icon}
                          {val.label}
                          {sortBy === key && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <button
                onClick={() => { setShowFilters(o => !o); setSortOpen(false); }}
                className={`flex items-center gap-2 border rounded-xl px-4 py-2.5 text-sm transition-colors whitespace-nowrap ${showFilters || activeFiltersCount > 0 ? "bg-primary/10 border-primary/50 text-primary" : "bg-card border-border text-white hover:border-primary/50"}`}
              >
                <SlidersHorizontal className="w-4 h-4" />
                Filtros
                {activeFiltersCount > 0 && (
                  <span className="bg-primary text-primary-foreground text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                    {activeFiltersCount}
                  </span>
                )}
              </button>
            </div>
          </div>

          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="bg-card border border-border rounded-xl p-4 flex flex-wrap gap-3 items-center">
                  <span className="text-sm text-muted-foreground font-medium">Linguagem:</span>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setLangFilter("all")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${langFilter === "all" ? "bg-primary text-primary-foreground" : "bg-white/5 text-muted-foreground hover:bg-white/10"}`}
                    >
                      Todas
                    </button>
                    {allLanguages.map(lang => (
                      <button
                        key={lang}
                        onClick={() => setLangFilter(lang === langFilter ? "all" : lang)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${langFilter === lang ? "bg-primary text-primary-foreground" : "bg-white/5 text-muted-foreground hover:bg-white/10"}`}
                      >
                        <LanguageTag color={lang} />
                        {lang}
                      </button>
                    ))}
                  </div>
                  {activeFiltersCount > 0 && (
                    <button
                      onClick={() => { setLangFilter("all"); setSortBy("recent"); }}
                      className="ml-auto text-xs text-muted-foreground hover:text-white flex items-center gap-1 transition-colors"
                    >
                      <X className="w-3 h-3" /> Limpar filtros
                    </button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-muted-foreground">
            {filteredRepos.length} {filteredRepos.length === 1 ? "repositório" : "repositórios"}
            {langFilter !== "all" && ` em ${langFilter}`}
            {search && ` para "${search}"`}
          </p>
        </div>

        {filteredRepos.length === 0 ? (
          <div className="py-24 text-center bg-card/50 rounded-3xl border border-border border-dashed">
            <Github className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
            <h3 className="text-2xl font-display font-bold mb-2">Nenhum repositório encontrado</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              {search || langFilter !== "all"
                ? "Tente ajustar os filtros ou buscar com outro termo."
                : "Você não possui repositórios públicos no GitHub."}
            </p>
            {(search || langFilter !== "all") && (
              <button
                onClick={() => { setSearch(""); setLangFilter("all"); }}
                className="mt-4 text-sm text-primary hover:underline"
              >
                Limpar filtros
              </button>
            )}
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredRepos.map((repo, i) => (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                key={repo.id}
                className="group bg-card border border-border rounded-2xl p-6 hover:border-primary/50 transition-all flex flex-col h-full relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

                <div className="flex items-start justify-between mb-3 relative z-10">
                  <h3 className="text-lg font-bold font-display truncate pr-2" title={repo.fullName}>
                    {repo.name}
                  </h3>
                  {repo.private && <Lock className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />}
                </div>

                <p className="text-muted-foreground text-sm line-clamp-2 mb-5 flex-1 relative z-10">
                  {repo.description || <span className="italic opacity-60">Sem descrição.</span>}
                </p>

                <div className="flex items-center gap-3 mb-5 relative z-10 flex-wrap">
                  {repo.language && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <LanguageTag color={repo.language} />
                      {repo.language}
                    </div>
                  )}
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Star className="w-3.5 h-3.5" />
                    {repo.stars ?? 0}
                  </div>
                  {repo.updatedAt && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground ml-auto">
                      <Clock className="w-3.5 h-3.5" />
                      {timeAgo(repo.updatedAt)}
                    </div>
                  )}
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
