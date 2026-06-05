import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { useColorScheme, Image } from 'react-native';

import { Colors } from '../constants/theme';

export default function AppTabs() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];

  return (
    <NativeTabs
      backgroundColor={colors.background}
      indicatorColor={colors.backgroundElement}
      labelStyle={{ selected: { color: colors.text } }}>
      <NativeTabs.Trigger
        name="index"
        options={({
          title: 'Home',
          tabBarIcon: ({ color, size }) => (
            <Image
              source={require('../assets/images/tabIcons/home.png')}
              style={{ width: size ?? 24, height: size ?? 24, tintColor: color ?? colors.text }}
            />
          ),
        } as any)}
      />
      <NativeTabs.Trigger
        name="explore"
        options={({
          title: 'Explore',
          tabBarIcon: ({ color, size }) => (
            <Image
              source={require('../assets/images/tabIcons/explore.png')}
              style={{ width: size ?? 24, height: size ?? 24, tintColor: color ?? colors.text }}
            />
          ),
        } as any)}
      />
    </NativeTabs>
  );
}
