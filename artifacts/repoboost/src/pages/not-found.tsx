import { AppLayout } from "@/components/layout/AppLayout";
import { Link } from "wouter";
import { buttonVariants } from "@/components/shared";
import { AlertCircle } from "lucide-react";

export default function NotFound() {
  return (
    <AppLayout>
      <div className="flex-1 flex flex-col items-center justify-center p-4 text-center">
        <AlertCircle className="w-16 h-16 text-primary mb-6 opacity-80" />
        <h1 className="text-4xl md:text-5xl font-display font-bold mb-4">404 - Não Encontrado</h1>
        <p className="text-muted-foreground text-lg mb-8 max-w-md">
          A página que você está procurando não existe ou foi movida.
        </p>
        <Link href="/" className={buttonVariants({ variant: "primary", size: "lg" })}>
          Voltar para Início
        </Link>
      </div>
    </AppLayout>
  );
}
