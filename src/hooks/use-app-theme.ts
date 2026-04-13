import { Themes, ThemeColors } from '../constants/theme';
import { useSettingsStore } from '../store/settings.store';

export function useAppTheme(): ThemeColors {
  const themeType = useSettingsStore((state) => state.themeType);
  return Themes[themeType] || Themes.light;
}
