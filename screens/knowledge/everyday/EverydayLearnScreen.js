// screens/knowledge/everyday/EverydayLearnScreen.js
import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Image, Platform, AccessibilityInfo,
  TouchableOpacity, Modal, Pressable
} from 'react-native';
import { useRoute } from '@react-navigation/native';
import TopBarBack from '../../../components/ui/TopBarBack';
import BookmarkStar from '../../../components/ui/BookmarkStar'; // ★ 新增
import { markArticleRead } from '../../../utils/achievements';

const IMAGES = {
  burns:       require('../../../assets/firstaid_images/burn.png'),
  bleeding:    require('../../../assets/firstaid_images/bleeding.png'),
  cpr:         require('../../../assets/firstaid_images/cpr.png'),
  choking:     require('../../../assets/firstaid_images/choking.png'),
  fracture:    require('../../../assets/firstaid_images/fracture.png'),
  fainting:    require('../../../assets/firstaid_images/fainting.png'),
  heatstroke:  require('../../../assets/firstaid_images/heatstroke.png'),
  electric:    require('../../../assets/firstaid_images/electric_shock.png'),
  animal_bite: require('../../../assets/firstaid_images/animal_bite.png'),
  smoke:       require('../../../assets/firstaid_images/smoke_inhalation.png'),
};

const TITLES = {
  burns: 'Burns / Scalds',
  bleeding: 'Bleeding',
  cpr: 'CPR (Adult)',
  choking: 'Choking (Adult & Infant)',
  fracture: 'Fracture / Sprain',
  fainting: 'Fainting',
  heatstroke: 'Heatstroke',
  electric: 'Electric Shock',
  animal_bite: 'Animal Bite',
  smoke: 'Smoke Inhalation',
};

