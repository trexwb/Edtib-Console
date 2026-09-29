//! 数据模型注册表：逐字段等价老项目 `electron/src/model/*.ts` 的
//! `$table / $primaryKey / $fillable / $guarded / $casts / $hidden / buildWhere`。
//!
//! `ALLOWED_TABLES`（同老项目 `main.ts`）：
//! `secrets / configs / schedules / shapes / standards / categories /
//!  formulas / products / docs / variables / serials / customers`

pub mod cast;

pub use cast::Cast;

/// 自定义 `buildWhere`（老项目 `model/schedules.ts`、`model/secrets.ts` 覆写了基类实现）。
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum WhereHook {
    /// 使用基类 `buildWhere`（按白名单字段逐项过滤）
    None,
    /// `model/schedules.ts`：强制 `id > 0`，支持 id 的 not/eq 条件与 status
    Schedules,
    /// `model/secrets.ts`：强制 `id > 0`，支持 id 的 not/eq、app_id、status、keywords 模糊搜索
    Secrets,
}

/// 单个模型的静态定义（老项目模型对象中的 `$xxx` 字段）。
#[derive(Debug)]
pub struct ModelDef {
    pub name: &'static str,
    pub primary_key: &'static str,
    pub fillable: &'static [&'static str],
    pub guarded: &'static [&'static str],
    pub hidden: &'static [&'static str],
    /// `(列名, 转换类型)`
    pub casts: &'static [(&'static str, Cast)],
    pub hook: WhereHook,
}

impl ModelDef {
    /// 等价老项目 `base.ts` 中的 `fields` / `validFields`：
    /// `[primaryKey, ...fillable, ...guarded, ...hidden]`（去重、保持顺序）。
    pub fn valid_fields(&self) -> Vec<&'static str> {
        let mut fields: Vec<&'static str> = Vec::new();
        for field in std::iter::once(self.primary_key)
            .chain(self.fillable.iter().copied())
            .chain(self.guarded.iter().copied())
            .chain(self.hidden.iter().copied())
        {
            if !fields.contains(&field) {
                fields.push(field);
            }
        }
        fields
    }

    /// `[guarded, ...fillable]`（`getList` 判断是否含 `sort` 时使用）。
    pub fn sortable_fields(&self) -> Vec<&'static str> {
        self.guarded
            .iter()
            .chain(self.fillable.iter())
            .copied()
            .collect()
    }

    pub fn cast_of(&self, column: &str) -> Option<Cast> {
        self.casts
            .iter()
            .find(|(name, _)| *name == column)
            .map(|(_, cast)| *cast)
    }

    pub fn is_hidden(&self, column: &str) -> bool {
        self.hidden.contains(&column)
    }

    pub fn has_updated_at(&self) -> bool {
        self.valid_fields().contains(&"updated_at")
    }

    pub fn has_created_at(&self) -> bool {
        self.valid_fields().contains(&"created_at")
    }
}

/// 统一的软删除/审计列（12 个模型一致）。
pub const GUARDED_TIMESTAMPS: &[&str] = &["id", "created_at", "updated_at", "deleted_at"];

macro_rules! model {
    (
        name: $name:literal, primary_key: $pk:literal,
        fillable: [$($fillable:literal),* $(,)?],
        casts: [$($col:literal => $cast:ident),* $(,)?],
        hook: $hook:ident $(,)?
    ) => {
        ModelDef {
            name: $name,
            primary_key: $pk,
            fillable: &[$($fillable),*],
            guarded: GUARDED_TIMESTAMPS,
            hidden: &[],
            casts: &[$(($col, Cast::$cast)),*],
            hook: WhereHook::$hook,
        }
    };
}

