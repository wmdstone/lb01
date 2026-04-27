// Lovable Cloud-backed replacement for the original Express /api/* endpoints.
// Keeps the exact same /api/* contract App.tsx expects, so no UI code had to change.
// (Filename kept for backwards-compat with existing imports.)

import { supabase } from "@/integrations/supabase/client";

// --- Admin password (presentation-level, matches original AI Studio behavior) ---
const ADMIN_PASSWORD = "janki_app";
const TOKEN_VALUE = "client-admin-token";

// --- Response helpers ---
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

// --- Mappers between DB (snake_case) and app (camelCase) ---
const mapStudentRow = (r: any) => ({
  id: r.id,
  name: r.name,
  bio: r.bio || "",
  photo: r.photo || "",
  tags: r.tags || [],
  assignedGoals: r.assigned_goals || [],
  totalPoints: r.total_points || 0,
  previousRank: r.previous_rank ?? undefined,
  createdAt: r.created_at ?? undefined,
});

const mapStudentInput = (s: any) => {
  const out: any = {};
  if (s.name !== undefined) out.name = s.name;
  if (s.bio !== undefined) out.bio = s.bio;
  if (s.photo !== undefined) out.photo = s.photo;
  if (s.tags !== undefined) out.tags = s.tags;
  if (s.assignedGoals !== undefined) out.assigned_goals = s.assignedGoals;
  if (s.totalPoints !== undefined) out.total_points = s.totalPoints;
  if (s.previousRank !== undefined) out.previous_rank = s.previousRank;
  return out;
};

const mapGoalRow = (r: any) => ({
  id: r.id,
  categoryId: r.category_id,
  title: r.title,
  points: r.points,
  description: r.description || "",
});

const mapGoalInput = (g: any) => {
  const out: any = {};
  if (g.categoryId !== undefined) out.category_id = g.categoryId;
  if (g.title !== undefined) out.title = g.title;
  if (g.points !== undefined) out.points = g.points;
  if (g.description !== undefined) out.description = g.description;
  return out;
};

const mapCategoryRow = (r: any) => ({ id: r.id, name: r.name });
const mapCategoryInput = (c: any) => {
  const out: any = {};
  if (c.name !== undefined) out.name = c.name;
  return out;
};

// --- Activity log helper ---
const logAction = async (
  action: string,
  details: string,
  type: "education" | "system",
) => {
  try {
    await supabase
      .from("activity_logs")
      .insert({ action, details, type, timestamp: new Date().toISOString() });
  } catch (e) {
    console.warn("log failed", e);
  }
};

// --- Stats (matches original server.ts behavior, plus custom date ranges) ---
const computeStats = async (range: string, from?: string | null, to?: string | null) => {
  const now = new Date();
  let cutoff = new Date(0);
  let endCutoff: Date | null = null;

  if (from || to) {
    // Custom range — overrides preset.
    cutoff = from ? new Date(from) : new Date(0);
    endCutoff = to ? new Date(to) : null;
  } else {
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
  }

  const [studentsRes, catRes, goalsRes, viewsRes] = await Promise.all([
    supabase.from("students").select("*"),
    supabase.from("categories").select("id"),
    supabase.from("master_goals").select("id, points"),
    supabase.from("page_views").select("date, hits"),
  ]);

  const masterPoints = new Map<string, number>();
  (goalsRes.data || []).forEach((g: any) => masterPoints.set(g.id, g.points || 0));

  let totalPoints = 0;
  let completedGoals = 0;
  let activeGoals = 0;
  const chartMap: Record<string, number> = {};

  (studentsRes.data || []).forEach((s: any) => {
    const goals = s.assigned_goals || [];
    goals.forEach((g: any) => {
      activeGoals++;
      if (g.completed && g.completedAt) {
        const d = new Date(g.completedAt);
        if (d >= cutoff && (!endCutoff || d <= endCutoff)) {
          completedGoals++;
          const pts = g.points || masterPoints.get(g.goalId) || 0;
          totalPoints += pts;
          const day = String(g.completedAt).split("T")[0];
          chartMap[day] = (chartMap[day] || 0) + pts;
        }
      }
    });
  });

  const visitors = (viewsRes.data || [])
    .filter((v: any) => {
      if (!v.date) return false;
      const d = new Date(v.date);
      return d >= cutoff && (!endCutoff || d <= endCutoff);
    })
    .reduce((acc: number, v: any) => acc + (v.hits || 0), 0);

  const chartData = Object.keys(chartMap)
    .sort()
    .map((date) => ({ date, points: chartMap[date] }));

  return {
    totalStudents: studentsRes.data?.length || 0,
    totalActiveGoals: activeGoals,
    totalCategories: catRes.data?.length || 0,
    completedGoals,
    totalPoints,
    uniqueVisitors: visitors,
    chartData,
  };
};

