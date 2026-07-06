// Offline fetch interceptor. In the Capacitor/static (offline) build there is no
// server, so we patch window.fetch to answer /api/* calls from the local compute
// layer — the 13 components keep calling fetch() unchanged. Only active when
// NEXT_PUBLIC_OFFLINE=1 (web/desktop builds keep their real API routes, and the
// heavy compute layer is dynamically imported so it never enters their bundle).

let installed = false;

export function installApiShim() {
  if (installed || typeof window === "undefined") return;
  if (process.env.NEXT_PUBLIC_OFFLINE !== "1") return;
  installed = true;

  const realFetch = window.fetch.bind(window);
  const json = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });

  // Lazily loaded on the first /api call so it isn't in the web/desktop bundle.
  let mods: Promise<{ C: typeof import("./compute"); searchCities: typeof import("./cities-client")["searchCities"] }> | null = null;
  const load = () => (mods ??= Promise.all([import("./compute"), import("./cities-client")]).then(([C, g]) => ({ C, searchCities: g.searchCities })));

  window.fetch = (async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : (input as Request).url;
    const path = url.replace(/^https?:\/\/[^/]+/, "").split("?")[0];
    if (!path.startsWith("/api/")) return realFetch(input as RequestInfo, init);

    try {
      const { C, searchCities } = await load();
      if (path === "/api/cities") {
        const q = new URL(url, "http://x").searchParams.get("q") ?? "";
        return json({ cities: await searchCities(q) });
      }
      const body = init?.body ? JSON.parse(init.body as string) : {};
      const route: Record<string, (b: unknown) => unknown> = {
        "/api/chart": C.chartRoute, "/api/report": C.reportRoute, "/api/details": C.detailsRoute,
        "/api/shadbala": C.shadbalaRoute, "/api/transits": C.transitsRoute, "/api/forecast": C.forecastRoute,
        "/api/muhurta": C.muhurtaRoute, "/api/varsha": C.varshaRoute, "/api/compat": C.compatRoute,
        "/api/kp-horary": C.kpHoraryRoute, "/api/interpret": C.interpretRoute, "/api/ask": C.askRoute,
      } as Record<string, (b: unknown) => unknown>;
      const handler = route[path];
      if (!handler) return json({ error: `No offline handler for ${path}` }, 404);
      return json(handler(body));
    } catch (e) {
      return json({ error: e instanceof Error ? e.message : "Offline compute failed" }, 500);
    }
  }) as typeof window.fetch;
}
