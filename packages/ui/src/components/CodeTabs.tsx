import * as React from "react";
import { X, FileCode2, Circle } from "lucide-react";
import { cn } from "../lib/cn";

export interface CodeTab {
  id: string;
  path: string;
  name: string;
  dirty?: boolean;
}

export interface CodeTabsProps {
  tabs: CodeTab[];
  activeId?: string;
  onSelect: (id: string) => void;
  onClose: (id: string) => void;
  onReorder?: (fromId: string, toId: string) => void;
}

export function CodeTabs({ tabs, activeId, onSelect, onClose, onReorder }: CodeTabsProps) {
  return (
    <div className="flex h-9 shrink-0 items-stretch overflow-x-auto border-b border-hairline bg-canvas-soft">
      {tabs.map((tab) => {
        const active = tab.id === activeId;
        return (
          <div
            key={tab.id}
            draggable={!!onReorder}
            onDragStart={(e) => {
              if (onReorder) e.dataTransfer.setData("text/ride-tab", tab.id);
            }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const fromId = e.dataTransfer.getData("text/ride-tab");
              if (fromId && fromId !== tab.id) onReorder?.(fromId, tab.id);
            }}
            className={cn(
              "group relative flex h-full min-w-0 max-w-56 cursor-pointer items-center gap-1.5 border-r border-hairline px-3 text-[13px] leading-5 transition-colors select-none",
              active ? "bg-canvas text-ink" : "text-mute hover:bg-canvas-soft-2 hover:text-body",
            )}
            onClick={() => onSelect(tab.id)}
          >
            <FileCode2 className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate" title={tab.path}>
              {tab.name}
            </span>
            {tab.dirty ? (
              <Circle className="h-2 w-2 shrink-0 fill-warning text-warning" />
            ) : (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onClose(tab.id);
                }}
                className="flex h-4 w-4 shrink-0 items-center justify-center rounded-sm text-mute opacity-0 transition-opacity group-hover:opacity-100 hover:bg-canvas-soft-2 hover:text-ink"
                title="Close"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
