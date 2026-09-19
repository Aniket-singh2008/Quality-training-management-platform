import { Agent, PerformanceImportRow, ImportSummary, ImportRowStatus } from '../types';

/**
 * Raw row extracted from PDF text stream or table parser
 */
export interface RawPerformanceRow {
  rawAgentId?: string;
  rawAgentName?: string;
  rawQualityScore?: string;
  rawFatalCount?: string;
  rawCallAuditCount?: string;
}

// ============================================================================
// 1. PDF TEXT EXTRACTION PIPELINE (With Fallback and OCR Hook)
// ============================================================================

/**
 * Extracts plain text from an uploaded PDF file.
 * Uses pdfjs-dist when available, with a robust native stream fallback
 * if workers are unavailable in sandboxed iframes.
 */
export async function extractTextFromPdf(file: File): Promise<string> {
  // If user dropped a text / markdown / csv report file for testing, read directly
  if (file.type === 'text/plain' || file.name.endsWith('.txt') || file.name.endsWith('.csv')) {
    return await file.text();
  }

  const arrayBuffer = await file.arrayBuffer();

  // Method A: Attempt pdfjs-dist extraction
  try {
    const pdfjsLib = await import('pdfjs-dist');
    // Ensure worker is configured or fallback inline
    if (pdfjsLib.GlobalWorkerOptions && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version || '4.10.38'}/pdf.worker.min.mjs`;
    }

    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(arrayBuffer),
      useSystemFonts: true
    } as any);

    const pdfDoc = await loadingTask.promise;
    let fullText = '';

    for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
      const page = await pdfDoc.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => ('str' in item ? item.str : ''))
        .join(' ');
      fullText += pageText + '\n';
    }

    if (fullText.trim().length > 10) {
      return fullText;
    }
  } catch (err) {
    console.warn('[ProcessHub PDF Engine] pdfjs-dist worker parse notice, falling back to native stream extractor:', err);
  }

  // Method B: Native Text Stream Decoder (Extracts text objects BT ... ET / (...) Tj from PDF buffer)
  try {
    const textDecoder = new TextDecoder('latin1');
    const rawContent = textDecoder.decode(arrayBuffer);

    // Extract text between parentheses in text operators
    const textMatches: string[] = [];
    const textOpRegex = /\(([^)]+)\)\s*(?:Tj|'|")/g;
    let match;
    while ((match = textOpRegex.exec(rawContent)) !== null) {
      const decoded = match[1]
        .replace(/\\n/g, '\n')
        .replace(/\\r/g, '')
        .replace(/\\t/g, ' ')
        .replace(/\\\(/g, '(')
        .replace(/\\\)/g, ')')
        .replace(/\\\\/g, '\\');
      textMatches.push(decoded);
    }

    if (textMatches.length > 0) {
      return textMatches.join(' ');
    }
  } catch (streamErr) {
    console.warn('[ProcessHub PDF Engine] Native stream decode failed:', streamErr);
  }

  // Method C: OCR Scanned PDF Hook
  return await extractViaOcr(file);
}

/**
 * OCR Architecture Hook:
 * When scanned or image-based PDFs (which lack embedded text streams) are uploaded,
 * this pipeline hook is ready to invoke Tesseract.js, Google Cloud Vision, or Supabase Edge Functions.
 */
export async function extractViaOcr(_file: File): Promise<string> {
  // Scaffolded modular hook for future OCR worker integration
  return '';
}

// ============================================================================
// 2. REPORT TEXT PARSER (Handles Pipe tables, Tabular columns, and CSV)
// ============================================================================

/**
 * Parses raw text extracted from the PDF into structured performance row objects.
 */
export function parsePerformanceText(text: string): RawPerformanceRow[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const rawRows: RawPerformanceRow[] = [];

  for (const line of lines) {
    // Skip typical header rows
    const lower = line.toLowerCase();
    if (
      lower.includes('agent id') &&
      (lower.includes('quality') || lower.includes('fatal') || lower.includes('audit'))
    ) {
      continue;
    }
    if (lower.startsWith('---') || lower.startsWith('===') || lower.startsWith('___')) {
      continue;
    }

    let parts: string[] = [];

    // Case 1: Pipe separated (e.g. AGT001 | Rahul | 94% | 1 | 12)
    if (line.includes('|')) {
      parts = line.split('|').map((p) => p.trim());
    }
    // Case 2: Comma separated (CSV format)
    else if (line.includes(',')) {
      parts = line.split(',').map((p) => p.trim());
    }
    // Case 3: Tab or multi-space separated
    else if (/\t|\s{2,}/.test(line)) {
      parts = line.split(/\t|\s{2,}/).map((p) => p.trim());
    } else {
      // Single line with spaces: test if starting with AGT / ag-
      const spaceParts = line.split(/\s+/).map((p) => p.trim());
      if (spaceParts.length >= 4) {
        parts = spaceParts;
      }
    }

    if (parts.length >= 3) {
      // parts[0]: Agent ID
      // parts[1]: Agent Name (optional if only numbers follow)
      // parts[2]: Quality Score
      // parts[3]: Fatal Count
      // parts[4]: Call Audit Count

      let rawAgentId = parts[0];
      let rawAgentName = '';
      let rawQualityScore = '';
      let rawFatalCount = '';
      let rawCallAuditCount = '';

      if (parts.length >= 5) {
        rawAgentName = parts[1];
        rawQualityScore = parts[2];
        rawFatalCount = parts[3];
        rawCallAuditCount = parts[4];
      } else if (parts.length === 4) {
        // Could be: ID | Score | Fatal | Audit OR ID | Name | Score | Fatal
        if (/%|\d+/.test(parts[1]) && !/[a-zA-Z]{3,}/.test(parts[1])) {
          rawQualityScore = parts[1];
          rawFatalCount = parts[2];
          rawCallAuditCount = parts[3];
        } else {
          rawAgentName = parts[1];
          rawQualityScore = parts[2];
          rawFatalCount = parts[3];
        }
      } else if (parts.length === 3) {
        rawAgentName = parts[1];
        rawQualityScore = parts[2];
      }

      rawRows.push({
        rawAgentId,
        rawAgentName,
        rawQualityScore,
        rawFatalCount,
        rawCallAuditCount
      });
    }
  }

  return rawRows;
}

// ============================================================================
// 3. VALIDATION & AGENT MATCHING ENGINE
// ============================================================================

/**
 * Normalizes an Agent ID string for flexible matching:
 * e.g., 'AGT001', 'AGT-001', 'ag-1', 'AG1', 'agt 1' -> 'ag-1' or index
 */
export function normalizeAgentId(rawId: string): string {
  if (!rawId) return '';
  const clean = rawId.trim().toLowerCase();
  
  // Extract trailing digits if format is AGT001, AG-1, AGT-1, etc.
  const numMatch = clean.match(/^(?:agt|ag)[\s\-_]*0*(\d+)$/);
  if (numMatch) {
    return `ag-${numMatch[1]}`;
  }
  return clean;
}

/**
 * Validates extracted records against existing registered agents.
 * Strict rules:
 * - Unmatched IDs show 'Agent Not Found' and will NOT touch database.
 * - Missing/invalid fields are flagged with explicit reasons.
 * - Quality Score must be valid percentage (0-100).
 * - Fatal Count must be valid non-negative number.
 * - Call Audit Count must be valid non-negative number.
 */
export function validateAndMatchPerformanceRows(
  rawRows: RawPerformanceRow[],
  existingAgents: Agent[]
): { rows: PerformanceImportRow[]; summary: ImportSummary } {
  const rows: PerformanceImportRow[] = [];
  const matchedAgentIdsSet = new Set<string>();

  rawRows.forEach((raw, idx) => {
    const rawId = (raw.rawAgentId || '').trim();
    const rawName = (raw.rawAgentName || '').trim();
    const rowId = `import-row-${idx + 1}`;

    // 1. Check Missing Identifier
    if (!rawId) {
      rows.push({
        id: rowId,
        agentId: '—',
        agentName: rawName || 'Unknown',
        status: 'Missing Data',
        statusReason: 'Missing Agent ID. Agent ID is required as the primary identifier.',
        raw
      });
      return;
    }

    // 2. Primary Match: Match Agent ID against existing agents
    const normRawId = normalizeAgentId(rawId);
    const matchedAgent = existingAgents.find((a) => {
      // Check exact ID match
      if (a.id.toLowerCase() === rawId.toLowerCase()) return true;
      // Check agentCode match (e.g. AGT001)
      if (a.agentCode && a.agentCode.toLowerCase() === rawId.toLowerCase()) return true;
      // Check normalized ID match
      if (normalizeAgentId(a.id) === normRawId) return true;
      if (a.agentCode && normalizeAgentId(a.agentCode) === normRawId) return true;
      return false;
    });

    // 3. If Agent NOT found:
    if (!matchedAgent) {
      rows.push({
        id: rowId,
        agentId: rawId,
        agentName: rawName || 'Unregistered Agent',
        status: 'Agent Not Found',
        statusReason: `Agent ID "${rawId}" does not match any existing agent in ProcessHub.`,
        raw
      });
      return;
    }

    // 4. Validate Quality Score (optional or number 0-100)
    let parsedQualityScore: number | undefined;
    if (raw.rawQualityScore !== undefined && raw.rawQualityScore.trim() !== '') {
      const cleanScoreStr = raw.rawQualityScore.replace('%', '').trim();
      const num = parseFloat(cleanScoreStr);
      if (isNaN(num) || num < 0 || num > 100) {
        rows.push({
          id: rowId,
          agentId: rawId,
          agentName: rawName || matchedAgent.name,
          matchedAgentId: matchedAgent.id,
          matchedAgentName: matchedAgent.name,
          status: 'Invalid Data',
          statusReason: `Invalid Quality Score "${raw.rawQualityScore}". Must be a valid percentage between 0% and 100%.`,
          raw,
          previousValues: {
            qualityScore: matchedAgent.qualityScore ?? matchedAgent.score ?? 90,
            fatalCount: matchedAgent.fatalCount ?? 0,
            callAuditCount: matchedAgent.callAuditCount ?? 30
          }
        });
        return;
      }
      parsedQualityScore = Math.round(num * 10) / 10;
    }

    // 5. Validate Fatal Count (optional or non-negative integer)
    let parsedFatalCount: number | undefined;
    if (raw.rawFatalCount !== undefined && raw.rawFatalCount.trim() !== '') {
      const num = parseInt(raw.rawFatalCount.trim(), 10);
      if (isNaN(num) || num < 0) {
        rows.push({
          id: rowId,
          agentId: rawId,
          agentName: rawName || matchedAgent.name,
          matchedAgentId: matchedAgent.id,
          matchedAgentName: matchedAgent.name,
          status: 'Invalid Data',
          statusReason: `Invalid Fatal Count "${raw.rawFatalCount}". Must be a non-negative number (>= 0).`,
          raw,
          previousValues: {
            qualityScore: matchedAgent.qualityScore ?? matchedAgent.score ?? 90,
            fatalCount: matchedAgent.fatalCount ?? 0,
            callAuditCount: matchedAgent.callAuditCount ?? 30
          }
        });
        return;
      }
      parsedFatalCount = num;
    }

    // 6. Validate Call Audit Count (optional or non-negative integer)
    let parsedCallAuditCount: number | undefined;
    if (raw.rawCallAuditCount !== undefined && raw.rawCallAuditCount.trim() !== '') {
      const num = parseInt(raw.rawCallAuditCount.trim(), 10);
      if (isNaN(num) || num < 0) {
        rows.push({
          id: rowId,
          agentId: rawId,
          agentName: rawName || matchedAgent.name,
          matchedAgentId: matchedAgent.id,
          matchedAgentName: matchedAgent.name,
          status: 'Invalid Data',
          statusReason: `Invalid Call Audit Count "${raw.rawCallAuditCount}". Must be a non-negative number (>= 0).`,
          raw,
          previousValues: {
            qualityScore: matchedAgent.qualityScore ?? matchedAgent.score ?? 90,
            fatalCount: matchedAgent.fatalCount ?? 0,
            callAuditCount: matchedAgent.callAuditCount ?? 30
          }
        });
        return;
      }
      parsedCallAuditCount = num;
    }

    // 7. Check if all metric fields were empty
    if (
      parsedQualityScore === undefined &&
      parsedFatalCount === undefined &&
      parsedCallAuditCount === undefined
    ) {
      rows.push({
        id: rowId,
        agentId: rawId,
        agentName: rawName || matchedAgent.name,
        matchedAgentId: matchedAgent.id,
        matchedAgentName: matchedAgent.name,
        status: 'Missing Data',
        statusReason: 'No performance metrics (Quality Score, Fatal Count, or Audit Count) were found in this row.',
        raw,
        previousValues: {
          qualityScore: matchedAgent.qualityScore ?? matchedAgent.score ?? 90,
          fatalCount: matchedAgent.fatalCount ?? 0,
          callAuditCount: matchedAgent.callAuditCount ?? 30
        }
      });
      return;
    }

    // 8. Row is valid and ready to update!
    matchedAgentIdsSet.add(matchedAgent.id);
    rows.push({
      id: rowId,
      agentId: rawId,
      agentName: rawName || matchedAgent.name,
      matchedAgentId: matchedAgent.id,
      matchedAgentName: matchedAgent.name,
      qualityScore: parsedQualityScore,
      fatalCount: parsedFatalCount,
      callAuditCount: parsedCallAuditCount,
      status: 'Ready to Update',
      raw,
      previousValues: {
        qualityScore: matchedAgent.qualityScore ?? matchedAgent.score ?? 90,
        fatalCount: matchedAgent.fatalCount ?? 0,
        callAuditCount: matchedAgent.callAuditCount ?? 30
      }
    });
  });

  // Calculate Import Summary
  const recordsReadyToImport = rows.filter((r) => r.status === 'Ready to Update').length;
  const unmatchedAgents = rows.filter((r) => r.status === 'Agent Not Found').length;
  const recordsWithErrors = rows.filter(
    (r) => r.status === 'Invalid Data' || r.status === 'Missing Data'
  ).length;

  const summary: ImportSummary = {
    totalRecordsFound: rows.length,
    recordsReadyToImport,
    successfullyMatchedAgents: matchedAgentIdsSet.size,
    unmatchedAgents,
    recordsWithErrors
  };

  return { rows, summary };
}

// ============================================================================
// 4. DATABASE UPDATE & LEADERBOARD REFRESH (Supabase Ready)
// ============================================================================

/**
 * Applies the validated performance rows to the agents state.
 * Prepared for direct Supabase database upsert:
 * e.g., supabase.from('agents').update({ quality_score, fatal_count, call_audit_count })
 *
 * Rules:
 * - Only modifies rows with status 'Ready to Update'.
 * - Never overwrites existing values when the corresponding PDF field is missing/undefined.
 * - Recalculates leaderboard rankings dynamically.
 */
export function applyPerformanceImport(
  importRows: PerformanceImportRow[],
  currentAgents: Agent[]
): { updatedAgents: Agent[]; importedCount: number } {
  const readyRows = importRows.filter(
    (r) => r.status === 'Ready to Update' && r.matchedAgentId
  );

  const updatesMap = new Map<
    string,
    { qualityScore?: number; fatalCount?: number; callAuditCount?: number }
  >();

  readyRows.forEach((row) => {
    if (row.matchedAgentId) {
      updatesMap.set(row.matchedAgentId, {
        qualityScore: row.qualityScore,
        fatalCount: row.fatalCount,
        callAuditCount: row.callAuditCount
      });
    }
  });

  // Apply updates without overwriting missing fields
  const updatedList = currentAgents.map((agent) => {
    const update = updatesMap.get(agent.id);
    if (!update) return agent;

    const newQuality =
      update.qualityScore !== undefined
        ? update.qualityScore
        : (agent.qualityScore ?? agent.score ?? 90);
    const newFatal =
      update.fatalCount !== undefined ? update.fatalCount : (agent.fatalCount ?? 0);
    const newAudits =
      update.callAuditCount !== undefined
        ? update.callAuditCount
        : (agent.callAuditCount ?? 30);

    return {
      ...agent,
      qualityScore: newQuality,
      score: newQuality,
      fatalCount: newFatal,
      callAuditCount: newAudits
    };
  });

  // Re-rank agents by Quality Score descending (Leaderboard refresh)
  const sorted = [...updatedList].sort((a, b) => {
    const scoreA = a.qualityScore ?? a.score ?? 0;
    const scoreB = b.qualityScore ?? b.score ?? 0;
    return scoreB - scoreA;
  });

  const finalRankedAgents = sorted.map((agent, index) => ({
    ...agent,
    rank: index + 1
  }));

  // Preserve original agent array order by id
  const rankMap = new Map<string, number>(finalRankedAgents.map((a) => [a.id, a.rank]));
  const result = updatedList.map((a) => ({
    ...a,
    rank: rankMap.get(a.id) || a.rank
  }));

  return {
    updatedAgents: result,
    importedCount: readyRows.length
  };
}

// ============================================================================
// 5. SAMPLE REPORT GENERATOR (For Admin Instant Testing)
// ============================================================================

/**
 * Standard text content representing an authentic QA performance report.
 */
export const SAMPLE_PERFORMANCE_REPORT_TEXT = `Agent ID | Agent Name | Quality Score | Fatal Count | Call Audit Count
AGT001 | Rahul Mehta | 94% | 1 | 12
AGT002 | Priya Patel | 89% | 2 | 10
AGT003 | Aman Verma | 98% | 0 | 45
AGT004 | Sneha Rao | 88% | 1 | 28
AGT005 | Vikram Joshi | 92% | 1 | 32
AGT006 | Neha Kapoor | 97% | 0 | 40
AGT007 | Karan Nair | 93% | 0 | 34
AGT099 | Unknown Agent | 91% | 0 | 15`;

/**
 * Generates a real, valid binary PDF Blob (PDF-1.4 spec) containing the performance table,
 * allowing Admin to download and upload an actual .pdf file in their browser.
 */
export function generateSamplePdfBlob(): Blob {
  const content = [
    '%PDF-1.4',
    '1 0 obj',
    '<< /Type /Catalog /Pages 2 0 R >>',
    'endobj',
    '2 0 obj',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    'endobj',
    '3 0 obj',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
    'endobj',
    '5 0 obj',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    'endobj'
  ];

  // PDF Text stream with performance data lines
  const textLines = [
    'PROCESSHUB QA AUDIT CYCLE - PERFORMANCE REPORT',
    'Date: September 2026 | Calibration Cycle: Q4 Weekly',
    '------------------------------------------------------------------------',
    'Agent ID | Agent Name | Quality Score | Fatal Count | Call Audit Count',
    'AGT001 | Rahul Mehta | 94% | 1 | 12',
    'AGT002 | Priya Patel | 89% | 2 | 10',
    'AGT003 | Aman Verma | 98% | 0 | 45',
    'AGT004 | Sneha Rao | 88% | 1 | 28',
    'AGT005 | Vikram Joshi | 92% | 1 | 32',
    'AGT006 | Neha Kapoor | 97% | 0 | 40',
    'AGT007 | Karan Nair | 93% | 0 | 34',
    'AGT099 | Unknown Agent | 91% | 0 | 15',
    '------------------------------------------------------------------------',
    'Confidential QA Performance Document - Generated for ProcessHub'
  ];

  let streamBody = 'BT\n/F1 10 Tf\n50 720 Td\n18 TL\n';
  textLines.forEach((l) => {
    // Escape parens and backslashes in PDF text strings
    const escaped = l.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
    streamBody += `(${escaped}) Tj T*\n`;
  });
  streamBody += 'ET\n';

  const streamLength = streamBody.length;
  content.push('4 0 obj');
  content.push(`<< /Length ${streamLength} >>`);
  content.push('stream');
  content.push(streamBody.trim());
  content.push('endstream');
  content.push('endobj');
  content.push('xref');
  content.push('0 6');
  content.push('0000000000 65535 f ');
  content.push('trailer');
  content.push('<< /Size 6 /Root 1 0 R >>');
  content.push('startxref');
  content.push('500');
  content.push('%%EOF');

  const pdfString = content.join('\n');
  return new Blob([pdfString], { type: 'application/pdf' });
}
