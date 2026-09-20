import React, { useState, useRef } from 'react';
import { Agent, PerformanceImportRow, ImportSummary } from '../types';
import {
  extractTextFromPdf,
  parsePerformanceText,
  validateAndMatchPerformanceRows
} from '../utils/pdfPerformanceService';

interface ImportPerformanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  agents: Agent[];
  onConfirmImport: (rows: PerformanceImportRow[]) => void;
  onViewLeaderboard?: () => void;
}

export const ImportPerformanceModal: React.FC<ImportPerformanceModalProps> = ({
  isOpen,
  onClose,
  agents,
  onConfirmImport,
  onViewLeaderboard
}) => {
  const [step, setStep] = useState<'upload' | 'preview' | 'success'>('upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processError, setProcessError] = useState<string | null>(null);
  
  // Validation state
  const [importRows, setImportRows] = useState<PerformanceImportRow[]>([]);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [filterTab, setFilterTab] = useState<'all' | 'ready' | 'issues'>('all');
  const [importedCount, setImportedCount] = useState<number>(0);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Handle PDF or Report File Upload
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setProcessError(null);
    }
  };

  // Drag & drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      if (
        file.type === 'application/pdf' ||
        file.name.endsWith('.pdf') ||
        file.name.endsWith('.txt') ||
        file.name.endsWith('.csv')
      ) {
        setSelectedFile(file);
        setProcessError(null);
      } else {
        setProcessError('Please upload a PDF document (.pdf) containing agent performance data.');
      }
    }
  };

  // STEP 1 -> STEP 2: Process PDF and Generate Preview
  const handleProcessPdf = async (fileToProcess?: File, rawTextOverride?: string) => {
    setIsProcessing(true);
    setProcessError(null);

    try {
      let extractedText = '';

      if (rawTextOverride) {
        extractedText = rawTextOverride;
      } else {
        const file = fileToProcess || selectedFile;
        if (!file) {
          throw new Error('Please select a PDF file to upload.');
        }
        extractedText = await extractTextFromPdf(file);
      }

      if (!extractedText || extractedText.trim().length === 0) {
        throw new Error(
          'No readable text could be extracted from this PDF. If this is a scanned/image PDF, OCR processing will be supported in the upcoming backend release.'
        );
      }

      // Parse text into rows
      const rawRows = parsePerformanceText(extractedText);
      if (rawRows.length === 0) {
        throw new Error(
          'Could not detect valid performance records in the PDF. Please ensure the document includes columns: Agent ID | Agent Name | Quality Score | Fatal Count | Call Audit Count.'
        );
      }

      // Match against existing agents and validate
      const validationResult = validateAndMatchPerformanceRows(rawRows, agents);
      setImportRows(validationResult.rows);
      setSummary(validationResult.summary);
      setStep('preview');
    } catch (err: any) {
      console.error('[ProcessHub PDF Import Error]', err);
      setProcessError(err?.message || 'Failed to process PDF report. Please check file format.');
    } finally {
      setIsProcessing(false);
    }
  };

  // STEP 2 -> STEP 3: Confirm Import
  const handleConfirmImport = () => {
    const readyCount = summary?.recordsReadyToImport ?? 0;
    if (readyCount === 0) return;

    // Apply import to parent state (never touch unmatched or invalid rows)
    onConfirmImport(importRows);
    setImportedCount(readyCount);
    setStep('success');
  };

  // Reset or cancel
  const handleReset = () => {
    setSelectedFile(null);
    setImportRows([]);
    setSummary(null);
    setProcessError(null);
    setStep('upload');
  };

  const filteredRows = importRows.filter((r) => {
    if (filterTab === 'ready') return r.status === 'Ready to Update';
    if (filterTab === 'issues') return r.status !== 'Ready to Update';
    return true;
  });

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5"
      role="dialog"
      aria-modal="true"
      id="import-performance-modal"
    >
      <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-slate-200/80 overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200">
        {/* ========================================================================= */}
        {/* MODAL HEADER                                                              */}
        {/* ========================================================================= */}
        <div className="px-6 py-5 bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-800 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-xs">
              <span className="material-symbols-outlined text-[24px]">upload_file</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white">
                  Import Performance Data
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-md text-[10px] font-extrabold uppercase tracking-wider text-blue-100 border border-white/20">
                  Admin Tool
                </span>
              </div>
              <p className="text-xs text-blue-100/90 mt-0.5 font-normal">
                Upload a performance report PDF to update agent Quality Score, Fatal Count and Call Audit Count.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Close dialog"
          >
            <span className="material-symbols-outlined text-[22px]">close</span>
          </button>
        </div>

        {/* ========================================================================= */}
        {/* WORKFLOW STEPPER INDICATOR                                                */}
        {/* ========================================================================= */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-200/80 flex items-center justify-between text-xs font-semibold text-slate-500 overflow-x-auto">
          <div className="flex items-center gap-2">
            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                step === 'upload'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-emerald-100 text-emerald-700'
              }`}
            >
              1
            </span>
            <span className={step === 'upload' ? 'text-indigo-700 font-bold' : 'text-slate-700'}>
              Upload PDF
            </span>
          </div>

          <span className="material-symbols-outlined text-slate-300 text-[18px]">chevron_right</span>

          <div className="flex items-center gap-2">
            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                step === 'preview'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : step === 'success'
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-slate-200 text-slate-600'
              }`}
            >
              2
            </span>
            <span className={step === 'preview' ? 'text-indigo-700 font-bold' : 'text-slate-500'}>
              Preview &amp; Validate
            </span>
          </div>

          <span className="material-symbols-outlined text-slate-300 text-[18px]">chevron_right</span>

          <div className="flex items-center gap-2">
            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                step === 'success'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-200 text-slate-600'
              }`}
            >
              3
            </span>
            <span className={step === 'success' ? 'text-emerald-700 font-bold' : 'text-slate-500'}>
              Confirmed
            </span>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* MODAL BODY                                                                */}
        {/* ========================================================================= */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {/* ----------------------------------------------------------------------- */}
          {/* STEP 1: UPLOAD PDF VIEW                                                 */}
          {/* ----------------------------------------------------------------------- */}
          {step === 'upload' && (
            <div className="space-y-6">
              {/* Drop Zone */}
              <div
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-3xl p-8 sm:p-10 text-center transition-all cursor-pointer flex flex-col items-center justify-center ${
                  selectedFile
                    ? 'border-indigo-500 bg-indigo-50/40 ring-4 ring-indigo-500/10'
                    : 'border-slate-300 hover:border-indigo-400 bg-slate-50/50 hover:bg-slate-50'
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".pdf,.txt,.csv"
                  className="hidden"
                />

                <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-500 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-500/25 mb-4">
                  <span className="material-symbols-outlined text-[32px]">picture_as_pdf</span>
                </div>

                {selectedFile ? (
                  <div className="space-y-1">
                    <p className="text-base font-bold text-slate-800 flex items-center justify-center gap-2">
                      <span className="material-symbols-outlined text-emerald-600 text-[20px]">
                        check_circle
                      </span>
                      <span>{selectedFile.name}</span>
                    </p>
                    <p className="text-xs text-slate-500 font-medium">
                      {(selectedFile.size / 1024).toFixed(1)} KB • Ready for preview extraction
                    </p>
                    <p className="text-xs text-indigo-600 font-semibold underline pt-2">
                      Click to choose a different PDF
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1 max-w-md">
                    <p className="text-base font-bold text-slate-800">
                      Drag &amp; drop performance PDF report here
                    </p>
                    <p className="text-xs sm:text-sm text-slate-500">
                      or click to browse your device (supports standard text-based PDF reports)
                    </p>
                    <div className="pt-2 flex items-center justify-center gap-2 text-[11px] text-slate-400 font-medium">
                      <span className="px-2 py-0.5 rounded-md bg-slate-200/70 text-slate-700 font-mono">
                        .PDF
                      </span>
                      <span>Text tables with Agent ID, Quality Score, Fatals &amp; Audits</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Error Callout */}
              {processError && (
                <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm flex items-start gap-3">
                  <span className="material-symbols-outlined text-rose-600 text-[20px] flex-shrink-0 mt-0.5">
                    error
                  </span>
                  <div>
                    <span className="font-bold">Extraction Error: </span>
                    <span>{processError}</span>
                  </div>
                </div>
              )}

              {/* Expected Format & Sample Download Card */}
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-indigo-600 text-[18px]">
                      info
                    </span>
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Expected PDF Data Columns
                    </span>
                  </div>

                  <span className="text-[11px] text-slate-400 font-medium">
                    Text-based PDF reports with structured columns
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono border-collapse bg-white rounded-xl border border-slate-200">
                    <thead>
                      <tr className="bg-slate-100/80 text-slate-600 border-b border-slate-200 text-[11px] font-bold">
                        <th className="py-2 px-3">Agent ID</th>
                        <th className="py-2 px-3">Agent Name</th>
                        <th className="py-2 px-3">Quality Score</th>
                        <th className="py-2 px-3">Fatal Count</th>
                        <th className="py-2 px-3">Call Audit Count</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      <tr>
                        <td className="py-2 px-3 font-bold text-indigo-700">AGT-####</td>
                        <td className="py-2 px-3">Full Name</td>
                        <td className="py-2 px-3">0-100%</td>
                        <td className="py-2 px-3">0+</td>
                        <td className="py-2 px-3">0+</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <p className="text-[11px] text-slate-500 leading-relaxed">
                  <strong>Architecture Note:</strong> Agent ID is the primary matching identifier.
                  Unmatched IDs will be flagged as <span className="text-amber-700 font-semibold">Agent Not Found</span> and will not touch the database. Scanned image PDFs can later be processed via the modular OCR pipeline.
                </p>
              </div>
            </div>
          )}

          {/* ----------------------------------------------------------------------- */}
          {/* STEP 2: PREVIEW & VALIDATE TABLE                                        */}
          {/* ----------------------------------------------------------------------- */}
          {step === 'preview' && summary && (
            <div className="space-y-6">
              {/* Import Summary KPI Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {/* Total Records */}
                <div className="p-3.5 rounded-2xl bg-slate-100/90 border border-slate-200/80 text-slate-800">
                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Total Records
                  </div>
                  <div className="text-xl sm:text-2xl font-black mt-1 text-slate-900">
                    {summary.totalRecordsFound}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Extracted from PDF</div>
                </div>

                {/* Ready to Import */}
                <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900">
                  <div className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">
                    Ready to Import
                  </div>
                  <div className="text-xl sm:text-2xl font-black mt-1 text-emerald-800">
                    {summary.recordsReadyToImport}
                  </div>
                  <div className="text-[10px] text-emerald-600 mt-0.5">Validated &amp; Matched</div>
                </div>

                {/* Successfully Matched Agents */}
                <div className="p-3.5 rounded-2xl bg-blue-50 border border-blue-200 text-blue-900">
                  <div className="text-[11px] font-bold text-blue-700 uppercase tracking-wider">
                    Matched Agents
                  </div>
                  <div className="text-xl sm:text-2xl font-black mt-1 text-blue-800">
                    {summary.successfullyMatchedAgents}
                  </div>
                  <div className="text-[10px] text-blue-600 mt-0.5">Existing in system</div>
                </div>

                {/* Unmatched Agents */}
                <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900">
                  <div className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">
                    Unmatched IDs
                  </div>
                  <div className="text-xl sm:text-2xl font-black mt-1 text-amber-800">
                    {summary.unmatchedAgents}
                  </div>
                  <div className="text-[10px] text-amber-600 mt-0.5">Will be skipped</div>
                </div>

                {/* Records with Errors */}
                <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 col-span-2 sm:col-span-1">
                  <div className="text-[11px] font-bold text-rose-700 uppercase tracking-wider">
                    Records w/ Errors
                  </div>
                  <div className="text-xl sm:text-2xl font-black mt-1 text-rose-800">
                    {summary.recordsWithErrors}
                  </div>
                  <div className="text-[10px] text-rose-600 mt-0.5">Invalid or missing</div>
                </div>
              </div>

              {/* Filter Tabs */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
                <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setFilterTab('all')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      filterTab === 'all'
                        ? 'bg-white text-indigo-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    All Records ({importRows.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterTab('ready')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
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
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      filterTab === 'issues'
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Unmatched / Errors ({summary.unmatchedAgents + summary.recordsWithErrors})
                  </button>
                </div>

                <div className="text-xs text-slate-500 font-medium">
                  Showing {filteredRows.length} of {importRows.length} extracted rows
                </div>
              </div>

              {/* PREVIEW TABLE (Desktop Horizontal, Mobile Responsive) */}
              <div className="overflow-hidden rounded-2xl border border-slate-200/80 shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        <th className="py-3 px-4">Agent ID</th>
                        <th className="py-3 px-4">Agent Name</th>
                        <th className="py-3 px-4 text-center">Quality Score</th>
                        <th className="py-3 px-4 text-center">Fatal Count</th>
                        <th className="py-3 px-4 text-center">Call Audit Count</th>
                        <th className="py-3 px-4 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
                      {filteredRows.map((row) => {
                        const isReady = row.status === 'Ready to Update';
                        const isUnmatched = row.status === 'Agent Not Found';
                        const isMissing = row.status === 'Missing Data';
                        const isInvalid = row.status === 'Invalid Data';

                        return (
                          <tr
                            key={row.id}
                            className={`hover:bg-slate-50/80 transition-colors ${
                              isReady
                                ? 'bg-emerald-50/20'
                                : isUnmatched
                                ? 'bg-amber-50/30'
                                : 'bg-rose-50/30'
                            }`}
                          >
                            {/* Agent ID */}
                            <td className="py-3 px-4 font-bold font-mono text-slate-800">
                              <div className="flex items-center gap-1.5">
                                <span>{row.agentId}</span>
                                {row.matchedAgentId && (
                                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 font-sans font-semibold border border-indigo-200">
                                    Matched
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Agent Name */}
                            <td className="py-3 px-4 font-medium text-slate-800">
                              <div>
                                <span>{row.matchedAgentName || row.agentName || '—'}</span>
                                {row.matchedAgentName && row.agentName && row.matchedAgentName !== row.agentName && (
                                  <span className="block text-[10px] text-slate-400">
                                    PDF: {row.agentName}
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Quality Score */}
                            <td className="py-3 px-4 text-center">
                              {row.qualityScore !== undefined ? (
                                <div className="inline-flex flex-col items-center">
                                  <span className="font-bold text-slate-900">
                                    {row.qualityScore}%
                                  </span>
                                  {row.previousValues && (
                                    <span className="text-[10px] text-slate-400">
                                      was {row.previousValues.qualityScore}%
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-slate-400 text-xs italic">
                                  {row.previousValues ? `Retained (${row.previousValues.qualityScore}%)` : '—'}
                                </span>
                              )}
                            </td>

                            {/* Fatal Count */}
                            <td className="py-3 px-4 text-center">
                              {row.fatalCount !== undefined ? (
                                <div className="inline-flex flex-col items-center">
                                  <span
                                    className={`font-bold ${
                                      row.fatalCount === 0 ? 'text-emerald-700' : 'text-rose-700'
                                    }`}
                                  >
                                    {row.fatalCount}
                                  </span>
                                  {row.previousValues && (
                                    <span className="text-[10px] text-slate-400">
                                      was {row.previousValues.fatalCount}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-slate-400 text-xs italic">
                                  {row.previousValues ? `Retained (${row.previousValues.fatalCount})` : '—'}
                                </span>
                              )}
                            </td>

                            {/* Call Audit Count */}
                            <td className="py-3 px-4 text-center">
                              {row.callAuditCount !== undefined ? (
                                <div className="inline-flex flex-col items-center">
                                  <span className="font-bold text-slate-900">
                                    {row.callAuditCount}
                                  </span>
                                  {row.previousValues && (
                                    <span className="text-[10px] text-slate-400">
                                      was {row.previousValues.callAuditCount}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-slate-400 text-xs italic">
                                  {row.previousValues ? `Retained (${row.previousValues.callAuditCount})` : '—'}
                                </span>
                              )}
                            </td>

                            {/* Status */}
                            <td className="py-3 px-4 text-right">
                              {isReady && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-200 shadow-2xs">
                                  <span className="material-symbols-outlined text-[14px]">
                                    check_circle
                                  </span>
                                  <span>Ready to Update</span>
                                </span>
                              )}

                              {isUnmatched && (
                                <div className="inline-flex flex-col items-end">
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-bold border border-amber-200">
                                    <span className="material-symbols-outlined text-[14px]">
                                      person_off
                                    </span>
                                    <span>Agent Not Found</span>
                                  </span>
                                  <span className="text-[10px] text-amber-700 font-medium mt-0.5">
                                    Skipped • Database untouched
                                  </span>
                                </div>
                              )}

                              {isMissing && (
                                <div className="inline-flex flex-col items-end">
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-purple-100 text-purple-800 text-xs font-bold border border-purple-200">
                                    <span className="material-symbols-outlined text-[14px]">
                                      help_outline
                                    </span>
                                    <span>Missing Data</span>
                                  </span>
                                  {row.statusReason && (
                                    <span className="text-[10px] text-purple-700 max-w-[180px] text-right mt-0.5">
                                      {row.statusReason}
                                    </span>
                                  )}
                                </div>
                              )}

                              {isInvalid && (
                                <div className="inline-flex flex-col items-end">
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 text-xs font-bold border border-rose-200">
                                    <span className="material-symbols-outlined text-[14px]">
                                      warning
                                    </span>
                                    <span>Invalid Data</span>
                                  </span>
                                  {row.statusReason && (
                                    <span className="text-[10px] text-rose-700 max-w-[180px] text-right mt-0.5">
                                      {row.statusReason}
                                    </span>
                                  )}
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-blue-50/80 border border-blue-200/80 text-xs text-blue-800 flex items-start gap-2">
                <span className="material-symbols-outlined text-blue-600 text-[18px] flex-shrink-0 mt-0.5">
                  security
                </span>
                <div>
                  <strong>Safety Rule Enforced:</strong> Clicking <em>Confirm Import</em> will only apply changes to the {summary.recordsReadyToImport} verified agents. Unmatched IDs and rows with errors will be safely ignored.
                </div>
              </div>
            </div>
          )}

          {/* ----------------------------------------------------------------------- */}
          {/* STEP 3: SUCCESS CONFIRMATION                                            */}
          {/* ----------------------------------------------------------------------- */}
          {step === 'success' && (
            <div className="py-8 px-4 text-center space-y-5">
              <div className="w-20 h-20 rounded-3xl bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center ring-8 ring-emerald-50 shadow-lg">
                <span className="material-symbols-outlined text-[44px]">check_circle</span>
              </div>

              <div className="space-y-1 max-w-md mx-auto">
                <h3 className="text-2xl font-black tracking-tight text-slate-900">
                  Performance data imported successfully.
                </h3>
                <p className="text-sm text-slate-600">
                  Updated <strong className="text-emerald-700 font-bold">{importedCount} agent records</strong> with new Quality Scores, Fatal Counts, and Call Audit Counts.
                </p>
              </div>

              <div className="max-w-md mx-auto p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-2 text-left">
                <div className="flex items-center gap-2 text-indigo-700 font-bold">
                  <span className="material-symbols-outlined text-[18px]">verified</span>
                  <span>Automatic Leaderboard &amp; Dashboard Synchronizations</span>
                </div>
                <ul className="list-disc list-inside space-y-1 text-slate-500 pl-1">
                  <li>Quality Score Leaderboard automatically refreshed with newly calibrated rankings.</li>
                  <li>Affected agents can immediately view their updated scorecards and statistics.</li>
                  <li>Database state updated and prepared for persistent Supabase connection.</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* ========================================================================= */}
        {/* MODAL FOOTER ACTIONS                                                      */}
        {/* ========================================================================= */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-3">
          {step === 'upload' && (
            <>
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs sm:text-sm font-semibold hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <div className="w-full sm:w-auto flex items-center gap-2">
                <button
                  type="button"
                  disabled={!selectedFile || isProcessing}
                  onClick={() => handleProcessPdf()}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white text-xs sm:text-sm font-bold shadow-md shadow-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isProcessing ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Extracting PDF Data...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[18px]">preview</span>
                      <span>Preview Import</span>
                    </>
                  )}
                </button>
              </div>
            </>
          )}

          {step === 'preview' && (
            <>
              <button
                type="button"
                onClick={handleReset}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs sm:text-sm font-semibold hover:bg-slate-100 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                <span>Upload Another File</span>
              </button>

              <div className="w-full sm:w-auto flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs sm:text-sm font-semibold hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  disabled={(summary?.recordsReadyToImport ?? 0) === 0}
                  onClick={handleConfirmImport}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs sm:text-sm font-bold shadow-md shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">done_all</span>
                  <span>Confirm Import ({summary?.recordsReadyToImport ?? 0})</span>
                </button>
              </div>
            </>
          )}

          {step === 'success' && (
            <div className="w-full flex items-center justify-end gap-2">
              {onViewLeaderboard && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onViewLeaderboard();
                  }}
                  className="px-4 py-2.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs sm:text-sm font-bold border border-indigo-200 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">leaderboard</span>
                  <span>View Quality Leaderboard</span>
                </button>
              )}

              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs sm:text-sm font-bold shadow-md transition-colors cursor-pointer"
              >
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
