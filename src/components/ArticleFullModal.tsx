import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import AppLoadingIndicator from './AppLoadingIndicator';
import { Article } from '../types/article';

type ArticleFullModalProps = {
  visible: boolean;
  article: Article | null;
  onClose: () => void;
};

export default function ArticleFullModal({ visible, article, onClose }: ArticleFullModalProps) {
  const [contentReady, setContentReady] = useState(false);

  useEffect(() => {
    if (!visible || !article) {
      setContentReady(false);
      return;
    }

    setContentReady(false);
    const timer = setTimeout(() => setContentReady(true), 160);
    return () => clearTimeout(timer);
  }, [article?.id, visible]);

  if (!article) return null;

  return (
    <Modal visible={visible} animationType="fade" transparent statusBarTranslucent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close modal" />
        <View style={styles.sheet}>
          {contentReady ? (
            <>
              <Text style={styles.sheetTitle}>{article.title}</Text>
              <Text style={styles.sheetMeta}>{article.description}</Text>
              <ScrollView style={styles.sheetScroll} showsVerticalScrollIndicator contentContainerStyle={styles.sheetScrollInner}>
                <Text style={styles.sheetBody}>{article.content}</Text>
              </ScrollView>
              <Pressable style={styles.closeBtn} onPress={onClose}>
                <Text style={styles.closeBtnText}>Close</Text>
              </Pressable>
            </>
          ) : (
            <AppLoadingIndicator label="Loading article…" size="large" style={styles.sheetLoader} />
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 18,
    paddingVertical: 36,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    minHeight: 180,
    maxHeight: '88%',
    borderRadius: 16,
    backgroundColor: '#f7f1e8',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderWidth: 1,
    borderColor: '#c9bca8',
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 14,
    zIndex: 2,
  },
  sheetLoader: {
    minHeight: 140,
    justifyContent: 'center',
  },
  sheetTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#1a1410',
    lineHeight: 26,
  },
  sheetMeta: {
    marginTop: 8,
    fontSize: 11,
    fontWeight: '700',
    color: '#6b5c4e',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  sheetScroll: {
    marginTop: 14,
    maxHeight: '72%',
  },
  sheetScrollInner: {
    paddingBottom: 12,
  },
  sheetBody: {
    fontSize: 15,
    lineHeight: 24,
    color: '#2d231b',
    textAlign: 'justify',
  },
  closeBtn: {
    marginTop: 14,
    alignSelf: 'flex-end',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 10,
    backgroundColor: '#2c1810',
  },
  closeBtnText: {
    color: '#f0e6d4',
    fontWeight: '800',
    fontSize: 14,
  },
});