// --- Router ---
export async function firebaseApiFetch(
  url: string,
  init: RequestInit = {},
): Promise<Response> {
  const method = (init.method || "GET").toUpperCase();
  const path = url.split("?")[0];
  const queryStr = url.includes("?") ? url.slice(url.indexOf("?") + 1) : "";
  const query = new URLSearchParams(queryStr);
  let body: any = undefined;
  if (init.body) {
    try {
      body = JSON.parse(init.body as string);
    } catch {
      body = init.body;
    }
  }

  try {
    // ===== AUTH =====
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
      const headers: any = init.headers;
      const auth = headers?.get?.("Authorization") || headers?.Authorization;
      const token = typeof auth === "string" ? auth.replace("Bearer ", "") : null;
      return ok({ authenticated: token === TOKEN_VALUE });
    }

    // ===== SETTINGS =====
    if (path === "/api/settings" && method === "GET") {
      const { data } = await supabase
        .from("settings")
        .select("data")
        .eq("id", "appearance")
        .maybeSingle();
      return ok((data as any)?.data || {});
    }
    if (path === "/api/settings" && method === "PUT") {
      const payload = body || {};
      const { error } = await supabase
        .from("settings")
        .upsert({ id: "appearance", data: payload }, { onConflict: "id" });
      if (error) return fail(500, error.message);
      logAction(
        "Theme Applied",
        "Admin applied new theme and branding settings",
        "system",
      );
      return ok();
    }

    // ===== STUDENTS =====
    if (path === "/api/students" && method === "GET") {
      const { data, error } = await supabase.from("students").select("*");
      if (error) return fail(500, error.message);
      return ok((data || []).map(mapStudentRow));
    }
    if (path === "/api/students" && method === "POST") {
      const input = mapStudentInput(body || {});
      const { data, error } = await supabase
        .from("students")
        .insert(input)
        .select()
        .single();
      if (error) return fail(500, error.message);
      return ok(mapStudentRow(data));
    }
    if (path === "/api/students/snapshot-ranks" && method === "POST") {
      const [{ data: students }, { data: goals }] = await Promise.all([
        supabase.from("students").select("id, assigned_goals"),
        supabase.from("master_goals").select("id, points"),
      ]);
      const map = new Map<string, number>();
      (goals || []).forEach((g: any) => map.set(g.id, g.points || 0));
      const ranked = (students || [])
        .map((s: any) => {
          const pts = (s.assigned_goals || []).reduce(
            (acc: number, g: any) =>
              g.completed ? acc + (g.points || map.get(g.goalId) || 0) : acc,
            0,
          );
          return { id: s.id, pts };
        })
        .sort((a, b) => b.pts - a.pts);
      await Promise.all(
        ranked.map((s, idx) =>
          supabase
            .from("students")
            .update({ previous_rank: idx + 1 })
            .eq("id", s.id),
        ),
      );
      return ok();
    }
    const studentMatch = path.match(/^\/api\/students\/([^/]+)$/);
    if (studentMatch) {
      const id = studentMatch[1];
      if (method === "PUT") {
        const input = mapStudentInput(body || {});
        const { data, error } = await supabase
          .from("students")
          .update(input)
          .eq("id", id)
          .select()
          .single();
        if (error) return fail(500, error.message);
        logAction(
          "Student Updated",
          `Updated data/goals for student ${body?.name || id}`,
          "education",
        );
        return ok(mapStudentRow(data));
      }
      if (method === "DELETE") {
        const { error } = await supabase.from("students").delete().eq("id", id);
        if (error) return fail(500, error.message);
        return ok();
      }
    }

    // ===== CATEGORIES =====
    if (path === "/api/categories" && method === "GET") {
      const { data, error } = await supabase.from("categories").select("*");
      if (error) return fail(500, error.message);
      return ok((data || []).map(mapCategoryRow));
    }
    if (path === "/api/categories" && method === "POST") {
      const input = mapCategoryInput(body || {});
      const { data, error } = await supabase
        .from("categories")
        .insert(input)
        .select()
        .single();
      if (error) return fail(500, error.message);
      return ok(mapCategoryRow(data));
    }
    const catMatch = path.match(/^\/api\/categories\/([^/]+)$/);
    if (catMatch) {
      const id = catMatch[1];
      if (method === "PUT") {
        const input = mapCategoryInput(body || {});
        const { data, error } = await supabase
          .from("categories")
          .update(input)
          .eq("id", id)
          .select()
          .single();
        if (error) return fail(500, error.message);
        return ok(mapCategoryRow(data));
      }
      if (method === "DELETE") {
        const { error } = await supabase.from("categories").delete().eq("id", id);
        if (error) return fail(500, error.message);
        return ok();
      }
    }

    // ===== MASTER GOALS =====
    if (path === "/api/masterGoals" && method === "GET") {
      const { data, error } = await supabase.from("master_goals").select("*");
      if (error) return fail(500, error.message);
      return ok((data || []).map(mapGoalRow));
    }
    if (path === "/api/masterGoals" && method === "POST") {
      const input = mapGoalInput(body || {});
      const { data, error } = await supabase
        .from("master_goals")
        .insert(input)
        .select()
        .single();
      if (error) return fail(500, error.message);
      return ok(mapGoalRow(data));
    }
    const goalMatch = path.match(/^\/api\/masterGoals\/([^/]+)$/);
    if (goalMatch) {
      const id = goalMatch[1];
      if (method === "PUT") {
        const input = mapGoalInput(body || {});
        const { data, error } = await supabase
          .from("master_goals")
          .update(input)
          .eq("id", id)
          .select()
          .single();
        if (error) return fail(500, error.message);
        return ok(mapGoalRow(data));
      }
      if (method === "DELETE") {
        const { error } = await supabase.from("master_goals").delete().eq("id", id);
        if (error) return fail(500, error.message);
        return ok();
      }
    }

    // ===== TRACK VISIT =====
    if (path === "/api/track-visit" && method === "POST") {
      const today = new Date().toISOString().split("T")[0];
      const { data: existing } = await supabase
        .from("page_views")
        .select("hits")
        .eq("date", today)
        .maybeSingle();
      const hits = (existing?.hits || 0) + 1;
      const { error } = await supabase
        .from("page_views")
        .upsert({ date: today, hits }, { onConflict: "date" });
      if (error) return fail(500, error.message);
      return ok();
    }

    // ===== LOGS =====
    if (path === "/api/logs" && method === "GET") {
      const { data, error } = await supabase
        .from("activity_logs")
        .select("*")
        .order("timestamp", { ascending: false })
        .limit(500);
      if (error) return fail(500, error.message);
      return ok(data || []);
    }

    // ===== STATS =====
    if (path.startsWith("/api/stats") && method === "GET") {
      const range = query.get("range") || "all";
      const from = query.get("from");
      const to = query.get("to");
      return ok(await computeStats(range, from, to));
    }

    return fail(404, `No handler for ${method} ${path}`);
  } catch (err: any) {
    console.error("api error:", method, path, err);
    return fail(500, String(err?.message || err));
  }
}
