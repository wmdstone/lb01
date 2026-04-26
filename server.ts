import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, getDoc, addDoc, updateDoc, deleteDoc, doc, setDoc } from "firebase/firestore";
import fs from "fs";
import cookieParser from "cookie-parser";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const configPath = path.join(__dirname, "firebase-applet-config.json");
const firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));

const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId);
const app = express();
const PORT = 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cookieParser());

const ADMIN_SECRET = process.env.ADMIN_SECRET || "super-secret";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "janki_app";

// Middleware to check admin status
const authenticateAdmin = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const authHeader = req.headers.authorization;
  const headerToken = authHeader && authHeader.split(" ")[1];
  const token = headerToken || req.cookies.admin_token;
  
  if (!token) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  try {
    jwt.verify(token, ADMIN_SECRET);
    next();
  } catch (err) {
    res.status(401).json({ error: "Invalid token" });
  }
};

// --- AUTH ROUTES ---
app.post("/api/login", (req, res) => {
  console.log("Login attempt received");
  try {
    const { password } = req.body;
    console.log("Password matching:", password === ADMIN_PASSWORD);
    if (password === ADMIN_PASSWORD) {
      const token = jwt.sign({ admin: true }, ADMIN_SECRET, { expiresIn: "1d" });
      
      // Cookie approach (fallback)
      res.cookie("admin_token", token, {
        httpOnly: true,
        secure: true,
        sameSite: "none",
        maxAge: 86400000,
      });
      
      console.log("Login successful");
      return res.json({ success: true, token });
    }
    return res.status(401).json({ error: "Incorrect password" });
  } catch (err) {
    console.error("Error during login:", err);
    return res.status(500).json({ error: "Internal server error", details: String(err) });
  }
});

app.post("/api/logout", (req, res) => {
  res.clearCookie("admin_token");
  res.json({ success: true });
});

app.get("/api/me", (req, res) => {
  const authHeader = req.headers.authorization;
  const headerToken = authHeader && authHeader.split(" ")[1];
  const token = headerToken || req.cookies.admin_token;
  
  if (!token) return res.json({ authenticated: false });
  try {
    jwt.verify(token, ADMIN_SECRET);
    res.json({ authenticated: true });
  } catch {
    res.json({ authenticated: false });
  }
});

// --- STUDENT API ---
app.get("/api/settings", async (req, res) => {
  try {
    const docRef = doc(db, "settings", "appearance");
    const snapshot = await getDoc(docRef);
    if (snapshot.exists()) {
      res.json(snapshot.data());
    } else {
      res.json({}); // Default empty
    }
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch settings" });
  }
});

app.put("/api/settings", authenticateAdmin, async (req, res) => {
  try {
    await setDoc(doc(db, "settings", "appearance"), req.body, { merge: true });
    logAction("Theme Applied", "Admin applied new theme and branding settings", "system");
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to update settings" });
  }
});

app.get("/api/students", async (req, res) => {
  try {
    const snapshot = await getDocs(collection(db, "students"));
    const students = snapshot.docs.map(d => {
      const data = d.data();
      delete data.id; 
      return { id: d.id, ...data };
    });
    res.json(students);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch students" });
  }
});

app.post("/api/students", authenticateAdmin, async (req, res) => {
  try {
    const data = { ...req.body };
    delete data.id;
    const docRef = await addDoc(collection(db, "students"), data);
    res.json({ id: docRef.id, ...data });
  } catch (err) {
    console.error("Failed to create student", err);
    res.status(500).json({ error: "Failed to create student", details: String(err) });
  }
});

