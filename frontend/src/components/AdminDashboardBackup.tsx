import React, { useState, useRef, useEffect } from 'react';
import { SafeImage } from '../utils/imageUrl';
import { 
  Building, 
  ClipboardList, 
  Award, 
  Users, 
  Calendar, 
  LogOut, 
  Plus, 
  Edit2, 
  Trash2, 
  Upload, 
  X, 
  Check, 
  Image as ImageIcon,
  Search,
  MapPin,
  Phone,
  Mail,
  Shield,
  FileText,
  Printer,
  Menu,
  Share2,
  Megaphone,
  Globe,
  Link,
  MessageCircle,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Bed,
  BedDouble,
  Activity,
  HeartPulse,
  Siren,
  Stethoscope,
  Baby,
  Scissors,
  ShieldCheck,
  Droplet,
  ClipboardCheck,
  Accessibility,
  Home,
  Truck,
  LayoutGrid,
  Clock,
  Send,
  LineChart,
  Star,
  UserCheck,
  Thermometer,
  TrendingUp,
  RefreshCw,
  RotateCcw
} from 'lucide-react';
import { Doctor, HospitalRoom } from '../types';
import KpiDashboard from './KpiDashboards';
import DatabaseExportManager from './DatabaseExportManager';
import { fetchCollection, syncCollectionToCloud, saveDocument, db } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

interface AdminDashboardProps {
  onClose: () => void;
  doctors: Doctor[];
  onUpdateDoctors: (updated: Doctor[]) => void;
  onSyncSystemDoctors?: () => void;
  onResetSystemDoctors?: () => void;
  rsInfo?: HospitalInfo;
  onUpdateRsInfo?: (info: HospitalInfo) => void;
}

const logoRsYasmin = '/assets/images/utama/logo_rsyasminbwi.png';

interface HospitalInfo {
  name: string;
  address: string;
  phone: string;
  email: string;
  whatsapp: string;
  accreditation: string;
  logo?: string;
}

interface Polyclinic {
  code: string;
  name: string;
  status: 'Aktif' | 'Pasif';
  activeSinceDate?: string;
  inactiveSinceDate?: string;
}

interface Specialist {
  code: string;
  name: string;
  description: string;
}

export interface SocialMedia {
  id: string;
  platform: string;
  url: string;
  icon: string;
  color?: string;
}

export interface Announcement {
  id: string;
  image: string;
  title: string;
  isActive: boolean;
  activeDate?: string;
  closeDate?: string;
}

const INITIAL_RS_INFO: HospitalInfo = {
  name: 'RS Yasmin Banyuwangi',
  address: 'Jl. Letkol Istiqlah No. 80-84, Mojopanggung, Kec. Banyuwangi, Kab. Banyuwangi, Jawa Timur 68425',
  phone: '0333-424671',
  email: 'yasmin_hospital@yahoo.com',
  whatsapp: '+62 852 5935 3001',
  accreditation: 'Terakreditasi Paripurna Kemenkes RI'
};

const INITIAL_POLYCLINICS: Polyclinic[] = [
  { code: 'POL001', name: 'Anak', status: 'Aktif' },
  { code: 'POL002', name: 'Anestesi', status: 'Aktif' },
  { code: 'POL003', name: 'Bedah Tulang', status: 'Aktif' },
  { code: 'POL004', name: 'Bedah Umum', status: 'Aktif' },
  { code: 'POL005', name: 'Edukasi', status: 'Aktif' },
  { code: 'POL006', name: 'Gigi Anak', status: 'Aktif' },
  { code: 'POL007', name: 'Gigi Bedah Mulut', status: 'Aktif' },
  { code: 'POL008', name: 'Gigi Ortodontis', status: 'Aktif' },
  { code: 'POL009', name: 'Gigi Penyakit Mulut', status: 'Aktif' },
  { code: 'POL010', name: 'Gigi Periodonsia', status: 'Aktif' },
  { code: 'POL011', name: 'Gigi Prostodonsis', status: 'Aktif' },
  { code: 'POL012', name: 'Gigi Umum', status: 'Aktif' },
  { code: 'POL013', name: 'Jantung & Pembuluh Darah', status: 'Aktif' },
  { code: 'POL014', name: 'Kandungan & Kebidanan', status: 'Aktif' },
  { code: 'POL015', name: 'Konselor', status: 'Aktif' },
  { code: 'POL016', name: 'Kulit & Kelamin', status: 'Aktif' },
  { code: 'POL017', name: 'Mata', status: 'Aktif' },
  { code: 'POL018', name: 'Paru', status: 'Aktif' },
  { code: 'POL019', name: 'Patologi Klinis', status: 'Aktif' },
  { code: 'POL020', name: 'Penyakit Dalam', status: 'Aktif' },
  { code: 'POL021', name: 'Psikolog', status: 'Aktif' },
  { code: 'POL022', name: 'Radiologi', status: 'Aktif' },
  { code: 'POL023', name: 'Rehab Medik', status: 'Aktif' },
  { code: 'POL024', name: 'Saraf', status: 'Aktif' },
  { code: 'POL025', name: 'THT-KL', status: 'Aktif' },
  { code: 'POL026', name: 'Umum', status: 'Aktif' },
  { code: 'POL027', name: 'Urologi', status: 'Aktif' }
];

const INITIAL_SPECIALISTS: Specialist[] = [
  { code: 'SPS001', name: 'Spesialis Anak', description: 'Kesehatan bayi, anak, dan remaja' },
  { code: 'SPS002', name: 'Spesialis Anestesi', description: 'Pelayanan anestesi dan manajemen nyeri' },
  { code: 'SPS003', name: 'Spesialis Orthopedi dan Traumatologi', description: 'Menangani cedera dan kelainan tulang' },
  { code: 'SPS004', name: 'Spesialis Bedah Umum', description: 'Pelayanan konsultasi dan tindakan bedah umum' },
  { code: 'SPS005', name: 'Edukator Kesehatan', description: 'Edukasi kesehatan dan konsultasi' },
  { code: 'SPS006', name: 'Spesialis Kedokteran Gigi Anak', description: 'Pelayanan kesehatan gigi anak' },
  { code: 'SPS007', name: 'Spesialis Bedah Mulut', description: 'Pelayanan bedah mulut dan rahang' },
  { code: 'SPS008', name: 'Spesialis Ortodonti', description: 'Perawatan susunan gigi dan rahang' },
  { code: 'SPS009', name: 'Spesialis Penyakit Mulut', description: 'Diagnosis dan terapi penyakit rongga mulut' },
  { code: 'SPS010', name: 'Spesialis Periodonsia', description: 'Kesehatan gusi dan jaringan pendukung gigi' },
  { code: 'SPS011', name: 'Spesialis Prostodonsia', description: 'Pelayanan rehabilitasi dan gigi tiruan' },
  { code: 'SPS012', name: 'Dokter Gigi Umum', description: 'Pelayanan kesehatan gigi umum' },
  { code: 'SPS013', name: 'Spesialis Jantung dan Pembuluh Darah', description: 'Kesehatan jantung dan pembuluh darah' },
  { code: 'SPS014', name: 'Spesialis Obstetri dan Ginekologi', description: 'Pelayanan kehamilan dan kesehatan wanita' },
  { code: 'SPS015', name: 'Konselor', description: 'Konseling dan pendampingan psikologis' },
  { code: 'SPS016', name: 'Spesialis Kulit dan Kelamin', description: 'Kesehatan kulit dan kelamin' },
  { code: 'SPS017', name: 'Spesialis Mata', description: 'Pemeriksaan dan tindakan kesehatan mata' },
  { code: 'SPS018', name: 'Spesialis Paru', description: 'Penanganan penyakit paru and pernapasan' },
  { code: 'SPS019', name: 'Spesialis Patologi Klinis', description: 'Pelayanan laboratorium dan diagnostik klinis' },
  { code: 'SPS020', name: 'Spesialis Penyakit Dalam', description: 'Pelayanan penyakit dalam dewasa' },
  { code: 'SPS021', name: 'Psikolog Klinis', description: 'Pelayanan konsultasi psikologis' },
  { code: 'SPS022', name: 'Spesialis Radiologi', description: 'Pencitraan medis dan radiologi' },
  { code: 'SPS023', name: 'Spesialis Kedokteran Fisik dan Rehabilitasi', description: 'Pelayanan rehabilitasi medik' },
  { code: 'SPS024', name: 'Spesialis Saraf', description: 'Diagnosis dan terapi gangguan saraf' },
  { code: 'SPS025', name: 'Spesialis THT-KL', description: 'Kesehatan telinga, hidung, dan tenggorokan' },
  { code: 'SPS026', name: 'Dokter Umum', description: 'Pelayanan kesehatan primer' },
  { code: 'SPS027', name: 'Spesialis Urologi', description: 'Kesehatan saluran kemih' }
];

export const INITIAL_SOCIAL_MEDIA: SocialMedia[] = [
  { id: 'soc-1', platform: 'Instagram', url: 'https://www.instagram.com/yasminhospital/', icon: 'Instagram' },
  { id: 'soc-2', platform: 'Facebook', url: 'https://www.facebook.com/yasmin.hospital/', icon: 'Facebook' },
  { id: 'soc-3', platform: 'Youtube', url: 'https://www.youtube.com/@YasminHospitalTV/', icon: 'Youtube' },
  { id: 'soc-4', platform: 'TikTok', url: 'https://www.tiktok.com/@yasminhospital', icon: 'Globe' }
];

export const INITIAL_ANNOUNCEMENTS: Announcement[] = [
  {
    id: 'ann-1',
    image: 'https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&q=80&w=800',
    title: 'Pelayanan Poliklinik Tetap Buka Selama Libur Nasional',
    isActive: true,
    activeDate: '2026-06-01',
    closeDate: '2026-12-31'
  }
];

export const INITIAL_ROOMS: HospitalRoom[] = [
  {
    id: 'room-1',
    type: 'Rawat Inap',
    name: 'Suite Resort Semeru',
    class: 'Suite',
    capacity: 5,
    occupied: 2,
    facilities: 'AC, Smart TV, Bath Tub, Sofa Bed, Private Garden Patio, Mini Kitchen'
  },
  {
    id: 'room-2',
    type: 'Rawat Inap',
    name: 'VIP Ijen View',
    class: 'VIP',
    capacity: 10,
    occupied: 6,
    facilities: 'AC, LED TV, Sofa, Garden View, Lemari Es'
  },
  {
    id: 'room-3',
    type: 'Rawat Inap',
    name: 'Cempaka Indah',
    class: 'Kelas 1',
    capacity: 15,
    occupied: 10,
    facilities: 'AC, LED TV, Kamar Mandi Dalam'
  },
  {
    id: 'room-4',
    type: 'Rawat Inap',
    name: 'Melati Asri',
    class: 'Kelas 2',
    capacity: 20,
    occupied: 14,
    facilities: 'AC, Kamar Mandi Dalam, Nakas'
  },
  {
    id: 'room-5',
    type: 'Rawat Inap',
    name: 'Flamboyan Raya',
    class: 'Kelas 3',
    capacity: 30,
    occupied: 21,
    facilities: 'Kipas Angin, Kamar Mandi Dalam'
  },
  {
    id: 'room-6',
    type: 'ICU',
    name: 'ICU Central Room',
    class: 'ICU',
    capacity: 8,
    occupied: 4,
    facilities: 'Ventilator Modern, Bedside Monitor, Syringe Pump, Central Oxygen'
  },
  {
    id: 'room-7',
    type: 'ICU',
    name: 'ICU Isolation Negative Pressure',
    class: 'ICU Isolasi',
    capacity: 4,
    occupied: 1,
    facilities: 'Negative Pressure HEPA, ICU Monitor, Ventilator'
  },
  {
    id: 'room-8',
    type: 'IGD',
    name: 'Triage Bed Utama',
    class: 'IGD Umum',
    capacity: 12,
    occupied: 5,
    facilities: 'Defibrillator, Bedside Monitor, Resuscitation Kit'
  },
  {
    id: 'room-9',
    type: 'IGD',
    name: 'Kamar Resusitasi Jantung',
    class: 'IGD Resusitasi',
    capacity: 3,
    occupied: 1,
    facilities: 'Crash Cart, Advanced Ventilator, Monitor Bedside'
  }
];

type ActiveMenu = 'NAMA_RS' | 'DATA_POLY' | 'DATA_SPESIALIS' | 'DATA_DOKTER' | 'DATA_PRAKTEK' | 'SOSIAL_MEDIA' | 'BERITA' | 'KAMAR_RAWAT_INAP' | 'KAMAR_ICU' | 'KAMAR_IGD'
  | 'KPI_RAWAT_JALAN' | 'KPI_RAWAT_INAP' | 'KPI_IGD' | 'KPI_ICU' | 'KPI_HCU' | 'KPI_NICU' | 'KPI_PICU' | 'KPI_PERINATOLOGI' | 'KPI_KAMAR_OPERASI' | 'KPI_CSSD' | 'KPI_HEMODIALISA'
  | 'KPI_MCU' | 'KPI_REHABILITASI_MEDIK' | 'KPI_HOME_CARE' | 'KPI_AMBULANCE' | 'KPI_BED_MANAGEMENT' | 'KPI_ANTRIAN' | 'KPI_RUJUKAN_PASIEN' | 'KPI_ANALISA_RUJUKAN' | 'KPI_KINERJA_PELAYANAN';

const getMenuTitle = (menu: ActiveMenu): string => {
  switch (menu) {
    case 'NAMA_RS': return 'Pengaturan Profil Instansi Rumah Sakit';
    case 'DATA_POLY': return 'Laporan Master Data Poliklinik';
    case 'DATA_SPESIALIS': return 'Laporan Master Data Spesialisasi';
    case 'DATA_DOKTER': return 'Laporan Master Data Dokter';
    case 'DATA_PRAKTEK': return 'Laporan Jadwal Praktek Dokter';
    case 'SOSIAL_MEDIA': return 'Laporan Master Link Sosial Media';
    case 'BERITA': return 'Laporan Master Pengumuman Berita';
    case 'KAMAR_RAWAT_INAP': return 'Laporan Master Kamar Rawat Inap';
    case 'KAMAR_ICU': return 'Laporan Master Kamar ICU';
    case 'KAMAR_IGD': return 'Laporan Master Kamar IGD';
    default:
      if (menu.startsWith('KPI_')) {
        const name = menu.replace('KPI_', '').replace(/_/g, ' ');
        return `Laporan KPI & Kinerja - ${name}`;
      }
      return 'Laporan Admin Portal';
  }
};

