// screens/firstaid/EverydayQuizData.js

// 把一套题复用到 Ⅰ~Ⅳ（先保证不报 “No quiz data”）
const makeAllSublevels = (base) => ({
  'Ⅰ': base,
  'Ⅱ': base,
  'Ⅲ': base,
  'Ⅳ': base,
});

// ==== 10 个类别各 5 题（可自行扩充/替换）====

// 1) 🔥 Burns
const burns = [
  {
    id: 1,
    question: 'What is the first step in treating a minor burn?',
    options: ['Apply ice', 'Cool with running water', 'Cover with butter', 'Pop the blister'],
    answer: 'Cool with running water',
    explanation: 'Running cool water reduces heat and prevents further damage.',
  },
  {
    id: 2,
    question: 'Should you remove accessories from a burned area?',
    options: ['No, it may hurt', 'Yes, if easy and safe to remove', 'Only if swollen', 'Never'],
    answer: 'Yes, if easy and safe to remove',
    explanation: 'Remove jewelry or tight clothing before swelling begins.',
  },
  {
    id: 3,
    question: 'Why avoid applying ice to a burn?',
    options: ['It causes infection', 'It slows healing', 'It can damage skin tissue', 'It makes the burn worse'],
    answer: 'It can damage skin tissue',
    explanation: 'Ice is too cold and may further damage skin tissue.',
  },
  {
    id: 4,
    question: 'What should you use to cover a burn?',
    options: ['Sticky plaster', 'Cling wrap', 'Clean non-stick dressing', 'Towel'],
    answer: 'Clean non-stick dressing',
    explanation: 'Use non-stick sterile dressing to avoid irritating the wound.',
  },
  {
    id: 5,
    question: 'When should you seek medical attention for a burn?',
    options: ['If burn is small', 'If blister forms', 'If burn is large or severe', 'Always'],
    answer: 'If burn is large or severe',
    explanation: 'Large, deep, or facial burns require professional care.',
  },
];

// 2) ❤️ CPR
const cpr = [
  {
    id: 1,
    question: 'What is the correct CPR compression to breath ratio (adult)?',
    options: ['15:1', '20:2', '30:2', '10:1'],
    answer: '30:2',
    explanation: 'Recommended adult CPR ratio is 30 compressions to 2 rescue breaths.',
  },
  {
    id: 2,
    question: 'First thing to do when someone collapses?',
    options: ['Start CPR', 'Call for help and check breathing', 'Give water', 'Lift legs'],
    answer: 'Call for help and check breathing',
    explanation: 'Check responsiveness and call emergency help immediately.',
  },
  {
    id: 3,
    question: 'Hand position for chest compressions?',
    options: ['Upper chest', 'Left side', 'Center of chest', 'Lower rib'],
    answer: 'Center of chest',
    explanation: 'Place the heel of your hand on the sternum.',
  },
  {
    id: 4,
    question: 'Compression depth for adults?',
    options: ['1 cm', '2 cm', '5–6 cm', '10 cm'],
    answer: '5–6 cm',
    explanation: 'At least 5 cm deep to be effective.',
  },
  {
    id: 5,
    question: 'Compression rate per minute?',
    options: ['60–80', '80–100', '100–120', '140–160'],
    answer: '100–120',
    explanation: 'Maintain a steady rhythm of 100–120/min.',
  },
];

