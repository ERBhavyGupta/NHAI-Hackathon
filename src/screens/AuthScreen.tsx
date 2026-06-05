import React, { useState, useEffect, useRef, useCallback } from 'react';
import { StyleSheet, View, Alert } from 'react-native';
import * as ExpoCamera from 'expo-camera';
import LivenessOverlay from '../components/LivenessOverlay';
import {
  LivenessManager,
  detectFace,
  Challenge,
} from '../modules/LivenessDetector';

type Props = {
  onLivenessPass: (payload: { timestamp: number }) => void;
};

const CHALLENGE_PROMPTS: Record<Challenge, string> = {
  BLINK:      'Blink your eyes',
  SMILE:      'Smile',
  TURN_LEFT:  'Turn your head left',
  TURN_RIGHT: 'Turn your head right',
};

export default function CameraViewComponent({ onLivenessPass }: Props) {
  const [permission, requestPermission] = ExpoCamera.useCameraPermissions();
  const cameraRef = useRef<any>(null);
  const CameraComp: any = (ExpoCamera as any).Camera || (ExpoCamera as any).default || null;
  const CameraType = (ExpoCamera as any).CameraType || (ExpoCamera as any).Type || { front: 'front' };

  const [prompt, setPrompt]   = useState('Position your face in the oval');
  const [steps, setSteps]     = useState([false, false]);
  const [livenessState, setLivenessState] = useState<'idle' | 'blink' | 'smile' | 'turn' | 'pass' | 'fail'>('idle');
  const [isProcessing, setIsProcessing]   = useState(false);

  const managerRef = useRef(new LivenessManager(2));

  useEffect(() => {
    if (!permission?.granted) requestPermission();
    const first = managerRef.current.getCurrentChallenge();
    if (first) setPrompt(CHALLENGE_PROMPTS[first]);
  }, []);

  useEffect(() => {
    if (livenessState === 'pass' || livenessState === 'fail') return;

    const interval = setInterval(async () => {
      if (isProcessing || !cameraRef.current) return;
      setIsProcessing(true);

      try {
  const photo = await cameraRef.current.takePictureAsync({ quality: 0.5 });
  const face  = await detectFace(photo.uri);
        const result = managerRef.current.processFace(face);
        const step   = managerRef.current.getStep();
        const chall  = managerRef.current.getCurrentChallenge();

        // Update steps dots
        const newSteps = [false, false];
        for (let i = 0; i < step; i++) newSteps[i] = true;
        setSteps(newSteps);

        if (chall) setPrompt(CHALLENGE_PROMPTS[chall]);

       if (result === 'PASSED') {
          setSteps([true, true]);
          setPrompt('Verified!');
          setLivenessState('pass');
          onLivenessPass({ timestamp: Date.now() });
          setTimeout(() => {
              managerRef.current.reset();
              const first = managerRef.current.getCurrentChallenge();
              if (first) setPrompt(CHALLENGE_PROMPTS[first]);
              setSteps([false, false]);
              setLivenessState('idle');
            }, 3000);
        } else if (result === 'TIMEOUT') {
          setPrompt('Timed out — retrying...');
          setLivenessState('fail');
          setTimeout(() => {
            managerRef.current.reset();
            const first = managerRef.current.getCurrentChallenge();
            if (first) setPrompt(CHALLENGE_PROMPTS[first]);
            setSteps([false, false]);
            setLivenessState('idle');
          }, 2000);
        }
      } catch (err) {
        console.log('[Liveness] Frame error:', err);
      } finally {
        setIsProcessing(false);
      }
    }, 500);

    return () => clearInterval(interval);
  }, [livenessState, isProcessing]);

  if (!permission?.granted) return null;

  return (
    <View style={styles.container}>
     {CameraComp ? (
       <CameraComp ref={cameraRef} style={StyleSheet.absoluteFill} type={CameraType.front} />
     ) : null}
      <LivenessOverlay
        state={livenessState}
        prompt={prompt}
        steps={steps}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
});