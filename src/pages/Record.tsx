
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { Layout } from "@/components/Layout";
import { Camera, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import * as tf from '@tensorflow/tfjs';
import * as blazeface from '@tensorflow-models/blazeface';

const Record = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [model, setModel] = useState<blazeface.BlazeFaceModel | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Initialize TensorFlow.js and face detection model
  useEffect(() => {
    const initializeModel = async () => {
      try {
        await tf.ready();
        const loadedModel = await blazeface.load();
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

  const checkFaceRegistration = async () => {
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("face_encoding")
        .single();

      setIsRegistering(!profile?.face_encoding);
    } catch (error) {
      console.error("Error checking face registration:", error);
    }
  };

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setStream(mediaStream);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Camera Error",
        description: error.message,
      });
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      setStream(null);
    }
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const getFaceDescriptor = async (): Promise<Float32Array | null> => {
    if (!videoRef.current || !model) return null;

    const predictions = await model.estimateFaces(videoRef.current, false);

    if (predictions.length === 0) {
      throw new Error("No face detected");
    }

    if (predictions.length > 1) {
      throw new Error("Multiple faces detected");
    }

    // Convert landmarks to a descriptor
    const prediction = predictions[0];
    const landmarksArray = Array.isArray(prediction.landmarks) 
      ? prediction.landmarks 
      : await prediction.landmarks.array();
    
    // Flatten landmarks and add bounding box points
    const landmarks = [
      ...landmarksArray.flat(),
      ...prediction.topLeft,
      ...prediction.bottomRight
    ];
    
    const tensorDescriptor = tf.tensor1d(landmarks);
    const norm = tensorDescriptor.norm().dataSync()[0];
    const normalizedDescriptor = tensorDescriptor.div(norm);
    const descriptorData = await normalizedDescriptor.data();
    
    // Clean up tensors
    tensorDescriptor.dispose();
    normalizedDescriptor.dispose();

    return new Float32Array(descriptorData);
  };

  const captureImage = async () => {
    if (!videoRef.current || !model) return;

    setIsLoading(true);
    try {
      const faceDescriptor = await getFaceDescriptor();
      
      if (!faceDescriptor) {
        throw new Error("Failed to get face descriptor");
      }

      const descriptorBase64 = btoa(
        String.fromCharCode.apply(null, new Uint8Array(faceDescriptor.buffer))
      );

      if (isRegistering) {
        // Store face encoding
        const { error } = await supabase
          .from("profiles")
          .update({ face_encoding: descriptorBase64 })
          .eq("id", (await supabase.auth.getUser()).data.user?.id);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Face registered successfully!",
        });
        setIsRegistering(false);
      } else {
        // Verify face for attendance
        const { data: profile } = await supabase
          .from("profiles")
          .select("face_encoding")
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

        if (similarity < 0.85) { // Threshold for face similarity
          throw new Error("Face verification failed");
        }

        // Record attendance
        const { error } = await supabase
          .from("attendance_records")
          .insert({ user_id: (await supabase.auth.getUser()).data.user?.id });

        if (error) throw error;

        toast({
          title: "Success",
          description: "Attendance recorded successfully!",
        });
      }
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
              {isRegistering ? "Face Registration" : "Record Attendance"}
            </h2>
            <p className="text-muted-foreground">
              {isRegistering
                ? "Let's set up your face recognition for future attendance"
                : "Ready to record your attendance"}
            </p>
          </div>

          <div className="aspect-video bg-black rounded-lg overflow-hidden mb-6 relative">
            {stream ? (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                />
                {isLoading && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <div className="text-white">Processing...</div>
                  </div>
                )}
              </>
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <User className="w-16 h-16 text-gray-500" />
              </div>
            )}
          </div>

          <div className="flex justify-center gap-4">
            {!stream ? (
              <Button onClick={startCamera} size="lg" disabled={!model}>
                <Camera className="w-4 h-4 mr-2" />
                {model ? "Start Camera" : "Loading..."}
              </Button>
            ) : (
              <>
                <Button onClick={stopCamera} variant="outline" size="lg">
                  Stop Camera
                </Button>
                <Button 
                  onClick={captureImage} 
                  size="lg"
                  disabled={isLoading}
                >
                  {isRegistering ? "Register Face" : "Record Attendance"}
                </Button>
              </>
            )}
          </div>
        </Card>
      </div>
    </Layout>
  );
};

export default Record;
