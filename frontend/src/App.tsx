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

  // `creators` here is the first page fetched on login — used by VideoFeed
  // for avatar display in video cards and by AccountSettings/CreatorManager.
  // CreatorsView manages its own full paginated list independently.
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
    const fetchCreators = async () => {
      try {
        const res = await axios.get(`${API_BASE}/creators?page=1&limit=100`);
        setCreators(res.data.creators || []);
      } catch (err) {
        console.error("Creators fetch error:", err);
      }
    };
    fetchCreators();
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

  const handleLogin           = () => { setIsLoggedIn(true); setShowWelcome(true); };
  const handleWelcomeComplete = () => setShowWelcome(false);
  const handleAddCreator      = (c: Creator) => setCreators((prev) => [...prev, c]);
  const handleAddVideo        = (_v: Video) => {};

  const handleToggleSave = (id: string) =>
    setSavedVideoIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

  const handleToggleLike = (id: string) =>
    setLikedVideoIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

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
              // CreatorsView fetches its own data — no creators prop needed
              <CreatorsView
                onSelectCreator={(id) => setSelectedCreatorId(id)}
                onSearchCreator={(name) => {
                  setSearchQuery(name); // fills the search bar
                  setCurrentView("home"); // navigates back to the feed
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
