"use client";

import * as React from "react";

export function SwRegister() {
  React.useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
    navigator.serviceWorker.register(`${basePath}/sw.js`, { scope: `${basePath}/` }).catch(() => {
      // Offline-Modus ist ein Bonus, kein Muss – Registrierungsfehler sind nicht kritisch.
    });
  }, []);

  return null;
}
