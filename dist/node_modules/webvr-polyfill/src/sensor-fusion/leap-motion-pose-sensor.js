/*
 * Copyright 2015 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var ComplementaryFilter = require('./complementary-filter.js');
var PosePredictor = require('./pose-predictor.js');
var TouchPanner = require('../touch-panner.js');
var MathUtil = require('../math-util.js');
var Util = require('../util.js');

function LeapMotionPoseSensor(host, port) {
  this.deviceId = 'webvr-polyfill:leapmotion';
  this.deviceName = 'VR Position Device (webvr-polyfill:leapmotion)';

  this.accelerometer = new MathUtil.Vector3();
  this.gyroscope = new MathUtil.Vector3();

  window.addEventListener('devicemotion', this.onDeviceMotionChange_.bind(this));
  window.addEventListener('orientationchange', this.onScreenOrientationChange_.bind(this));

  this.filter = new ComplementaryFilter(WebVRConfig.K_FILTER || 0.98);
  this.posePredictor = new PosePredictor(WebVRConfig.PREDICTION_TIME_S || 0.040);
  this.touchPanner = new TouchPanner();

  this.filterToWorldQ = new MathUtil.Quaternion();

  // Set the filter to world transform, depending on OS.
  if (Util.isIOS()) {
    this.filterToWorldQ.setFromAxisAngle(new MathUtil.Vector3(1, 0, 0), Math.PI/2);
  } else {
    this.filterToWorldQ.setFromAxisAngle(new MathUtil.Vector3(1, 0, 0), -Math.PI/2);
  }

  this.worldToScreenQ = new MathUtil.Quaternion();
  this.setScreenTransform_();

  // Keep track of a reset transform for resetSensor.
  this.resetQ = new MathUtil.Quaternion();

  this.isFirefoxAndroid = Util.isFirefoxAndroid();
  this.isIOS = Util.isIOS();

  this.orientationOut_ = new Float32Array(4);

  // configure leap motion host/port via url params:
  location.search.substr(1).split("&").forEach( function(item) {
    var kv = item.split("=");
    if (kv[0] === 'host') {
      host = host || decodeURIComponent(kv[1]);
    }
    else if (kv[0] === 'port') {
      port = port || decodeURIComponent(kv[1]);
    }
  } );

  var leapConfig = {
    background: true
  };
  if (host) {
    leapConfig.host = host;
  }
  if (port) {
    leapConfig.port = port;
  }

  this.leapController = new Leap.Controller(leapConfig);

  this.leapController.on('connect', function () {
    console.log('LeapMotionPositionSensorVRDevice: connected to Leap Motion controller');
  });
  this.leapController.on('streamingStarted', function () {
    console.log('LeapMotionPositionSensorVRDevice: streaming started');
  });
  this.leapController.on('streamingStopped', function () {
    console.log('LeapMotionPositionSensorVRDevice: streaming stopped');
  });

  this.leapController.connect();
  this.position = new MathUtil.Vector3();
}

/**
 * Returns {orientation: {x,y,z,w}, position: {x,y,z}}.
 */
LeapMotionPoseSensor.prototype.getState = ( function () {
  var lastFrameID;
  // tool ids:
  var toolA, idA = null;
  var toolB, idB = null;
  // normalized pointing directions of the tools:
  var directionA = new MathUtil.Vector3();
  var directionB = new MathUtil.Vector3();
  // used for computing orientation quaternion:
  const NZ = new MathUtil.Vector3(0, 0, -1);
  var Y = new MathUtil.Vector3();
  var cross = new MathUtil.Vector3();
  var avg = new MathUtil.Vector3();
  var quat = new MathUtil.Quaternion();
  const inv_sqrt2 = 1 / Math.sqrt(2);

  return function () {

    // Update state if new Leap Motion frame is available.
    var frame = this.leapController.frame();
    if (frame.valid && frame.id != lastFrameID) {

      lastFrameID = frame.id;

      // manage tool IDs:
      if (idA !== null) {
        // A was tracking, try to find it again
        toolA = frame.tool(idA);
        if (!toolA.valid) {
          // A is lost
          idA = null;
        }
      }
      if (idB !== null) {
        // B was tracking, try to find it again
        toolB = frame.tool(idB);
        if (!toolB.valid) {
          // B is lost
          idB = null;
        }
      }
      if (frame.tools.length === 1) {
        if (idA === null && idB === null) {
          // start tracking A
          toolA = frame.tools[0];
          idA = toolA.id;
        }
      } else if (frame.tools.length === 2) {
        if (idA !== null && idB === null) {
          // start tracking B
          toolB = (frame.tools[0].id === idA ? frame.tools[1] : frame.tools[0]);
          idB = toolB.id;
        } else if (idB !== null && idA === null) {
          toolA = (frame.tools[0].id === idB ? frame.tools[1] : frame.tools[1]);
          idA = toolA.id;
        }
      }

      if (idA !== null && idB !== null) {

        // set position to the average of the tips:
        this.position.set(0.0005 * (toolA.tipPosition[0] + toolB.tipPosition[0]),
                          0.0005 * (toolA.tipPosition[1] + toolB.tipPosition[1]),
                          0.0005 * (toolA.tipPosition[2] + toolB.tipPosition[2]));

        // determine orientation:
        // directionA.fromArray(toolA.direction);
        // directionB.fromArray(toolB.direction);

        // cross.crossVectors(directionA, directionB);
        // if (cross.y < 0) {
        //   cross.negate();
        // }

        // avg.addVectors(directionA, directionB);

        // // not performed under assumption that A, B are orthogonal
        // //avg.normalize();
        // avg.multiplyScalar(inv_sqrt2);

        // quat.setFromUnitVectors(NZ, avg);
        // Y.set(0, 1, 0).applyQuaternion(quat);

        // // not performed under assumption that A, B are orthogonal
        // //cross.normalize();
        // this.orientation.setFromUnitVectors(Y, cross);

        // this.orientation.multiplyQuaternions(quat, this.orientation);
      }

    }

    return {
      hasOrientation: true,
      orientation: this.orientation,
      hasPosition: true,
      position: this.position
    };

  };
} )();

