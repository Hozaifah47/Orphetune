import { create } from "zustand";
import { getDb } from "@/services/db";
import { useLogStore } from "./logStore";

interface Collections {
  liked: Set<number>;
  recent: number[];
  load: () => Promise<void>;
  setLiked: (ids: number[], liked: boolean) => Promise<void>;
  played: (id: number) => Promise<void>;
  addToPlaylist: (ids: number[], playlist: number) => Promise<void>;
}

function report(error: unknown) {
  useLogStore.getState().addEntry("ERR", String(error));
}

export const useCollections = create<Collections>((set) => ({
  liked: new Set(),
  recent: [],
  load: async () => {
    try {
      const db = await getDb();
      const liked = await db.select<{track_id:number}[]>("SELECT track_id FROM liked_tracks");
      const recent = await db.select<{track_id:number}[]>("SELECT track_id FROM recent_tracks ORDER BY sequence DESC");
      set({liked: new Set(liked.map(r => r.track_id)), recent: recent.map(r => r.track_id)});
    } catch (error) { report(error); }
  },
  setLiked: async (ids, liked) => {
    try {
      const db = await getDb();
      await db.execute(liked
        ? "INSERT OR IGNORE INTO liked_tracks SELECT value FROM json_each($1)"
        : "DELETE FROM liked_tracks WHERE track_id IN (SELECT value FROM json_each($1))", [JSON.stringify(ids)]);
      set(state => {
        const next = new Set(state.liked);
        for (const id of ids) { if (liked) next.add(id); else next.delete(id); }
        return {liked: next};
      });
    } catch (error) { report(error); }
  },
  played: async id => {
    try {
      const db = await getDb();
      await db.execute("INSERT OR REPLACE INTO recent_tracks(track_id) VALUES($1)", [id]);
      set(state => ({recent: [id, ...state.recent.filter(other => other !== id)]}));
    } catch (error) { report(error); }
  },
  addToPlaylist: async (ids, playlist) => {
    const db = await getDb();
    await db.execute(`INSERT OR IGNORE INTO playlist_tracks(playlist_id, track_id, position)
      SELECT $1, value, (SELECT COALESCE(MAX(position), -1)+1 FROM playlist_tracks WHERE playlist_id=$1)+key
      FROM json_each($2)`, [playlist, JSON.stringify(ids)]);
  },
}));
