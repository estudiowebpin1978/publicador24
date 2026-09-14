"use client";

import { useEffect } from "react";

export function PWARegistration() {
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .then((registration) => {
          console.log("ServiceWorker registered:", registration.scope);
        })
        .catch((error) => {
          console.error("ServiceWorker registration failed:", error);
        });
    }
  }, []);

  return null;
}
