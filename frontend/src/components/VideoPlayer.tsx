import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize, Minimize, Settings, Rewind, FastForward, Loader2, ExternalLink } from 'lucide-react';
import { LOADING_GIF_PATH } from '../constants';
import axios from 'axios';

interface VideoPlayerProps {
  src: string;
  type: string;
  title: string;
  videoId?: string;
}

type QualityMap = Record<string, string>; // { "360": url, "720": url, "1080": url, ... }

const API_BASE = import.meta.env.VITE_BACKEND_URL || "/api";

/* ─────────────────────────────────────────────────────────────
   HQPORNER RESOLVER
───────────────────────────────────────────────────────────── */

function HQPornerPlayer({ src, title, videoId }: { src: string; title: string; videoId?: string }) {
  type State = "idle" | "loading" | "playing" | "error";

  const [state, setState]           = useState<State>("idle");
  const [cdnUrl, setCdnUrl]         = useState<string>("");
  const [qualityMap, setQualityMap] = useState<QualityMap>({});
  const [errMsg, setErrMsg]         = useState<string>("");

  const handlePlay = async () => {
    setState("loading");
    setErrMsg("");

    try {
      const res = await axios.post(`${API_BASE}/videos/resolve`, { pageUrl: src, videoId });

      const url = res.data?.cdnUrl;
      if (!url) throw new Error("No CDN URL returned");

      setQualityMap(res.data?.qualityMap || {});
      setCdnUrl(url);
      setState("playing");
    } catch (err: any) {
      const fallback = err?.response?.data?.fallbackUrl;
      setErrMsg(fallback ? "" : (err?.response?.data?.error || "Could not load video"));
      setState("error");
      if (fallback) window.open(fallback, "_blank");
    }
  };

  if (state === "playing" && cdnUrl) {
    return <NativePlayer src={cdnUrl} title={title} qualityMap={qualityMap} />;
  }

  return (
    <div className="w-full aspect-video bg-black rounded-2xl overflow-hidden flex flex-col items-center justify-center gap-4 border border-border-subtle relative">
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 to-black/90" />
      <div className="relative z-10 flex flex-col items-center gap-4 px-6 text-center">
        {state === "idle" && (
          <>
            <button
              onClick={handlePlay}
              className="w-20 h-20 bg-primary hover:bg-primary/80 rounded-full flex items-center justify-center shadow-2xl shadow-primary/40 transition-all hover:scale-105 active:scale-95"
            >
              <Play className="w-9 h-9 text-white ml-1" />
            </button>
            <p className="text-white/60 text-sm">Click to load video</p>
            <p className="text-white/30 text-xs">May take 10–15 seconds</p>
          </>
        )}
        {state === "loading" && (
          <>
            <Loader2 className="w-14 h-14 text-primary animate-spin" />
            <p className="text-white/80 text-sm font-medium">Fetching video stream…</p>
            <p className="text-white/40 text-xs">This takes 10–15 seconds</p>
          </>
        )}
        {state === "error" && (
          <>
            <p className="text-rose-400 font-semibold">{errMsg || "Could not load stream"}</p>
            <div className="flex gap-3">
              <button onClick={handlePlay} className="px-4 py-2 bg-primary text-white rounded-xl text-sm font-medium hover:opacity-90 transition">
                Try again
              </button>
              <a href={src} target="_blank" rel="noopener noreferrer"
                className="px-4 py-2 bg-white/10 text-white rounded-xl text-sm font-medium hover:bg-white/20 transition flex items-center gap-1">
                <ExternalLink className="w-4 h-4" /> Watch on HQPorner
              </a>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   NATIVE VIDEO PLAYER
───────────────────────────────────────────────────────────── */

function NativePlayer({ src, title, qualityMap = {} }: { src: string; title: string; qualityMap?: QualityMap }) {
  const videoRef     = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Available quality labels sorted best-first: ["2160","1080","720","360"]
  const availableQualities = Object.keys(qualityMap).sort((a, b) => parseInt(b) - parseInt(a));
  const hasQualities = availableQualities.length > 0;

  // Current quality label — default to highest available or "auto"
  const [quality, setQuality]             = useState<string>(availableQualities[0] || "auto");
  const [activeSrc, setActiveSrc]         = useState<string>(src);
  const [showSettings, setShowSettings]   = useState(false);

  const [isPlaying, setIsPlaying]         = useState(false);
  const [volume, setVolume]               = useState(1);
  const [isMuted, setIsMuted]             = useState(false);
  const [progress, setProgress]           = useState(0);
  const [duration, setDuration]           = useState(0);
  const [isFullscreen, setIsFullscreen]   = useState(false);
  const [showControls, setShowControls]   = useState(true);
  const [isBuffering, setIsBuffering]     = useState(false);

  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTapTimeRef     = useRef<number>(0);
  const savedTimeRef       = useRef<number>(0);

  const togglePlay = useCallback(() => {
    if (!videoRef.current) return;
    videoRef.current.paused ? videoRef.current.play() : videoRef.current.pause();
  }, []);

  // Switch quality: save current time, swap src, restore time after load
  const switchQuality = (q: string) => {
    const newUrl = qualityMap[q];
    if (!newUrl || newUrl === activeSrc) { setShowSettings(false); return; }

    if (videoRef.current) savedTimeRef.current = videoRef.current.currentTime;
    setQuality(q);
    setActiveSrc(newUrl);
    setShowSettings(false);
  };

  // After src swap, restore playback position
  useEffect(() => {
    const v = videoRef.current;
    if (!v || savedTimeRef.current === 0) return;

    const onLoaded = () => {
      v.currentTime = savedTimeRef.current;
      v.play().catch(() => {});
    };
    v.addEventListener("loadedmetadata", onLoaded, { once: true });
    return () => v.removeEventListener("loadedmetadata", onLoaded);
  }, [activeSrc]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === "INPUT") return;
      if (e.key === " " || e.key === "k") { e.preventDefault(); togglePlay(); }
      if (e.key === "ArrowRight") { e.preventDefault(); if (videoRef.current) videoRef.current.currentTime += 5; }
      if (e.key === "ArrowLeft")  { e.preventDefault(); if (videoRef.current) videoRef.current.currentTime -= 5; }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [togglePlay]);

  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) setShowControls(false);
    }, 3000);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    const now = Date.now();
    if (now - lastTapTimeRef.current < 300 && videoRef.current && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      videoRef.current.currentTime += e.touches[0].clientX - rect.left > rect.width / 2 ? 5 : -5;
      lastTapTimeRef.current = 0;
    } else {
      lastTapTimeRef.current = now;
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value);
    setProgress(v);
    if (videoRef.current) videoRef.current.currentTime = (v / 100) * videoRef.current.duration;
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value);
    setVolume(v);
    if (videoRef.current) { videoRef.current.volume = v; videoRef.current.muted = v === 0; setIsMuted(v === 0); }
  };

  const toggleFullscreen = async () => {
    if (!document.fullscreenElement) await containerRef.current?.requestFullscreen?.();
    else await document.exitFullscreen?.();
  };

  const formatTime = (t: number) => {
    if (isNaN(t)) return "0:00";
    const m = Math.floor(t / 60), s = Math.floor(t % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  const qualityLabel = (q: string) => {
    if (q === "2160") return "4K";
    if (q === "1440") return "2K";
    return q + "p";
  };

  return (
    <div
      ref={containerRef}
      className={`w-full bg-black relative group ${
        isFullscreen ? "h-screen rounded-none" : "aspect-video rounded-2xl overflow-hidden shadow-xl border border-border-subtle"
      }`}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => isPlaying && setShowControls(false)}
    >
      <video
        ref={videoRef}
        src={activeSrc}
        className="w-full h-full object-contain"
        onTimeUpdate={() => {
          if (videoRef.current)
            setProgress((videoRef.current.currentTime / videoRef.current.duration) * 100);
        }}
        onLoadedMetadata={() => { if (videoRef.current) setDuration(videoRef.current.duration); }}
        onWaiting={() => setIsBuffering(true)}
        onPlaying={() => setIsBuffering(false)}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onClick={() => window.matchMedia("(pointer: coarse)").matches ? setShowControls(v => !v) : togglePlay()}
        onTouchStart={handleTouchStart}
        onDoubleClick={(e) => {
          if (!videoRef.current || !containerRef.current) return;
          const rect = containerRef.current.getBoundingClientRect();
          videoRef.current.currentTime += e.clientX - rect.left > rect.width / 2 ? 5 : -5;
        }}
        autoPlay
      />

      {isBuffering && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 z-10">
          <img src={LOADING_GIF_PATH} alt="Buffering" className="w-16 h-16 object-contain" referrerPolicy="no-referrer" />
        </div>
      )}

      {/* Controls */}
      <div className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent px-4 pt-16 pb-4 transition-opacity duration-300 ${showControls ? "opacity-100" : "opacity-0"}`}>
        {/* Progress bar */}
        <div className="mb-4">
          <input
            type="range" min="0" max="100" value={progress}
            onChange={handleSeek} onClick={e => e.stopPropagation()}
            className="w-full h-1 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:rounded-full"
            style={{ background: `linear-gradient(to right, var(--theme-primary) ${progress}%, rgba(255,255,255,0.3) ${progress}%)` }}
          />
        </div>

        <div className="flex items-center justify-between">
          {/* Left controls */}
          <div className="flex items-center gap-4">
            <button onClick={() => { if (videoRef.current) videoRef.current.currentTime -= 5; }} className="text-white hover:text-primary transition-colors"><Rewind className="w-5 h-5" /></button>
            <button onClick={togglePlay} className="text-white hover:text-primary transition-colors">
              {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
            </button>
            <button onClick={() => { if (videoRef.current) videoRef.current.currentTime += 5; }} className="text-white hover:text-primary transition-colors"><FastForward className="w-5 h-5" /></button>

            <div className="flex items-center gap-2 group/vol">
              <button onClick={toggleMute} className="text-white hover:text-primary transition-colors">
                {isMuted || volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
              </button>
              <input
                type="range" min="0" max="1" step="0.05" value={isMuted ? 0 : volume}
                onChange={handleVolumeChange} onClick={e => e.stopPropagation()}
                className="w-20 h-1 rounded-full appearance-none cursor-pointer hidden group-hover/vol:block [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full"
                style={{ background: `linear-gradient(to right, white ${(isMuted ? 0 : volume) * 100}%, rgba(255,255,255,0.3) ${(isMuted ? 0 : volume) * 100}%)` }}
              />
            </div>

            <span className="text-white/90 text-sm font-medium">
              {formatTime(videoRef.current?.currentTime || 0)} / {formatTime(duration)}
            </span>
          </div>

          {/* Right controls */}
          <div className="flex items-center gap-4 relative">
            {/* Quality selector — only shown for hqporner videos with a quality map */}
            {hasQualities && (
              <div className="relative">
                <button
                  onClick={() => setShowSettings(s => !s)}
                  className="text-white hover:text-primary transition-colors flex items-center gap-1"
                >
                  <Settings className="w-5 h-5" />
                  <span className="text-xs font-bold">{qualityLabel(quality)}</span>
                </button>

                {showSettings && (
                  <div className="absolute bottom-full right-0 mb-4 bg-surface/95 backdrop-blur-md border border-border-subtle rounded-xl py-2 min-w-[120px] shadow-2xl z-50">
                    <div className="px-3 py-1 text-xs font-semibold text-content-muted uppercase tracking-wider border-b border-border-subtle mb-1">
                      Quality
                    </div>
                    {availableQualities.map(q => (
                      <button
                        key={q}
                        onClick={() => switchQuality(q)}
                        className={`w-full text-left px-4 py-2 text-sm hover:bg-white/10 transition-colors ${
                          quality === q ? "text-primary font-bold" : "text-content"
                        }`}
                      >
                        {qualityLabel(q)}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <button onClick={toggleFullscreen} className="text-white hover:text-primary transition-colors">
              {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   MAIN VideoPlayer — routes by type
───────────────────────────────────────────────────────────── */

export default function VideoPlayer({ src, type, title, videoId }: VideoPlayerProps) {
  if (type === "hqporner") {
    return <HQPornerPlayer src={src} title={title} videoId={videoId} />;
  }

  if (type !== "mp4") {
    return (
      <div className="w-full aspect-video bg-black rounded-2xl overflow-hidden relative shadow-xl border border-border-subtle">
        <iframe
          src={src}
          className="w-full h-full border-0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          title={title}
        />
      </div>
    );
  }

  return <NativePlayer src={src} title={title} />;
}
