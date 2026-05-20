import { useCallback, useEffect, useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  Extrapolation,
  clamp,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import AppLoadingIndicator from '../components/AppLoadingIndicator';
import ArticleFullModal from '../components/ArticleFullModal';
import { constitutionArticles } from '../data/constitution1987.generated';
import { Article } from '../types/article';

const FLIP_DURATION_MS = 280;
const OPEN_DURATION_MS = 420;
const SOFT_FLIP_EASING = Easing.bezier(0.22, 0.61, 0.36, 1);
const profilePhoto = require('../../assets/sam-charles-rivera.png');

const ROMAN_NUMERALS = [
  '',
  'I',
  'II',
  'III',
  'IV',
  'V',
  'VI',
  'VII',
  'VIII',
  'IX',
  'X',
  'XI',
  'XII',
  'XIII',
  'XIV',
  'XV',
  'XVI',
  'XVII',
  'XVIII',
];

function getArticleLabel(idx: number, total: number) {
  if (idx === 0) return 'Preamble';
  if (idx === total - 1) return 'Ordinance';
  return `Article ${ROMAN_NUMERALS[idx] ?? idx}`;
}

export default function HomeScreen() {
  const { width, height } = useWindowDimensions();
  const [index, setIndex] = useState(0);
  const [viewMode, setViewMode] = useState<'book' | 'grid' | 'info'>('book');
  const [gridIndex, setGridIndex] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [flipDirection, setFlipDirection] = useState<-1 | 0 | 1>(0);
  const [modalArticle, setModalArticle] = useState<Article | null>(null);
  const [panelLoading, setPanelLoading] = useState(false);

  const maxIndex = constitutionArticles.length - 1;
  const totalArticles = constitutionArticles.length;
  const current = constitutionArticles[index];
  const gridArticle = constitutionArticles[gridIndex];
  const next = index < maxIndex ? constitutionArticles[index + 1] : null;
  const prevArticle = index > 0 ? constitutionArticles[index - 1] : null;

  const incomingArticle = useMemo(() => {
    if (flipDirection === -1) return next ?? current;
    if (flipDirection === 1) return prevArticle ?? current;
    return current;
  }, [current, flipDirection, next, prevArticle]);
  const incomingIndex =
    flipDirection === -1 ? Math.min(index + 1, maxIndex) : flipDirection === 1 ? Math.max(index - 1, 0) : index;
  const currentLabel = getArticleLabel(index, totalArticles);
  const incomingLabel = getArticleLabel(incomingIndex, totalArticles);
  const gridLabel = getArticleLabel(gridIndex, totalArticles);

  const spineWidth = 12;
  const bookWidth = Math.min(width - 22, 440);
  const bookHeight = Math.min(Math.max(height * 0.64, 360), 520);
  const innerWidth = bookWidth - 20;
  const pageWidth = innerWidth - spineWidth;
  const pageHeight = bookHeight - 18;
  const dragSpan = Math.max(pageWidth * 0.95, 1);
  const pageHalf = pageWidth / 2;

  const openProgress = useSharedValue(0);
  const progress = useSharedValue(0);
  const directionSV = useSharedValue(0);

  const resetGestureState = useCallback(() => {
    setFlipDirection(0);
  }, []);

  const finishFlip = useCallback(
    (forward: boolean) => {
      setIndex((v) => (forward ? Math.min(v + 1, maxIndex) : Math.max(v - 1, 0)));
      setFlipDirection(0);
    },
    [maxIndex]
  );

  const markOpen = useCallback(() => {
    setIsOpen(true);
  }, []);

  useEffect(() => {
    if (viewMode !== 'grid') return;
    setPanelLoading(true);
    const timer = setTimeout(() => setPanelLoading(false), 180);
    return () => clearTimeout(timer);
  }, [gridIndex, viewMode]);

  const openPan = Gesture.Pan()
    .enabled(!isOpen)
    .activeOffsetX([-10, 10])
    .failOffsetY([-22, 22])
    .onUpdate((e) => {
      openProgress.value = clamp(-e.translationX / (pageWidth * 0.9), 0, 1);
    })
    .onEnd((e) => {
      const shouldOpen = openProgress.value > 0.38 || e.velocityX < -700;
      const dest = shouldOpen ? 1 : 0;
      openProgress.value = withTiming(dest, { duration: OPEN_DURATION_MS, easing: SOFT_FLIP_EASING }, (finished) => {
        if (finished && shouldOpen) {
          runOnJS(markOpen)();
        }
      });
    });

  const pan = Gesture.Pan()
    .enabled(isOpen)
    .activeOffsetX([-10, 10])
    .failOffsetY([-22, 22])
    .onBegin(() => {
      directionSV.value = 0;
      progress.value = 0;
    })
    .onUpdate((e) => {
      if (directionSV.value === 0) {
        if (e.translationX < -10 && index < maxIndex) {
          directionSV.value = -1;
          runOnJS(setFlipDirection)(-1);
        } else if (e.translationX > 10 && index > 0) {
          directionSV.value = 1;
          runOnJS(setFlipDirection)(1);
        } else {
          return;
        }
      }

      if (directionSV.value === -1) {
        progress.value = clamp(-e.translationX / dragSpan, 0, 1);
      } else if (directionSV.value === 1) {
        progress.value = clamp(e.translationX / dragSpan, 0, 1);
      }
    })
    .onEnd((e) => {
      const dir = directionSV.value;
      if (dir === 0) {
        progress.value = 0;
        runOnJS(resetGestureState)();
        return;
      }

      const velocityPass = dir === -1 ? e.velocityX < -850 : e.velocityX > 850;
      const shouldCommit = progress.value > 0.44 || velocityPass;
      const destination = shouldCommit ? 1 : 0;

      progress.value = withTiming(destination, { duration: FLIP_DURATION_MS + 60, easing: SOFT_FLIP_EASING }, (finished) => {
        if (!finished) return;
        directionSV.value = 0;
        progress.value = 0;
        if (shouldCommit) {
          runOnJS(finishFlip)(dir === -1);
        } else {
          runOnJS(resetGestureState)();
        }
      });
    });

  const flippingSheetStyle = useAnimatedStyle(() => {
    const softT = interpolate(progress.value, [0, 0.3, 0.75, 1], [0, 0.2, 0.85, 1], Extrapolation.CLAMP);
    const toward = directionSV.value === 1 ? 180 : -180;
    const rot = interpolate(softT, [0, 1], [0, toward], Extrapolation.CLAMP);
    const liftY = interpolate(progress.value, [0, 0.5, 1], [0, -7, 0], Extrapolation.CLAMP);
    const paperBend = interpolate(progress.value, [0, 0.5, 1], [0, 4.4, 0], Extrapolation.CLAMP);
    const paperStretch = interpolate(progress.value, [0, 0.5, 1], [1, 0.986, 1], Extrapolation.CLAMP);
    return {
      opacity: directionSV.value === 0 ? 0 : 1,
      transform: [
        { perspective: 2200 },
        { translateY: liftY },
        { rotateX: `${paperBend}deg` },
        { scaleY: paperStretch },
        { translateX: -pageHalf },
        { rotateY: `${rot}deg` },
        { translateX: pageHalf },
      ],
    };
  });

  const backFaceStyle = useAnimatedStyle(() => {
    const start = directionSV.value === 1 ? -180 : 180;
    const rot = interpolate(progress.value, [0, 1], [start, 0], Extrapolation.CLAMP);
    const backLift = interpolate(progress.value, [0, 0.55, 1], [0, -4, 0], Extrapolation.CLAMP);
    return {
      transform: [{ translateY: backLift }, { rotateY: `${rot}deg` }],
    };
  });

  const frontShadowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.48, 1], [0.03, 0.32, 0.08], Extrapolation.CLAMP),
  }));

  const edgeShadowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.18, 0.55, 1], [0.02, 0.14, 0.28, 0.1], Extrapolation.CLAMP),
  }));

  const paperGlossStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.28, 0.6, 1], [0.22, 0.08, 0.18, 0.04], Extrapolation.CLAMP),
  }));

  const backTintStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.25, 1], [0.22, 0.14, 0.06], Extrapolation.CLAMP),
  }));

  const spineShadowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.45, 1], [0.03, 0.16, 0.3], Extrapolation.CLAMP),
  }));

  const spreadStyle = useAnimatedStyle(() => ({
    opacity: interpolate(openProgress.value, [0, 1], [0.1, 1], Extrapolation.CLAMP),
    transform: [{ scale: interpolate(openProgress.value, [0, 1], [0.96, 1], Extrapolation.CLAMP) }],
  }));

  const closedCoverStyle = useAnimatedStyle(() => {
    const r = interpolate(openProgress.value, [0, 1], [0, -180], Extrapolation.CLAMP);
    const shadow = interpolate(openProgress.value, [0, 0.6, 1], [0.42, 0.28, 0], Extrapolation.CLAMP);
    return {
      opacity: interpolate(openProgress.value, [0, 0.96, 1], [1, 1, 0], Extrapolation.CLAMP),
      shadowOpacity: shadow,
      transform: [{ perspective: 2400 }, { translateX: -innerWidth / 2 }, { rotateY: `${r}deg` }, { translateX: innerWidth / 2 }],
    };
  }, [innerWidth]);

  const counter =
    viewMode === 'info'
      ? 'INFO'
      : `${(viewMode === 'book' ? index : gridIndex) + 1}/${totalArticles}`;

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          <Text style={styles.headerTitle}>Constitution Reader</Text>
          <View style={styles.pageChip}>
            {panelLoading && viewMode === 'grid' ? (
              <AppLoadingIndicator size="small" />
            ) : (
              <Text style={styles.pageChipText}>{counter}</Text>
            )}
          </View>
        </View>
        <View style={styles.modeToggle}>
          <Pressable onPress={() => setViewMode('book')} style={[styles.modeBtn, viewMode === 'book' && styles.modeBtnActive]}>
            <Text style={[styles.modeBtnText, viewMode === 'book' && styles.modeBtnTextActive]}>Book</Text>
          </Pressable>
          <Pressable onPress={() => setViewMode('grid')} style={[styles.modeBtn, viewMode === 'grid' && styles.modeBtnActive]}>
            <Text style={[styles.modeBtnText, viewMode === 'grid' && styles.modeBtnTextActive]}>Grid</Text>
          </Pressable>
          <Pressable onPress={() => setViewMode('info')} style={[styles.modeBtn, viewMode === 'info' && styles.modeBtnActive]}>
            <Text style={[styles.modeBtnText, viewMode === 'info' && styles.modeBtnTextActive]}>Info</Text>
          </Pressable>
        </View>
        <Text style={styles.headerSub}>
          {viewMode === 'book'
            ? isOpen
              ? 'Swipe left for next · swipe right for previous · tap title for full article'
              : 'Swipe left on the cover to open the book'
            : viewMode === 'grid'
            ? 'Tap an article number button to open it as a full reading page'
            : 'Project details and requirement metadata'}
        </Text>
      </View>

      {viewMode === 'book' ? (
        <View style={styles.readerStage}>
          <GestureDetector gesture={isOpen ? pan : openPan}>
            <View style={[styles.book, { width: bookWidth, height: bookHeight }]}>
              <Animated.View style={[styles.spread, spreadStyle]}>
                <View style={[styles.bookSpine, { height: pageHeight }]} />

                <View style={[styles.rightPageHost, { width: pageWidth, height: pageHeight }]}>
                  <View style={styles.rightPageUnder}>
                    <Pressable onPress={() => setModalArticle(incomingArticle)} style={styles.pageInner} accessibilityRole="button">
                      <Text style={styles.pageTitle} numberOfLines={5}>
                        {incomingArticle.title}
                      </Text>
                      <Text style={styles.pageSub} numberOfLines={3}>
                        {incomingLabel} · {incomingArticle.description}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              </Animated.View>

              <Animated.View
                style={[
                  styles.turningSheet,
                  { left: 10 + spineWidth, width: pageWidth, height: pageHeight },
                  flippingSheetStyle,
                ]}>
                <Animated.View style={[styles.turningFace, styles.turningFaceFront]}>
                  <Pressable onPress={() => setModalArticle(current)} style={styles.pageInner} accessibilityRole="button">
                    <Text style={styles.pageTitle} numberOfLines={5}>
                      {current.title}
                    </Text>
                    <Text style={styles.pageSub} numberOfLines={3}>
                      {currentLabel} · {current.description}
                    </Text>
                  </Pressable>
                  <Animated.View pointerEvents="none" style={[styles.paperShadow, frontShadowStyle]} />
                  <Animated.View pointerEvents="none" style={[styles.paperEdgeShadow, edgeShadowStyle]} />
                  <Animated.View pointerEvents="none" style={[styles.paperGloss, paperGlossStyle]} />
                </Animated.View>

                <Animated.View style={[styles.turningFace, styles.turningFaceBack, backFaceStyle]}>
                  <Pressable onPress={() => setModalArticle(incomingArticle)} style={styles.pageInner} accessibilityRole="button">
                    <Text style={styles.pageTitle} numberOfLines={5}>
                      {incomingArticle.title}
                    </Text>
                    <Text style={styles.pageSub} numberOfLines={3}>
                      {incomingLabel} · {incomingArticle.description}
                    </Text>
                  </Pressable>
                  <Animated.View pointerEvents="none" style={[styles.paperBackTint, backTintStyle]} />
                </Animated.View>
              </Animated.View>

              <Animated.View
                pointerEvents="none"
                style={[styles.spineShadow, { left: 10 + spineWidth - 6, height: pageHeight }, spineShadowStyle]}
              />

              <Animated.View
                pointerEvents="none"
                style={[styles.closedCover, { left: 10, width: innerWidth, height: pageHeight + 8 }, closedCoverStyle]}>
                <Text style={styles.coverTitle}>CONSTITUTION</Text>
                <View style={styles.coverLine} />
                <Text style={styles.coverYear}>1987</Text>
              </Animated.View>
            </View>
          </GestureDetector>
        </View>
      ) : viewMode === 'grid' ? (
        <View style={styles.gridStage}>
          <ScrollView style={styles.gridScroll} contentContainerStyle={styles.gridScrollContent} showsVerticalScrollIndicator={false}>
            <View style={styles.gridWrap}>
              {constitutionArticles.map((article, idx) => (
                <Pressable
                  key={article.id}
                  onPress={() => setGridIndex(idx)}
                  style={[styles.gridBtn, idx === gridIndex && styles.gridBtnActive]}>
                  <Text style={[styles.gridBtnLabel, idx === gridIndex && styles.gridBtnLabelActive]}>{getArticleLabel(idx, totalArticles)}</Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.gridArticlePage}>
              {panelLoading ? (
                <AppLoadingIndicator label="Loading article…" size="large" style={styles.gridArticleLoader} />
              ) : (
                <>
                  <Text style={styles.gridArticleMeta}>{gridLabel}</Text>
                  <Text style={styles.gridArticleTitle}>{gridArticle.title}</Text>
                  <Text style={styles.gridArticleSub}>{gridArticle.description}</Text>
                  <Text style={styles.gridArticleBody}>{gridArticle.content}</Text>
                </>
              )}
            </View>
          </ScrollView>
        </View>
      ) : (
        <View style={styles.infoStage}>
          <View style={styles.infoCard}>
            <Image source={profilePhoto} style={styles.infoPhoto} accessibilityLabel="Sam Charles A. Rivera" />
            <Text style={styles.infoTitle}>Incomplete Project Requirement</Text>
            <Text style={styles.infoName}>Sam Charles A. Rivera</Text>
            <Text style={styles.infoLine}>+639764106656</Text>
            <Text style={styles.infoLine}>qscrivera@tip.edu.ph</Text>
            <Text style={styles.infoLine}>BSIT</Text>
          </View>
        </View>
      )}

      <ArticleFullModal visible={viewMode === 'book' && modalArticle != null} article={modalArticle} onClose={() => setModalArticle(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0d0a08',
  },
  header: {
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#2f2721',
    backgroundColor: 'rgba(15, 11, 9, 0.96)',
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    color: '#f4ece1',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 0.25,
  },
  pageChip: {
    borderRadius: 999,
    backgroundColor: '#2b2018',
    borderWidth: 1,
    borderColor: '#5e4933',
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  pageChipText: {
    color: '#d4bc91',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.45,
  },
  modeToggle: {
    marginTop: 10,
    flexDirection: 'row',
  },
  modeBtn: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#4f3d2d',
    backgroundColor: '#1f1712',
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
  },
  modeBtnActive: {
    backgroundColor: '#4f3a2a',
    borderColor: '#7a5d40',
  },
  modeBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#b09e8c',
    letterSpacing: 0.3,
  },
  modeBtnTextActive: {
    color: '#f3e8d8',
  },
  headerSub: {
    marginTop: 8,
    color: '#a19285',
    fontSize: 11,
    fontWeight: '600',
  },
  readerStage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingVertical: 20,
  },
  book: {
    maxWidth: 440,
    width: '100%',
    borderRadius: 14,
    backgroundColor: '#221710',
    borderWidth: 2,
    borderColor: '#563f2d',
    paddingHorizontal: 10,
    paddingVertical: 9,
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 14 },
    elevation: 16,
    position: 'relative',
  },
  spread: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bookSpine: {
    width: 12,
    marginHorizontal: 0,
    borderRadius: 3,
    backgroundColor: '#130e0a',
    borderWidth: 1,
    borderColor: '#3b2a1e',
  },
  rightPageHost: {
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#ede2d1',
    borderWidth: 1,
    borderColor: '#ccb89d',
    position: 'relative',
  },
  rightPageUnder: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#e9dcc9',
  },
  turningSheet: {
    position: 'absolute',
    top: 9,
    zIndex: 6,
  },
  turningFace: {
    ...StyleSheet.absoluteFillObject,
    backfaceVisibility: 'hidden',
    backgroundColor: '#f4ecde',
  },
  turningFaceFront: {
    zIndex: 2,
  },
  turningFaceBack: {
    zIndex: 1,
  },
  pageInner: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 18,
  },
  pageTitle: {
    color: '#1c1713',
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '800',
    textAlign: 'center',
  },
  pageSub: {
    marginTop: 10,
    color: '#605549',
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '600',
    textAlign: 'center',
  },
  paperShadow: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#20160f',
  },
  paperEdgeShadow: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 28,
    backgroundColor: '#1c140e',
  },
  paperGloss: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 44,
    backgroundColor: '#fff5df',
  },
  paperBackTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#d3c4ae',
  },
  spineShadow: {
    position: 'absolute',
    top: 9,
    width: 22,
    backgroundColor: '#140f0a',
    zIndex: 5,
  },
  closedCover: {
    position: 'absolute',
    left: 0,
    top: 6,
    borderRadius: 8,
    backgroundColor: '#2a1810',
    borderWidth: 2,
    borderColor: '#916f1b',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: -4, height: 14 },
    shadowRadius: 20,
    zIndex: 9,
  },
  coverTitle: {
    color: '#ddcbad',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 3,
  },
  coverLine: {
    width: 96,
    height: 2,
    marginVertical: 12,
    backgroundColor: '#bd9025',
  },
  coverYear: {
    color: '#cba63b',
    fontSize: 34,
    fontWeight: '800',
  },
  gridStage: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  gridScroll: {
    flex: 1,
  },
  gridScrollContent: {
    paddingBottom: 18,
  },
  gridWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  gridBtn: {
    width: '31.5%',
    borderRadius: 12,
    backgroundColor: '#2a1f17',
    borderWidth: 1,
    borderColor: '#4d3a2b',
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  gridBtnActive: {
    backgroundColor: '#5a412d',
    borderColor: '#9a7348',
  },
  gridBtnLabel: {
    color: '#d8c7b2',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  gridBtnLabelActive: {
    color: '#fff4e5',
  },
  gridArticlePage: {
    marginTop: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#c8b79e',
    backgroundColor: '#f4ecde',
    paddingHorizontal: 14,
    paddingVertical: 16,
  },
  gridArticleMeta: {
    color: '#765d3c',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.45,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  gridArticleTitle: {
    color: '#1d1813',
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '800',
  },
  gridArticleSub: {
    marginTop: 8,
    color: '#615446',
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '600',
  },
  gridArticleBody: {
    marginTop: 12,
    color: '#302920',
    fontSize: 13,
    lineHeight: 21,
    fontWeight: '500',
  },
  infoStage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 18,
  },
  infoCard: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#5d4732',
    backgroundColor: '#201711',
    paddingHorizontal: 16,
    paddingVertical: 18,
    alignItems: 'center',
  },
  infoPhoto: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 14,
    borderWidth: 2,
    borderColor: '#e8c56a',
    backgroundColor: '#2a2118',
  },
  infoName: {
    alignSelf: 'stretch',
    color: '#f5e7d4',
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '800',
    marginBottom: 8,
    textAlign: 'center',
  },
  gridArticleLoader: {
    minHeight: 220,
    justifyContent: 'center',
  },
  infoTitle: {
    alignSelf: 'stretch',
    textAlign: 'center',
    color: '#f5e7d4',
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 22,
    marginBottom: 14,
  },
  infoLine: {
    alignSelf: 'stretch',
    color: '#d8c7b2',
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '600',
    marginBottom: 4,
    textAlign: 'center',
  },
});
