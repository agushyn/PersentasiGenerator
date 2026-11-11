//! Phase 0 SQLite proof of concept.
//!
//! Uses `rusqlite` with the `bundled` feature so the release build ships its
//! own SQLite: no system-wide SQLite installation is required. The production
//! database arrives in Phase 2; only the migration runner and basic CRUD are
//! proven here.

use std::path::Path;

use rusqlite::Connection;

use crate::error::{AppError, AppResult};

/// (version, name, sql) pairs applied in order.
const MIGRATIONS: &[(i64, &str, &str)] = &[(
    1,
    "poc_init",
    include_str!("../migrations/0001_poc.sql"),
)];

/// Opens a connection with foreign keys enabled.
pub fn open(path: &Path) -> AppResult<Connection> {
    let conn = Connection::open(path).map_err(|error| AppError::Db(error.to_string()))?;
    conn.pragma_update(None, "foreign_keys", "ON")
        .map_err(|error| AppError::Db(error.to_string()))?;
    Ok(conn)
}

/// Applies any missing migrations in a single transaction.
pub fn run_migrations(conn: &Connection) -> AppResult<Vec<i64>> {
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS schema_migrations (
            version    INTEGER PRIMARY KEY,
            name       TEXT NOT NULL,
            applied_at TEXT NOT NULL
        );",
    )
    .map_err(|error| AppError::Db(error.to_string()))?;

    let mut applied = Vec::new();
    for (version, name, sql) in MIGRATIONS {
        let current: Option<i64> = conn
            .query_row(
                "SELECT version FROM schema_migrations WHERE version = ?1",
                [version],
                |row| row.get(0),
            )
            .map(Some)
            .or_else(|error| match error {
                rusqlite::Error::QueryReturnedNoRows => Ok(None),
                other => Err(other),
            })
            .map_err(|error| AppError::Db(error.to_string()))?;

        if current.is_some() {
            continue;
        }

        conn.execute_batch("BEGIN;")
            .map_err(|error| AppError::Db(error.to_string()))?;
        let result = conn
            .execute_batch(sql)
            .and_then(|_| {
                conn.execute(
                    "INSERT INTO schema_migrations (version, name, applied_at) VALUES (?1, ?2, ?3)",
                    rusqlite::params![version, name, crate::db::utc_now()],
                )
                .map(|_| ())
            });
        match result {
            Ok(()) => {
                conn.execute_batch("COMMIT;")
                    .map_err(|error| AppError::Db(error.to_string()))?;
                applied.push(*version);
            }
            Err(error) => {
                let _ = conn.execute_batch("ROLLBACK;");
                return Err(AppError::Db(error.to_string()));
            }
        }
    }
    Ok(applied)
}

fn utc_now() -> String {
    // Phase 0 keeps timestamps in ISO-8601 UTC without pulling chrono.
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default();
    let secs = now.as_secs();
    let days = secs / 86_400;
    let rem = secs % 86_400;
    let (h, m, s) = (rem / 3600, (rem % 3600) / 60, rem % 60);
    // Civil-from-days algorithm (Howard Hinnant), valid for dates after 1970.
    let z = days as i64 + 719_468;
    let era = z / 146_097;
    let doe = z - era * 146_097;
    let yoe = (doe - doe / 1460 + doe / 36_524 - doe / 146_096) / 365;
    let y = yoe + era * 400;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let d = doy - (153 * mp + 2) / 5 + 1;
    let mth = if mp < 10 { mp + 3 } else { mp - 9 };
    let y = if mth <= 2 { y + 1 } else { y };
    format!("{y:04}-{mth:02}-{d:02}T{h:02}:{m:02}:{s:02}Z")
}

#[derive(Debug, serde::Serialize)]
pub struct PocItem {
    pub id: i64,
    pub name: String,
    pub value: String,
}

pub fn insert(conn: &Connection, name: &str, value: &str) -> AppResult<i64> {
    conn.execute(
        "INSERT INTO poc_items (name, value, created_at, updated_at) VALUES (?1, ?2, ?3, ?3)",
        rusqlite::params![name, value, utc_now()],
    )
    .map_err(|error| AppError::Db(error.to_string()))?;
    Ok(conn.last_insert_rowid())
}

pub fn list(conn: &Connection) -> AppResult<Vec<PocItem>> {
    let mut statement = conn
        .prepare("SELECT id, name, value FROM poc_items ORDER BY id")
        .map_err(|error| AppError::Db(error.to_string()))?;
    let rows = statement
        .query_map([], |row| {
            Ok(PocItem {
                id: row.get(0)?,
                name: row.get(1)?,
                value: row.get(2)?,
            })
        })
        .map_err(|error| AppError::Db(error.to_string()))?;
    let mut items = Vec::new();
    for row in rows {
        items.push(row.map_err(|error| AppError::Db(error.to_string()))?);
    }
    Ok(items)
}

pub fn update(conn: &Connection, id: i64, value: &str) -> AppResult<bool> {
    let changed = conn
        .execute(
            "UPDATE poc_items SET value = ?1, updated_at = ?2 WHERE id = ?3",
            rusqlite::params![value, utc_now(), id],
        )
        .map_err(|error| AppError::Db(error.to_string()))?;
    Ok(changed > 0)
}

pub fn delete(conn: &Connection, id: i64) -> AppResult<bool> {
    let changed = conn
        .execute("DELETE FROM poc_items WHERE id = ?1", [id])
        .map_err(|error| AppError::Db(error.to_string()))?;
    Ok(changed > 0)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn temp_db_path(tag: &str) -> std::path::PathBuf {
        let dir = std::env::temp_dir().join(format!(
            "adps-poc-{}-{}-{tag}",
            std::process::id(),
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap_or_default()
                .as_nanos()
        ));
        std::fs::create_dir_all(&dir).unwrap();
        dir.join("poc-test.db")
    }

    #[test]
    fn migrations_are_idempotent_and_crud_round_trips() {
        let path = temp_db_path("crud");
        let conn = open(&path).unwrap();

        let first = run_migrations(&conn).unwrap();
        assert_eq!(first, vec![1]);
        // Running again must be a no-op.
        let second = run_migrations(&conn).unwrap();
        assert!(second.is_empty());

        let id = insert(&conn, "row-a", "value-a").unwrap();
        assert!(id > 0);

        let items = list(&conn).unwrap();
        assert_eq!(items.len(), 1);
        assert_eq!(items[0].name, "row-a");

        assert!(update(&conn, id, "value-a2").unwrap());
        let items = list(&conn).unwrap();
        assert_eq!(items[0].value, "value-a2");

        assert!(delete(&conn, id).unwrap());
        assert!(list(&conn).unwrap().is_empty());
        assert!(!delete(&conn, id).unwrap());

        drop(conn);
        let _ = std::fs::remove_dir_all(path.parent().unwrap());
    }

    #[test]
    fn database_persists_across_connections() {
        let path = temp_db_path("persist");
        {
            let conn = open(&path).unwrap();
            run_migrations(&conn).unwrap();
            insert(&conn, "persisted", "survives reopen").unwrap();
        }
        {
            let conn = open(&path).unwrap();
            run_migrations(&conn).unwrap();
            let items = list(&conn).unwrap();
            assert_eq!(items.len(), 1);
            assert_eq!(items[0].name, "persisted");
        }
        let _ = std::fs::remove_dir_all(path.parent().unwrap());
    }
}
