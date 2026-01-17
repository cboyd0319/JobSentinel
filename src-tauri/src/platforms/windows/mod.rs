//! Windows-Specific Implementation (Windows 11+)
//!
//! This module contains all Windows-specific code for JobSentinel v1.0.

use std::path::PathBuf;

/// Get Windows application data directory
///
/// Returns: %LOCALAPPDATA%\JobSentinel
/// Example: C:\Users\Username\AppData\Local\JobSentinel
pub fn get_data_dir() -> PathBuf {
    let local_appdata = std::env::var("LOCALAPPDATA").unwrap_or_else(|_| {
        // Fallback to %USERPROFILE%\AppData\Local
        let userprofile = std::env::var("USERPROFILE").unwrap_or_else(|_| ".".to_string());
        format!("{}\\AppData\\Local", userprofile)
    });

    PathBuf::from(local_appdata).join("JobSentinel")
}

/// Get Windows configuration directory
///
/// Returns: %APPDATA%\JobSentinel
/// Example: C:\Users\Username\AppData\Roaming\JobSentinel
pub fn get_config_dir() -> PathBuf {
    let appdata = std::env::var("APPDATA").unwrap_or_else(|_| {
        // Fallback to %USERPROFILE%\AppData\Roaming
        let userprofile = std::env::var("USERPROFILE").unwrap_or_else(|_| ".".to_string());
        format!("{}\\AppData\\Roaming", userprofile)
    });

    PathBuf::from(appdata).join("JobSentinel")
}

/// Initialize Windows-specific features
///
/// - Creates application data directories
/// - Sets up Windows notifications
/// - Registers file associations (future)
pub fn initialize() -> Result<(), Box<dyn std::error::Error>> {
    // Create data directory if it doesn't exist
    let data_dir = get_data_dir();
    if !data_dir.exists() {
        std::fs::create_dir_all(&data_dir)?;
    }

    // Create config directory if it doesn't exist
    let config_dir = get_config_dir();
    if !config_dir.exists() {
        std::fs::create_dir_all(&config_dir)?;
    }

    tracing::info!("Windows platform initialized");
    tracing::info!("Data directory: {:?}", data_dir);
    tracing::info!("Config directory: {:?}", config_dir);

    Ok(())
}

/// Check if running with administrator privileges
///
/// Uses Windows API to check if the current process has elevated privileges.
/// Returns: true if elevated, false otherwise
#[cfg(target_os = "windows")]
pub fn is_elevated() -> bool {
    use std::mem;
    use std::ptr;

    // Import Windows API functions
    #[link(name = "advapi32")]
    extern "system" {
        fn OpenProcessToken(
            process_handle: *mut std::ffi::c_void,
            desired_access: u32,
            token_handle: *mut *mut std::ffi::c_void,
        ) -> i32;
        fn GetTokenInformation(
            token_handle: *mut std::ffi::c_void,
            token_information_class: u32,
            token_information: *mut std::ffi::c_void,
            token_information_length: u32,
            return_length: *mut u32,
        ) -> i32;
    }

    #[link(name = "kernel32")]
    extern "system" {
        fn GetCurrentProcess() -> *mut std::ffi::c_void;
        fn CloseHandle(handle: *mut std::ffi::c_void) -> i32;
    }

    const TOKEN_QUERY: u32 = 0x0008;
    const TOKEN_ELEVATION: u32 = 20;

    #[repr(C)]
    struct TokenElevation {
        token_is_elevated: u32,
    }

    unsafe {
        let mut token_handle: *mut std::ffi::c_void = ptr::null_mut();
        let process_handle = GetCurrentProcess();

        if OpenProcessToken(process_handle, TOKEN_QUERY, &mut token_handle) == 0 {
            return false;
        }

        let mut elevation: TokenElevation = mem::zeroed();
        let mut return_length: u32 = 0;

        let result = GetTokenInformation(
            token_handle,
            TOKEN_ELEVATION,
            &mut elevation as *mut _ as *mut std::ffi::c_void,
            mem::size_of::<TokenElevation>() as u32,
            &mut return_length,
        );

        CloseHandle(token_handle);

        result != 0 && elevation.token_is_elevated != 0
    }
}

#[cfg(not(target_os = "windows"))]
pub fn is_elevated() -> bool {
    // On non-Windows platforms, check if running as root
    #[cfg(unix)]
    {
        unsafe { libc::geteuid() == 0 }
    }
    #[cfg(not(unix))]
    {
        false
    }
}

/// Get Windows version information
///
/// Returns the actual Windows version string (e.g., "Windows 11 Build 22621")
#[cfg(target_os = "windows")]
pub fn get_windows_version() -> String {
    use std::mem;

    #[link(name = "ntdll")]
    extern "system" {
        fn RtlGetVersion(version_info: *mut OsVersionInfoExW) -> i32;
    }

    #[repr(C)]
    struct OsVersionInfoExW {
        os_version_info_size: u32,
        major_version: u32,
        minor_version: u32,
        build_number: u32,
        platform_id: u32,
        csd_version: [u16; 128],
        service_pack_major: u16,
        service_pack_minor: u16,
        suite_mask: u16,
        product_type: u8,
        reserved: u8,
    }

    unsafe {
        let mut version_info: OsVersionInfoExW = mem::zeroed();
        version_info.os_version_info_size = mem::size_of::<OsVersionInfoExW>() as u32;

        if RtlGetVersion(&mut version_info) == 0 {
            let major = version_info.major_version;
            let minor = version_info.minor_version;
            let build = version_info.build_number;

            // Windows 11 is 10.0 with build >= 22000
            let name = if major == 10 && build >= 22000 {
                "Windows 11"
            } else if major == 10 {
                "Windows 10"
            } else if major == 6 && minor == 3 {
                "Windows 8.1"
            } else if major == 6 && minor == 2 {
                "Windows 8"
            } else if major == 6 && minor == 1 {
                "Windows 7"
            } else {
                "Windows"
            };

            format!("{} Build {}", name, build)
        } else {
            "Windows (unknown version)".to_string()
        }
    }
}

#[cfg(not(target_os = "windows"))]
pub fn get_windows_version() -> String {
    "Not Windows".to_string()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_get_data_dir() {
        let dir = get_data_dir();
        assert!(dir.to_string_lossy().contains("JobSentinel"));
    }

    #[test]
    fn test_get_config_dir() {
        let dir = get_config_dir();
        assert!(dir.to_string_lossy().contains("JobSentinel"));
    }
}
