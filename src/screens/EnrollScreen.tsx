// src/screens/EnrollScreen.tsx


import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ScrollView, ActivityIndicator,
} from 'react-native';
import * as ExpoCamera from 'expo-camera';
const { CameraView, useCameraPermissions } = ExpoCamera as any;
import { enrollPerson, getPersonCount, initDB } from '../modules/Database';
import { getEmbedding } from '../modules/FaceRecognition';

type Step = 'form' | 'camera' | 'processing' | 'done';
interface Props { onDone?: () => void; }

const EnrollScreen: React.FC<Props> = ({ onDone = () => {} }) => {
  const [permission, requestPermission] = ExpoCamera.useCameraPermissions();
  const camRef = useRef<any>(null);
  const CameraComp: any = (ExpoCamera as any).CameraView || (ExpoCamera as any).Camera || null;

  const [name,        setName       ] = useState('');
  const [employeeId,  setEmployeeId ] = useState('');
  const [step,        setStep       ] = useState<Step>('form');
  const [count,       setCount      ] = useState(0);
  const [statusMsg,   setStatusMsg  ] = useState('');
  const [cameraReady, setCameraReady] = useState(false);

  useEffect(() => {
    initDB()
      .then(getPersonCount)
      .then(setCount)
      .catch((e) => console.error('[Enroll] init error:', e));
  }, []);

  // Reset camera ready when entering camera step
  useEffect(() => {
    if (step === 'camera') setCameraReady(false);
  }, [step]);

  const goToCamera = async () => {
    if (!name.trim() || !employeeId.trim()) {
      Alert.alert('Error', 'Enter name and employee ID first');
      return;
    }
    if (!permission?.granted) await requestPermission();
    setStep('camera');
  };

  const captureAndEnroll = async () => {
    if (!cameraReady) {
      Alert.alert('Wait', 'Camera is still loading, please wait a moment');
      return;
    }
    if (!camRef.current) {
      Alert.alert('Error', 'Camera not available');
      return;
    }

    setStatusMsg('Capturing face...');

    try {
      // Take photo BEFORE changing step (so camera stays mounted)
      const photo = await camRef.current.takePictureAsync({
        quality: 0.8,
        skipProcessing: true,
      });

      if (!photo?.uri) throw new Error('Failed to capture photo');

      // Now safe to change step
      setStep('processing');
      setStatusMsg('Generating face embedding...');

      const emb = await getEmbedding(photo.uri);

      setStatusMsg('Saving to database...');
      const id = `person_${Date.now()}`;
      await enrollPerson(id, name.trim(), employeeId.trim(), emb);

      const newCount = await getPersonCount();
      setCount(newCount);
      setStep('done');
      setStatusMsg(`${name} enrolled successfully!`);

    } catch (e: any) {
      Alert.alert('Error', e.message || 'Enrollment failed');
      setStep('camera');
    }
  };

  // ── Form ──────────────────────────────────────────────────────────────────
  if (step === 'form') {
    return (
      <ScrollView style={styles.container}>
        <View style={styles.govHeader}>
          <Text style={styles.emblem}>🏛️</Text>
          <View>
            <Text style={styles.govTitle}>Datalake 3.0</Text>
            <Text style={styles.govSub}>Enroll Field Personnel</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Personnel Enrollment</Text>
          <Text style={styles.cardSub}>Enrolled: {count} personnel</Text>

          <Text style={styles.label}>Full Name</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Enter full name"
            placeholderTextColor="#999"
          />

          <Text style={styles.label}>Employee ID</Text>
          <TextInput
            style={styles.input}
            value={employeeId}
            onChangeText={setEmployeeId}
            placeholder="e.g. NHAI001"
            placeholderTextColor="#999"
            autoCapitalize="characters"
          />

          <TouchableOpacity style={styles.btn} onPress={goToCamera}>
            <Text style={styles.btnTxt}>📷  Capture Face</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.backBtn} onPress={onDone}>
            <Text style={styles.backTxt}>← Back to Auth</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.version}>APP VERSION: V1.0.0</Text>
      </ScrollView>
    );
  }

  // ── Camera ────────────────────────────────────────────────────────────────
  if (step === 'camera') {
    return (
      <View style={styles.camContainer}>
        <ExpoCamera.CameraView
          style={StyleSheet.absoluteFill}
          facing="front"
          ref={camRef}
          onCameraReady={() => setCameraReady(true)}
        />
        <View style={styles.camOverlay}>
          <View style={styles.ovalGuide} />
          <Text style={styles.camInstruction}>
            {cameraReady ? 'Position your face in the oval' : 'Camera loading...'}
          </Text>
          <Text style={styles.camName}>{name}</Text>
          <TouchableOpacity
            style={[styles.captureBtn, !cameraReady && { opacity: 0.4 }]}
            disabled={!cameraReady}
            onPress={async () => {
              try {
                const photo = await camRef.current?.takePictureAsync({
                  quality: 0.8,
                  skipProcessing: true,
                });
                if (!photo?.uri) throw new Error('No photo');
                setStep('processing');
                setStatusMsg('Generating embedding...');
                const emb = await getEmbedding(photo.uri);
                setStatusMsg('Saving...');
                await enrollPerson(`person_${Date.now()}`, name.trim(), employeeId.trim(), emb);
                setCount(await getPersonCount());
                setStep('done');
                setStatusMsg(`${name} enrolled successfully!`);
              } catch (e: any) {
                Alert.alert('Error', e.message);
              }
            }}
          >
            <View style={styles.captureInner} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelBtn} onPress={() => setStep('form')}>
            <Text style={styles.backTxt}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── Processing ────────────────────────────────────────────────────────────
  if (step === 'processing') {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1B3E7B" />
        <Text style={styles.processingTxt}>{statusMsg}</Text>
      </View>
    );
  }

  // ── Done ──────────────────────────────────────────────────────────────────
  return (
    <View style={styles.center}>
      <Text style={styles.doneIcon}>✅</Text>
      <Text style={styles.doneTxt}>{statusMsg}</Text>
      <Text style={styles.cardSub}>Total enrolled: {count}</Text>

      <TouchableOpacity
        style={[styles.btn, { width: '80%' }]}
        onPress={() => { setName(''); setEmployeeId(''); setStep('form'); }}
      >
        <Text style={styles.btnTxt}>Enroll Another</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.backBtn} onPress={onDone}>
        <Text style={styles.backTxt}>← Go to Auth</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container    : { flex: 1, backgroundColor: '#E8EDF2', padding: 20 },
  center       : { flex: 1, backgroundColor: '#E8EDF2', alignItems: 'center', justifyContent: 'center', padding: 24, gap: 16 },
  camContainer : { flex: 1, backgroundColor: '#000' },
  camOverlay   : { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 48 },
  ovalGuide    : { position: 'absolute', top: '15%', width: 220, height: 280, borderRadius: 110, borderWidth: 2.5, borderColor: '#fff', backgroundColor: 'transparent' },
  camInstruction: { color: '#fff', fontSize: 16, fontWeight: '600', marginBottom: 8, textShadowColor: '#000', textShadowRadius: 4 },
  camName      : { color: '#fff', fontSize: 14, marginBottom: 24, opacity: 0.8 },
  captureBtn   : { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.3)', alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#fff' },
  captureInner : { width: 60, height: 60, borderRadius: 30, backgroundColor: '#fff' },
  cancelBtn    : { marginTop: 16 },
  govHeader    : { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 16 },
  emblem       : { fontSize: 32 },
  govTitle     : { fontSize: 16, fontWeight: '800', color: '#1B3E7B' },
  govSub       : { fontSize: 10, color: '#666' },
  card         : { backgroundColor: '#fff', borderRadius: 12, padding: 24, gap: 12, elevation: 3 },
  cardTitle    : { fontSize: 20, fontWeight: '800', color: '#1A1A1A' },
  cardSub      : { fontSize: 13, color: '#666', marginBottom: 8 },
  label        : { color: '#444', fontSize: 13, fontWeight: '600' },
  input        : { borderWidth: 1.5, borderColor: '#D0D8E4', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, color: '#1A1A1A', backgroundColor: '#FAFBFC' },
  btn          : { backgroundColor: '#1B3E7B', borderRadius: 30, paddingVertical: 16, alignItems: 'center', marginTop: 8 },
  btnTxt       : { color: '#fff', fontSize: 16, fontWeight: '700' },
  backBtn      : { alignItems: 'center', marginTop: 16 },
  backTxt      : { color: '#1B3E7B', fontSize: 14, fontWeight: '600' },
  processingTxt: { color: '#1A1A1A', fontSize: 16, marginTop: 16, textAlign: 'center' },
  doneIcon     : { fontSize: 64 },
  doneTxt      : { color: '#1A1A1A', fontSize: 20, fontWeight: '800', textAlign: 'center' },
  version      : { color: '#999', fontSize: 11, textAlign: 'center', marginTop: 16 },
});

export default EnrollScreen;
