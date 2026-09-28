const fs = require('fs');
let code = fs.readFileSync('App.tsx', 'utf8');

// 1. Add imports
code = code.replace(
  "import { collection, addDoc, onSnapshot, query, orderBy, deleteDoc, doc, getDoc } from 'firebase/firestore';",
  `import { collection, addDoc, onSnapshot, query, orderBy, deleteDoc, doc, getDoc, updateDoc } from 'firebase/firestore';
import * as ImagePicker from 'expo-image-picker';
import { storage } from './firebaseConfig';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';

type AdType = {
  id: string;
  imageUrl: string;
  targetUrl: string;
  isUnlimited: boolean;
  isActive: boolean;
  startTime?: string;
  endTime?: string;
  createdAt: string;
};`
);

// 2. Add states
code = code.replace(
  "const [selectedAdminBooking, setSelectedAdminBooking] = useState<any>(null);",
  `const [selectedAdminBooking, setSelectedAdminBooking] = useState<any>(null);
  
  // Admin Ads State
  const [adminTab, setAdminTab] = useState<'BOOKINGS' | 'ADS'>('BOOKINGS');
  const [adsList, setAdsList] = useState<AdType[]>([]);
  const [isUploadingAd, setIsUploadingAd] = useState(false);
  const [newAd, setNewAd] = useState({ targetUrl: '', isUnlimited: true, startTime: new Date(), endTime: new Date(Date.now() + 86400000), isActive: true, imageUri: '' });
  
  // User Ads State
  const [activeAds, setActiveAds] = useState<AdType[]>([]);
  const [showAdModal, setShowAdModal] = useState<AdType | null>(null);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);`
);

// 3. Add effect for Ads
code = code.replace(
  "return () => unsubscribe();\n    }\n  }, [currentScreen]);",
  `return () => unsubscribe();
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
  }, []);`
);

// 4. Add picker logic for ads
code = code.replace(
  "if (pickerConfig.field === 'adminFilterDate') {",
  `if (pickerConfig.field === 'adminFilterDate') {
        setAdminFilterDate(selectedDate);
      } else if (pickerConfig.field === 'adStartTime') {
        setNewAd({ ...newAd, startTime: selectedDate });
      } else if (pickerConfig.field === 'adEndTime') {
        setNewAd({ ...newAd, endTime: selectedDate });
      }`
);

// 5. Add handleUploadAd & related functions
code = code.replace(
  "const requestPermissions = async () => {",
  `const pickAdImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      setNewAd({ ...newAd, imageUri: result.assets[0].uri });
    }
  };

  const handleUploadAd = async () => {
    if (!newAd.imageUri) return Alert.alert('Error', 'Please select an image');
    if (!newAd.isUnlimited && newAd.startTime >= newAd.endTime) return Alert.alert('Error', 'End time must be after start time');
    
    setIsUploadingAd(true);
    try {
      const response = await fetch(newAd.imageUri);
      const blob = await response.blob();
      const filename = 'ads/' + Date.now() + '-' + Math.random().toString(36).substring(7) + '.jpg';
      const storageRef = ref(storage, filename);
      
      await uploadBytesResumable(storageRef, blob);
      const downloadURL = await getDownloadURL(storageRef);
      
      await addDoc(collection(db, "ads"), {
        imageUrl: downloadURL,
        targetUrl: newAd.targetUrl,
        isUnlimited: newAd.isUnlimited,
        isActive: newAd.isActive,
        startTime: newAd.isUnlimited ? null : newAd.startTime.toISOString(),
        endTime: newAd.isUnlimited ? null : newAd.endTime.toISOString(),
        createdAt: new Date().toISOString(),
        storagePath: filename
      });
      
      setNewAd({ targetUrl: '', isUnlimited: true, startTime: new Date(), endTime: new Date(Date.now() + 86400000), isActive: true, imageUri: '' });
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
            if (storagePath) {
              const storageRef = ref(storage, storagePath);
              await deleteObject(storageRef);
            }
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

  const requestPermissions = async () => {`
);

// 6. Modify requestPermissions call in SPLASH
code = code.replace(
  "<ScaleButton style={styles.splashSubmitBtn} onPress={requestPermissions}>",
  "<ScaleButton style={styles.splashSubmitBtn} onPress={() => showRandomAdThenExecute(requestPermissions)}>"
);

