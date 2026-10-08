import { useMemo, useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, Pressable, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAnalyzer } from '@/context/AnalyzerContext';
import {
  analyzeRecent,
  CATEGORY_LABELS,
  getCategoryCounts,
  getCurrentStreak,
  getDataQuality,
  getLongestStreak,
  getPattern,
} from '@/lib/analytics';
import { translate } from '@/lib/translations';
import { useColors } from '@/hooks/useColors';

const WINDOW_OPTIONS = [10, 20, 50, 100, 0] as const;

function StatTile({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={styles.statTile}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={[styles.statLabel, { color, opacity: 0.7 }]}>{label}</Text>
    </View>
  );
}

export default function AnalyticsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { records, preferences } = useAnalyzer();
  const language = preferences.language;
  const t = (key: Parameters<typeof translate>[1]) => translate(language, key);
  const [windowSize, setWindowSize] = useState<number>(20);
  const windowRecords = windowSize === 0 ? records : records.slice(0, windowSize);
  const recent = useMemo(() => analyzeRecent(records, windowSize || Math.max(records.length, 1)), [records, windowSize]);
  const buckets = useMemo(() => getCategoryCounts(records), [records]);
  const maxBucket = Math.max(1, ...buckets);
  const quality = getDataQuality(records.length);
  const pattern = getPattern(records);
  const categoryLabels = language === 'ar'
    ? ['أقل من ١٫٢٠×', '١٫٢٠–١٫٤٩×', '١٫٥٠–١٫٩٩×', '٢٫٠٠–٢٫٩٩×', '٣٫٠٠–٤٫٩٩×', '٥٫٠٠–٩٫٩٩×', '١٠× فأكثر']
    : CATEGORY_LABELS;
  const qualityLabels = language === 'ar'
    ? ['عينة غير كافية', 'عينة محدودة', 'عينة متوسطة', 'سجل تاريخي كبير']
    : ['Insufficient sample', 'Limited sample', 'Moderate sample', 'Large historical sample'];
  const patternLabel = language === 'ar'
    ? { LOW: 'منخفض', NORMAL: 'طبيعي', HIGH: 'مرتفع' }[pattern]
    : pattern;
  const qualityLabel = qualityLabels[quality.tier];

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={[styles.page, { paddingBottom: Math.max(30, insets.bottom) + 80, direction: language === 'ar' ? 'rtl' : 'ltr' }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: colors.foreground }]}>{t('analytics')}</Text>
          <Text style={[styles.subTitle, { color: colors.mutedForeground }]}>{t('sample')} · {records.length}</Text>
        </View>
        <View style={[styles.headerIcon, { backgroundColor: colors.primarySoft }]}>
          <Feather name="bar-chart-2" size={20} color={colors.primary} />
        </View>
      </View>

      <View style={[styles.qualityCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[styles.qualityIcon, { backgroundColor: colors.primarySoft }]}>
          <Feather name="database" size={17} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.eyebrow, { color: colors.mutedForeground }]}>{t('sample').toUpperCase()}</Text>
          <Text style={[styles.qualityValue, { color: colors.foreground }]}>{qualityLabel}</Text>
        </View>
        <View style={styles.tiers}>
          {[0, 1, 2, 3].map((tier) => (
            <View key={tier} style={[styles.tier, { backgroundColor: tier <= quality.tier ? colors.primary : colors.border }]} />
          ))}
        </View>
      </View>

      {preferences.patternIndicator ? (
        <View style={[styles.patternCard, { backgroundColor: colors.heroTop }]}>
          <View style={styles.patternTop}>
            <View style={styles.patternGlyph}><Feather name="activity" size={15} color={colors.primary} /></View>
            <Text style={styles.patternKicker}>{t('historicalPattern').toUpperCase()}</Text>
          </View>
          <Text style={[styles.patternValue, { color: colors.primary }]}>{patternLabel}</Text>
          <Text style={styles.patternDisclaimer}>{t('notPrediction')}</Text>
        </View>
      ) : null}

      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.cardHeading}>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>{t('distribution')}</Text>
          <Text style={[styles.countLabel, { color: colors.mutedForeground }]}>{records.length} {t('rounds').toLowerCase()}</Text>
        </View>
        {categoryLabels.map((label, index) => {
          const count = buckets[index];
          const percent = records.length ? (count / records.length) * 100 : 0;
          return (
            <View key={label} style={styles.bucketRow}>
              <View style={styles.bucketLabelRow}>
                <Text style={[styles.bucketLabel, { color: colors.mutedForeground }]}>{label}</Text>
                <Text style={[styles.bucketCount, { color: colors.foreground }]}>{count} · {percent.toFixed(0)}%</Text>
              </View>
              <View style={[styles.track, { backgroundColor: colors.muted }]}>
                <View style={[styles.fill, { backgroundColor: colors.primary, width: `${Math.max(count ? 2 : 0, (count / maxBucket) * 100)}%` }]} />
              </View>
            </View>
          );
        })}
      </View>

      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.cardHeading}>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>{t('recent')}</Text>
          <Text style={[styles.countLabel, { color: colors.mutedForeground }]}>{windowRecords.length} {t('rounds').toLowerCase()}</Text>
        </View>
        <View style={[styles.windowSelector, { backgroundColor: colors.muted }]}>
          {WINDOW_OPTIONS.map((option) => {
            const selected = option === windowSize;
            return (
              <Pressable
                key={option}
                onPress={() => setWindowSize(option)}
                style={[styles.windowButton, selected && { backgroundColor: colors.card }]}
                accessibilityRole="button"
                accessibilityState={{ selected }}
              >
                <Text style={[styles.windowText, { color: selected ? colors.foreground : colors.mutedForeground }]}>
                  {option === 0 ? (language === 'ar' ? 'الكل' : 'All') : option}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <View style={styles.statGrid}>
          <StatTile label={t('average')} value={recent.count ? `${recent.average.toFixed(2)}×` : '—'} color={colors.foreground} />
          <StatTile label={t('median')} value={recent.count ? `${recent.median.toFixed(2)}×` : '—'} color={colors.foreground} />
          <StatTile label={t('minimum')} value={recent.count ? `${recent.minimum.toFixed(2)}×` : '—'} color={colors.foreground} />
          <StatTile label={t('maximum')} value={recent.count ? `${recent.maximum.toFixed(2)}×` : '—'} color={colors.foreground} />
        </View>
        <View style={[styles.percentRow, { borderTopColor: colors.border }]}>
          <View><Text style={[styles.percentValue, { color: colors.foreground }]}>{recent.count ? `${recent.belowTwoPercent.toFixed(0)}%` : '—'}</Text><Text style={[styles.percentLabel, { color: colors.mutedForeground }]}>{t('below2')}</Text></View>
          <View><Text style={[styles.percentValue, { color: colors.foreground }]}>{recent.count ? `${recent.aboveTwoPercent.toFixed(0)}%` : '—'}</Text><Text style={[styles.percentLabel, { color: colors.mutedForeground }]}>{t('above2')}</Text></View>
          <View><Text style={[styles.percentValue, { color: colors.foreground }]}>{recent.count ? `${recent.aboveFivePercent.toFixed(0)}%` : '—'}</Text><Text style={[styles.percentLabel, { color: colors.mutedForeground }]}>{t('above5')}</Text></View>
        </View>
      </View>

      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.cardHeading}>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>{t('sequence')}</Text>
          <Feather name="repeat" size={17} color={colors.primary} />
        </View>
        <View style={styles.sequenceGrid}>
          <StatTile label={t('currentBelow')} value={`${getCurrentStreak(records, false)}`} color={colors.foreground} />
          <StatTile label={t('longestBelow')} value={`${getLongestStreak(records, false)}`} color={colors.foreground} />
          <StatTile label={t('currentAbove')} value={`${getCurrentStreak(records, true)}`} color={colors.foreground} />
          <StatTile label={t('longestAbove')} value={`${getLongestStreak(records, true)}`} color={colors.foreground} />
        </View>
        <View style={[styles.sequenceNote, { backgroundColor: colors.primarySoft }]}>
          <Feather name="info" size={14} color={colors.primary} />
          <Text style={[styles.sequenceDisclaimer, { color: colors.foreground }]}>{t('sequenceDisclaimer')}</Text>
        </View>
      </View>
      <Text style={[styles.volatility, { color: colors.mutedForeground }]}>
        {t('volatility')}: {recent.count ? `±${recent.volatility.toFixed(2)}×` : '—'}
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { paddingHorizontal: 20, paddingTop: Platform.OS === 'web' ? 67 : 18, gap: 16 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 },
  title: { fontSize: 24, fontWeight: '700', letterSpacing: -0.5 },
  subTitle: { fontSize: 12, marginTop: 5 },
  headerIcon: { height: 42, width: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  qualityCard: { borderRadius: 17, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 11, padding: 14 },
  qualityIcon: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 12 },
  eyebrow: { fontSize: 8, letterSpacing: 1, fontWeight: '700' },
  qualityValue: { fontSize: 13, fontWeight: '700', marginTop: 4 },
  tiers: { flexDirection: 'row', gap: 4 },
  tier: { width: 6, height: 18, borderRadius: 4 },
  patternCard: { borderRadius: 18, padding: 16 },
  patternTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  patternGlyph: { width: 27, height: 27, borderRadius: 9, backgroundColor: '#1A3443', alignItems: 'center', justifyContent: 'center' },
  patternKicker: { fontSize: 9, color: '#96ABBC', fontWeight: '700', letterSpacing: 1.15 },
  patternValue: { fontSize: 26, fontWeight: '700', marginTop: 11 },
  patternDisclaimer: { fontSize: 11, color: '#AABBC9', marginTop: 4, lineHeight: 16 },
  card: { borderWidth: 1, borderRadius: 18, padding: 15, gap: 12 },
  cardHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardTitle: { fontSize: 14, fontWeight: '700' },
  countLabel: { fontSize: 10 },
  bucketRow: { gap: 6 },
  bucketLabelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  bucketLabel: { fontSize: 10 },
  bucketCount: { fontSize: 10, fontWeight: '600' },
  track: { height: 5, borderRadius: 5, overflow: 'hidden' },
  fill: { height: 5, borderRadius: 5 },
  windowSelector: { padding: 4, borderRadius: 11, flexDirection: 'row', gap: 3 },
  windowButton: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 30, borderRadius: 8 },
  windowText: { fontSize: 10, fontWeight: '600' },
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 14 },
  sequenceGrid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 15 },
  statTile: { width: '50%', gap: 4, paddingRight: 4 },
  statValue: { fontSize: 18, fontWeight: '700' },
  statLabel: { fontSize: 10, lineHeight: 14 },
  percentRow: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 12, borderTopWidth: 1 },
  percentValue: { fontSize: 13, fontWeight: '700' },
  percentLabel: { fontSize: 9, marginTop: 4 },
  sequenceNote: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, padding: 10, borderRadius: 11 },
  sequenceDisclaimer: { flex: 1, fontSize: 10, lineHeight: 15 },
  volatility: { fontSize: 11, textAlign: 'center', marginTop: -4 },
});