LeapMotionPoseSensor.prototype.getPosition = function () {
  var position = this.getState().position;
  return [position.x, position.y, position.z];
};

LeapMotionPoseSensor.prototype.getOrientation = function () {
  // Convert from filter space to the the same system used by the
  // deviceorientation event.
  var orientation = this.filter.getOrientation();

  // Predict orientation.
  this.predictedQ = this.posePredictor.getPrediction(orientation, this.gyroscope, this.previousTimestampS);

  // Convert to MathUtil coordinate system: -Z forward, Y up, X right.
  var out = new MathUtil.Quaternion();
  out.copy(this.filterToWorldQ);
  out.multiply(this.resetQ);
  if (!WebVRConfig.TOUCH_PANNER_DISABLED) {
    out.multiply(this.touchPanner.getOrientation());
  }
  out.multiply(this.predictedQ);
  out.multiply(this.worldToScreenQ);

  // Handle the yaw-only case.
  if (WebVRConfig.YAW_ONLY) {
    // Make a quaternion that only turns around the Y-axis.
    out.x = 0;
    out.z = 0;
    out.normalize();
  }

  this.orientationOut_[0] = out.x;
  this.orientationOut_[1] = out.y;
  this.orientationOut_[2] = out.z;
  this.orientationOut_[3] = out.w;
  return this.orientationOut_;
};

LeapMotionPoseSensor.prototype.resetPose = function() {
  // Reduce to inverted yaw-only
  this.resetQ.copy(this.filter.getOrientation());
  this.resetQ.x = 0;
  this.resetQ.y = 0;
  this.resetQ.z *= -1;
  this.resetQ.normalize();

  if (!WebVRConfig.TOUCH_PANNER_DISABLED) {
    this.touchPanner.resetSensor();
  }
};

LeapMotionPoseSensor.prototype.onDeviceMotionChange_ = function(deviceMotion) {
  var accGravity = deviceMotion.accelerationIncludingGravity;
  var rotRate = deviceMotion.rotationRate;
  var timestampS = deviceMotion.timeStamp / 1000;

  // Firefox Android timeStamp returns one thousandth of a millisecond.
  if (this.isFirefoxAndroid) {
    timestampS /= 1000;
  }

  var deltaS = timestampS - this.previousTimestampS;
  if (deltaS <= Util.MIN_TIMESTEP || deltaS > Util.MAX_TIMESTEP) {
    console.warn('Invalid timestamps detected. Time step between successive ' +
                 'gyroscope sensor samples is very small or not monotonic');
    this.previousTimestampS = timestampS;
    return;
  }
  this.accelerometer.set(-accGravity.x, -accGravity.y, -accGravity.z);
  this.gyroscope.set(rotRate.alpha, rotRate.beta, rotRate.gamma);

  // With iOS and Firefox Android, rotationRate is reported in degrees,
  // so we first convert to radians.
  if (this.isIOS || this.isFirefoxAndroid) {
    this.gyroscope.multiplyScalar(Math.PI / 180);
  }

  this.filter.addAccelMeasurement(this.accelerometer, timestampS);
  this.filter.addGyroMeasurement(this.gyroscope, timestampS);

  this.previousTimestampS = timestampS;
};

LeapMotionPoseSensor.prototype.onScreenOrientationChange_ =
    function(screenOrientation) {
  this.setScreenTransform_();
};

LeapMotionPoseSensor.prototype.setScreenTransform_ = function() {
  this.worldToScreenQ.set(0, 0, 0, 1);
  switch (window.orientation) {
    case 0:
      break;
    case 90:
      this.worldToScreenQ.setFromAxisAngle(new MathUtil.Vector3(0, 0, 1), -Math.PI/2);
      break;
    case -90:
      this.worldToScreenQ.setFromAxisAngle(new MathUtil.Vector3(0, 0, 1), Math.PI/2);
      break;
    case 180:
      // TODO.
      break;
  }
};

module.exports = LeapMotionPoseSensor;
