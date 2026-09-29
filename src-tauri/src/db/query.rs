//! 通用数据访问层：等价老项目 `electron/src/model/base.ts`
//! （`filterKeys / buildWhere / formatTimestamps / getAll / getList / getRow / create / update / delete`）。
//!
//! 老项目经 `knex` + `sqlite3` 访问本地库；此处用 `rusqlite` 以同样的语义执行等价 SQL，
//! 并保持相同的 cast 转换、排序规则与响应结构。

use rusqlite::types::{Value as SqlValue, ValueRef};
use rusqlite::{params_from_iter, Connection};
use serde_json::{json, Map, Number, Value};

use crate::error::AppResult;
use crate::js;
use crate::models::{ModelDef, WhereHook};

/// 等价 `base.ts` 的 `DEFAULT_LIMIT` / `MAX_LIMIT`。
const DEFAULT_LIMIT: i64 = 10;
const MAX_LIMIT: i64 = 1000;

/// `formatTimestamps` 处理的列（老项目 `model/base.ts`）。
const TIMESTAMP_COLUMNS: [&str; 4] = ["created_at", "updated_at", "deleted_at", "times_expire"];

/// 分页结果：等价老项目 `{ total, list }`。
pub struct ListResult {
    pub total: i64,
    pub list: Vec<Value>,
}

/// 等价 `getAll(where)`：无排序、无分页，返回全部命中行（已 cast + 时间格式化）。
pub fn get_all(conn: &Connection, model: &ModelDef, filters: &Value) -> AppResult<Vec<Value>> {
    let (clause, params) = build_where(model, filters);
    let sql = format!("SELECT * FROM {}{clause}", quote_identifier(model.name));
    let rows = select_rows(conn, &sql, params)?;
    Ok(rows
        .into_iter()
        .map(|row| present_row(model, row))
        .collect())
}

/// 等价 `getList(where, order, limit, offset)`。
pub fn get_list(
    conn: &Connection,
    model: &ModelDef,
    filters: &Value,
    order: Option<&Value>,
    limit: Option<i64>,
    offset: Option<i64>,
) -> AppResult<ListResult> {
    // 老项目：`limit = limit && limit > MAX_LIMIT ? MAX_LIMIT : limit || DEFAULT_LIMIT`
    let limit = match limit {
        Some(value) if value > MAX_LIMIT => MAX_LIMIT,
        Some(value) if value != 0 => value,
        _ => DEFAULT_LIMIT,
    };
    let offset = offset.unwrap_or(0);

    let (clause, params) = build_where(model, filters);
    let count_sql = format!(
        "SELECT COUNT({}) AS total FROM {}{clause}",
        quote_identifier(model.primary_key),
        quote_identifier(model.name)
    );
    let total = count_rows(conn, &count_sql, params.clone())?;

    let mut list = Vec::new();
    if total > 0 {
        let order_clause = build_order(model, order);
        let sql = format!(
            "SELECT * FROM {}{clause}{order_clause} LIMIT {limit} OFFSET {offset}",
            quote_identifier(model.name)
        );
        let rows = select_rows(conn, &sql, params)?;
        list = rows
            .into_iter()
            .map(|row| present_row(model, row))
            .collect();
    }

    Ok(ListResult { total, list })
}

/// 等价 `getRow(where)`（`limit(1).first()`）；无命中返回 `null`。
pub fn get_row(conn: &Connection, model: &ModelDef, filters: &Value) -> AppResult<Value> {
    let (clause, params) = build_where(model, filters);
    let sql = format!(
        "SELECT * FROM {}{clause} LIMIT 1",
        quote_identifier(model.name)
    );
    let mut rows = select_rows(conn, &sql, params)?;
    Ok(match rows.pop() {
        Some(row) => present_row(model, row),
        None => Value::Null,
    })
}

