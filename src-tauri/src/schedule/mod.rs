//! 定时任务模块：等价老项目 `electron/src/schedule`（node-schedule）。
//!
//! 老实现（`schedule/index.ts`）：应用启动后每 5s 轮询 `schedulesHelper.getEnable()`，
//! 对启用行按 `handler.require` 动态 `import('../schedule/components/<require>.js')`
//! 注册 node-schedule 任务；被禁用的行会 `cancel()` 掉已注册任务。
//!
//! 新实现保持同样的「轮询 + 按 require 注册/取消」语义：
//! - cron 表达式由本地 [`cron`] 模块解析（含秒级，兼容老 seeds 的 6 段式）；
//! - `handler.require` 走本地白名单（[`tasks`] 模块），不存在远程加载任意模块的入口；
//! - `handler.comment`（`execSync` 执行系统命令）与 `handler.script`（`new Function`
//!   执行脚本）属于跨语言不可等价、且会引入任意代码执行面的能力，**不迁移**
//!   （差异决策见 `docs/migration-plan.md` M5）。

use std::collections::{HashMap, HashSet};
use std::sync::{Mutex, MutexGuard, OnceLock};
use std::time::Duration;

use chrono::{Datelike, Timelike};
use serde::Serialize;
use serde_json::{json, Value};
use tauri::{AppHandle, Emitter, Manager};

use crate::db::query;
use crate::error::AppError;
use crate::js;
use crate::models;
use crate::state::AppState;

mod cron;
mod tasks;

pub use tasks::SUPPORTED_TASKS;

/// 轮询间隔：等价老二实现 `setTimeout(..., 5000)`。
pub const POLL_INTERVAL: Duration = Duration::from_secs(5);

/// cron 匹配轮询间隔（最小粒度到秒，200ms 的开销可忽略）。
const TICK_INTERVAL: Duration = Duration::from_millis(200);

/// 任务执行完成事件（新增可观测性；老项目只有 console 输出）。
pub const EVENT_TASK: &str = "schedule://task";

/// 单个调度行的运行时状态（`list_tasks` 返回给前端）。
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TaskState {
    /// 调度行 id（`schedules.id`）
    pub id: String,
    /// 调度行名称（`schedules.name`）
    pub name: String,
    /// 任务标识（`schedules.handler.require`）
    pub require: String,
    /// cron 表达式（`schedules.time`）
    pub expression: String,
    /// 是否已成功注册
    pub running: bool,
    /// 未注册 / 执行失败原因
    pub error: Option<String>,
}

/// 已注册任务句柄（key = 调度行 id）。
struct Job {
    expression: String,
    handle: tauri::async_runtime::JoinHandle<()>,
}

fn jobs() -> &'static Mutex<HashMap<String, Job>> {
    static JOBS: OnceLock<Mutex<HashMap<String, Job>>> = OnceLock::new();
    JOBS.get_or_init(|| Mutex::new(HashMap::new()))
}

fn registry() -> &'static Mutex<HashMap<String, TaskState>> {
    static REGISTRY: OnceLock<Mutex<HashMap<String, TaskState>>> = OnceLock::new();
    REGISTRY.get_or_init(|| Mutex::new(HashMap::new()))
}

