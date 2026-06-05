// src/modules/FaceRecognition.ts
// Face recognition module — works offline
// Uses TFLite model when available, falls back to mock for testing

import * as FileSystem from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';
import { getAllPersons } from './Database';

const MODEL_FILE = 'face_recognition_FINAL.tflite';
const THRESHOLD  = 0.35;
const EMB_SIZE   = 512;

let modelLoaded = false;
let modelPath   = '';

// ── Load model ────────────────────────────────────────
export const loadFaceModel = async (): Promise<void> => {
  try {
  const fsAny: any = FileSystem as any;
  const dest   = `${fsAny.documentDirectory}${MODEL_FILE}`;
  const exists = (await fsAny.getInfoAsync(dest)).exists;

    if (!exists) {
      // Try to copy from assets
      try {
        await fsAny.copyAsync({
          from: `${fsAny.bundleDirectory}assets/models/${MODEL_FILE}`,
          to  : dest,
        });
        console.log('[FaceRec] Model copied from assets');
      } catch {
        console.log('[FaceRec] Model not in assets yet — using mock mode');
        modelLoaded = false;
        return;
      }
    }

    modelPath   = dest;
    modelLoaded = true;
    console.log('[FaceRec] Model ready at:', dest);
  } catch (e) {
    console.log('[FaceRec] Model load failed — using mock mode:', e);
    modelLoaded = false;
  }
};

// ── L2 normalize ──────────────────────────────────────
const normalize = (emb: number[]): number[] => {
  const norm = Math.sqrt(emb.reduce((s, v) => s + v * v, 0)) + 1e-8;
  return emb.map(v => v / norm);
};

// ── Cosine similarity ─────────────────────────────────
export const cosineSim = (a: number[], b: number[]): number => {
  let dot = 0;
  for (let i = 0; i < Math.min(a.length, b.length); i++) dot += a[i] * b[i];
  return dot;
};

// ── Get embedding from image ──────────────────────────
export const getEmbedding = async (
  imageUri: string,
  faceBox?: { x: number; y: number; width: number; height: number }
): Promise<number[]> => {
  try {
    if (modelLoaded && modelPath) {
      // Real TFLite inference: load runtime only if available
      let model: any = null;
      try {
        const { loadTensorflowModel } = require('react-native-fast-tflite');
        model = await loadTensorflowModel({ url: `file://${modelPath}`, delegate: 'gpu' });
      } catch (e) {
        // runtime not available in Expo — fall back to mock path below
        throw new Error('TFLite runtime not available');
      }

      const actions: any[] = [{ resize: { width: 112, height: 112 } }];
      if (faceBox) {
        actions.unshift({
          crop: {
            originX: faceBox.x,
            originY: faceBox.y,
            width  : faceBox.width,
            height : faceBox.height,
          }
        });
      }

      const processed = await ImageManipulator.manipulateAsync(
        imageUri, actions,
        { format: ImageManipulator.SaveFormat.JPEG, base64: true }
      );

  const base64 = processed.base64!;
  // atob -> binary string, then to byte values
  const binary = typeof atob === 'function' ? atob(base64) : Buffer.from(base64, 'base64').toString('binary');
  const raw = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  const pixels = new Float32Array(3 * 112 * 112);
  for (let i = 0; i < pixels.length; i++) pixels[i] = (raw[i] - 127.5) / 127.5;

  const output = await model.run([pixels]);
      const emb    = Array.from(output[0] as Float32Array);
      return normalize(emb);
    }
  } catch (e) {
    console.log('[FaceRec] TFLite inference failed, using mock:', e);
  }

  // Mock embedding for testing (deterministic based on image path)
  console.log('[FaceRec] Using mock embedding');
  const seed = imageUri.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const rand = Array.from({ length: EMB_SIZE }, (_, i) =>
    Math.sin(seed + i) * 0.5
  );
  return normalize(rand);
};

// ── Match face against enrolled persons ───────────────
export const matchFace = async (queryEmbedding: number[]): Promise<{
  found      : boolean;
  personId   : string;
  personName : string;
  employeeId : string;
  similarity : number;
}> => {
  const persons = await getAllPersons();

  if (persons.length === 0) {
    return {
      found: false, personId: '',
      personName: 'No persons enrolled',
      employeeId: '', similarity: 0,
    };
  }

  let best = { idx: -1, sim: -1 };
  persons.forEach((p, idx) => {
    const sim = cosineSim(queryEmbedding, p.embedding);
    if (sim > best.sim) best = { idx, sim };
  });

  const match = persons[best.idx];
  const found = best.sim >= THRESHOLD;

  console.log(`[FaceRec] Best match: ${match.name} sim=${best.sim.toFixed(3)} found=${found}`);

  return {
    found,
    personId  : match.id,
    personName: match.name,
    employeeId: match.employeeId,
    similarity: best.sim,
  };
};

export const isModelLoaded = () => modelLoaded;
