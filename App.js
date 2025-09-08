// App.js
import "react-native-gesture-handler";
import React, { useEffect, useState, useMemo } from "react";
import { Image, ActivityIndicator, View, Platform } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { supabase } from "./supabaseClient";
import { touchDailyStreak } from "./utils/achievements";

/* ✅ 通知：Expo Notifications */
import * as Notifications from "expo-notifications";

// ========= Screens =========
import HomeContainer from "./logic/HomeContainer";
import CombinedQuizHubContainer from "./logic/CombinedQuizHubContainer";
import KnowledgeScreen from "./screens/KnowledgeScreen";
import ResultContainer from "./logic/ResultContainer";
import ProfileContainer from "./logic/ProfileContainer";

import QuizGameScreen from "./screens/quiz/QuizGameScreen";
import SubLevelScreen from "./screens/quiz/SubLevelScreen";
import QuizScreen from "./screens/quiz/QuizScreen";
import AttemptDetailScreen from "./screens/quiz/AttemptDetailScreen";
import ResultShareScreen from "./screens/quiz/ResultShareScreen";

import DisasterPreparedness from "./logic/DisasterPreparednessContainer";
import DisasterSubLevelContainer from "./logic/DisasterSubLevelContainer";
import DisasterQuiz from "./logic/DisasterQuizContainer";
import EverydayFirstAidContainer from "./logic/EverydayFirstAidContainer";
import EverydaySubLevelScreen from "./screens/firstaid/EverydaySubLevelScreen";
import EverydayQuizScreen from "./screens/firstaid/EverydayQuizScreen";
import FirstAidResultScreen from "./screens/firstaid/FirstAidResultScreen";

import HazardsHubScreen from "./screens/knowledge/hazard/HazardsHubScreen";
import HazardLearnScreen from "./screens/knowledge/hazard/HazardLearnScreen";

import EverydayHubScreen from "./screens/knowledge/everyday/EverydayHubScreen";
import EverydayLearnScreen from "./screens/knowledge/everyday/EverydayLearnScreen";

import ResourceHubScreen from "./screens/knowledge/quickaccess/ResourceHubScreen";
import BookmarksScreen from "./screens/knowledge/quickaccess/BookmarksScreen";
import CPRTrainingScreen from "./screens/knowledge/quickaccess/CPRTrainingScreen";

import AchievementGallery from "./logic/AchievementGalleryContainer";
import ChecklistContainer from "./logic/ChecklistContainer";
import WeatherMapContainer from "./logic/WeatherMapContainer";
import SOSContainer from "./logic/SOSContainer";
import ChatbotScreen from "./screens/ChatbotScreen";

import LoginScreen from "./auth/LoginScreen";
import RegisterScreen from "./auth/RegisterScreen";
import ForgotPassword from "./auth/ForgotPasswordScreen";

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();
const Auth = createNativeStackNavigator();

const TAB_ICONS = {
  Home: require("./assets/underbutton/home.png"),
  Quiz: require("./assets/underbutton/quiz.png"),
  Knowledge: require("./assets/underbutton/knowledge.png"),
  Result: require("./assets/underbutton/result.png"),
  Profile: require("./assets/underbutton/profile.png"),
};

function TabIcon({ routeName, focused }) {
  const source = TAB_ICONS[routeName];
  return (
    <Image
      source={source}
      style={{ width: 24, height: 24, tintColor: focused ? "#2196f3" : "gray" }}
      resizeMode="contain"
    />
  );
}

/* ✅ 通知显示策略（前台也弹横幅 + 声音） */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

function MainTabsWithInsets() {
  const insets = useSafeAreaInsets();
  const screenOptions = useMemo(
    () => ({
      headerShown: false,
      tabBarHideOnKeyboard: true,
      lazy: true,
      unmountOnBlur: false,
      tabBarActiveTintColor: "#2196f3",
      tabBarInactiveTintColor: "gray",
      tabBarLabelStyle: { fontSize: 12 },
    }),
    []
  );

  return (
    <Tab.Navigator
      sceneContainerStyle={{
        paddingBottom: insets.bottom,
        paddingLeft: insets.left,
        paddingRight: insets.right,
      }}
      screenOptions={({ route }) => ({
        ...screenOptions,
        tabBarIcon: ({ focused }) => (
          <TabIcon routeName={route.name} focused={focused} />
        ),
      })}
      initialRouteName="Home"
    >
      <Stack.Screen name="Quiz" component={CombinedQuizHubContainer} />
      <Tab.Screen name="Knowledge" component={KnowledgeScreen} />
      <Tab.Screen name="Home" component={HomeContainer} />
      <Tab.Screen name="Result" component={ResultContainer} />
      <Tab.Screen name="Profile" component={ProfileContainer} />
    </Tab.Navigator>
  );
}

