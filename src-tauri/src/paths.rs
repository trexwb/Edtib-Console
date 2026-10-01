//! 路径解析：应用数据目录、系统文档目录，以及「前端相对路径 → 绝对路径」的安全解析。
//!
//! 与老 Electron 的对应关系：
//!   `app.getPath('userData')`  -> [`data_dir`]
//!   `app.getPath('documents')` -> [`documents_dir`]
//!   `path.join(userData, p)`   -> [`resolve`]（额外增加 `..` / 绝对路径越界防护）

use std::path::{Component, Path, PathBuf};

use tauri::{AppHandle, Manager};

use crate::error::{AppError, AppResult};

/// 应用数据目录（老 `userData`；SQLite 文件与本地缓存文件都落在这里）。
pub fn data_dir(app: &AppHandle) -> PathBuf {
    app.path()
        .app_data_dir()
        .unwrap_or_else(|_| PathBuf::from("."))
}

/// 系统文档目录（老 `app.getPath('documents')`）。
pub fn documents_dir(app: &AppHandle) -> PathBuf {
    app.path().document_dir().unwrap_or_else(|_| {
        let home = std::env::var("HOME")
            .or_else(|_| std::env::var("USERPROFILE"))
            .unwrap_or_else(|_| ".".into());
        PathBuf::from(home).join("Documents")
    })
}

/// 确保目录存在。
pub fn ensure_dir(dir: &Path) -> AppResult<()> {
    std::fs::create_dir_all(dir)
        .map_err(|e| AppError::other(format!("创建目录失败 {}: {e}", dir.display())))
}

/// 把「相对路径」解析为数据目录下的绝对路径。
///
/// 安全约束（老实现 `path.join(userData, filePath)` 没有这层防护）：
///   * 禁止 `..` 跳转（防止越出数据目录）；
///   * 禁止绝对路径 / 盘符（老实现里绝对路径会直接覆盖 userData 前缀，
///     等于允许渲染进程读写磁盘任意位置）。
pub fn resolve(base: &Path, relative: &str) -> AppResult<PathBuf> {
    if relative.trim().is_empty() {
        return Err(AppError::other("路径不能为空"));
    }
    let rel = Path::new(relative);
    for component in rel.components() {
        match component {
            Component::ParentDir => {
                return Err(AppError::other(format!(
                    "非法路径（禁止使用 .. 跳转）：{relative}"
                )))
            }
            Component::RootDir | Component::Prefix(_) => {
                return Err(AppError::other(format!(
                    "非法路径（禁止绝对路径）：{relative}"
                )))
            }
            _ => {}
        }
    }
    Ok(base.join(rel))
}

/// 统一转成字符串（分隔符由系统决定，与老实现 `path.join` 的结果一致）。
pub fn to_string(path: &Path) -> String {
    path.to_string_lossy().to_string()
}

#[cfg(test)]
mod tests {
    use std::path::Path;

    use super::resolve;

    #[test]
    fn resolves_relative_path_under_base() {
        let base = Path::new("/app-data");
        assert_eq!(
            resolve(base, "user/login-cache.json").unwrap(),
            Path::new("/app-data/user/login-cache.json")
        );
    }

    #[test]
    fn rejects_parent_dir_and_absolute_path() {
        let base = Path::new("/app-data");
        assert!(resolve(base, "../etc/passwd").is_err());
        assert!(resolve(base, "user/../../secret").is_err());
        assert!(resolve(base, "/etc/passwd").is_err());
        assert!(resolve(base, "   ").is_err());
    }
}