/// 等价 `create(data)`：
/// - 数组入参：批量插入，返回自增 id 数组（失败向上抛错）
/// - 对象入参：单条插入，返回 `[id]`；失败返回 `false`（老项目 `.catch(() => false)`）
pub fn create(conn: &Connection, model: &ModelDef, data: &Value) -> AppResult<Value> {
    let fields = model.valid_fields();

    match data {
        Value::Array(items) => {
            let mut ids = Vec::new();
            for item in items {
                let row = build_insert_row(model, &fields, item);
                ids.push(insert_row(conn, model, &row)?);
            }
            Ok(Value::Array(
                ids.into_iter().map(|id| json!(id)).collect(),
            ))
        }
        Value::Object(_) => {
            let row = build_insert_row(model, &fields, data);
            match insert_row(conn, model, &row) {
                Ok(id) => Ok(Value::Array(vec![json!(id)])),
                Err(err) => {
                    log::error!("db-create 失败（表 {}）: {err}", model.name);
                    Ok(Value::Bool(false))
                }
            }
        }
        _ => Ok(Value::Null),
    }
}

/// 等价 `update(where, data)`：`where` / `data` 任一为空则返回 `null`，返回受影响行数。
pub fn update(conn: &Connection, model: &ModelDef, filters: &Value, data: &Value) -> AppResult<Value> {
    if !js::js_truthy(filters) || !js::js_truthy(data) {
        return Ok(Value::Null);
    }

    let fields = model.valid_fields();
    let mut assignments: Vec<(String, Value)> = Vec::new();

    if let Value::Object(object) = data {
        for (key, value) in object {
            if !fields.contains(&key.as_str()) {
                continue;
            }
            if model.guarded.contains(&key.as_str()) {
                continue;
            }
            assignments.push((key.clone(), model.cast_of(key).map_or_else(|| value.clone(), |cast| cast.set(value))));
        }
    }

    if model.has_updated_at() {
        assignments.push(("updated_at".to_string(), now_sql()));
    }

    if assignments.is_empty() {
        // 老项目同样会执行一次「空 SET」更新：此处等价处理为无字段可更新，返回 0。
        log::warn!("db-update 无有效字段（表 {}）", model.name);
        return Ok(json!(0));
    }

    let (clause, params) = build_where(model, filters);
    if clause.is_empty() {
        log::warn!("db-update 的 where 条件为空（表 {}），将更新全表（与老项目行为一致）", model.name);
    }

    let set_sql = assignments
        .iter()
        .map(|(column, _)| format!("{} = ?", quote_identifier(column)))
        .collect::<Vec<_>>()
        .join(", ");
    let sql = format!(
        "UPDATE {} SET {set_sql}{clause}",
        quote_identifier(model.name)
    );

    let mut bindings: Vec<SqlValue> = assignments
        .into_iter()
        .map(|(_, value)| sql_value(&value))
        .collect();
    bindings.extend(params.iter().map(to_sql));

    let affected = conn.execute(&sql, params_from_iter(bindings.iter()))?;
    Ok(json!(affected))
}

/// 等价 `delete(where)`：`where` 为空返回 `null`，返回受影响行数。
pub fn delete(conn: &Connection, model: &ModelDef, filters: &Value) -> AppResult<Value> {
    if !js::js_truthy(filters) {
        return Ok(Value::Null);
    }

    let (clause, params) = build_where(model, filters);
    if clause.is_empty() {
        log::warn!("db-delete 的 where 条件为空（表 {}），将清空全表（与老项目行为一致）", model.name);
    }

    let sql = format!("DELETE FROM {}{clause}", quote_identifier(model.name));
    let affected = conn.execute(&sql, params_from_iter(params.iter().map(to_sql)))?;
    Ok(json!(affected))
}

// ---------------------------------------------------------------------------
// 行数据 → JSON（cast + 时间格式化）
// ---------------------------------------------------------------------------

/// 等价 `filterKeys` + `casts` + `formatTimestamps`。
fn present_row(model: &ModelDef, row: Map<String, Value>) -> Value {
    let mut presented = Map::new();
    for (key, value) in row {
        if model.is_hidden(&key) {
            continue;
        }
        let casted = match model.cast_of(&key) {
            Some(cast) => cast.get(&value),
            None => value,
        };
        presented.insert(key, casted);
    }

    for column in TIMESTAMP_COLUMNS {
        let should_format = presented
            .get(column)
            .map(js::js_truthy)
            .unwrap_or(false);
        if should_format {
            if let Some(current) = presented.get(column).cloned() {
                presented.insert(column.to_string(), js::format_datetime(&current));
            }
        }
    }

    Value::Object(presented)
}

