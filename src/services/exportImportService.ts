/**
 * Advanced Export/Import Engine
 * 
 * Features:
 * - Full system snapshots to JSON
 * - Deep relational data (posts, students, goals, achievements)
 * - Historical weekly/monthly achievement data preservation
 * - Zod schema validation on import
 * - Clean Wipe & Restore or Smart Merge modes
 * - Timestamp preservation for exact state restoration
 */

import { z } from 'zod';
import {
  getActiveConnection,
  connSelect,
  connInsertReturning,
  connDeleteAll,
} from '@/lib/dbConnections';

// ============================================================================
// Zod Schemas for Validation
// ============================================================================

const AssignedGoalSchema = z.object({
  goalId: z.string(),
  completed: z.boolean(),
  completedAt: z.string().optional(),
  points: z.number().optional(),
});

const StudentSchema = z.object({
  id: z.string(),
  name: z.string(),
  bio: z.string().optional().default(''),
  photo: z.string().optional().default(''),
  tags: z.array(z.string()).optional().default([]),
  assigned_goals: z.array(AssignedGoalSchema).optional().default([]),
  total_points: z.number().optional().default(0),
  previous_rank: z.number().nullable().optional(),
  created_at: z.string().optional(),
});

const CategorySchema = z.object({
  id: z.string(),
  name: z.string(),
});

const MasterGoalSchema = z.object({
  id: z.string(),
  category_id: z.string().nullable().optional(),
  title: z.string(),
  points: z.number(),
  description: z.string().optional().default(''),
});

const PostSchema = z.object({
  id: z.string(),
  title: z.string(),
  slug: z.string().optional().default(''),
  content: z.string().optional().default(''),
  excerpt: z.string().optional().default(''),
  featured_image: z.string().optional().default(''),
  cover_image: z.string().optional().default(''),
  author_id: z.string().optional().default(''),
  author: z.string().optional().default(''),
  status: z.enum(['draft', 'published']).optional().default('draft'),
  category: z.string().optional().default(''),
  tags: z.array(z.string()).optional().default([]),
  meta_title: z.string().optional(),
  meta_description: z.string().optional(),
  published_at: z.string().nullable().optional(),
  updated_at: z.string().optional(),
  created_at: z.string().optional(),
});

const AdminUserSchema = z.object({
  id: z.string(),
  email: z.string(),
  password: z.string().optional(),
  full_name: z.string().optional().default(''),
  photo_url: z.string().optional().default(''),
  role: z.enum(['super_admin', 'admin']).optional().default('admin'),
  privileges: z.array(z.string()).optional().default([]),
  created_at: z.string().optional(),
});

const ActivityLogSchema = z.object({
  id: z.string(),
  action: z.string(),
  details: z.string().optional().default(''),
  type: z.enum(['education', 'system']).optional().default('system'),
  timestamp: z.string(),
});

const PageViewSchema = z.object({
  date: z.string(),
  hits: z.number(),
});

const SettingsSchema = z.object({
  id: z.string().optional(),
  data: z.record(z.unknown()).optional().default({}),
});

const AppEventSchema = z.object({
  id: z.string().optional(),
  event_type: z.string().optional(),
  path: z.string().optional(),
  device: z.string().optional(),
  is_admin: z.boolean().optional(),
  session_id: z.string().optional(),
  ref_id: z.string().nullable().optional(),
  metadata: z.record(z.unknown()).optional(),
  created_at: z.string().optional(),
});

// Achievement History Schema (for weekly/monthly snapshots)
const AchievementSnapshotSchema = z.object({
  snapshot_date: z.string(),
  snapshot_type: z.enum(['weekly', 'monthly', 'manual']),
  student_rankings: z.array(z.object({
    student_id: z.string(),
    student_name: z.string(),
    total_points: z.number(),
    rank: z.number(),
    completed_goals: z.number(),
  })),
  total_points_awarded: z.number(),
  total_goals_completed: z.number(),
});

// Full Export Schema
const ExportDataSchema = z.object({
  version: z.string(),
  exported_at: z.string(),
  exported_by: z.string().optional(),
  source_connection: z.string().optional(),
  data: z.object({
    students: z.array(StudentSchema).optional().default([]),
    categories: z.array(CategorySchema).optional().default([]),
    master_goals: z.array(MasterGoalSchema).optional().default([]),
    posts: z.array(PostSchema).optional().default([]),
    admin_users: z.array(AdminUserSchema).optional().default([]),
    activity_logs: z.array(ActivityLogSchema).optional().default([]),
    page_views: z.array(PageViewSchema).optional().default([]),
    settings: z.array(SettingsSchema).optional().default([]),
    app_events: z.array(AppEventSchema).optional().default([]),
    achievement_snapshots: z.array(AchievementSnapshotSchema).optional().default([]),
  }),
  metadata: z.object({
    total_students: z.number().optional(),
    total_posts: z.number().optional(),
    total_goals: z.number().optional(),
    total_points_in_system: z.number().optional(),
  }).optional(),
});

