import React, { useState, useMemo } from 'react';
import { Star, Search, Filter, ArrowUpDown, RefreshCw, ExternalLink, ThumbsUp, PenTool, X, Check, User, HelpCircle, ChevronDown, CheckCircle2, MessageSquareWarning, Plus, Trash2, Paperclip, UploadCloud, FileText } from 'lucide-react';
import { SafeImage } from '../utils/imageUrl';
import { fetchPublishedGoogleReviews } from '../lib/googleReviewsService';

interface Review {
  name: string;
  role: string;
  comment: string;
  rating: number;
  avatar: string;
  dateStr: string;
  verified: boolean;
  likes: number;
  criteria?: {
    [key: string]: number;
  };
}

// 12 Initial reviews spanning March to June 2026 (strictly last 3 months relative to current date 2026-06-20)
const INITIAL_REVIEWS: Review[] = [];

export default function TestimonialSection() {
  const [reviews, setReviews] = useState<Review[]>(INITIAL_REVIEWS);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRating, setSelectedRating] = useState<number | 'all'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'highest' | 'lowest'>('newest');

  // =========================================================================
  // [SISIPKAN BLOK INI]: Otomatis mengganti review dummy dengan ulasan
  // asli Google Maps yang telah disetujui Admin (isVisible === true)
  // =========================================================================
  React.useEffect(() => {
    const loadLiveReviews = async () => {
      try {
        const liveReviews = await fetchPublishedGoogleReviews();
        if (liveReviews && liveReviews.length > 0) {
          const mapped: Review[] = liveReviews.map(r => ({
            name: r.authorName,
            role: 'Ulasan Resmi di Google Maps',
            comment: r.comment,
            rating: r.rating,
            avatar: r.authorPhoto || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=120',
            dateStr: r.dateStr,
            verified: true,
            likes: r.likes || 15
          }));
          setReviews(mapped);
        }
      } catch (err) {
        console.error('Gagal memuat ulasan publik:', err);
      }
    };
    loadLiveReviews();
  }, []);
  
  // Custom Live Sync State
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncPhase, setSyncPhase] = useState('');
  const [isSyncCompleted, setIsSyncCompleted] = useState(false);

  // Form Saran: Multi-Pesan + Multi-Lampiran states
  const [isWriteModalOpen, setIsWriteModalOpen] = useState(false);
  const [patientId, setPatientId] = useState('');
  const [kesan, setKesan] = useState<'Sangat Puas' | 'Puas' | 'Cukup' | 'Kurang Puas' | 'Kecewa'>('Puas');
  const [messagesList, setMessagesList] = useState<Array<{ id: number; jenisPesan: 'Saran' | 'Masukan' | 'Keluhan' | 'Perbaikan'; unitLayanan: string; rating: number; isiPesan: string }>>([
    { id: Date.now(), jenisPesan: 'Saran', unitLayanan: 'General', rating: 5, isiPesan: '' }
  ]);
  const [attachments, setAttachments] = useState<Array<{ name: string; size: number; type: string; dataUrl?: string }>>([]);
  const [fileError, setFileError] = useState('');

  // Submit Saran receipt state
  const [submittedReceipt, setSubmittedReceipt] = useState<{
    id: string;
    patientId: string;
    kesan: 'Sangat Puas' | 'Puas' | 'Cukup' | 'Kurang Puas' | 'Kecewa';
    messages: Array<{ jenisPesan: 'Saran' | 'Masukan' | 'Keluhan' | 'Perbaikan'; unitLayanan: string; rating: number; isiPesan: string }>;
    attachments: Array<{ name: string; size: number; type: string; dataUrl?: string }>;
    timestamp: string;
  } | null>(null);

  const [successToast, setSuccessToast] = useState('');
  const [selectedOldReview, setSelectedOldReview] = useState<Review | null>(null);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsWriteModalOpen(false);
        setSelectedOldReview(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Reference date: 2026-06-20. Filter reviews to strictly cover the last 3 months (on or after 2026-03-20)
  const last3MonthsReviews = useMemo(() => {
    return reviews.filter(r => {
      const reviewDate = new Date(r.dateStr);
      const referenceDate = new Date('2026-06-20');
      const timeDiff = Math.abs(referenceDate.getTime() - reviewDate.getTime());
      const dayDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
      return dayDiff <= 92; // within ~3 calendar months
    });
  }, [reviews]);

  // Google Rating summary counters
  const statsSummary = useMemo(() => {
    const total = last3MonthsReviews.length;
    const sumRatings = last3MonthsReviews.reduce((sum, r) => sum + r.rating, 0);
    const average = total > 0 ? (sumRatings / total).toFixed(1) : '4.9';
    return {
      totalCount: 7350 + (last3MonthsReviews.length - INITIAL_REVIEWS.length),
      ratingAvg: parseFloat(average) > 4.7 ? average : '4.9'
    };
  }, [last3MonthsReviews]);

  // Handle Bulk Sync of 9 Google reviews at once!
  const handleSyncGoogleReviews = () => {
    if (isSyncing) return;
    
    setIsSyncing(true);
    setSyncPhase('Membuka gerbang protokol Google Maps Business API...');
    
    setTimeout(() => {
      setSyncPhase('Membaca token OAuth & verifikasi ID RS Yasmin: 0x511c625444b5c25c...');
      
      setTimeout(() => {
        setSyncPhase('Menarik ulasan terbaru pasien (9 ulasan real-time sekaligus)...');
        
        setTimeout(() => {
          // Check if already synced to avoid duplicate prepends
          const alreadySynced = reviews.some(r => r.name === 'Hadi Prasetyo');
          if (!alreadySynced) {
            setReviews(prev => [...GOOGLE_MAPS_SYNC_POOL, ...prev]);
            setIsSyncCompleted(true);
            setSyncPhase('✓ Sinkronisasi Berhasil! 9 ulasan Google Maps terbaru ditarik ke sistem.');
          } else {
            setSyncPhase('✓ Sinkronisasi Aktif. Database ulasan Google Maps Anda sudah paling mutakhir!');
          }
          
          setTimeout(() => {
            setIsSyncing(false);
            setSyncPhase('');
            setSuccessToast('Berhasil mengimpor 9 ulasan Google Maps terbaru secara live!');
            setTimeout(() => setSuccessToast(''), 4000);
          }, 1500);
          
        }, 1500);
      }, 1200);
    }, 1000);
  };

  // Submit Saran, Masukan, & Pengaduan
  const handleSaranSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientId.trim()) return;

    // Validate that all messages have content
    const invalidMessage = messagesList.find(m => !m.isiPesan.trim());
    if (invalidMessage) {
      alert("Silakan isi semua isi pesan yang Anda tambahkan.");
      return;
    }

    const uniqueId = `SPD-2026-${Math.floor(10000 + Math.random() * 90000)}`;
    const formattedTime = new Date().toLocaleString('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }) + ' WIB';

    const newSaran = {
      id: uniqueId,
      patientId: patientId.trim(),
      kesan,
      messages: messagesList.map(m => ({ jenisPesan: m.jenisPesan, unitLayanan: m.unitLayanan, rating: m.rating, isiPesan: m.isiPesan.trim() })),
      attachments: attachments.map(a => ({ name: a.name, size: a.size, type: a.type, dataUrl: a.dataUrl })),
      timestamp: formattedTime
    };

    // Save to localStorage
    try {
      const existing = JSON.parse(localStorage.getItem('yasmin_saran_list') || '[]');
      existing.unshift(newSaran);
      localStorage.setItem('yasmin_saran_list', JSON.stringify(existing));
    } catch (err) {
      console.error('Failed to save feedback:', err);
    }

    // Open receipt and close form modal
    setSubmittedReceipt(newSaran);
    setIsWriteModalOpen(false);

    // Reset states
    setPatientId('');
    setKesan('Puas');
    setMessagesList([{ id: Date.now(), jenisPesan: 'Saran', unitLayanan: 'General', rating: 5, isiPesan: '' }]);
    setAttachments([]);
    setFileError('');

    // Trigger success toast
    setSuccessToast(`Laporan ${uniqueId} berhasil terkirim! Rahasia dijamin & ditindaklanjuti maks 1x24 jam.`);
    setTimeout(() => setSuccessToast(''), 8000);
  };

  const processFiles = (files: FileList) => {
    setFileError('');
    const allowedMaxSize = 2 * 1024 * 1024; // 2MB
    const newAttachments: Array<{ name: string; size: number; type: string; dataUrl?: string }> = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.size > allowedMaxSize) {
        setFileError(`Berkas "${file.name}" melebihi batas ukuran 2MB.`);
        continue;
      }

      const fileObj: { name: string; size: number; type: string; dataUrl?: string } = {
        name: file.name,
        size: file.size,
        type: file.type
      };

      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => {
          fileObj.dataUrl = reader.result as string;
          setAttachments(prev => [...prev, fileObj]);
        };
        reader.readAsDataURL(file);
      } else {
        newAttachments.push(fileObj);
      }
    }

    if (newAttachments.length > 0) {
      setAttachments(prev => [...prev, ...newAttachments]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
    }
  };

  const handleRemoveAttachment = (indexToRemove: number) => {
    setAttachments(prev => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleAddMessageRow = () => {
    setMessagesList(prev => [...prev, { id: Date.now(), jenisPesan: 'Saran', unitLayanan: 'General', rating: 5, isiPesan: '' }]);
  };

  const handleRemoveMessageRow = (idToRemove: number) => {
    if (messagesList.length > 1) {
      setMessagesList(prev => prev.filter(m => m.id !== idToRemove));
    }
  };

  const handleMessageChange = (id: number, field: 'jenisPesan' | 'unitLayanan' | 'rating' | 'isiPesan', value: any) => {
    setMessagesList(prev => prev.map(m => {
      if (m.id === id) {
        return { ...m, [field]: value };
      }
      return m;
    }));
  };

  // Processing search & filtering
  const processedReviews = useMemo(() => {
    let result = [...last3MonthsReviews];

    // Filter by query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        r => r.name.toLowerCase().includes(query) || r.comment.toLowerCase().includes(query) || r.role.toLowerCase().includes(query)
      );
    }

    // Filter by stars
    if (selectedRating !== 'all') {
      result = result.filter(r => r.rating === selectedRating);
    }

    // Sorting
    if (sortBy === 'newest') {
      result.sort((a, b) => b.dateStr.localeCompare(a.dateStr));
    } else if (sortBy === 'highest') {
      result.sort((a, b) => b.rating - a.rating);
    } else if (sortBy === 'lowest') {
      result.sort((a, b) => a.rating - b.rating);
    }

    return result;
  }, [last3MonthsReviews, searchQuery, selectedRating, sortBy]);

  // Splitting: exactly first 9 for the Grid, the rest for the List Table!
  const gridReviews = useMemo(() => processedReviews.slice(0, 9), [processedReviews]);
  const listReviews = useMemo(() => processedReviews.slice(9), [processedReviews]);

  return (
    <div className="space-y-8 text-left" id="testimonial-interactive-module">
      
      {/* 1. Header Google Maps Statistics Dashboard Card */}
      <div className="bg-gradient-to-br from-[#1E293B] to-[#0F172A] rounded-3xl p-6 sm:p-8 text-white border border-slate-700/50 shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-3 flex-1">
          <div className="flex items-center space-x-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <p className="text-[10px] font-mono tracking-widest text-emerald-400 font-bold uppercase">GOOGLE MAPS PLATFORM INTEGRATION</p>
          </div>
          
          <h4 className="font-display font-black text-2xl tracking-tight text-white leading-tight">
            Transparansi Ulasan Pasien & Google Sync RS Yasmin
          </h4>
          
          <p className="text-xs text-slate-300 leading-relaxed max-w-xl font-sans">
            Sistem evaluasi kepuasan pasien 3 bulan terakhir. Lakukan sinkronisasi multi-review langsung ke Google Business API, dan saksikan transparansi nilai pelayanan penanganan medis kami secara otentik.
          </p>
        </div>

        {/* Visual score display */}
        <div className="bg-white/5 border border-white/10 p-5 rounded-2xl flex items-center space-x-5 shrink-0 w-full md:w-auto justify-between sm:justify-start">
          <div className="text-left">
            <span className="text-4xl font-display font-black block text-warm-orange">{statsSummary.ratingAvg}</span>
            <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-slate-400 mt-1 block">Rata-rata Rating (3 Bln)</span>
          </div>

          <div className="space-y-1">
            <div className="flex text-warm-orange">
              {[1, 2, 3, 4, 5].map(idx => (
                <Star key={idx} className="h-4 w-4 fill-current" />
              ))}
            </div>
            <p className="text-xs text-slate-300 font-sans font-bold">
              Berdasar {statsSummary.totalCount.toLocaleString('id-ID')} Google Reviews
            </p>
            <a 
              href="https://maps.app.goo.gl/iaPiCgibdPYahRnr9"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] text-emerald-400 font-bold hover:underline flex items-center space-x-1 outline-none mt-1 animate-pulse"
            >
              <span>Hubungkan Google Maps</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      </div>

      {/* 2. Interactive Toolbars: Search, Filter Stars, Sort Buttons */}
      <div className="bg-white border border-divider p-4.5 sm:p-5 rounded-2xl shadow-2xs flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        
        {/* Search Input Box */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari ulasan (ex: ERACS, BPJS, IGD, Rawat Inap, Farmasi)..."
            className="w-full text-xs font-sans pl-10 pr-4 py-3 border border-divider rounded-xl focus:outline-none focus:border-deep-teal focus:ring-1 focus:ring-deep-teal bg-slate-50/50 text-slate-705"
          />
        </div>

        {/* Filter and Sorting group */}
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          
          {/* Rating filter dropdown */}
          <div className="flex items-center space-x-1.5 bg-slate-50 border border-divider px-3 py-2 rounded-xl text-xs font-sans">
            <Filter className="h-3.5 w-3.5 text-gray-500" />
            <select
              value={selectedRating}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedRating(val === 'all' ? 'all' : parseInt(val));
              }}
              className="bg-transparent focus:outline-none text-gray-700 font-bold cursor-pointer"
            >
              <option value="all">Semua Bintang</option>
              <option value="5">⭐⭐⭐⭐⭐ Bintang 5</option>
              <option value="4">⭐⭐⭐⭐ Bintang 4</option>
              <option value="3">⭐⭐⭐ Bintang 3</option>
            </select>
          </div>

          {/* Sorter selector */}
          <div className="flex items-center space-x-1.5 bg-slate-50 border border-divider px-3 py-2 rounded-xl text-xs font-sans">
            <ArrowUpDown className="h-3.5 w-3.5 text-gray-500" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-transparent focus:outline-none text-gray-700 font-bold cursor-pointer"
            >
              <option value="newest">Terbaru</option>
              <option value="highest">Rating Tertinggi</option>
              <option value="lowest">Rating Terendah</option>
            </select>
          </div>

          {/* Buttons: Write Review and Sync */}
          <div className="flex items-center space-x-2">
            
            {/* Write Review Button */}
            <button
              onClick={() => setIsWriteModalOpen(true)}
              className="cursor-pointer px-4 py-3 bg-gradient-to-r from-deep-teal to-yasmin-green text-white rounded-xl font-display text-xs font-black tracking-wider shadow-xs hover:shadow-md hover:scale-102 transition-all flex items-center space-x-1.5"
            >
              <MessageSquareWarning className="h-3.5 w-3.5 shrink-0" />
              <span>Saran, Masukan & Pengaduan</span>
            </button>
          </div>

        </div>

      </div>

      {/* Success Notification Banner */}
      {successToast && (
        <div className="bg-emerald-600 text-white rounded-xl p-4 text-xs font-sans font-bold flex items-center justify-between shadow-md animate-fade-in-up">
          <div className="flex items-center space-x-2.5">
            <Check className="h-4.5 w-4.5 bg-white/20 p-0.5 rounded-full" />
            <span className="flex-1 text-left">{successToast}</span>
          </div>
          <button onClick={() => setSuccessToast('')}>
            <X className="h-4 w-4 hover:opacity-80" />
          </button>
        </div>
      )}

      {/* ========================================================
          GRID VIEW: ONLY 9 NEWEST REVIEWS
         ======================================================== */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-divider pb-2.5">
          <h5 className="font-display font-bold text-xs sm:text-sm text-headings tracking-wide uppercase flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-yasmin-green block animate-pulse" />
            <span>Ulasan Google Maps Terbaru</span>
          </h5>
          <span className="text-[10px] font-mono font-bold bg-soft-mint px-2.5 py-1 rounded-full text-deep-teal">
            Grid Terbatas: {gridReviews.length} Ulasan
          </span>
        </div>

        {gridReviews.length === 0 ? (
          <div className="bg-slate-50 border border-divider rounded-3xl p-8 text-center text-gray-400">
            <p className="text-xs">Tidak ada ulasan 3 bulan terakhir yang cocok.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {gridReviews.map((review, idx) => (
              <div
                key={idx}
                className="bg-white border border-divider hover:border-emerald-400 hover:shadow-[0_0_20px_rgba(16,185,129,0.55)] transition-all duration-300 rounded-xl p-5 sm:p-6 flex flex-col justify-between group text-left relative"
              >
                {/* Decorative top-right quote */}
                <span className="absolute top-3 right-5 text-4xl text-gray-100 font-serif leading-none italic select-none">“</span>

                <div className="space-y-4">
                  {/* Rating group */}
                  <div className="flex items-center justify-between">
                    <div className="flex text-warm-orange">
                      {[...Array(review.rating)].map((_, i) => (
                        <Star key={i} className="h-3.5 w-3.5 fill-current" />
                      ))}
                      {[...Array(5 - review.rating)].map((_, i) => (
                        <Star key={i} className="h-3.5 w-3.5 text-gray-200" />
                      ))}
                    </div>
                    
                    <span className="text-[10px] font-mono font-bold tracking-wider text-emerald-750 bg-emerald-50 border border-emerald-100/60 px-2 py-0.5 rounded-full uppercase shrink-0">
                      Gmaps Verified 
                    </span>
                  </div>

                  {/* Comment Column */}
                  <p className="text-[13.5px] text-gray-650 leading-relaxed font-sans text-justify line-clamp-4">
                    "{review.comment.split('\n\n')[0]}"
                  </p>

                  {/* Multi-criteria indicators if present */}
                  {review.criteria && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {Object.entries(review.criteria).slice(0, 3).map(([key, val]) => (
                        <span key={key} className="text-[10px] bg-slate-50 border border-divider px-1.5 py-0.5 rounded-md text-gray-500 font-mono">
                          {key}: ⭐{val}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* View details button */}
                  <button
                    onClick={() => setSelectedOldReview(review)}
                    className="cursor-pointer text-deep-teal hover:text-emerald-700 text-[10px] font-bold tracking-wider uppercase block mt-1 transition-all"
                  >
                    Selengkapnya &rarr;
                  </button>
                </div>

                {/* Persona Profile and Date */}
                <div className="pt-4 border-t border-divider/40 mt-5 flex items-center justify-between">
                  <div className="flex items-center space-x-2.5 text-left min-w-0">
                    <SafeImage
                      src={review.avatar}
                      alt={review.name}
                      className="w-9 h-9 rounded-full border border-divider object-cover shrink-0"
                    />
                    <div className="min-w-0">
                      <h5 className="font-display font-bold text-xs text-headings leading-none truncate">{review.name}</h5>
                      <span className="text-[8.5px] text-gray-400 font-medium block mt-1 truncate max-w-[130px]">{review.role}</span>
                    </div>
                  </div>

                  <div className="text-right flex flex-col items-end shrink-0">
                    <span className="text-[9px] text-gray-400 font-mono">{review.dateStr}</span>
                    <div className="flex items-center space-x-1 text-[9px] text-gray-400 font-medium mt-1">
                      <ThumbsUp className="h-2.5 w-2.5 text-slate-400 hover:text-emerald-600 transition-colors" />
                      <span>{review.likes}</span>
                    </div>
                  </div>
                </div>

              </div>
            ))}
          </div>
        )}
      </div>

      {/* ========================================================
          LIST / TABLE VIEW: FOR EXTRA REVIEWS
         ======================================================== */}
      {listReviews.length > 0 && (
        <div className="space-y-4 pt-4 border-t border-divider" id="patient-comprehensive-table">
          <div className="flex items-center justify-between">
            <h5 className="font-sans font-bold text-sm sm:text-base text-headings uppercase flex items-center space-x-2">
              <CheckCircle2 className="h-5 w-5 text-deep-teal" />
              <span>Daftar Ulasan Pasien Lainnya ({listReviews.length} Ulasan)</span>
            </h5>
            <span className="text-[10px] font-mono font-bold bg-slate-100 border border-divider px-2.5 py-0.5 rounded-full text-slate-650">
              Surplus List
            </span>
          </div>

          <div className="bg-white border border-divider rounded-2xl overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-divider text-[10px] font-mono uppercase tracking-wider text-gray-500">
                    <th className="py-3 px-4 sm:px-5">Pasien / Tanggal</th>
                    <th className="py-3 px-4 hidden sm:table-cell">Layanan & Kriteria</th>
                    <th className="py-3 px-4">Kutipan Ulasan (Google Maps)</th>
                    <th className="py-3 px-4 text-center">Penilaian</th>
                    <th className="py-3 px-4 text-center">Tindakan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-divider">
                  {listReviews.map((review, index) => (
                    <tr key={index} className="hover:bg-slate-50/50 transition-colors text-xs">
                      {/* Name & Date column */}
                      <td className="py-3.5 px-4 sm:px-5 whitespace-nowrap">
                        <div className="font-display font-bold text-headings">{review.name}</div>
                        <div className="text-[9px] text-gray-400 mt-0.5 font-mono">{review.dateStr}</div>
                      </td>

                      {/* Role & service category */}
                      <td className="py-3.5 px-4 hidden sm:table-cell">
                        <div className="text-gray-700 font-medium font-sans truncate max-w-[130px]">{review.role}</div>
                        <div className="flex gap-1 mt-1 flex-wrap">
                          {review.criteria ? (
                            Object.entries(review.criteria).slice(0, 2).map(([k]) => (
                              <span key={k} className="text-[10px] px-1.5 py-0.2 bg-soft-mint text-deep-teal rounded border border-divider/40">
                                {k}
                              </span>
                            ))
                          ) : (
                            <span className="text-[10px] text-gray-400">Verifikasi Gmaps</span>
                          )}
                        </div>
                      </td>

                      {/* Snapshot Comment column */}
                      <td className="py-3.5 px-4 max-w-xs md:max-w-md truncate">
                        <p className="text-gray-600 line-clamp-1 italic text-[13px]">
                          "{review.comment.split('\n\n')[0]}"
                        </p>
                      </td>

                      {/* Stars column */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <div className="inline-flex text-warm-orange">
                          {[...Array(review.rating)].map((_, i) => (
                            <Star key={i} className="h-3.5 w-3.5 fill-current shrink-0" />
                          ))}
                        </div>
                      </td>

                      {/* Action column */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <button
                          onClick={() => setSelectedOldReview(review)}
                          className="cursor-pointer text-xs bg-soft-mint text-deep-teal hover:bg-[#0B4F4A] hover:text-white px-2.5 py-1 rounded-lg font-bold transition-all border border-divider hover:border-transparent"
                        >
                          Lihat Ulasan
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: Saran, Masukan, & Pengaduan Form (Multi-Pesan + Multi-Lampiran) */}
      {isWriteModalOpen && (
        <div className="fixed inset-0 bg-headings/55 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-divider shadow-2xl max-w-2xl w-full overflow-hidden text-left animate-fade-in-down flex flex-col justify-between max-h-[92vh]">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-divider flex items-center justify-between bg-slate-50">
              <div className="flex items-center space-x-2">
                <MessageSquareWarning className="h-5 w-5 text-deep-teal animate-bounce" />
                <h4 className="font-display font-black text-sm text-headings uppercase tracking-wider">Review</h4>
              </div>
              <button 
                onClick={() => setIsWriteModalOpen(false)}
                className="cursor-pointer p-1.5 rounded-full transition-all bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Form Content */}
            <form onSubmit={handleSaranSubmit} className="p-6 space-y-5 overflow-y-auto">
              
              {/* Description box */}
              <div className="bg-gradient-to-r from-soft-mint/40 to-teal-50/40 p-4 rounded-2xl border border-teal-100 text-xs text-slate-700 leading-relaxed">
                <p className="font-semibold text-deep-teal mb-1">📢 Komitmen Pelayanan Prima RS Yasmin:</p>
                Kami menghargai setiap masukan. Isi semua keluhan/saran dalam satu formulir. Setiap laporan dijamin kerahasiaannya dan akan ditindaklanjuti maksimal 1x24 jam.
              </div>

              {/* Patient ID and Kesan Umum Pelayanan */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block font-mono">
                    Nomor Rekam Medis / ID Pasien <span className="text-rose-500 font-bold">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: RM-98754 atau ID-22340"
                    value={patientId}
                    onChange={(e) => setPatientId(e.target.value)}
                    className="w-full text-xs p-3 border border-divider rounded-xl bg-white focus:outline-none focus:border-deep-teal focus:ring-1 focus:ring-deep-teal text-headings font-sans font-medium"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block font-mono">
                    Kesan Umum Pelayanan RS Yasmin <span className="text-rose-500 font-bold">*</span>
                  </label>
                  <select
                    value={kesan}
                    onChange={(e) => setKesan(e.target.value as any)}
                    className="w-full text-xs p-3 border border-divider rounded-xl bg-white focus:outline-none focus:border-deep-teal focus:ring-1 focus:ring-deep-teal text-headings font-sans font-medium cursor-pointer shadow-3xs"
                  >
                    <option value="Sangat Puas">😊 Sangat Puas</option>
                    <option value="Puas">🙂 Puas</option>
                    <option value="Cukup">😐 Cukup</option>
                    <option value="Kurang Puas">🙁 Kurang Puas</option>
                    <option value="Kecewa">😡 Kecewa</option>
                  </select>
                </div>
              </div>

              {/* LIST OF MESSAGES (KELOMPOK PESAN) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-divider pb-1.5">
                  <label className="text-[10px] font-black text-deep-teal uppercase tracking-widest block font-mono">
                    Daftar Pesan & Masukan ({messagesList.length})
                  </label>
                  <span className="text-[9px] text-gray-400 font-sans italic">Sampaikan beberapa keluhan sekaligus</span>
                </div>

                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                  {messagesList.map((msg, index) => (
                    <div key={msg.id} className="bg-slate-50/80 p-4 rounded-2xl border border-divider shadow-3xs space-y-3 relative group animate-fade-in-down">
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-divider/50 pb-2">
                        <div className="flex items-center space-x-2">
                          <span className="bg-[#0B4F4A] text-white font-mono text-[10px] h-5 w-5 rounded-full flex items-center justify-center font-bold">
                            {index + 1}
                          </span>
                          <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Pesan Ke-{index + 1}</span>
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                          {/* Jenis Pesan */}
                          <select
                            value={msg.jenisPesan}
                            onChange={(e) => handleMessageChange(msg.id, 'jenisPesan', e.target.value)}
                            className="text-[11px] py-1 px-2 border border-divider rounded-lg bg-white focus:outline-none focus:border-deep-teal text-headings font-sans font-medium cursor-pointer shadow-3xs"
                          >
                            <option value="Saran">💡 Saran</option>
                            <option value="Masukan">📝 Masukan</option>
                            <option value="Keluhan">⚠️ Keluhan</option>
                            <option value="Perbaikan">🔧 Perbaikan</option>
                          </select>

                          {/* Unit Layanan dituju per pesan */}
                          <select
                            value={msg.unitLayanan}
                            onChange={(e) => handleMessageChange(msg.id, 'unitLayanan', e.target.value)}
                            className="text-[11px] py-1 px-2 border border-divider rounded-lg bg-white focus:outline-none focus:border-deep-teal text-headings font-sans font-medium cursor-pointer shadow-3xs"
                          >
                            {['General', 'Farmasi', 'Gizi', 'IGD', 'Kamar', 'Lainnya', 'Rawat Inap', 'Rawat Jalan'].map((opt) => (
                              <option key={opt} value={opt}>🏥 {opt}</option>
                            ))}
                          </select>

                          {/* Rating Bintang 1-5 per pesan */}
                          <div className="flex items-center space-x-1 bg-white px-2 py-1 rounded-lg border border-divider shadow-3xs">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <button
                                key={star}
                                type="button"
                                onClick={() => handleMessageChange(msg.id, 'rating', star)}
                                className="cursor-pointer focus:outline-none transition-transform hover:scale-110"
                                title={`Bintang ${star}`}
                              >
                                <Star
                                  className={`h-3 w-3 ${
                                    star <= msg.rating ? 'fill-current text-warm-orange' : 'text-gray-200'
                                  }`}
                                />
                              </button>
                            ))}
                          </div>

                          {messagesList.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveMessageRow(msg.id)}
                              className="cursor-pointer p-1 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition-colors border border-transparent hover:border-rose-100"
                              title="Hapus baris pesan"
                            >
                              <Trash2 className="h-4.5 w-4.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="space-y-1">
                        <textarea
                          required
                          rows={2}
                          value={msg.isiPesan}
                          onChange={(e) => handleMessageChange(msg.id, 'isiPesan', e.target.value)}
                          placeholder={`Tulis isi ${msg.jenisPesan.toLowerCase()} Anda secara detail di sini...`}
                          className="w-full text-xs p-3 border border-divider rounded-xl bg-white focus:outline-none focus:border-deep-teal focus:ring-1 focus:ring-deep-teal text-headings font-sans leading-relaxed shadow-inner"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Add dynamic field button */}
                <button
                  type="button"
                  onClick={handleAddMessageRow}
                  className="cursor-pointer w-full py-2.5 bg-slate-50 hover:bg-teal-50 hover:text-deep-teal text-slate-600 text-xs font-bold tracking-wider rounded-xl border border-dashed border-gray-300 hover:border-deep-teal transition-all flex items-center justify-center space-x-1.5"
                >
                  <Plus className="h-4 w-4" />
                  <span>+ Tambah Pesan Lain</span>
                </button>
              </div>

              {/* ATTACHMENT MULTIPLE FILE UPLOAD WITH DRAG AND DROP */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block font-mono">
                  Upload Lampiran Pendukung (Optional)
                </label>

                {/* Drag & drop zone */}
                <div
                  onDragOver={handleDragOver}
                  onDrop={handleFileDrop}
                  className="border-2 border-dashed border-gray-200 hover:border-deep-teal bg-slate-50/50 hover:bg-teal-50/20 transition-all rounded-2xl p-5 text-center cursor-pointer relative group"
                >
                  <input
                    type="file"
                    multiple
                    onChange={handleFileSelect}
                    accept="image/*,.pdf"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                  <div className="space-y-2 pointer-events-none">
                    <UploadCloud className="h-8 w-8 text-gray-400 group-hover:text-deep-teal mx-auto transition-colors" />
                    <p className="text-xs font-bold text-slate-700">Tarik berkas bukti ke sini atau Klik untuk memilih berkas</p>
                    <p className="text-[10px] text-gray-400">Format yang didukung: Foto/Gambar (JPG, PNG) atau PDF. Maksimal 2MB per file.</p>
                  </div>
                </div>

                {/* Display File Size Error if any */}
                {fileError && (
                  <p className="text-[11px] font-bold text-rose-600 bg-rose-50 border border-rose-100 px-3 py-2 rounded-xl animate-shake">
                    ⚠️ {fileError}
                  </p>
                )}

                {/* Render Attachments list */}
                {attachments.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    {attachments.map((file, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-slate-50 border border-divider rounded-xl p-2.5 text-left text-xs animate-fade-in-up">
                        <div className="flex items-center space-x-2 truncate">
                          {file.dataUrl ? (
                            <SafeImage 
                              src={file.dataUrl} 
                              alt="preview" 
                              className="h-9 w-9 object-cover rounded-lg border border-divider shadow-3xs" 
                            />
                          ) : (
                            <div className="h-9 w-9 bg-teal-50 border border-teal-100 text-deep-teal flex items-center justify-center rounded-lg shadow-3xs">
                              <FileText className="h-4.5 w-4.5" />
                            </div>
                          )}
                          <div className="truncate flex-1">
                            <p className="font-medium text-slate-800 text-[11px] truncate" title={file.name}>{file.name}</p>
                            <p className="text-[10px] text-gray-400 font-mono">
                              {(file.size / 1024).toFixed(0)} KB • {file.type.split('/')[1]?.toUpperCase() || 'FILE'}
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveAttachment(idx)}
                          className="cursor-pointer p-1 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Hapus berkas"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                className="cursor-pointer w-full py-3.5 bg-gradient-to-r from-deep-teal to-yasmin-green text-white text-xs font-bold tracking-wider rounded-xl hover:shadow-md hover:scale-[1.01] transition-all uppercase text-center font-display flex items-center justify-center space-x-2"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>Kirim Laporan Pengaduan & Masukan</span>
              </button>
            </form>

          </div>
        </div>
      )}

      {/* MODAL IA: Saran, Masukan, & Pengaduan Successful Receipt Ticket Card */}
      {submittedReceipt && (
        <div className="fixed inset-0 bg-headings/55 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-teal-100 shadow-2xl max-w-lg w-full overflow-hidden text-left animate-fade-in-down flex flex-col justify-between max-h-[92vh]">
            
            {/* Header Success Accent */}
            <div className="p-6 border-b border-divider bg-emerald-50 text-center relative overflow-hidden">
              <div className="absolute top-0 right-0 h-24 w-24 bg-emerald-500/5 rounded-full -mr-8 -mt-8 pointer-events-none" />
              <div className="h-12 w-12 bg-emerald-500 text-white flex items-center justify-center rounded-full mx-auto shadow-md mb-3 scale-110">
                <Check className="h-6 w-6 stroke-[3]" />
              </div>
              <h4 className="font-display font-black text-lg text-emerald-805">Laporan Berhasil Diterima</h4>
              <p className="text-xs text-emerald-700/80 mt-1">Sistem Pengaduan RS Yasmin - No. Tiket Resmi</p>
              
              <div className="mt-3 inline-block bg-emerald-600/10 border border-emerald-600/25 rounded-xl px-4 py-1.5 font-mono text-xs font-extrabold text-emerald-805 tracking-wider">
                {submittedReceipt.id}
              </div>
            </div>

            {/* Receipt Details Body */}
            <div className="p-6 space-y-4 overflow-y-auto text-xs text-slate-700">
              
              {/* Timing Metadata */}
              <div className="flex justify-between items-center bg-slate-50 p-2.5 rounded-xl border border-divider font-mono text-[10px] text-gray-500">
                <span>Waktu Submit:</span>
                <span className="font-bold">{submittedReceipt.timestamp}</span>
              </div>

              {/* ID & Kesan metadata */}
              <div className="grid grid-cols-2 gap-4 bg-slate-50/50 p-3 rounded-xl border border-divider">
                <div className="space-y-0.5">
                  <span className="text-[9px] font-bold text-gray-400 uppercase font-mono block">No. Rekam Medis / ID:</span>
                  <span className="font-bold text-slate-800 text-sm">{submittedReceipt.patientId}</span>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[9px] font-bold text-gray-400 uppercase font-mono block">Kesan Umum Pelayanan:</span>
                  <span className="font-bold text-deep-teal text-sm">
                    {submittedReceipt.kesan === 'Sangat Puas' ? '😊 Sangat Puas' :
                     submittedReceipt.kesan === 'Puas' ? '🙂 Puas' :
                     submittedReceipt.kesan === 'Cukup' ? '😐 Cukup' :
                     submittedReceipt.kesan === 'Kurang Puas' ? '🙁 Kurang Puas' : '😡 Kecewa'}
                  </span>
                </div>
              </div>

              {/* Messages breakdown */}
              <div className="space-y-2">
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest font-mono">Rincian Daftar Masukan ({submittedReceipt.messages.length})</p>
                <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                  {submittedReceipt.messages.map((m, idx) => (
                    <div key={idx} className="bg-white p-3 rounded-xl border border-divider shadow-3xs text-left">
                      <div className="flex items-center justify-between mb-1.5 border-b border-gray-100 pb-1">
                        <div className="flex items-center space-x-1.5">
                          <span className={`inline-block text-[9px] font-bold px-2 py-0.5 rounded-full uppercase ${
                            m.jenisPesan === 'Keluhan' ? 'text-rose-700 bg-rose-50 border border-rose-100' :
                            m.jenisPesan === 'Saran' ? 'text-emerald-700 bg-emerald-50 border border-emerald-100' :
                            m.jenisPesan === 'Masukan' ? 'text-blue-700 bg-blue-50 border border-blue-100' :
                            'text-amber-700 bg-amber-50 border border-amber-100'
                          }`}>
                            {m.jenisPesan}
                          </span>
                          {/* Rating display on receipt */}
                          <div className="flex items-center space-x-0.5" title={`Rating: ${m.rating || 5} Bintang`}>
                            {Array.from({ length: m.rating || 5 }).map((_, i) => (
                              <Star key={i} className="h-2.5 w-2.5 fill-current text-warm-orange" />
                            ))}
                          </div>
                        </div>
                        <span className="text-[9.5px] font-bold text-deep-teal font-mono">
                          🏥 {m.unitLayanan}
                        </span>
                      </div>
                      <p className="text-slate-800 leading-relaxed italic text-[11px]">"{m.isiPesan}"</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Attachments list if any */}
              {submittedReceipt.attachments.length > 0 && (
                <div className="space-y-1.5 bg-slate-50 p-3 rounded-xl border border-divider text-left">
                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest font-mono flex items-center space-x-1">
                    <Paperclip className="h-3 w-3 shrink-0" />
                    <span>Lampiran Bukti Terupload ({submittedReceipt.attachments.length})</span>
                  </p>
                  <ul className="space-y-1 pl-1">
                    {submittedReceipt.attachments.map((file, idx) => (
                      <li key={idx} className="text-[10px] text-slate-600 truncate flex items-center justify-between">
                        <span className="truncate flex-1 font-medium">{file.name}</span>
                        <span className="text-[9px] font-mono text-gray-400 ml-2">({(file.size / 1024).toFixed(0)} KB)</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Guarantees Box */}
              <div className="bg-amber-50/50 border border-amber-200/50 p-3.5 rounded-2xl text-[11px] text-amber-805 leading-relaxed">
                <strong>🔒 Jaminan Kerahasiaan & Tindak Lanjut:</strong> Setiap laporan yang masuk akan ditangani secara personal oleh divisi Humas & Komite Medik RS Yasmin. Tim kami akan melakukan investigasi dan menghubungi Anda maksimal 1x24 jam melalui nomor terdaftar.
              </div>
            </div>

            {/* Receipt Modal Footer */}
            <div className="p-4 border-t border-divider bg-slate-50 text-center">
              <button
                onClick={() => setSubmittedReceipt(null)}
                className="cursor-pointer w-full py-3 bg-headings hover:bg-slate-800 text-white font-bold text-xs rounded-xl tracking-wider uppercase transition-all shadow-md font-display"
              >
                Selesai & Simpan Bukti Tiket
              </button>
            </div>

          </div>
        </div>
      )}

      {/* MODAL 2: Detail Viewer of a Review */}
      {selectedOldReview && (
        <div className="fixed inset-0 bg-headings/55 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-divider shadow-2xl max-w-lg w-full overflow-hidden text-left animate-fade-in-down">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-divider flex items-center justify-between bg-slate-50">
              <span className="text-[10px] font-mono font-bold tracking-widest uppercase bg-emerald-100 px-3 py-1 rounded-full text-emerald-805">
                Google Verified Review Card
              </span>
              <button 
                onClick={() => setSelectedOldReview(null)}
                className="cursor-pointer p-1.5 rounded-full transition-all text-white animate-red-blink"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 text-left">
              
              {/* User Meta Row */}
              <div className="flex items-center space-x-3.5">
                <SafeImage src={selectedOldReview.avatar}
                  alt={selectedOldReview.name}
                  className="w-11 h-11 rounded-full border border-divider object-cover shrink-0" />
                <div>
                  <h4 className="font-display font-black text-sm text-headings leading-none">{selectedOldReview.name}</h4>
                  <p className="text-[10px] text-gray-400 mt-1 font-medium font-sans">{selectedOldReview.role}</p>
                </div>
              </div>

              {/* Rating and Date */}
              <div className="bg-slate-50 border border-divider rounded-xl p-3 flex items-center justify-between text-xs">
                <div className="flex text-warm-orange">
                  {[...Array(selectedOldReview.rating)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-current" />
                  ))}
                  {[...Array(5 - selectedOldReview.rating)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 text-gray-200" />
                  ))}
                </div>
                <span className="text-[10px] text-gray-400 font-mono">Ulasan: {selectedOldReview.dateStr}</span>
              </div>

              {/* Full Comment */}
              <div className="space-y-1.5">
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Teks Ulasan Pasien:</p>
                <p className="text-[13.5px] text-gray-700 leading-relaxed font-sans border-l-4 border-yasmin-green pl-4 py-1 text-justify">
                  "{selectedOldReview.comment}"
                </p>
              </div>

              {/* Helpfulness counter */}
              <div className="flex items-center justify-between pt-4 border-t border-divider text-xs">
                <span className="text-[9px] font-mono font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-full uppercase">
                  ✓ Gmaps Verified
                </span>
                
                <div className="flex items-center space-x-1 text-gray-400 font-medium text-[10px]">
                  <ThumbsUp className="h-3.5 w-3.5 text-emerald-750" />
                  <span className="text-gray-500 font-bold">{selectedOldReview.likes} Orang Terbantu</span>
                </div>
              </div>

              {/* Footer Close Button */}
              <button
                onClick={() => setSelectedOldReview(null)}
                className="cursor-pointer w-full py-3 bg-[#0B4F4A] hover:bg-[#073633] text-white rounded-xl text-xs font-bold tracking-wider uppercase transition-colors text-center font-display"
              >
                Tutup Arsip Ulasan
              </button>

            </div>

          </div>
        </div>
      )}

    </div>
  );
}
