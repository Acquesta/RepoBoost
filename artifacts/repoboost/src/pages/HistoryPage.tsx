import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/hooks/use-auth";
import { useListGenerations } from "@workspace/api-client-react";
import { Spinner, PremiumButton, buttonVariants } from "@/components/shared";
import { FolderHeart, ChevronRight, Calendar, Github } from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";

export default function HistoryPage() {
  const { user, isLoading: authLoading } = useAuth(true);
  const { data, isLoading } = useListGenerations();

  if (authLoading || isLoading) {
    return <AppLayout><Spinner /></AppLayout>;
  }

  if (!user) return null;

  const generations = data?.generations || [];

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto px-4 py-12 w-full">
        <h1 className="text-3xl md:text-4xl font-display font-bold mb-3">Histórico de Gerações</h1>
        <p className="text-muted-foreground text-lg mb-12">
          Acesse os materiais que você já gerou anteriormente.
        </p>

        {generations.length === 0 ? (
          <div className="text-center py-20 bg-card rounded-3xl border border-border border-dashed shadow-xl">
            <FolderHeart className="w-16 h-16 text-muted-foreground mx-auto mb-6 opacity-50" />
            <h3 className="text-2xl font-display font-bold text-white mb-3">Nenhuma geração ainda</h3>
            <p className="text-muted-foreground mb-8 text-lg">Transforme seu primeiro repositório agora mesmo.</p>
            <Link href="/dashboard" className={buttonVariants({ variant: "primary", size: "lg" })}>
              Ir para Repositórios
            </Link>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse whitespace-nowrap">
                <thead>
                  <tr className="bg-white/5 border-b border-border">
                    <th className="p-6 font-display font-semibold text-muted-foreground">Repositório</th>
                    <th className="p-6 font-display font-semibold text-muted-foreground">Data</th>
                    <th className="p-6 font-display font-semibold text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {generations.map((gen) => (
                    <tr key={gen.id} className="hover:bg-white/[0.02] transition-colors group">
                      <td className="p-6">
                        <div className="flex items-center gap-3">
                          <div className="bg-white/5 p-2 rounded-lg border border-white/10">
                            <Github className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <div className="font-bold text-white font-display text-lg">{gen.repoName}</div>
                            <div className="text-sm text-muted-foreground">{gen.repoFullName}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-6">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Calendar className="w-4 h-4" />
                          {format(new Date(gen.createdAt), "dd/MM/yyyy 'às' HH:mm")}
                        </div>
                      </td>
                      <td className="p-6 text-right">
                        <Link 
                          href={`/result/${gen.id}`} 
                          className="inline-flex items-center justify-center p-2 rounded-xl bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground transition-all duration-300"
                          title="Ver Resultado"
                        >
                          <ChevronRight className="w-5 h-5" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
