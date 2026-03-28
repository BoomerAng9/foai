/**
 * SAM (Segment Anything Model) Video Analysis Module
 *
 * Provides video and image segmentation capabilities.
 * Used for sports tracking, object detection, and frame analysis.
 */

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export interface Point {
  x: number;
  y: number;
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Mask {
  id: string;
  segmentation: boolean[][];  // 2D binary mask
  area: number;
  bbox: BoundingBox;
  predictedIOU: number;
  stability: number;
}

export interface SegmentationResult {
  frameId: string;
  timestamp: number;
  masks: Mask[];
  embeddings?: number[];  // Image embeddings for tracking
}

export interface VideoFrame {
  id: string;
  timestamp: number;
  imageData: string;  // Base64 encoded
  width: number;
  height: number;
}

export interface TrackedObject {
  id: string;
  label: string;
  confidence: number;
  frames: Array<{
    frameId: string;
    timestamp: number;
    bbox: BoundingBox;
    mask?: Mask;
  }>;
}

export interface VideoAnalysisResult {
  videoId: string;
  duration: number;
  frameCount: number;
  trackedObjects: TrackedObject[];
  keyMoments: Array<{
    timestamp: number;
    description: string;
    objects: string[];
  }>;
}

// ─────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────

const SAM_ENDPOINT = process.env.SAM_API_ENDPOINT || 'http://localhost:8000/sam';

// ─────────────────────────────────────────────────────────────
// Image Segmentation
// ─────────────────────────────────────────────────────────────

export interface SegmentOptions {
  image: string;  // Base64 or URL
  points?: Point[];  // Optional click points for guided segmentation
  box?: BoundingBox;  // Optional bounding box
  multimask?: boolean;  // Return multiple masks
}

export async function segmentImage(options: SegmentOptions): Promise<SegmentationResult> {
  const response = await fetch(`${SAM_ENDPOINT}/segment`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      image: options.image,
      point_coords: options.points?.map(p => [p.x, p.y]),
      box: options.box ? [options.box.x, options.box.y, options.box.x + options.box.width, options.box.y + options.box.height] : undefined,
      multimask_output: options.multimask ?? true,
    }),
  });

  if (!response.ok) {
    throw new Error(`SAM segmentation failed: ${response.status}`);
  }

  return response.json();
}

// ─────────────────────────────────────────────────────────────
// Automatic Mask Generation
// ─────────────────────────────────────────────────────────────

export interface AutoMaskOptions {
  image: string;
  pointsPerSide?: number;
  predIouThresh?: number;
  stabilityScoreThresh?: number;
  minMaskRegionArea?: number;
}

export async function generateAllMasks(options: AutoMaskOptions): Promise<Mask[]> {
  const response = await fetch(`${SAM_ENDPOINT}/auto-mask`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      image: options.image,
      points_per_side: options.pointsPerSide ?? 32,
      pred_iou_thresh: options.predIouThresh ?? 0.88,
      stability_score_thresh: options.stabilityScoreThresh ?? 0.95,
      min_mask_region_area: options.minMaskRegionArea ?? 100,
    }),
  });

  if (!response.ok) {
    throw new Error(`SAM auto-mask failed: ${response.status}`);
  }

  const data = await response.json();
  return data.masks;
}

// ─────────────────────────────────────────────────────────────
// Video Frame Extraction
// ─────────────────────────────────────────────────────────────

export async function extractFrames(
  videoUrl: string,
  options: { fps?: number; maxFrames?: number } = {}
): Promise<VideoFrame[]> {
  const response = await fetch(`${SAM_ENDPOINT}/extract-frames`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      video_url: videoUrl,
      fps: options.fps ?? 1,  // 1 frame per second default
      max_frames: options.maxFrames ?? 60,
    }),
  });

  if (!response.ok) {
    throw new Error(`Frame extraction failed: ${response.status}`);
  }

  return response.json();
}

// ─────────────────────────────────────────────────────────────
// Object Tracking Across Frames
// ─────────────────────────────────────────────────────────────

export interface TrackingOptions {
  frames: VideoFrame[];
  initialMask: Mask;
  objectLabel?: string;
}

