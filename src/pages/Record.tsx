
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { Layout } from "@/components/Layout";
import { Camera, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const Record = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    checkFaceRegistration();
  }, []);

  const checkFaceRegistration = async () => {
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("face_encoding")
        .single();

      if (profile?.face_encoding) {
        setIsRegistering(false);
      } else {
        setIsRegistering(true);
      }
    } catch (error) {
      console.error("Error checking face registration:", error);
    }
  };

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: true,
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

  const captureImage = async () => {
    if (!videoRef.current) return;

    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const context = canvas.getContext("2d");
    if (!context) return;

    context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    const imageData = canvas.toDataURL("image/jpeg");

    try {
      // Here you would typically:
      // 1. Send the image to your backend for face encoding
      // 2. Store the face encoding in the profiles table
      // For now, we'll just store a placeholder
      const { error } = await supabase
        .from("profiles")
        .update({ face_encoding: "placeholder_encoding" })
        .eq("id", (await supabase.auth.getUser()).data.user?.id);

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

          <div className="aspect-video bg-black rounded-lg overflow-hidden mb-6">
            {stream ? (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <User className="w-16 h-16 text-gray-500" />
              </div>
            )}
          </div>

          <div className="flex justify-center gap-4">
            {!stream ? (
              <Button onClick={startCamera} size="lg">
                <Camera className="w-4 h-4 mr-2" />
                Start Camera
              </Button>
            ) : (
              <>
                <Button onClick={stopCamera} variant="outline" size="lg">
                  Stop Camera
                </Button>
                <Button onClick={captureImage} size="lg">
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
