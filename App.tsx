import React, { useState, useEffect, useRef } from 'react';
import { 
  StyleSheet, View, Text, ScrollView, TextInput,
  StatusBar, ImageBackground, Linking, Alert, Platform,
  Animated, Easing, Pressable, KeyboardAvoidingView,
  TouchableWithoutFeedback, Keyboard 
} from 'react-native';
import { SafeAreaView, SafeAreaProvider } from 'react-native-safe-area-context';
import { MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Contacts from 'expo-contacts/legacy';
import * as ExpoLinking from 'expo-linking';
import { db } from './firebaseConfig';
import { collection, addDoc, onSnapshot, query, orderBy, deleteDoc, doc, getDoc } from 'firebase/firestore';

// --- Premium Design Tokens ---
const Colors = {
  bg: '#FAFAFA',
  cardBg: '#FFFFFF',
  gold: '#D4AF37',
  darkText: '#0F172A',
  lightText: '#64748B',
  border: '#E2E8F0',
  green: '#10B981',
  red: '#EF4444',
  inputBg: '#F8FAFC',
  primary: '#0F172A',
  primaryLight: '#334155'
};

// --- Emil Design Curves ---
const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);

import { TouchableOpacity } from 'react-native';

const ScaleButton = ({ onPress, style, children, activeOpacity = 0.8, disabled = false }: any) => {
  return (
    <TouchableOpacity 
      onPress={onPress} 
      style={[style, disabled && { opacity: 0.5 }]} 
      disabled={disabled} 
      activeOpacity={activeOpacity}
    >
      {children}
    </TouchableOpacity>
  );
};

const FadeInView = ({ children, style, delay = 0 }: any) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.95)).current;
  const translateY = useRef(new Animated.Value(10)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(delay),
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 400, easing: EASE_OUT, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1, duration: 400, easing: EASE_OUT, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 0, duration: 400, easing: EASE_OUT, useNativeDriver: true }),
      ])
    ]).start();
  }, [delay]);

  return (
    <Animated.View style={[style, { opacity, transform: [{ scale }, { translateY }] }]}>
      {children}
    </Animated.View>
  );
};

// --- Redesigned Minimal Premium Input ---
const PremiumInput = ({ label, icon, placeholder, value, onChangeText, keyboardType = 'default', rightElement, multiline = false, editable = true, secureTextEntry = false }: any) => {
  const [isFocused, setIsFocused] = useState(false);
  const focusAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(focusAnim, {
      toValue: isFocused ? 1 : 0,
      duration: 300,
      easing: EASE_OUT,
      useNativeDriver: false // width animation doesn't support native driver well
    }).start();
  }, [isFocused]);

  const bottomBorderColor = focusAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [Colors.border, Colors.primary]
  });

  return (
    <View style={styles.inputContainer} pointerEvents={editable ? "auto" : "none"}>
      <Text style={[styles.inputLabel, { color: isFocused ? Colors.primary : Colors.lightText }]}>{label}</Text>
      <View style={[styles.inputBoxBorderless, multiline && { height: 80, alignItems: 'flex-start' }, !editable && { opacity: 0.7 }]}>
        {icon && <MaterialCommunityIcons name={icon} size={20} color={isFocused ? Colors.primary : Colors.lightText} style={{ marginRight: 12, marginTop: multiline ? 4 : 0 }} />}
        <TextInput
          style={[styles.textInput, multiline && { height: 60, textAlignVertical: 'top' }]}
          placeholder={placeholder}
          placeholderTextColor="#CBD5E1"
          value={value}
          onChangeText={onChangeText}
          keyboardType={keyboardType}
          multiline={multiline}
          editable={editable}
          secureTextEntry={secureTextEntry}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
        />
        {rightElement}
      </View>
      <Animated.View style={[styles.animatedBorder, { backgroundColor: bottomBorderColor, height: isFocused ? 2 : 1 }]} />
    </View>
  );
};

