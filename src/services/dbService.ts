/**
 * Centralized Database Service Layer
 * 
 * This abstraction provides a single entry point for all database operations,
 * making it easy to swap between Firebase, Supabase, or other backends
 * by only changing the implementation in this file.
 * 
 * Benefits:
 * - Single source of truth for all CRUD operations
 * - Easy migration path to Supabase
 * - Consistent error handling and cache invalidation
 * - Type-safe operations with strict TypeScript interfaces
 */

import {
  getActiveConnection,
  connSelect,
  connSelectQuery,
  connInsertReturning,
  connUpsertReturning,
  connUpdate,
  connDeleteById,
  type DbConnection,
} from '@/lib/dbConnections';
import type { Post, Student, Category, MasterGoal, AdminUser } from '@/lib/types';

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface ServiceResult<T> {
  data: T | null;
  error: string | null;
  success: boolean;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  orderBy?: string;
  orderDir?: 'asc' | 'desc';
}

export interface PostFilters {
  status?: 'draft' | 'published';
  category?: string;
  authorId?: string;
  search?: string;
}

// Cache invalidation callback type
export type CacheInvalidator = (keys: string[]) => void;

// Global cache invalidator - set by the consuming component
let globalCacheInvalidator: CacheInvalidator | null = null;

export function setCacheInvalidator(fn: CacheInvalidator) {
  globalCacheInvalidator = fn;
}

function invalidateCache(keys: string[]) {
  if (globalCacheInvalidator) {
    globalCacheInvalidator(keys);
  }
}

// ============================================================================
// Post/Blog Service
// ============================================================================

function normalizePostRow(r: Record<string, unknown>): Post {
  if (!r) return r as unknown as Post;
  return {
    ...r,
    id: String(r.id || ''),
    title: String(r.title || ''),
    slug: String(r.slug || ''),
    content: String(r.content || ''),
    excerpt: String(r.excerpt || ''),
    featured_image: String(r.featured_image || r.cover_image || ''),
    author_id: String(r.author_id || r.author || ''),
    status: (r.status as 'draft' | 'published') || 'draft',
    category: String(r.category || ''),
    tags: Array.isArray(r.tags) ? r.tags : [],
    meta_title: r.meta_title as string | undefined,
    meta_description: r.meta_description as string | undefined,
    published_at: r.published_at as string | null,
    updated_at: String(r.updated_at || ''),
    created_at: String(r.created_at || ''),
  } as Post;
}

function normalizePostWrite(body: Partial<Post>): Record<string, unknown> {
  const out: Record<string, unknown> = { ...body };
  // Map featured_image → cover_image for DB compatibility
  if (out.featured_image !== undefined) {
    out.cover_image = out.featured_image;
  }
  // Map author_id → author for DB compatibility
  if (out.author_id !== undefined) {
    out.author = out.author_id;
  }
  return out;
}

