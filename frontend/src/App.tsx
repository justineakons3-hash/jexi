/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ThemeMode, ColorTheme, Creator, Video } from "./types";
import Login from "./components/Login";
import Welcome from "./components/Welcome";
import MainLayout from "./components/MainLayout";
import VideoFeed from "./components/VideoFeed";
import CreatorManager from "./components/CreatorManager";
import AccountSettings from "./components/AccountSettings";
import CategoriesView from "./components/CategoriesView";
import CreatorsView from "./components/CreatorsView";
import { INITIAL_CREATORS } from "./data";
import { LOADING_GIF_PATH } from "./constants";
import { hasFreshCache } from "./utils/videoCache";
import axios from "axios";

/* ─────────────────────────────────────────────────────────
   BACKEND BOOT LOADER
   Shows on FIRST LOAD only (no cache). Counts down from
   2:00 then switches to "any moment now…" until the first
   API response arrives.
───────────────────────────────────────────────────────── */
const BOOT_SECONDS = 120; // 2 minutes

function BackendBootLoader() {
  const [secondsLeft, setSecondsLeft] = useState(BOOT_SECONDS);
  const expired = secondsLeft <= 0;

  useEffect(() => {
    if (expired) return;
    const t = setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [expired]);

  const mm  = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const ss  = String(secondsLeft % 60).padStart(2, "0");

  return (
    <motion.div
      key="boot-loader"
      className="fixed inset-0 z-50 bg-background flex flex-col items-center justify-center gap-6 px-6 text-center"
      exit={{ opacity: 0, scale: 1.05 }}
      transition={{ duration: 0.5 }}
    >
      <img
        src={LOADING_GIF_PATH}
        alt="Loading…"
        className="w-24 h-24 object-contain"
        referrerPolicy="no-referrer"
      />

      {expired ? (
        <motion.p
          key="any-moment"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-content-muted text-sm"
        >
          Any moment now…
        </motion.p>
      ) : (
        <motion.div
          key="countdown"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center gap-1"
        >
          <p className="text-content text-sm font-medium">
            Waking up the server — first load takes a moment
          </p>
          <p className="text-primary text-3xl font-black tabular-nums">
            {mm}:{ss}
          </p>
          <p className="text-content-muted text-xs">estimated wait time</p>
        </motion.div>
      )}
    </motion.div>
  );
}

/* ─────────────────────────────────────────────────────────
   APP
───────────────────────────────────────────────────────── */
export default function App() {
  // True when we're showing the boot loader (first load, no cache, backend not yet replied)
  const [isBootLoading, setIsBootLoading] = useState(false);
  // True during the brief branded splash (always shown, even if we have cache)
  const [isSplashLoading, setIsSplashLoading] = useState(true);

  const [isLoggedIn, setIsLoggedIn]     = useState(false);
  const [showWelcome, setShowWelcome]   = useState(false);

  const [theme, setTheme]           = useState<ThemeMode>("dark");
  const [colorTheme, setColorTheme] = useState<ColorTheme>("#ff8397");

  const [creators, setCreators] = useState<Creator[]>(INITIAL_CREATORS);

  const [seenVideos, setSeenVideos] = useState<Record<string, Video>>({});

  const [savedVideoIds, setSavedVideoIds] = useState<string[]>([]);
  const [likedVideoIds, setLikedVideoIds] = useState<string[]>([]);

  const [searchQuery, setSearchQuery] = useState("");

  const [currentView, setCurrentView] = useState<
    "home" | "manage" | "settings" | "categories" | "creators"
  >("home");

  const [selectedCreatorId, setSelectedCreatorId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory]   = useState<string | null>(null);

  const API_BASE = import.meta.env.VITE_BACKEND_URL || "/api";

  /* ── Auth check ── */
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      setIsLoggedIn(true);
      setShowWelcome(true);
    }
  }, []);

  /* ── Splash + Boot loader logic ──
   *
   * Always show a brief 1.5s branded splash.
   * After that:
   *   - If we have a fresh video cache → show the app immediately (no countdown).
   *   - If no cache               → show the countdown boot loader until the
   *                                  first API response arrives (VideoFeed signals
   *                                  this via onVideosSeen).
   */
  useEffect(() => {
    const splashTimer = setTimeout(() => {
      setIsSplashLoading(false);
      if (!hasFreshCache()) {
        setIsBootLoading(true);
      }
    }, 1500);
    return () => clearTimeout(splashTimer);
  }, []);

  /* ── Load user data after login ── */
  useEffect(() => {
    if (!isLoggedIn) return;
    const token = localStorage.getItem("token");
    const headers = { Authorization: `Bearer ${token}` };

    axios
      .get(`${API_BASE}/creators?page=1&limit=100`)
      .then((res) => setCreators(res.data.creators || []))
      .catch((err) => console.error("Creators fetch error:", err));

    axios
      .get(`${API_BASE}/user/interactions`, { headers })
      .then((res) => {
        setSavedVideoIds(res.data.savedVideoIds || []);
        setLikedVideoIds(res.data.likedVideoIds || []);
      })
      .catch((err) => console.error("Interactions fetch error:", err));
  }, [isLoggedIn, API_BASE]);

  /* ── Theme ── */
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") root.classList.add("dark");
    else root.classList.remove("dark");
    if (colorTheme) root.style.setProperty("--theme-primary", colorTheme);
  }, [theme, colorTheme]);

  /* ── Called by VideoFeed when the first batch of videos arrives ── */
  const handleVideosSeen = useCallback((videos: Video[]) => {
    // Dismiss boot loader as soon as we have real content
    setIsBootLoading(false);
    setSeenVideos((prev) => {
      const next = { ...prev };
      videos.forEach((v) => { if (v.id) next[v.id] = v; });
      return next;
    });
  }, []);

  const handleAuthError = (err: unknown) => {
    if (axios.isAxiosError(err) && err.response?.status === 401) {
      localStorage.removeItem("token");
      setIsLoggedIn(false);
      setShowWelcome(false);
    }
  };

  const handleLogin           = () => { setIsLoggedIn(true); setShowWelcome(true); };
  const handleWelcomeComplete = () => setShowWelcome(false);
  const handleAddCreator      = (c: Creator) => setCreators((prev) => [...prev, c]);
  const handleAddVideo        = (_v: Video) => {};

  const handleToggleSave = async (id: string, video?: Video) => {
    setSavedVideoIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
    try {
      const token = localStorage.getItem("token");
      const res = await axios.post(
        `${API_BASE}/user/save/${id}`,
        { video: video || null },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSavedVideoIds(res.data.savedVideoIds);
    } catch (err) {
      console.error("Save toggle error:", err);
      handleAuthError(err);
      setSavedVideoIds((prev) =>
        prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
      );
    }
  };

  const handleToggleLike = async (id: string, video?: Video) => {
    setLikedVideoIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
    try {
      const token = localStorage.getItem("token");
      const res = await axios.post(
        `${API_BASE}/user/like/${id}`,
        { video: video || null },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setLikedVideoIds(res.data.likedVideoIds);
    } catch (err) {
      console.error("Like toggle error:", err);
      handleAuthError(err);
      setLikedVideoIds((prev) =>
        prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
      );
    }
  };

  const seenVideosList = Object.values(seenVideos);

  return (
    <div className="min-h-screen bg-background text-content font-sans">
      <AnimatePresence mode="wait">
        {/* 1. Brief branded splash (always) */}
        {isSplashLoading ? (
          <motion.div
            key="splash"
            className="fixed inset-0 z-50 bg-background flex flex-col items-center justify-center"
            exit={{ opacity: 0, scale: 1.1 }}
            transition={{ duration: 0.5 }}
          >
            <img
              src={LOADING_GIF_PATH}
              alt="Loading..."
              className="w-24 h-24 object-contain"
              referrerPolicy="no-referrer"
            />
          </motion.div>

        ) : !isLoggedIn ? (
          <Login key="login" onLogin={handleLogin} />

        ) : showWelcome ? (
          <Welcome key="welcome" onComplete={handleWelcomeComplete} />

        ) : (
          <motion.div
            key="app"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            {/* 2. Boot countdown overlay (no cache, first load only) */}
            <AnimatePresence>
              {isBootLoading && <BackendBootLoader />}
            </AnimatePresence>

            <MainLayout
              theme={theme}
              setTheme={setTheme}
              colorTheme={colorTheme}
              setColorTheme={setColorTheme}
              currentView={currentView}
              setCurrentView={setCurrentView}
              setSelectedCreatorId={setSelectedCreatorId}
              creators={creators}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
            >
              {currentView === "home" ? (
                <VideoFeed
                  videos={seenVideosList}
                  creators={creators}
                  selectedCreatorId={selectedCreatorId}
                  selectedCategory={selectedCategory}
                  onSelectCreator={setSelectedCreatorId}
                  savedVideoIds={savedVideoIds}
                  likedVideoIds={likedVideoIds}
                  onToggleSave={handleToggleSave}
                  onToggleLike={handleToggleLike}
                  searchQuery={searchQuery}
                  onVideosSeen={handleVideosSeen}
                />
              ) : currentView === "manage" ? (
                <CreatorManager
                  creators={creators}
                  onAddCreator={handleAddCreator}
                  onAddVideo={handleAddVideo}
                />
              ) : currentView === "categories" ? (
                <CategoriesView
                  onSelectCategory={(category) => {
                    setSelectedCategory(category);
                    setCurrentView("home");
                  }}
                />
              ) : currentView === "creators" ? (
                <CreatorsView
                  onSelectCreator={(id) => setSelectedCreatorId(id)}
                  onSearchCreator={(name) => {
                    setSearchQuery(name);
                    setCurrentView("home");
                  }}
                />
              ) : (
                <AccountSettings
                  colorTheme={colorTheme}
                  setColorTheme={setColorTheme}
                  videos={seenVideosList}
                  creators={creators}
                  savedVideoIds={savedVideoIds}
                  likedVideoIds={likedVideoIds}
                  onToggleSave={handleToggleSave}
                  onToggleLike={handleToggleLike}
                  onSelectCreator={setSelectedCreatorId}
                  setCurrentView={setCurrentView}
                />
              )}
            </MainLayout>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
