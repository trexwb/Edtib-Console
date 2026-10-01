//! 文件系统命令（对应 `src/bridge/channels.ts` 的 `fs.*`，等价老 Electron `fs-*` IPC 通道）。
//!
//! 与老实现的差异（仅安全增强，路径语义保持兼容）：
//!   * 老实现直接 `path.join(userData, filePath)`，绝对路径会覆盖 userData 前缀，
//!     等于允许渲染进程读写磁盘任意位置；
//!   * 新实现：相对路径一律解析到应用数据目录（等价老 `path.join`）；绝对路径仅允许落在
//!     「应用数据目录 / 系统文档目录」内；任何 `..` 跳转一律拒绝。
//!
//! 返回结构与 `src/utils/requestBridge.ts` 的读取口径一致：
//!   * `fs_read_file` / `fs_write_file` → 统一信封 `{ code, message, timestamp, data }`
//!     （前端读 `response.code === 200` 与 `response.data`）；
//!   * `fs_delete_file` / `fs_exists` → 裸 boolean；`fs_list_files` → 裸 string[]；
//!     `fs_get_user_data_path` / `fs_get_documents_path` → 裸 string。

use std::path::{Component, Path, PathBuf};

use serde_json::Value;
use tauri::AppHandle;

use crate::error::{AppError, AppResult};
use crate::paths;
use crate::response::{self, Envelope};

/// 解析前端传入的路径。
///
/// * `empty_as_base = true`：空字符串等价于应用数据目录根（老实现 `path.join(userData, '')`
///   的语义，前端以空 dir 列目录时使用）；
/// * 其余情况空字符串视为非法。
pub(crate) fn resolve_input(app: &AppHandle, input: &str, empty_as_base: bool) -> AppResult<PathBuf> {
    let trimmed = input.trim();
    let base = paths::data_dir(app);
    if trimmed.is_empty() {
        if empty_as_base {
            return Ok(base);
        }
        return Err(AppError::other("路径不能为空"));
    }

    for component in Path::new(trimmed).components() {
        if matches!(component, Component::ParentDir) {
            return Err(AppError::other(format!(
                "非法路径（禁止使用 .. 跳转）：{trimmed}"
            )));
        }
    }

    let raw = Path::new(trimmed);
    if raw.is_absolute() {
        let allowed = [base.clone(), paths::documents_dir(app)];
        if allowed.iter().any(|dir| raw.starts_with(dir)) {
            return Ok(raw.to_path_buf());
        }
        return Err(AppError::other(format!(
            "非法路径（仅允许应用数据目录 / 文档目录内的绝对路径）：{trimmed}"
        )));
    }

    paths::resolve(&base, trimmed)
}

/// fs_read_file：读取文本文件；文件不存在时返回 `data: null`（老 `fs-read-file` 的约定，
/// 前端据此判定「无缓存」并降级）。
#[tauri::command]
pub async fn fs_read_file(app: AppHandle, file_path: String) -> AppResult<Envelope> {
    let path = resolve_input(&app, &file_path, false)?;
    match std::fs::read_to_string(&path) {
        Ok(content) => Ok(response::success(Value::String(content))),
        Err(err) if err.kind() == std::io::ErrorKind::NotFound => Ok(response::success(Value::Null)),
        Err(err) => Err(AppError::other(format!(
            "读取文件失败 {}：{err}",
            paths::to_string(&path)
        ))),
    }
}

/// fs_write_file：写入文本文件（自动创建父目录），`data` 为绝对路径。
#[tauri::command]
pub async fn fs_write_file(app: AppHandle, file_path: String, data: String) -> AppResult<Envelope> {
    let path = resolve_input(&app, &file_path, false)?;
    if let Some(parent) = path.parent() {
        paths::ensure_dir(parent)?;
    }
    std::fs::write(&path, data)
        .map_err(|err| AppError::other(format!("写入文件失败 {}：{err}", paths::to_string(&path))))?;
    Ok(response::success(Value::String(paths::to_string(&path))))
}

