import React, { useState, useRef, useEffect, useCallback, ChangeEvent } from "react";
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Maximize, 
  Minimize, 
  Settings, 
  RotateCcw, 
  RotateCw,
  Check,
  ChevronRight
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { LOADING_GIF_PATH } from "../constants";

interface AdvancedVideoPlayerProps {
  src: string;
  title: string;
  poster?: string;
}

type Quality = "480p" | "720p" | "1080p" | "1440p" | "4K";

export function AdvancedVideoPlayer({ src, title, poster }: AdvancedVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [quality, setQuality] = useState<Quality | "Auto">("Auto");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isBuffering, setIsBuffering] = useState(false);
  const [detectedQuality, setDetectedQuality] = useState<Quality>("1080p");

  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastTapTimeRef = useRef<number>(0);

  // Simulate Auto quality detection
  useEffect(() => {
    if (quality === "Auto") {
      const qualities: Quality[] = ["4K", "1440p", "1080p", "720p", "480p"];
      // Randomly select a quality to simulate "detection"
      const randomQuality = qualities[Math.floor(Math.random() * qualities.length)];
      setDetectedQuality(randomQuality);
    }
  }, [quality]);

  const togglePlay = useCallback(() => {
    if (videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play();
      } else {
        videoRef.current.pause();
      }
    }
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;

      switch (e.key) {
        case ' ':
        case 'k':
          e.preventDefault();
          togglePlay();
          break;
        case 'ArrowRight':
          e.preventDefault();
          if (videoRef.current) videoRef.current.currentTime += 5;
          break;
        case 'ArrowLeft':
          e.preventDefault();
          if (videoRef.current) videoRef.current.currentTime -= 5;
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlay]);

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  const handleSeek = (e: ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleVolumeChange = (e: ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (videoRef.current) {
      videoRef.current.volume = val;
      videoRef.current.muted = val === 0;
      setIsMuted(val === 0);
    }
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;

    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable full-screen mode: ${err.message}`);
      });
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
  };

  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying && !isSettingsOpen) {
        setShowControls(false);
      }
    }, 3000);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    const currentTapTime = new Date().getTime();
    const tapLength = currentTapTime - lastTapTimeRef.current;
    
    if (tapLength < 300 && tapLength > 0) {
      if (!videoRef.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const touch = e.touches[0];
      const x = touch.clientX - rect.left;
      if (x > rect.width / 2) {
        skip(5);
      } else {
        skip(-5);
      }
      lastTapTimeRef.current = 0;
    } else {
      lastTapTimeRef.current = currentTapTime;
    }
  };

  const skip = (amount: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime += amount;
    }
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    if (x > rect.width / 2) {
      skip(5);
    } else {
      skip(-5);
    }
  };

  const handleVideoClick = (e: React.MouseEvent) => {
    if (window.matchMedia("(pointer: coarse)").matches) {
      const newShowControls = !showControls;
      setShowControls(newShowControls);
      
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
      
      if (newShowControls) {
        controlsTimeoutRef.current = setTimeout(() => {
          if (isPlaying && !isSettingsOpen) {
            setShowControls(false);
          }
        }, 3000);
      }
    } else {
      togglePlay();
    }
  };

  const qualities: Quality[] = ["4K", "1440p", "1080p", "720p", "480p"];

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-full bg-black group overflow-hidden flex items-center justify-center"
      onMouseMove={handleMouseMove}
      onMouseLeave={() => isPlaying && setShowControls(false)}
    >
      {/* Video Element */}
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        className="w-full h-full object-contain"
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onWaiting={() => setIsBuffering(true)}
        onPlaying={() => setIsBuffering(false)}
        onClick={handleVideoClick}
        onTouchStart={handleTouchStart}
        onDoubleClick={handleDoubleClick}
        playsInline
      />

      {/* Buffering Overlay */}
      <AnimatePresence>
        {isBuffering && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center bg-black/40 z-10"
          >
            <img 
              src={LOADING_GIF_PATH} 
              alt="Buffering..." 
              className="w-16 h-16 object-contain"
              referrerPolicy="no-referrer"
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Big Play/Pause Button Overlay */}
      <AnimatePresence>
        {!isPlaying && !isBuffering && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={togglePlay}
            className="absolute z-20 w-20 h-20 bg-primary/90 rounded-full flex items-center justify-center shadow-2xl shadow-primary/40 hover:scale-110 transition-transform"
          >
            <Play className="w-10 h-10 text-white fill-current ml-1" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Custom Controls */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ 
          opacity: showControls ? 1 : 0, 
          y: showControls ? 0 : 20 
        }}
        className="absolute bottom-0 left-0 right-0 z-30 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-6 pt-12"
      >
        {/* Progress Bar */}
        <div className="relative group/progress mb-4">
          <input
            type="range"
            min="0"
            max={duration || 0}
            value={currentTime}
            onChange={handleSeek}
            onClick={(e) => e.stopPropagation()}
            className="w-full h-1.5 bg-white/20 rounded-full appearance-none cursor-pointer accent-primary group-hover/progress:h-2 transition-all"
          />
          <div 
            className="absolute top-0 left-0 h-1.5 bg-primary rounded-full pointer-events-none group-hover/progress:h-2 transition-all"
            style={{ width: `${(currentTime / duration) * 100}%` }}
          />
        </div>

        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button onClick={togglePlay} className="text-white hover:text-primary transition-colors">
              {isPlaying ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current" />}
            </button>
            
            <div className="flex items-center gap-2">
              <button onClick={() => skip(-5)} className="text-white/70 hover:text-white transition-colors">
                <RotateCcw className="w-5 h-5" />
              </button>
              <button onClick={() => skip(5)} className="text-white/70 hover:text-white transition-colors">
                <RotateCw className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center gap-3 group/volume">
              <button onClick={toggleMute} className="text-white hover:text-primary transition-colors">
                {isMuted || volume === 0 ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                onClick={(e) => e.stopPropagation()}
                className="w-0 group-hover/volume:w-20 h-1 bg-white/20 rounded-full appearance-none cursor-pointer accent-white transition-all overflow-hidden"
              />
            </div>

            <div className="text-white text-sm font-medium tabular-nums">
              {formatTime(currentTime)} / {formatTime(duration)}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative">
              <button 
                onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                className={`text-white hover:text-primary transition-all ${isSettingsOpen ? 'rotate-90 text-primary' : ''}`}
              >
                <Settings className="w-6 h-6" />
              </button>

              <AnimatePresence>
                {isSettingsOpen && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                    className="absolute bottom-full right-0 mb-4 w-48 bg-black/90 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden shadow-2xl"
                  >
                    <div className="p-2 space-y-1">
                      <div className="px-3 py-2 text-xs font-bold text-white/40 uppercase tracking-widest">Quality</div>
                      <button
                        onClick={() => {
                          setQuality("Auto");
                          setIsSettingsOpen(false);
                          setIsBuffering(true);
                          setTimeout(() => setIsBuffering(false), 800);
                        }}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-white/10 transition-colors text-sm text-white"
                      >
                        <div className="flex flex-col items-start">
                          <span className={quality === "Auto" ? "text-primary font-bold" : ""}>Auto</span>
                          {quality === "Auto" && <span className="text-[10px] text-white/40">Detected: {detectedQuality}</span>}
                        </div>
                        {quality === "Auto" && <Check className="w-4 h-4 text-primary" />}
                      </button>
                      {qualities.map((q) => (
                        <button
                          key={q}
                          onClick={() => {
                            setQuality(q);
                            setIsSettingsOpen(false);
                            // Simulate quality switch effect
                            setIsBuffering(true);
                            setTimeout(() => setIsBuffering(false), 800);
                          }}
                          className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-white/10 transition-colors text-sm text-white"
                        >
                          <span className={quality === q ? "text-primary font-bold" : ""}>{q}</span>
                          {quality === q && <Check className="w-4 h-4 text-primary" />}
                        </button>
                      ))}
                      <div className="h-px bg-white/10 my-2" />
                      <div className="px-3 py-2 text-xs font-bold text-white/40 uppercase tracking-widest">Playback Speed</div>
                      {[0.5, 1, 1.5, 2].map((rate) => (
                        <button
                          key={rate}
                          onClick={() => {
                            setPlaybackRate(rate);
                            if (videoRef.current) videoRef.current.playbackRate = rate;
                            setIsSettingsOpen(false);
                          }}
                          className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-white/10 transition-colors text-sm text-white"
                        >
                          <span className={playbackRate === rate ? "text-primary font-bold" : ""}>{rate}x</span>
                          {playbackRate === rate && <Check className="w-4 h-4 text-primary" />}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <button onClick={toggleFullscreen} className="text-white hover:text-primary transition-colors">
              {isFullscreen ? <Minimize className="w-6 h-6" /> : <Maximize className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </motion.div>

      {/* Quality Badge (Persistent) */}
      <div className="absolute top-6 left-6 z-40 px-3 py-1 bg-black/60 backdrop-blur-md border border-white/20 rounded-lg flex items-center gap-2 pointer-events-none">
        <span className="text-xs font-bold tracking-widest text-white">
          {quality === "Auto" ? detectedQuality : quality}
        </span>
        {(quality === "4K" || (quality === "Auto" && detectedQuality === "4K")) && (
          <span className="text-[10px] font-medium text-white/70 uppercase">HDR</span>
        )}
      </div>
    </div>
  );
}
