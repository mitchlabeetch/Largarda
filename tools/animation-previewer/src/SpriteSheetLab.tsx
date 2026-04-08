import { useCallback, useEffect, useRef, useState } from 'react';
import { generateBuiltinSheet, BUILTIN_SHEET_INFO } from './generateBuiltinSheet';

// ─── 绿幕抠图 ─────────────────────────────────────────────────────────────────
// 把与目标颜色距离小于阈值的像素 alpha 置零

function chromaKey(
  imageData: ImageData,
  targetR: number,
  targetG: number,
  targetB: number,
  threshold: number,
): ImageData {
  const out = new ImageData(
    new Uint8ClampedArray(imageData.data),
    imageData.width,
    imageData.height,
  );
  const { data } = out;
  for (let i = 0; i < data.length; i += 4) {
    const dr = data[i] - targetR;
    const dg = data[i + 1] - targetG;
    const db = data[i + 2] - targetB;
    if (dr * dr + dg * dg + db * db < threshold * threshold) {
      data[i + 3] = 0;
    }
  }
  return out;
}

// ─── 连通区域检测（flood fill，4连通）─────────────────────────────────────────

type Rect = { x: number; y: number; w: number; h: number };

function findConnectedRegions(imageData: ImageData, minArea: number): Rect[] {
  const { width, height, data } = imageData;
  const visited = new Uint8Array(width * height);
  const regions: Rect[] = [];

  for (let py = 0; py < height; py++) {
    for (let px = 0; px < width; px++) {
      const idx = py * width + px;
      if (visited[idx]) continue;
      if (data[idx * 4 + 3] < 128) continue; // 透明，跳过

      // BFS flood fill
      const queue: number[] = [idx];
      visited[idx] = 1;
      let minX = px, maxX = px, minY = py, maxY = py;
      let area = 0;

      while (queue.length > 0) {
        const cur = queue.pop()!;
        const cx = cur % width;
        const cy = Math.floor(cur / width);
        area++;
        if (cx < minX) minX = cx;
        if (cx > maxX) maxX = cx;
        if (cy < minY) minY = cy;
        if (cy > maxY) maxY = cy;

        const neighbors = [
          cur - 1,
          cur + 1,
          cur - width,
          cur + width,
        ];
        for (const n of neighbors) {
          if (n < 0 || n >= width * height) continue;
          if (visited[n]) continue;
          const nx = n % width;
          const ny = Math.floor(n / width);
          if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
          if (data[n * 4 + 3] < 128) continue;
          visited[n] = 1;
          queue.push(n);
        }
      }

      if (area >= minArea) {
        regions.push({
          x: minX,
          y: minY,
          w: maxX - minX + 1,
          h: maxY - minY + 1,
        });
      }
    }
  }

  return regions;
}

// 裁剪一个 Rect 区域到独立 canvas
function cropRegion(
  src: HTMLCanvasElement,
  rect: Rect,
  padding = 2,
  scale = 3,
): HTMLCanvasElement {
  const w = rect.w + padding * 2;
  const h = rect.h + padding * 2;
  const canvas = document.createElement('canvas');
  canvas.width = w * scale;
  canvas.height = h * scale;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(src, rect.x - padding, rect.y - padding, w, h, 0, 0, w * scale, h * scale);
  return canvas;
}

// ─── 部件标签猜测（按 Y 坐标升序，头在最上）────────────────────────────────

const PART_LABELS = ['头部', '躯干', '左上臂', '左前臂', '右上臂', '右前臂', '左腿', '右腿'];

function guessParts(rects: Rect[]): Array<Rect & { label: string }> {
  // 按 Y 坐标升序（头在最上面）
  const sorted = [...rects].sort((a, b) => a.y - b.y);
  return sorted.map((r, i) => ({
    ...r,
    label: PART_LABELS[i] ?? `部件${i + 1}`,
  }));
}

// ─── 组件 ─────────────────────────────────────────────────────────────────────

type Step = 'input' | 'keyed' | 'sliced';

// 推荐的 sprite sheet prompt
const SHEET_PROMPT = `pixel art character parts sprite sheet, pure #00FF00 green screen background, isolated body parts arranged with large gaps between them: head (side view), torso (side view), left upper arm, left forearm with hand, right upper arm, right forearm with hand, left thigh, left shin with shoe. Each part on separate area. 32x32 pixel art style, flat shading, warm colors, programmer character, clean outlines, no shadows between parts`;

