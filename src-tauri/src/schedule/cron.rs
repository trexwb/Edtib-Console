//! cron 表达式解析与匹配：等价老项目 `node-schedule` 的表达式语义。
//!
//! 老实现（`electron/src/schedule/index.ts`）用 `node-schedule.scheduleJob(row.time, fn)`
//! 注册任务，`row.time` 为「秒 分 时 日 月 周」六段式（见 seeds 中的
//! `0 */3 * * * *`、`30 0 * * * *`）。本模块只实现迁移所需的子集：
//!
//! - 5 段（`分 时 日 月 周`，秒固定 0）与 6 段（`秒 分 时 日 月 周`）
//! - `*` / `?` / 具体值 / 区间 `a-b` / 步长 `*/n`、`a-b/n` / 列表 `a,b,c`
//! - 月份/星期英文缩写（`jan`-`dec`、`sun`-`sat`），星期 `7` 等同 `0`（周日）
//!
//! 未实现的 node-schedule 高级语法（`L`、`#`、`W` 等）在解析阶段即报错，
//! 由调用方记录到任务状态里，不会静默降级。

use chrono::{DateTime, Datelike, Local, Timelike};

const MONTH_NAMES: &[(&str, u32)] = &[
    ("jan", 1),
    ("feb", 2),
    ("mar", 3),
    ("apr", 4),
    ("may", 5),
    ("jun", 6),
    ("jul", 7),
    ("aug", 8),
    ("sep", 9),
    ("oct", 10),
    ("nov", 11),
    ("dec", 12),
];

const WEEKDAY_NAMES: &[(&str, u32)] = &[
    ("sun", 0),
    ("mon", 1),
    ("tue", 2),
    ("wed", 3),
    ("thu", 4),
    ("fri", 5),
    ("sat", 6),
];

/// 单个 cron 字段的取值集合。
#[derive(Debug, Clone)]
struct Field {
    min: u32,
    allowed: Vec<bool>,
}

impl Field {
    fn new(min: u32, max: u32) -> Self {
        Self {
            min,
            allowed: vec![false; (max - min + 1) as usize],
        }
    }

    fn any(min: u32, max: u32) -> Self {
        Self {
            min,
            allowed: vec![true; (max - min + 1) as usize],
        }
    }

    fn parse(segment: &str, min: u32, max: u32, names: &[(&str, u32)]) -> Result<Self, String> {
        let trimmed = segment.trim();
        if trimmed.is_empty() {
            return Err("cron 字段为空".to_string());
        }
        if trimmed == "*" || trimmed == "?" {
            return Ok(Self::any(min, max));
        }

        let mut field = Self::new(min, max);
        for part in trimmed.split(',') {
            let part = part.trim();
            if part.is_empty() {
                return Err(format!("cron 字段 `{segment}` 含空项"));
            }

            let (base, step) = match part.split_once('/') {
                Some((base, step)) => {
                    let step: u32 = step
                        .trim()
                        .parse()
                        .map_err(|_| format!("cron 步长非法: `{part}`"))?;
                    (base.trim(), step)
                }
                None => (part, 1),
            };
            if step == 0 {
                return Err(format!("cron 步长不能为 0: `{part}`"));
            }

            let (start, end) = if base == "*" || base == "?" {
                (min, max)
            } else if let Some((from, to)) = base.split_once('-') {
                (
                    resolve(from, names).ok_or_else(|| format!("cron 取值非法: `{from}`"))?,
                    resolve(to, names).ok_or_else(|| format!("cron 取值非法: `{to}`"))?,
                )
            } else {
                let value =
                    resolve(base, names).ok_or_else(|| format!("cron 取值非法: `{base}`"))?;
                (value, value)
            };

            if start > end || start < min || end > max {
                return Err(format!("cron 区间越界: `{part}`（允许 {min}-{max}）"));
            }

            let mut value = start;
            while value <= end {
                field.allowed[(value - min) as usize] = true;
                value += step;
            }
        }

        Ok(field)
    }

    fn matches(&self, value: u32) -> bool {
        match value.checked_sub(self.min).map(|offset| offset as usize) {
            Some(index) => self.allowed.get(index).copied().unwrap_or(false),
            None => false,
        }
    }

    /// 把 `from` 的取值镜像到 `to`（用于星期 `7` → `0` 的兼容）。
    fn alias(&mut self, from: u32, to: u32) {
        let from_index = (from - self.min) as usize;
        let to_index = (to - self.min) as usize;
        if self.allowed.get(from_index).copied().unwrap_or(false) {
            self.allowed[to_index] = true;
        }
    }
}

fn resolve(token: &str, names: &[(&str, u32)]) -> Option<u32> {
    let token = token.trim().to_ascii_lowercase();
    if token.is_empty() {
        return None;
    }
    if let Ok(value) = token.parse::<u32>() {
        return Some(value);
    }
    names
        .iter()
        .find(|(name, _)| *name == token)
        .map(|(_, value)| *value)
}

/// 解析完成的 cron 表达式。
#[derive(Debug, Clone)]
pub struct CronSpec {
    expression: String,
    seconds: Field,
    minutes: Field,
    hours: Field,
    days: Field,
    months: Field,
    weekdays: Field,
}

