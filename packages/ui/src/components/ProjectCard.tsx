import * as React from "react";
import { motion } from "motion/react";
import { ArrowRight, FolderOpen, Layers, TerminalSquare } from "lucide-react";
import { cn } from "../lib/cn";

export interface Blueprint {
  id: string;
  name: string;
  description: string;
  icon?: React.ReactNode;
  tags?: string[];
}

export interface ProjectCardProps {
  blueprint: Blueprint;
  onSelect: (id: string) => void;
  selected?: boolean;
  onOpenExisting?: () => void;
}

export function ProjectCard({ blueprint, onSelect, selected, onOpenExisting }: ProjectCardProps) {
  return (
    <motion.button
      whileHover={{ y: -2 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
      onClick={() => onSelect(blueprint.id)}
      className={cn(
        "flex w-full flex-col items-start gap-2 rounded-md border bg-canvas p-4 text-left transition-colors ride-focus-ring",
        selected
          ? "border-link shadow-level-4"
          : "border-hairline shadow-level-2 hover:border-hairline-strong",
      )}
    >
      <span
        className={cn(
          "flex h-9 w-9 items-center justify-center rounded-md",
          selected ? "bg-link/10 text-link" : "bg-canvas-soft text-body",
        )}
      >
        {blueprint.icon ?? <Layers className="h-4.5 w-4.5" />}
      </span>
      <span className="text-sm font-medium text-ink">{blueprint.name}</span>
      <span className="text-xs leading-5 text-mute">{blueprint.description}</span>
      {blueprint.tags && (
        <span className="flex flex-wrap gap-1">
          {blueprint.tags.map((t) => (
            <span
              key={t}
              className="rounded-full bg-canvas-soft px-2 py-0.5 text-[10px] text-mute"
            >
              {t}
            </span>
          ))}
        </span>
      )}
      {onOpenExisting && (
        <span
          className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-link"
          onClick={(e) => {
            e.stopPropagation();
            onOpenExisting();
          }}
        >
          <FolderOpen className="h-3.5 w-3.5" /> Open existing project
          <ArrowRight className="h-3 w-3" />
        </span>
      )}
      {blueprint.id === "custom" && (
        <span className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-link">
          <TerminalSquare className="h-3.5 w-3.5" /> Start from blank folder
          <ArrowRight className="h-3 w-3" />
        </span>
      )}
    </motion.button>
  );
}
