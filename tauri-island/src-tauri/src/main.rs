#![windows_subsystem = "windows"]

mod models;
mod utils;
mod audio;
mod window;
mod weather;
mod media;
mod app;
pub mod commands;

fn main() {
    app::run_app();
}
