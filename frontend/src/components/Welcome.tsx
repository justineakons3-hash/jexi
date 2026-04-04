import { useEffect } from "react";
import { motion } from "motion/react";
const isMobile = window.innerWidth < 768;
interface WelcomeProps {
  onComplete: () => void;
}

export default function Welcome({ onComplete }: WelcomeProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete();
    }, 4000); // 4 seconds total
    return () => clearTimeout(timer);
  }, [onComplete]);

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
        animate={{
          scale: [0.8, 1, 1, 15],
          opacity: [0, 1, 1, 0],
        }}
        transition={{
          times: [0, 0.2, 0.6, 1],
          duration: 4,
          ease: "easeInOut",
        }}
        style={{
          transformOrigin: isMobile ? "50% 53%" : "53% 60%",
        }}
      >
        <div className="w-full max-w-5xl aspect-video rounded-2xl overflow-hidden shadow-2xl shadow-primary/20">
          <video
            src="/welcome.mp4"
            autoPlay
            muted
            loop
            className="w-full h-full object-cover"
          />
        </div>
      </motion.div>

      <motion.div
        className="absolute inset-0 flex items-center justify-center pointer-events-none"
        animate={{
          opacity: [0, 1, 1, 0],
          scale: [0.9, 1, 1, 1.2],
        }}
        transition={{
          times: [0, 0.2, 0.6, 1],
          duration: 4,
          ease: "easeInOut",
        }}
      >
        <h1 className="text-6xl md:text-8xl font-bold text-white tracking-widest drop-shadow-2xl"></h1>
      </motion.div>
    </motion.div>
  );
}
