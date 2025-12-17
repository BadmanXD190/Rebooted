// server.js

// Load environment variables
import dotenv from "dotenv";
dotenv.config();

// Imports
import express from "express";
import bodyParser from "body-parser";
import { createClient } from "@supabase/supabase-js";

// Constants
const OLLAMA_URL = "http://localhost:11434/api/chat";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env");
  process.exit(1);
}

// Create Supabase client (service role – backend only)
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Create Express app
const app = express();
app.use(bodyParser.json());

// ---------- Middleware: Extract user ID from JWT token ----------

async function getUserIdFromToken(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid Authorization header' });
    }
    
    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    // Verify the JWT token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    
    // Attach user ID to request object
    req.userId = user.id;
    next();
  } catch (err) {
    console.error('Error verifying token:', err);
    return res.status(401).json({ error: 'Token verification failed' });
  }
}

// ---------- Helper: save decomposition plan to Supabase ----------

async function savePlanToSupabase(plan, rawText, userId, dueDate = null) {
  if (!userId) {
    throw new Error("User ID is required");
  }

  // 1) Insert project
  const projectTitle =
    plan.summary && plan.summary.trim().length > 0
      ? plan.summary
      : rawText.slice(0, 80);

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .insert([
      {
        user_id: userId,
        title: projectTitle,
        summary: plan.summary ?? null,
        raw_text: rawText,
        due_date: dueDate || null
      }
    ])
    .select()
    .single();

  if (projectError) {
    console.error("Error inserting project:", projectError);
    throw projectError;
  }

  const projectId = project.id;

  // 2) Flatten phases → work_packages → tasks
  const taskRows = [];

  for (const phase of plan.phases ?? []) {
    const phaseId = phase.phase_id;
    const phaseTitle = phase.phase_title;

    for (const wp of phase.work_packages ?? []) {
      const wpId = wp.wp_id;
      const wpTitle = wp.wp_title;

      for (const t of wp.tasks ?? []) {
        taskRows.push({
          project_id: projectId,
          user_id: userId,

          phase_id: phaseId,
          phase_title: phaseTitle,
          wp_id: wpId,
          wp_title: wpTitle,

          task_model_id: t.task_id,
          task_title: t.task_title,
          task_type: t.task_type,

          difficulty: t.difficulty ?? 0,
          procrastination_risk: t.procrastination_risk ?? 0,

          baseline_estimated_minutes: t.baseline_estimated_minutes ?? 0,
          llm_estimated_minutes: t.llm_estimated_minutes ?? 0,
          adjusted_estimated_minutes: t.adjusted_estimated_minutes ?? 0,

          suggested_sessions: t.suggested_sessions ?? 1,
          suggested_time_of_day: t.suggested_time_of_day ?? "flexible"
          // "status" column will default to 'pending'
        });
      }
    }
  }

  if (taskRows.length > 0) {
    const { error: tasksError } = await supabase
      .from("tasks")
      .insert(taskRows);

    if (tasksError) {
      console.error("Error inserting tasks:", tasksError);
      throw tasksError;
    }
  }

  // 3) Insert dependencies

  const depRows = [];
  const depKeySet = new Set(); // to avoid duplicates "from|to"

  // 3a) from global plan.dependencies (if any)
  for (const dep of plan.dependencies ?? []) {
    const fromId =
      typeof dep.from_task_id === "string" ? dep.from_task_id.trim() : "";
    const toId =
      typeof dep.to_task_id === "string" ? dep.to_task_id.trim() : "";

    if (!fromId || !toId) {
      console.warn("Skipping invalid dependency from model.dependencies:", dep);
      continue;
    }

    const key = `${fromId}|${toId}`;
    if (depKeySet.has(key)) continue;
    depKeySet.add(key);

    depRows.push({
      project_id: projectId,
      user_id: userId,
      from_task_model_id: fromId,
      to_task_model_id: toId,
      reason: dep.reason ?? null
    });
  }

  // 3b) from each task.depends_on inside phases/work_packages/tasks
  for (const phase of plan.phases ?? []) {
    for (const wp of phase.work_packages ?? []) {
      for (const t of wp.tasks ?? []) {
        const toId =
          typeof t.task_id === "string" ? t.task_id.trim() : "";
        if (!toId) continue;

        const dependsOnList = Array.isArray(t.depends_on)
          ? t.depends_on
          : [];

        for (const fromRaw of dependsOnList) {
          const fromId =
            typeof fromRaw === "string" ? fromRaw.trim() : "";
          if (!fromId) continue;
          if (fromId === toId) continue; // avoid self dependency

          const key = `${fromId}|${toId}`;
          if (depKeySet.has(key)) continue;
          depKeySet.add(key);

          depRows.push({
            project_id: projectId,
            user_id: userId,
            from_task_model_id: fromId,
            to_task_model_id: toId,
            reason: null
          });
        }
      }
    }
  }

  if (depRows.length > 0) {
    const { error: depsError } = await supabase
      .from("task_dependencies")
      .insert(depRows);

    if (depsError) {
      console.error("Error inserting task_dependencies:", depsError);
      throw depsError;
    }
  }

  return {
    project,
    tasksInserted: taskRows.length,
    dependenciesInserted: depRows.length
  };
}

