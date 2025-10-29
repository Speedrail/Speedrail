/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';

const tintColorLight = '#0a7ea4';
const tintColorDark = '#fff';

export const Colors = {
  light: {
    text: '#11181C',
    background: '#fff',
    tint: tintColorLight,
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: tintColorLight,
    card: '#f9fafb',
    cardBorder: '#e5e7eb',
    secondaryText: '#6b7280',
    accentBlue: '#0a7ea4',
    // Additional colors for notifications and navigation
    surface: '#fff',
    surfaceSecondary: '#f8f9fa',
    border: '#e5e7eb',
    borderLight: '#e8f0f9',
    inputBackground: '#fff',
    inputBorder: '#d1d5db',
    alertBackground: '#fff',
    alertBorder: '#e8ecf1',
    alertWarningBg: '#fffbf0',
    alertWarningBorder: '#f59e0b',
    alertWarningText: '#d97706',
    alertCriticalBg: '#fff5f5',
    alertCriticalBorder: '#ef4444',
    alertCriticalText: '#dc2626',
    unreadIndicator: '#6a99e3',
    buttonPrimary: '#6a99e3',
    buttonSecondary: '#e8f0f9',
    buttonDanger: '#dc2626',
    buttonDangerBg: '#fee2e2',
    metaText: '#9ca3af',
    filterActive: '#6a99e3',
    filterInactive: '#e8f0f9',
    infoBoxBg: '#e8f0f9',
    modalOverlay: 'rgba(0, 0, 0, 0.5)',
    divider: '#e5e7eb',
  },
  dark: {
    text: '#F8FAFC',
    background: '#0B0E11',
    tint: '#60A5FA',
    icon: '#94A3B8',
    tabIconDefault: '#64748B',
    tabIconSelected: '#60A5FA',
    card: '#1E293B',
    cardBorder: '#334155',
    secondaryText: '#94A3B8',
    accentBlue: '#3B82F6',
    // Additional colors for notifications and navigation
    surface: '#1E293B',
    surfaceSecondary: '#0F172A',
    border: '#334155',
    borderLight: '#334155',
    inputBackground: '#1E293B',
    inputBorder: '#475569',
    alertBackground: '#1E293B',
    alertBorder: '#334155',
    alertWarningBg: '#422006',
    alertWarningBorder: '#f59e0b',
    alertWarningText: '#fbbf24',
    alertCriticalBg: '#450a0a',
    alertCriticalBorder: '#ef4444',
    alertCriticalText: '#fca5a5',
    unreadIndicator: '#60A5FA',
    buttonPrimary: '#3B82F6',
    buttonSecondary: '#1E293B',
    buttonDanger: '#fca5a5',
    buttonDangerBg: '#450a0a',
    metaText: '#64748B',
    filterActive: '#3B82F6',
    filterInactive: '#1E293B',
    infoBoxBg: '#1E3A5F',
    modalOverlay: 'rgba(0, 0, 0, 0.7)',
    divider: '#334155',
  },
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
