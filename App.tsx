import React, { useState, useEffect, useRef } from 'react';
import { 
  StyleSheet, View, Text, ScrollView, TextInput, SafeAreaView, 
  StatusBar, ImageBackground, Linking, Alert, Platform,
  Animated, Easing, Pressable 
} from 'react-native';
import { MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Contacts from 'expo-contacts/legacy';
import * as Notifications from 'expo-notifications';

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
    <View style={styles.inputContainer}>
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
          pointerEvents={editable ? "auto" : "none"}
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

type ScreenType = 'AUTH' | 'SPLASH' | 'PERMISSION_DENIED' | 'BRANCH_SELECT' | 'BOOKING_FORM' | 'SUCCESS' | 'DASHBOARD';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<ScreenType>('AUTH');
  
  // Auth State
  const [isSignUp, setIsSignUp] = useState(false);
  const [authForm, setAuthForm] = useState({ username: '', phone: '', password: '', acceptTerms: false });
  const [currentUser, setCurrentUser] = useState<{username: string, phone: string} | null>(null);

  // App State
  const [selectedBranch, setSelectedBranch] = useState('');
  const [form, setForm] = useState({
    fullName: '', phone: '', aadhar: '', address: '', license: '',
    fromDest: '', toDest: '', startDate: new Date(), startTime: new Date(),
    endDate: new Date(), endTime: new Date(), carName: '', carPlate: '', confirmed: false,
  });
  
  const [activeBooking, setActiveBooking] = useState<any>(null);
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

  const handleAuth = () => {
    if (!authForm.username || !authForm.password || (isSignUp && !authForm.phone)) {
      Alert.alert("Missing Fields", "Please fill in all authentication fields.");
      return;
    }
    if (isSignUp && !authForm.acceptTerms) {
      Alert.alert("Required", "You must accept the usage instructions and terms before proceeding.");
      return;
    }
    setCurrentUser({ username: authForm.username, phone: authForm.phone || 'N/A' });
    setForm({...form, fullName: authForm.username, phone: authForm.phone || ''});
    setCurrentScreen(activeBooking ? 'DASHBOARD' : 'SPLASH');
  };

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
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') finalStatus = (await Notifications.requestPermissionsAsync()).status;
      if (contactsPerm.status === 'granted' && finalStatus === 'granted') {
        Contacts.getContactsAsync({ fields: [Contacts.Fields.PhoneNumbers] }).catch(console.error);
        setCurrentScreen('BRANCH_SELECT');
      } else setCurrentScreen('PERMISSION_DENIED');
    } catch (e) {
      setCurrentScreen('PERMISSION_DENIED');
    }
  };

  const handleSubmit = () => {
    const { fullName, phone, aadhar, address, license, fromDest, toDest, carName, carPlate, confirmed } = form;
    if (!fullName || !phone || !aadhar || !address || !license || !fromDest || !toDest || !carName || !carPlate) {
      Alert.alert("Missing Fields", "Please complete all reservation fields.");
      return;
    }
    if (!confirmed) {
      Alert.alert("Required", "Please confirm the Escrow protocol.");
      return;
    }
    setActiveBooking({ branch: selectedBranch, form });
    setCurrentScreen('SUCCESS');
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    if (event.type === 'dismissed') return setPickerConfig({ ...pickerConfig, visible: false });
    if (selectedDate) setForm({ ...form, [pickerConfig.field]: selectedDate });
    if (Platform.OS === 'android') setPickerConfig({ ...pickerConfig, visible: false });
  };
  const openPicker = (field: string, mode: 'date' | 'time') => setPickerConfig({ visible: true, mode, field });
  const formatDate = (date: Date) => date.toLocaleDateString('en-GB');
  const formatTime = (date: Date) => date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* SCREEN 0: AUTH */}
      {currentScreen === 'AUTH' && (
        <SafeAreaView style={{flex: 1, backgroundColor: Colors.bg}}>
          <ScrollView contentContainerStyle={{flexGrow: 1, justifyContent: 'center', padding: 32}}>
            <FadeInView delay={100} style={{alignItems: 'center', marginBottom: 48}}>
              <View style={styles.logoCircle}>
                <MaterialCommunityIcons name="steering" size={40} color={Colors.primary} />
              </View>
              <Text style={styles.authTitle}>Thandra.</Text>
              <Text style={styles.authSub}>Elite Self-Drive Network</Text>
            </FadeInView>
            
            <FadeInView delay={200}>
              <View style={styles.authCard}>
                <View style={styles.authTabs}>
                  <Pressable style={[styles.authTab, !isSignUp && styles.authTabActive]} onPress={() => setIsSignUp(false)}>
                    <Text style={[styles.authTabText, !isSignUp && styles.authTabTextActive]}>Log In</Text>
                  </Pressable>
                  <Pressable style={[styles.authTab, isSignUp && styles.authTabActive]} onPress={() => setIsSignUp(true)}>
                    <Text style={[styles.authTabText, isSignUp && styles.authTabTextActive]}>Sign Up</Text>
                  </Pressable>
                </View>

                <View style={{padding: 24, paddingTop: 32}}>
                  <PremiumInput label="Username" icon="account-outline" placeholder="Enter your username" value={authForm.username} onChangeText={(t:string) => setAuthForm({...authForm, username: t})} />
                  {isSignUp && (
                    <PremiumInput label="Phone Number" icon="phone-outline" placeholder="Your contact number" keyboardType="phone-pad" value={authForm.phone} onChangeText={(t:string) => setAuthForm({...authForm, phone: t})} />
                  )}
                  <PremiumInput label="Password" icon="lock-outline" placeholder="Enter your password" secureTextEntry value={authForm.password} onChangeText={(t:string) => setAuthForm({...authForm, password: t})} />
                  
                  {isSignUp && (
                    <TouchableOpacity style={[styles.checkboxRow, {marginBottom: 0, marginTop: 24}]} onPress={() => setAuthForm({...authForm, acceptTerms: !authForm.acceptTerms})} activeOpacity={0.8}>
                      <View style={[styles.checkbox, authForm.acceptTerms && styles.checkboxActive]}>
                        {authForm.acceptTerms && <Feather name="check" size={12} color="#FFF" />}
                      </View>
                      <Text style={styles.checkboxText}>I accept the community guidelines and vehicle usage instructions.</Text>
                    </TouchableOpacity>
                  )}
                  
                  <ScaleButton style={[styles.submitBtn, {marginTop: 24}]} onPress={handleAuth}>
                    <Text style={styles.submitBtnText}>{isSignUp ? 'Create Account' : 'Authenticate'}</Text>
                  </ScaleButton>
                </View>
              </View>
            </FadeInView>
          </ScrollView>
        </SafeAreaView>
      )}

      {/* SCREEN 1: SPLASH */}
      {currentScreen === 'SPLASH' && (
        <View style={StyleSheet.absoluteFill}>
          <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ scale: splashBgScale }] }]}>
            <ImageBackground source={require('./assets/splash_bg.jpg')} style={styles.splashImage} resizeMode="cover" />
          </Animated.View>
          <View style={styles.splashOverlay}>
            <Animated.View style={[styles.splashTextContainer, { opacity: splashContentOpacity, transform: [{ translateY: splashContentTranslate }] }]}>
              <Text style={styles.splashTitle}>The Open Road.</Text>
              <Text style={styles.splashSubtitle}>Welcome back, {currentUser?.username}.</Text>
            </Animated.View>
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
            <Text style={styles.keyDesc}>We need access to your Contacts and Notifications. Enable in settings.</Text>
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
          <SafeAreaView style={styles.headerCentered}>
            <FadeInView>
              <Text style={styles.pageTitle}>Reservation</Text>
              <Text style={styles.pageDesc}>Provide your booking and identity information.</Text>
            </FadeInView>
          </SafeAreaView>

          <View style={styles.whiteCardWrapper}>
            <ScrollView style={styles.whiteCard} contentContainerStyle={{paddingBottom: 40}} showsVerticalScrollIndicator={false}>
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
            </ScrollView>
          </View>
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
            <Pressable onPress={() => { setActiveBooking(null); setCurrentUser(null); setCurrentScreen('AUTH'); }}>
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
            onChange={onDateChange}
            style={Platform.OS === 'ios' ? {backgroundColor: '#FFF'} : {}}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  
  // Auth Screen
  logoCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: Colors.cardBg, justifyContent: 'center', alignItems: 'center', shadowColor: '#94A3B8', shadowOpacity: 0.1, shadowRadius: 20, elevation: 4, marginBottom: 20 },
  authTitle: { fontSize: 36, fontWeight: '900', color: Colors.darkText, letterSpacing: -1.5, marginBottom: 4 },
  authSub: { fontSize: 14, color: Colors.lightText, fontWeight: '600', letterSpacing: 1, textTransform: 'uppercase' },
  authCard: { width: '100%', backgroundColor: Colors.cardBg, borderRadius: 24, shadowColor: '#94A3B8', shadowOpacity: 0.1, shadowRadius: 30, elevation: 8, overflow: 'hidden' },
  authTabs: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: Colors.border },
  authTab: { flex: 1, paddingVertical: 20, alignItems: 'center', borderBottomWidth: 3, borderBottomColor: 'transparent' },
  authTabActive: { borderBottomColor: Colors.primary },
  authTabText: { fontSize: 14, fontWeight: '700', color: Colors.lightText, textTransform: 'uppercase', letterSpacing: 1 },
  authTabTextActive: { color: Colors.primary },

  // Splash
  splashImage: { width: '100%', height: '100%' },
  splashOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', padding: 32, justifyContent: 'space-between', paddingBottom: 64 },
  splashTextContainer: { marginTop: 140 },
  splashTitle: { fontSize: 48, fontWeight: '900', color: '#FFF', marginBottom: 12, letterSpacing: -2, lineHeight: 52 },
  splashSubtitle: { fontSize: 18, color: '#F1F5F9', fontWeight: '500', opacity: 0.9 },
  
  splashSubmitBtn: { backgroundColor: '#FFF', borderRadius: 16, height: 60, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 5 },
  splashSubmitBtnText: { fontSize: 17, fontWeight: '700', color: Colors.primary, marginRight: 8 },

  // Shared Headers
  headerCentered: { backgroundColor: Colors.bg, padding: 24, paddingBottom: 24, paddingTop: 40, alignItems: 'center' },
  pageTitle: { fontSize: 36, fontWeight: '800', color: Colors.darkText, marginBottom: 8, letterSpacing: -1, textAlign: 'center' },
  pageDesc: { fontSize: 14, color: Colors.lightText, lineHeight: 22, fontWeight: '500', textAlign: 'center', paddingHorizontal: 20 },
  
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
});
