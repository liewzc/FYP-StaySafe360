// screens/knowledge/hazard/HazardLearnScreen.js
import React, { useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, AccessibilityInfo } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { HAZARDS } from './hazardsData';
import TopBarBack from '../../../components/ui/TopBarBack';
import BookmarkStar from '../../../components/ui/BookmarkStar'; // ★ 新增
import { markArticleRead } from '../../../utils/achievements';

const ACCENT = '#0b6fb8';
const MUTED = '#6b7280';
const BORDER = '#e5e7eb';
const TITLE_COLOR = '#111827';

export default function HazardLearnScreen() {
  const { params } = useRoute();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const hazardKey = params?.hazardKey || 'Flood';
  const hazard = HAZARDS[hazardKey];

  useEffect(() => {
    const articleId = `hazard:${hazardKey}`;
    (async () => {
      try {
        await markArticleRead(articleId);
        AccessibilityInfo?.announceForAccessibility?.('Marked as read.');
      } catch (e) {
        console.warn('markArticleRead failed', e);
      }
    })();
  }, [hazardKey]);

  const order = useMemo(() => {
    const base = (hazard?.sectionsOrder && Array.isArray(hazard.sectionsOrder))
      ? hazard.sectionsOrder
      : ['essentials', 'before', 'during', 'after', 'local', 'myths', 'vulnerable'];
    let arr = base.filter((k) => k !== 'checklist');
    if (!arr.includes('steps')) {
      const idx = arr.indexOf('essentials');
      if (idx >= 0) arr = [...arr.slice(0, idx + 1), 'steps', ...arr.slice(idx + 1)];
      else arr = ['steps', ...arr];
    }
    return arr;
  }, [hazard]);

  const stepsData = useMemo(() => {
    const provided = hazard?.sections?.steps;
    if (Array.isArray(provided) && provided.length) {
      return provided.map((s, i) =>
        typeof s === 'string'
          ? { title: `Step ${i + 1}`, items: [s] }
          : { title: s.title || `Step ${i + 1}`, items: s.items || [], icon: s.icon }
      );
    }
    const before = (hazard?.sections?.before || []).slice(0, 4);
    const duringAll = []
      .concat(hazard?.sections?.during?.outdoor || [])
      .concat(hazard?.sections?.during?.indoor || [])
      .concat(hazard?.sections?.during?.driving || [])
      .concat(hazard?.sections?.during?.transit || []);
    const during = duringAll.slice(0, 4);
    const after = (hazard?.sections?.after || []).slice(0, 4);

    const steps = [];
    if (before.length) steps.push({ title: 'Step 1: Before (Preparedness)', items: before });
    if (during.length) steps.push({ title: 'Step 2: During (Response)', items: during });
    if (after.length) steps.push({ title: 'Step 3: After (Recovery)', items: after });
    if (!steps.length) steps.push({ title: 'Step by Step', items: ['No available steps.'] });
    return steps;
  }, [hazard]);

  // ⭐ 组装当前页面的书签对象（供 BookmarkStar 使用）
  const getBookmarkItem = () => ({
    id: `hazard:${hazardKey}`,
    title: hazard?.title || hazardKey,
    subtitle: hazard?.tagline || 'Hazard preparedness & response',
    provider: 'StaySafe360 · Hazard',
    url: `app://hazard/${hazardKey}`,
    tags: ['hazard', hazardKey],
    icon: '⚠️',
  });

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <TopBarBack title={hazard.title} />
      
      {/* 标题下的工具条：左侧副标题，右侧收藏 */}
      <View style={styles.toolbar}>
        <Text style={styles.tagline}>{hazard.tagline}</Text>
        <BookmarkStar getItem={getBookmarkItem} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.container,
          { paddingBottom: insets.bottom + 24 },
        ]}
      >
        {order.map((k) => {
          if (k === 'essentials') {
            return (
              <Section key={k} title="Essentials (60s quick read)">
                <BulletList items={hazard.sections.essentials} />
              </Section>
            );
          }
          if (k === 'steps') {
            return (
              <Section key={k} title="Step by Step Guide">
                <StepList steps={stepsData} />
              </Section>
            );
          }
          if (k === 'before') {
            return (
              <Section key={k} title="Before (Preparedness)">
                <BulletList items={hazard.sections.before} />
              </Section>
            );
          }
          if (k === 'during') {
            return (
              <Section key={k} title="During (Response)">
                <SubTitle>Outdoors</SubTitle>
                <BulletList items={hazard.sections.during?.outdoor || []} />
                {!!(hazard.sections.during?.indoor || []).length && (
                  <>
                    <SubTitle>Indoors</SubTitle>
                    <BulletList items={hazard.sections.during?.indoor || []} />
                  </>
                )}
                {!!(hazard.sections.during?.driving || []).length && (
                  <>
                    <SubTitle>Driving</SubTitle>
                    <BulletList items={hazard.sections.during?.driving || []} />
                  </>
                )}
                {!!(hazard.sections.during?.transit || []).length && (
                  <>
                    <SubTitle>Public Transport</SubTitle>
                    <BulletList items={hazard.sections.during?.transit || []} />
                  </>
                )}
              </Section>
            );
          }
          if (k === 'after') {
            return (
              <Section key={k} title="After (Recovery)">
                <BulletList items={hazard.sections.after} />
              </Section>
            );
          }
          if (k === 'local' && (hazard.sections.local || []).length) {
            return (
              <Section key={k} title="Local (SG) Info">
                <ListPairs items={hazard.sections.local} />
              </Section>
            );
          }
          if (k === 'myths' && (hazard.sections.myths || []).length) {
            return (
              <Section key={k} title="Mistakes & Myths">
                {hazard.sections.myths.map((m, i) => (
                  <View key={i} style={styles.myth}>
                    <Text style={styles.mythTitle}>❌ Myth: {m.myth}</Text>
                    <Text style={styles.mythFact}>✅ Fact: {m.fact}</Text>
                  </View>
                ))}
              </Section>
            );
          }
          if (k === 'vulnerable' && hazard.sections.vulnerable) {
            return (
              <Section key={k} title="For Vulnerable Groups">
                {Object.entries(hazard.sections.vulnerable).map(([group, items]) => (
                  <View key={group} style={{ marginBottom: 8 }}>
                    <SubTitle>{formatGroup(group)}</SubTitle>
                    <BulletList items={items} />
                  </View>
                ))}
              </Section>
            );
          }
          return null;
        })}
      </ScrollView>
    </View>
  );
}

