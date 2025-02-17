
import * as tf from '@tensorflow/tfjs';
import * as faceLandmarksDetection from '@tensorflow-models/face-landmarks-detection';

export const initializeFaceDetectionModel = async () => {
  await tf.ready();
  return faceLandmarksDetection.createDetector(
    faceLandmarksDetection.SupportedModels.MediaPipeFaceMesh,
    {
      runtime: 'tfjs',
      refineLandmarks: false,
    }
  );
};

export const getFaceDescriptor = async (
  video: HTMLVideoElement,
  model: faceLandmarksDetection.FaceLandmarksDetector
): Promise<Float32Array | null> => {
  if (!video) return null;

  // Make sure video is ready
  if (video.readyState !== 4) {
    await new Promise(resolve => {
      video.onloadeddata = resolve;
    });
  }

  // Get face detection results
  const faces = await model.estimateFaces(video);

  if (faces.length === 0) {
    throw new Error("No face detected");
  }

  if (faces.length > 1) {
    throw new Error("Multiple faces detected");
  }

  // Get the first face detected
  const face = faces[0];
  
  // Convert keypoints to a descriptor
  const keypoints = face.keypoints.map(kp => [kp.x, kp.y, kp.z || 0]).flat();
  const tensorDescriptor = tf.tensor1d(keypoints);
  const norm = tensorDescriptor.norm().dataSync()[0];
  const normalizedDescriptor = tensorDescriptor.div(norm);
  const descriptorData = await normalizedDescriptor.data();
  
  // Clean up tensors
  tensorDescriptor.dispose();
  normalizedDescriptor.dispose();

  return new Float32Array(descriptorData);
};
