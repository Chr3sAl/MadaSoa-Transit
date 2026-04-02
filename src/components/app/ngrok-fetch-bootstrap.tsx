"use client";

import { useEffect } from "react";

import { installNgrokFetchBypass } from "@/lib/ngrok-fetch";

export function NgrokFetchBootstrap() {
  useEffect(() => installNgrokFetchBypass(window), []);

  return null;
}