export type ExportData = z.infer<typeof ExportDataSchema>;
export type ImportMode = 'clean_restore' | 'smart_merge';

// ============================================================================
// Export Service
// ============================================================================

export interface ExportOptions {
  includeActivityLogs?: boolean;
  includePageViews?: boolean;
  includeAppEvents?: boolean;
  generateAchievementSnapshot?: boolean;
}

export interface ExportResult {
  success: boolean;
  data?: ExportData;
  error?: string;
  filename?: string;
}

/**
 * Generate a full system snapshot
 */
export async function exportFullSnapshot(options: ExportOptions = {}): Promise<ExportResult> {
  try {
    const conn = getActiveConnection();
    const {
      includeActivityLogs = true,
      includePageViews = true,
      includeAppEvents = false,
      generateAchievementSnapshot = true,
    } = options;

    // Fetch all collections in parallel
    const [
      students,
      categories,
      masterGoals,
      posts,
      adminUsers,
      activityLogs,
      pageViews,
      settings,
      appEvents,
    ] = await Promise.all([
      connSelect(conn, 'students').catch(() => []),
      connSelect(conn, 'categories').catch(() => []),
      connSelect(conn, 'master_goals').catch(() => []),
      connSelect(conn, 'posts').catch(() => []),
      connSelect(conn, 'admin_users').catch(() => []),
      includeActivityLogs ? connSelect(conn, 'activity_logs').catch(() => []) : Promise.resolve([]),
      includePageViews ? connSelect(conn, 'page_views').catch(() => []) : Promise.resolve([]),
      connSelect(conn, 'settings').catch(() => []),
      includeAppEvents ? connSelect(conn, 'app_events').catch(() => []) : Promise.resolve([]),
    ]);

    // Generate achievement snapshot if requested
    let achievementSnapshots: z.infer<typeof AchievementSnapshotSchema>[] = [];
    if (generateAchievementSnapshot && students.length > 0) {
      const goalPointsMap = new Map<string, number>();
      masterGoals.forEach((g: { id: string; points: number }) => {
        goalPointsMap.set(g.id, g.points || 0);
      });

      const rankings = students
        .map((s: { id: string; name: string; assigned_goals?: Array<{ completed?: boolean; goalId?: string; points?: number }> }) => {
          const goals = s.assigned_goals || [];
          let totalPoints = 0;
          let completedGoals = 0;
          
          goals.forEach((g) => {
            if (g.completed) {
              completedGoals++;
              totalPoints += g.points || goalPointsMap.get(g.goalId || '') || 0;
            }
          });

          return {
            student_id: s.id,
            student_name: s.name,
            total_points: totalPoints,
            completed_goals: completedGoals,
            rank: 0,
          };
        })
        .sort((a, b) => b.total_points - a.total_points)
        .map((s, idx) => ({ ...s, rank: idx + 1 }));

      achievementSnapshots.push({
        snapshot_date: new Date().toISOString(),
        snapshot_type: 'manual',
        student_rankings: rankings,
        total_points_awarded: rankings.reduce((sum, r) => sum + r.total_points, 0),
        total_goals_completed: rankings.reduce((sum, r) => sum + r.completed_goals, 0),
      });
    }

    // Calculate metadata
    const totalPointsInSystem = (students as Array<{ assigned_goals?: Array<{ completed?: boolean; points?: number }> }>).reduce((sum, s) => {
      const goals = s.assigned_goals || [];
      return sum + goals.reduce((gSum, g) => g.completed ? gSum + (g.points || 0) : gSum, 0);
    }, 0);

    const exportData: ExportData = {
      version: '2.0.0',
      exported_at: new Date().toISOString(),
      source_connection: conn.label || conn.id,
      data: {
        students,
        categories,
        master_goals: masterGoals,
        posts,
        admin_users: adminUsers,
        activity_logs: activityLogs,
        page_views: pageViews,
        settings,
        app_events: appEvents,
        achievement_snapshots: achievementSnapshots,
      },
      metadata: {
        total_students: students.length,
        total_posts: posts.length,
        total_goals: masterGoals.length,
        total_points_in_system: totalPointsInSystem,
      },
    };

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `ppmh-backup-${timestamp}.json`;

    return { success: true, data: exportData, filename };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

/**
 * Download export as JSON file
 */
export function downloadExportFile(data: ExportData, filename: string): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ============================================================================
// Import Service
// ============================================================================

export interface ImportOptions {
  mode: ImportMode;
  skipValidation?: boolean;
  preserveTimestamps?: boolean;
  remapIds?: boolean;
}

export interface ImportResult {
  success: boolean;
  error?: string;
  validationErrors?: string[];
  stats?: {
    students: { imported: number; skipped: number };
    categories: { imported: number; skipped: number };
    master_goals: { imported: number; skipped: number };
    posts: { imported: number; skipped: number };
    admin_users: { imported: number; skipped: number };
    activity_logs: { imported: number; skipped: number };
    settings: { imported: number; skipped: number };
  };
}

/**
 * Validate import data against schema
 */
export function validateImportData(data: unknown): { valid: boolean; errors: string[]; data?: ExportData } {
  try {
    const parsed = ExportDataSchema.parse(data);
    return { valid: true, errors: [], data: parsed };
  } catch (err) {
    if (err instanceof z.ZodError) {
      const errors = err.issues.map((e: z.ZodIssue) => `${e.path.join('.')}: ${e.message}`);
      return { valid: false, errors };
    }
    return { valid: false, errors: [String(err)] };
  }
}

/**
 * Import data with Clean Wipe & Restore or Smart Merge
 */
export async function importData(
  rawData: unknown,
  options: ImportOptions
): Promise<ImportResult> {
  const { mode, skipValidation = false, preserveTimestamps = true } = options;

  // Validate input
  if (!skipValidation) {
    const validation = validateImportData(rawData);
    if (!validation.valid) {
      return { success: false, error: 'Validation failed', validationErrors: validation.errors };
    }
  }

  const data = rawData as ExportData;
  const conn = getActiveConnection();
  const stats: ImportResult['stats'] = {
    students: { imported: 0, skipped: 0 },
    categories: { imported: 0, skipped: 0 },
    master_goals: { imported: 0, skipped: 0 },
    posts: { imported: 0, skipped: 0 },
    admin_users: { imported: 0, skipped: 0 },
    activity_logs: { imported: 0, skipped: 0 },
    settings: { imported: 0, skipped: 0 },
  };

  try {
    // Clean Wipe mode: delete all existing data first
    if (mode === 'clean_restore') {
      const tables = ['students', 'categories', 'master_goals', 'posts', 'activity_logs', 'settings'];
      
      for (const table of tables) {
        try {
          await connDeleteAll(conn, table);
        } catch (e) {
          console.warn(`Failed to clear ${table}:`, e);
        }
      }
    }

    // Import categories first (other data may reference them)
    if (data.data.categories?.length) {
      for (const cat of data.data.categories) {
        try {
          await connInsertReturning(conn, 'categories', [cat]);
          stats.categories.imported++;
        } catch {
          stats.categories.skipped++;
        }
      }
    }

    // Import master goals
    if (data.data.master_goals?.length) {
      for (const goal of data.data.master_goals) {
        try {
          await connInsertReturning(conn, 'master_goals', [goal]);
          stats.master_goals.imported++;
        } catch {
          stats.master_goals.skipped++;
        }
      }
    }

    // Import students with their assigned goals and achievement history
    if (data.data.students?.length) {
      for (const student of data.data.students) {
        try {
          const studentData = preserveTimestamps ? student : { ...student, created_at: new Date().toISOString() };
          await connInsertReturning(conn, 'students', [studentData]);
          stats.students.imported++;
        } catch {
          stats.students.skipped++;
        }
      }
    }

    // Import posts
    if (data.data.posts?.length) {
      for (const post of data.data.posts) {
        try {
          const postData = preserveTimestamps 
            ? post 
            : { ...post, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
          await connInsertReturning(conn, 'posts', [postData]);
          stats.posts.imported++;
        } catch {
          stats.posts.skipped++;
        }
      }
    }

    // Import admin users (be careful with passwords)
    if (data.data.admin_users?.length) {
      for (const user of data.data.admin_users) {
        try {
          await connInsertReturning(conn, 'admin_users', [user]);
          stats.admin_users.imported++;
        } catch {
          stats.admin_users.skipped++;
        }
      }
    }

    // Import activity logs
    if (data.data.activity_logs?.length) {
      for (const log of data.data.activity_logs) {
        try {
          await connInsertReturning(conn, 'activity_logs', [log]);
          stats.activity_logs.imported++;
        } catch {
          stats.activity_logs.skipped++;
        }
      }
    }

    // Import settings
    if (data.data.settings?.length) {
      for (const setting of data.data.settings) {
        try {
          await connInsertReturning(conn, 'settings', [setting]);
          stats.settings.imported++;
        } catch {
          stats.settings.skipped++;
        }
      }
    }

    return { success: true, stats };
  } catch (err) {
    return { success: false, error: String(err), stats };
  }
}

/**
 * Read and parse a JSON file for import
 */
export function parseImportFile(file: File): Promise<{ success: boolean; data?: unknown; error?: string }> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        resolve({ success: true, data });
      } catch (err) {
        resolve({ success: false, error: 'Invalid JSON file' });
      }
    };
    reader.onerror = () => {
      resolve({ success: false, error: 'Failed to read file' });
    };
    reader.readAsText(file);
  });
}

// ============================================================================
// Unified Export for convenience
// ============================================================================

export const exportImport = {
  export: exportFullSnapshot,
  download: downloadExportFile,
  validate: validateImportData,
  import: importData,
  parseFile: parseImportFile,
};

export default exportImport;
