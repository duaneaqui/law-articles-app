import { StatusBar } from 'expo-status-bar';
import { useCallback, useState } from 'react';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import HomeScreen from './src/screens/HomeScreen';
import SplashScreen from './src/screens/SplashScreen';

const BG = '#0d0a08';

export default function App() {
  const [appReady, setAppReady] = useState(false);
  const handleSplashFinish = useCallback(() => setAppReady(true), []);

  return (
    <GestureHandlerRootView style={styles.container}>
      <SafeAreaProvider>
        <SafeAreaView style={styles.fill} edges={['top', 'left', 'right']}>
          <StatusBar style="light" />
          {appReady ? <HomeScreen /> : <SplashScreen onFinish={handleSplashFinish} />}
        </SafeAreaView>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
  },
  fill: {
    flex: 1,
    backgroundColor: BG,
  },
});
