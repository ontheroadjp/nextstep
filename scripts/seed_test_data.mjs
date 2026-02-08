#!/usr/bin/env node
import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

const TOTAL_TASKS = 80;

const BUCKET_COUNTS = {
  anytimeInbox: 2,
  anytimeArea: 16,
  anytimeProject: 16,
  todayMixed: 12,
  pastMixed: 14,
  futureMixed: 14,
  somedayMixed: 2,
  logbookArchived: 4,
};

export { TOTAL_TASKS, BUCKET_COUNTS };

const AREA_NAMES = [
  "家庭",
  "仕事",
  "健康",
];

const PROJECT_DEFINITIONS = [
  ["朝の家事ルーチン", "家庭"],
  ["デスク周り改善", "仕事"],
];

const TITLE_BASES = [
  "ミルクを買う",
  "卵を補充する",
  "パンを買う",
  "洗剤を補充する",
  "トイレットペーパーを買う",
  "冷蔵庫の中を整理する",
  "歯医者を予約する",
  "薬を受け取る",
  "健康診断の予約を確認する",
  "ランニングシューズを洗う",
  "英語の単語を復習する",
  "資格の過去問を解く",
  "会議メモを整理する",
  "請求書を作成する",
  "見積書を送る",
  "支払い期限を確認する",
  "電球を交換する",
  "エアコンのフィルターを掃除する",
  "キッチンの排水口を掃除する",
  "ゴミ出しの予定を確認する",
  "洗濯槽クリーナーを回す",
  "PCのアップデートを適用する",
  "バックアップを取る",
  "写真をアルバムに整理する",
  "読書メモを書く",
  "家計簿を入力する",
  "固定費を見直す",
  "電気料金を確認する",
  "水道料金を確認する",
  "税金の納付書を確認する",
  "住民票を取得する",
  "役所に問い合わせる",
  "防災用品を点検する",
  "非常食の賞味期限を確認する",
  "献立を決める",
  "買い物リストを作る",
  "夕食の下ごしらえをする",
  "弁当のおかずを準備する",
  "靴を磨く",
  "コートをクリーニングに出す",
  "郵便物を確認する",
  "書類をスキャンする",
  "領収書を整理する",
  "経費を入力する",
  "自転車の空気を入れる",
  "チェーンに注油する",
  "本棚を整頓する",
  "観葉植物に水をやる",
  "布団を干す",
  "窓を拭く",
];

const NOTE_BASES = [
  "優先度は中、所要時間は15分程度。",
  "外出ついでに対応する。",
  "完了後にメモを残す。",
  "必要な物を事前に確認する。",
  "午前中に終える想定。",
  "夕方までに対応したい。",
  "天候次第で順延可。",
  "関連タスクとまとめて実施する。",
  "予算上限を意識して進める。",
  "家族と共有しておく。",
];

const CHECKLIST_TITLES = [
  "必要な物を確認する",
  "手順をメモに書く",
  "完了後に写真を残す",
  "担当者に連絡する",
  "結果を記録する",
  "次回の予定を決める",
];