// 3) 🫁 Choking
const choking = [
  {
    id: 1,
    question: 'A common sign of severe choking is:',
    options: ['Coughing loudly', 'Talking normally', 'Clutching the throat', 'Sneezing'],
    answer: 'Clutching the throat',
    explanation: 'Clutching the throat is the universal sign of choking.',
  },
  {
    id: 2,
    question: 'If someone is choking but still coughing:',
    options: ['Give back blows', 'Heimlich immediately', 'Encourage them to keep coughing', 'Call ambulance right away'],
    answer: 'Encourage them to keep coughing',
    explanation: 'If they can cough, they may dislodge the object themselves.',
  },
  {
    id: 3,
    question: 'Not a choking symptom:',
    options: ['Blue lips', 'Inability to speak', 'Normal breathing', 'Silent attempts to cough'],
    answer: 'Normal breathing',
    explanation: 'Choking causes difficulty or inability to breathe.',
  },
  {
    id: 4,
    question: 'If they cannot breathe or cough, you should:',
    options: ['Wait for fainting', 'Give water', 'Back blows + abdominal thrusts', 'Lay them down'],
    answer: 'Back blows + abdominal thrusts',
    explanation: 'This combination can help dislodge the blockage.',
  },
  {
    id: 5,
    question: 'Before giving first aid to a choking person (conscious):',
    options: ['Start CPR', 'Put on back', 'Ask consent and check responsiveness', 'Splash water'],
    answer: 'Ask consent and check responsiveness',
    explanation: 'Ensure safety and permission if they are conscious.',
  },
];

// 4) 🩸 Bleeding
const bleeding = [
  {
    id: 1,
    question: 'First step for external bleeding:',
    options: ['Apply tourniquet', 'Wash with soap', 'Apply direct pressure', 'Raise the legs'],
    answer: 'Apply direct pressure',
    explanation: 'Firm pressure helps stop bleeding immediately.',
  },
  {
    id: 2,
    question: 'Use what to apply pressure?',
    options: ['Bare hand', 'Dirty cloth', 'Clean cloth/dressing', 'Bandage directly'],
    answer: 'Clean cloth/dressing',
    explanation: 'Reduce infection risk with clean material.',
  },
  {
    id: 3,
    question: 'If blood soaks through dressing:',
    options: ['Remove & replace', 'Add more on top', 'Do nothing', 'Use alcohol'],
    answer: 'Add more on top',
    explanation: 'Don’t remove soaked dressing; add more layers and continue pressure.',
  },
  {
    id: 4,
    question: 'To reduce bleeding from a limb:',
    options: ['Keep it low', 'Raise above heart level', 'Let it hang', 'Move constantly'],
    answer: 'Raise above heart level',
    explanation: 'Elevation helps reduce blood flow to the injury.',
  },
  {
    id: 5,
    question: 'Call emergency when:',
    options: ['Stops quickly', 'Wound is dirty', 'Severe or won’t stop', 'Always'],
    answer: 'Severe or won’t stop',
    explanation: 'Uncontrollable bleeding needs medical help.',
  },
];

// 5) 🦴 Fracture
const fracture = [
  {
    id: 1,
    question: 'Common symptom of a fracture:',
    options: ['Itchy skin', 'Swelling and pain', 'Sneezing', 'Dry mouth'],
    answer: 'Swelling and pain',
    explanation: 'Pain, swelling, and difficulty moving are common.',
  },
  {
    id: 2,
    question: 'First action if fracture suspected:',
    options: ['Move the limb', 'Ice directly', 'Immobilize the area', 'Massage the spot'],
    answer: 'Immobilize the area',
    explanation: 'Keep it still to prevent further damage.',
  },
  {
    id: 3,
    question: 'Visible sign of broken bone:',
    options: ['Red rash', 'Bent/deformed limb', 'Numb fingertips', 'Fast heartbeat'],
    answer: 'Bent/deformed limb',
    explanation: 'Misshaped limb may indicate a fracture.',
  },
  {
    id: 4,
    question: 'Should you straighten a broken limb?',
    options: ['Yes, always', 'Only if pain', 'Only with help', 'No, never'],
    answer: 'No, never',
    explanation: 'Straightening may worsen injury.',
  },
  {
    id: 5,
    question: 'Why check circulation below the injury?',
    options: ['Measure temperature', 'Find a pulse', 'Ensure blood flow not blocked', 'Reduce bleeding'],
    answer: 'Ensure blood flow not blocked',
    explanation: 'Blocked circulation can cause tissue damage.',
  },
];