/// 等价 `buildWhere`（含 schedules / secrets 两个子类的覆写逻辑）。
fn build_where(model: &ModelDef, filters: &Value) -> (String, Vec<Value>) {
    let Some(object) = filters.as_object() else {
        // 基类：`if (!where || Object.keys(where).length === 0) return;`
        return (String::new(), Vec::new());
    };

    let mut builder = WhereBuilder::default();
    match model.hook {
        WhereHook::None => {
            let valid = model.valid_fields();
            for (key, value) in object {
                if !valid.contains(&key.as_str()) {
                    continue;
                }
                if value.is_null() || value.as_str() == Some("") {
                    continue;
                }
                match value.as_array() {
                    Some(list) => builder.in_list(key, list),
                    None => builder.eq(key, value),
                }
            }
        }
        WhereHook::Schedules => {
            builder.raw("id > 0", Vec::new());
            apply_hook_id(&mut builder, object);
            apply_hook_field(&mut builder, object, "status");
        }
        WhereHook::Secrets => {
            builder.raw("id > 0", Vec::new());
            apply_hook_id(&mut builder, object);
            apply_hook_field(&mut builder, object, "app_id");
            apply_hook_field(&mut builder, object, "status");
            apply_hook_keywords(&mut builder, object);
        }
    }

    builder.render()
}

/// `schedules` / `secrets` 覆写版中的 id 条件（支持 `{ not, eq }` 与数组）。
fn apply_hook_id(builder: &mut WhereBuilder, object: &Map<String, Value>) {
    let Some(value) = object.get("id") else {
        return;
    };
    if !js::js_truthy(value) {
        return;
    }

    if let Some(condition) = value.as_object() {
        if condition.contains_key("not") || condition.contains_key("eq") {
            if let Some(not) = condition.get("not") {
                if js::js_truthy(not) {
                    match not.as_array() {
                        Some(list) => builder.not_in_list("id", list),
                        None => builder.not_eq("id", not),
                    }
                }
            }
            if let Some(eq) = condition.get("eq") {
                if js::js_truthy(eq) {
                    match eq.as_array() {
                        Some(list) => builder.in_list("id", list),
                        None => builder.eq("id", eq),
                    }
                }
            }
            return;
        }
    }

    apply_condition(builder, "id", value);
}

/// `applyWhereCondition`：真值（或字符串 `'0'`）才参与过滤；数组需非空。
fn apply_hook_field(builder: &mut WhereBuilder, object: &Map<String, Value>, field: &str) {
    let Some(value) = object.get(field) else {
        return;
    };
    if !js::js_truthy(value) && value.as_str() != Some("0") {
        return;
    }
    apply_condition(builder, field, value);
}

fn apply_condition(builder: &mut WhereBuilder, field: &str, value: &Value) {
    match value.as_array() {
        Some(list) => {
            // 老项目 `if (Array.isArray(value) && value.length > 0)`
            if !list.is_empty() {
                builder.in_list(field, list);
            }
        }
        None => builder.eq(field, value),
    }
}

/// `secrets` 覆写版的关键词模糊搜索（老项目用 `LOCATE`，SQLite 等价写法为 `instr`）。
fn apply_hook_keywords(builder: &mut WhereBuilder, object: &Map<String, Value>) {
    let Some(Value::String(keyword)) = object.get("keywords") else {
        return;
    };
    if keyword.is_empty() {
        return;
    }
    builder.raw(
        "(instr(\"title\", ?) > 0 OR instr(\"app_id\", ?) > 0 OR instr(\"extension\", ?) > 0)",
        vec![Value::String(keyword.clone()); 3],
    );
}

/// WHERE 子句构造器（等价 knex 的 `where` / `whereIn` / `whereNot` / `whereNotIn` / `whereRaw`）。
#[derive(Default)]
struct WhereBuilder {
    clauses: Vec<String>,
    params: Vec<Value>,
}

