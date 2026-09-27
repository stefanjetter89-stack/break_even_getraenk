"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { getSession, clearSession } from "@/lib/session";
import { addConsumption, getTeam, getMembers, getBeverages, getConsumptions } from "@/lib/data";
import {
  enqueueConsumption,
  getQueue,
  loadCache,
  makeLocalId,
  removeFromQueue,
  saveCache,
  type QueuedConsumption,
} from "@/lib/offline";
import type { Beverage, ConsumptionWithDetails, Member, Team } from "@/lib/types";

interface TeamContextValue {
  team: Team;
  members: Member[];
  beverages: Beverage[];
  consumptions: ConsumptionWithDetails[];
  currentMember: Member;
  activeMemberId: string;
  setActiveMemberId: (id: string) => void;
  refresh: () => Promise<void>;
  loading: boolean;
  isOffline: boolean;
  pendingCount: number;
  bookConsumption: (params: { memberId: string; beverageId: string; quantity: number }) => Promise<void>;
  removePendingConsumption: (localId: string) => void;
}

const TeamContext = React.createContext<TeamContextValue | null>(null);

export function useTeam() {
  const ctx = React.useContext(TeamContext);
  if (!ctx) throw new Error("useTeam muss innerhalb von TeamProvider verwendet werden.");
  return ctx;
}

export function TeamProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [team, setTeam] = React.useState<Team | null>(null);
  const [members, setMembers] = React.useState<Member[]>([]);
  const [beverages, setBeverages] = React.useState<Beverage[]>([]);
  const [consumptions, setConsumptions] = React.useState<ConsumptionWithDetails[]>([]);
  const [pendingQueue, setPendingQueue] = React.useState<QueuedConsumption[]>([]);
  const [isOffline, setIsOffline] = React.useState(false);
  const session = React.useMemo(() => getSession(), []);
  const [activeMemberId, setActiveMemberId] = React.useState<string>(session?.memberId ?? "");
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(false);

  const load = React.useCallback(async () => {
    if (!session) return;
    try {
      const [teamData, membersData, beveragesData] = await Promise.all([
        getTeam(session.teamId),
        getMembers(session.teamId),
        getBeverages(session.teamId),
      ]);
      const consumptionsData = await getConsumptions(membersData.map((m) => m.id));
      setTeam(teamData);
      setMembers(membersData);
      setBeverages(beveragesData);
      setConsumptions(consumptionsData);
      setIsOffline(false);
      saveCache(session.teamId, {
        team: teamData,
        members: membersData,
        beverages: beveragesData,
        consumptions: consumptionsData,
      });
    } catch (e) {
      console.error(e);
      const cached = loadCache(session.teamId);
      if (cached) {
        setTeam(cached.team);
        setMembers(cached.members);
        setBeverages(cached.beverages);
        setConsumptions(cached.consumptions);
        setIsOffline(true);
      } else {
        setError(true);
      }
    } finally {
      setPendingQueue(getQueue(session.teamId));
      setLoading(false);
    }
  }, [session]);

  const syncQueue = React.useCallback(async () => {
    if (!session) return;
    const queue = getQueue(session.teamId);
    if (queue.length === 0) return;
    for (const item of queue) {
      try {
        await addConsumption({
          memberId: item.memberId,
          beverageId: item.beverageId,
          quantity: item.quantity,
        });
        removeFromQueue(session.teamId, item.localId);
      } catch {
        break;
      }
    }
    setPendingQueue(getQueue(session.teamId));
    await load();
  }, [session, load]);

  React.useEffect(() => {
    if (!session) {
      router.replace("/onboarding");
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data fetch on mount
    load().then(() => syncQueue());
  }, [session, router, load, syncQueue]);

  React.useEffect(() => {
    window.addEventListener("online", syncQueue);
    return () => window.removeEventListener("online", syncQueue);
  }, [syncQueue]);

  const bookConsumption = React.useCallback(
    async (params: { memberId: string; beverageId: string; quantity: number }) => {
      if (!session) return;
      try {
        await addConsumption(params);
        await load();
      } catch (e) {
        console.error(e);
        const item: QueuedConsumption = {
          localId: makeLocalId(),
          ...params,
          timestamp: new Date().toISOString(),
        };
        enqueueConsumption(session.teamId, item);
        setPendingQueue(getQueue(session.teamId));
        setIsOffline(true);
      }
    },
    [session, load]
  );

  const removePendingConsumption = React.useCallback(
    (localId: string) => {
      if (!session) return;
      removeFromQueue(session.teamId, localId);
      setPendingQueue(getQueue(session.teamId));
    },
    [session]
  );

  const mergedConsumptions = React.useMemo<ConsumptionWithDetails[]>(() => {
    const pendingDetailed: ConsumptionWithDetails[] = pendingQueue.map((q) => {
      const member = members.find((m) => m.id === q.memberId);
      const beverage = beverages.find((b) => b.id === q.beverageId);
      return {
        id: q.localId,
        member_id: q.memberId,
        beverage_id: q.beverageId,
        quantity: q.quantity,
        timestamp: q.timestamp,
        member: { id: q.memberId, name: member?.name ?? "…" },
        beverage: {
          id: q.beverageId,
          name: beverage?.name ?? "…",
          price: beverage?.price ?? 0,
          category: beverage?.category ?? "",
        },
        pending: true,
      };
    });
    return [...pendingDetailed, ...consumptions];
  }, [pendingQueue, consumptions, members, beverages]);

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="text-foreground">
          Dein Team konnte nicht geladen werden. Möglicherweise wurde die Sitzung ungültig.
        </p>
        <button
          className="rounded-md bg-primary px-4 py-2 text-primary-foreground"
          onClick={() => {
            clearSession();
            router.replace("/onboarding");
          }}
        >
          Zurück zum Start
        </button>
      </div>
    );
  }

  if (loading || !session || !team) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-primary" />
      </div>
    );
  }

  const currentMember = members.find((m) => m.id === session.memberId) ?? members[0];
  const activeMember = members.find((m) => m.id === activeMemberId) ?? currentMember;

  if (!currentMember) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="text-foreground">Dein Mitgliedsprofil wurde nicht gefunden.</p>
        <button
          className="rounded-md bg-primary px-4 py-2 text-primary-foreground"
          onClick={() => {
            clearSession();
            router.replace("/onboarding");
          }}
        >
          Zurück zum Start
        </button>
      </div>
    );
  }

  return (
    <TeamContext.Provider
      value={{
        team,
        members,
        beverages,
        consumptions: mergedConsumptions,
        currentMember,
        activeMemberId: activeMember?.id ?? currentMember.id,
        setActiveMemberId,
        refresh: load,
        loading,
        isOffline,
        pendingCount: pendingQueue.length,
        bookConsumption,
        removePendingConsumption,
      }}
    >
      {children}
    </TeamContext.Provider>
  );
}
