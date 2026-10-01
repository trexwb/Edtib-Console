//! 本地数据库域命令。
//!
//! 迁移前后对照：老项目前端通过 HTTP 调用 `electron/` 内 Express 服务的
//! `/api/*` 接口读写 Knex/SQLite；Tauri 版由 Rust 直接持有 SQLite 连接，
//! 前端经 `src/bridge`（`window.electronAPI.db.*`）→ `invoke()` 调用等价命令。
//!
//! 返回结构与老主进程保持一致（前端 `src/utils/requestBridge.ts` 按此口径读取）：
//!   * `db_find_all` / `db_find_one` / `db_create` / `db_update` / `db_delete` / `db_bulk_create`
//!     → 统一信封 `{ code, message, timestamp, data }`；
//!   * `db_get_list` → 直接返回 `{ total, list }`（老实现未加信封，分页总数依赖该结构）。
//!
//! 表名白名单来自 [`crate::models`]（老项目 model 元数据转译）；未注册的表返回错误，
//! 由前端按既有逻辑降级为 HTTP 请求。本地表为空同样会降级，因此离线优先不会读到空列表。

use serde_json::{json, Map, Value};
use tauri::State;

use crate::db::{query, DatabaseStatus};
use crate::error::{AppError, AppResult};
use crate::models::{self, ModelDef};
use crate::response::{self, Envelope};
use crate::state::AppState;

/// 本地数据库状态：文件路径、迁移数量、SQLite 版本。
#[tauri::command]
pub fn db_status(state: State<'_, AppState>) -> AppResult<DatabaseStatus> {
    state.db.status()
}

/// 表名 → 模型（未注册的表直接报错，前端据此降级 HTTP）。
fn model_of(table: &str) -> AppResult<&'static ModelDef> {
    models::find(table).map_err(AppError::other)
}

/// 以主键构造唯一筛选条件（find_one / update / delete 的语义）。
fn filter_by_id(model: &ModelDef, id: &Value) -> Value {
    let mut map = Map::new();
    map.insert(model.primary_key.to_string(), id.clone());
    Value::Object(map)
}

/// db_find_all：按条件取全量（老 `db-find-all`）。
#[tauri::command]
pub async fn db_find_all(
    state: State<'_, AppState>,
    table: String,
    filters: Option<Value>,
) -> AppResult<Envelope> {
    let model = model_of(&table)?;
    let filters = filters.unwrap_or_else(|| json!({}));
    let rows = state.db.with_conn(|conn| query::get_all(conn, model, &filters))?;
    Ok(response::success(Value::Array(rows)))
}

/// db_get_list：分页查询（老 `db-get-list`），返回裸 `{ total, list }`。
#[tauri::command]
pub async fn db_get_list(
    state: State<'_, AppState>,
    table: String,
    filters: Option<Value>,
    order: Option<Value>,
    limit: Option<i64>,
    offset: Option<i64>,
) -> AppResult<Value> {
    let model = model_of(&table)?;
    let filters = filters.unwrap_or_else(|| json!({}));
    let result = state.db.with_conn(|conn| {
        query::get_list(
            conn,
            model,
            &filters,
            order.as_ref(),
            limit,
            offset,
        )
    })?;
    Ok(json!({ "total": result.total, "list": result.list }))
}

/// db_find_one：按主键取单条（老 `db-find-one`）。
#[tauri::command]
pub async fn db_find_one(state: State<'_, AppState>, table: String, id: Value) -> AppResult<Envelope> {
    let model = model_of(&table)?;
    let filters = filter_by_id(model, &id);
    let row = state.db.with_conn(|conn| query::get_row(conn, model, &filters))?;
    Ok(response::success(row))
}

/// db_create：新增（老 `db-create`）。
///
/// 与老 `base.ts` 一致：对象入参返回 `[id]`（失败返回 `false`），数组入参返回 id 数组。
#[tauri::command]
pub async fn db_create(state: State<'_, AppState>, table: String, data: Value) -> AppResult<Envelope> {
    let model = model_of(&table)?;
    let created = state.db.with_conn(|conn| query::create(conn, model, &data))?;
    Ok(response::success(created))
}

/// db_update：按主键更新（老 `db-update`），`data` 为受影响行数。
#[tauri::command]
pub async fn db_update(
    state: State<'_, AppState>,
    table: String,
    id: Value,
    data: Value,
) -> AppResult<Envelope> {
    let model = model_of(&table)?;
    let filters = filter_by_id(model, &id);
    let affected = state.db.with_conn(|conn| query::update(conn, model, &filters, &data))?;
    Ok(response::success(affected))
}

/// db_delete：按主键删除（老 `db-delete`），`data` 为受影响行数。
#[tauri::command]
pub async fn db_delete(state: State<'_, AppState>, table: String, id: Value) -> AppResult<Envelope> {
    let model = model_of(&table)?;
    let filters = filter_by_id(model, &id);
    let affected = state.db.with_conn(|conn| query::delete(conn, model, &filters))?;
    Ok(response::success(affected))
}

/// db_bulk_create：批量新增（老 `db-bulk-create`），返回主键数组。
#[tauri::command]
pub async fn db_bulk_create(state: State<'_, AppState>, table: String, data: Value) -> AppResult<Envelope> {
    let model = model_of(&table)?;
    let rows = match data {
        Value::Array(rows) => Value::Array(rows),
        other => json!([other]),
    };
    let keys = state.db.with_conn(|conn| query::create(conn, model, &rows))?;
    Ok(response::success(keys))
}
