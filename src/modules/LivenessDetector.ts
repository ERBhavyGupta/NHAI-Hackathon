export type Challenge = "BLINK" | "SMILE" | "TURN_LEFT" | "TURN_RIGHT";
export type LivenessStatus =
  | "IN_PROGRESS"
  | "PASSED"
  | "TIMEOUT"
  | "NO_FACE"
  | "FAILED";

const TIMEOUT_SECONDS = 15;
const AUTO_PASS_FRAMES = 8; // auto pass after 8 frames for demo

export class LivenessManager {
  private challenges: Challenge[] = [];
  private currentIdx = 0;
  private frameCount = 0;
  private startTime = Date.now();
  private totalChallenges: number;

  constructor(numChallenges: number = 2) {
    this.totalChallenges = numChallenges;
    this.reset();
  }

  reset(): void {
    const all: Challenge[] = ["BLINK", "SMILE", "TURN_LEFT", "TURN_RIGHT"];
    const shuffled = all.sort(() => Math.random() - 0.5);
    this.challenges = shuffled.slice(0, this.totalChallenges);
    this.currentIdx = 0;
    this.frameCount = 0;
    this.startTime = Date.now();
  }

  getCurrentChallenge(): Challenge | null {
    if (this.currentIdx >= this.challenges.length) return null;
    return this.challenges[this.currentIdx];
  }

  getStep(): number {
    return this.currentIdx;
  }
  getTotalSteps(): number {
    return this.totalChallenges;
  }

  processFace(face: any): LivenessStatus {
    const elapsed = (Date.now() - this.startTime) / 1000;
    if (elapsed > TIMEOUT_SECONDS) return "TIMEOUT";
    if (this.currentIdx >= this.challenges.length) return "PASSED";

    this.frameCount++;

    // Auto-pass after AUTO_PASS_FRAMES frames per challenge
    if (this.frameCount >= AUTO_PASS_FRAMES) {
      this.currentIdx++;
      this.frameCount = 0;
      this.startTime = Date.now();
    }

    return this.currentIdx >= this.challenges.length ? "PASSED" : "IN_PROGRESS";
  }
}

export const detectFace = async (imageUri: string): Promise<any> => {
  // Mock face detection — returns dummy face data
  // ML Kit (@react-native-ml-kit/face-detection) requires native build
  // This mock allows full liveness flow to work in Expo Go for demo
  return {
    leftEyeOpenProbability: 0.9,
    rightEyeOpenProbability: 0.9,
    smilingProbability: 0.8,
    headEulerAngleY: 0,
    frame: { x: 100, y: 100, width: 200, height: 200 },
  };
};
