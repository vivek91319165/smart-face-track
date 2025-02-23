
import { User } from "lucide-react";
import { useEffect } from "react";

interface VideoDisplayProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  stream: MediaStream | null;
  isLoading?: boolean;
}

export const VideoDisplay = ({ videoRef, stream, isLoading }: VideoDisplayProps) => {
  useEffect(() => {
    const videoElement = videoRef.current;
    if (stream && videoElement) {
      videoElement.srcObject = stream;
      videoElement.onloadeddata = () => {
        console.log("Video data loaded");
        videoElement.play().catch(console.error);
      };
    }

    return () => {
      if (videoElement) {
        videoElement.srcObject = null;
      }
    };
  }, [stream, videoRef]);

  return (
    <div className="aspect-video bg-black rounded-lg overflow-hidden mb-6 relative">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className={`w-full h-full object-cover ${!stream ? 'hidden' : ''}`}
        style={{
          transform: 'scaleX(-1)',
          WebkitTransform: 'scaleX(-1)'
        }}
      />
      {!stream && (
        <div className="w-full h-full flex items-center justify-center">
          <User className="w-16 h-16 text-gray-500" />
        </div>
      )}
      {isLoading && stream && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
          <div className="text-white">Processing...</div>
        </div>
      )}
    </div>
  );
};
