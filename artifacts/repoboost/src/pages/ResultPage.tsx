import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/hooks/use-auth";
import { useGetGeneration } from "@workspace/api-client-react";
import { useParams, Link } from "wouter";
import { Spinner, Badge, buttonVariants } from "@/components/shared";
import { FileText, Linkedin, Copy, ArrowLeft, Check, ExternalLink } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { copyToClipboard } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

export default function ResultPage() {
  const { user, isLoading: authLoading } = useAuth(true);
  const params = useParams();
  const id = Number(params.id);
  const { data: generation, isLoading } = useGetGeneration(id, { query: { enabled: !!id } });
  const { toast } = useToast();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (text: string, id: string) => {
    copyToClipboard(text).then(() => {
      setCopiedId(id);
      toast({ title: "Copiado!", description: "Conteúdo copiado para a área de transferência." });
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  if (authLoading || isLoading) {
    return <AppLayout><Spinner /></AppLayout>;
  }

  if (!generation) {
    return (
      <AppLayout>
        <div className="max-w-7xl mx-auto px-4 py-24 text-center">
          <h2 className="text-2xl font-bold mb-4">Geração não encontrada</h2>
          <Link href="/dashboard" className={buttonVariants({ variant: "outline" })}>Voltar ao Dashboard</Link>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-4 py-8 w-full">
        <Link href="/dashboard" className="inline-flex items-center text-muted-foreground hover:text-white transition-colors mb-8 font-medium">
          <ArrowLeft className="w-4 h-4 mr-2" /> Voltar aos Repositórios
        </Link>
        
        <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-display font-bold mb-2">Resultado: {generation.repoName}</h1>
            <p className="text-muted-foreground">Aqui estão os materiais gerados para destacar o seu projeto.</p>
          </div>
          <a 
            href={`https://github.com/${generation.repoFullName}`} 
            target="_blank" 
            rel="noopener noreferrer"
            className={buttonVariants({ variant: "default" })}
          >
            Acessar Repositório <ExternalLink className="w-4 h-4 ml-2" />
          </a>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 items-start">
          {/* README Column */}
          <div className="bg-card border border-border rounded-3xl p-6 md:p-8 shadow-xl relative group">
            <div className="flex items-center justify-between mb-8 border-b border-border pb-6">
              <h2 className="text-2xl font-display font-bold flex items-center gap-2">
                <FileText className="text-primary w-6 h-6" />
                README Gerado
              </h2>
              <button 
                onClick={() => handleCopy(generation.readme, 'readme')}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors text-muted-foreground hover:text-white flex items-center gap-2"
                title="Copiar Markdown"
              >
                {copiedId === 'readme' ? <Check className="w-5 h-5 text-green-400" /> : <Copy className="w-5 h-5" />}
              </button>
            </div>
            
            <div className="prose prose-invert prose-p:text-muted-foreground prose-headings:font-display prose-headings:text-white prose-a:text-primary hover:prose-a:text-primary/80 prose-pre:bg-black/50 prose-pre:border prose-pre:border-white/10 prose-code:text-accent max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {generation.readme}
              </ReactMarkdown>
            </div>
          </div>

          {/* LinkedIn Posts Column */}
          <div className="space-y-6">
            <h2 className="text-2xl font-display font-bold flex items-center gap-2 mb-2 pl-2">
              <Linkedin className="text-primary w-6 h-6" />
              Posts para LinkedIn
            </h2>
            
            {generation.linkedinPosts.map((post, i) => {
              const postId = `post-${i}`;
              return (
                <div key={i} className="bg-card border border-border rounded-3xl p-6 md:p-8 shadow-lg relative hover:border-primary/30 transition-colors group">
                  <div className="absolute top-6 right-6">
                    <button 
                      onClick={() => handleCopy(post.content, postId)}
                      className="p-2.5 rounded-xl bg-white/5 hover:bg-primary hover:text-primary-foreground transition-colors text-muted-foreground shadow-sm"
                      title="Copiar Post"
                    >
                      {copiedId === postId ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                    </button>
                  </div>
                  
                  <div className="flex flex-wrap gap-2 mb-6 pr-12">
                    <Badge variant="primary">{post.tone}</Badge>
                    <Badge variant="outline">{post.targetAudience}</Badge>
                  </div>
                  
                  <h4 className="text-xl font-display font-bold mb-4 pr-12">{post.title}</h4>
                  <div className="text-muted-foreground whitespace-pre-wrap leading-relaxed">
                    {post.content}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
