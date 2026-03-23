import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useTranslation } from 'react-i18next';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const { t } = useTranslation();

  return (
    <button
      onClick={toggleTheme}
      className="relative w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-250 group cursor-pointer"
      style={{
        background: 'rgba(0, 212, 255, 0.04)',
        border: '1px solid rgba(0, 212, 255, 0.08)',
        backdropFilter: 'blur(8px)',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.background = 'rgba(0, 212, 255, 0.08)';
        (e.currentTarget as HTMLElement).style.borderColor = 'rgba(0, 212, 255, 0.20)';
        (e.currentTarget as HTMLElement).style.boxShadow = '0 0 12px rgba(0, 212, 255, 0.08)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.background = 'rgba(0, 212, 255, 0.04)';
        (e.currentTarget as HTMLElement).style.borderColor = 'rgba(0, 212, 255, 0.08)';
        (e.currentTarget as HTMLElement).style.boxShadow = 'none';
      }}
      title={theme === 'dark' ? t('nav.actions.lightMode') : t('nav.actions.darkMode')}
    >
      {theme === 'dark' ? (
        <Sun className="w-4 h-4 transition-colors" style={{ color: '#FFB800', filter: 'drop-shadow(0 0 4px rgba(255, 184, 0, 0.4))' }} />
      ) : (
        <Moon className="w-4 h-4 transition-colors" style={{ color: '#00D4FF', filter: 'drop-shadow(0 0 4px rgba(0, 212, 255, 0.4))' }} />
      )}
    </button>
  );
}
