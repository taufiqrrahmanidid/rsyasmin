import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { io } from 'socket.io-client';
import { 
  CheckCircle2, 
  ArrowRight, 
  ArrowLeft, 
  Stethoscope, 
  AlertCircle, 
  Clock, 
  ExternalLink, 
  RefreshCw, 
  Search, 
  CreditCard, 
  Building2, 
  HeartPulse, 
  Sparkles, 
  Copy, 
  Check, 
  Upload, 
  UserCheck, 
  UserPlus, 
  Lock, 
  ShieldCheck,
  Phone,
  KeyRound,
  X,
  XCircle
} from 'lucide-react';
import BarcodeCard from './BarcodeCard';

interface Props {
  token: string;
  onComplete: () => void;
}

const DAFTAR_POLI = [
  'Poli Anak', 'Poli Anestesi', 'Poli Bedah Tulang', 'Poli Bedah Umum', 'Poli Edukasi',
  'Poli Gigi Anak', 'Poli Gigi Bedah Mulut', 'Poli Gigi Ortodontis', 'Poli Gigi Penyakit Mulut',
  'Poli Gigi Periodonsia', 'Poli Gigi Prostodonsis', 'Poli Gigi Umum', 'Poli Jantung & Pembuluh Darah',
  'Poli Kandungan & Kebidanan', 'Poli Konselor', 'Poli Konsultasi Gizi', 'Poli Kulit Dan Kelamin',
  'Poli Mata', 'Poli Paru', 'Poli Patologi Klinis', 'Poli Penyakit Dalam', 'Poli Psikolog',
  'Poli Radiologi', 'Poli Rehab Medik', 'Poli Saraf', 'Poli THT-KL', 'Poli Umum', 'Poli Urologi'
];

const MITRA_ASURANSI = [
  'AdMedika (Third Party Administrator)', 'Prudential Life Assurance', 'Allianz Life Indonesia',
  'Mandiri Inhealth', 'Manulife Indonesia', 'FWD Insurance', 'Asuransi Astra (Garda Medika)',
  'Central Asia Financial (CAR Life)', 'Owlexa Healthcare (TPA)', 'Nayaka Era Husada',
  'Sun Life Financial', 'AXA Mandiri', 'Generali Indonesia', 'Great Eastern Life',
  'Sinarmas MSIG Life', 'Asuransi Reliance Indonesia', 'Equity Life Indonesia',
  'AIA Financial', 'Mitra Asuransi Swasta Lainnya'
];

const MITRA_PERUSAHAAN = [
  'PT Angkasa Pura II (Persero) - Bandara Banyuwangi', 'PT Bank Pembangunan Daerah Jawa Timur (Bank Jatim)',
  'PT Bank Rakyat Indonesia (Persero) Tbk (BRI)', 'PT Jasa Raharja (Persero)',
  'BPJS Ketenagakerjaan (Trauma Center)', 'PT Asuransi Jiwa Bumiputera 1912',
  'PT Pelabuhan Indonesia (Pelindo III Tanjung Wangi)', 'PT Kereta Api Indonesia (Persero) Daop 9',
  'PT Perkebunan Nusantara XII (PTPN XII)', 'Kemitraan Korporasi / Perusahaan Lainnya'
];

