'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import {
  Bold,
  Italic,
  Strikethrough,
  Heading1,
  Heading2,
  List,
  ListOrdered,
  Quote,
  Undo,
  Redo,
  Link as LinkIcon,
  ImageIcon,
  X,
  Upload,
  ChevronDown,
  LayoutGrid,
  Table as TableIcon,
  GalleryHorizontal,
  MessageSquareQuote,
} from 'lucide-react';
import { Button } from '../ui/button';
import { useEffect, useState, useCallback, memo } from 'react';
import {
  AccordionBlock,
  TabsBlock,
  SimpleTableBlock,
  ImageCarouselBlock,
  QuoteCarouselBlock,
} from './editor/blockNodes';

/* ---------- Tooltip Component ---------- */
interface TooltipProps {
  children: React.ReactNode;
  content: string;
  shortcut?: string;
}

function Tooltip({ children, content, shortcut }: TooltipProps) {
  return (
    <div className="group/tooltip relative inline-flex">
      {children}
      <div
        role="tooltip"
        className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 px-2 py-1 bg-popover text-popover-foreground text-xs font-medium rounded-md shadow-lg border border-border opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all duration-150 whitespace-nowrap z-50 pointer-events-none"
      >
        <span>{content}</span>
        {shortcut && (
          <kbd className="ml-2 px-1 py-0.5 bg-muted rounded text-[10px] text-muted-foreground">
            {shortcut}
          </kbd>
        )}
        <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-popover" />
      </div>
    </div>
  );
}

/* ---------- Upload Helper ---------- */
async function uploadFileToStorage(file: File): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new globalThis.Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const MAX_WIDTH = 1200;
        if (width > MAX_WIDTH) {
          height = Math.round((height * MAX_WIDTH) / width);
          width = MAX_WIDTH;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/webp', 0.8));
        } else {
          resolve(event.target?.result as string);
        }
      };
      if (event.target?.result) img.src = event.target.result as string;
    };
    reader.readAsDataURL(file);
  });
}

/* ---------- Custom Extensions ---------- */
const CenteredImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      class: {
        default:
          'mx-auto rounded-lg shadow-sm border border-border object-cover max-w-full',
      },
    };
  },
});

/* ---------- Toolbar Button ---------- */
interface ToolbarButtonProps {
  onClick: () => void;
  isActive?: boolean;
  disabled?: boolean;
  tooltip: string;
  shortcut?: string;
  children: React.ReactNode;
  variant?: 'default' | 'insert';
}

const ToolbarButton = memo(function ToolbarButton({
  onClick,
  isActive,
  disabled,
  tooltip,
  shortcut,
  children,
  variant = 'default',
}: ToolbarButtonProps) {
  const baseClasses =
    'h-8 w-8 p-0 transition-all focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-muted';
  const activeClasses = isActive
    ? 'bg-secondary text-secondary-foreground ring-1 ring-primary/20'
    : '';
  const insertClasses =
    variant === 'insert' ? 'hover:bg-primary/10 hover:text-primary' : '';

  return (
    <Tooltip content={tooltip} shortcut={shortcut}>
      <Button
        variant="ghost"
        size="icon"
        onClick={onClick}
        disabled={disabled}
        aria-label={tooltip}
        aria-pressed={isActive}
        className={`${baseClasses} ${activeClasses} ${insertClasses}`}
      >
        {children}
      </Button>
    </Tooltip>
  );
});

/* ---------- Divider ---------- */
function ToolbarDivider() {
  return <div className="w-[1px] h-6 bg-border mx-1" aria-hidden="true" />;
}

