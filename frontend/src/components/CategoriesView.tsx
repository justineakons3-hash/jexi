import { motion } from "motion/react";
import { Gamepad2, Music, BookOpen, Film, Cpu, TrendingUp, Sparkles, Trophy } from "lucide-react";

const CATEGORIES = [
  { id: "gaming", name: "Gaming", icon: Gamepad2, color: "bg-blue-500/10 text-blue-500", count: "12.4K" },
  { id: "music", name: "Music", icon: Music, color: "bg-purple-500/10 text-purple-500", count: "8.2K" },
  { id: "education", name: "Education", icon: BookOpen, color: "bg-emerald-500/10 text-emerald-500", count: "5.1K" },
  { id: "entertainment", name: "Entertainment", icon: Film, color: "bg-pink-500/10 text-pink-500", count: "15.8K" },
  { id: "tech", name: "Tech", icon: Cpu, color: "bg-amber-500/10 text-amber-500", count: "9.3K" },
  { id: "trending", name: "Trending", icon: TrendingUp, color: "bg-rose-500/10 text-rose-500", count: "24.1K" },
  { id: "lifestyle", name: "Lifestyle", icon: Sparkles, color: "bg-cyan-500/10 text-cyan-500", count: "11.2K" },
  { id: "sports", name: "Sports", icon: Trophy, color: "bg-orange-500/10 text-orange-500", count: "7.6K" },
];

interface Props {
  onSelectCategory: (category: string) => void;
}
export default function CategoriesView({ onSelectCategory }: Props) {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-content mb-2">
          Explore Categories
        </h1>
        <p className="text-content-muted">
          Discover content across your favorite topics and interests.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {CATEGORIES.map((category, index) => {
          const Icon = category.icon;
          return (
            <motion.button
              key={category.id}
              onClick={() => onSelectCategory(category.id)}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              className="group relative overflow-hidden bg-surface border border-border-subtle rounded-3xl p-6 text-left hover:border-primary/50 transition-all hover:shadow-xl hover:shadow-primary/5"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

              <div
                className={`w-14 h-14 rounded-2xl ${category.color} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}
              >
                <Icon className="w-7 h-7" />
              </div>

              <h3 className="text-xl font-bold text-content mb-2">
                {category.name}
              </h3>
              <p className="text-sm text-content-muted font-medium">
                {category.count} videos
              </p>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
