"use client";

import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

// Dynamically import the markdown preview component
const MarkdownPreview = dynamic(() => import("@uiw/react-markdown-preview"), {
  ssr: false,
  loading: () => (
    <div className="text-muted-foreground animate-pulse">Loading...</div>
  ),
});

interface MarkdownViewerProps {
  content: string;
  mode?: "full" | "compact" | "inline";
  maxHeight?: number;
  className?: string;
  showMore?: boolean;
}

export function MarkdownViewer({
  content,
  mode = "full",
  maxHeight,
  className,
  showMore = false,
}: MarkdownViewerProps) {
  const { theme, systemTheme } = useTheme();
  const [isMounted, setIsMounted] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  // Ensure component is mounted before rendering to avoid hydration issues
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Determine if we should use dark mode
  const currentTheme = theme === "system" ? systemTheme : theme;
  const isDarkMode = currentTheme === "dark";

  // Handle empty content
  if (!content || content.trim() === "") {
    return (
      <div className={cn("text-muted-foreground italic", className)}>
        No description
      </div>
    );
  }

  // For inline mode, strip markdown and show plain text
  if (mode === "inline") {
    const plainText = content
      .replace(/[#*`[\]()]/g, "") // Remove markdown characters
      .replace(/\n/g, " ") // Replace newlines with spaces
      .trim();

    return (
      <span
        className={cn("text-sm text-muted-foreground", className)}
        title={plainText}
      >
        {plainText}
      </span>
    );
  }

  // Don't render until mounted to avoid hydration mismatch
  if (!isMounted) {
    return (
      <div className={cn("text-muted-foreground animate-pulse", className)}>
        Loading...
      </div>
    );
  }

  const heightClass =
    mode === "compact"
      ? `max-h-${maxHeight || 24}`
      : maxHeight
        ? `max-h-${maxHeight}`
        : "";

  const shouldTruncate = mode === "compact" && !isExpanded;
  const displayContent =
    shouldTruncate && content.length > 150
      ? content.substring(0, 150) + "..."
      : content;

  return (
    <div
      className={cn(
        "markdown-viewer prose prose-sm dark:prose-invert max-w-none",
        heightClass,
        shouldTruncate && "overflow-hidden",
        className,
      )}
      data-color-mode={isDarkMode ? "dark" : "light"}
    >
      <MarkdownPreview
        source={displayContent}
        style={{
          backgroundColor: "transparent",
          color: "inherit",
        }}
        data-color-mode={isDarkMode ? "dark" : "light"}
      />

      {/* Show more/less toggle for compact mode */}
      {mode === "compact" && showMore && content.length > 150 && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-xs text-primary hover:text-primary/80 mt-1 block"
        >
          {isExpanded ? "Show less" : "Show more"}
        </button>
      )}

      <style jsx global>{`
        .markdown-viewer {
          font-size: 14px !important;
          line-height: 1.5 !important;
        }

        .markdown-viewer .w-md-editor-preview {
          background-color: transparent !important;
          color: inherit !important;
          padding: 0 !important;
          border: none !important;
        }

        .markdown-viewer .w-md-editor-preview > div {
          background-color: transparent !important;
        }

        /* Reset margins for compact display */
        .markdown-viewer.prose {
          font-size: 14px !important;
        }

        .markdown-viewer.prose p {
          margin-top: 0 !important;
          margin-bottom: 0.75em !important;
        }

        .markdown-viewer.prose p:last-child {
          margin-bottom: 0 !important;
        }

        .markdown-viewer.prose h1,
        .markdown-viewer.prose h2,
        .markdown-viewer.prose h3,
        .markdown-viewer.prose h4,
        .markdown-viewer.prose h5,
        .markdown-viewer.prose h6 {
          margin-top: 0.5em !important;
          margin-bottom: 0.25em !important;
          color: hsl(var(--foreground)) !important;
        }

        .markdown-viewer.prose ul,
        .markdown-viewer.prose ol {
          margin-top: 0.5em !important;
          margin-bottom: 0.5em !important;
          padding-left: 1.25em !important;
        }

        .markdown-viewer.prose li {
          margin-top: 0.25em !important;
          margin-bottom: 0.25em !important;
        }

        .markdown-viewer.prose code {
          background-color: hsl(var(--muted)) !important;
          color: hsl(var(--muted-foreground)) !important;
          padding: 0.125rem 0.25rem !important;
          border-radius: 0.25rem !important;
          font-size: 0.875em !important;
        }

        .markdown-viewer.prose pre {
          background-color: hsl(var(--muted)) !important;
          border: 1px solid hsl(var(--border)) !important;
          border-radius: 0.375rem !important;
          padding: 0.75rem !important;
          margin: 0.5rem 0 !important;
          overflow-x: auto !important;
        }

        .markdown-viewer.prose blockquote {
          border-left: 4px solid hsl(var(--border)) !important;
          padding-left: 1rem !important;
          margin: 0.5rem 0 !important;
          color: hsl(var(--muted-foreground)) !important;
          font-style: italic !important;
        }

        .markdown-viewer.prose a {
          color: hsl(var(--primary)) !important;
          text-decoration: underline !important;
        }

        .markdown-viewer.prose a:hover {
          opacity: 0.8 !important;
        }

        .markdown-viewer.prose strong {
          color: hsl(var(--foreground)) !important;
          font-weight: 600 !important;
        }

        .markdown-viewer.prose em {
          color: hsl(var(--foreground)) !important;
          font-style: italic !important;
        }

        .markdown-viewer.prose table {
          border-collapse: collapse !important;
          width: 100% !important;
          margin: 0.75rem 0 !important;
          font-size: 0.875rem !important;
        }

        .markdown-viewer.prose table th,
        .markdown-viewer.prose table td {
          border: 1px solid hsl(var(--border)) !important;
          padding: 0.5rem !important;
          text-align: left !important;
        }

        .markdown-viewer.prose table th {
          background-color: hsl(var(--muted)) !important;
          font-weight: 600 !important;
        }

        .markdown-viewer.prose hr {
          border: none !important;
          border-top: 1px solid hsl(var(--border)) !important;
          margin: 1rem 0 !important;
        }

        /* Compact mode specific styles */
        .markdown-viewer.max-h-24 {
          max-height: 6rem !important;
        }

        .markdown-viewer.max-h-32 {
          max-height: 8rem !important;
        }

        /* Word breaking for long URLs and text */
        .markdown-viewer.prose {
          word-wrap: break-word !important;
          overflow-wrap: break-word !important;
          word-break: break-word !important;
        }

        .markdown-viewer.prose code,
        .markdown-viewer.prose a {
          word-break: break-all !important;
        }
      `}</style>
    </div>
  );
}

// Utility function to strip markdown for plain text display
export function stripMarkdown(content: string): string {
  if (!content) return "";

  return (
    content
      // Remove headers
      .replace(/^#{1,6}\s+/gm, "")
      // Remove bold/italic
      .replace(/\*\*(.*?)\*\*/g, "$1")
      .replace(/\*(.*?)\*/g, "$1")
      .replace(/__(.*?)__/g, "$1")
      .replace(/_(.*?)_/g, "$1")
      // Remove code blocks
      .replace(/```[\s\S]*?```/g, "[code block]")
      .replace(/`(.*?)`/g, "$1")
      // Remove links
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .replace(/\[([^\]]+)\]/g, "$1")
      // Remove images
      .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1")
      // Remove blockquotes
      .replace(/^>\s+/gm, "")
      // Remove list markers
      .replace(/^[\s]*[-*+]\s+/gm, "")
      .replace(/^[\s]*\d+\.\s+/gm, "")
      // Clean up extra whitespace
      .replace(/\n\s*\n/g, "\n")
      .replace(/\n/g, " ")
      .trim()
  );
}

// For backward compatibility
export const MarkdownRenderer = MarkdownViewer;
