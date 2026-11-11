/** Typed IPC contracts for the Phase 0 validation screen. */

export interface AppStatus {
  app_name: string;
  version: string;
  db_path: string;
  sidecar_found: boolean;
  sidecar_script_found: boolean;
  renderer: string;
}

export interface PocItem {
  id: number;
  name: string;
  value: string;
}

export interface SidecarResult {
  ok: boolean;
  output_path?: string;
  slide_count?: number;
  duration_ms?: number;
  error_code?: string;
  message?: string;
}

export interface CredentialOutcome {
  account: string;
  stored: boolean;
}

/** Serialized error shape produced by the Rust backend. */
export interface AppError {
  code: string;
  message: string;
}