export async function trackObject(options: TrackingOptions): Promise<TrackedObject> {
  const response = await fetch(`${SAM_ENDPOINT}/track`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      frames: options.frames.map(f => ({
        id: f.id,
        timestamp: f.timestamp,
        image: f.imageData,
      })),
      initial_mask: {
        bbox: options.initialMask.bbox,
        segmentation: options.initialMask.segmentation,
      },
      label: options.objectLabel,
    }),
  });

  if (!response.ok) {
    throw new Error(`Object tracking failed: ${response.status}`);
  }

  return response.json();
}

// ─────────────────────────────────────────────────────────────
// Sports-Specific Analysis
// ─────────────────────────────────────────────────────────────

export interface PlayerDetection {
  playerId?: string;
  jerseyNumber?: number;
  teamColor?: string;
  position: BoundingBox;
  confidence: number;
}

export interface SportsFrameAnalysis {
  frameId: string;
  timestamp: number;
  players: PlayerDetection[];
  ball?: {
    position: Point;
    confidence: number;
  };
  fieldLines?: BoundingBox[];
}

export async function analyzeSportsFrame(
  image: string,
  sport: 'football' | 'basketball' | 'soccer' | 'baseball'
): Promise<SportsFrameAnalysis> {
  // First, get all masks
  const masks = await generateAllMasks({
    image,
    pointsPerSide: 48,
    predIouThresh: 0.9,
  });

  // Filter and classify masks based on sport
  const players: PlayerDetection[] = [];
  let ball: SportsFrameAnalysis['ball'] | undefined;

  for (const mask of masks) {
    // Heuristic: player-sized objects
    const aspectRatio = mask.bbox.height / mask.bbox.width;
    const area = mask.area;

    // Players are typically taller than wide
    if (aspectRatio > 1.2 && aspectRatio < 4 && area > 500) {
      players.push({
        position: mask.bbox,
        confidence: mask.predictedIOU,
      });
    }

    // Ball detection (small, roughly square)
    if (aspectRatio > 0.8 && aspectRatio < 1.2 && area < 500 && area > 50) {
      ball = {
        position: {
          x: mask.bbox.x + mask.bbox.width / 2,
          y: mask.bbox.y + mask.bbox.height / 2,
        },
        confidence: mask.predictedIOU,
      };
    }
  }

  return {
    frameId: `frame-${Date.now()}`,
    timestamp: Date.now(),
    players,
    ball,
  };
}

// ─────────────────────────────────────────────────────────────
// Full Video Analysis
// ─────────────────────────────────────────────────────────────

export async function analyzeVideo(
  videoUrl: string,
  options: {
    sport?: 'football' | 'basketball' | 'soccer' | 'baseball';
    fps?: number;
    maxFrames?: number;
  } = {}
): Promise<VideoAnalysisResult> {
  // Extract frames
  const frames = await extractFrames(videoUrl, {
    fps: options.fps ?? 2,
    maxFrames: options.maxFrames ?? 120,
  });

  // Analyze each frame
  const frameAnalyses: SportsFrameAnalysis[] = [];
  for (const frame of frames) {
    if (options.sport) {
      const analysis = await analyzeSportsFrame(frame.imageData, options.sport);
      frameAnalyses.push({ ...analysis, frameId: frame.id, timestamp: frame.timestamp });
    }
  }

  // Track players across frames
  const trackedObjects: TrackedObject[] = [];
  const keyMoments: VideoAnalysisResult['keyMoments'] = [];

  // Identify key moments (significant changes in player count, ball position, etc.)
  for (let i = 1; i < frameAnalyses.length; i++) {
    const prev = frameAnalyses[i - 1];
    const curr = frameAnalyses[i];

    // Detect significant changes
    if (Math.abs(curr.players.length - prev.players.length) >= 2) {
      keyMoments.push({
        timestamp: curr.timestamp,
        description: 'Formation change detected',
        objects: curr.players.map((_, idx) => `player-${idx}`),
      });
    }
  }

  return {
    videoId: `video-${Date.now()}`,
    duration: frames.length > 0 ? frames[frames.length - 1].timestamp : 0,
    frameCount: frames.length,
    trackedObjects,
    keyMoments,
  };
}

export default {
  segmentImage,
  generateAllMasks,
  extractFrames,
  trackObject,
  analyzeSportsFrame,
  analyzeVideo,
};
