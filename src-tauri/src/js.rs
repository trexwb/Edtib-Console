//! 等价 JS 语义的小工具（老项目为 TypeScript，迁移需保持行为一致）。
//!
//! - `js_truthy`：JS 真值判断（`[]` / `{}` 为真）
//! - `to_string`：JS `String(value)` / `(value || '').toString()` 的近似
//! - `parse_int` / `parse_float`：JS `parseInt` / `parseFloat` 的逐字符语义
//! - `format_datetime`：等价 `moment.utc(value).tz('Asia/Shanghai').format('YYYY-MM-DD HH:mm:ss')`
//! - `now_iso`：等价 `new Date().toISOString()`

use chrono::{FixedOffset, NaiveDateTime, TimeZone, Utc};
use serde_json::{Number, Value};

/// 老项目 `model/base.ts` 中的 `SHANGHAI_TZ` / `FORMAT`。
pub const SHANGHAI_FORMAT: &str = "%Y-%m-%d %H:%M:%S";

fn shanghai() -> FixedOffset {
    // Asia/Shanghai 无夏令时，固定 +08:00
    FixedOffset::east_opt(8 * 3600).expect("东八区偏移合法")
}

/// JS 真值判断：`null`/`undefined`/`false`/`0`/`NaN`/`''` 为假，其余（含 `[]`、`{}`）为真。
pub fn js_truthy(value: &Value) -> bool {
    match value {
        Value::Null => false,
        Value::Bool(v) => *v,
        Value::Number(v) => v.as_f64().map(|n| n != 0.0).unwrap_or(false),
        Value::String(v) => !v.is_empty(),
        Value::Array(_) | Value::Object(_) => true,
    }
}

/// 等价 JS `String(value)`（`(value || '').toString()` 的行为见 `models::cast::string_get`）。
pub fn to_string(value: &Value) -> String {
    match value {
        Value::Null => "null".to_string(),
        Value::Bool(v) => v.to_string(),
        Value::Number(v) => number_to_string(v),
        Value::String(v) => v.clone(),
        Value::Array(items) => items
            .iter()
            .map(to_string)
            .collect::<Vec<_>>()
            .join(","),
        Value::Object(_) => "[object Object]".to_string(),
    }
}

fn number_to_string(value: &Number) -> String {
    if let Some(int) = value.as_i64() {
        return int.to_string();
    }
    if let Some(float) = value.as_f64() {
        if float.fract() == 0.0 && float.abs() < 1e15 {
            return format!("{}", float as i64);
        }
        return format!("{float}");
    }
    value.to_string()
}

/// 等价 JS `parseInt(value, 10)`：忽略前导空白，取最长十进制前缀；无法解析返回 `None`（JS 的 `NaN`）。
pub fn parse_int(value: &Value) -> Option<i64> {
    let raw = to_string(value);
    let text = raw.trim_start();
    let (sign, rest) = match text.chars().next() {
        Some('-') => (-1i64, &text[1..]),
        Some('+') => (1i64, &text[1..]),
        _ => (1i64, text),
    };
    let digits: String = rest.chars().take_while(|c| c.is_ascii_digit()).collect();
    if digits.is_empty() {
        return None;
    }
    digits.parse::<i64>().ok().map(|v| sign * v)
}

/// 等价 JS `parseFloat(value)`：忽略前导空白，取可解析的最长数值前缀；无法解析返回 `None`（JS 的 `NaN`）。
pub fn parse_float(value: &Value) -> Option<f64> {
    let raw = to_string(value);
    let text = raw.trim_start();

    let mut end = 0usize;
    for (index, ch) in text.char_indices() {
        let allowed = ch.is_ascii_digit()
            || ch == '.'
            || ((ch == '+' || ch == '-') && index == 0)
            || ((ch == 'e' || ch == 'E') && index > 0);
        if !allowed {
            break;
        }
        end = index + ch.len_utf8();
    }

    let mut candidate = &text[..end];
    while !candidate.is_empty() {
        if let Ok(parsed) = candidate.parse::<f64>() {
            return Some(parsed);
        }
        candidate = &candidate[..candidate.len() - 1];
    }
    None
}

/// 等价 `moment.utc(value).tz('Asia/Shanghai').format('YYYY-MM-DD HH:mm:ss')`。
/// 无法解析时保留原值（老项目 moment 会输出 `Invalid date`，此处选择不破坏原始数据并告警）。
pub fn format_datetime(value: &Value) -> Value {
    match parse_utc(value) {
        Some(datetime) => Value::String(
            shanghai()
                .from_utc_datetime(&datetime)
                .format(SHANGHAI_FORMAT)
                .to_string(),
        ),
        None => {
            log::warn!("无法解析的时间值: {value}");
            value.clone()
        }
    }
}

/// 把 DB / 前端传来的时间值解析为 UTC `NaiveDateTime`。
fn parse_utc(value: &Value) -> Option<NaiveDateTime> {
    match value {
        // JS `moment.utc(毫秒时间戳)`
        Value::Number(number) => {
            let millis = number.as_f64()?;
            let seconds = (millis / 1000.0).floor() as i64;
            let nanos = ((millis / 1000.0).fract() * 1_000_000_000.0) as u32;
            let seconds = seconds + (nanos / 1_000_000_000) as i64;
            Utc.timestamp_opt(seconds, nanos % 1_000_000_000)
                .single()
                .map(|datetime| datetime.naive_utc())
        }
        Value::String(text) => parse_datetime_str(text),
        _ => None,
    }
}

fn parse_datetime_str(text: &str) -> Option<NaiveDateTime> {
    const NAIVE_FORMATS: [&str; 6] = [
        "%Y-%m-%d %H:%M:%S%.f",
        "%Y-%m-%d %H:%M:%S",
        "%Y-%m-%d %H:%M",
        "%Y-%m-%d",
        "%Y/%m/%d %H:%M:%S",
        "%Y/%m/%d",
    ];
    for format in NAIVE_FORMATS {
        if let Ok(parsed) = NaiveDateTime::parse_from_str(text, format) {
            return Some(parsed);
        }
        if let Ok(date) = chrono::NaiveDate::parse_from_str(text, format) {
            return Some(date.and_hms_opt(0, 0, 0)?);
        }
    }
    // ISO8601 / RFC3339（含时区偏移），统一换算为 UTC
    if let Ok(parsed) = chrono::DateTime::parse_from_rfc3339(text) {
        return Some(parsed.naive_utc());
    }
    if let Ok(parsed) = chrono::DateTime::parse_from_str(text, "%Y-%m-%dT%H:%M:%S%.f%:z") {
        return Some(parsed.naive_utc());
    }
    if let Ok(parsed) = chrono::DateTime::parse_from_str(text, "%Y-%m-%d %H:%M:%S%:z") {
        return Some(parsed.naive_utc());
    }
    None
}

/// 等价 `new Date().toISOString()`（毫秒精度、以 `Z` 结尾）。
pub fn now_iso() -> String {
    Utc::now().format("%Y-%m-%dT%H:%M:%S%.3fZ").to_string()
}

/// 等价 `Date.now()`（毫秒时间戳）。
pub fn now_millis() -> i64 {
    Utc::now().timestamp_millis()
}
