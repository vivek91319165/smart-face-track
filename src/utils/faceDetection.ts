
import * as tf from '@tensorflow/tfjs';
import * as faceLandmarksDetection from '@tensorflow-models/face-landmarks-detection';

export const initializeFaceDetectionModel = async () => {
  await tf.ready();
  const model = await faceLandmarksDetection.createDetector(
    faceLandmarksDetection.SupportedModels.MediaPipeFaceMesh,
    {
      runtime: 'tfjs',
      refineLandmarks: true,
      maxFaces: 1
    }
  );
  console.log('Face detection model initialized');
  return model;
};

export const getFaceDescriptor = async (
  video: HTMLVideoElement,
  model: faceLandmarksDetection.FaceLandmarksDetector
): Promise<Float32Array | null> => {
  if (!video) {
    console.error('Video element not provided');
    return null;
  }

  // Make sure video is ready and playing
  if (video.readyState !== 4) {
    console.log('Waiting for video to be ready...');
    await new Promise(resolve => {
      video.onloadeddata = resolve;
    });
  }

  try {
    // Get face detection results with retries
    let attempts = 0;
    const maxAttempts = 3;
    let faces: any[] = [];

    while (attempts < maxAttempts && faces.length === 0) {
      faces = await model.estimateFaces(video, {
        flipHorizontal: false
      });
      
      if (faces.length === 0) {
        console.log(`No face detected, attempt ${attempts + 1} of ${maxAttempts}`);
        await new Promise(resolve => setTimeout(resolve, 500)); // Wait 500ms between attempts
        attempts++;
      }
    }

    if (faces.length === 0) {
      throw new Error("Please position your face clearly in front of the camera");
    }

    if (faces.length > 1) {
      throw new Error("Multiple faces detected. Please ensure only one face is visible");
    }

    // Get the first face detected
    const face = faces[0];
    
    // Convert keypoints to a descriptor
    const keypoints = face.keypoints.map((kp: any) => [kp.x, kp.y, kp.z || 0]).flat();
    const tensorDescriptor = tf.tensor1d(keypoints);
    const norm = tensorDescriptor.norm().dataSync()[0];
    const normalizedDescriptor = tensorDescriptor.div(norm);
    const descriptorData = await normalizedDescriptor.data();
    
    // Clean up tensors
    tensorDescriptor.dispose();
    normalizedDescriptor.dispose();

    console.log('Face descriptor generated successfully');
    return new Float32Array(descriptorData);
  } catch (error) {
    console.error('Error in face detection:', error);
    throw error;
  }
};