export default function PatientRegistrationWizard({ token, onComplete }: Props) {
  const [step, setStep] = useState(0);

  // Modern Toast Notification State
  const [toast, setToast] = useState<{ message: string; type: 'error' | 'warning' | 'success' } | null>(null);

  // Kredensial Login
  const [authPhoneOrName, setAuthPhoneOrName] = useState('');
  const [authPasscode, setAuthPasscode] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');

  // Form Data Pasien
  const [patientName, setPatientName] = useState('');
  const [phone, setPhone] = useState('');
  const [patientType, setPatientType] = useState('Umum'); 
  const [patientStatus, setPatientStatus] = useState<'Baru' | 'Lama'>('Baru');
  
  const [nik, setNik] = useState('');
  const [noRM, setNoRM] = useState('');
  const [bpjsNumber, setBpjsNumber] = useState('');
  const [insuranceProvider, setInsuranceProvider] = useState('');
  const [insuranceNumber, setInsuranceNumber] = useState('');
  const [companyPartner, setCompanyPartner] = useState('');
  const [companyCardNumber, setCompanyCardNumber] = useState('');
  
  // Poli & Dokter
  const [searchPoliQuery, setSearchPoliQuery] = useState('');
  const [selectedPoli, setSelectedPoli] = useState('Poli Anak');
  const [selectedDoctorId, setSelectedDoctorId] = useState('LDP');
  const [selectedDoctorName, setSelectedDoctorName] = useState('dr. Luty Diah Prahmani, Sp.A');
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState('08:00 - 12:00');

  const [quotaInfo, setQuotaInfo] = useState<{ totalQuota: number; used: number; remaining: number; isFull: boolean } | null>(null);
  const [loadingQuota, setLoadingQuota] = useState(false);

  // Validasi Step 5 (Pre-Validation Identity)
  const [checkingRM, setCheckingRM] = useState(false);
  const [rmSuccessMessage, setRmSuccessMessage] = useState('');
  const [validatingStep5, setValidatingStep5] = useState(false);

  // Pembayaran
  const [metodePembayaran, setMetodePembayaran] = useState<'transfer' | 'bayar_di_loket'>('transfer');
  const [bankTujuan, setBankTujuan] = useState<'Mandiri' | 'BCA'>('Mandiri');
  const [buktiTransferImage, setBuktiTransferImage] = useState<string | null>(null);
  const [copiedAccount, setCopiedAccount] = useState<string | null>(null);

  const [currentBooking, setCurrentBooking] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);

  // Helper untuk memanggil Modern Toast Notification
  const showToast = (message: string, type: 'error' | 'warning' | 'success' = 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000); 
  };

  useEffect(() => {
    const savedTicket = sessionStorage.getItem(`patient_submitted_ticket_${token}`);
    if (savedTicket) {
      try {
        setCurrentBooking(JSON.parse(savedTicket));
        setStep(7);
        return;
      } catch (e) {}
    }

    const savedAuth = sessionStorage.getItem(`patient_auth_${token}`);
    if (savedAuth) {
      try {
        const parsed = JSON.parse(savedAuth);
        setPatientName(parsed.patientName);
        setPhone(parsed.phone);
        setStep(1);
      } catch (e) {}
    }
  }, [token]);

  const refreshTicketStatus = useCallback(async (ticketId: string) => {
    try {
      const res = await fetch(import.meta.env.VITE_BACKEND_URL + '/api/pendaftaran');
      if (res.ok) {
        const list = await res.json();
        const found = list.find((item: any) => item.id === ticketId);
        if (found) {
          setCurrentBooking(found);
          sessionStorage.setItem(`patient_submitted_ticket_${token}`, JSON.stringify(found));
        }
      }
    } catch (e) {}
  }, [token]);

  useEffect(() => {
    const socket = io(import.meta.env.VITE_BACKEND_URL);
    socket.on('DASHBOARD_UPDATED', () => {
      const activeTicketId = currentBooking?.id || (sessionStorage.getItem(`patient_submitted_ticket_${token}`) ? JSON.parse(sessionStorage.getItem(`patient_submitted_ticket_${token}`)!).id : null);
      if (activeTicketId) refreshTicketStatus(activeTicketId);
    });
    return () => { socket.disconnect(); };
  }, [currentBooking?.id, token, refreshTicketStatus]);

  useEffect(() => {
    if (selectedDate && selectedTimeSlot && selectedDoctorId) {
      setLoadingQuota(true);
      fetch(`${import.meta.env.VITE_BACKEND_URL}/api/doctors/quota-check?doctorId=${encodeURIComponent(selectedDoctorId)}&doctorName=${encodeURIComponent(selectedDoctorName)}&date=${selectedDate}&timeSlot=${encodeURIComponent(selectedTimeSlot)}`)
        .then(res => res.json())
        .then(data => setQuotaInfo(data))
        .catch(() => setQuotaInfo(null))
        .finally(() => setLoadingQuota(false));
    }
  }, [selectedDate, selectedTimeSlot, selectedDoctorId, selectedDoctorName]);

  const checkIsSessionExpired = () => {
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    if (selectedDate === todayStr) {
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      const match = selectedTimeSlot.match(/(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})/);
      if (match && currentMinutes >= (parseInt(match[3], 10) * 60 + parseInt(match[4], 10))) return true;
    }
    return false;
  };
  const isSessionExpired = checkIsSessionExpired();

  const handleVerifyLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError('');
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();

    try {
      const res = await fetch(import.meta.env.VITE_BACKEND_URL + '/api/invite-link/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, phoneOrName: authPhoneOrName.trim(), passcode: authPasscode.trim() })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Kredensial tidak valid');

      sessionStorage.setItem(`patient_auth_${token}`, JSON.stringify({ patientName: data.patientName, phone: data.phone }));
      setPatientName(data.patientName);
      setPhone(data.phone);
      setStep(1);
    } catch (err: any) {
      setAuthError(err.message);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleCheckNoRM = async () => {
    if (!noRM.trim()) {
      showToast('Silakan ketik No. Rekam Medis (RM) Anda terlebih dahulu!', 'warning');
      return;
    }
    setCheckingRM(true);
    setRmSuccessMessage('');
    try {
      const res = await fetch(import.meta.env.VITE_BACKEND_URL + '/api/simrs/check-patient', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ noRM: noRM.trim() })
      });
      const result = await res.json();
      if (res.ok && result.data) {
        // AUTO-FILL IDENTITAS DASAR
        setPatientName(result.data.nama);
        
        // Simpan NIK ke state NIK
        if (result.data.nik) setNik(result.data.nik);
        
        // [FITUR AUTO-CORRECT]: Timpa kotak input dengan No RM asli dari SIMRS
        if (result.data.noRM) setNoRM(result.data.noRM);

        // AUTO-FILL KARTU PENJAMIN
        if (result.data.noBPJS) setBpjsNumber(result.data.noBPJS);
        if (result.data.asuransiProvider) setInsuranceProvider(result.data.asuransiProvider);
        if (result.data.noAsuransi) setInsuranceNumber(result.data.noAsuransi);
        if (result.data.perusahaanPartner) setCompanyPartner(result.data.perusahaanPartner);
        if (result.data.noPegawai) setCompanyCardNumber(result.data.noPegawai);

        setRmSuccessMessage(`✓ Data Ditemukan di SIMRS: a.n. ${result.data.nama}`);
      } else {
        showToast(result.message || 'No. Rekam Medis tidak ditemukan di database SIMRS RS Yasmin.', 'error');
      }
    } catch (e: any) {
      showToast('Gagal memeriksa data ke server SIMRS. Periksa koneksi Anda.', 'error');
    } finally {
      setCheckingRM(false);
    }
  };

  // =========================================================================
  // PRE-VALIDASI SEBELUM MASUK KE PEMBAYARAN (CEK GANDA NIK & KARTU JAMINAN)
  // =========================================================================
  const handleLanjutPembayaran = async () => {
    // 1. Validasi Input Kosong di Frontend
    if (patientStatus === 'Lama' && !noRM.trim()) { 
      showToast('Nomor Rekam Medis (No. RM) wajib diisi untuk pasien lama!', 'warning'); return; 
    }
    if (!nik.trim() || nik.length !== 16) { 
      showToast('Nomor NIK e-KTP harus lengkap 16 digit!', 'warning'); return; 
    }
    if (patientStatus === 'Baru' && patientType === 'BPJS' && !bpjsNumber.trim()) { 
      showToast('Nomor Kartu BPJS Kesehatan wajib diisi!', 'warning'); return; 
    }
    if (patientStatus === 'Baru' && patientType === 'Asuransi' && (!insuranceProvider || !insuranceNumber.trim())) { 
      showToast('Provider asuransi dan nomor polis wajib diisi!', 'warning'); return; 
    }
    if (patientStatus === 'Baru' && patientType === 'Perusahaan' && (!companyPartner || !companyCardNumber.trim())) { 
      showToast('Perusahaan rekanan dan ID karyawan wajib diisi!', 'warning'); return; 
    }
    if (!patientName.trim() || !phone.trim()) {
      showToast('Nama Lengkap dan Nomor WhatsApp wajib diisi!', 'warning'); return;
    }

    // 2. Tembak Backend untuk Pre-Validasi NIK dan SIMRS
    setValidatingStep5(true);
    try {
      const payload = {
        patientName, phone, patientType, patientStatus, nik: nik.trim(),
        noIdentitas: patientStatus === 'Lama' ? noRM.trim() : nik.trim(),
        bpjsNumber: bpjsNumber.trim(), insuranceNumber: insuranceNumber.trim(), companyCardNumber: companyCardNumber.trim()
      };

      const res = await fetch(import.meta.env.VITE_BACKEND_URL + '/api/pendaftaran/validate-step5', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error);
      }

      if (data.warning) {
        showToast(`⚠️ ${data.warning}`, 'warning');
      }

      setStep(6); // Lolos! Masuk ke halaman pembayaran
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setValidatingStep5(false);
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setBuktiTransferImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const copyAccount = (norek: string) => {
    navigator.clipboard.writeText(norek);
    setCopiedAccount(norek);
    setTimeout(() => setCopiedAccount(null), 2500);
  };

  // Submit Final
  const handleSubmitPendaftaran = async () => {
    if (isSessionExpired) {
      showToast("Sesi kunjungan untuk hari ini sudah berakhir. Silakan pilih sesi atau tanggal lain!", 'warning');
      return;
    }

    if (metodePembayaran === 'transfer' && !buktiTransferImage) {
      showToast("Foto bukti transfer pembayaran WAJIB diunggah sebelum mengirim pendaftaran!", 'warning');
      return;
    }

    setSubmitting(true);
    try {
      const noIdentitasFinal = patientStatus === 'Lama' ? noRM.trim() : nik.trim();
      const payload = {
        patientName,
        phone,
        patientType,
        patientStatus,
        nik: nik.trim(),
        noIdentitas: noIdentitasFinal,
        bpjsNumber: patientType === 'BPJS' ? bpjsNumber.trim() : null,
        insuranceProvider: patientType === 'Asuransi' ? insuranceProvider : null,
        insuranceNumber: patientType === 'Asuransi' ? insuranceNumber.trim() : null,
        companyPartner: patientType === 'Perusahaan' ? companyPartner : null,
        companyCardNumber: patientType === 'Perusahaan' ? companyCardNumber.trim() : null,
        selectedPoli,
        selectedDoctorId,
        selectedDoctorName,
        selectedDate,
        selectedTimeSlot,
        metodePembayaran,
        bankTujuan: metodePembayaran === 'transfer' ? `Bank ${bankTujuan}` : null,
        nominalBiaya: 135000,
        buktiTransferImage: metodePembayaran === 'transfer' ? buktiTransferImage : null
      };

      const res = await fetch(import.meta.env.VITE_BACKEND_URL + '/api/pendaftaran/submit-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, payload })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Pendaftaran gagal');

      setCurrentBooking(data.data);
      sessionStorage.setItem(`patient_submitted_ticket_${token}`, JSON.stringify(data.data));
      setStep(7);
    } catch (err: any) {
      showToast('Gagal mengirim pendaftaran: ' + err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredPoliList = useMemo(() => {
    if (!searchPoliQuery.trim()) return DAFTAR_POLI;
    return DAFTAR_POLI.filter(p => p.toLowerCase().includes(searchPoliQuery.toLowerCase()));
  }, [searchPoliQuery]);

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-[#1E293B] font-sans flex flex-col justify-between py-6 sm:py-10 px-4 relative overflow-hidden">
      
      {/* MODERN TOAST NOTIFICATION */}
      {toast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[99999] animate-fade-in-down w-[90%] max-w-sm">
          <div className={`flex items-center space-x-3 px-4 py-3.5 rounded-2xl shadow-2xl border backdrop-blur-md ${
            toast.type === 'error' ? 'bg-rose-50/90 border-rose-200 text-rose-800' :
            toast.type === 'warning' ? 'bg-amber-50/90 border-amber-200 text-amber-800' :
            'bg-emerald-50/90 border-emerald-200 text-emerald-800'
          }`}>
            {toast.type === 'error' ? <XCircle className="h-6 w-6 text-rose-600 shrink-0" /> :
             toast.type === 'warning' ? <AlertCircle className="h-6 w-6 text-amber-600 shrink-0" /> :
             <CheckCircle2 className="h-6 w-6 text-emerald-600 shrink-0" />}
            <span className="text-xs sm:text-sm font-bold font-sans flex-1 leading-snug">{toast.message}</span>
            <button onClick={() => setToast(null)} className="p-1 rounded-full hover:bg-black/5 transition-colors cursor-pointer shrink-0">
              <X className="h-4 w-4 opacity-60 hover:opacity-100" />
            </button>
          </div>
        </div>
      )}

      {/* BRANDING HEADER */}
      <div className="max-w-xl mx-auto w-full text-center space-y-2 mb-6">
        <div className="inline-flex items-center space-x-2 bg-white px-4 py-1.5 rounded-full border border-gray-200/80 shadow-2xs">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[10px] font-bold text-[#0B4F4A] uppercase tracking-widest font-mono">
            Portal Pendaftaran Rawat Jalan Resmi
          </span>
        </div>
        <div className="flex items-center justify-center space-x-3 pt-1">
          <div className="h-10 w-10 bg-white rounded-2xl p-1 shadow-sm border border-gray-100 flex items-center justify-center">
            <img src="/assets/images/utama/logo_rsyasminbwi.png" alt="Logo" className="h-full w-full object-contain" onError={(e) => (e.target as HTMLElement).style.display = 'none'} />
          </div>
          <h1 className="text-xl sm:text-2xl font-display font-black text-[#0B4F4A] tracking-tight">
            RS Yasmin Banyuwangi
          </h1>
        </div>
      </div>

      <div className="max-w-xl mx-auto w-full bg-white rounded-3xl border border-gray-200/80 shadow-xl overflow-hidden p-6 sm:p-8 relative">
        
        {/* PROGRESS STEPPER */}
        {step >= 1 && step <= 6 && (
          <div className="mb-6 space-y-2">
            <div className="flex items-center justify-between text-xs font-mono font-bold">
              <span className="text-[#0B4F4A] uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-warm-orange" />
                Langkah {step} dari 6
              </span>
              <span className="text-gray-400 font-sans">{Math.round((step / 6) * 100)}% Selesai</span>
            </div>
            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-[#0B4F4A] via-emerald-500 to-warm-orange transition-all duration-500 ease-out rounded-full"
                style={{ width: `${(step / 6) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* CARD 0: LOGIN */}
        {step === 0 && (
          <form onSubmit={handleVerifyLogin} className="space-y-6 animate-fade-in text-left">
            <div className="text-center space-y-2 mb-2">
              <div className="w-14 h-14 rounded-3xl bg-gradient-to-br from-emerald-50 to-teal-100 text-[#0B4F4A] flex items-center justify-center mx-auto border border-emerald-200 shadow-xs">
                <Lock className="h-7 w-7" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-display font-extrabold text-gray-900 tracking-tight">Buka Formulir Pendaftaran</h2>
                <p className="text-xs text-gray-500 max-w-sm mx-auto mt-1">Masukkan Nomor WhatsApp &amp; 4-digit sandi resmi yang dikirimkan oleh Customer Service RS Yasmin.</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10.5px] font-bold text-gray-600 uppercase tracking-wider font-mono flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5 text-[#0B4F4A]" /> Nomor WhatsApp:
                </label>
                <div className="relative">
                  <input
                    type="tel"
                    required
                    placeholder="Contoh: 08xxxxxxxxxx"
                    value={authPhoneOrName}
                    onChange={(e) => setAuthPhoneOrName(e.target.value)}
                    className="w-full p-3.5 pl-4 bg-[#F8FAF9] border border-gray-300 rounded-2xl text-xs sm:text-sm font-mono font-bold text-gray-900 focus:bg-white focus:ring-2 focus:ring-[#0B4F4A] focus:outline-none transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10.5px] font-bold text-gray-600 uppercase tracking-wider font-mono flex items-center gap-1.5">
                  <KeyRound className="h-3.5 w-3.5 text-[#0B4F4A]" /> Kata Sandi:
                </label>
                <div className="relative">
                  <input
                    type="password"
                    required
                    placeholder="••••"
                    value={authPasscode}
                    onChange={(e) => setAuthPasscode(e.target.value)}
                    className="w-full p-3.5 pl-4 bg-[#F8FAF9] border border-gray-300 rounded-2xl text-xs sm:text-sm font-mono font-bold tracking-widest text-[#0B4F4A] focus:bg-white focus:ring-2 focus:ring-[#0B4F4A] focus:outline-none transition-all"
                  />
                </div>
              </div>
            </div>

            {authError && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs font-bold text-rose-700 flex items-center gap-2 animate-shake">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />
                <span>{authError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={authLoading}
              className="w-full py-4 bg-gradient-to-r from-[#0B4F4A] to-[#0E625C] hover:from-[#0E625C] hover:to-[#0B4F4A] text-white text-xs font-bold uppercase tracking-wider rounded-2xl shadow-md hover:shadow-lg transition-all cursor-pointer disabled:opacity-50 active:scale-95 font-display flex items-center justify-center space-x-2"
            >
              <span>{authLoading ? 'Memverifikasi Undangan...' : 'Lanjut ke Formulir Pendaftaran'}</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>
        )}

        {/* CARD 1: JAMINAN */}
        {step === 1 && (
          <div className="space-y-5 animate-fade-in text-left">
            <div className="space-y-1 border-b border-gray-100 pb-3">
              <h2 className="text-base sm:text-lg font-display font-black text-gray-900">
                Pilih Jenis Penjamin Pasien:
              </h2>
              <p className="text-xs text-gray-500">Tentukan kategori pembiayaan yang akan digunakan untuk kunjungan ini.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { id: 'Umum', title: 'Pasien Umum / Mandiri', desc: 'Pembayaran biaya medis secara pribadi', icon: CreditCard, badge: 'Pribadi' },
                { id: 'BPJS', title: 'BPJS Kesehatan', desc: 'Poli terintegrasi rujukan faskes', icon: HeartPulse, badge: 'Program Nasional' },
                { id: 'Asuransi', title: 'Asuransi Swasta', desc: 'Prudential, Allianz, Mandiri Inhealth, dll', icon: ShieldCheck, badge: 'Kemitraan' },
                { id: 'Perusahaan', title: 'Jaminan Perusahaan', desc: 'Kerjasama institusi & korporasi rekanan', icon: Building2, badge: 'Corporate' }
              ].map((opt) => {
                const IconComponent = opt.icon;
                const isSelected = patientType === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => { setPatientType(opt.id); setStep(2); }}
                    className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between relative group ${
                      isSelected 
                        ? 'bg-[#0B4F4A] text-white border-[#0B4F4A] shadow-md scale-[1.01]' 
                        : 'bg-white border-gray-200 text-gray-700 hover:border-[#0B4F4A]/50 hover:bg-emerald-50/20 shadow-2xs'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className={`p-2.5 rounded-xl ${isSelected ? 'bg-white/10 text-white' : 'bg-emerald-50 text-[#0B4F4A]'}`}>
                        <IconComponent className="h-5 w-5" />
                      </div>
                      <span className={`text-[9.5px] font-bold px-2 py-0.5 rounded-full uppercase font-mono ${
                        isSelected ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {opt.badge}
                      </span>
                    </div>
                    <div>
                      <h4 className="font-bold text-xs sm:text-sm leading-tight">{opt.title}</h4>
                      <p className={`text-[10.5px] mt-1 leading-snug ${isSelected ? 'text-white/80' : 'text-gray-400'}`}>
                        {opt.desc}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* CARD 2: STATUS PASIEN BARU / LAMA */}
        {step === 2 && (
          <div className="space-y-5 animate-fade-in text-left">
            <div className="space-y-1 border-b border-gray-100 pb-3">
              <h2 className="text-base sm:text-lg font-display font-black text-gray-900">
                Status Kunjungan Medis:
              </h2>
              <p className="text-xs text-gray-500">Apakah pasien sudah pernah memiliki riwayat rekam medis di RS Yasmin?</p>
            </div>

            <div className="grid grid-cols-1 gap-3.5">
              <button
                onClick={() => { setPatientStatus('Baru'); setStep(3); }}
                className={`p-5 rounded-2xl border text-left transition-all cursor-pointer flex items-center space-x-4 ${
                  patientStatus === 'Baru'
                    ? 'border-[#0B4F4A] bg-emerald-50/40 shadow-xs'
                    : 'border-gray-200 bg-white hover:border-[#0B4F4A]/40'
                }`}
              >
                <div className="p-3.5 rounded-2xl bg-[#0B4F4A] text-white shrink-0">
                  <UserPlus className="h-6 w-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm text-gray-900">Pasien Baru (Pertama Kali)</h3>
                    <span className="text-[9px] font-bold uppercase bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-mono">NIK e-KTP</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                    Belum pernah terdaftar di RS Yasmin. Wajib menyertakan 16 digit NIK KTP untuk pembuatan rekam medis resmi.
                  </p>
                </div>
              </button>

              <button
                onClick={() => { setPatientStatus('Lama'); setStep(3); }}
                className={`p-5 rounded-2xl border text-left transition-all cursor-pointer flex items-center space-x-4 ${
                  patientStatus === 'Lama'
                    ? 'border-[#0B4F4A] bg-emerald-50/40 shadow-xs'
                    : 'border-gray-200 bg-white hover:border-[#0B4F4A]/40'
                }`}
              >
                <div className="p-3.5 rounded-2xl bg-teal-700 text-white shrink-0">
                  <UserCheck className="h-6 w-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm text-gray-900">Pasien Lama (Sudah Terdaftar)</h3>
                    <span className="text-[9px] font-bold uppercase bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-mono">RM / NIK</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                    Sudah pernah berobat. Cantumkan Nomor Rekam Medis (RM) atau NIK e-KTP Anda untuk penarikan riwayat otomatis.
                  </p>
                </div>
              </button>
            </div>

            <div className="pt-2">
              <button onClick={() => setStep(1)} className="text-xs text-gray-400 font-bold hover:text-gray-700 flex items-center gap-1.5 cursor-pointer">
                <ArrowLeft className="h-3.5 w-3.5" /> Kembali ke Pilihan Jaminan
              </button>
            </div>
          </div>
        )}

        {/* CARD 3: PILIH POLI */}
        {step === 3 && (
          <div className="space-y-4 animate-fade-in text-left">
            <div className="space-y-1 border-b border-gray-100 pb-3">
              <h2 className="text-base sm:text-lg font-display font-black text-gray-900">
                Pilih Poliklinik Spesialis:
              </h2>
              <p className="text-xs text-gray-500">Pilih unit layanan medis yang ingin Anda tuju di RS Yasmin.</p>
            </div>

            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={searchPoliQuery}
                onChange={(e) => setSearchPoliQuery(e.target.value)}
                placeholder="Ketik nama poli (misal: Anak, Gigi, Kandungan, Saraf)..."
                className="w-full pl-10 pr-4 py-2.5 bg-[#F8FAF9] border border-gray-300 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#0B4F4A] focus:bg-white transition-all"
              />
            </div>

            <div className="grid grid-cols-2 gap-2 max-h-[320px] overflow-y-auto pr-1">
              {filteredPoliList.map((poli, idx) => {
                const isSelected = selectedPoli === poli;
                return (
                  <button
                    key={idx}
                    onClick={() => { setSelectedPoli(poli); setStep(4); }}
                    className={`p-3 rounded-xl border text-left text-xs font-bold transition-all cursor-pointer flex items-center justify-between ${
                      isSelected 
                        ? 'bg-[#0B4F4A] text-white border-[#0B4F4A] shadow-xs' 
                        : 'bg-white border-gray-200 text-gray-700 hover:border-[#0B4F4A]/50 hover:bg-emerald-50/20'
                    }`}
                  >
                    <span className="truncate">{poli.replace('Poli ', '')}</span>
                    <span className={`text-[10px] font-mono ${isSelected ? 'text-white/60' : 'text-gray-300'}`}>→</span>
                  </button>
                );
              })}
            </div>

            <div className="pt-2 flex justify-between items-center text-xs">
              <button onClick={() => setStep(2)} className="text-gray-400 font-bold hover:text-gray-700 flex items-center gap-1.5 cursor-pointer">
                <ArrowLeft className="h-3.5 w-3.5" /> Kembali
              </button>
            </div>
          </div>
        )}

        {/* CARD 4: PILIH DOKTER & JADWAL */}
        {step === 4 && (
          <div className="space-y-4 animate-fade-in text-left">
            <div className="space-y-1 border-b border-gray-100 pb-3">
              <h2 className="text-base sm:text-lg font-display font-black text-gray-900">
                Pilih Dokter &amp; Waktu Praktek:
              </h2>
              <p className="text-xs text-gray-500">Jadwal resmi terintegrasi dengan SIMRS RS Yasmin.</p>
            </div>

            <div className="p-4 bg-gradient-to-r from-emerald-50/80 to-teal-50/40 border border-emerald-200 rounded-2xl space-y-1.5">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 bg-[#0B4F4A] text-white rounded-xl">
                  <Stethoscope className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="font-bold text-xs sm:text-sm text-[#0B4F4A]">{selectedDoctorName}</h4>
                  <p className="text-[10.5px] text-gray-500 font-mono">Kode Inisial: {selectedDoctorId} · {selectedPoli}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase font-mono block">Pilih Tanggal:</label>
                <input 
                  type="date" 
                  value={selectedDate} 
                  onChange={(e) => setSelectedDate(e.target.value)} 
                  className="w-full p-3 bg-[#F8FAF9] border border-gray-300 rounded-xl text-xs font-mono font-bold text-gray-800 focus:bg-white focus:ring-2 focus:ring-[#0B4F4A] transition-all" 
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase font-mono block">Sesi Waktu:</label>
                <select 
                  value={selectedTimeSlot} 
                  onChange={(e) => setSelectedTimeSlot(e.target.value)} 
                  className="w-full p-3 bg-[#F8FAF9] border border-gray-300 rounded-xl text-xs font-bold text-gray-800 focus:bg-white focus:ring-2 focus:ring-[#0B4F4A] cursor-pointer"
                >
                  <option value="08:00 - 12:00">Pagi (08:00 - 12:00)</option>
                  <option value="18:30 - 20:30">Malam (18:30 - 20:30)</option>
                </select>
              </div>
            </div>

            <div className="p-3.5 bg-gray-50 border border-gray-200 rounded-2xl flex items-center justify-between text-xs">
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider font-mono block">Ketersediaan Kuota:</span>
                {loadingQuota ? (
                  <span className="text-gray-400 text-xs">Memeriksa kuota...</span>
                ) : quotaInfo ? (
                  <div className="flex items-center space-x-2 mt-0.5">
                    <span className={`font-mono font-black text-sm ${quotaInfo.isFull ? 'text-rose-600' : 'text-emerald-700'}`}>
                      {quotaInfo.remaining} / {quotaInfo.totalQuota} Kursi Tersedia
                    </span>
                    <span className="text-[10px] text-gray-400 font-mono">({quotaInfo.used} terdaftar)</span>
                  </div>
                ) : (
                  <span className="text-gray-500 font-bold text-xs">Standar SIMRS</span>
                )}
              </div>

              {quotaInfo?.isFull && (
                <span className="px-2.5 py-1 bg-rose-100 text-rose-800 font-bold text-[10px] rounded-lg uppercase">
                  Penuh
                </span>
              )}
            </div>

            {isSessionExpired && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs font-bold text-amber-800 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
                <span>Sesi jam {selectedTimeSlot} hari ini sudah berakhir. Silakan pilih sesi Malam atau tanggal lain.</span>
              </div>
            )}

            <div className="flex justify-between items-center pt-3 text-xs">
              <button onClick={() => setStep(3)} className="text-gray-400 font-bold hover:text-gray-700 flex items-center gap-1.5 cursor-pointer">
                <ArrowLeft className="h-3.5 w-3.5" /> Kembali
              </button>
              <button 
                disabled={isSessionExpired || quotaInfo?.isFull} 
                onClick={() => setStep(5)} 
                className={`px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all shadow-md ${
                  isSessionExpired || quotaInfo?.isFull
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                    : 'bg-[#0B4F4A] hover:bg-[#0E625C] text-white cursor-pointer active:scale-95'
                }`}
              >
                <span>{isSessionExpired ? 'Sesi Terlewat' : quotaInfo?.isFull ? 'Kuota Penuh' : 'Lanjut Isi Identitas'}</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* CARD 5: DATA IDENTITAS (AUTO-FILL & VALIDASI KETAT) */}
        {/* ========================================================= */}
        {step === 5 && (
          <div className="space-y-4 animate-fade-in text-left">
            <div className="space-y-1 border-b border-gray-100 pb-3">
              <h2 className="text-base sm:text-lg font-display font-black text-gray-900">
                Kelengkapan Identitas Pasien ({patientStatus}):
              </h2>
              <p className="text-xs text-gray-500">
                Penjamin: <strong className="text-[#0B4F4A]">{patientType}</strong> · Harap lengkapi data resmi kependudukan dan penjamin.
              </p>
            </div>

            <div className="space-y-3.5 text-xs">
              
              {patientStatus === 'Lama' && (
                <div className="space-y-1 p-3.5 bg-emerald-50/50 border border-emerald-200 rounded-2xl">
                  <label className="font-bold text-gray-700 uppercase tracking-wider font-mono text-[10.5px] block">
                    No. Rekam Medis (RM) / NIK e-KTP <span className="text-rose-500">*</span>:
                  </label>
                  <div className="flex space-x-2">
                    <input 
                      type="text" 
                      required 
                      value={noRM} 
                      onChange={(e) => { setNoRM(e.target.value); setRmSuccessMessage(''); }} 
                      placeholder="Contoh: 20.19... atau 3501..." 
                      className="flex-1 p-3 bg-white border border-gray-300 rounded-xl text-xs font-mono font-bold text-gray-900 focus:ring-2 focus:ring-[#0B4F4A] transition-all outline-none" 
                    />
                    <button
                      type="button"
                      onClick={handleCheckNoRM}
                      disabled={checkingRM}
                      className="px-4 py-3 bg-[#0B4F4A] hover:bg-[#0E625C] text-white text-xs font-bold rounded-xl shrink-0 cursor-pointer disabled:opacity-50 transition-all shadow-xs"
                    >
                      {checkingRM ? 'Memeriksa...' : 'Cek Sistem'}
                    </button>
                  </div>
                  {rmSuccessMessage && (
                    <p className="text-[11px] text-emerald-700 font-bold mt-1 flex items-center gap-1 animate-fade-in">
                      <CheckCircle2 className="h-3.5 w-3.5" /> {rmSuccessMessage}
                    </p>
                  )}
                </div>
              )}

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-gray-700 uppercase tracking-wider font-mono text-[10.5px] block">
                    Nomor NIK e-KTP Pasien (16 Digit) <span className="text-rose-500">*</span>:
                  </label>
                  <span className={`text-[10px] font-mono font-bold ${nik.length === 16 ? 'text-emerald-600' : 'text-gray-400'}`}>
                    {nik.length}/16 Digit
                  </span>
                </div>
                <input 
                  type="text" 
                  maxLength={16}
                  required 
                  value={nik} 
                  onChange={(e) => setNik(e.target.value.replace(/\D/g, ''))} 
                  placeholder="Contoh: 3501xxxxxxxxxxxx" 
                  className="w-full p-3 bg-[#F8FAF9] border border-gray-300 rounded-xl text-xs font-mono font-bold text-gray-900 focus:bg-white focus:ring-2 focus:ring-[#0B4F4A] transition-all" 
                />
              </div>

              {patientType === 'BPJS' && (
                <div className="p-3.5 bg-emerald-50/40 border border-emerald-200 rounded-2xl space-y-2 animate-fade-in">
                  <div className="flex items-center space-x-2 text-[#0B4F4A] font-bold text-[11px]">
                    <HeartPulse className="h-4 w-4 text-emerald-600" />
                    <span>Data Kartu BPJS Kesehatan</span>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-600 uppercase font-mono block">
                      Nomor Kartu BPJS (13 Digit) <span className="text-rose-500">*</span>:
                    </label>
                    <input
                      type="text"
                      maxLength={13}
                      required
                      value={bpjsNumber}
                      onChange={(e) => setBpjsNumber(e.target.value.replace(/\D/g, ''))}
                      placeholder="Contoh: 0001xxxxxxxx"
                      className="w-full p-3 bg-white border border-emerald-300 rounded-xl text-xs font-mono font-bold text-gray-900 focus:ring-2 focus:ring-[#0B4F4A]"
                    />
                  </div>
                </div>
              )}

              {patientType === 'Asuransi' && (
                <div className="p-3.5 bg-teal-50/40 border border-teal-200 rounded-2xl space-y-3 animate-fade-in">
                  <div className="flex items-center space-x-2 text-[#0B4F4A] font-bold text-[11px]">
                    <ShieldCheck className="h-4 w-4 text-teal-600" />
                    <span>Data Mitra Asuransi Swasta</span>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-600 uppercase font-mono block">
                      Pilih Provider Asuransi Swasta <span className="text-rose-500">*</span>:
                    </label>
                    <select
                      required
                      value={insuranceProvider}
                      onChange={(e) => setInsuranceProvider(e.target.value)}
                      className="w-full p-3 bg-white border border-teal-300 rounded-xl text-xs font-bold text-gray-800 cursor-pointer focus:ring-2 focus:ring-[#0B4F4A]"
                    >
                      <option value="">-- Pilih Provider Asuransi --</option>
                      {MITRA_ASURANSI.map((asuransi, i) => (
                        <option key={i} value={asuransi}>{asuransi}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-600 uppercase font-mono block">
                      Nomor Kartu Asuransi / Polis <span className="text-rose-500">*</span>:
                    </label>
                    <input
                      type="text"
                      required
                      value={insuranceNumber}
                      onChange={(e) => setInsuranceNumber(e.target.value)}
                      placeholder="Contoh: POLIS-89765432"
                      className="w-full p-3 bg-white border border-teal-300 rounded-xl text-xs font-mono font-bold text-gray-900 focus:ring-2 focus:ring-[#0B4F4A]"
                    />
                  </div>
                </div>
              )}

              {patientType === 'Perusahaan' && (
                <div className="p-3.5 bg-blue-50/40 border border-blue-200 rounded-2xl space-y-3 animate-fade-in">
                  <div className="flex items-center space-x-2 text-blue-900 font-bold text-[11px]">
                    <Building2 className="h-4 w-4 text-blue-600" />
                    <span>Data Kemitraan Perusahaan / BUMN</span>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-600 uppercase font-mono block">
                      Pilih Perusahaan Rekanan RS Yasmin <span className="text-rose-500">*</span>:
                    </label>
                    <select
                      required
                      value={companyPartner}
                      onChange={(e) => setCompanyPartner(e.target.value)}
                      className="w-full p-3 bg-white border border-blue-300 rounded-xl text-xs font-bold text-gray-800 cursor-pointer focus:ring-2 focus:ring-blue-600"
                    >
                      <option value="">-- Pilih Perusahaan Rekanan --</option>
                      {MITRA_PERUSAHAAN.map((pt, i) => (
                        <option key={i} value={pt}>{pt}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-600 uppercase font-mono block">
                      Nomor Kartu Pegawai / ID Karyawan <span className="text-rose-500">*</span>:
                    </label>
                    <input
                      type="text"
                      required
                      value={companyCardNumber}
                      onChange={(e) => setCompanyCardNumber(e.target.value)}
                      placeholder="Contoh: NIP-1987456321"
                      className="w-full p-3 bg-white border border-blue-300 rounded-xl text-xs font-mono font-bold text-gray-900 focus:ring-2 focus:ring-blue-600"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <label className="font-bold text-gray-700 uppercase tracking-wider font-mono text-[10.5px] block">
                  Nama Lengkap Pasien Sesuai KTP <span className="text-rose-500">*</span>:
                </label>
                <input 
                  type="text" 
                  required
                  value={patientName} 
                  onChange={(e) => setPatientName(e.target.value)} 
                  className="w-full p-3 bg-gray-50 border border-gray-300 rounded-xl text-xs font-bold text-gray-900 outline-none" 
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-gray-700 uppercase tracking-wider font-mono text-[10.5px] block">
                  Nomor WhatsApp Aktif Pasien <span className="text-rose-500">*</span>:
                </label>
                <input 
                  type="tel" 
                  required
                  value={phone} 
                  onChange={(e) => setPhone(e.target.value)} 
                  className="w-full p-3 bg-gray-50 border border-gray-300 rounded-xl text-xs font-mono font-bold text-gray-900 outline-none" 
                />
              </div>
            </div>

            <div className="flex justify-between items-center pt-3 text-xs">
              <button onClick={() => setStep(4)} className="text-gray-400 font-bold hover:text-gray-700 flex items-center gap-1.5 cursor-pointer">
                <ArrowLeft className="h-3.5 w-3.5" /> Kembali
              </button>
              
              <button 
                disabled={validatingStep5}
                onClick={handleLanjutPembayaran} 
                className="px-6 py-3 bg-[#0B4F4A] hover:bg-[#0E625C] disabled:opacity-60 text-white font-bold rounded-xl flex items-center gap-2 cursor-pointer shadow-md transition-all active:scale-95"
              >
                <span>{validatingStep5 ? 'Memvalidasi Identitas...' : 'Lanjut Pembayaran'}</span>
                {!validatingStep5 && <ArrowRight className="h-4 w-4" />}
              </button>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* CARD 6: PEMBAYARAN */}
        {/* ========================================================= */}
        {step === 6 && (
          <div className="space-y-5 animate-fade-in text-left">
            <div className="space-y-1 border-b border-gray-100 pb-3">
              <h2 className="text-base sm:text-lg font-display font-black text-gray-900">
                Penyelesaian Pembayaran:
              </h2>
              <p className="text-xs text-gray-500">Pilih metode pembayaran biaya poliklinik resmi RS Yasmin.</p>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <button 
                type="button" 
                onClick={() => setMetodePembayaran('transfer')} 
                className={`p-3.5 rounded-2xl border text-center font-bold transition-all cursor-pointer ${
                  metodePembayaran === 'transfer' 
                    ? 'bg-[#0B4F4A] text-white border-[#0B4F4A] shadow-xs' 
                    : 'bg-white border-gray-200 text-gray-700 hover:border-[#0B4F4A]/40'
                }`}
              >
                1. Transfer Bank
              </button>
              <button 
                type="button" 
                onClick={() => setMetodePembayaran('bayar_di_loket')} 
                className={`p-3.5 rounded-2xl border text-center font-bold transition-all cursor-pointer ${
                  metodePembayaran === 'bayar_di_loket' 
                    ? 'bg-[#0B4F4A] text-white border-[#0B4F4A] shadow-xs' 
                    : 'bg-white border-gray-200 text-gray-700 hover:border-[#0B4F4A]/40'
                }`}
              >
                2. Bayar di Loket
              </button>
            </div>

            {metodePembayaran === 'transfer' && (
              <div className="space-y-4 animate-fade-in">
                <div className="bg-gradient-to-br from-[#0F172A] to-[#1E293B] text-white p-5 rounded-3xl shadow-md border border-slate-700/50 space-y-4 relative overflow-hidden">
                  <div className="flex items-center justify-between border-b border-slate-700 pb-2.5">
                    <span className="text-[10px] font-mono tracking-widest text-emerald-400 uppercase font-bold">REKENING RESMI RS YASMIN</span>
                    <span className="text-xs font-black text-warm-orange">Biaya: Rp 135.000</span>
                  </div>

                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between bg-slate-800/70 p-3 rounded-xl border border-slate-700">
                      <div>
                        <span className="text-[10px] text-slate-400 block font-mono">BANK MANDIRI</span>
                        <strong className="text-sm tracking-wider font-mono text-white">1430030047508</strong>
                      </div>
                      <button
                        type="button"
                        onClick={() => copyAccount('1430030047508')}
                        className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer"
                      >
                        {copiedAccount === '1430030047508' ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                        <span>{copiedAccount === '1430030047508' ? 'Tersalin' : 'Salin'}</span>
                      </button>
                    </div>

                    <div className="flex items-center justify-between bg-slate-800/70 p-3 rounded-xl border border-slate-700">
                      <div>
                        <span className="text-[10px] text-slate-400 block font-mono">BANK BCA</span>
                        <strong className="text-sm tracking-wider font-mono text-white">1801803330</strong>
                      </div>
                      <button
                        type="button"
                        onClick={() => copyAccount('1801803330')}
                        className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer"
                      >
                        {copiedAccount === '1801803330' ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                        <span>{copiedAccount === '1801803330' ? 'Tersalin' : 'Salin'}</span>
                      </button>
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-400 font-mono">a/n PT Kharisma Husada (RS Yasmin Banyuwangi)</p>
                </div>

                <div className="p-4 bg-emerald-50/40 border-2 border-dashed border-emerald-300 rounded-3xl space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-[#0B4F4A] uppercase text-[10.5px]">
                      Upload Foto Bukti Transfer <span className="text-rose-500">* (Wajib)</span>:
                    </label>
                    {buktiTransferImage && (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" /> Foto Siap
                      </span>
                    )}
                  </div>

                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={handlePhotoUpload} 
                    className="w-full text-xs text-gray-500 file:mr-3 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-[#0B4F4A] file:text-white hover:file:bg-[#0E625C] cursor-pointer" 
                  />
                  
                  {!buktiTransferImage && (
                    <p className="text-[10px] text-rose-500 font-medium pt-0.5">
                      * Silakan pilih foto struk transfer dari galeri ponsel Anda sebelum melanjutkan.
                    </p>
                  )}
                </div>
              </div>
            )}

            <div className="flex justify-between items-center pt-3 text-xs">
              <button onClick={() => setStep(5)} className="text-gray-400 font-bold hover:text-gray-700 flex items-center gap-1.5 cursor-pointer">
                <ArrowLeft className="h-3.5 w-3.5" /> Kembali
              </button>
              <button 
                onClick={handleSubmitPendaftaran}
                disabled={submitting}
                className="px-6 py-3.5 bg-warm-orange hover:bg-amber-500 text-[#0B4F4A] font-black rounded-2xl cursor-pointer shadow-md transition-all active:scale-95 uppercase tracking-wider text-xs disabled:opacity-50"
              >
                {submitting ? 'Mengirim Data...' : 'Kirim Pendaftaran'}
              </button>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* CARD 7: STATUS BERSIH & STRUK BARCODE SCANNER RESMI */}
        {/* ========================================================= */}
        {step === 7 && currentBooking && (
          <div className="space-y-6 animate-scale-up text-center">
            
            {currentBooking.status === 'baru' ? (
              <div className="w-14 h-14 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto shadow-xs">
                <Clock className="h-7 w-7 animate-pulse" />
              </div>
            ) : currentBooking.status === 'dibatalkan' ? (
              <div className="w-14 h-14 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto shadow-xs">
                <AlertCircle className="h-7 w-7" />
              </div>
            ) : (
              <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-xs">
                <CheckCircle2 className="h-7 w-7" />
              </div>
            )}

            <div className="space-y-1">
              <h2 className="text-lg sm:text-xl font-display font-black text-gray-900">
                {currentBooking.status === 'baru' 
                  ? 'Pendaftaran Berhasil Dikirim!' 
                  : currentBooking.status === 'dibatalkan'
                    ? 'Pendaftaran Dibatalkan'
                    : 'Pendaftaran Dikonfirmasi! 🎉'}
              </h2>
              <p className="text-xs text-gray-500 max-w-sm mx-auto leading-relaxed">
                {currentBooking.status === 'baru' 
                  ? (currentBooking.metodePembayaran === 'bayar_di_loket'
                      ? 'Pendaftaran diterima. Petugas sedang menyiapkan tiket antrean Anda. Silakan selesaikan administrasi pembayaran di Loket RS saat Check-in nanti.'
                      : 'Petugas pendaftaran RS Yasmin sedang memeriksa bukti transfer Anda di sistem.') 
                  : currentBooking.status === 'dibatalkan'
                    ? 'Mohon maaf, pendaftaran Anda dibatalkan oleh petugas.'
                    : 'Pendaftaran Anda telah resmi disetujui & tercatat di SIMRS.'}
              </p>
            </div>

            <div className="w-full max-w-sm mx-auto">
              {currentBooking.kodeBooking ? (
                <div className="animate-fade-in">
                  <BarcodeCard
                    kodeBooking={currentBooking.kodeBooking}
                    nomorAntrean={currentBooking.antrian}
                    namaPasien={currentBooking.patientName}
                    noRM={currentBooking.noIdentitas || currentBooking.nik}
                    dokter={currentBooking.selectedDoctorName}
                    poli={currentBooking.selectedPoli}
                    jadwal={currentBooking.selectedTimeSlot}
                    tanggal={currentBooking.selectedDate}
                    idTiket={currentBooking.id}
                  />
                </div>
              ) : currentBooking.status === 'dibatalkan' ? (
                <div className="bg-rose-50 p-4 rounded-2xl border border-rose-200 text-center text-xs text-rose-800">
                  <strong>Pendaftaran Dibatalkan:</strong>
                  <p className="mt-1 font-sans">"{currentBooking.adminNotes || 'Data tidak sesuai.'}"</p>
                </div>
              ) : (
                <div className="bg-amber-50 p-5 rounded-2xl border border-amber-200 text-center space-y-1.5 font-sans">
                  <span className="text-xs text-amber-800 font-bold block font-mono">
                    ⏳ MENUNGGU KONFIRMASI ADMIN
                  </span>
                  <p className="text-[11px] text-gray-600 leading-relaxed">
                    Struk barcode check-in dan nomor antrean akan otomatis terbit di sini seketika Admin menyetujui pendaftaran Anda di Dashboard.
                  </p>
                </div>
              )}
            </div>

            <div className="pt-2 flex flex-col gap-2 max-w-sm mx-auto">
              {!currentBooking.kodeBooking && currentBooking.status === 'baru' && (
                <button
                  onClick={() => refreshTicketStatus(currentBooking.id)}
                  className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center space-x-1.5"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span>Cek Ulang Status Manual</span>
                </button>
              )}

              <a
                href="/pasien"
                className="w-full py-3.5 bg-[#0B4F4A] hover:bg-[#0E625C] text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5 font-display"
              >
                <span>Buka Dashboard Akun Pasien</span>
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}