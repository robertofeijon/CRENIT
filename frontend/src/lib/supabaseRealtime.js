import { createClient } from "@supabase/supabase-js";
import { apiRequest } from "./api";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

export async function subscribeTenantSupabaseRealtime(appToken, handlers = {}) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY.");
  }

  const bridge = await apiRequest("/api/realtime/supabase-token", { method: "GET" }, appToken);
  const supabaseToken = String(bridge?.token || "");
  const userId = String(bridge?.userId || "");
  if (!supabaseToken || !userId) {
    throw new Error("Realtime bridge did not return a usable token.");
  }

  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    }
  });

  client.realtime.setAuth(supabaseToken);

  const channel = client
    .channel(`tenant-db-live-${userId}`)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "payments", filter: `tenant_id=eq.${userId}` },
      (payload) => {
        if (typeof handlers.onPayment === "function") {
          handlers.onPayment(payload);
        }
      }
    )
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "credit_snapshots", filter: `tenant_id=eq.${userId}` },
      (payload) => {
        if (typeof handlers.onCredit === "function") {
          handlers.onCredit(payload);
        }
      }
    )
    .subscribe((status) => {
      if ((status === "CHANNEL_ERROR" || status === "TIMED_OUT") && typeof handlers.onError === "function") {
        handlers.onError(new Error(`Supabase realtime status: ${status}`));
      }
    });

  return () => {
    client.removeChannel(channel);
    client.realtime.disconnect();
  };
}