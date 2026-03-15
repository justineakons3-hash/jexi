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
import axios from "axios";

export default function App() {
  const [isAppLoading, setIsAppLoading] = useState(true);
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

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      setIsLoggedIn(true);
      setShowWelcome(true);
    }
  }, []);

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

  useEffect(() => {
    const timer = setTimeout(() => setIsAppLoading(false), 2500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") root.classList.add("dark");
    else root.classList.remove("dark");
    if (colorTheme) root.style.setProperty("--theme-primary", colorTheme);
  }, [theme, colorTheme]);

  const handleVideosSeen = useCallback((videos: Video[]) => {
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

  // video param is optional — passed for search-result videos so they can be
  // upserted into MongoDB (feed videos are already in the DB from scraping)
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
        {isAppLoading ? (
          <motion.div
            key="loader"
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
          <Login onLogin={handleLogin} />
        ) : showWelcome ? (
          <Welcome onComplete={handleWelcomeComplete} />
        ) : (
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
        )}
      </AnimatePresence>
    </div>
  );
}