const CONTENT = { /* —— 你的原内容保持不变 —— */ 
  burns: { quick: ['Cool the burn under cool running water for 20 minutes.', 'Remove rings/watches near the area before swelling.', 'Cover loosely with sterile non-stick dressing or clean plastic wrap.'],
    dont: ['❌ No ice, butter, toothpaste, oil or creams.', '❌ Do not break blisters.'],
    seek: ['Deep/large burns, face/hands/genitals, electrical/chemical burns.', 'Signs of shock or difficulty breathing — call 995.'],
    tips: ['Keep water heater below 50°C. Keep hot liquids out of children\'s reach.'],
  },
  bleeding: { quick: ['Apply direct pressure with gauze/cloth; add layers if soaked.', 'Elevate if possible; keep the person warm and still.'],
    dont: ['❌ Do not remove deeply embedded objects — pad around them.', '❌ Do not clean severe open wounds in the field — focus on pressure.'],
    seek: ['Severe or spurting bleeding, amputation, signs of shock — call 995.', 'Use a tourniquet ONLY if life-threatening and trained.'],
    tips: ['Wear gloves if available. Wash hands after care.'],
  },
  cpr: { quick: ['Unresponsive & not breathing normally → Call 995 & start CPR.', 'Chest compressions: 100–120/min, depth ~5–6 cm, full recoil.', 'Ratio 30 compressions : 2 breaths (if trained).', 'Use an AED asap; follow voice prompts.'],
    dont: ['❌ Do not delay CPR to look for a pulse if untrained.'],
    seek: ['Always involve EMS (995) and continue until help or AED arrives.'],
    tips: ['Use a metronome (100–120 bpm). Switch rescuers every 2 minutes if possible.'],
  },
  choking: { quick: ['Adult: 5 back blows → 5 abdominal thrusts; repeat.', 'Infant (<1y): 5 back slaps → 5 chest thrusts; repeat.', 'If unconscious: call 995, start CPR; check mouth between cycles.'],
    dont: ['❌ Do not perform blind finger sweeps in a conscious person.'],
    seek: ['Persistent cough, cyanosis, or unresponsive — call 995.'],
    tips: ['Cut food small for kids; avoid peanuts/hard candy for toddlers.'],
  },
  fracture: { quick: ['Immobilise: support with sling/splint in the position found.', 'R.I.C.E for sprains: Rest, Ice (wrapped), Compress, Elevate.'],
    dont: ['❌ Do not straighten a deformed limb.', '❌ Do not move if spinal injury suspected; call 995.'],
    seek: ['Open fractures, severe deformity, severe pain/tingling/numbness, inability to bear weight.'],
    tips: ['Ice wrapped for 15–20 min, repeat hourly in first day.'],
  },
  fainting: { quick: ['Lay the person down; elevate legs ~20–30 cm.', 'Loosen tight clothing; ensure airflow.', 'If not waking in 1 minute, call 995.'],
    dont: ['❌ Do not give food or drink until fully alert.'],
    seek: ['Chest pain, shortness of breath, pregnancy, injury from fall, diabetes.'],
    tips: ['Encourage fluids after recovery; avoid standing up suddenly.'],
  },
  heatstroke: { quick: ['Move to a cool shaded place; remove excess clothing.', 'Aggressively cool: cool wet cloths/ice packs to neck/armpits/groin.', 'If responsive: sip cool water OR oral rehydration.'],
    dont: ['❌ Do not give fluids if confused or unconscious.'],
    seek: ['Hot, dry skin; confusion; seizures; temp ≥40 °C — call 995 immediately.'],
    tips: ['Hydrate, rest in shade, avoid midday exertion, check elderly/kids frequently.'],
  },
  electric: { quick: ['Ensure scene safe — turn OFF power before touching the person.', 'Call 995 for high-voltage or if unresponsive.', 'Check breathing; start CPR/AED if needed.', 'Treat entry/exit burns like thermal burns.'],
    dont: ['❌ Do not touch the person until power is isolated.'],
    seek: ['Any loss of consciousness, chest pain, burns, pregnancy, or persistent symptoms.'],
    tips: ['Use RCDs; keep appliances dry; cover sockets with child-safe covers.'],
  },
  animal_bite: { quick: ['Wash wound with running water & soap for 5+ minutes.', 'Control bleeding with pressure; cover with clean dressing.'],
    dont: ['❌ Do not close puncture wounds tightly in the field.'],
    seek: ['Deep/dirty wounds, unknown animal, signs of infection, face/hand/genital bites.', 'Consider tetanus update; seek medical advice.'],
    tips: ['Avoid provoking animals; supervise children around pets.'],
  },
  smoke: { quick: ['Move to fresh air; loosen tight clothing.', 'Monitor breathing; place in recovery position if drowsy but breathing.', 'If not breathing/agonal → Call 995 and start CPR.'],
    dont: ['❌ Do not re-enter a smoky area.'],
    seek: ['Breathing difficulty, persistent cough, wheeze, soot around mouth/nose, confusion.'],
    tips: ['Install smoke alarms; plan escape routes; avoid indoor burning/incense in poor ventilation.'],
  },
};

function Bullet({ text }) {
  return (
    <View style={{ flexDirection: 'row', marginBottom: 6 }}>
      <Text style={{ marginRight: 8 }}>•</Text>
      <Text style={{ flex: 1, color: '#0f172a' }}>{text}</Text>
    </View>
  );
}

