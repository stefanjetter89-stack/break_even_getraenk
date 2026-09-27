import { TeamProvider } from "@/components/team-provider";
import { BottomNav } from "@/components/bottom-nav";
import { OfflineBanner } from "@/components/offline-banner";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <TeamProvider>
      <div className="mx-auto min-h-screen max-w-md pb-24">
        <OfflineBanner />
        {children}
      </div>
      <BottomNav />
    </TeamProvider>
  );
}
