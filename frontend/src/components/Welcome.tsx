import { useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import welcomeVideo from "../assets/welcome.mp4";
import welcome2Image from "../assets/welcome2.jpg";

const isMobile = window.innerWidth < 768;
const UMA_EMAIL = "uma@gmail.com";

interface WelcomeProps {
  onComplete: () => void;
  userEmail?: string;
}

export default function Welcome({ onComplete, userEmail }: WelcomeProps) {
  const isUma = userEmail?.toLowerCase().trim() === UMA_EMAIL;

  useEffect(() => {
    const timer = setTimeout(() => onComplete(), 5000);
    return () => clearTimeout(timer);
  }, [onComplete]);

  /*
   * transformOrigin for the zoom animation.
   *
   * The animated div is `absolute inset-0` (full screen).
   * transformOrigin % is relative to THAT element = relative to screen.
   *
   * For the image: the image box is centered in the screen.
   * On mobile the box is 95vw wide with 16:9 ratio.
   * The tap coords (51.9%, 88.8%) were measured relative to the IMAGE box,
   * so we need to convert them to screen coordinates.
   *
   * Image box on mobile:
   *   width  = 95vw  → left edge at 2.5vw, right edge at 97.5vw
   *   height = 95vw * 9/16
   *   Box is vertically centered → top edge at 50vh - height/2
   *
   * Screen X = 2.5% + 51.9% * 95%  ≈ 51.8% (nearly same, horizontal centering minor)
   * Screen Y = (50vh - h/2) + 88.8% * h  → depends on aspect ratio vs screen
   *
   * Simplest fix: use fixed pixel coords via CSS calc, or just use vw/vh units
   * directly on the transform origin which IS screen-relative.
   *
   * After measurement: image tap was 51.9% 88.8% of image box.
   * Image box height on typical mobile (844px screen) ≈ 95vw*9/16 ≈ 190px
   * Image top ≈ (844-190)/2 = 327px → 327/844 = 38.7% from top
   * Image bottom ≈ 327+190 = 517px → 517/844 = 61.3%
   * Y in screen = 38.7% + 88.8% * (61.3%-38.7%) = 38.7% + 88.8%*22.6% ≈ 58.8%
   *
   * So screen-relative origin ≈ "51.9% 58.8%" for mobile image
   */

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5, ease: "easeInOut" }}
    >
      <motion.div
        className="absolute inset-0 flex items-center justify-center"
        animate={{ scale: [0.85, 1, 1, 15], opacity: [0, 1, 1, 0] }}
        transition={{
          times: [0, 0.15, 0.6, 1],
          duration: 4,
          ease: "easeInOut",
        }}
        style={{
          transformOrigin: isUma
            ? isMobile ? "50% 53%" : "53% 60%"
            : isMobile ? "51.9% 58.8%" : "53.2% 91.6%",
        }}
      >
        <div
          style={
            isMobile
              ? { width: "95vw", aspectRatio: "16/9" }
              : { width: "100%", maxWidth: "64rem", aspectRatio: "16/9" }
          }
          className="rounded-2xl overflow-hidden shadow-2xl shadow-primary/20"
        >
          {isUma ? (
            <video
              src={welcomeVideo}
              muted
              playsInline
              autoPlay
              loop
              className="w-full h-full object-cover"
            />
          ) : (
            <img
              src={welcome2Image}
              alt=""
              className="w-full h-full object-cover"
              draggable={false}
            />
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
