import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAnalyzer } from '@/context/AnalyzerContext';
import { useColors } from '@/hooks/useColors';
import { DEFAULT_PREFERENCES, type CaptureStatus, type ScreenRegion } from '@/lib/models';

function StatusDot({ status }: { status: CaptureStatus }) {
  const colors = useColors();
  const color =
    status === 'active' || status === 'detecting' || status === 'saved'
      ? colors.success
      : status === 'error'
        ? colors.destructive
        : colors.warning;
  return <View style={[styles.statusDot, { backgroundColor: color }]} />;
}

function CalibrationModal({
  visible,
  onClose,
  onSave,
  onResetAuto,
  initialRegion,
  language,
}: {
  visible: boolean;
  onClose: () => void;
  onSave: (region: ScreenRegion) => void;
  onResetAuto: () => void;
  initialRegion: ScreenRegion;
  language: 'en' | 'ar';
}) {
  const colors = useColors();
  const [region, setRegion] = useState(initialRegion);
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const [box, setBox] = useState({ width: 220, height: 360 });
  const drag = useRef({ x: 0, y: 0, region: initialRegion, move: false });
  const canvasWidth = Math.min(windowWidth - 48, 360, windowWidth * 0.42);
  const canvasHeight = canvasWidth * windowHeight / windowWidth;
  useEffect(() => {
    if (!visible) return;
    setRegion(initialRegion);
    drag.current = { x: 0, y: 0, region: initialRegion, move: false };
  }, [initialRegion, visible]);
  const responder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (event) => {
      const x = event.nativeEvent.locationX / box.width;
      const y = event.nativeEvent.locationY / box.height;
      const move =
        x >= region.left && x <= region.right &&
        y >= region.top && y <= region.bottom;
      drag.current = { x, y, region, move };
    },
    onPanResponderMove: (_event, gesture) => {
      const current = drag.current;
      const dx = gesture.dx / box.width;
      const dy = gesture.dy / box.height;
      if (current.move) {
        const width = current.region.right - current.region.left;
        const height = current.region.bottom - current.region.top;
        const left = Math.max(0, Math.min(1 - width, current.region.left + dx));
        const top = Math.max(0, Math.min(1 - height, current.region.top + dy));
        setRegion({ left, top, right: left + width, bottom: top + height });
      } else {
        const x = Math.max(0, Math.min(1, current.x + dx));
        const y = Math.max(0, Math.min(1, current.y + dy));
        const left = Math.min(current.x, x);
        const top = Math.min(current.y, y);
        const right = Math.max(current.x, x);
        const bottom = Math.max(current.y, y);
        if (right - left >= 0.06 && bottom - top >= 0.035) {
          setRegion({ left, top, right, bottom });
        }
      }
    },
  });
  const left = `${region.left * 100}%` as `${number}%`;
  const top = `${region.top * 100}%` as `${number}%`;
  const width = `${(region.right - region.left) * 100}%` as `${number}%`;
  const height = `${(region.bottom - region.top) * 100}%` as `${number}%`;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.modal, { backgroundColor: colors.background }]}>
        <View style={styles.modalHeader}>
          <Text style={[styles.modalTitle, { color: colors.foreground }]}>
            {language === 'ar' ? 'ضبط منطقة المسح' : 'Adjust scan area'}
          </Text>
          <Pressable onPress={onClose} hitSlop={12} accessibilityLabel="Close calibration">
            <Feather name="x" size={23} color={colors.mutedForeground} />
          </Pressable>
        </View>
        <Text style={[styles.modalCopy, { color: colors.mutedForeground }]}>
          {language === 'ar'
            ? 'يبحث المسح التلقائي عن المضاعف الكبير في وسط الشاشة. ارسم منطقة هنا فقط إذا كان موضع المضاعف مختلفاً في لعبتك.'
            : 'Automatic scanning looks for the large multiplier near the screen center. Draw an area here only if a game places its multiplier elsewhere.'}
        </Text>
        <View
          style={[styles.calibrationCanvas, { width: canvasWidth, height: canvasHeight, borderColor: colors.border, backgroundColor: colors.card }]}
          onLayout={(event) => setBox({ width: event.nativeEvent.layout.width, height: event.nativeEvent.layout.height })}
          {...responder.panHandlers}
        >
          <View style={styles.calibrationGrid} pointerEvents="none">
            {[1, 2, 3].map((item) => (
              <View key={`v${item}`} style={[styles.gridVertical, { left: `${item * 25}%`, borderColor: colors.border }]} />
            ))}
            {[1, 2, 3, 4].map((item) => (
              <View key={`h${item}`} style={[styles.gridHorizontal, { top: `${item * 20}%`, borderColor: colors.border }]} />
            ))}
          </View>
          <View style={[styles.selectionFrame, { left, top, width, height, borderColor: colors.primary, backgroundColor: colors.primarySoft }]} />
          <View style={styles.targetHint}>
            <Feather name="move" size={15} color={colors.mutedForeground} />
            <Text style={{ color: colors.mutedForeground, fontSize: 11, marginLeft: 5 }}>
              {language === 'ar' ? 'حرّك الإطار أو ارسمه' : 'Move the box or draw a new area'}
            </Text>
          </View>
        </View>
        <View style={[styles.privacyNote, { backgroundColor: colors.card }]}>
          <Feather name="lock" size={16} color={colors.primary} />
          <Text style={[styles.privacyCopy, { color: colors.mutedForeground }]}>
            {language === 'ar'
              ? 'تظل اللقطات على جهازك ولا يتم حفظها.'
              : 'Frames stay on your device and are not stored.'}
          </Text>
        </View>
        <Pressable
          onPress={() => {
            onSave(region);
            onClose();
          }}
          style={({ pressed }) => [styles.primaryButton, { backgroundColor: colors.primary, opacity: pressed ? 0.86 : 1 }]}
          accessibilityRole="button"
        >
          <Feather name="check" size={18} color={colors.primaryForeground} />
          <Text style={[styles.primaryButtonText, { color: colors.primaryForeground }]}>
            {language === 'ar' ? 'استخدام المنطقة المحددة' : 'Use selected area'}
          </Text>
        </Pressable>
        <Pressable
          onPress={() => {
            onResetAuto();
            onClose();
          }}
          style={({ pressed }) => [styles.resetButton, { borderColor: colors.border, opacity: pressed ? 0.72 : 1 }]}
        >
          <Feather name="rotate-ccw" size={15} color={colors.mutedForeground} />
          <Text style={[styles.resetButtonText, { color: colors.mutedForeground }]}>
            {language === 'ar' ? 'العودة إلى المسح التلقائي' : 'Use automatic scan'}
          </Text>
        </Pressable>
      </View>
    </Modal>
  );
}