impl WhereBuilder {
    fn eq(&mut self, column: &str, value: &Value) {
        self.clauses
            .push(format!("{} = ?", quote_identifier(column)));
        self.params.push(value.clone());
    }

    fn not_eq(&mut self, column: &str, value: &Value) {
        self.clauses
            .push(format!("{} <> ?", quote_identifier(column)));
        self.params.push(value.clone());
    }

    fn in_list(&mut self, column: &str, values: &[Value]) {
        if values.is_empty() {
            // knex `whereIn(x, [])` 生成恒假条件
            self.clauses.push("0 = 1".to_string());
            return;
        }
        let holders = vec!["?"; values.len()].join(", ");
        self.clauses
            .push(format!("{} IN ({holders})", quote_identifier(column)));
        self.params.extend(values.iter().cloned());
    }

    fn not_in_list(&mut self, column: &str, values: &[Value]) {
        if values.is_empty() {
            // knex `whereNotIn(x, [])` 生成恒真条件
            self.clauses.push("1 = 1".to_string());
            return;
        }
        let holders = vec!["?"; values.len()].join(", ");
        self.clauses
            .push(format!("{} NOT IN ({holders})", quote_identifier(column)));
        self.params.extend(values.iter().cloned());
    }

    fn raw(&mut self, clause: impl Into<String>, params: Vec<Value>) {
        self.clauses.push(clause.into());
        self.params.extend(params);
    }

    fn render(&self) -> (String, Vec<Value>) {
        if self.clauses.is_empty() {
            (String::new(), Vec::new())
        } else {
            (
                format!(" WHERE {}", self.clauses.join(" AND ")),
                self.params.clone(),
            )
        }
    }
}

/// 等价 `getList` 的 orderBy 逻辑（含 `sort` 列的排序优先级补齐）。
fn build_order(model: &ModelDef, order: Option<&Value>) -> String {
    let mut pieces: Vec<String> = Vec::new();

    let items: Vec<Value> = match order {
        // `order && order.length > 0` → 使用前端传入排序
        Some(Value::Array(list)) if !list.is_empty() => list.clone(),
        // 显式传空数组 → `else if (fields.includes('sort'))`
        Some(Value::Array(_)) => Vec::new(),
        // 未传排序 → 默认按主键升序
        _ => vec![json!({"column": model.primary_key, "order": "ASC"})],
    };

    let contains_sort = items.iter().any(|item| {
        item.get("column")
            .and_then(|column| column.as_str())
            .map(|column| column.contains("sort"))
            .unwrap_or(false)
    });

    if !items.is_empty() {
        if contains_sort {
            pieces.push("CASE WHEN \"sort\" > 0 THEN 1 ELSE 0 END DESC".to_string());
            pieces.push("\"sort\" ASC".to_string());
        }
        for item in &items {
            if let Some(piece) = order_piece(item) {
                pieces.push(piece);
            }
        }
    } else if model.sortable_fields().contains(&"sort") {
        pieces.push("CASE WHEN \"sort\" > 0 THEN 1 ELSE 0 END DESC".to_string());
        pieces.push("\"sort\" ASC".to_string());
    }

    if pieces.is_empty() {
        String::new()
    } else {
        format!(" ORDER BY {}", pieces.join(", "))
    }
}

fn order_piece(item: &Value) -> Option<String> {
    let column = item.get("column")?.as_str()?;
    let direction = item
        .get("order")
        .and_then(|order| order.as_str())
        .unwrap_or("ASC")
        .to_uppercase();
    let direction = if direction == "DESC" { "DESC" } else { "ASC" };
    Some(format!("{column} {direction}"))
}

/// 单行插入，返回自增主键。
fn insert_row(conn: &Connection, model: &ModelDef, row: &Map<String, Value>) -> AppResult<i64> {
    if row.is_empty() {
        conn.execute(
            &format!(
                "INSERT INTO {} DEFAULT VALUES",
                quote_identifier(model.name)
            ),
            [],
        )?;
        return Ok(conn.last_insert_rowid());
    }

    let columns = row
        .keys()
        .map(|column| quote_identifier(column))
        .collect::<Vec<_>>()
        .join(", ");
    let holders = vec!["?"; row.len()].join(", ");
    let sql = format!(
        "INSERT INTO {} ({columns}) VALUES ({holders})",
        quote_identifier(model.name)
    );
    let bindings: Vec<SqlValue> = row.values().map(to_sql).collect();
    conn.execute(&sql, params_from_iter(bindings.into_iter()))?;
    Ok(conn.last_insert_rowid())
}

