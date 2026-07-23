import React from "react";
import { ProofingActivity } from "../types/proofing.js";
import { Upload, RefreshCw, Send, MessageSquare, CheckCircle, Trash2, ArrowUpRight, ShieldCheck, Tag, Eye, Heart } from "lucide-react";

interface ProofingTimelineProps {
  activities: ProofingActivity[];
}

export default function ProofingTimeline({ activities }: ProofingTimelineProps) {
  if (!activities || activities.length === 0) {
    return (
      <div className="bg-stone-900/40 backdrop-blur-md rounded-2xl border border-stone-800/60 p-12 text-center">
        <p className="text-stone-400 text-sm font-medium">No activity logged for this album side yet.</p>
      </div>
    );
  }

  const getActivityIcon = (type: ProofingActivity['type']) => {
    switch (type) {
      case 'View':
        return <Eye className="w-4 h-4 text-cyan-400" />;
      case 'Favorite':
        return <Heart className="w-4 h-4 text-rose-400 fill-rose-500/20" />;
      case 'Upload':
        return <Upload className="w-4 h-4 text-emerald-400" />;
      case 'Replace':
        return <RefreshCw className="w-4 h-4 text-amber-400" />;
      case 'Publish':
        return <Send className="w-4 h-4 text-blue-400" />;
      case 'Comment':
        return <MessageSquare className="w-4 h-4 text-purple-400" />;
      case 'Correction':
        return <ArrowUpRight className="w-4 h-4 text-amber-400" />;
      case 'Approve':
        return <CheckCircle className="w-4 h-4 text-emerald-400" />;
      case 'Delete':
        return <Trash2 className="w-4 h-4 text-rose-400" />;
      case 'StatusChange':
        return <Tag className="w-4 h-4 text-amber-300" />;
      default:
        return <ShieldCheck className="w-4 h-4 text-stone-400" />;
    }
  };

  const getTypeColorClass = (type: ProofingActivity['type']) => {
    switch (type) {
      case 'View':
        return "text-cyan-400";
      case 'Favorite':
        return "text-rose-400";
      case 'Upload':
      case 'Approve':
        return "text-emerald-400";
      case 'Comment':
        return "text-purple-400";
      default:
        return "text-amber-400/90";
    }
  };

  return (
    <div className="bg-stone-900/50 backdrop-blur-xl rounded-2xl border border-stone-800/80 p-6 shadow-2xl">
      <h3 className="text-stone-200 text-base font-semibold mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span>Client Activity & Tracking Timeline</span>
          <span className="text-xs bg-stone-800 text-stone-400 px-2.5 py-0.5 rounded-full font-mono">{activities.length} Events</span>
        </div>
      </h3>

      <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-stone-800">
        {activities.map((act) => (
          <div key={act.id} className="relative group">
            <div className="absolute -left-6 top-1 w-6 h-6 rounded-full bg-stone-900 border border-stone-700/80 flex items-center justify-center shadow-md">
              {getActivityIcon(act.type)}
            </div>

            <div className="bg-stone-950/60 border border-stone-800/60 rounded-xl p-4 transition-all hover:border-stone-700/80">
              <div className="flex items-center justify-between gap-4 mb-1">
                <span className={`text-xs font-semibold uppercase tracking-wider ${getTypeColorClass(act.type)}`}>
                  {act.type}
                </span>
                <span className="text-[11px] text-stone-400 font-mono">{new Date(act.createdAt).toLocaleString()}</span>
              </div>
              <p className="text-stone-200 text-sm font-medium leading-relaxed">{act.description}</p>
              <div className="mt-2 text-[11px] text-stone-400 flex items-center gap-1.5">
                <span>By</span>
                <span className="text-stone-300 font-semibold">{act.user}</span>
                <span>• Side: {act.side}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
