import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Bell,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Crown,
  Disc3,
  Download,
  Edit3,
  Heart,
  Home,
  Info,
  KeyRound,
  Library,
  Lock,
  LogOut,
  ListMusic,
  Minus,
  Music2,
  Pause,
  Play,
  Plus,
  Repeat2,
  RefreshCw,
  Search,
  Settings,
  Share2,
  ShieldCheck,
  Shuffle,
  SkipBack,
  SkipForward,
  Sparkles,
  Trash2,
  Upload,
  UserPlus,
  Volume2,
  X
} from 'lucide-react';
import { supabase } from './lib/supabase';
import sakuraHeroImage from '../fondos/fondo.png';
import sakuraIcon from '../fondos/icono.png';
import sakuraLetterImage from '../fondos/letra.png';
import googleLogo from '../fondos/Logo_google.jpg';
import appIcon from '../fondos/aplicacion.png';
import animeCategoryCover from '../categoria/Anime Hits.png';
import cristianaCategoryCover from '../categoria/Cristiana.png';
import kpopCategoryCover from '../categoria/K-pop Glow.png';
import metalCategoryCover from '../categoria/Metal core.png';
import otrosCategoryCover from '../categoria/Otros.png';
import popCategoryCover from '../categoria/Pop Mundial.png';
import rockCategoryCover from '../categoria/Rock Clasico.png';

const siteUrl = import.meta.env.VITE_SITE_URL || window.location.origin;
const passwordResetRedirectUrl = siteUrl;
const fallbackAvatar = 'https://api.dicebear.com/8.x/adventurer/svg?seed=Enrique&backgroundColor=1f2937';
const brandName = 'Shigatsu no Uta';
const defaultCreatorName = 'Enrique';
const brandJapanese = '四月の歌';
const recommendedTrack = {
  title: 'Lo que merezco',
  artist: 'TentaBeat',
  cover: sakuraIcon
};
const approvalPrefix = 'approval:';
const audioCacheName = 'shigatsu-offline-audio-v1';
const volumeStep = 1;
let youtubeApiPromise = null;
const primaryChannelIds = new Set(['anime', 'metal', 'rock', 'kpop', 'pop', 'otros']);

const channels = [
  {
    id: 'anime',
    name: 'Anime Hits',
    mood: 'openings, endings y energía visual',
    accent: '#4dd7ff',
    image: animeCategoryCover,
    tracks: ['Blue Bird', 'Gurenge', 'Silhouette', 'Unravel']
  },
  {
    id: 'cristiana',
    name: 'Cristiana',
    mood: 'alabanza, adoración y fe',
    accent: '#fbbf24',
    image: cristianaCategoryCover,
    tracks: ['Alabanza', 'adoración', 'Fe', 'Esperanza']
  },
  {
    id: 'metal',
    name: 'Metal Core',
    mood: 'riffs pesados para concentrarte',
    accent: '#f97316',
    image: metalCategoryCover,
    tracks: ['Iron Pulse', 'Black Stage', 'Double Kick', 'Night Forge']
  },
  {
    id: 'rock',
    name: 'Rock Clasico',
    mood: 'guitarras, batería y carretera',
    accent: '#f43f5e',
    image: rockCategoryCover,
    tracks: ['Thunder Road', 'Garage Lights', 'Golden Amp', 'Last Solo']
  },
  {
    id: 'kpop',
    name: 'K-Pop Glow',
    mood: 'coreografias brillantes y hooks enormes',
    accent: '#a78bfa',
    image: kpopCategoryCover,
    tracks: ['Neon Love', 'Seoul Lights', 'Dance Break', 'Pink Signal']
  },
  {
    id: 'pop',
    name: 'Pop Mundial',
    mood: 'canciones fáciles de cantar',
    accent: '#3dd17a',
    image: popCategoryCover,
    tracks: ['Summer Radio', 'Heartbeat', 'City Chorus', 'Flashback']
  },
  {
    id: 'otros',
    name: 'Otros',
    mood: 'cualquier estilo fuera de la lista principal',
    accent: '#f5b82e',
    image: otrosCategoryCover,
    tracks: ['Nueva subida', 'Mi biblioteca', 'Demo track', 'BeatBox']
  }
];

const emptyTrackForm = {
  title: '',
  artist: '',
  album: '',
  genre: 'anime',
  custom_genre: '',
  cover_mode: 'url',
  cover_url: '',
  cover_file: null,
  source_mode: '',
  audio: null,
  youtube_url: '',
  metadata_source: ''
};

const emptyFolderForm = {
  name: 'Me gusta',
  is_shared: false,
  share_email: '',
  color: '#1ed760'
};

const playlistColorOptions = ['#1ed760', '#ff7db6', '#8b5cf6', '#4dd7ff', '#f97316', '#f43f5e', '#fbbf24', '#22c55e'];

const genreAliases = [
  { match: ['anime', 'j-pop', 'jpop', 'soundtrack'], genre: 'anime' },
  { match: ['cristiana', 'cristiano', 'christian', 'gospel', 'adoración', 'alabanza'], genre: 'cristiana' },
  { match: ['metal', 'hard rock'], genre: 'metal' },
  { match: ['rock', 'alternative'], genre: 'rock' },
  { match: ['k-pop', 'kpop', 'korean'], genre: 'kpop' },
  { match: ['pop', 'dance'], genre: 'pop' }
];

function getChannelByGenre(genre) {
  return channels.find((channel) => channel.id === genre) ?? channels.find((channel) => channel.id === 'otros');
}

function guessGenre(primaryGenreName = '') {
  const normalized = primaryGenreName.toLowerCase();
  return genreAliases.find((alias) => alias.match.some((word) => normalized.includes(word)))?.genre ?? 'otros';
}

function getDisplayName(user, profile) {
  return profile?.username || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Invitado';
}

function getAvatar(user, profile) {
  return profile?.avatar_url || user?.user_metadata?.avatar_url || fallbackAvatar;
}

function normalizeFolderName(name = '') {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

function getGeneratedPlaylistColor(folder) {
  const palette = playlistColorOptions;
  const hash = Math.abs(hashText(folder?.id || folder?.name || 'playlist'));
  return palette[hash % palette.length];
}

function isLikesFolderName(name = '') {
  return ['me gusta', 'tus me gusta'].includes(normalizeFolderName(name));
}

function isNetworkFetchError(error) {
  const message = String(error?.message || error || '').toLowerCase();
  return message.includes('failed to fetch') || message.includes('network') || message.includes('fetch');
}

function isYoutubeUrl(url = '') {
  return /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\//i.test(url.trim());
}

function getYoutubeVideoId(url = '') {
  const trimmedUrl = url.trim();
  const patterns = [
    /youtu\.be\/([^?&/]+)/i,
    /youtube\.com\/watch\?.*v=([^?&]+)/i,
    /youtube\.com\/embed\/([^?&/]+)/i,
    /youtube\.com\/shorts\/([^?&/]+)/i
  ];
  const match = patterns.map((pattern) => trimmedUrl.match(pattern)).find(Boolean);
  return match?.[1] || '';
}

function getYoutubeEmbedUrl(url = '') {
  const videoId = getYoutubeVideoId(url);
  if (!videoId) return '';
  const params = new URLSearchParams({
    autoplay: '0',
    controls: '0',
    enablejsapi: '1',
    modestbranding: '1',
    origin: window.location.origin,
    rel: '0',
    playsinline: '1'
  });
  return `https://www.youtube-nocookie.com/embed/${videoId}?${params.toString()}`;
}

function loadYoutubeIframeApi() {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (youtubeApiPromise) return youtubeApiPromise;

  youtubeApiPromise = new Promise((resolve) => {
    const previousReady = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previousReady?.();
      resolve(window.YT);
    };

    if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
      const script = document.createElement('script');
      script.src = 'https://www.youtube.com/iframe_api';
      document.head.appendChild(script);
    }
  });

  return youtubeApiPromise;
}

function getTrackApprovalStatus(track) {
  const source = track?.metadata_source || '';
  if (!source.startsWith(approvalPrefix)) return 'approved';
  return source.slice(approvalPrefix.length).split('|')[0] || 'approved';
}

function getTrackMetadataSource(track) {
  const source = track?.metadata_source || '';
  if (!source.startsWith(approvalPrefix)) return source || 'Manual';
  return source.slice(approvalPrefix.length).split('|').slice(1).join('|') || 'Manual';
}

function withApprovalStatus(status, source = '') {
  return `${approvalPrefix}${status}|${source || 'Manual'}`;
}

function getDateKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function getMonthKey(date = new Date()) {
  return date.toISOString().slice(0, 7);
}

function formatListenDuration(seconds = 0) {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  if (hours <= 0) return `${minutes}m`;
  return `${hours}h ${minutes}m`;
}

function isSupabasePermissionError(error) {
  const text = [error?.code, error?.status, error?.message, error?.details]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return (
    text.includes('403') ||
    text.includes('permission denied') ||
    text.includes('row-level security') ||
    text.includes('violates row-level security') ||
    text.includes('not authorized')
  );
}

function hashText(text = '') {
  return [...text].reduce((hash, character) => {
    const nextHash = ((hash << 5) - hash) + character.charCodeAt(0);
    return nextHash & nextHash;
  }, 0);
}

