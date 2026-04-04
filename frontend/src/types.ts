export type ThemeMode = "light" | "dark";
export type ColorTheme = string;

export interface Creator {
  id: string;
  name: string;
  avatar: string;
}

export interface Video {
  id: string;
  title: string;
  url: string;
  type: "gdrive" | "feed" | "youtube" | "mp4";
  creatorId: string;
  category?: string;
  collaboratorIds?: string[];
  thumbnail: string;
  description?: string;
  duration?: string;
  views?: string;
  createdAt?: string;
  rating?: number;
  weeklyViews?: number;
  monthlyViews?: number;
}
