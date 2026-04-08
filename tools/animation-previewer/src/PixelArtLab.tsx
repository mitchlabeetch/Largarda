import { useCallback, useEffect, useRef, useState } from 'react';

// ─── 调色板量化 ─────────────────────────────────────────────────────────────
// 中位切割算法简化版：把颜色空间分桶，取桶均值

type RGB = [number, number, number];

function buildPalette(imageData: ImageData, maxColors: number): RGB[] {
  const { data } = imageData;
  const colorMap = new Map<number, number>();

  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3];
    if (a < 128) continue; // 跳过透明像素
    // 量化到6位精度（每通道64级），减少颜色空间
    const r = data[i] & 0xfc;
    const g = data[i + 1] & 0xfc;
    const b = data[i + 2] & 0xfc;
    const key = (r << 16) | (g << 8) | b;
    colorMap.set(key, (colorMap.get(key) ?? 0) + 1);
  }

  // 按出现频次降序，取前 maxColors 个
  const sorted = [...colorMap.entries()].sort((a, b) => b[1] - a[1]);
  return sorted.slice(0, maxColors).map(([key]) => [
    (key >> 16) & 0xff,
    (key >> 8) & 0xff,
    key & 0xff,
  ]);
}

function nearestColor(r: number, g: number, b: number, palette: RGB[]): RGB {
  let best = palette[0];
  let bestDist = Infinity;
  for (const c of palette) {
    const dr = r - c[0];
    const dg = g - c[1];
    const db = b - c[2];
    const d = dr * dr + dg * dg + db * db;
    if (d < bestDist) { bestDist = d; best = c; }
  }
  return best;
}

function quantize(imageData: ImageData, palette: RGB[]): ImageData {
  const out = new ImageData(imageData.width, imageData.height);
  const { data } = imageData;
  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3];
    if (a < 128) {
      out.data[i + 3] = 0;
      continue;
    }
    const [r, g, b] = nearestColor(data[i], data[i + 1], data[i + 2], palette);
    out.data[i] = r;
    out.data[i + 1] = g;
    out.data[i + 2] = b;
    out.data[i + 3] = 255;
  }
  return out;
}

// ─── 像素化主流程 ─────────────────────────────────────────────────────────────
function pixelate(
  src: HTMLImageElement | HTMLCanvasElement,
  targetSize: number,
  maxColors: number,
): HTMLCanvasElement {
  // Step1: 缩小到 targetSize（最近邻）
  const smallCanvas = document.createElement('canvas');
  smallCanvas.width = targetSize;
  smallCanvas.height = targetSize;
  const smallCtx = smallCanvas.getContext('2d')!;
  smallCtx.imageSmoothingEnabled = false;
  smallCtx.drawImage(src, 0, 0, targetSize, targetSize);

  // Step2: 量化调色板
  const smallData = smallCtx.getImageData(0, 0, targetSize, targetSize);
  const palette = buildPalette(smallData, maxColors);
  const quantizedData = quantize(smallData, palette);
  smallCtx.putImageData(quantizedData, 0, 0);

  return smallCanvas;
}

// ─── 组件 ─────────────────────────────────────────────────────────────────────
type ApiMode = 'upload' | 'fal' | 'dalle';
type Status = 'idle' | 'generating' | 'processing' | 'done' | 'error';

const DISPLAY_SIZE = 512; // 显示尺寸（px）
const PIXEL_SIZES = [16, 32, 48, 64] as const;
const PALETTE_SIZES = [8, 16, 32] as const;

