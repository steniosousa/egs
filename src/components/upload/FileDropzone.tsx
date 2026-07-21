import { DragEvent, useRef, useState } from "react";
import { CheckCircle2, FileText, Loader2, UploadCloud, XCircle } from "lucide-react";
import { cn } from "../../utils/cn";

export type UploadStatus = "idle" | "processing" | "success" | "error";

interface FileMeta {
  name: string;
  size: number;
  date: Date;
}

interface FileDropzoneProps {
  accept?: string;
  label: string;
  hint?: string;
  status?: UploadStatus;
  statusMessage?: string;
  fileMeta?: FileMeta | null;
  onFileSelected: (file: File) => void;
  disabled?: boolean;
  className?: string;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function FileDropzone({
  accept,
  label,
  hint,
  status = "idle",
  statusMessage,
  fileMeta,
  onFileSelected,
  disabled = false,
  className,
}: FileDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    if (disabled) return;
    const file = event.dataTransfer.files?.[0];
    if (file) onFileSelected(file);
  };

  const handleClick = () => {
    if (!disabled) inputRef.current?.click();
  };

  return (
    <div className={className}>
      <div
        onClick={handleClick}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        role="button"
        tabIndex={0}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-6 text-center transition-colors duration-150",
          disabled && "cursor-not-allowed opacity-60",
          isDragging ? "border-brand-500 bg-brand-50" : "border-slate-300 bg-slate-50 hover:border-brand-400 hover:bg-brand-50/40",
          status === "success" && "border-success-300 bg-success-50",
          status === "error" && "border-danger-300 bg-danger-50"
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          hidden
          disabled={disabled}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onFileSelected(file);
            e.target.value = "";
          }}
        />

        {status === "processing" ? (
          <Loader2 className="h-7 w-7 animate-spin text-brand-600" />
        ) : status === "success" ? (
          <CheckCircle2 className="h-7 w-7 text-success-600" />
        ) : status === "error" ? (
          <XCircle className="h-7 w-7 text-danger-600" />
        ) : (
          <UploadCloud className="h-7 w-7 text-slate-400" />
        )}

        <p className="text-sm font-semibold text-slate-700">{label}</p>
        {hint && status === "idle" && <p className="text-xs text-slate-400">{hint}</p>}
        {statusMessage && (
          <p
            className={cn(
              "text-xs font-medium",
              status === "error" ? "text-danger-600" : status === "success" ? "text-success-700" : "text-brand-600"
            )}
          >
            {statusMessage}
          </p>
        )}
      </div>

      {fileMeta && (
        <div className="mt-2 flex items-center gap-2.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-500">
          <FileText className="h-4 w-4 shrink-0 text-slate-400" />
          <span className="truncate font-medium text-slate-700">{fileMeta.name}</span>
          <span className="shrink-0 text-slate-300">•</span>
          <span className="shrink-0">{formatFileSize(fileMeta.size)}</span>
          <span className="shrink-0 text-slate-300">•</span>
          <span className="shrink-0">{fileMeta.date.toLocaleTimeString("pt-BR")}</span>
        </div>
      )}
    </div>
  );
}
