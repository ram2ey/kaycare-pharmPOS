interface ClinicalSafetyModalProps {
  isOpen: boolean;
  onClose: () => void;
  loading: boolean;
  report: string;
  cartItemCount: number;
}

export default function ClinicalSafetyModal({
  isOpen,
  onClose,
  loading,
  report,
  cartItemCount,
}: ClinicalSafetyModalProps) {
  if (!isOpen) return null;

  // Simple heuristic parsing of severe/contraindicated keywords in AI output
  const isSevere = report.toLowerCase().includes('severe') || report.toLowerCase().includes('contraindicated') || report.toLowerCase().includes('danger');
  const isModerate = report.toLowerCase().includes('moderate') || report.toLowerCase().includes('caution');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-2xl glass-modal rounded-2xl border border-slate-700/80 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                Clinical AI Safety Screening
                <span className="px-2 py-0.5 text-xs rounded-full bg-emerald-500/20 text-emerald-300 font-mono">
                  {cartItemCount} Medications Evaluated
                </span>
              </h3>
              <p className="text-xs text-slate-400">Real-time Drug-Drug Interaction (DDI) & Contraindication Check</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <div className="w-12 h-12 border-4 border-emerald-500/30 border-t-emerald-400 rounded-full animate-spin"></div>
              <p className="text-sm font-medium text-slate-300">Analyzing medication pharmacology, contraindications, and DDI matrix...</p>
            </div>
          ) : (
            <>
              {/* Severity Banner */}
              <div
                className={`p-4 rounded-xl border flex items-start gap-3.5 ${
                  isSevere
                    ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                    : isModerate
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                    : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                }`}
              >
                <div className="mt-0.5">
                  {isSevere ? (
                    <svg className="w-6 h-6 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  ) : isModerate ? (
                    <svg className="w-6 h-6 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  ) : (
                    <svg className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                </div>
                <div>
                  <h4 className="text-sm font-bold uppercase tracking-wider">
                    {isSevere
                      ? 'Severe Risk Detected — Review Mandatory'
                      : isModerate
                      ? 'Moderate Interaction Alert — Proceed with Caution'
                      : 'Clinical Screening Cleared — Low Risk'}
                  </h4>
                  <p className="text-xs opacity-90 mt-0.5">
                    {isSevere
                      ? 'Potential adverse drug interaction or dosage contraindication detected. Consult dispensing pharmacist.'
                      : isModerate
                      ? 'Monitor patient for standard minor side-effects or dosage timing spacing.'
                      : 'No high-risk contraindications found for the selected drug combination.'}
                  </p>
                </div>
              </div>

              {/* Detailed AI Screening Report */}
              <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 font-mono text-xs leading-relaxed text-slate-300 whitespace-pre-wrap">
                {report}
              </div>

              {/* Pharmacist Disclaimer */}
              <div className="text-[11px] text-slate-500 bg-slate-900/40 p-3 rounded-lg border border-slate-800/60">
                <span className="font-semibold text-slate-400">Notice:</span> AI clinical screening is an advisory decision support tool and does not replace professional clinical judgment by a licensed pharmacist.
              </div>
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-slate-900/60">
          <div className="text-xs text-slate-400">
            Press <span className="kbd-badge">Esc</span> to dismiss
          </div>
          <button onClick={onClose} className="btn-emerald">
            Acknowledge & Close
          </button>
        </div>
      </div>
    </div>
  );
}