function Metric({ label, value, colors }: { label: string; value: string; colors: ReturnType<typeof useColors> }) {
  return (
    <View style={styles.metric}>
      <Text style={[styles.metricValue, { color: colors.foreground }]}>{value}</Text>
      <Text style={[styles.metricLabel, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );
}

export default function MonitorScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const {
    records,
    status,
    currentValue,
    message,
    preferences,
    summary,
    startMonitoring,
    stopMonitoring,
    pauseMonitoring,
    saveRegion,
    resetScanRegion,
  } = useAnalyzer();
  const [calibrationOpen, setCalibrationOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const latest = records[0];
  const running = status === 'active' || status === 'detecting' || status === 'waiting';
  const labels =
    preferences.language === 'ar'
      ? { title: 'محلّل Avia', subtitle: 'إحصاءات تاريخية فقط', start: 'بدء المراقبة', stop: 'إيقاف المراقبة', pause: 'إيقاف مؤقت', resume: 'متابعة', calibrate: 'ضبط منطقة المسح', monitor: 'المراقبة', current: 'القيمة الحالية', last: 'آخر جولة مكتملة', rounds: 'الجولات المسجلة', waiting: 'بانتظار الجولة التالية', noResult: 'لم يتم رصد مضاعف بعد', nativeRequired: 'يلزم تثبيت إصدار Android للوصول إلى التقاط الشاشة.' }
      : { title: 'Avia Analyzer', subtitle: 'Historical analysis only', start: 'Start monitoring', stop: 'Stop monitoring', pause: 'Pause', resume: 'Resume', calibrate: 'Adjust scan area', monitor: 'Monitoring', current: 'Current reading', last: 'Last completed round', rounds: 'Rounds recorded', waiting: 'Waiting for next round', noResult: 'No multiplier detected yet', nativeRequired: 'An Android app build is required for screen capture.' };

  const handleStart = async () => {
    setBusy(true);
    await startMonitoring();
    setBusy(false);
  };

  const handleStop = () => {
    Alert.alert(
      preferences.language === 'ar' ? 'إيقاف المراقبة؟' : 'Stop monitoring?',
      preferences.language === 'ar'
        ? 'سيتم إيقاف التقاط الشاشة فوراً.'
        : 'Screen capture will stop immediately.',
      [
        { text: preferences.language === 'ar' ? 'إلغاء' : 'Cancel', style: 'cancel' },
        { text: preferences.language === 'ar' ? 'إيقاف' : 'Stop', style: 'destructive', onPress: stopMonitoring },
      ],
    );
  };

  const statusText =
    status === 'off'
      ? preferences.language === 'ar' ? 'متوقف' : 'Off'
      : status === 'paused'
        ? preferences.language === 'ar' ? 'متوقف مؤقتاً' : 'Paused'
        : status === 'error'
          ? preferences.language === 'ar' ? 'تعذّر الالتقاط' : 'Capture issue'
          : status === 'saved'
            ? preferences.language === 'ar' ? 'تم حفظ النتيجة' : 'Result saved'
            : status === 'detecting'
              ? preferences.language === 'ar' ? 'جارٍ التعرّف' : 'Detecting'
              : preferences.language === 'ar' ? 'بانتظار القراءة' : 'Reading screen';

  return (
    <>
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={[styles.page, { paddingBottom: Math.max(insets.bottom, 20) + 100, direction: preferences.language === 'ar' ? 'rtl' : 'ltr' }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topLine}>
          <View>
            <Text style={[styles.brand, { color: colors.foreground }]}>{labels.title}</Text>
            <Text style={[styles.brandSub, { color: colors.mutedForeground }]}>{labels.subtitle}</Text>
          </View>
          <View style={[styles.statusChip, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <StatusDot status={status} />
            <Text style={[styles.statusText, { color: colors.foreground }]}>{statusText}</Text>
          </View>
        </View>

        <LinearGradient
          colors={[colors.heroTop, colors.heroBottom]}
          start={{ x: 0.05, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <View style={styles.heroTop}>
            <View style={styles.liveMark}>
              <View style={[styles.liveRing, { borderColor: colors.primarySoft }]} />
              <View style={[styles.liveCore, { backgroundColor: colors.primary }]} />
            </View>
            <Text style={styles.heroLabel}>{labels.current.toUpperCase()}</Text>
          </View>
          <View style={styles.valueRow}>
            <Text style={styles.heroValue}>{currentValue ? currentValue.toFixed(2) : '—'}</Text>
            <Text style={styles.heroX}>×</Text>
          </View>
          <Text style={styles.heroHint}>
            {message || (running ? labels.waiting : labels.noResult)}
          </Text>
          {latest ? (
            <View style={styles.lastResult}>
              <Text style={styles.lastLabel}>{labels.last.toUpperCase()}</Text>
              <Text style={styles.lastValue}>{latest.multiplier.toFixed(2)}×</Text>
            </View>
          ) : null}
          <View style={[styles.waveLine, { backgroundColor: colors.primary }]} />
        </LinearGradient>

        <View style={[styles.summary, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Metric label={labels.rounds} value={String(records.length)} colors={colors} />
          <View style={[styles.metricDivider, { backgroundColor: colors.border }]} />
          <Metric label={preferences.language === 'ar' ? 'المتوسط' : 'Average'} value={records.length ? `${summary.average.toFixed(2)}×` : '—'} colors={colors} />
          <View style={[styles.metricDivider, { backgroundColor: colors.border }]} />
          <Metric label={preferences.language === 'ar' ? 'أعلى نتيجة' : 'Best recorded'} value={records.length ? `${summary.maximum.toFixed(2)}×` : '—'} colors={colors} />
        </View>

        <View style={styles.sectionHeading}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{labels.monitor}</Text>
          <Pressable onPress={() => setCalibrationOpen(true)} style={styles.textAction}>
            <Feather name="crosshair" size={15} color={colors.primary} />
            <Text style={[styles.textActionLabel, { color: colors.primary }]}>{labels.calibrate}</Text>
          </Pressable>
        </View>

        <View style={[styles.controlsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.controlHeading}>
            <View style={[styles.controlIcon, { backgroundColor: colors.primarySoft }]}>
              <Feather name="monitor" size={18} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.controlTitle, { color: colors.foreground }]}>
                {preferences.language === 'ar' ? 'التقاط الشاشة' : 'Screen monitoring'}
              </Text>
              <Text style={[styles.controlDescription, { color: colors.mutedForeground }]}>
                {preferences.language === 'ar'
                  ? preferences.calibrated ? 'منطقة محددة يدوياً · معالجة محلية' : 'اكتشاف تلقائي للمضاعف الكبير في الوسط'
                  : preferences.calibrated ? 'Manual area · on-device processing' : 'Auto-detects large, centered multipliers'}
              </Text>
            </View>
            <StatusDot status={status} />
          </View>
          <View style={[styles.rule, { backgroundColor: colors.border }]} />
          <Text style={[styles.notice, { color: status === 'error' ? colors.destructive : colors.mutedForeground }]}>
            {message || (Platform.OS === 'android' ? labels.nativeRequired : 'Screen capture is available in the Android app build, not this preview.')}
          </Text>
          <View style={styles.actionRow}>
            {running || status === 'paused' ? (
              <>
                <Pressable
                  onPress={() => status === 'paused' ? startMonitoring() : pauseMonitoring()}
                  style={({ pressed }) => [styles.secondaryButton, { borderColor: colors.border, opacity: pressed ? 0.75 : 1 }]}
                >
                  <Feather name={status === 'paused' ? 'play' : 'pause'} size={16} color={colors.foreground} />
                  <Text style={[styles.secondaryButtonText, { color: colors.foreground }]}>{status === 'paused' ? labels.resume : labels.pause}</Text>
                </Pressable>
                <Pressable onPress={handleStop} style={({ pressed }) => [styles.stopButton, { backgroundColor: colors.destructive, opacity: pressed ? 0.84 : 1 }]}>
                  <Feather name="square" size={15} color={colors.destructiveForeground} />
                  <Text style={[styles.primaryButtonText, { color: colors.destructiveForeground }]}>{labels.stop}</Text>
                </Pressable>
              </>
            ) : (
              <Pressable
                onPress={handleStart}
                disabled={busy}
                style={({ pressed }) => [styles.primaryButton, styles.fullButton, { backgroundColor: colors.primary, opacity: pressed || busy ? 0.84 : 1 }]}
              >
                {busy ? <ActivityIndicator color={colors.primaryForeground} /> : <Feather name="play" size={17} color={colors.primaryForeground} />}
                <Text style={[styles.primaryButtonText, { color: colors.primaryForeground }]}>{labels.start}</Text>
              </Pressable>
            )}
          </View>
        </View>

        <View style={[styles.disclaimer, { borderColor: colors.border }]}>
          <Feather name="info" size={16} color={colors.warning} />
          <Text style={[styles.disclaimerCopy, { color: colors.mutedForeground }]}>
            {preferences.language === 'ar'
              ? 'تعرض هذه الأداة بيانات تاريخية فقط. لا تتنبأ بالنتائج ولا تضمن الربح.'
              : 'Historical data only. This app does not predict outcomes, guarantee profit, or place bets.'}
          </Text>
        </View>
      </ScrollView>
      <CalibrationModal
        visible={calibrationOpen}
        onClose={() => setCalibrationOpen(false)}
        onSave={saveRegion}
        onResetAuto={resetScanRegion}
        initialRegion={preferences.calibrated ? preferences.region : DEFAULT_PREFERENCES.region}
        language={preferences.language}
      />
    </>
  );
}

const styles = StyleSheet.create({
  page: { paddingHorizontal: 20, paddingTop: Platform.OS === 'web' ? 67 : 16, gap: 18 },
  topLine: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brand: { fontSize: 23, fontWeight: '700', letterSpacing: -0.45 },
  brandSub: { fontSize: 12, marginTop: 4, letterSpacing: 0.15 },
  statusChip: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 10, paddingVertical: 7, borderWidth: 1, borderRadius: 20 },
  statusDot: { width: 7, height: 7, borderRadius: 5 },
  statusText: { fontSize: 11, fontWeight: '600' },
  hero: { minHeight: 238, borderRadius: 25, overflow: 'hidden', padding: 20, justifyContent: 'space-between' },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  liveMark: { width: 18, height: 18, alignItems: 'center', justifyContent: 'center' },
  liveRing: { width: 17, height: 17, borderRadius: 10, borderWidth: 1, position: 'absolute' },
  liveCore: { width: 6, height: 6, borderRadius: 4 },
  heroLabel: { color: '#91AAC1', fontSize: 10, fontWeight: '700', letterSpacing: 1.25 },
  valueRow: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 10 },
  heroValue: { fontSize: 62, lineHeight: 70, fontWeight: '700', color: '#F3F7FB', letterSpacing: -3 },
  heroX: { fontSize: 27, lineHeight: 37, color: '#9FB4C8', marginLeft: 7, marginTop: 9 },
  heroHint: { fontSize: 12, color: '#A8BACB', marginTop: -1 },
  lastResult: { alignItems: 'flex-end', position: 'absolute', right: 21, bottom: 37 },
  lastLabel: { color: '#8FA5BA', fontSize: 8, letterSpacing: 1, fontWeight: '700' },
  lastValue: { color: '#EAF3FA', fontSize: 19, fontWeight: '700', marginTop: 6 },
  waveLine: { position: 'absolute', left: -15, bottom: -21, width: 190, height: 2, opacity: 0.5, transform: [{ rotate: '-12deg' }] },
  summary: { flexDirection: 'row', borderWidth: 1, borderRadius: 18, paddingVertical: 15, paddingHorizontal: 8, alignItems: 'center' },
  metric: { flex: 1, alignItems: 'center', gap: 5 },
  metricValue: { fontSize: 17, fontWeight: '700', letterSpacing: -0.5 },
  metricLabel: { fontSize: 10, textAlign: 'center' },
  metricDivider: { width: 1, height: 31 },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: -8 },
  sectionTitle: { fontSize: 17, fontWeight: '700' },
  textAction: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 6 },
  textActionLabel: { fontSize: 12, fontWeight: '600' },
  controlsCard: { borderWidth: 1, borderRadius: 18, padding: 16 },
  controlHeading: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  controlIcon: { width: 37, height: 37, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  controlTitle: { fontSize: 14, fontWeight: '600' },
  controlDescription: { fontSize: 11, marginTop: 3 },
  rule: { height: 1, marginVertical: 14 },
  notice: { fontSize: 12, lineHeight: 18, minHeight: 36 },
  actionRow: { flexDirection: 'row', gap: 9, marginTop: 13 },
  primaryButton: { minHeight: 46, borderRadius: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, paddingHorizontal: 16 },
  primaryButtonText: { fontSize: 13, fontWeight: '700' },
  fullButton: { flex: 1 },
  stopButton: { flex: 1, minHeight: 46, borderRadius: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  secondaryButton: { flex: 1, minHeight: 46, borderRadius: 13, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  secondaryButtonText: { fontSize: 13, fontWeight: '600' },
  disclaimer: { flexDirection: 'row', gap: 9, borderWidth: 1, borderRadius: 14, padding: 13, alignItems: 'flex-start' },
  disclaimerCopy: { flex: 1, fontSize: 11, lineHeight: 16 },
  modal: { flex: 1, padding: 22, paddingTop: Platform.OS === 'web' ? 67 : 22 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  modalTitle: { fontSize: 21, fontWeight: '700', letterSpacing: -0.4 },
  modalCopy: { marginTop: 11, fontSize: 13, lineHeight: 19 },
  calibrationCanvas: { alignSelf: 'center', marginTop: 20, borderWidth: 1, borderRadius: 18, overflow: 'hidden', position: 'relative' },
  calibrationGrid: { ...StyleSheet.absoluteFill },
  gridVertical: { width: 1, height: '100%', position: 'absolute', borderLeftWidth: 1, borderStyle: 'dashed' },
  gridHorizontal: { width: '100%', height: 1, position: 'absolute', borderTopWidth: 1, borderStyle: 'dashed' },
  selectionFrame: { position: 'absolute', borderWidth: 2, borderRadius: 8 },
  targetHint: { position: 'absolute', bottom: 12, alignSelf: 'center', flexDirection: 'row', alignItems: 'center' },
  privacyNote: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 12, marginTop: 22 },
  privacyCopy: { fontSize: 11, lineHeight: 16, flex: 1 },
  resetButton: { minHeight: 42, borderWidth: 1, borderRadius: 12, marginTop: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  resetButtonText: { fontSize: 12, fontWeight: '600' },
});