// 6) 😵 Fainting
const fainting = [
  {
    id: 1,
    question: 'Most common cause of fainting:',
    options: ['Head injury', 'Low blood sugar', 'Sudden drop in blood pressure', 'High fever'],
    answer: 'Sudden drop in blood pressure',
    explanation: 'Reduced brain blood flow causes syncope.',
  },
  {
    id: 2,
    question: 'Warning sign before fainting:',
    options: ['Chest pain', 'Sudden hunger', 'Lightheadedness/dizziness', 'Shortness of breath'],
    answer: 'Lightheadedness/dizziness',
    explanation: 'Often occurs prior to fainting.',
  },
  {
    id: 3,
    question: 'First step when someone faints:',
    options: ['Give water', 'Call emergency', 'Lay flat and elevate legs', 'Offer food'],
    answer: 'Lay flat and elevate legs',
    explanation: 'Helps restore blood flow to brain.',
  },
  {
    id: 4,
    question: 'Splash water on a fainted person?',
    options: ['Yes, always', 'Only if wet', 'No, not recommended', 'Yes, for children'],
    answer: 'No, not recommended',
    explanation: 'Focus on safe positioning and airway.',
  },
  {
    id: 5,
    question: 'Call emergency after fainting when:',
    options: ['Always', 'Only if faint again', 'If unresponsive or injured', 'If hungry'],
    answer: 'If unresponsive or injured',
    explanation: 'Seek help if they remain unconscious or were injured.',
  },
];

// 7) 🌞 Heatstroke
const heatstroke = [
  {
    id: 1,
    question: 'Heatstroke is:',
    options: ['A mild sunburn', 'Life-threatening condition', 'Cold illness', 'Dehydration type'],
    answer: 'Life-threatening condition',
    explanation: 'Body overheats and cannot cool down.',
  },
  {
    id: 2,
    question: 'Common sign:',
    options: ['Cool skin', 'Normal temperature', 'High body temperature', 'Slurred speech'],
    answer: 'High body temperature',
    explanation: 'Core temperature > 40°C (104°F).',
  },
  {
    id: 3,
    question: 'First action for heatstroke:',
    options: ['Give hot soup', 'Cover with blankets', 'Move to a cool place', 'Make them run'],
    answer: 'Move to a cool place',
    explanation: 'Immediate cooling is crucial.',
  },
  {
    id: 4,
    question: 'What to avoid:',
    options: ['Call for help', 'Cool them down', 'Give cold water', 'Ignore symptoms'],
    answer: 'Ignore symptoms',
    explanation: 'It’s a medical emergency.',
  },
  {
    id: 5,
    question: 'Cause of heatstroke:',
    options: ['Cold showers', 'Lack of oxygen', 'Prolonged heat exposure', 'Too much sleep'],
    answer: 'Prolonged heat exposure',
    explanation: 'Staying too long in hot environments.',
  },
];

// 8) ⚡ Electric Shock
const electricShock = [
  {
    id: 1,
    question: 'First thing when someone is electrocuted:',
    options: ['Give CPR', 'Pull them away', 'Turn off the power source', 'Check pulse'],
    answer: 'Turn off the power source',
    explanation: 'Ensure your own safety first.',
  },
  {
    id: 2,
    question: 'Do not touch a person still in contact with electricity because:',
    options: ['Contagious', 'Too late', 'You could be electrocuted', 'They may panic'],
    answer: 'You could be electrocuted',
    explanation: 'Current can pass through to you.',
  },
  {
    id: 3,
    question: 'Electric shock can cause:',
    options: ['Nothing serious', 'Only skin burns', 'Internal injuries and heart issues', 'Just tingling'],
    answer: 'Internal injuries and heart issues',
    explanation: 'It can disrupt heart rhythm and damage organs.',
  },
  {
    id: 4,
    question: 'After power off and removing the person:',
    options: ['Start CPR if needed', 'Call emergency', 'Check breathing and pulse', 'All of the above'],
    answer: 'All of the above',
    explanation: 'Provide first aid and seek help immediately.',
  },
  {
    id: 5,
    question: 'Severe electric shock may show:',
    options: ['Sweating', 'Confusion or unconsciousness', 'Itchy skin', 'Shivering'],
    answer: 'Confusion or unconsciousness',
    explanation: 'Serious neurological/cardiac impact.',
  },
];