/// 取锁（容忍中毒，避免单个任务 panic 后整个调度不可用）。
fn lock<T>(mutex: &'static Mutex<T>) -> MutexGuard<'static, T> {
    mutex.lock().unwrap_or_else(|err| err.into_inner())
}

/// 当前调度状态（供 `list_tasks` 命令与覆盖度核对使用）。
pub fn states() -> Vec<TaskState> {
    let registry = lock(registry());
    let mut list: Vec<TaskState> = registry.values().cloned().collect();
    list.sort_by(|a, b| a.id.cmp(&b.id));
    list
}

/// 立即执行一次指定任务（供 `run_task` 命令使用，等价老项目手动 import 后调用）。
pub async fn run_once(app: &AppHandle, require: &str) -> Result<Value, String> {
    tasks::run(app, require).await
}

/// 启动调度：拉起 5s 轮询协程（等价老 `schedule.handler()` 的首次调用 + 自轮询）。
pub fn spawn(app: &AppHandle) {
    let handle = app.clone();
    tauri::async_runtime::spawn(async move {
        loop {
            if let Err(err) = refresh(&handle) {
                log::warn!("刷新定时任务失败: {err}");
            }
            tokio::time::sleep(POLL_INTERVAL).await;
        }
    });
}

/// 读取 `schedules` 全表（含禁用行，等价 `getEnable()` + `getDisabled()` 的并集）。
fn read_rows(app: &AppHandle) -> Result<Vec<Value>, String> {
    let state = app.state::<AppState>();
    state
        .db
        .with_conn(|conn| {
            let model = models::find("schedules").map_err(AppError::other)?;
            query::get_all(conn, model, &json!({}))
        })
        .map_err(|err| err.to_string())
}

/// 单次刷新：按表内数据注册 / 取消任务（等价老 `schedule/index.ts` 的 handler 主体）。
fn refresh(app: &AppHandle) -> Result<(), String> {
    let rows = read_rows(app)?;
    let mut alive: HashSet<String> = HashSet::new();

    for row in rows {
        let id = text(row.get("id"));
        if id.is_empty() {
            continue;
        }
        alive.insert(id.clone());

        let name = text(row.get("name"));
        let expression = text(row.get("time"));
        let require = text(
            row.get("handler")
                .and_then(|handler| handler.get("require")),
        );

        if !js::js_truthy(row.get("status").unwrap_or(&Value::Null)) {
            cancel(&id);
            update_state(TaskState {
                id,
                name,
                require,
                expression,
                running: false,
                error: Some("已禁用（status 非启用值）".to_string()),
            });
            continue;
        }

        let mut state = TaskState {
            id: id.clone(),
            name,
            require: require.clone(),
            expression: expression.clone(),
            running: false,
            error: None,
        };

        if !SUPPORTED_TASKS.contains(&require.as_str()) {
            cancel(&id);
            state.error = Some(format!("未迁移的任务：{require}（见 docs/migration-coverage.md）"));
            update_state(state);
            continue;
        }

        let spec = match cron::CronSpec::parse(&expression) {
            Ok(spec) => spec,
            Err(err) => {
                cancel(&id);
                state.error = Some(err);
                update_state(state);
                continue;
            }
        };

        // 已按同一表达式注册则保持不动（老实现：同 id 同类型任务存在即跳过）
        if is_registered(&id, &expression) {
            state.running = true;
            update_state(state);
            continue;
        }

        cancel(&id);
        let task_id = id.clone();
        let task_require = require.clone();
        let task_app = app.clone();
        let handle = tauri::async_runtime::spawn(async move {
            run_loop(task_app, task_id, task_require, spec).await;
        });
        lock(jobs()).insert(
            id,
            Job {
                expression: expression.clone(),
                handle,
            },
        );
        log::info!("注册定时任务: {require}（cron={expression}）");
        state.running = true;
        update_state(state);
    }

    // 表中已删除的行：取消残留任务（老实现只处理禁用行，这里一并清理，更安全）
    let stale: Vec<String> = lock(jobs())
        .keys()
        .filter(|id| !alive.contains(*id))
        .cloned()
        .collect();
    for id in stale {
        log::info!("定时任务 {id} 已从 schedules 表移除，取消注册");
        cancel(&id);
        lock(registry()).remove(&id);
    }

    Ok(())
}

/// 任务执行循环：按 cron 命中触发，同一秒只触发一次。
async fn run_loop(app: AppHandle, id: String, require: String, spec: cron::CronSpec) {
    let mut last_tick: Option<(i32, u32, u32, u32, u32, u32)> = None;
    let mut ticker = tokio::time::interval(TICK_INTERVAL);

    loop {
        ticker.tick().await;
        let now = chrono::Local::now();
        if !spec.matches(&now) {
            continue;
        }

        let key = (
            now.year(),
            now.month(),
            now.day(),
            now.hour(),
            now.minute(),
            now.second(),
        );
        if last_tick == Some(key) {
            continue;
        }
        last_tick = Some(key);

        let outcome = tasks::run(&app, &require).await;
        match &outcome {
            Ok(result) => log::info!("定时任务 {require} 执行完成: {result}"),
            Err(err) => log::error!("定时任务 {require} 执行失败: {err}"),
        }

        let payload = json!({
            "id": id,
            "require": require,
            "ok": outcome.is_ok(),
            "result": outcome.as_ref().ok(),
            "error": outcome.as_ref().err(),
        });
        if let Err(err) = app.emit(EVENT_TASK, payload) {
            log::warn!("广播任务事件失败: {err}");
        }
    }
}

fn is_registered(id: &str, expression: &str) -> bool {
    lock(jobs())
        .get(id)
        .map(|job| job.expression == expression)
        .unwrap_or(false)
}

fn cancel(id: &str) {
    if let Some(job) = lock(jobs()).remove(id) {
        job.handle.abort();
    }
}

fn update_state(state: TaskState) {
    lock(registry()).insert(state.id.clone(), state);
}

/// 取调度行字段文本（`null` 缺失统一为空串，避免出现 JS `String(null) = "null"`）。
fn text(value: Option<&Value>) -> String {
    match value {
        Some(Value::String(text)) => text.clone(),
        Some(Value::Null) | None => String::new(),
        Some(other) => js::to_string(other),
    }
}
