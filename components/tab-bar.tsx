import { Colors } from '@/constants/theme';
import Feather from '@expo/vector-icons/Feather';
import { PlatformPressable } from '@react-navigation/elements';
import { useLinkBuilder } from '@react-navigation/native';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, interpolate, interpolateColor, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TabBar({ state, descriptors, navigation }: { state: any; descriptors: any; navigation: any }) {
  const { buildHref } = useLinkBuilder();
  const insets = useSafeAreaInsets();

  return (
    <View style = {[styles.bar, { bottom: Math.max(insets.bottom + 8, 16) }]}>
      {state.routes.map((route: { key: string | number; name: string; params: object | undefined; }, index: any) => {
        const { options } = descriptors[route.key];
        const label =
          options.tabBarLabel !== undefined
            ? options.tabBarLabel
            : options.title !== undefined
              ? options.title
              : route.name;

        const isFocused = state.index === index;
        
        return <TabBarButton 
          key={route.key}
          route={route}
          label={label}
          isFocused={isFocused}
          options={options}
          navigation={navigation}
          buildHref={buildHref}
        />;
      })}
    </View>
  );

  function getIcon(routeName: string, color: string) {
    switch(routeName) {
      case "index":
        return <Feather name="home" size={20} color={color}/>
      case "tickets":
        return <Feather name="clock" size={20} color={color}/>
      case "navigation":
        return <Feather name="map" size={20} color={color}/>
    }
  }
}

function TabBarButton({ route, label, isFocused, options, navigation, buildHref }: any) {
  const scale = useSharedValue(isFocused ? 1 : 0.95);
  const opacity = useSharedValue(isFocused ? 1 : 0);
  
  useEffect(() => {
    scale.value = withSpring(isFocused ? 1 : 0.95, {
      damping: 15,
      stiffness: 150,
      mass: 0.5,
    });
    opacity.value = withTiming(isFocused ? 1 : 0, {
      duration: 250,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1),
    });
  }, [isFocused]);

  const animatedButtonStyle = useAnimatedStyle(() => {
    return {
      backgroundColor: interpolateColor(
        opacity.value,
        [0, 1],
        ['transparent', Colors.light.text]
      ),
      transform: [{ scale: scale.value }],
    };
  });

  const animatedIconStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { 
          scale: interpolate(
            opacity.value,
            [0, 1],
            [1, 1.05]
          ) 
        }
      ],
    };
  });

  const animatedTextStyle = useAnimatedStyle(() => {
    return {
      opacity: interpolate(
        opacity.value,
        [0, 0.5, 1],
        [0.6, 0.8, 1]
      ),
    };
  });

  const onPress = () => {
    const event = navigation.emit({
      type: 'tabPress',
      target: route.key,
      canPreventDefault: true,
    });

    if (!isFocused && !event.defaultPrevented) {
      navigation.navigate(route.name, route.params);
    }
  };

  const onLongPress = () => {
    navigation.emit({
      type: 'tabLongPress',
      target: route.key,
    });
  };

  const iconColor = isFocused ? Colors.light.background : Colors.light.icon;
  const textColor = isFocused ? Colors.light.background : Colors.light.icon;

  return (
    <PlatformPressable
      style={styles.importIcon}
      href={buildHref(route.name, route.params)}
      accessibilityState={isFocused ? { selected: true } : {}}
      accessibilityLabel={options.tabBarAccessibilityLabel}
      testID={options.tabBarButtonTestID}
      onPress={onPress}
      onLongPress={onLongPress}
    >
      <Animated.View style={[styles.tabButton, animatedButtonStyle]}>
        <Animated.View style={animatedIconStyle}>
          {getIcon(route.name, iconColor)}
        </Animated.View>
        <Animated.Text style={[styles.barItemFocused, { color: textColor }, animatedTextStyle]}>
          {label}
        </Animated.Text>
      </Animated.View>
    </PlatformPressable>
  );
}

function getIcon(routeName: string, color: string) {
  switch(routeName) {
    case "index":
      return <Feather name="home" size={20} color={color}/>
    case "tickets":
      return <Feather name="clock" size={20} color={color}/>
    case "navigation":
      return <Feather name="map" size={20} color={color}/>
  }
}
const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    bottom: 16,
    left: 12,
    right: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.light.background,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderCurve: 'continuous',
    gap: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'visible',
  },

  barItem: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'column',
    borderRadius: 10,
    borderColor: Colors.light.background,
    paddingVertical: 0,
    paddingHorizontal: 0,
  },

  barItemFocused: {
    flexDirection: 'column',
    fontWeight: '600',
    fontSize: 11,
    marginTop: 2,
  },

  importIcon: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  tabButton: {
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 10,
    minHeight: 42,
  }
});