function loadDotEnv(pathname = ".env") {
  const filepath = resolve(process.cwd(), pathname);
  if (!existsSync(filepath)) return;
  const content = readFileSync(filepath, "utf8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex <= 0) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    let value = trimmed.slice(eqIndex + 1).trim();
    if (!key) continue;
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing ${name}`);
  }
  return value;
}

function base64UrlDecode(inputStr) {
  const normalized = inputStr.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "===".slice((normalized.length + 3) % 4);
  return Buffer.from(padded, "base64").toString("utf8");
}

function assertServiceRoleKey(key) {
  const parts = key.split(".");
  if (parts.length !== 3) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not a valid JWT format.");
  }
  let payload;
  try {
    payload = JSON.parse(base64UrlDecode(parts[1]));
  } catch {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY payload cannot be decoded.");
  }
  if (payload.role !== "service_role") {
    throw new Error(
      `SUPABASE_SERVICE_ROLE_KEY role is '${String(payload.role)}'. A 'service_role' key is required.`
    );
  }
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

function formatDateLocal(date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function parseDateLocal(dateStr) {
  const [y, m, d] = dateStr.split("-").map((v) => Number(v));
  return new Date(y, m - 1, d, 12, 0, 0, 0);
}

function addMonths(baseDate, months, day = 15) {
  return new Date(baseDate.getFullYear(), baseDate.getMonth() + months, Math.min(day, 28), 12, 0, 0, 0);
}

function addDays(baseDate, days) {
  return new Date(
    baseDate.getFullYear(),
    baseDate.getMonth(),
    baseDate.getDate() + days,
    12,
    0,
    0,
    0
  );
}

function toIsoFromDate(dateStr, hour = 12) {
  const dt = parseDateLocal(dateStr);
  dt.setHours(hour, 0, 0, 0);
  return dt.toISOString();
}

function parseArgs(argv) {
  const parsed = { mode: null, forceReset: false, resetOnly: false };
  for (const arg of argv) {
    if (arg.startsWith("--mode=")) {
      const mode = arg.slice("--mode=".length);
      if (mode === "reset" || mode === "append") parsed.mode = mode;
    }
    if (arg === "--force-reset") {
      parsed.forceReset = true;
    }
    if (arg === "--reset-only") {
      parsed.resetOnly = true;
    }
  }
  return parsed;
}

async function chooseMode(initialMode) {
  if (initialMode) return initialMode;
  if (!input.isTTY) {
    throw new Error("Non-interactive mode requires --mode=reset or --mode=append");
  }

  const rl = createInterface({ input, output });
  try {
    output.write("\n投入モードを選択してください:\n");
    output.write("  1) reset  : DBデータ(areas/projects/tasks/checklists)を全削除してから投入\n");
    output.write("  2) append : 既存データを残して追加投入\n");
    const answer = (await rl.question("選択 [1/2]: ")).trim();
    if (answer === "1") return "reset";
    if (answer === "2") return "append";
    throw new Error("Invalid selection. Please choose 1 or 2.");
  } finally {
    rl.close();
  }
}

async function confirmReset(forceReset) {
  if (forceReset) return;
  if (!input.isTTY) {
    throw new Error("--mode=reset in non-interactive mode requires --force-reset");
  }

  const rl = createInterface({ input, output });
  try {
    output.write("\n警告: この操作は全ユーザーの対象テーブルデータを削除します。\n");
    const answer = (await rl.question("続行する場合は RESET ALL DATA と入力: ")).trim();
    if (answer !== "RESET ALL DATA") {
      throw new Error("Reset canceled by user.");
    }
  } finally {
    rl.close();
  }
}

function makeTitle(index, bucket) {
  const base = TITLE_BASES[index % TITLE_BASES.length];
  const suffixMap = {
    anytimeInbox: "（未分類）",
    anytimeArea: "（エリア）",
    anytimeProject: "（プロジェクト）",
    todayMixed: "（今日）",
    pastMixed: "（期限超過候補）",
    futureMixed: "（先予定）",
    somedayMixed: "（そのうち）",
    logbookArchived: "（完了済み）",
  };
  const suffix = suffixMap[bucket] ?? "";
  return `${base}${suffix}`;
}

function makeNote(index) {
  return NOTE_BASES[index % NOTE_BASES.length];
}

function makeScenarioNote(index, bucket, date, today) {
  const base = makeNote(index);
  if (!date) {
    if (bucket === "somedayMixed") return `${base} 余裕があるときに着手する。`;
    return `${base} 日程未確定の通常タスク。`;
  }
  const deltaDays = Math.round((parseDateLocal(date).getTime() - parseDateLocal(today).getTime()) / 86400000);
  if (deltaDays === 0) return `${base} 今日中に完了したい。`;
  if (deltaDays > 0 && deltaDays <= 7) return `${base} 今週中の予定。`;
  if (deltaDays > 7 && deltaDays <= 31) return `${base} 今月中に対応予定。`;
  if (deltaDays > 31) return `${base} 中長期で計画的に進める。`;
  if (deltaDays >= -7) return `${base} 直近で期限を過ぎているため優先対応。`;
  if (deltaDays >= -31) return `${base} 今月中に取り戻す。`;
  return `${base} 長期未完了のため段取りを見直す。`;
}

function buildAreaRows(userId, prefix) {
  return AREA_NAMES.map((name, idx) => ({
    user_id: userId,
    name: `${prefix}${name}`,
    sort_key: `a-${pad2(idx + 1)}`,
  }));
}

function buildProjectRows(userId, prefix, areaMap) {
  return PROJECT_DEFINITIONS.map(([name, areaName], idx) => ({
    user_id: userId,
    name: `${prefix}${name}`,
    note: `${prefix}${name}の進行管理`,
    area_id: areaName ? areaMap.get(`${prefix}${areaName}`) ?? null : null,
    sort_key: `p-${pad2(idx + 1)}`,
  }));
}

function pickArea(areas, idx) {
  return areas[idx % areas.length];
}

function pickProject(projects, idx) {
  return projects[idx % projects.length];
}

function buildTaskSpecs(params) {
  const { today, areas, projects, prefix } = params;
  const specs = [];

  let serial = 1;
  const pushSpec = (bucket, assignmentMode, overrides = {}) => {
    const idx = serial - 1;
    const title = `${prefix}${makeTitle(idx, bucket)} #${pad2(serial)}`;
    const note = `${prefix}${makeScenarioNote(idx, bucket, overrides.date ?? null, today)}`;
    const sortKey = `t-${String(serial).padStart(4, "0")}`;

    let areaId = null;
    let projectId = null;

    if (assignmentMode === "area") {
      areaId = pickArea(areas, idx).id;
    } else if (assignmentMode === "project") {
      const proj = pickProject(projects, idx);
      projectId = proj.id;
      areaId = proj.area_id ?? null;
    }

    specs.push({
      serial,
      bucket,
      title,
      note,
      sort_key: sortKey,
      area_id: areaId,
      project_id: projectId,
      user_id: params.userId,
      date: null,
      someday: false,
      completed_at: null,
      archived_at: null,
      ...overrides,
    });
    serial += 1;
  };

  for (let i = 0; i < BUCKET_COUNTS.anytimeInbox; i += 1) {
    pushSpec("anytimeInbox", "inbox", { date: null, someday: false });
  }

  for (let i = 0; i < BUCKET_COUNTS.anytimeArea; i += 1) {
    pushSpec("anytimeArea", "area", { date: null, someday: false });
  }

  for (let i = 0; i < BUCKET_COUNTS.anytimeProject; i += 1) {
    pushSpec("anytimeProject", "project", { date: null, someday: false });
  }

  const todayModes = ["area", "project"];
  for (let i = 0; i < BUCKET_COUNTS.todayMixed; i += 1) {
    const completed = i % 10 === 0 ? toIsoFromDate(today, 20) : null;
    pushSpec("todayMixed", todayModes[i % todayModes.length], {
      date: today,
      someday: false,
      completed_at: completed,
    });
  }

  const pastModes = ["area", "project"];
  for (let i = 0; i < BUCKET_COUNTS.pastMixed; i += 1) {
    const pastDatePlan = [
      addDays(parseDateLocal(today), -1),
      addDays(parseDateLocal(today), -2),
      addDays(parseDateLocal(today), -3),
      addDays(parseDateLocal(today), -4),
      addDays(parseDateLocal(today), -5),
      addDays(parseDateLocal(today), -7),
      addDays(parseDateLocal(today), -10),
      addDays(parseDateLocal(today), -14),
      addDays(parseDateLocal(today), -21),
      addDays(parseDateLocal(today), -30),
      addDays(parseDateLocal(today), -45),
      addDays(parseDateLocal(today), -75),
      addMonths(parseDateLocal(today), -6, 12),
      addMonths(parseDateLocal(today), -18, 1),
    ];
    const date = formatDateLocal(pastDatePlan[i % pastDatePlan.length]);
    const completed = i % 8 === 0 ? toIsoFromDate(date, 19) : null;
    pushSpec("pastMixed", pastModes[i % pastModes.length], {
      date,
      someday: false,
      completed_at: completed,
    });
  }

  const futureModes = ["area", "project"];
  for (let i = 0; i < BUCKET_COUNTS.futureMixed; i += 1) {
    const futureDatePlan = [
      addDays(parseDateLocal(today), 1),
      addDays(parseDateLocal(today), 2),
      addDays(parseDateLocal(today), 3),
      addDays(parseDateLocal(today), 4),
      addDays(parseDateLocal(today), 5),
      addDays(parseDateLocal(today), 7),
      addDays(parseDateLocal(today), 10),
      addDays(parseDateLocal(today), 14),
      addDays(parseDateLocal(today), 21),
      addDays(parseDateLocal(today), 30),
      addDays(parseDateLocal(today), 45),
      addDays(parseDateLocal(today), 75),
      addMonths(parseDateLocal(today), 6, 12),
      addMonths(parseDateLocal(today), 18, 1),
    ];
    const date = formatDateLocal(futureDatePlan[i % futureDatePlan.length]);
    pushSpec("futureMixed", futureModes[i % futureModes.length], {
      date,
      someday: false,
    });
  }

  const somedayModes = ["area", "project"];
  for (let i = 0; i < BUCKET_COUNTS.somedayMixed; i += 1) {
    pushSpec("somedayMixed", somedayModes[i % somedayModes.length], {
      date: null,
      someday: true,
    });
  }

  const logbookModes = ["area", "project"];
  for (let i = 0; i < BUCKET_COUNTS.logbookArchived; i += 1) {
    const logbookDatePlan = [
      addDays(parseDateLocal(today), -3),
      addDays(parseDateLocal(today), -10),
      addDays(parseDateLocal(today), -30),
      addMonths(parseDateLocal(today), -6, 8),
    ];
    const date = formatDateLocal(logbookDatePlan[i % logbookDatePlan.length]);
    const completedAt = toIsoFromDate(date, 18);
    const archivedAt = toIsoFromDate(date, 21);
    pushSpec("logbookArchived", logbookModes[i % logbookModes.length], {
      date,
      someday: false,
      completed_at: completedAt,
      archived_at: archivedAt,
    });
  }

  if (specs.length !== TOTAL_TASKS) {
    throw new Error(`Generated ${specs.length} tasks, expected ${TOTAL_TASKS}`);
  }

  return specs;
}