app.post("/api/students/snapshot-ranks", authenticateAdmin, async (req, res) => {
  try {
    const studentSnap = await getDocs(collection(db, "students"));
    const masterSnap = await getDocs(collection(db, "masterGoals"));
    
    const masterGoalsMap = new Map();
    masterSnap.docs.forEach(d => masterGoalsMap.set(d.id, d.data().points || 0));

    const calculatePoints = (assignedGoals: any[]) => {
      if (!assignedGoals) return 0;
      return assignedGoals.reduce((sum, g) => {
        if (g.completed) {
          return sum + (g.points || masterGoalsMap.get(g.goalId) || 0);
        }
        return sum;
      }, 0);
    };

    const students = studentSnap.docs.map(d => ({ id: d.id, ...d.data() as any }));
    students.forEach(s => {
      s.totalPts = calculatePoints(s.assignedGoals);
    });
    
    // Sort descending by points
    students.sort((a, b) => b.totalPts - a.totalPts);

    // Update previousRank to current rank
    const updatePromises = students.map((s, index) => {
      return updateDoc(doc(db, "students", s.id), {
        previousRank: index + 1
      });
    });

    await Promise.all(updatePromises);
    res.json({ success: true });
  } catch (err) {
    console.error("Failed to snapshot ranks", err);
    res.status(500).json({ error: "Failed to snapshot ranks" });
  }
});

app.put("/api/students/:id", authenticateAdmin, async (req, res) => {
  try {
    const data = { ...req.body };
    delete data.id;
    await setDoc(doc(db, "students", req.params.id), data, { merge: true });
    logAction("Student Updated", `Updated data/goals for student ${data.name}`, "education");
    res.json({ id: req.params.id, ...data });
  } catch (err) {
    res.status(500).json({ error: "Failed to update student" });
  }
});

app.delete("/api/students/:id", authenticateAdmin, async (req, res) => {
  try {
    await deleteDoc(doc(db, "students", req.params.id));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete student" });
  }
});

// --- CATEGORIES API ---
app.get("/api/categories", async (req, res) => {
  try {
    const snapshot = await getDocs(collection(db, "categories"));
    const categories = snapshot.docs.map(d => {
      const data = d.data();
      delete data.id;
      return { id: d.id, ...data };
    });
    res.json(categories);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch categories" });
  }
});

app.post("/api/categories", authenticateAdmin, async (req, res) => {
  try {
    const data = { ...req.body };
    delete data.id;
    const docRef = await addDoc(collection(db, "categories"), data);
    res.json({ id: docRef.id, ...data });
  } catch (err) {
    console.error("Failed to create category", err);
    res.status(500).json({ error: "Failed to create category", details: String(err) });
  }
});

app.put("/api/categories/:id", authenticateAdmin, async (req, res) => {
  try {
    const data = { ...req.body };
    delete data.id;
    await setDoc(doc(db, "categories", req.params.id), data, { merge: true });
    res.json({ id: req.params.id, ...data });
  } catch (err) {
    res.status(500).json({ error: "Failed to update category" });
  }
});

app.delete("/api/categories/:id", authenticateAdmin, async (req, res) => {
  try {
    await deleteDoc(doc(db, "categories", req.params.id));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete category" });
  }
});

// --- MASTER GOALS API ---
app.get("/api/masterGoals", async (req, res) => {
  try {
    const snapshot = await getDocs(collection(db, "masterGoals"));
    const goals = snapshot.docs.map(d => {
      const data = d.data();
      delete data.id;
      return { id: d.id, ...data };
    });
    res.json(goals);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch goals" });
  }
});

app.post("/api/masterGoals", authenticateAdmin, async (req, res) => {
  try {
    const data = { ...req.body };
    delete data.id;
    const docRef = await addDoc(collection(db, "masterGoals"), data);
    res.json({ id: docRef.id, ...data });
  } catch (err) {
    console.error("Failed to create goal", err);
    res.status(500).json({ error: "Failed to create goal", details: String(err) });
  }
});

app.put("/api/masterGoals/:id", authenticateAdmin, async (req, res) => {
  try {
    const data = { ...req.body };
    delete data.id;
    await setDoc(doc(db, "masterGoals", req.params.id), data, { merge: true });
    res.json({ id: req.params.id, ...data });
  } catch (err) {
    res.status(500).json({ error: "Failed to update goal" });
  }
});

app.delete("/api/masterGoals/:id", authenticateAdmin, async (req, res) => {
  try {
    await deleteDoc(doc(db, "masterGoals", req.params.id));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete goal" });
  }
});

