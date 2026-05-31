import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Bell,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Crown,
  Disc3,
  Edit3,
  Heart,
  Home,
  Info,
  KeyRound,
  Library,
  Lock,
  LogOut,
  ListMusic,
  Music2,
  Pause,
  Play,
  Plus,
  Repeat2,
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
import sakuraSidebarImage from '../fondos/sakura-sidebar-bg.png';

const siteUrl = import.meta.env.VITE_SITE_URL || window.location.origin;

const fallbackAvatar = 'https://api.dicebear.com/8.x/adventurer/svg?seed=Enrique&backgroundColor=1f2937';
const brandName = 'Shigatsu no Uta';
const brandJapanese = '四月の歌';
const recommendedTrack = {
  title: 'Lo que merezco',
  artist: 'TentaBeat',
  cover: sakuraIcon
};

const channels = [
  {
    id: 'anime',
    name: 'Anime Hits',
    mood: 'openings, endings y energia visual',
    accent: '#4dd7ff',
    image: sakuraHeroImage,
    tracks: ['Blue Bird', 'Gurenge', 'Silhouette', 'Unravel']
  },
  {
    id: 'metal',
    name: 'Metal Core',
    mood: 'riffs pesados para concentrarte',
    accent: '#f97316',
    image: sakuraSidebarImage,
    tracks: ['Iron Pulse', 'Black Stage', 'Double Kick', 'Night Forge']
  },
  {
    id: 'rock',
    name: 'Rock Clasico',
    mood: 'guitarras, bateria y carretera',
    accent: '#f43f5e',
    image: 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=900&q=85',
    tracks: ['Thunder Road', 'Garage Lights', 'Golden Amp', 'Last Solo']
  },
  {
    id: 'kpop',
    name: 'K-Pop Glow',
    mood: 'coreografias brillantes y hooks enormes',
    accent: '#a78bfa',
    image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=85',
    tracks: ['Neon Love', 'Seoul Lights', 'Dance Break', 'Pink Signal']
  },
  {
    id: 'pop',
    name: 'Pop Mundial',
    mood: 'canciones faciles de cantar',
    accent: '#3dd17a',
    image: 'https://images.unsplash.com/photo-1492571350019-22de08371fd3?auto=format&fit=crop&w=900&q=85',
    tracks: ['Summer Radio', 'Heartbeat', 'City Chorus', 'Flashback']
  },
  {
    id: 'otros',
    name: 'Otros',
    mood: 'cualquier estilo fuera de la lista principal',
    accent: '#f5b82e',
    image: sakuraIcon,
    tracks: ['Nueva subida', 'Mi biblioteca', 'Demo track', 'BeatBox']
  }
];

const emptyTrackForm = {
  title: '',
  artist: '',
  album: '',
  genre: 'anime',
  custom_genre: '',
  cover_url: '',
  audio: null,
  metadata_source: ''
};

const emptyFolderForm = {
  name: 'Me gusta',
  is_shared: false,
  share_email: ''
};

