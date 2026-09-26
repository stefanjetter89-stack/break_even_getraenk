import { TeamProvider } from "@/components/team-provider";
import { BottomNav } from "@/components/bottom-nav";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <TeamProvider>
      <div className="mx-auto min-h-screen max-w-md pb-24">{children}</div>
      <BottomNav />
    </TeamProvider>
  );
}
