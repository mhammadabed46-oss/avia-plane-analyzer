import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Alert, AppState } from 'react-native';
import type { DetectionEvent, Preferences, RoundRecord, ScreenRegion, CaptureStatus } from '@/lib/models';
import { AUTO_SCAN_REGION, DEFAULT_PREFERENCES } from '@/lib/models';
import { getRoundStats } from '@/lib/analytics';
import {
  hasScreenCaptureModule,
  clearNativeCapturedRounds,
  deleteNativeCapturedRound,
  getNativeCapturedRounds,
  normalizeCaptureStatus,
  pauseNativeMonitoring,
  requestScreenCapturePermission,
  resumeNativeMonitoring,
  startNativeMonitoring,
  stopNativeMonitoring,
  subscribeToCaptureEvents,
  updateNativeRegion,
} from '@/services/screenCapture';

const RECORDS_KEY = '@avia-analyzer/rounds-v1';
const PREFERENCES_KEY = '@avia-analyzer/preferences-v1';

type AnalyzerContextValue = {
  records: RoundRecord[];
  preferences: Preferences;
  status: CaptureStatus;
  currentValue: number | null;
  message: string;
  ready: boolean;
  summary: ReturnType<typeof getRoundStats>;
  updatePreference: <K extends keyof Preferences>(key: K, value: Preferences[K]) => void;
  saveRegion: (region: ScreenRegion) => void;
  resetScanRegion: () => void;
  startMonitoring: () => Promise<void>;
  stopMonitoring: () => void;
  pauseMonitoring: () => void;
  addCorrection: (roundId: string, value: number) => void;
  deleteRound: (roundId: string) => void;
  clearHistory: () => void;
  setNotice: (notice: string) => void;
};

const AnalyzerContext = createContext<AnalyzerContextValue | null>(null);