// ---------- Helpers for scheduler ----------

// Load user preferences, or fall back to defaults
async function getUserPreferences(userId) {
  const { data, error } = await supabase
    .from("user_preferences")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Error fetching user_preferences:", error);
  }

  if (!data) {
    console.warn("No user_preferences found, using defaults");
    return {
      priority_order: ["study", "work", "life"],
      max_focus_minutes: 50,
      min_focus_minutes: 25,
      daily_focus_capacity_minutes: 180,
      prefer_short_tasks_first: true,
      preferred_time_of_day: ["morning", "afternoon"],
      max_deep_tasks_per_day: 3
    };
  }

  return {
    priority_order: data.priority_order ?? ["study", "work", "life"],
    max_focus_minutes: data.max_focus_minutes ?? 50,
    min_focus_minutes: data.min_focus_minutes ?? 25,
    daily_focus_capacity_minutes:
      data.daily_focus_capacity_minutes ?? 180,
    prefer_short_tasks_first:
      data.prefer_short_tasks_first ?? true,
    preferred_time_of_day:
      data.preferred_time_of_day ?? ["morning", "afternoon"],
    max_deep_tasks_per_day:
      data.max_deep_tasks_per_day ?? 3
  };
}

// Load weekly availability template rows, or fall back to simple default
async function getUserAvailabilityTemplate(userId) {
  const { data, error } = await supabase
    .from("user_availability_template")
    .select("*")
    .eq("user_id", userId);

  if (error) {
    console.error("Error fetching user_availability_template:", error);
  }

  if (!data || data.length === 0) {
    console.warn(
      "No user_availability_template found, using simple default Mon–Fri 09:00–12:00 deep focus"
    );

    // Simple hardcoded fallback: Mon–Fri, 09:00–12:00 deep-focus
    const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri"];
    return weekdays.map((wd) => ({
      weekday: wd,
      start_time: "09:00:00",
      end_time: "12:00:00",
      is_deep_focus: true,
      label: "Default focus block"
    }));
  }

  return data;
}

// Build availability JSON for scheduler from weekly template
function buildAvailability(startDate, horizonDays, templateRows) {
  const byWeekday = {};

  for (const row of templateRows) {
    const weekday = row.weekday;
    if (!byWeekday[weekday]) {
      byWeekday[weekday] = [];
    }
    const startTime = (row.start_time || "").slice(0, 5); // "HH:MM"
    const endTime = (row.end_time || "").slice(0, 5);
    byWeekday[weekday].push({
      start: startTime,
      end: endTime,
      is_deep_focus: row.is_deep_focus ?? true
    });
  }

  const daily_time_blocks = Object.entries(byWeekday).map(
    ([weekday, blocks]) => ({
      weekday,
      blocks
    })
  );

  return {
    start_date: startDate,
    horizon_days: horizonDays,
    daily_time_blocks
  };
}

// Build tasks_graph JSON from tasks + dependencies
async function getTasksGraph(projectId, userId) {
  // Get project title
  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id, title")
    .eq("id", projectId)
    .eq("user_id", userId)
    .single();

  if (projectError) {
    console.error("Error fetching project:", projectError);
    throw projectError;
  }

  // Get tasks for this project
  const { data: tasks, error: tasksError } = await supabase
    .from("tasks")
    .select("*")
    .eq("project_id", projectId)
    .eq("user_id", userId);

  if (tasksError) {
    console.error("Error fetching tasks:", tasksError);
    throw tasksError;
  }

  // Get dependencies for this project
  const { data: deps, error: depsError } = await supabase
    .from("task_dependencies")
    .select("*")
    .eq("project_id", projectId)
    .eq("user_id", userId);

  if (depsError) {
    console.error("Error fetching task_dependencies:", depsError);
    throw depsError;
  }

  const dependsMap = {};
  for (const d of deps ?? []) {
    if (!dependsMap[d.to_task_model_id]) {
      dependsMap[d.to_task_model_id] = [];
    }
    dependsMap[d.to_task_model_id].push(d.from_task_model_id);
  }

  const taskDtos =
    tasks?.map((t) => ({
      task_model_id: t.task_model_id,
      task_title: t.task_title,
      task_type: t.task_type,
      phase_id: t.phase_id,
      phase_title: t.phase_title,
      wp_id: t.wp_id,
      wp_title: t.wp_title,
      adjusted_estimated_minutes: t.adjusted_estimated_minutes,
      difficulty: t.difficulty,
      procrastination_risk: t.procrastination_risk,
      depends_on: dependsMap[t.task_model_id] || [],
      status: t.status || "pending"
    })) ?? [];

  return {
    project_id: projectId,
    project_title: project.title,
    tasks: taskDtos
  };
}

