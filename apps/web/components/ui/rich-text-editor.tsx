'use client';

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';

// Dynamically import the markdown editor to avoid SSR issues
const MDEditor = dynamic(
  () => import('@uiw/react-md-editor'),
  { 
    ssr: false,
    loading: () => (
      <div className="min-h-[200px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
        <div className="animate-pulse text-muted-foreground">Loading editor...</div>
      </div>
    )
  }
);

interface RichTextEditorProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
  name?: string;
  preview?: 'edit' | 'preview' | 'live';
  height?: number;
}

export function RichTextEditor({
  value = '',
  onChange,
  placeholder = 'Enter description...',
  disabled = false,
  className,
  id,
  name,
  preview = 'edit',
  height = 200,
}: RichTextEditorProps) {
  const { theme, systemTheme } = useTheme();
  const [isMounted, setIsMounted] = useState(false);

  // Ensure component is mounted before rendering to avoid hydration issues
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleChange = (val?: string) => {
    if (onChange) {
      onChange(val || '');
    }
  };

  // Determine if we should use dark mode
  const currentTheme = theme === 'system' ? systemTheme : theme;
  const isDarkMode = currentTheme === 'dark';

  // Don't render until mounted to avoid hydration mismatch
  if (!isMounted) {
    return (
      <div className={cn(
        "min-h-[200px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}>
        <div className="animate-pulse text-muted-foreground">Loading editor...</div>
      </div>
    );
  }

  return (
    <div 
      className={cn("rich-text-editor", className)}
      data-color-mode={isDarkMode ? 'dark' : 'light'}
    >
      <MDEditor
        id={id}
        value={value}
        onChange={handleChange}
        preview={preview}
        height={height}
        data-color-mode={isDarkMode ? 'dark' : 'light'}
        visibleDragBar={false}
        textareaProps={{
          placeholder,
          disabled,
          name,
          style: {
            fontSize: '14px',
            lineHeight: '1.5',
            fontFamily: 'inherit',
          },
        }}
        toolbarHeight={40}
        style={{
          backgroundColor: 'transparent',
        }}
      />
      
      <style jsx global>{`
        .rich-text-editor .w-md-editor {
          background-color: transparent !important;
        }
        
        .rich-text-editor .w-md-editor-text-container,
        .rich-text-editor .w-md-editor-text,
        .rich-text-editor .w-md-editor-text-input,
        .rich-text-editor .w-md-editor-text-textarea {
          background-color: hsl(var(--background)) !important;
          color: hsl(var(--foreground)) !important;
          border-color: hsl(var(--border)) !important;
          font-size: 14px !important;
          line-height: 1.5 !important;
        }
        
        .rich-text-editor .w-md-editor-toolbar {
          background-color: hsl(var(--muted)) !important;
          border-color: hsl(var(--border)) !important;
          border-bottom: 1px solid hsl(var(--border)) !important;
        }
        
        .rich-text-editor .w-md-editor-toolbar button {
          color: hsl(var(--muted-foreground)) !important;
          background-color: transparent !important;
          border: none !important;
        }
        
        .rich-text-editor .w-md-editor-toolbar button:hover {
          background-color: hsl(var(--accent)) !important;
          color: hsl(var(--accent-foreground)) !important;
        }
        
        .rich-text-editor .w-md-editor-toolbar button.active {
          background-color: hsl(var(--primary)) !important;
          color: hsl(var(--primary-foreground)) !important;
        }
        
        .rich-text-editor .w-md-editor-preview {
          background-color: hsl(var(--background)) !important;
          color: hsl(var(--foreground)) !important;
          border-color: hsl(var(--border)) !important;
        }
        
        .rich-text-editor .w-md-editor-preview h1,
        .rich-text-editor .w-md-editor-preview h2,
        .rich-text-editor .w-md-editor-preview h3,
        .rich-text-editor .w-md-editor-preview h4,
        .rich-text-editor .w-md-editor-preview h5,
        .rich-text-editor .w-md-editor-preview h6 {
          color: hsl(var(--foreground)) !important;
          margin-top: 1em !important;
          margin-bottom: 0.5em !important;
        }
        
        .rich-text-editor .w-md-editor-preview p {
          color: hsl(var(--foreground)) !important;
          margin-bottom: 1em !important;
        }
        
        .rich-text-editor .w-md-editor-preview code {
          background-color: hsl(var(--muted)) !important;
          color: hsl(var(--muted-foreground)) !important;
          padding: 0.2em 0.4em !important;
          border-radius: 3px !important;
        }
        
        .rich-text-editor .w-md-editor-preview pre {
          background-color: hsl(var(--muted)) !important;
          border: 1px solid hsl(var(--border)) !important;
          border-radius: 6px !important;
          padding: 1em !important;
        }
        
        .rich-text-editor .w-md-editor-preview blockquote {
          border-left: 4px solid hsl(var(--border)) !important;
          padding-left: 1em !important;
          margin-left: 0 !important;
          color: hsl(var(--muted-foreground)) !important;
        }
        
        .rich-text-editor .w-md-editor-preview ul,
        .rich-text-editor .w-md-editor-preview ol {
          color: hsl(var(--foreground)) !important;
          padding-left: 1.5em !important;
        }
        
        .rich-text-editor .w-md-editor-preview a {
          color: hsl(var(--primary)) !important;
          text-decoration: underline !important;
        }
        
        .rich-text-editor .w-md-editor-preview a:hover {
          color: hsl(var(--primary)) !important;
          opacity: 0.8 !important;
        }
        
        .rich-text-editor .w-md-editor-preview table {
          border-collapse: collapse !important;
          width: 100% !important;
          margin: 1em 0 !important;
        }
        
        .rich-text-editor .w-md-editor-preview table th,
        .rich-text-editor .w-md-editor-preview table td {
          border: 1px solid hsl(var(--border)) !important;
          padding: 0.5em !important;
          text-align: left !important;
        }
        
        .rich-text-editor .w-md-editor-preview table th {
          background-color: hsl(var(--muted)) !important;
          font-weight: 600 !important;
        }
        
        /* Disabled state */
        .rich-text-editor .w-md-editor.disabled {
          opacity: 0.5 !important;
          pointer-events: none !important;
        }
        
        /* Focus states */
        .rich-text-editor .w-md-editor-focus {
          border-color: hsl(var(--ring)) !important;
          outline: 2px solid transparent !important;
          outline-offset: 2px !important;
          box-shadow: 0 0 0 2px hsl(var(--ring)) !important;
        }
        
        /* Custom scrollbar */
        .rich-text-editor .w-md-editor-text-textarea::-webkit-scrollbar,
        .rich-text-editor .w-md-editor-preview::-webkit-scrollbar {
          width: 8px !important;
          height: 8px !important;
        }
        
        .rich-text-editor .w-md-editor-text-textarea::-webkit-scrollbar-track,
        .rich-text-editor .w-md-editor-preview::-webkit-scrollbar-track {
          background: hsl(var(--muted)) !important;
          border-radius: 4px !important;
        }
        
        .rich-text-editor .w-md-editor-text-textarea::-webkit-scrollbar-thumb,
        .rich-text-editor .w-md-editor-preview::-webkit-scrollbar-thumb {
          background: hsl(var(--muted-foreground)) !important;
          border-radius: 4px !important;
        }
        
        .rich-text-editor .w-md-editor-text-textarea::-webkit-scrollbar-thumb:hover,
        .rich-text-editor .w-md-editor-preview::-webkit-scrollbar-thumb:hover {
          background: hsl(var(--foreground)) !important;
        }
      `}</style>
    </div>
  );
}

// For backward compatibility, also export a simpler MarkdownEditor alias
export const MarkdownEditor = RichTextEditor;