function buildChecklistSpecs(taskSpecs, prefix) {
  const checklistSpecs = [];
  for (let i = 0; i < taskSpecs.length; i += 1) {
    const task = taskSpecs[i];
    if (task.bucket === "somedayMixed" || task.bucket === "logbookArchived") continue;
    if (i >= 180) break;

    const count = (i % 3) + 1;
    for (let c = 0; c < count; c += 1) {
      checklistSpecs.push({
        task_sort_key: task.sort_key,
        title: `${prefix}${CHECKLIST_TITLES[(i + c) % CHECKLIST_TITLES.length]}`,
        completed: (i + c) % 4 === 0,
        sort_key: `c-${String(i + 1).padStart(4, "0")}-${c + 1}`,
      });
    }
  }
  return checklistSpecs;
}

function summarizeTasks(taskSpecs, today) {
  const summary = {
    total: taskSpecs.length,
    today,
    withoutDate: 0,
    someday: 0,
    past: 0,
    todayDate: 0,
    future: 0,
    archived: 0,
    bucket: {},
  };

  const todayDate = parseDateLocal(today).getTime();

  for (const task of taskSpecs) {
    summary.bucket[task.bucket] = (summary.bucket[task.bucket] ?? 0) + 1;
    if (task.someday) {
      summary.someday += 1;
      continue;
    }
    if (!task.date) {
      summary.withoutDate += 1;
    } else {
      const t = parseDateLocal(task.date).getTime();
      if (t < todayDate) summary.past += 1;
      else if (t === todayDate) summary.todayDate += 1;
      else summary.future += 1;
    }
    if (task.archived_at) summary.archived += 1;
  }

  return summary;
}

