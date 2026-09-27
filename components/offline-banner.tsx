"use client";

import { WifiOff } from "lucide-react";
import { useTeam } from "@/components/team-provider";

export function OfflineBanner() {
  const { isOffline, pendingCount } = useTeam();

  if (!isOffline && pendingCount === 0) return null;

  return (
    <div className="mx-4 mt-4 flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs font-medium text-amber-400">
      <WifiOff className="h-4 w-4 shrink-0" />
      <span>
        {isOffline
          ? "Offline – zuletzt gespeicherter Stand wird angezeigt."
          : "Wieder online – synchronisiere ausstehende Buchungen…"}
        {pendingCount > 0 &&
          ` ${pendingCount} Buchung${pendingCount === 1 ? "" : "en"} noch nicht synchronisiert.`}
      </span>
    </div>
  );
}
