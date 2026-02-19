import * as jsondiffpatch from "jsondiffpatch";
import { format as formatHtmlDiff } from "jsondiffpatch/formatters/html";
// Import CSS as raw string for embedding in generated HTML reports
import jsondiffpatchCss from "jsondiffpatch/formatters/styles/html.css?raw";

/**
 * Migration Report Generator
 *
 * This module generates human-readable HTML reports for state migrations,
 * showing diffs between versions and complete state at each step.
 * Used for debugging migration issues.
 */

// =============================================================================
// Types
// =============================================================================

/**
 * Represents a single step in a migration process.
 * Note: stateBefore is not stored here - use getStateBefore() helper
 * to derive it from the initial state or the previous step's stateAfter.
 */
export interface MigrationStep {
  fromVersion: number;
  toVersion: number;
  description: string;
  stateAfter: unknown;
  diff: jsondiffpatch.Delta | undefined;
}

/**
 * Represents the full report of a migration process.
 */
export interface MigrationReport {
  startVersion: number;
  endVersion: number;
  /** The state before any migrations were applied */
  initialState: unknown;
  steps: MigrationStep[];
  success: boolean;
  error?: string;
}

// =============================================================================
// Report Storage (for debugging)
// =============================================================================

/**
 * Module-level storage for the last migration report.
 * This allows the report to be accessed from the dev console or debug UI
 * after migration completes.
 */
let lastMigrationReport: MigrationReport | null = null;

/** Store a migration report for later retrieval. */
export function setMigrationReport(report: MigrationReport): void {
  lastMigrationReport = report;
}

/** Get the last migration report, if any. */
export function getMigrationReport(): MigrationReport | null {
  return lastMigrationReport;
}

/** Clear the stored migration report. */
export function clearMigrationReport(): void {
  lastMigrationReport = null;
}

// =============================================================================
// Diff Generation
// =============================================================================

// Create a jsondiffpatch instance with custom object hashing
const diffpatcher = jsondiffpatch.create({
  // Match objects by 'id' field if present, for better array diffing
  objectHash: (obj: unknown) => {
    if (typeof obj === "object" && obj !== null && "id" in obj) {
      const id = (obj as Record<string, unknown>).id;
      // Ensure id is a primitive that can be stringified
      if (typeof id === "string" || typeof id === "number") {
        return String(id);
      }
    }
    return JSON.stringify(obj);
  },
});

/** Generate a diff between two states. */
export function generateDiff(
  before: unknown,
  after: unknown,
): jsondiffpatch.Delta | undefined {
  return diffpatcher.diff(before, after);
}

/**
 * Get the state before a migration step was applied.
 * @param report The migration report
 * @param stepIndex The index of the step (0-based)
 * @returns The state before the step, or undefined if stepIndex is out of bounds
 */
export function getStateBefore(
  report: MigrationReport,
  stepIndex: number,
): unknown | undefined {
  if (stepIndex < 0 || stepIndex >= report.steps.length) {
    return undefined;
  }
  if (stepIndex === 0) {
    return report.initialState;
  }
  return report.steps[stepIndex - 1].stateAfter;
}

// =============================================================================
// HTML Generation Helpers
// =============================================================================

const COLLAPSIBLE_MAX_HEIGHT = "600px";

