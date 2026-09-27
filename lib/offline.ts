import type { Beverage, ConsumptionWithDetails, Member, Team } from "@/lib/types";

interface CachedData {
  team: Team;
  members: Member[];
  beverages: Beverage[];
  consumptions: ConsumptionWithDetails[];
  cachedAt: number;
}

export interface QueuedConsumption {
  localId: string;
  memberId: string;
  beverageId: string;
  quantity: number;
  timestamp: string;
}

const cacheKey = (teamId: string) => `aida_cache_${teamId}`;
const queueKey = (teamId: string) => `aida_queue_${teamId}`;

export function saveCache(teamId: string, data: Omit<CachedData, "cachedAt">) {
  try {
    window.localStorage.setItem(cacheKey(teamId), JSON.stringify({ ...data, cachedAt: Date.now() }));
  } catch {
    // Speicher voll o.ä. – der Offline-Cache ist ein Bonus, kein Muss.
  }
}

export function loadCache(teamId: string): CachedData | null {
  try {
    const raw = window.localStorage.getItem(cacheKey(teamId));
    return raw ? (JSON.parse(raw) as CachedData) : null;
  } catch {
    return null;
  }
}

export function getQueue(teamId: string): QueuedConsumption[] {
  try {
    const raw = window.localStorage.getItem(queueKey(teamId));
    return raw ? (JSON.parse(raw) as QueuedConsumption[]) : [];
  } catch {
    return [];
  }
}

function saveQueue(teamId: string, queue: QueuedConsumption[]) {
  try {
    window.localStorage.setItem(queueKey(teamId), JSON.stringify(queue));
  } catch {
    // ignore
  }
}

export function enqueueConsumption(teamId: string, item: QueuedConsumption) {
  saveQueue(teamId, [...getQueue(teamId), item]);
}

export function removeFromQueue(teamId: string, localId: string) {
  saveQueue(
    teamId,
    getQueue(teamId).filter((q) => q.localId !== localId)
  );
}

export function isLocalId(id: string) {
  return id.startsWith("local-");
}

export function makeLocalId() {
  return `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
