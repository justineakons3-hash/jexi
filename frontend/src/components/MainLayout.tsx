import { ReactNode, useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Moon, Sun, MonitorPlay, Users, Settings, Palette, User, LogOut, ChevronDown, Search } from "lucide-react";
import { ThemeMode, ColorTheme, Creator } from "../types";

interface MainLayoutProps {
  children: ReactNode;
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  colorTheme: ColorTheme;
  setColorTheme: (color: ColorTheme) => void;
  currentView: "home" | "manage" | "settings" | "categories" | "creators";
  setCurrentView: (
    view: "home" | "manage" | "settings" | "categories" | "creators",
  ) => void;
  setSelectedCreatorId: (id: string | null) => void;
  creators?: Creator[];

  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

export default function MainLayout({
  children,
  theme,
  setTheme,
  colorTheme,
  setColorTheme,
  currentView,
  setCurrentView,
  setSelectedCreatorId,
  creators = [],
  searchQuery,
  setSearchQuery,
}: MainLayoutProps) {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  const [scrollState, setScrollState] = useState<"top" | "up" | "down">("top");
  const lastScrollY = useRef(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      if (currentScrollY < 50) {
        setScrollState("top");
      } else {
        if (currentScrollY > lastScrollY.current + 10) {
          setScrollState("down");
          setIsProfileOpen(false); // Close dropdown on scroll down
        } else if (currentScrollY < lastScrollY.current - 10) {
          setScrollState("up");
          setIsProfileOpen(false); // Close dropdown on scroll up
        }
      }
      lastScrollY.current = currentScrollY;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        profileRef.current &&
        !profileRef.current.contains(event.target as Node)
      ) {
        setIsProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const presetColors = [
    "#ff8397", // Default
    "#3b82f6", // Blue
    "#a855f7", // Purple
    "#10b981", // Emerald
    "#f59e0b", // Amber
  ];

  return (
    <motion.div
      className="min-h-screen flex flex-col"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <header
        className={`sticky top-0 z-40 bg-surface/60 backdrop-blur-2xl border-b border-border-subtle shadow-lg transition-transform duration-300 ${
          scrollState === "down"
            ? "-translate-y-full md:translate-y-0"
            : "translate-y-0"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col">
          <div className="flex items-center justify-between gap-4 transition-all duration-300 py-3 overflow-visible">
            <div
              className="flex items-center gap-2 cursor-pointer flex-shrink-0"
              onClick={() => {
                setCurrentView("home");
                setSelectedCreatorId(null);
              }}
            >
              <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/30">
                <MonitorPlay className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold tracking-tight text-content hidden sm:block">
                Jexi
              </span>
            </div>

            <div className="hidden md:flex items-center gap-6 ml-6">
              <button
                onClick={() => setCurrentView("categories")}
                className={`text-sm font-medium transition-colors py-2 ${currentView === "categories" ? "text-primary" : "text-content-muted hover:text-content"}`}
              >
                Categories
              </button>

              <button
                onClick={() => setCurrentView("creators")}
                className={`text-sm font-medium transition-colors py-2 ${currentView === "creators" ? "text-primary" : "text-content-muted hover:text-content"}`}
              >
                Creators
              </button>
            </div>

            <div className="hidden md:flex items-center flex-1 max-w-2xl px-4 lg:px-8">
              <div className="relative w-full group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Search className="w-4 h-4 text-content-muted group-focus-within:text-primary transition-colors" />
                </div>
                <input
                  type="text"
                  placeholder="Search videos, creators..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-11 pr-4 py-2.5 bg-background/50 backdrop-blur-md border border-border-subtle rounded-full text-sm text-content focus:outline-none focus:ring-2 focus:ring-primary/50 focus:bg-surface transition-all placeholder-content-muted shadow-inner"
                />
              </div>
            </div>

            <div className="flex items-center gap-4 flex-shrink-0">
              <button
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="p-2 rounded-full bg-background border border-border-subtle text-content-muted hover:text-content transition-colors"
                title="Toggle Light/Dark Mode"
              >
                {theme === "dark" ? (
                  <Sun className="w-5 h-5" />
                ) : (
                  <Moon className="w-5 h-5" />
                )}
              </button>

              <div className="relative" ref={profileRef}>
                <button
                  onClick={() => setIsProfileOpen(!isProfileOpen)}
                  className="flex items-center gap-2 p-1 pr-3 rounded-full bg-background border border-border-subtle hover:border-primary/50 transition-colors"
                >
                  <img
                    src="https://picsum.photos/seed/user/100/100"
                    alt="Profile"
                    className="w-8 h-8 rounded-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <span className="text-sm font-medium text-content hidden sm:block">
                    Alex
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 text-content-muted transition-transform ${isProfileOpen ? "rotate-180" : ""}`}
                  />
                </button>

                <AnimatePresence>
                  {isProfileOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                      className="absolute right-0 mt-2 w-64 bg-surface border border-border-subtle rounded-2xl shadow-xl overflow-hidden z-50"
                    >
                      <div className="p-4 border-b border-border-subtle">
                        <div className="flex items-center gap-3">
                          <img
                            src="https://picsum.photos/seed/user/100/100"
                            alt="Profile"
                            className="w-10 h-10 rounded-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                          <div>
                            <p className="text-sm font-bold text-content">
                              Alex Doe
                            </p>
                            <p className="text-xs text-content-muted">
                              alex@Jexi.com
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="p-4 border-b border-border-subtle">
                        <div className="flex items-center gap-2 mb-3">
                          <Palette className="w-4 h-4 text-content-muted" />
                          <span className="text-xs font-semibold text-content-muted uppercase tracking-wider">
                            Color Theme
                          </span>
                        </div>
                        <div className="flex flex-col gap-3">
                          <div className="flex items-center gap-3">
                            <input
                              type="color"
                              value={colorTheme}
                              onChange={(e) => setColorTheme(e.target.value)}
                              className="w-8 h-8 rounded cursor-pointer border-0 p-0 bg-transparent"
                              title="Custom Color"
                            />
                            <span className="text-sm text-content font-mono">
                              {colorTheme.toUpperCase()}
                            </span>
                          </div>
                          <div className="flex gap-2">
                            {presetColors.map((color) => (
                              <button
                                key={color}
                                onClick={() => setColorTheme(color)}
                                className={`w-6 h-6 rounded-full ${colorTheme === color ? "ring-2 ring-offset-2 ring-offset-surface ring-content" : "opacity-70 hover:opacity-100 hover:scale-110"} transition-all`}
                                style={{ backgroundColor: color }}
                                title={`Theme: ${color}`}
                              />
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="p-2">
                        <button
                          onClick={() => {
                            setCurrentView("settings");
                            setIsProfileOpen(false);
                          }}
                          className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-content-muted hover:text-content hover:bg-background rounded-xl transition-colors"
                        >
                          <Settings className="w-4 h-4" />
                          Account Settings
                        </button>
                        <button
                          onClick={() => {
                            setCurrentView("manage");
                            setIsProfileOpen(false);
                          }}
                          className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-content-muted hover:text-content hover:bg-background rounded-xl transition-colors mt-1"
                        >
                          <Users className="w-4 h-4" />
                          Manage Creators
                        </button>
                        <button className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-rose-500 hover:bg-rose-500/10 rounded-xl transition-colors mt-1 border-t border-border-subtle pt-3">
                          <LogOut className="w-4 h-4" />
                          Sign Out
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* Mobile Search and Buttons */}
          <div
            className={`flex md:hidden flex-col gap-3 transition-all duration-300 ${
              scrollState !== "top" ? "py-3" : "pb-3"
            }`}
          >
            <div className="relative w-full group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Search className="w-4 h-4 text-content-muted group-focus-within:text-primary transition-colors" />
              </div>
              <input
                type="text"
                placeholder="Search videos, creators..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-2 bg-background/50 backdrop-blur-md border border-border-subtle rounded-full text-sm text-content focus:outline-none focus:ring-2 focus:ring-primary/50 focus:bg-surface transition-all placeholder-content-muted shadow-inner"
              />
            </div>
            <div className="flex items-center justify-center gap-6">
              <button
                onClick={() => setCurrentView("categories")}
                className={`text-sm font-medium transition-colors py-1 ${currentView === "categories" ? "text-primary" : "text-content-muted hover:text-content"}`}
              >
                Categories
              </button>

              <button
                onClick={() => setCurrentView("creators")}
                className={`text-sm font-medium transition-colors py-1 ${currentView === "creators" ? "text-primary" : "text-content-muted hover:text-content"}`}
              >
                Creators
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </motion.div>
  );
}