export const PostService = {
  /**
   * Fetch all posts with optional filtering
   */
  async getAll(filters?: PostFilters): Promise<ServiceResult<Post[]>> {
    try {
      const conn = getActiveConnection();
      const rows = await connSelectQuery(conn, 'posts', 'select=*&order=created_at.desc');
      let posts = (rows as Record<string, unknown>[]).map(normalizePostRow);

      // Apply client-side filters (Firebase doesn't support complex queries)
      if (filters) {
        if (filters.status) {
          posts = posts.filter(p => p.status === filters.status);
        }
        if (filters.category) {
          posts = posts.filter(p => p.category === filters.category);
        }
        if (filters.authorId) {
          posts = posts.filter(p => p.author_id === filters.authorId);
        }
        if (filters.search) {
          const q = filters.search.toLowerCase();
          posts = posts.filter(p => 
            p.title.toLowerCase().includes(q) || 
            p.excerpt?.toLowerCase().includes(q)
          );
        }
      }

      return { data: posts, error: null, success: true };
    } catch (err) {
      return { data: null, error: String(err), success: false };
    }
  },

  /**
   * Fetch a single post by ID or slug
   */
  async getById(idOrSlug: string): Promise<ServiceResult<Post>> {
    try {
      const conn = getActiveConnection();
      const rows = await connSelect(conn, 'posts');
      const post = (rows as Record<string, unknown>[]).find(
        r => r.id === idOrSlug || r.slug === idOrSlug
      );
      if (!post) {
        return { data: null, error: 'Post not found', success: false };
      }
      return { data: normalizePostRow(post), error: null, success: true };
    } catch (err) {
      return { data: null, error: String(err), success: false };
    }
  },

  /**
   * Create a new post
   */
  async create(post: Partial<Post>): Promise<ServiceResult<Post>> {
    try {
      const conn = getActiveConnection();
      const input = normalizePostWrite({
        ...post,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      // Remove client-side id to let DB generate UUID
      delete input.id;
      
      const rows = await connInsertReturning(conn, 'posts', [input]);
      const created = rows?.[0] ? normalizePostRow(rows[0] as Record<string, unknown>) : null;
      
      // Invalidate caches
      invalidateCache(['posts']);
      
      return { data: created, error: null, success: true };
    } catch (err) {
      return { data: null, error: String(err), success: false };
    }
  },

  /**
   * Update an existing post
   */
  async update(id: string, patch: Partial<Post>): Promise<ServiceResult<Post>> {
    try {
      const conn = getActiveConnection();
      const input = normalizePostWrite({
        ...patch,
        updated_at: new Date().toISOString(),
      });
      
      const rows = await connUpdate(conn, 'posts', `id=eq.${id}`, input);
      const updated = rows?.[0] ? normalizePostRow(rows[0] as Record<string, unknown>) : null;
      
      // Invalidate caches
      invalidateCache(['posts', `post-${id}`]);
      
      return { data: updated, error: null, success: true };
    } catch (err) {
      return { data: null, error: String(err), success: false };
    }
  },

  /**
   * Delete a post
   */
  async delete(id: string): Promise<ServiceResult<boolean>> {
    try {
      const conn = getActiveConnection();
      await connDeleteById(conn, 'posts', id);
      
      // Invalidate caches
      invalidateCache(['posts', `post-${id}`]);
      
      return { data: true, error: null, success: true };
    } catch (err) {
      return { data: false, error: String(err), success: false };
    }
  },

  /**
   * Get posts by category
   */
  async getByCategory(category: string): Promise<ServiceResult<Post[]>> {
    return this.getAll({ status: 'published', category });
  },

  /**
   * Get published posts only (for public pages)
   */
  async getPublished(): Promise<ServiceResult<Post[]>> {
    return this.getAll({ status: 'published' });
  },
};

// ============================================================================
// Student Service
// ============================================================================

function normalizeStudentRow(r: Record<string, unknown>): Student {
  return {
    id: String(r.id || ''),
    name: String(r.name || ''),
    bio: String(r.bio || ''),
    photo: String(r.photo || ''),
    tags: Array.isArray(r.tags) ? r.tags : [],
    assignedGoals: Array.isArray(r.assigned_goals) ? r.assigned_goals : [],
    totalPoints: Number(r.total_points) || 0,
    previousRank: r.previous_rank as number | undefined,
    createdAt: r.created_at as string | undefined,
  };
}

function normalizeStudentWrite(s: Partial<Student>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (s.name !== undefined) out.name = s.name;
  if (s.bio !== undefined) out.bio = s.bio;
  if (s.photo !== undefined) out.photo = s.photo;
  if (s.tags !== undefined) out.tags = s.tags;
  if (s.assignedGoals !== undefined) out.assigned_goals = s.assignedGoals;
  if (s.totalPoints !== undefined) out.total_points = s.totalPoints;
  if (s.previousRank !== undefined) out.previous_rank = s.previousRank;
  return out;
}

export const StudentService = {
  async getAll(): Promise<ServiceResult<Student[]>> {
    try {
      const conn = getActiveConnection();
      const rows = await connSelect(conn, 'students');
      return { 
        data: (rows as Record<string, unknown>[]).map(normalizeStudentRow), 
        error: null, 
        success: true 
      };
    } catch (err) {
      return { data: null, error: String(err), success: false };
    }
  },

  async create(student: Partial<Student>): Promise<ServiceResult<Student>> {
    try {
      const conn = getActiveConnection();
      const input = normalizeStudentWrite(student);
      const rows = await connInsertReturning(conn, 'students', [input]);
      invalidateCache(['students']);
      return { 
        data: rows?.[0] ? normalizeStudentRow(rows[0] as Record<string, unknown>) : null, 
        error: null, 
        success: true 
      };
    } catch (err) {
      return { data: null, error: String(err), success: false };
    }
  },

  async update(id: string, patch: Partial<Student>): Promise<ServiceResult<Student>> {
    try {
      const conn = getActiveConnection();
      const input = normalizeStudentWrite(patch);
      const rows = await connUpdate(conn, 'students', `id=eq.${id}`, input);
      invalidateCache(['students', `student-${id}`]);
      return { 
        data: rows?.[0] ? normalizeStudentRow(rows[0] as Record<string, unknown>) : null, 
        error: null, 
        success: true 
      };
    } catch (err) {
      return { data: null, error: String(err), success: false };
    }
  },

  async delete(id: string): Promise<ServiceResult<boolean>> {
    try {
      const conn = getActiveConnection();
      await connDeleteById(conn, 'students', id);
      invalidateCache(['students', `student-${id}`]);
      return { data: true, error: null, success: true };
    } catch (err) {
      return { data: false, error: String(err), success: false };
    }
  },
};

// ============================================================================
// Category Service
// ============================================================================

export const CategoryService = {
  async getAll(): Promise<ServiceResult<Category[]>> {
    try {
      const conn = getActiveConnection();
      const rows = await connSelect(conn, 'categories');
      return { 
        data: (rows as { id: string; name: string }[]).map(r => ({ id: r.id, name: r.name })), 
        error: null, 
        success: true 
      };
    } catch (err) {
      return { data: null, error: String(err), success: false };
    }
  },

  async create(category: Partial<Category>): Promise<ServiceResult<Category>> {
    try {
      const conn = getActiveConnection();
      const rows = await connInsertReturning(conn, 'categories', [{ name: category.name }]);
      invalidateCache(['categories']);
      return { 
        data: rows?.[0] as Category || null, 
        error: null, 
        success: true 
      };
    } catch (err) {
      return { data: null, error: String(err), success: false };
    }
  },

  async delete(id: string): Promise<ServiceResult<boolean>> {
    try {
      const conn = getActiveConnection();
      await connDeleteById(conn, 'categories', id);
      invalidateCache(['categories']);
      return { data: true, error: null, success: true };
    } catch (err) {
      return { data: false, error: String(err), success: false };
    }
  },
};

// ============================================================================
// MasterGoal Service
// ============================================================================

function normalizeGoalRow(r: Record<string, unknown>): MasterGoal {
  return {
    id: String(r.id || ''),
    categoryId: String(r.category_id || ''),
    title: String(r.title || ''),
    points: Number(r.points) || 0,
    description: String(r.description || ''),
  };
}

export const MasterGoalService = {
  async getAll(): Promise<ServiceResult<MasterGoal[]>> {
    try {
      const conn = getActiveConnection();
      const rows = await connSelect(conn, 'master_goals');
      return { 
        data: (rows as Record<string, unknown>[]).map(normalizeGoalRow), 
        error: null, 
        success: true 
      };
    } catch (err) {
      return { data: null, error: String(err), success: false };
    }
  },

  async create(goal: Partial<MasterGoal>): Promise<ServiceResult<MasterGoal>> {
    try {
      const conn = getActiveConnection();
      const input = {
        category_id: goal.categoryId,
        title: goal.title,
        points: goal.points,
        description: goal.description,
      };
      const rows = await connInsertReturning(conn, 'master_goals', [input]);
      invalidateCache(['masterGoals']);
      return { 
        data: rows?.[0] ? normalizeGoalRow(rows[0] as Record<string, unknown>) : null, 
        error: null, 
        success: true 
      };
    } catch (err) {
      return { data: null, error: String(err), success: false };
    }
  },

  async update(id: string, patch: Partial<MasterGoal>): Promise<ServiceResult<MasterGoal>> {
    try {
      const conn = getActiveConnection();
      const input: Record<string, unknown> = {};
      if (patch.categoryId !== undefined) input.category_id = patch.categoryId;
      if (patch.title !== undefined) input.title = patch.title;
      if (patch.points !== undefined) input.points = patch.points;
      if (patch.description !== undefined) input.description = patch.description;
      
      const rows = await connUpdate(conn, 'master_goals', `id=eq.${id}`, input);
      invalidateCache(['masterGoals']);
      return { 
        data: rows?.[0] ? normalizeGoalRow(rows[0] as Record<string, unknown>) : null, 
        error: null, 
        success: true 
      };
    } catch (err) {
      return { data: null, error: String(err), success: false };
    }
  },

  async delete(id: string): Promise<ServiceResult<boolean>> {
    try {
      const conn = getActiveConnection();
      await connDeleteById(conn, 'master_goals', id);
      invalidateCache(['masterGoals']);
      return { data: true, error: null, success: true };
    } catch (err) {
      return { data: false, error: String(err), success: false };
    }
  },
};

// ============================================================================
// AdminUser Service
// ============================================================================

export const AdminUserService = {
  async getAll(): Promise<ServiceResult<Omit<AdminUser, 'password'>[]>> {
    try {
      const conn = getActiveConnection();
      const rows = await connSelectQuery(conn, 'admin_users');
      const users = (rows as (AdminUser & { password?: string })[]).map(u => {
        const { password, ...safeUser } = u;
        return safeUser;
      });
      return { data: users, error: null, success: true };
    } catch (err) {
      return { data: null, error: String(err), success: false };
    }
  },

  async create(user: Partial<AdminUser>): Promise<ServiceResult<Omit<AdminUser, 'password'>>> {
    try {
      const conn = getActiveConnection();
      const newUser = {
        id: Date.now().toString(),
        privileges: [],
        created_at: new Date().toISOString(),
        ...user,
      };
      await connInsertReturning(conn, 'admin_users', [newUser]);
      invalidateCache(['admin-users']);
      const { password, ...safeUser } = newUser as AdminUser;
      return { data: safeUser, error: null, success: true };
    } catch (err) {
      return { data: null, error: String(err), success: false };
    }
  },

  async update(id: string, patch: Partial<AdminUser>): Promise<ServiceResult<boolean>> {
    try {
      const conn = getActiveConnection();
      await connUpdate(conn, 'admin_users', `id=eq.${id}`, patch);
      invalidateCache(['admin-users']);
      return { data: true, error: null, success: true };
    } catch (err) {
      return { data: false, error: String(err), success: false };
    }
  },

  async delete(id: string): Promise<ServiceResult<boolean>> {
    try {
      const conn = getActiveConnection();
      await connDeleteById(conn, 'admin_users', id);
      invalidateCache(['admin-users']);
      return { data: true, error: null, success: true };
    } catch (err) {
      return { data: false, error: String(err), success: false };
    }
  },
};

// ============================================================================
// Activity Logs Service
// ============================================================================

export interface ActivityLog {
  id: string;
  action: string;
  details: string;
  type: 'education' | 'system';
  timestamp: string;
}

export const ActivityLogService = {
  async log(action: string, details: string, type: 'education' | 'system'): Promise<void> {
    try {
      const conn = getActiveConnection();
      await connInsertReturning(conn, 'activity_logs', [{
        id: `log-${Date.now()}`,
        action,
        details,
        type,
        timestamp: new Date().toISOString(),
      }]);
    } catch (e) {
      console.warn('Activity log failed:', e);
    }
  },

  async getAll(): Promise<ServiceResult<ActivityLog[]>> {
    try {
      const conn = getActiveConnection();
      const rows = await connSelectQuery(conn, 'activity_logs', 'select=*&order=timestamp.desc&limit=500');
      return { data: rows as ActivityLog[], error: null, success: true };
    } catch (err) {
      return { data: null, error: String(err), success: false };
    }
  },
};

// ============================================================================
// Settings Service
// ============================================================================

export const SettingsService = {
  async get(): Promise<ServiceResult<Record<string, unknown>>> {
    try {
      const conn = getActiveConnection();
      const rows = await connSelectQuery(conn, 'settings', 'select=data&id=eq.appearance');
      return { data: rows[0]?.data || {}, error: null, success: true };
    } catch (err) {
      return { data: null, error: String(err), success: false };
    }
  },

  async update(settings: Record<string, unknown>): Promise<ServiceResult<boolean>> {
    try {
      const conn = getActiveConnection();
      await connUpsertReturning(conn, 'settings', [{ id: 'appearance', data: settings }], 'id');
      invalidateCache(['settings']);
      await ActivityLogService.log('Theme Applied', 'Admin applied new theme and branding settings', 'system');
      return { data: true, error: null, success: true };
    } catch (err) {
      return { data: false, error: String(err), success: false };
    }
  },
};

// ============================================================================
// Unified Export for convenience
// ============================================================================

export const db = {
  posts: PostService,
  students: StudentService,
  categories: CategoryService,
  masterGoals: MasterGoalService,
  adminUsers: AdminUserService,
  activityLogs: ActivityLogService,
  settings: SettingsService,
};

export default db;