export default function SpriteSheetLab() {
  const [step, setStep] = useState<Step>('input');
  const [chromaThreshold, setChromaThreshold] = useState<number>(BUILTIN_SHEET_INFO.chromaThreshold);
  const [minArea, setMinArea] = useState<number>(BUILTIN_SHEET_INFO.minArea);
  const [parts, setParts] = useState<Array<{ label: string; dataUrl: string; rect: Rect }>>([]);
  const [partCount, setPartCount] = useState(0);

  const sheetCanvasRef = useRef<HTMLCanvasElement>(null);
  const keyedCanvasRef = useRef<HTMLCanvasElement>(null);
  const workCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // 把 canvas 直接画到 sheet canvas（内置演示用）
  const loadCanvas = useCallback((src: HTMLCanvasElement) => {
    const canvas = sheetCanvasRef.current;
    if (!canvas) return;
    canvas.width = src.width;
    canvas.height = src.height;
    canvas.getContext('2d')!.drawImage(src, 0, 0);
    setStep('input');
    setParts([]);
  }, []);

  // 把图片画到 sheet canvas
  const loadImage = useCallback((img: HTMLImageElement) => {
    const canvas = sheetCanvasRef.current;
    if (!canvas) return;
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(img, 0, 0);
    setStep('input');
    setParts([]);
  }, []);

  const handleFileUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.addEventListener('load', () => {
        loadImage(img);
        URL.revokeObjectURL(url);
      });
      img.src = url;
    },
    [loadImage],
  );

  // Step 1: 抠绿幕
  const handleChromaKey = useCallback(() => {
    const srcCanvas = sheetCanvasRef.current;
    const dstCanvas = keyedCanvasRef.current;
    if (!srcCanvas || !dstCanvas) return;

    const srcCtx = srcCanvas.getContext('2d')!;
    const imageData = srcCtx.getImageData(0, 0, srcCanvas.width, srcCanvas.height);

    // 目标色 #00FF00
    const keyed = chromaKey(imageData, 0, 255, 0, chromaThreshold);

    dstCanvas.width = srcCanvas.width;
    dstCanvas.height = srcCanvas.height;
    const dstCtx = dstCanvas.getContext('2d')!;

    // 棋盘格背景（透明区域可视化）
    const squareSize = 16;
    for (let y = 0; y < dstCanvas.height; y += squareSize) {
      for (let x = 0; x < dstCanvas.width; x += squareSize) {
        const isLight = ((x / squareSize) + (y / squareSize)) % 2 === 0;
        dstCtx.fillStyle = isLight ? '#1a1a2e' : '#12122a';
        dstCtx.fillRect(x, y, squareSize, squareSize);
      }
    }

    // 画抠图结果
    const tmpCanvas = document.createElement('canvas');
    tmpCanvas.width = srcCanvas.width;
    tmpCanvas.height = srcCanvas.height;
    tmpCanvas.getContext('2d')!.putImageData(keyed, 0, 0);
    dstCtx.drawImage(tmpCanvas, 0, 0);

    // 存工作用 canvas（纯透明通道，用于连通检测）
    workCanvasRef.current = tmpCanvas;

    setStep('keyed');
    setParts([]);
  }, [chromaThreshold]);

  // Step 2: 切割部件
  const handleSlice = useCallback(() => {
    const workCanvas = workCanvasRef.current;
    if (!workCanvas) return;

    const ctx = workCanvas.getContext('2d')!;
    const imageData = ctx.getImageData(0, 0, workCanvas.width, workCanvas.height);
    const regions = findConnectedRegions(imageData, minArea);
    const labeled = guessParts(regions);
    const partCount_ = labeled.length;
    setPartCount(partCount_);

    // 在 keyed canvas 上画 bounding box
    const dstCanvas = keyedCanvasRef.current;
    if (dstCanvas) {
      const dstCtx = dstCanvas.getContext('2d')!;
      // 先重绘一遍（清除之前的框）
      const srcCtx = sheetCanvasRef.current!.getContext('2d')!;
      const imageDataOrig = srcCtx.getImageData(0, 0, sheetCanvasRef.current!.width, sheetCanvasRef.current!.height);
      const keyedData = chromaKey(imageDataOrig, 0, 255, 0, chromaThreshold);
      const squareSize = 16;
      for (let y = 0; y < dstCanvas.height; y += squareSize) {
        for (let x = 0; x < dstCanvas.width; x += squareSize) {
          const isLight = ((x / squareSize) + (y / squareSize)) % 2 === 0;
          dstCtx.fillStyle = isLight ? '#1a1a2e' : '#12122a';
          dstCtx.fillRect(x, y, squareSize, squareSize);
        }
      }
      const tmp = document.createElement('canvas');
      tmp.width = dstCanvas.width;
      tmp.height = dstCanvas.height;
      tmp.getContext('2d')!.putImageData(keyedData, 0, 0);
      dstCtx.drawImage(tmp, 0, 0);

      // 画框
      labeled.forEach(({ x, y, w, h, label }, i) => {
        const hue = (i * 45) % 360;
        dstCtx.strokeStyle = `hsl(${hue}, 100%, 60%)`;
        dstCtx.lineWidth = 2;
        dstCtx.strokeRect(x - 2, y - 2, w + 4, h + 4);
        // 标签画在框内左上角，避免重叠
        dstCtx.fillStyle = `hsl(${hue}, 100%, 60%)`;
        dstCtx.font = 'bold 11px monospace';
        dstCtx.fillText(label, x + 2, y + 12);
      });
    }

    // 裁剪每个部件
    const sliced = labeled.map(({ label, ...rect }) => ({
      label,
      rect,
      dataUrl: cropRegion(workCanvas, rect, 4).toDataURL('image/png'),
    }));
    setParts(sliced);
    setStep('sliced');
  }, [minArea, chromaThreshold]);

  // 自动加载内置演示（组件挂载后执行）
  const autoLoaded = useRef(false);
  useEffect(() => {
    if (autoLoaded.current) return;
    autoLoaded.current = true;
    // 等 canvas refs 挂载完成
    const run = () => {
      if (!sheetCanvasRef.current || !keyedCanvasRef.current) {
        setTimeout(run, 100);
        return;
      }
      const builtinSheet = generateBuiltinSheet();
      loadCanvas(builtinSheet);
      // 稍后自动执行抠图+切割
      setTimeout(() => {
        handleChromaKey();
        setTimeout(() => {
          handleSlice();
        }, 50);
      }, 100);
    };
    run();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 下载单个部件
  const handleDownloadPart = useCallback((dataUrl: string, label: string) => {
    const link = document.createElement('a');
    link.download = `part-${label}.png`;
    link.href = dataUrl;
    link.click();
  }, []);

  // 下载全部部件（zip不做，逐个下载）
  const handleDownloadAll = useCallback(() => {
    parts.forEach(({ dataUrl, label }) => {
      const link = document.createElement('a');
      link.download = `part-${label}.png`;
      link.href = dataUrl;
      link.click();
    });
  }, [parts]);

  const hasSheet = step !== 'input' || (sheetCanvasRef.current?.width ?? 0) > 0;

  return (
    <div style={s.root}>
      {/* ── 左侧控制面板 ── */}
      <div style={s.panel}>
        <Section label="第一步：上传 Sprite Sheet">
          <button
            style={s.demoBtn}
            onClick={() => {
              const builtinSheet = generateBuiltinSheet();
              loadCanvas(builtinSheet);
              setTimeout(() => { handleChromaKey(); setTimeout(() => { handleSlice(); }, 50); }, 100);
            }}
          >
            加载内置演示
          </button>
          <label style={s.uploadLabel}>
            <input
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleFileUpload}
            />
            <span style={s.uploadBtn}>上传自定义 Sheet</span>
          </label>
          <span style={s.hint}>
            内置演示已自动加载。也可上传自定义 sprite sheet。
          </span>
        </Section>

        <Section label="推荐 Prompt（复制到像素风生成tab）">
          <div
            style={s.promptBox}
            onClick={() => {
              navigator.clipboard.writeText(SHEET_PROMPT).catch(() => undefined);
            }}
            title="点击复制"
          >
            {SHEET_PROMPT}
          </div>
          <span style={s.hint}>点击复制 Prompt</span>
        </Section>

        <Section label={`第二步：抠绿幕 (阈值 ${chromaThreshold})`}>
          <input
            type="range"
            min={20}
            max={150}
            step={5}
            value={chromaThreshold}
            style={s.slider}
            onChange={(e) => setChromaThreshold(Number(e.target.value))}
          />
          <button
            style={{ ...s.actionBtn, ...(hasSheet ? {} : s.actionBtnDisabled) }}
            onClick={handleChromaKey}
            disabled={!hasSheet}
          >
            执行抠图
          </button>
        </Section>

        <Section label={`第三步：切割部件 (最小面积 ${minArea}px)`}>
          <input
            type="range"
            min={50}
            max={2000}
            step={50}
            value={minArea}
            style={s.slider}
            onChange={(e) => setMinArea(Number(e.target.value))}
          />
          <button
            style={{ ...s.actionBtn, ...(step === 'keyed' || step === 'sliced' ? {} : s.actionBtnDisabled) }}
            onClick={handleSlice}
            disabled={step === 'input'}
          >
            自动切割
          </button>
          {step === 'sliced' && (
            <span style={s.hint}>检测到 {partCount} 个部件</span>
          )}
        </Section>

        {parts.length > 0 && (
          <button style={s.dlAllBtn} onClick={handleDownloadAll}>
            下载全部 {parts.length} 个部件
          </button>
        )}
      </div>

      {/* ── 右侧：canvas + 部件预览 ── */}
      <div style={s.rightCol}>
        {/* Sheet 预览 */}
        <div style={s.canvasRow}>
          <div style={s.canvasBlock}>
            <div style={s.canvasLabel}>原始 Sheet</div>
            <div style={s.canvasScroll}>
              <canvas ref={sheetCanvasRef} style={s.canvas} />
              {!hasSheet && (
                <div style={s.emptyCanvas}>上传 Sprite Sheet 后显示</div>
              )}
            </div>
          </div>
          <div style={s.canvasBlock}>
            <div style={s.canvasLabel}>
              抠图 / 切割结果
              {step === 'sliced' && ` — ${partCount} 个部件`}
            </div>
            <div style={s.canvasScroll}>
              <canvas ref={keyedCanvasRef} style={s.canvas} />
              {step === 'input' && (
                <div style={s.emptyCanvas}>执行抠图后显示</div>
              )}
            </div>
          </div>
        </div>

        {/* 部件预览网格 */}
        {parts.length > 0 && (
          <div style={s.partsSection}>
            <div style={s.partsSectionLabel}>切割出的部件</div>
            <div style={s.partsGrid}>
              {parts.map(({ label, dataUrl, rect }) => (
                <div key={label} style={s.partCard}>
                  <img
                    src={dataUrl}
                    alt={label}
                    style={{
                      ...s.partImg,
                      imageRendering: 'pixelated',
                    }}
                  />
                  <div style={s.partLabel}>{label}</div>
                  <div style={s.partSize}>{rect.w}×{rect.h}px</div>
                  <button
                    style={s.dlPartBtn}
                    onClick={() => handleDownloadPart(dataUrl, label)}
                  >
                    下载
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={s.section}>
      <div style={s.sectionLabel}>{label}</div>
      {children}
    </div>
  );
}

const s = {
  root: {
    display: 'flex',
    gap: 16,
    alignItems: 'flex-start',
    overflow: 'auto',
    flex: 1,
    minHeight: 0,
  },
  panel: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 10,
    width: 240,
    flexShrink: 0,
    overflowY: 'auto' as const,
  },
  section: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 8,
    padding: '10px 12px',
    background: 'rgba(10,10,20,0.85)',
    border: '1px solid rgba(80,200,255,0.15)',
    borderRadius: 8,
  },
  sectionLabel: {
    fontSize: 11,
    color: 'rgba(120,180,220,0.6)',
    textTransform: 'capitalize' as const,
    letterSpacing: '0.05em',
  },
  uploadLabel: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 6,
    cursor: 'pointer',
  },
  uploadBtn: {
    display: 'block',
    textAlign: 'center' as const,
    padding: '8px 0',
    fontSize: 13,
    borderRadius: 6,
    background: 'rgba(20,80,180,0.5)',
    border: '1px solid rgba(60,160,255,0.5)',
    color: '#80d0ff',
    cursor: 'pointer',
  },
  demoBtn: {
    padding: '8px 0',
    fontSize: 12,
    fontWeight: 600,
    borderRadius: 6,
    cursor: 'pointer',
    background: 'rgba(60,40,100,0.7)',
    border: '1px solid rgba(140,80,255,0.5)',
    color: '#c0a0ff',
  },
  hint: {
    fontSize: 10,
    color: 'rgba(120,180,220,0.45)',
    lineHeight: 1.5,
  },
  promptBox: {
    fontSize: 10,
    color: 'rgba(160,220,160,0.8)',
    background: 'rgba(0,20,0,0.5)',
    border: '1px solid rgba(40,160,80,0.3)',
    borderRadius: 6,
    padding: '6px 8px',
    lineHeight: 1.5,
    cursor: 'pointer',
    wordBreak: 'break-word' as const,
    userSelect: 'text' as const,
  },
  slider: {
    width: '100%',
    accentColor: '#3af',
  },
  actionBtn: {
    padding: '8px 0',
    fontSize: 12,
    fontWeight: 600,
    borderRadius: 6,
    cursor: 'pointer',
    background: 'rgba(20,100,60,0.7)',
    border: '1px solid rgba(40,200,120,0.5)',
    color: '#60e0a0',
  },
  actionBtnDisabled: {
    opacity: 0.4,
    cursor: 'not-allowed',
  },
  dlAllBtn: {
    padding: '9px 0',
    fontSize: 12,
    borderRadius: 6,
    cursor: 'pointer',
    background: 'rgba(80,30,120,0.6)',
    border: '1px solid rgba(180,80,255,0.4)',
    color: '#c080ff',
  },
  rightCol: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 16,
    flex: 1,
    minWidth: 0,
    overflow: 'auto',
  },
  canvasRow: {
    display: 'flex',
    gap: 16,
    alignItems: 'flex-start',
    flexWrap: 'wrap' as const,
  },
  canvasBlock: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 6,
    flex: 1,
    minWidth: 300,
  },
  canvasLabel: {
    fontSize: 11,
    color: 'rgba(120,180,220,0.6)',
    textTransform: 'capitalize' as const,
    letterSpacing: '0.05em',
  },
  canvasScroll: {
    position: 'relative' as const,
    overflow: 'auto',
    maxWidth: '100%',
    maxHeight: 480,
    border: '1px solid rgba(80,160,240,0.2)',
    borderRadius: 4,
    background: 'rgba(10,10,20,0.6)',
  },
  canvas: {
    display: 'block',
    maxWidth: '100%',
  },
  emptyCanvas: {
    padding: '40px 20px',
    textAlign: 'center' as const,
    color: 'rgba(120,180,220,0.3)',
    fontSize: 12,
  },
  partsSection: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 10,
  },
  partsSectionLabel: {
    fontSize: 11,
    color: 'rgba(120,180,220,0.6)',
    textTransform: 'capitalize' as const,
    letterSpacing: '0.05em',
  },
  partsGrid: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: 10,
  },
  partCard: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: 4,
    padding: '8px',
    background: 'rgba(10,10,20,0.85)',
    border: '1px solid rgba(80,200,255,0.15)',
    borderRadius: 8,
    minWidth: 80,
  },
  partImg: {
    width: 96,
    height: 96,
    objectFit: 'contain' as const,
    imageRendering: 'pixelated' as const,
    background: 'repeating-conic-gradient(#1a1a2e 0% 25%, #12122a 0% 50%) 0 0 / 8px 8px',
    borderRadius: 4,
  },
  partLabel: {
    fontSize: 11,
    color: '#c0d8f0',
    fontWeight: 600,
  },
  partSize: {
    fontSize: 10,
    color: 'rgba(120,180,220,0.5)',
  },
  dlPartBtn: {
    padding: '3px 10px',
    fontSize: 10,
    borderRadius: 4,
    cursor: 'pointer',
    background: 'rgba(30,50,80,0.7)',
    border: '1px solid rgba(80,140,200,0.4)',
    color: '#80a8cc',
  },
} satisfies Record<string, React.CSSProperties>;
