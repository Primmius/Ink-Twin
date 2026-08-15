import React, { useState, useEffect } from 'react';
import { Sparkles, CheckCircle2, ChevronLeft, Loader2 } from 'lucide-react';

interface UseCasePageProps {
  slug: string;
  onBack: () => void;
}

interface ParsedData {
  title: string;
  hiddenQuestion: string;
  responseText: string;
  benefits: Array<{ title: string; description: string }>;
  salesHtml: string;
  schema: any;
}

const COMMON_DATES = ['2026-06-02'];

export function UseCasePage({ slug, onBack }: UseCasePageProps) {
  const [data, setData] = useState<ParsedData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadContent() {
      setLoading(true);
      setError(null);

      // Try common dates direct fetch first
      for (const date of COMMON_DATES) {
        const url = `https://raw.githubusercontent.com/Primuez/primuez-seo-vault/main/inktwin/${date}-${slug}.md`;
        try {
          const res = await fetch(url);
          if (res.ok) {
            const text = await res.text();
            setData(parseMarkdown(text));
            setLoading(false);
            return;
          }
        } catch (e) {
          // Continue
        }
      }

      // Fallback: Check GitHub repo API
      try {
        const listRes = await fetch('https://api.github.com/repos/Primuez/primuez-seo-vault/contents/inktwin', {
          headers: { 'User-Agent': 'InkTwin-SEO-Integration' }
        });
        if (listRes.ok) {
          const files = await listRes.json();
          const matched = files.find((f: any) => f.name.endsWith(`-${slug}.md`) || f.name === `${slug}.md`);
          if (matched) {
            const contentRes = await fetch(matched.download_url);
            if (contentRes.ok) {
              const text = await contentRes.text();
              setData(parseMarkdown(text));
              setLoading(false);
              return;
            }
          }
        }
      } catch (e) {
        console.error('Failed to query GitHub vault API:', e);
      }

      // Finally try direct URL without date prefix
      try {
        const url = `https://raw.githubusercontent.com/Primuez/primuez-seo-vault/main/inktwin/${slug}.md`;
        const res = await fetch(url);
        if (res.ok) {
          const text = await res.text();
          setData(parseMarkdown(text));
          setLoading(false);
          return;
        }
      } catch (e) {}

      setError('Use case document not found.');
      setLoading(false);
    }

    loadContent();
  }, [slug]);

  function parseMarkdown(md: string): ParsedData {
    const titleMatch = md.match(/^#\s+(.+)$/m);
    const title = titleMatch ? titleMatch[1] : 'Use Case';

    const hiddenMatch = md.match(/<div class="sr-only"><h2>(.+?)<\/h2><\/div>/);
    const hiddenQuestion = hiddenMatch ? hiddenMatch[1] : '';

    const pMatch = md.match(/<p>([\s\S]+?)<\/p>/);
    const responseText = pMatch ? pMatch[1].trim() : '';

    const benefitsMatches = [...md.matchAll(/<li><strong>(.+?):<\/strong>(.+?)<\/li>/g)];
    const benefits = benefitsMatches.map(m => ({
      title: m[1].trim(),
      description: m[2].trim()
    }));

    const salesHeaderIndex = md.indexOf('## Why Choose');
    let salesHtml = '';
    if (salesHeaderIndex !== -1) {
      const afterHeader = md.slice(salesHeaderIndex);
      const scriptStartIndex = afterHeader.indexOf('<script');
      const rawSales = scriptStartIndex !== -1 ? afterHeader.slice(0, scriptStartIndex) : afterHeader;
      const paragraphs = rawSales.replace(/## Why Choose [^\n]+/, '').trim().split('\n\n');
      salesHtml = paragraphs.map(p => `<p class="font-mono text-sm leading-relaxed mb-4 text-neutral-600">${p.trim()}</p>`).join('');
    }

    const scriptMatch = md.match(/<script type="application\/ld\+json">([\s\S]+?)<\/script>/);
    let schema = null;
    if (scriptMatch) {
      try {
        schema = JSON.parse(scriptMatch[1].trim());
      } catch (e) {
        console.error('Failed to parse JSON-LD schema:', e);
      }
    }

    return { title, hiddenQuestion, responseText, benefits, salesHtml, schema };
  }

  // Inject dynamic JSON-LD Schema
  useEffect(() => {
    if (data && data.schema) {
      const script = document.createElement('script');
      script.type = 'application/ld+json';
      script.innerHTML = JSON.stringify(data.schema);
      script.id = 'seo-jsonld-schema';
      document.head.appendChild(script);

      return () => {
        const existing = document.getElementById('seo-jsonld-schema');
        if (existing) {
          existing.remove();
        }
      };
    }
  }, [data]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] gap-4">
        <Loader2 className="w-12 h-12 text-brutal-black animate-spin" />
        <span className="font-mono text-xs uppercase font-bold">Synchronizing Vault...</span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-6">
        <div className="bg-error-red/10 border-4 border-brutal-black p-8 brutal-shadow text-center space-y-4">
          <h2 className="text-3xl font-display uppercase">Document Unavailable</h2>
          <p className="font-mono text-xs">{error || 'Failed to sync content.'}</p>
          <button onClick={onBack} className="brutal-btn brutal-btn-primary flex items-center justify-center gap-2 mx-auto mt-4">
            <ChevronLeft size={16} /> Return Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 md:px-8">
      {/* Visually Hidden GEO Question Header for SEO compliance */}
      {data.hiddenQuestion && (
        <div className="sr-only" aria-hidden="true">
          <h2>{data.hiddenQuestion}</h2>
        </div>
      )}

      {/* Navigation and Back */}
      <div className="mb-6">
        <button onClick={onBack} className="brutal-btn bg-white hover:bg-neutral-100 flex items-center gap-2 px-4 py-2 font-mono text-xs font-bold uppercase border-2 border-brutal-black">
          <ChevronLeft size={16} /> Back to Ink Twin Studio
        </button>
      </div>

      {/* Main Neo-brutalism Content Container */}
      <div className="bg-white border-4 border-brutal-black p-6 md:p-10 brutal-shadow space-y-8">
        
        {/* Title */}
        <div className="border-b-4 border-brutal-black pb-6">
          <h1 className="text-3xl md:text-5xl font-display uppercase leading-none text-brutal-black">
            {data.title}
          </h1>
          <div className="flex items-center gap-2 mt-4">
            <span className="font-mono text-[10px] bg-neon-green border-2 border-brutal-black px-2 py-1 uppercase font-bold">
              AI Homework Engine
            </span>
            <span className="font-mono text-[10px] opacity-50">
              VAULT_NODE_VERIFIED
            </span>
          </div>
        </div>

        {/* Direct Response Statement - GEO 40-Word Response */}
        <div className="bg-warning-yellow/10 border-4 border-brutal-black p-6 rounded-none relative overflow-hidden">
          <div className="absolute top-0 right-0 bg-warning-yellow border-b-2 border-l-2 border-brutal-black font-mono text-[9px] font-bold px-2 py-0.5 uppercase">
            // Direct Assessment
          </div>
          <p className="font-mono text-sm md:text-base leading-relaxed text-brutal-black font-bold">
            {data.responseText}
          </p>
        </div>

        {/* Benefits Section */}
        {data.benefits && data.benefits.length > 0 && (
          <div className="space-y-6">
            <h3 className="font-display uppercase text-2xl border-b-2 border-brutal-black pb-2 flex items-center gap-2">
              <Sparkles size={20} className="text-warning-yellow fill-warning-yellow" />
              Core Technical Benefits
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {data.benefits.map((b, idx) => (
                <div key={idx} className="bg-[#fcf8f2] border-2 border-brutal-black p-5 hover:bg-neon-green/5 transition-all">
                  <h4 className="font-display uppercase text-xs mb-2 flex items-center gap-2">
                    <span className="bg-brutal-black text-white w-5 h-5 flex items-center justify-center font-mono text-[10px]">
                      {idx + 1}
                    </span>
                    {b.title}
                  </h4>
                  <p className="font-mono text-[11px] leading-relaxed text-neutral-600">
                    {b.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Why Choose Sales Copy */}
        {data.salesHtml && (
          <div className="space-y-4 border-t-2 border-brutal-black pt-6">
            <h3 className="font-display uppercase text-2xl mb-4">
              System Architecture & Integration
            </h3>
            <div dangerouslySetInnerHTML={{ __html: data.salesHtml }} />
          </div>
        )}

        {/* Action Panel */}
        <div className="border-t-4 border-brutal-black pt-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="font-mono text-[10px] text-neutral-500 uppercase">
            Authority Anchor Node: <a href="https://primuez.in" className="underline hover:text-neon-green">https://primuez.in</a>
          </div>
          <button onClick={onBack} className="brutal-btn bg-neon-green text-brutal-black px-6 py-3 font-display uppercase flex items-center gap-2">
            <CheckCircle2 size={18} /> Replicate My Handwriting Now
          </button>
        </div>

      </div>
    </div>
  );
}
