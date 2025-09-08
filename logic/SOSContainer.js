// logic/SOSContainer.js
import React, { useMemo, useState } from "react";
import { Alert, Linking, Platform } from "react-native";
import SOSScreen from "../screens/SOSScreen";

// Assets (kept here so the screen is purely presentational)
import IcPolice from "../assets/sos/police.png";
import IcAmb from "../assets/sos/ambulance.png";
import IcNon from "../assets/sos/nonemergency.png";

const OPTIONS = [
  {
    id: "999",
    number: "999",
    title: "Police",
    icon: IcPolice,
    detail: {
      header: "999 - Police",
      sections: [
        {
          title: "When to call :",
          lines: [
            "Crime in progress;",
            "Immediate danger to life or property;",
            "Serious traffic accident.",
          ],
        },
        {
          title: "Do NOT call :",
          lines: [
            "General enquiries;",
            "Minor disputes without danger;",
            "Non-urgent noise or nuisance (use police e-services).",
          ],
        },
        {
          title: "Before calling :",
          lines: [
            "Exact location (block, street, unit);",
            "Brief incident details;",
            "Suspect/vehicle description if any.",
          ],
        },
        {
          title: "What to say :",
          lines: ["1. Location first", "2. What happened", "3. Current risk / injuries"],
        },
      ],
    },
  },
  {
    id: "995",
    number: "995",
    title: "Ambulance / Fire",
    icon: IcAmb,
    detail: {
      header: "995 - Ambulance / Fire",
      sections: [
        {
          title: "When to call :",
          lines: [
            "Unconscious / not breathing / choking;",
            "Chest pain, suspected heart attack;",
            "Stroke signs (face droop, arm weakness, speech difficulty);",
            "Severe bleeding, major trauma, burns, seizures;",
            "Breathing difficulty, anaphylaxis;",
            "Fire / smoke / explosion / gas leak; rescue from height/vehicle/water.",
          ],
        },
        {
          title: "Do NOT call :",
          lines: [
            "Minor ailments (fever, mild pain, small cuts);",
            "Non-urgent transport to clinic/hospital;",
            "Stable chronic conditions or routine follow-up;",
            "Hospital transfer without doctor’s instruction.",
          ],
        },
        {
          title: "Before calling :",
          lines: [
            "Exact location & access (block, street, unit, entry code);",
            "Patient age/sex and condition (symptoms, consciousness, bleeding);",
            "Number of casualties;",
            "Hazards present (fire, smoke, chemicals, traffic);",
            "Callback phone number.",
          ],
        },
        {
          title: "What to say :",
          lines: [
            "1. Location & how to access",
            "2. What happened & patient condition",
            "3. Immediate risks / special needs (mobility, oxygen, contagious risk)",
          ],
        },
      ],
    },
  },
  {
    id: "1777",
    number: "1777",
    title: "Non-Emergency",
    icon: IcNon,
    detail: {
      header: "1777 - Non-Emergency Ambulance",
      sections: [
        {
          title: "Use for :",
          lines: [
            "Non-urgent medical transport to clinic/hospital;",
            "Scheduled appointments or discharge/transfer;",
            "Needs wheelchair/stretcher assistance but not time-critical.",
          ],
        },
        {
          title: "Do NOT use :",
          lines: [
            "Life-threatening conditions (use 995);",
            "Fire/explosion or rescue needs;",
            "Suspected stroke/heart attack/major trauma;",
            "If the person can travel safely by own means.",
          ],
        },
        {
          title: "Before calling :",
          lines: [
            "Pickup address & preferred time;",
            "Destination & department/clinic;",
            "Patient details (age, mobility, weight if relevant);",
            "Assistance/equipment (wheelchair, stretcher, oxygen);",
            "Stairs/lift availability; contact phone; payment arrangement.",
          ],
        },
        {
          title: "What to say :",
          lines: [
            "1. Pickup location & time",
            "2. Destination & purpose (appointment/discharge)",
            "3. Patient condition & assistance needed",
          ],
        },
      ],
    },
  },
];

function callNumber(num) {
  const url = Platform.select({ ios: `tel://${num}`, android: `tel:${num}` });
  try {
    Linking.openURL(url);
  } catch {
    Alert.alert("Cannot place call", `Please dial ${num} manually.`);
  }
}

export default function SOSContainer() {
  const [selectedId, setSelectedId] = useState(OPTIONS[0].id);

  const selectedOption = useMemo(
    () => OPTIONS.find((o) => o.id === selectedId) || OPTIONS[0],
    [selectedId]
  );

  return (
    <SOSScreen
      options={OPTIONS}
      selectedOption={selectedOption}
      onSelect={setSelectedId}
      onCall={callNumber}
    />
  );
}
