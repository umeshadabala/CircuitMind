import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Copy, Check, ExternalLink } from 'lucide-react';

interface MarkdownContentProps {
  content: string;
}

const CodeBlock: React.FC<{ code: string; language?: string }> = ({ code, language }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback if clipboard API is unavailable
      const textArea = document.createElement('textarea');
      textArea.value = code;
      textArea.style.position = 'fixed';
      textArea.style.left = '-9999px';
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } finally {
        document.body.removeChild(textArea);
      }
    }
  };

  return (
    <div className="code-block-wrapper">
      <div className="code-block-header">
        <span className="code-block-lang">{language || 'text'}</span>
        <button 
          className="code-copy-btn" 
          onClick={handleCopy} 
          title="Copy code to clipboard"
          type="button"
        >
          {copied ? <Check size={12} color="#10b981" /> : <Copy size={12} />}
          <span>{copied ? 'Copied!' : 'Copy'}</span>
        </button>
      </div>
      <pre className="code-block-pre">
        <code>{code}</code>
      </pre>
    </div>
  );
};

export const MarkdownContent: React.FC<MarkdownContentProps> = ({ content }) => {
  if (!content) return null;

  return (
    <div className="markdown-rendered-body">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ className, children, ...props }: any) {
            const match = /language-(\w+)/.exec(className || '');
            const codeString = String(children).replace(/\n$/, '');
            const isMultiLine = codeString.includes('\n');
            const isFenced = Boolean(match) || isMultiLine;

            if (isFenced) {
              return <CodeBlock code={codeString} language={match ? match[1] : undefined} />;
            }

            return (
              <code className="inline-code-chip" {...props}>
                {children}
              </code>
            );
          },
          table({ children }) {
            return (
              <div className="table-responsive-wrapper">
                <table className="markdown-table">{children}</table>
              </div>
            );
          },
          a({ href, children }) {
            const isSafe = href && /^(https?:\/\/|mailto:|\/|#)/i.test(href);
            return (
              <a
                href={isSafe ? href : '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="markdown-link"
              >
                <span>{children}</span>
                {isSafe && /^https?:\/\//i.test(href || '') && (
                  <ExternalLink size={10} style={{ marginLeft: '3px', verticalAlign: 'middle', display: 'inline-block' }} />
                )}
              </a>
            );
          },
          blockquote({ children }) {
            return <blockquote className="markdown-blockquote">{children}</blockquote>;
          },
          hr() {
            return <hr className="markdown-hr" />;
          },
          h1({ children }) {
            return <h1 className="markdown-h1">{children}</h1>;
          },
          h2({ children }) {
            return <h2 className="markdown-h2">{children}</h2>;
          },
          h3({ children }) {
            return <h3 className="markdown-h3">{children}</h3>;
          },
          h4({ children }) {
            return <h4 className="markdown-h4">{children}</h4>;
          },
          ul({ children }) {
            return <ul className="markdown-ul">{children}</ul>;
          },
          ol({ children }) {
            return <ol className="markdown-ol">{children}</ol>;
          },
          li({ children }) {
            return <li className="markdown-li">{children}</li>;
          },
          p({ children }) {
            return <p className="markdown-p">{children}</p>;
          }
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};
