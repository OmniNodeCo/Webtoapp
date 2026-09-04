fn main() {
    println!("cargo:rerun-if-changed=.webtoapp/webtoapp.json");
    println!("cargo:rerun-if-changed=.webtoapp/tauri.conf.json");
    tauri_build::build()
}
