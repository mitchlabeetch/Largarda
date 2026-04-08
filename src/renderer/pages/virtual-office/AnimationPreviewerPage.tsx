import React from 'react';
import AnimationPreviewer from './components/AnimationPreviewer';
import styles from './index.module.css';

function AnimationPreviewerPage() {
  return (
    <div className={styles.page}>
      <AnimationPreviewer />
    </div>
  );
}

export default AnimationPreviewerPage;
