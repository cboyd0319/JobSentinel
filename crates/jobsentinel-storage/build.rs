// Rebuilds embedded SQLx migrations when migration files are added or changed.
fn main() {
    println!("cargo:rerun-if-changed=migrations");
}
