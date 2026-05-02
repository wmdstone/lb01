import React, { useCallback, memo } from 'react';
import { Node, mergeAttributes } from '@tiptap/core';
import {
  ReactNodeViewRenderer,
  NodeViewWrapper,
  NodeViewProps,
} from '@tiptap/react';
import {
  ChevronDown,
  Plus,
  Trash2,
  GripVertical,
  Image as ImageIcon,
  Quote,
} from 'lucide-react';

/* =====================================================================
 * Shared helpers
 * =====================================================================*/

interface TextFieldProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
  label?: string;
}

const TextField = memo(function TextField({
  value,
  onChange,
  placeholder,
  className = '',
  label,
}: TextFieldProps) {
  return (
    <>
      {label && <label className="sr-only">{label}</label>}
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={label || placeholder}
        className={
          'w-full bg-background text-foreground placeholder:text-muted-foreground border border-border rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 touch-manipulation ' +
          className
        }
      />
    </>
  );
});

interface TextAreaProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
  label?: string;
}

const TextArea = memo(function TextArea({
  value,
  onChange,
  placeholder,
  rows = 3,
  label,
}: TextAreaProps) {
  return (
    <>
      {label && <label className="sr-only">{label}</label>}
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        aria-label={label || placeholder}
        className="w-full bg-background text-foreground placeholder:text-muted-foreground border border-border rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 resize-y touch-manipulation"
      />
    </>
  );
});

interface BlockShellProps {
  label: string;
  onDelete: () => void;
  children: React.ReactNode;
}

function BlockShell({ label, onDelete, children }: BlockShellProps) {
  return (
    <NodeViewWrapper className="my-4">
      <div
        className="rounded-xl border border-border bg-card text-card-foreground shadow-sm overflow-hidden"
        role="region"
        aria-label={`${label} block`}
      >
        <div className="flex items-center justify-between gap-2 px-3 py-2 bg-muted/60 border-b border-border">
          <div
            className="flex items-center gap-1.5 text-[11px] uppercase tracking-widest font-semibold text-muted-foreground cursor-grab active:cursor-grabbing touch-manipulation select-none"
            data-drag-handle
          >
            <GripVertical className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{label}</span>
          </div>
          <button
            type="button"
            onClick={onDelete}
            className="text-muted-foreground hover:text-destructive p-1.5 rounded-md transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-destructive touch-manipulation"
            aria-label={`Delete ${label} block`}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="p-3">{children}</div>
      </div>
    </NodeViewWrapper>
  );
}

/* ---------- Add Item Button ---------- */
interface AddItemButtonProps {
  onClick: () => void;
  children: React.ReactNode;
}

const AddItemButton = memo(function AddItemButton({
  onClick,
  children,
}: AddItemButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 touch-manipulation py-1"
    >
      <Plus className="w-3.5 h-3.5" aria-hidden="true" />
      {children}
    </button>
  );
});

/* ---------- Delete Item Button ---------- */
interface DeleteItemButtonProps {
  onClick: () => void;
  label: string;
}

const DeleteItemButton = memo(function DeleteItemButton({
  onClick,
  label,
}: DeleteItemButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-muted-foreground hover:text-destructive p-1.5 rounded-md transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-destructive touch-manipulation shrink-0"
      aria-label={label}
    >
      <Trash2 className="w-4 h-4" />
    </button>
  );
});

/* =====================================================================
 * Accordion
 * =====================================================================*/

type AccordionItem = { title: string; body: string };

function AccordionView({ node, updateAttributes, deleteNode }: NodeViewProps) {
  const items: AccordionItem[] = node.attrs.items || [];

  const update = useCallback(
    (next: AccordionItem[]) => updateAttributes({ items: next }),
    [updateAttributes]
  );

  const handleUpdateItem = useCallback(
    (index: number, field: keyof AccordionItem, value: string) => {
      update(
        items.map((x, j) => (j === index ? { ...x, [field]: value } : x))
      );
    },
    [items, update]
  );

  const handleDeleteItem = useCallback(
    (index: number) => {
      update(items.filter((_, j) => j !== index));
    },
    [items, update]
  );

  const handleAddItem = useCallback(() => {
    update([...items, { title: 'Item baru', body: '' }]);
  }, [items, update]);

  return (
    <BlockShell label="Accordion" onDelete={deleteNode}>
      <div className="space-y-2" role="list" aria-label="Accordion items">
        {items.map((it, i) => (
          <div
            key={i}
            className="rounded-md border border-border p-2 space-y-2 bg-background"
            role="listitem"
          >
            <div className="flex items-center gap-2">
              <TextField
                value={it.title}
                onChange={(v) => handleUpdateItem(i, 'title', v)}
                placeholder="Judul item..."
                label={`Accordion item ${i + 1} title`}
              />
              <DeleteItemButton
                onClick={() => handleDeleteItem(i)}
                label={`Delete accordion item ${i + 1}`}
              />
            </div>
            <TextArea
              value={it.body}
              onChange={(v) => handleUpdateItem(i, 'body', v)}
              placeholder="Isi item..."
              label={`Accordion item ${i + 1} content`}
            />
          </div>
        ))}
        <AddItemButton onClick={handleAddItem}>Tambah Item</AddItemButton>
      </div>
    </BlockShell>
  );
}

