import { useState, FormEvent, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Plus, Video as VideoIcon, UserPlus, Search, ChevronDown, Check, X } from "lucide-react";
import { Creator, Video } from "../types";

interface CreatorManagerProps {
  creators: Creator[];
  onAddCreator: (creator: Creator) => void;
  onAddVideo: (video: Video) => void;
}

export default function CreatorManager({
  creators,
  onAddCreator,
  onAddVideo,
}: CreatorManagerProps) {
  const [activeTab, setActiveTab] = useState<"creator" | "video">("creator");

  const [creatorName, setCreatorName] = useState("");
  const [creatorAvatar, setCreatorAvatar] = useState("");

  const [videoTitle, setVideoTitle] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [videoType, setVideoType] = useState<Video["type"]>("mp4");
  const [videoCreatorId, setVideoCreatorId] = useState(creators[0]?.id || "");
  const [videoThumbnail, setVideoThumbnail] = useState("");
  const [videoCollaboratorIds, setVideoCollaboratorIds] = useState<string[]>([]);
  const [isCollabDropdownOpen, setIsCollabDropdownOpen] = useState(false);
  const [collabSearchQuery, setCollabSearchQuery] = useState("");
  const collabDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (collabDropdownRef.current && !collabDropdownRef.current.contains(event.target as Node)) {
        setIsCollabDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleAddCreator = (e: FormEvent) => {
    e.preventDefault();
    if (!creatorName) return;

    const newCreator: Creator = {
      id: `c${Date.now()}`,
      name: creatorName,
      avatar:
        creatorAvatar || `https://picsum.photos/seed/${creatorName}/100/100`,
    };

    onAddCreator(newCreator);
    setCreatorName("");
    setCreatorAvatar("");

    if (!videoCreatorId) {
      setVideoCreatorId(newCreator.id);
    }
  };

  const handleAddVideo = (e: FormEvent) => {
    e.preventDefault();
    if (!videoTitle || !videoUrl || !videoCreatorId) return;

    const newVideo: Video = {
      id: `v${Date.now()}`,
      title: videoTitle,
      url: videoUrl,
      type: videoType,
      creatorId: videoCreatorId,
      collaboratorIds: videoCollaboratorIds,
      thumbnail:
        videoThumbnail || `https://picsum.photos/seed/${videoTitle}/640/360`,
    };

    onAddVideo(newVideo);
    setVideoTitle("");
    setVideoUrl("");
    setVideoThumbnail("");
    setVideoCollaboratorIds([]);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight text-content">
          Manage Content
        </h2>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="bg-surface/60 backdrop-blur-xl rounded-3xl shadow-lg border border-border-subtle overflow-hidden"
      >
        <div className="flex border-b border-border-subtle">
          <button
            onClick={() => setActiveTab("creator")}
            className={`flex-1 py-4 px-6 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${activeTab === "creator" ? "bg-primary/10 text-primary border-b-2 border-primary" : "text-content-muted hover:bg-background hover:text-content"}`}
          >
            <UserPlus className="w-5 h-5" />
            Add Creator
          </button>
          <button
            onClick={() => setActiveTab("video")}
            className={`flex-1 py-4 px-6 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${activeTab === "video" ? "bg-primary/10 text-primary border-b-2 border-primary" : "text-content-muted hover:bg-background hover:text-content"}`}
          >
            <VideoIcon className="w-5 h-5" />
            Add Video
          </button>
        </div>

        <div className="p-8">
          {activeTab === "creator" ? (
            <motion.form
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              onSubmit={handleAddCreator}
              className="space-y-6"
            >
              <div>
                <label className="block text-sm font-medium text-content-muted mb-2">
                  Creator Name
                </label>
                <input
                  type="text"
                  value={creatorName}
                  onChange={(e) => setCreatorName(e.target.value)}
                  placeholder="e.g. Marques Brownlee"
                  className="w-full px-4 py-3 rounded-xl bg-background border border-border-subtle text-content focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-content-muted mb-2">
                  Avatar URL (Optional)
                </label>
                <input
                  type="url"
                  value={creatorAvatar}
                  onChange={(e) => setCreatorAvatar(e.target.value)}
                  placeholder="https://example.com/avatar.jpg"
                  className="w-full px-4 py-3 rounded-xl bg-background border border-border-subtle text-content focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                />
                <p className="text-xs text-content-muted mt-2">
                  Leave blank to generate a random avatar.
                </p>
              </div>
              <button
                type="submit"
                className="w-full py-3 bg-primary hover:bg-primary-hover text-white rounded-xl font-semibold transition-colors shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Add Creator
              </button>
            </motion.form>
          ) : (
            <motion.form
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              onSubmit={handleAddVideo}
              className="space-y-6"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-content-muted mb-2">
                    Video Title
                  </label>
                  <input
                    type="text"
                    value={videoTitle}
                    onChange={(e) => setVideoTitle(e.target.value)}
                    placeholder="e.g. The Future of AI"
                    className="w-full px-4 py-3 rounded-xl bg-background border border-border-subtle text-content focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-content-muted mb-2">
                    Creator
                  </label>
                  <select
                    value={videoCreatorId}
                    onChange={(e) => {
                      setVideoCreatorId(e.target.value);
                      // Remove from collaborators if selected as main creator
                      if (videoCollaboratorIds.includes(e.target.value)) {
                        setVideoCollaboratorIds(prev => prev.filter(id => id !== e.target.value));
                      }
                    }}
                    className="w-full px-4 py-3 rounded-xl bg-background border border-border-subtle text-content focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all appearance-none"
                    required
                  >
                    {creators.length === 0 && (
                      <option value="" disabled>
                        No creators available
                      </option>
                    )}
                    {creators.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {creators.length > 1 && (
                <div className="relative" ref={collabDropdownRef}>
                  <label className="block text-sm font-medium text-content-muted mb-2">
                    Collaborators (Optional)
                  </label>
                  
                  <div 
                    onClick={() => setIsCollabDropdownOpen(!isCollabDropdownOpen)}
                    className="w-full px-4 py-3 rounded-xl bg-background border border-border-subtle text-content focus-within:ring-2 focus-within:ring-primary/50 transition-all cursor-pointer flex items-center justify-between min-h-[50px]"
                  >
                    <div className="flex flex-wrap gap-2 items-center flex-1">
                      {videoCollaboratorIds.length === 0 ? (
                        <span className="text-content-muted">Select collaborators...</span>
                      ) : (
                        videoCollaboratorIds.map(id => {
                          const collab = creators.find(c => c.id === id);
                          if (!collab) return null;
                          return (
                            <span key={id} className="bg-surface px-2 py-1 rounded-lg text-sm flex items-center gap-1 border border-border-subtle">
                              <img src={collab.avatar} alt={collab.name} className="w-4 h-4 rounded-full object-cover" />
                              {collab.name}
                              <button 
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setVideoCollaboratorIds(prev => prev.filter(cId => cId !== id));
                                }}
                                className="hover:text-rose-500 transition-colors ml-1"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          );
                        })
                      )}
                    </div>
                    <ChevronDown className={`w-5 h-5 text-content-muted transition-transform ${isCollabDropdownOpen ? 'rotate-180' : ''}`} />
                  </div>

                  <AnimatePresence>
                    {isCollabDropdownOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className="absolute left-0 top-full mt-2 w-full bg-surface border border-border-subtle rounded-2xl shadow-xl overflow-hidden z-50 flex flex-col max-h-80"
                      >
                        <div className="p-3 border-b border-border-subtle sticky top-0 bg-surface z-10">
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-content-muted" />
                            <input
                              type="text"
                              value={collabSearchQuery}
                              onChange={(e) => setCollabSearchQuery(e.target.value)}
                              placeholder="Search or add new..."
                              className="w-full pl-9 pr-4 py-2 bg-background border border-border-subtle rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                              onClick={(e) => e.stopPropagation()}
                            />
                          </div>
                        </div>
                        
                        <div className="overflow-y-auto p-2 flex-1">
                          {creators
                            .filter(c => c.id !== videoCreatorId)
                            .filter(c => c.name.toLowerCase().includes(collabSearchQuery.toLowerCase()))
                            .map(creator => {
                              const isSelected = videoCollaboratorIds.includes(creator.id);
                              return (
                                <button
                                  key={creator.id}
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (isSelected) {
                                      setVideoCollaboratorIds(prev => prev.filter(id => id !== creator.id));
                                    } else {
                                      setVideoCollaboratorIds(prev => [...prev, creator.id]);
                                    }
                                  }}
                                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm transition-colors ${
                                    isSelected ? 'bg-primary/10 text-primary' : 'hover:bg-background text-content-muted hover:text-content'
                                  }`}
                                >
                                  <div className="flex items-center gap-3">
                                    <img src={creator.avatar} alt={creator.name} className="w-6 h-6 rounded-full object-cover" />
                                    <span className="font-medium">{creator.name}</span>
                                  </div>
                                  {isSelected && <Check className="w-4 h-4" />}
                                </button>
                              );
                            })}
                            
                            {collabSearchQuery && !creators.some(c => c.name.toLowerCase() === collabSearchQuery.toLowerCase()) && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const newCreator: Creator = {
                                    id: `c${Date.now()}`,
                                    name: collabSearchQuery,
                                    avatar: `https://picsum.photos/seed/${collabSearchQuery}/100/100`,
                                  };
                                  onAddCreator(newCreator);
                                  setVideoCollaboratorIds(prev => [...prev, newCreator.id]);
                                  setCollabSearchQuery("");
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-primary hover:bg-primary/10 transition-colors mt-1 border border-primary/20 border-dashed"
                              >
                                <Plus className="w-4 h-4" />
                                Add "{collabSearchQuery}" as new creator
                              </button>
                            )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-content-muted mb-2">
                  Video URL
                </label>
                <input
                  type="url"
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-4 py-3 rounded-xl bg-background border border-border-subtle text-content focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-content-muted mb-2">
                    Video Type
                  </label>
                  <select
                    value={videoType}
                    onChange={(e) =>
                      setVideoType(e.target.value as Video["type"])
                    }
                    className="w-full px-4 py-3 rounded-xl bg-background border border-border-subtle text-content focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all appearance-none"
                  >
                    <option value="mp4">Direct MP4 URL</option>
                    <option value="gdrive">Google Drive Embed</option>
                    <option value="youtube">YouTube Embed</option>
                    <option value="feed">Other Feed/Iframe</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-content-muted mb-2">
                    Thumbnail URL (Optional)
                  </label>
                  <input
                    type="url"
                    value={videoThumbnail}
                    onChange={(e) => setVideoThumbnail(e.target.value)}
                    placeholder="https://..."
                    className="w-full px-4 py-3 rounded-xl bg-background border border-border-subtle text-content focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={creators.length === 0}
                className="w-full py-3 bg-primary hover:bg-primary-hover text-white rounded-xl font-semibold transition-colors shadow-lg shadow-primary/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="w-5 h-5" />
                Add Video
              </button>
              {creators.length === 0 && (
                <p className="text-sm text-rose-500 text-center mt-2">
                  Please add a creator first.
                </p>
              )}
            </motion.form>
          )}
        </div>
      </motion.div>

      {/* List of current creators */}
      <motion.div 
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        className="mt-12"
      >
        <h3 className="text-xl font-semibold text-content mb-6">
          Current Creators
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {creators.map((creator, idx) => (
            <motion.div
              key={creator.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1 }}
              whileHover={{ scale: 1.05, rotateY: 10 }}
              className="bg-surface/60 backdrop-blur-xl p-4 rounded-2xl border border-border-subtle flex flex-col items-center text-center gap-3 shadow-md preserve-3d"
            >
              <img
                src={creator.avatar}
                alt={creator.name}
                className="w-16 h-16 rounded-full object-cover ring-4 ring-background"
                referrerPolicy="no-referrer"
                style={{ transform: "translateZ(20px)" }}
              />
              <span className="font-medium text-content line-clamp-1" style={{ transform: "translateZ(10px)" }}>
                {creator.name}
              </span>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