const genreAliases = [
  { match: ['anime', 'j-pop', 'jpop', 'soundtrack'], genre: 'anime' },
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

function isLikesFolderName(name = '') {
  return ['me gusta', 'tus me gusta'].includes(normalizeFolderName(name));
}

export function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [profileForm, setProfileForm] = useState({ username: '', avatar_url: '' });
  const [authForm, setAuthForm] = useState({ email: '', password: '', username: '' });
  const [authMode, setAuthMode] = useState('login');
  const [activeChannel, setActiveChannel] = useState(channels[0]);
  const [openedCatalog, setOpenedCatalog] = useState(null);
  const [activeView, setActiveView] = useState('home');
  const [query, setQuery] = useState('');
  const [tracks, setTracks] = useState([]);
  const [folders, setFolders] = useState([]);
  const [folderTracks, setFolderTracks] = useState([]);
  const [folderForm, setFolderForm] = useState(emptyFolderForm);
  const [activeFolderId, setActiveFolderId] = useState('likes-preview');
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [trackForm, setTrackForm] = useState(emptyTrackForm);
  const [uploadingTrack, setUploadingTrack] = useState(false);
  const [searchingMetadata, setSearchingMetadata] = useState(false);
  const [metadataResults, setMetadataResults] = useState([]);
  const [currentTrack, setCurrentTrack] = useState(null);
  const [selectedFolderId, setSelectedFolderId] = useState('');
  const [trackEditForm, setTrackEditForm] = useState({ title: '', artist: '', genre: '', cover_url: '' });
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
  const [volume, setVolume] = useState(78);
  const [profileOpen, setProfileOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [avatarFile, setAvatarFile] = useState(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [trackInfoOpen, setTrackInfoOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [tracksReady, setTracksReady] = useState(true);
  const [folderTablesReady, setFolderTablesReady] = useState(true);
  const [categoryCoversReady, setCategoryCoversReady] = useState(true);
  const [categoryCovers, setCategoryCovers] = useState({});
  const [categoryCoverForms, setCategoryCoverForms] = useState({});
  const [loading, setLoading] = useState(true);
  const menuRef = useRef(null);
  const searchInputRef = useRef(null);
  const audioRef = useRef(null);
  const user = session?.user ?? null;
  const isAdmin = profile?.role === 'admin';

  useEffect(() => {
    let mounted = true;

    async function loadSession() {
      // Reviso si Supabase ya tiene una sesion activa para mantener abierto el login al recargar.
      const { data } = await supabase.auth.getSession();
      if (mounted) {
        setSession(data.session);
        setLoading(false);
      }
    }

    loadSession();

    // Escucho cambios de autenticacion para reaccionar cuando Google o correo inician/cerran sesion.
    const { data } = supabase.auth.onAuthStateChange((_event, currentSession) => {
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
      setAvatarFile(null);
      return;
    }

    loadProfile(user.id);
    loadTracks();
    loadCategoryCovers();
    if (folderTablesReady) loadFolders();
  }, [user?.id]);

  useEffect(() => {
    if (user && activeView === 'folders' && folderTablesReady) {
      loadFolders();
    }
  }, [user?.id, activeView, folderTablesReady]);

  useEffect(() => {
    function closeMenu(event) {
      if (!menuRef.current?.contains(event.target)) setProfileOpen(false);
    }

    document.addEventListener('pointerdown', closeMenu);
    return () => document.removeEventListener('pointerdown', closeMenu);
  }, []);

  const visibleChannels = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const displayChannels = channels.map((channel) => ({
      ...channel,
      image: categoryCovers[channel.id] || channel.image
    }));

    if (!normalized) return displayChannels;
    return displayChannels.filter((channel) =>
      [channel.name, channel.mood, ...channel.tracks].join(' ').toLowerCase().includes(normalized)
    );
  }, [query, categoryCovers]);

  const visibleTracks = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return tracks;

    return tracks.filter((track) =>
      [track.title, track.artist, track.genre].join(' ').toLowerCase().includes(normalized)
    );
  }, [query, tracks]);

  const featuredArtists = useMemo(() => {
    const artists = new Map();

    for (const track of tracks) {
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
        genre: channel?.name || track.genre || 'Musica',
        image: track.cover_url || channel?.image || sakuraIcon,
        track,
        count: 1
      });
    }

    return Array.from(artists.values())
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
      .slice(0, 8);
  }, [tracks]);

  const canPlay = Boolean(currentTrack?.audio_url);
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
  const libraryFolders = useMemo(() => {
    const hasLikes = folders.some((folder) => isLikesFolderName(folder.name));
    const previewLikes = {
      id: 'likes-preview',
      owner_id: user?.id,
      name: 'Tus me gusta',
      is_preview: true,
      is_shared: false
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
  const activeFolder = useMemo(
    () => libraryFolders.find((folder) => folder.id === activeFolderId) ?? libraryFolders[0],
    [activeFolderId, libraryFolders]
  );
  const activeFolderItems = useMemo(() => {
    if (!activeFolder || activeFolder.is_preview) return [];
    if (isLikesFolderName(activeFolder.name)) {
      const likesFolderIds = new Set(likesFolders.map((folder) => folder.id));
      const uniqueItems = [];
      const seenTracks = new Set();

      for (const item of folderTracks) {
        if (!likesFolderIds.has(item.folder_id) || !item.tracks || seenTracks.has(item.track_id)) continue;
        seenTracks.add(item.track_id);
        uniqueItems.push(item);
      }

      return uniqueItems;
    }

    return folderTracks.filter((item) => item.folder_id === activeFolder.id && item.tracks);
  }, [activeFolder, folderTracks, likesFolders]);
  const openedCatalogTracks = useMemo(() => {
    if (!openedCatalog) return [];
    return tracks.filter((track) => getChannelByGenre(track.genre)?.id === openedCatalog.id);
  }, [openedCatalog, tracks]);

  function getDisplayChannelByGenre(genre) {
    const channel = getChannelByGenre(genre);
    return { ...channel, image: categoryCovers[channel.id] || channel.image };
  }

  async function loadCategoryCovers() {
    const { data, error } = await supabase
      .from('category_covers')
      .select('*');

    if (error) {
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

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentTrack?.audio_url) return;

    if (isPlaying) {
      audio.play().catch(() => setIsPlaying(false));
    } else {
      audio.pause();
    }
  }, [isPlaying, currentTrack?.audio_url]);

  useEffect(() => {
    if (!trackInfoOpen) return;
    setSelectedFolderId((current) => current || likesFolder?.id || folders[0]?.id || '');
    if (currentTrack) {
      setTrackEditForm({
        title: currentTrack.title || '',
        artist: currentTrack.artist || '',
        genre: currentTrack.genre || '',
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

  async function loadTracks() {
    // Cargo las canciones subidas por los usuarios para mostrarlas en biblioteca y busqueda.
    const { data, error } = await supabase
      .from('tracks')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      setTracksReady(false);
      setMessage(
        error.code === 'PGRST205' || error.message?.includes("public.tracks")
          ? 'Falta completar la configuracion de Supabase o recargar el schema cache. La tabla public.tracks todavia no existe para la API.'
          : error.message
      );
      setTracks([]);
      return;
    }

    setTracksReady(true);
    setTracks(data ?? []);
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
      if (ownError.code === 'PGRST205' || ownError.message?.includes('playlist_folders')) {
        setFolders([]);
        setFolderTracks([]);
        setFolderTablesReady(false);
        setMessage('Completa la configuracion de Supabase para guardar canciones en Me gusta.');
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
      const errorMessage = sharedError.message;
      if (
        sharedError?.code === 'PGRST205' ||
        errorMessage?.includes('playlist_shares')
      ) {
        setFolders([]);
        setFolderTracks([]);
        setFolderTablesReady(false);
        setMessage('Falta completar la configuracion de Supabase para activar Carpetas y carpetas compartidas.');
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
      if (itemsError.code === 'PGRST205' || itemsError.message?.includes('playlist_tracks')) {
        setFolderTracks([]);
        setMessage('Falta completar la configuracion de Supabase para activar canciones en carpetas.');
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

    if (!authForm.email || !authForm.password) {
      setMessage('Completa correo y contrasena.');
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

      setMessage(error ? error.message : 'Cuenta creada. Revisa tu correo si Supabase pide confirmacion.');
      return;
    }

    // Inicio sesion con correo y contrasena para entrar a la experiencia privada.
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
        setMessage(`${uploadError.message}. Si Supabase bloquea imagenes, revisa la configuracion del bucket para permitir avatares.`);
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
    // Cierro la sesion actual de Supabase y regreso la app al login.
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
      title: current.title || cleanTitle
    }));
  }

  async function uploadTrack(event) {
    event.preventDefault();
    if (!tracksReady) {
      setMessage('Primero completa la configuracion de Supabase para crear tracks y el bucket songs.');
      return;
    }

    const requiredFields = [
      ['Titulo', trackForm.title],
      ['Artista', trackForm.artist],
      ['Album', trackForm.album],
      ['Genero', trackForm.genre],
      ['Portada por URL', trackForm.cover_url],
      ['Archivo de audio', trackForm.audio]
    ];

    if (trackForm.genre === 'otros') {
      requiredFields.push(['Genero personalizado', trackForm.custom_genre]);
    }

    const missingField = requiredFields.find(([, value]) => !value || (typeof value === 'string' && !value.trim()));

    if (!user || missingField) {
      setMessage(`Completa todos los campos antes de subir. Falta: ${missingField?.[0] || 'usuario'}.`);
      return;
    }

    setUploadingTrack(true);
    setMessage('');

    const extension = trackForm.audio.name.split('.').pop() || 'mp3';
    const filePath = `${user.id}/${crypto.randomUUID()}.${extension}`;
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

    // Obtengo la URL publica del audio recien subido para guardarla junto con la cancion.
    const { data: publicUrlData } = supabase.storage
      .from('songs')
      .getPublicUrl(filePath);

    // Registro la cancion en la tabla tracks para que aparezca en biblioteca y busqueda.
    const { error: insertError } = await supabase
      .from('tracks')
      .insert({
        user_id: user.id,
        title: trackForm.title.trim(),
        artist: trackForm.artist.trim(),
        album: trackForm.album.trim(),
        genre: trackForm.genre === 'otros' ? trackForm.custom_genre.trim() : trackForm.genre,
        cover_url: trackForm.cover_url.trim(),
        audio_url: publicUrlData.publicUrl,
        storage_path: filePath,
        metadata_source: trackForm.metadata_source || null
      });

    if (insertError) {
      if (insertError.message?.includes("public.tracks")) {
        setTracksReady(false);
        setMessage('Supabase no encuentra public.tracks. Completa la configuracion de Supabase y espera unos segundos.');
        setUploadingTrack(false);
        return;
      }
      setMessage(insertError.message);
      setUploadingTrack(false);
      return;
    }

    setTrackForm(emptyTrackForm);
    setMetadataResults([]);
    setMessage('Cancion subida correctamente.');
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

    // Borro mi cancion de la tabla tracks; RLS impide borrar canciones de otros usuarios.
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

  async function saveCategoryCover(channel) {
    if (!isAdmin) return;
    if (!categoryCoversReady) {
      setMessage('Completa la configuracion de Supabase para activar la edicion de portadas de categorias.');
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

  async function saveTrackDetails(event) {
    event.preventDefault();
    if (!currentTrack || (!isAdmin && currentTrack.user_id !== user?.id)) return;

    const updates = {
      title: trackEditForm.title.trim() || currentTrack.title,
      artist: trackEditForm.artist.trim() || currentTrack.artist,
      genre: trackEditForm.genre.trim() || currentTrack.genre,
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
    setMessage('Cancion actualizada.');
    loadTracks();
  }

  async function createFolder(event, options = {}) {
    event?.preventDefault();
    const requestedName = folderForm.name.trim();
    if (!user || !requestedName) return;
    if (!folderTablesReady) {
      setMessage('Completa la configuracion de Supabase para poder crear carpetas reales.');
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

    // Creo una carpeta propia para guardar canciones como Me gusta, Rock para estudiar, etc.
    const { data: folder, error } = await supabase
      .from('playlist_folders')
      .insert({
        owner_id: user.id,
        name: requestedName,
        is_shared: folderForm.is_shared
      })
      .select('*')
      .single();

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
    if (options.selectForTrack) setSelectedFolderId(folder.id);
    loadFolders();
    return folder;
  }

  function showFolderSetupMessage(error) {
    if (
      error?.code === 'PGRST205' ||
      error?.message?.includes('playlist_folders') ||
      error?.message?.includes('playlist_tracks')
    ) {
      setFolderTablesReady(false);
      setMessage('Falta completar la configuracion de Supabase para activar Me gusta y Carpetas.');
      return;
    }

    setMessage(error?.message || 'No se pudo guardar la cancion.');
  }

  async function addTrackToFolder(track, folderId, successMessage = 'Cancion agregada a la carpeta.') {
    if (!track || !folderId || !user) return false;
    if (!folderTablesReady || folderId === 'likes-preview') {
      setMessage('Completa la configuracion de Supabase para guardar canciones en carpetas reales.');
      return false;
    }

    // Agrego la cancion elegida a la carpeta sin duplicarla.
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
    loadFolders();
    return true;
  }

  async function addCurrentTrackToFolder(folderId) {
    if (!currentTrack) {
      setMessage('Carga una cancion en el reproductor antes de agregarla a una carpeta.');
      return;
    }

    addTrackToFolder(currentTrack, folderId);
  }

  async function getOrCreateLikesFolder() {
    if (!user) return null;
    if (likesFolder) return likesFolder;
    if (!folderTablesReady) {
      setMessage('Completa la configuracion de Supabase para guardar canciones en Me gusta.');
      return null;
    }

    const { data: folder, error } = await supabase
      .from('playlist_folders')
      .insert({
        owner_id: user.id,
        name: 'Me gusta',
        is_shared: false
      })
      .select('*')
      .single();

    if (error) {
      showFolderSetupMessage(error);
      return null;
    }

    setFolders((current) => [folder, ...current]);
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
      setMessage('Cancion quitada de Me gusta.');
      loadFolders();
      return;
    }

    await addTrackToFolder(track, folder.id, 'Cancion guardada en Me gusta.');
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
    // Quito una cancion de una carpeta propia o compartida donde tengo acceso.
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
    setPlaybackQueue([]);
    setQueueIndex(0);
    setCurrentTrack(track);
    setActiveChannel(getDisplayChannelByGenre(track.genre));
    setIsPlaying(false);
    setProgress(0);
    setCurrentTime(0);
  }

  function playTrackQueue(queue, startIndex = 0) {
    const playableQueue = queue.filter((track) => track?.audio_url);
    if (playableQueue.length === 0) return;

    const safeIndex = Math.min(Math.max(startIndex, 0), playableQueue.length - 1);
    const track = playableQueue[safeIndex];
    setPlaybackQueue(playableQueue);
    setQueueIndex(safeIndex);
    setCurrentTrack(track);
    setActiveChannel(getDisplayChannelByGenre(track.genre));
    setProgress(0);
    setCurrentTime(0);
    setIsPlaying(true);
  }

  function getFallbackQueue() {
    const catalogQueue = openedCatalogTracks.filter((track) => track?.audio_url);
    if (catalogQueue.length > 0) return catalogQueue;

    const uploadedQueue = visibleTracks.filter((track) => track?.audio_url);
    if (uploadedQueue.length > 0) return uploadedQueue;

    return tracks.filter((track) => track?.audio_url);
  }

  function togglePlayer() {
    if (!canPlay) {
      const fallbackQueue = getFallbackQueue();
      if (fallbackQueue.length > 0) {
        playTrackQueue(fallbackQueue, 0);
      } else {
        setActiveView('upload');
        showPlayerMessage('Sube una cancion para reproducir.');
      }
      return;
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
    showPlayerMessage('Sube o elige una cancion para guardarla.');
  }

  function focusSearchView() {
    setActiveView('search');
    window.requestAnimationFrame(() => {
      searchInputRef.current?.focus();
      searchInputRef.current?.select();
    });
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
    const queue = playbackQueue.length > 0 ? playbackQueue : getFallbackQueue();
    if (queue.length === 0) return;

    const currentIndex = queue.findIndex((track) => track.id === currentTrack?.id);
    const previousIndex = currentIndex > 0 ? currentIndex - 1 : queue.length - 1;
    playTrackQueue(queue, previousIndex);
  }

  function playRandomTrack(toggleMode = true) {
    const queue = getFallbackQueue();
    if (queue.length === 0) {
      setMessage('Sube una cancion para usar aleatorio.');
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
      if (audioRef.current) audioRef.current.muted = next;
      return next;
    });
  }

  function changeVolume(event) {
    const clamped = Number(event.target.value);
    setVolume(clamped);
    setMuted(clamped === 0);
    if (audioRef.current) {
      audioRef.current.volume = clamped / 100;
      audioRef.current.muted = clamped === 0;
    }
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

    if (playbackQueue.length > 0 && queueIndex < playbackQueue.length - 1) {
      const nextIndex = queueIndex + 1;
      const nextTrack = playbackQueue[nextIndex];
      setQueueIndex(nextIndex);
      setCurrentTrack(nextTrack);
      setActiveChannel(getDisplayChannelByGenre(nextTrack.genre));
      setProgress(0);
      setCurrentTime(0);
      setIsPlaying(true);
      return;
    }

    if (repeatOn && playbackQueue.length > 0) {
      playTrackQueue(playbackQueue, 0);
      return;
    }

    const queue = playbackQueue.length > 0 ? playbackQueue : getFallbackQueue();
    if (queue.length > 0) {
      const currentIndex = queue.findIndex((track) => track.id === currentTrack?.id);
      const nextIndex = currentIndex >= 0 && currentIndex < queue.length - 1 ? currentIndex + 1 : 0;
      playTrackQueue(queue, nextIndex);
      return;
    }

    setIsPlaying(false);
  }

  async function searchTrackMetadata() {
    const term = [trackForm.title, trackForm.artist].filter(Boolean).join(' ').trim();

    if (!term) {
      setMessage('Escribe el nombre de la cancion para buscar la portada.');
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
        setMessage('No encontre datos para esa cancion. Puedes llenar la portada manualmente.');
      }
    } catch (error) {
      setMessage('No se pudo buscar la portada. Revisa tu conexion o pega una URL manual.');
    } finally {
      setSearchingMetadata(false);
    }
  }

  function applyMetadata(metadata) {
    setTrackForm((current) => ({
      ...current,
      artist: metadata.artist || current.artist,
      album: metadata.album || current.album,
      genre: metadata.genre || current.genre,
      custom_genre: metadata.custom_genre || '',
      cover_url: metadata.cover_url || current.cover_url,
      metadata_source: metadata.metadata_source || current.metadata_source
    }));
  }

  if (loading) {
    return <main className="splash"><Disc3 className="spin" /> Cargando BeatBox...</main>;
  }

  if (!user) {
    return (
      <main className="auth-page">
        <section className="auth-hero">
          <div className="brand-mark sakura-brand"><img src={sakuraIcon} alt={`${brandJapanese} ${brandName}`} /></div>
          <h1>{brandName}</h1>
          <p>{brandJapanese} - tu espacio para anime, metal, rock, K-pop y pop con energia de primavera nocturna.</p>
          <div className="hero-strip">
            {channels.map((channel) => <img key={channel.id} src={channel.image} alt={channel.name} />)}
          </div>
        </section>

        <section className="auth-card">
          <button className="google-button" type="button" onClick={signInWithGoogle}>
            <span>G</span>
            Continuar con Google
          </button>
          <div className="divider"><span>o</span></div>
          <form onSubmit={handleEmailAuth}>
            {authMode === 'register' && (
              <label>
                Nombre
                <input value={authForm.username} onChange={(event) => setAuthForm({ ...authForm, username: event.target.value })} placeholder="Enrique" />
              </label>
            )}
            <label>
              Correo
              <input type="email" value={authForm.email} onChange={(event) => setAuthForm({ ...authForm, email: event.target.value })} placeholder="tu@email.com" />
            </label>
            <label>
              Contrasena
              <input type="password" value={authForm.password} onChange={(event) => setAuthForm({ ...authForm, password: event.target.value })} placeholder="Minimo 6 caracteres" />
            </label>
            <button className="primary" type="submit">
              {authMode === 'login' ? <Lock size={18} /> : <UserPlus size={18} />}
              {authMode === 'login' ? 'Iniciar sesion' : 'Crear cuenta'}
            </button>
          </form>
          <button className="ghost" type="button" onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}>
            {authMode === 'login' ? 'Crear una cuenta nueva' : 'Ya tengo cuenta'}
          </button>
          {message && <p className="message">{message}</p>}
        </section>
      </main>
    );
  }

  const displayName = getDisplayName(user, profile);
  const avatar = getAvatar(user, profile);

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand-mark sakura-brand"><img src={sakuraIcon} alt={`${brandJapanese} ${brandName}`} /></div>
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
          <button className={activeView === 'upload' ? 'nav-active' : ''} onClick={() => setActiveView('upload')}><Upload size={19} /> Subir cancion</button>
        </nav>
        <span className="sidebar-section-title">Playlists</span>
        <div className="genre-list">
          {libraryFolders.map((folder, index) => {
            const folderName = folder.is_preview || isLikesFolderName(folder.name) ? 'Tus me gusta' : folder.name;
            const color = channels[index % channels.length]?.accent ?? '#ff8fbd';
            return (
            <button
              key={folder.id}
              className={activeView === 'folders' && activeFolder?.id === folder.id ? 'selected' : ''}
              onClick={() => {
                setActiveFolderId(folder.id);
                setActiveView('folders');
              }}
            >
              <span style={{ background: color }} /> {folderName}
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
            <button className="icon-button" title="Notificaciones"><Bell size={19} /></button>
            <button className="profile-button" onClick={() => setProfileOpen((open) => !open)}>
              <img src={avatar} alt={displayName} />
              <strong>{displayName}</strong>
              <ChevronDown size={16} />
            </button>
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
                  <button><KeyRound size={18} /> Contrasenas y Autocompletar</button>
                  <button><ShieldCheck size={18} /> Gestionar cuenta de Google</button>
                  <button><Settings size={18} /> Sincronizacion activada</button>
                  <button onClick={signOut}><LogOut size={18} /> Cerrar este perfil</button>
                </div>
                {editingProfile && (
                  <form className="profile-editor" onSubmit={saveProfile}>
                    <label>Nombre<input value={profileForm.username} onChange={(event) => setProfileForm({ ...profileForm, username: event.target.value })} /></label>
                    <label>URL avatar<input value={profileForm.avatar_url} onChange={(event) => setProfileForm({ ...profileForm, avatar_url: event.target.value })} /></label>
                    <label className="profile-avatar-picker">
                      Subir foto
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(event) => setAvatarFile(event.target.files?.[0] ?? null)}
                      />
                      <span>{avatarFile?.name || 'Selecciona una imagen'}</span>
                    </label>
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
                <span className="eyebrow"><Info size={16} /> Informacion</span>
                <h2>{currentTrack.title}</h2>
                <dl>
                  <div><dt>Artista</dt><dd>{currentTrack.artist || 'Sin dato'}</dd></div>
                  <div><dt>Album</dt><dd>{currentTrack.album || 'Sin dato'}</dd></div>
                  <div><dt>Genero</dt><dd>{currentTrack.genre || 'Sin dato'}</dd></div>
                  <div><dt>Fuente de datos</dt><dd>{currentTrack.metadata_source || 'Manual'}</dd></div>
                  <div><dt>Estado</dt><dd>{isPlaying ? 'Reproduciendo' : 'En pausa/listo'}</dd></div>
                </dl>
                {(isAdmin || currentTrack.user_id === user.id) && (
                  <form className="track-edit-form" onSubmit={saveTrackDetails}>
                    <label>Titulo<input value={trackEditForm.title} onChange={(event) => setTrackEditForm({ ...trackEditForm, title: event.target.value })} /></label>
                    <label>Artista<input value={trackEditForm.artist} onChange={(event) => setTrackEditForm({ ...trackEditForm, artist: event.target.value })} /></label>
                    <label>Genero<input value={trackEditForm.genre} onChange={(event) => setTrackEditForm({ ...trackEditForm, genre: event.target.value })} /></label>
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
                  <label>
                    Agregar a carpeta
                    <span className="folder-picker">
                      <select value={selectedFolderId} onChange={(event) => setSelectedFolderId(event.target.value)}>
                        <option value="">Elige carpeta</option>
                        {libraryFolders.filter((folder) => !folder.is_preview).map((folder) => (
                          <option key={folder.id} value={folder.id}>{folder.name}</option>
                        ))}
                      </select>
                      <button
                        className="folder-add-button"
                        type="button"
                        disabled={!selectedFolderId}
                        onClick={() => addCurrentTrackToFolder(selectedFolderId)}
                      >
                        <Plus size={18} />
                      </button>
                    </span>
                  </label>
                  <form className="modal-folder-form" onSubmit={(event) => createFolder(event, { selectForTrack: true })}>
                    <label>
                      Crear carpeta
                      <span>
                        <input
                          value={folderForm.name}
                          onChange={(event) => setFolderForm({ ...folderForm, name: event.target.value })}
                          placeholder="Nueva playlist"
                        />
                        <button className="folder-add-button" type="submit"><Plus size={18} /></button>
                      </span>
                    </label>
                  </form>
                </div>
                <a href={currentTrack.audio_url} target="_blank" rel="noreferrer">Abrir archivo de audio</a>
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
                {canPlay ? (isPlaying ? 'Reproduciendo' : 'Listo en el reproductor') : 'Sube o elige una cancion'}
              </button>
              <button className="follow-button" type="button" onClick={saveCurrentFromHero}><Heart size={19} fill={currentTrackLiked ? 'currentColor' : 'none'} /> Guardar</button>
            </div>
          </div>
        </section>

        <section className="content-grid">
          {message && <p className="app-message">{message}</p>}

          {(activeView === 'home' || activeView === 'search') && (
            <>
              <div className="section-head">
                <h2><span className="section-flower">✿</span> Tus mixes mas escuchados</h2>
                <button className="show-all-button" type="button" onClick={() => setOpenedCatalog(null)}>Mostrar todo</button>
              </div>
              <div className="playlist-grid">
                {visibleChannels.map((channel) => (
                  (() => {
                    const channelTracks = tracks.filter((track) => getChannelByGenre(track.genre)?.id === channel.id);
                    const isChannelCurrent = currentTrack && getChannelByGenre(currentTrack.genre)?.id === channel.id;
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
                            title={isChannelCurrent && isPlaying ? 'Pausar' : 'Reproducir todo este catalogo'}
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
                            <button type="button" onClick={() => saveCategoryCover(channel)}>Guardar portada</button>
                          </div>
                        )}
                        {isChannelCurrent && (
                          <span className="playing-badge">{isPlaying ? 'Reproduciendo' : 'Listo'}</span>
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
                      <span>Playlist publica</span>
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
                    <span>Descubrir mas</span>
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
                      <p className="empty-state">Todavia no hay canciones subidas en este catalogo.</p>
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

              <div className="section-head recommended-head"><h2><span className="section-flower">✿</span> Cancion recomendada para ti</h2></div>
              <article className="recommended-song">
                <img src={currentTrack?.cover_url || recommendedTrack.cover} alt={currentTrack?.title || recommendedTrack.title} />
                <div>
                  <strong>{currentTrack?.title || recommendedTrack.title}</strong>
                  <span>{currentTrack?.artist || recommendedTrack.artist}</span>
                </div>
                <button className="like-icon-button" type="button" onClick={() => currentTrack && addTrackToLikes(currentTrack)} disabled={!currentTrack}>
                  <Heart size={21} />
                </button>
                <button className="more-button" type="button">...</button>
              </article>

              <div className="section-head"><h2>Canciones subidas</h2><span>{visibleTracks.length} canciones</span></div>
              <div className="track-list">
                {visibleTracks.length === 0 && <p className="empty-state">Todavia no hay canciones subidas.</p>}
                {visibleTracks.map((track) => (
                  <article className={`track-row ${currentTrack?.id === track.id ? 'playing' : ''}`} key={track.id}>
                    <img src={track.cover_url || activeChannel.image} alt={track.title} />
                    <button className="row-play" type="button" onClick={() => selectTrack(track)} title="Cargar esta cancion"><Music2 size={16} /></button>
                    <div><strong>{track.title}</strong><span>{track.artist}{track.album ? ` - ${track.album}` : ''}</span></div>
                    <span>{currentTrack?.id === track.id ? (isPlaying ? 'Reproduciendo' : 'Listo') : track.genre}</span>
                    <button
                      className={`like-icon-button ${likedTrackIds.has(track.id) ? 'liked' : ''}`}
                      type="button"
                      onClick={() => addTrackToLikes(track)}
                      title="Guardar en Me gusta"
                    >
                      <Heart size={17} fill={likedTrackIds.has(track.id) ? 'currentColor' : 'none'} />
                    </button>
                    {(isAdmin || track.user_id === user.id) && (
                      <button className="danger-button" type="button" onClick={() => deleteTrack(track)}><Trash2 size={17} /></button>
                    )}
                  </article>
                ))}
              </div>

              {featuredArtists.length > 0 && (
                <>
                  <div className="section-head"><h2>Artistas recomendados</h2><span>Con canciones subidas</span></div>
                  <div className="artist-row">
                    {featuredArtists.map((artist) => (
                      <article
                        className="artist-card"
                        key={artist.name}
                        role="button"
                        tabIndex={0}
                        onClick={() => artist.track && playTrackQueue(
                          tracks.filter((track) => track.artist?.trim().toLowerCase() === artist.name.toLowerCase()),
                          0
                        )}
                        onKeyDown={(event) => {
                          if ((event.key === 'Enter' || event.key === ' ') && artist.track) {
                            event.preventDefault();
                            playTrackQueue(
                              tracks.filter((track) => track.artist?.trim().toLowerCase() === artist.name.toLowerCase()),
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
              <div className="section-head"><h2>Tu biblioteca</h2><span>{tracks.filter((track) => track.user_id === user.id).length} tuyas</span></div>
              <div className="track-list">
                {tracks.filter((track) => track.user_id === user.id).length === 0 && <p className="empty-state">No has subido canciones todavia.</p>}
                {tracks.filter((track) => track.user_id === user.id).map((track) => (
                  <article className={`track-row ${currentTrack?.id === track.id ? 'playing' : ''}`} key={track.id}>
                    <img src={track.cover_url || activeChannel.image} alt={track.title} />
                    <button className="row-play" type="button" onClick={() => selectTrack(track)} title="Cargar esta cancion"><Music2 size={16} /></button>
                    <div><strong>{track.title}</strong><span>{track.artist}{track.album ? ` - ${track.album}` : ''}</span></div>
                    <span>{currentTrack?.id === track.id ? (isPlaying ? 'Reproduciendo' : 'Listo') : track.genre}</span>
                    <button
                      className={`like-icon-button ${likedTrackIds.has(track.id) ? 'liked' : ''}`}
                      type="button"
                      onClick={() => addTrackToLikes(track)}
                      title="Guardar en Me gusta"
                    >
                      <Heart size={17} fill={likedTrackIds.has(track.id) ? 'currentColor' : 'none'} />
                    </button>
                    <button className="danger-button" type="button" onClick={() => deleteTrack(track)}><Trash2 size={17} /></button>
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
                  <span>Recientes</span>
                </div>

                <div className="library-list">
                  {libraryFolders.map((folder) => {
                    const isLikesFolder = isLikesFolderName(folder.name) || folder.is_preview;
                    const likesFolderIds = new Set(likesFolders.map((likesItem) => likesItem.id));
                    const items = isLikesFolder
                      ? folderTracks.filter((item) => likesFolderIds.has(item.folder_id) && item.tracks)
                      : folderTracks.filter((item) => item.folder_id === folder.id && item.tracks);
                    const uniqueTrackCount = new Set(items.map((item) => item.track_id)).size;
                    const folderName = isLikesFolder ? 'Tus me gusta' : folder.name;
                    return (
                      <button
                        className={activeFolder?.id === folder.id ? 'active' : ''}
                        key={folder.id}
                        type="button"
                        onClick={() => setActiveFolderId(folder.id)}
                      >
                        <span className={isLikesFolder ? 'liked-cover' : 'folder-cover'}>
                          {isLikesFolder ? <Heart size={30} fill="currentColor" /> : <Music2 size={24} />}
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

              <article className="spotify-playlist">
                <header className="playlist-hero">
                  <div className={isLikesFolderName(activeFolder?.name) || activeFolder?.is_preview ? 'liked-cover big' : 'folder-cover big'}>
                    {isLikesFolderName(activeFolder?.name) || activeFolder?.is_preview ? <Heart size={82} fill="currentColor" /> : <Music2 size={62} />}
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
                  <button type="button"><Search size={22} /></button>
                  <span>Orden personalizado</span>
                </div>

                <div className="playlist-chips">
                  <span>Pop</span>
                  <span>Latino</span>
                  <span>Anime</span>
                  <span>Serenidad</span>
                </div>

                <div className="playlist-table">
                  <div className="playlist-table-head">
                    <span>#</span>
                    <span>Titulo</span>
                    <span>Album</span>
                    <span></span>
                  </div>
                  {activeFolderItems.length === 0 && (
                    <p className="empty-state">{folderTablesReady ? 'Guarda canciones con el corazon para verlas aqui.' : 'Completa la configuracion de Supabase para activar esta playlist.'}</p>
                  )}
                  {activeFolderItems.map((item, index) => {
                    const track = item.tracks;
                    const isOwner = activeFolder?.owner_id === user.id;
                    return (
                      <div className={`playlist-track ${currentTrack?.id === track.id ? 'playing' : ''}`} key={`${activeFolder.id}-${track.id}`}>
                        <span>{currentTrack?.id === track.id ? <Play size={16} fill="currentColor" /> : index + 1}</span>
                        <img src={track.cover_url || activeChannel.image} alt={track.title} />
                        <button type="button" onClick={() => playTrackQueue(activeFolderItems.map((item) => item.tracks), index)}>
                          <strong>{track.title}</strong>
                          <small>{track.artist}</small>
                        </button>
                        <span>{track.album || 'Single'}</span>
                        <button className="like-icon-button liked" type="button" onClick={() => removeTrackFromFolder(activeFolder.id, track.id)}>
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
                <span className="eyebrow"><Music2 size={16} /> Nueva cancion</span>
                <h2>Subir cancion</h2>
                <p>El archivo se guarda en Supabase Storage y aparece en tu biblioteca.</p>
              </div>
              <form onSubmit={uploadTrack}>
                <label>
                  Titulo
                  <input required value={trackForm.title} onChange={(event) => setTrackForm({ ...trackForm, title: event.target.value })} placeholder="Nombre de la cancion" />
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
                      <button type="button" key={`${result.title}-${result.artist}-${result.album}`} onClick={() => applyMetadata(result)}>
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
                  Genero
                  <select required value={trackForm.genre} onChange={(event) => setTrackForm({ ...trackForm, genre: event.target.value })}>
                    {channels.map((channel) => <option key={channel.id} value={channel.id}>{channel.name}</option>)}
                  </select>
                </label>
                {trackForm.genre === 'otros' && (
                  <label>
                    Genero personalizado
                    <input required value={trackForm.custom_genre} onChange={(event) => setTrackForm({ ...trackForm, custom_genre: event.target.value })} placeholder="Reggaeton, jazz, trap, salsa..." />
                  </label>
                )}
                <label>
                  Portada por URL
                  <input required type="url" value={trackForm.cover_url} onChange={(event) => setTrackForm({ ...trackForm, cover_url: event.target.value })} placeholder="https://imagen.jpg" />
                </label>
                {trackForm.cover_url && (
                  <img className="cover-preview" src={trackForm.cover_url} alt="Portada seleccionada" />
                )}
                <label className="file-picker">
                  Archivo de audio
                  <input required type="file" accept="audio/*,.mp3,.mpeg,.mpga,.wav,.ogg,.webm" onChange={(event) => handleAudioFile(event.target.files?.[0] ?? null)} />
                  <span>{trackForm.audio?.name || 'Selecciona mp3, mpeg, wav, ogg...'}</span>
                </label>
                <button className="primary" type="submit" disabled={uploadingTrack}>
                  <Upload size={18} />
                  {uploadingTrack ? 'Subiendo...' : 'Subir cancion'}
                </button>
              </form>
            </section>
          )}
        </section>
      </section>

      <footer className="player" style={{ '--accent': activeChannel.accent }}>
        <div className="player-track">
          <img src={currentTrack?.cover_url || recommendedTrack.cover} alt={currentTrack?.title || recommendedTrack.title} />
          <div><strong>{currentTrack?.title || recommendedTrack.title}</strong><span>{currentTrack?.artist || recommendedTrack.artist}</span></div>
          <button
            className={`plain-player-button player-heart ${currentTrackLiked ? 'active' : ''}`}
            disabled={!currentTrack}
            onClick={() => currentTrack && addTrackToLikes(currentTrack)}
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
            <span>{formatTime(duration || (canPlay ? 228 : 0))}</span>
          </div>
        </div>

        <div className="player-extra">
          <button className="plain-player-button" disabled={!currentTrack} onClick={openTrackInfo} title="Ver informacion de la cancion"><ListMusic size={19} /></button>
          <button className="plain-player-button" type="button" onClick={() => setActiveView('folders')} title="Biblioteca"><Library size={19} /></button>
          <button className={`plain-player-button ${muted ? 'active' : ''}`} type="button" onClick={toggleMute} title={muted ? 'Activar volumen' : 'Silenciar'}><Volume2 size={19} /></button>
          <input
            className="volume-slider"
            type="range"
            min="0"
            max="100"
            value={muted ? 0 : volume}
            onChange={changeVolume}
            title="Subir o bajar volumen"
            style={{ '--volume': `${muted ? 0 : volume}%` }}
          />
          <button className="plain-player-button" type="button" onClick={() => setProfileOpen((open) => !open)} title="Ajustes"><Settings size={18} /></button>
        </div>
        {currentTrack?.audio_url && (
          <audio
            ref={audioRef}
            className="audio-player"
            src={currentTrack.audio_url}
            onTimeUpdate={updateAudioProgress}
            onLoadedMetadata={updateAudioProgress}
            onEnded={playNextFromQueue}
          />
        )}
      </footer>
      <nav className="mobile-tabbar">
        <button className={activeView === 'home' ? 'active' : ''} type="button" onClick={() => setActiveView('home')}><Home size={24} fill={activeView === 'home' ? 'currentColor' : 'none'} /> Inicio</button>
        <button className={activeView === 'search' ? 'active' : ''} type="button" onClick={focusSearchView}><Search size={24} /> Buscar</button>
        <button className={activeView === 'folders' ? 'active' : ''} type="button" onClick={() => setActiveView('folders')}><Library size={24} /> Tu biblioteca</button>
        <button className={activeView === 'upload' ? 'active' : ''} type="button" onClick={() => setActiveView('upload')}><Upload size={24} /> Subir cancion</button>
        <button type="button"><Crown size={24} /> Premium</button>
      </nav>
    </main>
  );
}
