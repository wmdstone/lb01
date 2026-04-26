// Firebase-backed replacement for the Express /api/* endpoints.
// Lets the existing apiFetch('/api/...') call sites in App.tsx work without a server.

import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getFirestore,
  collection,
  getDocs,
  getDoc,
  addDoc,
  setDoc,
  deleteDoc,
  doc,
} from "firebase/firestore";
import firebaseConfig from "../../firebase-applet-config.json";

// --- INIT FIREBASE (singleton) ---
const app = getApps().length ? getApp() : initializeApp(firebaseConfig as any);
const db = getFirestore(app, (firebaseConfig as any).firestoreDatabaseId);

// --- ADMIN PASSWORD (was on the Express server). ---
// Frontend-only check: matches the original AI Studio behavior. Firestore
// rules already allow public read/write, so this is presentation-level only.
const ADMIN_PASSWORD = "janki_app";
const TOKEN_VALUE = "client-admin-token";

const ok = (body: any = { success: true }, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

const fail = (status: number, message: string): Response =>
  new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });

const stripId = (data: any) => {
  if (!data || typeof data !== "object") return data;
  const copy = { ...data };
  delete copy.id;
  return copy;
};

const listCollection = async (name: string) => {
  const snap = await getDocs(collection(db, name));
  return snap.docs.map((d) => ({ id: d.id, ...stripId(d.data()) }));
};

// --- Stats helpers (mirror server.ts) ---
const computeStats = async (range: string) => {
  const now = new Date();
  let cutoff = new Date(0);
  if (range === "today") cutoff = new Date(new Date().setHours(0, 0, 0, 0));
  if (range === "1w") cutoff = new Date(now.getTime() - 7 * 86400000);
  if (range === "1m") {
    const d = new Date(now);
    d.setMonth(d.getMonth() - 1);
    cutoff = d;
  }
  if (range === "1y") {
    const d = new Date(now);
    d.setFullYear(d.getFullYear() - 1);
    cutoff = d;
  }

  const [studentSnap, catSnap, masterSnap, viewSnap] = await Promise.all([
    getDocs(collection(db, "students")),
    getDocs(collection(db, "categories")),
    getDocs(collection(db, "masterGoals")),
    getDocs(collection(db, "page_views")),
  ]);

  const masterPoints = new Map<string, number>();
  masterSnap.docs.forEach((d) => masterPoints.set(d.id, (d.data() as any).points || 0));

  let totalPoints = 0;
  let completedGoals = 0;
  let activeGoals = 0;
  const chartMap: Record<string, number> = {};

  studentSnap.docs.forEach((sd) => {
    const s: any = sd.data();
    (s.assignedGoals || []).forEach((g: any) => {
      activeGoals++;
      if (g.completed && g.completedAt) {
        const d = new Date(g.completedAt);
        if (d >= cutoff) {
          completedGoals++;
          const pts = g.points || masterPoints.get(g.goalId) || 0;
          totalPoints += pts;
          const day = g.completedAt.split("T")[0];
          chartMap[day] = (chartMap[day] || 0) + pts;
        }
      }
    });
  });

  const visitors = viewSnap.docs
    .map((d) => d.data() as any)
    .filter((v) => v.date && new Date(v.date) >= cutoff)
    .reduce((acc, v) => acc + (v.hits || 0), 0);

  const chartData = Object.keys(chartMap)
    .sort()
    .map((date) => ({ date, points: chartMap[date] }));

  return {
    totalStudents: studentSnap.size,
    totalActiveGoals: activeGoals,
    totalCategories: catSnap.size,
    completedGoals,
    totalPoints,
    uniqueVisitors: visitors,
    chartData,
  };
};

const logAction = async (action: string, details: string, type: "education" | "system") => {
  try {
    await addDoc(collection(db, "activity_logs"), {
      action,
      details,
      type,
      timestamp: new Date().toISOString(),
    });
  } catch (e) {
    console.warn("log failed", e);
  }
};

