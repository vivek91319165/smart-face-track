
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { Layout } from "@/components/Layout";
import { Camera } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import * as tf from '@tensorflow/tfjs';
import * as faceLandmarksDetection from '@tensorflow-models/face-landmarks-detection';
import { VideoDisplay } from "@/components/VideoDisplay";
import { useCamera } from "@/hooks/useCamera";
import { getFaceDescriptor, initializeFaceDetectionModel } from "@/utils/faceDetection";

const Record = () => {
  const { videoRef, stream, startCamera, stopCamera } = useCamera();
  const [isRegistering, setIsRegistering] = useState(false);
  const [model, setModel] = useState<faceLandmarksDetection.FaceLandmarksDetector | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lastDetectionTime, setLastDetectionTime] = useState<Date | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const initializeModel = async () => {
      try {
        // Ensure TensorFlow.js is initialized
        await tf.ready();
        console.log('TensorFlow.js initialized');
        
        const loadedModel = await initializeFaceDetectionModel();
        console.log('Face detection model loaded');
        setModel(loadedModel);
      } catch (error) {
        console.error("Error loading face detection model:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load face detection model",
        });
      }
    };

    initializeModel();
  }, [toast]);

  useEffect(() => {
    checkFaceRegistration();
  }, []);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  const checkFaceRegistration = async () => {
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("face_encoding, full_name")
        .single();

      setIsRegistering(!profile?.face_encoding);
    } catch (error) {
      console.error("Error checking face registration:", error);
    }
  };

  const handleStartCamera = async () => {
    try {
      await startCamera();
      console.log('Camera started successfully');
    } catch (error: any) {
      console.error('Camera start error:', error);
      toast({
        variant: "destructive",
        title: "Camera Error",
        description: error.message,
      });
    }
  };

  const startFaceDetectionLoop = async () => {
    if (isRegistering || !stream || !videoRef.current || !model) return;

    const detectFace = async () => {
      try {
        if (!lastDetectionTime || Date.now() - lastDetectionTime.getTime() > 300000) { // 5 minutes cooldown
          const faceDescriptor = await getFaceDescriptor(videoRef.current, model);
          
          if (faceDescriptor) {
            const descriptorBase64 = btoa(
              String.fromCharCode.apply(null, new Uint8Array(faceDescriptor.buffer))
            );

            // Verify face for attendance
            const { data: profile } = await supabase
              .from("profiles")
              .select("face_encoding, full_name")
              .single();

            if (!profile?.face_encoding) {
              throw new Error("No registered face found");
            }

            const storedDescriptorArray = Uint8Array.from(
              atob(profile.face_encoding), c => c.charCodeAt(0)
            );
            
            const storedDescriptor = new Float32Array(storedDescriptorArray.buffer);

            // Compare face descriptors using cosine similarity
            const similarity = tf.tensor1d(faceDescriptor)
              .dot(tf.tensor1d(storedDescriptor))
              .dataSync()[0];

            if (similarity >= 0.85) { // Threshold for face similarity
              const user = await supabase.auth.getUser();
              // Record attendance with username
              const { error } = await supabase
                .from("attendance_records")
                .insert({ 
                  user_id: user.data.user?.id,
                  username: profile.full_name || user.data.user?.email
                });

              if (!error) {
                setLastDetectionTime(new Date());
                toast({
                  title: "Success",
                  description: `Attendance recorded for ${profile.full_name || user.data.user?.email}!`,
                });
              } else {
                console.error("Error recording attendance:", error);
              }
            }
          }
        }
      } catch (error) {
        console.error("Face detection error:", error);
      }

      // Continue the detection loop
      if (stream) {
        requestAnimationFrame(detectFace);
      }
    };

    detectFace();
  };

  useEffect(() => {
    if (stream && !isRegistering) {
      startFaceDetectionLoop();
    }
  }, [stream, isRegistering]);

  const registerFace = async () => {
    if (!videoRef.current || !model) return;

    setIsLoading(true);
    try {
      const faceDescriptor = await getFaceDescriptor(videoRef.current, model);
      
      if (!faceDescriptor) {
        throw new Error("Failed to get face descriptor");
      }

      const descriptorBase64 = btoa(
        String.fromCharCode.apply(null, new Uint8Array(faceDescriptor.buffer))
      );

      const user = await supabase.auth.getUser();
      
      // Store face encoding
      const { error } = await supabase
        .from("profiles")
        .update({ 
          face_encoding: descriptorBase64,
          full_name: user.data.user?.email?.split('@')[0] // Use email username as default name
        })
        .eq("id", user.data.user?.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Face registered successfully!",
      });
      setIsRegistering(false);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-2xl mx-auto">
        <Card className="p-6">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold mb-2">
              {isRegistering ? "Face Registration" : "Attendance Monitor"}
            </h2>
            <p className="text-muted-foreground">
              {isRegistering
                ? "Let's set up your face recognition for future attendance"
                : "Your attendance will be recorded automatically when your face is detected"}
            </p>
          </div>

          <VideoDisplay 
            videoRef={videoRef}
            stream={stream}
            isLoading={isLoading}
          />

          <div className="flex justify-center gap-4">
            {!stream ? (
              <Button onClick={handleStartCamera} size="lg" disabled={!model}>
                <Camera className="w-4 h-4 mr-2" />
                {model ? "Start Camera" : "Loading..."}
              </Button>
            ) : (
              <>
                <Button onClick={stopCamera} variant="outline" size="lg">
                  Stop Camera
                </Button>
                {isRegistering && (
                  <Button 
                    onClick={registerFace} 
                    size="lg"
                    disabled={isLoading}
                  >
                    Register Face
                  </Button>
                )}
              </>
            )}
          </div>
        </Card>
      </div>
    </Layout>
  );
};

export default Record;
