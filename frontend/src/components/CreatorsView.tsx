import {
  useState,
  useEffect,
  useRef,
  useCallback,
} from "react";
import { motion } from "motion/react";
import { Search, Loader2 } from "lucide-react";
import { Creator } from "../types";
import axios from "axios";

interface CreatorsViewProps {
  onSelectCreator: (id: string) => void;
  // NEW: called with the creator's name when clicked — triggers a search
  // in the main video feed the same way typing in the search bar does.
  onSearchCreator: (name: string) => void;
}

const LIMIT = 100;

export default function CreatorsView({ onSelectCreator, onSearchCreator }: CreatorsViewProps) {
  const API_BASE = import.meta.env.VITE_BACKEND_URL || "/api";

  const [creatorsList, setCreatorsList] = useState<Creator[]>([]);
  const [search, setSearch]             = useState("");
  const [loading, setLoading]           = useState(false);
  const [hasMore, setHasMore]           = useState(true);
  const [total, setTotal]               = useState<number | null>(null);

  const pageRef        = useRef(1);
  const loadingRef     = useRef(false);
  const hasMoreRef     = useRef(true);
  const fetchGenRef    = useRef(0);
  const initialDoneRef = useRef(false);
  const observerTarget = useRef<HTMLDivElement>(null);
  const debounceRef    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchRef      = useRef("");

  /* ---------- BUILD URL ---------- */
  const buildUrl = useCallback(
    (page: number, q: string) => {
      const base = `${API_BASE}/creators?page=${page}&limit=${LIMIT}`;
      return q.trim() ? `${base}&search=${encodeURIComponent(q.trim())}` : base;
    },
    [API_BASE],
  );

  /* ---------- FETCH ONE PAGE ---------- */
  const fetchPage = useCallback(
    async (page: number, q: string, gen: number, replace: boolean) => {
      loadingRef.current = true;
      setLoading(true);

      try {
        const res = await axios.get(buildUrl(page, q), {
          headers: { "Cache-Control": "no-cache" },
        });

        if (gen !== fetchGenRef.current) return;

        const incoming: Creator[] = Array.isArray(res.data?.creators)
          ? res.data.creators
          : [];
        const serverTotal: number = res.data?.total ?? 0;

        setTotal(serverTotal);

        if (incoming.length === 0) {
          hasMoreRef.current = false;
          setHasMore(false);
        } else {
          setCreatorsList((prev) => (replace ? incoming : [...prev, ...incoming]));
          pageRef.current        = page + 1;
          hasMoreRef.current     = incoming.length === LIMIT;
          initialDoneRef.current = true;
          setHasMore(hasMoreRef.current);
        }
      } catch (err) {
        console.error("Creators fetch error:", err);
      } finally {
        if (gen === fetchGenRef.current) {
          loadingRef.current = false;
          setLoading(false);
        }
      }
    },
    [buildUrl],
  );

  /* ---------- RESET + FETCH PAGE 1 ---------- */
  const resetAndFetch = useCallback(
    (q: string) => {
      fetchGenRef.current += 1;
      const gen = fetchGenRef.current;

      pageRef.current        = 1;
      hasMoreRef.current     = true;
      loadingRef.current     = false;
      initialDoneRef.current = false;

      setCreatorsList([]);
      setHasMore(true);
      setLoading(false);
      setTotal(null);

      fetchPage(1, q, gen, true);
    },
    [fetchPage],
  );

  /* ---------- INITIAL LOAD ---------- */
  useEffect(() => {
    resetAndFetch("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------- SEARCH WITH DEBOUNCE ---------- */
  const handleSearchChange = (value: string) => {
    setSearch(value);
    searchRef.current = value;

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      resetAndFetch(value);
    }, 400);
  };

  /* ---------- LOAD NEXT PAGE ---------- */
  const loadMore = useCallback(() => {
    if (loadingRef.current || !hasMoreRef.current) return;
    fetchPage(pageRef.current, searchRef.current, fetchGenRef.current, false);
  }, [fetchPage]);

  /* ---------- INFINITE SCROLL ---------- */
  useEffect(() => {
    const target = observerTarget.current;
    if (!target) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && initialDoneRef.current) {
          loadMore();
        }
      },
      { rootMargin: "400px" },
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [loadMore]);

  /* ---------- UI ---------- */
  const isEmpty   = !loading && creatorsList.length === 0;
  const noResults = isEmpty && search.trim().length > 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-content mb-2">Creators</h1>
        <p className="text-content-muted">
          {total !== null
            ? search.trim()
              ? `${total.toLocaleString()} results for "${search}"`
              : `${total.toLocaleString()} creators — click to search their videos`
            : "Loading creators…"}
        </p>
      </div>

      {/* Search bar */}
      <div className="relative mb-8 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-content-muted pointer-events-none" />
        <input
          type="text"
          placeholder="Search all creators…"
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 bg-surface border border-border-subtle rounded-xl text-sm text-content placeholder-content-muted focus:outline-none focus:ring-2 focus:ring-primary/40 transition"
        />
        {loading && search.trim() && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary animate-spin" />
        )}
      </div>

      {/* No results */}
      {noResults && (
        <div className="text-center py-16 text-content-muted">
          <p>No creators match "{search}"</p>
        </div>
      )}

      {/* Empty DB */}
      {isEmpty && !search.trim() && !loading && (
        <div className="text-center py-24 text-content-muted">
          <p className="text-lg">No creators loaded yet.</p>
          <p className="text-sm mt-2 opacity-60">
            Run the scrapeCreators.js script to populate the database.
          </p>
        </div>
      )}

      {/* Creator grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {creatorsList.map((creator, index) => (
          <motion.button
            key={creator.id}
            onClick={() => {
              // Navigate to home and search for this creator's name —
              // exactly the same as typing their name in the search bar.
              onSearchCreator(creator.name);
            }}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2, delay: Math.min(index * 0.015, 0.3) }}
            className="group flex flex-col items-center text-center p-4 bg-surface border border-border-subtle rounded-2xl hover:border-primary/50 transition-all hover:shadow-xl hover:shadow-primary/5"
          >
            <div className="relative mb-3">
              <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <img
                src={creator.avatar}
                alt={creator.name}
                className="w-20 h-20 rounded-full object-cover border-4 border-background shadow-lg relative z-10 group-hover:scale-105 transition-transform duration-300"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    `https://ui-avatars.com/api/?name=${encodeURIComponent(creator.name)}&background=random&size=80`;
                }}
              />
            </div>

            <h3 className="text-sm font-bold text-content leading-tight line-clamp-2 group-hover:text-primary transition-colors">
              {creator.name}
            </h3>

            {/* Label changes to "Search" to reflect the new behaviour */}
            <div className="mt-3 px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-bold uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-all transform translate-y-1 group-hover:translate-y-0">
              Search
            </div>
          </motion.button>
        ))}
      </div>

      {/* Sentinel */}
      <div ref={observerTarget} className="w-full py-10 flex justify-center">
        {loading && creatorsList.length > 0 && (
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        )}
      </div>

    </div>
  );
}
