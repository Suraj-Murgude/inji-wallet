import {Camera, CameraCapturedPicture,PermissionResponse,
} from 'expo-camera';
import {Linking} from 'react-native';
import {assign, EventFrom, StateFrom} from 'xstate';
import {createModel} from 'xstate/lib/model';

import {faceCompare} from '@nprime/face-sdk-react-native';
import {ImageType} from '../components/FaceScanner/FaceScannerHelper';

const model = createModel(
  {
    cameraRef: {} as Camera | null,
    faceBounds: {
      minWidth: 280,
      minHeight: 280,
    },
    capturedImage: {} as CameraCapturedPicture | null,
    captureError: '',
  },
  {
    events: {
      READY: (cameraRef: Camera) => ({cameraRef}),
      CAPTURE: () => ({}),
      DENIED: (response: PermissionResponse) => ({response}),
      GRANTED: () => ({}),
      OPEN_SETTINGS: () => ({}),
      APP_FOCUSED: () => ({}),
    },
  },
);

export const FaceScannerEvents = model.events;

export const createFaceScannerMachine = (vcImages: string[]) =>
  model.createMachine(
    {
      predictableActionArguments: true,
      preserveActionOrder: true,
      tsTypes: {} as import('./faceScanner.typegen').Typegen0,
      schema: {
        context: model.initialContext,
        events: {} as EventFrom<typeof model>,
        services: {} as {
          captureImage: {
            data: CameraCapturedPicture;
          };
          verifyImage: {
            data: boolean;
          };
        },
      },
      id: 'faceScanner',
      initial: 'init',
      states: {
        init: {
          initial: 'checkingPermission',
          states: {
            checkingPermission: {
              invoke: {
                src: 'checkPermission',
              },
              on: {
                DENIED: [
                  {
                    cond: 'canRequestPermission',
                    target: 'requestingPermission',
                  },
                  {
                    target: 'permissionDenied',
                  },
                ],
                GRANTED: 'permissionGranted',
              },
            },
            permissionDenied: {
              on: {
                OPEN_SETTINGS: {
                  actions: 'openSettings',
                },
                APP_FOCUSED: 'checkingPermission',
              },
            },
            permissionGranted: {},
            requestingPermission: {
              invoke: {
                src: 'requestPermission',
              },
              on: {
                GRANTED: 'permissionGranted',
                DENIED: 'permissionDenied',
              },
            },
          },
          on: {
            READY: {
              actions: 'setCameraRef',
              target: 'scanning',
            },
          },
        },

        scanning: {
          on: {
            CAPTURE: 'capturing',
          },
        },

        capturing: {
          invoke: {
            src: 'captureImage',
            onDone: {
              actions: 'setCapturedImage',
              target: 'verifying',
            },
            onError: {
              actions: 'setCaptureError',
              target: 'scanning',
            },
          },
        },

        verifying: {
          invoke: {
            src: 'verifyImage',
            onDone: [
              {
                cond: 'doesFaceMatch',
                target: 'valid',
              },
              {
                target: 'invalid',
              },
            ],
            onError: 'invalid',
          },
        },

        valid: {
          type: 'final',
        },

        invalid: {
          type: 'final',
        },
      },
    },
    {
      actions: {
        setCameraRef: model.assign({
          cameraRef: (_context, event) => event.cameraRef,
        }),

        setCapturedImage: assign({
          capturedImage: (_context, event) => event.data,
        }),

        setCaptureError: assign({
          captureError: () => 'Failed to capture image.',
        }),

        openSettings: () => Linking.openSettings(),
      },

      services: {
        checkPermission: () => async callback => {
          const result = await Camera.getCameraPermissionsAsync();

          if (result.granted) {
            callback(FaceScannerEvents.GRANTED());
          } else {
            callback(FaceScannerEvents.DENIED(result));
          }
        },

        requestPermission: () => async callback => {
          const result = await Camera.requestCameraPermissionsAsync();

          if (result.granted) {
            callback(FaceScannerEvents.GRANTED());
          } else {
            callback(FaceScannerEvents.DENIED(result));
          }
        },

        captureImage: context => {
          if (!context.cameraRef) {
            throw new Error('Camera is not ready');
          }

          return context.cameraRef.takePictureAsync({
            base64: true,
            imageType: ImageType.jpg,
          });
        },

        verifyImage: async context => {
          const {capturedImage} = context;

          if (!capturedImage?.base64) {
            throw new Error('No image captured');
          }

          if (!vcImages || vcImages.length === 0) {
            throw new Error('No credential face images available');
          }

          let isMatchFound = false;

          for (const vcImage of vcImages) {
            if (!vcImage) {
              continue;
            }

            // Accept either a raw Base64 image or a data URI.
            const vcBase64 = vcImage.includes(',')
              ? vcImage.substring(vcImage.indexOf(',') + 1)
              : vcImage;

            if (!vcBase64) {
              continue;
            }

            try {
              /*
               * NPrime wrapper signature:
               * faceCompare(rearCamera, liveness, vcImage)
               *
               * The wrapper performs its own face capture and matching.
               * It does not accept capturedImage.base64 as an argument.
               */
              isMatchFound = await faceCompare(false, true, vcBase64);

              if (isMatchFound) {
                break;
              }
            } catch (error) {
              console.error('NPrime face verification failed:', error);
              throw error;
            }
          }

          return isMatchFound;
        },
      },

      guards: {
        canRequestPermission: (_context, event) =>
          event.response.canAskAgain,

        doesFaceMatch: (_context, event) => event.data === true,
      },
    },
  );

type State = StateFrom<ReturnType<typeof createFaceScannerMachine>>;

export function selectCameraRef(state: State) {
  return state.context.cameraRef;
}

export function selectCapturedImage(state: State) {
  return state.context.capturedImage;
}

export function selectIsCheckingPermission(state: State) {
  return state.matches('init.checkingPermission');
}

export function selectIsPermissionDenied(state: State) {
  return state.matches('init.permissionDenied');
}

export function selectIsScanning(state: State) {
  return state.matches('scanning');
}

export function selectIsCapturing(state: State) {
  return state.matches('capturing');
}

export function selectIsVerifying(state: State) {
  return state.matches('verifying');
}

export function selectIsValid(state: State) {
  return state.matches('valid');
}

export function selectIsInvalid(state: State) {
  return state.matches('invalid');
}

