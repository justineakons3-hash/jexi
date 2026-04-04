import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { User, Bookmark, Heart, Save, X, Loader2 } from "lucide-react";
import { ColorTheme, Video, Creator } from "../types";
import { VideoCard } from "./VideoFeed";
import VideoPlayer from "./VideoPlayer";
import axios from "axios";

interface AccountSettingsProps {
  colorTheme: ColorTheme;
  setColorTheme: (color: ColorTheme) => void;
  videos: Video[];
  creators: Creator[];
  savedVideoIds: string[];
  likedVideoIds: string[];
  onToggleSave: (id: string, video?: Video) => void;
  onToggleLike: (id: string, video?: Video) => void;
  onSelectCreator: (id: string | null) => void;
  setCurrentView: (view: "home" | "manage" | "settings") => void;
}

const API_BASE = import.meta.env.VITE_BACKEND_URL || "/api";

export default function AccountSettings({ 
  colorTheme, 
  setColorTheme,
  creators,
  savedVideoIds,
  likedVideoIds,
  onToggleSave,
  onToggleLike,
  onSelectCreator,
  setCurrentView
}: AccountSettingsProps) {
  const [username, setUsername] = useState("Alex Doe");
  const [isSaved, setIsSaved] = useState(false);
  const [activeTab, setActiveTab] = useState<"profile" | "saved" | "liked" | "theme">("profile");
  const [activeVideo, setActiveVideo] = useState<Video | null>(null);

  const [savedVideos, setSavedVideos] = useState<Video[]>([]);
  const [likedVideos, setLikedVideos] = useState<Video[]>([]);
  const [savedLoading, setSavedLoading] = useState(false);
  const [likedLoading, setLikedLoading] = useState(false);

  const presetColors = [
    "#ff8397",
    "#3b82f6",
    "#a855f7",
    "#10b981",
    "#f59e0b",
  ];

  // Fetch saved videos when tab opens or savedVideoIds change
  useEffect(() => {
    if (activeTab !== "saved") return;
    if (savedVideoIds.length === 0) { setSavedVideos([]); return; }
    let cancelled = false;
    setSavedLoading(true);
    const fetchAll = async () => {
      try {
        const results = await Promise.allSettled(
          savedVideoIds.map((id) => axios.get(`${API_BASE}/videos/${id}`))
        );
        if (cancelled) return;
        const videos: Video[] = results
          .filter((r) => r.status === "fulfilled")
          .map((r) => (r as PromiseFulfilledResult<any>).value.data);
        setSavedVideos(videos);
      } catch (err) {
        console.error("Saved videos fetch error:", err);
      } finally {
        if (!cancelled) setSavedLoading(false);
      }
    };
    fetchAll();
    return () => { cancelled = true; };
  }, [activeTab, savedVideoIds]);

  // Fetch liked videos when tab opens or likedVideoIds change
  useEffect(() => {
    if (activeTab !== "liked") return;
    if (likedVideoIds.length === 0) { setLikedVideos([]); return; }
    let cancelled = false;
    setLikedLoading(true);
    const fetchAll = async () => {
      try {
        const results = await Promise.allSettled(
          likedVideoIds.map((id) => axios.get(`${API_BASE}/videos/${id}`))
        );
        if (cancelled) return;
        const videos: Video[] = results
          .filter((r) => r.status === "fulfilled")
          .map((r) => (r as PromiseFulfilledResult<any>).value.data);
        setLikedVideos(videos);
      } catch (err) {
        console.error("Liked videos fetch error:", err);
      } finally {
        if (!cancelled) setLikedLoading(false);
      }
    };
    fetchAll();
    return () => { cancelled = true; };
  }, [activeTab, likedVideoIds]);

  const handleSave = () => {
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  useEffect(() => {
    document.body.style.overflow = activeVideo ? 'hidden' : 'unset';
    return () => { document.body.style.overflow = 'unset'; };
  }, [activeVideo]);

  const VideoGrid = ({
    videos,
    loading,
    emptyIcon,
    emptyText,
    isSavedTab,
  }: {
    videos: Video[];
    loading: boolean;
    emptyIcon: React.ReactNode;
    emptyText: string;
    isSavedTab: boolean;
  }) => {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      );
    }
    if (videos.length === 0) {
      return (
        <div className="text-center py-12 bg-surface/40 rounded-2xl border border-border-subtle">
          <div className="w-12 h-12 text-content-muted mx-auto mb-4 opacity-50">{emptyIcon}</div>
          <p className="text-content-muted">{emptyText}</p>
        </div>
      );
    }
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {videos.map(video => (
          <VideoCard
            key={video.id}
            video={video}
            creator={creators.find(c => c.id === video.creatorId)}
            allCreators={creators}
            onSelectCreator={(id) => {
              onSelectCreator(id);
              setCurrentView("home");
            }}
            onClick={() => setActiveVideo(video)}
            isSaved={isSavedTab ? true : savedVideoIds.includes(video.id)}
            isLiked={isSavedTab ? likedVideoIds.includes(video.id) : true}
            onToggleSave={onToggleSave}
            onToggleLike={onToggleLike}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-content">Account Settings</h2>
        <p className="text-content-muted mt-2">Manage your profile, preferences, and saved content.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Sidebar */}
        <div className="space-y-2">
          <button 
            onClick={() => setActiveTab("profile")}
            className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-colors ${activeTab === "profile" ? "text-primary bg-primary/10" : "text-content-muted hover:text-content hover:bg-surface"}`}
          >
            <User className="w-5 h-5" />
            Profile
          </button>
          <button 
            onClick={() => setActiveTab("saved")}
            className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-colors ${activeTab === "saved" ? "text-primary bg-primary/10" : "text-content-muted hover:text-content hover:bg-surface"}`}
          >
            <Bookmark className="w-5 h-5" />
            Saved Videos
            <span className="ml-auto bg-surface px-2 py-0.5 rounded-full text-xs">{savedVideoIds.length}</span>
          </button>
          <button 
            onClick={() => setActiveTab("liked")}
            className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-colors ${activeTab === "liked" ? "text-primary bg-primary/10" : "text-content-muted hover:text-content hover:bg-surface"}`}
          >
            <Heart className="w-5 h-5" />
            Liked Videos
            <span className="ml-auto bg-surface px-2 py-0.5 rounded-full text-xs">{likedVideoIds.length}</span>
          </button>
          <button 
            onClick={() => setActiveTab("theme")}
            className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-colors ${activeTab === "theme" ? "text-primary bg-primary/10" : "text-content-muted hover:text-content hover:bg-surface"}`}
          >
            <Save className="w-5 h-5" />
            Theme
          </button>
        </div>

        {/* Main Content */}
        <div className="md:col-span-2 space-y-8">
          {activeTab === "profile" && (
            <>
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-surface/60 backdrop-blur-xl border border-border-subtle rounded-2xl p-6 shadow-lg"
              >
                <h3 className="text-xl font-semibold text-content mb-6">Profile Information</h3>
                <div className="space-y-6">
                  <div className="flex items-center gap-6">
                    <div className="relative">
                      <img
                        src="https://picsum.photos/seed/user/150/150"
                        alt="Profile"
                        className="w-24 h-24 rounded-full object-cover ring-4 ring-background"
                        referrerPolicy="no-referrer"
                      />
                      <button className="absolute bottom-0 right-0 p-2 bg-primary text-white rounded-full shadow-lg hover:scale-110 transition-transform">
                        <User className="w-4 h-4" />
                      </button>
                    </div>
                    <div>
                      <h4 className="text-lg font-medium text-content">Profile Picture</h4>
                      <p className="text-sm text-content-muted mt-1">JPG, GIF or PNG. Max size of 800K</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-content">Username</label>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full px-4 py-3 bg-background border border-border-subtle rounded-xl text-content focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-content">Email Address</label>
                    <input
                      type="email"
                      value="alex@Jexi.com"
                      disabled
                      className="w-full px-4 py-3 bg-background/50 border border-border-subtle rounded-xl text-content-muted cursor-not-allowed"
                    />
                  </div>
                </div>
              </motion.div>
              <div className="flex justify-end">
                <button 
                  onClick={handleSave}
                  className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl font-medium hover:bg-primary-hover transition-colors shadow-lg shadow-primary/30"
                >
                  <Save className="w-5 h-5" />
                  {isSaved ? "Saved!" : "Save Changes"}
                </button>
              </div>
            </>
          )}

          {activeTab === "theme" && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-surface/60 backdrop-blur-xl border border-border-subtle rounded-2xl p-6 shadow-lg"
            >
              <h3 className="text-xl font-semibold text-content mb-6">Appearance & Theme</h3>
              <div className="space-y-6">
                <div>
                  <label className="text-sm font-medium text-content block mb-4">Color Theme</label>
                  <div className="flex flex-wrap gap-4 items-center">
                    <div className="flex items-center gap-3 p-2 bg-background border border-border-subtle rounded-xl">
                      <input
                        type="color"
                        value={colorTheme}
                        onChange={(e) => setColorTheme(e.target.value)}
                        className="w-10 h-10 rounded cursor-pointer border-0 p-0 bg-transparent"
                        title="Custom Color"
                      />
                      <span className="text-sm text-content font-mono pr-2">{colorTheme.toUpperCase()}</span>
                    </div>
                    <div className="h-8 w-px bg-border-subtle mx-2"></div>
                    <div className="flex gap-3">
                      {presetColors.map((color) => (
                        <button
                          key={color}
                          onClick={() => setColorTheme(color)}
                          className={`w-10 h-10 rounded-full ${colorTheme === color ? "ring-2 ring-offset-4 ring-offset-surface ring-content" : "opacity-70 hover:opacity-100 hover:scale-110"} transition-all shadow-md`}
                          style={{ backgroundColor: color }}
                          title={`Theme: ${color}`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === "saved" && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <h3 className="text-2xl font-bold text-content mb-6">Saved Videos</h3>
              <VideoGrid
                videos={savedVideos}
                loading={savedLoading}
                emptyIcon={<Bookmark className="w-full h-full" />}
                emptyText="You haven't saved any videos yet."
                isSavedTab={true}
              />
            </motion.div>
          )}

          {activeTab === "liked" && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <h3 className="text-2xl font-bold text-content mb-6">Liked Videos</h3>
              <VideoGrid
                videos={likedVideos}
                loading={likedLoading}
                emptyIcon={<Heart className="w-full h-full" />}
                emptyText="You haven't liked any videos yet."
                isSavedTab={false}
              />
            </motion.div>
          )}
        </div>
      </div>

      {/* Video Player Modal */}
      <AnimatePresence>
        {activeVideo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-xl p-4 sm:p-6"
            onClick={() => setActiveVideo(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 30 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-5xl bg-surface/90 backdrop-blur-2xl rounded-3xl overflow-hidden shadow-[0_0_80px_rgba(0,0,0,0.7)] border border-white/10 flex flex-col"
            >
              <button
                onClick={() => setActiveVideo(null)}
                className="absolute top-4 right-4 z-50 p-2.5 bg-black/50 hover:bg-black/80 backdrop-blur-md rounded-full text-white transition-all hover:scale-110 border border-white/20"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="w-full bg-black rounded-t-3xl overflow-hidden">
                <VideoPlayer
                  src={activeVideo.url}
                  type={activeVideo.type}
                  title={activeVideo.title}
                  videoId={activeVideo.id}
                />
              </div>

              <div className="px-6 py-5 flex items-start justify-between gap-4 bg-surface/80 border-t border-white/5">
                <div className="flex-1 min-w-0">
                  <motion.h2
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.15 }}
                    className="text-lg sm:text-xl font-bold text-content line-clamp-1"
                  >
                    {activeVideo.title}
                  </motion.h2>
                  {activeVideo.views && (
                    <p className="text-xs text-content-muted mt-0.5">{activeVideo.views} views</p>
                  )}
                  {creators.find((c) => c.id === activeVideo.creatorId) && (
                    <motion.div
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.2 }}
                      className="flex items-center gap-2 mt-2 flex-wrap"
                    >
                      <img
                        src={creators.find((c) => c.id === activeVideo.creatorId)?.avatar}
                        alt="Creator"
                        className="w-7 h-7 rounded-full ring-2 ring-primary/40 object-cover"
                        referrerPolicy="no-referrer"
                      />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveVideo(null);
                          onSelectCreator(activeVideo.creatorId);
                          setCurrentView("home");
                        }}
                        className="text-sm font-medium text-content-muted hover:text-primary hover:underline transition-colors"
                      >
                        {creators.find((c) => c.id === activeVideo.creatorId)?.name}
                      </button>
                      {activeVideo.collaboratorIds && activeVideo.collaboratorIds.length > 0 && (
                        <div className="flex items-center gap-1.5 flex-wrap text-sm text-content-muted">
                          <span className="opacity-60">with</span>
                          {activeVideo.collaboratorIds.map((collabId, index) => {
                            const collab = creators.find(c => c.id === collabId);
                            if (!collab) return null;
                            return (
                              <span key={collabId} className="flex items-center">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveVideo(null);
                                    onSelectCreator(collab.id);
                                    setCurrentView("home");
                                  }}
                                  className="font-medium hover:text-primary hover:underline transition-colors"
                                >
                                  {collab.name}
                                </button>
                                {index < (activeVideo.collaboratorIds?.length || 0) - 1 && <span>,</span>}
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </motion.div>
                  )}
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleLike(activeVideo.id, activeVideo);
                    }}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium border transition-all ${
                      likedVideoIds.includes(activeVideo.id)
                        ? "bg-rose-500/10 border-rose-500/30 text-rose-500"
                        : "bg-white/5 border-white/10 text-content-muted hover:text-rose-500 hover:border-rose-500/30 hover:bg-rose-500/5"
                    }`}
                  >
                    <Heart className={`w-4 h-4 ${likedVideoIds.includes(activeVideo.id) ? "fill-current" : ""}`} />
                    <span className="hidden sm:inline">
                      {likedVideoIds.includes(activeVideo.id) ? "Liked" : "Like"}
                    </span>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleSave(activeVideo.id, activeVideo);
                    }}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium border transition-all ${
                      savedVideoIds.includes(activeVideo.id)
                        ? "bg-primary/10 border-primary/30 text-primary"
                        : "bg-white/5 border-white/10 text-content-muted hover:text-primary hover:border-primary/30 hover:bg-primary/5"
                    }`}
                  >
                    <Bookmark className={`w-4 h-4 ${savedVideoIds.includes(activeVideo.id) ? "fill-current" : ""}`} />
                    <span className="hidden sm:inline">
                      {savedVideoIds.includes(activeVideo.id) ? "Saved" : "Save"}
                    </span>
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
