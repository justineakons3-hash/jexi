import {
  useState,
  MouseEvent,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import { motion } from "motion/react";
import { Play, Heart, Bookmark, ArrowLeft, ChevronDown } from "lucide-react";
import { Video, Creator } from "../types";
import { LOADING_GIF_PATH } from "../constants";
import VideoPlayer from "./VideoPlayer";
import axios from "axios";
import { FC } from "react";

export interface VideoFeedProps {
  videos: Video[];
  creators: Creator[];
  selectedCreatorId: string | null;
  selectedCategory?: string | null;
  onSelectCreator: (id: string | null) => void;
  savedVideoIds: string[];
  likedVideoIds: string[];
  onToggleSave: (id: string) => void;
  onToggleLike: (id: string) => void;
  searchQuery: string;
  onVideosSeen?: (videos: Video[]) => void;
}

interface VideoCardProps {
  video: Video;
  creator?: Creator;
  onSelectCreator: (id: string | null) => void;
  onClick: () => void;
  isSaved: boolean;
  isLiked: boolean;
  onToggleSave: (id: string) => void;
  onToggleLike: (id: string) => void;
}

type SourceFilter = "all" | "eporner" | "hqporner";

/* ──────────────────── SOURCE BADGE ──────────────────── */
const SourceBadge: FC<{ type: string }> = ({ type }) => {
  if (type === "hqporner") {
    return (
      <div className="absolute top-2 left-2 bg-amber-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-md tracking-wide shadow-md z-10 select-none">
        HQ
      </div>
    );
  }
  if (type === "eporner") {
    return (
      <div className="absolute top-2 left-2 bg-rose-600 text-white text-[10px] font-black px-1.5 py-0.5 rounded-md tracking-wide shadow-md z-10 select-none">
        E
      </div>
    );
  }
  return null;
};

/* ──────────────────── VIDEO CARD ──────────────────── */
export const VideoCard: FC<VideoCardProps> = ({
  video,
  creator,
  onSelectCreator,
  onClick,
  isSaved,
  isLiked,
  onToggleSave,
  onToggleLike,
}) => {
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    const rect    = e.currentTarget.getBoundingClientRect();
    const x       = e.clientX - rect.left;
    const y       = e.clientY - rect.top;
    const centerX = rect.width  / 2;
    const centerY = rect.height / 2;
    setRotateX(((y - centerY) / centerY) * -10);
    setRotateY(((x - centerX) / centerX) * 10);
  };

  const handleMouseLeave = () => { setRotateX(0); setRotateY(0); };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      style={{ perspective: 1000 }}
    >
      <motion.div
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        animate={{ rotateX, rotateY }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
        className="group relative bg-surface/60 backdrop-blur-xl rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl border border-border-subtle"
      >
        <div
          className="relative aspect-video cursor-pointer overflow-hidden"
          onClick={onClick}
        >
          <SourceBadge type={video.type} />
          <img
            src={video.thumbnail}
            alt={video.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center">
            <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center">
              <Play className="w-6 h-6 text-white ml-1" />
            </div>
          </div>
          {video.duration && (
            <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-2 py-1 rounded-md">
              {video.duration}
            </div>
          )}
        </div>

        <div className="p-4">
          <div className="flex justify-between mb-2">
            <h3 className="font-semibold text-lg line-clamp-2">{video.title}</h3>
            <div className="flex gap-2">
              <button onClick={(e) => { e.stopPropagation(); onToggleLike(video.id); }}>
                <Heart className={`w-4 h-4 ${isLiked ? "fill-current text-rose-500" : ""}`} />
              </button>
              <button onClick={(e) => { e.stopPropagation(); onToggleSave(video.id); }}>
                <Bookmark className={`w-4 h-4 ${isSaved ? "fill-current text-primary" : ""}`} />
              </button>
            </div>
          </div>
          {creator && (
            <div className="flex items-center gap-3">
              <img
                src={creator.avatar}
                alt={creator.name}
                className="w-8 h-8 rounded-full"
                referrerPolicy="no-referrer"
              />
              <button
                onClick={(e) => { e.stopPropagation(); onSelectCreator(creator.id); }}
                className="text-sm hover:text-primary"
              >
                {creator.name}
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

/* ──────────────────── SOURCE FILTER DROPDOWN ──────────────────── */
const SOURCE_OPTIONS: { value: SourceFilter; label: string }[] = [
  { value: "all",      label: "All Sources" },
  { value: "eporner",  label: "Eporner" },
  { value: "hqporner", label: "HQ Porner" },
];

const SourceDropdown: FC<{
  value: SourceFilter;
  onChange: (v: SourceFilter) => void;
}> = ({ value, onChange }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: globalThis.MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const selected = SOURCE_OPTIONS.find((o) => o.value === value)!;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 px-4 py-2 bg-surface/60 backdrop-blur border border-border-subtle rounded-xl text-sm font-medium hover:border-primary/50 transition-colors"
      >
        <span
          className={`w-2 h-2 rounded-full flex-shrink-0 ${
            value === "eporner"
              ? "bg-rose-600"
              : value === "hqporner"
              ? "bg-amber-500"
              : "bg-content-muted"
          }`}
        />
        {selected.label}
        <ChevronDown
          className={`w-4 h-4 text-content-muted transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.15 }}
          className="absolute left-0 top-full mt-2 w-44 bg-surface/95 backdrop-blur-md border border-border-subtle rounded-xl shadow-2xl overflow-hidden z-50"
        >
          {SOURCE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => { onChange(opt.value); setOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left transition-colors hover:bg-white/10 ${
                value === opt.value ? "text-primary font-semibold" : "text-content"
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full flex-shrink-0 ${
                  opt.value === "eporner"
                    ? "bg-rose-600"
                    : opt.value === "hqporner"
                    ? "bg-amber-500"
                    : "bg-content-muted"
                }`}
              />
              {opt.label}
            </button>
          ))}
        </motion.div>
      )}
    </div>
  );
};