export default function EverydayLearnScreen() {
  const { params } = useRoute();
  const topicKey = params?.topicKey || 'burns';

  const title = TITLES[topicKey] || 'First Aid';
  const image = IMAGES[topicKey];
  const data = CONTENT[topicKey];

  // 🔍 全屏预览控制
  const [showImage, setShowImage] = useState(false);

  useEffect(() => {
    const articleId = `everyday:${topicKey}`;
    (async () => {
      try {
        await markArticleRead(articleId);
        AccessibilityInfo?.announceForAccessibility?.('Marked as read.');
      } catch (e) {
        console.warn('markArticleRead failed', e);
      }
    })();
  }, [topicKey]);

  // ⭐ 供 BookmarkStar 使用的书签对象
  const getBookmarkItem = () => ({
    id: `everyday:${topicKey}`,
    title,
    subtitle: 'Everyday first-aid quick steps',
    provider: 'StaySafe360 · FirstAid',
    url: `app://everyday/${topicKey}`,
    tags: ['firstaid', topicKey],
    icon: '⛑️',
  });

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <TopBarBack title={title} />

      {/* 标题下的工具条：左侧副标题，右侧收藏 */}
      <View style={stylesTop.toolbar}>
        <Text style={stylesTop.subtitle}>Simple, do-first steps. Not a substitute for professional care.</Text>
        <BookmarkStar getItem={getBookmarkItem} />
      </View>
      
      <ScrollView contentContainerStyle={styles.container}>
        {image && (
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => setShowImage(true)}
            accessibilityRole="button"
            accessibilityLabel="Open full image"
          >
            <Image source={image} style={styles.hero} resizeMode="cover" />
          </TouchableOpacity>
        )}

        {data?.quick?.length ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Do this now</Text>
            <View style={{ marginTop: 8 }}>
              {data.quick.map((t, i) => <Bullet key={i} text={t} />)}
            </View>
          </View>
        ) : null}

        {data?.dont?.length ? (
          <View style={styles.cardWarning}>
            <Text style={styles.cardTitleDanger}>Avoid</Text>
            <View style={{ marginTop: 8 }}>
              {data.dont.map((t, i) => <Bullet key={i} text={t} />)}
            </View>
          </View>
        ) : null}

        {data?.seek?.length ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Seek help if</Text>
            <View style={{ marginTop: 8 }}>
              {data.seek.map((t, i) => <Bullet key={i} text={t} />)}
            </View>
          </View>
        ) : null}

        {data?.tips?.length ? (
          <View style={styles.cardSoft}>
            <Text style={styles.cardTitleSoft}>Prevention tips</Text>
            <View style={{ marginTop: 8 }}>
              {data.tips.map((t, i) => <Bullet key={i} text={t} />)}
            </View>
          </View>
        ) : null}

        <Text style={styles.footerNote}>
          If in doubt, call local emergency services. In Singapore dial 995. This content is for education only.
        </Text>

        <View style={{ height: 16 }} />
      </ScrollView>

      {/* 🖼️ 全屏图片预览 Modal（轻触任意处关闭） */}
      <Modal
        visible={showImage}
        transparent
        animationType="fade"
        onRequestClose={() => setShowImage(false)}
      >
        <Pressable style={stylesImageModal.backdrop} onPress={() => setShowImage(false)}>
          <View style={stylesImageModal.container} pointerEvents="box-none">
            <Image
              source={image}
              style={stylesImageModal.fullImage}
              resizeMode="contain"
              accessible
              accessibilityLabel={`${title} full image`}
            />
            <Pressable
              onPress={() => setShowImage(false)}
              style={stylesImageModal.closeBtn}
              accessibilityRole="button"
              accessibilityLabel="Close"
            >
              <Text style={stylesImageModal.closeTxt}>✕</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const ACCENT = '#0B6FB8';

const stylesTop = StyleSheet.create({
  toolbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 6 },
  subtitle: { fontSize: 12, color: '#6b7280', marginVertical: 8, flex: 1, marginRight: 12 },
});

const styles = StyleSheet.create({
  container: { padding: 16, paddingTop: 8, backgroundColor: '#ffffff' },
  hero: {
    width: '100%',
    height: 180,
    borderRadius: 14,
    marginBottom: 12,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 6, shadowOffset: { width: 0, height: 3 } },
      android: { elevation: 3 },
    }),
  },

  card: { backgroundColor: '#f8fbff', borderWidth: 1, borderColor: '#e6f1fb', borderRadius: 12, padding: 12, marginBottom: 10 },
  cardWarning: { backgroundColor: '#fff7f7', borderWidth: 1, borderColor: '#ffd1d1', borderRadius: 12, padding: 12, marginBottom: 10 },
  cardSoft: { backgroundColor: '#f6fff9', borderWidth: 1, borderColor: '#d8f5e3', borderRadius: 12, padding: 12, marginBottom: 10 },

  cardTitle: { fontSize: 16, fontWeight: '900', color: ACCENT },
  cardTitleDanger: { fontSize: 16, fontWeight: '900', color: '#d32f2f' },
  cardTitleSoft: { fontSize: 16, fontWeight: '900', color: '#0f766e' },

  footerNote: { fontSize: 11, color: '#6b7280', marginTop: 6, textAlign: 'center' },
});

const stylesImageModal = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' },
  fullImage: { width: '92%', height: '80%' },
  closeBtn: {
    position: 'absolute',
    top: 40,
    right: 20,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  closeTxt: { fontSize: 18, color: '#fff', fontWeight: '700' },
});