export const AccordionBlock = Node.create({
  name: 'accordionBlock',
  group: 'block',
  atom: true,
  draggable: true,
  addAttributes() {
    return { items: { default: [{ title: 'Pertanyaan', body: 'Jawaban...' }] } };
  },
  parseHTML() {
    return [
      {
        tag: 'div[data-block="accordion"]',
        getAttrs: (el) => {
          try {
            return {
              items: JSON.parse(
                (el as HTMLElement).getAttribute('data-items') || '[]'
              ),
            };
          } catch {
            return { items: [] };
          }
        },
      },
    ];
  },
  renderHTML({ HTMLAttributes, node }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        'data-block': 'accordion',
        'data-items': JSON.stringify(node.attrs.items || []),
      }),
    ];
  },
  addNodeView() {
    return ReactNodeViewRenderer(AccordionView);
  },
});

/* =====================================================================
 * Tabs
 * =====================================================================*/

type TabItem = { label: string; body: string };

function TabsView({ node, updateAttributes, deleteNode }: NodeViewProps) {
  const items: TabItem[] = node.attrs.items || [];
  const [active, setActive] = React.useState(0);

  const update = useCallback(
    (next: TabItem[]) => updateAttributes({ items: next }),
    [updateAttributes]
  );

  const cur = Math.min(active, Math.max(0, items.length - 1));

  const handleUpdateItem = useCallback(
    (index: number, field: keyof TabItem, value: string) => {
      update(items.map((x, j) => (j === index ? { ...x, [field]: value } : x)));
    },
    [items, update]
  );

  const handleDeleteTab = useCallback(() => {
    update(items.filter((_, j) => j !== cur));
    setActive(0);
  }, [items, cur, update]);

  const handleAddTab = useCallback(() => {
    update([...items, { label: `Tab ${items.length + 1}`, body: '' }]);
    setActive(items.length);
  }, [items, update]);

  return (
    <BlockShell label="Tabs" onDelete={deleteNode}>
      <div className="space-y-3">
        <div
          className="flex flex-wrap gap-1 border-b border-border pb-2 overflow-x-auto scrollbar-hide touch-pan-x"
          role="tablist"
          aria-label="Tab navigation"
        >
          {items.map((it, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setActive(i)}
              role="tab"
              aria-selected={i === cur}
              aria-controls={`tabpanel-editor-${i}`}
              id={`tab-editor-${i}`}
              tabIndex={i === cur ? 0 : -1}
              className={
                'px-3 py-1.5 text-xs rounded-md font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary touch-manipulation whitespace-nowrap ' +
                (i === cur
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/70')
              }
            >
              {it.label || `Tab ${i + 1}`}
            </button>
          ))}
          <button
            type="button"
            onClick={handleAddTab}
            className="px-2 py-1.5 text-xs rounded-md text-primary hover:bg-primary/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary touch-manipulation"
            aria-label="Add new tab"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
        {items[cur] && (
          <div
            className="space-y-2"
            role="tabpanel"
            id={`tabpanel-editor-${cur}`}
            aria-labelledby={`tab-editor-${cur}`}
          >
            <div className="flex items-center gap-2">
              <TextField
                value={items[cur].label}
                onChange={(v) => handleUpdateItem(cur, 'label', v)}
                placeholder="Label tab..."
                label={`Tab ${cur + 1} label`}
              />
              <DeleteItemButton
                onClick={handleDeleteTab}
                label={`Delete tab ${cur + 1}`}
              />
            </div>
            <TextArea
              value={items[cur].body}
              onChange={(v) => handleUpdateItem(cur, 'body', v)}
              placeholder="Konten tab..."
              rows={5}
              label={`Tab ${cur + 1} content`}
            />
          </div>
        )}
      </div>
    </BlockShell>
  );
}