/* ──────────────────── DEBOUNCE ──────────────────── */
function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState<T>(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

/* ──────────────────────────────────────────────────────────────
   RELATED VIDEOS
   Shown below the player. Fetches up to 6 videos (shown as 3)
   by the same creator first; if fewer than 3 found, fills the
   rest with a keyword search on the first word of the title.
────────────────────────────────────────────────────────────── */
interface RelatedVideosProps {
  currentVideo: Video;
  creatorMap: Record<string, Creator>;
  onSelect: (video: Video) => void;
  savedVideoIds: string[];
  likedVideoIds: string[];
  onToggleSave: (id: string) => void;
  onToggleLike: (id: string) => void;
  onSelectCreator: (id: string | null) => void;
}

const RelatedVideos: FC<RelatedVideosProps> = ({
  currentVideo,
  creatorMap,
  onSelect,
  savedVideoIds,
  likedVideoIds,
  onToggleSave,
  onToggleLike,
  onSelectCreator,
}) => {
  const API_BASE = import.meta.env.VITE_BACKEND_URL || "/api";
  const [related, setRelated] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setRelated([]);
    setLoading(true);

    const fetchRelated = async () => {
      try {
        const seen = new Set<string>([currentVideo.id]);
        let results: Video[] = [];

        /* ── Step 1: same creator from DB ── */
        if (currentVideo.creatorId) {
          const res = await axios.get(
            `${API_BASE}/videos?limit=6&creator=${encodeURIComponent(currentVideo.creatorId)}`
          );
          const vids: Video[] = Array.isArray(res.data?.videos) ? res.data.videos : [];
          for (const v of vids) {
            if (!seen.has(v.id)) { seen.add(v.id); results.push(v); }
            if (results.length >= 3) break;
          }
        }

        /* ── Step 2: keyword search fallback ── */
        if (results.length < 3) {
          // Use the creator name or first meaningful word of the title
          const creatorName = creatorMap[currentVideo.creatorId]?.name;
          const keyword     = creatorName || currentVideo.title.split(" ").slice(0, 2).join(" ");
          const res = await axios.get(
            `${API_BASE}/videos?limit=10&search=${encodeURIComponent(keyword)}`
          );
          const vids: Video[] = Array.isArray(res.data?.videos) ? res.data.videos : [];
          for (const v of vids) {
            if (!seen.has(v.id)) { seen.add(v.id); results.push(v); }
            if (results.length >= 3) break;
          }
        }

        /* ── Step 3: random recent videos if still not enough ── */
        if (results.length < 3) {
          const res = await axios.get(`${API_BASE}/videos?limit=10&page=1`);
          const vids: Video[] = Array.isArray(res.data?.videos) ? res.data.videos : [];
          for (const v of vids) {
            if (!seen.has(v.id)) { seen.add(v.id); results.push(v); }
            if (results.length >= 3) break;
          }
        }

        if (!cancelled) setRelated(results.slice(0, 3));
      } catch (err) {
        console.error("Related videos fetch error:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchRelated();
    return () => { cancelled = true; };
  }, [currentVideo.id, currentVideo.creatorId, currentVideo.title, API_BASE, creatorMap]);

  if (loading) {
    return (
      <div className="mt-8">
        <h3 className="text-lg font-bold mb-4 text-content">More like this</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="animate-pulse bg-surface/60 rounded-2xl overflow-hidden border border-border-subtle"
            >
              <div className="aspect-video bg-white/5" />
              <div className="p-3 space-y-2">
                <div className="h-3 bg-white/10 rounded w-3/4" />
                <div className="h-3 bg-white/10 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (related.length === 0) return null;

  return (
    <div className="mt-8">
      <h3 className="text-lg font-bold mb-4 text-content">More like this</h3>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {related.map((video) => {
          const creator = creatorMap[video.creatorId];
          return (
            <VideoCard
              key={video.id}
              video={video}
              creator={creator}
              onSelectCreator={onSelectCreator}
              onClick={() => onSelect(video)}
              isSaved={savedVideoIds.includes(video.id)}
              isLiked={likedVideoIds.includes(video.id)}
              onToggleSave={onToggleSave}
              onToggleLike={onToggleLike}
            />
          );
        })}
      </div>
    </div>
  );
};

/* ──────────────────── VIDEO FEED ──────────────────── */
export default function VideoFeed({
  creators,
  selectedCreatorId,
  selectedCategory,
  onSelectCreator,
  savedVideoIds,
  likedVideoIds,
  onToggleSave,
  onToggleLike,
  searchQuery,
  onVideosSeen,
}: VideoFeedProps) {
  const API_BASE = import.meta.env.VITE_BACKEND_URL || "/api";

  const debouncedSearch                 = useDebounce(searchQuery, 500);
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all");
  const [feedVideos,   setFeedVideos]   = useState<Video[]>([]);
  const [top10Videos,  setTop10Videos]  = useState<Video[]>([]);
  const [activeVideo,  setActiveVideo]  = useState<Video | null>(null);
  const [loading,      setLoading]      = useState(false);
  const [hasMore,      setHasMore]      = useState(true);

  const pageRef            = useRef(1);
  const loadingRef         = useRef(false);
  const hasMoreRef         = useRef(true);
  const fetchGenRef        = useRef(0);
  const sourceFilterRef    = useRef<SourceFilter>("all");
  const debouncedSearchRef = useRef("");
  const observerTarget     = useRef<HTMLDivElement>(null);
  const sentinelInViewRef  = useRef(false);

  sourceFilterRef.current    = sourceFilter;
  debouncedSearchRef.current = debouncedSearch;

  /* ──── CREATOR MAP ──── */
  const creatorMap = useMemo(() => {
    const map: Record<string, Creator> = {};
    if (!Array.isArray(creators)) return map;
    creators.forEach((c) => { if (c?.id) map[c.id] = c; });
    return map;
  }, [creators]);

  /* ──── TOP 10 ──── */
  useEffect(() => {
    (async () => {
      try {
        const res  = await axios.get(`${API_BASE}/videos/top10`);
        const data: Video[] = Array.isArray(res.data?.videos) ? res.data.videos : [];
        setTop10Videos(data);
      } catch (err) {
        console.error("Top10 fetch error:", err);
      }
    })();
  }, [API_BASE]);

  /* ──── BUILD URL ──── */
  const buildUrl = useCallback((page: number) => {
    const search = debouncedSearchRef.current;
    const source = sourceFilterRef.current;
    const sourceParam = source !== "all" ? `&source=${source}` : "";
    if (search.trim()) {
      return (
        `${API_BASE}/videos?page=${page}&limit=20` +
        `&search=${encodeURIComponent(search)}` +
        sourceParam
      );
    }
    return `${API_BASE}/videos?page=${page}&limit=20${sourceParam}`;
  }, [API_BASE]);

  /* ──── FETCH ONE PAGE ──── */
  const fetchPage = useCallback(async (page: number, gen: number) => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);

    try {
      const res = await axios.get(buildUrl(page), {
        headers: { "Cache-Control": "no-cache" },
      });
      if (gen !== fetchGenRef.current) return;

      const newVideos: Video[] = Array.isArray(res.data?.videos) ? res.data.videos : [];

      if (newVideos.length === 0) {
        hasMoreRef.current = false;
        setHasMore(false);
      } else {
        if (page === 1) {
          setFeedVideos(newVideos);
        } else {
          setFeedVideos((prev) => [...prev, ...newVideos]);
        }
        pageRef.current = page + 1;
        onVideosSeen?.(newVideos);

        if (page === 1 && sentinelInViewRef.current && hasMoreRef.current) {
          setTimeout(() => {
            if (
              gen === fetchGenRef.current &&
              !loadingRef.current &&
              hasMoreRef.current &&
              sentinelInViewRef.current
            ) {
              fetchPage(pageRef.current, gen);
            }
          }, 100);
        }
      }
    } catch (err) {
      console.error("Video fetch error:", err);
    } finally {
      if (gen === fetchGenRef.current) {
        loadingRef.current = false;
        setLoading(false);
      }
    }
  }, [buildUrl, onVideosSeen]);

  /* ──── RESET + INITIAL LOAD ──── */
  useEffect(() => {
    const gen = ++fetchGenRef.current;
    pageRef.current           = 1;
    hasMoreRef.current        = true;
    loadingRef.current        = false;
    sentinelInViewRef.current = false;
    setFeedVideos([]);
    setHasMore(true);
    setLoading(false);
    fetchPage(1, gen);
  }, [debouncedSearch, sourceFilter, fetchPage]);

  /* ──── INTERSECTION OBSERVER ──── */
  useEffect(() => {
    const target = observerTarget.current;
    if (!target) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const isIntersecting = entries[0].isIntersecting;
        sentinelInViewRef.current = isIntersecting;

        if (isIntersecting && !loadingRef.current && hasMoreRef.current) {
          if (pageRef.current > 1) {
            fetchPage(pageRef.current, fetchGenRef.current);
          }
        }
      },
      { rootMargin: "400px" },
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [fetchPage]);

  /* ──── HEADING ──── */
  const headingTitle = debouncedSearch.trim()
    ? `Results for "${debouncedSearch}"${
        sourceFilter !== "all"
          ? ` · ${sourceFilter === "eporner" ? "Eporner" : "HQ Porner"}`
          : ""
      }`
    : sourceFilter === "eporner"
    ? "Eporner Videos"
    : sourceFilter === "hqporner"
    ? "HQ Porner Videos"
    : "All Videos";

  /* ──── RENDER ──── */
  return (
    <div className="flex flex-col lg:flex-row gap-8 items-start">
      {/* SIDEBAR — Top 10 */}
      <div className="w-full lg:w-1/4 xl:w-1/5">
        <h2 className="text-2xl font-bold mb-6">Top 10 Videos</h2>
        {top10Videos.length === 0 && loading && (
          <p className="text-sm text-content-muted animate-pulse">Loading…</p>
        )}
        <div className="space-y-4">
          {top10Videos.map((video, index) => {
            const creator = creatorMap[video.creatorId];
            return (
              <div
                key={video.id}
                className="flex gap-3 cursor-pointer group/top"
                onClick={() => setActiveVideo(video)}
              >
                <span className="text-2xl font-black text-content-muted/30 w-6 flex-shrink-0 leading-none mt-1 group-hover/top:text-primary transition-colors">
                  {index + 1}
                </span>
                <div className="relative flex-shrink-0">
                  <img
                    src={video.thumbnail}
                    className="w-20 h-12 rounded-lg object-cover"
                    referrerPolicy="no-referrer"
                  />
                  {(video.type === "hqporner" || video.type === "eporner") && (
                    <div
                      className={`absolute top-1 left-1 text-white text-[8px] font-black px-1 py-0.5 rounded-sm leading-none ${
                        video.type === "hqporner" ? "bg-amber-500" : "bg-rose-600"
                      }`}
                    >
                      {video.type === "hqporner" ? "HQ" : "E"}
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <h4 className="text-sm font-semibold line-clamp-2 group-hover/top:text-primary transition-colors">
                    {video.title}
                  </h4>
                  <span className="text-xs text-content-muted">
                    {creator?.name ?? video.creatorId}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* MAIN FEED */}
      <div className="flex-1">
        {activeVideo ? (
          <>
            <button
              onClick={() => setActiveVideo(null)}
              className="flex items-center gap-2 mb-6"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Feed
            </button>

            {/* Player */}
            <VideoPlayer
              src={activeVideo.url}
              type={activeVideo.type}
              title={activeVideo.title}
              videoId={activeVideo.id}
            />

            {/* Title + creator below player */}
            <div className="mt-4 mb-2">
              <h2 className="text-xl font-bold text-content line-clamp-2">
                {activeVideo.title}
              </h2>
              {creatorMap[activeVideo.creatorId] && (
                <div className="flex items-center gap-2 mt-2">
                  <img
                    src={creatorMap[activeVideo.creatorId].avatar}
                    alt={creatorMap[activeVideo.creatorId].name}
                    className="w-7 h-7 rounded-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <span className="text-sm text-content-muted font-medium">
                    {creatorMap[activeVideo.creatorId].name}
                  </span>
                </div>
              )}
            </div>

            {/* Related videos */}
            <RelatedVideos
              currentVideo={activeVideo}
              creatorMap={creatorMap}
              onSelect={(v) => {
                setActiveVideo(v);
                // Scroll back to top of player
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              savedVideoIds={savedVideoIds}
              likedVideoIds={likedVideoIds}
              onToggleSave={onToggleSave}
              onToggleLike={onToggleLike}
              onSelectCreator={onSelectCreator}
            />
          </>
        ) : (
          <>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">{headingTitle}</h2>
              <SourceDropdown value={sourceFilter} onChange={setSourceFilter} />
            </div>

            {searchQuery.trim() !== debouncedSearch.trim() && (
              <p className="text-sm text-content-muted mb-4 animate-pulse">Searching…</p>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
              {feedVideos.map((video) => {
                const creator = creatorMap[video.creatorId];
                return (
                  <VideoCard
                    key={video.id}
                    video={video}
                    creator={creator}
                    onSelectCreator={onSelectCreator}
                    onClick={() => setActiveVideo(video)}
                    isSaved={savedVideoIds.includes(video.id)}
                    isLiked={likedVideoIds.includes(video.id)}
                    onToggleSave={onToggleSave}
                    onToggleLike={onToggleLike}
                  />
                );
              })}
            </div>

            <div ref={observerTarget} className="w-full py-12 flex justify-center">
              {loading && (
                <img src={LOADING_GIF_PATH} alt="Loading..." className="w-10 h-10" />
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
