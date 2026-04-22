/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { Button, Steps } from '@arco-design/web-react';
import { Right, Success } from '@icon-park/react';
import ModalWrapper from '@renderer/components/base/ModalWrapper';
import { ConfigStorage } from '@/common/config/storage';
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import styles from '../index.module.css';

const STEPS_COUNT = 4;

interface OnboardingStep {
  title: string;
  description: string;
  icon: React.ReactNode;
}

type OnboardingModalProps = {
  visible: boolean;
  onComplete: () => void;
  onSkip: () => void;
};

const OnboardingModal: React.FC<OnboardingModalProps> = ({ visible, onComplete, onSkip }) => {
  const { t } = useTranslation();
  const [currentStep, setCurrentStep] = useState(0);

  // Persist progress as user advances through steps
  useEffect(() => {
    if (visible && currentStep > 0) {
      void ConfigStorage.set('onboarding.lastStep', currentStep);
    }
  }, [currentStep, visible]);

  const steps: OnboardingStep[] = [
    {
      title: t('onboarding.step1.title'),
      description: t('onboarding.step1.description'),
      icon: <span className={styles.stepIcon}>👋</span>,
    },
    {
      title: t('onboarding.step2.title'),
      description: t('onboarding.step2.description'),
      icon: <span className={styles.stepIcon}>🤖</span>,
    },
    {
      title: t('onboarding.step3.title'),
      description: t('onboarding.step3.description'),
      icon: <span className={styles.stepIcon}>💬</span>,
    },
    {
      title: t('onboarding.step4.title'),
      description: t('onboarding.step4.description'),
      icon: <span className={styles.stepIcon}>✨</span>,
    },
  ];

  const handleNext = useCallback(() => {
    if (currentStep < STEPS_COUNT - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      void ConfigStorage.set('onboarding.completed', true);
      void ConfigStorage.set('onboarding.lastStep', STEPS_COUNT);
      onComplete();
    }
  }, [currentStep, onComplete]);

  const handleSkip = useCallback(() => {
    void ConfigStorage.set('onboarding.completed', true);
    onSkip();
  }, [onSkip]);

  const handleStepChange = useCallback((step: number) => {
    setCurrentStep(step);
  }, []);

  const isLastStep = currentStep === STEPS_COUNT - 1;

  return (
    <ModalWrapper
      title={t('onboarding.title')}
      visible={visible}
      onCancel={handleSkip}
      footer={null}
      className={`w-[min(720px,calc(100vw-32px))] max-w-720px ${styles.onboardingModal}`}
      autoFocus={false}
      maskClosable={false}
    >
      <div className={styles.onboardingContainer} role="dialog" aria-modal="true" aria-labelledby="onboarding-title">
        <Steps
          current={currentStep}
          direction="horizontal"
          size="small"
          onChange={handleStepChange}
          className={styles.steps}
        >
          {steps.map((step, index) => (
            <Steps.Step
              key={index}
              title={step.title}
              className={index === currentStep ? styles.activeStep : ''}
            />
          ))}
        </Steps>

        <div className={styles.stepContent} role="region" aria-live="polite" aria-label={t('onboarding.stepLabel', { step: currentStep + 1 })}>
          <div className={styles.stepIconWrapper} aria-hidden="true">
            {steps[currentStep]?.icon}
          </div>
          <h2 id="onboarding-title" className={styles.stepTitle}>
            {steps[currentStep]?.title}
          </h2>
          <p className={styles.stepDescription}>{steps[currentStep]?.description}</p>
        </div>

        <div className={styles.actions}>
          <Button
            type="secondary"
            onClick={handleSkip}
            className={styles.skipButton}
            aria-label={t('onboarding.skipAriaLabel')}
          >
            {t('onboarding.skip')}
          </Button>
          <Button
            type="primary"
            onClick={handleNext}
            icon={isLastStep ? <Success theme="outline" size={16} /> : <Right theme="outline" size={16} />}
            className={styles.nextButton}
            aria-label={isLastStep ? t('onboarding.finishAriaLabel') : t('onboarding.nextAriaLabel')}
          >
            {isLastStep ? t('onboarding.finish') : t('onboarding.next')}
          </Button>
        </div>

        <div className={styles.progressIndicator} role="progressbar" aria-valuenow={currentStep + 1} aria-valuemin={1} aria-valuemax={STEPS_COUNT} aria-label={t('onboarding.progressLabel')}>
          {t('onboarding.stepCounter', { current: currentStep + 1, total: STEPS_COUNT })}
        </div>
      </div>
    </ModalWrapper>
  );
};

export default OnboardingModal;
