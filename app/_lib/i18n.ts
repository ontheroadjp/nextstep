export const SUPPORTED_LOCALES = ["en", "ja", "zh"] as const;

export type AppLocale = (typeof SUPPORTED_LOCALES)[number];

export function isAppLocale(value: string): value is AppLocale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

export function resolveLocale(value: string | null | undefined): AppLocale {
  if (!value) return "ja";
  return isAppLocale(value) ? value : "ja";
}

export function toIntlLocale(locale: AppLocale): string {
  if (locale === "ja") return "ja-JP";
  if (locale === "zh") return "zh-CN";
  return "en-US";
}

type Dict = Record<string, string>;

const en: Dict = {
  locale_label: "Language",
  locale_en: "English",
  locale_ja: "Japanese",
  locale_zh: "Chinese",
  hero_public_lead: "Please log in to use the public version.",
  home_login_required: "Login required",
  home_authenticated: "You are logged in. Go to dashboard.",
  home_unauthenticated: "Please authenticate from the login page.",
  login_method: "Login Method",
  email: "Email",
  password: "Password",
  tz_offset: "TZ Offset (minutes)",
  login: "Login",
  logging_in: "Logging in...",
  logout: "Logout",
  refresh: "Refresh",
  back: "Back",
  go_to_top: "Go to Top",
  go_to_dashboard: "Go to Dashboard",
  already_logged_in_dashboard: "You are logged in. You can move to dashboard.",
  dashboard_title: "Daily dashboard",
  dashboard_lead: "Show counts for Today and Inbox. Areas are displayed side by side.",
  view_today: "Today",
  view_upcoming: "Upcoming",
  view_anytime: "Anytime",
  view_someday: "Someday",
  view_logbook: "Logbook",
  view_inbox: "Inbox",
  view_areas: "Areas",
  view_category: "Category",
  view_detail_lead: "Detailed UI will be adjusted later. For now, only list view is available.",
  sort_to_logbook: "Move to Logbook",
  loading: "Loading...",
  no_data_yet: "No data yet.",
  no_tasks: "No tasks",
  failed_to_load: "Failed to load",
  failed_to_load_areas: "Failed to load areas",
  no_areas: "No areas",
  not_found: "Not Found",
  category_not_found: "This category does not exist.",
  add_task: "Add task",
  new_task: "New task",
  input_title_required: "Please enter a title",
  create_failed: "Failed to create",
  update_failed: "Failed to update",
  note_optional: "Note (optional)",
  title: "Title",
  deadline: "Deadline",
  today: "Today",
  this_evening: "This Evening",
  tomorrow: "Tomorrow",
  yesterday: "Yesterday",
  this_week: "This Week",
  someday: "Someday",
  clear: "Clear",
  overdue: "Overdue",
  others: "Others",
  no_group_project: "Project",
  no_group_area: "Area",
  cancel_someday_with_deadline:
    "Canceled moving to Someday. If you keep deadline, continue date settings.",
  date_deadline_invalid: "Please review date/deadline order.",
  confirm_someday_with_deadline:
    "This task has a deadline. Move to Someday and clear deadline?",
  confirm_date_after_deadline:
    "date is after deadline. OK to clear deadline and continue, Cancel to keep deadline and re-set.",
};

const ja: Dict = {
  locale_label: "言語",
  locale_en: "英語",
  locale_ja: "日本語",
  locale_zh: "中国語",
  hero_public_lead: "公開版をご利用いただくにはログインしてください。",
  home_login_required: "ログインが必要です",
  home_authenticated: "ログイン済みです。ダッシュボードへ進んでください。",
  home_unauthenticated: "ログインページから認証してください。",
  login_method: "Login Method",
  email: "Email",
  password: "Password",
  tz_offset: "TZ Offset (minutes)",
  login: "Login",
  logging_in: "Logging in...",
  logout: "Logout",
  refresh: "Refresh",
  back: "Back",
  go_to_top: "Go to Top",
  go_to_dashboard: "Go to Dashboard",
  already_logged_in_dashboard: "ログイン済みです。ダッシュボードへ移動できます。",
  dashboard_title: "Daily dashboard",
  dashboard_lead: "Today と Inbox の件数だけを表示。エリアは同列に並べて確認できます。",
  view_today: "Today",
  view_upcoming: "Upcoming",
  view_anytime: "Anytime",
  view_someday: "Someday",
  view_logbook: "Logbook",
  view_inbox: "Inbox",
  view_areas: "Areas",
  view_category: "Category",
  view_detail_lead: "詳細UIは後で調整します。今は一覧だけ確認できます。",
  sort_to_logbook: "Logbook へ整理",
  loading: "Loading...",
  no_data_yet: "No data yet.",
  no_tasks: "No tasks",
  failed_to_load: "Failed to load",
  failed_to_load_areas: "Failed to load areas",
  no_areas: "No areas",
  not_found: "Not Found",
  category_not_found: "このカテゴリは存在しません。",
  add_task: "Add task",
  new_task: "新規タスク",
  input_title_required: "タイトルを入力してください",
  create_failed: "Failed to create",
  update_failed: "Failed to update",
  note_optional: "Note (optional)",
  title: "Title",
  deadline: "Deadline",
  today: "Today",
  this_evening: "This Evening",
  tomorrow: "Tomorrow",
  yesterday: "昨日",
  this_week: "今週",
  someday: "Someday",
  clear: "Clear",
  overdue: "Overdue",
  others: "Others",
  no_group_project: "Project",
  no_group_area: "Area",
  cancel_someday_with_deadline:
    "Someday化を中止しました。deadlineを維持する場合は日付設定を続けてください。",
  date_deadline_invalid: "date と deadline の前後関係を見直してください。",
  confirm_someday_with_deadline:
    "This task has a deadline. Move to Someday and clear deadline?",
  confirm_date_after_deadline:
    "date is after deadline. OK to clear deadline and continue, Cancel to keep deadline and re-set.",
};

