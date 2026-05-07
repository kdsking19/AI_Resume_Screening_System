'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface AnalysisResult {
  Resume: string;
  'Match Score (%)': number;
  OriginalText: string;
}

interface AnalysisError {
  Resume: string;
  error: string;
}

interface HistoryItem {
  id: string;
  date: string;
  jobDesc: string;
  results: AnalysisResult[];
  errors: AnalysisError[];
}

export default function Home() {
  const [jobDesc, setJobDesc] = useState('');
  const [files, setFiles] = useState<FileList | null>(null);
  const [results, setResults] = useState<AnalysisResult[]>([]);
  const [errors, setErrors] = useState<AnalysisError[]>([]);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewName, setPreviewName] = useState<string | null>(null);
  const [fileMap, setFileMap] = useState<Map<string, File>>(new Map());

  // Editing state
  const [editingResult, setEditingResult] = useState<AnalysisResult | null>(null);
  const [isFormatting, setIsFormatting] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);
  
  // AI Undo/Redo State
  const [historyStack, setHistoryStack] = useState<string[]>([]);
  const [historyPointer, setHistoryPointer] = useState(-1);

  // 3D Background Scroll State
  const [scrollY, setScrollY] = useState(0);

  // Scroll reveal ref callback
  const scrollRevealRef = useCallback((node: HTMLElement | null) => {
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('revealed');
          } else {
            entry.target.classList.remove('revealed');
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
    );
    observer.observe(node);
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem('resumeHistory');
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse history', e);
      }
    }
  }, []);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const saveToHistory = (newHistory: HistoryItem[]) => {
    setHistory(newHistory);
    localStorage.setItem('resumeHistory', JSON.stringify(newHistory));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    setFiles(selectedFiles);
    
    if (selectedFiles) {
      const newMap = new Map<string, File>();
      Array.from(selectedFiles).forEach(f => newMap.set(f.name, f));
      setFileMap(newMap);
    } else {
      setFileMap(new Map());
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!jobDesc || !files) return;

    setLoading(true);
    const formData = new FormData();
    formData.append('jobDesc', jobDesc);
    Array.from(files).forEach(file => formData.append('files', file));

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      const currentResults = data.results || [];
      const currentErrors = data.errors || [];
      
      setResults(currentResults);
      setErrors(currentErrors);

      const newItem: HistoryItem = {
        id: Date.now().toString(),
        date: new Date().toLocaleString(),
        jobDesc,
        results: currentResults,
        errors: currentErrors,
      };
      saveToHistory([newItem, ...history]);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const deleteHistory = (id: string) => {
    saveToHistory(history.filter(h => h.id !== id));
  };

  const openPreview = (resumeName: string) => {
    const file = fileMap.get(resumeName);
    if (file && file.type === 'application/pdf') {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      setPreviewName(resumeName);
    } else {
      alert('Preview is only available for PDF files uploaded in the current session.');
    }
  };

  const closePreview = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setPreviewName(null);
  };

  const openEditor = (result: AnalysisResult) => {
    setEditingResult(result);
    setTimeout(() => {
      if (editorRef.current) {
        const lines = (result.OriginalText || 'No text extracted.').split('\n').filter(l => l.trim() !== '');
        const initialHtml = lines.map(l => `<p>${l}</p>`).join('');
        editorRef.current.innerHTML = initialHtml;
        
        setHistoryStack([initialHtml]);
        setHistoryPointer(0);
      }
    }, 50);
  };

  const saveToEditorHistory = (html: string) => {
    setHistoryStack(prev => {
      if (historyPointer >= 0 && prev[historyPointer] === html) return prev;
      const newStack = prev.slice(0, historyPointer + 1);
      newStack.push(html);
      setHistoryPointer(newStack.length - 1);
      return newStack;
    });
  };

  const undo = () => {
    if (historyPointer > 0) {
      if (editorRef.current && editorRef.current.innerHTML !== historyStack[historyPointer]) {
         saveToEditorHistory(editorRef.current.innerHTML);
         const prevPointer = historyPointer;
         setHistoryPointer(prevPointer);
         editorRef.current.innerHTML = historyStack[prevPointer];
         return;
      }
      
      const newPointer = historyPointer - 1;
      setHistoryPointer(newPointer);
      if (editorRef.current) {
        editorRef.current.innerHTML = historyStack[newPointer];
      }
    } else {
      document.execCommand('undo');
    }
  };

  const redo = () => {
    if (historyPointer < historyStack.length - 1) {
      const newPointer = historyPointer + 1;
      setHistoryPointer(newPointer);
      if (editorRef.current) {
        editorRef.current.innerHTML = historyStack[newPointer];
      }
    } else {
      document.execCommand('redo');
    }
  };

  const autoFormatText = async () => {
    if (!editorRef.current) return;
    
    saveToEditorHistory(editorRef.current.innerHTML);
    
    setIsFormatting(true);
    try {
      const text = editorRef.current.innerText || '';
      const res = await fetch('/api/format', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });
      const data = await res.json();
      if (res.ok && data.formattedText) {
        let html = data.formattedText;
        if (html.startsWith('```html')) html = html.substring(7);
        if (html.endsWith('```')) html = html.substring(0, html.length - 3);
        
        const cleanHtml = html.trim();
        editorRef.current.innerHTML = cleanHtml;
        saveToEditorHistory(cleanHtml);
      } else {
        alert(data.error || 'Formatting failed');
      }
    } catch (err) {
      console.error(err);
      alert('An error occurred during formatting');
    } finally {
      setIsFormatting(false);
    }
  };

  const downloadCSV = () => {
    const csv = 'Resume,Match Score (%)\n' + results.map(r => `"${r.Resume}",${r['Match Score (%)']}`).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'results.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadEditedDocx = (filename: string) => {
    const html = editorRef.current?.innerHTML || '';
    const content = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
      <head><meta charset="utf-8"><title>Export</title></head>
      <body>${html}</body>
      </html>
    `;
    const blob = new Blob([content], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Edited_${filename.replace(/\.[^/.]+$/, "")}.doc`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadEditedPdf = (filename: string) => {
    const html = editorRef.current?.innerHTML || '';
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert("Please allow popups to generate PDF");
      return;
    }
    printWindow.document.write(`
      <html>
        <head>
          <title>Export PDF - ${filename}</title>
          <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 40px; color: #333; line-height: 1.6; max-width: 800px; margin: 0 auto; }
            h1 { font-size: 28px; border-bottom: 2px solid #ccc; padding-bottom: 10px; margin-top: 0; color: #111; }
            h2 { font-size: 20px; margin-top: 25px; margin-bottom: 10px; color: #222; border-bottom: 1px solid #eee; padding-bottom: 5px; }
            h3 { font-size: 16px; margin-top: 15px; color: #444; }
            p { margin-bottom: 10px; }
            ul { padding-left: 20px; margin-bottom: 15px; }
            li { margin-bottom: 5px; }
            strong { color: #000; }
            @media print {
              body { padding: 0; }
            }
          </style>
        </head>
        <body>${html}</body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  return (
    <div className="min-h-screen bg-black text-gray-200 font-sans pb-12 relative overflow-hidden">
      
      {/* Futuristic 3D Grid + Scroll Reveal Styles */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes grid-scroll {
          0% { background-position: 0 0; }
          100% { background-position: 0 60px; }
        }
        .scroll-reveal {
          opacity: 0;
          transform: perspective(800px) rotateX(8deg) translateY(80px) scale(0.95);
          transition: opacity 0.8s cubic-bezier(0.16, 1, 0.3, 1),
                      transform 0.8s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .scroll-reveal.revealed {
          opacity: 1;
          transform: perspective(800px) rotateX(0deg) translateY(0) scale(1);
        }
        .scroll-reveal-left {
          opacity: 0;
          transform: perspective(800px) rotateY(6deg) translateX(-60px) scale(0.95);
          transition: opacity 0.8s cubic-bezier(0.16, 1, 0.3, 1),
                      transform 0.8s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .scroll-reveal-left.revealed {
          opacity: 1;
          transform: perspective(800px) rotateY(0deg) translateX(0) scale(1);
        }
        .scroll-reveal-right {
          opacity: 0;
          transform: perspective(800px) rotateY(-6deg) translateX(60px) scale(0.95);
          transition: opacity 0.8s cubic-bezier(0.16, 1, 0.3, 1),
                      transform 0.8s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .scroll-reveal-right.revealed {
          opacity: 1;
          transform: perspective(800px) rotateY(0deg) translateX(0) scale(1);
        }
      `}} />

      {/* 3D Background Orbs - Parallax on scroll */}
      <div 
        className="fixed top-[-20%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-purple-900/20 blur-[150px] pointer-events-none animate-pulse z-0 transition-transform duration-100"
        style={{ transform: `translateY(${scrollY * 0.15}px) translateX(${scrollY * 0.05}px)` }}
      ></div>
      <div 
        className="fixed top-[10%] right-[-10%] w-[40vw] h-[40vw] rounded-full bg-cyan-900/20 blur-[120px] pointer-events-none animate-pulse z-0 transition-transform duration-100"
        style={{ transform: `translateY(${scrollY * -0.1}px) translateX(${scrollY * -0.08}px)`, animationDelay: '2s' }}
      ></div>

      {/* Synthwave 3D Floor - Scroll-linked */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        {/* Deep space radial glow - shifts on scroll */}
        <div 
          className="absolute inset-0"
          style={{
            background: `radial-gradient(circle at 50% ${40 + scrollY * 0.02}%, rgba(15,23,42,1) 0%, rgba(0,0,0,1) 70%)`
          }}
        ></div>
        
        {/* Horizon Line Glow - moves with scroll */}
        <div 
          className="absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent z-10 transition-all duration-100"
          style={{ 
            top: `${Math.max(20, 40 - scrollY * 0.03)}%`,
            opacity: Math.max(0.3, 0.8 - scrollY * 0.001),
            boxShadow: `0 0 ${30 + scrollY * 0.05}px ${10 + scrollY * 0.02}px rgba(34,211,238,${Math.max(0.1, 0.3 - scrollY * 0.0005)})`
          }}
        ></div>
        
        {/* Animated 3D Grid - scrolls with page */}
        <div 
          className="absolute left-[-50%] right-[-50%] h-[100vh] origin-top z-0 transition-none"
          style={{
            top: `${Math.max(20, 40 - scrollY * 0.03)}%`,
            backgroundImage: 'linear-gradient(to right, rgba(168, 85, 247, 0.25) 1px, transparent 1px), linear-gradient(to bottom, rgba(34, 211, 238, 0.25) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
            transform: `perspective(600px) rotateX(${75 - Math.min(scrollY * 0.01, 10)}deg)`,
            backgroundPosition: `0px ${scrollY * 1.2}px`,
            WebkitMaskImage: 'linear-gradient(to bottom, black 10%, transparent 80%)',
            maskImage: 'linear-gradient(to bottom, black 10%, transparent 80%)'
          }}
        ></div>
      </div>

      <div className="container mx-auto px-4 py-12 relative z-10">
        <h1 ref={scrollRevealRef} className="scroll-reveal text-5xl md:text-7xl font-extrabold text-center mb-10 tracking-tight text-transparent bg-clip-text bg-gradient-to-br from-cyan-300 via-purple-400 to-pink-500 drop-shadow-[0_0_25px_rgba(224,231,255,0.2)]">
          AI Resume Screening System
        </h1>
        
        <form ref={scrollRevealRef} onSubmit={handleSubmit} className="scroll-reveal max-w-3xl mx-auto backdrop-blur-2xl bg-white/[0.03] p-8 md:p-10 rounded-3xl shadow-[0_8px_32px_0_rgba(0,0,0,0.5)] border border-white/[0.08] hover:border-cyan-500/30 transition-colors duration-500 mb-16 relative" style={{ transitionDelay: '0.15s' }}>
          <div className="absolute inset-0 bg-gradient-to-b from-white/[0.02] to-transparent rounded-3xl pointer-events-none"></div>
          
          <div className="mb-6 relative z-10">
            <label className="block text-cyan-300 mb-3 font-semibold text-lg tracking-wide">Target Role / Job Description</label>
            <textarea
              value={jobDesc}
              onChange={(e) => setJobDesc(e.target.value)}
              className="w-full p-4 bg-black/50 border border-white/10 rounded-2xl focus:outline-none focus:ring-2 focus:ring-cyan-500/50 text-white shadow-[inset_0_2px_10px_rgba(0,0,0,0.6)] transition-all duration-300 hover:bg-black/70 resize-none"
              rows={5}
              placeholder="Paste the target job description here..."
            />
          </div>
          
          <div className="mb-8 relative z-10">
            <label className="block text-cyan-300 mb-3 font-semibold text-lg tracking-wide">Upload Candidates (PDF/DOCX)</label>
            <div className="relative group">
              <input
                type="file"
                multiple
                accept=".pdf,.docx"
                onChange={handleFileChange}
                className="w-full p-4 bg-black/50 border border-white/10 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500/50 text-white shadow-[inset_0_2px_10px_rgba(0,0,0,0.6)] transition-all duration-300 hover:bg-black/70 cursor-pointer file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-cyan-500/20 file:text-cyan-300 hover:file:bg-cyan-500/30"
              />
            </div>
          </div>
          
          <button
            type="submit"
            disabled={loading || !jobDesc || !files || files.length === 0}
            className="w-full relative group overflow-hidden rounded-2xl p-[2px] disabled:opacity-50 disabled:cursor-not-allowed z-10"
          >
            <span className="absolute inset-0 bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 rounded-2xl opacity-70 group-hover:opacity-100 transition-opacity duration-500 blur-[2px]"></span>
            <div className="relative bg-gray-900 border border-white/10 text-white py-4 px-6 rounded-2xl transform transition-transform duration-200 group-active:scale-[0.98] flex items-center justify-center font-bold text-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]">
              {loading ? (
                <span className="flex items-center gap-3"><span className="animate-spin text-2xl">⚡</span> Analyzing Dimensions...</span>
              ) : (
                <span className="flex items-center gap-3"><span className="text-2xl">🚀</span> Launch 3D Analysis</span>
              )}
            </div>
          </button>
        </form>

        {/* Current Results Section */}
        {(results.length > 0 || errors.length > 0) && (
          <div ref={scrollRevealRef} className="scroll-reveal max-w-5xl mx-auto backdrop-blur-2xl bg-white/[0.03] p-8 md:p-10 rounded-3xl shadow-[0_8px_40px_0_rgba(0,0,0,0.6)] border border-white/[0.08] mb-16 relative">
            <h2 className="text-3xl font-extrabold mb-8 text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-blue-500">📊 Live Telemetry</h2>
            
            {errors.length > 0 && (
              <div className="mb-8 bg-red-900/20 border-l-4 border-red-500 p-6 rounded-r-2xl shadow-[inset_0_0_20px_rgba(239,68,68,0.1)] backdrop-blur-sm">
                <h3 className="text-xl font-bold text-red-400 mb-3 flex items-center gap-2">⚠️ Integrity Failures</h3>
                <ul className="list-disc pl-6 text-red-300/80 space-y-1">
                  {errors.map((err, i) => (
                    <li key={i}>
                      <span className="font-bold text-red-300">{err.Resume}:</span> {err.error}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {results.length > 0 && (
              <>
                <div className="overflow-x-auto pb-4">
                  <table className="w-full border-separate border-spacing-y-3">
                    <thead>
                      <tr className="text-left text-cyan-500/70 font-bold uppercase tracking-wider text-xs">
                        <th className="px-6 py-3 border-b border-white/10 font-medium">Candidate Signature</th>
                        <th className="px-6 py-3 border-b border-white/10 font-medium">Resonance Score</th>
                        <th className="px-6 py-3 border-b border-white/10 text-right font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {results.map((result, index) => (
                        <tr key={index} className="bg-white/[0.02] hover:bg-white/[0.06] transition-all duration-300 transform hover:-translate-y-1 hover:shadow-[0_10px_20px_-10px_rgba(34,211,238,0.3)] rounded-2xl group">
                          <td className="px-6 py-5 first:rounded-l-2xl border-y border-l border-white/[0.02] group-hover:border-white/10 text-gray-200 font-medium">{result.Resume}</td>
                          <td className="px-6 py-5 border-y border-white/[0.02] group-hover:border-white/10">
                            <span className="inline-flex items-center gap-2 bg-green-500/10 text-green-400 px-3 py-1 rounded-full border border-green-500/20 font-bold shadow-[0_0_10px_rgba(74,222,128,0.2)]">
                              {result['Match Score (%)']}%
                            </span>
                          </td>
                          <td className="px-6 py-5 last:rounded-r-2xl border-y border-r border-white/[0.02] group-hover:border-white/10 text-right">
                            <div className="flex justify-end gap-3">
                              <button 
                                onClick={() => openPreview(result.Resume)}
                                className="text-sm bg-white/5 hover:bg-white/20 border border-white/10 text-white py-2 px-4 rounded-xl transition-all duration-300 transform hover:scale-105 active:scale-95 shadow-lg"
                              >
                                View PDF
                              </button>
                              <button 
                                onClick={() => openEditor(result)}
                                className="text-sm bg-gradient-to-r from-purple-600/80 to-pink-600/80 hover:from-purple-500 hover:to-pink-500 border border-white/10 text-white py-2 px-4 rounded-xl transition-all duration-300 transform hover:scale-105 active:scale-95 shadow-[0_0_15px_rgba(168,85,247,0.4)] font-bold"
                              >
                                Edit Format
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex justify-end mt-4">
                  <button
                    onClick={downloadCSV}
                    className="text-sm bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white py-2 px-5 rounded-full transition-all duration-300 flex items-center gap-2"
                  >
                    ⬇️ Export Telemetry CSV
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* History Section */}
        {history.length > 0 && (
          <div className="max-w-5xl mx-auto relative z-10">
            <h2 ref={scrollRevealRef} className="scroll-reveal text-3xl font-extrabold mb-10 text-center text-transparent bg-clip-text bg-gradient-to-r from-purple-300 to-pink-500">📚 Historical Archives</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {history.map((item) => (
                <div ref={scrollRevealRef} key={item.id} className={`${Number(item.id) % 2 === 0 ? 'scroll-reveal-left' : 'scroll-reveal-right'} bg-black/40 backdrop-blur-xl border border-white/[0.08] p-8 rounded-3xl shadow-[0_8px_30px_rgba(0,0,0,0.4)] hover:shadow-[0_10px_40px_-15px_rgba(168,85,247,0.4)] transition-all duration-500 transform hover:-translate-y-2 group relative overflow-hidden`}>
                  <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl group-hover:bg-purple-500/20 transition-all duration-500 pointer-events-none"></div>
                  
                  <button 
                    onClick={() => deleteHistory(item.id)}
                    className="absolute top-6 right-6 text-red-400/50 hover:text-red-400 font-bold px-3 py-1 bg-red-900/0 hover:bg-red-900/20 rounded-lg transition-all duration-300"
                    title="Purge Archive"
                  >
                    ✕
                  </button>
                  <p className="text-purple-300/50 text-xs font-bold uppercase tracking-wider mb-3">{item.date}</p>
                  <p className="text-gray-200 mb-6 line-clamp-3 text-sm leading-relaxed border-l-2 border-purple-500/30 pl-3"><span className="text-purple-400 font-bold">Target:</span> {item.jobDesc}</p>
                  
                  <div className="flex gap-3 mb-6">
                    <span className="bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 px-4 py-1.5 rounded-full text-xs font-bold">
                      {item.results.length} Processed
                    </span>
                    {item.errors.length > 0 && (
                      <span className="bg-red-500/10 border border-red-500/20 text-red-300 px-4 py-1.5 rounded-full text-xs font-bold">
                        {item.errors.length} Failed
                      </span>
                    )}
                  </div>
                  
                  {item.results.length > 0 && (
                    <div className="bg-white/[0.02] border border-white/[0.05] rounded-2xl p-5">
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Top Candidates</p>
                      <ul className="space-y-3">
                        {item.results.slice(0, 3).map((r, i) => (
                          <li key={i} className="flex items-center justify-between group/item">
                            <span className="truncate pr-4 text-sm text-gray-300 group-hover/item:text-white transition-colors">{r.Resume}</span>
                            <div className="flex items-center gap-3">
                              <span className="text-green-400 font-bold text-sm bg-green-500/10 px-2 py-0.5 rounded-md">{r['Match Score (%)']}%</span>
                              <button 
                                onClick={() => openEditor(r)}
                                className="text-xs bg-white/5 hover:bg-white/20 border border-white/10 text-white py-1.5 px-3 rounded-lg transition-all duration-300"
                              >
                                Edit
                              </button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* PDF Preview Modal */}
      {previewUrl && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xl flex items-center justify-center z-50 p-4 md:p-8">
          <div className="bg-gray-900 border border-white/10 rounded-3xl shadow-[0_0_80px_-20px_rgba(34,211,238,0.5)] w-full max-w-6xl h-full md:h-[90vh] flex flex-col transform transition-all duration-500 scale-100 overflow-hidden relative">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500 to-purple-500"></div>
            <div className="flex justify-between items-center p-6 border-b border-white/5 bg-black/40">
              <h3 className="text-2xl font-bold text-gray-100 truncate pr-8">{previewName}</h3>
              <button 
                onClick={closePreview}
                className="text-gray-400 hover:text-white bg-white/5 hover:bg-red-500/20 rounded-full w-10 h-10 flex items-center justify-center transition-all duration-300"
              >
                ✕
              </button>
            </div>
            <div className="flex-grow bg-[#525659] overflow-hidden">
              <embed src={previewUrl} type="application/pdf" className="w-full h-full" />
            </div>
          </div>
        </div>
      )}

      {/* Rich Text Editor Modal */}
      {editingResult && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xl flex items-center justify-center z-50 p-2 md:p-4">
          <div className="bg-gray-900 border border-white/10 rounded-3xl shadow-[0_0_80px_-20px_rgba(168,85,247,0.5)] w-full max-w-[80vw] h-full md:h-[100vh] flex flex-col transform transition-all duration-500 scale-100 overflow-hidden relative">
            
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 to-pink-500"></div>
            
            <div className="flex justify-between items-center p-4 md:p-6 border-b border-white/5 bg-black/40">
              <h3 className="text-2xl font-bold text-gray-100 truncate pr-8 flex items-center gap-3">
                <span className="bg-purple-500/20 text-purple-300 p-2 rounded-lg text-sm">Editor</span>
                {editingResult.Resume}
              </h3>
              <button 
                onClick={() => setEditingResult(null)}
                className="text-gray-400 hover:text-white bg-white/5 hover:bg-red-500/20 rounded-full w-10 h-10 flex items-center justify-center transition-all duration-300"
              >
                ✕
              </button>
            </div>

            {/* Premium 3D Toolbar */}
            <div className="bg-gray-800/80 backdrop-blur-md p-3 md:p-4 border-b border-white/5 flex flex-wrap gap-2 md:gap-3 items-center shadow-lg z-10 text-sm">
              <div className="flex bg-black/50 p-1 rounded-xl border border-white/5 shadow-inner">
                <select onChange={(e) => { document.execCommand('fontName', false, e.target.value); editorRef.current?.focus(); }} className="bg-transparent text-white/90 px-3 py-1.5 focus:outline-none cursor-pointer hover:bg-white/5 rounded-lg appearance-none">
                  <option value="Arial">Arial</option>
                  <option value="Times New Roman">Times New Roman</option>
                  <option value="Courier New">Courier New</option>
                  <option value="Georgia">Georgia</option>
                  <option value="Verdana">Verdana</option>
                  <option value="Trebuchet MS">Trebuchet MS</option>
                  <option value="Impact">Impact</option>
                </select>
                <div className="w-px h-6 bg-white/10 mx-1 self-center"></div>
                <select onChange={(e) => { document.execCommand('fontSize', false, e.target.value); editorRef.current?.focus(); }} className="bg-transparent text-white/90 px-3 py-1.5 focus:outline-none cursor-pointer hover:bg-white/5 rounded-lg appearance-none" defaultValue="3">
                  <option value="1">10pt</option>
                  <option value="2">13pt</option>
                  <option value="3">16pt</option>
                  <option value="4">18pt</option>
                  <option value="5">24pt</option>
                  <option value="6">32pt</option>
                  <option value="7">48pt</option>
                </select>
              </div>

              <div className="flex bg-black/50 p-1 rounded-xl border border-white/5 shadow-inner gap-1">
                <button onClick={() => { document.execCommand('bold'); editorRef.current?.focus(); }} className="w-10 py-1.5 hover:bg-white/10 rounded-lg text-white font-bold transition-colors shadow-sm" title="Bold">B</button>
                <button onClick={() => { document.execCommand('italic'); editorRef.current?.focus(); }} className="w-10 py-1.5 hover:bg-white/10 rounded-lg text-white italic transition-colors shadow-sm" title="Italic">I</button>
                <button onClick={() => { document.execCommand('underline'); editorRef.current?.focus(); }} className="w-10 py-1.5 hover:bg-white/10 rounded-lg text-white underline transition-colors shadow-sm" title="Underline">U</button>
                <button onClick={() => { document.execCommand('strikeThrough'); editorRef.current?.focus(); }} className="w-10 py-1.5 hover:bg-white/10 rounded-lg text-white line-through transition-colors shadow-sm" title="Strikethrough">S</button>
              </div>
              
              <div className="flex bg-black/50 p-1 rounded-xl border border-white/5 shadow-inner gap-1">
                <button onClick={() => { document.execCommand('justifyLeft'); editorRef.current?.focus(); }} className="px-3 py-1.5 hover:bg-white/10 rounded-lg text-white transition-colors" title="Align Left">⫷</button>
                <button onClick={() => { document.execCommand('justifyCenter'); editorRef.current?.focus(); }} className="px-3 py-1.5 hover:bg-white/10 rounded-lg text-white transition-colors" title="Align Center">≡</button>
                <button onClick={() => { document.execCommand('justifyRight'); editorRef.current?.focus(); }} className="px-3 py-1.5 hover:bg-white/10 rounded-lg text-white transition-colors" title="Align Right">⫸</button>
              </div>

              <div className="flex bg-black/50 p-1 rounded-xl border border-white/5 shadow-inner gap-1">
                <button onClick={() => { document.execCommand('insertUnorderedList'); editorRef.current?.focus(); }} className="px-3 py-1.5 hover:bg-white/10 rounded-lg text-white transition-colors" title="Bullet List">• List</button>
                <button onClick={() => { document.execCommand('insertOrderedList'); editorRef.current?.focus(); }} className="px-3 py-1.5 hover:bg-white/10 rounded-lg text-white transition-colors" title="Numbered List">1. List</button>
                <button onClick={() => { document.execCommand('outdent'); editorRef.current?.focus(); }} className="px-3 py-1.5 hover:bg-white/10 rounded-lg text-white transition-colors" title="Decrease Indent">⇥-</button>
                <button onClick={() => { document.execCommand('indent'); editorRef.current?.focus(); }} className="px-3 py-1.5 hover:bg-white/10 rounded-lg text-white transition-colors" title="Increase Indent">⇥+</button>
              </div>

              <div className="flex bg-black/50 p-1 rounded-xl border border-white/5 shadow-inner gap-2 px-3 items-center">
                <div className="flex items-center gap-2" title="Text Color">
                  <div className="w-4 h-4 rounded-full bg-gradient-to-tr from-red-500 via-green-500 to-blue-500 relative overflow-hidden ring-1 ring-white/20">
                    <input type="color" onChange={(e) => { document.execCommand('foreColor', false, e.target.value); editorRef.current?.focus(); }} className="absolute inset-[-10px] w-10 h-10 cursor-pointer opacity-0" />
                  </div>
                </div>
                <div className="w-px h-5 bg-white/10 mx-1"></div>
                <div className="flex items-center gap-2" title="Highlight Color">
                  <div className="w-4 h-4 rounded bg-yellow-400 relative overflow-hidden ring-1 ring-white/20">
                    <input type="color" onChange={(e) => { document.execCommand('hiliteColor', false, e.target.value); editorRef.current?.focus(); }} defaultValue="#ffffff" className="absolute inset-[-10px] w-10 h-10 cursor-pointer opacity-0" />
                  </div>
                </div>
              </div>

              <div className="flex bg-black/50 p-1 rounded-xl border border-white/5 shadow-inner gap-1">
                <button onClick={undo} disabled={historyPointer <= 0} className="px-4 py-1.5 hover:bg-white/10 rounded-lg text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors font-bold" title="Undo AI Formatting">↩</button>
                <button onClick={redo} disabled={historyPointer >= historyStack.length - 1} className="px-4 py-1.5 hover:bg-white/10 rounded-lg text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors font-bold" title="Redo AI Formatting">↪</button>
              </div>

              <div className="flex-grow"></div>
              
              <button 
                onClick={autoFormatText}
                disabled={isFormatting}
                className="relative group overflow-hidden rounded-xl p-[1px] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="absolute inset-0 bg-gradient-to-r from-amber-400 via-orange-500 to-amber-400 rounded-xl opacity-70 group-hover:opacity-100 blur-sm transition-opacity duration-500"></span>
                <div className="relative bg-gray-900 px-5 py-2 rounded-xl transform transition-transform duration-200 group-active:scale-[0.96] flex items-center gap-2 text-white font-bold shadow-inner">
                  {isFormatting ? (
                    <><span className="animate-spin inline-block">⏳</span> Processing...</>
                  ) : (
                    <><span className="text-lg">✨</span> AI Format</>
                  )}
                </div>
              </button>
            </div>

            {/* Editable Content Workspace (3D depth effect) */}
            <div className="flex-grow overflow-hidden flex flex-col bg-[#1e1e24] relative shadow-[inset_0_20px_50px_rgba(0,0,0,0.5)] p-2 md:p-6">
               <div 
                 ref={editorRef}
                 contentEditable
                 className="flex-grow w-full max-w-full mx-auto bg-white shadow-[0_20px_60px_rgba(0,0,0,0.8)] border border-gray-300 text-gray-900 focus:outline-none font-sans overflow-y-auto rounded-xl px-6 py-8 md:px-12 md:py-12 transition-all"
                 style={{ minHeight: '100%', fontSize: '16px', lineHeight: '1.7' }}
               />
            </div>

            <div className="p-6 border-t border-white/5 bg-gray-900 flex justify-end gap-4 shadow-[0_-10px_30px_rgba(0,0,0,0.3)] z-10">
              <button onClick={() => downloadEditedDocx(editingResult.Resume)} className="bg-white/5 hover:bg-blue-600/20 border border-blue-500/50 text-blue-300 hover:text-blue-200 px-6 py-3 rounded-xl font-bold transition-all duration-300 transform hover:-translate-y-1 shadow-[0_4px_15px_rgba(59,130,246,0.1)] hover:shadow-[0_4px_20px_rgba(59,130,246,0.3)] flex items-center gap-2">
                <span className="text-xl">📄</span> Export Word
              </button>
              <button onClick={() => downloadEditedPdf(editingResult.Resume)} className="bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white px-6 py-3 rounded-xl font-bold transition-all duration-300 transform hover:-translate-y-1 shadow-[0_4px_15px_rgba(239,68,68,0.3)] hover:shadow-[0_4px_25px_rgba(239,68,68,0.5)] flex items-center gap-2">
                <span className="text-xl">🖨️</span> Print PDF
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
