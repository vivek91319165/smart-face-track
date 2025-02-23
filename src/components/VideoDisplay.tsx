
import { User } from "lucide-react";

interface VideoDisplayProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  stream: MediaStream | null;
  isLoading?: boolean;
}

export const VideoDisplay = ({ videoRef, stream, isLoading }: VideoDisplayProps) => {
  return (
    <div className="aspect-video bg-black rounded-lg overflow-hidden mb-6 relative">
      {stream ? (
        <>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
            style={{
              transform: 'scaleX(-1)', // Mirror effect
              WebkitTransform: 'scaleX(-1)' // For Safari support
            }}
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
  );
};