function Section({ title, children }) {
  return (
    <View style={styles.card}>
      <View style={styles.secHeader}>
        <Text style={styles.secTitle}>{title}</Text>
      </View>
      <View style={styles.cardBody}>{children}</View>
    </View>
  );
}

const StepList = ({ steps = [] }) => (
  <View style={{ gap: 12 }}>
    {steps.map((s, i) => {
      const isLast = i === steps.length - 1;
      const stepIcon = s.icon || pickIconByTitle(s.title);
      return (
        <View key={i} style={styles.stepRowWrap}>
          <View style={styles.timelineCol}>
            <View style={styles.stepNum}><Text style={styles.stepNumText}>{i + 1}</Text></View>
            {!isLast && <View style={styles.timelineLine} />}
          </View>
          <View style={styles.stepContentCol}>
            <View style={styles.stepHeader}>
              <Text style={styles.stepEmoji}>{stepIcon}</Text>
              <Text style={styles.stepTitle}>{s.title || `Step ${i + 1}`}</Text>
            </View>
            {Array.isArray(s.items) && s.items.length > 0 && (
              <View style={{ marginTop: 6, gap: 6 }}>
                {s.items.map((it, j) => (
                  <View key={j} style={styles.bulletRow}>
                    <Text style={styles.bulletIcon}>{pickIconByText(it)}</Text>
                    <Text style={styles.bulletText}>{it}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>
      );
    })}
  </View>
);

const BulletList = ({ items = [] }) => (
  <View style={{ gap: 6 }}>
    {items.map((t, i) => (
      <View key={i} style={styles.bulletRow}>
        <Text style={styles.bulletDot}>•</Text>
        <Text style={styles.bulletText}>{t}</Text>
      </View>
    ))}
  </View>
);

const ListPairs = ({ items = [] }) => (
  <View style={{ gap: 8 }}>
    {items.map((it, i) => (
      <View key={i} style={styles.pairRow}>
        <Text style={styles.pairName}>{it.name}</Text>
        <Text style={styles.pairDesc}>{it.desc}</Text>
      </View>
    ))}
  </View>
);

const SubTitle = ({ children }) => <Text style={styles.subTitle}>{children}</Text>;

function formatGroup(g) {
  const MAP = { seniors: 'Seniors', kids: 'Children', pregnancy: 'Pregnant Women', pets: 'Pets', outdoorWorkers: 'Outdoor Workers' };
  return MAP[g] || (g?.[0]?.toUpperCase?.() + g?.slice?.(1)) || g;
}
function pickIconByTitle(title = '') {
  const t = title?.toLowerCase?.() || '';
  if (t.includes('before') || t.includes('prepared')) return '🧰';
  if (t.includes('during') || t.includes('response') || t.includes('evacuate')) return '🏃‍♂️';
  if (t.includes('after') || t.includes('recovery') || t.includes('clean')) return '🧹';
  return '✅';
}
function pickIconByText(text = '') {
  const s = text?.toLowerCase?.() || '';
  if (s.match(/power|electric|switch|outlet|shock/)) return '⚡';
  if (s.match(/evacuate|move|high ground|escape|gather/)) return '🏃‍♀️';
  if (s.match(/kit|first aid|supplies|water|food|medicine/)) return '🎒';
  if (s.match(/call|help|emergency|contact|hotline/)) return '📞';
  if (s.match(/radio|broadcast|official|update|notice/)) return '📻';
  if (s.match(/vehicle|drive|road|flood|water/)) return '🚗';
  if (s.match(/pet/)) return '🐾';
  if (s.match(/child|kid|baby/)) return '🧒';
  if (s.match(/elder|senior/)) return '👴';
  if (s.match(/mask|breath|pm2\.?5|air/)) return '😷';
  if (s.match(/clean|disinfect|sewage|sanitize/)) return '🧴';
  return '•';
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 16, paddingTop: 8, backgroundColor: '#fff' },
  toolbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 6 },
  tagline: { fontSize: 12, color: MUTED, marginVertical: 8, flex: 1, marginRight: 12 },

  card: { borderWidth: 1, borderColor: BORDER, borderRadius: 14, marginTop: 12, overflow: 'hidden', backgroundColor: '#ffffff' },
  secHeader: { paddingHorizontal: 12, paddingVertical: 12, backgroundColor: '#f7fbff', borderBottomWidth: 1, borderBottomColor: BORDER },
  secTitle: { fontSize: 15, fontWeight: '900', color: '#0f172a' },
  cardBody: { padding: 12, gap: 8 },

  bulletRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  bulletDot: { color: ACCENT, marginTop: 2 },
  bulletIcon: { width: 18, textAlign: 'center', marginTop: 1 },
  bulletText: { color: '#0f172a', fontSize: 14, flex: 1 },

  pairRow: { borderWidth: 1, borderColor: '#e6f1fb', borderRadius: 10, padding: 10, backgroundColor: '#f7fbff' },
  pairName: { color: ACCENT, fontWeight: '900' },
  pairDesc: { color: MUTED, marginTop: 2 },

  myth: { borderWidth: 1, borderColor: '#fee2e2', backgroundColor: '#fff7f7', borderRadius: 10, padding: 10 },
  mythTitle: { color: '#7f1d1d', fontWeight: '800' },
  mythFact: { color: '#065f46', marginTop: 4 },

  subTitle: { fontSize: 13, fontWeight: '800', color: '#334155', marginTop: 4, marginBottom: 2 },

  stepRowWrap: { flexDirection: 'row', gap: 12 },
  timelineCol: { width: 28, alignItems: 'center' },
  stepNum: { width: 24, height: 24, borderRadius: 12, backgroundColor: ACCENT, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  stepNumText: { color: '#fff', fontWeight: '900', fontSize: 12 },
  timelineLine: { width: 2, backgroundColor: '#e2e8f0', flexGrow: 1, marginTop: 4, marginBottom: 2 },

  stepContentCol: { flex: 1, borderWidth: 1, borderColor: '#e6f1fb', backgroundColor: '#f7fbff', borderRadius: 12, padding: 10 },
  stepHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stepEmoji: { fontSize: 16 },
  stepTitle: { fontSize: 14, fontWeight: '900', color: '#0f172a' },
});