// --- STATS & LOGGING API ---
const logAction = async (action: string, details: string, type: 'education' | 'system') => {
  try {
    await addDoc(collection(db, "activity_logs"), {
      action,
      details,
      type,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error("Failed to append log:", err);
  }
};

app.post("/api/track-visit", async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const docRef = doc(db, "page_views", today);
    // Simple incremental approximation without transactions to keep client simple
    // Note: a more robust approach is using `increment` from firestore SDK, but we read/write for simplicity
    const snapshot = await getDocs(collection(db, "page_views"));
    let currentHits = 0;
    snapshot.docs.forEach(d => {
      if (d.id === today) currentHits = d.data().hits || 0;
    });
    
    await setDoc(docRef, { hits: currentHits + 1, date: today }, { merge: true });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to track visit" });
  }
});

app.get("/api/logs", authenticateAdmin, async (req, res) => {
  try {
    // get all logs, sort descending
    const snapshot = await getDocs(collection(db, "activity_logs"));
    const logs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    // client handles sorting to avoid missing index errors in firestore without composite indexes
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch logs" });
  }
});

app.get("/api/stats", authenticateAdmin, async (req, res) => {
  try {
    const range = req.query.range as string || 'all'; // 'today', '1w', '1m', '1y', 'all'
    const now = new Date();
    let cutoff = new Date(0);
    
    if (range === 'today') cutoff = new Date(now.setHours(0,0,0,0));
    if (range === '1w') cutoff = new Date(now.setDate(now.getDate() - 7));
    if (range === '1m') cutoff = new Date(now.setMonth(now.getMonth() - 1));
    if (range === '1y') cutoff = new Date(now.setFullYear(now.getFullYear() - 1));

    // Gather overall stats
    const studentSnap = await getDocs(collection(db, "students"));
    const students = studentSnap.docs.map(d => d.data());
    
    const catSnap = await getDocs(collection(db, "categories"));
    const masterSnap = await getDocs(collection(db, "masterGoals"));
    
    const viewSnap = await getDocs(collection(db, "page_views"));
    const views = viewSnap.docs.map(d => Object.assign({ id: d.id }, d.data()));

    let totalPoints = 0;
    let completedGoals = 0;
    let activeGoals = 0;

    // Filter within cutoff
    students.forEach((s: any) => {
      if (s.assignedGoals) {
        s.assignedGoals.forEach((g: any) => {
          activeGoals++;
          const completedAt = g.completedAt ? new Date(g.completedAt) : null;
          if (completedAt && completedAt >= cutoff) {
            completedGoals++;
            totalPoints += (g.points || 0);
          }
        });
      }
    });

    const visitors = views.filter((v: any) => new Date(v.date) >= cutoff).reduce((acc: number, v: any) => acc + (v.hits || 0), 0);

    // Prepare point trend data by grouping completed goals by date
    // Simple grouping: YYYY-MM-DD -> Points
    const chartDataMap: { [key: string]: number } = {};
    students.forEach((s: any) => {
      if (s.assignedGoals) {
        s.assignedGoals.forEach((g: any) => {
          if (g.completedAt && g.completed) {
            const dateStr = g.completedAt.split('T')[0];
            const gDate = new Date(dateStr);
            if (gDate >= cutoff) {
               const mgData = masterSnap.docs.find(d => d.id === g.goalId)?.data();
               const mgPoints = mgData?.points || 0;
               chartDataMap[dateStr] = (chartDataMap[dateStr] || 0) + mgPoints;
            }
          }
        });
      }
    });

    const chartData = Object.keys(chartDataMap).sort().map(date => ({
      date,
      points: chartDataMap[date]
    }));

    res.json({
      totalStudents: students.length,
      totalActiveGoals: activeGoals,
      totalCategories: catSnap.size,
      completedGoals,
      totalPoints,
      uniqueVisitors: visitors,
      chartData
    });

  } catch (err) {
    res.status(500).json({ error: "Failed to fetch stats", details: String(err) });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
