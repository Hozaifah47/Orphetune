import { create } from "zustand";
import {
  getAllPlaylists,
  createPlaylist as dbCreatePlaylist,
  renamePlaylist as dbRenamePlaylist,
  deletePlaylist as dbDeletePlaylist,
  getPlaylistTracks,
  addTrackToPlaylist as dbAddTrack,
  removeTrackFromPlaylist as dbRemoveTrack,
  reorderPlaylistTracks as dbReorder,
} from "@/services/db";
import type { PlaylistRow, TrackRow } from "@/services/db";

interface PlaylistState {
  playlists: PlaylistRow[];
  selectedPlaylistId: number | null;
  selectedPlaylistTracks: TrackRow[];

  loadPlaylists: () => Promise<void>;
  createPlaylist: (name: string) => Promise<void>;
  renamePlaylist: (id: number, name: string) => Promise<void>;
  deletePlaylist: (id: number) => Promise<void>;
  selectPlaylist: (id: number | null) => Promise<void>;
  addTrack: (playlistId: number, trackId: number) => Promise<void>;
  removeTrack: (playlistId: number, trackId: number) => Promise<void>;
  reorderTracks: (playlistId: number, trackIds: number[]) => Promise<void>;
}

export const usePlaylistStore = create<PlaylistState>((set, get) => ({
  playlists: [],
  selectedPlaylistId: null,
  selectedPlaylistTracks: [],

  loadPlaylists: async () => {
    const playlists = await getAllPlaylists();
    set({ playlists });
  },

  createPlaylist: async (name: string) => {
    await dbCreatePlaylist(name);
    await get().loadPlaylists();
  },

  renamePlaylist: async (id: number, name: string) => {
    await dbRenamePlaylist(id, name);
    await get().loadPlaylists();
  },

  deletePlaylist: async (id: number) => {
    await dbDeletePlaylist(id);
    if (get().selectedPlaylistId === id) {
      set({ selectedPlaylistId: null, selectedPlaylistTracks: [] });
    }
    await get().loadPlaylists();
  },

  selectPlaylist: async (id: number | null) => {
    if (id === null) {
      set({ selectedPlaylistId: null, selectedPlaylistTracks: [] });
      return;
    }
    set({ selectedPlaylistId: id, selectedPlaylistTracks: [] });
    const tracks = await getPlaylistTracks(id);
    if (get().selectedPlaylistId === id) set({ selectedPlaylistTracks: tracks });
  },

  addTrack: async (playlistId: number, trackId: number) => {
    await dbAddTrack(playlistId, trackId);
    if (get().selectedPlaylistId === playlistId) {
      await get().selectPlaylist(playlistId);
    }
  },

  removeTrack: async (playlistId: number, trackId: number) => {
    await dbRemoveTrack(playlistId, trackId);
    if (get().selectedPlaylistId === playlistId) {
      await get().selectPlaylist(playlistId);
    }
  },

  reorderTracks: async (playlistId: number, trackIds: number[]) => {
    await dbReorder(playlistId, trackIds);
    if (get().selectedPlaylistId === playlistId) {
      await get().selectPlaylist(playlistId);
    }
  },
}));
