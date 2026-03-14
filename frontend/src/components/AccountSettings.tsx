import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { User, Bookmark, Heart, Save, Play, X } from "lucide-react";
import { ColorTheme, Video, Creator } from "../types";
import { VideoCard } from "./VideoFeed";
import VideoPlayer from "./VideoPlayer";

interface AccountSettingsProps {
  colorTheme: ColorTheme;
  setColorTheme: (color: ColorTheme) => void;
  videos: Video[];
  creators: Creator[];
  savedVideoIds: string[];
  likedVideoIds: string[];
  onToggleSave: (id: string) => void;
  onToggleLike: (id: string) => void;
  onSelectCreator: (id: string | null) => void;
  setCurrentView: (view: "home" | "manage" | "settings") => void;
}

export default function AccountSettings({ 
  colorTheme, 
  setColorTheme,
  videos,
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

  const presetColors = [
    "#ff8397", // Default
    "#3b82f6", // Blue
    "#a855f7", // Purple
    "#10b981", // Emerald
    "#f59e0b", // Amber
  ];

  const handleSave = () => {
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  useEffect(() => {
    if (activeVideo) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [activeVideo]);

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
              {/* Profile Section */}
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
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <h3 className="text-2xl font-bold text-content mb-6">Saved Videos</h3>
              {savedVideoIds.length === 0 ? (
                <div className="text-center py-12 bg-surface/40 rounded-2xl border border-border-subtle">
                  <Bookmark className="w-12 h-12 text-content-muted mx-auto mb-4 opacity-50" />
                  <p className="text-content-muted">You haven't saved any videos yet.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {videos.filter(v => savedVideoIds.includes(v.id)).map(video => (
                    <div key={video.id}>
                      <VideoCard 
                        video={video}
                        creator={creators.find(c => c.id === video.creatorId)}
                        allCreators={creators}
                        onSelectCreator={(id) => {
                          onSelectCreator(id);
                          setCurrentView("home");
                        }}
                        onClick={() => setActiveVideo(video)}
                        isSaved={true}
                        isLiked={likedVideoIds.includes(video.id)}
                        onToggleSave={onToggleSave}
                        onToggleLike={onToggleLike}
                      />
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {activeTab === "liked" && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <h3 className="text-2xl font-bold text-content mb-6">Liked Videos</h3>
              {likedVideoIds.length === 0 ? (
                <div className="text-center py-12 bg-surface/40 rounded-2xl border border-border-subtle">
                  <Heart className="w-12 h-12 text-content-muted mx-auto mb-4 opacity-50" />
                  <p className="text-content-muted">You haven't liked any videos yet.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {videos.filter(v => likedVideoIds.includes(v.id)).map(video => (
                    <div key={video.id}>
                      <VideoCard 
                        video={video}
                        creator={creators.find(c => c.id === video.creatorId)}
                        allCreators={creators}
                        onSelectCreator={(id) => {
                          onSelectCreator(id);
                          setCurrentView("home");
                        }}
                        onClick={() => setActiveVideo(video)}
                        isSaved={savedVideoIds.includes(video.id)}
                        isLiked={true}
                        onToggleSave={onToggleSave}
                        onToggleLike={onToggleLike}
                      />
                    </div>
                  ))}
                </div>
              )}
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
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-xl p-4 sm:p-8"
            onClick={() => setActiveVideo(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 40 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 40 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-7xl h-[90vh] sm:h-[85vh] bg-surface/80 backdrop-blur-2xl rounded-[2rem] overflow-hidden shadow-[0_0_100px_rgba(var(--theme-primary),0.2)] border border-white/10 relative flex flex-col"
            >
              <button
                onClick={() => setActiveVideo(null)}
                className="absolute top-6 right-6 z-50 p-3 bg-black/40 hover:bg-black/80 backdrop-blur-md rounded-full text-white transition-all hover:scale-110 border border-white/20"
              >
                <X className="w-6 h-6" />
              </button>
              
              <div className="relative w-full flex-1 min-h-0 bg-black flex items-center justify-center overflow-hidden group">
                <VideoPlayer src={activeVideo.url} type={activeVideo.type} title={activeVideo.title} />
              </div>
              
              <div className="p-6 sm:p-8 flex items-start justify-between bg-gradient-to-b from-surface/40 to-surface flex-shrink-0 border-t border-white/5">
                <div>
                  <motion.h2 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                    className="text-2xl sm:text-3xl font-bold text-content mb-1"
                  >
                    {activeVideo.title}
                  </motion.h2>
                  {activeVideo.views && (
                    <motion.p 
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.25 }}
                      className="text-sm font-medium text-content-muted mb-3"
                    >
                      {activeVideo.views} views
                    </motion.p>
                  )}
                  {creators.find((c) => c.id === activeVideo.creatorId) && (
                    <motion.div 
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 }}
                      className="flex items-center gap-3 flex-wrap"
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src={creators.find((c) => c.id === activeVideo.creatorId)?.avatar}
                          alt="Creator"
                          className="w-10 h-10 rounded-full ring-2 ring-primary/50 object-cover"
                          referrerPolicy="no-referrer"
                        />
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveVideo(null);
                            onSelectCreator(activeVideo.creatorId);
                            setCurrentView("home");
                          }}
                          className="text-lg font-medium text-content-muted hover:text-primary hover:underline transition-colors text-left"
                        >
                          {creators.find((c) => c.id === activeVideo.creatorId)?.name}
                        </button>
                      </div>

                      {activeVideo.collaboratorIds && activeVideo.collaboratorIds.length > 0 && (
                        <div className="flex items-center gap-2 flex-wrap text-content-muted text-lg">
                          <span className="opacity-70">with</span>
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

                <div className="flex items-center gap-3 ml-4 flex-shrink-0">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleLike(activeVideo.id);
                    }}
                    className={`p-3 rounded-full transition-colors ${likedVideoIds.includes(activeVideo.id) ? 'text-rose-500 bg-rose-500/10' : 'text-content-muted hover:bg-surface hover:text-rose-500'}`}
                    title={likedVideoIds.includes(activeVideo.id) ? "Unlike" : "Like"}
                  >
                    <Heart className={`w-6 h-6 ${likedVideoIds.includes(activeVideo.id) ? 'fill-current' : ''}`} />
                  </button>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleSave(activeVideo.id);
                    }}
                    className={`p-3 rounded-full transition-colors ${savedVideoIds.includes(activeVideo.id) ? 'text-primary bg-primary/10' : 'text-content-muted hover:bg-surface hover:text-primary'}`}
                    title={savedVideoIds.includes(activeVideo.id) ? "Unsave" : "Save"}
                  >
                    <Bookmark className={`w-6 h-6 ${savedVideoIds.includes(activeVideo.id) ? 'fill-current' : ''}`} />
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
