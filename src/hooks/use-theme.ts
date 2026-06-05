/**
 * Learn more about light and dark modes:
 * https://docs.expo.dev/guides/color-schemes/
 */

import { Colors } from '../constants/theme';
import { useColorScheme } from './use-color-scheme';

export function useTheme() {
  const scheme = useColorScheme();
  // ColorSchemeName can be 'light' | 'dark' | 'no-preference' | 'unspecified'
  // Normalize to 'light' or 'dark' for our Colors map; default to 'light'.
  const theme = scheme === 'dark' ? 'dark' : 'light';

  return Colors[theme];
}