/// 等价 `create` 中构造 `dataRow` 的过程（白名单字段 + casts + created_at/updated_at）。
fn build_insert_row(model: &ModelDef, fields: &[&'static str], data: &Value) -> Map<String, Value> {
    let mut row = Map::new();

    if let Value::Object(object) = data {
        for field in fields {
            let Some(value) = object.get(*field) else {
                continue;
            };
            let casted = model
                .cast_of(field)
                .map_or_else(|| value.clone(), |cast| cast.set(value));
            row.insert((*field).to_string(), casted);
        }
    }

    if model.has_updated_at() {
        row.insert("updated_at".to_string(), now_sql());
    }
    if model.has_created_at() {
        row.insert("created_at".to_string(), now_sql());
    }

    row
}

/// 等价 knex 的 `db.fn.now()`。
fn now_sql() -> Value {
    Value::String(chrono::Utc::now().format(js::SHANGHAI_FORMAT).to_string())
}

// ---------------------------------------------------------------------------
// rusqlite ←→ serde_json 值转换
// ---------------------------------------------------------------------------

fn to_sql(value: &Value) -> SqlValue {
    sql_value(value)
}

fn sql_value(value: &Value) -> SqlValue {
    match value {
        Value::Null => SqlValue::Null,
        Value::Bool(flag) => SqlValue::Integer(i64::from(*flag)),
        Value::Number(number) => {
            if let Some(int) = number.as_i64() {
                SqlValue::Integer(int)
            } else if let Some(float) = number.as_f64() {
                SqlValue::Real(float)
            } else {
                SqlValue::Text(number.to_string())
            }
        }
        Value::String(text) => SqlValue::Text(text.clone()),
        other => SqlValue::Text(serde_json::to_string(other).unwrap_or_default()),
    }
}

fn value_ref_to_json(value: ValueRef<'_>) -> Value {
    match value {
        ValueRef::Null => Value::Null,
        ValueRef::Integer(int) => Value::Number(Number::from(int)),
        ValueRef::Real(float) => Number::from_f64(float)
            .map(Value::Number)
            .unwrap_or(Value::Null),
        ValueRef::Text(bytes) => Value::String(String::from_utf8_lossy(bytes).into_owned()),
        ValueRef::Blob(bytes) => Value::String(hex::encode(bytes)),
    }
}

fn select_rows(
    conn: &Connection,
    sql: &str,
    params: Vec<Value>,
) -> AppResult<Vec<Map<String, Value>>> {
    let mut statement = conn.prepare(sql)?;
    let columns: Vec<String> = statement
        .column_names()
        .iter()
        .map(|column| (*column).to_string())
        .collect();

    let mut rows = statement.query(params_from_iter(params.iter().map(to_sql)))?;
    let mut result = Vec::new();
    while let Some(row) = rows.next()? {
        let mut item = Map::new();
        for (index, column) in columns.iter().enumerate() {
            item.insert(column.clone(), value_ref_to_json(row.get_ref(index)?));
        }
        result.push(item);
    }
    Ok(result)
}

fn count_rows(conn: &Connection, sql: &str, params: Vec<Value>) -> AppResult<i64> {
    let total = conn.query_row(sql, params_from_iter(params.iter().map(to_sql)), |row| {
        row.get::<_, i64>(0)
    })?;
    Ok(total)
}

/// 标识符引用：普通列名加双引号；含表达式（knex raw）的原样透传。
fn quote_identifier(name: &str) -> String {
    if !name.is_empty() && name.chars().all(|ch| ch.is_ascii_alphanumeric() || ch == '_') {
        format!("\"{name}\"")
    } else {
        name.to_string()
    }
}
