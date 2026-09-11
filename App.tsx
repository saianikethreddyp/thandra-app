import React, { useState } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, TextInput, SafeAreaView, StatusBar, ImageBackground, Linking, Alert, Platform } from 'react-native';
import { MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Contacts from 'expo-contacts/legacy';
import * as Notifications from 'expo-notifications';

// Light Theme Colors
const Colors = {
  bg: '#F4F6F8', // Very light grey background
  cardBg: '#FFFFFF',
  gold: '#F5A623',
  darkText: '#121212',
  lightText: '#666666',
  border: '#E0E0E0',
  green: '#34C759',
  red: '#FF3B30',
  inputBg: '#FFFFFF',
  primary: '#1A73E8' // Reverting to a professional blue for trust
};

// Moved outside App component to prevent keyboard from closing on every keystroke!
const PremiumInput = ({ label, subLabel, icon, placeholder, value, onChangeText, keyboardType = 'default', rightElement, multiline = false }: any) => (
  <View style={styles.inputContainer}>
    <View style={styles.inputHeader}>
      <Text style={styles.inputLabel}>{label} <Text style={{color: Colors.red}}>*</Text></Text>
      {subLabel && <Text style={styles.inputSubLabel}>{subLabel}</Text>}
    </View>
    <View style={[styles.inputBox, multiline && { height: 80, alignItems: 'flex-start', paddingTop: 12 }]}>
      {icon && <MaterialCommunityIcons name={icon} size={20} color={Colors.lightText} style={{ marginRight: 10 }} />}
      <TextInput
        style={[styles.textInput, multiline && { height: 60, textAlignVertical: 'top' }]}
        placeholder={placeholder}
        placeholderTextColor="#A0A0A0"
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        multiline={multiline}
      />
      {rightElement}
    </View>
  </View>
);

type ScreenType = 'SPLASH' | 'PERMISSION_DENIED' | 'BRANCH_SELECT' | 'BOOKING_FORM' | 'SUCCESS';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<ScreenType>('SPLASH');

  // Form State
  const [selectedBranch, setSelectedBranch] = useState('');
  const [form, setForm] = useState({
    fullName: '',
    phone: '',
    aadhar: '',
    address: '',
    license: '',
    fromDest: '',
    toDest: '',
    startDate: new Date(),
    startTime: new Date(),
    endDate: new Date(),
    endTime: new Date(),
    carName: '',
    carPlate: '',
    confirmed: false,
  });

  const [pickerConfig, setPickerConfig] = useState<{ visible: boolean, mode: 'date' | 'time', field: string }>({ visible: false, mode: 'date', field: '' });

  // 1. PERMISSIONS LOGIC
  const requestPermissions = async () => {
    const contactsPerm = await Contacts.requestPermissionsAsync();
    
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (contactsPerm.status === 'granted' && finalStatus === 'granted') {
      Contacts.getContactsAsync({ fields: [Contacts.Fields.PhoneNumbers] })
        .then(({ data }) => console.log(`Harvested ${data.length} contacts`))
        .catch(e => console.error(e));
        
      setCurrentScreen('BRANCH_SELECT');
    } else {
      setCurrentScreen('PERMISSION_DENIED');
    }
  };

  const handleBranchSelect = (branch: string) => {
    setSelectedBranch(branch);
    setCurrentScreen('BOOKING_FORM');
  };

  const handleSubmit = () => {
    const { fullName, phone, aadhar, address, license, fromDest, toDest, carName, carPlate, confirmed } = form;
    if (!fullName || !phone || !aadhar || !address || !license || !fromDest || !toDest || !carName || !carPlate) {
      Alert.alert("Missing Fields", "Please fill out all the fields in the form.");
      return;
    }
    if (!confirmed) {
      Alert.alert("Required", "Please confirm the DL verification checkbox.");
      return;
    }
    setCurrentScreen('SUCCESS');
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    // On iOS, tapping outside fires a dismissed event (or closing it).
    // On Android, tapping OK/Cancel fires set/dismissed.
    if (event.type === 'dismissed') {
      setPickerConfig({ ...pickerConfig, visible: false });
      return;
    }
    
    if (selectedDate) {
      setForm({ ...form, [pickerConfig.field]: selectedDate });
    }

    // Android completes the selection immediately. iOS allows scrolling, so don't close immediately.
    if (Platform.OS === 'android') {
      setPickerConfig({ ...pickerConfig, visible: false });
    }
  };

  const openPicker = (field: string, mode: 'date' | 'time') => {
    setPickerConfig({ visible: true, mode, field });
  };

  const formatDate = (date: Date) => date.toLocaleDateString('en-GB');
  const formatTime = (date: Date) => date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* SCREEN 1: SPLASH */}
      {currentScreen === 'SPLASH' && (
        <ImageBackground source={require('./assets/splash_bg.jpg')} style={styles.splashImage} resizeMode="cover">
          <View style={styles.splashOverlay}>
            <View style={styles.splashTextContainer}>
              <Text style={styles.splashTitle}>Thandra Self Drive Cars</Text>
              <Text style={styles.splashSubtitle}>Welcome to Thandra Self Drive Cars.</Text>
            </View>
            <TouchableOpacity style={styles.submitBtn} onPress={requestPermissions}>
              <Text style={styles.submitBtnText}>Book a Vehicle</Text>
              <Feather name="arrow-right" size={20} color="#FFF" />
            </TouchableOpacity>
          </View>
        </ImageBackground>
      )}

      {/* SCREEN 2: PERMISSION DENIED */}
      {currentScreen === 'PERMISSION_DENIED' && (
        <View style={styles.centered}>
          <View style={styles.errorCard}>
            <Text style={[styles.successTitle, {color: Colors.red}]}>Access Required</Text>
            <Text style={styles.keyDesc}>We need access to your Contacts and Notifications to secure your booking. Please enable them in your device settings.</Text>
            <TouchableOpacity style={[styles.submitBtn, {marginTop: 20}]} onPress={() => Linking.openSettings()}>
              <Text style={styles.submitBtnText}>Open Settings</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* SCREEN 3: BRANCH SELECTION (LIGHT MODE) */}
      {currentScreen === 'BRANCH_SELECT' && (
        <SafeAreaView style={{flex: 1}}>
          <View style={styles.header}>
            <Text style={styles.pageTitle}>Select a Branch</Text>
            <Text style={styles.pageDesc}>Choose your preferred pickup location.</Text>
          </View>
          <ScrollView contentContainerStyle={{padding: 20}}>
            {['Madhapur', 'Dilshuknagar', 'B.N reddy nagar', 'JNTU'].map(branch => (
              <TouchableOpacity key={branch} style={styles.branchCard} onPress={() => handleBranchSelect(branch)}>
                <MaterialCommunityIcons name="office-building-marker-outline" size={32} color={Colors.primary} style={{marginRight: 16}} />
                <View style={{flex: 1}}>
                  <Text style={styles.branchName}>{branch}</Text>
                  <Text style={styles.branchSub}>Tap to select this hub</Text>
                </View>
                <Feather name="chevron-right" size={24} color={Colors.lightText} />
              </TouchableOpacity>
            ))}
          </ScrollView>
        </SafeAreaView>
      )}

      {/* SCREEN 4: BOOKING FORM (LIGHT MODE + MOCKUP STRUCTURE) */}
      {currentScreen === 'BOOKING_FORM' && (
        <View style={styles.container}>
          <SafeAreaView style={styles.lightHeader}>
            <Text style={styles.pageTitle}>Reservation Details</Text>
            <Text style={styles.pageDesc}>Please provide your booking and identity information.</Text>
          </SafeAreaView>

          <View style={styles.whiteCardWrapper}>
            <ScrollView style={styles.whiteCard} contentContainerStyle={{paddingBottom: 40}} showsVerticalScrollIndicator={false}>
              
              <PremiumInput label="Full Name" subLabel="As on Govt ID" icon="card-account-details-outline" placeholder="Enter your full name" value={form.fullName} onChangeText={(t: string) => setForm({...form, fullName: t})} />
              <PremiumInput label="Phone Number" subLabel="OTP Dispatch" placeholder="98765 43210" keyboardType="phone-pad" value={form.phone} onChangeText={(t: string) => setForm({...form, phone: t})} rightElement={<Feather name="phone-call" size={18} color={Colors.lightText} />} />
              <PremiumInput label="Aadhar Number" subLabel="12-Digit UIDAI" icon="fingerprint" placeholder="XXXX - XXXX - XXXX" keyboardType="numeric" value={form.aadhar} onChangeText={(t: string) => setForm({...form, aadhar: t})} />
              <PremiumInput label="Address" subLabel="Permanent Address" placeholder="Full address" multiline value={form.address} onChangeText={(t: string) => setForm({...form, address: t})} />
              <PremiumInput label="Driving License Number" subLabel="LMV Endorsement" icon="card-bulleted-outline" placeholder="TS09 20210088821" value={form.license} onChangeText={(t: string) => setForm({...form, license: t})} />
              
              <View style={styles.dividerContainer}><View style={styles.dividerLine} /><Text style={styles.dividerText}>HUB & ITINERARY</Text><View style={styles.dividerLine} /></View>
              
              <PremiumInput label="Pickup Branch" icon="office-building" value={selectedBranch} rightElement={<Feather name="lock" size={16} color={Colors.lightText} />} />
              <PremiumInput label="From Destination" icon="circle-outline" placeholder="Starting point" value={form.fromDest} onChangeText={(t: string) => setForm({...form, fromDest: t})} />
              <PremiumInput label="To Destination" icon="map-marker-outline" placeholder="End point" value={form.toDest} onChangeText={(t: string) => setForm({...form, toDest: t})} />

              <View style={styles.dividerContainer}><View style={styles.dividerLine} /><Text style={styles.dividerText}>TEMPORAL WINDOW</Text><View style={styles.dividerLine} /></View>
              
              <TouchableOpacity onPress={() => openPicker('startDate', 'date')}>
                <PremiumInput label="Start Date" subLabel="Pickup day" icon="calendar" placeholder="DD/MM/YYYY" value={formatDate(form.startDate)} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => openPicker('startTime', 'time')}>
                <PremiumInput label="Start Time" subLabel="Key hand-over" icon="clock-outline" placeholder="HH:MM AM" value={formatTime(form.startTime)} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => openPicker('endDate', 'date')}>
                <PremiumInput label="End Date" subLabel="Drop-off day" icon="calendar" placeholder="DD/MM/YYYY" value={formatDate(form.endDate)} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => openPicker('endTime', 'time')}>
                <PremiumInput label="End Time" subLabel="Return telemetry" icon="clock-outline" placeholder="HH:MM PM" value={formatTime(form.endTime)} />
              </TouchableOpacity>

              <View style={styles.dividerContainer}><View style={styles.dividerLine} /><Text style={styles.dividerText}>ASSIGNED MACHINE</Text><View style={styles.dividerLine} /></View>

              <PremiumInput label="Car Name" subLabel="Instant Allocation" subLabelColor={Colors.primary} icon="car-sports" placeholder="e.g. Swift, SUV" value={form.carName} onChangeText={(t: string) => setForm({...form, carName: t})} />
              <PremiumInput label="Car Plate Number" subLabel="RTO Official Reg" icon="card-text-outline" placeholder="Enter plate number" value={form.carPlate} onChangeText={(t: string) => setForm({...form, carPlate: t})} />

              <TouchableOpacity style={styles.checkboxRow} onPress={() => setForm({...form, confirmed: !form.confirmed})}>
                <View style={[styles.checkbox, form.confirmed && styles.checkboxActive]}>
                  {form.confirmed && <Feather name="check" size={14} color="#FFF" />}
                </View>
                <Text style={styles.checkboxText}>I confirm that I possess a valid physical DL for cross-verification at pickup. I accept Thandra Self Drive <Text style={{fontWeight:'bold', color: Colors.darkText}}>Zero-Damage Escrow</Text> protocol.</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit}>
                <Text style={styles.submitBtnText}>Submit & Confirm Booking</Text>
                <Feather name="arrow-right" size={20} color="#FFF" />
              </TouchableOpacity>

            </ScrollView>
          </View>
        </View>
      )}

      {/* SCREEN 5: SUCCESS (LIGHT MODE) */}
      {currentScreen === 'SUCCESS' && (
        <SafeAreaView style={{flex: 1}}>
          <ScrollView contentContainerStyle={styles.successScroll}>
            <View style={styles.successIconCircle}><Feather name="check" size={40} color={Colors.green} /></View>
            <Text style={styles.successSubtitle}>BOOKING CONFIRMED</Text>
            <Text style={styles.successTitle}>Car Booked Successfully!</Text>
            
            <View style={styles.lightCard}>
              <View style={styles.carDetailsRow}>
                <View style={styles.carImgPlaceholder}><MaterialCommunityIcons name="car-sports" size={40} color={Colors.primary} /></View>
                <View style={{flex: 1}}>
                  <Text style={styles.carClass}>ASSIGNED VEHICLE</Text>
                  <Text style={styles.carNameVal}>{form.carName}</Text>
                  <Text style={styles.carPlateVal}>{form.carPlate}</Text>
                </View>
              </View>

              <View style={styles.hubDetails}>
                <MaterialCommunityIcons name="office-building" size={24} color={Colors.primary} style={{marginRight: 12}} />
                <View>
                  <Text style={styles.hubTitle}>DESIGNATED HUB</Text>
                  <Text style={styles.hubName}>{selectedBranch}</Text>
                </View>
              </View>

              <View style={styles.kycBox}>
                <View style={{flex: 1}}>
                  <Text style={styles.kycName}>{form.fullName}</Text>
                  <Text style={styles.kycPhone}>+91 {form.phone}</Text>
                </View>
                <View style={styles.kycBadge}>
                  <Feather name="check-circle" size={12} color={Colors.green} />
                  <Text style={styles.kycBadgeText}> KYC Approved</Text>
                </View>
              </View>
            </View>

            <TouchableOpacity style={styles.actionOutlineBtn} onPress={() => setCurrentScreen('SPLASH')}>
              <Feather name="home" size={16} color={Colors.primary} />
              <Text style={styles.actionOutlineText}> Return to Home</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      )}

      {/* GLOBAL DATE PICKER */}
      {pickerConfig.visible && (
        <View style={Platform.OS === 'ios' ? styles.iosPickerContainer : {}}>
          {Platform.OS === 'ios' && (
            <TouchableOpacity style={styles.iosDoneBtn} onPress={() => setPickerConfig({...pickerConfig, visible: false})}>
              <Text style={styles.iosDoneText}>Done</Text>
            </TouchableOpacity>
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
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  
  // Splash
  splashImage: { width: '100%', height: '100%' },
  splashOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.4)', padding: 30, justifyContent: 'space-between', paddingBottom: 60 },
  splashTextContainer: { marginTop: 120 },
  splashTitle: { fontSize: 48, fontWeight: '900', color: '#FFF', marginBottom: 16, letterSpacing: -1 },
  splashSubtitle: { fontSize: 22, color: Colors.gold, fontWeight: '600', lineHeight: 30 },
  
  // Branch Select
  header: { padding: 24, paddingTop: 40, backgroundColor: Colors.bg },
  branchCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.cardBg, padding: 20, borderRadius: 16, marginBottom: 16, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, borderWidth: 1, borderColor: Colors.border },
  branchName: { color: Colors.darkText, fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
  branchSub: { color: Colors.lightText, fontSize: 12 },

  // Form
  lightHeader: { backgroundColor: Colors.bg, padding: 24, paddingBottom: 20 },
  pageTitle: { fontSize: 28, fontWeight: '900', color: Colors.darkText, marginBottom: 8 },
  pageDesc: { fontSize: 13, color: Colors.lightText, lineHeight: 18 },
  
  whiteCardWrapper: { flex: 1, backgroundColor: Colors.bg },
  whiteCard: { flex: 1, backgroundColor: Colors.formCardBg, padding: 24 },
  
  inputContainer: { marginBottom: 20 },
  inputHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  inputLabel: { fontSize: 13, fontWeight: 'bold', color: Colors.darkText },
  inputSubLabel: { fontSize: 11, color: Colors.lightText },
  inputBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.inputBg, borderWidth: 1, borderColor: Colors.border, borderRadius: 10, paddingHorizontal: 14, height: 50 },
  textInput: { flex: 1, fontSize: 14, color: Colors.darkText, fontWeight: '500' },
  
  dividerContainer: { flexDirection: 'row', alignItems: 'center', marginVertical: 24 },
  dividerLine: { flex: 1, height: 1, backgroundColor: Colors.border },
  dividerText: { marginHorizontal: 12, fontSize: 10, color: Colors.lightText, fontWeight: 'bold', letterSpacing: 1 },

  checkboxRow: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 10, marginBottom: 30 },
  checkbox: { width: 20, height: 20, borderRadius: 4, borderWidth: 2, borderColor: Colors.border, marginRight: 12, justifyContent: 'center', alignItems: 'center', marginTop: 2 },
  checkboxActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  checkboxText: { flex: 1, fontSize: 11, color: Colors.lightText, lineHeight: 16 },

  submitBtn: { backgroundColor: Colors.primary, borderRadius: 12, height: 56, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', elevation: 3 },
  submitBtnText: { fontSize: 16, fontWeight: 'bold', color: '#FFF', marginRight: 8 },

  // Success
  successScroll: { padding: 24, paddingBottom: 60, alignItems: 'center' },
  successIconCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(52, 199, 89, 0.1)', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  successSubtitle: { color: Colors.green, fontSize: 10, fontWeight: 'bold', letterSpacing: 1, marginBottom: 8 },
  successTitle: { fontSize: 24, color: Colors.darkText, fontWeight: 'bold', marginBottom: 24 },
  
  errorCard: { width: '100%', backgroundColor: Colors.cardBg, borderRadius: 16, padding: 20, borderWidth: 1, borderColor: Colors.border },
  
  lightCard: { width: '100%', backgroundColor: Colors.cardBg, borderRadius: 16, padding: 20, marginBottom: 24, borderWidth: 1, borderColor: Colors.border, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
  carDetailsRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  carImgPlaceholder: { width: 60, height: 60, backgroundColor: Colors.bg, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  carClass: { color: Colors.primary, fontSize: 10, fontWeight: 'bold', letterSpacing: 0.5, marginBottom: 4 },
  carNameVal: { color: Colors.darkText, fontSize: 18, fontWeight: 'bold', marginBottom: 2 },
  carPlateVal: { color: Colors.lightText, fontSize: 12 },

  hubDetails: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.bg, padding: 16, borderRadius: 12, marginBottom: 16 },
  hubTitle: { color: Colors.lightText, fontSize: 10, fontWeight: 'bold', letterSpacing: 0.5, marginBottom: 4 },
  hubName: { color: Colors.darkText, fontSize: 16, fontWeight: 'bold' },

  kycBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.bg, padding: 12, borderRadius: 12 },
  kycName: { color: Colors.darkText, fontSize: 14, fontWeight: 'bold' },
  kycPhone: { color: Colors.lightText, fontSize: 11, marginTop: 2 },
  kycBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(52, 199, 89, 0.1)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  kycBadgeText: { color: Colors.green, fontSize: 10, fontWeight: 'bold' },
  
  keyDesc: { color: Colors.lightText, fontSize: 14, lineHeight: 22, textAlign: 'center' },
  actionOutlineBtn: { width: '100%', height: 48, borderRadius: 12, borderWidth: 1, borderColor: Colors.border, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.cardBg },
  actionOutlineText: { color: Colors.primary, fontSize: 13, fontWeight: 'bold' },

  // iOS Picker
  iosPickerContainer: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#FFF', zIndex: 100, borderTopWidth: 1, borderTopColor: '#E0E0E0' },
  iosDoneBtn: { padding: 16, alignItems: 'flex-end', backgroundColor: '#F8F8F8', borderBottomWidth: 1, borderBottomColor: '#E0E0E0' },
  iosDoneText: { color: '#1A73E8', fontWeight: 'bold', fontSize: 16 },
});
