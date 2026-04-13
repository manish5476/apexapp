import { ThemeColors } from '../constants/theme';
import { useAppTheme } from './use-app-theme';

export function useThemeColor(
  props: { [key: string]: string | undefined },
  colorName: keyof ThemeColors
) {
  const theme = useAppTheme();
  
  // High-priority prop override
  const colorFromProps = props[colorName as string];

  if (colorFromProps) {
    return colorFromProps;
  } else {
    // Return semantic color from active theme
    return theme[colorName] as string;
  }
}