export function AnalyzerProvider({ children }: { children: React.ReactNode }) {
  const [records, setRecords] = useState<RoundRecord[]>([]);
  const [preferences, setPreferences] = useState(DEFAULT_PREFERENCES);
  const [status, setStatus] = useState<CaptureStatus>('off');
  const [currentValue, setCurrentValue] = useState<number | null>(null);
  const [message, setMessage] = useState('');
  const [ready, setReady] = useState(false);

  const mergeNativeRounds = useCallback((pending: unknown) => {
    if (!Array.isArray(pending)) return;
    setRecords((current) => {
      const currentIds = new Set(current.map((record) => record.id));
      let nextRound = current.reduce((max, record) => Math.max(max, record.roundNumber), 0);
      const newRecords = (pending as Partial<RoundRecord>[])
        .filter((record) => {
          const isValid =
          typeof record.id === 'string' &&
          typeof record.multiplier === 'number' &&
          typeof record.confidence === 'number' &&
          typeof record.capturedAt === 'string' &&
          !currentIds.has(record.id);
          if (isValid) currentIds.add(record.id!);
          return isValid;
        })
        .sort((a, b) => Date.parse(a.capturedAt!) - Date.parse(b.capturedAt!))
        .map((record) => ({
          id: record.id!,
          roundNumber: ++nextRound,
          multiplier: record.multiplier!,
          capturedAt: record.capturedAt!,
          confidence: record.confidence!,
          corrected: false,
        }));
      return newRecords.length ? [...newRecords.reverse(), ...current] : current;
    });
  }, []);

  const syncNativeRounds = useCallback(async () => {
    try {
      const encoded = await getNativeCapturedRounds();
      const parsed: unknown = JSON.parse(encoded);
      mergeNativeRounds(parsed);
    } catch {
      setMessage('Could not read pending rounds from Android screen monitoring.');
    }
  }, [mergeNativeRounds]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [savedRecords, savedPreferences, nativeRounds] = await Promise.all([
          AsyncStorage.getItem(RECORDS_KEY),
          AsyncStorage.getItem(PREFERENCES_KEY),
          getNativeCapturedRounds(),
        ]);
        if (!alive) return;
        let restored: RoundRecord[] = [];
        if (savedRecords) {
          const parsed: unknown = JSON.parse(savedRecords);
          if (Array.isArray(parsed)) {
            restored = parsed.filter((item): item is RoundRecord =>
              item && typeof item.multiplier === 'number' &&
              typeof item.roundNumber === 'number' && typeof item.capturedAt === 'string',
            );
          }
        }
        if (savedPreferences) {
          const parsed: Partial<Preferences> = JSON.parse(savedPreferences);
          setPreferences({ ...DEFAULT_PREFERENCES, ...parsed, region: { ...DEFAULT_PREFERENCES.region, ...parsed.region } });
        }
        setRecords(restored);
        try {
          mergeNativeRounds(JSON.parse(nativeRounds));
        } catch {
          if (alive) setMessage('Could not read pending rounds from Android screen monitoring.');
        }
      } catch {
        if (alive) setMessage('Saved data could not be read. Existing results were left unchanged.');
      } finally {
        if (alive) setReady(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, [mergeNativeRounds]);

  useEffect(() => {
    if (!ready) return;
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') syncNativeRounds();
    });
    return () => subscription.remove();
  }, [ready, syncNativeRounds]);

  useEffect(() => {
    if (ready) {
      AsyncStorage.setItem(RECORDS_KEY, JSON.stringify(records)).catch(() => {
        setMessage('Could not save results to local storage.');
      });
    }
  }, [records, ready]);

  useEffect(() => {
    if (ready) AsyncStorage.setItem(PREFERENCES_KEY, JSON.stringify(preferences)).catch(() => undefined);
  }, [preferences, ready]);

  const receiveEvent = useCallback((event: DetectionEvent) => {
    if (event.kind === 'status') {
      setStatus(normalizeCaptureStatus(event.status));
      if (event.message) setMessage(event.message);
      return;
    }
    if (event.kind === 'message') {
      setMessage(event.message);
      return;
    }
    if (event.kind === 'reading') {
      setCurrentValue(event.value);
      setStatus('detecting');
      setMessage(`Reading screen · ${Math.round(event.confidence * 100)}% confidence`);
      return;
    }
    if (event.kind === 'round') {
      const capturedAt = event.capturedAt || new Date().toISOString();
      setRecords((current) => {
        const duplicate = current.some((record) =>
          (event.eventId && record.id === event.eventId) ||
          (!event.eventId && record.multiplier === event.value &&
            Math.abs(new Date(record.capturedAt).getTime() - new Date(capturedAt).getTime()) < 12_000),
        );
        if (duplicate) return current;
        const record: RoundRecord = {
          id: event.eventId || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          roundNumber: Math.max(0, ...current.map((item) => item.roundNumber)) + 1,
          multiplier: event.value,
          capturedAt,
          confidence: event.confidence,
        };
        return [record, ...current];
      });
      setCurrentValue(event.value);
      setStatus('saved');
      setMessage('New result detected and saved locally.');
    }
  }, []);

  useEffect(() => subscribeToCaptureEvents(receiveEvent), [receiveEvent]);

  const updatePreference = useCallback(
    <K extends keyof Preferences>(key: K, value: Preferences[K]) => {
      setPreferences((previous) => ({ ...previous, [key]: value }));
    },
    [],
  );

  const saveRegion = useCallback((region: ScreenRegion) => {
    setPreferences((previous) => ({ ...previous, region, calibrated: true }));
    updateNativeRegion(region).catch(() => undefined);
    setMessage('Scan area updated. Start monitoring when ready.');
  }, []);

  const resetScanRegion = useCallback(() => {
    setPreferences((previous) => ({
      ...previous,
      calibrated: false,
      region: DEFAULT_PREFERENCES.region,
    }));
    updateNativeRegion(AUTO_SCAN_REGION).catch(() => undefined);
    setMessage('Automatic scan restored. Large central multipliers will be detected.');
  }, []);

  const startMonitoring = useCallback(async () => {
    try {
      if (!hasScreenCaptureModule) {
        setStatus('error');
        setMessage('Screen monitoring permission is required in the installed Android app. This preview has no screen-capture access.');
        return;
      }
      const permitted = await new Promise<boolean>((resolve) => {
        Alert.alert(
          preferences.language === 'ar' ? 'السماح بالتقاط الشاشة؟' : 'Allow screen capture?',
          preferences.language === 'ar'
            ? preferences.calibrated
              ? 'سيقرأ التطبيق المنطقة التي حددتها أثناء تشغيل اللعبة. تتم المعالجة محلياً ولا تُحفظ اللقطات أو تُرفع.'
              : 'سيبحث التطبيق عن المضاعف الكبير الحالي قرب وسط الشاشة. تتم المعالجة محلياً ولا تُحفظ اللقطات أو تُرفع.'
            : preferences.calibrated
              ? 'The app will read your selected area while the game is open. Frames are processed on-device and are never saved or uploaded.'
              : 'The app will look for a large current multiplier near the center. Frames are processed on-device and are never saved or uploaded.',
          [
            { text: preferences.language === 'ar' ? 'إلغاء' : 'Cancel', style: 'cancel', onPress: () => resolve(false) },
            { text: preferences.language === 'ar' ? 'متابعة' : 'Continue', onPress: () => resolve(true) },
          ],
          { cancelable: false },
        );
      });
      if (!permitted) {
        setMessage('Screen monitoring was not started.');
        return;
      }
      setMessage('Requesting Android screen-capture permission…');
      const granted = await requestScreenCapturePermission();
      if (!granted) {
        setStatus('error');
        setMessage('Screen monitoring permission is required.');
        return;
      }
      await startNativeMonitoring({
        ...preferences,
        region: preferences.calibrated ? preferences.region : AUTO_SCAN_REGION,
      });
      setStatus('active');
      setMessage(preferences.calibrated
        ? 'Reading the selected area on-device.'
        : 'Scanning for a large, centered multiplier on-device.');
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Screen monitoring permission is required.');
    }
  }, [preferences]);

  const stopMonitoring = useCallback(() => {
    stopNativeMonitoring().catch(() => undefined);
    setStatus('off');
    setMessage('Screen capture stopped.');
  }, []);

  const pauseMonitoring = useCallback(() => {
    if (status === 'paused') {
      resumeNativeMonitoring().then(() => setStatus('active')).catch(() => setMessage('Could not resume screen capture.'));
      return;
    }
    pauseNativeMonitoring().then(() => setStatus('paused')).catch(() => setMessage('Could not pause screen capture.'));
  }, [status]);

  const addCorrection = useCallback((roundId: string, value: number) => {
    if (!Number.isFinite(value) || value < 1) return;
    setRecords((current) => current.map((record) =>
      record.id === roundId ? { ...record, multiplier: value, corrected: true } : record,
    ));
  }, []);

  const deleteRound = useCallback((roundId: string) => {
    setRecords((current) => current.filter((record) => record.id !== roundId));
    deleteNativeCapturedRound(roundId).catch(() => setMessage('Could not remove this item from Android capture history.'));
  }, []);

  const clearHistory = useCallback(() => {
    Alert.alert(
      preferences.language === 'ar' ? 'مسح السجل؟' : 'Clear all data?',
      preferences.language === 'ar'
        ? 'سيتم حذف جميع النتائج من هذا الجهاز نهائياً.'
        : 'This permanently removes all rounds saved on this device.',
      [
        { text: preferences.language === 'ar' ? 'إلغاء' : 'Cancel', style: 'cancel' },
        {
          text: preferences.language === 'ar' ? 'مسح' : 'Clear data',
          style: 'destructive',
          onPress: () => {
            setRecords([]);
            AsyncStorage.removeItem(RECORDS_KEY).catch(() => setMessage('Could not clear local data.'));
            clearNativeCapturedRounds().catch(() => setMessage('Could not clear Android capture history.'));
          },
        },
      ],
    );
  }, [preferences.language]);

  const setNotice = useCallback((notice: string) => setMessage(notice), []);
  const summary = useMemo(() => getRoundStats(records), [records]);
  const value = useMemo<AnalyzerContextValue>(() => ({
    records, preferences, status, currentValue, message, ready, summary,
    updatePreference, saveRegion, resetScanRegion, startMonitoring, stopMonitoring, pauseMonitoring,
    addCorrection, deleteRound, clearHistory, setNotice,
  }), [
    records, preferences, status, currentValue, message, ready, summary,
    updatePreference, saveRegion, resetScanRegion, startMonitoring, stopMonitoring, pauseMonitoring,
    addCorrection, deleteRound, clearHistory, setNotice,
  ]);

  return <AnalyzerContext.Provider value={value}>{children}</AnalyzerContext.Provider>;
}

export function useAnalyzer(): AnalyzerContextValue {
  const context = useContext(AnalyzerContext);
  if (!context) throw new Error('useAnalyzer must be used inside AnalyzerProvider.');
  return context;
}
