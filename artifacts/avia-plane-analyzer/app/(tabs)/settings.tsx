import { Platform, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAnalyzer } from '@/context/AnalyzerContext';
import { translate } from '@/lib/translations';
import { useColors } from '@/hooks/useColors';
import type { ThemePreference } from '@/lib/models';

function SettingSection({ title, icon, children }: { title: string; icon: React.ComponentProps<typeof Feather>['name']; children: React.ReactNode }) {
  const colors = useColors();
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeading}>
        <Feather name={icon} size={15} color={colors.primary} />
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>{title.toUpperCase()}</Text>
      </View>
      <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>{children}</View>
    </View>
  );
}

function ChoiceRow({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  const colors = useColors();
  return (
    <Pressable onPress={onPress} style={styles.choiceRow} accessibilityRole="radio" accessibilityState={{ selected }}>
      <Text style={[styles.choiceLabel, { color: colors.foreground }]}>{label}</Text>
      <View style={[styles.radio, { borderColor: selected ? colors.primary : colors.border }]}>
        {selected ? <View style={[styles.radioInner, { backgroundColor: colors.primary }]} /> : null}
      </View>
    </Pressable>
  );
}

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { preferences, updatePreference, stopMonitoring } = useAnalyzer();
  const t = (key: Parameters<typeof translate>[1]) => translate(preferences.language, key);
  const setTheme = (theme: ThemePreference) => updatePreference('theme', theme);
  const languages = [
    { key: 'en' as const, label: 'English', sub: 'LTR' },
    { key: 'ar' as const, label: 'العربية', sub: 'RTL' },
  ];

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={[styles.page, { paddingBottom: Math.max(26, insets.bottom) + 90, direction: preferences.language === 'ar' ? 'rtl' : 'ltr' }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: colors.foreground }]}>{t('settingsTitle')}</Text>
          <Text style={[styles.subTitle, { color: colors.mutedForeground }]}>Avia Plane Screen Analyzer</Text>
        </View>
        <View style={[styles.headerIcon, { backgroundColor: colors.primarySoft }]}><Feather name="sliders" size={19} color={colors.primary} /></View>
      </View>

      <SettingSection title={t('language')} icon="globe">
        {languages.map((item, index) => (
          <View key={item.key}>
            {index > 0 ? <View style={[styles.divider, { backgroundColor: colors.border }]} /> : null}
            <ChoiceRow label={item.label} selected={preferences.language === item.key} onPress={() => updatePreference('language', item.key)} />
          </View>
        ))}
      </SettingSection>

      <SettingSection title={t('appearance')} icon="sun">
        {(['system', 'light', 'dark'] as const).map((item, index) => (
          <View key={item}>
            {index > 0 ? <View style={[styles.divider, { backgroundColor: colors.border }]} /> : null}
            <ChoiceRow label={t(item)} selected={preferences.theme === item} onPress={() => setTheme(item)} />
          </View>
        ))}
      </SettingSection>

      <SettingSection title={t('historicalPattern')} icon="activity">
        <View style={styles.preferenceRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.preferenceTitle, { color: colors.foreground }]}>{t('patternIndicator')}</Text>
            <Text style={[styles.preferenceCopy, { color: colors.mutedForeground }]}>{t('notPrediction')}</Text>
          </View>
          <Switch
            value={preferences.patternIndicator}
            onValueChange={(value) => updatePreference('patternIndicator', value)}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor={colors.card}
            accessibilityLabel={t('patternIndicator')}
          />
        </View>
      </SettingSection>

      <SettingSection title={t('privacy')} icon="lock">
        <View style={styles.privacyRow}>
          <View style={[styles.privacyIcon, { backgroundColor: colors.primarySoft }]}><Feather name="smartphone" size={17} color={colors.primary} /></View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.preferenceTitle, { color: colors.foreground }]}>{t('permission')}</Text>
            <Text style={[styles.preferenceCopy, { color: colors.mutedForeground }]}>{t('permissionBody')}</Text>
          </View>
        </View>
        <View style={[styles.divider, { backgroundColor: colors.border, marginVertical: 13 }]} />
        <Text style={[styles.privacyCopy, { color: colors.mutedForeground }]}>{t('privacyBody')}</Text>
        <Pressable onPress={stopMonitoring} style={[styles.stopCapture, { borderColor: colors.border }]}>
          <Feather name="square" size={14} color={colors.destructive} />
          <Text style={[styles.stopCaptureText, { color: colors.destructive }]}>{preferences.language === 'ar' ? 'إيقاف الالتقاط الآن' : 'Stop screen capture now'}</Text>
        </Pressable>
      </SettingSection>

      <View style={[styles.disclaimer, { backgroundColor: colors.warningSoft }]}>
        <Feather name="alert-circle" size={16} color={colors.warning} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.disclaimerTitle, { color: colors.foreground }]}>{t('disclaimerTitle')}</Text>
          <Text style={[styles.disclaimerCopy, { color: colors.mutedForeground }]}>{t('disclaimerBody')}</Text>
        </View>
      </View>
      <Text style={[styles.version, { color: colors.mutedForeground }]}>Local data · No account · No uploads</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { paddingHorizontal: 20, paddingTop: Platform.OS === 'web' ? 67 : 18, gap: 19 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 1 },
  title: { fontSize: 24, fontWeight: '700', letterSpacing: -0.5 },
  subTitle: { fontSize: 12, marginTop: 5 },
  headerIcon: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 14 },
  section: { gap: 9 },
  sectionHeading: { flexDirection: 'row', gap: 7, alignItems: 'center', paddingHorizontal: 2 },
  sectionLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 1 },
  sectionCard: { borderWidth: 1, borderRadius: 16, paddingHorizontal: 13 },
  choiceRow: { minHeight: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  choiceLabel: { fontSize: 13, fontWeight: '500' },
  radio: { width: 18, height: 18, borderRadius: 10, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  radioInner: { width: 9, height: 9, borderRadius: 5 },
  divider: { height: 1, marginHorizontal: 1 },
  preferenceRow: { minHeight: 78, flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  preferenceTitle: { fontSize: 12, fontWeight: '600', lineHeight: 17 },
  preferenceCopy: { fontSize: 10, lineHeight: 15, marginTop: 4 },
  privacyRow: { flexDirection: 'row', gap: 10, alignItems: 'center', paddingVertical: 13 },
  privacyIcon: { width: 37, height: 37, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  privacyCopy: { fontSize: 10, lineHeight: 16 },
  stopCapture: { minHeight: 39, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderWidth: 1, borderRadius: 10, marginTop: 12, marginBottom: 13 },
  stopCaptureText: { fontSize: 11, fontWeight: '600' },
  disclaimer: { flexDirection: 'row', alignItems: 'flex-start', gap: 9, padding: 13, borderRadius: 14 },
  disclaimerTitle: { fontSize: 11, fontWeight: '700' },
  disclaimerCopy: { fontSize: 10, lineHeight: 15, marginTop: 4 },
  version: { textAlign: 'center', fontSize: 9, marginTop: -9 },
});
