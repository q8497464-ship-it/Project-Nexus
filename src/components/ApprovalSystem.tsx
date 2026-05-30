import { CheckCircle2, XCircle, ShieldAlert, Loader2 } from "lucide-react";
import { ApprovalState } from "../types";

interface ApprovalSystemProps {
  approvalState: ApprovalState;
  activePlayerName: string;
  observingPlayerName: string;
  isCurrentTurnOwner: boolean; // active player
  penaltyText?: string;
  onApprove: () => void;
  onReject: () => void;
  onCompletePenalty: () => void;
}

export default function ApprovalSystem({
  approvalState,
  activePlayerName,
  observingPlayerName,
  isCurrentTurnOwner,
  penaltyText,
  onApprove,
  onReject,
  onCompletePenalty
}: ApprovalSystemProps) {

  // Active player is waiting for validation
  if (isCurrentTurnOwner) {
    if (approvalState === "pending") {
      return (
        <div className="w-full max-w-sm rounded-3xl border border-violet-500/20 bg-zinc-950/80 backdrop-blur-xl p-6 text-center flex flex-col items-center gap-4" id="approval-box-active-pending">
          <div className="relative w-16 h-16 flex items-center justify-center" id="loader-ring">
            <span className="absolute inset-0 rounded-full border-2 border-dashed border-violet-500/30 animate-[spin_8s_linear_infinite]" />
            <Loader2 className="w-8 h-8 text-violet-400 animate-spin" />
          </div>
          <div id="active-waiting-labels">
            <h4 className="text-sm font-sans font-medium tracking-widest text-zinc-100 uppercase">
              Verifying Attempt
            </h4>
            <p className="text-xs font-light text-zinc-400 mt-2 max-w-xs mx-auto">
              Please perform the action! <span className="font-semibold text-violet-400">{observingPlayerName}</span> is currently inspecting and judging your performance.
            </p>
          </div>
        </div>
      );
    }

    if (approvalState === "rejected") {
      return (
        <div className="w-full max-w-sm rounded-3xl border border-rose-500/30 bg-rose-500/[0.03] backdrop-blur-xl p-6 text-center flex flex-col items-center gap-4 shadow-[0_0_20px_rgba(244,63,94,0.15)] animate-[bounce_0.5s_ease-out]" id="approval-box-active-rejected">
          <div className="w-12 h-12 rounded-full bg-rose-500/15 flex items-center justify-center border border-rose-500/30 animate-pulse" id="warning-icon-badge">
            <ShieldAlert className="w-6 h-6 text-rose-400" />
          </div>
          <div id="rejection-text-block">
            <h4 className="text-base font-sans tracking-[0.15em] font-semibold text-rose-400 uppercase">
              REJECTED
            </h4>
            <p className="text-xs font-light text-zinc-300 mt-2">
              <span className="font-semibold text-rose-400">{observingPlayerName}</span> did not approve your attempt. You must perform the penalty!
            </p>
          </div>

          <div className="w-full bg-zinc-950/60 border border-rose-500/20 rounded-2xl p-4 text-left my-2" id="rejection-penalty-display">
            <span className="text-[9px] font-mono tracking-widest text-rose-400 uppercase font-semibold">
              ENFORCED PENALTY:
            </span>
            <p className="text-xs text-zinc-200 mt-1 leading-relaxed font-light font-sans">
              {penaltyText || "Perform 10 jumping jacks or pass turn with disgrace!"}
            </p>
          </div>

          <button
            type="button"
            onClick={onCompletePenalty}
            className="w-full py-3 px-4 bg-linear-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-zinc-100 font-sans text-xs tracking-widest uppercase rounded-xl shadow-lg transition-all"
            id="btn-confirm-penalty"
          >
            I Completed This Penalty
          </button>
        </div>
      );
    }

    return null;
  }

  // Observer is verifying active player's attempt
  if (approvalState === "pending") {
    return (
      <div className="w-full max-w-sm rounded-3xl border border-indigo-500/20 bg-zinc-950/80 backdrop-blur-xl p-6 shadow-2xl flex flex-col gap-5 animate-[slideUp_0.3s_ease-out]" id="approval-box-observer-judging">
        
        {/* Verification Title */}
        <div className="text-center" id="observer-title-group">
          <span className="text-[10px] font-mono tracking-widest text-indigo-400 uppercase">
            Active Judgement
          </span>
          <h4 className="text-sm font-sans font-light text-zinc-200 mt-1">
            Did <span className="font-semibold text-zinc-100">{activePlayerName}</span> successfully complete their turn?
          </h4>
        </div>

        {/* Binary Choices */}
        <div className="grid grid-cols-2 gap-3" id="observer-choices-grid">
          {/* Reject trigger */}
          <button
            type="button"
            onClick={onReject}
            className="group flex flex-col items-center gap-2 p-4 rounded-2xl border border-rose-500/20 hover:border-rose-500/40 bg-rose-500/[0.02] hover:bg-rose-500/10 transition-all text-center"
            id="btn-choice-reject"
          >
            <XCircle className="w-8 h-8 text-rose-500 group-hover:scale-110 transition-transform" />
            <div id="btn-text-reject">
              <span className="block text-[11px] font-mono font-semibold text-rose-400 tracking-wider">
                REJECT
              </span>
              <span className="block text-[8px] font-mono text-zinc-500 mt-0.5 uppercase tracking-wide">
                Enf. Penalty
              </span>
            </div>
          </button>

          {/* Approve Trigger */}
          <button
            type="button"
            onClick={onApprove}
            className="group flex flex-col items-center gap-2 p-4 rounded-2xl border border-emerald-500/20 hover:border-emerald-500/40 bg-emerald-500/[0.02] hover:bg-emerald-500/10 transition-all text-center"
            id="btn-choice-approve"
          >
            <CheckCircle2 className="w-8 h-8 text-emerald-500 group-hover:scale-110 transition-transform" />
            <div id="btn-text-approve">
              <span className="block text-[11px] font-mono font-semibold text-emerald-400 tracking-wider">
                APPROVE
              </span>
              <span className="block text-[8px] font-mono text-zinc-500 mt-0.5 uppercase tracking-wide">
                Grant Points
              </span>
            </div>
          </button>
        </div>
      </div>
    );
  }

  // Fallback / idle
  return null;
}
