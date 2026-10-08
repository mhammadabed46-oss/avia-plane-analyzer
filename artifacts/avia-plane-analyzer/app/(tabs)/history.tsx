import { useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  Platform,
  Pressable,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { useAnalyzer } from '@/context/AnalyzerContext';
import { RoundRecord } from '@/lib/models';
import { translate } from '@/lib/translations';
import { useColors } from '@/hooks/useColors';

type FilterType = 'all' | 'low' | 'high';

function csvCell(value: string | number): string {
  const text = String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

function roundDate(value: string, language: 'en' | 'ar'): string {
  const date = new Date(value);
  return new Intl.DateTimeFormat(language === 'ar' ? 'ar-KW' : 'en-GB', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export default function HistoryScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const {
    records,
    preferences,
    deleteRound,
    addCorrection,
    clearHistory,
  } = useAnalyzer();
  const language = preferences.language;
  const t = (key: Parameters<typeof translate>[1]) => translate(language, key);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [editing, setEditing] = useState<RoundRecord | null>(null);
  const [correctionText, setCorrectionText] = useState('');

  const filtered = useMemo(() => records.filter((record) => {
    const query = search.trim().toLowerCase();
    const matchesSearch = !query ||
      record.multiplier.toFixed(2).includes(query) ||
      String(record.roundNumber).includes(query);
    const matchesFilter = filter === 'all' ||
      (filter === 'low' ? record.multiplier < 2 : record.multiplier >= 2);
    return matchesSearch && matchesFilter;
  }), [records, search, filter]);

  const exportCsv = async () => {
    if (!records.length) {
      Alert.alert(t('exportCsv'), t('noRounds'));
      return;
    }
    const rows = [
      ['Round', 'Multiplier', 'Date', 'Confidence', 'Corrected'],
      ...[...records].reverse().map((record) => [
        record.roundNumber,
        record.multiplier.toFixed(2),
        record.capturedAt,
        `${Math.round(record.confidence * 100)}%`,
        record.corrected ? 'yes' : 'no',
      ]),
    ];
    const csv = rows.map((row) => row.map((cell) => csvCell(String(cell))).join(',')).join('\r\n');
    try {
      const uri = `${FileSystem.cacheDirectory || FileSystem.documentDirectory}avia-round-history.csv`;
      await FileSystem.writeAsStringAsync(uri, csv, { encoding: FileSystem.EncodingType.UTF8 });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'text/csv', dialogTitle: t('exportCsv') });
      } else {
        await Share.share({ message: csv, title: 'Avia round history' });
      }
    } catch {
      Alert.alert(t('exportCsv'), language === 'ar' ? 'تعذّر تصدير الملف.' : 'The CSV export could not be created.');
    }
  };

  const confirmDelete = (record: RoundRecord) => {
    Alert.alert(
      language === 'ar' ? 'حذف النتيجة؟' : 'Delete this result?',
      `#${record.roundNumber} · ${record.multiplier.toFixed(2)}×`,
      [
        { text: t('cancel'), style: 'cancel' },
        { text: t('delete'), style: 'destructive', onPress: () => deleteRound(record.id) },
      ],
    );
  };

  const saveCorrection = () => {
    const multiplier = Number(correctionText.replace(',', '.'));
    if (!editing || !Number.isFinite(multiplier) || multiplier < 1) {
      Alert.alert(t('enterCorrection'), t('invalidCorrection'));
      return;
    }
    addCorrection(editing.id, multiplier);
    setEditing(null);
  };

  return (
    <>
      <View style={[styles.page, { backgroundColor: colors.background, paddingTop: Platform.OS === 'web' ? 67 : 18, paddingBottom: Math.max(12, insets.bottom), direction: language === 'ar' ? 'rtl' : 'ltr' }]}>
        <View style={styles.header}>
          <View>
            <Text style={[styles.title, { color: colors.foreground }]}>{t('history')}</Text>
            <Text style={[styles.subTitle, { color: colors.mutedForeground }]}>{records.length} {t('rounds').toLowerCase()}</Text>
          </View>
          <View style={styles.headerActions}>
            <Pressable onPress={exportCsv} accessibilityLabel={t('exportCsv')} style={[styles.iconButton, { borderColor: colors.border, backgroundColor: colors.card }]}>
              <Feather name="download" size={17} color={colors.foreground} />
            </Pressable>
            <Pressable onPress={clearHistory} accessibilityLabel={t('clearHistory')} style={[styles.iconButton, { borderColor: colors.border, backgroundColor: colors.card }]}>
              <Feather name="trash-2" size={17} color={colors.destructive} />
            </Pressable>
          </View>
        </View>

        <View style={[styles.searchBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Feather name="search" size={16} color={colors.mutedForeground} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder={t('searchPlaceholder')}
            placeholderTextColor={colors.mutedForeground}
            style={[styles.searchInput, { color: colors.foreground }]}
            keyboardType="decimal-pad"
            returnKeyType="search"
          />
          {search ? <Pressable onPress={() => setSearch('')}><Feather name="x-circle" size={16} color={colors.mutedForeground} /></Pressable> : null}
        </View>
        <View style={[styles.filterRow, { backgroundColor: colors.muted }]}>
          {(['all', 'low', 'high'] as const).map((item) => {
            const active = filter === item;
            return (
              <Pressable key={item} onPress={() => setFilter(item)} style={[styles.filterChip, active && { backgroundColor: colors.card }]}>
                <Text style={[styles.filterText, { color: active ? colors.foreground : colors.mutedForeground }]}>
                  {item === 'all' ? t('filterAll') : item === 'low' ? t('filterLow') : t('filterHigh')}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={{ height: 9 }} />}
          ListEmptyComponent={
            <View style={[styles.empty, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.emptyIcon, { backgroundColor: colors.primarySoft }]}><Feather name="layers" size={20} color={colors.primary} /></View>
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>{records.length ? t('noResults') : t('noRounds')}</Text>
              {!records.length ? <Text style={[styles.emptyCopy, { color: colors.mutedForeground }]}>{t('noRoundsHelp')}</Text> : null}
            </View>
          }
          renderItem={({ item }) => (
            <View style={[styles.roundRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.roundIndex, { backgroundColor: item.multiplier >= 2 ? colors.primarySoft : colors.muted }]}>
                <Text style={[styles.roundNumber, { color: item.multiplier >= 2 ? colors.primary : colors.mutedForeground }]}>#{item.roundNumber}</Text>
              </View>
              <View style={styles.roundInfo}>
                <View style={styles.roundValueLine}>
                  <Text style={[styles.roundValue, { color: colors.foreground }]}>{item.multiplier.toFixed(2)}×</Text>
                  {item.corrected ? <View style={[styles.correctedBadge, { backgroundColor: colors.warningSoft }]}><Text style={[styles.correctedText, { color: colors.warning }]}>{t('corrected')}</Text></View> : null}
                </View>
                <Text style={[styles.roundDate, { color: colors.mutedForeground }]}>{roundDate(item.capturedAt, language)} · {Math.round(item.confidence * 100)}%</Text>
              </View>
              <View style={styles.rowActions}>
                <Pressable
                  onPress={() => { setEditing(item); setCorrectionText(item.multiplier.toFixed(2)); }}
                  style={styles.rowButton}
                  accessibilityLabel={`${t('edit')} ${item.roundNumber}`}
                >
                  <Feather name="edit-2" size={15} color={colors.mutedForeground} />
                </Pressable>
                <Pressable onPress={() => confirmDelete(item)} style={styles.rowButton} accessibilityLabel={`${t('delete')} ${item.roundNumber}`}>
                  <Feather name="x" size={17} color={colors.mutedForeground} />
                </Pressable>
              </View>
            </View>
          )}
          ListFooterComponent={<Text style={[styles.localNote, { color: colors.mutedForeground }]}><Feather name="lock" size={11} color={colors.primary} />  {t('saved')}</Text>}
        />
      </View>
      <Modal visible={!!editing} animationType="slide" transparent onRequestClose={() => setEditing(null)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.editSheet, { backgroundColor: colors.card }]}>
            <View style={[styles.sheetHandle, { backgroundColor: colors.mutedForeground }]} />
            <Text style={[styles.sheetTitle, { color: colors.foreground }]}>{t('enterCorrection')}</Text>
            <Text style={[styles.sheetSub, { color: colors.mutedForeground }]}>#{editing?.roundNumber} · {t('confidence')} {Math.round((editing?.confidence ?? 0) * 100)}%</Text>
            <View style={[styles.inputWrap, { borderColor: colors.border, backgroundColor: colors.background }]}>
              <TextInput
                value={correctionText}
                onChangeText={setCorrectionText}
                autoFocus
                keyboardType="decimal-pad"
                selectTextOnFocus
                style={[styles.correctionInput, { color: colors.foreground }]}
              />
              <Text style={[styles.inputSuffix, { color: colors.mutedForeground }]}>×</Text>
            </View>
            <View style={styles.sheetActions}>
              <Pressable onPress={() => setEditing(null)} style={[styles.cancelButton, { borderColor: colors.border }]}><Text style={[styles.cancelText, { color: colors.foreground }]}>{t('cancel')}</Text></Pressable>
              <Pressable onPress={saveCorrection} style={[styles.saveButton, { backgroundColor: colors.primary }]}><Text style={[styles.saveText, { color: colors.primaryForeground }]}>{t('save')}</Text></Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, paddingHorizontal: 19, gap: 13 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 24, fontWeight: '700', letterSpacing: -0.5 },
  subTitle: { fontSize: 12, marginTop: 5 },
  headerActions: { flexDirection: 'row', gap: 8 },
  iconButton: { width: 38, height: 38, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, height: 43 },
  searchInput: { flex: 1, fontSize: 13, height: '100%' },
  filterRow: { flexDirection: 'row', padding: 4, borderRadius: 11, gap: 3 },
  filterChip: { flex: 1, minHeight: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  filterText: { fontSize: 10, fontWeight: '600' },
  listContent: { gap: 0, paddingTop: 2, paddingBottom: 15, flexGrow: 1 },
  roundRow: { minHeight: 66, borderRadius: 15, borderWidth: 1, paddingHorizontal: 11, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 10 },
  roundIndex: { width: 39, height: 39, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  roundNumber: { fontSize: 10, fontWeight: '700' },
  roundInfo: { flex: 1, gap: 5 },
  roundValueLine: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  roundValue: { fontSize: 17, fontWeight: '700', letterSpacing: -0.3 },
  roundDate: { fontSize: 10 },
  correctedBadge: { borderRadius: 5, paddingHorizontal: 5, paddingVertical: 3 },
  correctedText: { fontSize: 8, fontWeight: '700' },
  rowActions: { flexDirection: 'row', gap: 0 },
  rowButton: { width: 31, height: 36, justifyContent: 'center', alignItems: 'center' },
  empty: { borderRadius: 18, borderWidth: 1, alignItems: 'center', padding: 25, gap: 8, marginTop: 12 },
  emptyIcon: { width: 44, height: 44, borderRadius: 15, alignItems: 'center', justifyContent: 'center', marginBottom: 3 },
  emptyTitle: { fontSize: 14, fontWeight: '700', textAlign: 'center' },
  emptyCopy: { fontSize: 11, lineHeight: 16, textAlign: 'center' },
  localNote: { fontSize: 10, textAlign: 'center', paddingVertical: 16 },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.38)' },
  editSheet: { borderTopLeftRadius: 23, borderTopRightRadius: 23, padding: 21, paddingBottom: 35 },
  sheetHandle: { alignSelf: 'center', width: 36, height: 4, borderRadius: 5, marginBottom: 18 },
  sheetTitle: { fontSize: 19, fontWeight: '700' },
  sheetSub: { fontSize: 11, marginTop: 6 },
  inputWrap: { height: 54, borderWidth: 1, borderRadius: 13, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', marginTop: 18 },
  correctionInput: { flex: 1, fontSize: 22, fontWeight: '700' },
  inputSuffix: { fontSize: 19 },
  sheetActions: { flexDirection: 'row', gap: 9, marginTop: 17 },
  cancelButton: { flex: 1, height: 46, alignItems: 'center', justifyContent: 'center', borderRadius: 12, borderWidth: 1 },
  cancelText: { fontSize: 13, fontWeight: '600' },
  saveButton: { flex: 1.4, height: 46, alignItems: 'center', justifyContent: 'center', borderRadius: 12 },
  saveText: { fontSize: 13, fontWeight: '700' },
});
