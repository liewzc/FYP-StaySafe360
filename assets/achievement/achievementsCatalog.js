// /app/assets/achievement/achievementsCatalog.js
// pure data (no React, no I/O)
const FIRST_AID_CATS = 5 + 10;
const FIRST_AID_SUBLEVELS_PER_CAT = 4;
const DISASTER_CATS = 5;
const DISASTER_SUBLEVELS_PER_CAT = 10;
const KNOWLEDGE_TOTAL_ARTICLES = 15;

const A = (id, title, subtitle, series, icon) => ({ id, title, subtitle, series, icon });

export const ACHIEVEMENTS = (() => {
  const list = [];
  // General
  list.push(
    A('first','First Quiz','Complete your first quiz','General',{ lib:'mci', name:'medal-outline' }),
    A('ks5','Knowledge Seeker','Complete 5 quizzes','General',{ lib:'mci', name:'trophy-outline' }),
    A('ks10','Quiz Explorer','Complete 10 quizzes','General',{ lib:'mci', name:'trophy' }),
    A('ks50','Quiz Veteran','Complete 50 quizzes','General',{ lib:'ion', name:'ribbon-outline' }),
    A('perfect1','Perfect Score','Score 100% in any quiz','General',{ lib:'ion', name:'star-outline' }),
    A('fast1','Speed Runner','Finish a quiz under 20s','General',{ lib:'mci', name:'speedometer' }),
    A('share1','Spread the Word','Share one result','General',{ lib:'mci', name:'share-variant' }),
  );
  // First Aid
  const faTotalSublevels = FIRST_AID_CATS * FIRST_AID_SUBLEVELS_PER_CAT;
  list.push(
    A('fa_sub_1','First Aid Beginner','Complete 1 sublevel','First Aid',{ lib:'ion', name:'medkit-outline' }),
    A('fa_sub_10','First Aid Climber','Complete 10 sublevels','First Aid',{ lib:'ion', name:'bandage-outline' }),
    A('fa_sub_30','First Aid Pro','Complete 30 sublevels','First Aid',{ lib:'mci', name:'hospital-box-outline' }),
    A('fa_sub_all',`First Aid Master`,`Complete all ${faTotalSublevels} sublevels`,'First Aid',{ lib:'ion', name:'school-outline' }),
    A('fa_cat_1','Aid Category Finisher I','Finish 1 category','First Aid',{ lib:'mci', name:'stethoscope' }),
    A('fa_cat_5','Aid Category Finisher II','Finish 5 categories','First Aid',{ lib:'mci', name:'clipboard-check-outline' }),
    A('fa_cat_10','Aid Category Expert','Finish 10 categories','First Aid',{ lib:'ion', name:'medkit' }),
    A('fa_cat_all',`Aid Completionist`, `Finish all ${FIRST_AID_CATS} categories`,'First Aid',{ lib:'mci', name:'crown-outline' }),
  );
  // Disaster
  const dzTotalSublevels = DISASTER_CATS * DISASTER_SUBLEVELS_PER_CAT;
  list.push(
    A('dz_sub_10','Preparedness Novice','Complete 10 disaster sublevels','Disaster',{ lib:'ion', name:'flash-outline' }),
    A('dz_sub_25','Preparedness Adept','Complete 25 disaster sublevels','Disaster',{ lib:'mci', name:'shield-half-full' }),
    A('dz_sub_all',`Preparedness Master`, `Complete all ${dzTotalSublevels} disaster sublevels`,'Disaster',{ lib:'mci', name:'shield-outline' }),
    A('dz_cat_1','Resilience I','Finish 1 disaster category','Disaster',{ lib:'mci', name:'alert-outline' }),
    A('dz_cat_3','Resilience II','Finish 3 disaster categories','Disaster',{ lib:'ion', name:'earth-outline' }),
    A('dz_cat_all',`Resilience Max`, `Finish all ${DISASTER_CATS} categories`,'Disaster',{ lib:'mci', name:'shield-check-outline' }),
  );
  // Streaks
  [
    { id:'streak1', days:1,  title:'Day 1 Explorer',   icon:{ lib:'ion', name:'calendar-outline' } },
    { id:'streak3', days:3,  title:'3-Day Challenger', icon:{ lib:'ion', name:'flame-outline' } },
    { id:'streak7', days:7,  title:'7-Day Challenger', icon:{ lib:'ion', name:'flame-outline' } },
    { id:'streak10',days:10, title:'10-Day Runner',    icon:{ lib:'mci', name:'run-fast' } },
    { id:'streak14',days:14, title:'Two-Week Hero',    icon:{ lib:'ion', name:'sunny-outline' } },
    { id:'streak30',days:30, title:'30-Day Survivor',  icon:{ lib:'mci', name:'crown-outline' } },
  ].forEach(({ id, days, title, icon }) =>
    list.push(A(id, title, `Check in for ${days} consecutive days`, 'Daily Streaks', icon)));
  // Knowledge
  list.push(
    A('kn1','Quick Learner','Read 1 knowledge article','Knowledge',{ lib:'ion', name:'book-outline' }),
    A('kn5','Reader','Read 5 knowledge articles','Knowledge',{ lib:'ion', name:'book' }),
    A('kn10','Knowledge Collector','Read 10 knowledge articles','Knowledge',{ lib:'ion', name:'library-outline' }),
    A('kn15','Knowledge Finisher',`Read all ${KNOWLEDGE_TOTAL_ARTICLES} articles`,'Knowledge',{ lib:'mci', name:'lightbulb-outline' }),
  );
  return list;
})();