/* ---------- Main Editor ---------- */
export function TiptapEditor({
  content,
  onChange,
}: {
  content: string;
  onChange: (html: string) => void;
}) {
  const [showMediaManager, setShowMediaManager] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      CenteredImage,
      Link.configure({ openOnClick: false }),
      Placeholder.configure({ placeholder: 'Tulis ceritamu di sini...' }),
      AccordionBlock,
      TabsBlock,
      SimpleTableBlock,
      ImageCarouselBlock,
      QuoteCarouselBlock,
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
      // Auto-save to localStorage
      localStorage.setItem('ppmh_insight_draft', editor.getHTML());
    },
    editorProps: {
      attributes: {
        class:
          'prose prose-sm sm:prose-base dark:prose-invert max-w-none focus:outline-none min-h-[300px] p-4 bg-background text-foreground rounded-b-xl border-x border-b border-border',
        role: 'textbox',
        'aria-label': 'Rich text editor',
        'aria-multiline': 'true',
      },
    },
  });

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content, { emitUpdate: false });
    }
  }, [content, editor]);

  const handleApplyMedia = useCallback(() => {
    if (imageUrl && editor) {
      editor.chain().focus().setImage({ src: imageUrl }).run();
      setShowMediaManager(false);
      setImageUrl('');
    }
  }, [imageUrl, editor]);

  const handleFileUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        setIsUploading(true);
        try {
          const url = await uploadFileToStorage(file);
          setImageUrl(url);
        } finally {
          setIsUploading(false);
        }
      }
    },
    []
  );

  const handleLinkInsert = useCallback(() => {
    if (!editor) return;
    const url = window.prompt('URL Tautan:');
    if (url === null) return;
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
    } else {
      editor
        .chain()
        .focus()
        .extendMarkRange('link')
        .setLink({ href: url })
        .run();
    }
  }, [editor]);

  if (!editor) return null;

  // Check if cursor is inside specific block types for active state highlighting
  const isInsideAccordion = editor.isActive('accordionBlock');
  const isInsideTabs = editor.isActive('tabsBlock');
  const isInsideTable = editor.isActive('simpleTableBlock');
  const isInsideImageCarousel = editor.isActive('imageCarouselBlock');
  const isInsideQuoteCarousel = editor.isActive('quoteCarouselBlock');

  return (
    <div className="flex flex-col w-full shadow-soft rounded-xl overflow-visible relative z-10">
      {/* Toolbar */}
      <div
        className="flex flex-wrap items-center gap-1 p-2 bg-muted/60 border border-border rounded-t-xl border-b-0 relative"
        role="toolbar"
        aria-label="Text formatting options"
      >
        {/* Text Formatting */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          isActive={editor.isActive('bold')}
          tooltip="Bold"
          shortcut="Ctrl+B"
        >
          <Bold className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          isActive={editor.isActive('italic')}
          tooltip="Italic"
          shortcut="Ctrl+I"
        >
          <Italic className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleStrike().run()}
          isActive={editor.isActive('strike')}
          tooltip="Strikethrough"
          shortcut="Ctrl+Shift+S"
        >
          <Strikethrough className="w-4 h-4" />
        </ToolbarButton>

        <ToolbarDivider />

        {/* Headings */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          isActive={editor.isActive('heading', { level: 1 })}
          tooltip="Heading 1"
          shortcut="Ctrl+Alt+1"
        >
          <Heading1 className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          isActive={editor.isActive('heading', { level: 2 })}
          tooltip="Heading 2"
          shortcut="Ctrl+Alt+2"
        >
          <Heading2 className="w-4 h-4" />
        </ToolbarButton>

        <ToolbarDivider />

        {/* Lists */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          isActive={editor.isActive('bulletList')}
          tooltip="Bullet List"
          shortcut="Ctrl+Shift+8"
        >
          <List className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          isActive={editor.isActive('orderedList')}
          tooltip="Numbered List"
          shortcut="Ctrl+Shift+7"
        >
          <ListOrdered className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          isActive={editor.isActive('blockquote')}
          tooltip="Blockquote"
          shortcut="Ctrl+Shift+B"
        >
          <Quote className="w-4 h-4" />
        </ToolbarButton>

        <ToolbarDivider />

        {/* Link & Media */}
        <ToolbarButton
          onClick={handleLinkInsert}
          isActive={editor.isActive('link')}
          tooltip="Insert Link"
          shortcut="Ctrl+K"
        >
          <LinkIcon className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => setShowMediaManager(!showMediaManager)}
          isActive={showMediaManager}
          tooltip="Insert Image"
        >
          <ImageIcon className="w-4 h-4" />
        </ToolbarButton>

        <ToolbarDivider />

        {/* Block Inserts */}
        <ToolbarButton
          onClick={() =>
            editor.chain().focus().insertContent({ type: 'accordionBlock' }).run()
          }
          isActive={isInsideAccordion}
          tooltip="Insert Accordion"
          variant="insert"
        >
          <ChevronDown className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() =>
            editor.chain().focus().insertContent({ type: 'tabsBlock' }).run()
          }
          isActive={isInsideTabs}
          tooltip="Insert Tabs"
          variant="insert"
        >
          <LayoutGrid className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() =>
            editor.chain().focus().insertContent({ type: 'simpleTableBlock' }).run()
          }
          isActive={isInsideTable}
          tooltip="Insert Table"
          variant="insert"
        >
          <TableIcon className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() =>
            editor.chain().focus().insertContent({ type: 'imageCarouselBlock' }).run()
          }
          isActive={isInsideImageCarousel}
          tooltip="Insert Image Carousel"
          variant="insert"
        >
          <GalleryHorizontal className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() =>
            editor.chain().focus().insertContent({ type: 'quoteCarouselBlock' }).run()
          }
          isActive={isInsideQuoteCarousel}
          tooltip="Insert Quote Carousel"
          variant="insert"
        >
          <MessageSquareQuote className="w-4 h-4" />
        </ToolbarButton>

        <div className="flex-1" />

        {/* Undo/Redo */}
        <ToolbarButton
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          tooltip="Undo"
          shortcut="Ctrl+Z"
        >
          <Undo className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          tooltip="Redo"
          shortcut="Ctrl+Shift+Z"
        >
          <Redo className="w-4 h-4" />
        </ToolbarButton>
      </div>

      {/* Media Manager Popup */}
      {showMediaManager && (
        <div
          className="absolute top-14 left-4 right-4 bg-card border border-border shadow-2xl rounded-2xl p-4 z-50 flex flex-col gap-4 mx-auto max-w-sm"
          role="dialog"
          aria-label="Media manager"
          aria-modal="true"
        >
          <div className="flex justify-between items-center">
            <h4 className="font-bold text-sm text-foreground">Media Manager</h4>
            <button
              onClick={() => setShowMediaManager(false)}
              className="text-muted-foreground hover:text-foreground p-1 rounded-md transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              aria-label="Close media manager"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="image-url-input" className="sr-only">
              Image URL
            </label>
            <input
              id="image-url-input"
              type="text"
              placeholder="Paste Image URL here..."
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              className="w-full bg-background text-foreground placeholder:text-muted-foreground border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">
                  atau upload
                </span>
              </div>
            </div>
            <label className="flex items-center justify-center gap-2 w-full bg-secondary text-secondary-foreground hover:bg-secondary/80 px-4 py-2 rounded-xl text-sm font-semibold cursor-pointer transition-colors border border-border border-dashed relative focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2">
              {isUploading ? (
                'Uploading...'
              ) : (
                <>
                  <Upload className="w-4 h-4" /> Pilih File Local
                </>
              )}
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={handleFileUpload}
                disabled={isUploading}
              />
            </label>
          </div>
          <Button
            onClick={handleApplyMedia}
            disabled={!imageUrl || isUploading}
            className="w-full rounded-xl mt-1"
          >
            Sisipkan Gambar
          </Button>
        </div>
      )}

      <EditorContent editor={editor} className="flex-1 min-h-[300px]" />
    </div>
  );
}
