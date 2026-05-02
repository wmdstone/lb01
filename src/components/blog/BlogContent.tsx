'use client';

import React, { memo, Suspense, useCallback } from 'react';
import dynamic from 'next/dynamic';
import DOMPurify from 'dompurify';
import { ChevronDown, ChevronLeft, ChevronRight, Quote, AlertTriangle } from 'lucide-react';
import type { EmblaCarouselType } from 'embla-carousel';

/* ---------- Types ---------- */
type AccordionItem = { title: string; body: string };
type TabItem = { label: string; body: string };
type ImageItem = { src: string; alt?: string; caption?: string };
type QuoteItem = { quote: string; attribution?: string };

type Chunk =
  | { type: 'html'; html: string }
  | { type: 'accordion'; items: AccordionItem[] }
  | { type: 'tabs'; items: TabItem[] }
  | { type: 'simple-table'; headers: string[]; rows: string[][] }
  | { type: 'image-carousel'; items: ImageItem[] }
  | { type: 'quote-carousel'; items: QuoteItem[] }
  | { type: 'error'; blockType: string; message: string };

/* ---------- Sanitization ---------- */
function sanitizeText(text: string): string {
  if (typeof window === 'undefined') return text;
  return DOMPurify.sanitize(text, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
}

function sanitizeHTML(html: string): string {
  if (typeof window === 'undefined') return html;
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 's', 'a', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'code', 'pre', 'img', 'figure', 'figcaption', 'div', 'span'],
    ALLOWED_ATTR: ['href', 'target', 'rel', 'src', 'alt', 'class', 'title'],
    ADD_ATTR: ['target'],
  });
}

/* ---------- Block Loading Skeleton ---------- */
function BlockSkeleton() {
  return (
    <div className="my-8 animate-pulse">
      <div className="h-32 bg-muted rounded-xl" />
    </div>
  );
}

/* ---------- Block Error Fallback ---------- */
function BlockErrorFallback({ blockType, message }: { blockType: string; message: string }) {
  return (
    <div className="my-8 not-prose p-4 rounded-xl border border-amber-500/30 bg-amber-50/50 dark:bg-amber-950/20">
      <div className="flex items-start gap-3 text-amber-700 dark:text-amber-400">
        <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-semibold">Content block unavailable</p>
          <p className="text-amber-600/80 dark:text-amber-400/70 text-xs mt-1">
            Unable to render {blockType} block: {message}
          </p>
        </div>
      </div>
    </div>
  );
}

/* ---------- Block Error Boundary ---------- */
class BlockErrorBoundary extends React.Component<
  { children: React.ReactNode; blockType: string },
  { hasError: boolean; error?: Error }
> {
  state = { hasError: false, error: undefined as Error | undefined };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <BlockErrorFallback
          blockType={this.props.blockType}
          message={this.state.error?.message || 'Unknown error'}
        />
      );
    }
    return this.props.children;
  }
}

/* ---------- Block components ---------- */