function AppStackWithInsets() {
  const insets = useSafeAreaInsets();
  return (
    <Stack.Navigator
      initialRouteName="Main"
      screenOptions={{
        headerShown: false,
        animation: "slide_from_right",
        contentStyle: {
          paddingBottom: insets.bottom,
          paddingLeft: insets.left,
          paddingRight: insets.right,
        },
      }}
    >
      <Stack.Screen name="Main" component={MainTabsWithInsets} />

      {/* Knowledge » Hazards */}
      <Stack.Screen name="HazardsHub" component={HazardsHubScreen} />
      <Stack.Screen name="HazardLearn" component={HazardLearnScreen} />
      <Stack.Screen name="HazardGuides" component={HazardsHubScreen} />

      {/* Knowledge » Everyday */}
      <Stack.Screen name="EverydayHub" component={EverydayHubScreen} />
      <Stack.Screen name="EverydayLearn" component={EverydayLearnScreen} />
      <Stack.Screen name="FirstAidGuides" component={EverydayHubScreen} />

      {/* Knowledge » Quick Access */}
      <Stack.Screen name="ResourceHub" component={ResourceHubScreen} />
      <Stack.Screen name="Bookmarks" component={BookmarksScreen} />
      <Stack.Screen name="CPRTrainingScreen" component={CPRTrainingScreen} />

      {/* 从 Hub 进入的灾害选择（复用 QuizScreen） */}
      <Stack.Screen name="DisasterSelect" component={QuizScreen} />

      {/* Disaster Preparedness */}
      <Stack.Screen
        name="DisasterPreparedness"
        component={DisasterPreparedness}
      />
      <Stack.Screen
        name="DisasterSubLevel"
        component={DisasterSubLevelContainer}
      />
      <Stack.Screen name="DisasterQuiz" component={DisasterQuiz} />

      {/* quiz 流程 */}
      <Stack.Screen name="SubLevel" component={SubLevelScreen} />
      <Stack.Screen name="QuizGame" component={QuizGameScreen} />
      <Stack.Screen name="ResultShare" component={ResultShareScreen} />
      <Stack.Screen name="FirstAidResult" component={FirstAidResultScreen} />

      {/* Everyday First Aid flows */}
      <Stack.Screen
        name="EverydayFirstAid"
        component={EverydayFirstAidContainer}
      />
      <Stack.Screen
        name="EverydaySubLevel"
        component={EverydaySubLevelScreen}
      />
      <Stack.Screen name="EverydayQuiz" component={EverydayQuizScreen} />

      {/* Utilities */}
      <Stack.Screen name="AchievementGallery" component={AchievementGallery} />
      <Stack.Screen name="Checklist" component={ChecklistContainer} />
      <Stack.Screen name="AttemptDetail" component={AttemptDetailScreen} />

      {/* Chatbot - 整页 */}
      <Stack.Screen
        name="Chatbot"
        component={ChatbotScreen}
        options={{ presentation: "card" }}
      />

      {/* Full-screen Map */}
      <Stack.Screen
        name="WeatherMap"
        component={WeatherMapContainer}
        options={{
          presentation: "fullScreenModal",
          animation: "slide_from_bottom",
        }}
      />

      {/* SOS */}
      <Stack.Screen
        name="SOS"
        component={SOSContainer}
        options={{ presentation: "modal", animation: "slide_from_bottom" }}
      />
    </Stack.Navigator>
  );
}

function AuthStackWithInsets() {
  const insets = useSafeAreaInsets();
  return (
    <Auth.Navigator
      initialRouteName="Login"
      screenOptions={{
        headerShown: false,
        contentStyle: {
          paddingBottom: insets.bottom,
          paddingLeft: insets.left,
          paddingRight: insets.right,
        },
      }}
    >
      <Auth.Screen name="Login" component={LoginScreen} />
      <Auth.Screen name="Register" component={RegisterScreen} />
      <Auth.Screen name="ForgotPassword" component={ForgotPassword} />
    </Auth.Navigator>
  );
}

export default function App() {
  const [initializing, setInitializing] = useState(true);
  const [session, setSession] = useState(null);

  /* ✅ Android 通知通道（保证高优先级 & 有声音/震动） */
  useEffect(() => {
    if (Platform.OS === "android") {
      Notifications.setNotificationChannelAsync("alerts", {
        name: "Alerts",
        importance: Notifications.AndroidImportance.HIGH,
        sound: "default",
        vibrationPattern: [0, 250, 250, 250],
        enableVibrate: true,
        lockscreenVisibility:
          Notifications.AndroidNotificationVisibility.PUBLIC,
      }).catch(() => {});
    }
  }, []);

  // ✅ 启动 App 时进行一次“每日打卡”（内部去重）
  useEffect(() => {
    touchDailyStreak().catch(() => {});
  }, []);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session ?? null);
      setInitializing(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange(
      (_event, _session) => {
        setSession(_session ?? null);
      }
    );
    return () => {
      mounted = false;
      sub?.subscription?.unsubscribe?.();
      sub?.unsubscribe?.();
    };
  }, []);

  if (initializing) {
    return (
      <SafeAreaProvider>
        <View
          style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
        >
          <ActivityIndicator size="large" />
        </View>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        {session ? <AppStackWithInsets /> : <AuthStackWithInsets />}
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