export default function AdminDashboard({ onClose, doctors, onUpdateDoctors, onSyncSystemDoctors, onResetSystemDoctors, rsInfo: rsInfoProp, onUpdateRsInfo }: AdminDashboardProps) {
  const [activeMenu, setActiveMenu] = useState<ActiveMenu>('NAMA_RS');
  const isInitialLoadRef = useRef(true);

  // OS, Browser, Resolution Detection & Layout Optimization states
  const [isDetecting, setIsDetecting] = useState(true);
  const [detectionProgress, setDetectionProgress] = useState(0);
  const [detectedOS, setDetectedOS] = useState('Mengidentifikasi...');
  const [detectedBrowser, setDetectedBrowser] = useState('Mengidentifikasi...');
  const [detectedResolution, setDetectedResolution] = useState('Mengidentifikasi...');
  const [systemFont, setSystemFont] = useState('"Inter", sans-serif');
  const [systemFontSize, setSystemFontSize] = useState('14px');
  const [systemPadding, setSystemPadding] = useState('1.5rem');
  
  const [detectionSteps, setDetectionSteps] = useState<{ label: string; status: 'waiting' | 'loading' | 'success'; value?: string }[]>([
    { label: 'Deteksi Operating System (OS)', status: 'waiting' },
    { label: 'Analisis Web Browser Engine', status: 'waiting' },
    { label: 'Pengecekan Resolusi Layar & Piksel', status: 'waiting' },
    { label: 'Standarisasi Font & Skala Komponen', status: 'waiting' }
  ]);

  useEffect(() => {
    let currentProgress = 0;
    
    // Step 1: Detect OS (Starts immediately)
    setDetectionSteps(prev => prev.map((s, idx) => idx === 0 ? { ...s, status: 'loading' } : s));
    
    const interval = setInterval(() => {
      currentProgress += 5;
      if (currentProgress > 100) currentProgress = 100;
      setDetectionProgress(currentProgress);
      
      if (currentProgress === 25) {
        // Evaluate OS
        const userAgent = window.navigator.userAgent;
        const platform = window.navigator.platform || '';
        let os = 'Unknown OS';
        let fontStr = '"Inter", sans-serif';
        
        if (/Mac/i.test(platform) || /Macintosh/i.test(userAgent)) {
          os = 'macOS';
          fontStr = '"Inter", -apple-system, BlinkMacSystemFont, "SF Pro Display", "Helvetica Neue", sans-serif';
        } else if (/Win/i.test(platform) || /Windows/i.test(userAgent)) {
          os = 'Windows';
          fontStr = '"Inter", "Segoe UI", "Tahoma", "Arial", sans-serif';
        } else if (/Android/i.test(userAgent)) {
          os = 'Android';
          fontStr = '"Inter", "Roboto", "Helvetica Neue", sans-serif';
        } else if (/iPhone|iPad|iPod/i.test(userAgent)) {
          os = 'iOS';
          fontStr = '"Inter", -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif';
        } else if (/Linux/i.test(platform) || /Linux/i.test(userAgent)) {
          os = 'Linux';
          fontStr = '"Inter", "Fira Sans", "Noto Sans", sans-serif';
        }
        
        setDetectedOS(os);
        setSystemFont(fontStr);
        setDetectionSteps(prev => prev.map((s, idx) => 
          idx === 0 ? { ...s, status: 'success', value: os } :
          idx === 1 ? { ...s, status: 'loading' } : s
        ));
      }
      
      if (currentProgress === 50) {
        // Evaluate Browser
        const userAgent = window.navigator.userAgent;
        let browser = 'Unknown Browser';
        
        if (userAgent.indexOf("Chrome") > -1 && userAgent.indexOf("Safari") > -1 && userAgent.indexOf("Edge") === -1 && userAgent.indexOf("OPR") === -1) {
          browser = 'Google Chrome';
        } else if (userAgent.indexOf("Safari") > -1 && userAgent.indexOf("Chrome") === -1) {
          browser = 'Apple Safari';
        } else if (userAgent.indexOf("Firefox") > -1) {
          browser = 'Mozilla Firefox';
        } else if (userAgent.indexOf("Edge") > -1 || userAgent.indexOf("Edg") > -1) {
          browser = 'Microsoft Edge';
        } else if (userAgent.indexOf("OPR") > -1 || userAgent.indexOf("Opera") > -1) {
          browser = 'Opera';
        } else {
          browser = 'Web Browser';
        }
        
        setDetectedBrowser(browser);
        setDetectionSteps(prev => prev.map((s, idx) => 
          idx === 1 ? { ...s, status: 'success', value: browser } :
          idx === 2 ? { ...s, status: 'loading' } : s
        ));
      }
      
      if (currentProgress === 75) {
        // Evaluate Resolution
        const w = window.screen.width;
        const h = window.screen.height;
        const resStr = `${w}x${h}px`;
        
        let fs = '14px';
        let pad = '1.5rem';
        let desc = 'Desktop Standar';
        
        if (w >= 1920) {
          fs = '15.5px';
          pad = '1.75rem';
          desc = 'High-Res / 4K';
        } else if (w >= 1024 && w < 1280) {
          fs = '13px';
          pad = '1.25rem';
          desc = 'Compact Screen';
        } else if (w < 1024) {
          fs = '12px';
          pad = '1rem';
          desc = 'Tablet / Mobile';
        }
        
        setDetectedResolution(resStr);
        setSystemFontSize(fs);
        setSystemPadding(pad);
        
        setDetectionSteps(prev => prev.map((s, idx) => 
          idx === 2 ? { ...s, status: 'success', value: `${resStr} (${desc})` } :
          idx === 3 ? { ...s, status: 'loading' } : s
        ));
      }
      
      if (currentProgress === 100) {
        clearInterval(interval);
        
        // Final Step
        setDetectionSteps(prev => prev.map((s, idx) => 
          idx === 3 ? { ...s, status: 'success', value: 'Terstandarisasi' } : s
        ));
        
        // Brief pause at 100% for smooth UX
        setTimeout(() => {
          setIsDetecting(false);
        }, 350);
      }
    }, 50); // Speed up detection interval slightly for snappy feel (50ms per step = ~1s total)
    
    return () => clearInterval(interval);
  }, []);
  
  // Sidebar auto-hide/collapse states
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    return typeof window !== 'undefined' ? window.innerWidth < 1024 : false;
  });
  const [isSidebarHovered, setIsSidebarHovered] = useState(false);
  const [isKpiSidebarExpanded, setIsKpiSidebarExpanded] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setIsSidebarCollapsed(true);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // Sorting States
  const [polySort, setPolySort] = useState<{ field: string; direction: 'asc' | 'desc' }>({ field: 'code', direction: 'asc' });
  const [specialistSort, setSpecialistSort] = useState<{ field: string; direction: 'asc' | 'desc' }>({ field: 'code', direction: 'asc' });
  const [doctorSort, setDoctorSort] = useState<{ field: string; direction: 'asc' | 'desc' }>({ field: 'name', direction: 'asc' });
  const [praktekSort, setPraktekSort] = useState<{ field: string; direction: 'asc' | 'desc' }>({ field: 'name', direction: 'asc' });
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(20);

  // Hospital Info State
  const [rsInfoState, setRsInfoState] = useState<HospitalInfo>(() => {
    try {
      const saved = localStorage.getItem('admin_rs_info');
      return saved ? JSON.parse(saved) : INITIAL_RS_INFO;
    } catch (e) {
      console.error('Failed to parse admin_rs_info from localStorage:', e);
      return INITIAL_RS_INFO;
    }
  });

  const rsInfo = rsInfoProp !== undefined ? rsInfoProp : rsInfoState;
  const setRsInfo = onUpdateRsInfo !== undefined ? onUpdateRsInfo : setRsInfoState;

  // Polyclinics State
  const [polyclinics, setPolyclinics] = useState<Polyclinic[]>(() => {
    try {
      const saved = localStorage.getItem('admin_polyclinics');
      return saved ? JSON.parse(saved) : INITIAL_POLYCLINICS;
    } catch (e) {
      console.error('Failed to parse admin_polyclinics from localStorage:', e);
      return INITIAL_POLYCLINICS;
    }
  });

  // Specialists State
  const [specialists, setSpecialists] = useState<Specialist[]>(() => {
    try {
      const saved = localStorage.getItem('admin_specialists');
      return saved ? JSON.parse(saved) : INITIAL_SPECIALISTS;
    } catch (e) {
      console.error('Failed to parse admin_specialists from localStorage:', e);
      return INITIAL_SPECIALISTS;
    }
  });

  // Social Media State
  const [socialMediaLinks, setSocialMediaLinks] = useState<SocialMedia[]>(() => {
    try {
      const saved = localStorage.getItem('admin_social_media');
      return saved ? JSON.parse(saved) : INITIAL_SOCIAL_MEDIA;
    } catch (e) {
      console.error('Failed to parse admin_social_media from localStorage:', e);
      return INITIAL_SOCIAL_MEDIA;
    }
  });

  // BERITA announcements state
  const [announcements, setAnnouncements] = useState<Announcement[]>(() => {
    try {
      const saved = localStorage.getItem('admin_announcements');
      return saved ? JSON.parse(saved) : INITIAL_ANNOUNCEMENTS;
    } catch (e) {
      console.error('Failed to parse admin_announcements from localStorage:', e);
      return INITIAL_ANNOUNCEMENTS;
    }
  });

  // Persistent search & filter states
  const [searchTerm, setSearchTerm] = useState('');

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'ADD' | 'EDIT'>('ADD');
  const [showPrintWarning, setShowPrintWarning] = useState(false);

  // Custom delete confirmation modal state
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    type: 'DOCTOR' | 'POLY' | 'SPECIALIST' | 'SOCIAL' | 'ANNOUNCEMENT' | 'ROOM';
    id: string;
    name: string;
  } | null>(null);

  const executeDelete = (type: 'DOCTOR' | 'POLY' | 'SPECIALIST' | 'SOCIAL' | 'ANNOUNCEMENT' | 'ROOM', id: string) => {
    if (type === 'DOCTOR') {
      const updated = doctors.filter(d => d.id !== id);
      onUpdateDoctors(updated);
    } else if (type === 'POLY') {
      const updated = polyclinics.filter(p => p.code !== id);
      setPolyclinics(updated);
    } else if (type === 'SPECIALIST') {
      const updated = specialists.filter(s => s.code !== id);
      setSpecialists(updated);
    } else if (type === 'SOCIAL') {
      const updated = socialMediaLinks.filter(s => s.id !== id);
      setSocialMediaLinks(updated);
    } else if (type === 'ANNOUNCEMENT') {
      const updated = announcements.filter(a => a.id !== id);
      setAnnouncements(updated);
    } else if (type === 'ROOM') {
      const updated = rooms.filter(r => r.id !== id);
      setRooms(updated);
    }
  };
  
  // Forms states
  const [currentDoctor, setCurrentDoctor] = useState<Partial<Doctor>>({});
  const [currentPoly, setCurrentPoly] = useState<Partial<Polyclinic>>({});
  const [currentSpecialist, setCurrentSpecialist] = useState<Partial<Specialist>>({});
  const [currentSocial, setCurrentSocial] = useState<Partial<SocialMedia>>({});
  const [currentAnnouncement, setCurrentAnnouncement] = useState<Partial<Announcement>>({});

  // Rooms State
  const [rooms, setRooms] = useState<HospitalRoom[]>(() => {
    try {
      const saved = localStorage.getItem('admin_rooms');
      return saved ? JSON.parse(saved) : INITIAL_ROOMS;
    } catch (e) {
      console.error('Failed to parse admin_rooms from localStorage:', e);
      return INITIAL_ROOMS;
    }
  });

  const [isKamarSidebarExpanded, setIsKamarSidebarExpanded] = useState(false);
  const [isRawatInapGroupOpen, setIsRawatInapGroupOpen] = useState(true);
  const [isIcuGroupOpen, setIsIcuGroupOpen] = useState(true);
  const [isIgdGroupOpen, setIsIgdGroupOpen] = useState(true);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [currentRoom, setCurrentRoom] = useState<Partial<HospitalRoom>>({});

  // Selection states for master tables
  const [selectedPolyCode, setSelectedPolyCode] = useState<string | null>(null);
  const [selectedSpecialistCode, setSelectedSpecialistCode] = useState<string | null>(null);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string | null>(null);
  const [selectedScheduleId, setSelectedScheduleId] = useState<string | null>(null);
  const [selectedSocialId, setSelectedSocialId] = useState<string | null>(null);
  const [selectedAnnouncementId, setSelectedAnnouncementId] = useState<string | null>(null);

  // Lightbox preview for BERITA images
  const [previewImage, setPreviewImage] = useState<{ src: string; title: string } | null>(null);

  const logoInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const announcementInputRef = useRef<HTMLInputElement>(null);

  // Reset pagination when active tab, search term, or page size changes
  useEffect(() => {
    setCurrentPage(1);
  }, [activeMenu, searchTerm, pageSize]);

  // Sync sidebar submenu collapse states based on activeMenu changes
  useEffect(() => {
    if (activeMenu.startsWith('KPI_')) {
      setIsKpiSidebarExpanded(true);
      setIsKamarSidebarExpanded(false);
    } else if (activeMenu.startsWith('KAMAR_')) {
      setIsKamarSidebarExpanded(true);
      setIsKpiSidebarExpanded(false);
    } else {
      setIsKamarSidebarExpanded(false);
      setIsKpiSidebarExpanded(false);
    }
  }, [activeMenu]);

  // Enforce first menu select on mount and completely bypass global selection/right-click protections
  useEffect(() => {
    setActiveMenu('NAMA_RS');
    
    // Explicitly enable text selection on the body
    document.body.style.userSelect = 'text';
    document.body.style.webkitUserSelect = 'text';
  }, []);

  // Load and refresh bookings for calculating used and remaining quota
  const [bookings, setBookings] = useState<any[]>([]);

  useEffect(() => {
    const loadBookings = async () => {
      try {
        const cloudBookings = await fetchCollection('bookings');
        if (cloudBookings.length > 0) {
          setBookings(cloudBookings);
          localStorage.setItem('yasmin_bookings', JSON.stringify(cloudBookings));
          return;
        }
      } catch (e) {
        console.error('Failed to fetch bookings from Firestore:', e);
      }

      const savedBookings = localStorage.getItem('yasmin_bookings');
      if (savedBookings) {
        try {
          setBookings(JSON.parse(savedBookings));
        } catch (e) {
          console.error('Failed to parse yasmin_bookings:', e);
        }
      }
    };
    loadBookings();
  }, [activeMenu]);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setRsInfo(prev => ({
            ...prev,
            logo: reader.result as string
          }));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePolySort = (field: string) => {
    setPolySort(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const handleSpecialistSort = (field: string) => {
    setSpecialistSort(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const handleDoctorSort = (field: string) => {
    setDoctorSort(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const handlePraktekSort = (field: string) => {
    setPraktekSort(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  // Sorted lists
  const sortedPolyclinics = [...polyclinics]
    .filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.code.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => {
      let fieldA = (a[polySort.field as keyof Polyclinic] || '').toString().toLowerCase();
      let fieldB = (b[polySort.field as keyof Polyclinic] || '').toString().toLowerCase();
      if (fieldA < fieldB) return polySort.direction === 'asc' ? -1 : 1;
      if (fieldA > fieldB) return polySort.direction === 'asc' ? 1 : -1;
      return 0;
    });

  const sortedSpecialists = [...specialists]
    .filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()) || s.code.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => {
      let fieldA = (a[specialistSort.field as keyof Specialist] || '').toString().toLowerCase();
      let fieldB = (b[specialistSort.field as keyof Specialist] || '').toString().toLowerCase();
      if (fieldA < fieldB) return specialistSort.direction === 'asc' ? -1 : 1;
      if (fieldA > fieldB) return specialistSort.direction === 'asc' ? 1 : -1;
      return 0;
    });

  const sortedDoctors = [...doctors]
    .filter(d => d.name.toLowerCase().includes(searchTerm.toLowerCase()) || d.subSpecialty?.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => {
      let valA: any;
      let valB: any;
      
      if (doctorSort.field === 'rating') {
        valA = a.rating;
        valB = b.rating;
      } else if (doctorSort.field === 'experience') {
        valA = a.experience;
        valB = b.experience;
      } else {
        valA = (a[doctorSort.field as keyof Doctor] || '').toString().toLowerCase();
        valB = (b[doctorSort.field as keyof Doctor] || '').toString().toLowerCase();
      }

      if (valA < valB) return doctorSort.direction === 'asc' ? -1 : 1;
      if (valA > valB) return doctorSort.direction === 'asc' ? 1 : -1;
      return 0;
    });

  const sortedSchedules = [...doctors]
    .filter(d => d.name.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => {
      let valA: any;
      let valB: any;

      if (praktekSort.field === 'hours') {
        valA = a.schedule.hours.toLowerCase();
        valB = b.schedule.hours.toLowerCase();
      } else if (praktekSort.field === 'subSpecialty') {
        valA = (a.subSpecialty || a.specialty).toLowerCase();
        valB = (b.subSpecialty || b.specialty).toLowerCase();
      } else {
        valA = (a[praktekSort.field as keyof Doctor] || '').toString().toLowerCase();
        valB = (b[praktekSort.field as keyof Doctor] || '').toString().toLowerCase();
      }

      if (valA < valB) return praktekSort.direction === 'asc' ? -1 : 1;
      if (valA > valB) return praktekSort.direction === 'asc' ? 1 : -1;
      return 0;
    });

  // Helper to paginate any array
  const paginate = <T,>(items: T[]): { paginatedItems: T[]; totalPages: number; startIdx: number; endIdx: number; totalItems: number } => {
    const totalItems = items.length;
    const totalPages = Math.ceil(totalItems / pageSize);
    const safePage = Math.min(currentPage, Math.max(1, totalPages));
    const startIdx = (safePage - 1) * pageSize;
    const endIdx = startIdx + pageSize;
    const paginatedItems = items.slice(startIdx, endIdx);
    return { paginatedItems, totalPages, startIdx, endIdx, totalItems };
  };

  const renderPagination = (totalPages: number, startIdx: number, endIdx: number, totalItems: number) => {
    if (totalItems === 0) return null;
    
    const maxVisible = 5;
    let start = Math.max(1, currentPage - 2);
    let end = Math.min(totalPages, start + maxVisible - 1);
    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }
    
    const pages = [];
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    return (
      <div className="px-6 py-4 border-t border-gray-200 bg-white flex flex-col sm:flex-row items-center justify-between gap-4 font-sans text-xs shrink-0 select-none">
        <div className="flex items-center space-x-2 text-gray-500">
          <span>Tampilkan</span>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="border border-gray-300 rounded-xl px-2 py-1 focus:outline-none focus:ring-2 focus:ring-yasmin-green bg-white font-bold text-gray-700 cursor-pointer"
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
          <span>data per halaman</span>
        </div>
        
        <div className="text-gray-500 font-semibold">
          Menampilkan <span className="text-gray-800">{startIdx + 1}</span> - <span className="text-gray-800">{Math.min(endIdx, totalItems)}</span> dari <span className="text-gray-800">{totalItems}</span> data
        </div>
        
        <div className="flex items-center space-x-1.5">
          <button
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            className="px-3 py-1.5 border border-gray-300 rounded-xl hover:bg-slate-50 text-gray-700 disabled:opacity-50 disabled:hover:bg-white font-bold transition-all cursor-pointer text-[11px]"
          >
            Sebelumnya
          </button>
          
          {pages.map((p) => (
            <button
              key={p}
              onClick={() => setCurrentPage(p)}
              className={`h-8 w-8 rounded-xl font-bold transition-all cursor-pointer text-xs ${
                currentPage === p
                  ? 'bg-yasmin-green text-white shadow-xs'
                  : 'border border-gray-300 text-gray-700 hover:bg-slate-50'
              }`}
            >
              {p}
            </button>
          ))}
          
          <button
            disabled={currentPage === totalPages || totalPages === 0}
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            className="px-3 py-1.5 border border-gray-300 rounded-xl hover:bg-slate-50 text-gray-700 disabled:opacity-50 disabled:hover:bg-white font-bold transition-all cursor-pointer text-[11px]"
          >
            Selanjutnya
          </button>
        </div>
      </div>
    );
  };

  // Load initial data from Firestore
  useEffect(() => {
    const loadData = async () => {
      try {
        isInitialLoadRef.current = true;

        // 1. Hospital Info
        const infoDocRef = doc(db, 'rs_info', 'hospital_info');
        const infoSnap = await getDoc(infoDocRef);
        if (infoSnap.exists()) {
          setRsInfo(infoSnap.data() as HospitalInfo);
        } else {
          await saveDocument('rs_info', 'hospital_info', rsInfo);
        }

        // 2. Polyclinics
        const cloudPolyclinics = await fetchCollection('polyclinics');
        if (cloudPolyclinics.length > 0) {
          setPolyclinics(cloudPolyclinics);
        } else {
          await syncCollectionToCloud('polyclinics', polyclinics);
        }

        // 3. Specialists
        const cloudSpecialists = await fetchCollection('specialists');
        if (cloudSpecialists.length > 0) {
          setSpecialists(cloudSpecialists);
        } else {
          await syncCollectionToCloud('specialists', specialists);
        }

        // 4. Social Media
        const cloudSocial = await fetchCollection('social_media');
        if (cloudSocial.length > 0) {
          setSocialMediaLinks(cloudSocial);
        } else {
          await syncCollectionToCloud('social_media', socialMediaLinks);
        }

        // 5. Announcements
        const cloudAnnouncements = await fetchCollection('announcements');
        if (cloudAnnouncements.length > 0) {
          setAnnouncements(cloudAnnouncements);
        } else {
          await syncCollectionToCloud('announcements', announcements);
        }

        // 6. Rooms
        const cloudRooms = await fetchCollection('rooms');
        if (cloudRooms.length > 0) {
          setRooms(cloudRooms);
        } else {
          await syncCollectionToCloud('rooms', rooms);
        }
      } catch (error) {
        console.error("Error loading initial data from Firestore:", error);
      } finally {
        setTimeout(() => {
          isInitialLoadRef.current = false;
        }, 1200);
      }
    };

    loadData();
  }, []);

  // Save changes
  useEffect(() => {
    localStorage.setItem('admin_rs_info', JSON.stringify(rsInfo));
    if (!isInitialLoadRef.current) {
      saveDocument('rs_info', 'hospital_info', rsInfo);
    }
  }, [rsInfo]);

  useEffect(() => {
    localStorage.setItem('admin_polyclinics', JSON.stringify(polyclinics));
    if (!isInitialLoadRef.current) {
      syncCollectionToCloud('polyclinics', polyclinics);
    }
  }, [polyclinics]);

  useEffect(() => {
    localStorage.setItem('admin_specialists', JSON.stringify(specialists));
    if (!isInitialLoadRef.current) {
      syncCollectionToCloud('specialists', specialists);
    }
  }, [specialists]);

  useEffect(() => {
    localStorage.setItem('admin_social_media', JSON.stringify(socialMediaLinks));
    window.dispatchEvent(new CustomEvent('yasmin_hospital_info_update'));
    if (!isInitialLoadRef.current) {
      syncCollectionToCloud('social_media', socialMediaLinks);
    }
  }, [socialMediaLinks]);

  useEffect(() => {
    localStorage.setItem('admin_announcements', JSON.stringify(announcements));
    window.dispatchEvent(new CustomEvent('yasmin_announcements_update'));
    if (!isInitialLoadRef.current) {
      syncCollectionToCloud('announcements', announcements);
    }
  }, [announcements]);

  useEffect(() => {
    localStorage.setItem('admin_rooms', JSON.stringify(rooms));
    window.dispatchEvent(new CustomEvent('yasmin_rooms_update'));
    if (!isInitialLoadRef.current) {
      syncCollectionToCloud('rooms', rooms);
    }
  }, [rooms]);

  // Social Media handlers
  const handleOpenAddSocial = () => {
    setCurrentSocial({ id: 'soc-' + Date.now(), platform: '', url: '', icon: 'Link' });
    setModalType('ADD');
    setIsModalOpen(true);
  };

  const handleOpenEditSocial = (soc: SocialMedia) => {
    setCurrentSocial(soc);
    setModalType('EDIT');
    setIsModalOpen(true);
  };

  const handleDeleteSocial = (id: string) => {
    const item = socialMediaLinks.find(s => s.id === id);
    setDeleteConfirm({
      isOpen: true,
      type: 'SOCIAL',
      id,
      name: item ? `${item.platform} (${item.url})` : 'sosial media ini'
    });
  };

  const handleSaveSocial = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentSocial.platform || !currentSocial.url) {
      alert('Mohon isi platform dan link URL!');
      return;
    }
    let updated;
    if (modalType === 'ADD') {
      updated = [...socialMediaLinks, currentSocial as SocialMedia];
    } else {
      updated = socialMediaLinks.map(s => s.id === currentSocial.id ? (currentSocial as SocialMedia) : s);
    }
    setSocialMediaLinks(updated);
    setIsModalOpen(false);
  };

  // Announcement handlers
  const handleOpenAddAnnouncement = () => {
    setCurrentAnnouncement({ id: 'ann-' + Date.now(), title: '', image: '', isActive: true, activeDate: '', closeDate: '' });
    setModalType('ADD');
    setIsModalOpen(true);
  };

  const handleOpenEditAnnouncement = (ann: Announcement) => {
    setCurrentAnnouncement({ ...ann });
    setModalType('EDIT');
    setIsModalOpen(true);
  };

  const handleDeleteAnnouncement = (id: string) => {
    const item = announcements.find(a => a.id === id);
    setDeleteConfirm({
      isOpen: true,
      type: 'ANNOUNCEMENT',
      id,
      name: item ? item.title : 'pengumuman ini'
    });
  };

  const handleSaveAnnouncement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentAnnouncement.image) {
      alert('Mohon upload file pengumuman/gambar!');
      return;
    }
    let updated;
    if (modalType === 'ADD') {
      updated = [...announcements, currentAnnouncement as Announcement];
    } else {
      updated = announcements.map(a => a.id === currentAnnouncement.id ? (currentAnnouncement as Announcement) : a);
    }
    setAnnouncements(updated);
    setIsModalOpen(false);
  };

  // Room handlers
  const handleOpenAddRoom = (type: 'Rawat Inap' | 'ICU' | 'IGD') => {
    setCurrentRoom({ id: 'room-' + Date.now(), type, name: '', class: '', capacity: 5, occupied: 0, facilities: '' });
    setModalType('ADD');
    setIsModalOpen(true);
  };

  const handleOpenEditRoom = (room: HospitalRoom) => {
    setCurrentRoom({ ...room });
    setModalType('EDIT');
    setIsModalOpen(true);
  };

  const handleOpenEditFacilities = (room: HospitalRoom) => {
    setCurrentRoom({ ...room });
    setModalType('EDIT');
    setIsModalOpen(true);
  };

  const handleDeleteRoom = (id: string) => {
    const item = rooms.find(r => r.id === id);
    setDeleteConfirm({
      isOpen: true,
      type: 'ROOM',
      id,
      name: item ? `${item.name} (${item.class})` : 'kamar ini'
    });
  };

  const handleSaveRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentRoom.name || !currentRoom.class) {
      alert('Mohon isi nama kamar dan kelas kamar!');
      return;
    }
    let updated;
    if (modalType === 'ADD') {
      updated = [...rooms, currentRoom as HospitalRoom];
    } else {
      updated = rooms.map(r => r.id === currentRoom.id ? (currentRoom as HospitalRoom) : r);
    }
    setRooms(updated);
    setIsModalOpen(false);
  };

  const handleAnnouncementUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setCurrentAnnouncement(prev => ({
            ...prev,
            image: reader.result as string
          }));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle Save Hospital Info
  const handleSaveHospitalInfo = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('admin_rs_info', JSON.stringify(rsInfo));
    window.dispatchEvent(new CustomEvent('yasmin_hospital_info_update'));
    alert('Data Rumah Sakit berhasil disimpan!');
  };

  // Image Upload handler
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setCurrentDoctor(prev => ({
            ...prev,
            image: reader.result as string
          }));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  // Doctors crud
  const handleOpenAddDoctor = () => {
    setCurrentDoctor({
      id: `doc-${Date.now()}`,
      name: '',
      specialty: 'Kesehatan Keluarga',
      subSpecialty: 'Umum',
      experience: 5,
      rating: 4.8,
      gender: 'Laki-laki',
      image: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=400',
      bpjs: true,
      schedule: { days: ['Senin', 'Rabu', 'Jumat'], hours: '08:00 - 12:00', quota: 30 },
      bio: '',
      education: '',
      status: 'Aktif',
      gradGradDate: '',
      licenseNumber: '',
      specGradDate: '',
      specLicenseNumber: '',
      joinDate: new Date().toISOString().split('T')[0],
      leaveFromDate: '',
      leaveToDate: ''
    });
    setModalType('ADD');
    setIsModalOpen(true);
  };

  const handleOpenEditDoctor = (doc: Doctor) => {
    setCurrentDoctor({ ...doc });
    setModalType('EDIT');
    setIsModalOpen(true);
  };

  const handleDeleteDoctor = (id: string) => {
    const item = doctors.find(d => d.id === id);
    setDeleteConfirm({
      isOpen: true,
      type: 'DOCTOR',
      id,
      name: item ? item.name : 'data dokter ini'
    });
  };

  const handleSaveDoctor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentDoctor.name) {
      alert('Nama dokter harus diisi!');
      return;
    }

    let updatedList: Doctor[] = [];
    if (modalType === 'ADD') {
      updatedList = [...doctors, currentDoctor as Doctor];
    } else {
      updatedList = doctors.map(d => d.id === currentDoctor.id ? (currentDoctor as Doctor) : d);
    }

    onUpdateDoctors(updatedList);
    setIsModalOpen(false);
  };

  // Poly crud
  const handleOpenAddPoly = () => {
    setCurrentPoly({ code: `POL0${polyclinics.length + 1}`, name: '', status: 'Aktif', activeSinceDate: '', inactiveSinceDate: '' });
    setModalType('ADD');
    setIsModalOpen(true);
  };

  const handleOpenEditPoly = (poly: Polyclinic) => {
    setCurrentPoly({ ...poly });
    setModalType('EDIT');
    setIsModalOpen(true);
  };

  const handleDeletePoly = (code: string) => {
    const item = polyclinics.find(p => p.code === code);
    setDeleteConfirm({
      isOpen: true,
      type: 'POLY',
      id: code,
      name: item ? item.name : 'data polyklinik ini'
    });
  };

  const handleSavePoly = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPoly.name) {
      alert('Nama polyklinik harus diisi!');
      return;
    }

    let updatedList: Polyclinic[] = [];
    if (modalType === 'ADD') {
      updatedList = [...polyclinics, currentPoly as Polyclinic];
    } else {
      updatedList = polyclinics.map(p => p.code === currentPoly.code ? (currentPoly as Polyclinic) : p);
    }

    setPolyclinics(updatedList);
    setIsModalOpen(false);
  };

  // Specialist crud
  const handleOpenAddSpecialist = () => {
    setCurrentSpecialist({ code: `SPS0${specialists.length + 1}`, name: '', description: '' });
    setModalType('ADD');
    setIsModalOpen(true);
  };

  const handleOpenEditSpecialist = (spec: Specialist) => {
    setCurrentSpecialist({ ...spec });
    setModalType('EDIT');
    setIsModalOpen(true);
  };

  const handleDeleteSpecialist = (code: string) => {
    const item = specialists.find(s => s.code === code);
    setDeleteConfirm({
      isOpen: true,
      type: 'SPECIALIST',
      id: code,
      name: item ? item.name : 'data spesialis ini'
    });
  };

  const handleSaveSpecialist = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentSpecialist.name) {
      alert('Nama spesialis harus diisi!');
      return;
    }

    let updatedList: Specialist[] = [];
    if (modalType === 'ADD') {
      updatedList = [...specialists, currentSpecialist as Specialist];
    } else {
      updatedList = specialists.map(s => s.code === currentSpecialist.code ? (currentSpecialist as Specialist) : s);
    }

    setSpecialists(updatedList);
    setIsModalOpen(false);
  };

  const isSidebarExpanded = !isSidebarCollapsed || isSidebarHovered;

  const selectMenuAndScroll = (menuKey: ActiveMenu) => {
    setActiveMenu(menuKey);
    setSearchTerm('');
    
    // Collapse the main sidebar if a menu that has/is inside a submenu is chosen, and sidebar is uncollapsed
    if (menuKey.startsWith('KPI_') || menuKey.startsWith('KAMAR_')) {
      if (!isSidebarCollapsed) {
        setIsSidebarCollapsed(true);
      }
    }
    
    if (menuKey.startsWith('KPI_')) {
      setIsKpiSidebarExpanded(true);
      setIsKamarSidebarExpanded(false);
      setTimeout(() => {
        const element = document.getElementById('sidebar-menu-KPI');
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }, 100);
    } else {
      setIsKpiSidebarExpanded(false);
      if (menuKey.startsWith('KAMAR_')) {
        setIsKamarSidebarExpanded(true);
      } else {
        setIsKamarSidebarExpanded(false);
      }
      setTimeout(() => {
        const element = document.getElementById(`sidebar-menu-${menuKey}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }, 100);
    }
  };

  if (isDetecting) {
    return (
      <div className="fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-teal-950 text-white font-sans selection:bg-teal-800">
        <div className="max-w-md w-full px-6 py-8 bg-teal-900/40 rounded-2xl border border-teal-800/60 shadow-2xl backdrop-blur-md text-center animate-fade-in">
          
          {/* Logo with pulsating effect */}
          <div className="relative inline-block mb-6">
            <div className="absolute inset-0 bg-teal-500/20 rounded-full blur-xl animate-pulse" />
            <SafeImage 
              src={rsInfo.logo || logoRsYasmin} 
              fallbackSrc={logoRsYasmin}
              alt="Logo" 
              className="relative h-20 w-20 object-contain mx-auto bg-white rounded-full p-2 border-2 border-teal-400 shadow-md"
            />
          </div>

          <h2 className="text-xl font-display font-black uppercase tracking-wider text-warm-orange mb-1">
            {rsInfo.name || "RS YASMIN BANYUWANGI"}
          </h2>
          <p className="text-xs text-teal-300 font-semibold tracking-widest uppercase mb-8">
            Admin Portal Diagnostic &amp; Optimization
          </p>

          {/* Progress bar */}
          <div className="mb-8">
            <div className="flex justify-between items-center text-xs font-mono text-teal-300 mb-2">
              <span className="font-semibold">MENGANALISIS SISTEM...</span>
              <span className="font-bold text-warm-orange">{detectionProgress}%</span>
            </div>
            <div className="w-full bg-teal-950/60 h-3 rounded-full overflow-hidden border border-teal-800 p-0.5">
              <div 
                className="h-full bg-gradient-to-r from-teal-500 via-teal-400 to-warm-orange rounded-full transition-all duration-300 ease-out"
                style={{ width: `${detectionProgress}%` }}
              />
            </div>
          </div>

          {/* Diagnostic Steps */}
          <div className="text-left space-y-3 font-mono text-xs text-teal-100 bg-teal-950/40 p-4 rounded-xl border border-teal-900/60 max-h-60 overflow-y-auto">
            {detectionSteps.map((step, idx) => (
              <div key={idx} className="flex items-start justify-between space-x-2">
                <div className="flex items-center space-x-2">
                  {step.status === 'success' ? (
                    <span className="text-emerald-400 font-bold">[ OK ]</span>
                  ) : step.status === 'loading' ? (
                    <span className="text-warm-orange font-bold animate-pulse">[ .. ]</span>
                  ) : (
                    <span className="text-teal-600 font-bold">[ WAITING ]</span>
                  )}
                  <span className={`${step.status === 'success' ? 'text-teal-200' : step.status === 'loading' ? 'text-white font-medium' : 'text-teal-500'}`}>
                    {step.label}
                  </span>
                </div>
                {step.value && (
                  <span className="text-warm-orange font-semibold text-right max-w-[150px] truncate">
                    {step.value}
                  </span>
                )}
              </div>
            ))}
          </div>

          <p className="text-[10px] text-teal-400/80 mt-6 font-mono">
            Memuat standardisasi visual &amp; layout komponen...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div id="admin-dashboard-container" className="fixed inset-0 z-[99999] flex bg-gray-50 text-gray-800 font-sans h-screen w-screen overflow-hidden selection:bg-teal-200 selection:text-headings">
      <style>{`
        /* Standardized System Styles based on OS/Browser/Resolution Detection */
        #admin-dashboard-container {
          font-family: ${systemFont}, system-ui, -apple-system, sans-serif !important;
          font-size: ${systemFontSize} !important;
        }
        #admin-dashboard-container button,
        #admin-dashboard-container input,
        #admin-dashboard-container select,
        #admin-dashboard-container textarea {
          font-family: ${systemFont}, system-ui, -apple-system, sans-serif !important;
        }
        #admin-dashboard-container .p-6 {
          padding: ${systemPadding} !important;
        }

        /* Screen styling: hide print elements */
        .print-header {
          display: none !important;
        }

        @media print {
          @page {
            margin-top: 2.2cm;
            margin-bottom: 1.8cm;
            margin-left: 1.2cm;
            margin-right: 1.2cm;
          }
          .print-header {
            position: fixed !important;
            top: -1.7cm !important;
            left: 0 !important;
            right: 0 !important;
            height: 1.5cm !important;
            display: flex !important;
            align-items: center !important;
            justify-content: space-between !important;
            border-bottom: 2px solid #0d9488 !important; /* border-teal-600 */
            padding-bottom: 6px !important;
            font-family: sans-serif !important;
            background-color: white !important;
            z-index: 9999 !important;
          }
          .print-page-num::after {
            content: counter(page) !important;
          }
          
          /* Hide non-printable elements */
          .print\\:hidden, aside, #admin-sidebar, header, .print-hidden, button, .btn, input, select, .no-print {
            display: none !important;
            width: 0 !important;
            height: 0 !important;
            overflow: hidden !important;
            opacity: 0 !important;
            visibility: hidden !important;
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
          }
          /* Reset container for standard page flow */
          #admin-dashboard-container, body, html {
            position: static !important;
            height: auto !important;
            min-height: auto !important;
            width: 100% !important;
            overflow: visible !important;
            display: block !important;
            background: white !important;
          }
          main {
            position: static !important;
            height: auto !important;
            width: 100% !important;
            overflow: visible !important;
            display: block !important;
            padding: 0.4cm 0 0 0 !important; /* Space so it does not overlap with fixed top header */
            background: white !important;
          }
          /* Ensure all inner scroll areas are fully expanded in print */
          .overflow-y-auto, .overflow-x-auto, .overflow-hidden {
            overflow: visible !important;
            height: auto !important;
            max-height: none !important;
          }
          /* Keep grid structure and flex layouts for WYSIWYG */
          .grid {
            display: grid !important;
          }
          .flex {
            display: flex !important;
          }
          /* Retain background colors, gradients, and text colors */
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          /* Prevent page-breaks in important section blocks */
          .animate-fade-in {
            opacity: 1 !important;
            transform: none !important;
          }
          footer, .max-w-5xl, .card, .bg-white, section {
            page-break-inside: avoid !important;
          }
          /* Table print fixes */
          table {
            page-break-inside: auto;
            width: 100% !important;
          }
          tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }
          thead {
            display: table-header-group;
          }
          tfoot {
            display: table-footer-group;
          }
        }
      `}</style>
      
      {/* SIDEBAR */}
      <aside 
        id="admin-sidebar"
        className={`${isSidebarExpanded ? 'w-80' : 'w-20'} bg-headings text-white flex flex-col shrink-0 border-r border-teal-800 shadow-xl transition-all duration-300 relative h-full print:hidden`}
        onMouseEnter={() => { if (isSidebarCollapsed) setIsSidebarHovered(true); }}
        onMouseLeave={() => { if (isSidebarCollapsed) setIsSidebarHovered(false); }}
      >
        
        {/* Brand header */}
        <div className="p-4 border-b border-teal-900 flex items-center justify-between bg-teal-950 h-20 overflow-hidden">
          <div className="flex items-center space-x-3">
            <SafeImage 
              src={rsInfo.logo || logoRsYasmin} 
              fallbackSrc={logoRsYasmin}
              alt="RS Yasmin Logo" 
              className="h-12 w-12 object-contain bg-white rounded-full p-1 border-2 border-teal-800 shrink-0"
            />
            {isSidebarExpanded && (
              <div className="animate-fade-in">
                <h1 className="font-display font-black text-sm tracking-wider text-warm-ivory uppercase leading-tight max-w-[170px] truncate">
                  {rsInfo.name || "RS YASMIN"}
                </h1>
                <p className="text-[9px] text-warm-mint/60 uppercase tracking-widest font-mono">Admin Portal</p>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar Nav Menus */}
        <div id="admin-sidebar-nav-container" className="flex-1 overflow-y-auto px-3 py-6 space-y-6">
          
          {/* Relocated Kembali ke Website button at top */}
          <div className="px-1.5 pb-2 border-b border-teal-900/40">
            <button
              onClick={onClose}
              title="Kembali ke Website"
              className={`w-full flex items-center justify-center ${isSidebarExpanded ? 'space-x-3 px-4 py-3' : 'p-3'} bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-bold tracking-wider transition-all shadow-md active:scale-95 cursor-pointer`}
            >
              <LogOut className="h-5 w-5 shrink-0" />
              {isSidebarExpanded && <span className="truncate">Kembali ke Website</span>}
            </button>
          </div>

          <div>
            {isSidebarExpanded && (
              <div className="text-[10px] font-bold text-teal-300 tracking-widest uppercase px-3 mb-3 font-mono">
                Main Data Master
              </div>
            )}
            
            <nav className="space-y-1.5">
              
              <button
                type="button"
                id="sidebar-menu-NAMA_RS"
                onClick={() => selectMenuAndScroll('NAMA_RS')}
                title="Nama Rumah Sakit"
                className={`w-full flex items-center ${isSidebarExpanded ? 'space-x-3 px-4 py-3' : 'justify-center p-3'} rounded-xl text-sm tracking-wide transition-all cursor-pointer ${
                  activeMenu === 'NAMA_RS' 
                    ? 'bg-warm-orange text-headings shadow-md scale-[1.02] font-bold' 
                    : 'text-teal-100 hover:bg-teal-900/50 hover:text-white font-normal'
                }`}
              >
                <Building className="h-5 w-5 shrink-0" />
                {isSidebarExpanded && <span className="truncate">Nama Rumah Sakit</span>}
              </button>

              <button
                type="button"
                id="sidebar-menu-DATA_POLY"
                onClick={() => selectMenuAndScroll('DATA_POLY')}
                title="Data Poliklinik"
                className={`w-full flex items-center ${isSidebarExpanded ? 'space-x-3 px-4 py-3' : 'justify-center p-3'} rounded-xl text-sm tracking-wide transition-all cursor-pointer ${
                  activeMenu === 'DATA_POLY' 
                    ? 'bg-warm-orange text-headings shadow-md scale-[1.02] font-bold' 
                    : 'text-teal-100 hover:bg-teal-900/50 hover:text-white font-normal'
                }`}
              >
                <ClipboardList className="h-5 w-5 shrink-0" />
                {isSidebarExpanded && <span className="truncate">Data Poliklinik</span>}
              </button>

              <button
                type="button"
                id="sidebar-menu-DATA_SPESIALIS"
                onClick={() => selectMenuAndScroll('DATA_SPESIALIS')}
                title="Data Spesialis"
                className={`w-full flex items-center ${isSidebarExpanded ? 'space-x-3 px-4 py-3' : 'justify-center p-3'} rounded-xl text-sm tracking-wide transition-all cursor-pointer ${
                  activeMenu === 'DATA_SPESIALIS' 
                    ? 'bg-warm-orange text-headings shadow-md scale-[1.02] font-bold' 
                    : 'text-teal-100 hover:bg-teal-900/50 hover:text-white font-normal'
                }`}
              >
                <Award className="h-5 w-5 shrink-0" />
                {isSidebarExpanded && <span className="truncate">Data Spesialis</span>}
              </button>

              <button
                type="button"
                id="sidebar-menu-DATA_DOKTER"
                onClick={() => selectMenuAndScroll('DATA_DOKTER')}
                title="Data Dokter"
                className={`w-full flex items-center ${isSidebarExpanded ? 'space-x-3 px-4 py-3' : 'justify-center p-3'} rounded-xl text-sm tracking-wide transition-all cursor-pointer ${
                  activeMenu === 'DATA_DOKTER' 
                    ? 'bg-warm-orange text-headings shadow-md scale-[1.02] font-bold' 
                    : 'text-teal-100 hover:bg-teal-900/50 hover:text-white font-normal'
                }`}
              >
                <Users className="h-5 w-5 shrink-0" />
                {isSidebarExpanded && <span className="truncate">Data Dokter</span>}
              </button>

              <button
                type="button"
                id="sidebar-menu-DATA_PRAKTEK"
                onClick={() => selectMenuAndScroll('DATA_PRAKTEK')}
                title="Data Praktek Dokter"
                className={`w-full flex items-center ${isSidebarExpanded ? 'space-x-3 px-4 py-3' : 'justify-center p-3'} rounded-xl text-sm tracking-wide transition-all cursor-pointer ${
                  activeMenu === 'DATA_PRAKTEK' 
                    ? 'bg-warm-orange text-headings shadow-md scale-[1.02] font-bold' 
                    : 'text-teal-100 hover:bg-teal-900/50 hover:text-white font-normal'
                }`}
              >
                <Calendar className="h-5 w-5 shrink-0" />
                {isSidebarExpanded && <span className="truncate">Data Praktek Dokter</span>}
              </button>

              <button
                type="button"
                id="sidebar-menu-SOSIAL_MEDIA"
                onClick={() => selectMenuAndScroll('SOSIAL_MEDIA')}
                title="Sosial Media"
                className={`w-full flex items-center ${isSidebarExpanded ? 'space-x-3 px-4 py-3' : 'justify-center p-3'} rounded-xl text-sm tracking-wide transition-all cursor-pointer ${
                  activeMenu === 'SOSIAL_MEDIA' 
                    ? 'bg-warm-orange text-headings shadow-md scale-[1.02] font-bold' 
                    : 'text-teal-100 hover:bg-teal-900/50 hover:text-white font-normal'
                }`}
              >
                <Share2 className="h-5 w-5 shrink-0" />
                {isSidebarExpanded && <span className="truncate">Sosial Media</span>}
              </button>

              <button
                type="button"
                id="sidebar-menu-BERITA"
                onClick={() => selectMenuAndScroll('BERITA')}
                title="Pengumuman Berita"
                className={`w-full flex items-center ${isSidebarExpanded ? 'space-x-3 px-4 py-3' : 'justify-center p-3'} rounded-xl text-sm tracking-wide transition-all cursor-pointer ${
                  activeMenu === 'BERITA' 
                    ? 'bg-warm-orange text-headings shadow-md scale-[1.02] font-bold' 
                    : 'text-teal-100 hover:bg-teal-900/50 hover:text-white font-normal'
                }`}
              >
                <Megaphone className="h-5 w-5 shrink-0" />
                {isSidebarExpanded && <span className="truncate">Berita</span>}
              </button>

              {/* COLLAPSIBLE KAMAR RAWAT SIDEBAR MENU */}
              <div className="space-y-1">
                <button
                  type="button"
                  id="sidebar-menu-KAMAR"
                  onClick={() => {
                    const nextVal = !isKamarSidebarExpanded;
                    setIsKamarSidebarExpanded(nextVal);
                    if (nextVal) {
                      setIsKpiSidebarExpanded(false);
                    }
                  }}
                  title="Kamar Rawat"
                  className={`w-full flex items-center justify-between ${isSidebarExpanded ? 'px-4 py-3' : 'justify-center p-3'} rounded-xl text-sm tracking-wide transition-all ${
                    activeMenu.startsWith('KAMAR_') || isKamarSidebarExpanded
                      ? 'text-white font-bold bg-teal-900/40'
                      : 'text-teal-100 hover:bg-teal-900/50 hover:text-white font-normal'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <Bed className="h-5 w-5 shrink-0" />
                    {isSidebarExpanded && <span className="truncate">Kamar Rawat</span>}
                  </div>
                  {isSidebarExpanded && (
                    isKamarSidebarExpanded ? <ChevronDown className="h-4 w-4 text-teal-300" /> : <ChevronRight className="h-4 w-4 text-teal-300" />
                  )}
                </button>
                
                {isKamarSidebarExpanded && isSidebarExpanded && (
                  <div className="pl-4 space-y-1 border-l border-teal-800 ml-6 py-1">
                    <button
                      type="button"
                      onClick={() => selectMenuAndScroll('KAMAR_RAWAT_INAP')}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs tracking-wide transition-all flex items-center space-x-2.5 ${
                        activeMenu === 'KAMAR_RAWAT_INAP'
                          ? 'bg-warm-orange text-headings shadow-xs font-bold'
                          : 'text-teal-100 hover:bg-teal-900/30 hover:text-white font-normal'
                      }`}
                    >
                      <BedDouble className={`h-4 w-4 shrink-0 ${activeMenu === 'KAMAR_RAWAT_INAP' ? 'text-headings' : 'text-teal-300'}`} />
                      <span>Rawat Inap</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => selectMenuAndScroll('KAMAR_ICU')}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs tracking-wide transition-all flex items-center space-x-2.5 ${
                        activeMenu === 'KAMAR_ICU'
                          ? 'bg-warm-orange text-headings shadow-xs font-bold'
                          : 'text-teal-100 hover:bg-teal-900/30 hover:text-white font-normal'
                      }`}
                    >
                      <HeartPulse className={`h-4 w-4 shrink-0 ${activeMenu === 'KAMAR_ICU' ? 'text-headings' : 'text-indigo-300'}`} />
                      <span>ICU</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => selectMenuAndScroll('KAMAR_IGD')}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs tracking-wide transition-all flex items-center space-x-2.5 ${
                        activeMenu === 'KAMAR_IGD'
                          ? 'bg-warm-orange text-headings shadow-xs font-bold'
                          : 'text-teal-100 hover:bg-teal-900/30 hover:text-white font-normal'
                      }`}
                    >
                      <Siren className={`h-4 w-4 shrink-0 ${activeMenu === 'KAMAR_IGD' ? 'text-headings' : 'text-rose-300'}`} />
                      <span>IGD</span>
                    </button>
                  </div>
                )}
              </div>

              {/* COLLAPSIBLE KPI SIDEBAR MENU */}
              <div className="space-y-1">
                <button
                  type="button"
                  id="sidebar-menu-KPI"
                  onClick={() => {
                    const nextVal = !isKpiSidebarExpanded;
                    setIsKpiSidebarExpanded(nextVal);
                    if (nextVal) {
                      setIsKamarSidebarExpanded(false);
                    }
                  }}
                  title="KPI & Kinerja"
                  className={`w-full flex items-center justify-between ${isSidebarExpanded ? 'px-4 py-3' : 'justify-center p-3'} rounded-xl text-sm tracking-wide transition-all ${
                    activeMenu.startsWith('KPI_') || isKpiSidebarExpanded
                      ? 'text-white font-bold bg-teal-900/40'
                      : 'text-teal-100 hover:bg-teal-900/50 hover:text-white font-normal'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <TrendingUp className="h-5 w-5 shrink-0" />
                    {isSidebarExpanded && <span className="truncate">Menu KPI</span>}
                  </div>
                  {isSidebarExpanded && (
                    isKpiSidebarExpanded ? <ChevronDown className="h-4 w-4 text-teal-300" /> : <ChevronRight className="h-4 w-4 text-teal-300" />
                  )}
                </button>
                
                {isKpiSidebarExpanded && isSidebarExpanded && (
                  <div className="pl-4 space-y-1 border-l border-teal-800 ml-6 py-1">
                    {[
                      { id: 'KPI_RAWAT_JALAN', name: 'Rawat Jalan', Icon: Stethoscope, iconColor: 'text-emerald-400' },
                      { id: 'KPI_RAWAT_INAP', name: 'Rawat Inap', Icon: BedDouble, iconColor: 'text-teal-400' },
                      { id: 'KPI_IGD', name: 'IGD', Icon: Siren, iconColor: 'text-rose-400' },
                      { id: 'KPI_ICU', name: 'ICU', Icon: HeartPulse, iconColor: 'text-indigo-400' },
                      { id: 'KPI_HCU', name: 'HCU', Icon: Thermometer, iconColor: 'text-sky-400' },
                      { id: 'KPI_NICU', name: 'NICU', Icon: Baby, iconColor: 'text-pink-400' },
                      { id: 'KPI_PICU', name: 'PICU', Icon: Baby, iconColor: 'text-purple-400' },
                      { id: 'KPI_PERINATOLOGI', name: 'Perinatologi', Icon: Baby, iconColor: 'text-yellow-400' },
                      { id: 'KPI_KAMAR_OPERASI', name: 'Kamar Operasi (OK)', Icon: Scissors, iconColor: 'text-red-400' },
                      { id: 'KPI_CSSD', name: 'CSSD', Icon: ShieldCheck, iconColor: 'text-cyan-400' },
                      { id: 'KPI_HEMODIALISA', name: 'Hemodialisa', Icon: Droplet, iconColor: 'text-amber-400' },
                      { id: 'KPI_MCU', name: 'MCU', Icon: ClipboardCheck, iconColor: 'text-emerald-400' },
                      { id: 'KPI_REHABILITASI_MEDIK', name: 'Rehabilitasi Medik', Icon: Accessibility, iconColor: 'text-indigo-400' },
                      { id: 'KPI_HOME_CARE', name: 'Home Care', Icon: Home, iconColor: 'text-blue-400' },
                      { id: 'KPI_AMBULANCE', name: 'Ambulance', Icon: Truck, iconColor: 'text-orange-400' },
                      { id: 'KPI_BED_MANAGEMENT', name: 'Bed Management', Icon: LayoutGrid, iconColor: 'text-teal-400' },
                      { id: 'KPI_ANTRIAN', name: 'Antrian', Icon: Clock, iconColor: 'text-sky-400' },
                      { id: 'KPI_RUJUKAN_PASIEN', name: 'Rujukan Pasien', Icon: Send, iconColor: 'text-purple-400' },
                      { id: 'KPI_ANALISA_RUJUKAN', name: 'Analisa Rujukan', Icon: LineChart, iconColor: 'text-violet-400' },
                      { id: 'KPI_KINERJA_PELAYANAN', name: 'Kinerja Pelayanan', Icon: Star, iconColor: 'text-rose-400' }
                    ].map((sub) => {
                      const SubIcon = sub.Icon;
                      const isActive = activeMenu === sub.id;
                      return (
                        <button
                          key={sub.id}
                          type="button"
                          onClick={() => selectMenuAndScroll(sub.id as any)}
                          className={`w-full text-left px-3 py-2 rounded-lg text-xs tracking-wide transition-all flex items-center space-x-2.5 ${
                            isActive
                              ? 'bg-warm-orange text-headings shadow-xs font-bold'
                              : 'text-teal-100 hover:bg-teal-900/30 hover:text-white font-normal'
                          }`}
                        >
                          <SubIcon className={`h-3.5 w-3.5 shrink-0 ${isActive ? 'text-headings' : sub.iconColor}`} />
                          <span className="truncate">{sub.name}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

            </nav>
          </div>

        </div>

        {/* Fixed Sidebar Footer (MS Outlook Style Navigation Rail - Auto-Hide & Left Aligned Horizontal Scroll) */}
        <div className={`p-2.5 border-t border-teal-900 bg-teal-950 flex items-center text-teal-300 shrink-0 select-none overflow-x-auto [::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] w-full max-w-full ${isSidebarExpanded ? 'justify-around' : 'justify-start space-x-1.5 px-2'}`}>
          <button
            type="button"
            onClick={() => selectMenuAndScroll('NAMA_RS')}
            title="Nama Rumah Sakit"
            className={`p-2 rounded-lg hover:bg-teal-900 hover:text-white transition-all cursor-pointer shrink-0 relative ${
              activeMenu === 'NAMA_RS' ? 'bg-teal-900 text-warm-orange' : ''
            }`}
          >
            <Building className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => selectMenuAndScroll('DATA_POLY')}
            title="Data Poliklinik"
            className={`p-2 rounded-lg hover:bg-teal-900 hover:text-white transition-all cursor-pointer shrink-0 relative ${
              activeMenu === 'DATA_POLY' ? 'bg-teal-900 text-warm-orange' : ''
            }`}
          >
            <ClipboardList className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => selectMenuAndScroll('DATA_DOKTER')}
            title="Data Dokter"
            className={`p-2 rounded-lg hover:bg-teal-900 hover:text-white transition-all cursor-pointer shrink-0 relative ${
              activeMenu === 'DATA_DOKTER' ? 'bg-teal-900 text-warm-orange' : ''
            }`}
          >
            <Users className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => selectMenuAndScroll('DATA_PRAKTEK')}
            title="Data Praktek Dokter"
            className={`p-2 rounded-lg hover:bg-teal-900 hover:text-white transition-all cursor-pointer shrink-0 relative ${
              activeMenu === 'DATA_PRAKTEK' ? 'bg-teal-900 text-warm-orange' : ''
            }`}
          >
            <Calendar className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => selectMenuAndScroll('KPI_RAWAT_JALAN')}
            title="KPI Rawat Jalan"
            className={`p-2 rounded-lg hover:bg-teal-900 hover:text-white transition-all cursor-pointer shrink-0 relative ${
              activeMenu.startsWith('KPI_') ? 'bg-teal-900 text-warm-orange' : ''
            }`}
          >
            <TrendingUp className="h-5 w-5" />
          </button>
        </div>

      </aside>

      {/* CONTENT AREA */}
      <main className="flex-1 flex flex-col min-w-0 bg-slate-50 overflow-hidden h-full">
        
        {/* PRINT HEADER FOR ALL PAGES */}
        <div className="print-header hidden">
          <div className="flex items-center space-x-3">
            <SafeImage 
              src={rsInfo.logo || logoRsYasmin} 
              fallbackSrc={logoRsYasmin}
              alt="Logo RS" 
              className="h-10 w-10 object-contain bg-white rounded-full p-1 border border-teal-900 shrink-0" 
            />
            <div>
              <h1 className="font-display font-black text-xs text-teal-950 uppercase tracking-wide leading-none">
                {rsInfo.name || "RS Yasmin Banyuwangi"}
              </h1>
              <p className="text-[8px] text-gray-500 font-semibold leading-tight max-w-sm mt-1">
                {rsInfo.address}
              </p>
            </div>
          </div>
          <div className="text-right text-[9px] text-teal-950 space-y-0.5 font-sans shrink-0">
            <h2 className="font-bold text-xs text-teal-850 uppercase tracking-wide leading-none">
              {getMenuTitle(activeMenu)}
            </h2>
            <p className="text-gray-500 text-[8px] mt-1">
              Cetak: <span className="font-mono font-bold text-gray-700">{new Date().toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'medium' })}</span>
            </p>
            <p className="text-gray-500 text-[8px] font-semibold">
              Halaman <span className="print-page-num font-mono text-gray-850 font-bold" />
            </p>
          </div>
        </div>
        
        {/* Header bar */}
        <header className="h-20 bg-white border-b border-gray-200 px-4 md:px-8 flex items-center justify-between shrink-0 font-sans">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="p-2 hover:bg-gray-100 text-teal-800 hover:text-teal-950 rounded-xl transition-all cursor-pointer focus:outline-none"
              title={isSidebarCollapsed ? "Kunci Sidebar" : "Auto-Hide Sidebar"}
            >
              <Menu className="h-5 w-5" />
            </button>
            <div>
              <h2 className="font-display font-bold text-xl text-headings tracking-tight">
                {activeMenu === 'NAMA_RS' && 'Pengaturan Master Nama Rumah Sakit'}
                {activeMenu === 'DATA_POLY' && 'Master Data Poliklinik'}
                {activeMenu === 'DATA_SPESIALIS' && 'Master Data Spesialisasi'}
                {activeMenu === 'DATA_DOKTER' && 'Master Data Dokter'}
                {activeMenu === 'DATA_PRAKTEK' && 'Jadwal Praktek Dokter'}
                {activeMenu === 'SOSIAL_MEDIA' && 'Master Sosial Media'}
                {activeMenu === 'BERITA' && 'Master Pengumuman Berita'}
                {activeMenu === 'KAMAR_RAWAT_INAP' && 'Master Kamar Rawat Inap'}
                {activeMenu === 'KAMAR_ICU' && 'Master Kamar ICU'}
                {activeMenu === 'KAMAR_IGD' && 'Master Kamar IGD'}
                {activeMenu === 'KPI_RAWAT_JALAN' && 'Dashboard KPI Rawat Jalan'}
                {activeMenu === 'KPI_RAWAT_INAP' && 'Dashboard KPI Rawat Inap'}
                {activeMenu === 'KPI_IGD' && 'Dashboard KPI IGD'}
                {activeMenu === 'KPI_ICU' && 'Dashboard KPI ICU'}
                {activeMenu === 'KPI_HCU' && 'Dashboard KPI HCU'}
                {activeMenu === 'KPI_NICU' && 'Dashboard KPI NICU'}
                {activeMenu === 'KPI_PICU' && 'Dashboard KPI PICU'}
                {activeMenu === 'KPI_PERINATOLOGI' && 'Dashboard KPI Perinatologi'}
                {activeMenu === 'KPI_KAMAR_OPERASI' && 'Dashboard KPI Kamar Operasi (OK)'}
                {activeMenu === 'KPI_CSSD' && 'Dashboard KPI CSSD'}
                {activeMenu === 'KPI_HEMODIALISA' && 'Dashboard KPI Hemodialisa'}
                {activeMenu === 'KPI_MCU' && 'Dashboard KPI MCU'}
                {activeMenu === 'KPI_REHABILITASI_MEDIK' && 'Dashboard KPI Rehabilitasi Medik'}
                {activeMenu === 'KPI_HOME_CARE' && 'Dashboard KPI Home Care'}
                {activeMenu === 'KPI_AMBULANCE' && 'Dashboard KPI Ambulance'}
                {activeMenu === 'KPI_BED_MANAGEMENT' && 'Dashboard KPI Bed Management'}
                {activeMenu === 'KPI_ANTRIAN' && 'Dashboard KPI Antrian'}
                {activeMenu === 'KPI_RUJUKAN_PASIEN' && 'Dashboard KPI Rujukan Pasien'}
                {activeMenu === 'KPI_ANALISA_RUJUKAN' && 'Dashboard KPI Analisa Rujukan'}
                {activeMenu === 'KPI_KINERJA_PELAYANAN' && 'Dashboard KPI Kinerja Pelayanan'}
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">Kelola informasi data master secara dinamis dan real-time.</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3 print:hidden">
            <span className="text-[10px] text-gray-400 max-w-[180px] leading-tight text-right hidden lg:inline-block">
              💡 Buka tab baru jika cetak tidak aktif di iframe preview
            </span>
            <button
              type="button"
              onClick={() => {
                const isInIframe = typeof window !== 'undefined' && window.self !== window.top;
                if (isInIframe) {
                  setShowPrintWarning(true);
                } else {
                  try {
                    window.print();
                  } catch (e) {
                    alert("Gagal memicu cetak. Silakan gunakan tombol 'Open in new tab' di pojok kanan atas preview untuk mencetak.");
                  }
                }
              }}
              className="flex items-center space-x-2 bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold tracking-wider transition-all shadow-md active:scale-95 cursor-pointer border-none"
              title="Cetak halaman / Simpan PDF (Silakan buka di Tab Baru jika tombol tidak bereaksi di dalam preview iframe)"
            >
              <Printer className="h-4 w-4 shrink-0" />
              <span>PDF</span>
            </button>
            <span className="text-xs bg-teal-100 text-teal-800 px-3 py-1 rounded-full font-bold uppercase tracking-wider font-mono hidden sm:inline-block">
              Status: Connected
            </span>
          </div>
        </header>

        {/* Tab/Menu Content */}
        <div className="flex-1 overflow-y-auto flex flex-col justify-between min-h-0">
          <div className="p-8 flex-1 space-y-8">
          
          {/* 1. NAMA RS MENU */}
          {activeMenu === 'NAMA_RS' && (
            <div className="space-y-8 max-w-5xl animate-fade-in">
              <div className="max-w-3xl bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden p-6 md:p-8">
              <div className="flex items-center space-x-3 border-b border-gray-100 pb-5 mb-6">
                <Building className="h-6 w-6 text-yasmin-green" />
                <h3 className="font-display font-bold text-lg text-gray-850">Informasi Profil Instansi Rumah Sakit</h3>
              </div>

              <form onSubmit={handleSaveHospitalInfo} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  
                  {/* LOGO RS FIELD */}
                  <div className="col-span-1 md:col-span-2 flex flex-col items-center p-6 bg-slate-50 rounded-2xl border-2 border-dashed border-gray-200 space-y-4">
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider font-mono">Logo Resmi Rumah Sakit</span>
                    
                    {/* Logo display preview */}
                    <div className="h-24 w-auto min-w-[120px] max-w-[240px] px-4 py-2 bg-white rounded-xl shadow-sm border border-gray-100 flex items-center justify-center relative group">
                      {rsInfo.logo || logoRsYasmin ? (
                        <SafeImage 
                          src={rsInfo.logo || logoRsYasmin} 
                          fallbackSrc={logoRsYasmin}
                          alt="Logo Preview" 
                          className="h-16 w-auto object-contain" 
                        />
                      ) : (
                        <div className="h-16 w-full flex items-center justify-center text-gray-400">
                          <ImageIcon className="h-8 w-8" />
                        </div>
                      )}
                    </div>

                    {/* Logo Upload action button */}
                    <div className="flex space-x-2 font-sans">
                      <input 
                        type="file" 
                        ref={logoInputRef}
                        onChange={handleLogoUpload}
                        accept="image/*"
                        className="hidden"
                      />
                      <button 
                        type="button"
                        onClick={() => logoInputRef.current?.click()}
                        className="px-4 py-2 bg-slate-700 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center space-x-2 shadow-xs"
                      >
                        <Upload className="h-3.5 w-3.5" />
                        <span>Pilih File Logo</span>
                      </button>
                      
                      {rsInfo.logo && (
                        <button 
                          type="button"
                          onClick={() => setRsInfo(prev => {
                            const updated = { ...prev };
                            delete updated.logo;
                            return updated;
                          })}
                          className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl text-xs font-bold transition-all cursor-pointer border border-rose-200"
                        >
                          Reset Default
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1.5 col-span-1 md:col-span-2">
                    <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Nama Rumah Sakit</label>
                    <input 
                      type="text" 
                      value={rsInfo.name}
                      onChange={(e) => setRsInfo({ ...rsInfo, name: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-yasmin-green focus:border-transparent text-sm"
                      placeholder="Masukkan nama Rumah Sakit"
                    />
                  </div>

                  <div className="space-y-1.5 col-span-1 md:col-span-2">
                    <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Alamat Lengkap</label>
                    <textarea 
                      rows={3}
                      value={rsInfo.address}
                      onChange={(e) => setRsInfo({ ...rsInfo, address: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-yasmin-green focus:border-transparent text-sm"
                      placeholder="Alamat instansi lengkap..."
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Telepon Kantor</label>
                    <input 
                      type="text" 
                      value={rsInfo.phone}
                      onChange={(e) => setRsInfo({ ...rsInfo, phone: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-yasmin-green focus:border-transparent text-sm font-mono"
                      placeholder="0333-xxxxxx"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">WhatsApp Service</label>
                    <input 
                      type="text" 
                      value={rsInfo.whatsapp}
                      onChange={(e) => setRsInfo({ ...rsInfo, whatsapp: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-yasmin-green focus:border-transparent text-sm font-mono"
                      placeholder="+62 8xx xxxx"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Email Resmi</label>
                    <input 
                      type="email" 
                      value={rsInfo.email}
                      onChange={(e) => setRsInfo({ ...rsInfo, email: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-yasmin-green focus:border-transparent text-sm"
                      placeholder="email@rsyasmin.com"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Status Akreditasi</label>
                    <input 
                      type="text" 
                      value={rsInfo.accreditation}
                      onChange={(e) => setRsInfo({ ...rsInfo, accreditation: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-yasmin-green focus:border-transparent text-sm"
                      placeholder="Status Akreditasi Kemenkes"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-100 flex justify-end">
                  <button 
                    type="submit"
                    className="px-6 py-2.5 bg-yasmin-green hover:bg-deep-teal text-white font-bold rounded-xl text-sm transition-all flex items-center space-x-2 cursor-pointer shadow-md"
                  >
                    <Check className="h-4.5 w-4.5" />
                    <span>Simpan Perubahan</span>
                  </button>
                </div>
              </form>
            </div>

            <DatabaseExportManager 
              rsInfo={rsInfo}
              polyclinics={polyclinics}
              specialists={specialists}
              socialMediaLinks={socialMediaLinks}
              announcements={announcements}
              rooms={rooms}
              doctors={doctors}
            />
          </div>
        )}

          {/* 2. DATA POLYKLINIK */}
          {activeMenu === 'DATA_POLY' && (
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="relative max-w-md w-full">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input 
                    type="text" 
                    placeholder="Cari poliklinik..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-yasmin-green focus:border-transparent"
                  />
                </div>
                <button 
                  onClick={handleOpenAddPoly}
                  className="px-4 py-2 bg-yasmin-green hover:bg-deep-teal text-white rounded-xl text-sm font-bold flex items-center justify-center space-x-2 transition-all cursor-pointer shrink-0"
                >
                  <Plus className="h-4.5 w-4.5" />
                  <span>Tambah Poliklinik</span>
                </button>
              </div>

              {(() => {
                const { paginatedItems: polyPages, totalPages: polyTotalPages, startIdx: polyStart, endIdx: polyEnd, totalItems: polyTotal } = paginate(sortedPolyclinics);
                return (
                  <>
                    <div className="overflow-x-auto max-h-[550px] overflow-y-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50 border-b border-gray-200 text-xs font-bold text-gray-500 uppercase tracking-wider select-none">
                            <th className="px-4 py-2 text-center w-12 sticky top-0 z-10 bg-slate-50 shadow-[0_1px_0_rgba(229,231,235,1)]">No.</th>
                            <th 
                              onClick={() => handlePolySort('code')}
                              className="px-4 py-2 cursor-pointer hover:bg-slate-100 transition-colors sticky top-0 z-10 bg-slate-50 shadow-[0_1px_0_rgba(229,231,235,1)]"
                            >
                              <div className="flex items-center space-x-1">
                                <span>Kode Poli</span>
                                <span className="text-[10px] text-gray-400">{polySort.field === 'code' ? (polySort.direction === 'asc' ? '▲' : '▼') : '↕'}</span>
                              </div>
                            </th>
                            <th 
                              onClick={() => handlePolySort('name')}
                              className="px-4 py-2 cursor-pointer hover:bg-slate-100 transition-colors sticky top-0 z-10 bg-slate-50 shadow-[0_1px_0_rgba(229,231,235,1)]"
                            >
                              <div className="flex items-center space-x-1">
                                <span>Nama Poliklinik</span>
                                <span className="text-[10px] text-gray-400">{polySort.field === 'name' ? (polySort.direction === 'asc' ? '▲' : '▼') : '↕'}</span>
                              </div>
                            </th>
                            <th 
                              onClick={() => handlePolySort('status')}
                              className="px-4 py-2 cursor-pointer hover:bg-slate-100 transition-colors sticky top-0 z-10 bg-slate-50 shadow-[0_1px_0_rgba(229,231,235,1)]"
                            >
                              <div className="flex items-center space-x-1">
                                <span>Status Layanan</span>
                                <span className="text-[10px] text-gray-400">{polySort.field === 'status' ? (polySort.direction === 'asc' ? '▲' : '▼') : '↕'}</span>
                              </div>
                            </th>
                            <th className="px-4 py-2 sticky top-0 z-10 bg-slate-50 shadow-[0_1px_0_rgba(229,231,235,1)]">Aktif Sejak</th>
                            <th className="px-4 py-2 sticky top-0 z-10 bg-slate-50 shadow-[0_1px_0_rgba(229,231,235,1)]">Pasif Sejak</th>
                            <th className="px-4 py-2 text-right sticky top-0 z-10 bg-slate-50 shadow-[0_1px_0_rgba(229,231,235,1)]">Aksi</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-sm">
                          {polyPages.map((poly, idx) => {
                            const isSelected = selectedPolyCode === poly.code;
                            return (
                              <tr 
                                key={poly.code} 
                                onClick={() => setSelectedPolyCode(isSelected ? null : poly.code)}
                                className={`transition-all border-b border-gray-100 cursor-pointer select-none ${
                                  isSelected 
                                    ? 'bg-yasmin-green/10 hover:bg-yasmin-green/15' 
                                    : 'hover:bg-slate-50/70'
                                }`}
                              >
                                <td className="px-4 py-2 text-center font-mono text-xs text-gray-450 font-bold">{polyStart + idx + 1}</td>
                                <td className="px-4 py-2 font-mono font-bold text-yasmin-green">{poly.code}</td>
                                <td className="px-4 py-2 font-semibold text-gray-800">{poly.name}</td>
                                <td className="px-4 py-2">
                                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                                    poly.status === 'Aktif' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                                  }`}>
                                    {poly.status}
                                  </span>
                                </td>
                                <td className="px-4 py-2 text-xs font-mono text-gray-600">{poly.activeSinceDate || '-'}</td>
                                <td className="px-4 py-2 text-xs font-mono text-gray-600">{poly.inactiveSinceDate || '-'}</td>
                                <td className="px-4 py-2 text-right space-x-2" onClick={(e) => e.stopPropagation()}>
                                  <button 
                                    onClick={() => handleOpenEditPoly(poly)}
                                    className="p-1 hover:bg-gray-100 text-indigo-600 rounded-lg transition-colors cursor-pointer"
                                    title="Edit"
                                  >
                                    <Edit2 className="h-3.5 w-3.5" />
                                  </button>
                                  <button 
                                    onClick={() => handleDeletePoly(poly.code)}
                                    className="p-1 hover:bg-gray-100 text-rose-600 rounded-lg transition-colors cursor-pointer"
                                    title="Hapus"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    {renderPagination(polyTotalPages, polyStart, polyEnd, polyTotal)}
                  </>
                );
              })()}
            </div>
          )}

          {/* 3. DATA SPESIALIS */}
          {activeMenu === 'DATA_SPESIALIS' && (
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="relative max-w-md w-full">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input 
                    type="text" 
                    placeholder="Cari spesialisasi..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-yasmin-green focus:border-transparent"
                  />
                </div>
                <button 
                  onClick={handleOpenAddSpecialist}
                  className="px-4 py-2 bg-yasmin-green hover:bg-deep-teal text-white rounded-xl text-sm font-bold flex items-center justify-center space-x-2 transition-all cursor-pointer shrink-0"
                >
                  <Plus className="h-4.5 w-4.5" />
                  <span>Tambah Spesialis</span>
                </button>
              </div>

              {(() => {
                const { paginatedItems: specPages, totalPages: specTotalPages, startIdx: specStart, endIdx: specEnd, totalItems: specTotal } = paginate(sortedSpecialists);
                return (
                  <>
                    <div className="overflow-x-auto max-h-[550px] overflow-y-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50 border-b border-gray-200 text-xs font-bold text-gray-500 uppercase tracking-wider select-none">
                            <th className="px-4 py-2 text-center w-12 sticky top-0 z-10 bg-slate-50 shadow-[0_1px_0_rgba(229,231,235,1)]">No.</th>
                            <th 
                              onClick={() => handleSpecialistSort('code')}
                              className="px-4 py-2 cursor-pointer hover:bg-slate-100 transition-colors sticky top-0 z-10 bg-slate-50 shadow-[0_1px_0_rgba(229,231,235,1)]"
                            >
                              <div className="flex items-center space-x-1">
                                <span>Kode Spesialis</span>
                                <span className="text-[10px] text-gray-400">{specialistSort.field === 'code' ? (specialistSort.direction === 'asc' ? '▲' : '▼') : '↕'}</span>
                              </div>
                            </th>
                            <th 
                              onClick={() => handleSpecialistSort('name')}
                              className="px-4 py-2 cursor-pointer hover:bg-slate-100 transition-colors sticky top-0 z-10 bg-slate-50 shadow-[0_1px_0_rgba(229,231,235,1)]"
                            >
                              <div className="flex items-center space-x-1">
                                <span>Nama Spesialisasi</span>
                                <span className="text-[10px] text-gray-400">{specialistSort.field === 'name' ? (specialistSort.direction === 'asc' ? '▲' : '▼') : '↕'}</span>
                              </div>
                            </th>
                            <th className="px-4 py-2 sticky top-0 z-10 bg-slate-50 shadow-[0_1px_0_rgba(229,231,235,1)]">Keterangan / Fokus</th>
                            <th className="px-4 py-2 text-right sticky top-0 z-10 bg-slate-50 shadow-[0_1px_0_rgba(229,231,235,1)]">Aksi</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-sm">
                          {specPages.map((spec, idx) => {
                            const isSelected = selectedSpecialistCode === spec.code;
                            return (
                              <tr 
                                key={spec.code} 
                                onClick={() => setSelectedSpecialistCode(isSelected ? null : spec.code)}
                                className={`transition-all border-b border-gray-100 cursor-pointer select-none ${
                                  isSelected 
                                    ? 'bg-yasmin-green/10 hover:bg-yasmin-green/15' 
                                    : 'hover:bg-slate-50/70'
                                }`}
                              >
                                <td className="px-4 py-2 text-center font-mono text-xs text-gray-450 font-bold">{specStart + idx + 1}</td>
                                <td className="px-4 py-2 font-mono font-bold text-yasmin-green">{spec.code}</td>
                                <td className="px-4 py-2 font-semibold text-gray-800">{spec.name}</td>
                                <td className="px-4 py-2 text-gray-500">{spec.description}</td>
                                <td className="px-4 py-2 text-right space-x-2" onClick={(e) => e.stopPropagation()}>
                                  <button 
                                    onClick={() => handleOpenEditSpecialist(spec)}
                                    className="p-1 hover:bg-gray-100 text-indigo-600 rounded-lg transition-colors cursor-pointer"
                                    title="Edit"
                                  >
                                    <Edit2 className="h-3.5 w-3.5" />
                                  </button>
                                  <button 
                                    onClick={() => handleDeleteSpecialist(spec.code)}
                                    className="p-1 hover:bg-gray-100 text-rose-600 rounded-lg transition-colors cursor-pointer"
                                    title="Hapus"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    {renderPagination(specTotalPages, specStart, specEnd, specTotal)}
                  </>
                );
              })()}
            </div>
          )}

          {/* 4. DATA DOKTER */}
          {activeMenu === 'DATA_DOKTER' && (
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="relative max-w-md w-full">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input 
                    type="text" 
                    placeholder="Cari dokter atau keahlian..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-yasmin-green focus:border-transparent"
                  />
                </div>
                <div className="flex flex-wrap gap-2 shrink-0">
                  <button 
                    onClick={handleOpenAddDoctor}
                    className="px-4 py-2 bg-yasmin-green hover:bg-deep-teal text-white rounded-xl text-sm font-bold flex items-center justify-center space-x-2 transition-all cursor-pointer shrink-0"
                  >
                    <Plus className="h-4.5 w-4.5" />
                    <span>Tambah Dokter Baru</span>
                  </button>
                  {onSyncSystemDoctors && (
                    <button 
                      onClick={onSyncSystemDoctors}
                      title="Sinkronisasi seluruh data foto & sistem terbaru tanpa menghapus dokter kustom"
                      className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-sm font-bold flex items-center justify-center space-x-2 transition-all cursor-pointer shrink-0 shadow-xs hover:shadow-sm"
                    >
                      <RefreshCw className="h-4 w-4" />
                      <span>Sinkronisasi Foto & Sistem</span>
                    </button>
                  )}
                  {onResetSystemDoctors && (
                    <button 
                      onClick={onResetSystemDoctors}
                      title="Mengatur ulang seluruh daftar dokter kembali ke database bawaan sistem"
                      className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-bold flex items-center justify-center space-x-2 transition-all cursor-pointer shrink-0 shadow-xs hover:shadow-sm"
                    >
                      <RotateCcw className="h-4 w-4" />
                      <span>Reset Bawaan</span>
                    </button>
                  )}
                </div>
              </div>

              {(() => {
                const { paginatedItems: docPages, totalPages: docTotalPages, startIdx: docStart, endIdx: docEnd, totalItems: docTotal } = paginate(sortedDoctors);
                return (
                  <>
                    <div className="overflow-x-auto max-h-[550px] overflow-y-auto">
                      <table className="w-full text-left border-collapse min-w-[1600px]">
                        <thead>
                          <tr className="bg-slate-50 border-b border-gray-200 text-xs font-bold text-gray-500 uppercase tracking-wider select-none">
                            <th className="px-4 py-2 text-center w-12 sticky top-0 z-10 bg-slate-50 shadow-[0_1px_0_rgba(229,231,235,1)]">No.</th>
                            <th className="px-4 py-2 sticky top-0 z-10 bg-slate-50 shadow-[0_1px_0_rgba(229,231,235,1)]">Foto</th>
                            <th 
                              onClick={() => handleDoctorSort('name')}
                              className="px-4 py-2 cursor-pointer hover:bg-slate-100 transition-colors sticky top-0 z-10 bg-slate-50 shadow-[0_1px_0_rgba(229,231,235,1)] min-w-[350px]"
                            >
                              <div className="flex items-center space-x-1">
                                <span>Nama Lengkap</span>
                                <span className="text-[10px] text-gray-400">{doctorSort.field === 'name' ? (doctorSort.direction === 'asc' ? '▲' : '▼') : '↕'}</span>
                              </div>
                            </th>
                            <th 
                              onClick={() => handleDoctorSort('specialty')}
                              className="px-4 py-2 cursor-pointer hover:bg-slate-100 transition-colors sticky top-0 z-10 bg-slate-50 shadow-[0_1px_0_rgba(229,231,235,1)]"
                            >
                              <div className="flex items-center space-x-1">
                                <span>Kategori Spesialis</span>
                                <span className="text-[10px] text-gray-400">{doctorSort.field === 'specialty' ? (doctorSort.direction === 'asc' ? '▲' : '▼') : '↕'}</span>
                              </div>
                            </th>
                            <th 
                              onClick={() => handleDoctorSort('subSpecialty')}
                              className="px-4 py-2 cursor-pointer hover:bg-slate-100 transition-colors sticky top-0 z-10 bg-slate-50 shadow-[0_1px_0_rgba(229,231,235,1)]"
                            >
                              <div className="flex items-center space-x-1">
                                <span>Polyclinic</span>
                                <span className="text-[10px] text-gray-400">{doctorSort.field === 'subSpecialty' ? (doctorSort.direction === 'asc' ? '▲' : '▼') : '↕'}</span>
                              </div>
                            </th>
                            <th className="px-4 py-2 sticky top-0 z-10 bg-slate-50 shadow-[0_1px_0_rgba(229,231,235,1)]">Jenis Kelamin</th>
                            <th className="px-4 py-2 sticky top-0 z-10 bg-slate-50 shadow-[0_1px_0_rgba(229,231,235,1)]">Spesialis (Kustom)</th>
                            <th 
                              onClick={() => handleDoctorSort('rating')}
                              className="px-4 py-2 cursor-pointer hover:bg-slate-100 transition-colors sticky top-0 z-10 bg-slate-50 shadow-[0_1px_0_rgba(229,231,235,1)]"
                            >
                              <div className="flex items-center space-x-1">
                                <span>Rating & Pengalaman</span>
                                <span className="text-[10px] text-gray-400">{doctorSort.field === 'rating' ? (doctorSort.direction === 'asc' ? '▲' : '▼') : '↕'}</span>
                              </div>
                            </th>
                            <th className="px-4 py-2 sticky top-0 z-10 bg-slate-50 shadow-[0_1px_0_rgba(229,231,235,1)]">Melayani BPJS</th>
                            <th className="px-4 py-2 sticky top-0 z-10 bg-slate-50 shadow-[0_1px_0_rgba(229,231,235,1)]">Hari Praktek</th>
                            <th className="px-4 py-2 sticky top-0 z-10 bg-slate-50 shadow-[0_1px_0_rgba(229,231,235,1)]">Jam Praktek</th>
                            <th className="px-4 py-2 sticky top-0 z-10 bg-slate-50 shadow-[0_1px_0_rgba(229,231,235,1)]">Info Kelulusan & Izin SIP</th>
                            <th className="px-4 py-2 sticky top-0 z-10 bg-slate-50 shadow-[0_1px_0_rgba(229,231,235,1)]">Pendidikan Terakhir</th>
                            <th className="px-4 py-2 sticky top-0 z-10 bg-slate-50 shadow-[0_1px_0_rgba(229,231,235,1)]">Bio Singkat</th>
                            <th className="px-4 py-2 sticky top-0 z-10 bg-slate-50 shadow-[0_1px_0_rgba(229,231,235,1)]">Join Date</th>
                            <th 
                              onClick={() => handleDoctorSort('status')}
                              className="px-4 py-2 cursor-pointer hover:bg-slate-100 transition-colors sticky top-0 z-10 bg-slate-50 shadow-[0_1px_0_rgba(229,231,235,1)]"
                            >
                              <div className="flex items-center space-x-1">
                                <span>Status</span>
                                <span className="text-[10px] text-gray-400">{doctorSort.field === 'status' ? (doctorSort.direction === 'asc' ? '▲' : '▼') : '↕'}</span>
                              </div>
                            </th>
                            <th className="px-4 py-2 text-right sticky top-0 z-10 bg-slate-50 shadow-[0_1px_0_rgba(229,231,235,1)]">Aksi</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-sm">
                          {docPages.map((doc, idx) => {
                            const isSelected = selectedDoctorId === doc.id;
                            return (
                              <tr 
                                key={doc.id} 
                                onClick={() => setSelectedDoctorId(isSelected ? null : doc.id)}
                                className={`transition-all border-b border-gray-100 cursor-pointer select-none ${
                                  isSelected 
                                    ? 'bg-yasmin-green/10 hover:bg-yasmin-green/15' 
                                    : 'hover:bg-slate-50/70'
                                }`}
                              >
                                <td className="px-4 py-2 text-center font-mono text-xs text-gray-450 font-bold">{docStart + idx + 1}</td>
                                <td className="px-4 py-1.5" onClick={(e) => {
                                  e.stopPropagation();
                                  if (doc.image) setPreviewImage({ src: doc.image, title: doc.name });
                                }}>
                                  <div className="h-9 w-9 rounded-full overflow-hidden bg-white flex items-center justify-center p-0.5 border-2 border-gray-200 shadow-xs hover:scale-110 transition-all cursor-zoom-in">
                                    <SafeImage 
                                      src={doc.image} 
                                      alt={doc.name} 
                                      className="h-full w-full object-contain"
                                    />
                                  </div>
                                </td>
                                <td className="px-4 py-2 min-w-[350px]">
                                  <div className="font-semibold text-gray-800 text-xs">{doc.name}</div>
                                  <div className="text-[10px] text-gray-400 font-mono mt-0.5">{doc.id.toUpperCase()}</div>
                                </td>
                                <td className="px-4 py-2 text-xs">
                                  <span className="font-semibold text-teal-800 bg-teal-50 px-2 py-0.5 rounded-full">
                                    {doc.specialty}
                                  </span>
                                </td>
                                <td className="px-4 py-2 font-semibold text-gray-700 text-xs">{doc.subSpecialty || '-'}</td>
                                <td className="px-4 py-2 text-xs">
                                  <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                    doc.gender === 'Perempuan'
                                      ? 'bg-rose-50 text-rose-600 border-rose-200'
                                      : 'bg-sky-50 text-sky-600 border-sky-200'
                                  }`}>
                                    {doc.gender || 'Laki-laki'}
                                  </span>
                                </td>
                                <td className="px-4 py-2 font-medium text-gray-600 text-xs">{doc.speciali || '-'}</td>
                                <td className="px-4 py-2 text-xs">
                                  <div className="text-gray-800 font-semibold">★ {doc.rating.toFixed(2)}</div>
                                  <div className="text-[10px] text-gray-400">{doc.experience} Tahun Pengalaman</div>
                                </td>
                                <td className="px-4 py-2">
                                  <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                    doc.bpjs 
                                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                                      : 'bg-rose-50 text-rose-700 border-rose-200'
                                  }`}>
                                    {doc.bpjs ? 'Melayani BPJS' : 'Non-BPJS'}
                                  </span>
                                </td>
                                <td className="px-4 py-2 text-xs text-gray-700">
                                  <div className="flex flex-wrap gap-1 max-w-[150px]">
                                    {doc.schedule?.days?.map(day => (
                                      <span key={day} className="bg-slate-100 text-slate-800 text-[10px] font-semibold px-1.5 py-0.5 rounded-md">
                                        {day}
                                      </span>
                                    )) || '-'}
                                  </div>
                                </td>
                                <td className="px-4 py-2 text-xs font-mono font-medium text-gray-600">
                                  {doc.schedule?.hours || '-'}
                                </td>
                                <td className="px-4 py-2 text-xs text-gray-600">
                                  <div className="space-y-1">
                                    <div>
                                      <span className="font-semibold text-[10px] text-gray-500 block">DOKTER UMUM</span>
                                      {doc.gradGradDate ? `Lulus: ${doc.gradGradDate}` : '-'}
                                      {doc.licenseNumber && <span className="block font-mono text-[9px] text-teal-800 bg-teal-50/70 px-1 py-0.5 rounded mt-0.5 w-max">SIP: {doc.licenseNumber}</span>}
                                    </div>
                                    {(doc.specGradDate || doc.specLicenseNumber) && (
                                      <div className="border-t border-gray-100 pt-1 mt-1">
                                        <span className="font-semibold text-[10px] text-gray-500 block">SPESIALIS</span>
                                        {doc.specGradDate ? `Lulus: ${doc.specGradDate}` : '-'}
                                        {doc.specLicenseNumber && <span className="block font-mono text-[9px] text-indigo-800 bg-indigo-50/70 px-1 py-0.5 rounded mt-0.5 w-max">SIP: {doc.specLicenseNumber}</span>}
                                      </div>
                                    )}
                                  </div>
                                </td>
                                <td className="px-4 py-2 text-xs">
                                  <span className="text-xs text-gray-700 font-semibold max-w-[150px] truncate block" title={doc.education}>
                                    {doc.education || '-'}
                                  </span>
                                </td>
                                <td className="px-4 py-2 text-xs">
                                  <span className="text-xs text-gray-500 italic max-w-[150px] truncate block" title={doc.bio}>
                                    {doc.bio || '-'}
                                  </span>
                                </td>
                                <td className="px-4 py-2 text-xs font-mono font-bold text-gray-600">{doc.joinDate || '-'}</td>
                                <td className="px-4 py-2 text-xs">
                                  <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                    doc.status === 'Libur' 
                                      ? 'bg-amber-100 text-amber-800 border-amber-200' 
                                      : doc.status === 'Cuti'
                                        ? 'bg-indigo-100 text-indigo-800 border-indigo-200'
                                        : doc.status === 'Ijin'
                                          ? 'bg-purple-100 text-purple-800 border-purple-200'
                                          : doc.status === 'Berhenti' 
                                            ? 'bg-rose-100 text-rose-800 border-rose-200' 
                                            : 'bg-emerald-100 text-emerald-800 border-emerald-200'
                                  }`}>
                                    {doc.status || 'Aktif'}
                                  </span>
                                  {(doc.status === 'Libur' || doc.status === 'Cuti' || doc.status === 'Ijin') && doc.leaveFromDate && (
                                    <span className="block text-[9px] font-semibold text-amber-800 mt-1 font-mono leading-tight bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100">
                                      {doc.leaveFromDate} s/d {doc.leaveToDate || '?'}
                                    </span>
                                  )}
                                </td>
                                <td className="px-4 py-2 text-right space-x-2" onClick={(e) => e.stopPropagation()}>
                                  <button 
                                    onClick={() => handleOpenEditDoctor(doc)}
                                    className="p-1 hover:bg-gray-100 text-indigo-600 rounded-lg transition-colors cursor-pointer"
                                    title="Edit"
                                  >
                                    <Edit2 className="h-3.5 w-3.5" />
                                  </button>
                                  <button 
                                    onClick={() => handleDeleteDoctor(doc.id)}
                                    className="p-1 hover:bg-gray-100 text-rose-600 rounded-lg transition-colors cursor-pointer"
                                    title="Hapus"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    {renderPagination(docTotalPages, docStart, docEnd, docTotal)}
                  </>
                );
              })()}
            </div>
          )}

          {/* 5. DATA PRAKTEK DOKTER */}
          {activeMenu === 'DATA_PRAKTEK' && (
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="relative max-w-md w-full">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input 
                    type="text" 
                    placeholder="Cari dokter..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-yasmin-green focus:border-transparent"
                  />
                </div>
              </div>

              {(() => {
                const { paginatedItems: prakPages, totalPages: prakTotalPages, startIdx: prakStart, endIdx: prakEnd, totalItems: prakTotal } = paginate(sortedSchedules);
                return (
                  <>
                    <div className="overflow-x-auto max-h-[550px] overflow-y-auto">
                      <table className="w-full text-left border-collapse min-w-[1000px]">
                        <thead>
                          <tr className="bg-slate-50 border-b border-gray-200 text-xs font-bold text-gray-500 uppercase tracking-wider select-none">
                            <th className="px-4 py-2 text-center w-12 sticky top-0 z-10 bg-slate-50 shadow-[0_1px_0_rgba(229,231,235,1)]">No.</th>
                            <th 
                              onClick={() => handlePraktekSort('name')}
                              className="px-4 py-2 cursor-pointer hover:bg-slate-100 transition-colors sticky top-0 z-10 bg-slate-50 shadow-[0_1px_0_rgba(229,231,235,1)] min-w-[350px]"
                            >
                              <div className="flex items-center space-x-1">
                                <span>Dokter</span>
                                <span className="text-[10px] text-gray-400">{praktekSort.field === 'name' ? (praktekSort.direction === 'asc' ? '▲' : '▼') : '↕'}</span>
                              </div>
                            </th>
                            <th 
                              onClick={() => handlePraktekSort('subSpecialty')}
                              className="px-4 py-2 cursor-pointer hover:bg-slate-100 transition-colors sticky top-0 z-10 bg-slate-50 shadow-[0_1px_0_rgba(229,231,235,1)]"
                            >
                              <div className="flex items-center space-x-1">
                                <span>Poli / Spesialis</span>
                                <span className="text-[10px] text-gray-400">{praktekSort.field === 'subSpecialty' ? (praktekSort.direction === 'asc' ? '▲' : '▼') : '↕'}</span>
                              </div>
                            </th>
                            <th className="px-4 py-2 sticky top-0 z-10 bg-slate-50 shadow-[0_1px_0_rgba(229,231,235,1)]">Hari Praktek</th>
                            <th className="px-4 py-2 sticky top-0 z-10 bg-slate-50 shadow-[0_1px_0_rgba(229,231,235,1)]">Jam Pelayanan</th>
                            <th className="px-4 py-2 text-center font-bold text-xs sticky top-0 z-10 bg-slate-50 shadow-[0_1px_0_rgba(229,231,235,1)]">Quota</th>
                            <th className="px-4 py-2 text-center font-bold text-xs sticky top-0 z-10 bg-slate-50 shadow-[0_1px_0_rgba(229,231,235,1)]">Terpakai</th>
                            <th className="px-4 py-2 text-center font-bold text-xs sticky top-0 z-10 bg-slate-50 shadow-[0_1px_0_rgba(229,231,235,1)]">Sisa</th>
                            <th 
                              onClick={() => handlePraktekSort('status')}
                              className="px-4 py-2 cursor-pointer hover:bg-slate-100 transition-colors sticky top-0 z-10 bg-slate-50 shadow-[0_1px_0_rgba(229,231,235,1)]"
                            >
                              <div className="flex items-center space-x-1">
                                <span>Status Praktek</span>
                                <span className="text-[10px] text-gray-400">{praktekSort.field === 'status' ? (praktekSort.direction === 'asc' ? '▲' : '▼') : '↕'}</span>
                              </div>
                            </th>
                            <th className="px-4 py-2 text-right font-bold text-xs sticky top-0 z-10 bg-slate-50 shadow-[0_1px_0_rgba(229,231,235,1)]">Aksi</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-sm">
                          {prakPages.map((doc, idx) => {
                            const isSelected = selectedDoctorId === doc.id;
                            const quotaVal = doc.schedule && doc.schedule.quota !== undefined ? doc.schedule.quota : 30;
                            const terpakaiVal = bookings.filter((b: any) => b.selectedDoctorId === doc.id).length;
                            const sisaVal = quotaVal - terpakaiVal;
                            return (
                              <tr 
                                key={`praktek-${doc.id}`} 
                                onClick={() => setSelectedDoctorId(isSelected ? null : doc.id)}
                                className={`transition-all border-b border-gray-100 cursor-pointer select-none ${
                                  isSelected 
                                    ? 'bg-yasmin-green/10 hover:bg-yasmin-green/15' 
                                    : 'hover:bg-slate-50/70'
                                }`}
                              >
                                <td className="px-4 py-2 text-center font-mono text-xs text-gray-450 font-bold">{prakStart + idx + 1}</td>
                                <td className="px-4 py-2 min-w-[350px]">
                                  <div className="font-semibold text-gray-800 text-xs">{doc.name}</div>
                                </td>
                                <td className="px-4 py-2">
                                  <span className="text-xs bg-slate-100 text-slate-800 font-bold px-2 py-0.5 rounded-full">
                                    {doc.subSpecialty || doc.specialty}
                                  </span>
                                </td>
                                <td className="px-4 py-2">
                                  <div className="flex flex-wrap gap-1">
                                    {doc.schedule.days.map((day, dIdx) => (
                                      <span key={dIdx} className="bg-teal-50 text-teal-800 text-[10px] font-bold px-1.5 py-0.5 rounded">
                                        {day}
                                      </span>
                                    ))}
                                  </div>
                                </td>
                                <td className="px-4 py-2 font-mono text-xs font-semibold text-gray-700">
                                  {doc.schedule.hours}
                                </td>
                                <td className="px-4 py-2 text-center">
                                  <span className="font-mono text-xs font-bold text-gray-700 bg-gray-100 px-2.5 py-1 rounded-lg">
                                    {quotaVal}
                                  </span>
                                </td>
                                <td className="px-4 py-2 text-center">
                                  <span className="font-mono text-xs font-bold text-teal-700 bg-teal-50 px-2.5 py-1 rounded-lg">
                                    {terpakaiVal}
                                  </span>
                                </td>
                                <td className="px-4 py-2 text-center">
                                  <span className={`font-mono text-xs font-bold px-2.5 py-1 rounded-lg ${sisaVal > 5 ? 'text-emerald-700 bg-emerald-50' : 'text-rose-700 bg-rose-50'}`}>
                                    {sisaVal}
                                  </span>
                                </td>
                                <td className="px-4 py-2">
                                  <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                    doc.status === 'Libur' 
                                      ? 'bg-amber-100 text-amber-800 border-amber-200' 
                                      : doc.status === 'Cuti'
                                        ? 'bg-indigo-100 text-indigo-800 border-indigo-200'
                                        : doc.status === 'Ijin'
                                          ? 'bg-purple-100 text-purple-800 border-purple-200'
                                          : doc.status === 'Berhenti' 
                                            ? 'bg-rose-100 text-rose-800 border-rose-200' 
                                            : 'bg-emerald-100 text-emerald-800 border-emerald-200'
                                  }`}>
                                    {doc.status || 'Aktif'}
                                  </span>
                                  {(doc.status === 'Libur' || doc.status === 'Cuti' || doc.status === 'Ijin') && doc.leaveFromDate && (
                                    <span className="block text-[9px] font-semibold text-amber-800 mt-1 font-mono leading-tight bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100">
                                      {doc.leaveFromDate} s/d {doc.leaveToDate || '?'}
                                    </span>
                                  )}
                                </td>
                                <td className="px-4 py-2 text-right" onClick={(e) => e.stopPropagation()}>
                                  <button 
                                    onClick={() => handleOpenEditDoctor(doc)}
                                    className="px-2.5 py-1 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-xl text-xs font-bold tracking-wide transition-all cursor-pointer"
                                  >
                                    Edit Jadwal
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    {renderPagination(prakTotalPages, prakStart, prakEnd, prakTotal)}
                  </>
                );
              })()}
            </div>
          )}

          {/* 5. MASTER SOSIAL MEDIA */}
          {activeMenu === 'SOSIAL_MEDIA' && (
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="relative max-w-md w-full">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input 
                    type="text" 
                    placeholder="Cari sosial media..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-yasmin-green focus:border-transparent"
                  />
                </div>
                <button 
                  onClick={handleOpenAddSocial}
                  className="px-4 py-2 bg-yasmin-green hover:bg-deep-teal text-white rounded-xl text-sm font-bold flex items-center justify-center space-x-2 transition-all cursor-pointer shrink-0"
                >
                  <Plus className="h-4.5 w-4.5" />
                  <span>Tambah Sosial Media</span>
                </button>
              </div>

              {(() => {
                const filteredSoc = socialMediaLinks.filter(s => 
                  s.platform.toLowerCase().includes(searchTerm.toLowerCase()) || 
                  s.url.toLowerCase().includes(searchTerm.toLowerCase())
                );
                const { paginatedItems: socPages, totalPages: socTotalPages, startIdx: socStart, endIdx: socEnd, totalItems: socTotal } = paginate<SocialMedia>(filteredSoc);
                return (
                  <>
                    <div className="overflow-x-auto max-h-[550px] overflow-y-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50 border-b border-gray-200 text-xs font-bold text-gray-500 uppercase tracking-wider select-none">
                            <th className="px-4 py-2 text-center w-12 sticky top-0 z-10 bg-slate-50 shadow-[0_1px_0_rgba(229,231,235,1)]">No.</th>
                            <th className="px-4 py-2 sticky top-0 z-10 bg-slate-50 shadow-[0_1px_0_rgba(229,231,235,1)]">Platform</th>
                            <th className="px-4 py-2 sticky top-0 z-10 bg-slate-50 shadow-[0_1px_0_rgba(229,231,235,1)]">URL Link</th>
                            <th className="px-4 py-2 text-right sticky top-0 z-10 bg-slate-50 shadow-[0_1px_0_rgba(229,231,235,1)]">Aksi</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-sm">
                          {socPages.map((soc, idx) => {
                            const isSelected = selectedSocialId === soc.id;
                            return (
                              <tr 
                                key={soc.id} 
                                onClick={() => setSelectedSocialId(isSelected ? null : soc.id)}
                                className={`transition-all border-b border-gray-100 cursor-pointer select-none ${
                                  isSelected 
                                    ? 'bg-yasmin-green/10 hover:bg-yasmin-green/15' 
                                    : 'hover:bg-slate-50/70'
                                }`}
                              >
                                <td className="px-4 py-2 text-center font-mono text-xs text-gray-450 font-bold">{socStart + idx + 1}</td>
                                <td className="px-4 py-2">
                                  <div className="flex items-center space-x-2.5">
                                    <span className="p-1.5 bg-slate-100 rounded-lg text-yasmin-green">
                                      <Globe className="h-4 w-4" />
                                    </span>
                                    <span className="font-semibold text-gray-800 text-xs">{soc.platform}</span>
                                  </div>
                                </td>
                                <td className="px-4 py-2 font-mono text-xs text-indigo-600 hover:underline" onClick={(e) => e.stopPropagation()}>
                                  <a href={soc.url} target="_blank" rel="noopener noreferrer" className="flex items-center space-x-1">
                                    <span>{soc.url}</span>
                                    <Link className="h-3 w-3" />
                                  </a>
                                </td>
                                <td className="px-4 py-2 text-right space-x-2" onClick={(e) => e.stopPropagation()}>
                                  <button 
                                    onClick={() => handleOpenEditSocial(soc)}
                                    className="p-1 hover:bg-gray-100 text-indigo-600 rounded-lg transition-colors cursor-pointer"
                                    title="Edit"
                                  >
                                    <Edit2 className="h-3.5 w-3.5" />
                                  </button>
                                  <button 
                                    onClick={() => handleDeleteSocial(soc.id)}
                                    className="p-1 hover:bg-gray-100 text-rose-600 rounded-lg transition-colors cursor-pointer"
                                    title="Hapus"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                          {filteredSoc.length === 0 && (
                            <tr>
                              <td colSpan={4} className="px-4 py-8 text-center text-gray-400 text-xs">
                                Belum ada data sosial media. Klik "Tambah" untuk menambahkan.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                    {renderPagination(socTotalPages, socStart, socEnd, socTotal)}
                  </>
                );
              })()}
            </div>
          )}

          {/* 6. MASTER PENGUMUMAN BERITA */}
          {activeMenu === 'BERITA' && (
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-amber-50/40">
                <div>
                  <h5 className="font-display font-bold text-gray-800 text-sm flex items-center space-x-2">
                    <Megaphone className="h-4 w-4 text-amber-500" />
                    <span>Master Pengumuman Berita (Popup Slider)</span>
                  </h5>
                  <p className="text-[11px] text-gray-500 mt-1 max-w-xl leading-relaxed">
                    Setiap file pengumuman/gambar yang diupload di sini akan muncul otomatis sebagai popup selamat datang (welcoming slideshow modal) ketika pengunjung pertama kali membuka beranda rumah sakit.
                  </p>
                </div>
                <button 
                  onClick={handleOpenAddAnnouncement}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-sm font-bold flex items-center justify-center space-x-2 transition-all cursor-pointer shrink-0"
                >
                  <Plus className="h-4.5 w-4.5" />
                  <span>Tambah Pengumuman</span>
                </button>
              </div>

              {(() => {
                const { paginatedItems: annPages, totalPages: annTotalPages, startIdx: annStart, endIdx: annEnd, totalItems: annTotal } = paginate<Announcement>(announcements);
                return (
                  <>
                    <div className="overflow-x-auto max-h-[550px] overflow-y-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50 border-b border-gray-200 text-xs font-bold text-gray-500 uppercase tracking-wider select-none">
                            <th className="px-4 py-2 text-center w-12 sticky top-0 z-10 bg-slate-50 shadow-[0_1px_0_rgba(229,231,235,1)]">No.</th>
                            <th className="px-4 py-2 sticky top-0 z-10 bg-slate-50 shadow-[0_1px_0_rgba(229,231,235,1)]">Banner / Gambar</th>
                            <th className="px-4 py-2 sticky top-0 z-10 bg-slate-50 shadow-[0_1px_0_rgba(229,231,235,1)]">Judul Pengumuman</th>
                            <th className="px-4 py-2 sticky top-0 z-10 bg-slate-50 shadow-[0_1px_0_rgba(229,231,235,1)]">Mulai Tampil</th>
                            <th className="px-4 py-2 sticky top-0 z-10 bg-slate-50 shadow-[0_1px_0_rgba(229,231,235,1)]">Sampai Tampil</th>
                            <th className="px-4 py-2 sticky top-0 z-10 bg-slate-50 shadow-[0_1px_0_rgba(229,231,235,1)]">Status Tampil</th>
                            <th className="px-4 py-2 text-right sticky top-0 z-10 bg-slate-50 shadow-[0_1px_0_rgba(229,231,235,1)]">Aksi</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-sm">
                          {annPages.map((ann, idx) => {
                            const isSelected = selectedAnnouncementId === ann.id;
                            return (
                              <tr 
                                key={ann.id} 
                                onClick={() => setSelectedAnnouncementId(isSelected ? null : ann.id)}
                                className={`transition-all border-b border-gray-100 cursor-pointer select-none ${
                                  isSelected 
                                    ? 'bg-yasmin-green/10 hover:bg-yasmin-green/15' 
                                    : 'hover:bg-slate-50/70'
                                }`}
                              >
                                <td className="px-4 py-2 text-center font-mono text-xs text-gray-450 font-bold">{annStart + idx + 1}</td>
                                <td className="px-4 py-1.5" onClick={(e) => {
                                  e.stopPropagation();
                                  if (ann.image) setPreviewImage({ src: ann.image, title: ann.title || "Pengumuman" });
                                }}>
                                  <div className="h-10 w-20 rounded-lg overflow-hidden border border-gray-200 bg-slate-100 flex items-center justify-center cursor-zoom-in hover:scale-105 transition-all" title="Klik untuk memperbesar gambar">
                                    {ann.image ? (
                                      <SafeImage 
                                        src={ann.image} 
                                        alt={ann.title || "Announcement"} 
                                        className="h-full w-full object-cover"
                                      />
                                    ) : (
                                      <span className="text-[9px] text-gray-400">No Image</span>
                                    )}
                                  </div>
                                </td>
                                <td className="px-4 py-2 font-semibold text-gray-800 text-xs">
                                  {ann.title || <span className="text-gray-400 italic font-normal">Tanpa Judul</span>}
                                </td>
                                <td className="px-4 py-2 font-mono text-xs text-gray-600">
                                  {ann.activeDate || '-'}
                                </td>
                                <td className="px-4 py-2 font-mono text-xs text-gray-600">
                                  {ann.closeDate || '-'}
                                </td>
                                <td className="px-4 py-2" onClick={(e) => e.stopPropagation()}>
                                  <button
                                    onClick={() => {
                                      const updated = announcements.map(a => a.id === ann.id ? { ...a, isActive: !a.isActive } : a);
                                      setAnnouncements(updated);
                                    }}
                                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold border transition-colors cursor-pointer ${
                                      ann.isActive 
                                        ? 'bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-200' 
                                        : 'bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-200'
                                    }`}
                                  >
                                    {ann.isActive ? 'Aktif (Tampil)' : 'Nonaktif'}
                                  </button>
                                </td>
                                <td className="px-4 py-2 text-right text-xs space-x-2" onClick={(e) => e.stopPropagation()}>
                                  <button 
                                    onClick={() => handleOpenEditAnnouncement(ann)}
                                    className="p-1 hover:bg-gray-100 text-indigo-600 rounded-lg transition-colors cursor-pointer inline-flex"
                                    title="Edit"
                                  >
                                    <Edit2 className="h-3.5 w-3.5" />
                                  </button>
                                  <button 
                                    onClick={() => handleDeleteAnnouncement(ann.id)}
                                    className="p-1 hover:bg-gray-100 text-rose-600 rounded-lg transition-colors cursor-pointer inline-flex"
                                    title="Hapus"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                          {announcements.length === 0 && (
                            <tr>
                              <td colSpan={7} className="px-4 py-8 text-center text-gray-400 text-xs">
                                Belum ada pengumuman Berita yang diupload. Klik "Tambah" untuk mengupload.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                    {renderPagination(annTotalPages, annStart, annEnd, annTotal)}
                  </>
                );
              })()}
            </div>
          )}

          {/* 7. MASTER KAMAR RAWAT INAP */}
          {activeMenu === 'KAMAR_RAWAT_INAP' && (
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-teal-50/40">
                <div className="flex items-center space-x-3">
                  <div className="p-2.5 bg-teal-100 text-teal-700 rounded-xl">
                    <Bed className="h-5 w-5 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-gray-800 text-base">Master Kamar Rawat Inap</h3>
                    <p className="text-xs text-gray-500 mt-0.5">Kelola data kamar dan kelasnya, jumlah bed, terpakai, dan sisa secara langsung.</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleOpenAddRoom('Rawat Inap')}
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-2 transition-all cursor-pointer shadow-sm shrink-0 animate-fade-in"
                >
                  <Plus className="h-4.5 w-4.5" />
                  <span>Tambah Kamar Rawat Inap</span>
                </button>
              </div>

              {/* Frame Group */}
              <div className="p-6 border-b border-gray-100 bg-slate-50/40">
                <div 
                  onClick={() => setIsRawatInapGroupOpen(!isRawatInapGroupOpen)}
                  className="flex items-center justify-between border border-teal-100 bg-white p-4 rounded-xl shadow-xs cursor-pointer hover:bg-teal-50/20 transition-all select-none"
                >
                  <div className="flex items-center space-x-3">
                    <div className="p-1.5 bg-teal-100 text-teal-700 rounded-lg">
                      <Bed className="h-4 w-4" />
                    </div>
                    <div>
                      <span className="font-display font-extrabold text-sm text-gray-800">Frame Group: Daftar Kamar Rawat Inap</span>
                      <span className="ml-3 text-[10px] bg-teal-100 text-teal-800 px-2 py-0.5 rounded-full font-mono font-bold">
                        {rooms.filter(r => r.type === 'Rawat Inap').length} Kamar Terdaftar
                      </span>
                    </div>
                  </div>
                  <button type="button" className="text-gray-400 hover:text-gray-600 transition-colors">
                    {isRawatInapGroupOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                  </button>
                </div>

                {isRawatInapGroupOpen && (
                  <div className="mt-4 border border-gray-100 bg-white rounded-xl shadow-sm overflow-hidden animate-fade-in">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50 border-b border-gray-200 text-xs font-bold text-gray-500 uppercase tracking-wider select-none">
                            <th className="px-4 py-3 text-center w-12 bg-slate-50 shadow-[0_1px_0_rgba(229,231,235,1)]">No.</th>
                            <th className="px-4 py-3 bg-slate-50 shadow-[0_1px_0_rgba(229,231,235,1)]">Kelas Kamar</th>
                            <th className="px-4 py-3 bg-slate-50 shadow-[0_1px_0_rgba(229,231,235,1)]">Nama Kamar</th>
                            <th className="px-4 py-3 text-center bg-slate-50 shadow-[0_1px_0_rgba(229,231,235,1)]">Jumlah Bed</th>
                            <th className="px-4 py-3 text-center bg-slate-50 shadow-[0_1px_0_rgba(229,231,235,1)]">Terpakai</th>
                            <th className="px-4 py-3 text-center bg-slate-50 shadow-[0_1px_0_rgba(229,231,235,1)]">Sisa Bed</th>
                            <th className="px-4 py-3 bg-slate-50 shadow-[0_1px_0_rgba(229,231,235,1)]">Fasilitas</th>
                            <th className="px-4 py-3 text-right bg-slate-50 shadow-[0_1px_0_rgba(229,231,235,1)]">Aksi</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-xs">
                          {rooms.filter(r => r.type === 'Rawat Inap').map((room, idx) => {
                            const isSelected = selectedRoomId === room.id;
                            const sisa = room.capacity - room.occupied;
                            return (
                              <tr
                                key={room.id}
                                onClick={() => setSelectedRoomId(isSelected ? null : room.id)}
                                className={`transition-all border-b border-gray-100 cursor-pointer select-none ${
                                  isSelected 
                                    ? 'bg-yasmin-green/10 hover:bg-yasmin-green/15 border-l-4 border-l-teal-600' 
                                    : 'hover:bg-slate-50/70'
                                }`}
                              >
                                <td className="px-4 py-3 text-center font-mono text-xs font-bold text-gray-400">{idx + 1}</td>
                                <td className="px-4 py-3 font-semibold text-gray-800">{room.class}</td>
                                <td className="px-4 py-3 text-gray-600 font-medium">{room.name}</td>
                                <td className="px-4 py-3 text-center font-bold text-gray-750 font-mono">{room.capacity}</td>
                                <td className="px-4 py-3 text-center font-bold text-rose-600 font-mono">{room.occupied}</td>
                                <td className={`px-4 py-3 text-center font-extrabold font-mono ${sisa > 0 ? 'text-emerald-600' : 'text-red-600 animate-pulse'}`}>{sisa}</td>
                                <td className="px-4 py-3 text-gray-500 max-w-xs truncate" title={room.facilities}>{room.facilities || <span className="text-gray-300 italic">Tidak ada fasilitas</span>}</td>
                                <td className="px-4 py-3 text-right space-x-2" onClick={(e) => e.stopPropagation()}>
                                  <button
                                    type="button"
                                    onClick={() => handleOpenEditFacilities(room)}
                                    className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg text-[10px] font-bold border border-amber-200 transition-colors inline-flex items-center space-x-1 cursor-pointer"
                                    title="Edit Fasilitas"
                                  >
                                    <Edit2 className="h-3 w-3" />
                                    <span>Fasilitas</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleOpenEditRoom(room)}
                                    className="p-1 hover:bg-gray-100 text-indigo-600 rounded-lg transition-colors cursor-pointer inline-flex"
                                    title="Edit"
                                  >
                                    <Edit2 className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteRoom(room.id)}
                                    className="p-1 hover:bg-gray-100 text-rose-600 rounded-lg transition-colors cursor-pointer inline-flex"
                                    title="Hapus"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                          {rooms.filter(r => r.type === 'Rawat Inap').length === 0 && (
                            <tr>
                              <td colSpan={8} className="px-4 py-8 text-center text-gray-400 text-xs">
                                Belum ada data kamar Rawat Inap. Klik "Tambah Kamar" untuk menambahkan.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 8. MASTER KAMAR ICU */}
          {activeMenu === 'KAMAR_ICU' && (
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-indigo-50/40">
                <div className="flex items-center space-x-3">
                  <div className="p-2.5 bg-indigo-100 text-indigo-700 rounded-xl">
                    <Bed className="h-5 w-5 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-gray-800 text-base">Master Kamar ICU</h3>
                    <p className="text-xs text-gray-500 mt-0.5">Kelola data kamar ICU, kapasitas bed, terpakai, dan sisa secara langsung.</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleOpenAddRoom('ICU')}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-2 transition-all cursor-pointer shadow-sm shrink-0"
                >
                  <Plus className="h-4.5 w-4.5" />
                  <span>Tambah Kamar ICU</span>
                </button>
              </div>

              {/* Frame Group */}
              <div className="p-6 border-b border-gray-100 bg-slate-50/40">
                <div 
                  onClick={() => setIsIcuGroupOpen(!isIcuGroupOpen)}
                  className="flex items-center justify-between border border-indigo-100 bg-white p-4 rounded-xl shadow-xs cursor-pointer hover:bg-indigo-50/20 transition-all select-none"
                >
                  <div className="flex items-center space-x-3">
                    <div className="p-1.5 bg-indigo-100 text-indigo-700 rounded-lg">
                      <Bed className="h-4 w-4" />
                    </div>
                    <div>
                      <span className="font-display font-extrabold text-sm text-gray-800">Frame Group: Daftar Kamar ICU</span>
                      <span className="ml-3 text-[10px] bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full font-mono font-bold">
                        {rooms.filter(r => r.type === 'ICU').length} Kamar Terdaftar
                      </span>
                    </div>
                  </div>
                  <button type="button" className="text-gray-400 hover:text-gray-600 transition-colors">
                    {isIcuGroupOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                  </button>
                </div>

                {isIcuGroupOpen && (
                  <div className="mt-4 border border-gray-100 bg-white rounded-xl shadow-sm overflow-hidden animate-fade-in">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50 border-b border-gray-200 text-xs font-bold text-gray-500 uppercase tracking-wider select-none">
                            <th className="px-4 py-3 text-center w-12 bg-slate-50 shadow-[0_1px_0_rgba(229,231,235,1)]">No.</th>
                            <th className="px-4 py-3 bg-slate-50 shadow-[0_1px_0_rgba(229,231,235,1)]">Kelas / Unit ICU</th>
                            <th className="px-4 py-3 bg-slate-50 shadow-[0_1px_0_rgba(229,231,235,1)]">Nama Kamar</th>
                            <th className="px-4 py-3 text-center bg-slate-50 shadow-[0_1px_0_rgba(229,231,235,1)]">Jumlah Bed</th>
                            <th className="px-4 py-3 text-center bg-slate-50 shadow-[0_1px_0_rgba(229,231,235,1)]">Terpakai</th>
                            <th className="px-4 py-3 text-center bg-slate-50 shadow-[0_1px_0_rgba(229,231,235,1)]">Sisa Bed</th>
                            <th className="px-4 py-3 bg-slate-50 shadow-[0_1px_0_rgba(229,231,235,1)]">Fasilitas</th>
                            <th className="px-4 py-3 text-right bg-slate-50 shadow-[0_1px_0_rgba(229,231,235,1)]">Aksi</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-xs">
                          {rooms.filter(r => r.type === 'ICU').map((room, idx) => {
                            const isSelected = selectedRoomId === room.id;
                            const sisa = room.capacity - room.occupied;
                            return (
                              <tr
                                key={room.id}
                                onClick={() => setSelectedRoomId(isSelected ? null : room.id)}
                                className={`transition-all border-b border-gray-100 cursor-pointer select-none ${
                                  isSelected 
                                    ? 'bg-yasmin-green/10 hover:bg-yasmin-green/15 border-l-4 border-l-indigo-600' 
                                    : 'hover:bg-slate-50/70'
                                }`}
                              >
                                <td className="px-4 py-3 text-center font-mono text-xs font-bold text-gray-400">{idx + 1}</td>
                                <td className="px-4 py-3 font-semibold text-gray-800">{room.class}</td>
                                <td className="px-4 py-3 text-gray-600 font-medium">{room.name}</td>
                                <td className="px-4 py-3 text-center font-bold text-gray-750 font-mono">{room.capacity}</td>
                                <td className="px-4 py-3 text-center font-bold text-rose-600 font-mono">{room.occupied}</td>
                                <td className={`px-4 py-3 text-center font-extrabold font-mono ${sisa > 0 ? 'text-emerald-600' : 'text-red-600 animate-pulse'}`}>{sisa}</td>
                                <td className="px-4 py-3 text-gray-500 max-w-xs truncate" title={room.facilities}>{room.facilities || <span className="text-gray-300 italic">Tidak ada fasilitas</span>}</td>
                                <td className="px-4 py-3 text-right space-x-2" onClick={(e) => e.stopPropagation()}>
                                  <button
                                    type="button"
                                    onClick={() => handleOpenEditFacilities(room)}
                                    className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-750 rounded-lg text-[10px] font-bold border border-amber-200 transition-colors inline-flex items-center space-x-1 cursor-pointer"
                                    title="Edit Fasilitas"
                                  >
                                    <Edit2 className="h-3 w-3" />
                                    <span>Fasilitas</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleOpenEditRoom(room)}
                                    className="p-1 hover:bg-gray-100 text-indigo-600 rounded-lg transition-colors cursor-pointer inline-flex"
                                    title="Edit"
                                  >
                                    <Edit2 className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteRoom(room.id)}
                                    className="p-1 hover:bg-gray-100 text-rose-600 rounded-lg transition-colors cursor-pointer inline-flex"
                                    title="Hapus"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                          {rooms.filter(r => r.type === 'ICU').length === 0 && (
                            <tr>
                              <td colSpan={8} className="px-4 py-8 text-center text-gray-400 text-xs">
                                Belum ada data kamar ICU. Klik "Tambah Kamar ICU" untuk menambahkan.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 9. MASTER KAMAR IGD */}
          {activeMenu === 'KAMAR_IGD' && (
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-rose-50/40">
                <div className="flex items-center space-x-3">
                  <div className="p-2.5 bg-rose-100 text-rose-700 rounded-xl">
                    <Bed className="h-5 w-5 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-gray-800 text-base">Master Kamar IGD</h3>
                    <p className="text-xs text-gray-500 mt-0.5">Kelola data bed IGD, kapasitas, terpakai, dan sisa secara langsung.</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleOpenAddRoom('IGD')}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-2 transition-all cursor-pointer shadow-sm shrink-0"
                >
                  <Plus className="h-4.5 w-4.5" />
                  <span>Tambah Kamar IGD</span>
                </button>
              </div>

              {/* Frame Group */}
              <div className="p-6 border-b border-gray-100 bg-slate-50/40">
                <div 
                  onClick={() => setIsIgdGroupOpen(!isIgdGroupOpen)}
                  className="flex items-center justify-between border border-rose-100 bg-white p-4 rounded-xl shadow-xs cursor-pointer hover:bg-rose-50/20 transition-all select-none"
                >
                  <div className="flex items-center space-x-3">
                    <div className="p-1.5 bg-rose-100 text-rose-700 rounded-lg">
                      <Bed className="h-4 w-4" />
                    </div>
                    <div>
                      <span className="font-display font-extrabold text-sm text-gray-800">Frame Group: Daftar Kamar IGD</span>
                      <span className="ml-3 text-[10px] bg-rose-100 text-rose-800 px-2 py-0.5 rounded-full font-mono font-bold">
                        {rooms.filter(r => r.type === 'IGD').length} Kamar Terdaftar
                      </span>
                    </div>
                  </div>
                  <button type="button" className="text-gray-400 hover:text-gray-600 transition-colors">
                    {isIgdGroupOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                  </button>
                </div>

                {isIgdGroupOpen && (
                  <div className="mt-4 border border-gray-100 bg-white rounded-xl shadow-sm overflow-hidden animate-fade-in">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50 border-b border-gray-200 text-xs font-bold text-gray-500 uppercase tracking-wider select-none">
                            <th className="px-4 py-3 text-center w-12 bg-slate-50 shadow-[0_1px_0_rgba(229,231,235,1)]">No.</th>
                            <th className="px-4 py-3 bg-slate-50 shadow-[0_1px_0_rgba(229,231,235,1)]">Kelas / Area IGD</th>
                            <th className="px-4 py-3 bg-slate-50 shadow-[0_1px_0_rgba(229,231,235,1)]">Nama Kamar / Bed</th>
                            <th className="px-4 py-3 text-center bg-slate-50 shadow-[0_1px_0_rgba(229,231,235,1)]">Jumlah Bed</th>
                            <th className="px-4 py-3 text-center bg-slate-50 shadow-[0_1px_0_rgba(229,231,235,1)]">Terpakai</th>
                            <th className="px-4 py-3 text-center bg-slate-50 shadow-[0_1px_0_rgba(229,231,235,1)]">Sisa Bed</th>
                            <th className="px-4 py-3 bg-slate-50 shadow-[0_1px_0_rgba(229,231,235,1)]">Fasilitas</th>
                            <th className="px-4 py-3 text-right bg-slate-50 shadow-[0_1px_0_rgba(229,231,235,1)]">Aksi</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-xs">
                          {rooms.filter(r => r.type === 'IGD').map((room, idx) => {
                            const isSelected = selectedRoomId === room.id;
                            const sisa = room.capacity - room.occupied;
                            return (
                              <tr
                                key={room.id}
                                onClick={() => setSelectedRoomId(isSelected ? null : room.id)}
                                className={`transition-all border-b border-gray-100 cursor-pointer select-none ${
                                  isSelected 
                                    ? 'bg-yasmin-green/10 hover:bg-yasmin-green/15 border-l-4 border-l-rose-600' 
                                    : 'hover:bg-slate-50/70'
                                }`}
                              >
                                <td className="px-4 py-3 text-center font-mono text-xs font-bold text-gray-400">{idx + 1}</td>
                                <td className="px-4 py-3 font-semibold text-gray-800">{room.class}</td>
                                <td className="px-4 py-3 text-gray-600 font-medium">{room.name}</td>
                                <td className="px-4 py-3 text-center font-bold text-gray-750 font-mono">{room.capacity}</td>
                                <td className="px-4 py-3 text-center font-bold text-rose-600 font-mono">{room.occupied}</td>
                                <td className={`px-4 py-3 text-center font-extrabold font-mono ${sisa > 0 ? 'text-emerald-600' : 'text-red-600 animate-pulse'}`}>{sisa}</td>
                                <td className="px-4 py-3 text-gray-500 max-w-xs truncate" title={room.facilities}>{room.facilities || <span className="text-gray-300 italic">Tidak ada fasilitas</span>}</td>
                                <td className="px-4 py-3 text-right space-x-2" onClick={(e) => e.stopPropagation()}>
                                  <button
                                    type="button"
                                    onClick={() => handleOpenEditFacilities(room)}
                                    className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-750 rounded-lg text-[10px] font-bold border border-amber-200 transition-colors inline-flex items-center space-x-1 cursor-pointer"
                                    title="Edit Fasilitas"
                                  >
                                    <Edit2 className="h-3 w-3" />
                                    <span>Fasilitas</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleOpenEditRoom(room)}
                                    className="p-1 hover:bg-gray-100 text-indigo-600 rounded-lg transition-colors cursor-pointer inline-flex"
                                    title="Edit"
                                  >
                                    <Edit2 className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteRoom(room.id)}
                                    className="p-1 hover:bg-gray-100 text-rose-600 rounded-lg transition-colors cursor-pointer inline-flex"
                                    title="Hapus"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                          {rooms.filter(r => r.type === 'IGD').length === 0 && (
                            <tr>
                              <td colSpan={8} className="px-4 py-8 text-center text-gray-400 text-xs">
                                Belum ada data kamar IGD. Klik "Tambah Kamar IGD" untuk menambahkan.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* KPI DASHBOARDS */}
          {activeMenu.startsWith('KPI_') && (
            <KpiDashboard menu={activeMenu} />
          )}

          </div>

          {/* ADMIN FOOTER */}
          <footer className="bg-headings text-warm-ivory border-t-4 border-yasmin-green p-8 mt-auto print:bg-headings print:text-warm-ivory print:border-t-4 print:border-yasmin-green">
            <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
              {/* Brand, Logo & Motto */}
              <div className="flex items-center space-x-4">
                <SafeImage 
                  src={rsInfo.logo || logoRsYasmin} 
                  fallbackSrc={logoRsYasmin}
                  alt="RS Yasmin" 
                  className="h-12 w-12 object-contain bg-white rounded-full p-1 border border-teal-850 shrink-0" 
                />
                <div>
                  <h4 className="font-display font-bold text-sm text-warm-orange tracking-wide uppercase">
                    {rsInfo.name || "RS YASMIN"}
                  </h4>
                  <p className="text-xs text-warm-mint/80 max-w-md mt-0.5 italic">
                    "Membangun Family Wellness Ecosystem terintegrasi yang nyaman, profesional, dan humanis."
                  </p>
                </div>
              </div>
              {/* Kontak */}
              <div className="text-xs text-warm-mint/70 space-y-1.5 md:text-right">
                <p className="font-semibold text-warm-ivory">{rsInfo.address || INITIAL_RS_INFO.address}</p>
                <p>
                  Telp: <span className="font-mono">{rsInfo.phone || INITIAL_RS_INFO.phone}</span> | WhatsApp: <span className="font-mono">{rsInfo.whatsapp || INITIAL_RS_INFO.whatsapp}</span>
                </p>
                <p>Email: <span>{rsInfo.email || INITIAL_RS_INFO.email}</span></p>
              </div>
            </div>
            {/* Copyright */}
            <div className="max-w-5xl mx-auto mt-6 pt-4 border-t border-warm-mint/10 flex flex-col md:flex-row items-center justify-between text-[11px] text-warm-mint/50">
              <p>© {new Date().getFullYear()} {rsInfo.name || "RS Yasmin"}. Hak Cipta Dilindungi.</p>
              <p className="bg-warm-ivory/5 px-2.5 py-1 rounded border border-warm-ivory/10 font-mono">
                {rsInfo.accreditation || INITIAL_RS_INFO.accreditation}
              </p>
            </div>
          </footer>

        </div>

      </main>

      {/* PRINT IFRAME WARNING MODAL */}
      {showPrintWarning && (
        <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl overflow-hidden w-full max-w-lg p-6 sm:p-8 space-y-6 text-left border border-divider">
            <div className="flex items-start space-x-4">
              <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 text-amber-600 shrink-0">
                <Printer className="h-6 w-6" />
              </div>
              <div className="space-y-2">
                <h3 className="font-display font-bold text-lg text-gray-900 leading-tight">
                  Fitur Cetak PDF Terblokir oleh Browser (Aturan Iframe)
                </h3>
                <p className="text-sm text-gray-500 leading-relaxed">
                  Browser Anda memblokir pemanggilan dialog cetak (<code className="font-mono bg-gray-100 px-1 py-0.5 rounded text-rose-600">window.print()</code>) karena aplikasi ini sedang berjalan di dalam <strong>Bingkai Pratinjau (Iframe)</strong> pengembang AI Studio demi alasan keamanan.
                </p>
              </div>
            </div>

            <div className="bg-slate-50 border border-divider rounded-2xl p-4 sm:p-5 space-y-3">
              <h4 className="font-sans font-bold text-xs text-teal-800 uppercase tracking-wider">
                Cara Mencetak / Menyimpan PDF dengan Lancar:
              </h4>
              <ul className="text-xs text-gray-700 space-y-2.5 list-none pl-0">
                <li className="flex items-start">
                  <span className="flex items-center justify-center h-5 w-5 rounded-full bg-teal-100 text-teal-800 font-bold text-[10px] shrink-0 mr-2.5 mt-0.5">1</span>
                  <span>Klik tombol <strong>"Open in New Tab" / "Buka di Tab Baru"</strong> di pojok kanan atas layar panel kerja AI Studio Anda.</span>
                </li>
                <li className="flex items-start">
                  <span className="flex items-center justify-center h-5 w-5 rounded-full bg-teal-100 text-teal-800 font-bold text-[10px] shrink-0 mr-2.5 mt-0.5">2</span>
                  <span>Masuk kembali ke <strong>Dashboard Admin</strong> di tab baru tersebut.</span>
                </li>
                <li className="flex items-start">
                  <span className="flex items-center justify-center h-5 w-5 rounded-full bg-teal-100 text-teal-800 font-bold text-[10px] shrink-0 mr-2.5 mt-0.5">3</span>
                  <span>Klik tombol <strong>Cetak PDF</strong>. Dialog print bawaan browser Anda akan langsung terbuka secara normal dan rapi (WYSIWYG)!</span>
                </li>
              </ul>
            </div>

            <div className="flex flex-col sm:flex-row items-center sm:justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowPrintWarning(false);
                  try {
                    window.print();
                  } catch (e) {
                    alert("Cetak gagal dipicu.");
                  }
                }}
                className="w-full sm:w-auto px-4 py-2.5 border border-gray-300 hover:border-gray-400 text-gray-700 hover:bg-gray-50 rounded-xl text-xs font-semibold tracking-wide transition-all cursor-pointer"
              >
                Tetap Paksa Cetak (Force)
              </button>
              <button
                type="button"
                onClick={() => setShowPrintWarning(false)}
                className="w-full sm:w-auto px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold tracking-wide transition-all shadow-md active:scale-95 cursor-pointer"
              >
                Tutup & Buka Tab Baru
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CRUD POPUP DIALOG / MODAL FOR MASTER DATA */}
      {isModalOpen && (
        <div id="admin-modal" className="fixed inset-0 z-55 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className={`bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col transition-all duration-300 ${
            (activeMenu === 'DATA_DOKTER' || activeMenu === 'DATA_PRAKTEK')
              ? 'w-[95%] sm:w-[90%] md:w-[85%] lg:w-[75%] xl:w-[65%] h-[92vh] max-h-[96vh] max-w-5xl'
              : 'w-full max-w-2xl max-h-[90vh]'
          }`}>
            
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-slate-50">
              <h4 className="font-display font-black text-gray-800 text-base">
                {modalType === 'ADD' ? 'Tambah Data Master Baru' : 'Ubah Data Master'}
              </h4>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-1 hover:bg-gray-200 rounded-full transition-colors cursor-pointer text-gray-500"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              
              {/* DOCTOR DIALOG */}
              {(activeMenu === 'DATA_DOKTER' || activeMenu === 'DATA_PRAKTEK') && (
                <form onSubmit={handleSaveDoctor} className="space-y-4 text-left">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    
                    {/* PHOTO PREVIEW AND UPLOAD BUTTON */}
                    <div className="col-span-1 md:col-span-2 flex flex-col items-center p-4 bg-slate-50 rounded-2xl border-2 border-dashed border-gray-200 space-y-3">
                      <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Foto Profil Dokter</span>
                      
                      {/* Photo preview field */}
                      <div className="h-28 w-28 rounded-full overflow-hidden border-4 border-white shadow-md relative group bg-white flex items-center justify-center p-1">
                        {currentDoctor.image ? (
                          <SafeImage 
                            src={currentDoctor.image} 
                            alt="Doctor preview" 
                            className="h-full w-full object-contain"
                          />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center text-gray-400">
                            <ImageIcon className="h-8 w-8" />
                          </div>
                        )}
                      </div>

                      {/* Upload file photo button */}
                      <div>
                        <input 
                          type="file" 
                          ref={fileInputRef}
                          onChange={handleImageUpload}
                          accept="image/*"
                          className="hidden"
                        />
                        <button 
                          type="button"
                          onClick={triggerFileInput}
                          className="px-4 py-2 bg-white border border-gray-300 hover:border-yasmin-green hover:text-yasmin-green text-gray-750 font-semibold rounded-xl text-xs transition-all flex items-center space-x-2 shadow-xs cursor-pointer"
                        >
                          <Upload className="h-3.5 w-3.5" />
                          <span>Pilih & Upload Foto Dokter</span>
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Kode Dokter</label>
                      <input 
                        type="text" 
                        disabled={modalType === 'EDIT'}
                        value={currentDoctor.id}
                        onChange={(e) => setCurrentDoctor({ ...currentDoctor, id: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-yasmin-green disabled:bg-gray-100 font-mono"
                        placeholder="doc-xxx"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Nama Lengkap Dokter</label>
                      <input 
                        type="text" 
                        value={currentDoctor.name}
                        onChange={(e) => setCurrentDoctor({ ...currentDoctor, name: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-yasmin-green"
                        placeholder="dr. Contoh Dokter, SpA"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider font-mono">Kategori Spesialis</label>
                      <select 
                        value={currentDoctor.specialty}
                        onChange={(e) => setCurrentDoctor({ ...currentDoctor, specialty: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-yasmin-green font-bold text-gray-700 bg-white"
                      >
                        <option value="Kesehatan Keluarga">Kesehatan Keluarga</option>
                        <option value="Spesialis Medis">Spesialis Medis</option>
                        <option value="Bedah & Pemulihan">Bedah & Pemulihan</option>
                        <option value="Gigi & Mulut">Gigi & Mulut</option>
                        <option value="Kesehatan Mental">Kesehatan Mental</option>
                        <option value="Penunjang Diagnostik">Penunjang Diagnostik</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider font-mono">Poliklinik (Poli)</label>
                      <select 
                        value={currentDoctor.subSpecialty || ''}
                        onChange={(e) => setCurrentDoctor({ ...currentDoctor, subSpecialty: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-yasmin-green font-semibold text-gray-750 bg-white"
                      >
                        <option value="">-- Pilih Poliklinik --</option>
                        {polyclinics.map((poly) => (
                          <option key={poly.code} value={poly.name}>
                            {poly.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider font-mono">Jenis Kelamin</label>
                      <select 
                        value={currentDoctor.gender || 'Laki-laki'}
                        onChange={(e) => setCurrentDoctor({ ...currentDoctor, gender: e.target.value as 'Laki-laki' | 'Perempuan' })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-yasmin-green font-semibold text-gray-750 bg-white"
                      >
                        <option value="Laki-laki">Laki-laki</option>
                        <option value="Perempuan">Perempuan</option>
                      </select>
                    </div>

                    <div className="space-y-1 col-span-1 md:col-span-2">
                      <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider font-mono">Spesialis (Speciali)</label>
                      <select 
                        value={currentDoctor.speciali || ''}
                        onChange={(e) => setCurrentDoctor({ ...currentDoctor, speciali: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-yasmin-green font-semibold text-gray-750 bg-white"
                      >
                        <option value="">-- Pilih Spesialis --</option>
                        {specialists.map((spec) => (
                          <option key={spec.code} value={spec.name}>
                            {spec.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider font-mono">Pengalaman (Tahun)</label>
                      <input 
                        type="number" 
                        value={currentDoctor.experience}
                        onChange={(e) => setCurrentDoctor({ ...currentDoctor, experience: Number(e.target.value) })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-yasmin-green"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider font-mono">Rating (1.0 - 5.0)</label>
                      <input 
                        type="number" 
                        step="0.01"
                        value={currentDoctor.rating}
                        onChange={(e) => setCurrentDoctor({ ...currentDoctor, rating: Number(e.target.value) })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-yasmin-green"
                      />
                    </div>

                    {/* MULTI DAY SELECTOR */}
                    <div className="col-span-1 md:col-span-2 space-y-2">
                      <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider font-mono block">Jadwal Hari Praktek (Pilih Multi Hari)</label>
                      <div className="flex flex-wrap gap-1.5 p-3 bg-gray-50 border border-gray-200 rounded-2xl">
                        {['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'].map((day) => {
                          const currentDays = currentDoctor.schedule?.days || [];
                          const isSelected = currentDays.includes(day);
                          return (
                            <button
                              key={day}
                              type="button"
                              onClick={() => {
                                const updatedDays = isSelected 
                                  ? currentDays.filter(d => d !== day) 
                                  : [...currentDays, day];
                                
                                const orderedDays = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu']
                                  .filter(d => updatedDays.includes(d));

                                setCurrentDoctor({
                                  ...currentDoctor,
                                  schedule: {
                                    days: orderedDays,
                                    hours: currentDoctor.schedule?.hours || '08:00 - 12:00'
                                  }
                                });
                              }}
                              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                                isSelected 
                                  ? 'bg-yasmin-green text-white border-yasmin-green shadow-xs scale-[1.02]' 
                                  : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'
                              }`}
                            >
                              {day}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* MULTI TIME SELECTOR */}
                    <div className="col-span-1 md:col-span-2 space-y-2">
                      <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider font-mono block">Jadwal Jam Praktek (Pilih Multi Waktu)</label>
                      {(() => {
                        const currentHoursList = currentDoctor.schedule?.hours 
                          ? currentDoctor.schedule.hours.split(',').map(h => h.trim()).filter(Boolean)
                          : [];
                        return (
                          <div className="space-y-3">
                            {currentHoursList.length > 0 ? (
                              <div className="flex flex-wrap gap-2 p-3 bg-gray-50 border border-gray-200 rounded-2xl">
                                {currentHoursList.map((hr, idx) => (
                                  <span key={idx} className="inline-flex items-center space-x-1.5 bg-indigo-50 border border-indigo-100 text-indigo-800 text-xs font-bold px-3 py-1.5 rounded-xl font-mono">
                                    <span>{hr}</span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const updated = currentHoursList.filter((_, i) => i !== idx);
                                        setCurrentDoctor({
                                          ...currentDoctor,
                                          schedule: {
                                            days: currentDoctor.schedule?.days || [],
                                            hours: updated.join(', ')
                                          }
                                        });
                                      }}
                                      className="text-indigo-400 hover:text-indigo-600 focus:outline-none cursor-pointer"
                                    >
                                      <X className="h-3.5 w-3.5" />
                                    </button>
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <div className="text-xs text-gray-450 italic p-3 bg-gray-50 border border-gray-200 rounded-2xl text-center">
                                Belum ada jam praktek yang dipilih. Silakan tambah jam di bawah.
                              </div>
                            )}

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div className="space-y-1">
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block font-mono">Pilih Jam Cepat</span>
                                <select
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    if (val && !currentHoursList.includes(val)) {
                                      const updated = [...currentHoursList, val];
                                      setCurrentDoctor({
                                        ...currentDoctor,
                                        schedule: {
                                          days: currentDoctor.schedule?.days || [],
                                          hours: updated.join(', ')
                                        }
                                      });
                                    }
                                    e.target.value = ''; // Reset select
                                  }}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-yasmin-green cursor-pointer bg-white"
                                >
                                  <option value="">-- Pilih Jam Praktek --</option>
                                  <option value="08:00 - 12:00">Pagi (08:00 - 12:00)</option>
                                  <option value="13:00 - 15:00">Siang (13:00 - 15:00)</option>
                                  <option value="16:00 - 18:00">Sore (16:00 - 18:00)</option>
                                  <option value="19:00 - 21:00">Malam (19:00 - 21:00)</option>
                                </select>
                              </div>

                              <div className="space-y-1">
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block font-mono">Tambah Jam Kustom</span>
                                <div className="flex space-x-1.5">
                                  <input
                                    type="text"
                                    id="custom-time-input"
                                    placeholder="e.g. 09:30 - 11:30"
                                    className="flex-1 px-3 py-2 border border-gray-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-yasmin-green font-mono"
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        e.preventDefault();
                                        const val = e.currentTarget.value.trim();
                                        if (val && !currentHoursList.includes(val)) {
                                          const updated = [...currentHoursList, val];
                                          setCurrentDoctor({
                                            ...currentDoctor,
                                            schedule: {
                                              days: currentDoctor.schedule?.days || [],
                                              hours: updated.join(', ')
                                            }
                                          });
                                          e.currentTarget.value = '';
                                        }
                                      }
                                    }}
                                  />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const el = document.getElementById('custom-time-input') as HTMLInputElement;
                                      const val = el?.value.trim();
                                      if (val && !currentHoursList.includes(val)) {
                                        const updated = [...currentHoursList, val];
                                        setCurrentDoctor({
                                          ...currentDoctor,
                                          schedule: {
                                            days: currentDoctor.schedule?.days || [],
                                            hours: updated.join(', ')
                                          }
                                        });
                                        if (el) el.value = '';
                                      }
                                    }}
                                    className="px-3 py-2 bg-slate-700 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition-all cursor-pointer"
                                  >
                                    Tambah
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>

                    {/* QUOTA PRAKTEK */}
                    <div className="space-y-1 col-span-1 md:col-span-2">
                      <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider font-mono block">Kuota Praktek Pasien (Default: 30)</label>
                      <input 
                        type="number" 
                        min={1}
                        value={currentDoctor.schedule?.quota !== undefined ? currentDoctor.schedule.quota : 30}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setCurrentDoctor({
                            ...currentDoctor,
                            schedule: {
                              days: currentDoctor.schedule?.days || [],
                              hours: currentDoctor.schedule?.hours || '',
                              quota: isNaN(val) ? 30 : val
                            }
                          });
                        }}
                        className="w-full px-4 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-yasmin-green"
                        placeholder="30"
                      />
                    </div>

                    {/* STATUS PRAKTEK */}
                    <div className="space-y-1 col-span-1 md:col-span-2">
                      <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider font-mono block">Status Praktek Dokter</label>
                      <select
                        value={currentDoctor.status || 'Aktif'}
                        onChange={(e) => setCurrentDoctor({ ...currentDoctor, status: e.target.value as any })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-yasmin-green font-bold text-gray-700 bg-white"
                      >
                        <option value="Aktif">Aktif</option>
                        <option value="Libur">Libur (Sakit/Lainnya)</option>
                        <option value="Cuti">Cuti</option>
                        <option value="Ijin">Ijin</option>
                        <option value="Berhenti">Berhenti</option>
                      </select>
                    </div>

                    {(currentDoctor.status === 'Libur' || currentDoctor.status === 'Cuti' || currentDoctor.status === 'Ijin') && (
                      <div className="col-span-1 md:col-span-2 grid grid-cols-2 gap-4 p-4 bg-amber-50 border border-amber-100 rounded-2xl animate-fade-in">
                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-amber-800 uppercase tracking-wider font-mono block">Mulai Tanggal (From Date)</label>
                          <input 
                            type="date" 
                            value={currentDoctor.leaveFromDate || ''}
                            onChange={(e) => setCurrentDoctor({ ...currentDoctor, leaveFromDate: e.target.value })}
                            className="w-full px-4 py-2 border border-amber-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono bg-white"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-amber-800 uppercase tracking-wider font-mono block">Sampai Tanggal (To Date)</label>
                          <input 
                            type="date" 
                            value={currentDoctor.leaveToDate || ''}
                            onChange={(e) => setCurrentDoctor({ ...currentDoctor, leaveToDate: e.target.value })}
                            className="w-full px-4 py-2 border border-amber-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono bg-white"
                          />
                        </div>
                      </div>
                    )}

                    {/* NEW FIELDS FOR CERTIFICATIONS & DATES */}
                    <div className="col-span-1 md:col-span-2 border-t border-gray-100 pt-4 mt-2">
                      <h5 className="text-xs font-bold text-teal-800 uppercase tracking-wider mb-3">Informasi Kelulusan & Izin Praktek</h5>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider font-mono block">Tanggal Lulus Kedokteran (Umum)</label>
                          <input 
                            type="date" 
                            value={currentDoctor.gradGradDate || ''}
                            onChange={(e) => setCurrentDoctor({ ...currentDoctor, gradGradDate: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-yasmin-green font-mono"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider font-mono block">No. Izin Dokter (SIP Umum)</label>
                          <input 
                            type="text" 
                            value={currentDoctor.licenseNumber || ''}
                            onChange={(e) => setCurrentDoctor({ ...currentDoctor, licenseNumber: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-yasmin-green"
                            placeholder="SIP/xxx/xxx"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider font-mono block">Tanggal Lulus Spesialis</label>
                          <input 
                            type="date" 
                            value={currentDoctor.specGradDate || ''}
                            onChange={(e) => setCurrentDoctor({ ...currentDoctor, specGradDate: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-yasmin-green font-mono"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider font-mono block">No. Izin Spesialis (SIP Spesialis)</label>
                          <input 
                            type="text" 
                            value={currentDoctor.specLicenseNumber || ''}
                            onChange={(e) => setCurrentDoctor({ ...currentDoctor, specLicenseNumber: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-yasmin-green"
                            placeholder="SIPS/xxx/xxx"
                          />
                        </div>
                        <div className="space-y-1 col-span-1 md:col-span-2">
                          <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider font-mono block">Join Date (Tanggal Bergabung)</label>
                          <input 
                            type="date" 
                            value={currentDoctor.joinDate || ''}
                            onChange={(e) => setCurrentDoctor({ ...currentDoctor, joinDate: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-yasmin-green font-mono"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1 col-span-1 md:col-span-2">
                      <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Pendidikan Terakhir</label>
                      <input 
                        type="text" 
                        value={currentDoctor.education}
                        onChange={(e) => setCurrentDoctor({ ...currentDoctor, education: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-yasmin-green"
                        placeholder="Alumni Universitas Contoh"
                      />
                    </div>

                    <div className="space-y-1 col-span-1 md:col-span-2">
                      <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Bio Singkat</label>
                      <textarea 
                        rows={3}
                        value={currentDoctor.bio}
                        onChange={(e) => setCurrentDoctor({ ...currentDoctor, bio: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-yasmin-green"
                        placeholder="Deskripsi singkat mengenai profil keahlian dokter..."
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="flex items-center space-x-2 mt-2 cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={currentDoctor.bpjs}
                          onChange={(e) => setCurrentDoctor({ ...currentDoctor, bpjs: e.target.checked })}
                          className="rounded text-yasmin-green focus:ring-yasmin-green"
                        />
                        <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">Melayani Pasien BPJS</span>
                      </label>
                    </div>

                  </div>

                  <div className="pt-4 border-t border-gray-100 flex justify-end space-x-2">
                    <button 
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-xs transition-all cursor-pointer"
                    >
                      Batal
                    </button>
                    <button 
                      type="submit"
                      className="px-5 py-2 bg-yasmin-green hover:bg-deep-teal text-white font-bold rounded-xl text-xs transition-all flex items-center space-x-1 cursor-pointer shadow-sm"
                    >
                      <Check className="h-4 w-4" />
                      <span>Simpan Dokter</span>
                    </button>
                  </div>
                </form>
              )}

              {/* POLY DIALOG */}
              {activeMenu === 'DATA_POLY' && (
                <form onSubmit={handleSavePoly} className="space-y-4 text-left">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Kode Polyclinic</label>
                    <input 
                      type="text" 
                      disabled={modalType === 'EDIT'}
                      value={currentPoly.code}
                      onChange={(e) => setCurrentPoly({ ...currentPoly, code: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-yasmin-green disabled:bg-gray-100 font-mono font-bold"
                      placeholder="POLxxx"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Nama Poliklinik</label>
                    <input 
                      type="text" 
                      value={currentPoly.name}
                      onChange={(e) => setCurrentPoly({ ...currentPoly, name: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-yasmin-green"
                      placeholder="e.g. Bedah Jantung, Gigi"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider font-mono">Status Operasional</label>
                    <select 
                      value={currentPoly.status}
                      onChange={(e) => setCurrentPoly({ ...currentPoly, status: e.target.value as 'Aktif' | 'Pasif' })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-yasmin-green"
                    >
                      <option value="Aktif">Aktif</option>
                      <option value="Pasif">Pasif</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block font-mono">Aktif Sejak Tanggal</label>
                      <input 
                        type="date" 
                        value={currentPoly.activeSinceDate || ''}
                        onChange={(e) => setCurrentPoly({ ...currentPoly, activeSinceDate: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-yasmin-green font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block font-mono">Pasif Sejak Tanggal</label>
                      <input 
                        type="date" 
                        value={currentPoly.inactiveSinceDate || ''}
                        onChange={(e) => setCurrentPoly({ ...currentPoly, inactiveSinceDate: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-yasmin-green font-mono"
                      />
                    </div>
                  </div>

                  <div className="pt-4 border-t border-gray-100 flex justify-end space-x-2">
                    <button 
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-xs transition-all cursor-pointer"
                    >
                      Batal
                    </button>
                    <button 
                      type="submit"
                      className="px-5 py-2 bg-yasmin-green hover:bg-deep-teal text-white font-bold rounded-xl text-xs transition-all flex items-center space-x-1 cursor-pointer shadow-sm"
                    >
                      <Check className="h-4 w-4" />
                      <span>Simpan Poliklinik</span>
                    </button>
                  </div>
                </form>
              )}

              {/* SPECIALIST DIALOG */}
              {activeMenu === 'DATA_SPESIALIS' && (
                <form onSubmit={handleSaveSpecialist} className="space-y-4 text-left">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Kode Spesialisasi</label>
                    <input 
                      type="text" 
                      disabled={modalType === 'EDIT'}
                      value={currentSpecialist.code}
                      onChange={(e) => setCurrentSpecialist({ ...currentSpecialist, code: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-yasmin-green disabled:bg-gray-100 font-mono font-bold"
                      placeholder="SPSxxx"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Nama Spesialisasi</label>
                    <input 
                      type="text" 
                      value={currentSpecialist.name}
                      onChange={(e) => setCurrentSpecialist({ ...currentSpecialist, name: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-yasmin-green"
                      placeholder="Spesialis ..."
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider font-mono">Fokus / Deskripsi</label>
                    <textarea 
                      rows={3}
                      value={currentSpecialist.description}
                      onChange={(e) => setCurrentSpecialist({ ...currentSpecialist, description: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-yasmin-green"
                      placeholder="Fokus penanganan spesialisasi ini..."
                    />
                  </div>

                  <div className="pt-4 border-t border-gray-100 flex justify-end space-x-2">
                    <button 
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-xs transition-all cursor-pointer"
                    >
                      Batal
                    </button>
                    <button 
                      type="submit"
                      className="px-5 py-2 bg-yasmin-green hover:bg-deep-teal text-white font-bold rounded-xl text-xs transition-all flex items-center space-x-1 cursor-pointer shadow-sm"
                    >
                      <Check className="h-4 w-4" />
                      <span>Simpan Spesialis</span>
                    </button>
                  </div>
                </form>
              )}

              {/* SOSIAL_MEDIA DIALOG */}
              {activeMenu === 'SOSIAL_MEDIA' && (
                <form onSubmit={handleSaveSocial} className="space-y-4 text-left">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Platform Sosial Media</label>
                    <select 
                      value={currentSocial.platform || ''}
                      onChange={(e) => setCurrentSocial({ ...currentSocial, platform: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-yasmin-green font-bold text-gray-755 bg-white"
                    >
                      <option value="">-- Pilih Platform --</option>
                      <option value="Instagram">Instagram</option>
                      <option value="Facebook">Facebook</option>
                      <option value="YouTube">YouTube</option>
                      <option value="TikTok">TikTok</option>
                      <option value="WhatsApp">WhatsApp</option>
                      <option value="Twitter">Twitter / X</option>
                      <option value="Website">Website Lainnya</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Link URL</label>
                    <input 
                      type="url" 
                      value={currentSocial.url || ''}
                      onChange={(e) => setCurrentSocial({ ...currentSocial, url: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-yasmin-green font-mono"
                      placeholder="https://example.com/username"
                      required
                    />
                  </div>

                  <div className="pt-4 border-t border-gray-100 flex justify-end space-x-2">
                    <button 
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-xs transition-all cursor-pointer"
                    >
                      Batal
                    </button>
                    <button 
                      type="submit"
                      className="px-5 py-2 bg-yasmin-green hover:bg-deep-teal text-white font-bold rounded-xl text-xs transition-all flex items-center space-x-1 cursor-pointer shadow-sm"
                    >
                      <Check className="h-4 w-4" />
                      <span>Simpan Sosial Media</span>
                    </button>
                  </div>
                </form>
              )}

              {/* BERITA DIALOG */}
              {activeMenu === 'BERITA' && (
                <form onSubmit={handleSaveAnnouncement} className="space-y-4 text-left">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Judul Pengumuman</label>
                    <input 
                      type="text" 
                      value={currentAnnouncement.title || ''}
                      onChange={(e) => setCurrentAnnouncement({ ...currentAnnouncement, title: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-yasmin-green"
                      placeholder="Contoh: Jadwal Libur Lebaran, Promo Cek Kesehatan"
                    />
                  </div>

                  {/* Image View field & upload */}
                  <div className="flex flex-col items-center p-6 bg-slate-50 rounded-2xl border-2 border-dashed border-gray-200 space-y-3">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">File Gambar Pengumuman</span>
                    
                    <div className="h-40 w-full max-w-md rounded-xl overflow-hidden border-2 border-white shadow-sm bg-gray-100 flex items-center justify-center relative">
                      {currentAnnouncement.image ? (
                        <SafeImage 
                          src={currentAnnouncement.image} 
                          alt="Announcement preview" 
                          className="h-full w-full object-contain"
                        />
                      ) : (
                        <div className="text-center text-gray-400 space-y-1">
                          <Upload className="h-8 w-8 mx-auto stroke-1" />
                          <span className="text-[10px] block">Belum ada gambar terpilih</span>
                        </div>
                      )}
                    </div>

                    <div>
                      <input 
                        type="file" 
                        ref={announcementInputRef}
                        onChange={handleAnnouncementUpload}
                        accept="image/*"
                        className="hidden"
                      />
                      <button 
                        type="button"
                        onClick={() => announcementInputRef.current?.click()}
                        className="px-4 py-2 bg-white border border-gray-300 hover:border-amber-500 hover:text-amber-600 text-gray-700 font-bold rounded-xl text-xs transition-all flex items-center space-x-2 shadow-xs cursor-pointer"
                      >
                        <Upload className="h-3.5 w-3.5" />
                        <span>Pilih & Upload File Pengumuman</span>
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block font-mono">Mulai Tanggal Tampil</label>
                      <input 
                        type="date" 
                        value={currentAnnouncement.activeDate || ''}
                        onChange={(e) => setCurrentAnnouncement({ ...currentAnnouncement, activeDate: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-yasmin-green font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block font-mono">Sampai Tanggal Tampil</label>
                      <input 
                        type="date" 
                        value={currentAnnouncement.closeDate || ''}
                        onChange={(e) => setCurrentAnnouncement({ ...currentAnnouncement, closeDate: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-yasmin-green font-mono"
                      />
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 py-1">
                    <input 
                      type="checkbox"
                      id="ann-isactive"
                      checked={currentAnnouncement.isActive ?? true}
                      onChange={(e) => setCurrentAnnouncement({ ...currentAnnouncement, isActive: e.target.checked })}
                      className="h-4 w-4 rounded border-gray-300 text-amber-500 focus:ring-amber-500 cursor-pointer"
                    />
                    <label htmlFor="ann-isactive" className="text-xs font-semibold text-gray-750 cursor-pointer select-none">
                      Aktifkan Pengumuman (Langsung tampil di slider selamat datang)
                    </label>
                  </div>

                  <div className="pt-4 border-t border-gray-100 flex justify-end space-x-2">
                    <button 
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-xs transition-all cursor-pointer"
                    >
                      Batal
                    </button>
                    <button 
                      type="submit"
                      className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl text-xs transition-all flex items-center space-x-1 cursor-pointer shadow-sm"
                    >
                      <Check className="h-4 w-4" />
                      <span>Simpan Pengumuman</span>
                    </button>
                  </div>
                </form>
              )}

              {/* KAMAR RAWAT INAP, ICU, IGD DIALOG */}
              {(activeMenu === 'KAMAR_RAWAT_INAP' || activeMenu === 'KAMAR_ICU' || activeMenu === 'KAMAR_IGD') && (
                <form onSubmit={handleSaveRoom} className="space-y-4 text-left animate-fade-in">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Tipe Kamar</label>
                      <input 
                        type="text" 
                        value={currentRoom.type || ''} 
                        disabled
                        className="w-full px-4 py-2 border border-gray-250 bg-gray-50 rounded-xl text-sm font-bold text-gray-650 font-sans"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Kelas / Area Kamar</label>
                      <input 
                        type="text" 
                        value={currentRoom.class || ''} 
                        onChange={(e) => setCurrentRoom({ ...currentRoom, class: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-yasmin-green font-semibold"
                        placeholder="Contoh: Kelas I, VIP, ICU Utama, Area Red Zone"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Nama Kamar / No. Bed</label>
                    <input 
                      type="text" 
                      value={currentRoom.name || ''} 
                      onChange={(e) => setCurrentRoom({ ...currentRoom, name: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-yasmin-green font-semibold"
                      placeholder="Contoh: Ruang Melati Bed 1A, Bed ICU 04"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Kapasitas (Jumlah Bed)</label>
                      <input 
                        type="number" 
                        min={1}
                        value={currentRoom.capacity ?? 1} 
                        onChange={(e) => setCurrentRoom({ ...currentRoom, capacity: parseInt(e.target.value) || 1 })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-yasmin-green font-mono font-bold"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Terpakai (Jumlah Bed Terisi)</label>
                      <input 
                        type="number" 
                        min={0}
                        max={currentRoom.capacity || 1}
                        value={currentRoom.occupied ?? 0} 
                        onChange={(e) => setCurrentRoom({ ...currentRoom, occupied: Math.min(parseInt(e.target.value) || 0, currentRoom.capacity || 1) })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-yasmin-green font-mono font-bold"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Fasilitas Kamar</label>
                    <textarea 
                      value={currentRoom.facilities || ''} 
                      onChange={(e) => setCurrentRoom({ ...currentRoom, facilities: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-yasmin-green min-h-[80px]"
                      placeholder="Contoh: AC, TV, Kamar Mandi Dalam, Sofa Bed, Oksigen Central"
                    />
                  </div>

                  <div className="pt-4 border-t border-gray-100 flex justify-end space-x-2">
                    <button 
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-xs transition-all cursor-pointer"
                    >
                      Batal
                    </button>
                    <button 
                      type="submit"
                      className="px-5 py-2 bg-yasmin-green hover:bg-deep-teal text-white font-bold rounded-xl text-xs transition-all flex items-center space-x-1 cursor-pointer shadow-sm"
                    >
                      <Check className="h-4 w-4" />
                      <span>Simpan Kamar</span>
                    </button>
                  </div>
                </form>
              )}

            </div>

          </div>
        </div>
      )}

      {/* IMAGE PREVIEW LIGHTBOX */}
      {previewImage && (
        <div 
          className="fixed inset-0 z-60 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 transition-opacity duration-300"
          onClick={() => setPreviewImage(null)}
        >
          <div 
            className="relative bg-white rounded-2xl overflow-hidden max-w-4xl w-full max-h-[90vh] flex flex-col p-2 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100">
              <span className="text-xs font-bold text-gray-750">{previewImage.title}</span>
              <button 
                onClick={() => setPreviewImage(null)}
                className="p-1.5 hover:bg-gray-100 rounded-full transition-colors cursor-pointer text-gray-500"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>
            <div className="p-2 flex items-center justify-center bg-slate-50 overflow-auto max-h-[75vh]">
              <SafeImage 
                src={previewImage.src} 
                alt={previewImage.title} 
                className="max-h-[70vh] object-contain rounded-lg shadow-sm"
              />
            </div>
          </div>
        </div>
      )}

      {/* CUSTOM DELETE CONFIRMATION MODAL */}
      {deleteConfirm && deleteConfirm.isOpen && (
        <div id="delete-confirm-modal" className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl shadow-2xl p-6 max-w-md w-full border border-gray-100 text-center animate-in fade-in zoom-in-95 duration-150">
            <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-rose-100 text-rose-500">
              <Trash2 className="h-8 w-8" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2 font-display">Konfirmasi Hapus</h3>
            <p className="text-sm text-gray-500 mb-6">
              Apakah Anda yakin ingin menghapus <strong>{deleteConfirm.name}</strong>? Tindakan ini tidak dapat dibatalkan.
            </p>
            <div className="flex space-x-3">
              <button
                type="button"
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl text-sm font-semibold text-gray-750 hover:bg-gray-50 cursor-pointer transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  executeDelete(deleteConfirm.type, deleteConfirm.id);
                  setDeleteConfirm(null);
                }}
                className="flex-1 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-semibold cursor-pointer transition-colors"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
