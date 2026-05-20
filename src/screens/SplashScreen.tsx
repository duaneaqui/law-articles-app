import { useEffect, useRef, useState } from 'react';
import { Animated, Image, StyleSheet, Text, View } from 'react-native';
import AppLoadingIndicator from '../components/AppLoadingIndicator';
import { constitutionArticles } from '../data/constitution1987.generated';

const MIN_SPLASH_MS = 2400;
const FADE_OUT_MS = 450;

const splashImage = require('../../assets/splash-constitution.png');

type SplashScreenProps = {
  onFinish: () => void;
};

export default function SplashScreen({ onFinish }: SplashScreenProps) {
  const fade = useRef(new Animated.Value(1)).current;
  const [status, setStatus] = useState('Loading constitution…');

  useEffect(() => {
    let cancelled = false;

    const finish = () => {
      Animated.timing(fade, {
        toValue: 0,
        duration: FADE_OUT_MS,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished && !cancelled) onFinish();
      });
    };

    const run = async () => {
      const start = Date.now();
      await new Promise((resolve) => setTimeout(resolve, 350));
      if (cancelled) return;

      setStatus('Preparing articles…');
      void constitutionArticles.length;

      const elapsed = Date.now() - start;
      const remaining = Math.max(0, MIN_SPLASH_MS - elapsed);
      await new Promise((resolve) => setTimeout(resolve, remaining));
      if (cancelled) return;

      setStatus('Opening reader…');
      await new Promise((resolve) => setTimeout(resolve, 280));
      if (cancelled) return;

      finish();
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [fade, onFinish]);

  return (
    <Animated.View style={[styles.root, { opacity: fade }]}>
      <Image source={splashImage} style={styles.hero} resizeMode="cover" accessibilityIgnoresInvertColors />
      <View style={styles.scrim} />
      <View style={styles.content}>
        <Text style={styles.kicker}>Constitution Reader</Text>
        <Text style={styles.title}>The 1987 Philippine Constitution</Text>
        <AppLoadingIndicator label={status} size="large" style={styles.loader} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#071a34',
  },
  hero: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(4, 12, 28, 0.55)',
  },
  content: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: 24,
    paddingBottom: 48,
  },
  kicker: {
    color: '#e8c56a',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  title: {
    color: '#f5f7fb',
    fontSize: 26,
    fontWeight: '800',
    lineHeight: 32,
    marginBottom: 28,
    maxWidth: 320,
  },
  loader: {
    alignSelf: 'flex-start',
  },
});
