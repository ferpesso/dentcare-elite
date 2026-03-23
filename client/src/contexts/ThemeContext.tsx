import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'dark' | 'light';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    // Verificar localStorage primeiro — dark é sempre o padrão
    const stored = localStorage.getItem('dentcare-theme') as Theme | null;
    if (stored === 'light') return 'light';
    // Nano Banana: dark mode por padrão sempre
    return 'dark';
  });

  useEffect(() => {
    // Aplicar tema ao elemento raiz
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('dentcare-theme', theme);

    // Não sincronizar com preferência do sistema — dark mode é sempre o padrão
    return () => {};
  }, [theme]);

  const toggleTheme = () => {
    setThemeState(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme deve ser usado dentro de ThemeProvider');
  }
  return context;
}
