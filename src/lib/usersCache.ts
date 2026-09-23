import { supabaseAdmin } from "./supabase";

interface CachedUsers {
  timestamp: number;
  users: any[];
}

let usersCache: CachedUsers | null = null;
const CACHE_TTL = 30 * 1000; // 30 seconds cache TTL

export async function getCachedUsers(forceRefresh = false) {
  const now = Date.now();
  if (!forceRefresh && usersCache && (now - usersCache.timestamp < CACHE_TTL)) {
    return usersCache.users;
  }

  const { data, error } = await supabaseAdmin.auth.admin.listUsers();
  if (error) throw error;

  const users = data?.users || [];
  usersCache = { timestamp: now, users };
  return users;
}

export function invalidateUsersCache() {
  usersCache = null;
}
