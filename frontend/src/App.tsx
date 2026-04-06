/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback, useRef } from "react";
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
import axios from "axios";

const IS_NATIVE = !!(window as any).Capacitor?.isNativePlatform?.();

/* ─────────────────────────────────────────────────────────
   BACKEND BOOT LOADER — native only, no cache, post-login
───────────────────────────────────────────────────────── */
const BOOT_SECONDS = 120;

function BackendBootLoader() {
  const [secondsLeft, setSecondsLeft] = useState(BOOT_SECONDS);
  const expired = secondsLeft <= 0;

  useEffect(() => {
    if (expired) return;
    const t = setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [expired]);

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const ss = String(secondsLeft % 60).padStart(2, "0");

  return (
    <motion.div
      key="boot-loader"
      className="fixed inset-0 z-50 bg-background flex flex-col items-center justify-center gap-6 px-6 text-center"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.05 }}
      transition={{ duration: 0.5 }}
    >
      <img src={LOADING_GIF_PATH} alt="Loading…" className="w-24 h-24 object-contain" />
      {expired ? (
        <motion.p key="any-moment" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="text-content-muted text-sm">
          Any moment now…
        </motion.p>
      ) : (
        <motion.div key="countdown" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center gap-1">
          <p className="text-content text-sm font-medium">Waking up the server — first load takes a moment</p>
          <p className="text-primary text-3xl font-black tabular-nums">{mm}:{ss}</p>
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
  const [isSplashLoading, setIsSplashLoading] = useState(true);
  const [isLoggedIn,    setIsLoggedIn]    = useState(false);
  const [showWelcome,   setShowWelcome]   = useState(false);
  const [isBootLoading, setIsBootLoading] = useState(false);

  const [theme, setTheme]           = useState<ThemeMode>("dark");
  const [colorTheme, setColorTheme] = useState<ColorTheme>("#ff8397");
  const [creators, setCreators]     = useState<Creator[]>(INITIAL_CREATORS);
  const [seenVideos, setSeenVideos] = useState<Record<string, Video>>({});
  const [savedVideoIds, setSavedVideoIds] = useState<string[]>([]);
  const [likedVideoIds, setLikedVideoIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery]     = useState("");

  const [currentView, setCurrentView] = useState<
    "home" | "manage" | "settings" | "categories" | "creators"
  >("home");

  const [selectedCreatorId, setSelectedCreatorId] = useState<string | null>(null);
  const [selectedCategory,  setSelectedCategory]  = useState<string | null>(null);

  // Token stored in a ref so it's always current without triggering re-renders
  const tokenRef = useRef<string>("");
  const emailRef = useRef<string>("");

  const getToken = () => tokenRef.current;

  const API_BASE = import.meta.env.VITE_BACKEND_URL || "/api";

  /* ── Splash ── */
  useEffect(() => {
    const t = setTimeout(() => setIsSplashLoading(false), 1500);
    return () => clearTimeout(t);
  }, []);

  /* ── Theme ── */
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") root.classList.add("dark");
    else root.classList.remove("dark");
    if (colorTheme) root.style.setProperty("--theme-primary", colorTheme);
  }, [theme, colorTheme]);

  /* ── Fetch interactions whenever we get a valid token ── */
  const fetchInteractions = useCallback((token: string) => {
    if (!token) return;
    axios
      .get(`${API_BASE}/user/interactions`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => {
        setSavedVideoIds(res.data.savedVideoIds || []);
        setLikedVideoIds(res.data.likedVideoIds || []);
      })
      .catch((err) => console.error("Interactions fetch error:", err));
  }, [API_BASE]);

  /* ── Fetch creators (no auth needed) ── */
  useEffect(() => {
    if (!isLoggedIn) return;
    axios
      .get(`${API_BASE}/creators?page=1&limit=100`)
      .then((res) => setCreators(res.data.creators || []))
      .catch((err) => console.error("Creators fetch error:", err));
  }, [isLoggedIn, API_BASE]);

  /*
   * handleLogin — called by Login component.
   *
   * On cache-fast path it's called TWICE:
   *   1st call: token="" fromCache=true  → enter app immediately
   *   2nd call: token=JWT fromCache=true → token arrived, fetch interactions
   *
   * On no-cache path:
   *   1 call: token=JWT fromCache=false → enter app, start boot loader
   */
  const handleLogin = useCallback(
    (token: string, fromCache: boolean, email?: string) => {
      if (email) emailRef.current = email;
      if (token) {
        tokenRef.current = token;
        fetchInteractions(token);
      }

      if (!isLoggedIn) {
        setIsLoggedIn(true);
        setShowWelcome(true);
        if (IS_NATIVE && !fromCache) {
          setIsBootLoading(true);
        }
      }
    },
    [isLoggedIn, fetchInteractions],
  );

  const handleVideosSeen = useCallback((videos: Video[]) => {
    setIsBootLoading(false);
    setSeenVideos((prev) => {
      const next = { ...prev };
      videos.forEach((v) => { if (v.id) next[v.id] = v; });
      return next;
    });
  }, []);

  const handleAuthError = (err: unknown) => {
    if (axios.isAxiosError(err) && err.response?.status === 401) {
      tokenRef.current = "";
      setIsLoggedIn(false);
      setShowWelcome(false);
    }
  };

  const handleWelcomeComplete = () => setShowWelcome(false);
  const handleAddCreator      = (c: Creator) => setCreators((prev) => [...prev, c]);
  const handleAddVideo        = (_v: Video) => {};

  const handleToggleSave = async (id: string, video?: Video) => {
    setSavedVideoIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
    try {
      const res = await axios.post(
        `${API_BASE}/user/save/${id}`,
        { video: video || null },
        { headers: { Authorization: `Bearer ${getToken()}` } }
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
      const res = await axios.post(
        `${API_BASE}/user/like/${id}`,
        { video: video || null },
        { headers: { Authorization: `Bearer ${getToken()}` } }
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
        {isSplashLoading ? (
          <motion.div
            key="splash"
            className="fixed inset-0 z-50 bg-background flex items-center justify-center"
            exit={{ opacity: 0, scale: 1.1 }}
            transition={{ duration: 0.5 }}
          >
            <img
              src={LOADING_GIF_PATH}
              alt="Loading..."
              className="w-24 h-24 object-contain"
            />
          </motion.div>
        ) : !isLoggedIn ? (
          <Login key="login" onLogin={handleLogin} />
        ) : showWelcome ? (
          <Welcome
            key="welcome"
            onComplete={handleWelcomeComplete}
            userEmail={emailRef.current}
          />
        ) : (
          <motion.div
            key="app"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <AnimatePresence>
              {isBootLoading && <BackendBootLoader key="boot" />}
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