/// fs_delete_file：删除文件（老 `fs-delete-file`：失败只返回 false，不抛错）。
#[tauri::command]
pub async fn fs_delete_file(app: AppHandle, file_path: String) -> AppResult<bool> {
    let path = match resolve_input(&app, &file_path, false) {
        Ok(path) => path,
        Err(err) => {
            log::warn!("[fs_delete_file] 已拒绝非法路径：{err}");
            return Ok(false);
        }
    };
    if !path.exists() {
        return Ok(false);
    }
    match std::fs::remove_file(&path) {
        Ok(()) => Ok(true),
        Err(err) => {
            log::warn!("[fs_delete_file] 删除失败 {}：{err}", paths::to_string(&path));
            Ok(false)
        }
    }
}

/// fs_list_files：列出目录下的文件名（老 `fs-list-files`，异常时返回空数组）。
#[tauri::command]
pub async fn fs_list_files(app: AppHandle, dir: String) -> AppResult<Vec<String>> {
    let path = match resolve_input(&app, &dir, true) {
        Ok(path) => path,
        Err(err) => {
            log::warn!("[fs_list_files] 已拒绝非法路径：{err}");
            return Ok(Vec::new());
        }
    };
    let entries = match std::fs::read_dir(&path) {
        Ok(entries) => entries,
        Err(err) => {
            log::warn!("[fs_list_files] 读取目录失败 {}：{err}", paths::to_string(&path));
            return Ok(Vec::new());
        }
    };
    let mut names = Vec::new();
    for entry in entries.flatten() {
        names.push(entry.file_name().to_string_lossy().to_string());
    }
    names.sort();
    Ok(names)
}

/// fs_get_user_data_path：应用数据目录绝对路径（老 `fs-get-user-data-path`）。
#[tauri::command]
pub async fn fs_get_user_data_path(app: AppHandle) -> AppResult<String> {
    let dir = paths::data_dir(&app);
    paths::ensure_dir(&dir)?;
    Ok(paths::to_string(&dir))
}

/// fs_get_documents_path：系统文档目录绝对路径（老 `fs-get-documents-path`）。
#[tauri::command]
pub async fn fs_get_documents_path(app: AppHandle) -> AppResult<String> {
    Ok(paths::to_string(&paths::documents_dir(&app)))
}

/// fs_exists：文件（或目录）是否存在（老 `fs-exists`）。
#[tauri::command]
pub async fn fs_exists(app: AppHandle, file_path: String) -> AppResult<bool> {
    match resolve_input(&app, &file_path, false) {
        Ok(path) => Ok(path.exists()),
        Err(err) => {
            log::warn!("[fs_exists] 已拒绝非法路径：{err}");
            Ok(false)
        }
    }
}

#[cfg(test)]
mod tests {
    use std::path::Path;

    use super::*;

    /// `resolve_input` 的绝对路径判定依赖运行中的 AppHandle，这里覆盖其纯逻辑部分：
    /// 相对路径解析与 `..` / 空串拒绝。
    #[test]
    fn relative_paths_resolve_under_base() {
        let base = Path::new("/app-data");
        assert_eq!(
            resolve_input_path(base, "attachments/sign-cache.json").unwrap(),
            Path::new("/app-data/attachments/sign-cache.json")
        );
        assert!(resolve_input_path(base, "").is_err());
        assert!(resolve_input_path(base, "../outside.json").is_err());
    }

    fn resolve_input_path(base: &Path, input: &str) -> AppResult<PathBuf> {
        let trimmed = input.trim();
        if trimmed.is_empty() {
            return Err(AppError::other("路径不能为空"));
        }
        if Path::new(trimmed)
            .components()
            .any(|c| matches!(c, Component::ParentDir))
        {
            return Err(AppError::other("非法路径"));
        }
        paths::resolve(base, trimmed)
    }
}
