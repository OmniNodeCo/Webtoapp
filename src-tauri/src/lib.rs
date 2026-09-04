use std::sync::atomic::{AtomicUsize, Ordering};

use serde::Deserialize;
use tauri::{AppHandle, Url, WebviewUrl, WebviewWindowBuilder};

static NEXT_WINDOW_ID: AtomicUsize = AtomicUsize::new(1);

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct WebsiteRequest {
    name: String,
    url: String,
    width: f64,
    height: f64,
}

#[tauri::command]
fn open_website_app(app: AppHandle, request: WebsiteRequest) -> Result<(), String> {
    let name = request.name.trim();
    if name.is_empty() || name.chars().count() > 80 {
        return Err("Use an app name between 1 and 80 characters.".to_string());
    }
    if !(320.0..=7680.0).contains(&request.width) || !(320.0..=7680.0).contains(&request.height) {
        return Err("Window dimensions must be between 320 and 7680 pixels.".to_string());
    }

    let url = Url::parse(request.url.trim()).map_err(|_| "Enter a complete URL, including https://.".to_string())?;
    let local_http = url.scheme() == "http"
        && matches!(url.host_str(), Some("localhost") | Some("127.0.0.1") | Some("::1"));
    if url.scheme() != "https" && !local_http {
        return Err("Use an HTTPS website. HTTP is only accepted for localhost development.".to_string());
    }
    if url.host_str().is_none() || !url.username().is_empty() || url.password().is_some() {
        return Err("Use a website URL without embedded credentials.".to_string());
    }

    let label = format!("site-{}-{}", uuid_fragment(name), NEXT_WINDOW_ID.fetch_add(1, Ordering::Relaxed));
    WebviewWindowBuilder::new(&app, label, WebviewUrl::External(url))
        .title(name)
        .inner_size(request.width, request.height)
        .min_inner_size(320.0, 320.0)
        .build()
        .map_err(|error| format!("Could not open website app: {error}"))?;

    Ok(())
}

fn uuid_fragment(name: &str) -> String {
    let cleaned: String = name
        .chars()
        .map(|character| if character.is_ascii_alphanumeric() { character.to_ascii_lowercase() } else { '-' })
        .collect();
    let compact = cleaned.trim_matches('-');
    if compact.is_empty() { "website".to_string() } else { compact.chars().take(42).collect() }
}

pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![open_website_app])
        .run(tauri::generate_context!())
        .expect("error while running Webtoapp");
}