export function buildSeedPlan({ today, userId, prefix, areaRows, projectRows }) {
  const taskSpecs = buildTaskSpecs({
    today,
    userId,
    prefix,
    areas: areaRows,
    projects: projectRows,
  });
  const checklistSpecs = buildChecklistSpecs(taskSpecs, prefix);
  const summary = summarizeTasks(taskSpecs, today);
  return { taskSpecs, checklistSpecs, summary };
}

async function deleteTableByIdBatches(admin, table, batchSize = 500) {
  let deleted = 0;
  while (true) {
    const { data, error: fetchError } = await admin
      .from(table)
      .select("id")
      .not("id", "is", null)
      .limit(batchSize);
    if (fetchError) {
      throw new Error(`Failed to list ${table}: ${fetchError.message}`);
    }
    if (!data || data.length === 0) break;

    const ids = data.map((row) => row.id);
    const { error: deleteError } = await admin.from(table).delete().in("id", ids);
    if (deleteError) {
      throw new Error(`Failed to delete ${table}: ${deleteError.message}`);
    }
    deleted += ids.length;
  }
  return deleted;
}

async function deleteAllData(admin) {
  const tables = ["checklists", "tasks", "projects", "areas"];
  const deletedCounts = {};
  for (const table of tables) {
    deletedCounts[table] = await deleteTableByIdBatches(admin, table);
  }
  return deletedCounts;
}

async function getTableCounts(admin, tables) {
  const counts = {};
  for (const table of tables) {
    const { count, error } = await admin.from(table).select("id", { head: true, count: "exact" });
    if (error) {
      throw new Error(`Failed to count ${table}: ${error.message}`);
    }
    counts[table] = count ?? 0;
  }
  return counts;
}

async function insertInBatches(client, table, rows, batchSize = 100, selectColumns = "id") {
  const inserted = [];
  for (let i = 0; i < rows.length; i += batchSize) {
    const chunk = rows.slice(i, i + batchSize);
    const { data, error } = await client.from(table).insert(chunk).select(selectColumns);
    if (error) {
      throw new Error(`Insert failed for ${table}: ${error.message}`);
    }
    if (data) inserted.push(...data);
  }
  return inserted;
}

