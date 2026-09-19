"use client";
import { useEffect, useState } from "react";
import { isFullListLoaded, loadAllLocations } from "@/domain/locations";

/** Starts loading the full airport list and re-renders the caller once it is available. */
export function useLocationsReady(): boolean {
  const [ready, setReady] = useState(isFullListLoaded);
  useEffect(() => {
    if (ready) return;
    let live = true;
    loadAllLocations().then(() => live && setReady(true)).catch(() => {});
    return () => { live = false; };
  }, [ready]);
  return ready;
}
