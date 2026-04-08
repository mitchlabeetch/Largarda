import React, { useCallback, useRef, useState } from 'react';
import { usePixiApp } from '../hooks/usePixiApp';
import { useSpineAnimation } from '../hooks/useSpineAnimation';
import type { SpineAnimationConfig } from '../hooks/useSpineAnimation';
import AnimationControls from './AnimationControls';
import styles from './AnimationPreviewer.module.css';

const CANVAS_WIDTH = 640;
const CANVAS_HEIGHT = 480;

const BG_PRESETS: { label: string; value: number }[] = [
  { label: '深空', value: 0x0a0a14 },
  { label: '黑色', value: 0x000000 },
  { label: '深灰', value: 0x1a1a2e },
  { label: '白色', value: 0xffffff },
  { label: '绿幕', value: 0x00ff00 },
];

function AnimationPreviewer() {
  const containerRef = useRef<HTMLDivElement>(null);

  const [bgColor, setBgColor] = useState(0x0a0a14);
  const [config, setConfig] = useState<SpineAnimationConfig | null>({
    skelUrl: '/spine/spineboy/spineboy.skel',
    atlasUrl: '/spine/spineboy/spineboy.atlas',
  });
  const [timeScale, setTimeScale] = useState(1);
  const [loop, setLoop] = useState(true);
  const [isDragOver, setIsDragOver] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);

  const app = usePixiApp(containerRef, { width: CANVAS_WIDTH, height: CANVAS_HEIGHT, background: bgColor });
  const controls = useSpineAnimation(app, config);

  // change bg color on the live app
  const handleBgChange = useCallback(
    (color: number) => {
      setBgColor(color);
      if (app) {
        app.renderer.background.color = color;
      }
    },
    [app]
  );

  const handleTimeScaleChange = useCallback(
    (v: number) => {
      setTimeScale(v);
      controls.setTimeScale(v);
    },
    [controls]
  );

  // Load files from FileReader (drag or file input)
  const loadFromFiles = useCallback((files: FileList | File[]) => {
    const fileArr = Array.from(files);
    const skelFile = fileArr.find((f) => f.name.endsWith('.skel') || f.name.endsWith('.json'));
    const atlasFile = fileArr.find((f) => f.name.endsWith('.atlas'));

    if (!skelFile || !atlasFile) {
      setFileError('请同时拖入 .skel（或 .json）和 .atlas 文件');
      return;
    }

    setFileError(null);

    const readAsDataURL = (file: File): Promise<string> =>
      new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.addEventListener('load', () => resolve(reader.result as string));
        reader.addEventListener('error', () => reject(new Error(`Failed to read ${file.name}`)));
        reader.readAsDataURL(file);
      });

    const readAsText = (file: File): Promise<string> =>
      new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.addEventListener('load', () => resolve(reader.result as string));
        reader.addEventListener('error', () => reject(new Error(`Failed to read ${file.name}`)));
        reader.readAsText(file);
      });

    Promise.all([readAsDataURL(skelFile), readAsText(atlasFile)])
      .then(([skelDataUrl, atlasText]) => {
        // We need the atlas text and the skel data URL
        // Pass them via a special scheme we'll handle in useSpineAnimation
        setConfig({
          skelUrl: skelDataUrl,
          atlasUrl: `data:text/plain;charset=utf-8,${encodeURIComponent(atlasText)}`,
        });
      })
      .catch((err: unknown) => {
        setFileError(err instanceof Error ? err.message : String(err));
      });
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      loadFromFiles(e.dataTransfer.files);
    },
    [loadFromFiles]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) loadFromFiles(e.target.files);
    },
    [loadFromFiles]
  );

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <span className={styles.title}>骨骼动画预览器</span>
        <span className={styles.hint}>— 内置演示：Spine Boy | 拖入文件加载自定义角色</span>
      </div>

      <div className={styles.workspace}>
        {/* Canvas area */}
        <div
          className={`${styles.canvasWrap} ${isDragOver ? styles.canvasWrapDragOver : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div ref={containerRef} className={styles.canvas} />

          {!controls.isLoaded && !controls.error && (
            <div className={styles.overlay}>
              <span className={styles.overlayText}>加载中...</span>
            </div>
          )}

          {controls.error && (
            <div className={styles.overlay}>
              <span className={styles.overlayError}>加载失败：{controls.error}</span>
            </div>
          )}

          {isDragOver && (
            <div className={styles.dropZone}>
              <span>松开以加载 .skel / .atlas 文件</span>
            </div>
          )}
        </div>

        {/* Right panel */}
        <div className={styles.rightPanel}>
          <AnimationControls
            controls={controls}
            timeScale={timeScale}
            onTimeScaleChange={handleTimeScaleChange}
            loop={loop}
            onLoopChange={setLoop}
          />

          {/* Background color picker */}
          <div className={styles.bgSection}>
            <div className={styles.bgLabel}>背景色</div>
            <div className={styles.bgPresets}>
              {BG_PRESETS.map((preset) => (
                <button
                  key={preset.value}
                  className={`${styles.bgBtn} ${bgColor === preset.value ? styles.bgBtnActive : ''}`}
                  style={{ background: `#${preset.value.toString(16).padStart(6, '0')}` }}
                  onClick={() => handleBgChange(preset.value)}
                  title={preset.label}
                />
              ))}
            </div>
          </div>

          {/* File loader */}
          <div className={styles.fileSection}>
            <div className={styles.bgLabel}>加载自定义文件</div>
            <label className={styles.fileLabel}>
              <input
                type='file'
                multiple
                accept='.skel,.json,.atlas,.png'
                className={styles.fileInput}
                onChange={handleFileInput}
              />
              <span className={styles.fileBtn}>选择文件...</span>
            </label>
            {fileError && <div className={styles.fileError}>{fileError}</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

export default AnimationPreviewer;
