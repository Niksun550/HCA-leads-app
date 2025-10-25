import { Sun } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
       <div className="absolute top-8 left-8 flex items-center gap-2">
        <Sun className="h-8 w-8 text-primary" />
        <h1 className="text-2xl font-bold font-headline text-foreground">SolarLeads</h1>
      </div>
      {children}
    </main>
  );
}
