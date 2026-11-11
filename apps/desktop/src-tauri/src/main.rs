// Prevents an additional binary on Windows from opening a console window.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    arya_duta_persentasion_studio::run()
}
