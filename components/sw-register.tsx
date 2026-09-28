"use client";

import * as React from "react";

export function SwRegister() {
  React.useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
    const routes = ["", "onboarding", "erfassen", "getraenke", "dashboard"].map(
      (r) => `${basePath}/${r}`
    );
    navigator.serviceWorker
      .register(`${basePath}/sw.js`, { scope: `${basePath}/` })
      .then(() => navigator.serviceWorker.ready)
      .then((reg) => {
        const assets = performance
          .getEntriesByType("resource")
          .map((e) => e.name)
          .filter((u) => u.startsWith(location.origin));
        reg.active?.postMessage({ type: "CACHE_URLS", urls: [...routes, ...assets] });
      })
      .catch(() => {
        // Offline-Modus ist ein Bonus, kein Muss – Registrierungsfehler sind nicht kritisch.
      });
  }, []);

  return null;
}
