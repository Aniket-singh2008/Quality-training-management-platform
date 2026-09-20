import React, { useState, useRef } from 'react';
import { Agent, PerformanceImportRow, ImportSummary } from '../types';
import {
  extractTextFromPdf,
  parsePerformanceText,
  validateAndMatchPerformanceRows
} from '../utils/pdfPerformanceService';

interface ImportPerformanceCardProps {
  agents: Agent[];
  onConfirmImport: (rows: PerformanceImportRow[]) => void;
  onOpenFullModal?: () => void;
}

export const ImportPerformanceCard: React.FC<ImportPerformanceCardProps> = ({
  agents,
  onConfirmImport,
  onOpenFullModal
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processError, setProcessError] = useState<string | null>(null);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [importRows, setImportRows] = useState<PerformanceImportRow[]>([]);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [filterTab, setFilterTab] = useState<'all' | 'ready' | 'issues'>('all');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setProcessError(null);
      setSuccessMessage(null);
    }
  };

  const handleProcess = async (fileToProcess?: File, textOverride?: string) => {
    setIsProcessing(true);
    setProcessError(null);
    setSuccessMessage(null);

    try {
      let extractedText = '';
      if (textOverride) {
        extractedText = textOverride;
      } else {
        const file = fileToProcess || selectedFile;
        if (!file) {
          throw new Error('Please select a PDF file first.');
        }
        extractedText = await extractTextFromPdf(file);
      }

      if (!extractedText || extractedText.trim().length === 0) {
        throw new Error(
          'No readable text extracted. If this is a scanned/image PDF, OCR processing will be supported in the upcoming backend release.'
        );
      }

      const rawRows = parsePerformanceText(extractedText);
      if (rawRows.length === 0) {
        throw new Error(
          'Could not find tabular performance rows. Required format: Agent ID | Agent Name | Quality Score | Fatal Count | Call Audit Count.'
        );
      }

      const { rows, summary: sum } = validateAndMatchPerformanceRows(rawRows, agents);
      setImportRows(rows);
      setSummary(sum);
      setIsPreviewMode(true);
    } catch (err: any) {
      console.error(err);
      setProcessError(err?.message || 'Error parsing PDF report.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancel = () => {
    setIsPreviewMode(false);
    setSelectedFile(null);
    setImportRows([]);
    setSummary(null);
    setProcessError(null);
  };

  const handleConfirm = () => {
    if (!summary || summary.recordsReadyToImport === 0) return;
    onConfirmImport(importRows);
    setSuccessMessage(`Performance data imported successfully. ${summary.recordsReadyToImport} agent records updated.`);
    setIsPreviewMode(false);
    setSelectedFile(null);
    setImportRows([]);
    setSummary(null);
  };

  const filteredRows = importRows.filter((r) => {
    if (filterTab === 'ready') return r.status === 'Ready to Update';
    if (filterTab === 'issues') return r.status !== 'Ready to Update';
    return true;
  });

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-sm relative overflow-hidden space-y-6">
      {/* Glow decorative highlight */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50/50 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/20">
              <span className="material-symbols-outlined text-[22px]">upload_file</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                  Import Performance Data
                </h2>
                <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold border border-indigo-200">
                  PDF Importer
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Upload a performance report PDF to update agent Quality Score, Fatal Count and Call Audit Count.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {onOpenFullModal && (
            <button
              type="button"
              onClick={onOpenFullModal}
              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">open_in_full</span>
              <span>Full Screen</span>
            </button>
          )}
        </div>
      </div>

      {/* Success Notification Banner */}
      {successMessage && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs sm:text-sm flex items-center justify-between gap-3 animate-in fade-in duration-300">
          <div className="flex items-center gap-2.5">
            <span className="material-symbols-outlined text-emerald-600 text-[22px]">
              check_circle
            </span>
            <div>
              <span className="font-bold">{successMessage}</span>
              <span className="block text-[11px] text-emerald-700 mt-0.5">
                Quality Score Leaderboard automatically refreshed with newly calibrated rankings.
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSuccessMessage(null)}
            className="p-1 text-emerald-700 hover:text-emerald-900 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>
      )}

      {/* Error Callout */}
      {processError && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm flex items-start gap-2.5">
          <span className="material-symbols-outlined text-rose-600 text-[20px] flex-shrink-0 mt-0.5">
            error
          </span>
          <div>
            <span className="font-bold">Error: </span>
            <span>{processError}</span>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* MODE A: UPLOAD STEP                                                 */}
      {/* ------------------------------------------------------------------- */}
      {!isPreviewMode ? (
        <div className="space-y-4">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".pdf,.txt,.csv"
            className="hidden"
          />

          <div className="flex flex-col sm:flex-row items-center gap-4 p-5 rounded-2xl bg-slate-50 border border-slate-200/80">
            <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center flex-shrink-0">
              <span className="material-symbols-outlined text-[26px]">description</span>
            </div>

            <div className="flex-1 text-center sm:text-left">
              {selectedFile ? (
                <div>
                  <div className="text-sm font-bold text-slate-800 flex items-center justify-center sm:justify-start gap-2">
                    <span className="material-symbols-outlined text-emerald-600 text-[18px]">
                      check_circle
                    </span>
                    <span>{selectedFile.name}</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {(selectedFile.size / 1024).toFixed(1)} KB • Ready for preview extraction
                  </p>
                </div>
              ) : (
                <div>
                  <div className="text-sm font-bold text-slate-800">
                    Select a performance report PDF from your computer
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Expected columns: Agent ID | Agent Name | Quality Score | Fatal Count | Call Audit Count
                  </p>
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto justify-center sm:justify-end">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 rounded-xl bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px] text-indigo-600">
                  attach_file
                </span>
                <span>{selectedFile ? 'Change PDF' : 'Upload PDF'}</span>
              </button>

              {selectedFile && (
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={() => handleProcess()}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white text-xs font-bold shadow-md shadow-indigo-500/20 hover:from-blue-700 hover:to-purple-700 transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  {isProcessing ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Reading PDF...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[18px]">preview</span>
                      <span>Preview Import</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* ------------------------------------------------------------------- */
        /* MODE B: PREVIEW & CONFIRM STEP                                      */
        /* ------------------------------------------------------------------- */
        summary && (
          <div className="space-y-5 animate-in fade-in duration-200">
            {/* Summary metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-slate-800">
                <div className="text-[10px] font-bold text-slate-400 uppercase">Total Found</div>
                <div className="text-lg font-black mt-0.5">{summary.totalRecordsFound}</div>
              </div>

              <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900">
                <div className="text-[10px] font-bold text-emerald-700 uppercase">Ready</div>
                <div className="text-lg font-black mt-0.5">{summary.recordsReadyToImport}</div>
              </div>

              <div className="p-3 rounded-2xl bg-blue-50 border border-blue-200 text-blue-900">
                <div className="text-[10px] font-bold text-blue-700 uppercase">Matched</div>
                <div className="text-lg font-black mt-0.5">{summary.successfullyMatchedAgents}</div>
              </div>

              <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900">
                <div className="text-[10px] font-bold text-amber-700 uppercase">Unmatched</div>
                <div className="text-lg font-black mt-0.5">{summary.unmatchedAgents}</div>
              </div>

              <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 col-span-2 sm:col-span-1">
                <div className="text-[10px] font-bold text-rose-700 uppercase">Errors</div>
                <div className="text-lg font-black mt-0.5">{summary.recordsWithErrors}</div>
              </div>
            </div>

            {/* Filter pills */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
                <button
                  type="button"
                  onClick={() => setFilterTab('all')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    filterTab === 'all'
                      ? 'bg-white text-indigo-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  All ({importRows.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterTab('ready')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    filterTab === 'ready'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Ready ({summary.recordsReadyToImport})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterTab('issues')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    filterTab === 'issues'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Unmatched / Errors ({summary.unmatchedAgents + summary.recordsWithErrors})
                </button>
              </div>

              <span className="text-xs text-slate-500 font-medium">
                Showing {filteredRows.length} rows
              </span>
            </div>

            {/* PREVIEW TABLE */}
            <div className="overflow-hidden rounded-2xl border border-slate-200/80">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      <th className="py-2.5 px-3.5">Agent ID</th>
                      <th className="py-2.5 px-3.5">Agent Name</th>
                      <th className="py-2.5 px-3.5 text-center">Quality Score</th>
                      <th className="py-2.5 px-3.5 text-center">Fatal Count</th>
                      <th className="py-2.5 px-3.5 text-center">Call Audit Count</th>
                      <th className="py-2.5 px-3.5 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {filteredRows.map((row) => (
                      <tr
                        key={row.id}
                        className={
                          row.status === 'Ready to Update'
                            ? 'hover:bg-emerald-50/20'
                            : row.status === 'Agent Not Found'
                            ? 'bg-amber-50/30'
                            : 'bg-rose-50/30'
                        }
                      >
                        <td className="py-2.5 px-3.5 font-bold font-mono text-slate-800">
                          {row.agentId}
                        </td>
                        <td className="py-2.5 px-3.5 font-medium text-slate-800">
                          {row.matchedAgentName || row.agentName || '—'}
                        </td>
                        <td className="py-2.5 px-3.5 text-center font-bold">
                          {row.qualityScore !== undefined ? (
                            <span>{row.qualityScore}%</span>
                          ) : (
                            <span className="text-slate-400 italic">Retained</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3.5 text-center font-bold">
                          {row.fatalCount !== undefined ? (
                            <span className={row.fatalCount === 0 ? 'text-emerald-700' : 'text-rose-700'}>
                              {row.fatalCount}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic">Retained</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3.5 text-center font-bold">
                          {row.callAuditCount !== undefined ? (
                            <span>{row.callAuditCount}</span>
                          ) : (
                            <span className="text-slate-400 italic">Retained</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3.5 text-right">
                          {row.status === 'Ready to Update' ? (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold">
                              Ready to Update
                            </span>
                          ) : row.status === 'Agent Not Found' ? (
                            <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[11px] font-bold">
                              Agent Not Found
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[11px] font-bold">
                              {row.status}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Actions: [ Cancel ] [ Confirm Import ] */}
            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={handleCancel}
                className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-bold transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={summary.recordsReadyToImport === 0}
                onClick={handleConfirm}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold shadow-md shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">done_all</span>
                <span>Confirm Import ({summary.recordsReadyToImport})</span>
              </button>
            </div>
          </div>
        )
      )}
    </div>
  );
};
