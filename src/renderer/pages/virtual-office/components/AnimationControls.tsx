import React from 'react';
import { Select, Slider, Tag } from '@arco-design/web-react';
import type { SpineAnimationControls } from '../hooks/useSpineAnimation';
import styles from './AnimationControls.module.css';

type Props = {
  controls: SpineAnimationControls;
  timeScale: number;
  onTimeScaleChange: (v: number) => void;
  loop: boolean;
  onLoopChange: (v: boolean) => void;
};

function AnimationControls({ controls, timeScale, onTimeScaleChange, loop, onLoopChange }: Props) {
  const { availableAnimations, availableSkins, currentAnimation, currentSkin, isLoaded, playAnimation, setSkin } =
    controls;

  if (!isLoaded) return null;

  return (
    <div className={styles.panel}>
      <div className={styles.section}>
        <div className={styles.label}>动画</div>
        <div className={styles.animList}>
          {availableAnimations.map((name) => (
            <Tag
              key={name}
              className={`${styles.animTag} ${currentAnimation === name ? styles.animTagActive : ''}`}
              onClick={() => playAnimation(name, loop)}
            >
              {name}
            </Tag>
          ))}
        </div>
      </div>

      {availableSkins.length > 1 && (
        <div className={styles.section}>
          <div className={styles.label}>皮肤</div>
          <Select
            value={currentSkin ?? undefined}
            onChange={(v: string) => setSkin(v)}
            style={{ width: '100%' }}
            size='small'
          >
            {availableSkins.map((name) => (
              <Select.Option key={name} value={name}>
                {name}
              </Select.Option>
            ))}
          </Select>
        </div>
      )}

      <div className={styles.section}>
        <div className={styles.label}>速度 {timeScale.toFixed(2)}x</div>
        <Slider
          min={0.1}
          max={3}
          step={0.05}
          value={timeScale}
          onChange={(v) => {
            const val = typeof v === 'number' ? v : v[0];
            onTimeScaleChange(val);
          }}
        />
      </div>

      <div className={styles.section}>
        <div className={styles.label}>循环播放</div>
        <Tag
          className={`${styles.loopTag} ${loop ? styles.loopTagActive : ''}`}
          onClick={() => {
            const next = !loop;
            onLoopChange(next);
            if (currentAnimation) playAnimation(currentAnimation, next);
          }}
        >
          {loop ? '循环 ON' : '循环 OFF'}
        </Tag>
      </div>
    </div>
  );
}

export default AnimationControls;