// Save schedule plan from Llama to schedules + schedule_blocks
async function saveScheduleToSupabase(schedulePlan, projectId, userId) {
  if (!userId) {
    throw new Error("User ID is required");
  }

  const horizon = schedulePlan.schedule_horizon || {};
  const start_date = horizon.start_date || null;
  const end_date = horizon.end_date || null;
  const total_days = horizon.total_days || 0;

  const { data: schedule, error: scheduleError } = await supabase
    .from("schedules")
    .insert([
      {
        user_id: userId,
        project_id: projectId,
        start_date,
        end_date,
        total_days,
        summary: schedulePlan.summary ?? null
      }
    ])
    .select()
    .single();

  if (scheduleError) {
    console.error("Error inserting schedule:", scheduleError);
    throw scheduleError;
  }

  const scheduleId = schedule.id;

  const blockRows = [];

  for (const day of schedulePlan.days ?? []) {
    const date = day.date;
    const weekday = day.weekday;

    for (const b of day.blocks ?? []) {
      blockRows.push({
        schedule_id: scheduleId,
        user_id: userId,
        project_id: projectId,

        date,
        weekday,

        start_time: b.start,
        end_time: b.end,

        task_model_id: b.task_id,
        phase_id: b.phase_id ?? null,
        wp_id: b.wp_id ?? null,

        is_deep_work: b.is_deep_work ?? false,
        reason: b.reason ?? null
      });
    }
  }

  if (blockRows.length > 0) {
    const { error: blocksError } = await supabase
      .from("schedule_blocks")
      .insert(blockRows);

    if (blocksError) {
      console.error("Error inserting schedule_blocks:", blocksError);
      throw blocksError;
    }
  }

  return {
    schedule,
    blocksInserted: blockRows.length
  };
}

// ---------- /decompose endpoint (Brain 1) ----------