export default function PixelArtLab() {
  const [apiMode, setApiMode] = useState<ApiMode>('upload');
  const [apiKey, setApiKey] = useState('');
  const [prompt, setPrompt] = useState(
    'cozy pixel art programmer sitting at desk, warm colors, side view, simple flat shading',
  );
  const [pixelSize, setPixelSize] = useState<(typeof PIXEL_SIZES)[number]>(48);
  const [paletteSize, setPaletteSize] = useState<(typeof PALETTE_SIZES)[number]>(16);
  const [status, setStatus] = useState<Status>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const originalCanvasRef = useRef<HTMLCanvasElement>(null);
  const pixelCanvasRef = useRef<HTMLCanvasElement>(null);
  const [hasOriginal, setHasOriginal] = useState(false);

  // 把图片画到 original canvas
  const drawOriginal = useCallback((img: HTMLImageElement) => {
    const canvas = originalCanvasRef.current;
    if (!canvas) return;
    canvas.width = DISPLAY_SIZE;
    canvas.height = DISPLAY_SIZE;
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(img, 0, 0, DISPLAY_SIZE, DISPLAY_SIZE);
    setHasOriginal(true);
  }, []);

  // 对当前 original canvas 执行像素化
  const runPixelate = useCallback(() => {
    const srcCanvas = originalCanvasRef.current;
    const dstCanvas = pixelCanvasRef.current;
    if (!srcCanvas || !dstCanvas || !hasOriginal) return;

    setStatus('processing');
    const smallCanvas = pixelate(srcCanvas, pixelSize, paletteSize);

    dstCanvas.width = DISPLAY_SIZE;
    dstCanvas.height = DISPLAY_SIZE;
    const ctx = dstCanvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(smallCanvas, 0, 0, DISPLAY_SIZE, DISPLAY_SIZE);
    setStatus('done');
  }, [hasOriginal, pixelSize, paletteSize]);

  // 参数改变时自动重新像素化
  useEffect(() => {
    if (hasOriginal) runPixelate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pixelSize, paletteSize, hasOriginal]);

  // ── 上传模式 ──
  const handleFileUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.addEventListener('load', () => {
        drawOriginal(img);
        URL.revokeObjectURL(url);
      });
      img.src = url;
    },
    [drawOriginal],
  );

  // ── AI 生成模式 ──
  const handleGenerate = useCallback(async () => {
    if (!prompt.trim()) return;
    setStatus('generating');
    setErrorMsg('');

    try {
      let imageUrl = '';

      if (apiMode === 'fal') {
        // fal.ai fast-sdxl
        const res = await fetch('https://fal.run/fal-ai/fast-sdxl', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Key ${apiKey}`,
          },
          body: JSON.stringify({
            prompt,
            image_size: 'square_hd',
            num_inference_steps: 25,
          }),
        });
        if (!res.ok) throw new Error(`fal.ai error: ${res.status} ${await res.text()}`);
        const json = await res.json();
        imageUrl = json.images?.[0]?.url ?? '';
      } else if (apiMode === 'dalle') {
        // OpenAI DALL-E 3
        const res = await fetch('https://api.openai.com/v1/images/generations', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: 'dall-e-3',
            prompt,
            size: '1024x1024',
            response_format: 'url',
            n: 1,
          }),
        });
        if (!res.ok) throw new Error(`OpenAI error: ${res.status} ${await res.text()}`);
        const json = await res.json();
        imageUrl = json.data?.[0]?.url ?? '';
      }

      if (!imageUrl) throw new Error('未获取到图片URL');

      // 通过 Image 加载（跨域图片需要 crossOrigin）
      const img = new Image();
      img.crossOrigin = 'anonymous';
      await new Promise<void>((resolve, reject) => {
        img.addEventListener('load', () => resolve());
        img.addEventListener('error', () => reject(new Error('图片加载失败')));
        img.src = imageUrl;
      });

      drawOriginal(img);
      // drawOriginal 触发 hasOriginal → useEffect → runPixelate
    } catch (err) {
      setStatus('error');
      setErrorMsg(err instanceof Error ? err.message : String(err));
    }
  }, [apiMode, apiKey, prompt, drawOriginal]);

  // ── 下载像素图 ──
  const handleDownload = useCallback(() => {
    const canvas = pixelCanvasRef.current;
    if (!canvas) return;
    // 下载原始像素尺寸（小图）
    const small = pixelate(originalCanvasRef.current!, pixelSize, paletteSize);
    const link = document.createElement('a');
    link.download = `pixel-art-${pixelSize}x${pixelSize}-${paletteSize}colors.png`;
    link.href = small.toDataURL('image/png');
    link.click();
  }, [pixelSize, paletteSize]);

  return (
    <div style={s.root}>
      {/* ── 左侧：控制面板 ── */}
      <div style={s.panel}>
        <Section label="输入模式">
          <div style={s.modeRow}>
            {(['upload', 'fal', 'dalle'] as ApiMode[]).map((m) => (
              <button
                key={m}
                style={{ ...s.modeBtn, ...(apiMode === m ? s.modeBtnActive : {}) }}
                onClick={() => setApiMode(m)}
              >
                {m === 'upload' ? '上传图片' : m === 'fal' ? 'fal.ai' : 'DALL-E 3'}
              </button>
            ))}
          </div>
        </Section>

        {apiMode === 'upload' ? (
          <Section label="上传图片">
            <label style={s.uploadLabel}>
              <input
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleFileUpload}
              />
              <span style={s.uploadBtn}>选择文件</span>
              <span style={s.uploadHint}>PNG / JPG / WebP，任意尺寸</span>
            </label>
          </Section>
        ) : (
          <>
            <Section label="API Key">
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={apiMode === 'fal' ? 'fal_xxxx...' : 'sk-...'}
                style={s.input}
              />
              <span style={s.hint}>
                {apiMode === 'fal'
                  ? '在 fal.ai → API Keys 创建'
                  : '在 platform.openai.com/api-keys 创建'}
              </span>
            </Section>
            <Section label="描述词 Prompt">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={4}
                style={s.textarea}
              />
            </Section>
            <button
              style={{ ...s.genBtn, ...(status === 'generating' ? s.genBtnDisabled : {}) }}
              onClick={handleGenerate}
              disabled={status === 'generating' || !apiKey.trim()}
            >
              {status === 'generating' ? '生成中...' : '生成图片'}
            </button>
          </>
        )}

        <Section label={`像素格大小: ${pixelSize}×${pixelSize}`}>
          <div style={s.chipRow}>
            {PIXEL_SIZES.map((sz) => (
              <button
                key={sz}
                style={{ ...s.chip, ...(pixelSize === sz ? s.chipActive : {}) }}
                onClick={() => setPixelSize(sz)}
              >
                {sz}px
              </button>
            ))}
          </div>
        </Section>

        <Section label={`调色板颜色数: ${paletteSize}`}>
          <div style={s.chipRow}>
            {PALETTE_SIZES.map((sz) => (
              <button
                key={sz}
                style={{ ...s.chip, ...(paletteSize === sz ? s.chipActive : {}) }}
                onClick={() => setPaletteSize(sz)}
              >
                {sz}色
              </button>
            ))}
          </div>
        </Section>

        {hasOriginal && (
          <button style={s.dlBtn} onClick={handleDownload}>
            下载像素图 ({pixelSize}×{pixelSize} PNG)
          </button>
        )}

        {status === 'error' && (
          <div style={s.error}>{errorMsg}</div>
        )}
      </div>

      {/* ── 右侧：对比画面 ── */}
      <div style={s.canvasArea}>
        <div style={s.canvasBlock}>
          <div style={s.canvasLabel}>原图</div>
          <div style={s.canvasWrap}>
            <canvas
              ref={originalCanvasRef}
              width={DISPLAY_SIZE}
              height={DISPLAY_SIZE}
              style={s.canvas}
            />
            {!hasOriginal && <Placeholder text="上传图片或生成后显示原图" />}
          </div>
        </div>

        <div style={s.canvasBlock}>
          <div style={s.canvasLabel}>
            像素化 ({pixelSize}×{pixelSize} / {paletteSize}色)
            {status === 'processing' && <span style={s.processing}> 处理中...</span>}
          </div>
          <div style={s.canvasWrap}>
            <canvas
              ref={pixelCanvasRef}
              width={DISPLAY_SIZE}
              height={DISPLAY_SIZE}
              style={{ ...s.canvas, imageRendering: 'pixelated' }}
            />
            {!hasOriginal && <Placeholder text="像素化结果将显示在这里" />}
          </div>
        </div>
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

function Placeholder({ text }: { text: string }) {
  return (
    <div style={s.placeholder}>
      <span style={{ color: 'rgba(120,180,220,0.4)', fontSize: 12 }}>{text}</span>
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
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
  },
  modeRow: { display: 'flex', gap: 6 },
  modeBtn: {
    flex: 1,
    padding: '5px 6px',
    fontSize: 11,
    borderRadius: 6,
    cursor: 'pointer',
    background: 'rgba(30,50,80,0.5)',
    border: '1px solid rgba(80,140,200,0.3)',
    color: '#80a8cc',
  },
  modeBtnActive: {
    background: 'rgba(20,80,180,0.6)',
    borderColor: 'rgba(60,160,255,0.7)',
    color: '#80d0ff',
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
  uploadHint: {
    fontSize: 10,
    color: 'rgba(120,180,220,0.5)',
    textAlign: 'center' as const,
  },
  input: {
    width: '100%',
    padding: '6px 8px',
    fontSize: 12,
    borderRadius: 6,
    background: 'rgba(10,20,40,0.8)',
    border: '1px solid rgba(80,140,200,0.3)',
    color: '#c0d8f0',
    outline: 'none',
    boxSizing: 'border-box' as const,
  },
  hint: {
    fontSize: 10,
    color: 'rgba(120,180,220,0.45)',
    lineHeight: 1.4,
  },
  textarea: {
    width: '100%',
    padding: '6px 8px',
    fontSize: 11,
    borderRadius: 6,
    background: 'rgba(10,20,40,0.8)',
    border: '1px solid rgba(80,140,200,0.3)',
    color: '#c0d8f0',
    resize: 'vertical' as const,
    outline: 'none',
    fontFamily: 'system-ui, sans-serif',
    lineHeight: 1.5,
    boxSizing: 'border-box' as const,
  },
  genBtn: {
    padding: '9px 0',
    fontSize: 13,
    fontWeight: 600,
    borderRadius: 6,
    cursor: 'pointer',
    background: 'rgba(20,100,60,0.7)',
    border: '1px solid rgba(40,200,120,0.5)',
    color: '#60e0a0',
    transition: 'all 0.15s',
  },
  genBtnDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
  chipRow: { display: 'flex', gap: 6, flexWrap: 'wrap' as const },
  chip: {
    padding: '4px 10px',
    fontSize: 11,
    borderRadius: 20,
    cursor: 'pointer',
    background: 'rgba(30,50,80,0.5)',
    border: '1px solid rgba(80,140,200,0.3)',
    color: '#80a8cc',
  },
  chipActive: {
    background: 'rgba(20,80,180,0.6)',
    borderColor: 'rgba(60,160,255,0.7)',
    color: '#80d0ff',
  },
  dlBtn: {
    padding: '9px 0',
    fontSize: 12,
    borderRadius: 6,
    cursor: 'pointer',
    background: 'rgba(80,30,120,0.6)',
    border: '1px solid rgba(180,80,255,0.4)',
    color: '#c080ff',
  },
  error: {
    padding: '8px 10px',
    fontSize: 11,
    borderRadius: 6,
    background: 'rgba(80,0,0,0.5)',
    border: '1px solid rgba(255,80,80,0.3)',
    color: '#ff9090',
    wordBreak: 'break-all' as const,
  },
  canvasArea: {
    display: 'flex',
    gap: 16,
    flex: 1,
    flexWrap: 'wrap' as const,
    alignItems: 'flex-start',
  },
  canvasBlock: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 8,
  },
  canvasWrap: {
    position: 'relative' as const,
    width: DISPLAY_SIZE,
    height: DISPLAY_SIZE,
  },
  canvasLabel: {
    fontSize: 11,
    color: 'rgba(120,180,220,0.6)',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
  },
  canvas: {
    width: DISPLAY_SIZE,
    height: DISPLAY_SIZE,
    border: '1px solid rgba(80,160,240,0.2)',
    borderRadius: 4,
    background: 'rgba(10,10,20,0.6)',
    display: 'block',
  },
  placeholder: {
    position: 'absolute' as const,
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none' as const,
  },
  processing: {
    color: '#60e0a0',
    fontSize: 10,
  },
} satisfies Record<string, React.CSSProperties>;
