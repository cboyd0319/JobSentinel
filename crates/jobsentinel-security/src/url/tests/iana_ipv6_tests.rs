// Verifies IANA non-global IPv6 ranges and their reachable exceptions.

use super::super::{validate_external_https_url, validate_resolved_ips};
use std::net::{IpAddr, Ipv6Addr};

#[test]
fn blocks_iana_non_global_ipv6_ranges_but_keeps_reachable_exceptions() {
    let non_global = [
        Ipv6Addr::new(0x0064, 0xff9b, 0x0001, 0, 0, 0, 0, 1),
        Ipv6Addr::new(0x0100, 0, 0, 0, 0, 0, 0, 1),
        Ipv6Addr::new(0x0100, 0, 0, 1, 0, 0, 0, 1),
        Ipv6Addr::new(0x2001, 0x0001, 0, 0, 0, 0, 0, 4),
        Ipv6Addr::new(0x2001, 0x0002, 0, 0, 0, 0, 0, 1),
        Ipv6Addr::new(0x2001, 0x0db8, 0, 0, 0, 0, 0, 1),
        Ipv6Addr::new(0x3fff, 0x0fff, 0, 0, 0, 0, 0, 1),
        Ipv6Addr::new(0x5f00, 0, 0, 0, 0, 0, 0, 1),
    ];

    for ip in non_global {
        assert!(
            validate_external_https_url(&format!("https://[{ip}]/provider")).is_err(),
            "literal {ip} must be blocked"
        );
        assert_eq!(
            validate_resolved_ips([IpAddr::V6(ip)]).unwrap_err(),
            "Blocked non-public IP address",
            "resolved {ip} must be blocked"
        );
    }

    let reachable = [
        Ipv6Addr::new(0x0064, 0xff9b, 0, 0, 0, 0, 0, 1),
        Ipv6Addr::new(0x2001, 1, 0, 0, 0, 0, 0, 1),
        Ipv6Addr::new(0x2001, 1, 0, 0, 0, 0, 0, 2),
        Ipv6Addr::new(0x2001, 1, 0, 0, 0, 0, 0, 3),
        Ipv6Addr::new(0x2001, 3, 0, 0, 0, 0, 0, 1),
        Ipv6Addr::new(0x2001, 4, 0x0112, 0, 0, 0, 0, 1),
        Ipv6Addr::new(0x2001, 0x0020, 0, 0, 0, 0, 0, 1),
        Ipv6Addr::new(0x2001, 0x003f, 0, 0, 0, 0, 0, 1),
    ];

    for ip in reachable {
        assert!(
            validate_external_https_url(&format!("https://[{ip}]/provider")).is_ok(),
            "reachable exception {ip} must remain allowed"
        );
        assert!(
            validate_resolved_ips([IpAddr::V6(ip)]).is_ok(),
            "resolved reachable exception {ip} must remain allowed"
        );
    }
}