/// 12 个模型，与老项目 `main.ts` 的 `ALLOWED_TABLES` / `MODEL_MAP` 一致。
pub static MODELS: &[ModelDef] = &[
    model!(
        name: "configs", primary_key: "id",
        fillable: ["key", "value"],
        casts: ["key" => String, "value" => Json],
        hook: None,
    ),
    model!(
        name: "schedules", primary_key: "id",
        fillable: ["name", "time", "handler", "status"],
        casts: ["name" => String, "time" => String, "handler" => Json, "status" => Integer],
        hook: Schedules,
    ),
    model!(
        name: "secrets", primary_key: "id",
        fillable: ["title", "app_id", "app_secret", "app_iv", "app_url", "extension", "status"],
        casts: [
            "title" => String,
            "app_id" => String,
            "app_secret" => Crypt,
            "app_iv" => Crypt,
            "app_url" => String,
            "extension" => Json,
            "status" => Integer,
        ],
        hook: Secrets,
    ),
    model!(
        name: "shapes", primary_key: "id",
        fillable: ["location", "names", "abbreviation", "covers", "remarks", "extension", "total", "sort", "status"],
        casts: [
            "location" => Integer,
            "names" => Json,
            "abbreviation" => String,
            "covers" => Json,
            "remarks" => Json,
            "extension" => Json,
            "total" => Integer,
            "sort" => Integer,
            "status" => Integer,
        ],
        hook: None,
    ),
    model!(
        name: "standards", primary_key: "id",
        fillable: ["names", "abbreviation", "covers", "remarks", "extension", "total", "sort", "status"],
        casts: [
            "names" => Json,
            "abbreviation" => String,
            "covers" => Json,
            "remarks" => Json,
            "extension" => Json,
            "total" => Integer,
            "sort" => Integer,
            "status" => Integer,
        ],
        hook: None,
    ),
    model!(
        name: "categories", primary_key: "id",
        fillable: ["parent_id", "names", "abbreviation", "covers", "remarks", "extension", "total", "sort", "status"],
        casts: [
            "parent_id" => Integer,
            "names" => Json,
            "abbreviation" => String,
            "covers" => Json,
            "remarks" => Json,
            "extension" => Json,
            "total" => Integer,
            "sort" => Integer,
            "status" => Integer,
        ],
        hook: None,
    ),
    model!(
        name: "formulas", primary_key: "id",
        fillable: ["type", "shape_id", "names", "code", "columnar", "remarks", "extension", "sort", "status"],
        casts: [
            "type" => Integer,
            "shape_id" => Integer,
            "names" => Json,
            "code" => String,
            "columnar" => String,
            "remarks" => Json,
            "extension" => Json,
            "sort" => Integer,
            "status" => Integer,
        ],
        hook: None,
    ),
    model!(
        name: "products", primary_key: "id",
        fillable: [
            "standard_id", "names", "standard", "grade", "code", "year", "covers", "svgs", "renders",
            "cads", "assemblies", "models", "detail", "parameters", "tolerance", "diameterLength",
            "drawingLimit", "formulas", "extension", "sort", "status",
        ],
        casts: [
            "standard_id" => Integer,
            "names" => Json,
            "standard" => String,
            "grade" => String,
            "code" => String,
            "year" => String,
            "covers" => Json,
            "svgs" => Json,
            "renders" => Json,
            "cads" => Json,
            "assemblies" => Json,
            "models" => Json,
            "detail" => Json,
            "parameters" => Json,
            "tolerance" => Json,
            "diameterLength" => Json,
            "drawingLimit" => Json,
            "formulas" => Json,
            "extension" => Json,
            "sort" => Integer,
            "status" => Integer,
        ],
        hook: None,
    ),
    model!(
        name: "docs", primary_key: "id",
        fillable: ["file_id", "title", "path", "detail", "credit", "times_expire", "extension", "status"],
        casts: [
            "file_id" => Integer,
            "title" => String,
            "path" => String,
            "detail" => Json,
            "credit" => Integer,
            "extension" => Json,
            "status" => Integer,
        ],
        hook: None,
    ),
    model!(
        name: "variables", primary_key: "id",
        fillable: ["names", "type", "code", "variable", "remarks", "extension", "sort", "status"],
        casts: [
            "names" => Json,
            "type" => Integer,
            "code" => String,
            "variable" => String,
            "remarks" => Json,
            "extension" => Json,
            "sort" => Integer,
            "status" => Integer,
        ],
        hook: None,
    ),
    model!(
        name: "serials", primary_key: "id",
        fillable: [
            "batch", "code", "secret", "type", "level", "days", "credit", "price", "remark",
            "extension", "times_expire", "status", "uuid",
        ],
        casts: [
            "batch" => String,
            "code" => String,
            "secret" => String,
            "type" => Integer,
            "level" => Integer,
            "days" => Integer,
            "credit" => Integer,
            "price" => Integer,
            "remark" => String,
            "extension" => Json,
            "status" => Integer,
            "uuid" => String,
        ],
        hook: None,
    ),
    model!(
        name: "customers", primary_key: "id",
        fillable: ["uuid", "secret", "name", "contacts", "mobile", "email", "address", "extension", "status"],
        casts: [
            "uuid" => String,
            "secret" => String,
            "name" => String,
            "contacts" => String,
            "mobile" => String,
            "email" => String,
            "address" => String,
            "extension" => Json,
            "status" => Integer,
        ],
        hook: None,
    ),
];

/// 等价 `main.ts` 的 `loadModel(name)`（含白名单校验与错误文案）。
pub fn find(name: &str) -> Result<&'static ModelDef, String> {
    MODELS
        .iter()
        .find(|model| model.name == name)
        .ok_or_else(|| format!("Table \"{name}\" is not in the allowed whitelist"))
}