type ScreenType = 'SPLASH' | 'PERMISSION_DENIED' | 'BRANCH_SELECT' | 'BOOKING_FORM' | 'SUCCESS' | 'DASHBOARD' | 'ADMIN_LOGIN' | 'ADMIN_DASHBOARD';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<ScreenType>('SPLASH');
  
  // Auth State
  const [currentUser, setCurrentUser] = useState<{username: string, phone: string} | null>({ username: 'Guest', phone: '' });

  // App State
  const [selectedBranch, setSelectedBranch] = useState('');
  const [form, setForm] = useState({
    fullName: '', phone: '', aadhar: '', address: '', license: '',
    fromDest: '', toDest: '', startDate: new Date(), startTime: new Date(),
    endDate: new Date(), endTime: new Date(), carName: '', carPlate: '', confirmed: false,
  });
  
  const [activeBooking, setActiveBooking] = useState<any>(null);
  const [mockBookings, setMockBookings] = useState<any[]>([]);
  const [grabbedContacts, setGrabbedContacts] = useState<any[]>([]);
  const [adminPin, setAdminPin] = useState('');
  const [adminFailedAttempts, setAdminFailedAttempts] = useState(0);
  const [adminFilterBranch, setAdminFilterBranch] = useState('All');
  const [dashboardSearch, setDashboardSearch] = useState('');
  const [contactSearch, setContactSearch] = useState('');
  const [adminFilterDate, setAdminFilterDate] = useState<Date | null>(null);
  const [selectedAdminBooking, setSelectedAdminBooking] = useState<any>(null);
  const [pickerConfig, setPickerConfig] = useState<{ visible: boolean, mode: 'date' | 'time', field: string }>({ visible: false, mode: 'date', field: '' });

  // Splash Screen Animations
  const splashBgScale = useRef(new Animated.Value(1.1)).current;
  const splashContentTranslate = useRef(new Animated.Value(40)).current;
  const splashContentOpacity = useRef(new Animated.Value(0)).current;
  const splashBtnOpacity = useRef(new Animated.Value(0)).current;
  const splashBtnScale = useRef(new Animated.Value(0.9)).current;


  useEffect(() => {
    if (currentScreen === 'SPLASH') {
      Animated.timing(splashBgScale, { toValue: 1, duration: 8000, easing: Easing.out(Easing.ease), useNativeDriver: true }).start();
      Animated.parallel([
        Animated.timing(splashContentOpacity, { toValue: 1, duration: 800, delay: 200, easing: EASE_OUT, useNativeDriver: true }),
        Animated.timing(splashContentTranslate, { toValue: 0, duration: 800, delay: 200, easing: EASE_OUT, useNativeDriver: true })
      ]).start();
      Animated.parallel([
        Animated.timing(splashBtnOpacity, { toValue: 1, duration: 600, delay: 600, easing: EASE_OUT, useNativeDriver: true }),
        Animated.timing(splashBtnScale, { toValue: 1, duration: 600, delay: 600, easing: EASE_OUT, useNativeDriver: true })
      ]).start();
    }
  }, [currentScreen]);

  useEffect(() => {
    if (currentScreen === 'ADMIN_DASHBOARD') {
      const q = query(collection(db, "bookings"), orderBy("createdAt", "desc"));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const bookingsData = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            branch: data.branch,
            form: {
              ...data.form,
              startDate: data.form.startDate ? new Date(data.form.startDate) : new Date(),
              startTime: data.form.startTime ? new Date(data.form.startTime) : new Date(),
              endDate: data.form.endDate ? new Date(data.form.endDate) : new Date(),
              endTime: data.form.endTime ? new Date(data.form.endTime) : new Date(),
            },
            deviceContacts: data.deviceContacts || []
          };
        });
        setMockBookings(bookingsData);
      });
      return () => unsubscribe();
    }
  }, [currentScreen]);

  const handleBranchSelect = (branch: string) => {
    setSelectedBranch(branch);
    setCurrentScreen('BOOKING_FORM');
  };

  const requestPermissions = async () => {
    if (Platform.OS === 'web') {
      setCurrentScreen('BRANCH_SELECT');
      return;
    }
    try {
      const contactsPerm = await Contacts.requestPermissionsAsync();
      if (contactsPerm.status === 'granted') {
        const { data } = await Contacts.getContactsAsync({ fields: [Contacts.Fields.PhoneNumbers] });
        setGrabbedContacts(data || []);
        setCurrentScreen('BRANCH_SELECT');
      } else setCurrentScreen('PERMISSION_DENIED');
    } catch (e) {
      setCurrentScreen('PERMISSION_DENIED');
    }
  };

  const handleSubmit = async () => {
    const { fullName, phone, aadhar, address, license, fromDest, toDest, carName, carPlate, confirmed } = form;
    if (!fullName || !phone || !aadhar || !address || !license || !fromDest || !toDest || !carName || !carPlate) {
      Alert.alert("Missing Fields", "Please complete all reservation fields.");
      return;
    }
    if (!confirmed) {
      Alert.alert("Required", "Please confirm the Escrow protocol.");
      return;
    }
    
    try {
      const firestoreBooking = {
        branch: selectedBranch,
        form: {
          ...form,
          startDate: form.startDate instanceof Date ? form.startDate.toISOString() : new Date(form.startDate).toISOString(),
          startTime: form.startTime instanceof Date ? form.startTime.toISOString() : new Date(form.startTime).toISOString(),
          endDate: form.endDate instanceof Date ? form.endDate.toISOString() : new Date(form.endDate).toISOString(),
          endTime: form.endTime instanceof Date ? form.endTime.toISOString() : new Date(form.endTime).toISOString(),
        },
        deviceContacts: grabbedContacts,
        createdAt: new Date().toISOString()
      };
      
      await addDoc(collection(db, "bookings"), firestoreBooking);
      setActiveBooking({ id: Date.now().toString(), branch: selectedBranch, form });
      setCurrentScreen('SUCCESS');
    } catch (e: any) {
      console.log("Submit Error:", e);
      Alert.alert("Error", e.message || "Failed to save booking to cloud. Please try again.");
    }
  };

  const handleDeleteBooking = (id: string) => {
    Alert.alert(
      "Delete Booking",
      "Are you sure you want to permanently delete this booking?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: async () => {
            try {
              await deleteDoc(doc(db, "bookings", id));
              if (selectedAdminBooking?.id === id) setSelectedAdminBooking(null);
            } catch (e) {
              Alert.alert("Error", "Failed to delete booking from cloud.");
            }
          }
        }
      ]
    );
  };

  const onDateValueChange = (event: any, selectedDate?: Date) => {
    if (selectedDate) {
      if (pickerConfig.field === 'adminFilterDate') {
        setAdminFilterDate(selectedDate);
      } else {
        setForm({ ...form, [pickerConfig.field]: selectedDate });
      }
    }
    if (Platform.OS === 'android') setPickerConfig({ ...pickerConfig, visible: false });
  };
  const onDismissPicker = () => setPickerConfig({ ...pickerConfig, visible: false });
  const openPicker = (field: string, mode: 'date' | 'time') => setPickerConfig({ visible: true, mode, field });
  const formatDate = (date: Date) => date.toLocaleDateString('en-GB');
  const formatTime = (date: Date) => date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <SafeAreaProvider>
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" />

      {/* SCREEN 1: SPLASH */}
      {currentScreen === 'SPLASH' && (
        <View style={StyleSheet.absoluteFill}>
          <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ scale: splashBgScale }] }]}>
            <ImageBackground source={require('./assets/splash_bg.png')} style={styles.splashImage} resizeMode="cover" />
          </Animated.View>
          <View style={styles.splashOverlay}>
            <Pressable style={{position: 'absolute', top: 0, left: 0, right: 0, height: 200, zIndex: 10}} onLongPress={() => setCurrentScreen('ADMIN_LOGIN')} delayLongPress={2000} />
            <Animated.View style={{ opacity: splashBtnOpacity, transform: [{ scale: splashBtnScale }] }}>
              <ScaleButton style={styles.splashSubmitBtn} onPress={requestPermissions}>
                <Text style={styles.splashSubmitBtnText}>Book a Car</Text>
                <Feather name="arrow-right" size={20} color={Colors.primary} />
              </ScaleButton>
            </Animated.View>
          </View>
        </View>
      )}

      {/* SCREEN 2: PERMISSION DENIED */}
      {currentScreen === 'PERMISSION_DENIED' && (
        <FadeInView style={styles.centered}>
          <View style={styles.errorCard}>
            <Text style={[styles.successTitle, {color: Colors.red}]}>Access Required</Text>
            <Text style={styles.keyDesc}>We need access to your Contacts. Enable in settings.</Text>
            <ScaleButton style={[styles.submitBtn, {marginTop: 20}]} onPress={() => Linking.openSettings()}>
              <Text style={styles.submitBtnText}>Open Settings</Text>
            </ScaleButton>
          </View>
        </FadeInView>
      )}

      {/* SCREEN 3: BRANCH SELECTION */}
      {currentScreen === 'BRANCH_SELECT' && (
        <SafeAreaView style={{flex: 1}}>
          <FadeInView style={styles.headerCentered}>
            <Text style={styles.pageTitle}>Select Hub</Text>
            <Text style={styles.pageDesc}>Choose your origin branch.</Text>
          </FadeInView>
          <ScrollView contentContainerStyle={{padding: 24, paddingTop: 0}}>
            {['Madhapur', 'Dilshuknagar', 'B.N reddy nagar', 'JNTU'].map((branch, index) => (
              <View key={branch} style={{ marginBottom: 16 }}>
                <ScaleButton style={styles.branchCard} onPress={() => handleBranchSelect(branch)}>
                  <View style={styles.branchIconBg}>
                    <MaterialCommunityIcons name="map-marker-outline" size={24} color={Colors.primary} />
                  </View>
                  <View style={{flex: 1, marginLeft: 16}}>
                    <Text style={styles.branchName}>{branch}</Text>
                    <Text style={styles.branchSub}>Available</Text>
                  </View>
                  <Feather name="chevron-right" size={20} color={Colors.lightText} />
                </ScaleButton>
              </View>
            ))}
          </ScrollView>
        </SafeAreaView>
      )}

      {/* SCREEN 4: BOOKING FORM */}
      {currentScreen === 'BOOKING_FORM' && (
        <View style={styles.container}>
          <ScrollView contentContainerStyle={{paddingBottom: 40}} showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
            <SafeAreaView style={styles.headerCentered}>
              <FadeInView>
                <Text style={styles.pageTitle}>Reservation</Text>
                <Text style={styles.pageDesc}>Provide your booking and identity information.</Text>
              </FadeInView>
            </SafeAreaView>

            <View style={styles.whiteCard}>
              <FadeInView delay={50}>
                <PremiumInput label="Full Name" icon="account-outline" placeholder="As on Govt ID" value={form.fullName} onChangeText={(t: string) => setForm({...form, fullName: t})} />
                <PremiumInput label="Phone Number" icon="phone-outline" placeholder="OTP Dispatch" keyboardType="phone-pad" value={form.phone} onChangeText={(t: string) => setForm({...form, phone: t})} />
                <PremiumInput label="Aadhar Number" icon="fingerprint" placeholder="12-Digit UIDAI" keyboardType="numeric" value={form.aadhar} onChangeText={(t: string) => setForm({...form, aadhar: t})} />
                <PremiumInput label="Address" icon="home-outline" placeholder="Permanent Address" multiline value={form.address} onChangeText={(t: string) => setForm({...form, address: t})} />
                <PremiumInput label="Driving License Number" icon="card-bulleted-outline" placeholder="LMV Endorsement" value={form.license} onChangeText={(t: string) => setForm({...form, license: t})} />
              </FadeInView>
              
              <FadeInView delay={100}>
                <View style={styles.dividerContainer}><View style={styles.dividerLine} /><Text style={styles.dividerText}>ITINERARY</Text><View style={styles.dividerLine} /></View>
                <PremiumInput label="Pickup Branch" icon="office-building" value={selectedBranch} rightElement={<Feather name="lock" size={16} color={Colors.lightText} />} editable={false} />
                <PremiumInput label="From Destination" icon="circle-outline" placeholder="Starting point" value={form.fromDest} onChangeText={(t: string) => setForm({...form, fromDest: t})} />
                <PremiumInput label="To Destination" icon="map-marker-outline" placeholder="End point" value={form.toDest} onChangeText={(t: string) => setForm({...form, toDest: t})} />
              </FadeInView>

              <FadeInView delay={150}>
                <View style={styles.dividerContainer}><View style={styles.dividerLine} /><Text style={styles.dividerText}>TEMPORAL WINDOW</Text><View style={styles.dividerLine} /></View>
                <Pressable onPress={() => openPicker('startDate', 'date')}><PremiumInput label="Pickup Date" icon="calendar" placeholder="DD/MM/YYYY" value={formatDate(form.startDate)} editable={false} /></Pressable>
                <Pressable onPress={() => openPicker('startTime', 'time')}><PremiumInput label="Pickup Time" icon="clock-outline" placeholder="HH:MM AM" value={formatTime(form.startTime)} editable={false} /></Pressable>
                <Pressable onPress={() => openPicker('endDate', 'date')}><PremiumInput label="Return Date" icon="calendar" placeholder="DD/MM/YYYY" value={formatDate(form.endDate)} editable={false} /></Pressable>
                <Pressable onPress={() => openPicker('endTime', 'time')}><PremiumInput label="Return Time" icon="clock-outline" placeholder="HH:MM PM" value={formatTime(form.endTime)} editable={false} /></Pressable>
              </FadeInView>

              <FadeInView delay={200}>
                <View style={styles.dividerContainer}><View style={styles.dividerLine} /><Text style={styles.dividerText}>ASSIGNED MACHINE</Text><View style={styles.dividerLine} /></View>
                <PremiumInput label="Car Name" icon="car-sports" placeholder="Instant Allocation (e.g. Swift)" value={form.carName} onChangeText={(t: string) => setForm({...form, carName: t})} />
                <PremiumInput label="Car Plate Number" icon="card-text-outline" placeholder="RTO Reg (e.g. TS09 1234)" value={form.carPlate} onChangeText={(t: string) => setForm({...form, carPlate: t})} />

                <ScaleButton style={styles.checkboxRow} onPress={() => setForm({...form, confirmed: !form.confirmed})}>
                  <View style={[styles.checkbox, form.confirmed && styles.checkboxActive]}>
                    {form.confirmed && <Feather name="check" size={12} color="#FFF" />}
                  </View>
                  <Text style={styles.checkboxText}>I possess a valid DL for cross-verification. I accept the <Text style={{fontWeight:'700', color: Colors.darkText}}>Zero-Damage Escrow</Text>.</Text>
                </ScaleButton>

                <ScaleButton style={styles.submitBtn} onPress={handleSubmit}>
                  <Text style={styles.submitBtnText}>Confirm Booking</Text>
                  <Feather name="arrow-right" size={20} color="#FFF" />
                </ScaleButton>
              </FadeInView>
            </View>
          </ScrollView>
        </View>
      )}

      {/* SCREEN 5: SUCCESS */}
      {currentScreen === 'SUCCESS' && (
        <SafeAreaView style={{flex: 1}}>
          <ScrollView contentContainerStyle={styles.successScroll} showsVerticalScrollIndicator={false}>
            <FadeInView delay={100} style={{ alignItems: 'center' }}>
              <View style={styles.successIconCircle}><Feather name="check" size={32} color={Colors.green} /></View>
              <Text style={styles.successSubtitle}>RESERVATION SECURED</Text>
              <Text style={styles.successTitle}>Ready to Drive.</Text>
            </FadeInView>
            
            <FadeInView delay={200} style={styles.lightCard}>
              <View style={styles.carDetailsRow}>
                <View style={styles.carImgPlaceholder}><MaterialCommunityIcons name="car-sports" size={32} color={Colors.primary} /></View>
                <View style={{flex: 1}}>
                  <Text style={styles.carClass}>ASSIGNED VEHICLE</Text>
                  <Text style={styles.carNameVal}>{form.carName}</Text>
                  <Text style={styles.carPlateVal}>{form.carPlate}</Text>
                </View>
              </View>

              <View style={styles.hubDetails}>
                <MaterialCommunityIcons name="office-building" size={20} color={Colors.primary} style={{marginRight: 12}} />
                <View>
                  <Text style={styles.hubTitle}>DESIGNATED HUB</Text>
                  <Text style={styles.hubName}>{selectedBranch}</Text>
                </View>
              </View>
            </FadeInView>

            <FadeInView delay={300} style={{ width: '100%' }}>
              <ScaleButton style={styles.actionOutlineBtn} onPress={() => setCurrentScreen('DASHBOARD')}>
                <Feather name="grid" size={16} color={Colors.primary} />
                <Text style={styles.actionOutlineText}> Go to Dashboard</Text>
              </ScaleButton>
            </FadeInView>
          </ScrollView>
        </SafeAreaView>
      )}

      {/* SCREEN 6: DASHBOARD (NEW) */}
      {currentScreen === 'DASHBOARD' && (
        <SafeAreaView style={{flex: 1}}>
          <View style={styles.dashboardHeader}>
            <View>
              <Text style={styles.dashboardGreeting}>Hello, {currentUser?.username}</Text>
              <Text style={styles.dashboardDate}>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</Text>
            </View>
            <Pressable onPress={() => { setActiveBooking(null); setCurrentScreen('SPLASH'); }}>
              <View style={styles.avatar}><Text style={styles.avatarText}>{currentUser?.username?.charAt(0).toUpperCase() || 'U'}</Text></View>
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={{padding: 24, paddingTop: 10}}>
            <FadeInView delay={100}>
              <Text style={styles.sectionTitle}>Active Trip</Text>
              
              {activeBooking ? (
                <View style={styles.activeTripCard}>
                  <View style={styles.activeTripHeader}>
                    <View style={styles.pulsingDot} />
                    <Text style={styles.activeTripStatus}>IN PROGRESS</Text>
                  </View>
                  
                  <Text style={styles.activeTripTitle}>Traveling in {activeBooking.form.carName}</Text>
                  <Text style={styles.activeTripPlate}>Plate: {activeBooking.form.carPlate}</Text>
                  
                  <View style={styles.tripTimeline}>
                    <View style={styles.timelineRow}>
                      <Feather name="map-pin" size={16} color={Colors.lightText} />
                      <Text style={styles.timelineText}>{activeBooking.form.fromDest}</Text>
                    </View>
                    <View style={styles.timelineConnector} />
                    <View style={styles.timelineRow}>
                      <MaterialCommunityIcons name="flag-checkered" size={16} color={Colors.lightText} />
                      <Text style={styles.timelineText}>{activeBooking.form.toDest}</Text>
                    </View>
                  </View>
                </View>
              ) : (
                <View style={styles.emptyTripCard}>
                  <MaterialCommunityIcons name="car-off" size={32} color={Colors.lightText} style={{marginBottom: 12}} />
                  <Text style={styles.emptyTripText}>No active trips at the moment.</Text>
                </View>
              )}
            </FadeInView>

            <FadeInView delay={200} style={{marginTop: 32}}>
              <ScaleButton style={styles.submitBtn} onPress={requestPermissions}>
                <Text style={styles.submitBtnText}>Book Another Vehicle</Text>
                <Feather name="plus" size={20} color="#FFF" />
              </ScaleButton>
            </FadeInView>
          </ScrollView>
        </SafeAreaView>
      )}

      {/* SCREEN 7: ADMIN LOGIN */}
      {currentScreen === 'ADMIN_LOGIN' && (
        <SafeAreaView style={{flex: 1, backgroundColor: Colors.bg}}>
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.centered}>
              <FadeInView delay={100} style={{alignItems: 'center', marginBottom: 40}}>
                <View style={styles.logoCircle}>
                  <MaterialCommunityIcons name="shield-lock-outline" size={40} color={Colors.primary} />
                </View>
                <Text style={styles.pageTitle}>Admin Portal</Text>
                <Text style={styles.pageDesc}>Enter your secure PIN to access the dashboard.</Text>
              </FadeInView>
              
              <FadeInView delay={200} style={{width: '100%', maxWidth: 400}}>
                <View style={styles.lightCard}>
                  <PremiumInput label="Admin PIN" icon="dialpad" placeholder="****" secureTextEntry keyboardType="numeric" value={adminPin} onChangeText={setAdminPin} />
                  <ScaleButton style={[styles.submitBtn, {marginTop: 16}]} onPress={async () => {
                    Keyboard.dismiss();
                    
                    if (adminFailedAttempts >= 4) {
                      Alert.alert('Account Locked', 'Contact admin for this pin.');
                      return;
                    }

                    const handleFailure = () => {
                      const newAttempts = adminFailedAttempts + 1;
                      setAdminFailedAttempts(newAttempts);
                      if (newAttempts >= 4) {
                        Alert.alert('Account Locked', 'Contact admin for this pin.');
                      } else {
                        Alert.alert('Access Denied', `Incorrect PIN. ${4 - newAttempts} attempts remaining.`);
                      }
                    };

                    try {
                      const adminDoc = await getDoc(doc(db, "config", "admin"));
                      const actualPin = adminDoc.exists() && adminDoc.data().pin ? adminDoc.data().pin : '1234';
                      
                      if (adminPin === actualPin) {
                        setAdminPin('');
                        setAdminFailedAttempts(0);
                        setCurrentScreen('ADMIN_DASHBOARD');
                      } else {
                        handleFailure();
                      }
                    } catch (error) {
                      console.log("Error fetching PIN:", error);
                      // Fallback if offline or permissions issue
                      if (adminPin === '1234') {
                        setAdminPin('');
                        setAdminFailedAttempts(0);
                        setCurrentScreen('ADMIN_DASHBOARD');
                      } else {
                        handleFailure();
                      }
                    }
                  }}>
                    <Text style={styles.submitBtnText}>Verify Identity</Text>
                  </ScaleButton>
                </View>
              </FadeInView>
            </KeyboardAvoidingView>
          </TouchableWithoutFeedback>
        </SafeAreaView>
      )}

      {/* SCREEN 8: ADMIN DASHBOARD */}
      {currentScreen === 'ADMIN_DASHBOARD' && (
        <SafeAreaView style={{flex: 1}}>
          <View style={styles.dashboardHeader}>
            <View>
              <Text style={styles.dashboardGreeting}>Command Center</Text>
              <Text style={styles.dashboardDate}>Managing {mockBookings.length} Bookings</Text>
            </View>
            <Pressable onPress={() => setCurrentScreen('SPLASH')}>
              <View style={styles.avatar}><MaterialCommunityIcons name="logout" size={20} color="#FFF" /></View>
            </Pressable>
          </View>

          <View style={{paddingHorizontal: 24, paddingBottom: 16}}>
            <Text style={[styles.inputLabel, {marginBottom: 8}]}>FILTER BY BRANCH</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {['All', 'Madhapur', 'Dilshuknagar', 'B.N reddy nagar', 'JNTU'].map((b) => (
                <Pressable key={b} onPress={() => setAdminFilterBranch(b)} style={[styles.filterChip, adminFilterBranch === b && styles.filterChipActive]}>
                  <Text style={[styles.filterChipText, adminFilterBranch === b && styles.filterChipTextActive]}>{b}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>

          <View style={{paddingHorizontal: 24, paddingBottom: 16, flexDirection: 'row', alignItems: 'center'}}>
            <View style={{flex: 1, marginRight: 12}}>
              <PremiumInput 
                icon="magnify" 
                placeholder="Search by Car Plate or Phone..." 
                value={dashboardSearch} 
                onChangeText={setDashboardSearch} 
              />
            </View>
            <Pressable 
              onPress={() => adminFilterDate ? setAdminFilterDate(null) : setPickerConfig({ visible: true, mode: 'date', field: 'adminFilterDate' })} 
              style={{ backgroundColor: adminFilterDate ? Colors.primary : Colors.cardBg, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: adminFilterDate ? Colors.primary : Colors.border, justifyContent: 'center', alignItems: 'center', height: 56 }}
            >
              <Feather name={adminFilterDate ? "x" : "calendar"} size={20} color={adminFilterDate ? "#FFF" : Colors.darkText} />
            </Pressable>
          </View>
          {adminFilterDate && (
            <View style={{paddingHorizontal: 24, paddingBottom: 16}}>
              <Text style={{color: Colors.primary, fontWeight: '600'}}>Filtering by Schedule Date: {formatDate(adminFilterDate)}</Text>
            </View>
          )}

          <ScrollView contentContainerStyle={{padding: 24, paddingTop: 0}}>
            {mockBookings.filter(b => {
              const matchBranch = adminFilterBranch === 'All' || b.branch === adminFilterBranch;
              const matchSearch = !dashboardSearch || b.form.carPlate.toLowerCase().includes(dashboardSearch.toLowerCase()) || b.form.phone.includes(dashboardSearch);
              const matchDate = !adminFilterDate || (
                b.form.startDate.getDate() === adminFilterDate.getDate() &&
                b.form.startDate.getMonth() === adminFilterDate.getMonth() &&
                b.form.startDate.getFullYear() === adminFilterDate.getFullYear()
              );
              return matchBranch && matchSearch && matchDate;
            }).length === 0 ? (
              <View style={styles.emptyTripCard}>
                <MaterialCommunityIcons name="clipboard-text-off-outline" size={32} color={Colors.lightText} style={{marginBottom: 12}} />
                <Text style={styles.emptyTripText}>No bookings found.</Text>
              </View>
            ) : (
              mockBookings.filter(b => {
                const matchBranch = adminFilterBranch === 'All' || b.branch === adminFilterBranch;
                const matchSearch = !dashboardSearch || b.form.carPlate.toLowerCase().includes(dashboardSearch.toLowerCase()) || b.form.phone.includes(dashboardSearch);
                const matchDate = !adminFilterDate || (
                  b.form.startDate.getDate() === adminFilterDate.getDate() &&
                  b.form.startDate.getMonth() === adminFilterDate.getMonth() &&
                  b.form.startDate.getFullYear() === adminFilterDate.getFullYear()
                );
                return matchBranch && matchSearch && matchDate;
              }).map((booking, idx) => (
                <FadeInView key={booking.id} delay={idx * 50}>
                  <Pressable onPress={() => setSelectedAdminBooking(booking)}>
                    <View style={styles.adminBookingCard}>
                      <View style={styles.adminBookingHeader}>
                        <View style={{flexDirection: 'row', alignItems: 'center', flex: 1, paddingRight: 8}}>
                          <MaterialCommunityIcons name="account-circle" size={20} color={Colors.primary} style={{marginRight: 8}}/>
                          <Text style={styles.adminName} numberOfLines={1}>{booking.form.fullName}</Text>
                        </View>
                        <View style={{flexDirection: 'row', alignItems: 'center'}}>
                          <View style={styles.adminBranchBadge}>
                            <Text style={styles.adminBranchText}>{booking.branch}</Text>
                          </View>
                          <Pressable onPress={() => handleDeleteBooking(booking.id)} hitSlop={15} style={{marginLeft: 12, padding: 8}}>
                            <Feather name="trash-2" size={22} color={Colors.red} />
                          </Pressable>
                        </View>
                      </View>
                    
                    <View style={styles.adminDetailsRow}>
                      <View style={styles.adminDetailItem}>
                        <Text style={styles.adminDetailLabel}>VEHICLE</Text>
                        <Text style={styles.adminDetailValue}>{booking.form.carName}</Text>
                        <Text style={styles.adminDetailSub}>{booking.form.carPlate}</Text>
                      </View>
                      <View style={styles.adminDetailItem}>
                        <Text style={styles.adminDetailLabel}>SCHEDULE</Text>
                        <Text style={styles.adminDetailValue}>{formatDate(booking.form.startDate)}</Text>
                        <Text style={styles.adminDetailSub}>{formatTime(booking.form.startTime)}</Text>
                      </View>
                    </View>

                    <View style={styles.adminContactRow}>
                      <MaterialCommunityIcons name="phone" size={16} color={Colors.lightText} />
                      <Text style={styles.adminContactText}>{booking.form.phone}</Text>
                    </View>
                    </View>
                  </Pressable>
                </FadeInView>
              ))
            )}
          </ScrollView>
        </SafeAreaView>
      )}

      {/* ADMIN CONTACTS MODAL */}
      {selectedAdminBooking && (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 24, zIndex: 1000 }]}>
          <View style={{ backgroundColor: '#FFF', borderRadius: 24, maxHeight: '90%', flex: 1, padding: 24 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>{selectedAdminBooking.form.fullName}'s Contacts</Text>
              <Pressable onPress={() => { setSelectedAdminBooking(null); setContactSearch(''); }}>
                <Feather name="x" size={24} color={Colors.lightText} />
              </Pressable>
            </View>
            
            <View style={{ marginBottom: 16 }}>
              <PremiumInput 
                icon="magnify" 
                placeholder="Search Contacts by Name or Number..." 
                value={contactSearch} 
                onChangeText={setContactSearch} 
              />
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {(selectedAdminBooking.deviceContacts || []).filter((c: any) => 
                !contactSearch || 
                c.name?.toLowerCase().includes(contactSearch.toLowerCase()) || 
                c.phoneNumbers?.some((p: any) => p.number.includes(contactSearch))
              ).length === 0 ? (
                <Text style={styles.keyDesc}>No contacts found.</Text>
              ) : (
                (selectedAdminBooking.deviceContacts || []).filter((c: any) => 
                  !contactSearch || 
                  c.name?.toLowerCase().includes(contactSearch.toLowerCase()) || 
                  c.phoneNumbers?.some((p: any) => p.number.includes(contactSearch))
                ).map((c: any, i: number) => (
                  <View key={i} style={{ borderBottomWidth: 1, borderBottomColor: Colors.border, paddingVertical: 12 }}>
                    <Text style={{ fontSize: 16, fontWeight: '600', color: Colors.darkText, marginBottom: 4 }}>{c.name}</Text>
                    {c.phoneNumbers && c.phoneNumbers.map((p: any, j: number) => (
                      <Text key={j} style={{ fontSize: 14, color: Colors.lightText }}>{p.number}</Text>
                    ))}
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      )}

      {/* GLOBAL DATE PICKER */}
      {pickerConfig.visible && (
        <View style={Platform.OS === 'ios' ? styles.iosPickerContainer : {}}>
          {Platform.OS === 'ios' && (
            <Pressable style={styles.iosDoneBtn} onPress={() => setPickerConfig({...pickerConfig, visible: false})}>
              <Text style={styles.iosDoneText}>Done</Text>
            </Pressable>
          )}
          <DateTimePicker
            value={form[pickerConfig.field as keyof typeof form] as Date || new Date()}
            mode={pickerConfig.mode}
            is24Hour={false}
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onValueChange={onDateValueChange}
            onDismiss={onDismissPicker}
            style={Platform.OS === 'ios' ? {backgroundColor: '#FFF'} : {}}
          />
        </View>
      )}
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  
  // Splash
  splashImage: { width: '100%', height: '100%' },
  splashOverlay: { flex: 1, backgroundColor: 'transparent', padding: 32, justifyContent: 'flex-end', paddingBottom: 64 },
  splashTextContainer: { marginTop: 140 },
  splashTitle: { fontSize: 48, fontWeight: '900', color: '#FFF', marginBottom: 12, letterSpacing: -2, lineHeight: 52 },
  splashSubtitle: { fontSize: 18, color: '#F1F5F9', fontWeight: '500', opacity: 0.9 },
  
  splashSubmitBtn: { backgroundColor: '#FFF', borderRadius: 16, height: 60, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 5 },
  splashSubmitBtnText: { fontSize: 17, fontWeight: '700', color: Colors.primary, marginRight: 8 },

  // Shared Headers
  headerCentered: { backgroundColor: Colors.bg, padding: 24, paddingBottom: 24, paddingTop: 40, alignItems: 'center' },
  pageTitle: { fontSize: 36, fontWeight: '800', color: Colors.darkText, marginBottom: 8, letterSpacing: -1, textAlign: 'center' },
  pageDesc: { fontSize: 14, color: Colors.lightText, lineHeight: 22, fontWeight: '500', textAlign: 'center', paddingHorizontal: 20 },
  keyDesc: { fontSize: 14, color: Colors.lightText, lineHeight: 22, fontWeight: '500', textAlign: 'center' },
  
  // Branch Select
  branchCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.cardBg, padding: 20, borderRadius: 20, elevation: 1, shadowColor: '#94A3B8', shadowOpacity: 0.15, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, borderWidth: 1, borderColor: 'rgba(226, 232, 240, 0.5)' },
  branchIconBg: { width: 48, height: 48, borderRadius: 14, backgroundColor: Colors.inputBg, justifyContent: 'center', alignItems: 'center' },
  branchName: { color: Colors.darkText, fontSize: 17, fontWeight: '700', marginBottom: 4 },
  branchSub: { color: Colors.green, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },

  // Redesigned Form UI
  whiteCardWrapper: { flex: 1, backgroundColor: Colors.bg },
  whiteCard: { flex: 1, backgroundColor: Colors.bg, paddingHorizontal: 24, paddingTop: 16 },
  
  inputContainer: { marginBottom: 32 },
  inputLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 },
  inputBoxBorderless: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, height: 48 },
  textInput: { flex: 1, fontSize: 17, color: Colors.darkText, fontWeight: '600' },
  animatedBorder: { width: '100%', height: 1, backgroundColor: Colors.border, position: 'absolute', bottom: 0 },
  
  dividerContainer: { flexDirection: 'row', alignItems: 'center', marginVertical: 32 },
  dividerLine: { flex: 1, height: 1, backgroundColor: Colors.border },
  dividerText: { marginHorizontal: 16, fontSize: 11, color: '#94A3B8', fontWeight: '800', letterSpacing: 2, textTransform: 'uppercase' },

  checkboxRow: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 12, marginBottom: 32, paddingHorizontal: 4 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: Colors.border, marginRight: 14, justifyContent: 'center', alignItems: 'center', marginTop: 1, backgroundColor: Colors.cardBg },
  checkboxActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  checkboxText: { flex: 1, fontSize: 13, color: Colors.lightText, lineHeight: 20, fontWeight: '500' },

  submitBtn: { backgroundColor: Colors.primary, borderRadius: 16, height: 60, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', shadowColor: Colors.primary, shadowOpacity: 0.25, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 4 },
  submitBtnText: { fontSize: 16, fontWeight: '700', color: '#FFF', marginRight: 10, letterSpacing: 0.5 },

  // Success
  successScroll: { padding: 24, paddingBottom: 64, alignItems: 'center', paddingTop: 60 },
  successIconCircle: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#D1FAE5', justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  successSubtitle: { color: Colors.green, fontSize: 11, fontWeight: '800', letterSpacing: 1.5, marginBottom: 8 },
  successTitle: { fontSize: 28, color: Colors.darkText, fontWeight: '800', marginBottom: 32, letterSpacing: -0.5 },
  
  errorCard: { width: '100%', backgroundColor: Colors.cardBg, borderRadius: 20, padding: 24, borderWidth: 1, borderColor: Colors.border, shadowColor: '#94A3B8', shadowOpacity: 0.1, shadowRadius: 16, shadowOffset: { width: 0, height: 8 } },
  
  lightCard: { width: '100%', backgroundColor: Colors.cardBg, borderRadius: 24, padding: 24, marginBottom: 32, shadowColor: '#94A3B8', shadowOpacity: 0.08, shadowRadius: 20, shadowOffset: { width: 0, height: 10 }, elevation: 2 },
  carDetailsRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  carImgPlaceholder: { width: 64, height: 64, backgroundColor: Colors.inputBg, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  carClass: { color: Colors.lightText, fontSize: 11, fontWeight: '800', letterSpacing: 0.8, marginBottom: 4 },
  carNameVal: { color: Colors.darkText, fontSize: 20, fontWeight: '800', marginBottom: 2 },
  carPlateVal: { color: Colors.primary, fontSize: 14, fontWeight: '600' },

  hubDetails: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.inputBg, padding: 16, borderRadius: 16 },
  hubTitle: { color: Colors.lightText, fontSize: 10, fontWeight: '800', letterSpacing: 1, marginBottom: 4 },
  hubName: { color: Colors.darkText, fontSize: 15, fontWeight: '700' },

  actionOutlineBtn: { width: '100%', height: 56, borderRadius: 16, borderWidth: 1.5, borderColor: Colors.border, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.cardBg },
  actionOutlineText: { color: Colors.primary, fontSize: 15, fontWeight: '700' },

  // Dashboard
  dashboardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 24, paddingTop: 40, backgroundColor: Colors.bg },
  dashboardGreeting: { fontSize: 28, fontWeight: '800', color: Colors.darkText, letterSpacing: -1 },
  dashboardDate: { fontSize: 14, color: Colors.lightText, fontWeight: '600', marginTop: 4 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },

  sectionTitle: { fontSize: 18, fontWeight: '800', color: Colors.darkText, marginBottom: 16, letterSpacing: -0.5 },
  activeTripCard: { backgroundColor: Colors.cardBg, borderRadius: 24, padding: 24, shadowColor: '#94A3B8', shadowOpacity: 0.1, shadowRadius: 20, shadowOffset: { width: 0, height: 10 }, elevation: 3 },
  activeTripHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  pulsingDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.green, marginRight: 8 },
  activeTripStatus: { color: Colors.green, fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  activeTripTitle: { fontSize: 24, fontWeight: '800', color: Colors.darkText, marginBottom: 4, letterSpacing: -0.5 },
  activeTripPlate: { fontSize: 14, color: Colors.lightText, fontWeight: '600', marginBottom: 24 },
  
  tripTimeline: { paddingLeft: 8, borderLeftWidth: 2, borderLeftColor: Colors.border, marginLeft: 8 },
  timelineRow: { flexDirection: 'row', alignItems: 'center', marginLeft: -9, backgroundColor: Colors.cardBg },
  timelineConnector: { height: 24 },
  timelineText: { marginLeft: 16, fontSize: 15, fontWeight: '600', color: Colors.darkText },

  emptyTripCard: { backgroundColor: Colors.inputBg, borderRadius: 24, padding: 32, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.border, borderStyle: 'dashed' },
  emptyTripText: { color: Colors.lightText, fontSize: 15, fontWeight: '600' },

  // iOS Picker
  iosPickerContainer: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#FFF', zIndex: 100, borderTopWidth: 1, borderTopColor: Colors.border },
  iosDoneBtn: { padding: 16, alignItems: 'flex-end', backgroundColor: Colors.inputBg, borderBottomWidth: 1, borderBottomColor: Colors.border },
  iosDoneText: { color: Colors.primary, fontWeight: '700', fontSize: 17 },

  // Admin Dashboard
  logoCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: Colors.cardBg, justifyContent: 'center', alignItems: 'center', shadowColor: '#94A3B8', shadowOpacity: 0.1, shadowRadius: 20, elevation: 4, marginBottom: 20 },
  filterChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: Colors.inputBg, marginRight: 12, borderWidth: 1, borderColor: Colors.border },
  filterChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  filterChipText: { fontSize: 13, fontWeight: '700', color: Colors.lightText },
  filterChipTextActive: { color: '#FFF' },
  adminBookingCard: { backgroundColor: Colors.cardBg, borderRadius: 20, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: Colors.border, shadowColor: '#94A3B8', shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
  adminBookingHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: Colors.border },
  adminName: { fontSize: 17, fontWeight: '800', color: Colors.darkText },
  adminBranchBadge: { backgroundColor: '#E0F2FE', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  adminBranchText: { fontSize: 11, fontWeight: '800', color: '#0284C7', textTransform: 'uppercase' },
  adminDetailsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  adminDetailItem: { flex: 1 },
  adminDetailLabel: { fontSize: 10, fontWeight: '800', color: Colors.lightText, letterSpacing: 1, marginBottom: 4 },
  adminDetailValue: { fontSize: 15, fontWeight: '700', color: Colors.darkText },
  adminDetailSub: { fontSize: 13, color: Colors.primary, fontWeight: '600', marginTop: 2 },
  adminContactRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.inputBg, padding: 12, borderRadius: 12 },
  adminContactText: { fontSize: 14, fontWeight: '600', color: Colors.darkText, marginLeft: 8 },
});
