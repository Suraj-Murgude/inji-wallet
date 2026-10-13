import React, {useEffect, useRef, useState} from 'react';
import {ActivityIndicator} from 'react-native';
import {useTranslation} from 'react-i18next';

import {faceCompare} from '@nprime/face-sdk-react-native';
import {Button, Column, Text} from '.././ui';
import {Theme} from '.././ui/styleUtils';

export const FaceScanner: React.FC<FaceScannerProps> = props => {
  const {t} = useTranslation('FaceScanner');

  const hasStarted = useRef(false);
  const [isProcessing, setIsProcessing] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (hasStarted.current) {
      return;
    }

    hasStarted.current = true;
    let isMounted = true;

    const verifyFace = async () => {
      try {
        if (!props.vcImages || props.vcImages.length === 0) {
          throw new Error('No credential face image is available');
        }

        let isMatchFound = false;

        for (const image of props.vcImages) {
          if (!image) {
            continue;
          }

          // Support raw Base64 and data URI credential images.
          const vcImageBase64 = image.includes(',')
            ? image.substring(image.indexOf(',') + 1)
            : image;

          if (!vcImageBase64) {
            continue;
          }

          console.info('NPrime: Starting face verification');

          // The NPrime wrapper initializes the SDK internally.
          // It performs its own face capture, liveness check and comparison.
          isMatchFound = await faceCompare(
            false,
            true,
            vcImageBase64,
          );

          if (isMatchFound) {
            break;
          }
        }

        if (!isMounted) {
          return;
        }

        setIsProcessing(false);

        if (isMatchFound) {
          console.info('NPrime: Face verification successful');
          props.onValid();
        } else {
          console.warn('NPrime: Face verification unsuccessful');
          props.onInvalid();
        }
      } catch (error) {
        console.error('NPrime: Face verification error:', error);

        if (isMounted) {
          setIsProcessing(false);
          setErrorMessage(t('faceVerificationFailed'));
        }
      }
    };

    verifyFace();

    return () => {
      isMounted = false;
    };
  }, [props.vcImages, props.onValid, props.onInvalid, t]);

  const handleCancel = () => {
    props.onCancel();
  };

  const handleRetry = () => {
    // Ask the parent flow to restart this screen.
    // Do not call faceCompare again on the same mounted instance.
    props.onCancel();
  };

  if (isProcessing) {
    return (
      <Column
        fill
        align="center"
        justify="center"
        backgroundColor={Theme.Colors.white}
        padding="24">
        <ActivityIndicator
          size="large"
          color={Theme.Colors.primary}
        />

        <Text
          margin="16"
          weight="bold"
          align="center"
          color={Theme.Colors.black}>
          {t('faceProcessingInfo')}
        </Text>

        <Text align="center" color={Theme.Colors.grey}>
          Please follow the instructions shown by the face verification SDK.
        </Text>

        <Button
          title={t('cancel')}
          onPress={handleCancel}
        />
      </Column>
    );
  }

  if (errorMessage) {
    return (
      <Column
        fill
        align="center"
        justify="center"
        backgroundColor={Theme.Colors.white}
        padding="24">
        <Text
          align="center"
          color={Theme.Colors.errorMessage}>
          {errorMessage}
        </Text>

        <Button
          title={t('retry')}
          onPress={handleRetry}
        />

        <Button
          title={t('cancel')}
          onPress={handleCancel}
        />
      </Column>
    );
  }

  return <Column fill />;
};

interface FaceScannerProps {
  vcImages: string[];
  onValid: () => void;
  onInvalid: () => void;
  onCancel: () => void;
}
