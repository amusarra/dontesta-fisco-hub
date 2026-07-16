#![cfg_attr(
  all(not(debug_assertions), target_os = "windows"),
  windows_subsystem = "windows"
)]

use tauri::Manager;
use std::time::Duration;

// Function to close splash screen and show main window
fn close_splashscreen(app: &tauri::AppHandle) {
  // Get windows
  let splashscreen_window = app.get_webview_window("splashscreen");
  let main_window = app.get_webview_window("main");

  if let Some(splash) = splashscreen_window {
    if let Some(main) = main_window {
      // Show main window
      main.show().unwrap();
      // Set focus to main window
      main.set_focus().unwrap();
      // Close splashscreen
      splash.close().unwrap();
    }
  }
}

fn main() {
  tauri::Builder::default()
    .plugin(tauri_plugin_opener::init())
    .setup(|app| {
      let app_handle = app.handle().clone();
      
      // Close splashscreen after 2 seconds minimum
      std::thread::spawn(move || {
        std::thread::sleep(Duration::from_secs(2));
        close_splashscreen(&app_handle);
      });
      
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
