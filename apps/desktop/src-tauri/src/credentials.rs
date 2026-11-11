//! Windows Credential Manager integration proof of concept (keyring crate).
//!
//! BYOK rules enforced by design:
//! - Secrets live in the OS credential store, never in SQLite, project files,
//!   or frontend storage.
//! - Nothing in this module returns a secret to the caller except the
//!   provider request path, which Phase 3 will own. Phase 0 only stores,
//!   checks presence, and deletes.
//! - No secret is ever logged.

use keyring::Entry;

use crate::error::AppResult;

/// Credential service namespace for this application.
const SERVICE: &str = "Arya Duta Persentasion Studio";

fn entry(account: &str) -> AppResult<Entry> {
    // Account strings come from IPC; keep them bounded and single-line.
    let normalized = account.trim();
    if normalized.is_empty() || normalized.len() > 128 || normalized.contains('\n') {
        return Err(crate::error::AppError::Validation(
            "credential account must be 1..=128 characters without newlines".into(),
        ));
    }
    Ok(Entry::new(SERVICE, normalized)?)
}

/// Stores (or replaces) a secret. The secret is consumed and never logged.
pub fn set_secret(account: &str, secret: &str) -> AppResult<()> {
    if secret.is_empty() {
        return Err(crate::error::AppError::Validation(
            "credential secret must not be empty".into(),
        ));
    }
    entry(account)?.set_password(secret)?;
    Ok(())
}

/// Presence check only; the secret itself is not read or returned.
pub fn is_present(account: &str) -> AppResult<bool> {
    match entry(account)?.get_password() {
        Ok(_) => Ok(true),
        Err(keyring::Error::NoEntry) => Ok(false),
        Err(error) => Err(error.into()),
    }
}

/// Deletes the stored credential.
pub fn delete_secret(account: &str) -> AppResult<bool> {
    let stored = is_present(account)?;
    if !stored {
        return Ok(false);
    }
    entry(account)?.delete_credential()?;
    Ok(true)
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Exercises the real Windows Credential Manager on this machine.
    /// Uses a dedicated account so it can never collide with user data.
    #[test]
    fn windows_credential_manager_round_trip() {
        let account = "phase0-unit-test";
        let _ = delete_secret(account);

        assert!(!is_present(account).unwrap());
        set_secret(account, "unit-test-secret").unwrap();
        assert!(is_present(account).unwrap());
        assert!(delete_secret(account).unwrap());
        assert!(!is_present(account).unwrap());
        assert!(!delete_secret(account).unwrap());
    }

    #[test]
    fn rejects_bad_accounts_and_empty_secrets() {
        assert!(entry("").is_err());
        assert!(entry("bad\naccount").is_err());
        assert!(set_secret("phase0-unit-test", "").is_err());
    }
}
