//! 统一响应信封：等价老项目 `electron/main.ts` 中所有 `ipcMain.handle` 的返回结构
//! `{ code, message, timestamp, data }`，保证前端（含老项目 store/api 层）无感迁移。

use serde::Serialize;
use serde_json::Value;

use crate::js;

#[derive(Debug, Clone, Serialize)]
pub struct Envelope {
    pub code: u16,
    pub message: String,
    pub timestamp: String,
    pub data: Value,
}

/// 成功响应（`code: 200`）。
pub fn success(data: Value) -> Envelope {
    Envelope {
        code: 200,
        message: "success".to_string(),
        timestamp: js::now_iso(),
        data,
    }
}

/// 失败响应（`code: 500`，等价老项目 `error.message || 'Internal server error'`）。
pub fn failure(message: impl Into<String>) -> Envelope {
    Envelope {
        code: 500,
        message: message.into(),
        timestamp: js::now_iso(),
        data: Value::Null,
    }
}

/// 失败响应 + 自定义兜底数据（如 `db-get-list` 失败时返回 `{ total: 0, list: [] }`）。
pub fn failure_with(message: impl Into<String>, data: Value) -> Envelope {
    Envelope {
        code: 500,
        message: message.into(),
        timestamp: js::now_iso(),
        data,
    }
}