app.post("/decompose", getUserIdFromToken, async (req, res) => {
  try {
    const { raw_text, due_date } = req.body;
    const userId = req.userId;

    if (!raw_text || typeof raw_text !== "string" || raw_text.trim().length === 0) {
      return res
        .status(400)
        .json({ error: "raw_text is required and must be a non empty string" });
    }

    // Validate due_date format if provided (should be YYYY-MM-DD)
    let validatedDueDate = null;
    if (due_date && typeof due_date === "string" && due_date.trim().length > 0) {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(due_date.trim())) {
        return res.status(400).json({ 
          error: "due_date must be in YYYY-MM-DD format (e.g., 2025-12-31)" 
        });
      }
      validatedDueDate = due_date.trim();
    }

    // Default user preferences for now (later read from DB)
    const userPreferences = {
      priority_order: ["study", "work", "life"],
      max_focus_minutes: 50,
      min_focus_minutes: 25,
      daily_focus_capacity_minutes: 180,
      prefer_short_tasks_first: true,
      preferred_time_of_day: ["morning", "afternoon"],
      max_deep_tasks_per_day: 3
    };

    // Baseline profile (rule-based durations)
    const baselineProfile = {
      reading: {
        minutes_per_page_easy: 2,
        minutes_per_page_medium: 3,
        minutes_per_page_hard: 5
      },
      writing: {
        minutes_per_200_words_draft: 15,
        minutes_per_200_words_edit: 10
      },
      coding: {
        small_task_minutes: 45,
        medium_task_minutes: 90,
        large_task_minutes: 150,
        debugging_extra_factor: 1.3
      },
      research: {
        minutes_per_article_scan: 15,
        minutes_per_article_deep: 35
      },
      review: {
        minutes_per_500_words_review: 10
      },
      life_admin: {
        small_task_minutes: 10,
        medium_task_minutes: 20,
        large_task_minutes: 40
      }
    };

    // User speed profile – all 1.0 for now (no personalization yet)
    const userSpeedProfile = {
      reading_speed_factor: 1.0,
      writing_speed_factor: 1.0,
      coding_speed_factor: 1.0,
      research_speed_factor: 1.0,
      review_speed_factor: 1.0,
      life_admin_speed_factor: 1.0
    };

    // Constraints to keep output size reasonable
    const constraints = {
      max_phases: 4,
      max_work_packages_per_phase: 4,
      max_tasks_per_project: 20
    };

    const payloadForLlama = {
      raw_text,
      user_preferences: userPreferences,
      baseline_profile: baselineProfile,
      user_speed_profile: userSpeedProfile,
      constraints
    };

    // Call Ollama chat API
    const chatResponse = await fetch(OLLAMA_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "rebooted-planner",
        format: "json",
        messages: [
          {
            role: "user",
            content: JSON.stringify(payloadForLlama)
          }
        ],
        stream: false
      })
    });

    if (!chatResponse.ok) {
      const text = await chatResponse.text();
      console.error("Ollama error:", text);
      return res.status(500).json({ error: "Failed to call Llama model" });
    }

    const data = await chatResponse.json();
    const content = data?.message?.content;

    if (!content) {
      return res.status(500).json({ error: "Empty response from Llama" });
    }

    let plan;
    try {
      plan = JSON.parse(content);
    } catch (err) {
      console.error("Failed to parse Llama JSON:", err, "content:", content);
      return res
        .status(500)
        .json({ error: "Llama returned invalid JSON", raw: content });
    }

    // Save to Supabase
    const saveResult = await savePlanToSupabase(plan, raw_text, userId, validatedDueDate);

    // Return DB info + plan to client
    return res.json({
      project: saveResult.project,
      tasksInserted: saveResult.tasksInserted,
      dependenciesInserted: saveResult.dependenciesInserted,
      plan
    });
  } catch (err) {
    console.error("Unexpected error in /decompose:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ---------- /schedule endpoint (Brain 2) ----------

app.post("/schedule", getUserIdFromToken, async (req, res) => {
  try {
    const { project_id, start_date, horizon_days } = req.body;
    const userId = req.userId;

    if (!project_id) {
      return res.status(400).json({ error: "project_id is required" });
    }

    const startDate =
      typeof start_date === "string" && start_date.trim().length > 0
        ? start_date
        : new Date().toISOString().slice(0, 10); // today

    const horizonDays =
      typeof horizon_days === "number" && horizon_days > 0
        ? horizon_days
        : 7;

    // 1) Load preferences and availability
    const userPreferences = await getUserPreferences(userId);
    const availabilityTemplate = await getUserAvailabilityTemplate(userId);
    const availability = buildAvailability(startDate, horizonDays, availabilityTemplate);

    // 2) Load tasks graph
    const tasksGraph = await getTasksGraph(project_id, userId);

    const payloadForScheduler = {
      user_preferences: userPreferences,
      availability,
      tasks_graph: tasksGraph
    };

    // 3) Call scheduler model
    const chatResponse = await fetch(OLLAMA_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "rebooted-scheduler",
        messages: [
          {
            role: "user",
            content: JSON.stringify(payloadForScheduler)
          }
        ],
        stream: false
      })
    });

    if (!chatResponse.ok) {
      const text = await chatResponse.text();
      console.error("Ollama scheduler error:", text);
      return res.status(500).json({ error: "Failed to call scheduler model" });
    }

    const data = await chatResponse.json();
    const content = data?.message?.content;

    if (!content) {
      return res.status(500).json({ error: "Empty response from scheduler model" });
    }

    let schedulePlan;
    try {
      schedulePlan = JSON.parse(content);
    } catch (err) {
      console.error("Failed to parse scheduler JSON:", err, "content:", content);
      return res
        .status(500)
        .json({ error: "Scheduler returned invalid JSON", raw: content });
    }

    // 4) Save schedule and blocks into Supabase
    const saveResult = await saveScheduleToSupabase(schedulePlan, project_id, userId);

    return res.json({
      schedule: saveResult.schedule,
      blocksInserted: saveResult.blocksInserted,
      plan: schedulePlan
    });
  } catch (err) {
    console.error("Unexpected error in /schedule:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ---------- Simple health check ----------

app.get("/", (req, res) => {
  res.send("Rebooted Llama API is running. Use POST /decompose or POST /schedule.");
});

// ---------- Start server ----------

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`✅ Rebooted Llama API listening on http://localhost:${PORT}`);
});
