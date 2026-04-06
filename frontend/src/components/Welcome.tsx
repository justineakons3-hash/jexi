import { useEffect, useRef } from "react";
import { motion } from "motion/react";
import welcomeVideo from "../assets/welcome.mp4";
import welcome2Video from "../assets/welcome2.mp4";

const isMobile = window.innerWidth < 768;
const UMA_EMAIL = "uma@gmail.com";

interface WelcomeProps {
  onComplete: () => void;
  userEmail?: string;
}

export default function Welcome({ onComplete, userEmail }: WelcomeProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const src =
    userEmail?.toLowerCase().trim() === UMA_EMAIL
      ? welcomeVideo
      : welcome2Video;

  useEffect(() => {
    const timer = setTimeout(() => onComplete(), 4000);
    return () => clearTimeout(timer);
  }, [onComplete]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = true;
    video.volume = 0;
    video.load();

    const tryPlay = () => {
      video.play().catch(() => onComplete());
    };

    if (video.readyState >= 3) {
      tryPlay();
    } else {
      video.addEventListener("canplay", tryPlay, { once: true });
    }

    return () => video.removeEventListener("canplay", tryPlay);
  }, [onComplete, src]); // re-run if src changes

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.8, ease: "easeInOut" }}
    >
      <motion.div
        className="absolute inset-0 flex items-center justify-center origin-center"
        animate={{ scale: [0.8, 1, 1, 15], opacity: [0, 1, 1, 0] }}
        transition={{ times: [0, 0.2, 0.6, 1], duration: 4, ease: "easeInOut" }}
        style={{ transformOrigin: isMobile ? "50% 53%" : "53% 60%" }}
      >
        <div className="w-full max-w-5xl aspect-video rounded-2xl overflow-hidden shadow-2xl shadow-primary/20">
          <video
            ref={videoRef}
            src={src}
            muted
            playsInline
            preload="auto"
            loop
            className="w-full h-full object-cover"
          />
        </div>
      </motion.div>

      <motion.div
        className="absolute inset-0 flex items-center justify-center pointer-events-none"
        animate={{ opacity: [0, 1, 1, 0], scale: [0.9, 1, 1, 1.2] }}
        transition={{ times: [0, 0.2, 0.6, 1], duration: 4, ease: "easeInOut" }}
      >
        <h1 className="text-6xl md:text-8xl font-bold text-white tracking-widest drop-shadow-2xl" />
      </motion.div>
    </motion.div>
  );
}