// 9) 🐕 Animal Bite
const animalBite = [
  {
    id: 1,
    question: 'First step after an animal bite:',
    options: ['Bandage the wound', 'Wash with soap and water', 'Apply ointment', 'Ignore if minor'],
    answer: 'Wash with soap and water',
    explanation: 'Cleaning immediately helps prevent infection/rabies.',
  },
  {
    id: 2,
    question: 'Why know which animal bit you?',
    options: ['Report to police', 'Check rabies risk', 'Keep as a pet', 'Clean the area'],
    answer: 'Check rabies risk',
    explanation: 'Determines post-exposure treatment.',
  },
  {
    id: 3,
    question: 'Seek medical attention when:',
    options: ['Bleeding stops', 'Only if pet', 'If the skin is broken', 'Never'],
    answer: 'If the skin is broken',
    explanation: 'Any broken-skin bite should be evaluated.',
  },
  {
    id: 4,
    question: 'Animal bites can cause:',
    options: ['Infection', 'Allergy', 'Fever only', 'No effect'],
    answer: 'Infection',
    explanation: 'Saliva bacteria can infect the site.',
  },
  {
    id: 5,
    question: 'Highest rabies risk animals:',
    options: ['Rabbits', 'Cows', 'Dogs and bats', 'Chickens'],
    answer: 'Dogs and bats',
    explanation: 'Common vectors in many regions.',
  },
];

// 10) 💨 Smoke Inhalation
const smoke = [
  {
    id: 1,
    question: 'Most immediate danger of smoke inhalation:',
    options: ['Skin burns', 'Dehydration', 'Oxygen deprivation', 'Coughing'],
    answer: 'Oxygen deprivation',
    explanation: 'Smoke displaces oxygen and suffocates quickly.',
  },
  {
    id: 2,
    question: 'Most dangerous gas in smoke:',
    options: ['CO₂', 'Hydrogen', 'Carbon monoxide', 'Nitrogen'],
    answer: 'Carbon monoxide',
    explanation: 'CO binds hemoglobin, blocking oxygen transport.',
  },
  {
    id: 3,
    question: 'Common symptom:',
    options: ['Blurry vision', 'Wheezing and coughing', 'Cold limbs', 'Fever'],
    answer: 'Wheezing and coughing',
    explanation: 'Airway irritation by smoke particles.',
  },
  {
    id: 4,
    question: 'First step for a smoke victim:',
    options: ['Give water', 'Perform CPR', 'Move to fresh air', 'Wrap in blanket'],
    answer: 'Move to fresh air',
    explanation: 'Remove from source immediately.',
  },
  {
    id: 5,
    question: 'Lips might turn what color in severe cases?',
    options: ['Red', 'White', 'Blue or gray', 'Yellow'],
    answer: 'Blue or gray',
    explanation: 'Cyanosis from lack of oxygen.',
  },
];

export const firstAidQuizData = {
  '🔥 Burns': { main: makeAllSublevels(burns) },
  '❤️ CPR': { main: makeAllSublevels(cpr) },
  '🫁 Choking': { main: makeAllSublevels(choking) },
  '🩸 Bleeding': { main: makeAllSublevels(bleeding) },
  '🦴 Fracture': { main: makeAllSublevels(fracture) },
  '😵 Fainting': { main: makeAllSublevels(fainting) },
  '🌞 Heatstroke': { main: makeAllSublevels(heatstroke) },
  '⚡ Electric Shock': { main: makeAllSublevels(electricShock) },
  '🐕 Animal Bite': { main: makeAllSublevels(animalBite) },
  '💨 Smoke Inhalation': { main: makeAllSublevels(smoke) },
};

// 兼容其他导入写法
export default firstAidQuizData;