/** Escape HTML special characters to prevent XSS */
function escapeHtml(text: string): string {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

/** Generate HTML for the initial state section */
function generateInitialStateHtml(report: MigrationReport): string {
  return `
    <section class="state-section">
      <h2>Initial State (v${report.startVersion})</h2>
      <details>
        <summary>View State JSON</summary>
        <div class="state-content">
          <pre>${escapeHtml(JSON.stringify(report.initialState, null, 2))}</pre>
        </div>
      </details>
    </section>
  `;
}

/** Generate HTML for a single migration step */
function generateStepHtml(
  step: MigrationStep,
  index: number,
  report: MigrationReport,
): string {
  const stateBefore = getStateBefore(report, index);
  const diffHtml = step.diff
    ? (formatHtmlDiff(step.diff, stateBefore) ?? "")
    : "<p><em>No changes</em></p>";

  return `
    <section class="step">
      <h2>Step ${index + 1}: v${step.fromVersion} → v${step.toVersion}</h2>
      <p class="description">${escapeHtml(step.description)}</p>

      <details open>
        <summary>View Diff</summary>
        <div class="diff-content">
          <div class="diff">
            ${diffHtml}
          </div>
        </div>
      </details>

      <details>
        <summary>View Resulting State (v${step.toVersion})</summary>
        <div class="state-content">
          <pre>${escapeHtml(JSON.stringify(step.stateAfter, null, 2))}</pre>
        </div>
      </details>
    </section>
  `;
}

/** Generate the report's custom CSS (in addition to jsondiffpatch CSS) */
function generateCustomCss(): string {
  return `
    :root {
      --bg-color: #1a1a2e;
      --card-bg: #16213e;
      --text-color: #e4e4e7;
      --text-muted: #a1a1aa;
      --border-color: #3f3f46;
      --success-color: #22c55e;
      --error-color: #ef4444;
      --accent-color: #6366f1;
    }

    * {
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      background-color: var(--bg-color);
      color: var(--text-color);
      margin: 0;
      padding: 2rem;
      line-height: 1.6;
    }

    .container {
      max-width: 1200px;
      margin: 0 auto;
    }

    header {
      margin-bottom: 2rem;
      padding-bottom: 1rem;
      border-bottom: 1px solid var(--border-color);
    }

    h1 {
      margin: 0 0 0.5rem 0;
      font-size: 1.75rem;
    }

    .header-actions {
      margin-top: 1rem;
    }

    .btn {
      background-color: var(--accent-color);
      color: white;
      border: none;
      padding: 0.5rem 1rem;
      border-radius: 0.375rem;
      cursor: pointer;
      font-size: 0.875rem;
      font-weight: 500;
    }

    .btn:hover {
      opacity: 0.9;
    }

    .status {
      display: inline-block;
      padding: 0.25rem 0.75rem;
      border-radius: 0.25rem;
      font-size: 0.875rem;
      font-weight: 500;
    }

    .status.success {
      background-color: rgba(34, 197, 94, 0.2);
      color: var(--success-color);
    }

    .status.error {
      background-color: rgba(239, 68, 68, 0.2);
      color: var(--error-color);
    }

    .summary {
      color: var(--text-muted);
      margin-top: 0.5rem;
    }

    .step {
      background-color: var(--card-bg);
      border: 1px solid var(--border-color);
      border-radius: 0.5rem;
      padding: 1.5rem;
      margin-bottom: 1.5rem;
    }

    .step h2 {
      margin: 0 0 0.5rem 0;
      font-size: 1.25rem;
    }

    .description {
      color: var(--text-muted);
      margin: 0 0 1rem 0;
    }

    .diff {
      background-color: rgba(0, 0, 0, 0.2);
      border-radius: 0.375rem;
      padding: 1rem;
      overflow-x: auto;
    }

    .no-steps {
      background-color: var(--card-bg);
      border: 1px solid var(--border-color);
      border-radius: 0.5rem;
      padding: 2rem;
      text-align: center;
      color: var(--text-muted);
    }

    /* Override jsondiffpatch styles for dark theme */
    .jsondiffpatch-delta {
      font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace;
      font-size: 0.875rem;
    }

    .jsondiffpatch-added .jsondiffpatch-property-name,
    .jsondiffpatch-added .jsondiffpatch-value pre,
    .jsondiffpatch-modified .jsondiffpatch-right-value pre {
      background-color: rgba(34, 197, 94, 0.2);
    }

    .jsondiffpatch-deleted .jsondiffpatch-property-name,
    .jsondiffpatch-deleted .jsondiffpatch-value pre,
    .jsondiffpatch-modified .jsondiffpatch-left-value pre {
      background-color: rgba(239, 68, 68, 0.2);
    }

    /* Collapsible sections */
    details {
      margin-top: 1rem;
    }

    summary {
      cursor: pointer;
      padding: 0.5rem 0.75rem;
      background-color: rgba(99, 102, 241, 0.1);
      border-radius: 0.25rem;
      font-weight: 500;
      user-select: none;
    }

    summary:hover {
      background-color: rgba(99, 102, 241, 0.2);
    }

    .state-content,
    .diff-content {
      max-height: ${COLLAPSIBLE_MAX_HEIGHT};
      overflow: auto;
      margin-top: 0.5rem;
      border: 1px solid var(--border-color);
      border-radius: 0.375rem;
      padding: 1rem;
      background-color: rgba(0, 0, 0, 0.2);
    }

    .state-content pre {
      margin: 0;
      font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace;
      font-size: 0.875rem;
      line-height: 1.5;
      color: var(--text-color);
    }

    .state-section {
      background-color: var(--card-bg);
      border: 1px solid var(--border-color);
      border-radius: 0.5rem;
      padding: 1.5rem;
      margin-bottom: 1.5rem;
    }

    .state-section h2 {
      margin: 0 0 0.5rem 0;
      font-size: 1.25rem;
      color: var(--accent-color);
    }
  `;
}

/** Generate client-side JavaScript for the report */
function generateClientScript(): string {
  return `
    // Toggle visibility of unchanged values in diffs
    // Based on jsondiffpatch's showUnchanged/hideUnchanged implementation
    function toggleUnchanged() {
      const checkbox = document.getElementById('show-unchanged');
      const diffs = document.querySelectorAll('.diff');
      const prefix = 'jsondiffpatch-unchanged-';
      const classes = {
        showing: prefix + 'showing',
        hiding: prefix + 'hiding',
        visible: prefix + 'visible',
        hidden: prefix + 'hidden',
      };

      diffs.forEach(diff => {
        const list = diff.classList;
        // Remove all state classes
        list.remove(classes.showing, classes.hiding, classes.visible, classes.hidden);

        // Add hidden class if unchecked
        if (!checkbox.checked) {
          list.add(classes.hidden);
        }
      });
    }

    // Download the report as a standalone HTML file
    function downloadReport() {
      const html = document.documentElement.outerHTML;
      const blob = new Blob(['<!DOCTYPE html>' + html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'migration-report.html';
      a.click();
      URL.revokeObjectURL(url);
    }

    // Initialize unchanged values visibility on page load
    toggleUnchanged();
  `;
}

// =============================================================================
// Main HTML Report Generation
// =============================================================================

/**
 * Generate a complete standalone HTML report from a migration report.
 * The report can be viewed in a new tab or downloaded as a file.
 *
 * @param report The migration report to visualize
 * @returns Complete HTML document as a string
 */
export function generateHtmlReport(report: MigrationReport): string {
  // Build content based on whether there were any migration steps
  const contentHtml =
    report.steps.length > 0
      ? generateInitialStateHtml(report) +
        report.steps
          .map((step, i) => generateStepHtml(step, i, report))
          .join("\n")
      : '<div class="no-steps">No migration steps were performed.</div>';

  const statusClass = report.success ? "success" : "error";
  const statusText = report.success
    ? "Migration successful"
    : `Migration failed: ${report.error}`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Migration Report: v${report.startVersion} → v${report.endVersion}</title>
  <style>
    ${jsondiffpatchCss}
    ${generateCustomCss()}
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>Migration Report</h1>
      <span class="status ${statusClass}">${escapeHtml(statusText)}</span>
      <p class="summary">
        Migrated from version ${report.startVersion} to version ${report.endVersion}
        (${report.steps.length} step${report.steps.length === 1 ? "" : "s"})
      </p>
      <div class="header-actions">
        <label style="display: inline-flex; align-items: center; gap: 0.5rem; margin-right: 1rem; cursor: pointer;">
          <input type="checkbox" id="show-unchanged" onchange="toggleUnchanged()" style="cursor: pointer;">
          <span>Show unchanged values</span>
        </label>
        <button class="btn" onclick="downloadReport()">Download HTML</button>
      </div>
    </header>

    <main>
      ${contentHtml}
    </main>
  </div>

  <script>${generateClientScript()}</script>
</body>
</html>`;
}

// =============================================================================
// Public API
// =============================================================================

/**
 * Open the migration report in a new browser tab.
 * @returns true if successful, false if no report exists or popup was blocked
 */
export function openMigrationReportInNewTab(): boolean {
  const report = getMigrationReport();
  if (!report) {
    return false;
  }

  const html = generateHtmlReport(report);

  // Create a Blob URL for the HTML content
  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);

  // Open the Blob URL in a new tab
  const win = window.open(url, "_blank");
  if (!win) {
    // Clean up the URL if window failed to open
    URL.revokeObjectURL(url);
    return false;
  }

  // Clean up the Blob URL after the window loads to prevent memory leaks
  win.addEventListener("load", () => {
    URL.revokeObjectURL(url);
  });

  return true;
}
