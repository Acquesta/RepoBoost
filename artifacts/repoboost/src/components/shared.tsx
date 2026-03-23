import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { Loader2, Sparkles } from "lucide-react";
import React from "react";

export const buttonVariants = cva(
  "relative inline-flex items-center justify-center px-6 py-3 font-semibold rounded-xl transition-all duration-300 ease-out active:scale-95 disabled:opacity-50 disabled:pointer-events-none cursor-pointer overflow-hidden group",
  {
    variants: {
      variant: {
        primary: "bg-gradient-to-r from-primary to-blue-500 text-white shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/40 hover:-translate-y-0.5",
        secondary: "bg-white/10 text-white border border-white/10 hover:bg-white/15 hover:border-white/20",
        outline: "border-2 border-primary/50 text-primary hover:bg-primary/10",
        ghost: "hover:bg-white/10 text-muted-foreground hover:text-white"
      },
      size: {
        default: "px-6 py-3",
        sm: "px-4 py-2 text-sm rounded-lg",
        lg: "px-8 py-4 text-lg rounded-2xl"
      }
    },
    defaultVariants: {
      variant: "primary",
      size: "default"
    }
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  isLoading?: boolean;
}

export const PremiumButton = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, isLoading, children, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size }), className)}
        ref={ref}
        disabled={isLoading || props.disabled}
        {...props}
      >
        {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
        {children}
        {variant === 'primary' && !isLoading && (
          <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-in-out pointer-events-none" />
        )}
      </button>
    );
  }
);
PremiumButton.displayName = "PremiumButton";

export function Badge({ children, className, variant = "default" }: { children: React.ReactNode, className?: string, variant?: "default" | "outline" | "primary" }) {
  const variants = {
    default: "bg-white/10 text-white border border-white/10",
    outline: "bg-transparent text-muted-foreground border border-border",
    primary: "bg-primary/10 text-primary border border-primary/20"
  };
  return (
    <span className={cn("px-2.5 py-1 rounded-full text-xs font-medium", variants[variant], className)}>
      {children}
    </span>
  );
}

export function Spinner() {
  return (
    <div className="flex flex-col items-center justify-center p-8">
      <Loader2 className="w-8 h-8 text-primary animate-spin mb-4" />
      <p className="text-muted-foreground font-medium animate-pulse">Carregando...</p>
    </div>
  );
}

export function GeneratingOverlay() {
  return (
    <div className="fixed inset-0 z-[200] bg-background/90 backdrop-blur-xl flex flex-col items-center justify-center p-4">
       <div className="relative w-28 h-28 mb-8">
          <div className="absolute inset-0 rounded-full border-t-2 border-l-2 border-primary animate-spin" />
          <div className="absolute inset-2 rounded-full border-r-2 border-b-2 border-blue-500 animate-[spin_1.5s_linear_infinite_reverse]" />
          <div className="absolute inset-4 rounded-full border-t-2 border-accent animate-[spin_2s_linear_infinite]" />
          <Sparkles className="absolute inset-0 m-auto w-10 h-10 text-primary animate-pulse" />
       </div>
       <h2 className="text-3xl md:text-4xl font-display font-bold text-white mb-3 text-center">Criando sua autoridade...</h2>
       <p className="text-muted-foreground text-center max-w-md text-lg">
         Nossa IA está analisando seu código, estruturando o README e redigindo posts engajadores para o LinkedIn.
       </p>
    </div>
  );
}