export const TabsBlock = Node.create({
  name: 'tabsBlock',
  group: 'block',
  atom: true,
  draggable: true,
  addAttributes() {
    return {
      items: { default: [{ label: 'Tab 1', body: '' }, { label: 'Tab 2', body: '' }] },
    };
  },
  parseHTML() {
    return [
      {
        tag: 'div[data-block="tabs"]',
        getAttrs: (el) => {
          try {
            return {
              items: JSON.parse(
                (el as HTMLElement).getAttribute('data-items') || '[]'
              ),
            };
          } catch {
            return { items: [] };
          }
        },
      },
    ];
  },
  renderHTML({ HTMLAttributes, node }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        'data-block': 'tabs',
        'data-items': JSON.stringify(node.attrs.items || []),
      }),
    ];
  },
  addNodeView() {
    return ReactNodeViewRenderer(TabsView);
  },
});

/* =====================================================================
 * Simple Table
 * =====================================================================*/

function SimpleTableView({ node, updateAttributes, deleteNode }: NodeViewProps) {
  const headers: string[] = node.attrs.headers || [];
  const rows: string[][] = node.attrs.rows || [];
  const [showScrollHint, setShowScrollHint] = React.useState(false);
  const tableContainerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const container = tableContainerRef.current;
    if (!container) return;

    const checkOverflow = () => {
      const hasOverflow = container.scrollWidth > container.clientWidth;
      setShowScrollHint(hasOverflow);
    };

    checkOverflow();
    const resizeObserver = new ResizeObserver(checkOverflow);
    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, [headers, rows]);

  const setHeaders = useCallback(
    (next: string[]) => updateAttributes({ headers: next }),
    [updateAttributes]
  );

  const setRows = useCallback(
    (next: string[][]) => updateAttributes({ rows: next }),
    [updateAttributes]
  );

  const addCol = useCallback(() => {
    setHeaders([...headers, `Kolom ${headers.length + 1}`]);
    setRows(rows.map((r) => [...r, '']));
  }, [headers, rows, setHeaders, setRows]);

  const removeCol = useCallback(
    (idx: number) => {
      setHeaders(headers.filter((_, i) => i !== idx));
      setRows(rows.map((r) => r.filter((_, i) => i !== idx)));
    },
    [headers, rows, setHeaders, setRows]
  );

  const addRow = useCallback(() => {
    setRows([...rows, headers.map(() => '')]);
  }, [headers, rows, setRows]);

  const removeRow = useCallback(
    (idx: number) => {
      setRows(rows.filter((_, i) => i !== idx));
    },
    [rows, setRows]
  );

  const updateHeader = useCallback(
    (idx: number, value: string) => {
      setHeaders(headers.map((x, j) => (j === idx ? value : x)));
    },
    [headers, setHeaders]
  );

  const updateCell = useCallback(
    (rowIdx: number, colIdx: number, value: string) => {
      setRows(
        rows.map((row, j) =>
          j === rowIdx ? row.map((c, k) => (k === colIdx ? value : c)) : row
        )
      );
    },
    [rows, setRows]
  );

  return (
    <BlockShell label="Simple Table" onDelete={deleteNode}>
      <div className="space-y-2">
        {/* Scroll hint indicator */}
        {showScrollHint && (
          <div className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
            <span className="animate-pulse">Swipe to see more columns</span>
          </div>
        )}
        <div
          ref={tableContainerRef}
          className="overflow-x-auto rounded-md border border-border touch-pan-x"
          role="region"
          aria-label="Editable table"
        >
          <table className="w-full text-sm">
            <thead className="bg-muted/60">
              <tr>
                {headers.map((h, i) => (
                  <th
                    key={i}
                    className="p-1.5 border-b border-border min-w-[140px]"
                    scope="col"
                  >
                    <div className="flex items-center gap-1">
                      <TextField
                        value={h}
                        onChange={(v) => updateHeader(i, v)}
                        placeholder={`Kolom ${i + 1}`}
                        label={`Column ${i + 1} header`}
                      />
                      <DeleteItemButton
                        onClick={() => removeCol(i)}
                        label={`Delete column ${i + 1}`}
                      />
                    </div>
                  </th>
                ))}
                <th className="p-1.5 border-b border-border w-10">
                  <button
                    type="button"
                    onClick={addCol}
                    className="text-primary hover:bg-primary/10 rounded p-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary touch-manipulation"
                    aria-label="Add column"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, ri) => (
                <tr key={ri} className="border-b border-border last:border-0">
                  {headers.map((_, ci) => (
                    <td key={ci} className="p-1.5 align-top">
                      <TextField
                        value={r[ci] ?? ''}
                        onChange={(v) => updateCell(ri, ci, v)}
                        placeholder="—"
                        label={`Row ${ri + 1}, Column ${ci + 1}`}
                      />
                    </td>
                  ))}
                  <td className="p-1.5 text-center align-middle">
                    <DeleteItemButton
                      onClick={() => removeRow(ri)}
                      label={`Delete row ${ri + 1}`}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <AddItemButton onClick={addRow}>Tambah Baris</AddItemButton>
      </div>
    </BlockShell>
  );
}

