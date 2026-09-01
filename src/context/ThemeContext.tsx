import React, { createContext, useContext, useEffect, useState } from 'react';

export type ThemeMode = 'light' | 'dark';
export type ThemePalette = 'indigo' | 'emerald' | 'gold' | 'sapphire' | 'nordic' | 'sunset';

export interface ThemePaletteConfig {
  id: ThemePalette;
  name: string;
  tagline: string;
  description: string;
  badge: string;
  previewColors: {
    primary: string;
    accent: string;
    darkBg: string;
    lightBg: string;
  };
  gradientLight: string;
  gradientDark: string;
  brandClass: string;
}

export const THEME_PALETTES: ThemePaletteConfig[] = [
  {
    id: 'indigo',
    name: 'Midnight Indigo',
    tagline: 'Modern Global Fintech',
    description: 'Tampilan standar canggih terinspirasi Revolut & Stripe dengan aksen Electric Indigo dan Deep Obsidian.',
    badge: 'Populer',
    previewColors: {
      primary: '#6366F1',
      accent: '#818CF8',
      darkBg: '#0B0F19',
      lightBg: '#F8FAFC',
    },
    gradientLight: 'from-indigo-600 to-indigo-700',
    gradientDark: 'from-indigo-950 via-slate-900 to-[#0B0F19]',
    brandClass: 'palette-indigo',
  },
  {
    id: 'emerald',
    name: 'Emerald Wealth',
    tagline: 'Investasi & Pertumbuhan Kas',
    description: 'Nuansa hijau permata dan mint yang melambangkan kestabilan finansial, cuan, dan saldo yang bertumbuh.',
    badge: 'Finansial',
    previewColors: {
      primary: '#10B981',
      accent: '#34D399',
      darkBg: '#081711',
      lightBg: '#F4FBF7',
    },
    gradientLight: 'from-emerald-600 to-teal-700',
    gradientDark: 'from-emerald-950 via-slate-900 to-[#081711]',
    brandClass: 'palette-emerald',
  },
  {
    id: 'gold',
    name: 'Black Gold Luxury',
    tagline: 'Platinum & Priority Banking',
    description: 'Kesan prestisius nan mewah layaknya kartu kredit Black Card dengan aksen Warm Gold dan Titanium Carbon.',
    badge: 'Eksklusif',
    previewColors: {
      primary: '#F59E0B',
      accent: '#FBBF24',
      darkBg: '#12100C',
      lightBg: '#FAF8F3',
    },
    gradientLight: 'from-amber-600 to-yellow-600',
    gradientDark: 'from-amber-950 via-slate-900 to-[#12100C]',
    brandClass: 'palette-gold',
  },
  {
    id: 'sapphire',
    name: 'Cyber Sapphire',
    tagline: 'Digital Banking & Keamanan',
    description: 'Palet biru safir solid dan cyan elektrik yang memberikan nuansa kepercayaan tinggi dan presisi analitik data.',
    badge: 'Perbankan',
    previewColors: {
      primary: '#2563EB',
      accent: '#38BDF8',
      darkBg: '#0A1120',
      lightBg: '#F0F7FF',
    },
    gradientLight: 'from-blue-600 to-cyan-600',
    gradientDark: 'from-blue-950 via-slate-900 to-[#0A1120]',
    brandClass: 'palette-sapphire',
  },
  {
    id: 'nordic',
    name: 'Nordic Minimalist',
    tagline: 'Swiss Clean & Apple-Style',
    description: 'Estetika ultra-minimalis monokromatik dengan tipografi tajam, ruang lapang, dan kontras grafis maksimal.',
    badge: 'Minimalis',
    previewColors: {
      primary: '#18181B',
      accent: '#71717A',
      darkBg: '#101012',
      lightBg: '#FAFAFA',
    },
    gradientLight: 'from-slate-800 to-slate-900',
    gradientDark: 'from-slate-900 via-zinc-900 to-[#101012]',
    brandClass: 'palette-nordic',
  },
  {
    id: 'sunset',
    name: 'Sunset Terracotta',
    tagline: 'Hangat & Ramah Keluarga',
    description: 'Perpaduan warna rose, coral, dan peach yang hangat dan bersahabat untuk pencatatan belanja harian.',
    badge: 'Hangat',
    previewColors: {
      primary: '#F43F5E',
      accent: '#FB7185',
      darkBg: '#170E12',
      lightBg: '#FFF5F6',
    },
    gradientLight: 'from-rose-600 to-orange-500',
    gradientDark: 'from-rose-950 via-slate-900 to-[#170E12]',
    brandClass: 'palette-sunset',
  },
];

interface ThemeContextType {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
  palette: ThemePalette;
  setPalette: (palette: ThemePalette) => void;
  paletteConfig: ThemePaletteConfig;
  allPalettes: ThemePaletteConfig[];
  isThemeModalOpen: boolean;
  setIsThemeModalOpen: (open: boolean) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    try {
      const savedTheme = localStorage.getItem('arthasmart_theme') as ThemeMode | null;
      if (savedTheme === 'light' || savedTheme === 'dark') {
        return savedTheme;
      }
      if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return 'dark';
      }
    } catch {
      // ignore
    }
    return 'light';
  });

  const [palette, setPaletteState] = useState<ThemePalette>(() => {
    try {
      const savedPalette = localStorage.getItem('arthasmart_palette') as ThemePalette | null;
      if (savedPalette && THEME_PALETTES.some((p) => p.id === savedPalette)) {
        return savedPalette;
      }
    } catch {
      // ignore
    }
    return 'indigo';
  });

  const [isThemeModalOpen, setIsThemeModalOpen] = useState(false);

  // Synchronize HTML attributes for Dark Mode and Color Palette
  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;

    // Dark mode classes
    if (theme === 'dark') {
      root.classList.add('dark');
      root.style.colorScheme = 'dark';
      if (body) body.classList.add('dark');
    } else {
      root.classList.remove('dark');
      root.style.colorScheme = 'light';
      if (body) body.classList.remove('dark');
    }

    // Palette attributes
    root.setAttribute('data-palette', palette);
    if (body) body.setAttribute('data-palette', palette);

    // Remove old palette-* classes and add the current one
    THEME_PALETTES.forEach((p) => {
      root.classList.remove(p.brandClass);
      if (body) body.classList.remove(p.brandClass);
    });
    root.classList.add(`palette-${palette}`);
    if (body) body.classList.add(`palette-${palette}`);

    try {
      localStorage.setItem('arthasmart_theme', theme);
      localStorage.setItem('arthasmart_palette', palette);
    } catch {
      // ignore
    }
  }, [theme, palette]);

  const setTheme = (newTheme: ThemeMode) => {
    setThemeState(newTheme);
  };

  const toggleTheme = () => {
    setThemeState((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const setPalette = (newPalette: ThemePalette) => {
    setPaletteState(newPalette);
  };

  const paletteConfig = THEME_PALETTES.find((p) => p.id === palette) || THEME_PALETTES[0];

  return (
    <ThemeContext.Provider
      value={{
        theme,
        setTheme,
        toggleTheme,
        palette,
        setPalette,
        paletteConfig,
        allPalettes: THEME_PALETTES,
        isThemeModalOpen,
        setIsThemeModalOpen,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
