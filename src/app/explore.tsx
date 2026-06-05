import { ScrollView, StyleSheet, Text, View } from 'react-native';

const deliverables = [
  'Offline personnel registration and sign-in',
  'Face enrollment with local SQLite storage',
  'Camera-based liveness challenge flow',
  'Offline upload queue for verification records',
  'AWS sync screen for restored connectivity',
];

export default function ExploreScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Hackathon 7.0 Prototype</Text>
        <Text style={styles.subtitle}>
          Secure offline facial recognition and liveness detection for remote field locations.
        </Text>
      </View>

      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Included Scope</Text>
        {deliverables.map((item) => (
          <View key={item} style={styles.row}>
            <View style={styles.dot} />
            <Text style={styles.rowText}>{item}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#E8EDF2' },
  content: { padding: 20, gap: 16, paddingBottom: 48 },
  header: { gap: 8, paddingVertical: 12 },
  title: { color: '#1B3E7B', fontSize: 22, fontWeight: '800' },
  subtitle: { color: '#444', fontSize: 14, lineHeight: 20 },
  panel: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    gap: 14,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  panelTitle: { color: '#1A1A1A', fontSize: 16, fontWeight: '700' },
  row: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#138808' },
  rowText: { color: '#333', flex: 1, fontSize: 14, lineHeight: 19 },
});
