// Multi-database connection manager.
// Lets the app point at the default Lovable Cloud project OR a user-supplied
// external Supabase project (URL + key). Active selection persists in
// localStorage and is used by firebaseApi.ts via getActiveClient().

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { supabase as defaultClient } from "@/integrations/supabase/client";

export type DbConnection = {
  id: string;
  label: string;
  url: string;
  key: string; // service role or anon key (user-supplied)
  isDefault?: boolean;
  createdAt?: string;
};

const STORAGE_KEY = "janki_db_connections_v1";
const ACTIVE_KEY = "janki_db_active_v1";
const DEFAULT_ID = "lovable-cloud";

export const DB_EVENTS = {
  CHANGED: "db-connection-changed",
};

const DEFAULT_URL = (import.meta as any).env?.VITE_SUPABASE_URL || "";
const DEFAULT_KEY = (import.meta as any).env?.VITE_SUPABASE_PUBLISHABLE_KEY || "";

const defaultConnection: DbConnection = {
  id: DEFAULT_ID,
  label: "Lovable Cloud (default)",
  url: DEFAULT_URL,
  key: DEFAULT_KEY,
  isDefault: true,
};

// In-memory cache of created clients per connection id
const clientCache = new Map<string, SupabaseClient>();
clientCache.set(DEFAULT_ID, defaultClient as unknown as SupabaseClient);

function readStored(): DbConnection[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (c) => c && typeof c.id === "string" && typeof c.url === "string" && typeof c.key === "string",
    );
  } catch {
    return [];
  }
}

function writeStored(list: DbConnection[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export function listConnections(): DbConnection[] {
  return [defaultConnection, ...readStored()];
}

export function getActiveId(): string {
  try {
    return localStorage.getItem(ACTIVE_KEY) || DEFAULT_ID;
  } catch {
    return DEFAULT_ID;
  }
}

export function getActiveConnection(): DbConnection {
  const id = getActiveId();
  return listConnections().find((c) => c.id === id) || defaultConnection;
}

export function getClientFor(conn: DbConnection): SupabaseClient {
  if (clientCache.has(conn.id)) return clientCache.get(conn.id)!;
  const c = createClient(conn.url, conn.key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  clientCache.set(conn.id, c);
  return c;
}

export function getActiveClient(): SupabaseClient {
  return getClientFor(getActiveConnection());
}

export function setActive(id: string) {
  const conn = listConnections().find((c) => c.id === id);
  if (!conn) return;
  localStorage.setItem(ACTIVE_KEY, id);
  window.dispatchEvent(new CustomEvent(DB_EVENTS.CHANGED, { detail: { id } }));
}

export function addConnection(input: { label: string; url: string; key: string }): DbConnection {
  const id = `ext-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const conn: DbConnection = {
    id,
    label: input.label.trim() || "External Supabase",
    url: input.url.trim().replace(/\/+$/, ""),
    key: input.key.trim(),
    createdAt: new Date().toISOString(),
  };
  const stored = readStored();
  stored.push(conn);
  writeStored(stored);
  window.dispatchEvent(new CustomEvent(DB_EVENTS.CHANGED, { detail: { id } }));
  return conn;
}

export function updateConnection(id: string, patch: Partial<Pick<DbConnection, "label" | "url" | "key">>) {
  if (id === DEFAULT_ID) return;
  const stored = readStored();
  const idx = stored.findIndex((c) => c.id === id);
  if (idx < 0) return;
  stored[idx] = { ...stored[idx], ...patch };
  writeStored(stored);
  clientCache.delete(id);
  window.dispatchEvent(new CustomEvent(DB_EVENTS.CHANGED, { detail: { id } }));
}

export function removeConnection(id: string) {
  if (id === DEFAULT_ID) return;
  const stored = readStored().filter((c) => c.id !== id);
  writeStored(stored);
  clientCache.delete(id);
  if (getActiveId() === id) setActive(DEFAULT_ID);
  window.dispatchEvent(new CustomEvent(DB_EVENTS.CHANGED, { detail: { id } }));
}

export async function testConnection(conn: DbConnection): Promise<{ ok: boolean; error?: string }> {
  try {
    const client = getClientFor(conn);
    const { error } = await client.from("_lovable_probe_does_not_exist").select("*").limit(1);
    // A "table not found" / 42P01 / PGRST205 means the connection itself works.
    if (!error) return { ok: true };
    const msg = error.message || "";
    const code = (error as any).code || "";
    if (
      code === "42P01" ||
      code === "PGRST205" ||
      /not.*find|does not exist|relation/i.test(msg)
    ) {
      return { ok: true };
    }
    return { ok: false, error: msg };
  } catch (e: any) {
    return { ok: false, error: String(e?.message || e) };
  }
}

export const DEFAULT_CONNECTION_ID = DEFAULT_ID;