// 7. Modify handleSubmit to show ad after success
code = code.replace(
  "setCurrentScreen('SUCCESS');\n    } catch (e: any) {",
  `setCurrentScreen('SUCCESS');
      setTimeout(() => showRandomAdThenExecute(() => {}), 500); // Show ad on success
    } catch (e: any) {`
);

// 8. Admin Dashboard changes - Header Tabs
code = code.replace(
  "<Text style={styles.dashboardDate}>Managing {mockBookings.length} Bookings</Text>\n            </View>",
  `<Text style={styles.dashboardDate}>Managing {mockBookings.length} Bookings & {adsList.length} Ads</Text>
            </View>`
);

code = code.replace(
  "          <View style={{paddingHorizontal: 24, paddingBottom: 16}}>\n            <Text style={[styles.inputLabel, {marginBottom: 8}]}>FILTER BY BRANCH</Text>",
  `          <View style={{paddingHorizontal: 24, paddingBottom: 16, flexDirection: 'row'}}>
            <Pressable onPress={() => setAdminTab('BOOKINGS')} style={[styles.tabBtn, adminTab === 'BOOKINGS' && styles.tabBtnActive]}>
              <Text style={[styles.tabBtnText, adminTab === 'BOOKINGS' && styles.tabBtnTextActive]}>Bookings</Text>
            </Pressable>
            <Pressable onPress={() => setAdminTab('ADS')} style={[styles.tabBtn, adminTab === 'ADS' && styles.tabBtnActive]}>
              <Text style={[styles.tabBtnText, adminTab === 'ADS' && styles.tabBtnTextActive]}>Ad Panel</Text>
            </Pressable>
          </View>

          {adminTab === 'BOOKINGS' ? (
          <>
          <View style={{paddingHorizontal: 24, paddingBottom: 16}}>
            <Text style={[styles.inputLabel, {marginBottom: 8}]}>FILTER BY BRANCH</Text>`
);

// 9. Admin Dashboard changes - End of Bookings Tab + Ads Tab logic
code = code.replace(
  "</ScrollView>\n        </SafeAreaView>",
  `</ScrollView>
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
                        {ad.isUnlimited ? 'Unlimited Time' : \`\${new Date(ad.startTime!).toLocaleDateString()} - \${new Date(ad.endTime!).toLocaleDateString()}\`}
                      </Text>
                    </View>
                  </View>
                  
                  <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: 12}}>
                    <Pressable onPress={() => toggleAdStatus(ad.id, ad.isActive)} style={{flexDirection: 'row', alignItems: 'center'}}>
                      <View style={[styles.statusDot, ad.isActive ? {backgroundColor: Colors.green} : {backgroundColor: Colors.lightText}]} />
                      <Text style={{fontSize: 14, fontWeight: '600', color: ad.isActive ? Colors.green : Colors.lightText, marginLeft: 8}}>{ad.isActive ? 'Active' : 'Disabled'}</Text>
                    </Pressable>
                    <Pressable onPress={() => handleDeleteAd(ad.id, (ad as any).storagePath)} style={{padding: 8}}>
                      <Feather name="trash-2" size={20} color={Colors.red} />
                    </Pressable>
                  </View>
                </View>
              ))
            )}
          </ScrollView>
          )}
        </SafeAreaView>`
);

// 10. Add Ad Modal
code = code.replace(
  "      {/* GLOBAL DATE PICKER */}",
  `      {/* AD INTERSTITIAL MODAL */}
      {showAdModal && (
        <View style={StyleSheet.absoluteFill}>
          <View style={styles.adModalOverlay}>
            <View style={styles.adModalContainer}>
              <Pressable 
                style={styles.adCloseBtn} 
                onPress={() => {
                  setShowAdModal(null);
                  if (pendingAction) {
                    pendingAction();
                    setPendingAction(null);
                  }
                }}
              >
                <Feather name="x" size={24} color="#FFF" />
              </Pressable>
              
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

      {/* GLOBAL DATE PICKER */}`
);

// 11. Add styles for Ad Modal and Admin Ads
code = code.replace(
  "adminContactRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.inputBg, padding: 12, borderRadius: 12 },\n  adminContactText: { fontSize: 14, fontWeight: '600', color: Colors.darkText, marginLeft: 8 },\n});",
  `adminContactRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.inputBg, padding: 12, borderRadius: 12 },
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
  adCloseBtn: { position: 'absolute', top: 16, right: 16, zIndex: 10, width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
});`
);

fs.writeFileSync('App.tsx', code);
console.log('App.tsx updated');
