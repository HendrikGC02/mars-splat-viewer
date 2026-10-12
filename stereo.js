import * as THREE from "three";

/**
 * A pair of off-axis eye cameras for side-by-side stereo, driven from one ordinary camera.
 *
 * three.js ships THREE.StereoCamera, but it poses its eyes by writing straight into
 * `cameraL/R.matrixWorld` and leaving `matrix` at the identity with `matrixAutoUpdate` off. That only
 * holds as long as nothing asks those cameras to recompute their world matrix: `getWorldPosition()`,
 * `getWorldDirection()` and `updateWorldMatrix()` all copy `matrix` (the identity) over `matrixWorld`,
 * silently resetting the eye to the world origin looking down -Z. Spark's SparkRenderer calls
 * `getWorldPosition()` and `getWorldDirection()` on the render camera every frame to decide its splat
 * sort order, so in side-by-side mode both eyes rendered from the origin and stopped responding to
 * the controls entirely.
 *
 * This rig keeps a real local transform (position + quaternion) on each eye, so recomputing the world
 * matrix reproduces the same pose. It borrows StereoCamera purely for the off-axis frustums, and the
 * eyes carry the source camera's intrinsics: Spark reads `near`/`far` off the render camera for its
 * depth uniforms and uses it for sorting and LOD, so a default PerspectiveCamera's 0.1/2000/50deg
 * would quietly change what gets drawn.
 */
export class StereoRig {
  constructor() {
    this.stereo = new THREE.StereoCamera();
    this.cameraL = new THREE.PerspectiveCamera();
    this.cameraR = new THREE.PerspectiveCamera();
  }

  /**
   * @param {THREE.PerspectiveCamera} camera - the camera to follow (the one the controls move).
   * @param {number} eyeSep - eye separation in world units.
   * @param {number} [aspect=0.5] - fraction of the viewport width each eye gets.
   */
  update(camera, eyeSep, aspect = 0.5) {
    camera.updateMatrixWorld();
    this.stereo.eyeSep = eyeSep;
    this.stereo.aspect = aspect;
    this.stereo.update(camera);  // off-axis projection matrices, cached on fov/aspect/near/far/eyeSep

    const eyes = [[this.cameraL, this.stereo.cameraL, -1], [this.cameraR, this.stereo.cameraR, 1]];
    for (const [eye, src, sign] of eyes) {
      eye.copy(camera);  // near/far/fov/focus/zoom/layers
      eye.aspect = camera.aspect * aspect;
      // Pose from the camera's *world* matrix: the eyes have no parent, so their local transform is
      // their world transform even if the camera itself is parented.
      camera.matrixWorld.decompose(eye.position, eye.quaternion, eye.scale);
      eye.translateX(sign * eyeSep / 2);
      eye.projectionMatrix.copy(src.projectionMatrix);
      eye.projectionMatrixInverse.copy(eye.projectionMatrix).invert();
      eye.updateMatrixWorld(true);
    }
  }
}
