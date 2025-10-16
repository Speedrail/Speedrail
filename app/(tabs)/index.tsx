import Feather from '@expo/vector-icons/Feather';
import React from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function HomePage() {
  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: '#fff' }}>
      <View style={styles.container}>
        <View>
          <View style={styles.actionWrapper}>
            <Text style={styles.title}>Ready to Speed through Long Island?</Text>
            {/* <TouchableOpacity
              onPress={() => {
                // handle onPress
              }}
              style={{ marginRight: 'auto' }}>
              <View style={styles.action}>
                <Feather name="menu" size={22} color="#6a99e3" />
              </View>
            </TouchableOpacity> */}
            <TouchableOpacity
              onPress={() => {
                // handle onPress
              }}
              style={{ marginLeft: 'auto' }}>
              <View style={styles.action}>
                  <Feather name="bell" size={22} color="#6a99e3" />
              </View>
            </TouchableOpacity>
          </View>
          <View style={styles.search}>
            <View style={styles.searchInput}>
              <View style={styles.inputWrapper}>
                <TextInput
                  placeholder="Enter your destination"
                  placeholderTextColor="#9eadba"
                  style={styles.input} />
                <View style={styles.inputIcon}>
                  <Feather name="map-pin" size={16} color="#9eadba" />
                </View>
              </View>
            </View>
            <TouchableOpacity
              onPress={() => {
                // handle onPress
              }}>
              <View style={styles.btn}>
                <Text style={styles.btnText}>Submit</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.placeholder}>
          <View style={styles.placeholderInset}>
            <Text style={styles.noResultsText}>No tickets found</Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  container: {
    padding: 24,
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
  },
  title: {
    fontSize: 27,
    fontWeight: '700',
    color: '#222',
    marginTop: 24,
    marginBottom: 16,
    textAlign: 'left',
    flexWrap: 'wrap',
    width: '85%'
  },
  /** Action */
  action: {
    width: 48,
    height: 48,
    borderRadius: 12,
    marginHorizontal: 8,
    backgroundColor: '#e8f0f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    marginHorizontal: -8,
  },
  /** Search */
  search: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchInput: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
    marginRight: 12,
  },
  /** Input */
  input: {
    height: 44,
    backgroundColor: '#f0f6fb',
    paddingLeft: 44,
    paddingRight: 24,
    borderRadius: 12,
    fontSize: 15,
    fontWeight: '500',
    color: '#222',
  },
  inputWrapper: {
    position: 'relative',
    width: '100%',
  },
  inputIcon: {
    position: 'absolute',
    width: 44,
    height: 44,
    top: 0,
    left: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  /** Button */
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderWidth: 1,
    backgroundColor: '#222',
    borderColor: '#222',
  },
  btnText: {
    fontSize: 17,
    lineHeight: 24,
    fontWeight: '600',
    color: '#fff',
  },
  /** Placeholder */
  placeholder: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
    height: 400,
    marginTop: 24,
    padding: 0,
    backgroundColor: 'transparent',
  },
  placeholderInset: {
    borderWidth: 4,
    borderColor: '#e5e7eb',
    borderStyle: 'dashed',
    borderRadius: 9,
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noResultsText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#6b7280',
    textAlign: 'center',
  },
});