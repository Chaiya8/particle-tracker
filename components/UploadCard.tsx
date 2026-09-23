type UploadCardProps = {
  title: string;
  subtitle: string;
  accept: string;
  onChange: (files: File[]) => void;
  folder?: boolean;
};

export default function UploadCard({
  title,
  subtitle,
  accept,
  onChange,
  folder = false,
}: UploadCardProps) {
  return (
    <label className="border border-zinc-700 rounded-xl p-5 flex gap-4 cursor-pointer hover:border-zinc-500">
      <input
        hidden
        type="file"
        accept={accept}
        multiple={folder}
        onChange={(e) => {
          const files = Array.from(e.target.files || []);
          onChange(files);
        }}
      />

      <div className="w-10 h-10 rounded-lg bg-zinc-800" />

      <div>
        <h3 className="font-medium">{title}</h3>
        <p className="text-sm text-zinc-400">{subtitle}</p>
      </div>
    </label>
  );
}