// --- Router ---
export async function firebaseApiFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const method = (init.method || "GET").toUpperCase();
  const path = url.split("?")[0];
  const queryStr = url.includes("?") ? url.slice(url.indexOf("?") + 1) : "";
  const query = new URLSearchParams(queryStr);
  let body: any = undefined;
  if (init.body) {
    try { body = JSON.parse(init.body as string); } catch { body = init.body; }
  }

  try {
    // --- AUTH ---
    if (path === "/api/login" && method === "POST") {
      if (body?.password === ADMIN_PASSWORD) {
        return ok({ success: true, token: TOKEN_VALUE });
      }
      return fail(401, "Incorrect password");
    }
    if (path === "/api/logout" && method === "POST") {
      return ok();
    }
    if (path === "/api/me" && method === "GET") {
      const auth = (init.headers as any)?.get?.("Authorization") || (init.headers as any)?.Authorization;
      const token = typeof auth === "string" ? auth.replace("Bearer ", "") : null;
      return ok({ authenticated: token === TOKEN_VALUE });
    }

    // --- SETTINGS ---
    if (path === "/api/settings" && method === "GET") {
      const snap = await getDoc(doc(db, "settings", "appearance"));
      return ok(snap.exists() ? snap.data() : {});
    }
    if (path === "/api/settings" && method === "PUT") {
      await setDoc(doc(db, "settings", "appearance"), body || {}, { merge: true });
      logAction("Theme Applied", "Admin applied new theme and branding settings", "system");
      return ok();
    }

    // --- STUDENTS ---
    if (path === "/api/students" && method === "GET") {
      return ok(await listCollection("students"));
    }
    if (path === "/api/students" && method === "POST") {
      const data = stripId(body);
      const ref = await addDoc(collection(db, "students"), data);
      return ok({ id: ref.id, ...data });
    }
    if (path === "/api/students/snapshot-ranks" && method === "POST") {
      const studentSnap = await getDocs(collection(db, "students"));
      const masterSnap = await getDocs(collection(db, "masterGoals"));
      const map = new Map<string, number>();
      masterSnap.docs.forEach((d) => map.set(d.id, (d.data() as any).points || 0));
      const list = studentSnap.docs.map((d) => {
        const data: any = d.data();
        const pts = (data.assignedGoals || []).reduce(
          (acc: number, g: any) => (g.completed ? acc + (g.points || map.get(g.goalId) || 0) : acc),
          0,
        );
        return { id: d.id, pts };
      });
      list.sort((a, b) => b.pts - a.pts);
      await Promise.all(
        list.map((s, idx) =>
          setDoc(doc(db, "students", s.id), { previousRank: idx + 1 }, { merge: true }),
        ),
      );
      return ok();
    }
    const studentMatch = path.match(/^\/api\/students\/([^/]+)$/);
    if (studentMatch) {
      const id = studentMatch[1];
      if (method === "PUT") {
        const data = stripId(body);
        await setDoc(doc(db, "students", id), data, { merge: true });
        logAction("Student Updated", `Updated data/goals for student ${data?.name || id}`, "education");
        return ok({ id, ...data });
      }
      if (method === "DELETE") {
        await deleteDoc(doc(db, "students", id));
        return ok();
      }
    }

    // --- CATEGORIES ---
    if (path === "/api/categories" && method === "GET") {
      return ok(await listCollection("categories"));
    }
    if (path === "/api/categories" && method === "POST") {
      const data = stripId(body);
      const ref = await addDoc(collection(db, "categories"), data);
      return ok({ id: ref.id, ...data });
    }
    const catMatch = path.match(/^\/api\/categories\/([^/]+)$/);
    if (catMatch) {
      const id = catMatch[1];
      if (method === "PUT") {
        const data = stripId(body);
        await setDoc(doc(db, "categories", id), data, { merge: true });
        return ok({ id, ...data });
      }
      if (method === "DELETE") {
        await deleteDoc(doc(db, "categories", id));
        return ok();
      }
    }

    // --- MASTER GOALS ---
    if (path === "/api/masterGoals" && method === "GET") {
      return ok(await listCollection("masterGoals"));
    }
    if (path === "/api/masterGoals" && method === "POST") {
      const data = stripId(body);
      const ref = await addDoc(collection(db, "masterGoals"), data);
      return ok({ id: ref.id, ...data });
    }
    const goalMatch = path.match(/^\/api\/masterGoals\/([^/]+)$/);
    if (goalMatch) {
      const id = goalMatch[1];
      if (method === "PUT") {
        const data = stripId(body);
        await setDoc(doc(db, "masterGoals", id), data, { merge: true });
        return ok({ id, ...data });
      }
      if (method === "DELETE") {
        await deleteDoc(doc(db, "masterGoals", id));
        return ok();
      }
    }

    // --- TRACK VISIT ---
    if (path === "/api/track-visit" && method === "POST") {
      const today = new Date().toISOString().split("T")[0];
      const ref = doc(db, "page_views", today);
      const snap = await getDoc(ref);
      const hits = snap.exists() ? ((snap.data() as any).hits || 0) + 1 : 1;
      await setDoc(ref, { hits, date: today }, { merge: true });
      return ok();
    }

    // --- LOGS ---
    if (path === "/api/logs" && method === "GET") {
      return ok(await listCollection("activity_logs"));
    }

    // --- STATS ---
    if (path.startsWith("/api/stats") && method === "GET") {
      const range = query.get("range") || "all";
      return ok(await computeStats(range));
    }

    return fail(404, `No handler for ${method} ${path}`);
  } catch (err) {
    console.error("firebaseApi error:", method, path, err);
    return fail(500, String(err));
  }
}
