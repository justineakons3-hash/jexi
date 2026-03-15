import {
  useState,
  useEffect,
  useRef,
  useCallback,
} from "react";
import { motion, AnimatePresence } from "motion/react";
import { Search, Loader2, X, Users, Play } from "lucide-react";
import { Creator } from "../types";
import axios from "axios";

interface CreatorsViewProps {
  onSelectCreator: (id: string) => void;
  onSearchCreator: (name: string) => void;
}

const LIMIT   = 100;
const LETTERS = ["ALL", ...Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i)), "#"];

export default function CreatorsView({ onSelectCreator, onSearchCreator }: CreatorsViewProps) {
  const API_BASE = import.meta.env.VITE_BACKEND_URL || "/api";

  const [creatorsList, setCreatorsList]     = useState<Creator[]>([]);
  const [search, setSearch]                 = useState("");
  const [loading, setLoading]               = useState(false);
  const [hasMore, setHasMore]               = useState(true);
  const [total, setTotal]                   = useState<number | null>(null);
  const [activeLetter, setActiveLetter]     = useState("ALL");
  // Multi-select: stores selected creator objects
  const [selected, setSelected]             = useState<Creator[]>([]);

  const pageRef        = useRef(1);
  const loadingRef     = useRef(false);
  const hasMoreRef     = useRef(true);
  const fetchGenRef    = useRef(0);
  const initialDoneRef = useRef(false);
  const observerTarget = useRef<HTMLDivElement>(null);
  const debounceRef    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchRef      = useRef("");
  const letterRef      = useRef("ALL");

  /* ---------- BUILD URL ---------- */
  const buildUrl = useCallback((page: number, q: string, letter: string) => {
    let base = `${API_BASE}/creators?page=${page}&limit=${LIMIT}`;
    // Letter filter: pass as search prefix if no manual search
    if (q.trim()) {
      base += `&search=${encodeURIComponent(q.trim())}`;
    } else if (letter !== "ALL") {
      // "#" = names starting with a digit
      const prefix = letter === "#" ? "[0-9]" : letter;
      base += `&search=${encodeURIComponent("^" + prefix)}`;
    }
    return base;
  }, [API_BASE]);

  /* ---------- FETCH ONE PAGE ---------- */
  const fetchPage = useCallback(async (
    page: number, q: string, letter: string, gen: number, replace: boolean
  ) => {
    loadingRef.current = true;
    setLoading(true);
    try {
      const res = await axios.get(buildUrl(page, q, letter), {
        headers: { "Cache-Control": "no-cache" },
      });
      if (gen !== fetchGenRef.current) return;

      const incoming: Creator[] = Array.isArray(res.data?.creators) ? res.data.creators : [];
      const serverTotal: number = res.data?.total ?? 0;

      setTotal(serverTotal);

      if (incoming.length === 0) {
        hasMoreRef.current = false;
        setHasMore(false);
      } else {
        setCreatorsList(prev => replace ? incoming : [...prev, ...incoming]);
        pageRef.current        = page + 1;
        hasMoreRef.current     = incoming.length === LIMIT;
        initialDoneRef.current = true;
        setHasMore(hasMoreRef.current);
      }
    } catch (err) {
      console.error("Creators fetch error:", err);
    } finally {
      if (gen === fetchGenRef.current) { loadingRef.current = false; setLoading(false); }
    }
  }, [buildUrl]);

  /* ---------- RESET + FETCH ---------- */
  const resetAndFetch = useCallback((q: string, letter: string) => {
    fetchGenRef.current += 1;
    const gen = fetchGenRef.current;
    pageRef.current = 1; hasMoreRef.current = true;
    loadingRef.current = false; initialDoneRef.current = false;
    setCreatorsList([]); setHasMore(true); setLoading(false); setTotal(null);
    fetchPage(1, q, letter, gen, true);
  }, [fetchPage]);

  /* ---------- INITIAL LOAD ---------- */
  useEffect(() => { resetAndFetch("", "ALL"); }, []); // eslint-disable-line

  /* ---------- SEARCH DEBOUNCE ---------- */
  const handleSearchChange = (value: string) => {
    setSearch(value);
    searchRef.current = value;
    // Clear letter filter when typing
    if (value.trim()) { setActiveLetter("ALL"); letterRef.current = "ALL"; }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => resetAndFetch(value, letterRef.current), 400);
  };

  /* ---------- LETTER FILTER ---------- */
  const handleLetterClick = (letter: string) => {
    setActiveLetter(letter);
    letterRef.current = letter;
    setSearch(""); searchRef.current = "";
    resetAndFetch("", letter);
  };

  /* ---------- LOAD MORE ---------- */
  const loadMore = useCallback(() => {
    if (loadingRef.current || !hasMoreRef.current) return;
    fetchPage(pageRef.current, searchRef.current, letterRef.current, fetchGenRef.current, false);
  }, [fetchPage]);

  /* ---------- INFINITE SCROLL ---------- */
  useEffect(() => {
    const target = observerTarget.current;
    if (!target) return;
    const observer = new IntersectionObserver(
      entries => { if (entries[0].isIntersecting && initialDoneRef.current) loadMore(); },
      { rootMargin: "400px" }
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [loadMore]);

  /* ---------- MULTI-SELECT ---------- */
  const toggleSelect = (creator: Creator) => {
    setSelected(prev => {
      const exists = prev.find(c => c.id === creator.id);
      if (exists) return prev.filter(c => c.id !== creator.id);
      if (prev.length >= 4) return prev; // cap at 4 creators
      return [...prev, creator];
    });
  };

  const searchSelected = () => {
    if (selected.length === 0) return;
    const query = selected.map(c => c.name).join(" ");
    onSearchCreator(query);
    setSelected([]);
  };

  const isSelected = (id: string) => selected.some(c => c.id === id);

  /* ---------- UI ---------- */
  const isEmpty   = !loading && creatorsList.length === 0;
  const noResults = isEmpty && (search.trim().length > 0 || activeLetter !== "ALL");

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-content mb-1">Creators</h1>
        <p className="text-content-muted text-sm">
          {total !== null
            ? search.trim()
              ? `${total.toLocaleString()} results for "${search}"`
              : activeLetter !== "ALL"
              ? `${total.toLocaleString()} creators starting with "${activeLetter}"`
              : `${total.toLocaleString()} creators`
            : "Loading creators…"}
        </p>
      </div>

      {/* Search bar */}
      <div className="relative mb-4 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-content-muted pointer-events-none" />
        <input
          type="text"
          placeholder="Search creators…"
          value={search}
          onChange={e => handleSearchChange(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 bg-surface border border-border-subtle rounded-xl text-sm text-content placeholder-content-muted focus:outline-none focus:ring-2 focus:ring-primary/40 transition"
        />
        {loading && search.trim() && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary animate-spin" />
        )}
      </div>

      {/* A–Z letter bar */}
      <div className="flex flex-wrap gap-1 mb-6">
        {LETTERS.map(letter => (
          <button
            key={letter}
            onClick={() => handleLetterClick(letter)}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
              activeLetter === letter
                ? "bg-primary text-white shadow-md shadow-primary/30"
                : "bg-surface border border-border-subtle text-content-muted hover:border-primary/50 hover:text-content"
            }`}
          >
            {letter}
          </button>
        ))}
      </div>

      {/* Multi-select tip */}
      <div className="mb-6 flex items-center gap-2 text-xs text-content-muted">
        <Users className="w-3.5 h-3.5 flex-shrink-0" />
        <span>
          Click up to 4 creators to search their videos together — selected creators appear below.
        </span>
      </div>

      {/* Selected creators bar */}
      <AnimatePresence>
        {selected.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="mb-6 p-3 bg-primary/10 border border-primary/30 rounded-2xl flex flex-wrap items-center gap-3"
          >
            <span className="text-xs font-semibold text-primary uppercase tracking-wider">
              Selected:
            </span>

            {selected.map(c => (
              <div
                key={c.id}
                className="flex items-center gap-1.5 bg-surface border border-border-subtle rounded-full pl-1 pr-2 py-0.5"
              >
                <img
                  src={c.avatar}
                  alt={c.name}
                  className="w-5 h-5 rounded-full object-cover"
                  referrerPolicy="no-referrer"
                  onError={e => {
                    (e.target as HTMLImageElement).src =
                      `https://ui-avatars.com/api/?name=${encodeURIComponent(c.name)}&background=random&size=20`;
                  }}
                />
                <span className="text-xs font-medium text-content">{c.name}</span>
                <button
                  onClick={() => setSelected(prev => prev.filter(x => x.id !== c.id))}
                  className="ml-0.5 text-content-muted hover:text-rose-400 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}

            <button
              onClick={searchSelected}
              className="ml-auto flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white rounded-full text-xs font-bold hover:opacity-90 transition shadow-md shadow-primary/30"
            >
              <Play className="w-3 h-3" />
              Search Together
            </button>

            <button
              onClick={() => setSelected([])}
              className="text-xs text-content-muted hover:text-content transition"
            >
              Clear
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* No results */}
      {noResults && (
        <div className="text-center py-16 text-content-muted">
          <p>No creators found{search.trim() ? ` for "${search}"` : ` starting with "${activeLetter}"`}</p>
        </div>
      )}

      {/* Empty DB */}
      {isEmpty && !search.trim() && activeLetter === "ALL" && !loading && (
        <div className="text-center py-24 text-content-muted">
          <p className="text-lg">No creators loaded yet.</p>
          <p className="text-sm mt-2 opacity-60">Run the scrapeCreators.js script to populate.</p>
        </div>
      )}

      {/* Creator grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {creatorsList.map((creator, index) => {
          const sel = isSelected(creator.id);
          return (
            <motion.button
              key={creator.id}
              onClick={() => toggleSelect(creator)}
              onDoubleClick={() => onSearchCreator(creator.name)}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.2, delay: Math.min(index * 0.015, 0.3) }}
              className={`group relative flex flex-col items-center text-center p-4 bg-surface border rounded-2xl transition-all hover:shadow-xl hover:shadow-primary/5 ${
                sel
                  ? "border-primary shadow-md shadow-primary/20 bg-primary/5"
                  : "border-border-subtle hover:border-primary/50"
              }`}
            >
              {/* Selection tick */}
              {sel && (
                <div className="absolute top-2 right-2 w-5 h-5 bg-primary rounded-full flex items-center justify-center shadow">
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 12 12">
                    <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              )}

              <div className="relative mb-3">
                <div className={`absolute inset-0 rounded-full blur-xl transition-opacity duration-500 ${sel ? "opacity-100 bg-primary/30" : "opacity-0 group-hover:opacity-100 bg-primary/20"}`} />
                <img
                  src={creator.avatar}
                  alt={creator.name}
                  className={`w-20 h-20 rounded-full object-cover border-4 shadow-lg relative z-10 transition-all duration-300 ${
                    sel ? "border-primary scale-105" : "border-background group-hover:scale-105"
                  }`}
                  referrerPolicy="no-referrer"
                  onError={e => {
                    (e.target as HTMLImageElement).src =
                      `https://ui-avatars.com/api/?name=${encodeURIComponent(creator.name)}&background=random&size=80`;
                  }}
                />
              </div>

              <h3 className={`text-sm font-bold leading-tight line-clamp-2 transition-colors ${sel ? "text-primary" : "text-content group-hover:text-primary"}`}>
                {creator.name}
              </h3>

              <div className={`mt-3 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider transition-all transform ${
                sel
                  ? "bg-primary/20 text-primary opacity-100 translate-y-0"
                  : "bg-primary/10 text-primary opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0"
              }`}>
                {sel ? "Selected" : "Select"}
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Hint for single creator */}
      {creatorsList.length > 0 && (
        <p className="text-center text-xs text-content-muted mt-4 opacity-60">
          Double-click a creator to search them individually
        </p>
      )}

      {/* Sentinel */}
      <div ref={observerTarget} className="w-full py-10 flex justify-center">
        {loading && creatorsList.length > 0 && (
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        )}
      </div>

    </div>
  );
}
