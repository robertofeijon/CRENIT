import { subscribeTenantSupabaseRealtime } from "./supabaseRealtime";

function subscribeTenantSSE(token, handlers = {}) {
  if (!token) {
    return () => {};
  }

  const url = new URL("/api/realtime/tenant", window.location.origin);
  url.searchParams.set("token", token);
  const source = new EventSource(url.toString());

  const onPayment = handlers.onPayment;
  const onCredit = handlers.onCredit;
  const onAutoPay = handlers.onAutoPay;

  source.addEventListener("tenant.payment.completed", (event) => {
    if (typeof onPayment === "function") {
      onPayment(event);
    }
  });

  source.addEventListener("tenant.credit.updated", (event) => {
    if (typeof onCredit === "function") {
      onCredit(event);
    }
  });

  source.addEventListener("tenant.autopay.updated", (event) => {
    if (typeof onAutoPay === "function") {
      onAutoPay(event);
    }
  });

  return () => {
    source.close();
  };
}

export function subscribeTenantRealtime(token, handlers = {}) {
  const sseForAutopay = subscribeTenantSSE(token, {
    onAutoPay: handlers.onAutoPay
  });

  let cleanupDb = () => {};
  let cancelled = false;

  subscribeTenantSupabaseRealtime(token, {
    onPayment: handlers.onPayment,
    onCredit: handlers.onCredit,
    onError: () => {
      if (cancelled) {
        return;
      }
      cleanupDb = subscribeTenantSSE(token, {
        onPayment: handlers.onPayment,
        onCredit: handlers.onCredit
      });
    }
  })
    .then((cleanup) => {
      if (cancelled) {
        cleanup();
        return;
      }
      cleanupDb = cleanup;
    })
    .catch(() => {
      if (cancelled) {
        return;
      }
      cleanupDb = subscribeTenantSSE(token, {
        onPayment: handlers.onPayment,
        onCredit: handlers.onCredit
      });
    });

  return () => {
    cancelled = true;
    cleanupDb();
    sseForAutopay();
  };
}
