import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';

const { width: W, height: H } = Dimensions.get('window');
const OVAL_W = W * 0.62;
const OVAL_H = OVAL_W * 1.28;

type LivenessState = 'idle' | 'blink' | 'smile' | 'turn' | 'pass' | 'fail';

type Props = {
  state:  LivenessState;
  prompt: string;
  steps:  boolean[];
};

const STEP_LABELS = ['Step 1', 'Step 2'];

export default function LivenessOverlay({ state, prompt, steps }: Props) {
  const pulse      = useRef(new Animated.Value(1)).current;
  const fadeAnim   = useRef(new Animated.Value(0)).current;
  const scaleAnim  = useRef(new Animated.Value(0.8)).current;

  // Oval pulse animation
  useEffect(() => {
    if (state === 'pass' || state === 'fail') return;
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.04, duration: 900, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1.00, duration: 900, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [state]);

  // Prompt animation on change
  useEffect(() => {
    fadeAnim.setValue(0);
    scaleAnim.setValue(0.8);
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1, duration: 300, useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1, friction: 6, useNativeDriver: true,
      }),
    ]).start();
  }, [prompt, state]);

  const ovalBorder =
    state === 'pass' ? '#22c55e' :
    state === 'fail' ? '#ef4444' :
    '#ffffff';

  const getIcon = () => {
    if (state === 'pass') return '✅';
    if (state === 'fail') return '❌';
    if (prompt.toLowerCase().includes('blink')) return '👁';
    if (prompt.toLowerCase().includes('smile')) return '😊';
    if (prompt.toLowerCase().includes('left'))  return '⬅️';
    if (prompt.toLowerCase().includes('right')) return '➡️';
    if (prompt.toLowerCase().includes('verif')) return '🔍';
    return '👤';
  };

  const getBoxStyle = () => {
    if (state === 'pass') return [styles.box, styles.successBox];
    if (state === 'fail') return [styles.box, styles.failBox];
    return [styles.box];
  };

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* Dark background */}
      <View style={styles.darkBg} />

      {/* Oval */}
      <Animated.View style={[
        styles.oval,
        { borderColor: ovalBorder, transform: [{ scale: pulse }] }
      ]} />

      {/* Step dots */}
      <View style={styles.stepsRow}>
        {STEP_LABELS.map((label, i) => (
          <View key={i} style={styles.stepItem}>
            <View style={[styles.dot, steps[i] && styles.dotDone]} />
            <Text style={styles.stepLabel}>{label}</Text>
          </View>
        ))}
      </View>

      {/* Prompt box */}
      <Animated.View style={[
        styles.promptWrap,
        { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }
      ]}>
        <View style={getBoxStyle()}>
          <Text style={styles.icon}>{getIcon()}</Text>
          <Text style={styles.promptText}>{prompt}</Text>
          {state !== 'pass' && state !== 'fail' && state !== 'idle' && (
            <Text style={styles.stepCount}>
              Step {steps.filter(Boolean).length + 1} of {steps.length}
            </Text>
          )}
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  darkBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  oval: {
    position       : 'absolute',
    width          : OVAL_W,
    height         : OVAL_H,
    borderRadius   : OVAL_W,
    borderWidth    : 2.5,
    top            : H / 2 - OVAL_H / 2,
    left           : W / 2 - OVAL_W / 2,
    backgroundColor: 'transparent',
  },
  stepsRow: {
    position      : 'absolute',
    top           : H * 0.10,
    width         : '100%',
    flexDirection : 'row',
    justifyContent: 'center',
    gap           : 20,
  },
  stepItem  : { alignItems: 'center', gap: 4 },
  dot: {
    width          : 9,
    height         : 9,
    borderRadius   : 5,
    borderWidth    : 1.5,
    borderColor    : 'rgba(255,255,255,0.55)',
    backgroundColor: 'rgba(255,255,255,0.20)',
  },
  dotDone: {
    backgroundColor: '#22c55e',
    borderColor    : '#22c55e',
  },
  stepLabel: { color: 'rgba(255,255,255,0.75)', fontSize: 11 },
  promptWrap: {
    position: 'absolute',
    bottom  : H * 0.08,
    left    : 40,
    right   : 40,
  },
  box: {
    backgroundColor: 'rgba(20,20,20,0.75)',
    borderRadius   : 30,
    paddingVertical : 12,
    paddingHorizontal: 20,
    alignItems     : 'center',
    flexDirection  : 'row',
    justifyContent : 'center',
    gap            : 10,
    borderWidth    : 1,
    borderColor    : 'rgba(255,255,255,0.12)',
  },
  successBox: {
    backgroundColor: 'rgba(34,197,94,0.75)',
    borderColor    : 'rgba(34,197,94,0.4)',
  },
  failBox: {
    backgroundColor: 'rgba(239,68,68,0.75)',
    borderColor    : 'rgba(239,68,68,0.4)',
  },
  icon      : { fontSize: 22 },
  promptText: {
    color     : '#fff',
    fontSize  : 15,
    fontWeight: '600',
    textAlign : 'center',
  },
  stepCount: {
    color    : 'rgba(255,255,255,0.5)',
    fontSize : 11,
    marginTop: 4,
  },
});
