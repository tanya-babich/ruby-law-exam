import {
  useState,
  useCallback,
  type ReactElement,
  type DragEvent,
  type ChangeEvent,
} from 'react';
import type { ContractAnalysis } from '../types';
import {
  ALLOWED_MIMETYPES,
  ALLOWED_FILE_EXTENSIONS,
  MAX_FILE_SIZE_BYTES,
  FILE_INPUT_ID,
} from '../constants';
import { uploadContract } from '../constants/endpoints';
import { formatFileSize } from '../utils';

interface UploadFormProps {
  loading: boolean;
  onLoadingChange: (loading: boolean) => void;
  onStart: () => void;
  onSuccess: (result: ContractAnalysis, fileName: string) => void;
  onError: (message: string) => void;
}

const MAX_FILE_SIZE_LABEL = formatFileSize(MAX_FILE_SIZE_BYTES);

export function UploadForm({
  loading,
  onLoadingChange,
  onStart,
  onSuccess,
  onError,
}: UploadFormProps): ReactElement {
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);

  const handleFileSelect = useCallback(
    (f: File) => {
      if (!ALLOWED_MIMETYPES.includes(f.type)) {
        onError(`Only ${ALLOWED_FILE_EXTENSIONS} files are accepted`);
        return;
      }
      if (f.size > MAX_FILE_SIZE_BYTES) {
        onError(`File must be under ${MAX_FILE_SIZE_LABEL}`);
        return;
      }
      setFile(f);
    },
    [onError]
  );

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handleFileSelect(f);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFileSelect(f);
  };

  const handleSubmit = async () => {
    if (!file) return;
    onStart();
    onLoadingChange(true);
    const result = await uploadContract(file);
    if (result.ok) {
      onSuccess(result.data, file.name);
      setFile(null);
    } else {
      onError(result.error);
    }
    onLoadingChange(false);
  };

  const zoneClass = [
    'border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all duration-150',
    dragging
      ? 'border-indigo-500 bg-indigo-50 scale-[1.01]'
      : file
        ? 'border-indigo-200 bg-indigo-50/40'
        : 'border-slate-300 bg-slate-50 hover:border-indigo-400 hover:bg-indigo-50/40',
  ].join(' ');

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        aria-label="Upload contract file"
        className={zoneClass}
        onDragOver={e => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => document.getElementById(FILE_INPUT_ID)?.click()}
        onKeyDown={e =>
          e.key === 'Enter' && document.getElementById(FILE_INPUT_ID)?.click()
        }
      >
        <input
          id={FILE_INPUT_ID}
          type="file"
          accept={ALLOWED_FILE_EXTENSIONS}
          className="hidden"
          onChange={handleChange}
        />
        {file ? (
          <div>
            <p className="font-semibold text-slate-800 break-all">
              {file.name}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              {formatFileSize(file.size)}
            </p>
          </div>
        ) : (
          <>
            <p className="font-medium text-slate-700 mb-1">
              Drag &amp; drop a contract here
            </p>
            <p className="text-sm text-slate-400">
              or click to browse — .pdf or .docx, max {MAX_FILE_SIZE_LABEL}
            </p>
          </>
        )}
      </div>

      <button
        className={[
          'mt-4 w-full sm:w-auto px-7 py-2.5 rounded-lg font-semibold text-base text-white transition-colors shadow-sm',
          !file || loading
            ? 'bg-slate-300 cursor-not-allowed shadow-none'
            : 'bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800',
        ].join(' ')}
        onClick={() => {
          void handleSubmit();
        }}
        disabled={!file || loading}
      >
        {loading ? 'Analysing…' : 'Analyse Contract'}
      </button>
    </div>
  );
}
