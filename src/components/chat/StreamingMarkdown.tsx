/**
 * StreamingMarkdown - Renders markdown content with streaming support
 * Simple implementation that handles basic markdown formatting
 */

import { useMemo } from 'react';
import { cn } from '../../lib/utils';

interface StreamingMarkdownProps {
  content: string;
  isStreaming?: boolean;
}

export function StreamingMarkdown({ content, isStreaming }: StreamingMarkdownProps) {
  // Simple markdown parsing
  const rendered = useMemo(() => {
    if (!content) return null;

    // Split by code blocks first
    const parts = content.split(/(```[\s\S]*?```)/);

    return parts.map((part, index) => {
      // Handle code blocks
      if (part.startsWith('```')) {
        const match = part.match(/```(\w+)?\n?([\s\S]*?)```/);
        if (match) {
          const language = match[1] || '';
          const code = match[2] || '';
          return (
            <div key={index} className="my-3">
              {language && (
                <div className="bg-gray-700 text-gray-300 text-xs px-3 py-1 rounded-t-lg">
                  {language}
                </div>
              )}
              <pre
                className={cn(
                  "bg-gray-800 text-gray-100 p-3 overflow-x-auto text-sm",
                  language ? "rounded-b-lg" : "rounded-lg"
                )}
              >
                <code>{code}</code>
              </pre>
            </div>
          );
        }
      }

      // Handle regular text with inline formatting
      return <TextContent key={index} content={part} />;
    });
  }, [content]);

  return (
    <div className={cn(
      "prose prose-sm dark:prose-invert max-w-none",
      "prose-p:my-2 prose-p:leading-relaxed",
      "prose-pre:my-0 prose-pre:p-0 prose-pre:bg-transparent",
      "prose-code:px-1 prose-code:py-0.5 prose-code:bg-gray-100 prose-code:dark:bg-gray-700 prose-code:rounded prose-code:text-sm prose-code:before:content-none prose-code:after:content-none",
      "prose-ul:my-2 prose-ol:my-2",
      "prose-li:my-0.5",
      "text-gray-900 dark:text-gray-100"
    )}>
      {rendered}
      {isStreaming && (
        <span className="inline-block w-2 h-4 bg-gray-400 dark:bg-gray-500 animate-pulse ml-0.5" />
      )}
    </div>
  );
}

function TextContent({ content }: { content: string }) {
  // Split into paragraphs
  const paragraphs = content.split(/\n\n+/);

  return (
    <>
      {paragraphs.map((paragraph, pIndex) => {
        // Skip empty paragraphs
        if (!paragraph.trim()) return null;

        // Check for headers
        const headerMatch = paragraph.match(/^(#{1,6})\s+(.+)$/m);
        if (headerMatch) {
          const level = headerMatch[1].length;
          const text = headerMatch[2];
          // Render headers with appropriate styles
          const headerClass = level === 1 
            ? "text-2xl font-bold mt-4 mb-2" 
            : level === 2 
              ? "text-xl font-semibold mt-4 mb-2"
              : "text-lg font-semibold mt-3 mb-2";
          return (
            <div key={pIndex} className={headerClass}>
              <InlineFormatting text={text} />
            </div>
          );
        }

        // Check for bullet lists
        if (paragraph.match(/^[-*]\s/m)) {
          const items = paragraph.split(/\n/).filter((l) => l.trim());
          return (
            <ul key={pIndex} className="list-disc pl-4 my-2">
              {items.map((item, iIndex) => (
                <li key={iIndex}>
                  <InlineFormatting text={item.replace(/^[-*]\s/, '')} />
                </li>
              ))}
            </ul>
          );
        }

        // Check for numbered lists
        if (paragraph.match(/^\d+\.\s/m)) {
          const items = paragraph.split(/\n/).filter((l) => l.trim());
          return (
            <ol key={pIndex} className="list-decimal pl-4 my-2">
              {items.map((item, iIndex) => (
                <li key={iIndex}>
                  <InlineFormatting text={item.replace(/^\d+\.\s/, '')} />
                </li>
              ))}
            </ol>
          );
        }

        // Regular paragraph
        return (
          <p key={pIndex} className="my-2">
            <InlineFormatting text={paragraph} />
          </p>
        );
      })}
    </>
  );
}

function InlineFormatting({ text }: { text: string }) {
  // Handle inline code, bold, italic
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/);

  return (
    <>
      {parts.map((part, index) => {
        // Inline code
        if (part.startsWith('`') && part.endsWith('`')) {
          return (
            <code
              key={index}
              className="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-sm"
            >
              {part.slice(1, -1)}
            </code>
          );
        }

        // Bold
        if (part.startsWith('**') && part.endsWith('**')) {
          return (
            <strong key={index} className="font-semibold">
              {part.slice(2, -2)}
            </strong>
          );
        }

        // Italic
        if (part.startsWith('*') && part.endsWith('*')) {
          return <em key={index}>{part.slice(1, -1)}</em>;
        }

        // Handle line breaks within paragraphs
        return part.split('\n').map((line, lineIndex) => (
          <span key={`${index}-${lineIndex}`}>
            {lineIndex > 0 && <br />}
            {line}
          </span>
        ));
      })}
    </>
  );
}
