import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Upload, X, Loader2, FileText, ImageIcon } from "lucide-react";
import { toast } from "sonner";

interface FileUploadFieldProps {
  value: string | null;
  onChange: (url: string | null) => void;
  bucket: string;
  accept: string;
  kind: "image" | "pdf" | "document";
  label?: string;
  maxSizeMB?: number;
  buttonLabel?: string;
}

export default function FileUploadField({
  value, onChange, bucket, accept, kind, label, maxSizeMB = 10, buttonLabel,
}: FileUploadFieldProps) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > maxSizeMB * 1024 * 1024) {
      toast.error(`File must be smaller than ${maxSizeMB}MB`);
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from(bucket).upload(fileName, file, { upsert: false });
      if (error) throw error;
      const { data } = supabase.storage.from(bucket).getPublicUrl(fileName);
      onChange(data.publicUrl);
      toast.success(`${kind === "image" ? "Thumbnail" : kind === "pdf" ? "PDF" : "File"} uploaded`);
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const fileName = value ? value.split("/").pop()?.split("?")[0] : null;

  return (
    <div className="space-y-1.5">
      {label && <p className="text-xs font-medium text-muted-foreground">{label}</p>}
      <input ref={inputRef} type="file" accept={accept} onChange={handleUpload} className="hidden" disabled={uploading} />
      {value ? (
        kind === "image" ? (
          <div className="relative group rounded-md overflow-hidden border border-border w-full max-w-[240px]">
            <img src={value} alt="thumbnail" className="w-full aspect-video object-cover" />
            <button
              type="button"
              onClick={() => onChange(null)}
              className="absolute top-1.5 right-1.5 h-6 w-6 rounded-full bg-background/90 backdrop-blur flex items-center justify-center hover:bg-destructive hover:text-destructive-foreground transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="absolute bottom-1.5 right-1.5 px-2 h-6 rounded-md bg-background/90 backdrop-blur text-xs hover:bg-muted"
            >
              Replace
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 p-2 rounded-md border bg-muted/30">
            <FileText className="h-4 w-4 text-primary shrink-0" />
            <a href={value} target="_blank" rel="noreferrer" className="text-xs text-primary truncate flex-1 underline">
              {fileName || "View PDF"}
            </a>
            <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => inputRef.current?.click()}>
              Replace
            </Button>
            <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => onChange(null)}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        )
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="w-full justify-center"
        >
          {uploading ? (
            <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Uploading…</>
          ) : kind === "image" ? (
            <><ImageIcon className="h-3.5 w-3.5 mr-1.5" /> Upload Thumbnail</>
          ) : (
            <><Upload className="h-3.5 w-3.5 mr-1.5" /> {buttonLabel ?? (kind === "pdf" ? "Upload PDF" : "Upload File")}</>
          )}
        </Button>
      )}
    </div>
  );
}
