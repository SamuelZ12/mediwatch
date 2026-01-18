// Stub file for @mediapipe/face_mesh
// This is used to satisfy imports when using the tfjs runtime
// which doesn't actually need the mediapipe module

export const FaceMesh = class FaceMesh {
  constructor() {
    throw new Error('MediaPipe FaceMesh is not available. Use tfjs runtime instead.');
  }
};

export const FACEMESH_TESSELATION = [];
export const FACEMESH_RIGHT_EYE = [];
export const FACEMESH_LEFT_EYE = [];
export const FACEMESH_RIGHT_EYEBROW = [];
export const FACEMESH_LEFT_EYEBROW = [];
export const FACEMESH_FACE_OVAL = [];
export const FACEMESH_LIPS = [];
export const FACEMESH_RIGHT_IRIS = [];
export const FACEMESH_LEFT_IRIS = [];

export default {
  FaceMesh,
  FACEMESH_TESSELATION,
  FACEMESH_RIGHT_EYE,
  FACEMESH_LEFT_EYE,
  FACEMESH_RIGHT_EYEBROW,
  FACEMESH_LEFT_EYEBROW,
  FACEMESH_FACE_OVAL,
  FACEMESH_LIPS,
  FACEMESH_RIGHT_IRIS,
  FACEMESH_LEFT_IRIS,
};
