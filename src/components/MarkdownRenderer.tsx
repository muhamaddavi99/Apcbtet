import ReactMarkdown from 'react-markdown';
import { cn } from '@/lib/utils';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export default function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  // Clean up the content - remove formatting artifacts and hidden action data
  const cleanContent = content
    .replace(/\^\^\^/g, '')  // Remove ^^^ separators
    .replace(/<!-- ACTION_DATA[\s\S]*?ACTION_DATA_END -->/g, '')  // Remove hidden action data
    .replace(/```json\n[\s\S]*?\n```/g, (match) => {
      // Parse and format JSON blocks nicely
      try {
        const jsonContent = match.replace(/```json\n?/, '').replace(/\n?```/, '');
        const parsed = JSON.parse(jsonContent);
        
        // If it's an action object, format it nicely
        if (parsed.action && parsed.data) {
          const actionLabels: Record<string, string> = {
            'create_announcement': '📢 Buat Pengumuman',
            'create_student': '🎓 Tambah Siswa',
            'create_attendance': '📋 Buat Absensi',
            'update_school_settings': '⚙️ Update Pengaturan'
          };
          
          const actionLabel = actionLabels[parsed.action] || parsed.action;
          let formatted = `\n\n**${actionLabel}**\n\n`;
          
          if (parsed.data.title) formatted += `• **Judul:** ${parsed.data.title}\n`;
          if (parsed.data.content) formatted += `• **Isi:** ${parsed.data.content.substring(0, 100)}${parsed.data.content.length > 100 ? '...' : ''}\n`;
          if (parsed.data.priority) formatted += `• **Prioritas:** ${parsed.data.priority === 'high' ? '🔴 Penting' : parsed.data.priority === 'medium' ? '🟡 Sedang' : '🟢 Normal'}\n`;
          if (parsed.data.name) formatted += `• **Nama:** ${parsed.data.name}\n`;
          if (parsed.data.nis) formatted += `• **NIS:** ${parsed.data.nis}\n`;
          
          return formatted;
        }
        
        return match; // Return original if not an action
      } catch {
        return match; // Return original if JSON parsing fails
      }
    })
    .trim();

  return (
    <div className={cn('prose prose-sm dark:prose-invert max-w-none', className)}>
      <ReactMarkdown
        components={{
        // Style headings
        h1: ({ children }) => (
          <h1 className="text-lg font-bold text-foreground mb-2 mt-3 first:mt-0">{children}</h1>
        ),
        h2: ({ children }) => (
          <h2 className="text-base font-semibold text-foreground mb-2 mt-3 first:mt-0">{children}</h2>
        ),
        h3: ({ children }) => (
          <h3 className="text-sm font-semibold text-foreground mb-1.5 mt-2">{children}</h3>
        ),
        // Style paragraphs
        p: ({ children }) => (
          <p className="text-sm text-foreground/90 mb-2 last:mb-0 leading-relaxed">{children}</p>
        ),
        // Style lists
        ul: ({ children }) => (
          <ul className="list-disc list-inside text-sm space-y-1 mb-2 ml-1">{children}</ul>
        ),
        ol: ({ children }) => (
          <ol className="list-decimal list-inside text-sm space-y-1 mb-2 ml-1">{children}</ol>
        ),
        li: ({ children }) => (
          <li className="text-foreground/90">{children}</li>
        ),
        // Style bold and italic
        strong: ({ children }) => (
          <strong className="font-semibold text-foreground">{children}</strong>
        ),
        em: ({ children }) => (
          <em className="italic text-foreground/80">{children}</em>
        ),
        // Style blockquotes
        blockquote: ({ children }) => (
          <blockquote className="border-l-3 border-primary/50 pl-3 my-2 text-foreground/80 bg-muted/30 py-2 pr-2 rounded-r-md italic">
            {children}
          </blockquote>
        ),
        // Style code blocks
        code: ({ children, className }) => {
          const isInline = !className;
          if (isInline) {
            return (
              <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono text-primary">
                {children}
              </code>
            );
          }
          return (
            <code className="block bg-muted p-3 rounded-md text-xs font-mono overflow-x-auto my-2">
              {children}
            </code>
          );
        },
        pre: ({ children }) => (
          <pre className="bg-muted p-3 rounded-md text-xs overflow-x-auto my-2">
            {children}
          </pre>
        ),
        // Style horizontal rules
        hr: () => (
          <hr className="border-border/50 my-3" />
        ),
        // Style tables
        table: ({ children }) => (
          <div className="overflow-x-auto my-2">
            <table className="min-w-full text-sm border-collapse">
              {children}
            </table>
          </div>
        ),
        thead: ({ children }) => (
          <thead className="bg-muted/50">{children}</thead>
        ),
        tbody: ({ children }) => (
          <tbody>{children}</tbody>
        ),
        tr: ({ children }) => (
          <tr className="border-b border-border/30">{children}</tr>
        ),
        th: ({ children }) => (
          <th className="px-2 py-1.5 text-left font-semibold text-foreground text-xs">{children}</th>
        ),
        td: ({ children }) => (
          <td className="px-2 py-1.5 text-foreground/90 text-xs">{children}</td>
        ),
        // Style links
        a: ({ href, children }) => (
          <a 
            href={href} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            {children}
          </a>
        ),
      }}
    >
      {cleanContent}
    </ReactMarkdown>
    </div>
  );
}
