import { ActivityIndicator, StyleSheet, Text, View, ViewStyle } from 'react-native';

type AppLoadingIndicatorProps = {
  label?: string;
  size?: 'small' | 'large';
  style?: ViewStyle;
};

const ACCENT = '#e8c56a';

export default function AppLoadingIndicator({ label, size = 'small', style }: AppLoadingIndicatorProps) {
  return (
    <View style={[styles.wrap, style]} accessibilityRole="progressbar" accessibilityLabel={label ?? 'Loading'}>
      <ActivityIndicator size={size} color={ACCENT} />
      {label ? <Text style={styles.label}>{label}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  label: {
    color: '#d8c7b2',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.3,
    textAlign: 'center',
  },
});