async function main() {
  loadDotEnv();

  const args = parseArgs(process.argv.slice(2));
  const mode = await chooseMode(args.mode);

  const supabaseUrl = requireEnv("SUPABASE_URL");
  const anonKey = requireEnv("SUPABASE_ANON_KEY");
  const testEmail = requireEnv("TEST_EMAIL");
  const testPassword = requireEnv("TEST_PASSWORD");
  const prefix = process.env.TEST_PREFIX ?? "[SEED] ";

  if (mode === "reset") {
    await confirmReset(args.forceReset);
    const serviceRoleKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
    assertServiceRoleKey(serviceRoleKey);
  }

  const authClient = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: authData, error: authError } = await authClient.auth.signInWithPassword({
    email: testEmail,
    password: testPassword,
  });
  if (authError || !authData.session?.access_token || !authData.user?.id) {
    throw new Error(authError?.message ?? "Failed to sign in");
  }

  const accessToken = authData.session.access_token;
  const userId = authData.user.id;

  const userClient = createClient(supabaseUrl, anonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  if (mode === "reset") {
    const serviceRoleKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
    assertServiceRoleKey(serviceRoleKey);
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const deletedCounts = await deleteAllData(adminClient);
    const remainingCounts = await getTableCounts(adminClient, ["areas", "projects", "tasks", "checklists"]);
    const stillHasRows = Object.values(remainingCounts).some((v) => Number(v) > 0);
    output.write("reset mode: all data in areas/projects/tasks/checklists was deleted.\n");
    output.write(`reset delete counts: ${JSON.stringify(deletedCounts)}\n`);
    output.write(`reset remaining counts: ${JSON.stringify(remainingCounts)}\n`);
    if (stillHasRows) {
      throw new Error("Reset verification failed: some rows still remain in target tables.");
    }
    if (args.resetOnly) {
      output.write("reset-only mode: finished after delete verification.\n");
      return;
    }
  } else {
    output.write("append mode: keeping existing data and adding seed data.\n");
    if (args.resetOnly) {
      throw new Error("--reset-only can only be used with --mode=reset");
    }
  }

  const today = formatDateLocal(new Date());

  const areaRows = buildAreaRows(userId, prefix);
  const insertedAreas = await insertInBatches(userClient, "areas", areaRows, 100, "id,name,sort_key");
  const areaMap = new Map(insertedAreas.map((row) => [row.name, row.id]));

  const projectRows = buildProjectRows(userId, prefix, areaMap);
  const insertedProjects = await insertInBatches(
    userClient,
    "projects",
    projectRows,
    100,
    "id,name,area_id,sort_key"
  );

  const { taskSpecs, checklistSpecs, summary } = buildSeedPlan({
    today,
    userId,
    prefix,
    areaRows: insertedAreas,
    projectRows: insertedProjects,
  });

  const insertedTasks = await insertInBatches(
    userClient,
    "tasks",
    taskSpecs.map((task) => ({
      user_id: task.user_id,
      title: task.title,
      note: task.note,
      date: task.date,
      someday: task.someday,
      completed_at: task.completed_at,
      archived_at: task.archived_at,
      area_id: task.area_id,
      project_id: task.project_id,
      sort_key: task.sort_key,
    })),
    100,
    "id,sort_key"
  );

  const taskIdBySortKey = new Map(insertedTasks.map((task) => [task.sort_key, task.id]));
  const checklistRows = checklistSpecs
    .map((item) => ({
      task_id: taskIdBySortKey.get(item.task_sort_key) ?? null,
      title: item.title,
      completed: item.completed,
      sort_key: item.sort_key,
    }))
    .filter((row) => row.task_id !== null);

  await insertInBatches(userClient, "checklists", checklistRows, 200, "id");

  output.write("\nSeed completed.\n");
  output.write(`mode: ${mode}\n`);
  output.write(`areas inserted: ${insertedAreas.length}\n`);
  output.write(`projects inserted: ${insertedProjects.length}\n`);
  output.write(`tasks inserted: ${taskSpecs.length}\n`);
  output.write(`checklists inserted: ${checklistRows.length}\n`);
  output.write(`today: ${summary.today}\n`);
  output.write(`dated past/today/future: ${summary.past}/${summary.todayDate}/${summary.future}\n`);
  output.write(`without date: ${summary.withoutDate}, someday: ${summary.someday}, archived: ${summary.archived}\n`);
  output.write(`bucket counts: ${JSON.stringify(summary.bucket)}\n`);
}

const isMain = process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url;

if (isMain) {
  main().catch((err) => {
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  });
}
