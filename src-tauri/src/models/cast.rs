//! 类型转换（cast）：逐条等价老项目 `electron/src/cast/*.ts` 的 `get`（DB → 前端）
//! 与 `set`（前端 → DB）。

use serde_json::{Map, Number, Value};

use crate::crypt;
use crate::js;

/// 与老项目 cast 目录一一对应（`boolean / crypt / datetime / integer / integerOrNull / json / string`）。
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Cast {
    /// `cast/string.ts`
    String,
    /// `cast/integer.ts`（模型中以 `CastInt` 别名使用）
    Integer,
    /// `cast/integerOrNull.ts`
    IntegerOrNull,
    /// `cast/json.ts`
    Json,
    /// `cast/crypt.ts`
    Crypt,
    /// `cast/boolean.ts`
    Boolean,
    /// `cast/datetime.ts`
    Datetime,
}

impl Cast {
    /// DB → 前端（等价 `castType.get(value)`）。
    pub fn get(self, value: &Value) -> Value {
        match self {
            Cast::String => string_get(value),
            Cast::Integer => integer_get(value),
            Cast::IntegerOrNull => integer_or_null_get(value),
            Cast::Json => json_get(value),
            Cast::Crypt => crypt_get(value),
            Cast::Boolean => boolean_get(value),
            Cast::Datetime => datetime_get(value),
        }
    }

    /// 前端 → DB（等价 `castType.set(value)`）。
    pub fn set(self, value: &Value) -> Value {
        match self {
            Cast::String => js::to_string(value).into(),
            Cast::Integer => integer_set(value),
            Cast::IntegerOrNull => integer_or_null_set(value),
            Cast::Json => json_set(value),
            Cast::Crypt => crypt_set(value),
            Cast::Boolean => boolean_set(value),
            Cast::Datetime => datetime_set(value),
        }
    }
}

/// `cast/string.ts`：`value === false || value === null ? String(value) : (value || '').toString()`
fn string_get(value: &Value) -> Value {
    match value {
        Value::Bool(false) | Value::Null => Value::String(js::to_string(value)),
        _ if !js::js_truthy(value) => Value::String(String::new()),
        _ => Value::String(js::to_string(value)),
    }
}

/// `cast/integer.ts`：`parseInt(String(value), 10)`，`NaN` → `0`
fn integer_get(value: &Value) -> Value {
    Value::Number(Number::from(js::parse_int(value).unwrap_or(0)))
}

/// `cast/integerOrNull.ts`：假值 → `null`；`parseInt` 失败 → `null`
fn integer_or_null_get(value: &Value) -> Value {
    if !js::js_truthy(value) {
        return Value::Null;
    }
    match js::parse_int(value) {
        Some(parsed) => Value::Number(Number::from(parsed)),
        None => Value::Null,
    }
}

/// `cast/integerOrNull.ts` 的 `set`：假值 → `null`；`number` 原样；非空字符串 `parseFloat`；其余 → `null`
fn integer_or_null_set(value: &Value) -> Value {
    if !js::js_truthy(value) {
        return Value::Null;
    }
    match value {
        Value::Number(number) => Value::Number(number.clone()),
        Value::String(text) if !text.trim().is_empty() => {
            number_from_f64(js::parse_float(value).unwrap_or(0.0))
        }
        _ => Value::Null,
    }
}

/// `cast/integer.ts` 的 `set`：`number` 原样；非空字符串 `parseFloat`（失败 → `0`）；其余 → `0`
fn integer_set(value: &Value) -> Value {
    match value {
        Value::Number(number) => Value::Number(number.clone()),
        Value::String(text) if !text.trim().is_empty() => {
            number_from_f64(js::parse_float(value).unwrap_or(0.0))
        }
        _ => Value::Number(Number::from(0)),
    }
}

/// JS `number` → JSON 数值：整数值用 `i64`（SQLite 存 INTEGER），其余用 `f64`。
fn number_from_f64(value: f64) -> Value {
    if value.is_finite() && value.fract() == 0.0 && value.abs() <= 9_007_199_254_740_992.0 {
        Value::Number(Number::from(value as i64))
    } else {
        Number::from_f64(value)
            .map(Value::Number)
            .unwrap_or_else(|| Value::Number(Number::from(0)))
    }
}

/// `cast/json.ts` 的 `get`：字符串直接 `JSON.parse`（失败或空串 → `{}`），非字符串原样返回
fn json_get(value: &Value) -> Value {
    match value {
        Value::String(text) => {
            let source = if text.is_empty() { "{}" } else { text.as_str() };
            serde_json::from_str(source).unwrap_or_else(|_| Value::Object(Map::new()))
        }
        other => other.clone(),
    }
}

/// `cast/json.ts` 的 `set`：字符串原样存储，其余 `JSON.stringify`
fn json_set(value: &Value) -> Value {
    match value {
        Value::String(text) => Value::String(text.clone()),
        other => match serde_json::to_string(other) {
            Ok(serialized) => Value::String(serialized),
            Err(_) => Value::Object(Map::new()),
        },
    }
}

/// `cast/crypt.ts` 的 `get`：解密失败 → `false`（老项目 `decrypt` 返回 `false`）
fn crypt_get(value: &Value) -> Value {
    match value {
        Value::String(ciphertext) => crypt::decrypt_default(ciphertext).unwrap_or(Value::Bool(false)),
        _ => Value::Bool(false),
    }
}

/// `cast/crypt.ts` 的 `set`：加密失败 → `''`
fn crypt_set(value: &Value) -> Value {
    Value::String(crypt::encrypt_default(value))
}

/// `cast/boolean.ts` 的 `get`
fn boolean_get(value: &Value) -> Value {
    match value {
        Value::String(text) => {
            let normalized = text.trim().to_lowercase();
            Value::Bool(matches!(normalized.as_str(), "true" | "1" | ""))
        }
        other => Value::Bool(js::js_truthy(other)),
    }
}

/// `cast/boolean.ts` 的 `set`
fn boolean_set(value: &Value) -> Value {
    match value {
        Value::Bool(flag) => Value::String(if *flag { "true" } else { "false" }.to_string()),
        _ => Value::String("false".to_string()),
    }
}

/// `cast/datetime.ts` 的 `get`：假值 → `null`，否则上海时区格式化
fn datetime_get(value: &Value) -> Value {
    if !js::js_truthy(value) {
        return Value::Null;
    }
    js::format_datetime(value)
}

/// `cast/datetime.ts` 的 `set`：假值 → `null`；无法解析时取当前时间
fn datetime_set(value: &Value) -> Value {
    if !js::js_truthy(value) {
        return Value::Null;
    }
    let formatted = js::format_datetime(value);
    if formatted == *value {
        // 无法解析 → 等价老项目 `moment.utc()`（取当前时间）再按上海时区格式化
        return js::format_datetime(&Value::Number(Number::from(js::now_millis())));
    }
    formatted
}

/// 无 cast 定义时的原样返回（等价老项目 `castType ? castType.get(...) : value`）。
pub fn passthrough(value: &Value) -> Value {
    value.clone()
}
