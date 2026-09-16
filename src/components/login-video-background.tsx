"use client";

import { useEffect, useRef } from "react";

export const LOGIN_VIDEO_SRC =
  "https://stream.mux.com/Aa02T7oM1wH5Mk5EEVDYhbZ1ChcdhRsS2m1NYyx4Ua1g.m3u8";

export function LoginVideoBackground() {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let hls: { destroy: () => void } | null = null;

    async function attach() {
      const el = videoRef.current;
      if (!el) return;

      if (el.canPlayType("application/vnd.apple.mpegurl")) {
        el.src = LOGIN_VIDEO_SRC;
        void el.play().catch(() => undefined);
        return;
      }

      const { default: Hls } = await import("hls.js");
      if (!Hls.isSupported()) return;

      const instance = new Hls({ enableWorker: true });
      instance.loadSource(LOGIN_VIDEO_SRC);
      instance.attachMedia(el);
      hls = instance;
    }

    void attach();

    return () => {
      hls?.destroy();
    };
  }, []);

  return (
    <div className="pointer-events-none absolute inset-0 z-0">
      <video
        ref={videoRef}
        className="h-full w-full object-cover"
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        aria-hidden
      />
      <div
        className="absolute inset-0"
        style={{
          background: "rgba(11, 15, 13, 0.52)",
        }}
      />
    </div>
  );
}
