import { useState, type ReactElement } from 'react';
import { UploadForm } from '../components/UploadForm';
import { AnalysisResults } from '../components/AnalysisResults';
import type { ContractAnalysis } from '../types';

export function ContractUploadPage(): ReactElement {
  const [result, setResult] = useState<ContractAnalysis | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('Uploading…');

  const handleStart = () => {
    setResult(null);
    setFileName(null);
    setError(null);
    setStatus('Uploading…');
  };

  const handleSuccess = (data: ContractAnalysis, name: string) => {
    setError(null);
    setResult(data);
    setFileName(name);
  };

  const handleError = (message: string) => {
    setResult(null);
    setFileName(null);
    setError(message);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-white to-indigo-50 py-10 px-4">
      <main className="max-w-4xl mx-auto">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 tracking-tight mb-2">
          Contract Analysis
        </h1>
        <p className="text-slate-500 mb-8">
          Upload a PDF or DOCX contract to identify risks, missing clauses, and get recommendations.
        </p>

        <div className="bg-white rounded-2xl shadow-lg shadow-slate-200/60 ring-1 ring-slate-100 p-6 sm:p-8">
          <UploadForm
            loading={loading}
            onLoadingChange={setLoading}
            onStart={handleStart}
            onStatus={setStatus}
            onSuccess={handleSuccess}
            onError={handleError}
          />

          {loading && (
            <div className="mt-5 flex items-center gap-3 px-4 py-3 bg-indigo-50 border border-indigo-200 rounded-xl text-indigo-700 text-sm font-medium">
              <span className="h-4 w-4 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin" />
              {status}
            </div>
          )}

          {!loading && error && (
            <div className="mt-5 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm font-medium">
              {error}
            </div>
          )}

          {!loading && result && fileName && <AnalysisResults result={result} fileName={fileName} />}
        </div>
      </main>
    </div>
  );
}