export const SimpleTableBlock = Node.create({
  name: 'simpleTableBlock',
  group: 'block',
  atom: true,
  draggable: true,
  addAttributes() {
    return {
      headers: { default: ['Kolom 1', 'Kolom 2'] },
      rows: { default: [['', ''], ['', '']] },
    };
  },
  parseHTML() {
    return [
      {
        tag: 'div[data-block="simple-table"]',
        getAttrs: (el) => {
          try {
            return {
              headers: JSON.parse(
                (el as HTMLElement).getAttribute('data-headers') || '[]'
              ),
              rows: JSON.parse(
                (el as HTMLElement).getAttribute('data-rows') || '[]'
              ),
            };
          } catch {
            return { headers: [], rows: [] };
          }
        },
      },
    ];
  },
  renderHTML({ HTMLAttributes, node }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        'data-block': 'simple-table',
        'data-headers': JSON.stringify(node.attrs.headers || []),
        'data-rows': JSON.stringify(node.attrs.rows || []),
      }),
    ];
  },
  addNodeView() {
    return ReactNodeViewRenderer(SimpleTableView);
  },
});

/* =====================================================================
 * Image Carousel
 * =====================================================================*/

type ImgItem = { src: string; alt?: string; caption?: string };

function ImageCarouselView({ node, updateAttributes, deleteNode }: NodeViewProps) {
  const items: ImgItem[] = node.attrs.items || [];

  const update = useCallback(
    (next: ImgItem[]) => updateAttributes({ items: next }),
    [updateAttributes]
  );

  const handleUpdateItem = useCallback(
    (index: number, field: keyof ImgItem, value: string) => {
      update(items.map((x, j) => (j === index ? { ...x, [field]: value } : x)));
    },
    [items, update]
  );

  const handleDeleteItem = useCallback(
    (index: number) => {
      update(items.filter((_, j) => j !== index));
    },
    [items, update]
  );

  const handleAddItem = useCallback(() => {
    update([...items, { src: '', alt: '', caption: '' }]);
  }, [items, update]);

  const handleUpload = useCallback(
    async (index: number, file: File) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const dataUrl = ev.target?.result as string;
        update(
          items.map((x, j) => (j === index ? { ...x, src: dataUrl } : x))
        );
      };
      reader.readAsDataURL(file);
    },
    [items, update]
  );

  return (
    <BlockShell label="Carousel Gambar" onDelete={deleteNode}>
      <div className="space-y-2" role="list" aria-label="Carousel images">
        {items.map((it, i) => (
          <div
            key={i}
            className="rounded-md border border-border p-2 space-y-2 bg-background"
            role="listitem"
          >
            <div className="flex items-center gap-2">
              <ImageIcon
                className="w-4 h-4 text-muted-foreground shrink-0"
                aria-hidden="true"
              />
              <TextField
                value={it.src}
                onChange={(v) => handleUpdateItem(i, 'src', v)}
                placeholder="URL gambar..."
                label={`Image ${i + 1} URL`}
              />
              <label className="text-xs text-primary cursor-pointer hover:underline shrink-0 focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2 rounded px-1">
                Upload
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleUpload(i, f);
                    e.target.value = '';
                  }}
                />
              </label>
              <DeleteItemButton
                onClick={() => handleDeleteItem(i)}
                label={`Delete image ${i + 1}`}
              />
            </div>
            <TextField
              value={it.alt || ''}
              onChange={(v) => handleUpdateItem(i, 'alt', v)}
              placeholder="Alt text (aksesibilitas)..."
              label={`Image ${i + 1} alt text`}
            />
            <TextField
              value={it.caption || ''}
              onChange={(v) => handleUpdateItem(i, 'caption', v)}
              placeholder="Caption (opsional)..."
              label={`Image ${i + 1} caption`}
            />
            {it.src && (
              <div className="relative w-full aspect-video bg-muted rounded overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={it.src}
                  alt={it.alt || ''}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
          </div>
        ))}
        <AddItemButton onClick={handleAddItem}>Tambah Gambar</AddItemButton>
      </div>
    </BlockShell>
  );
}

