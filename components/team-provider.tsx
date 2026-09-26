"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { getSession, clearSession } from "@/lib/session";
import { getTeam, getMembers, getBeverages, getConsumptions } from "@/lib/data";
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
    } catch (e) {
      console.error(e);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [session]);

  React.useEffect(() => {
    if (!session) {
      router.replace("/onboarding");
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data fetch on mount
    load();
  }, [session, router, load]);

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
        consumptions,
        currentMember,
        activeMemberId: activeMember?.id ?? currentMember.id,
        setActiveMemberId,
        refresh: load,
        loading,
      }}
    >
      {children}
    </TeamContext.Provider>
  );
}
