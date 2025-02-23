
import { useState, useRef, useCallback } from 'react';

export const useCamera = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  const startCamera = useCallback(async () => {
    if (!videoRef.current) {
      console.log("Waiting for video element...");
      // Wait a bit for the video element to be available
      await new Promise(resolve => setTimeout(resolve, 100));
      if (!videoRef.current) {
        throw new Error("Video element not found");
      }
    }

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: "user",
          width: { ideal: 640 },
          height: { ideal: 480 }
        },
        audio: false
      });

      // Set stream first
      setStream(mediaStream);
      
      // Then setup video element
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.autoplay = true;
        videoRef.current.playsInline = true;
        videoRef.current.muted = true;

        // Wait for metadata to be loaded
        await new Promise<void>((resolve, reject) => {
          if (!videoRef.current) {
            reject(new Error("Video element not found"));
            return;
          }

          const timeoutId = setTimeout(() => {
            reject(new Error("Video metadata load timeout"));
          }, 5000);

          videoRef.current.onloadedmetadata = () => {
            clearTimeout(timeoutId);
            resolve();
          };
        });

        try {
          await videoRef.current.play();
          console.log('Video started playing successfully');
        } catch (playError) {
          console.error('Error playing video:', playError);
          throw playError;
        }
      }

      return true;
    } catch (error) {
      console.error("Camera initialization error:", error);
      throw error;
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => {
        track.stop();
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = null;
        videoRef.current.load(); // Reset the video element
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
