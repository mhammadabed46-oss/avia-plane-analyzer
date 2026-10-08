import { Platform } from 'react-native';
import { requireNativeModule } from 'expo-modules-core';
import type { CaptureStatus, DetectionEvent, Preferences, ScreenRegion } from '@/lib/models';

type NativeScreenReader = {
  addListener(
    eventName: 'onCaptureEvent',
    listener: (event: DetectionEvent) => void,
  ): { remove(): void };
  requestScreenCapturePermission(): Promise<boolean>;
  startMonitoring(
    region: ScreenRegion,
    samplingIntervalMs: number,
    minimumConfidence: number,
  ): Promise<void>;
  pauseMonitoring(): Promise<void>;
  resumeMonitoring(): Promise<void>;
  stopMonitoring(): Promise<void>;
  updateRegion(region: ScreenRegion): Promise<void>;
  getCapturedRounds(): Promise<string>;
  clearCapturedRounds(): Promise<void>;
  deleteCapturedRound(id: string): Promise<void>;
};

let nativeModule: NativeScreenReader | null = null;

if (Platform.OS === 'android') {
  try {
    nativeModule = requireNativeModule<NativeScreenReader>('AviaScreenReader');
  } catch {
    // Expo Go and web do not contain this custom Android module.
  }
}

export const hasScreenCaptureModule = Boolean(nativeModule);

export function subscribeToCaptureEvents(listener: (event: DetectionEvent) => void): () => void {
  if (!nativeModule) return () => undefined;
  const subscription = nativeModule.addListener('onCaptureEvent', listener);
  return () => subscription.remove();
}

export async function requestScreenCapturePermission(): Promise<boolean> {
  if (!nativeModule) throw new Error('Screen capture requires the Android app build.');
  return nativeModule.requestScreenCapturePermission();
}

export async function startNativeMonitoring(preferences: Preferences): Promise<void> {
  if (!nativeModule) throw new Error('Screen capture requires the Android app build.');
  await nativeModule.startMonitoring(
    preferences.region,
    preferences.samplingIntervalMs,
    preferences.minimumConfidence,
  );
}

export async function pauseNativeMonitoring(): Promise<void> {
  if (!nativeModule) throw new Error('Screen capture requires the Android app build.');
  await nativeModule.pauseMonitoring();
}

export async function resumeNativeMonitoring(): Promise<void> {
  if (!nativeModule) throw new Error('Screen capture requires the Android app build.');
  await nativeModule.resumeMonitoring();
}

export async function stopNativeMonitoring(): Promise<void> {
  if (!nativeModule) return;
  await nativeModule.stopMonitoring();
}

export async function updateNativeRegion(region: ScreenRegion): Promise<void> {
  if (nativeModule) await nativeModule.updateRegion(region);
}

export async function getNativeCapturedRounds(): Promise<string> {
  if (!nativeModule) return '[]';
  return nativeModule.getCapturedRounds();
}

export async function clearNativeCapturedRounds(): Promise<void> {
  if (nativeModule) await nativeModule.clearCapturedRounds();
}

export async function deleteNativeCapturedRound(id: string): Promise<void> {
  if (nativeModule) await nativeModule.deleteCapturedRound(id);
}

export function normalizeCaptureStatus(status: string): CaptureStatus {
  const valid: CaptureStatus[] = ['off', 'paused', 'active', 'waiting', 'detecting', 'saved', 'error'];
  return valid.includes(status as CaptureStatus) ? (status as CaptureStatus) : 'error';
}