const AccordionBlock = memo(function AccordionBlock({ items }: { items: AccordionItem[] }) {
  const [open, setOpen] = React.useState<number | null>(0);

  if (!Array.isArray(items) || items.length === 0) {
    return <BlockErrorFallback blockType="accordion" message="No items provided" />;
  }

  return (
    <div className="my-8 not-prose space-y-2" role="region" aria-label="Accordion">
      {items.map((it, i) => {
        const isOpen = open === i;
        const panelId = `accordion-panel-${i}`;
        const headerId = `accordion-header-${i}`;
        const title = sanitizeText(it.title || 'Untitled');
        const body = sanitizeText(it.body || '');

        return (
          <div key={i} className="rounded-xl border border-border bg-card overflow-hidden">
            <button
              type="button"
              id={headerId}
              onClick={() => setOpen(isOpen ? null : i)}
              className="w-full flex items-center justify-between gap-4 p-4 text-left font-display font-bold text-card-foreground hover:bg-muted/40 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              aria-expanded={isOpen}
              aria-controls={panelId}
            >
              <span>{title}</span>
              <ChevronDown
                className={`w-5 h-5 shrink-0 text-muted-foreground transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                aria-hidden="true"
              />
            </button>
            <div
              id={panelId}
              role="region"
              aria-labelledby={headerId}
              className={`overflow-hidden transition-all duration-200 ease-out ${isOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'}`}
            >
              <div className="px-4 pb-4 text-foreground/85 font-serif-body leading-relaxed whitespace-pre-line">
                {body}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
});

const TabsBlock = memo(function TabsBlock({ items }: { items: TabItem[] }) {
  const [active, setActive] = React.useState(0);

  if (!Array.isArray(items) || items.length === 0) {
    return <BlockErrorFallback blockType="tabs" message="No tabs provided" />;
  }

  const cur = Math.min(active, Math.max(0, items.length - 1));

  return (
    <div className="my-8 not-prose" role="region" aria-label="Tabbed content">
      <div
        className="flex flex-wrap gap-1 border-b border-border mb-4 overflow-x-auto scrollbar-hide"
        role="tablist"
        aria-label="Content tabs"
      >
        {items.map((it, i) => {
          const label = sanitizeText(it.label || `Tab ${i + 1}`);
          return (
            <button
              key={i}
              type="button"
              onClick={() => setActive(i)}
              className={
                'px-4 py-2 text-sm font-semibold whitespace-nowrap transition-colors border-b-2 -mb-[1px] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background ' +
                (i === cur
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground')
              }
              aria-selected={i === cur}
              role="tab"
              id={`tab-${i}`}
              aria-controls={`tabpanel-${i}`}
              tabIndex={i === cur ? 0 : -1}
            >
              {label}
            </button>
          );
        })}
      </div>
      <div
        className="text-foreground/85 font-serif-body leading-relaxed whitespace-pre-line transition-opacity duration-200"
        role="tabpanel"
        id={`tabpanel-${cur}`}
        aria-labelledby={`tab-${cur}`}
        tabIndex={0}
      >
        {sanitizeText(items[cur]?.body || '')}
      </div>
    </div>
  );
});

const SimpleTableBlock = memo(function SimpleTableBlock({
  headers,
  rows,
}: {
  headers: string[];
  rows: string[][];
}) {
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

  if (!Array.isArray(headers) || headers.length === 0) {
    return <BlockErrorFallback blockType="table" message="No headers provided" />;
  }

  return (
    <div className="my-8 not-prose relative">
      {/* Scroll hint indicator */}
      {showScrollHint && (
        <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-background/80 to-transparent pointer-events-none z-10 rounded-r-xl flex items-center justify-center">
          <ChevronRight className="w-4 h-4 text-muted-foreground animate-pulse" />
        </div>
      )}
      <div
        ref={tableContainerRef}
        className="overflow-x-auto rounded-xl border border-border touch-pan-x"
        tabIndex={0}
        role="region"
        aria-label="Scrollable table"
      >
        <table className="w-full text-sm">
          <thead className="bg-muted/60">
            <tr>
              {headers.map((h, i) => (
                <th
                  key={i}
                  scope="col"
                  className="text-left p-3 font-display font-bold text-foreground border-b border-border whitespace-nowrap"
                >
                  {sanitizeText(h)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(rows || []).map((r, ri) => (
              <tr key={ri} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                {headers.map((_, ci) => (
                  <td key={ci} className="p-3 text-foreground/85 align-top">
                    {sanitizeText(r?.[ci] ?? '')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
});

/* ---------- Dynamically imported carousel components ---------- */
const EmblaCarouselLoader = dynamic(
  () => import('embla-carousel-react').then((mod) => {
    // Return a wrapper component that provides the hook
    const useEmblaCarousel = mod.default;
    return function EmblaProvider({ children }: { children: (embla: ReturnType<typeof useEmblaCarousel>) => React.ReactNode }) {
      const emblaResult = useEmblaCarousel({ loop: true, align: 'center' });
      return <>{children(emblaResult)}</>;
    };
  }),
  { ssr: false, loading: () => <BlockSkeleton /> }
);

const ImageCarouselBlock = memo(function ImageCarouselBlock({ items }: { items: ImageItem[] }) {
  if (!Array.isArray(items) || items.length === 0) return null;

  return (
    <EmblaCarouselLoader>
      {([emblaRef, embla]) => (
        <ImageCarouselInner items={items} emblaRef={emblaRef} embla={embla} />
      )}
    </EmblaCarouselLoader>
  );
});

function ImageCarouselInner({
  items,
  emblaRef,
  embla,
}: {
  items: ImageItem[];
  emblaRef: React.RefCallback<HTMLElement>;
  embla: EmblaCarouselType | undefined;
}) {
  const [selected, setSelected] = React.useState(0);

  React.useEffect(() => {
    if (!embla) return;
    const onSelect = () => setSelected(embla.selectedScrollSnap());
    embla.on('select', onSelect);
    onSelect();
    return () => {
      embla.off('select', onSelect);
    };
  }, [embla]);

  const scrollTo = useCallback((i: number) => embla?.scrollTo(i), [embla]);

  return (
    <div className="my-10 not-prose" role="region" aria-roledescription="carousel" aria-label="Image carousel">
      <div className="relative rounded-xl overflow-hidden bg-muted">
        <div ref={emblaRef as React.RefCallback<HTMLDivElement>} className="overflow-hidden touch-pan-y">
          <div className="flex">
            {items.map((it, i) => {
              const src = sanitizeText(it.src || '');
              const alt = sanitizeText(it.alt || '');
              const caption = sanitizeText(it.caption || '');

              return (
                <div
                  key={i}
                  className="min-w-0 flex-[0_0_100%]"
                  role="group"
                  aria-roledescription="slide"
                  aria-label={`Slide ${i + 1} of ${items.length}`}
                >
                  <div className="relative w-full aspect-[16/9] bg-muted">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={src}
                      alt={alt}
                      className="absolute inset-0 w-full h-full object-cover transition-opacity duration-300"
                      loading="lazy"
                    />
                  </div>
                  {caption && (
                    <div className="px-4 py-3 text-sm italic text-center text-muted-foreground font-serif-body bg-card transition-opacity duration-300">
                      {caption}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        {items.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => embla?.scrollPrev()}
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background text-foreground p-2 rounded-full shadow border border-border transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              aria-label="Previous slide"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => embla?.scrollNext()}
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background text-foreground p-2 rounded-full shadow border border-border transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              aria-label="Next slide"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </>
        )}
      </div>
      {items.length > 1 && (
        <div className="flex justify-center gap-2 mt-3" role="tablist" aria-label="Slide navigation">
          {items.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => scrollTo(i)}
              aria-label={`Go to slide ${i + 1}`}
              aria-selected={i === selected}
              role="tab"
              className={
                'h-2 rounded-full transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ' +
                (i === selected ? 'w-6 bg-primary' : 'w-2 bg-muted-foreground/40 hover:bg-muted-foreground/60')
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}

const QuoteCarouselBlock = memo(function QuoteCarouselBlock({ items }: { items: QuoteItem[] }) {
  if (!Array.isArray(items) || items.length === 0) return null;

  return (
    <EmblaCarouselLoader>
      {([emblaRef, embla]) => (
        <QuoteCarouselInner items={items} emblaRef={emblaRef} embla={embla} />
      )}
    </EmblaCarouselLoader>
  );
});

function QuoteCarouselInner({
  items,
  emblaRef,
  embla,
}: {
  items: QuoteItem[];
  emblaRef: React.RefCallback<HTMLElement>;
  embla: EmblaCarouselType | undefined;
}) {
  const [selected, setSelected] = React.useState(0);

  React.useEffect(() => {
    if (!embla) return;
    const onSelect = () => setSelected(embla.selectedScrollSnap());
    embla.on('select', onSelect);
    onSelect();
    return () => {
      embla.off('select', onSelect);
    };
  }, [embla]);

  return (
    <div className="my-10 not-prose" role="region" aria-roledescription="carousel" aria-label="Quote carousel">
      <div className="relative rounded-xl border border-border bg-card overflow-hidden">
        <div ref={emblaRef as React.RefCallback<HTMLDivElement>} className="overflow-hidden touch-pan-y">
          <div className="flex">
            {items.map((it, i) => {
              const quote = sanitizeText(it.quote || '');
              const attribution = sanitizeText(it.attribution || '');

              return (
                <div
                  key={i}
                  className="min-w-0 flex-[0_0_100%]"
                  role="group"
                  aria-roledescription="slide"
                  aria-label={`Quote ${i + 1} of ${items.length}`}
                >
                  <figure className="px-8 py-10 md:px-14 md:py-14 text-center">
                    <Quote className="w-8 h-8 text-primary mx-auto mb-4 transition-transform duration-300" aria-hidden="true" />
                    <blockquote className="font-display italic text-xl md:text-2xl leading-relaxed text-foreground transition-opacity duration-300">
                      &ldquo;{quote}&rdquo;
                    </blockquote>
                    {attribution && (
                      <figcaption className="mt-5 text-xs uppercase tracking-[0.3em] text-muted-foreground font-semibold transition-opacity duration-300">
                        &mdash; {attribution}
                      </figcaption>
                    )}
                  </figure>
                </div>
              );
            })}
          </div>
        </div>
        {items.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => embla?.scrollPrev()}
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background text-foreground p-2 rounded-full shadow border border-border transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              aria-label="Previous quote"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => embla?.scrollNext()}
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background text-foreground p-2 rounded-full shadow border border-border transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              aria-label="Next quote"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </>
        )}
      </div>
      {items.length > 1 && (
        <div className="flex justify-center gap-2 mt-3" role="tablist" aria-label="Quote navigation">
          {items.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => embla?.scrollTo(i)}
              aria-label={`Go to quote ${i + 1}`}
              aria-selected={i === selected}
              role="tab"
              className={
                'h-2 rounded-full transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ' +
                (i === selected ? 'w-6 bg-primary' : 'w-2 bg-muted-foreground/40 hover:bg-muted-foreground/60')
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------- Parser: split HTML into HTML chunks + block descriptors ---------- */

function safeJSONParse<T>(str: string, fallback: T): T {
  try {
    const parsed = JSON.parse(str);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function parseContent(html: string): Chunk[] {
  if (typeof window === 'undefined') {
    // Server-side: just render raw HTML; client will hydrate blocks.
    return [{ type: 'html', html }];
  }

  const container = document.createElement('div');
  container.innerHTML = html;

  const chunks: Chunk[] = [];
  let buffer = '';

  const flush = () => {
    if (buffer.trim()) {
      chunks.push({ type: 'html', html: buffer });
    }
    buffer = '';
  };

  Array.from(container.childNodes).forEach((node) => {
    if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as HTMLElement;
      const block = el.getAttribute?.('data-block');

      if (block) {
        flush();
        try {
          switch (block) {
            case 'accordion': {
              const items = safeJSONParse<AccordionItem[]>(el.getAttribute('data-items') || '[]', []);
              if (items.length > 0) {
                chunks.push({ type: 'accordion', items });
              } else {
                chunks.push({ type: 'error', blockType: 'accordion', message: 'No items found' });
              }
              break;
            }
            case 'tabs': {
              const items = safeJSONParse<TabItem[]>(el.getAttribute('data-items') || '[]', []);
              if (items.length > 0) {
                chunks.push({ type: 'tabs', items });
              } else {
                chunks.push({ type: 'error', blockType: 'tabs', message: 'No tabs found' });
              }
              break;
            }
            case 'simple-table': {
              const headers = safeJSONParse<string[]>(el.getAttribute('data-headers') || '[]', []);
              const rows = safeJSONParse<string[][]>(el.getAttribute('data-rows') || '[]', []);
              if (headers.length > 0) {
                chunks.push({ type: 'simple-table', headers, rows });
              } else {
                chunks.push({ type: 'error', blockType: 'table', message: 'No headers found' });
              }
              break;
            }
            case 'image-carousel': {
              const items = safeJSONParse<ImageItem[]>(el.getAttribute('data-items') || '[]', []);
              if (items.length > 0) {
                chunks.push({ type: 'image-carousel', items });
              }
              // Empty carousel is silently ignored (no error shown)
              break;
            }
            case 'quote-carousel': {
              const items = safeJSONParse<QuoteItem[]>(el.getAttribute('data-items') || '[]', []);
              if (items.length > 0) {
                chunks.push({ type: 'quote-carousel', items });
              }
              // Empty carousel is silently ignored
              break;
            }
            default:
              // Unknown block type - render as HTML
              buffer += el.outerHTML;
          }
        } catch (err) {
          chunks.push({
            type: 'error',
            blockType: block,
            message: err instanceof Error ? err.message : 'Parse error',
          });
        }
        return;
      }
    }
    buffer += (node as HTMLElement).outerHTML ?? node.textContent ?? '';
  });

  flush();
  return chunks;
}

/* ---------- Main Component ---------- */

export const BlogContent = memo(function BlogContent({
  html,
  className,
}: {
  html: string;
  className?: string;
}) {
  const [chunks, setChunks] = React.useState<Chunk[]>(() => [{ type: 'html', html }]);

  React.useEffect(() => {
    setChunks(parseContent(html));
  }, [html]);

  const renderChunk = useCallback((chunk: Chunk, index: number) => {
    switch (chunk.type) {
      case 'html':
        return (
          <div
            key={index}
            dangerouslySetInnerHTML={{ __html: sanitizeHTML(chunk.html) }}
          />
        );
      case 'accordion':
        return (
          <BlockErrorBoundary key={index} blockType="accordion">
            <AccordionBlock items={chunk.items} />
          </BlockErrorBoundary>
        );
      case 'tabs':
        return (
          <BlockErrorBoundary key={index} blockType="tabs">
            <TabsBlock items={chunk.items} />
          </BlockErrorBoundary>
        );
      case 'simple-table':
        return (
          <BlockErrorBoundary key={index} blockType="table">
            <SimpleTableBlock headers={chunk.headers} rows={chunk.rows} />
          </BlockErrorBoundary>
        );
      case 'image-carousel':
        return (
          <Suspense key={index} fallback={<BlockSkeleton />}>
            <BlockErrorBoundary blockType="image-carousel">
              <ImageCarouselBlock items={chunk.items} />
            </BlockErrorBoundary>
          </Suspense>
        );
      case 'quote-carousel':
        return (
          <Suspense key={index} fallback={<BlockSkeleton />}>
            <BlockErrorBoundary blockType="quote-carousel">
              <QuoteCarouselBlock items={chunk.items} />
            </BlockErrorBoundary>
          </Suspense>
        );
      case 'error':
        return (
          <BlockErrorFallback
            key={index}
            blockType={chunk.blockType}
            message={chunk.message}
          />
        );
      default:
        return null;
    }
  }, []);

  return <div className={className}>{chunks.map(renderChunk)}</div>;
});
