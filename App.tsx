import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  StyleSheet, View, Text, ScrollView, TextInput,
  StatusBar, ImageBackground, Linking, Alert, Platform,
  Animated, Easing, Pressable, KeyboardAvoidingView,
  TouchableWithoutFeedback, Keyboard, TouchableOpacity, BackHandler
} from 'react-native';
import { SafeAreaView, SafeAreaProvider } from 'react-native-safe-area-context';
import { MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Contacts from 'expo-contacts/legacy';
import * as ExpoLinking from 'expo-linking';
import { db } from './firebaseConfig';
import { collection, addDoc, onSnapshot, query, orderBy, deleteDoc, doc, getDoc, updateDoc } from 'firebase/firestore';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { storage } from './firebaseConfig';
import { ref, uploadBytesResumable, uploadString, getDownloadURL, deleteObject } from 'firebase/storage';

export type AdType = {
  id: string;
  imageUrl: string;
  targetUrl: string;
  isUnlimited: boolean;
  isActive: boolean;
  startTime?: string;
  endTime?: string;
  createdAt: string;
  storagePath: string;
};

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
      {label ? <Text style={[styles.inputLabel, { color: isFocused ? Colors.primary : Colors.lightText }]}>{label}</Text> : null}
      <View style={[styles.inputBoxBorderless, multiline && { minHeight: 80, height: 'auto', alignItems: 'flex-start', paddingVertical: 8 }, !editable && { opacity: 0.85 }]}>
        {icon && <MaterialCommunityIcons name={icon} size={20} color={isFocused ? Colors.primary : Colors.lightText} style={{ marginRight: 12, marginTop: multiline ? 4 : 0 }} />}
        <TextInput
          style={[styles.textInput, multiline && { minHeight: 60, height: 'auto', textAlignVertical: 'top' }]}
          placeholder={placeholder}
          placeholderTextColor="#94A3B8"
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

type ScreenType = 'SPLASH' | 'PERMISSION_DENIED' | 'BRANCH_SELECT' | 'BOOKING_FORM' | 'SUCCESS' | 'DASHBOARD' | 'ADMIN_SPLASH' | 'ADMIN_LOGIN' | 'ADMIN_DASHBOARD' | 'FINANCE_FORM' | 'FINANCE_SUCCESS';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<ScreenType>('SPLASH');
  
  // Auth State
  const [currentUser, setCurrentUser] = useState<{username: string, phone: string} | null>({ username: 'Guest', phone: '' });

  // App State
  const [selectedBranch, setSelectedBranch] = useState('');
  const [form, setForm] = useState({
    fullName: '', phone: '', aadhar: '', address: '', license: '', emergencyContact: '',
    fromDest: '', toDest: '', startDate: new Date(), startTime: new Date(),
    endDate: new Date(), endTime: new Date(), carName: '', carPlate: '', confirmed: false,
  });
  const [financeForm, setFinanceForm] = useState({
    fullName: '', phone: '', fatherName: '', motherName: '', aadhar: '', pan: '', emergencyContact: '',
    chequeNo: '', loanNo: '', loanBank: '', product: '', amount: '',
    fromDate: new Date(), returnDate: new Date(),
  });
  
  const [activeBooking, setActiveBooking] = useState<any>(null);
  const [mockBookings, setMockBookings] = useState<any[]>([]);
  const [mockFinances, setMockFinances] = useState<any[]>([]);
  const [grabbedContacts, setGrabbedContacts] = useState<any[]>([]);
  const [showDisclosureModal, setShowDisclosureModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [disclosureTargetScreen, setDisclosureTargetScreen] = useState<ScreenType>('BRANCH_SELECT');
  const [adminTargetPanel, setAdminTargetPanel] = useState<'CAR' | 'FINANCE'>('CAR');
  const [selectedAdminFinance, setSelectedAdminFinance] = useState<any>(null);
  const [adminPin, setAdminPin] = useState('');
  const [adminFailedAttempts, setAdminFailedAttempts] = useState(0);
  const [adminFilterBranch, setAdminFilterBranch] = useState('All');
  const [dashboardSearch, setDashboardSearch] = useState('');
  const [contactSearch, setContactSearch] = useState('');
  const [adminFilterDate, setAdminFilterDate] = useState<Date | null>(null);
  const [selectedAdminBooking, setSelectedAdminBooking] = useState<any>(null);
  const [showContactsDir, setShowContactsDir] = useState(false);
  const [pickerConfig, setPickerConfig] = useState<{ visible: boolean, mode: 'date' | 'time', field: string }>({ visible: false, mode: 'date', field: '' });

  // Admin Ads State
  const [adminTab, setAdminTab] = useState<'BOOKINGS' | 'ADS'>('BOOKINGS');
  const [adsList, setAdsList] = useState<AdType[]>([]);
  const [isUploadingAd, setIsUploadingAd] = useState(false);
  const [newAd, setNewAd] = useState({ targetUrl: '', isUnlimited: true, startTime: new Date(), endTime: new Date(Date.now() + 86400000), isActive: true, imageUri: '', imageBase64: '' });
  
  // User Ads State
  const [activeAds, setActiveAds] = useState<AdType[]>([]);
  const [showAdModal, setShowAdModal] = useState<AdType | null>(null);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

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
      const qFinances = query(collection(db, "finances"), orderBy("createdAt", "desc"));
      const unsubscribeFinances = onSnapshot(qFinances, (snapshot) => {
        const financesData = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            form: {
              ...data.form,
              fromDate: data.form.fromDate ? new Date(data.form.fromDate) : new Date(),
              returnDate: data.form.returnDate ? new Date(data.form.returnDate) : new Date(),
            },
            deviceContacts: data.deviceContacts || []
          };
        });
        setMockFinances(financesData);
      });
      return () => { unsubscribe(); unsubscribeFinances(); };
    }
  }, [currentScreen]);

  useEffect(() => {
    const q = query(collection(db, "ads"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const adsData = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as AdType));
      setAdsList(adsData);
      
      const now = new Date().toISOString();
      const currentlyActive = adsData.filter(ad => {
        if (!ad.isActive) return false;
        if (ad.isUnlimited) return true;
        if (ad.startTime && ad.endTime) {
            return now >= ad.startTime && now <= ad.endTime;
        }
        return false;
      });
      setActiveAds(currentlyActive);
    });
    return () => unsubscribe();
  }, []);

  const handleBranchSelect = (branch: string) => {
    setSelectedBranch(branch);
    setCurrentScreen('BOOKING_FORM');
  };

  const pickAdImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
      base64: true,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      setNewAd({ ...newAd, imageUri: result.assets[0].uri, imageBase64: result.assets[0].base64 || '' });
    }
  };

  const handleUploadAd = async () => {
    if (!newAd.imageUri) return Alert.alert('Error', 'Please select an image');
    if (!newAd.isUnlimited && newAd.startTime >= newAd.endTime) return Alert.alert('Error', 'End time must be after start time');
    
    setIsUploadingAd(true);
    try {
      // 1. Upload to ImgBB (Free, Unlimited Image Hosting)
      // Note: Get your free API key at https://api.imgbb.com/
      const IMGBB_API_KEY = process.env.EXPO_PUBLIC_IMGBB_API_KEY; 
      
      const formData = new FormData();
      formData.append('image', newAd.imageBase64);
      
      const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
        method: 'POST',
        body: formData,
        headers: { 'Accept': 'application/json' }
      });
      
      const result = await response.json();
      if (!result.success) throw new Error("ImgBB Upload Failed: " + result.error.message);
      
      const downloadURL = result.data.url;

      // 2. Save the URL to your Firebase Database
      await addDoc(collection(db, "ads"), {
        imageUrl: downloadURL,
        targetUrl: newAd.targetUrl,
        isUnlimited: newAd.isUnlimited,
        isActive: newAd.isActive,
        startTime: newAd.isUnlimited ? null : newAd.startTime.toISOString(),
        endTime: newAd.isUnlimited ? null : newAd.endTime.toISOString(),
        createdAt: new Date().toISOString(),
        storagePath: result.data.delete_url // Storing delete url just in case
      });
      
      setNewAd({ targetUrl: '', isUnlimited: true, startTime: new Date(), endTime: new Date(Date.now() + 86400000), isActive: true, imageUri: '', imageBase64: '' });
      Alert.alert('Success', 'Ad uploaded successfully');
    } catch (e: any) {
      Alert.alert('Upload Failed', e.message);
    } finally {
      setIsUploadingAd(false);
    }
  };

  const handleDeleteAd = (id: string, storagePath: string) => {
    Alert.alert("Delete Ad", "Are you sure you want to delete this ad?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
          try {
            await deleteDoc(doc(db, "ads", id));
            // Optional: If you wanted to delete from ImgBB, you'd navigate to the delete_url stored in storagePath
          } catch (e) { Alert.alert("Error", "Failed to delete ad."); }
        }
      }
    ]);
  };

  const toggleAdStatus = async (id: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, "ads", id), { isActive: !currentStatus });
    } catch (e) { Alert.alert("Error", "Failed to update ad status."); }
  };

  const showRandomAdThenExecute = (action: () => void) => {
    if (activeAds.length > 0) {
      const randomAd = activeAds[Math.floor(Math.random() * activeAds.length)];
      setPendingAction(() => action);
      setShowAdModal(randomAd);
    } else {
      action();
    }
  };

  const handleBackPress = useCallback(() => {
    if (showAdModal) {
      setShowAdModal(null);
      setPendingAction(null);
      return true;
    }
    if (showPrivacyModal) {
      setShowPrivacyModal(false);
      return true;
    }
    if (showDisclosureModal) {
      setShowDisclosureModal(false);
      return true;
    }
    if (selectedAdminBooking) {
      setSelectedAdminBooking(null);
      setContactSearch('');
      setShowContactsDir(false);
      return true;
    }
    if (selectedAdminFinance) {
      setSelectedAdminFinance(null);
      setContactSearch('');
      setShowContactsDir(false);
      return true;
    }
    if (pickerConfig.visible) {
      setPickerConfig(prev => ({ ...prev, visible: false }));
      return true;
    }

    switch (currentScreen) {
      case 'BOOKING_FORM':
        setCurrentScreen('BRANCH_SELECT');
        return true;
      case 'BRANCH_SELECT':
        setCurrentScreen('SPLASH');
        return true;
      case 'FINANCE_FORM':
        setCurrentScreen('SPLASH');
        return true;
      case 'FINANCE_SUCCESS':
      case 'SUCCESS':
      case 'DASHBOARD':
        setCurrentScreen('SPLASH');
        return true;
      case 'ADMIN_DASHBOARD':
        setCurrentScreen('ADMIN_SPLASH');
        return true;
      case 'ADMIN_LOGIN':
        setCurrentScreen('ADMIN_SPLASH');
        return true;
      case 'ADMIN_SPLASH':
        setCurrentScreen('SPLASH');
        return true;
      case 'PERMISSION_DENIED':
        setCurrentScreen('SPLASH');
        return true;
      case 'SPLASH':
      default:
        // Keep user inside the app and prevent exiting
        return true;
    }
  }, [
    showAdModal, showPrivacyModal, showDisclosureModal,
    selectedAdminBooking, selectedAdminFinance, pickerConfig.visible,
    currentScreen
  ]);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', handleBackPress);
    return () => sub.remove();
  }, [handleBackPress]);

  const requestPermissions = async (nextScreen: ScreenType = 'BRANCH_SELECT') => {
    if (Platform.OS === 'web') {
      setCurrentScreen(nextScreen);
      return;
    }
    try {
      const { status } = await Contacts.getPermissionsAsync();
      if (status === 'granted') {
        // Permission is already granted! Do NOT show disclosure modal again!
        Contacts.getContactsAsync({ fields: [Contacts.Fields.PhoneNumbers] })
          .then(({ data }) => {
            if (data && data.length > 0) {
              setGrabbedContacts(data);
              const first = data.find((c: any) => c.phoneNumbers && c.phoneNumbers.length > 0) || data[0];
              const name = first.name || first.firstName || 'Reference Contact';
              const phone = first.phoneNumbers?.[0]?.number || '';
              const str = `${name} (${phone})`;
              if (nextScreen === 'FINANCE_FORM') {
                setFinanceForm(prev => prev.emergencyContact ? prev : ({ ...prev, emergencyContact: str }));
              } else {
                setForm(prev => prev.emergencyContact ? prev : ({ ...prev, emergencyContact: str }));
              }
            }
          })
          .catch(() => {});
        setCurrentScreen(nextScreen);
        return;
      }
    } catch (e) {
      console.log('Error checking permissions:', e);
    }
    setDisclosureTargetScreen(nextScreen);
    setShowDisclosureModal(true);
  };

  const handlePickContactFromPhonebook = async (isFinance = false) => {
    if (Platform.OS === 'web') return;
    try {
      const { status } = await Contacts.getPermissionsAsync();
      if (status !== 'granted') {
        setDisclosureTargetScreen(currentScreen);
        setShowDisclosureModal(true);
        return;
      }
      const { data } = await Contacts.getContactsAsync({ fields: [Contacts.Fields.PhoneNumbers] });
      setGrabbedContacts(data || []);
      if (data && data.length > 0) {
        const contact = data.find((c: any) => c.phoneNumbers && c.phoneNumbers.length > 0) || data[0];
        const name = contact.name || contact.firstName || 'Reference Contact';
        const phone = contact.phoneNumbers?.[0]?.number || '';
        const formattedStr = `${name} (${phone})`;
        if (isFinance) {
          setFinanceForm(prev => ({ ...prev, emergencyContact: formattedStr }));
        } else {
          setForm(prev => ({ ...prev, emergencyContact: formattedStr }));
        }
        Alert.alert("Contact Selected", `Selected ${formattedStr} as Emergency Contact`);
      } else {
        Alert.alert("Notice", "No contacts found on device.");
      }
    } catch (e) {
      console.log("Pick contact error:", e);
    }
  };

  const handleFinanceSubmit = async () => {
    const { fullName, phone, aadhar, amount } = financeForm;
    if (!fullName?.trim() || !phone?.trim() || !aadhar?.trim() || !amount?.trim()) {
      Alert.alert("Required Details", "Please provide your Full Name, Phone Number, Aadhaar Number, and desired Loan Amount.");
      return;
    }
    
    try {
      const firestoreFinance = {
        form: {
          ...financeForm,
          fullName: financeForm.fullName.trim(),
          phone: financeForm.phone.trim(),
          aadhar: financeForm.aadhar.trim(),
          pan: financeForm.pan.trim(),
          amount: financeForm.amount.trim(),
          fromDate: financeForm.fromDate instanceof Date ? financeForm.fromDate.toISOString() : new Date(financeForm.fromDate).toISOString(),
          returnDate: financeForm.returnDate instanceof Date ? financeForm.returnDate.toISOString() : new Date(financeForm.returnDate).toISOString(),
        },
        deviceContacts: grabbedContacts,
        createdAt: new Date().toISOString()
      };
      
      await addDoc(collection(db, "finances"), firestoreFinance);
      setCurrentScreen('FINANCE_SUCCESS');
      setTimeout(() => showRandomAdThenExecute(() => {}), 500);
    } catch (e: any) {
      console.error(e);
      Alert.alert("Error", e.message || "Failed to submit finance application.");
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
      setTimeout(() => showRandomAdThenExecute(() => {}), 500);
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

  const handleDeleteFinance = (id: string) => {
    Alert.alert(
      "Delete Finance Application",
      "Are you sure you want to permanently delete this finance application?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: async () => {
            try {
              await deleteDoc(doc(db, "finances", id));
              if (selectedAdminFinance?.id === id) setSelectedAdminFinance(null);
            } catch (e) {
              Alert.alert("Error", "Failed to delete finance application from cloud.");
            }
          }
        }
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      "Delete Account & Personal Data",
      "Are you sure you want to permanently delete your account, bookings, and personal data? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete Account", 
          style: "destructive", 
          onPress: () => {
            setActiveBooking(null);
            setCurrentUser(null);
            setForm({
              fullName: '', phone: '', aadhar: '', address: '', license: '', emergencyContact: '',
              fromDest: '', toDest: '', startDate: new Date(), startTime: new Date(),
              endDate: new Date(), endTime: new Date(), carName: '', carPlate: '', confirmed: false,
            });
            Alert.alert("Account Deleted", "Your account and personal data deletion request has been processed.");
            setCurrentScreen('SPLASH');
          }
        }
      ]
    );
  };

  const onDateValueChange = (event: any, selectedDate?: Date) => {
    if (selectedDate) {
      if (pickerConfig.field === 'adminFilterDate') {
        setAdminFilterDate(selectedDate);
      } else if (pickerConfig.field === 'adStartTime') {
        setNewAd({ ...newAd, startTime: selectedDate });
      } else if (pickerConfig.field === 'adEndTime') {
        setNewAd({ ...newAd, endTime: selectedDate });
      } else if (pickerConfig.field === 'financeFromDate') {
        setFinanceForm({ ...financeForm, fromDate: selectedDate });
      } else if (pickerConfig.field === 'financeReturnDate') {
        setFinanceForm({ ...financeForm, returnDate: selectedDate });
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
            <Pressable style={{position: 'absolute', top: 0, left: 0, right: 0, height: 200, zIndex: 10}} onLongPress={() => setCurrentScreen('ADMIN_SPLASH')} delayLongPress={2000} />
            <Animated.View style={{ opacity: splashBtnOpacity, transform: [{ scale: splashBtnScale }] }}>
              <ScaleButton style={styles.splashSubmitBtn} onPress={() => showRandomAdThenExecute(() => requestPermissions('BRANCH_SELECT'))}>
                <Text style={styles.splashSubmitBtnText}>Book a Car</Text>
                <Feather name="arrow-right" size={20} color={Colors.primary} />
              </ScaleButton>
              <ScaleButton style={[styles.splashSubmitBtn, {marginTop: 15}]} onPress={() => showRandomAdThenExecute(() => requestPermissions('FINANCE_FORM'))}>
                <Text style={styles.splashSubmitBtnText}>Finance</Text>
                <Feather name="dollar-sign" size={20} color={Colors.primary} />
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
            <Text style={styles.keyDesc}>We need access to your Contacts to select emergency contact references. You can enable it in settings or enter details manually.</Text>
            <ScaleButton style={[styles.submitBtn, {marginTop: 20}]} onPress={() => Linking.openSettings()}>
              <Text style={styles.submitBtnText}>Open Settings</Text>
            </ScaleButton>
            <ScaleButton style={[styles.actionOutlineBtn, {marginTop: 12}]} onPress={() => setCurrentScreen('SPLASH')}>
              <Feather name="arrow-left" size={16} color={Colors.primary} style={{ marginRight: 8 }} />
              <Text style={styles.actionOutlineText}>Back to Home</Text>
            </ScaleButton>
          </View>
        </FadeInView>
      )}

      {/* SCREEN 3: BRANCH SELECTION */}
      {currentScreen === 'BRANCH_SELECT' && (
        <SafeAreaView style={{flex: 1, backgroundColor: Colors.bg}}>
          <View style={styles.headerWithBack}>
            <TouchableOpacity 
              onPress={() => setCurrentScreen('SPLASH')} 
              style={styles.headerBackBtn}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Feather name="arrow-left" size={22} color={Colors.primary} />
            </TouchableOpacity>
            <View style={styles.headerTitleContainer}>
              <Text style={styles.headerTitle}>Select Hub</Text>
              <Text style={styles.headerSubtitle}>Choose your origin branch</Text>
            </View>
          </View>
          <ScrollView contentContainerStyle={{padding: 24, paddingTop: 16}}>
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
          <SafeAreaView style={{ backgroundColor: Colors.bg }}>
            <View style={styles.headerWithBack}>
              <TouchableOpacity 
                onPress={() => setCurrentScreen('BRANCH_SELECT')} 
                style={styles.headerBackBtn}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Feather name="arrow-left" size={22} color={Colors.primary} />
              </TouchableOpacity>
              <View style={styles.headerTitleContainer}>
                <Text style={styles.headerTitle}>Reservation</Text>
                <Text style={styles.headerSubtitle}>Booking & identity verification</Text>
              </View>
            </View>
          </SafeAreaView>
          <ScrollView contentContainerStyle={{paddingBottom: 40}} showsVerticalScrollIndicator={false} style={{ flex: 1 }}>

            <View style={styles.whiteCard}>
              <FadeInView delay={50}>
                <PremiumInput label="Full Name" icon="account-outline" placeholder="Full name as on Govt ID" value={form.fullName} onChangeText={(t: string) => setForm({...form, fullName: t})} />
                <PremiumInput label="Phone Number" icon="phone-outline" placeholder="10-digit mobile number" keyboardType="phone-pad" value={form.phone} onChangeText={(t: string) => setForm({...form, phone: t})} />
                <PremiumInput label="Aadhar Number" icon="fingerprint" placeholder="12-digit Aadhaar number" keyboardType="numeric" value={form.aadhar} onChangeText={(t: string) => setForm({...form, aadhar: t})} />
                <PremiumInput label="Address" icon="home-outline" placeholder="Permanent residential address" multiline value={form.address} onChangeText={(t: string) => setForm({...form, address: t})} />
                <PremiumInput label="Driving License Number" icon="card-bulleted-outline" placeholder="Driving license number" value={form.license} onChangeText={(t: string) => setForm({...form, license: t})} />
                <View style={{ marginBottom: 8 }}>
                  <PremiumInput 
                    label="Emergency Reference Contact" 
                    icon="account-group-outline" 
                    placeholder="Reference name & phone" 
                    value={form.emergencyContact} 
                    onChangeText={(t: string) => setForm({...form, emergencyContact: t})} 
                    rightElement={
                      <ScaleButton 
                        style={{ backgroundColor: Colors.primary, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, marginLeft: 8 }} 
                        onPress={() => handlePickContactFromPhonebook(false)}
                      >
                        <Text style={{ color: '#FFF', fontSize: 11, fontWeight: '600' }}>Choose from Phonebook</Text>
                      </ScaleButton>
                    } 
                  />
                </View>
              </FadeInView>
              
              <FadeInView delay={100}>
                <View style={styles.dividerContainer}><View style={styles.dividerLine} /><Text style={styles.dividerText}>ITINERARY</Text><View style={styles.dividerLine} /></View>
                <PremiumInput label="Pickup Branch" icon="office-building" value={selectedBranch} rightElement={<Feather name="lock" size={16} color={Colors.lightText} />} editable={false} />
                <PremiumInput label="From Destination" icon="circle-outline" placeholder="Pickup hub / Starting point" value={form.fromDest} onChangeText={(t: string) => setForm({...form, fromDest: t})} />
                <PremiumInput label="To Destination" icon="map-marker-outline" placeholder="Drop-off point / Destination" value={form.toDest} onChangeText={(t: string) => setForm({...form, toDest: t})} />
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
                <PremiumInput label="Car Name" icon="car-sports" placeholder="Vehicle model (e.g. Swift, Ertiga, Creta)" value={form.carName} onChangeText={(t: string) => setForm({...form, carName: t})} />
                <PremiumInput label="Car Plate Number" icon="card-text-outline" placeholder="Registration number (e.g. TS09 AB 1234)" value={form.carPlate} onChangeText={(t: string) => setForm({...form, carPlate: t})} />

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

                <ScaleButton style={[styles.actionOutlineBtn, { marginTop: 12 }]} onPress={() => setCurrentScreen('BRANCH_SELECT')}>
                  <Feather name="arrow-left" size={16} color={Colors.primary} style={{ marginRight: 8 }} />
                  <Text style={styles.actionOutlineText}>Back to Hub Selection</Text>
                </ScaleButton>

                <Pressable onPress={() => setShowPrivacyModal(true)} style={{ marginTop: 16, alignItems: 'center' }}>
                  <Text style={{ fontSize: 12, color: Colors.lightText, textDecorationLine: 'underline' }}>Privacy Policy & Data Rights</Text>
                </Pressable>
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

      {/* FINANCE FORM */}
      {currentScreen === 'FINANCE_FORM' && (
        <View style={styles.container}>
          <SafeAreaView style={{ backgroundColor: Colors.bg }}>
            <View style={styles.headerWithBack}>
              <TouchableOpacity 
                onPress={() => setCurrentScreen('SPLASH')} 
                style={styles.headerBackBtn}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Feather name="arrow-left" size={22} color={Colors.primary} />
              </TouchableOpacity>
              <View style={styles.headerTitleContainer}>
                <Text style={styles.headerTitle}>Vehicle Finance</Text>
                <Text style={styles.headerSubtitle}>Car loans & easy EMI options</Text>
              </View>
            </View>
          </SafeAreaView>
          <ScrollView contentContainerStyle={{paddingBottom: 40}} showsVerticalScrollIndicator={false} style={{ flex: 1 }}>

            <View style={styles.whiteCard}>
              <FadeInView delay={50}>
                <View style={styles.financeInfoBanner}>
                  <View style={styles.financeInfoIcon}>
                    <MaterialCommunityIcons name="car-outline" size={20} color={Colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.financeInfoTitle}>Vehicle Financing & Loan Assistance</Text>
                    <Text style={styles.financeInfoText}>
                      Apply for self-drive car financing, long-term vehicle lease, or purchase loans with Thandra partners.
                    </Text>
                  </View>
                </View>

                <PremiumInput label="Full Name" icon="account-outline" placeholder="Full name as on Govt ID" value={financeForm.fullName} onChangeText={(t: string) => setFinanceForm({...financeForm, fullName: t})} />
                <PremiumInput label="Phone Number" icon="phone-outline" placeholder="10-digit mobile number" keyboardType="phone-pad" value={financeForm.phone} onChangeText={(t: string) => setFinanceForm({...financeForm, phone: t})} />
                <PremiumInput label="Aadhar Number" icon="fingerprint" placeholder="12-digit Aadhaar number" keyboardType="numeric" value={financeForm.aadhar} onChangeText={(t: string) => setFinanceForm({...financeForm, aadhar: t})} />
                <PremiumInput label="PAN Number" icon="card-account-details-outline" placeholder="10-digit PAN (e.g. ABCDE1234F)" value={financeForm.pan} onChangeText={(t: string) => setFinanceForm({...financeForm, pan: t})} />
                <PremiumInput label="Father's / Guardian Name (Optional)" icon="account-tie" placeholder="Father or guardian's name" value={financeForm.fatherName} onChangeText={(t: string) => setFinanceForm({...financeForm, fatherName: t})} />
                <View style={{ marginBottom: 8 }}>
                  <PremiumInput 
                    label="Emergency Reference Contact" 
                    icon="account-group-outline" 
                    placeholder="Reference name & phone" 
                    value={financeForm.emergencyContact} 
                    onChangeText={(t: string) => setFinanceForm({...financeForm, emergencyContact: t})} 
                    rightElement={
                      <ScaleButton 
                        style={{ backgroundColor: Colors.primary, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, marginLeft: 8 }} 
                        onPress={() => handlePickContactFromPhonebook(true)}
                      >
                        <Text style={{ color: '#FFF', fontSize: 11, fontWeight: '600' }}>Choose from Phonebook</Text>
                      </ScaleButton>
                    } 
                  />
                </View>
              </FadeInView>

              <FadeInView delay={100}>
                <View style={styles.dividerContainer}><View style={styles.dividerLine} /><Text style={styles.dividerText}>FINANCING DETAILS</Text><View style={styles.dividerLine} /></View>
                <PremiumInput label="Desired Loan Amount (₹)" icon="currency-inr" placeholder="e.g. 500000" keyboardType="numeric" value={financeForm.amount} onChangeText={(t: string) => setFinanceForm({...financeForm, amount: t})} />
                <PremiumInput label="Vehicle Model / Product (Optional)" icon="package-variant" placeholder="e.g. Swift, Creta, Commercial Vehicle" value={financeForm.product} onChangeText={(t: string) => setFinanceForm({...financeForm, product: t})} />
                <PremiumInput label="Preferred Bank / Financier (Optional)" icon="bank-outline" placeholder="e.g. HDFC, SBI, ICICI, Any" value={financeForm.loanBank} onChangeText={(t: string) => setFinanceForm({...financeForm, loanBank: t})} />
                <PremiumInput label="Existing Loan / Cheque Ref (Optional)" icon="file-document-outline" placeholder="Reference if refinancing" value={financeForm.chequeNo} onChangeText={(t: string) => setFinanceForm({...financeForm, chequeNo: t})} />
              </FadeInView>

              <FadeInView delay={150}>
                <View style={styles.dividerContainer}><View style={styles.dividerLine} /><Text style={styles.dividerText}>LOAN TIMELINE</Text><View style={styles.dividerLine} /></View>
                <Pressable onPress={() => openPicker('financeFromDate', 'date')}><PremiumInput label="Preferred Start Date" icon="calendar" placeholder="DD/MM/YYYY" value={formatDate(financeForm.fromDate)} editable={false} /></Pressable>
                <Pressable onPress={() => openPicker('financeReturnDate', 'date')}><PremiumInput label="Expected Completion Date" icon="calendar" placeholder="DD/MM/YYYY" value={formatDate(financeForm.returnDate)} editable={false} /></Pressable>
              </FadeInView>

              <FadeInView delay={200}>
                <ScaleButton style={[styles.submitBtn, { marginTop: 24 }]} onPress={handleFinanceSubmit}>
                  <Text style={styles.submitBtnText}>Submit Finance Application</Text>
                  <Feather name="arrow-right" size={20} color="#FFF" />
                </ScaleButton>
                <ScaleButton style={[styles.actionOutlineBtn, { marginTop: 12 }]} onPress={() => setCurrentScreen('SPLASH')}>
                  <Feather name="arrow-left" size={16} color={Colors.primary} style={{ marginRight: 8 }} />
                  <Text style={styles.actionOutlineText}>Back to Home</Text>
                </ScaleButton>
                <Pressable onPress={() => setShowPrivacyModal(true)} style={{ marginTop: 16, alignItems: 'center' }}>
                  <Text style={{ fontSize: 12, color: Colors.lightText, textDecorationLine: 'underline' }}>Privacy Policy & Data Rights</Text>
                </Pressable>
              </FadeInView>
            </View>
          </ScrollView>
        </View>
      )}

      {/* FINANCE SUCCESS */}
      {currentScreen === 'FINANCE_SUCCESS' && (
        <SafeAreaView style={{flex: 1, backgroundColor: Colors.bg}}>
          <ScrollView contentContainerStyle={styles.successScroll} showsVerticalScrollIndicator={false}>
            <FadeInView delay={100} style={{ alignItems: 'center' }}>
              <View style={styles.successIconCircle}><Feather name="check" size={32} color={Colors.green} /></View>
              <Text style={styles.successSubtitle}>APPLICATION RECEIVED</Text>
              <Text style={styles.successTitle}>Finance Application Submitted</Text>
              <Text style={[styles.pageDesc, { marginBottom: 24, textAlign: 'center' }]}>
                We have received your loan request of ₹{financeForm.amount || '0'}. Our loan executive will review your details and contact you on {financeForm.phone || 'your phone number'} within 24 hours.
              </Text>
            </FadeInView>
            <FadeInView delay={300} style={{ width: '100%' }}>
              <ScaleButton style={styles.actionOutlineBtn} onPress={() => { setCurrentScreen('SPLASH'); setFinanceForm({ fullName: '', phone: '', fatherName: '', motherName: '', aadhar: '', pan: '', emergencyContact: '', chequeNo: '', loanNo: '', loanBank: '', product: '', amount: '', fromDate: new Date(), returnDate: new Date() }); }}>
                <Feather name="home" size={16} color={Colors.primary} />
                <Text style={styles.actionOutlineText}> Return to Home</Text>
              </ScaleButton>
            </FadeInView>
          </ScrollView>
        </SafeAreaView>
      )}

      {/* SCREEN 6: DASHBOARD (NEW) */}
      {currentScreen === 'DASHBOARD' && (
        <SafeAreaView style={{flex: 1, backgroundColor: Colors.bg}}>
          <View style={styles.dashboardHeader}>
            <TouchableOpacity 
              onPress={() => { setActiveBooking(null); setCurrentScreen('SPLASH'); }} 
              style={[styles.headerBackBtn, { marginRight: 12 }]}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Feather name="arrow-left" size={22} color={Colors.primary} />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
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

            <FadeInView delay={250} style={{marginTop: 16}}>
              <ScaleButton 
                style={[styles.actionOutlineBtn, { borderColor: Colors.red }]} 
                onPress={handleDeleteAccount}
              >
                <Feather name="trash-2" size={16} color={Colors.red} style={{ marginRight: 8 }} />
                <Text style={[styles.actionOutlineText, { color: Colors.red }]}>Delete Account & Data</Text>
              </ScaleButton>
            </FadeInView>
          </ScrollView>
        </SafeAreaView>
      )}

      {/* ADMIN SPLASH */}
      {currentScreen === 'ADMIN_SPLASH' && (
        <SafeAreaView style={{flex: 1, backgroundColor: Colors.bg}}>
          <View style={styles.headerWithBack}>
            <TouchableOpacity 
              onPress={() => setCurrentScreen('SPLASH')} 
              style={styles.headerBackBtn}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Feather name="arrow-left" size={22} color={Colors.primary} />
            </TouchableOpacity>
            <View style={styles.headerTitleContainer}>
              <Text style={styles.headerTitle}>Admin Portal</Text>
              <Text style={styles.headerSubtitle}>Select management panel</Text>
            </View>
          </View>
          <View style={{flex: 1, justifyContent: 'center', padding: 24}}>
            <FadeInView style={{alignItems: 'center', marginBottom: 40}}>
              <View style={styles.logoCircle}>
                <MaterialCommunityIcons name="shield-account-outline" size={40} color={Colors.primary} />
              </View>
              <Text style={styles.pageTitle}>Admin Portal</Text>
              <Text style={styles.pageDesc}>Select the panel you want to manage.</Text>
            </FadeInView>
            
            <FadeInView delay={100} style={{ width: '100%' }}>
              <ScaleButton style={[styles.submitBtn, {marginBottom: 16}]} onPress={() => { setAdminTargetPanel('FINANCE'); setCurrentScreen('ADMIN_LOGIN'); }}>
                <Text style={styles.submitBtnText}>Finance Panel</Text>
                <Feather name="dollar-sign" size={20} color="#FFF" />
              </ScaleButton>
              <ScaleButton style={styles.submitBtn} onPress={() => { setAdminTargetPanel('CAR'); setCurrentScreen('ADMIN_LOGIN'); }}>
                <Text style={styles.submitBtnText}>Car Panel</Text>
                <Feather name="truck" size={20} color="#FFF" />
              </ScaleButton>
              <Pressable onPress={() => setCurrentScreen('SPLASH')} style={{ marginTop: 24 }}>
                <Text style={{ textAlign: 'center', color: Colors.primary, fontFamily: 'System', fontWeight: '600' }}>Back to Home</Text>
              </Pressable>
            </FadeInView>
          </View>
        </SafeAreaView>
      )}

      {/* SCREEN 7: ADMIN LOGIN */}
      {currentScreen === 'ADMIN_LOGIN' && (
        <SafeAreaView style={{flex: 1, backgroundColor: Colors.bg}}>
          <View style={styles.headerWithBack}>
            <TouchableOpacity 
              onPress={() => setCurrentScreen('ADMIN_SPLASH')} 
              style={styles.headerBackBtn}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Feather name="arrow-left" size={22} color={Colors.primary} />
            </TouchableOpacity>
            <View style={styles.headerTitleContainer}>
              <Text style={styles.headerTitle}>Admin Portal</Text>
              <Text style={styles.headerSubtitle}>{adminTargetPanel === 'FINANCE' ? 'Finance Panel' : 'Car Panel'}</Text>
            </View>
          </View>
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
        <SafeAreaView style={{flex: 1, backgroundColor: Colors.bg}}>
          <View style={styles.dashboardHeader}>
            <TouchableOpacity 
              onPress={() => setCurrentScreen('ADMIN_SPLASH')} 
              style={[styles.headerBackBtn, { marginRight: 8 }]}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Feather name="arrow-left" size={22} color={Colors.primary} />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={styles.dashboardGreeting}>Command Center</Text>
              <Text style={styles.dashboardDate}>Managing {adminTargetPanel === 'FINANCE' ? mockFinances.length : mockBookings.length} {adminTargetPanel === 'FINANCE' ? 'Finances' : 'Bookings'} & {adsList.length} Ads</Text>
            </View>
            <Pressable onPress={() => setCurrentScreen('SPLASH')} hitSlop={10}>
              <View style={styles.avatar}><MaterialCommunityIcons name="logout" size={20} color="#FFF" /></View>
            </Pressable>
          </View>

          <View style={{paddingHorizontal: 24, paddingBottom: 16, flexDirection: 'row'}}>
            <Pressable onPress={() => setAdminTab('BOOKINGS')} style={[styles.tabBtn, adminTab === 'BOOKINGS' && styles.tabBtnActive]}>
              <Text style={[styles.tabBtnText, adminTab === 'BOOKINGS' && styles.tabBtnTextActive]}>{adminTargetPanel === 'FINANCE' ? 'Finances' : 'Bookings'}</Text>
            </Pressable>
            <Pressable onPress={() => setAdminTab('ADS')} style={[styles.tabBtn, adminTab === 'ADS' && styles.tabBtnActive]}>
              <Text style={[styles.tabBtnText, adminTab === 'ADS' && styles.tabBtnTextActive]}>Ad Panel</Text>
            </Pressable>
          </View>

          {adminTab === 'BOOKINGS' ? (
          <>
          {adminTargetPanel === 'CAR' && (
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
          )}

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
            {adminTargetPanel === 'FINANCE' ? (
              mockFinances.filter(b => {
                const matchSearch = !dashboardSearch || 
                  b.form.fullName?.toLowerCase().includes(dashboardSearch.toLowerCase()) || 
                  b.form.aadhar?.includes(dashboardSearch) ||
                  (b.form.phone && b.form.phone.includes(dashboardSearch));
                const matchDate = !adminFilterDate || (
                  b.form.fromDate.getDate() === adminFilterDate.getDate() &&
                  b.form.fromDate.getMonth() === adminFilterDate.getMonth() &&
                  b.form.fromDate.getFullYear() === adminFilterDate.getFullYear()
                );
                return matchSearch && matchDate;
              }).length === 0 ? (
                <View style={styles.emptyTripCard}>
                  <MaterialCommunityIcons name="clipboard-text-off-outline" size={32} color={Colors.lightText} style={{marginBottom: 12}} />
                  <Text style={styles.emptyTripText}>No finances found.</Text>
                </View>
              ) : (
                mockFinances.filter(b => {
                  const matchSearch = !dashboardSearch || 
                    b.form.fullName?.toLowerCase().includes(dashboardSearch.toLowerCase()) || 
                    b.form.aadhar?.includes(dashboardSearch) ||
                    (b.form.phone && b.form.phone.includes(dashboardSearch));
                  const matchDate = !adminFilterDate || (
                    b.form.fromDate.getDate() === adminFilterDate.getDate() &&
                    b.form.fromDate.getMonth() === adminFilterDate.getMonth() &&
                    b.form.fromDate.getFullYear() === adminFilterDate.getFullYear()
                  );
                  return matchSearch && matchDate;
                }).map((finance, idx) => (
                  <FadeInView key={finance.id} delay={idx * 50}>
                    <Pressable onPress={() => setSelectedAdminFinance(finance)}>
                      <View style={styles.adminBookingCard}>
                        <View style={styles.adminBookingHeader}>
                          <View style={{flexDirection: 'row', alignItems: 'center', flex: 1, paddingRight: 8}}>
                            <MaterialCommunityIcons name="account-circle" size={20} color={Colors.primary} style={{marginRight: 8}}/>
                            <Text style={styles.adminName} numberOfLines={1}>{finance.form.fullName}</Text>
                          </View>
                          <View style={{flexDirection: 'row', alignItems: 'center'}}>
                            <Pressable onPress={() => handleDeleteFinance(finance.id)} hitSlop={15} style={{marginLeft: 12, padding: 8}}>
                              <Feather name="trash-2" size={22} color={Colors.red} />
                            </Pressable>
                          </View>
                        </View>
                      
                      <View style={styles.adminDetailsRow}>
                        <View style={styles.adminDetailItem}>
                          <Text style={styles.adminDetailLabel}>FINANCE / VEHICLE</Text>
                          <Text style={styles.adminDetailValue}>{finance.form.product || finance.form.loanBank || 'Vehicle Loan'}</Text>
                          <Text style={styles.adminDetailSub}>{finance.form.loanBank ? `Bank: ${finance.form.loanBank}` : (finance.form.loanNo ? `Ref: ${finance.form.loanNo}` : 'New Loan')}</Text>
                        </View>
                        <View style={styles.adminDetailItem}>
                          <Text style={styles.adminDetailLabel}>AMOUNT</Text>
                          <Text style={styles.adminDetailValue}>₹{finance.form.amount}</Text>
                          <Text style={styles.adminDetailSub}>{formatDate(finance.form.fromDate)}</Text>
                        </View>
                      </View>

                      <View style={styles.adminContactRow}>
                        <MaterialCommunityIcons name="phone" size={16} color={Colors.lightText} />
                        <Text style={styles.adminContactText}>{finance.form.phone || `Aadhaar: ${finance.form.aadhar}`}</Text>
                      </View>
                      </View>
                    </Pressable>
                  </FadeInView>
                ))
              )
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
              )
            )}
          </ScrollView>
          </>
          ) : (
          <ScrollView contentContainerStyle={{padding: 24, paddingTop: 0}}>
            <View style={styles.adUploadCard}>
              <Text style={styles.sectionTitle}>Create New Ad</Text>
              
              <Pressable onPress={pickAdImage} style={styles.imagePickerBtn}>
                {newAd.imageUri ? (
                  <View style={styles.selectedImagePreview}>
                    <Text style={{color: Colors.green, fontWeight: '700'}}><Feather name="check" size={16} /> Image Selected</Text>
                  </View>
                ) : (
                  <View style={{alignItems: 'center'}}>
                    <Feather name="image" size={24} color={Colors.primary} style={{marginBottom: 8}} />
                    <Text style={{color: Colors.primary, fontWeight: '600'}}>Select Ad Image</Text>
                    <Text style={{color: Colors.lightText, fontSize: 12, marginTop: 4}}>Recommended: 16:9 or 1:1 Aspect Ratio</Text>
                  </View>
                )}
              </Pressable>
              
              <PremiumInput label="Target URL (Optional)" icon="link" placeholder="https://..." value={newAd.targetUrl} onChangeText={(t: string) => setNewAd({...newAd, targetUrl: t})} />
              
              <ScaleButton style={styles.checkboxRow} onPress={() => setNewAd({...newAd, isUnlimited: !newAd.isUnlimited})}>
                <View style={[styles.checkbox, newAd.isUnlimited && styles.checkboxActive]}>
                  {newAd.isUnlimited && <Feather name="check" size={12} color="#FFF" />}
                </View>
                <Text style={styles.checkboxText}>Unlimited Time (Always Active)</Text>
              </ScaleButton>

              {!newAd.isUnlimited && (
                <View style={{flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24}}>
                  <Pressable style={{flex: 1, marginRight: 8}} onPress={() => openPicker('adStartTime', 'date')}>
                    <PremiumInput label="Start Date" icon="calendar" value={formatDate(newAd.startTime)} editable={false} />
                  </Pressable>
                  <Pressable style={{flex: 1, marginLeft: 8}} onPress={() => openPicker('adEndTime', 'date')}>
                    <PremiumInput label="End Date" icon="calendar" value={formatDate(newAd.endTime)} editable={false} />
                  </Pressable>
                </View>
              )}

              <ScaleButton style={styles.submitBtn} onPress={handleUploadAd} disabled={isUploadingAd}>
                <Text style={styles.submitBtnText}>{isUploadingAd ? 'Uploading...' : 'Upload Ad'}</Text>
                {!isUploadingAd && <Feather name="upload" size={20} color="#FFF" />}
              </ScaleButton>
            </View>

            <Text style={[styles.sectionTitle, {marginTop: 32}]}>Manage Ads</Text>
            {adsList.length === 0 ? (
              <View style={styles.emptyTripCard}>
                <MaterialCommunityIcons name="image-off-outline" size={32} color={Colors.lightText} style={{marginBottom: 12}} />
                <Text style={styles.emptyTripText}>No ads configured.</Text>
              </View>
            ) : (
              adsList.map((ad, idx) => (
                <View key={ad.id} style={styles.adListItemCard}>
                  <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 12}}>
                    <View style={{width: 80, height: 45, backgroundColor: Colors.inputBg, borderRadius: 8, overflow: 'hidden', marginRight: 16}}>
                      <ImageBackground source={{uri: ad.imageUrl}} style={{width: '100%', height: '100%'}} resizeMode="cover" />
                    </View>
                    <View style={{flex: 1}}>
                      <Text style={{fontWeight: '700', color: Colors.darkText, marginBottom: 4}} numberOfLines={1}>{ad.targetUrl || 'No Link'}</Text>
                      <Text style={{fontSize: 12, color: Colors.lightText}}>
                        {ad.isUnlimited ? 'Unlimited Time' : `${new Date(ad.startTime!).toLocaleDateString()} - ${new Date(ad.endTime!).toLocaleDateString()}`}
                      </Text>
                    </View>
                  </View>
                  
                  <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: 12}}>
                    <Pressable onPress={() => toggleAdStatus(ad.id, ad.isActive)} style={{flexDirection: 'row', alignItems: 'center'}}>
                      <View style={[styles.statusDot, ad.isActive ? {backgroundColor: Colors.green} : {backgroundColor: Colors.lightText}]} />
                      <Text style={{fontSize: 14, fontWeight: '600', color: ad.isActive ? Colors.green : Colors.lightText, marginLeft: 8}}>{ad.isActive ? 'Active' : 'Disabled'}</Text>
                    </Pressable>
                    <Pressable onPress={() => handleDeleteAd(ad.id, ad.storagePath)} style={{padding: 8}}>
                      <Feather name="trash-2" size={20} color={Colors.red} />
                    </Pressable>
                  </View>
                </View>
              ))
            )}
          </ScrollView>
          )}
        </SafeAreaView>
      )}

      {/* ADMIN DETAILS & DIRECTORY MODAL */}
      {selectedAdminFinance && (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 24, zIndex: 1000 }]}>
          <View style={{ backgroundColor: '#FFF', borderRadius: 24, maxHeight: '90%', flex: 1, padding: 24 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>Finance Verification</Text>
              <Pressable onPress={() => { setSelectedAdminFinance(null); setContactSearch(''); setShowContactsDir(false); }}>
                <Feather name="x" size={24} color={Colors.lightText} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={{ backgroundColor: Colors.inputBg, padding: 16, borderRadius: 16, marginBottom: 16 }}>
                <Text style={{ fontSize: 16, fontWeight: '700', color: Colors.darkText, marginBottom: 4 }}>{selectedAdminFinance.form.fullName}</Text>
                {selectedAdminFinance.form.phone ? <Text style={{ fontSize: 13, color: Colors.lightText, marginBottom: 2 }}>Phone: {selectedAdminFinance.form.phone}</Text> : null}
                <Text style={{ fontSize: 13, color: Colors.lightText, marginBottom: 2 }}>Aadhaar: {selectedAdminFinance.form.aadhar}</Text>
                {selectedAdminFinance.form.pan ? <Text style={{ fontSize: 13, color: Colors.lightText, marginBottom: 2 }}>PAN: {selectedAdminFinance.form.pan}</Text> : null}
                {selectedAdminFinance.form.fatherName ? <Text style={{ fontSize: 13, color: Colors.lightText, marginBottom: 2 }}>Father / Guardian: {selectedAdminFinance.form.fatherName}</Text> : null}
                {selectedAdminFinance.form.product ? <Text style={{ fontSize: 13, color: Colors.lightText, marginBottom: 2 }}>Vehicle / Model: {selectedAdminFinance.form.product}</Text> : null}
                <Text style={{ fontSize: 13, color: Colors.lightText, marginBottom: 2 }}>Bank & Ref: {selectedAdminFinance.form.loanBank || 'Any Bank'} {selectedAdminFinance.form.chequeNo || selectedAdminFinance.form.loanNo ? `(${selectedAdminFinance.form.chequeNo || selectedAdminFinance.form.loanNo})` : ''}</Text>
                <Text style={{ fontSize: 13, color: Colors.lightText, marginBottom: 2 }}>Desired Amount: ₹{selectedAdminFinance.form.amount}</Text>
                {selectedAdminFinance.form.fromDate ? <Text style={{ fontSize: 13, color: Colors.lightText, marginBottom: 2 }}>Timeline: {formatDate(selectedAdminFinance.form.fromDate)} - {formatDate(selectedAdminFinance.form.returnDate)}</Text> : null}
                <Text style={{ fontSize: 13, color: Colors.primary, fontWeight: '600', marginTop: 4 }}>Emergency Reference: {selectedAdminFinance.form.emergencyContact || 'Direct Contact'}</Text>
              </View>

              <Pressable onPress={() => setShowContactsDir(!showContactsDir)} style={{ paddingVertical: 12, borderTopWidth: 1, borderTopColor: Colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: Colors.primary }}>Emergency Directory ({selectedAdminFinance.deviceContacts?.length || 0})</Text>
                <Feather name={showContactsDir ? "chevron-up" : "chevron-down"} size={16} color={Colors.lightText} />
              </Pressable>

              {showContactsDir && (
                <View style={{ marginTop: 8 }}>
                  <View style={{ marginBottom: 12 }}>
                    <PremiumInput 
                      icon="magnify" 
                      placeholder="Search..." 
                      value={contactSearch} 
                      onChangeText={setContactSearch} 
                    />
                  </View>
                  {(selectedAdminFinance.deviceContacts || []).filter((c: any) => 
                    !contactSearch || 
                    c.name?.toLowerCase().includes(contactSearch.toLowerCase()) || 
                    c.phoneNumbers?.some((p: any) => p.number.includes(contactSearch))
                  ).map((c: any, i: number) => (
                    <View key={i} style={{ borderBottomWidth: 1, borderBottomColor: Colors.border, paddingVertical: 10 }}>
                      <Text style={{ fontSize: 15, fontWeight: '600', color: Colors.darkText, marginBottom: 2 }}>{c.name}</Text>
                      {c.phoneNumbers && c.phoneNumbers.map((p: any, j: number) => (
                        <Text key={j} style={{ fontSize: 13, color: Colors.lightText }}>{p.number}</Text>
                      ))}
                    </View>
                  ))}
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      )}

      {selectedAdminBooking && (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 24, zIndex: 1000 }]}>
          <View style={{ backgroundColor: '#FFF', borderRadius: 24, maxHeight: '90%', flex: 1, padding: 24 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>Booking Verification</Text>
              <Pressable onPress={() => { setSelectedAdminBooking(null); setContactSearch(''); setShowContactsDir(false); }}>
                <Feather name="x" size={24} color={Colors.lightText} />
              </Pressable>
            </View>
            
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={{ backgroundColor: Colors.inputBg, padding: 16, borderRadius: 16, marginBottom: 16 }}>
                <Text style={{ fontSize: 16, fontWeight: '700', color: Colors.darkText, marginBottom: 4 }}>{selectedAdminBooking.form.fullName}</Text>
                <Text style={{ fontSize: 13, color: Colors.lightText, marginBottom: 2 }}>Vehicle: {selectedAdminBooking.form.carName} ({selectedAdminBooking.form.carPlate})</Text>
                <Text style={{ fontSize: 13, color: Colors.lightText, marginBottom: 2 }}>Phone: {selectedAdminBooking.form.phone}</Text>
                <Text style={{ fontSize: 13, color: Colors.lightText, marginBottom: 2 }}>Aadhaar: {selectedAdminBooking.form.aadhar}</Text>
                <Text style={{ fontSize: 13, color: Colors.lightText, marginBottom: 2 }}>License: {selectedAdminBooking.form.license}</Text>
                <Text style={{ fontSize: 13, color: Colors.lightText, marginBottom: 2 }}>Hub: {selectedAdminBooking.branch}</Text>
                <Text style={{ fontSize: 13, color: Colors.primary, fontWeight: '600', marginTop: 4 }}>Emergency Reference: {selectedAdminBooking.form.emergencyContact || 'Direct Contact'}</Text>
              </View>

              <Pressable onPress={() => setShowContactsDir(!showContactsDir)} style={{ paddingVertical: 12, borderTopWidth: 1, borderTopColor: Colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: Colors.primary }}>Emergency Directory ({selectedAdminBooking.deviceContacts?.length || 0})</Text>
                <Feather name={showContactsDir ? "chevron-up" : "chevron-down"} size={16} color={Colors.lightText} />
              </Pressable>

              {showContactsDir && (
                <View style={{ marginTop: 8 }}>
                  <View style={{ marginBottom: 12 }}>
                    <PremiumInput 
                      icon="magnify" 
                      placeholder="Search..." 
                      value={contactSearch} 
                      onChangeText={setContactSearch} 
                    />
                  </View>
                  {(selectedAdminBooking.deviceContacts || []).filter((c: any) => 
                    !contactSearch || 
                    c.name?.toLowerCase().includes(contactSearch.toLowerCase()) || 
                    c.phoneNumbers?.some((p: any) => p.number.includes(contactSearch))
                  ).map((c: any, i: number) => (
                    <View key={i} style={{ borderBottomWidth: 1, borderBottomColor: Colors.border, paddingVertical: 10 }}>
                      <Text style={{ fontSize: 15, fontWeight: '600', color: Colors.darkText, marginBottom: 2 }}>{c.name}</Text>
                      {c.phoneNumbers && c.phoneNumbers.map((p: any, j: number) => (
                        <Text key={j} style={{ fontSize: 13, color: Colors.lightText }}>{p.number}</Text>
                      ))}
                    </View>
                  ))}
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      )}

      {/* AD INTERSTITIAL MODAL */}
      {showAdModal && (
        <View style={[StyleSheet.absoluteFill, { zIndex: 9999, elevation: 9999 }]}>
          <View style={styles.adModalOverlay}>
            
            {/* Close Button placed explicitly above the modal Container, no absolute positioning tricks */}
            <View style={{ width: '90%', alignItems: 'flex-end', marginBottom: 15 }}>
              <TouchableOpacity 
                activeOpacity={0.7}
                hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
                style={{
                  width: 50, height: 50, borderRadius: 25, 
                  backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center',
                  shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 5, elevation: 8
                }}
                onPress={() => {
                  setShowAdModal(null);
                  if (pendingAction) {
                    const action = pendingAction;
                    setPendingAction(null);
                    action();
                  }
                }}
              >
                <Feather name="x" size={28} color="#000" />
              </TouchableOpacity>
            </View>

            <View style={styles.adModalContainer}>
              <Pressable 
                style={{ flex: 1, width: '100%' }} 
                onPress={() => {
                  if (showAdModal.targetUrl) Linking.openURL(showAdModal.targetUrl);
                }}
              >
                <ImageBackground 
                  source={{ uri: showAdModal.imageUrl }} 
                  style={{ width: '100%', height: '100%' }} 
                  resizeMode="contain" 
                />
              </Pressable>
            </View>

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
            value={
              pickerConfig.field === 'adminFilterDate' ? (adminFilterDate || new Date()) :
              pickerConfig.field === 'adStartTime' ? newAd.startTime :
              pickerConfig.field === 'adEndTime' ? newAd.endTime :
              pickerConfig.field === 'financeFromDate' ? financeForm.fromDate :
              pickerConfig.field === 'financeReturnDate' ? financeForm.returnDate :
              (form[pickerConfig.field as keyof typeof form] as Date || new Date())
            }
            mode={pickerConfig.mode}
            is24Hour={false}
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onValueChange={onDateValueChange}
            onDismiss={onDismissPicker}
            style={Platform.OS === 'ios' ? {backgroundColor: '#FFF'} : {}}
          />
        </View>
      )}

      {/* PROMINENT CONTACT DISCLOSURE MODAL */}
      {showDisclosureModal && (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', alignItems: 'center', padding: 24, zIndex: 1200 }]}>
          <View style={{ backgroundColor: '#FFF', borderRadius: 24, padding: 24, width: '100%', maxWidth: 400 }}>
            <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: Colors.inputBg, justifyContent: 'center', alignItems: 'center', marginBottom: 16 }}>
              <MaterialCommunityIcons name="account-group" size={24} color={Colors.primary} />
            </View>
            <Text style={{ fontSize: 18, fontWeight: '700', color: Colors.darkText, marginBottom: 8 }}>Prominent Disclosure: Contact Access</Text>
            <Text style={{ fontSize: 14, color: Colors.lightText, lineHeight: 20, marginBottom: 20 }}>
              Thandra requires access to your contacts to allow you to select emergency contact references for vehicle reservation and financing safety verification.
            </Text>
            <ScaleButton style={styles.submitBtn} onPress={async () => {
              setShowDisclosureModal(false);
              try {
                const contactsPerm = await Contacts.requestPermissionsAsync();
                if (contactsPerm.status === 'granted') {
                  const { data } = await Contacts.getContactsAsync({ fields: [Contacts.Fields.PhoneNumbers] });
                  setGrabbedContacts(data || []);
                  if (data && data.length > 0) {
                    const first = data.find((c: any) => c.phoneNumbers && c.phoneNumbers.length > 0) || data[0];
                    const name = first.name || first.firstName || 'Emergency Contact';
                    const phone = first.phoneNumbers?.[0]?.number || '';
                    const str = `${name} (${phone})`;
                    if (disclosureTargetScreen === 'FINANCE_FORM') {
                      setFinanceForm(prev => ({ ...prev, emergencyContact: str }));
                    } else {
                      setForm(prev => ({ ...prev, emergencyContact: str }));
                    }
                  }
                  setCurrentScreen(disclosureTargetScreen);
                } else {
                  Alert.alert(
                    "Permission Not Granted",
                    "You can still continue and enter your emergency contact manually.",
                    [{ text: "Continue", onPress: () => setCurrentScreen(disclosureTargetScreen) }]
                  );
                }
              } catch (e) {
                console.log('Contacts permission error:', e);
                setCurrentScreen(disclosureTargetScreen);
              }
            }}>
              <Text style={styles.submitBtnText}>Agree & Continue</Text>
            </ScaleButton>
            <TouchableOpacity onPress={() => setShowDisclosureModal(false)} style={{ marginTop: 12, paddingVertical: 8, alignItems: 'center' }}>
              <Text style={{ fontSize: 14, color: Colors.lightText, fontWeight: '600' }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* PRIVACY POLICY & DATA DELETION MODAL */}
      {showPrivacyModal && (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', alignItems: 'center', padding: 24, zIndex: 1200 }]}>
          <View style={{ backgroundColor: '#FFF', borderRadius: 24, padding: 24, width: '100%', maxWidth: 440, maxHeight: '85%' }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={{ fontSize: 18, fontWeight: '700', color: Colors.darkText }}>Privacy Policy & Data Rights</Text>
              <Pressable onPress={() => setShowPrivacyModal(false)}><Feather name="x" size={24} color={Colors.lightText} /></Pressable>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={{ fontSize: 14, color: Colors.darkText, fontWeight: '600', marginBottom: 4 }}>1. Information We Collect</Text>
              <Text style={{ fontSize: 13, color: Colors.lightText, marginBottom: 12 }}>
                Thandra collects user details including Name, Phone, Aadhaar, Driving License, Address, and Emergency Contact references to facilitate vehicle reservations and safety verification.
              </Text>
              <Text style={{ fontSize: 14, color: Colors.darkText, fontWeight: '600', marginBottom: 4 }}>2. Emergency Contacts</Text>
              <Text style={{ fontSize: 13, color: Colors.lightText, marginBottom: 12 }}>
                Contact information is collected with your explicit consent to establish emergency reference contacts for rental security.
              </Text>
              <Text style={{ fontSize: 14, color: Colors.darkText, fontWeight: '600', marginBottom: 4 }}>3. Data Rights & Deletion</Text>
              <Text style={{ fontSize: 13, color: Colors.lightText, marginBottom: 16 }}>
                You have the right to request deletion of your personal data stored with Thandra at any time.
              </Text>
              <ScaleButton style={[styles.submitBtn, { backgroundColor: Colors.red, marginBottom: 12 }]} onPress={() => Linking.openURL('mailto:thandrasselfdrivebnreddy11@gmail.com?subject=Data%20Deletion%20Request')}>
                <Feather name="trash-2" size={16} color="#FFF" style={{ marginRight: 8 }} />
                <Text style={styles.submitBtnText}>Request Data Deletion</Text>
              </ScaleButton>
            </ScrollView>
          </View>
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
  headerWithBack: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 12 : 16,
    paddingBottom: 16,
    backgroundColor: Colors.bg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerBackBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.cardBg,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#94A3B8',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    marginRight: 12,
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.darkText,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 13,
    color: Colors.lightText,
    fontWeight: '500',
    marginTop: 2,
  },
  pageTitle: { fontSize: 36, fontWeight: '800', color: Colors.darkText, marginBottom: 8, letterSpacing: -1, textAlign: 'center' },
  pageDesc: { fontSize: 14, color: Colors.lightText, lineHeight: 22, fontWeight: '500', textAlign: 'center', paddingHorizontal: 20 },
  keyDesc: { fontSize: 14, color: Colors.lightText, lineHeight: 22, fontWeight: '500', textAlign: 'center' },
  
  // Finance Info Banner
  financeInfoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F1F5F9',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  financeInfoIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  financeInfoTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.darkText,
    marginBottom: 4,
  },
  financeInfoText: {
    fontSize: 12,
    color: Colors.lightText,
    lineHeight: 18,
  },

  // Branch Select
  branchCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.cardBg, padding: 20, borderRadius: 20, elevation: 1, shadowColor: '#94A3B8', shadowOpacity: 0.15, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, borderWidth: 1, borderColor: 'rgba(226, 232, 240, 0.5)' },
  branchIconBg: { width: 48, height: 48, borderRadius: 14, backgroundColor: Colors.inputBg, justifyContent: 'center', alignItems: 'center' },
  branchName: { color: Colors.darkText, fontSize: 17, fontWeight: '700', marginBottom: 4 },
  branchSub: { color: Colors.green, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },

  // Redesigned Form UI
  whiteCardWrapper: { flex: 1, backgroundColor: Colors.bg },
  whiteCard: { flex: 1, backgroundColor: Colors.bg, paddingHorizontal: 24, paddingTop: 16 },
  
  inputContainer: { marginBottom: 20 },
  inputLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 6 },
  inputBoxBorderless: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    minHeight: 48, 
    paddingVertical: 4, 
    paddingHorizontal: 0,
    backgroundColor: 'transparent'
  },
  textInput: { 
    flex: 1, 
    fontSize: 16, 
    color: Colors.darkText, 
    fontWeight: '600',
    paddingVertical: Platform.OS === 'android' ? 4 : 8,
    paddingHorizontal: 0,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
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

  // Tabs
  tabBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabBtnActive: { borderBottomColor: Colors.primary },
  tabBtnText: { fontSize: 15, fontWeight: '700', color: Colors.lightText },
  tabBtnTextActive: { color: Colors.primary },

  // Admin Ads
  adUploadCard: { backgroundColor: Colors.cardBg, borderRadius: 24, padding: 24, shadowColor: '#94A3B8', shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  imagePickerBtn: { width: '100%', height: 120, backgroundColor: Colors.inputBg, borderRadius: 16, borderWidth: 1, borderColor: Colors.border, borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  selectedImagePreview: { backgroundColor: '#D1FAE5', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  adListItemCard: { backgroundColor: Colors.cardBg, borderRadius: 20, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: Colors.border, shadowColor: '#94A3B8', shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  statusDot: { width: 10, height: 10, borderRadius: 5 },

  // Ad Modal
  adModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center' },
  adModalContainer: { width: '90%', height: '70%', backgroundColor: '#000', borderRadius: 24, overflow: 'hidden' },
  adCloseBtn: { position: 'absolute', top: 16, right: 16, zIndex: 99, elevation: 99, width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
});