const zh: Dict = {
  locale_label: "语言",
  locale_en: "英语",
  locale_ja: "日语",
  locale_zh: "中文",
  hero_public_lead: "请先登录后使用公开版。",
  home_login_required: "需要登录",
  home_authenticated: "已登录。请前往仪表盘。",
  home_unauthenticated: "请在登录页面完成认证。",
  login_method: "登录方式",
  email: "邮箱",
  password: "密码",
  tz_offset: "时区偏移（分钟）",
  login: "登录",
  logging_in: "登录中...",
  logout: "退出登录",
  refresh: "刷新",
  back: "返回",
  go_to_top: "前往 Top",
  go_to_dashboard: "前往仪表盘",
  already_logged_in_dashboard: "已登录。可进入仪表盘。",
  dashboard_title: "每日仪表盘",
  dashboard_lead: "仅显示 Today 与 Inbox 数量。Area 可并列查看。",
  view_today: "Today",
  view_upcoming: "Upcoming",
  view_anytime: "Anytime",
  view_someday: "Someday",
  view_logbook: "Logbook",
  view_inbox: "Inbox",
  view_areas: "Areas",
  view_category: "Category",
  view_detail_lead: "详细 UI 后续再调整。当前仅可查看列表。",
  sort_to_logbook: "整理到 Logbook",
  loading: "加载中...",
  no_data_yet: "暂无数据。",
  no_tasks: "暂无任务",
  failed_to_load: "加载失败",
  failed_to_load_areas: "加载 area 失败",
  no_areas: "没有 area",
  not_found: "未找到",
  category_not_found: "该分类不存在。",
  add_task: "新增任务",
  new_task: "新任务",
  input_title_required: "请输入标题",
  create_failed: "创建失败",
  update_failed: "更新失败",
  note_optional: "备注（可选）",
  title: "标题",
  deadline: "截止日期",
  today: "Today",
  this_evening: "This Evening",
  tomorrow: "Tomorrow",
  yesterday: "昨天",
  this_week: "本周",
  someday: "Someday",
  clear: "清除",
  overdue: "Overdue",
  others: "Others",
  no_group_project: "Project",
  no_group_area: "Area",
  cancel_someday_with_deadline: "已取消移至 Someday。若要保留 deadline，请继续设置日期。",
  date_deadline_invalid: "请检查 date 与 deadline 的先后关系。",
  confirm_someday_with_deadline: "该任务有 deadline。移到 Someday 并清除 deadline 吗？",
  confirm_date_after_deadline:
    "date 晚于 deadline。确定清除 deadline 并继续吗？取消则保留 deadline 并重新设置。",
};

const dictionaries: Record<AppLocale, Dict> = { en, ja, zh };

export type I18nKey = keyof typeof en;

export function t(locale: AppLocale, key: I18nKey): string {
  const dict = dictionaries[locale];
  return dict[key] ?? en[key] ?? key;
}

export function viewName(locale: AppLocale, view: string): string {
  if (view === "today") return t(locale, "view_today");
  if (view === "upcoming") return t(locale, "view_upcoming");
  if (view === "anytime") return t(locale, "view_anytime");
  if (view === "someday") return t(locale, "view_someday");
  if (view === "logbook") return t(locale, "view_logbook");
  return t(locale, "view_inbox");
}