export const ImageCarouselBlock = Node.create({
  name: 'imageCarouselBlock',
  group: 'block',
  atom: true,
  draggable: true,
  addAttributes() {
    return { items: { default: [] as ImgItem[] } };
  },
  parseHTML() {
    return [
      {
        tag: 'div[data-block="image-carousel"]',
        getAttrs: (el) => {
          try {
            return {
              items: JSON.parse(
                (el as HTMLElement).getAttribute('data-items') || '[]'
              ),
            };
          } catch {
            return { items: [] };
          }
        },
      },
    ];
  },
  renderHTML({ HTMLAttributes, node }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        'data-block': 'image-carousel',
        'data-items': JSON.stringify(node.attrs.items || []),
      }),
    ];
  },
  addNodeView() {
    return ReactNodeViewRenderer(ImageCarouselView);
  },
});

/* =====================================================================
 * Quote Carousel
 * =====================================================================*/

type QuoteItem = { quote: string; attribution?: string };

function QuoteCarouselView({ node, updateAttributes, deleteNode }: NodeViewProps) {
  const items: QuoteItem[] = node.attrs.items || [];

  const update = useCallback(
    (next: QuoteItem[]) => updateAttributes({ items: next }),
    [updateAttributes]
  );

  const handleUpdateItem = useCallback(
    (index: number, field: keyof QuoteItem, value: string) => {
      update(items.map((x, j) => (j === index ? { ...x, [field]: value } : x)));
    },
    [items, update]
  );

  const handleDeleteItem = useCallback(
    (index: number) => {
      update(items.filter((_, j) => j !== index));
    },
    [items, update]
  );

  const handleAddItem = useCallback(() => {
    update([...items, { quote: '', attribution: '' }]);
  }, [items, update]);

  return (
    <BlockShell label="Carousel Kutipan" onDelete={deleteNode}>
      <div className="space-y-2" role="list" aria-label="Carousel quotes">
        {items.map((it, i) => (
          <div
            key={i}
            className="rounded-md border border-border p-2 space-y-2 bg-background"
            role="listitem"
          >
            <div className="flex items-start gap-2">
              <Quote
                className="w-4 h-4 text-primary mt-2 shrink-0"
                aria-hidden="true"
              />
              <div className="flex-1 space-y-2">
                <TextArea
                  value={it.quote}
                  onChange={(v) => handleUpdateItem(i, 'quote', v)}
                  placeholder="Kutipan..."
                  label={`Quote ${i + 1} text`}
                />
                <TextField
                  value={it.attribution || ''}
                  onChange={(v) => handleUpdateItem(i, 'attribution', v)}
                  placeholder="Atribusi (nama, jabatan)..."
                  label={`Quote ${i + 1} attribution`}
                />
              </div>
              <DeleteItemButton
                onClick={() => handleDeleteItem(i)}
                label={`Delete quote ${i + 1}`}
              />
            </div>
          </div>
        ))}
        <AddItemButton onClick={handleAddItem}>Tambah Kutipan</AddItemButton>
      </div>
    </BlockShell>
  );
}

export const QuoteCarouselBlock = Node.create({
  name: 'quoteCarouselBlock',
  group: 'block',
  atom: true,
  draggable: true,
  addAttributes() {
    return { items: { default: [] as QuoteItem[] } };
  },
  parseHTML() {
    return [
      {
        tag: 'div[data-block="quote-carousel"]',
        getAttrs: (el) => {
          try {
            return {
              items: JSON.parse(
                (el as HTMLElement).getAttribute('data-items') || '[]'
              ),
            };
          } catch {
            return { items: [] };
          }
        },
      },
    ];
  },
  renderHTML({ HTMLAttributes, node }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        'data-block': 'quote-carousel',
        'data-items': JSON.stringify(node.attrs.items || []),
      }),
    ];
  },
  addNodeView() {
    return ReactNodeViewRenderer(QuoteCarouselView);
  },
});

// Re-export icon for convenience in toolbar
export { ChevronDown };
