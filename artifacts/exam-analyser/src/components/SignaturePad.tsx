import { useRef, useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Trash2, Upload, PenLine } from "lucide-react";

interface SignaturePadProps {
  value?: string | null;          // existing base64 PNG data-URL
  onChange: (dataUrl: string | null) => void;
  height?: number;
}

/** Blue-ink canvas signature pad with upload-from-image fallback */
export function SignaturePad({ value, onChange, height = 130 }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [tab, setTab] = useState<"draw" | "upload">("draw");
  const [drawing, setDrawing] = useState(false);
  const [hasDrawing, setHasDrawing] = useState(false);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);

  // Restore existing signature onto the canvas when switching to draw tab
  useEffect(() => {
    if (tab !== "draw") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (value) {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      img.src = value;
      setHasDrawing(true);
    } else {
      setHasDrawing(false);
    }
  }, [tab, value]);

  const getPos = (e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if ("touches" in e) {
      const t = e.touches[0];
      return { x: (t.clientX - rect.left) * scaleX, y: (t.clientY - rect.top) * scaleY };
    }
    return { x: ((e as React.MouseEvent).clientX - rect.left) * scaleX, y: ((e as React.MouseEvent).clientY - rect.top) * scaleY };
  };

  const startDraw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    setDrawing(true);
    lastPoint.current = getPos(e, canvas);
  }, []);

  const draw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!drawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const pos = getPos(e, canvas);
    if (lastPoint.current) {
      ctx.beginPath();
      ctx.moveTo(lastPoint.current.x, lastPoint.current.y);
      ctx.lineTo(pos.x, pos.y);
      ctx.strokeStyle = "#1a56db"; // handwritten-blue
      ctx.lineWidth = 2.2;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.stroke();
    }
    lastPoint.current = pos;
    setHasDrawing(true);
  }, [drawing]);

  const endDraw = useCallback(() => {
    setDrawing(false);
    lastPoint.current = null;
    // Commit drawn signature to parent
    const canvas = canvasRef.current;
    if (canvas && hasDrawing) {
      onChange(canvas.toDataURL("image/png"));
    }
  }, [hasDrawing, onChange]);

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
    }
    setHasDrawing(false);
    onChange(null);
  };

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      // Draw the uploaded image into the canvas for a consistent preview
      const img = new Image();
      img.onload = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        // Scale to fit, centred
        const scale = Math.min(canvas.width / img.width, canvas.height / img.height);
        const dx = (canvas.width - img.width * scale) / 2;
        const dy = (canvas.height - img.height * scale) / 2;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, dx, dy, img.width * scale, img.height * scale);
        setHasDrawing(true);
        onChange(canvas.toDataURL("image/png"));
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  return (
    <div className="space-y-2">
      {/* Tab switcher */}
      <div className="flex gap-1 border rounded-md p-0.5 w-fit">
        <button
          type="button"
          onClick={() => setTab("draw")}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded transition-colors ${
            tab === "draw" ? "bg-primary text-white" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <PenLine className="w-3.5 h-3.5" /> Draw
        </button>
        <button
          type="button"
          onClick={() => setTab("upload")}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded transition-colors ${
            tab === "upload" ? "bg-primary text-white" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Upload className="w-3.5 h-3.5" /> Upload
        </button>
      </div>

      {tab === "draw" ? (
        <div className="relative border-2 border-dashed border-slate-300 rounded-lg bg-white touch-none overflow-hidden"
             style={{ height }}>
          {!hasDrawing && !value && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <span className="text-xs text-slate-400">Sign here with mouse or touch</span>
            </div>
          )}
          <canvas
            ref={canvasRef}
            width={700}
            height={height * (700 / 500)}
            className="w-full h-full cursor-crosshair"
            onMouseDown={startDraw}
            onMouseMove={draw}
            onMouseUp={endDraw}
            onMouseLeave={endDraw}
            onTouchStart={startDraw}
            onTouchMove={draw}
            onTouchEnd={endDraw}
          />
        </div>
      ) : (
        <div
          className="border-2 border-dashed border-slate-300 rounded-lg bg-white flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-primary transition-colors"
          style={{ height }}
          onClick={() => document.getElementById("sig-upload-input")?.click()}
        >
          {value ? (
            <img src={value} alt="Signature preview" className="max-h-full max-w-full object-contain p-2" />
          ) : (
            <>
              <Upload className="w-6 h-6 text-slate-400" />
              <span className="text-xs text-slate-500">Click to upload a photo of your signature</span>
              <span className="text-xs text-slate-400">JPG, PNG — will be stored as PNG</span>
            </>
          )}
          <input
            id="sig-upload-input"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleUpload}
          />
        </div>
      )}

      {(value || hasDrawing) && (
        <Button type="button" variant="ghost" size="sm" onClick={handleClear}
          className="text-xs text-destructive hover:text-destructive gap-1.5">
          <Trash2 className="w-3.5 h-3.5" /> Clear signature
        </Button>
      )}
    </div>
  );
}
