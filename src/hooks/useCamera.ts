
import { useState, useRef, useCallback } from 'react';

export const useCamera = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  const startCamera = useCallback(async () => {
    try {
      // Request camera access with more specific constraints
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { min: 640, ideal: 1280, max: 1920 },
          height: { min: 480, ideal: 720, max: 1080 },
          aspectRatio: { ideal: 1.777777778 },
          frameRate: { max: 30 }
        },
        audio: false
      });

      // Set stream in state first
      setStream(mediaStream);

      // Make sure video element exists
      if (!videoRef.current) {
        throw new Error("Video element not available");
      }

      // Configure video element
      const videoElement = videoRef.current;
      videoElement.srcObject = mediaStream;
      videoElement.autoplay = true;
      videoElement.playsInline = true;
      videoElement.muted = true;

      // Wait for video to be ready
      await new Promise<void>((resolve) => {
        const timeoutId = setTimeout(() => {
          console.warn("Video load timeout - continuing anyway");
          resolve();
        }, 3000);

        videoElement.onloadeddata = () => {
          clearTimeout(timeoutId);
          resolve();
        };
      });

      // Start playing
      await videoElement.play();
      console.log("Camera started successfully");

      return true;
    } catch (error) {
      console.error("Failed to start camera:", error);
      // Clean up if there was an error
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
        setStream(null);
      }
      throw error;
    }
  }, [stream]);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => {
        track.stop();
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      
      setStream(null);
    }
  }, [stream]);

  return {
    videoRef,
    stream,
    startCamera,
    stopCamera
  };
};
