export interface VisionAdapter {
  describeImage(imageBytes: Uint8Array): Promise<{ summary: string; tags: string[] }>;
}