impl CronSpec {
    /// 解析 5 段（`分 时 日 月 周`）或 6 段（`秒 分 时 日 月 周`）表达式。
    pub fn parse(expression: &str) -> Result<Self, String> {
        let fields: Vec<&str> = expression.split_whitespace().collect();
        let (second, rest): (&str, &[&str]) = match fields.len() {
            5 => ("0", &fields[..]),
            6 => (fields[0], &fields[1..]),
            count => {
                return Err(format!(
                    "cron 表达式需 5 或 6 段，实际 {count} 段: `{expression}`"
                ))
            }
        };

        let mut weekdays = Field::parse(rest[4], 0, 7, WEEKDAY_NAMES)?;
        // node-schedule 兼容：7 与 0 同为周日
        weekdays.alias(7, 0);

        Ok(Self {
            expression: expression.trim().to_string(),
            seconds: Field::parse(second, 0, 59, &[])?,
            minutes: Field::parse(rest[0], 0, 59, &[])?,
            hours: Field::parse(rest[1], 0, 23, &[])?,
            days: Field::parse(rest[2], 1, 31, &[])?,
            months: Field::parse(rest[3], 1, 12, MONTH_NAMES)?,
            weekdays,
        })
    }

    /// 原始表达式文本（用于状态展示与去重判断）。
    pub fn expression(&self) -> &str {
        &self.expression
    }

    /// 判断给定时刻是否命中该表达式。
    ///
    /// 注：与原生 cron 一致，不做「日 / 周」互斥（OR）处理——两者同时命中才触发；
    /// 老项目实际使用的两条表达式月份/日/周均为 `*`，不受该差异影响。
    pub fn matches(&self, now: &DateTime<Local>) -> bool {
        self.seconds.matches(now.second())
            && self.minutes.matches(now.minute())
            && self.hours.matches(now.hour())
            && self.days.matches(now.day())
            && self.months.matches(now.month())
            && self
                .weekdays
                .matches(now.weekday().num_days_from_sunday())
    }
}

#[cfg(test)]
mod tests {
    use chrono::{Local, TimeZone};

    use super::CronSpec;

    /// 固定基准时刻：2026-09-29（星期二）的指定时分秒。
    fn matches(expression: &str, hour: u32, minute: u32, second: u32) -> bool {
        let spec = CronSpec::parse(expression).expect("表达式应可解析");
        let now = Local
            .with_ymd_and_hms(2026, 9, 29, hour, minute, second)
            .single()
            .expect("本地时间应唯一");
        spec.matches(&now)
    }

    #[test]
    fn parses_and_matches_heartbeat_seed() {
        // 老 seeds：检查心跳 `0 */3 * * * *`（每 3 分钟）
        assert!(matches("0 */3 * * * *", 10, 0, 0));
        assert!(matches("0 */3 * * * *", 10, 3, 0));
        assert!(!matches("0 */3 * * * *", 10, 1, 0));
        assert!(!matches("0 */3 * * * *", 10, 3, 30));
    }

    #[test]
    fn parses_and_matches_update_seed() {
        // 老 seeds：检查更新 `30 0 * * * *`（每小时 0 分 30 秒）
        assert!(matches("30 0 * * * *", 11, 0, 30));
        assert!(!matches("30 0 * * * *", 11, 30, 0));
        assert!(!matches("30 0 * * * *", 11, 0, 0));
    }

    #[test]
    fn supports_five_field_expression() {
        // 5 段 = 分 时 日 月 周，秒固定 0
        assert!(matches("*/30 * * * *", 9, 30, 0));
        assert!(!matches("*/30 * * * *", 9, 30, 1));
        assert!(!matches("*/30 * * * *", 9, 31, 0));
    }

    #[test]
    fn supports_names_ranges_lists_and_steps() {
        // 2026-09-29 为星期二、9 月
        assert!(matches("0 0 9 * * mon-fri", 9, 0, 0));
        assert!(!matches("0 0 9 * * sat,sun", 9, 0, 0));
        assert!(matches("0 0,12 * sep * *", 12, 0, 0));
        assert!(!matches("0 0,12 * oct * *", 12, 0, 0));
        assert!(matches("0 0 * * * 2", 12, 0, 0));
        assert!(matches("0 0 * * * tue", 12, 0, 0));
        assert!(!matches("0 0 * * * wed", 12, 0, 0));
        // 0-5/2 → {0,2,4}
        assert!(!matches("0 0-5/2 * * * *", 3, 0, 0));
        assert!(matches("0 0-5/2 * * * *", 4, 0, 0));
        assert!(!matches("0 0-5/2 * * * *", 5, 0, 0));
    }

    #[test]
    fn treats_sunday_seven_as_zero() {
        // 2026-09-27 为星期日
        let spec = CronSpec::parse("0 0 12 * * 7").expect("表达式应可解析");
        let sunday = Local
            .with_ymd_and_hms(2026, 9, 27, 12, 0, 0)
            .single()
            .expect("本地时间应唯一");
        assert!(spec.matches(&sunday));
    }

    #[test]
    fn rejects_invalid_expressions() {
        assert!(CronSpec::parse("0 */3 * * *").is_err());
        assert!(CronSpec::parse("0 0 * * * * *").is_err());
        assert!(CronSpec::parse("* * * * * */0").is_err());
        assert!(CronSpec::parse("0 0 32 * * *").is_err());
        assert!(CronSpec::parse("0 0 * * * xyz").is_err());
    }
}