function createGeneratedCategoryCover(name = 'Nuevo', index = 0) {
  const cleanName = name.replace(/\s+mix$/i, '').trim() || 'Nuevo';
  const hash = Math.abs(hashText(cleanName));
  const palettes = [
    ['#2d0b48', '#ff5aa5', '#ffcf4a', '#8b5cf6'],
    ['#061a2d', '#42d9ff', '#ffd166', '#ff7ab6'],
    ['#160606', '#f97316', '#f43f5e', '#111827'],
    ['#12103a', '#f472b6', '#a78bfa', '#22d3ee'],
    ['#102315', '#3dd17a', '#f8fafc', '#f59e0b']
  ];
  const [dark, accent, glow, deep] = palettes[(hash + index) % palettes.length];
  const titleWords = `${cleanName} Mix`.toUpperCase().split(/\s+/);
  const titleLineOne = titleWords.length > 2 ? titleWords.slice(0, -1).join(' ') : cleanName.toUpperCase();
  const titleLineTwo = titleWords.length > 2 ? titleWords.at(-1) : 'MIX';
  const moonX = 170 + (hash % 680);
  const moonY = 120 + (hash % 120);
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">
      <defs>
        <radialGradient id="sky" cx="50%" cy="35%" r="78%">
          <stop offset="0%" stop-color="${accent}" stop-opacity=".55"/>
          <stop offset="46%" stop-color="${deep}"/>
          <stop offset="100%" stop-color="${dark}"/>
        </radialGradient>
        <radialGradient id="glow" cx="50%" cy="52%" r="42%">
          <stop offset="0%" stop-color="${glow}" stop-opacity=".4"/>
          <stop offset="70%" stop-color="${accent}" stop-opacity=".08"/>
          <stop offset="100%" stop-color="${accent}" stop-opacity="0"/>
        </radialGradient>
        <filter id="soft">
          <feGaussianBlur stdDeviation="7"/>
        </filter>
        <filter id="shadow">
          <feDropShadow dx="0" dy="10" stdDeviation="10" flood-color="#000" flood-opacity=".55"/>
        </filter>
      </defs>
      <rect width="1024" height="1024" fill="url(#sky)"/>
      <circle cx="${moonX}" cy="${moonY}" r="58" fill="${glow}" opacity=".95"/>
      <circle cx="${moonX - 18}" cy="${moonY - 10}" r="64" fill="#fff" opacity=".08"/>
      <circle cx="512" cy="536" r="354" fill="url(#glow)"/>
      <path d="M0 764 C150 644 260 694 370 614 C500 516 590 566 716 476 C822 402 914 412 1024 350 L1024 1024 L0 1024 Z" fill="#050507" opacity=".46"/>
      <path d="M0 830 C184 724 352 752 510 688 C648 630 790 658 1024 560 L1024 1024 L0 1024 Z" fill="#06030a" opacity=".74"/>
      <g opacity=".82">
        <path d="M0 165 C150 100 286 106 424 68" stroke="${accent}" stroke-width="12" stroke-linecap="round" opacity=".45"/>
        <path d="M1024 110 C872 102 754 118 636 58" stroke="${accent}" stroke-width="11" stroke-linecap="round" opacity=".38"/>
        ${Array.from({ length: 34 }).map((_, petalIndex) => {
          const x = (petalIndex * 89 + hash) % 1024;
          const y = (petalIndex * 53 + hash) % 780;
          const rotate = (petalIndex * 37 + hash) % 360;
          const scale = 0.65 + ((petalIndex + hash) % 6) / 10;
          return `<ellipse cx="${x}" cy="${y}" rx="${8 * scale}" ry="${18 * scale}" fill="${accent}" opacity=".72" transform="rotate(${rotate} ${x} ${y})"/>`;
        }).join('')}
      </g>
      <g transform="translate(512 530)" filter="url(#shadow)">
        <circle r="292" fill="#050505" opacity=".22"/>
        <circle r="300" fill="none" stroke="${glow}" stroke-width="8" stroke-dasharray="4 14" opacity=".95"/>
        <circle r="248" fill="none" stroke="${accent}" stroke-width="5" opacity=".82"/>
        ${Array.from({ length: 72 }).map((_, barIndex) => {
          const angle = barIndex * 5;
          const height = 18 + ((barIndex * 17 + hash) % 72);
          return `<rect x="-3" y="${-338 - height}" width="6" height="${height}" rx="3" fill="${accent}" opacity=".92" transform="rotate(${angle})"/>`;
        }).join('')}
        <path d="M-58 -98 C-32 -146 44 -150 74 -92 C110 -24 56 52 0 92 C-56 52 -110 -24 -74 -92 C-44 -150 32 -146 58 -98Z" fill="${accent}" opacity=".2"/>
        <text x="0" y="-42" text-anchor="middle" fill="#fff" font-family="Arial Black, Impact, sans-serif" font-size="${titleLineOne.length > 10 ? 86 : 108}" font-style="italic" letter-spacing="2">${titleLineOne}</text>
        <text x="0" y="80" text-anchor="middle" fill="${accent}" font-family="Arial Black, Impact, sans-serif" font-size="118" font-style="italic" letter-spacing="4">${titleLineTwo}</text>
        <text x="0" y="164" text-anchor="middle" fill="#fff" font-family="Arial, sans-serif" font-size="42" font-weight="800" letter-spacing="18">MIX</text>
      </g>
      <g opacity=".9">
        <path d="M142 874 H882" stroke="${accent}" stroke-width="2" opacity=".25"/>
        <circle cx="512" cy="874" r="18" fill="${accent}"/>
        <path d="M512 845 V903 M483 874 H541" stroke="#fff" stroke-width="6" stroke-linecap="round" opacity=".86"/>
      </g>
      <rect x="8" y="8" width="1008" height="1008" rx="88" fill="none" stroke="#fff" stroke-opacity=".08" stroke-width="8"/>
    </svg>
  `;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

export function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [creatorName, setCreatorName] = useState(defaultCreatorName);
  const [profileForm, setProfileForm] = useState({ username: '', avatar_url: '' });
  const [authForm, setAuthForm] = useState({ email: '', password: '', username: '' });
  const [authMode, setAuthMode] = useState('login');
  const [passwordRecoveryMode, setPasswordRecoveryMode] = useState(false);
  const [activeChannel, setActiveChannel] = useState(channels[0]);
  const [openedCatalog, setOpenedCatalog] = useState(null);
  const [showAllMixes, setShowAllMixes] = useState(false);
  const [activeView, setActiveView] = useState('home');
  const [query, setQuery] = useState('');
  const [tracks, setTracks] = useState([]);
  const [folders, setFolders] = useState([]);
  const [folderTracks, setFolderTracks] = useState([]);
  const [folderColorOverrides, setFolderColorOverrides] = useState({});
  const [folderForm, setFolderForm] = useState(emptyFolderForm);
  const [activeFolderId, setActiveFolderId] = useState('likes-preview');
  const [playlistSearchOpen, setPlaylistSearchOpen] = useState(false);
  const [playlistQuery, setPlaylistQuery] = useState('');
  const [playlistGenreFilter, setPlaylistGenreFilter] = useState('all');
  const [playlistSortMode, setPlaylistSortMode] = useState('custom');
  const [librarySortMode, setLibrarySortMode] = useState('recent');
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [trackForm, setTrackForm] = useState(emptyTrackForm);
  const [selectedMetadataKey, setSelectedMetadataKey] = useState('');
  const [uploadingTrack, setUploadingTrack] = useState(false);
  const [searchingMetadata, setSearchingMetadata] = useState(false);
  const [metadataResults, setMetadataResults] = useState([]);
  const [currentTrack, setCurrentTrack] = useState(null);
  const [selectedFolderId, setSelectedFolderId] = useState('');
  const [trackEditForm, setTrackEditForm] = useState({ title: '', artist: '', album: '', genre: '', custom_genre: '', cover_url: '' });
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackQueue, setPlaybackQueue] = useState([]);
  const [queueIndex, setQueueIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [lastCatalog, setLastCatalog] = useState(null);
  const [shuffleOn, setShuffleOn] = useState(false);
  const [repeatOn, setRepeatOn] = useState(false);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(() => {
    const savedVolume = Number(localStorage.getItem('shigatsu-volume'));
    return Number.isFinite(savedVolume) && savedVolume > 0 ? Math.min(Math.max(savedVolume, 0), 100) : 100;
  });
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notificationsReadAt, setNotificationsReadAt] = useState(() => Number(localStorage.getItem('notificationsReadAt') || 0));
  const [playCounts, setPlayCounts] = useState({});
  const [listeningStats, setListeningStats] = useState({ totalSeconds: 0, byDate: {}, byMonth: {}, byGenre: {}, byArtist: {}, byTrack: {} });
  const [editingProfile, setEditingProfile] = useState(false);
  const [avatarMode, setAvatarMode] = useState('url');
  const [avatarFile, setAvatarFile] = useState(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [trackInfoOpen, setTrackInfoOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [saveNotice, setSaveNotice] = useState('');
  const [offlineTrackIds, setOfflineTrackIds] = useState([]);
  const [offlineAudioUrl, setOfflineAudioUrl] = useState('');
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);
  const [networkOffline, setNetworkOffline] = useState(false);
  const appOfflineMode = !isOnline || networkOffline;
  const [tracksReady, setTracksReady] = useState(true);
  const [folderTablesReady, setFolderTablesReady] = useState(true);
  const [categoryCoversReady, setCategoryCoversReady] = useState(true);
  const [categoryCovers, setCategoryCovers] = useState({});
  const [categoryCoverForms, setCategoryCoverForms] = useState({});
  const [loading, setLoading] = useState(true);
  const menuRef = useRef(null);
  const searchInputRef = useRef(null);
  const audioRef = useRef(null);
  const youtubePlayerMountRef = useRef(null);
  const youtubePlayerRef = useRef(null);
  const youtubePlayerReadyRef = useRef(false);
  const youtubePlayerCleanupRef = useRef(null);
  const offlineAudioObjectUrlRef = useRef('');
  const audioPlayRetryRef = useRef(null);
  const user = session?.user ?? null;
  const isAdmin = profile?.role === 'admin';
  const avatarPreviewUrl = useMemo(() => avatarFile ? URL.createObjectURL(avatarFile) : '', [avatarFile]);
  const trackCoverPreviewUrl = useMemo(() => trackForm.cover_file ? URL.createObjectURL(trackForm.cover_file) : '', [trackForm.cover_file]);

  useEffect(() => {
    function isYoutubePostMessageNoise(value) {
      const text = String(value?.message || value?.reason?.message || value || '');
      return text.includes("Failed to execute 'postMessage'") && text.includes('target origin');
    }

    function handleWindowError(event) {
      if (!isYoutubePostMessageNoise(event)) return;
      event.preventDefault();
    }

    function handleUnhandledRejection(event) {
      if (!isYoutubePostMessageNoise(event)) return;
      event.preventDefault();
    }

    window.addEventListener('error', handleWindowError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    return () => {
      window.removeEventListener('error', handleWindowError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    const favicon = document.querySelector("link[rel='icon']");
    if (favicon) favicon.href = appIcon;

    document.querySelector("meta[property='og:image']")?.setAttribute('content', appIcon);
    document.querySelector("meta[name='twitter:image']")?.setAttribute('content', appIcon);

    async function loadSession() {
      // Reviso si Supabase ya tiene una sesión activa para mantener abierto el login al recargar.
      const { data } = await supabase.auth.getSession();
      if (mounted) {
        setSession(data.session);
        setLoading(false);
      }
    }

    async function loadAppSettings() {
      const { data, error } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'creator_name')
        .maybeSingle();

      if (!mounted || error || !data?.value) return;
      setCreatorName(data.value);
    }

    loadSession();
    loadAppSettings();

    // Escucho cambios de autenticacion para reaccionar cuando Google o correo inician/cerran sesión.
    const { data } = supabase.auth.onAuthStateChange((event, currentSession) => {
      if (event === 'PASSWORD_RECOVERY') {
        setPasswordRecoveryMode(true);
        setAuthMode('reset');
        setMessage('Escribe tu nueva contraseña.');
      }
      setSession(currentSession);
    });

    return () => {
      mounted = false;
      data.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      setProfileForm({ username: '', avatar_url: '' });
      setAvatarMode('url');
      setAvatarFile(null);
      setPlayCounts({});
      setFolderColorOverrides({});
      setListeningStats({ totalSeconds: 0, byDate: {}, byMonth: {}, byGenre: {}, byArtist: {}, byTrack: {} });
      return;
    }

    try {
      setOfflineTrackIds(JSON.parse(localStorage.getItem(`offlineTracks:${user.id}`) || '[]'));
    } catch {
      setOfflineTrackIds([]);
    }

    loadProfile(user.id);
    loadTracks();
    loadCategoryCovers();
    if (folderTablesReady) loadFolders();

    try {
      setPlayCounts(JSON.parse(localStorage.getItem(`playCounts:${user.id}`) || '{}'));
    } catch {
      setPlayCounts({});
    }

    try {
      setFolderColorOverrides(JSON.parse(localStorage.getItem(`playlistColors:${user.id}`) || '{}'));
    } catch {
      setFolderColorOverrides({});
    }

    try {
      setListeningStats(JSON.parse(localStorage.getItem(`listeningStats:${user.id}`) || '{"totalSeconds":0,"byDate":{},"byMonth":{},"byGenre":{},"byArtist":{},"byTrack":{}}'));
    } catch {
      setListeningStats({ totalSeconds: 0, byDate: {}, byMonth: {}, byGenre: {}, byArtist: {}, byTrack: {} });
    }

  }, [user?.id]);

  useEffect(() => {
    if (user && activeView === 'folders' && folderTablesReady) {
      loadFolders();
    }
  }, [user?.id, activeView, folderTablesReady]);

  useEffect(() => {
    function closeMenu(event) {
      if (!menuRef.current?.contains(event.target)) {
        setProfileOpen(false);
        setNotificationsOpen(false);
      }
    }

    document.addEventListener('pointerdown', closeMenu);
    return () => document.removeEventListener('pointerdown', closeMenu);
  }, []);

  useEffect(() => {
    function updateOnlineState() {
      const online = navigator.onLine;
      setIsOnline(online);
      if (online) setNetworkOffline(false);
    }

    updateOnlineState();
    window.addEventListener('online', updateOnlineState);
    window.addEventListener('offline', updateOnlineState);
    return () => {
      window.removeEventListener('online', updateOnlineState);
      window.removeEventListener('offline', updateOnlineState);
    };
  }, []);

  const publicTracks = useMemo(() => (
    tracks.filter((track) => isAdmin || getTrackApprovalStatus(track) === 'approved')
  ), [isAdmin, tracks]);
  const playablePublicTracks = useMemo(() => (
    appOfflineMode
      ? publicTracks.filter((track) => isTrackPlayableNow(track))
      : publicTracks
  ), [appOfflineMode, offlineTrackIds, publicTracks]);
  const ownTracks = useMemo(() => (
    tracks
      .filter((track) => track.user_id === user?.id)
      .filter((track) => isTrackPlayableNow(track))
  ), [appOfflineMode, offlineTrackIds, tracks, user?.id]);
  const pendingTracks = useMemo(() => (
    tracks.filter((track) => getTrackApprovalStatus(track) === 'pending')
  ), [tracks]);
  const canCurrentUserSeeTrack = useCallback((track) => (
    Boolean(track) && (isAdmin || getTrackApprovalStatus(track) === 'approved' || track.user_id === user?.id)
  ), [isAdmin, user?.id]);

  const visibleTracks = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return playablePublicTracks;

    return playablePublicTracks.filter((track) =>
      [track.title, track.artist, track.genre].join(' ').toLowerCase().includes(normalized)
    );
  }, [playablePublicTracks, query]);

  const customGenreOptions = useMemo(() => {
    const channelIds = new Set(channels.map((channel) => channel.id));
    const channelNames = new Set(channels.map((channel) => channel.name.toLowerCase()));
    const seen = new Set();

    return playablePublicTracks
      .map((track) => track.genre?.trim())
      .filter(Boolean)
      .filter((genre) => !channelIds.has(genre) && !channelNames.has(genre.toLowerCase()))
      .filter((genre) => {
        const key = genre.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .sort((a, b) => a.localeCompare(b));
  }, [playablePublicTracks]);

  const customGenreChannels = useMemo(() => (
    customGenreOptions.map((genre, index) => {
      const genreTracks = playablePublicTracks.filter((track) => normalizeFolderName(track.genre) === normalizeFolderName(genre));
      const accent = channels[index % channels.length]?.accent || '#ff8fbd';
      const id = `custom-${normalizeFolderName(genre).replace(/[^a-z0-9]+/g, '-')}`;

      return {
        id,
        customGenre: genre,
        name: genre,
        mood: `${genreTracks.length} Canciones subidas`,
        accent,
        image: categoryCovers[id] || createGeneratedCategoryCover(genre, index),
        tracks: genreTracks.map((track) => track.title)
      };
    })
  ), [categoryCovers, customGenreOptions, playablePublicTracks]);

  const mixChannels = useMemo(() => {
    const defaultChannels = channels.map((channel) => ({
      ...channel,
      image: categoryCovers[channel.id] || channel.image
    }));
    const principalChannels = showAllMixes
      ? defaultChannels.filter((channel) => channel.id !== 'otros')
      : defaultChannels.filter((channel) => primaryChannelIds.has(channel.id));

    return showAllMixes ? [...principalChannels, ...customGenreChannels] : principalChannels;
  }, [categoryCovers, customGenreChannels, showAllMixes]);

  const allCategoryChannels = useMemo(() => {
    const defaultChannels = channels.map((channel) => ({
      ...channel,
      image: categoryCovers[channel.id] || channel.image
    }));

    return [...defaultChannels, ...customGenreChannels];
  }, [categoryCovers, customGenreChannels]);

  const visibleChannels = useMemo(() => {
    const sourceChannels = query.trim() ? allCategoryChannels : mixChannels;
    const normalized = query.trim().toLowerCase();
    const filteredChannels = normalized
      ? sourceChannels.filter((channel) =>
        [channel.name, channel.mood, ...channel.tracks].join(' ').toLowerCase().includes(normalized)
      )
      : sourceChannels;

    if (!appOfflineMode) return filteredChannels;
    return filteredChannels.filter((channel) =>
      playablePublicTracks.some((track) => trackMatchesChannel(track, channel))
    );
  }, [allCategoryChannels, appOfflineMode, playablePublicTracks, query, mixChannels]);

  const featuredArtists = useMemo(() => {
    const artists = new Map();

    for (const track of playablePublicTracks) {
      const artistName = track.artist?.trim();
      if (!artistName) continue;

      const key = artistName.toLowerCase();
      const channel = getChannelByGenre(track.genre);
      const current = artists.get(key);

      if (current) {
        current.count += 1;
        if (!current.image && track.cover_url) current.image = track.cover_url;
        continue;
      }

      artists.set(key, {
        name: artistName,
        genre: channel?.name || track.genre || 'Música',
        image: track.cover_url || channel?.image || sakuraIcon,
        track,
        count: 1
      });
    }

    return Array.from(artists.values())
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
      .slice(0, 8);
  }, [playablePublicTracks]);

  const recommendedTracks = useMemo(() => {
    const playableTracks = playablePublicTracks.filter((track) => track?.audio_url);
    const normalizeKey = (value = '') => value.trim().toLowerCase();
    const addScore = (scores, key, value) => {
      if (!key) return;
      scores.set(key, (scores.get(key) || 0) + value);
    };

    const userFolderIds = new Set(
      folders
        .filter((folder) => folder.owner_id === user?.id || folder.shared_with === user?.id)
        .map((folder) => folder.id)
    );
    const savedTrackIds = new Set(
      folderTracks
        .filter((item) => userFolderIds.has(item.folder_id))
        .map((item) => item.track_id)
    );
    const albumScores = new Map();
    const artistScores = new Map();
    const genreScores = new Map();
    const albumPopularity = new Map();

    for (const track of playableTracks) {
      addScore(albumPopularity, normalizeKey(track.album), 1);

      const plays = Number(playCounts[track.id] || 0);
      const isSaved = savedTrackIds.has(track.id);
      if (!plays && !isSaved) continue;

      addScore(albumScores, normalizeKey(track.album), plays * 6 + (isSaved ? 4 : 0));
      addScore(artistScores, normalizeKey(track.artist), plays * 4 + (isSaved ? 3 : 0));
      addScore(genreScores, normalizeKey(track.genre), plays * 3 + (isSaved ? 2 : 0));
    }

    return playableTracks
      .map((track) => {
        const albumKey = normalizeKey(track.album);
        const artistKey = normalizeKey(track.artist);
        const genreKey = normalizeKey(track.genre);
        const directPlays = Number(playCounts[track.id] || 0);
        const score =
          directPlays * 10 +
          (savedTrackIds.has(track.id) ? 6 : 0) +
          (albumScores.get(albumKey) || 0) +
          (artistScores.get(artistKey) || 0) +
          (genreScores.get(genreKey) || 0) +
          (albumPopularity.get(albumKey) || 0) * 0.5;

        return { track, score };
      })
      .sort((a, b) =>
        b.score - a.score ||
        new Date(b.track.created_at || 0) - new Date(a.track.created_at || 0)
      )
      .slice(0, 5)
      .map((item) => item.track);
  }, [folderTracks, folders, playCounts, playablePublicTracks, user?.id]);

  const wellnessStats = useMemo(() => {
    const todayKey = getDateKey();
    const monthKey = getMonthKey();
    const todaySeconds = listeningStats.byDate?.[todayKey] || 0;
    const monthSeconds = listeningStats.byMonth?.[monthKey] || 0;
    const weekSeconds = Array.from({ length: 7 }).reduce((total, _, index) => {
      const date = new Date();
      date.setDate(date.getDate() - index);
      return total + (listeningStats.byDate?.[getDateKey(date)] || 0);
    }, 0);
    let streak = 0;
    for (let index = 0; index < 365; index += 1) {
      const date = new Date();
      date.setDate(date.getDate() - index);
      if ((listeningStats.byDate?.[getDateKey(date)] || 0) <= 0) break;
      streak += 1;
    }
    const topFromMap = (map = {}) => Object.entries(map).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Aún sin datos';
    const topTrackId = topFromMap(listeningStats.byTrack);
    const topTrack = playablePublicTracks.find((track) => track.id === topTrackId);
    const favoriteGenre = topFromMap(listeningStats.byGenre);
    const recommendedVolume = todaySeconds > 7200 ? 60 : 65;
    const volumeScore = Math.max(0, 100 - Math.max(0, volume - 75) * 3);
    const restScore = Math.max(45, 100 - Math.max(0, todaySeconds - 7200) / 90);
    const hearingScore = Math.round((volumeScore + restScore) / 2);
    const currentHour = new Date().getHours();

    return {
      todaySeconds,
      weekSeconds,
      monthSeconds,
      totalSeconds: listeningStats.totalSeconds || 0,
      streak,
      recommendedVolume,
      hearingScore,
      restScore: Math.round(restScore),
      volumeScore: Math.round(volumeScore),
      favoriteArtist: topFromMap(listeningStats.byArtist),
      favoriteGenre,
      favoriteTrack: topTrack?.title || 'Aún sin datos',
      songOfDay: recommendedTracks[0] || currentTrack || playablePublicTracks[0],
      mood: favoriteGenre.toLowerCase().includes('rock') || favoriteGenre.toLowerCase().includes('metal') ? 'energía alta' : currentHour >= 22 ? 'Relajado' : 'Alegre',
      lateNight: currentHour >= 22 || currentHour < 5,
      needsBreak: todaySeconds >= 7200,
      volumeWarning: volume >= 85
    };
  }, [currentTrack, listeningStats, playablePublicTracks, recommendedTracks, volume]);
  const recentNotifications = useMemo(() => (
    [...playablePublicTracks]
      .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
      .slice(0, 8)
  ), [playablePublicTracks]);
  const unreadNotifications = recentNotifications.filter((track) => new Date(track.created_at || 0).getTime() > notificationsReadAt).length;

  const currentTrackIsYoutube = Boolean(currentTrack && (isYoutubeUrl(currentTrack.audio_url) || currentTrack.storage_path?.startsWith('youtube:')));
  const canStream = Boolean(currentTrack?.audio_url && !currentTrackIsYoutube);
  const canPlay = Boolean(currentTrack?.audio_url);
  const currentTrackOffline = Boolean(currentTrack?.id && offlineTrackIds.includes(currentTrack.id));
  const youtubeEmbedUrl = currentTrackIsYoutube ? getYoutubeEmbedUrl(currentTrack.audio_url) : '';

  useEffect(() => {
    if (!appOfflineMode || !currentTrack || isTrackPlayableNow(currentTrack)) return;

    const fallbackTrack = playablePublicTracks.find((track) => isTrackPlayableNow(track));
    setIsPlaying(false);
    setPlaybackQueue(fallbackTrack ? [fallbackTrack] : []);
    setQueueIndex(0);
    setCurrentTrack(fallbackTrack || null);
    setProgress(0);
    setCurrentTime(0);
    setDuration(0);
  }, [appOfflineMode, currentTrack?.id, offlineTrackIds, playablePublicTracks]);

  useEffect(() => {
    setPlaylistQuery('');
    setPlaylistGenreFilter('all');
    setPlaylistSearchOpen(false);
  }, [activeFolderId]);

  const uploadGenreChoices = useMemo(() => ([
    ...channels.map((channel) => ({ value: channel.id, label: channel.name })),
    ...customGenreOptions.map((genre) => ({ value: genre, label: genre, custom: true }))
  ]), [customGenreOptions]);
  const likesFolders = useMemo(
    () => folders.filter((folder) => folder.owner_id === user?.id && isLikesFolderName(folder.name)),
    [folders, user?.id]
  );
  const likesFolder = likesFolders[0] ?? null;
  const likedTrackIds = useMemo(() => {
    if (likesFolders.length === 0) return new Set();
    const likesFolderIds = new Set(likesFolders.map((folder) => folder.id));
    return new Set(
      folderTracks
        .filter((item) => likesFolderIds.has(item.folder_id))
        .map((item) => item.track_id)
    );
  }, [folderTracks, likesFolders]);
  const currentTrackLiked = Boolean(currentTrack && likedTrackIds.has(currentTrack.id));
  function getFolderDisplayColor(folder) {
    return folderColorOverrides[folder?.id] || folder?.color || getGeneratedPlaylistColor(folder);
  }

  function getFolderItems(folder) {
    if (!folder || folder.is_preview) return [];

    if (isLikesFolderName(folder.name)) {
      const likesFolderIds = new Set(likesFolders.map((likesItem) => likesItem.id));
      const uniqueItems = [];
      const seenTracks = new Set();

      for (const item of folderTracks) {
        if (!likesFolderIds.has(item.folder_id) || !canCurrentUserSeeTrack(item.tracks) || !isTrackPlayableNow(item.tracks) || seenTracks.has(item.track_id)) continue;
        seenTracks.add(item.track_id);
        uniqueItems.push(item);
      }

      return uniqueItems;
    }

    return folderTracks.filter((item) => item.folder_id === folder.id && canCurrentUserSeeTrack(item.tracks) && isTrackPlayableNow(item.tracks));
  }

  function getFolderCoverUrl(folder, items = getFolderItems(folder)) {
    return folder?.cover_url || items.find((item) => item.tracks?.cover_url)?.tracks.cover_url || '';
  }

  function getFolderCoverUrls(folder, items = getFolderItems(folder)) {
    const urls = [];
    const seen = new Set();

    if (folder?.cover_url) {
      urls.push(folder.cover_url);
      seen.add(folder.cover_url);
    }

    for (const item of items) {
      const coverUrl = item.tracks?.cover_url;
      if (!coverUrl || seen.has(coverUrl)) continue;
      seen.add(coverUrl);
      urls.push(coverUrl);
      if (urls.length >= 4) break;
    }

    return urls;
  }

  const libraryFolders = useMemo(() => {
    const hasLikes = folders.some((folder) => isLikesFolderName(folder.name));
    const previewLikes = {
      id: 'likes-preview',
      owner_id: user?.id,
      name: 'Tus me gusta',
      is_preview: true,
      is_shared: false,
      color: '#7f63ff'
    };

    const uniqueFolders = [];
    const seenNames = new Set();

    for (const folder of folders) {
      const key = isLikesFolderName(folder.name) ? 'me gusta' : normalizeFolderName(folder.name);
      if (seenNames.has(key)) continue;
      seenNames.add(key);
      uniqueFolders.push(folder);
    }

    const sortedFolders = [
      ...uniqueFolders.filter((folder) => isLikesFolderName(folder.name)),
      ...uniqueFolders.filter((folder) => !isLikesFolderName(folder.name))
    ];

    return hasLikes ? sortedFolders : [previewLikes, ...sortedFolders];
  }, [folders, user?.id]);
  const visibleLibraryFolders = useMemo(() => {
    const likes = libraryFolders.filter((folder) => folder.is_preview || isLikesFolderName(folder.name));
    const rest = libraryFolders.filter((folder) => !folder.is_preview && !isLikesFolderName(folder.name));
    const sortedRest = [...rest].sort((a, b) => {
      if (librarySortMode === 'name') return (a.name || '').localeCompare(b.name || '');
      return new Date(b.created_at || 0) - new Date(a.created_at || 0);
    });
    return [...likes, ...sortedRest];
  }, [libraryFolders, librarySortMode]);
  const activeFolder = useMemo(
    () => libraryFolders.find((folder) => folder.id === activeFolderId) ?? visibleLibraryFolders[0],
    [activeFolderId, libraryFolders, visibleLibraryFolders]
  );
  const baseActiveFolderItems = useMemo(() => getFolderItems(activeFolder), [activeFolder, appOfflineMode, canCurrentUserSeeTrack, folderTracks, likesFolders, offlineTrackIds]);
  const activeFolderGenres = useMemo(() => {
    const seen = new Set();
    return baseActiveFolderItems
      .map((item) => item.tracks?.genre || 'Sin género')
      .filter((genre) => {
        const key = normalizeFolderName(genre);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  }, [baseActiveFolderItems]);
  const activeFolderItems = useMemo(() => {
    const normalizedQuery = playlistQuery.trim().toLowerCase();
    const normalizedGenre = normalizeFolderName(playlistGenreFilter);

    const filteredItems = baseActiveFolderItems.filter((item) => {
      const track = item.tracks;
      if (!track) return false;
      const matchesGenre = playlistGenreFilter === 'all' || normalizeFolderName(track.genre || 'Sin género') === normalizedGenre;
      const matchesQuery = !normalizedQuery || [track.title, track.artist, track.album, track.genre].join(' ').toLowerCase().includes(normalizedQuery);
      return matchesGenre && matchesQuery;
    });

    if (playlistSortMode === 'title') {
      return [...filteredItems].sort((a, b) => (a.tracks?.title || '').localeCompare(b.tracks?.title || ''));
    }

    if (playlistSortMode === 'recent') {
      return [...filteredItems].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
    }

    return filteredItems;
  }, [baseActiveFolderItems, playlistGenreFilter, playlistQuery, playlistSortMode]);
  const activeFolderColor = getFolderDisplayColor(activeFolder);
  const activeFolderCoverUrl = getFolderCoverUrl(activeFolder, baseActiveFolderItems);
  const openedCatalogTracks = useMemo(() => {
    if (!openedCatalog) return [];
    return playablePublicTracks.filter((track) => trackMatchesChannel(track, openedCatalog));
  }, [openedCatalog, playablePublicTracks]);

  function getDisplayChannelByGenre(genre) {
    const customChannel = customGenreChannels.find((channel) => normalizeFolderName(channel.customGenre) === normalizeFolderName(genre));
    if (customChannel) return customChannel;
    const channel = getChannelByGenre(genre);
    return { ...channel, image: categoryCovers[channel.id] || channel.image };
  }

  function trackMatchesChannel(track, channel) {
    if (!track || !channel) return false;
    if (channel.customGenre) {
      return normalizeFolderName(track.genre) === normalizeFolderName(channel.customGenre);
    }

    if (channel.id === 'otros') {
      const directChannel = channels.find((item) => item.id === track.genre);
      const channelNameMatch = channels.some((item) => normalizeFolderName(item.name) === normalizeFolderName(track.genre));
      return !directChannel && !channelNameMatch;
    }

    return getChannelByGenre(track.genre)?.id === channel.id;
  }

  async function loadCategoryCovers() {
    const { data, error } = await supabase
      .from('category_covers')
      .select('*');

    if (error) {
      if (isNetworkFetchError(error)) {
        setNetworkOffline(true);
        return;
      }
      if (error.code === 'PGRST205' || error.message?.includes('category_covers')) {
        setCategoryCoversReady(false);
        return;
      }

      setMessage(error.message);
      return;
    }

    setCategoryCoversReady(true);
    setCategoryCovers(
      Object.fromEntries((data ?? []).map((item) => [item.category_id, item.cover_url]))
    );
  }

  function playAudioElement(allowRetry = false) {
    const audio = audioRef.current;
    if (!audio || !canStream) return;

    if (audioPlayRetryRef.current) {
      window.clearTimeout(audioPlayRetryRef.current);
      audioPlayRetryRef.current = null;
    }

    audio.play().catch((error) => {
      const name = String(error?.name || '');
      const canRetry = allowRetry && (name === 'AbortError' || name === 'NotAllowedError' || audio.readyState < HTMLMediaElement.HAVE_FUTURE_DATA);
      if (canRetry) {
        audioPlayRetryRef.current = window.setTimeout(() => {
          audioPlayRetryRef.current = null;
          if (isPlaying && audioRef.current) playAudioElement(false);
        }, 650);
        return;
      }

      setIsPlaying(false);
    });
  }

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !canStream) return;

    if (isPlaying) {
      playAudioElement(true);
    } else {
      audio.pause();
    }
  }, [isPlaying, canStream]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !canStream) return;

    audio.load();
    if (isPlaying) playAudioElement(true);
  }, [canStream, currentTrack?.audio_url, offlineAudioUrl]);

  useEffect(() => {
    let cancelled = false;
    setOfflineAudioUrl('');

    if (offlineAudioObjectUrlRef.current) {
      URL.revokeObjectURL(offlineAudioObjectUrlRef.current);
      offlineAudioObjectUrlRef.current = '';
    }

    if (!canStream || !currentTrack?.audio_url) {
      setOfflineAudioUrl('');
      return undefined;
    }

    async function resolveAudioUrl() {
      const shouldUseCache = currentTrackOffline || appOfflineMode || !navigator.onLine;

      try {
        if (shouldUseCache && 'caches' in window) {
          const cache = await caches.open(audioCacheName);
          const cachedResponse = await cache.match(currentTrack.audio_url);
          if (cachedResponse) {
            const blob = await cachedResponse.blob();
            const objectUrl = URL.createObjectURL(blob);
            offlineAudioObjectUrlRef.current = objectUrl;
            if (!cancelled) setOfflineAudioUrl(objectUrl);
            return;
          }
        }
      } catch {
        if (!cancelled) setMessage('No pude leer la canción offline. Con internet intentaré reproducirla normal.');
      }

      if (!cancelled) setOfflineAudioUrl(currentTrack.audio_url);
    }

    resolveAudioUrl();

    return () => {
      cancelled = true;
    };
  }, [appOfflineMode, canStream, currentTrack?.audio_url, currentTrackOffline]);

  useEffect(() => () => {
    if (audioPlayRetryRef.current) {
      window.clearTimeout(audioPlayRetryRef.current);
      audioPlayRetryRef.current = null;
    }
  }, []);

  function updateYoutubeProgress() {
    const player = youtubePlayerRef.current;
    if (!currentTrackIsYoutube || !youtubePlayerReadyRef.current || !player?.getCurrentTime) return;

    const playerTime = Number(player.getCurrentTime() || 0);
    const playerDuration = Number(player.getDuration?.() || 0);

    if (Number.isFinite(playerTime)) {
      setCurrentTime(playerTime);
    }

    if (Number.isFinite(playerDuration) && playerDuration > 0) {
      setDuration(playerDuration);
      setProgress(Math.min((playerTime / playerDuration) * 100, 100) || 0);
    }
  }

  useEffect(() => {
    if (!currentTrackIsYoutube) return;

    updateYoutubeProgress();
    const timer = window.setInterval(updateYoutubeProgress, isPlaying ? 500 : 1000);

    return () => window.clearInterval(timer);
  }, [currentTrackIsYoutube, isPlaying, currentTrack?.audio_url]);

  useEffect(() => {
    if (!user?.id || !isPlaying || !currentTrack) return;

    const timer = window.setInterval(() => {
      const todayKey = getDateKey();
      const monthKey = getMonthKey();
      setListeningStats((current) => {
        const nextStats = {
          totalSeconds: Number(current.totalSeconds || 0) + 1,
          byDate: {
            ...(current.byDate || {}),
            [todayKey]: Number(current.byDate?.[todayKey] || 0) + 1
          },
          byMonth: {
            ...(current.byMonth || {}),
            [monthKey]: Number(current.byMonth?.[monthKey] || 0) + 1
          },
          byGenre: {
            ...(current.byGenre || {}),
            [currentTrack.genre || 'Sin género']: Number(current.byGenre?.[currentTrack.genre || 'Sin género'] || 0) + 1
          },
          byArtist: {
            ...(current.byArtist || {}),
            [currentTrack.artist || 'Sin artista']: Number(current.byArtist?.[currentTrack.artist || 'Sin artista'] || 0) + 1
          },
          byTrack: {
            ...(current.byTrack || {}),
            [currentTrack.id]: Number(current.byTrack?.[currentTrack.id] || 0) + 1
          }
        };
        localStorage.setItem(`listeningStats:${user.id}`, JSON.stringify(nextStats));
        return nextStats;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [currentTrack, isPlaying, user?.id]);

  useEffect(() => {
    if (!trackInfoOpen) return;
    setSelectedFolderId((current) => current || likesFolder?.id || folders[0]?.id || '');
    if (currentTrack) {
      const matchedChannel = channels.find((channel) => channel.id === currentTrack.genre);
      setTrackEditForm({
        title: currentTrack.title || '',
        artist: currentTrack.artist || '',
        album: currentTrack.album || '',
        genre: matchedChannel ? matchedChannel.id : 'otros',
        custom_genre: matchedChannel ? '' : currentTrack.genre || '',
        cover_url: currentTrack.cover_url || ''
      });
    }
  }, [trackInfoOpen, folders, likesFolder?.id]);

  useEffect(() => {
    if (!audioRef.current) return;
    audioRef.current.volume = volume / 100;
    audioRef.current.muted = muted;
    audioRef.current.loop = repeatOn;
  }, [volume, muted, repeatOn, currentTrack?.audio_url]);

  function syncYoutubePlayer() {
    if (!currentTrackIsYoutube) return;
    const player = youtubePlayerRef.current;

    if (youtubePlayerReadyRef.current && player?.setVolume) {
      player.setVolume(muted ? 0 : volume);
      if (muted) {
        player.mute?.();
      } else {
        player.unMute?.();
      }
      if (isPlaying) {
        player.playVideo?.();
      } else {
        player.pauseVideo?.();
      }
      updateYoutubeProgress();
      return;
    }
  }

  useEffect(() => {
    if (!youtubeEmbedUrl || !youtubePlayerMountRef.current) return;

    let cancelled = false;
    const mountNode = youtubePlayerMountRef.current;
    const playerHost = document.createElement('div');
    playerHost.id = `youtube-player-${getYoutubeVideoId(currentTrack?.audio_url)}-${Date.now()}`;

    const cleanupYoutubePlayer = () => {
      youtubePlayerReadyRef.current = false;
      try {
        youtubePlayerRef.current?.destroy?.();
      } catch {
        // YouTube can already have removed its own iframe during quick switches.
      }
      youtubePlayerRef.current = null;
      if (mountNode.isConnected) {
        try {
          mountNode.replaceChildren();
        } catch {
          // The wrapper can already be gone while React is unmounting the footer.
        }
      }
    };

    youtubePlayerCleanupRef.current?.();
    youtubePlayerCleanupRef.current = cleanupYoutubePlayer;
    mountNode.replaceChildren(playerHost);

    loadYoutubeIframeApi().then(() => {
      if (cancelled || !playerHost.isConnected) return;

      youtubePlayerRef.current = new window.YT.Player(playerHost.id, {
        host: 'https://www.youtube-nocookie.com',
        videoId: getYoutubeVideoId(currentTrack?.audio_url),
        playerVars: {
          autoplay: 0,
          controls: 0,
          enablejsapi: 1,
          modestbranding: 1,
          origin: window.location.origin,
          rel: 0,
          playsinline: 1,
          widget_referrer: window.location.origin
        },
        events: {
          onReady: () => {
            youtubePlayerReadyRef.current = true;
            syncYoutubePlayer();
            updateYoutubeProgress();
          },
          onStateChange: (event) => {
            updateYoutubeProgress();
            if (event.data === window.YT.PlayerState.ENDED) {
              playNextFromQueue();
            }
          }
        }
      });
    });

    return () => {
      cancelled = true;
      if (youtubePlayerCleanupRef.current === cleanupYoutubePlayer) {
        youtubePlayerCleanupRef.current = null;
      }
      cleanupYoutubePlayer();
    };
  }, [youtubeEmbedUrl]);

  useEffect(() => {
    if (!currentTrackIsYoutube) return;

    const timer = window.setTimeout(() => {
      syncYoutubePlayer();
    }, 250);

    return () => window.clearTimeout(timer);
  }, [currentTrackIsYoutube, isPlaying, muted, volume, currentTrack?.audio_url]);

  useEffect(() => {
    if (!('mediaSession' in navigator)) return undefined;

    if (!currentTrack) {
      navigator.mediaSession.playbackState = 'none';
      return undefined;
    }

    if (typeof window.MediaMetadata === 'function') {
      navigator.mediaSession.metadata = new window.MediaMetadata({
        title: currentTrack.title || brandName,
        artist: currentTrack.artist || brandName,
        album: currentTrack.album || currentTrack.genre || '',
        artwork: [
          {
            src: currentTrack.cover_url || getDisplayChannelByGenre(currentTrack.genre).image,
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      });
    }

    navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';

    const handlers = {
      play: () => setIsPlaying(true),
      pause: () => setIsPlaying(false),
      nexttrack: playNextFromQueue,
      previoustrack: playPreviousFromQueue
    };

    for (const [action, handler] of Object.entries(handlers)) {
      try {
        navigator.mediaSession.setActionHandler(action, handler);
      } catch {
        // Some Android WebViews do not expose every Media Session action.
      }
    }

    return () => {
      for (const action of Object.keys(handlers)) {
        try {
          navigator.mediaSession.setActionHandler(action, null);
        } catch {
          // Ignore unsupported Media Session actions.
        }
      }
    };
  }, [currentTrack?.id, currentTrack?.title, currentTrack?.artist, currentTrack?.album, currentTrack?.cover_url, currentTrack?.genre, isPlaying, playbackQueue, queueIndex, appOfflineMode, offlineTrackIds]);

  useEffect(() => {
    if (!('mediaSession' in navigator) || !navigator.mediaSession.setPositionState || !duration) return;

    try {
      navigator.mediaSession.setPositionState({
        duration,
        playbackRate: 1,
        position: Math.min(currentTime, duration)
      });
    } catch {
      // Position state is optional in some WebViews.
    }
  }, [currentTime, duration]);

  useEffect(() => {
    return () => {
      if (avatarPreviewUrl) URL.revokeObjectURL(avatarPreviewUrl);
    };
  }, [avatarPreviewUrl]);

  async function loadTracks() {
    // Cargo las Canciones subidas por los usuarios para mostrarlas en biblioteca y busqueda.
    const { data, error } = await supabase
      .from('tracks')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      if (isNetworkFetchError(error)) {
        setNetworkOffline(true);
      }

      try {
        const cachedTracks = JSON.parse(localStorage.getItem(`offlineTrackCatalog:${user?.id}`) || '[]');
        if (cachedTracks.length > 0) {
          setTracksReady(true);
          setTracks(cachedTracks);
          setMessage('Sin internet: usando canciones guardadas en este teléfono.');
          return;
        }
      } catch {
        // Si el catálogo local esta corrupto, sigo con el error normal.
      }

      setTracksReady(false);
      setMessage(
        error.code === 'PGRST205' || error.message?.includes("public.tracks")
          ? 'Falta completar la configuración de Supabase o recargar el schema cache. La tabla public.tracks todavía no existe para la API.'
          : (isNetworkFetchError(error) ? 'Sin internet: no hay canciones guardadas en este teléfono.' : error.message)
      );
      setTracks([]);
      return;
    }

    setTracksReady(true);
    setTracks(data ?? []);
    if (user?.id) localStorage.setItem(`offlineTrackCatalog:${user.id}`, JSON.stringify(data ?? []));
    cachePublicAudioTracksForOffline(data ?? []);
  }

  async function loadFolders() {
    if (!user || !folderTablesReady) return;

    // Cargo mis carpetas y las carpetas que otros usuarios compartieron conmigo.
    const { data: ownFolders, error: ownError } = await supabase
      .from('playlist_folders')
      .select('*')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false });

    if (ownError) {
      if (isNetworkFetchError(ownError)) {
        setNetworkOffline(true);
        return;
      }

      if (ownError.code === 'PGRST205' || ownError.message?.includes('playlist_folders')) {
        setFolders([]);
        setFolderTracks([]);
        setFolderTablesReady(false);
        setMessage('Completa la configuración de Supabase para guardar canciones en Me gusta.');
        return;
      }

      setMessage(ownError.message);
      return;
    }

    const { data: sharedRows, error: sharedError } = await supabase
      .from('playlist_shares')
      .select('folder_id, playlist_folders(*)')
      .eq('shared_with', user.id);

    if (sharedError) {
      if (isNetworkFetchError(sharedError)) {
        setNetworkOffline(true);
        return;
      }

      const errorMessage = sharedError.message;
      if (
        sharedError?.code === 'PGRST205' ||
        errorMessage?.includes('playlist_shares')
      ) {
        setFolders([]);
        setFolderTracks([]);
        setFolderTablesReady(false);
        setMessage('Falta completar la configuración de Supabase para activar Carpetas y carpetas compartidas.');
        return;
      }

      setMessage(errorMessage);
      return;
    }

    const sharedFolders = (sharedRows ?? [])
      .map((row) => row.playlist_folders)
      .filter(Boolean)
      .map((folder) => ({ ...folder, shared_with_me: true }));

    const merged = [...(ownFolders ?? []), ...sharedFolders].filter(
      (folder, index, all) => all.findIndex((item) => item.id === folder.id) === index
    );

    setFolders(merged);
    if (merged[0] && activeFolderId === 'likes-preview') {
      setActiveFolderId(merged[0].id);
    }

    if (merged.length === 0) {
      setFolderTracks([]);
      return;
    }

    // Traigo las canciones guardadas en las carpetas visibles para armar la vista de detalle.
    const { data: items, error: itemsError } = await supabase
      .from('playlist_tracks')
      .select('folder_id, track_id, tracks(*)')
      .in('folder_id', merged.map((folder) => folder.id))
      .order('created_at', { ascending: false });

    if (itemsError) {
      if (isNetworkFetchError(itemsError)) {
        setNetworkOffline(true);
        return;
      }

      if (itemsError.code === 'PGRST205' || itemsError.message?.includes('playlist_tracks') || isSupabasePermissionError(itemsError)) {
        setFolderTracks([]);
        setFolderTablesReady(false);
        setMessage('Falta activar los permisos de Supabase para guardar canciones en carpetas.');
        return;
      }

      setMessage(itemsError.message);
      return;
    }

    setFolderTracks(items ?? []);
  }

  async function loadProfile(userId) {
    // Busco el perfil publico enlazado al usuario autenticado para mostrar nombre y avatar tipo Gmail.
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      if (isNetworkFetchError(error)) {
        setNetworkOffline(true);
        return;
      }

      setMessage(error.message);
      return;
    }

    const nextProfile = data ?? {
      username: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Usuario',
      avatar_url: user.user_metadata?.avatar_url || fallbackAvatar
    };

    if (!data) {
      // Creo el perfil si el usuario ya existia antes de instalar el trigger de Supabase.
      await supabase
        .from('profiles')
        .upsert({
          id: userId,
          username: nextProfile.username,
          avatar_url: nextProfile.avatar_url
        });
    }

    setProfile(nextProfile);
    setProfileForm({
      username: nextProfile.username || '',
      avatar_url: nextProfile.avatar_url || user.user_metadata?.avatar_url || fallbackAvatar
    });
  }

  async function handleEmailAuth(event) {
    event.preventDefault();
    setMessage('');

    if (authMode === 'reset') {
      if (!authForm.password || authForm.password.length < 6) {
        setMessage('La nueva contraseña debe tener mínimo 6 caracteres.');
        return;
      }

      const { error } = await supabase.auth.updateUser({ password: authForm.password });
      if (error) {
        setMessage(error.message);
        return;
      }

      setPasswordRecoveryMode(false);
      setAuthMode('login');
      setAuthForm((current) => ({ ...current, password: '' }));
      setMessage('Contraseña actualizada.');
      return;
    }

    if (authMode === 'forgot') {
      await sendPasswordReset();
      return;
    }

    if (!authForm.email || !authForm.password) {
      setMessage('Completa correo y contraseña.');
      return;
    }

    if (authMode === 'register') {
      // Registro una cuenta con correo y guardo el nombre para que el trigger de profiles pueda usarlo.
      const { error } = await supabase.auth.signUp({
        email: authForm.email,
        password: authForm.password,
        options: {
          emailRedirectTo: siteUrl,
          data: { username: authForm.username || authForm.email.split('@')[0] }
        }
      });

      setMessage(error ? error.message : 'Cuenta creada con éxito.');
      return;
    }

    // Inicio sesión con correo y contraseña para entrar a la experiencia privada.
    const { error } = await supabase.auth.signInWithPassword({
      email: authForm.email,
      password: authForm.password
    });

    if (error) setMessage(error.message);
  }

  async function signInWithGoogle() {
    setMessage('');

    // Abro el proveedor OAuth de Google configurado en Supabase Auth Providers.
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: siteUrl }
    });

    if (error) setMessage(error.message);
  }

  async function sendPasswordReset() {
    const email = authForm.email.trim();
    if (!email) {
      setMessage('Escribe tu correo para recuperar la contraseña.');
      return;
    }

    setMessage('');
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: passwordResetRedirectUrl
    });

    setMessage(error ? error.message : 'Te enviamos un enlace para recuperar la contraseña.');
  }

  async function saveProfile(event) {
    event.preventDefault();
    if (!user) return;

    setSavingProfile(true);
    setMessage('');

    let avatarUrl = profileForm.avatar_url || getAvatar(user, profile);

    if (avatarFile) {
      const extension = avatarFile.name.split('.').pop() || 'jpg';
      const filePath = `${user.id}/avatars/${crypto.randomUUID()}.${extension}`;
      const { error: uploadError } = await supabase.storage
        .from('songs')
        .upload(filePath, avatarFile, {
          cacheControl: '3600',
          contentType: avatarFile.type || 'image/jpeg',
          upsert: false
        });

      if (uploadError) {
        setMessage(`${uploadError.message}. Si Supabase bloquea imagenes, revisa la configuración del bucket para permitir avatares.`);
        setSavingProfile(false);
        return;
      }

      const { data: publicUrlData } = supabase.storage
        .from('songs')
        .getPublicUrl(filePath);

      avatarUrl = publicUrlData.publicUrl;
    }

    // Actualizo mi perfil en public.profiles para que el menu muestre mi nombre y avatar elegidos.
    const { error } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        username: profileForm.username || getDisplayName(user, profile),
        avatar_url: avatarUrl,
        updated_at: new Date().toISOString()
      });

    if (error) {
      setMessage(error.message);
      setSavingProfile(false);
      return;
    }

    setMessage('Perfil actualizado.');
    setAvatarFile(null);
    setProfileForm((current) => ({ ...current, avatar_url: avatarUrl }));
    setEditingProfile(false);
    setSavingProfile(false);
    loadProfile(user.id);
  }

  async function signOut() {
    // Cierro la sesión actual de Supabase y regreso la app al login.
    await supabase.auth.signOut();
    setProfileOpen(false);
  }

  function handleAudioFile(file) {
    if (!file) {
      setTrackForm((current) => ({ ...current, audio: null }));
      return;
    }

    const cleanTitle = file.name
      .replace(/\.[^/.]+$/, '')
      .replace(/^\d+\s*[-_.]\s*/, '')
      .replace(/_/g, ' ')
      .trim();

    setTrackForm((current) => ({
      ...current,
      audio: file,
      youtube_url: '',
      title: current.title || cleanTitle
    }));
  }

  async function uploadTrack(event) {
    event.preventDefault();
    if (!tracksReady) {
      setMessage('Primero completa la configuración de Supabase para crear tracks y el bucket songs.');
      return;
    }

    const requiredFields = [
      ['Titulo', trackForm.title],
      ['Artista', trackForm.artist],
      ['Album', trackForm.album],
      ['género', trackForm.genre],
      ['Portada', trackForm.cover_mode === 'file' ? trackForm.cover_file : trackForm.cover_url],
      ['Tipo de subida', trackForm.source_mode]
    ];

    if (trackForm.genre === 'otros') {
      requiredFields.push(['género personalizado', trackForm.custom_genre]);
    }

    if (trackForm.source_mode === 'file') {
      requiredFields.push(['Archivo de audio', trackForm.audio]);
    }

    if (trackForm.source_mode === 'youtube') {
      requiredFields.push(['Link de YouTube', trackForm.youtube_url]);
      if (trackForm.youtube_url && !isYoutubeUrl(trackForm.youtube_url)) {
        setMessage('El link debe ser de youtube.com o youtu.be.');
        return;
      }
    }

    const missingField = requiredFields.find(([, value]) => !value || (typeof value === 'string' && !value.trim()));

    if (!user || missingField) {
      setMessage(`Completa todos los campos antes de subir. Falta: ${missingField?.[0] || 'usuario'}.`);
      return;
    }

    setUploadingTrack(true);
    setMessage('');

    let filePath = '';
    let audioUrl = '';
    let coverUrl = trackForm.cover_url.trim();

    if (trackForm.source_mode === 'file') {
      const extension = trackForm.audio.name.split('.').pop() || 'mp3';
      filePath = `${user.id}/${crypto.randomUUID()}.${extension}`;
      const contentType =
        ['mpeg', 'mpg', 'mpga', 'mp3'].includes(extension.toLowerCase())
          ? 'audio/mpeg'
          : trackForm.audio.type || 'audio/mpeg';

      // Subo el archivo de audio al bucket publico songs para poder reproducirlo desde la app.
      const { error: uploadError } = await supabase.storage
        .from('songs')
        .upload(filePath, trackForm.audio, {
          cacheControl: '3600',
          contentType,
          upsert: false
        });

      if (uploadError) {
        setMessage(uploadError.message);
        setUploadingTrack(false);
        return;
      }

      // Obtengo la URL pública del audio recién subido para guardarla junto con la canción.
      const { data: publicUrlData } = supabase.storage
        .from('songs')
        .getPublicUrl(filePath);

      audioUrl = publicUrlData.publicUrl;
    } else {
      audioUrl = trackForm.youtube_url.trim();
      filePath = `youtube:${crypto.randomUUID()}`;
    }

    if (trackForm.cover_mode === 'file' && trackForm.cover_file) {
      const extension = trackForm.cover_file.name.split('.').pop() || 'jpg';
      const coverPath = `${user.id}/covers/${crypto.randomUUID()}.${extension}`;
      const { error: coverUploadError } = await supabase.storage
        .from('songs')
        .upload(coverPath, trackForm.cover_file, {
          cacheControl: '3600',
          contentType: trackForm.cover_file.type || 'image/jpeg',
          upsert: false
        });

      if (coverUploadError) {
        setMessage(coverUploadError.message);
        setUploadingTrack(false);
        return;
      }

      const { data: coverPublicUrlData } = supabase.storage
        .from('songs')
        .getPublicUrl(coverPath);

      coverUrl = coverPublicUrlData.publicUrl;
    }

    // Registro la canción en la tabla tracks para que aparezca en biblioteca y busqueda.
    const newTrackPayload = {
      user_id: user.id,
      title: trackForm.title.trim(),
      artist: trackForm.artist.trim(),
      album: trackForm.album.trim(),
      genre: trackForm.genre === 'otros' ? trackForm.custom_genre.trim() : trackForm.genre,
      cover_url: coverUrl,
      audio_url: audioUrl,
      storage_path: filePath,
      metadata_source: isAdmin
        ? (trackForm.source_mode === 'youtube' ? 'YouTube' : (trackForm.metadata_source || null))
        : withApprovalStatus('pending', trackForm.source_mode === 'youtube' ? 'YouTube' : (trackForm.metadata_source || 'Manual'))
    };

    const { error: insertError } = await supabase
      .from('tracks')
      .insert(newTrackPayload);

    if (insertError) {
      if (insertError.message?.includes("public.tracks")) {
        setTracksReady(false);
        setMessage('Supabase no encuentra public.tracks. Completa la configuración de Supabase y espera unos segundos.');
        setUploadingTrack(false);
        return;
      }
      setMessage(insertError.message);
      setUploadingTrack(false);
      return;
    }

    setTrackForm(emptyTrackForm);
    setMetadataResults([]);
    setSelectedMetadataKey('');
    setMessage(isAdmin ? 'Canción subida correctamente.' : 'Canción enviada a revisión. El admin la verá en canciones pendientes.');
    setUploadingTrack(false);
    setActiveView('library');
    loadTracks();
  }

  async function deleteTrack(track) {
    if (!user || (!isAdmin && track.user_id !== user.id)) return;

    // Elimino el audio del bucket songs antes de borrar el registro de la biblioteca.
    if (track.storage_path && (isAdmin || track.user_id === user.id)) {
      await supabase.storage.from('songs').remove([track.storage_path]);
    }

    // Borro mi canción de la tabla tracks; RLS impide borrar canciones de otros usuarios.
    const { error } = await supabase
      .from('tracks')
      .delete()
      .eq('id', track.id);

    if (error) {
      setMessage(error.message);
      return;
    }

    if (currentTrack?.id === track.id) setCurrentTrack(null);
    loadTracks();
  }

  async function approveTrack(track) {
    if (!isAdmin || !track?.id) return;

    const { error } = await supabase
      .from('tracks')
      .update({ metadata_source: getTrackMetadataSource(track) })
      .eq('id', track.id);

    if (error) {
      if (isNetworkFetchError(error)) {
        setNetworkOffline(true);
        return;
      }

      setMessage(error.message);
      return;
    }

    setMessage('canción aprobada. Ya aparece para todos.');
    loadTracks();
  }

  async function rejectTrack(track) {
    if (!isAdmin || !track?.id) return;
    await deleteTrack(track);
    setMessage('canción rechazada y eliminada.');
  }

  async function saveCategoryCover(channel) {
    if (!isAdmin) return;
    if (!categoryCoversReady) {
      setMessage('Completa la configuración de Supabase para activar la edición de portadas de categorias.');
      return;
    }

    const coverUrl = (categoryCoverForms[channel.id] ?? categoryCovers[channel.id] ?? channel.image).trim();
    if (!coverUrl) {
      setMessage('Pega una URL valida para la portada.');
      return;
    }

    const { error } = await supabase
      .from('category_covers')
      .upsert({
        category_id: channel.id,
        cover_url: coverUrl,
        updated_by: user.id,
        updated_at: new Date().toISOString()
      });

    if (error) {
      setMessage(error.message);
      return;
    }

    setCategoryCovers((current) => ({ ...current, [channel.id]: coverUrl }));
    setOpenedCatalog((current) => current?.id === channel.id ? { ...current, image: coverUrl } : current);
    setActiveChannel((current) => current?.id === channel.id ? { ...current, image: coverUrl } : current);
    setMessage('Portada de categoria actualizada.');
  }

  async function uploadCategoryCoverImage(channel, file) {
    if (!isAdmin || !file) return;

    const extension = file.name.split('.').pop() || 'jpg';
    const safeId = channel.id.replace(/[^a-z0-9-]/gi, '-');
    const filePath = `${user.id}/category-covers/${safeId}-${crypto.randomUUID()}.${extension}`;
    const { error: uploadError } = await supabase.storage
      .from('songs')
      .upload(filePath, file, {
        cacheControl: '3600',
        contentType: file.type || 'image/jpeg',
        upsert: false
      });

    if (uploadError) {
      setMessage(uploadError.message);
      return;
    }

    const { data: publicUrlData } = supabase.storage
      .from('songs')
      .getPublicUrl(filePath);

    setCategoryCoverForms((current) => ({ ...current, [channel.id]: publicUrlData.publicUrl }));
    setMessage('Imagen cargada. Presiona Guardar portada para usarla.');
  }

  function openNotifications() {
    const readAt = Date.now();
    localStorage.setItem('notificationsReadAt', String(readAt));
    setNotificationsReadAt(readAt);
    setNotificationsOpen((open) => !open);
    setProfileOpen(false);
  }

  async function saveTrackDetails(event) {
    event.preventDefault();
    if (!currentTrack || !isAdmin) return;

    const updates = {
      title: trackEditForm.title.trim() || currentTrack.title,
      artist: trackEditForm.artist.trim() || currentTrack.artist,
      album: trackEditForm.album.trim() || currentTrack.album,
      genre: trackEditForm.genre === 'otros'
        ? (trackEditForm.custom_genre.trim() || currentTrack.genre)
        : trackEditForm.genre,
      cover_url: trackEditForm.cover_url.trim() || null,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('tracks')
      .update(updates)
      .eq('id', currentTrack.id)
      .select('*')
      .single();

    if (error) {
      setMessage(error.message);
      return;
    }

    setCurrentTrack(data);
    setMessage('canción actualizada.');
    loadTracks();
  }

  async function createFolder(event, options = {}) {
    event?.preventDefault();
    const requestedName = folderForm.name.trim();
    if (!user || !requestedName) return;
    if (!folderTablesReady) {
      setMessage('Completa la configuración de Supabase para poder crear carpetas reales.');
      return;
    }

    const requestedKey = isLikesFolderName(requestedName) ? 'me gusta' : normalizeFolderName(requestedName);
    const existingFolder = folders.find((folder) => {
      const folderKey = isLikesFolderName(folder.name) ? 'me gusta' : normalizeFolderName(folder.name);
      return folder.owner_id === user.id && folderKey === requestedKey;
    });

    if (existingFolder) {
      setActiveFolderId(existingFolder.id);
      if (options.selectForTrack) setSelectedFolderId(existingFolder.id);
      setCreatingFolder(false);
      setMessage('Esa playlist ya existe.');
      return existingFolder;
    }

    const folderPayload = {
      owner_id: user.id,
      name: requestedName,
      is_shared: folderForm.is_shared,
      color: folderForm.color || getGeneratedPlaylistColor({ name: requestedName })
    };

    // Creo una carpeta propia para guardar canciones como Me gusta, Rock para estudiar, etc.
    let { data: folder, error } = await supabase
      .from('playlist_folders')
      .insert(folderPayload)
      .select('*')
      .single();

    if (error?.message?.includes('color')) {
      const fallbackPayload = { ...folderPayload };
      delete fallbackPayload.color;
      const retry = await supabase
        .from('playlist_folders')
        .insert(fallbackPayload)
        .select('*')
        .single();
      folder = retry.data;
      error = retry.error;
    }

    if (error) {
      setMessage(error.message);
      return;
    }

    if (folderForm.is_shared && folderForm.share_email.trim()) {
      await shareFolderWithEmail(folder.id, folderForm.share_email.trim(), false);
    }

    setFolderForm(emptyFolderForm);
    setCreatingFolder(false);
    setMessage('Carpeta creada.');
    setActiveFolderId(folder.id);
    const createdColor = folderPayload.color;
    setFolderColorOverrides((current) => {
      const next = { ...current, [folder.id]: createdColor };
      localStorage.setItem(`playlistColors:${user.id}`, JSON.stringify(next));
      return next;
    });
    if (options.selectForTrack) setSelectedFolderId(folder.id);
    loadFolders();
    return folder;
  }

  async function updatePlaylistColor(folder, color) {
    if (!folder || folder.is_preview || folder.owner_id !== user?.id) return;

    setFolderColorOverrides((current) => {
      const next = { ...current, [folder.id]: color };
      localStorage.setItem(`playlistColors:${user.id}`, JSON.stringify(next));
      return next;
    });
    setFolders((current) => current.map((item) => item.id === folder.id ? { ...item, color } : item));

    const { error } = await supabase
      .from('playlist_folders')
      .update({ color, updated_at: new Date().toISOString() })
      .eq('id', folder.id);

    if (error) {
      setMessage(error.message?.includes('color')
        ? 'Color guardado en este navegador. Ejecuta el SQL de colores para guardarlo tambien en Supabase.'
        : error.message);
    }
  }

  function showFolderSetupMessage(error) {
    if (
      error?.code === 'PGRST205' ||
      error?.message?.includes('playlist_folders') ||
      error?.message?.includes('playlist_tracks') ||
      isSupabasePermissionError(error)
    ) {
      setFolderTablesReady(false);
      setMessage('Falta activar los permisos de Supabase para Me gusta y Carpetas.');
      return;
    }

    setMessage(error?.message || 'No se pudo guardar la canción.');
  }

  async function addTrackToFolder(track, folderId, successMessage = 'canción agregada a la carpeta.') {
    if (!track || !folderId || !user) return false;
    if (!folderTablesReady || folderId === 'likes-preview') {
      setMessage('Completa la configuración de Supabase para guardar canciones en carpetas reales.');
      return false;
    }

    // Agrego la canción elegida a la carpeta sin duplicarla.
    const { error } = await supabase
      .from('playlist_tracks')
      .upsert({
        folder_id: folderId,
        track_id: track.id,
        added_by: user.id
      });

    if (error) {
      showFolderSetupMessage(error);
      return false;
    }

    setMessage(successMessage);
    showSaveNotice(successMessage);
    loadFolders();
    return true;
  }

  async function addCurrentTrackToFolder(folderId) {
    if (!currentTrack) {
      setMessage('Carga una canción en el reproductor antes de agregarla a una carpeta.');
      return;
    }

    addTrackToFolder(currentTrack, folderId);
  }

  async function addCurrentTrackToSelectedFolder() {
    if (!currentTrack) {
      setMessage('Carga una canción en el reproductor antes de agregarla a una carpeta.');
      return;
    }

    if (selectedFolderId === '__new__') {
      const folder = await createFolder(undefined, { selectForTrack: true });
      if (folder) await addTrackToFolder(currentTrack, folder.id);
      return;
    }

    addCurrentTrackToFolder(selectedFolderId);
  }

  async function getOrCreateLikesFolder() {
    if (!user) return null;
    if (likesFolder) return likesFolder;
    if (!folderTablesReady) {
      setMessage('Completa la configuración de Supabase para guardar canciones en Me gusta.');
      return null;
    }

    let { data: folder, error } = await supabase
      .from('playlist_folders')
      .insert({
        owner_id: user.id,
        name: 'Me gusta',
        is_shared: false,
        color: '#7f63ff'
      })
      .select('*')
      .single();

    if (error?.message?.includes('color')) {
      const retry = await supabase
        .from('playlist_folders')
        .insert({
          owner_id: user.id,
          name: 'Me gusta',
          is_shared: false
        })
        .select('*')
        .single();
      folder = retry.data;
      error = retry.error;
    }

    if (error) {
      showFolderSetupMessage(error);
      return null;
    }

    setFolders((current) => [folder, ...current]);
    setFolderColorOverrides((current) => {
      const next = { ...current, [folder.id]: '#7f63ff' };
      localStorage.setItem(`playlistColors:${user.id}`, JSON.stringify(next));
      return next;
    });
    setActiveFolderId(folder.id);
    return folder;
  }

  async function addTrackToLikes(track) {
    if (!track) return;
    const folder = await getOrCreateLikesFolder();
    if (!folder) return;

    if (likedTrackIds.has(track.id)) {
      for (const likesFolderItem of likesFolders) {
        await removeTrackFromFolder(likesFolderItem.id, track.id);
      }
      setMessage('canción quitada de Me gusta.');
      showSaveNotice('canción quitada de Me gusta.');
      loadFolders();
      return;
    }

    await addTrackToFolder(track, folder.id, 'canción guardada en Me gusta.');
  }

  async function shareFolderWithEmail(folderId, email, showSuccess = true) {
    const normalizedEmail = email.toLowerCase().trim();

    // Busco el perfil por correo para compartir una carpeta con otro usuario registrado.
    const { data: targetProfile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (profileError || !targetProfile) {
      setMessage('No encontre un usuario registrado con ese correo.');
      return;
    }

    // Registro el permiso de carpeta compartida para ese usuario.
    const { error } = await supabase
      .from('playlist_shares')
      .upsert({
        folder_id: folderId,
        shared_with: targetProfile.id,
        shared_by: user.id
      });

    if (error) {
      setMessage(error.message);
      return;
    }

    if (showSuccess) setMessage('Carpeta compartida.');
    loadFolders();
  }

  async function removeTrackFromFolder(folderId, trackId, successMessage = '') {
    // Quito una canción de una carpeta propia o compartida donde tengo acceso.
    const { error } = await supabase
      .from('playlist_tracks')
      .delete()
      .eq('folder_id', folderId)
      .eq('track_id', trackId);

    if (error) {
      setMessage(error.message);
      return;
    }

    if (successMessage) setMessage(successMessage);
    loadFolders();
  }

  function selectTrack(track) {
    if (!track?.audio_url) return;
    if (!isTrackPlayableNow(track)) {
      setMessage('Esta canción no está disponible sin internet en este teléfono.');
      return;
    }
    setPlaybackQueue([]);
    setQueueIndex(0);
    setCurrentTrack(track);
    setActiveChannel(getDisplayChannelByGenre(track.genre));
    setIsPlaying(false);
    setProgress(0);
    setCurrentTime(0);
  }

  function recordTrackPlay(track) {
    if (!user?.id || !track?.id) return;

    setPlayCounts((currentCounts) => {
      const nextCounts = {
        ...currentCounts,
        [track.id]: Number(currentCounts[track.id] || 0) + 1
      };
      localStorage.setItem(`playCounts:${user.id}`, JSON.stringify(nextCounts));
      return nextCounts;
    });
  }

  function playTrackQueue(queue, startIndex = 0) {
    const requestedTrack = queue[startIndex];
    const playableQueue = queue.filter((track) => isTrackPlayableNow(track));
    if (playableQueue.length === 0) return;

    const requestedIndex = requestedTrack?.id ? playableQueue.findIndex((track) => track.id === requestedTrack.id) : -1;
    const safeIndex = requestedIndex >= 0 ? requestedIndex : Math.min(Math.max(startIndex, 0), playableQueue.length - 1);
    const track = playableQueue[safeIndex];
    setPlaybackQueue(playableQueue);
    setQueueIndex(safeIndex);
    setCurrentTrack(track);
    setActiveChannel(getDisplayChannelByGenre(track.genre));
    setProgress(0);
    setCurrentTime(0);
    setDuration(0);
    recordTrackPlay(track);
    setIsPlaying(true);
  }

  function getFallbackQueue() {
    const catalogQueue = openedCatalogTracks.filter((track) => track?.audio_url);
    if (catalogQueue.length > 0) return catalogQueue;

    const uploadedQueue = visibleTracks.filter((track) => track?.audio_url);
    if (uploadedQueue.length > 0) return uploadedQueue;

    return playablePublicTracks.filter((track) => track?.audio_url);
  }

  function togglePlayer() {
    if (!canPlay) {
      const fallbackQueue = getFallbackQueue();
      if (fallbackQueue.length > 0) {
        playTrackQueue(fallbackQueue, 0);
      } else {
        setActiveView('upload');
        showPlayerMessage('Sube una canción para reproducir.');
      }
      return;
    }

    if (!isPlaying && volume <= 0) {
      setPlayerVolume(85);
    }

    setIsPlaying((playing) => !playing);
  }

  function saveCurrentFromHero() {
    if (currentTrack) {
      addTrackToLikes(currentTrack);
      return;
    }

    const fallbackQueue = getFallbackQueue();
    if (fallbackQueue[0]) {
      addTrackToLikes(fallbackQueue[0]);
      setCurrentTrack(fallbackQueue[0]);
      setActiveChannel(getDisplayChannelByGenre(fallbackQueue[0].genre));
      return;
    }

    setActiveView('upload');
    showPlayerMessage('Sube o elige una canción para guardarla.');
  }

  function focusSearchView() {
    setActiveView('search');
    setOpenedCatalog(null);
    window.requestAnimationFrame(() => {
      searchInputRef.current?.focus();
      searchInputRef.current?.select();
    });
  }

  function openPremiumView() {
    setActiveView('premium');
    setOpenedCatalog(null);
    setNotificationsOpen(false);
    setProfileOpen(false);
    setTrackInfoOpen(false);
  }

  function toggleQueue(queue, startIndex = 0) {
    const playableQueue = queue.filter((track) => track?.audio_url);
    if (playableQueue.length === 0) return;

    const selectedTrack = playableQueue[startIndex] ?? playableQueue[0];
    if (currentTrack?.id === selectedTrack.id) {
      setIsPlaying((playing) => !playing);
      return;
    }

    playTrackQueue(playableQueue, startIndex);
  }

  function openTrackInfo() {
    if (!currentTrack) return;
    if (folderTablesReady) loadFolders();
    setSelectedFolderId(likesFolder?.id || folders[0]?.id || '');
    setTrackInfoOpen(true);
  }

  function openCatalog(channel) {
    setActiveChannel(channel);
    setOpenedCatalog(channel);
    setLastCatalog(channel);
    setActiveView('home');
    window.requestAnimationFrame(() => {
      document.querySelector('.catalog-detail')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  function goBackView() {
    if (openedCatalog) {
      setLastCatalog(openedCatalog);
      setOpenedCatalog(null);
      return;
    }

    if (activeView !== 'home') setActiveView('home');
  }

  function goForwardView() {
    if (!openedCatalog && lastCatalog) {
      openCatalog(lastCatalog);
    }
  }

  function formatTime(seconds = 0) {
    if (!Number.isFinite(seconds) || seconds <= 0) return '0:00';
    const minutes = Math.floor(seconds / 60);
    const safeSeconds = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${minutes}:${safeSeconds}`;
  }

  function playPreviousFromQueue() {
    const queue = (playbackQueue.length > 0 ? playbackQueue : getFallbackQueue()).filter((track) => isTrackPlayableNow(track));
    if (queue.length === 0) return;

    const currentIndex = queue.findIndex((track) => track.id === currentTrack?.id);
    const previousIndex = currentIndex > 0 ? currentIndex - 1 : queue.length - 1;
    playTrackQueue(queue, previousIndex);
  }

  function playRandomTrack(toggleMode = true) {
    const queue = getFallbackQueue();
    if (queue.length === 0) {
      setMessage('Sube una canción para usar aleatorio.');
      return;
    }

    if (toggleMode) setShuffleOn((enabled) => !enabled);
    const currentIndex = queue.findIndex((track) => track.id === currentTrack?.id);
    const choices = queue.length > 1 ? queue.filter((_, index) => index !== currentIndex) : queue;
    const randomTrack = choices[Math.floor(Math.random() * choices.length)];
    playTrackQueue(queue, Math.max(queue.findIndex((track) => track.id === randomTrack.id), 0));
  }

  function toggleRepeat() {
    setRepeatOn((enabled) => {
      const next = !enabled;
      if (audioRef.current) audioRef.current.loop = next;
      return next;
    });
  }

  function toggleMute() {
    setMuted((isMuted) => {
      const next = !isMuted;
      if (!next && volume <= 0) {
        setPlayerVolume(85);
      } else if (audioRef.current) {
        audioRef.current.muted = next;
      }
      return next;
    });
  }

  function setPlayerVolume(value) {
    const clamped = Math.min(Math.max(Math.round(Number(value) || 0), 0), 100);
    setVolume(clamped);
    setMuted(clamped === 0);
    localStorage.setItem('shigatsu-volume', String(clamped));
    if (audioRef.current) {
      audioRef.current.volume = clamped / 100;
      audioRef.current.muted = clamped === 0;
    }
    if (currentTrackIsYoutube && youtubePlayerReadyRef.current) {
      const player = youtubePlayerRef.current;
      player?.setVolume?.(clamped);
      if (clamped === 0) {
        player?.mute?.();
      } else {
        player?.unMute?.();
      }
    }
  }

  function changeVolume(event) {
    setPlayerVolume(event.target.value);
  }

  function stepVolume(delta) {
    setPlayerVolume((muted ? 0 : volume) + Math.sign(delta) * volumeStep);
  }

  function handleVolumeKeyDown(event) {
    const keySteps = {
      ArrowDown: -volumeStep,
      ArrowLeft: -volumeStep,
      PageDown: -volumeStep,
      ArrowRight: volumeStep,
      ArrowUp: volumeStep,
      PageUp: volumeStep
    };

    if (event.key === 'Home') {
      event.preventDefault();
      setPlayerVolume(0);
      return;
    }

    if (event.key === 'End') {
      event.preventDefault();
      setPlayerVolume(100);
      return;
    }

    if (keySteps[event.key]) {
      event.preventDefault();
      stepVolume(keySteps[event.key]);
    }
  }

  function isOfflineCapableTrack(track) {
    return Boolean(track?.audio_url && !isYoutubeUrl(track.audio_url) && !track.storage_path?.startsWith('youtube:'));
  }

  function isTrackPlayableNow(track) {
    if (!appOfflineMode) return Boolean(track?.audio_url);
    return Boolean(isOfflineCapableTrack(track) && offlineTrackIds.includes(track.id));
  }

  async function cacheTrackForOffline(track, showSuccess = true) {
    if (!track) return false;

    if (!isOfflineCapableTrack(track)) {
      setMessage('Las canciones de YouTube no se pueden guardar sin internet. Usa Canciones subidas como archivo.');
      return false;
    }

    if (!('caches' in window)) {
      setMessage('Este navegador no permite guardar canciones offline.');
      return false;
    }

    if (!navigator.onLine) {
      setMessage('Necesitas internet para guardar esta canción sin conexión.');
      return false;
    }

    try {
      const response = await fetch(track.audio_url, { mode: 'cors' });
      if (!response.ok) throw new Error('No se pudo descargar la canción.');

      const cache = await caches.open(audioCacheName);
      await cache.put(track.audio_url, response);

      setOfflineTrackIds((current) => {
        if (current.includes(track.id)) return current;
        const next = [...current, track.id];
        if (user?.id) localStorage.setItem(`offlineTracks:${user.id}`, JSON.stringify(next));
        return next;
      });

      if (showSuccess) {
        showSaveNotice('canción disponible sin internet.');
        setMessage('canción disponible sin internet en este teléfono.');
      }
      return true;
    } catch {
      if (showSuccess) setMessage('No se pudo guardar offline. Revisa internet o permisos del archivo.');
      return false;
    }
  }

  async function cachePublicAudioTracksForOffline(trackList) {
    if (!navigator.onLine || !('caches' in window)) return;

    const publicAudioTracks = trackList.filter((track) => (
      isOfflineCapableTrack(track) && !offlineTrackIds.includes(track.id)
    ));
    if (publicAudioTracks.length === 0) return;

    for (const track of publicAudioTracks.slice(0, 8)) {
      await cacheTrackForOffline(track, false);
    }
  }

  function showSaveNotice(text = 'canción guardada') {
    setSaveNotice(text);
    window.setTimeout(() => setSaveNotice((current) => (current === text ? '' : current)), 2400);
  }

  function showPlayerMessage(text) {
    setMessage(text);
    window.setTimeout(() => setMessage((current) => (current === text ? '' : current)), 2200);
  }

  function updateAudioProgress(event) {
    const audio = event.currentTarget;
    if (!audio.duration) {
      setProgress(0);
      setCurrentTime(0);
      setDuration(0);
      return;
    }

    setProgress((audio.currentTime / audio.duration) * 100);
    setCurrentTime(audio.currentTime);
    setDuration(audio.duration);
  }

  function playNextFromQueue() {
    if (shuffleOn) {
      playRandomTrack(false);
      return;
    }

    const activeQueue = playbackQueue.filter((track) => isTrackPlayableNow(track));

    if (activeQueue.length > 0) {
      const currentIndex = activeQueue.findIndex((track) => track.id === currentTrack?.id);
      const activeIndex = currentIndex >= 0 ? currentIndex : Math.min(queueIndex, activeQueue.length - 1);
      const nextIndex = activeIndex < activeQueue.length - 1 ? activeIndex + 1 : 0;
      const nextTrack = activeQueue[nextIndex];
      setPlaybackQueue(activeQueue);
      setQueueIndex(nextIndex);
      setCurrentTrack(nextTrack);
      setActiveChannel(getDisplayChannelByGenre(nextTrack.genre));
      setProgress(0);
      setCurrentTime(0);
      setDuration(0);
      recordTrackPlay(nextTrack);
      setIsPlaying(true);
      return;
    }

    const queue = getFallbackQueue();
    if (queue.length > 0) {
      const currentIndex = queue.findIndex((track) => track.id === currentTrack?.id);
      const nextIndex = currentIndex >= 0 && currentIndex < queue.length - 1 ? currentIndex + 1 : 0;
      playTrackQueue(queue, nextIndex);
      return;
    }

    setIsPlaying(false);
  }

  function toggleFolderTrack(index) {
    const queue = activeFolderItems.map((item) => item.tracks).filter(Boolean);
    const selectedTrack = queue[index];
    if (!selectedTrack) return;

    if (currentTrack?.id === selectedTrack.id) {
      setIsPlaying((playing) => !playing);
      return;
    }

    playTrackQueue(queue, index);
  }

  async function searchTrackMetadata() {
    const term = [trackForm.title, trackForm.artist].filter(Boolean).join(' ').trim();

    if (!term) {
      setMessage('Escribe el nombre de la canción para buscar la portada.');
      return;
    }

    setSearchingMetadata(true);
    setMessage('');

    try {
      const response = await fetch(
        `https://itunes.apple.com/search?media=music&entity=song&limit=6&term=${encodeURIComponent(term)}`
      );
      const data = await response.json();
      const results = (data.results ?? []).map((item) => ({
        title: item.trackName || '',
        artist: item.artistName || '',
        album: item.collectionName || '',
        genre: guessGenre(item.primaryGenreName),
        custom_genre: guessGenre(item.primaryGenreName) === 'otros' ? item.primaryGenreName || 'otros' : '',
        cover_url: item.artworkUrl100?.replace('100x100bb', '600x600bb') || '',
        metadata_source: 'iTunes Search'
      }));

      setMetadataResults(results);

      if (results[0]) {
        applyMetadata(results[0]);
        setMessage('Datos encontrados. Puedes cambiar cualquier campo antes de subir.');
      } else {
        setMessage('No encontre datos para esa canción. Puedes llenar la portada manualmente.');
      }
    } catch (error) {
      setMessage('No se pudo buscar la portada. Revisa tu conexión o pega una URL manual.');
    } finally {
      setSearchingMetadata(false);
    }
  }

  function applyMetadata(metadata) {
    setSelectedMetadataKey(`${metadata.title || ''}-${metadata.artist || ''}-${metadata.album || ''}`);
    setTrackForm((current) => ({
      ...current,
      artist: metadata.artist || current.artist,
      album: metadata.album || current.album,
      genre: metadata.genre || current.genre,
      custom_genre: metadata.custom_genre || '',
      cover_mode: metadata.cover_url ? 'url' : current.cover_mode,
      cover_url: metadata.cover_url || current.cover_url,
      cover_file: metadata.cover_url ? null : current.cover_file,
      metadata_source: metadata.metadata_source || current.metadata_source
    }));
  }

  function metadataIsSelected(metadata) {
    return selectedMetadataKey === `${metadata.title || ''}-${metadata.artist || ''}-${metadata.album || ''}`;
  }

  if (loading) {
    return <main className="splash"><Disc3 className="spin" /> Cargando {brandName}...</main>;
  }

  if (!user || passwordRecoveryMode) {
    return (
      <main className="auth-page">
        <section className="auth-hero">
          <div className="brand-mark sakura-brand"><img src={sakuraIcon} alt={`${brandJapanese} ${brandName}`} /></div>
          <h1>{brandName}</h1>
          <span className="creator-credit">Creado por {creatorName}</span>
          <p>{brandJapanese} - tu espacio para anime, metal, rock, K-pop y pop con energía de primaverá nocturna.</p>
          <div className="hero-strip">
            {channels.map((channel) => <img key={channel.id} src={channel.image} alt={channel.name} />)}
          </div>
        </section>

        <section className="auth-card">
          {passwordRecoveryMode && (
            <div className="reset-heading">
              <h2>Crear nueva contraseña</h2>
              <p>Escribe una contraseña nueva para volver a entrar.</p>
            </div>
          )}
          {authMode === 'forgot' && !passwordRecoveryMode && (
            <div className="reset-heading">
              <h2>Recuperar contraseña</h2>
              <p>Escribe tu correo y te enviaremos un enlace para cambiarla.</p>
            </div>
          )}
          {!passwordRecoveryMode && authMode !== 'forgot' && (
            <>
              <button className="google-button" type="button" onClick={signInWithGoogle}>
                <img className="google-logo" src={googleLogo} alt="" />
                Continuar con Google
              </button>
              <div className="divider"><span>o</span></div>
            </>
          )}
          <form onSubmit={handleEmailAuth}>
            {authMode === 'register' && !passwordRecoveryMode && (
              <label>
                Nombre
                <input value={authForm.username} onChange={(event) => setAuthForm({ ...authForm, username: event.target.value })} placeholder="Enrique" />
              </label>
            )}
            {!passwordRecoveryMode && (
              <label>
                Correo
                <input type="email" value={authForm.email} onChange={(event) => setAuthForm({ ...authForm, email: event.target.value })} placeholder="tu@email.com" />
              </label>
            )}
            {authMode !== 'forgot' && (
              <label>
                {passwordRecoveryMode ? 'Nueva contraseña' : 'Contraseña'}
                <input type="password" value={authForm.password} onChange={(event) => setAuthForm({ ...authForm, password: event.target.value })} placeholder="mínimo 6 caracteres" />
              </label>
            )}
            <button className="primary" type="submit">
              {authMode === 'login' ? <Lock size={18} /> : (authMode === 'forgot' || passwordRecoveryMode ? <KeyRound size={18} /> : <UserPlus size={18} />)}
              {passwordRecoveryMode ? 'Guardar contraseña' : (authMode === 'forgot' ? 'Enviar enlace' : (authMode === 'login' ? 'Iniciar sesión' : 'Crear cuenta'))}
            </button>
          </form>
          {authMode === 'login' && !passwordRecoveryMode && (
            <button className="forgot-button" type="button" onClick={() => {
              setMessage('');
              setAuthMode('forgot');
            }}>
              Olvidé mi contraseña
            </button>
          )}
          {!passwordRecoveryMode && <button className="ghost" type="button" onClick={() => {
            setMessage('');
            setAuthMode(authMode === 'login' ? 'register' : 'login');
          }}>
            {authMode === 'login' ? 'Crear una cuenta nueva' : 'Ya tengo cuenta'}
          </button>}
          {message && <p className="message">{message}</p>}
        </section>
      </main>
    );
  }

  const displayName = getDisplayName(user, profile);
  const avatar = getAvatar(user, profile);

  return (
    <main className={`app-shell ${currentTrack ? 'has-player' : 'no-player'}`}>
      <aside className="sidebar">
        <div className="brand-mark sakura-brand"><img src={sakuraIcon} alt={`${brandJapanese} ${brandName}`} /></div>
        <span className="creator-credit">Creado por {creatorName}</span>
        <nav>
          <button className={activeView === 'home' ? 'nav-active' : ''} onClick={() => setActiveView('home')}><Home size={19} /> Inicio</button>
          <button className={activeView === 'search' ? 'nav-active' : ''} onClick={focusSearchView}><Search size={19} /> Buscar</button>
          <button
            className={activeView === 'folders' ? 'nav-active' : ''}
            onClick={() => {
              setActiveView('folders');
            }}
          >
            <Library size={19} /> Tu biblioteca
          </button>
          <button className={activeView === 'upload' ? 'nav-active' : ''} onClick={() => setActiveView('upload')}><Upload size={19} /> Subir canción</button>
          <button className={activeView === 'premium' ? 'nav-active' : ''} onClick={openPremiumView}><Crown size={19} /> Premium</button>
        </nav>
        <span className="sidebar-section-title">Playlists</span>
        <div className="genre-list">
          {visibleLibraryFolders.map((folder) => {
            const folderName = folder.is_preview || isLikesFolderName(folder.name) ? 'Tus me gusta' : folder.name;
            const isLikesFolder = folder.is_preview || isLikesFolderName(folder.name);
            const likesFolderIds = new Set(likesFolders.map((likesItem) => likesItem.id));
            const items = isLikesFolder
              ? folderTracks.filter((item) => likesFolderIds.has(item.folder_id) && canCurrentUserSeeTrack(item.tracks))
              : folderTracks.filter((item) => item.folder_id === folder.id && canCurrentUserSeeTrack(item.tracks));
            const color = getFolderDisplayColor(folder);
            const coverUrls = getFolderCoverUrls(folder, items);
            return (
            <button
              key={folder.id}
              className={activeView === 'folders' && activeFolder?.id === folder.id ? 'selected' : ''}
              style={{ '--playlist-color': color }}
              onClick={() => {
                setActiveFolderId(folder.id);
                setActiveView('folders');
              }}
            >
              <span className={`playlist-cover sidebar-playlist-cover ${coverUrls.length > 1 ? 'mosaic' : ''}`}>
                {coverUrls.length > 0 ? coverUrls.map((coverUrl) => <img src={coverUrl} alt="" key={coverUrl} />) : null}
                {coverUrls.length === 0 && (isLikesFolder ? <Heart size={18} fill="currentColor" /> : <Music2 size={17} />)}
              </span>
              <strong>{folderName}</strong>
            </button>
            );
          })}
        </div>
      </aside>

      <section className="main-view">
        <header className="topbar">
          <div className="mobile-brand sakura-brand"><img src={sakuraIcon} alt={`${brandJapanese} ${brandName}`} /></div>
          <div className="nav-arrows">
            <button className="icon-button" type="button" onClick={goBackView} title="Atras">
              <ChevronLeft size={23} />
            </button>
            <button className="icon-button" type="button" onClick={goForwardView} disabled={Boolean(openedCatalog) || !lastCatalog} title="Adelante">
              <ChevronRight size={23} />
            </button>
          </div>
          <label className="search-box">
            <Search size={18} />
            <input ref={searchInputRef} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar anime, metal, rock, k-pop o pop" />
          </label>
          <div className="toolbar" ref={menuRef}>
            <button className="icon-button notification-button" type="button" title="Notificaciones" onClick={openNotifications}>
              <Bell size={19} />
              {unreadNotifications > 0 && <span>{unreadNotifications}</span>}
            </button>
            <button className="icon-button" type="button" title="Actualizar página" onClick={() => window.location.reload()}>
              <RefreshCw size={19} />
            </button>
            <button className="profile-button" onClick={() => setProfileOpen((open) => !open)}>
              <img src={avatar} alt={displayName} />
              <strong>{displayName}</strong>
              <ChevronDown size={16} />
            </button>
            {notificationsOpen && (
              <section className="notifications-menu">
                <h2>Notificaciones</h2>
                {recentNotifications.length === 0 && <p>No hay notificaciones nuevas.</p>}
                {recentNotifications.map((track) => (
                  <button
                    key={track.id}
                    type="button"
                    onClick={() => {
                      selectTrack(track);
                      setNotificationsOpen(false);
                    }}
                  >
                    <img src={track.cover_url || getDisplayChannelByGenre(track.genre).image} alt={track.title} />
                    <span>
                      <strong>Nueva canción subida</strong>
                      <small>{track.title} - {track.artist}</small>
                    </span>
                  </button>
                ))}
              </section>
            )}
            {profileOpen && (
              <section className="gmail-menu">
                <button className="close-profile" type="button" onClick={() => setProfileOpen(false)}><X size={18} /></button>
                <div className="gmail-card">
                  <img src={avatar} alt={displayName} />
                  <h2>{displayName}</h2>
                  <p>{user.email}</p>
                </div>
                <div className="gmail-actions">
                  <button onClick={() => setEditingProfile((editing) => !editing)}><Edit3 size={18} /> Personalizar perfil</button>
                  <button><KeyRound size={18} /> contraseñas y Autocompletar</button>
                  <button><ShieldCheck size={18} /> Gestionar cuenta de Google</button>
                  <button><Settings size={18} /> Sincronizacion activada</button>
                  <button onClick={signOut}><LogOut size={18} /> Cerrar este perfil</button>
                </div>
                {editingProfile && (
                  <form className="profile-editor" onSubmit={saveProfile}>
                    <img className="profile-avatar-preview" src={avatarPreviewUrl || profileForm.avatar_url || avatar} alt="Vista previa del perfil" />
                    <label>Nombre<input value={profileForm.username} onChange={(event) => setProfileForm({ ...profileForm, username: event.target.value })} /></label>
                    <div className="avatar-mode-tabs">
                      <button className={avatarMode === 'url' ? 'active' : ''} type="button" onClick={() => setAvatarMode('url')}>URL</button>
                      <button className={avatarMode === 'file' ? 'active' : ''} type="button" onClick={() => setAvatarMode('file')}>Subir foto</button>
                    </div>
                    {avatarMode === 'url' ? (
                      <label>URL avatar<input value={profileForm.avatar_url} onChange={(event) => setProfileForm({ ...profileForm, avatar_url: event.target.value })} /></label>
                    ) : (
                      <label className="profile-avatar-picker">
                        Subir foto
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(event) => setAvatarFile(event.target.files?.[0] ?? null)}
                        />
                        <span>{avatarFile?.name || 'Selecciona una imagen'}</span>
                      </label>
                    )}
                    <button className="primary" type="submit" disabled={savingProfile}>
                      {savingProfile ? 'Guardando...' : 'Guardar perfil'}
                    </button>
                  </form>
                )}
              </section>
            )}
          </div>
        </header>

        {trackInfoOpen && currentTrack && (
          <section className="modal-backdrop" onClick={() => setTrackInfoOpen(false)}>
            <article className="track-info-modal" onClick={(event) => event.stopPropagation()}>
              <button className="close-profile" type="button" onClick={() => setTrackInfoOpen(false)}><X size={18} /></button>
              <img src={currentTrack.cover_url || activeChannel.image} alt={currentTrack.title} />
              <div>
                <section className="track-info-now-playing">
                  <h3>{currentTrack.title}</h3>
                  <p>{currentTrack.artist || 'Sin artista'}</p>
                  <div className={`progress ${canPlay ? '' : 'empty'}`}><span style={{ width: `${canPlay ? progress : 0}%` }} /></div>
                  <div className="track-info-times">
                    <span>{formatTime(currentTime)}</span>
                    <span>{formatTime(duration)}</span>
                  </div>
                  <div className="track-info-controls">
                    <button type="button" onClick={playPreviousFromQueue} title="Anterior"><SkipBack size={24} fill="currentColor" /></button>
                    <button className="track-info-play" type="button" onClick={togglePlayer} title={isPlaying ? 'Pausar' : 'Reproducir'}>
                      {isPlaying && canPlay ? <Pause size={28} /> : <Play size={28} fill="currentColor" />}
                    </button>
                    <button type="button" onClick={playNextFromQueue} title="Siguiente"><SkipForward size={24} fill="currentColor" /></button>
                    <button className={currentTrackLiked ? 'liked' : ''} type="button" onClick={() => addTrackToLikes(currentTrack)} title="Me gusta">
                      <Heart size={24} fill={currentTrackLiked ? 'currentColor' : 'none'} />
                    </button>
                  </div>
                  <div className="track-info-volume">
                    <button className="volume-step-button" type="button" onClick={() => stepVolume(-1)} title="Bajar volumen" aria-label="Bajar volumen">
                      <Minus size={20} />
                    </button>
                    <button className={muted ? 'active' : ''} type="button" onClick={toggleMute} title={muted ? 'Activar volumen' : 'Silenciar'} aria-label={muted ? 'Activar volumen' : 'Silenciar'}>
                      <Volume2 size={20} />
                    </button>
                    <input
                      className="volume-slider"
                      type="range"
                      min="0"
                      max="100"
                      step="1"
                      value={muted ? 0 : volume}
                      onChange={changeVolume}
                      onKeyDown={handleVolumeKeyDown}
                      title="Subir o bajar volumen"
                      aria-label="Subir o bajar volumen"
                      style={{ '--volume': `${muted ? 0 : volume}%` }}
                    />
                    <strong>{muted ? 0 : volume}%</strong>
                    <button className="volume-step-button" type="button" onClick={() => stepVolume(1)} title="Subir volumen" aria-label="Subir volumen">
                      <Plus size={20} />
                    </button>
                  </div>
                </section>
                <span className="eyebrow"><Info size={16} /> información</span>
                <h2>{currentTrack.title}</h2>
                <dl>
                  <div><dt>Artista</dt><dd>{currentTrack.artist || 'Sin dato'}</dd></div>
                  <div><dt>Album</dt><dd>{currentTrack.album || 'Sin dato'}</dd></div>
                  <div><dt>género</dt><dd>{currentTrack.genre || 'Sin dato'}</dd></div>
                  <div><dt>Fuente de datos</dt><dd>{getTrackMetadataSource(currentTrack)}</dd></div>
                  <div><dt>Estado</dt><dd>{isPlaying ? 'Activa' : 'Pausada'}</dd></div>
                </dl>
                {isAdmin && (
                  <form className="track-edit-form" onSubmit={saveTrackDetails}>
                    <label>Titulo<input value={trackEditForm.title} onChange={(event) => setTrackEditForm({ ...trackEditForm, title: event.target.value })} /></label>
                    <label>Artista<input value={trackEditForm.artist} onChange={(event) => setTrackEditForm({ ...trackEditForm, artist: event.target.value })} /></label>
                    <label>Album<input value={trackEditForm.album} onChange={(event) => setTrackEditForm({ ...trackEditForm, album: event.target.value })} /></label>
                    <label>
                      Categoria
                      <select value={trackEditForm.genre} onChange={(event) => setTrackEditForm({ ...trackEditForm, genre: event.target.value })}>
                        {channels.map((channel) => <option key={channel.id} value={channel.id}>{channel.name}</option>)}
                        {customGenreOptions.length > 0 && (
                          <optgroup label="Categorias guardadas">
                            {customGenreOptions.map((genre) => <option key={genre} value={genre}>{genre}</option>)}
                          </optgroup>
                        )}
                      </select>
                    </label>
                    {trackEditForm.genre === 'otros' && (
                      <label>género personalizado<input value={trackEditForm.custom_genre} onChange={(event) => setTrackEditForm({ ...trackEditForm, custom_genre: event.target.value })} /></label>
                    )}
                    <label>URL portada<input value={trackEditForm.cover_url} onChange={(event) => setTrackEditForm({ ...trackEditForm, cover_url: event.target.value })} /></label>
                    <button className="primary" type="submit">Guardar cambios</button>
                  </form>
                )}
                <div className="track-actions">
                  <button
                    className={`like-button ${currentTrackLiked ? 'liked' : ''}`}
                    type="button"
                    onClick={() => addTrackToLikes(currentTrack)}
                    title="Guardar en Me gusta"
                  >
                    <Heart size={18} fill={currentTrackLiked ? 'currentColor' : 'none'} />
                    {currentTrackLiked ? 'En Me gusta' : 'Me gusta'}
                  </button>
                  {canStream && (
                    <button
                      className={`like-button ${currentTrackOffline ? 'liked' : ''}`}
                      type="button"
                      onClick={() => cacheTrackForOffline(currentTrack)}
                      title="Guardar para escuchar sin internet"
                    >
                      <Download size={18} />
                      {currentTrackOffline ? 'Disponible sin internet' : 'Guardar sin internet'}
                    </button>
                  )}
                  <label>
                    Agregar carpeta
                    <span className="folder-picker">
                      <select
                        value={selectedFolderId}
                        onChange={(event) => {
                          setSelectedFolderId(event.target.value);
                          if (event.target.value === '__new__') {
                            setFolderForm({ ...folderForm, name: '', is_shared: false, share_email: '' });
                          }
                        }}
                      >
                        <option value="">Elige carpeta</option>
                        {libraryFolders.filter((folder) => !folder.is_preview).map((folder) => (
                          <option key={folder.id} value={folder.id}>{folder.name}</option>
                        ))}
                        <option value="__new__">Otro</option>
                      </select>
                      <button
                        className="folder-add-button"
                        type="button"
                        disabled={!selectedFolderId || (selectedFolderId === '__new__' && !folderForm.name.trim())}
                        onClick={addCurrentTrackToSelectedFolder}
                      >
                        Agregar carpeta
                      </button>
                    </span>
                  </label>
                  {selectedFolderId === '__new__' && (
                    <div className="modal-new-folder">
                      <label>
                        Nombre de carpeta
                        <input
                          value={folderForm.name}
                          onChange={(event) => setFolderForm({ ...folderForm, name: event.target.value })}
                          placeholder="Nueva playlist"
                        />
                      </label>
                      <label className="modal-share-row">
                        <input
                          type="checkbox"
                          checked={folderForm.is_shared}
                          onChange={(event) => setFolderForm({
                            ...folderForm,
                            is_shared: event.target.checked,
                            share_email: event.target.checked ? folderForm.share_email : ''
                          })}
                        />
                        Compartida
                      </label>
                      {folderForm.is_shared && (
                        <label>
                          Correo del amigo
                          <input
                            type="email"
                            value={folderForm.share_email}
                            onChange={(event) => setFolderForm({ ...folderForm, share_email: event.target.value })}
                            placeholder="amigo@email.com"
                          />
                        </label>
                      )}
                    </div>
                  )}
                </div>
                <a href={currentTrack.audio_url} target="_blank" rel="noreferrer">
                  {currentTrackIsYoutube ? 'Abrir en YouTube' : 'Abrir archivo de audio'}
                </a>
              </div>
            </article>
          </section>
        )}

        <section className="hero hero-image-title" style={{ '--accent': activeChannel.accent, '--hero-image': `url(${sakuraHeroImage})` }}>
          <img className="hero-letter" src={sakuraLetterImage} alt={`${brandName} ${brandJapanese}`} />
          <div className="hero-cta">
            <div className="hero-actions">
              <button className={`play-status ${canPlay && isPlaying ? 'playing' : ''}`} type="button" onClick={togglePlayer}>
                {canPlay && isPlaying ? <Pause size={18} /> : <Play size={18} />}
                {canPlay ? (isPlaying ? 'Pausar' : 'Reproducir') : 'Elige una canción'}
              </button>
              <button className="follow-button" type="button" onClick={saveCurrentFromHero}><Heart size={19} fill={currentTrackLiked ? 'currentColor' : 'none'} /> Guardar</button>
            </div>
          </div>
        </section>

        <section className="content-grid">
          {message && <p className="app-message">{message}</p>}
          {appOfflineMode && <p className="app-message">Sin internet: mostrando solo canciones guardadas en este teléfono.</p>}

          {(activeView === 'home' || activeView === 'search') && (
            <>
              <div className="section-head">
                <h2><span className="section-flower">✿</span> Categorias</h2>
                <button
                  className="show-all-button"
                  type="button"
                  onClick={() => {
                    setShowAllMixes((current) => !current);
                    setOpenedCatalog(null);
                  }}
                >
                  {showAllMixes ? 'Ver principales' : 'Mostrar todo'}
                </button>
              </div>
              <div className="playlist-grid">
                {visibleChannels.map((channel) => (
                  (() => {
                    const channelTracks = playablePublicTracks.filter((track) => trackMatchesChannel(track, channel));
                    const isChannelCurrent = currentTrack && trackMatchesChannel(currentTrack, channel);
                    return (
                      <article
                        className={`playlist-card spotify-mix ${openedCatalog?.id === channel.id ? 'selected' : ''} ${isChannelCurrent ? 'playing' : ''}`}
                        key={channel.id}
                        style={{ '--accent': channel.accent }}
                        onClick={() => openCatalog(channel)}
                      >
                        <div className="mix-art">
                          <img src={channel.image} alt={channel.name} />
                          <span className="spotify-dot" />
                          <span className="mix-label">{channel.name} Mix</span>
                          <button
                            className={`mini-play ${isChannelCurrent && isPlaying ? 'is-playing' : ''}`}
                            disabled={channelTracks.length === 0}
                            title={isChannelCurrent && isPlaying ? 'Pausar' : 'Reproducir todo este catálogo'}
                            onClick={(event) => {
                              event.stopPropagation();
                              toggleQueue(channelTracks);
                            }}
                          >
                            {isChannelCurrent && isPlaying ? <Pause size={24} /> : <Play size={24} fill="currentColor" />}
                          </button>
                        </div>
                        {isAdmin && (
                          <div className="admin-cover-editor" onClick={(event) => event.stopPropagation()}>
                            <input
                              value={categoryCoverForms[channel.id] ?? categoryCovers[channel.id] ?? channel.image}
                              onChange={(event) => setCategoryCoverForms((current) => ({ ...current, [channel.id]: event.target.value }))}
                              placeholder="URL de portada"
                            />
                            <label className="admin-cover-upload">
                              Subir imagen
                              <input
                                type="file"
                                accept="image/*"
                                onChange={(event) => uploadCategoryCoverImage(channel, event.target.files?.[0])}
                              />
                            </label>
                            <button type="button" onClick={() => saveCategoryCover(channel)}>Guardar portada</button>
                          </div>
                        )}
                        <h3>{channel.name} Mix</h3>
                        <p>{channel.mood}</p>
                      </article>
                    );
                  })()
                ))}
              </div>

              {openedCatalog && (
                <article className="catalog-detail" style={{ '--catalog-accent': openedCatalog.accent }}>
                  <header className="catalog-hero">
                    <div className="catalog-cover">
                      <img src={openedCatalog.image} alt={`${openedCatalog.name} Mix`} />
                      <span>{openedCatalog.name} Mix</span>
                    </div>
                    <div>
                      <span>Playlist pública</span>
                      <h2>{openedCatalog.name} Mix</h2>
                      <p>{openedCatalog.mood}</p>
                      <strong>BeatBox - {openedCatalogTracks.length || openedCatalog.tracks.length} canciones</strong>
                    </div>
                  </header>

                  <div className="catalog-actions">
                    <button
                      className="playlist-play"
                      type="button"
                      disabled={!openedCatalogTracks[0]}
                      onClick={() => toggleQueue(openedCatalogTracks)}
                    >
                      {currentTrack && openedCatalogTracks.some((track) => track.id === currentTrack.id) && isPlaying ? <Pause size={26} /> : <Play size={26} fill="currentColor" />}
                    </button>
                    <button type="button"><Plus size={25} /></button>
                    <button type="button"><Search size={22} /></button>
                    <span>Orden personalizado</span>
                  </div>

                  <div className="playlist-chips">
                    <span>Descubrir más</span>
                    <span>{openedCatalog.name}</span>
                    <span>Favoritas</span>
                    <span>Nuevas</span>
                  </div>

                  <div className="catalog-table">
                    <div className="playlist-table-head">
                      <span>#</span>
                      <span>Titulo</span>
                      <span>Album</span>
                      <span></span>
                    </div>
                    {openedCatalogTracks.length === 0 && (
                      <p className="empty-state">{appOfflineMode ? 'No hay canciones guardadas sin internet en este catálogo.' : 'todavía no hay Canciones subidas en este catálogo.'}</p>
                    )}
                    {openedCatalogTracks.map((track, index) => (
                      <div className={`playlist-track ${currentTrack?.id === track.id ? 'playing' : ''}`} key={track.id}>
                        <span>{currentTrack?.id === track.id ? <Play size={16} fill="currentColor" /> : index + 1}</span>
                        <img src={track.cover_url || openedCatalog.image} alt={track.title} />
                        <button type="button" onClick={() => playTrackQueue(openedCatalogTracks, index)}>
                          <strong>{track.title}</strong>
                          <small>{track.artist}</small>
                        </button>
                        <span>{track.album || 'Single'}</span>
                        <button
                          className={`like-icon-button ${likedTrackIds.has(track.id) ? 'liked' : ''}`}
                          type="button"
                          onClick={() => addTrackToLikes(track)}
                          title="Guardar en Me gusta"
                        >
                          <Heart size={16} fill={likedTrackIds.has(track.id) ? 'currentColor' : 'none'} />
                        </button>
                      </div>
                    ))}
                  </div>
                </article>
              )}

              {isAdmin && pendingTracks.length > 0 && (
                <>
                  <div className="section-head"><h2>canciones pendientes</h2><span>{pendingTracks.length} por aprobar</span></div>
                  <div className="track-list pending-track-list">
                    {pendingTracks.map((track) => (
                      <article className="track-row pending-track-row" key={track.id}>
                        <img src={track.cover_url || getDisplayChannelByGenre(track.genre).image} alt={track.title} />
                        <button className="row-play" type="button" onClick={() => selectTrack(track)} title="Revisar esta canción"><Music2 size={16} /></button>
                        <div><strong>{track.title}</strong><span>{track.artist}{track.album ? ` - ${track.album}` : ''}</span></div>
                        <div className="approval-actions">
                          <button className="approve-button" type="button" onClick={() => approveTrack(track)}>Aprobar</button>
                          <button className="reject-button" type="button" onClick={() => rejectTrack(track)}>Rechazar</button>
                        </div>
                      </article>
                    ))}
                  </div>
                </>
              )}

              <div className="section-head recommended-head"><h2><span className="section-flower">✿</span> Canciones recomendadas para ti</h2></div>
              <div className="recommended-list">
                {recommendedTracks.length === 0 && <p className="empty-state">{appOfflineMode ? 'No hay recomendaciones guardadas sin internet en este teléfono.' : 'Sube canciones para crear recomendaciones.'}</p>}
                {recommendedTracks.map((track, index) => (
                  <article
                    className={`recommended-song ${currentTrack?.id === track.id ? 'playing' : ''}`}
                    key={track.id}
                    onClick={() => playTrackQueue(recommendedTracks, index)}
                  >
                    <img src={track.cover_url || getDisplayChannelByGenre(track.genre).image} alt={track.title} />
                    <div>
                      <strong>{track.title}</strong>
                      <span>{track.artist}{track.album ? ` - ${track.album}` : ''}</span>
                    </div>
                    <button
                      className={`like-icon-button ${likedTrackIds.has(track.id) ? 'liked' : ''}`}
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        addTrackToLikes(track);
                      }}
                    >
                      <Heart size={21} fill={likedTrackIds.has(track.id) ? 'currentColor' : 'none'} />
                    </button>
                    <button className="more-button" type="button" onClick={(event) => event.stopPropagation()}>...</button>
                  </article>
                ))}
              </div>

              <div className="section-head"><h2>Canciones subidas</h2><span>{visibleTracks.length} canciones</span></div>
              <div className="track-list">
                {visibleTracks.length === 0 && <p className="empty-state">{appOfflineMode ? 'No hay canciones guardadas sin internet en este teléfono.' : 'todavía no hay Canciones subidas.'}</p>}
                {visibleTracks.map((track, index) => (
                  <article
                    className={`track-row ${currentTrack?.id === track.id ? 'playing' : ''}`}
                    key={track.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => playTrackQueue(visibleTracks, index)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') playTrackQueue(visibleTracks, index);
                    }}
                  >
                    <img src={track.cover_url || activeChannel.image} alt={track.title} />
                    <button
                      className="row-play"
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        playTrackQueue(visibleTracks, index);
                      }}
                      title="Reproducir esta canción"
                    >
                      <Music2 size={16} />
                    </button>
                    <div><strong>{track.title}</strong><span>{track.artist}{track.album ? ` - ${track.album}` : ''}</span></div>
                    <span>{track.genre}</span>
                    <button
                      className={`like-icon-button ${likedTrackIds.has(track.id) ? 'liked' : ''}`}
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        addTrackToLikes(track);
                      }}
                      title="Guardar en Me gusta"
                    >
                      <Heart size={17} fill={likedTrackIds.has(track.id) ? 'currentColor' : 'none'} />
                    </button>
                    {(isAdmin || track.user_id === user.id) && (
                      <button
                        className="danger-button"
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          deleteTrack(track);
                        }}
                      >
                        <Trash2 size={17} />
                      </button>
                    )}
                  </article>
                ))}
              </div>

              {featuredArtists.length > 0 && (
                <>
                  <div className="section-head"><h2>Artistas recomendados</h2><span>Con Canciones subidas</span></div>
                  <div className="artist-row">
                    {featuredArtists.map((artist) => (
                      <article
                        className="artist-card"
                        key={artist.name}
                        role="button"
                        tabIndex={0}
                        onClick={() => artist.track && playTrackQueue(
                          playablePublicTracks.filter((track) => track.artist?.trim().toLowerCase() === artist.name.toLowerCase()),
                          0
                        )}
                        onKeyDown={(event) => {
                          if ((event.key === 'Enter' || event.key === ' ') && artist.track) {
                            event.preventDefault();
                            playTrackQueue(
                              playablePublicTracks.filter((track) => track.artist?.trim().toLowerCase() === artist.name.toLowerCase()),
                              0
                            );
                          }
                        }}
                        title={`Reproducir canciones de ${artist.name}`}
                      >
                        <img src={artist.image} alt={artist.name} />
                        <h3>{artist.name}</h3>
                        <p>{artist.genre}</p>
                      </article>
                    ))}
                  </div>
                </>
              )}
            </>
          )}

          {activeView === 'library' && (
            <>
              <div className="section-head"><h2>Tu biblioteca</h2><span>{ownTracks.length} tuyas</span></div>
              <div className="track-list">
                {ownTracks.length === 0 && <p className="empty-state">{appOfflineMode ? 'No hay canciones tuyas guardadas sin internet en este teléfono.' : 'No has subido canciones todavía.'}</p>}
                {ownTracks.map((track, index, userTracks) => (
                  <article
                    className={`track-row ${currentTrack?.id === track.id ? 'playing' : ''}`}
                    key={track.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => playTrackQueue(userTracks, index)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') playTrackQueue(userTracks, index);
                    }}
                  >
                    <img src={track.cover_url || activeChannel.image} alt={track.title} />
                    <button
                      className="row-play"
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        playTrackQueue(userTracks, index);
                      }}
                      title="Reproducir esta canción"
                    >
                      <Music2 size={16} />
                    </button>
                    <div><strong>{track.title}</strong><span>{track.artist}{track.album ? ` - ${track.album}` : ''}</span></div>
                    <span>{getTrackApprovalStatus(track) === 'pending' ? 'Pendiente' : track.genre}</span>
                    <button
                      className={`like-icon-button ${likedTrackIds.has(track.id) ? 'liked' : ''}`}
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        addTrackToLikes(track);
                      }}
                      title="Guardar en Me gusta"
                    >
                      <Heart size={17} fill={likedTrackIds.has(track.id) ? 'currentColor' : 'none'} />
                    </button>
                    <button
                      className="danger-button"
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        deleteTrack(track);
                      }}
                    >
                      <Trash2 size={17} />
                    </button>
                  </article>
                ))}
              </div>
            </>
          )}

          {activeView === 'folders' && (
            <section className="folders-view">
              <aside className="spotify-library">
                <header>
                  <strong><Library size={22} /> Tu biblioteca</strong>
                  <button
                    type="button"
                    onClick={() => {
                      setCreatingFolder((open) => !open);
                      setFolderForm((current) => ({ ...current, name: current.name || 'Nueva playlist' }));
                    }}
                  >
                    <Plus size={22} /> Crear
                  </button>
                </header>

                <div className="library-tabs">
                  <span>Playlists</span>
                  <span>Albumes</span>
                  <span>Artistas</span>
                </div>

                {creatingFolder && (
                  <form className="library-create-form" onSubmit={createFolder}>
                    <label>
                      Nombre
                      <input value={folderForm.name} onChange={(event) => setFolderForm({ ...folderForm, name: event.target.value })} placeholder="Nueva playlist" />
                    </label>
                    <label>
                      Color
                      <input type="color" value={folderForm.color} onChange={(event) => setFolderForm({ ...folderForm, color: event.target.value })} />
                    </label>
                    <div className="playlist-color-picker" aria-label="Colores de playlist">
                      {playlistColorOptions.map((color) => (
                        <button
                          className={folderForm.color === color ? 'selected' : ''}
                          key={color}
                          type="button"
                          onClick={() => setFolderForm({ ...folderForm, color })}
                          style={{ '--swatch': color }}
                          title={color}
                        />
                      ))}
                    </div>
                    <label className="check-row">
                      <input type="checkbox" checked={folderForm.is_shared} onChange={(event) => setFolderForm({ ...folderForm, is_shared: event.target.checked })} />
                      Compartida
                    </label>
                    {folderForm.is_shared && (
                      <label>
                        Correo
                        <input type="email" value={folderForm.share_email} onChange={(event) => setFolderForm({ ...folderForm, share_email: event.target.value })} placeholder="amigo@email.com" />
                      </label>
                    )}
                    <button className="primary" type="submit"><Plus size={18} /> Crear playlist</button>
                  </form>
                )}

                <div className="library-filter">
                  <Search size={22} />
                  <button type="button" onClick={() => setLibrarySortMode((mode) => mode === 'recent' ? 'name' : 'recent')}>
                    {librarySortMode === 'recent' ? 'recientes' : 'nombre'}
                  </button>
                </div>

                <div className="library-list">
                  {visibleLibraryFolders.map((folder) => {
                    const isLikesFolder = isLikesFolderName(folder.name) || folder.is_preview;
                    const likesFolderIds = new Set(likesFolders.map((likesItem) => likesItem.id));
                    const items = isLikesFolder
                      ? folderTracks.filter((item) => likesFolderIds.has(item.folder_id) && canCurrentUserSeeTrack(item.tracks))
                      : folderTracks.filter((item) => item.folder_id === folder.id && canCurrentUserSeeTrack(item.tracks));
                    const uniqueTrackCount = new Set(items.map((item) => item.track_id)).size;
                    const folderName = isLikesFolder ? 'Tus me gusta' : folder.name;
                    const folderColor = getFolderDisplayColor(folder);
                    const folderCoverUrls = getFolderCoverUrls(folder, items);
                    return (
                      <button
                        className={activeFolder?.id === folder.id ? 'active' : ''}
                        key={folder.id}
                        type="button"
                        onClick={() => setActiveFolderId(folder.id)}
                        style={{ '--playlist-color': folderColor }}
                      >
                        <span className={`playlist-cover ${folderCoverUrls.length > 1 ? 'mosaic' : ''} ${isLikesFolder ? 'liked' : ''}`}>
                          {folderCoverUrls.length > 0 ? folderCoverUrls.map((coverUrl) => <img src={coverUrl} alt="" key={coverUrl} />) : null}
                          {isLikesFolder && folderCoverUrls.length === 0 ? <Heart size={30} fill="currentColor" /> : null}
                          {!isLikesFolder && folderCoverUrls.length === 0 ? <Music2 size={24} /> : null}
                        </span>
                        <span>
                          <strong>{folderName}</strong>
                          <small>{folder.is_preview ? 'Playlist' : folder.shared_with_me ? 'Compartida contigo' : `Playlist - ${uniqueTrackCount} canciones`}</small>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </aside>

              <article className="spotify-playlist" style={{ '--playlist-color': activeFolderColor }}>
                <header className="playlist-hero" style={{ '--playlist-color': activeFolderColor, '--playlist-cover': activeFolderCoverUrl ? `url("${activeFolderCoverUrl}")` : 'none' }}>
                  <div className={`playlist-cover big ${isLikesFolderName(activeFolder?.name) || activeFolder?.is_preview ? 'liked' : ''}`}>
                    {activeFolderCoverUrl ? <img src={activeFolderCoverUrl} alt="" /> : null}
                    {isLikesFolderName(activeFolder?.name) || activeFolder?.is_preview ? (!activeFolderCoverUrl && <Heart size={82} fill="currentColor" />) : (!activeFolderCoverUrl && <Music2 size={62} />)}
                  </div>
                  <div>
                    <span>Playlist</span>
                    <h2>{isLikesFolderName(activeFolder?.name) || activeFolder?.is_preview ? 'Tus me gusta' : activeFolder?.name}</h2>
                    <p>{displayName} - {activeFolderItems.length} canciones</p>
                  </div>
                </header>

                <div className="playlist-tools">
                  <button className="playlist-play" type="button" disabled={!activeFolderItems[0]} onClick={() => toggleQueue(activeFolderItems.map((item) => item.tracks))}>
                    {currentTrack && activeFolderItems.some((item) => item.tracks?.id === currentTrack.id) && isPlaying ? <Pause size={26} /> : <Play size={26} fill="currentColor" />}
                  </button>
                  <button type="button" disabled={!currentTrack || activeFolder?.is_preview} onClick={() => addCurrentTrackToFolder(activeFolder.id)}><Plus size={26} /></button>
                  <button className={playlistSearchOpen ? 'active' : ''} type="button" onClick={() => setPlaylistSearchOpen((open) => !open)} title="Buscar en playlist"><Search size={22} /></button>
                  {!activeFolder?.is_preview && activeFolder?.owner_id === user.id && (
                    <label className="playlist-color-inline" title="Cambiar color de playlist">
                      <input type="color" value={activeFolderColor} onChange={(event) => updatePlaylistColor(activeFolder, event.target.value)} />
                      Color de playlist
                    </label>
                  )}
                  <button className="playlist-sort-button" type="button" onClick={() => setPlaylistSortMode((mode) => mode === 'custom' ? 'recent' : mode === 'recent' ? 'title' : 'custom')}>
                    {playlistSortMode === 'custom' ? 'Orden personalizado' : playlistSortMode === 'recent' ? 'Más recientes' : 'Por título'}
                  </button>
                </div>

                {playlistSearchOpen && (
                  <label className="playlist-search-inline">
                    <Search size={18} />
                    <input value={playlistQuery} onChange={(event) => setPlaylistQuery(event.target.value)} placeholder="Buscar dentro de esta playlist" />
                  </label>
                )}

                <div className="playlist-chips">
                  <button className={playlistGenreFilter === 'all' ? 'active' : ''} type="button" onClick={() => setPlaylistGenreFilter('all')}>
                    Todas
                  </button>
                  {activeFolderGenres.map((genre) => (
                    <button
                      className={playlistGenreFilter === genre ? 'active' : ''}
                      key={genre}
                      type="button"
                      onClick={() => setPlaylistGenreFilter(genre)}
                    >
                      {genre}
                    </button>
                  ))}
                </div>

                <div className="playlist-table">
                  <div className="playlist-table-head">
                    <span>#</span>
                    <span>Titulo</span>
                    <span>Album</span>
                    <span></span>
                  </div>
                  {activeFolderItems.length === 0 && (
                    <p className="empty-state">{folderTablesReady ? (appOfflineMode ? 'No hay canciones guardadas sin internet en esta carpeta.' : 'Guarda canciones con el corazón para verlas aquí.') : 'Completa la configuración de Supabase para activar esta playlist.'}</p>
                  )}
                  {activeFolderItems.map((item, index) => {
                    const track = item.tracks;
                    const isOwner = activeFolder?.owner_id === user.id;
                    return (
                      <div
                        className={`playlist-track ${currentTrack?.id === track.id ? 'playing' : ''}`}
                        key={`${activeFolder.id}-${track.id}`}
                        role="button"
                        tabIndex={0}
                        onClick={() => toggleFolderTrack(index)}
                        onKeyDown={(event) => {
                          if (event.key !== 'Enter' && event.key !== ' ') return;
                          event.preventDefault();
                          toggleFolderTrack(index);
                        }}
                      >
                        <span>{currentTrack?.id === track.id && isPlaying ? <Pause size={16} /> : <Play size={16} fill="currentColor" />}</span>
                        <img src={track.cover_url || activeChannel.image} alt={track.title} />
                        <div className="playlist-track-info">
                          <strong>{track.title}</strong>
                          <small>{track.artist}</small>
                        </div>
                        <span>{track.album || 'Single'}</span>
                        <button
                          className="like-icon-button liked"
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            removeTrackFromFolder(activeFolder.id, track.id);
                          }}
                        >
                          {(isOwner || item.added_by === user.id) ? <X size={16} /> : <Heart size={16} fill="currentColor" />}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </article>
            </section>
          )}

          {activeView === 'upload' && (
            <section className="upload-panel">
              <div>
                <span className="eyebrow"><Music2 size={16} /> Nueva canción</span>
                <h2>Subir canción</h2>
                <p>El archivo se guarda en Supabase Storage y aparece en tu biblioteca.</p>
              </div>
              <form onSubmit={uploadTrack}>
                <div className="upload-source-choice">
                  <button
                    className={trackForm.source_mode === 'file' ? 'active' : ''}
                    type="button"
                    onClick={() => setTrackForm({ ...trackForm, source_mode: 'file', youtube_url: '' })}
                  >
                    Seleccionar archivo
                  </button>
                  <button
                    className={trackForm.source_mode === 'youtube' ? 'active' : ''}
                    type="button"
                    onClick={() => setTrackForm({ ...trackForm, source_mode: 'youtube', audio: null })}
                  >
                    Link de YouTube
                  </button>
                </div>
                {trackForm.source_mode && (
                  <>
                <label>
                  Titulo
                  <input required value={trackForm.title} onChange={(event) => setTrackForm({ ...trackForm, title: event.target.value })} placeholder="Nombre de la canción" />
                </label>
                <label>
                  Artista
                  <input required value={trackForm.artist} onChange={(event) => setTrackForm({ ...trackForm, artist: event.target.value })} placeholder="Artista o banda" />
                </label>
                <button className="lookup-button" type="button" onClick={searchTrackMetadata} disabled={searchingMetadata}>
                  <Search size={18} />
                  {searchingMetadata ? 'Buscando...' : 'Buscar portada y datos'}
                </button>
                {metadataResults.length > 0 && (
                  <div className="metadata-results">
                    {metadataResults.map((result) => (
                      <button
                        className={metadataIsSelected(result) ? 'selected' : ''}
                        type="button"
                        key={`${result.title}-${result.artist}-${result.album}`}
                        onClick={() => applyMetadata(result)}
                      >
                        <img src={result.cover_url || getChannelByGenre(result.genre).image} alt={result.title} />
                        <span><strong>{result.title}</strong><small>{result.artist} - {result.album || result.custom_genre || result.genre}</small></span>
                      </button>
                    ))}
                  </div>
                )}
                <label>
                  Album
                  <input required value={trackForm.album} onChange={(event) => setTrackForm({ ...trackForm, album: event.target.value })} placeholder="Album o single" />
                </label>
                <label>
                  género
                  <div className="genre-picker-scroll">
                    {uploadGenreChoices.map((choice) => (
                      <button
                        className={trackForm.genre === choice.value ? 'selected' : ''}
                        key={choice.value}
                        type="button"
                        onClick={() => setTrackForm({
                          ...trackForm,
                          genre: choice.value,
                          custom_genre: choice.value === 'otros' ? trackForm.custom_genre : ''
                        })}
                      >
                        <span>{choice.label}</span>
                        {choice.custom && <small>Categoria guardada</small>}
                      </button>
                    ))}
                  </div>
                </label>
                {trackForm.genre === 'otros' && (
                  <label>
                    género personalizado
                    <input required value={trackForm.custom_genre} onChange={(event) => setTrackForm({ ...trackForm, custom_genre: event.target.value })} placeholder="Reggaeton, jazz, trap, salsa..." />
                  </label>
                )}
                <div className="upload-source-choice cover-source-choice">
                  <button
                    className={trackForm.cover_mode === 'url' ? 'active' : ''}
                    type="button"
                    onClick={() => setTrackForm({ ...trackForm, cover_mode: 'url', cover_file: null })}
                  >
                    URL portada
                  </button>
                  <button
                    className={trackForm.cover_mode === 'file' ? 'active' : ''}
                    type="button"
                    onClick={() => setTrackForm({ ...trackForm, cover_mode: 'file', cover_url: '' })}
                  >
                    Subir imagen
                  </button>
                </div>
                {trackForm.cover_mode === 'url' ? (
                  <label>
                    Portada por URL
                    <input required type="url" value={trackForm.cover_url} onChange={(event) => setTrackForm({ ...trackForm, cover_url: event.target.value })} placeholder="https://imagen.jpg" />
                  </label>
                ) : (
                  <label className="file-picker">
                    Imagen de portada
                    <input required type="file" accept="image/*" onChange={(event) => setTrackForm({ ...trackForm, cover_file: event.target.files?.[0] ?? null })} />
                    <span>{trackForm.cover_file?.name || 'Selecciona jpg, png, webp...'}</span>
                  </label>
                )}
                {(trackForm.cover_url || trackCoverPreviewUrl) && (
                  <img className="cover-preview" src={trackCoverPreviewUrl || trackForm.cover_url} alt="Portada seleccionada" />
                )}
                {trackForm.source_mode === 'file' ? (
                  <label className="file-picker">
                    Archivo de audio
                    <input required type="file" accept="audio/*,.mp3,.mpeg,.mpga,.wav,.ogg,.webm" onChange={(event) => handleAudioFile(event.target.files?.[0] ?? null)} />
                    <span>{trackForm.audio?.name || 'Selecciona mp3, mpeg, wav, ogg...'}</span>
                  </label>
                ) : (
                  <label>
                    Link de YouTube
                    <input required type="url" value={trackForm.youtube_url} onChange={(event) => setTrackForm({ ...trackForm, youtube_url: event.target.value, audio: null })} placeholder="https://www.youtube.com/watch?v=..." />
                  </label>
                )}
                <button className="primary" type="submit" disabled={uploadingTrack}>
                  <Upload size={18} />
                  {uploadingTrack ? 'Subiendo...' : 'Subir canción'}
                </button>
                  </>
                )}
              </form>
            </section>
          )}

          {activeView === 'premium' && (
            <section className="wellness-panel">
              <div className="wellness-hero">
                <span className="eyebrow"><Crown size={16} /> Tu Bienestar Músical</span>
                <h2>Sakura Health Score</h2>
                <p>Cuida tu energía, tu descanso y tus oidos mientras escuchas Shigatsu no Uta.</p>
                <strong>{wellnessStats.hearingScore}/100</strong>
              </div>

              <div className="wellness-grid">
                <article>
                  <h3>Tiempo escuchado</h3>
                  <dl>
                    <div><dt>Hoy</dt><dd>{formatListenDuration(wellnessStats.todaySeconds)}</dd></div>
                    <div><dt>Esta semana</dt><dd>{formatListenDuration(wellnessStats.weekSeconds)}</dd></div>
                    <div><dt>Este mes</dt><dd>{formatListenDuration(wellnessStats.monthSeconds)}</dd></div>
                    <div><dt>Total</dt><dd>{formatListenDuration(wellnessStats.totalSeconds)}</dd></div>
                  </dl>
                </article>

                <article>
                  <h3>Salud auditiva</h3>
                  <div className="wellness-score-row"><span>Volumen actual</span><strong>{muted ? 0 : volume}%</strong></div>
                  <div className="wellness-meter"><span style={{ width: `${muted ? 0 : volume}%` }} /></div>
                  <p>Recomendado: {wellnessStats.recommendedVolume}% - 80%</p>
                  {wellnessStats.volumeWarning && <p className="wellness-alert">Volumen alto. Baja un poco para no cansar tus oidos.</p>}
                  {wellnessStats.needsBreak && <p className="wellness-alert">Llevas más de 2 horas escuchando. Toma un descanso de 10 minutos.</p>}
                </article>

                <article>
                  <h3>canción del día</h3>
                  {wellnessStats.songOfDay ? (
                    <button className="wellness-track" type="button" onClick={() => playTrackQueue([wellnessStats.songOfDay], 0)}>
                      <img src={wellnessStats.songOfDay.cover_url || getDisplayChannelByGenre(wellnessStats.songOfDay.genre).image} alt={wellnessStats.songOfDay.title} />
                      <span><strong>{wellnessStats.songOfDay.title}</strong><small>{wellnessStats.songOfDay.artist}</small></span>
                    </button>
                  ) : (
                    <p>Escucha algunas canciones para descubrir tu recomendación.</p>
                  )}
                </article>

                <article>
                  <h3>Estadisticas</h3>
                  <dl>
                    <div><dt>Artista más escuchado</dt><dd>{wellnessStats.favoriteArtist}</dd></div>
                    <div><dt>género favorito</dt><dd>{wellnessStats.favoriteGenre}</dd></div>
                    <div><dt>canción favorita</dt><dd>{wellnessStats.favoriteTrack}</dd></div>
                    <div><dt>Racha Músical</dt><dd>{wellnessStats.streak} días</dd></div>
                  </dl>
                </article>

                <article>
                  <h3>Estado de ánimo Músical</h3>
                  <p className="wellness-mood">{wellnessStats.lateNight ? 'Noche' : 'Primavera'} - {wellnessStats.mood}</p>
                  <p>{wellnessStats.lateNight ? 'Se recomienda Música relajante para proteger tu descanso.' : 'Tu energía Músical esta activa para descubrir nuevos mixes.'}</p>
                </article>

                <article>
                  <h3>Logros</h3>
                  <div className="achievement-list">
                    <span className={wellnessStats.totalSeconds >= 360000 ? 'earned' : ''}>Primeras 100 horas</span>
                    <span className={wellnessStats.streak >= 7 ? 'earned' : ''}>7 días seguidos</span>
                    <span className={Object.values(playCounts).reduce((total, count) => total + count, 0) >= 1000 ? 'earned' : ''}>1000 canciones</span>
                    <span className={wellnessStats.hearingScore >= 90 ? 'earned' : ''}>Oidos cuidados</span>
                  </div>
                </article>
              </div>
            </section>
          )}
        </section>
      </section>

      {currentTrack && (
      <footer className="player" style={{ '--accent': activeChannel.accent }}>
        <div
          className="player-track"
          role="button"
          tabIndex={currentTrack ? 0 : -1}
          onClick={openTrackInfo}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') openTrackInfo();
          }}
        >
          {currentTrack ? (
            <>
              <img src={currentTrack.cover_url || recommendedTrack.cover} alt={currentTrack.title} />
              <div><strong>{currentTrack.title}</strong><span>{currentTrack.artist}</span></div>
            </>
          ) : (
            <>
              <span className="player-empty-cover"><Music2 size={22} /></span>
              <div><strong>Elige una canción</strong><span>Sin Música en reproducción</span></div>
            </>
          )}
          <button
            className={`plain-player-button player-heart ${currentTrackLiked ? 'active' : ''}`}
            disabled={!currentTrack}
            onClick={(event) => {
              event.stopPropagation();
              if (currentTrack) addTrackToLikes(currentTrack);
            }}
            title="Guardar en Me gusta"
          >
            <Heart size={21} fill={currentTrackLiked ? 'currentColor' : 'none'} />
          </button>
        </div>

        <div className="player-center">
          <div className="player-controls">
            <button className={`plain-player-button ${shuffleOn ? 'active' : ''}`} type="button" onClick={playRandomTrack} title="Aleatorio"><Shuffle size={18} /></button>
            <button className="plain-player-button" type="button" onClick={playPreviousFromQueue} title="Anterior"><SkipBack size={21} fill="currentColor" /></button>
            <button className="player-toggle" onClick={togglePlayer}>{isPlaying && canPlay ? <Pause size={22} /> : <Play size={22} fill="currentColor" />}</button>
            <button className="plain-player-button" type="button" onClick={playNextFromQueue} title="Siguiente"><SkipForward size={21} fill="currentColor" /></button>
            <button className={`plain-player-button ${repeatOn ? 'active' : ''}`} type="button" onClick={toggleRepeat} title="Repetir"><Repeat2 size={18} /></button>
          </div>
          <div className="player-progress">
            <span>{formatTime(currentTime)}</span>
            <div className={`progress ${canPlay ? '' : 'empty'}`}><span style={{ width: `${canPlay ? progress : 0}%` }} /></div>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        <div className="player-extra">
          <button className="plain-player-button" disabled={!currentTrack} onClick={openTrackInfo} title="Ver información de la canción"><ListMusic size={19} /></button>
          <button className="plain-player-button" type="button" onClick={() => setActiveView('folders')} title="Biblioteca"><Library size={19} /></button>
          <button className={`plain-player-button ${muted ? 'active' : ''}`} type="button" onClick={toggleMute} title={muted ? 'Activar volumen' : 'Silenciar'}><Volume2 size={19} /></button>
          <input
            className="volume-slider"
            type="range"
            min="0"
            max="100"
            step="1"
            value={muted ? 0 : volume}
            onChange={changeVolume}
            onKeyDown={handleVolumeKeyDown}
            title="Subir o bajar volumen"
            style={{ '--volume': `${muted ? 0 : volume}%` }}
          />
          <button className="plain-player-button" type="button" onClick={() => setProfileOpen((open) => !open)} title="Ajustes"><Settings size={18} /></button>
        </div>
        <div className="mobile-volume-panel" aria-label="Control de volumen">
          <button className="mobile-volume-step" type="button" onClick={() => stepVolume(-1)} title="Bajar volumen" aria-label="Bajar volumen">
            <Minus size={24} />
          </button>
          <button className={`mobile-volume-mute ${muted ? 'active' : ''}`} type="button" onClick={toggleMute} title={muted ? 'Activar volumen' : 'Silenciar'} aria-label={muted ? 'Activar volumen' : 'Silenciar'}>
            <Volume2 size={26} />
          </button>
          <input
            className="volume-slider mobile-volume-slider"
            type="range"
            min="0"
            max="100"
            step="1"
            value={muted ? 0 : volume}
            onChange={changeVolume}
            onKeyDown={handleVolumeKeyDown}
            title="Subir o bajar volumen"
            aria-label="Subir o bajar volumen"
            style={{ '--volume': `${muted ? 0 : volume}%` }}
          />
          <strong>{muted ? 0 : volume}%</strong>
          <button className="mobile-volume-step" type="button" onClick={() => stepVolume(1)} title="Subir volumen" aria-label="Subir volumen">
            <Plus size={24} />
          </button>
        </div>
        {canStream && (
          <audio
            ref={audioRef}
            className="audio-player"
            src={offlineAudioUrl || currentTrack.audio_url}
            preload="auto"
            onTimeUpdate={updateAudioProgress}
            onLoadedMetadata={updateAudioProgress}
            onCanPlay={() => {
              if (!isPlaying) return;
              playAudioElement(true);
            }}
            onEnded={playNextFromQueue}
            onError={() => {
              setIsPlaying(false);
              setMessage(navigator.onLine ? 'No pude reproducir este archivo de audio.' : 'Esta canción no está guardada sin internet en este teléfono.');
            }}
          />
        )}
        {youtubeEmbedUrl && (
          <div
            ref={youtubePlayerMountRef}
            className="youtube-audio-frame"
            title={`YouTube - ${currentTrack.title}`}
          />
        )}
      </footer>
      )}
      {saveNotice && (
        <div className="save-toast" role="status" aria-live="polite">
          <Heart size={18} fill="currentColor" />
          <span>{saveNotice}</span>
        </div>
      )}
      <nav className="mobile-tabbar">
        <button className={activeView === 'home' ? 'active' : ''} type="button" onClick={() => setActiveView('home')}><Home size={24} fill={activeView === 'home' ? 'currentColor' : 'none'} /> Inicio</button>
        <button className={activeView === 'search' ? 'active' : ''} type="button" onClick={focusSearchView}><Search size={24} /> Buscar</button>
        <button className={activeView === 'folders' ? 'active' : ''} type="button" onClick={() => setActiveView('folders')}><Library size={24} /> Tu biblioteca</button>
        <button className={activeView === 'upload' ? 'active' : ''} type="button" onClick={() => setActiveView('upload')}><Upload size={24} /> Subir canción</button>
        <button className={activeView === 'premium' ? 'active' : ''} type="button" onClick={openPremiumView}><Crown size={24} /> Premium</button>
      </nav>
    </main>
  );
}
