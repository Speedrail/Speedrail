import { Colors } from '@/constants/theme';
import Feather from '@expo/vector-icons/Feather';
import { PlatformPressable, Text } from '@react-navigation/elements';
import { useLinkBuilder } from '@react-navigation/native';
import { StyleSheet, View } from 'react-native';

export default function TabBar({ state, descriptors, navigation }: { state: any; descriptors: any; navigation: any }) {
  // TODO: fully implement this hook instead of using the constants theme file
  // const { colors } = useTheme(); 
  
  const { buildHref } = useLinkBuilder();

  return (
    <View style = {styles.bar}>
      {state.routes.map((route: { key: string | number; name: string; params: object | undefined; }, index: any) => {
        const { options } = descriptors[route.key];
        const label =
          options.tabBarLabel !== undefined
            ? options.tabBarLabel
            : options.title !== undefined
              ? options.title
              : route.name;

        const isFocused = state.index === index;
        const iconColor = isFocused ? Colors.light.text : Colors.light.icon;

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

        return (
          <PlatformPressable
            key = {route.key}
            style = {[
              styles.importIcon,
               {backgroundColor: route.name === "tickets" ? Colors.light.text : "transparent"}
            ]}
            href = {buildHref(route.name, route.params)}
            accessibilityState = {isFocused ? { selected: true } : {}}
            accessibilityLabel = {options.tabBarAccessibilityLabel}
            testID = {options.tabBarButtonTestID}
            onPress = {onPress}
            onLongPress = {onLongPress}
          >
            {getIcon(route.name, iconColor)}
             {route.name !== "tickets" && <Text style = {[
              styles.barItemFocused,
              {color: isFocused ? Colors.light.text : Colors.light.icon},
            ]}>{label}</Text>}
          </PlatformPressable>
        );
      })}
    </View>
  );

  function getIcon(routeName: string, color: string) {
    switch(routeName) {
      case "index":
        return <Feather name="home" size={24} color={color}/>
      case "tickets":
        return <Feather name="pen-tool" size={30} color={Colors.light.background}/>
    }
  }
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    bottom: 25,
    left: 15,
    right: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.light.background,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 25,
    borderCurve: 'continuous',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
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
    fontWeight: 'bold',
  },

  importIcon: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 15,
    borderColor: Colors.light.background,
    paddingVertical: 12,
    paddingHorizontal: 16,
    minHeight: 50,
  }
});