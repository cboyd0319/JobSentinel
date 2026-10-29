//! Normalizes directly stated country identifiers without inferring geography from other text.

/// Normalizes only an explicitly supplied country value; unrecognized text stays unknown.
#[must_use]
pub fn normalize_country_code(raw: &str) -> Option<&'static str> {
    if raw.len() > 256 {
        return None;
    }
    let value = raw.trim().to_lowercase();
    match value.as_str() {
        "uk" | "united kingdom" => return Some("GB"),
        "united states" => return Some("US"),
        "netherlands" => return Some("NL"),
        "taiwan" => return Some("TW"),
        // Retained name in the DPV mapping; UN's pinned row uses Naoero.
        "nauru" => return Some("NR"),
        // Turkish uppercase İ lowercases to i + combining dot in Unicode's default mapping.
        "türki\u{307}ye" => return Some("TR"),
        _ => {}
    }
    COUNTRIES.iter().find_map(|(alpha2, alpha3, name)| {
        (value.eq_ignore_ascii_case(alpha2)
            || value.eq_ignore_ascii_case(alpha3)
            || value == name.to_lowercase())
        .then_some(*alpha2)
    })
}

/// Returns the pinned country-code choices for local presentation.
#[must_use]
pub fn country_options() -> Vec<(&'static str, &'static str)> {
    COUNTRIES
        .iter()
        .map(|(alpha2, _, name)| (*alpha2, *name))
        .collect()
}

// Pinned 2026-09-11 from UN M49 #downloadTableEN (248 unique country/area rows):
// https://unstats.un.org/unsd/methodology/m49/overview/
// Source HTML SHA-256: b9048114f6e7f2abda83bf03d4263c9d7cd1bd7230e3d0461025ee7839a7a1fb
// TW/TWN supplements UN's table from the DPV Community Group's published mapping:
// https://www.w3.org/community/reports/dpvcg/CG-FINAL-loc-20240801/#TW
// The same publication's #NR entry retains the Nauru name accepted above.
const COUNTRIES: &[(&str, &str, &str)] = &[
    ("AD", "AND", "Andorra"),
    ("AE", "ARE", "United Arab Emirates"),
    ("AF", "AFG", "Afghanistan"),
    ("AG", "ATG", "Antigua and Barbuda"),
    ("AI", "AIA", "Anguilla"),
    ("AL", "ALB", "Albania"),
    ("AM", "ARM", "Armenia"),
    ("AO", "AGO", "Angola"),
    ("AQ", "ATA", "Antarctica"),
    ("AR", "ARG", "Argentina"),
    ("AS", "ASM", "American Samoa"),
    ("AT", "AUT", "Austria"),
    ("AU", "AUS", "Australia"),
    ("AW", "ABW", "Aruba"),
    ("AX", "ALA", "Åland Islands"),
    ("AZ", "AZE", "Azerbaijan"),
    ("BA", "BIH", "Bosnia and Herzegovina"),
    ("BB", "BRB", "Barbados"),
    ("BD", "BGD", "Bangladesh"),
    ("BE", "BEL", "Belgium"),
    ("BF", "BFA", "Burkina Faso"),
    ("BG", "BGR", "Bulgaria"),
    ("BH", "BHR", "Bahrain"),
    ("BI", "BDI", "Burundi"),
    ("BJ", "BEN", "Benin"),
    ("BL", "BLM", "Saint Barthélemy"),
    ("BM", "BMU", "Bermuda"),
    ("BN", "BRN", "Brunei Darussalam"),
    ("BO", "BOL", "Bolivia (Plurinational State of)"),
    ("BQ", "BES", "Bonaire, Sint Eustatius and Saba"),
    ("BR", "BRA", "Brazil"),
    ("BS", "BHS", "Bahamas"),
    ("BT", "BTN", "Bhutan"),
    ("BV", "BVT", "Bouvet Island"),
    ("BW", "BWA", "Botswana"),
    ("BY", "BLR", "Belarus"),
    ("BZ", "BLZ", "Belize"),
    ("CA", "CAN", "Canada"),
    ("CC", "CCK", "Cocos (Keeling) Islands"),
    ("CD", "COD", "Democratic Republic of the Congo"),
    ("CF", "CAF", "Central African Republic"),
    ("CG", "COG", "Congo"),
    ("CH", "CHE", "Switzerland"),
    ("CI", "CIV", "Côte d’Ivoire"),
    ("CK", "COK", "Cook Islands"),
    ("CL", "CHL", "Chile"),
    ("CM", "CMR", "Cameroon"),
    ("CN", "CHN", "China"),
    ("CO", "COL", "Colombia"),
    ("CR", "CRI", "Costa Rica"),
    ("CU", "CUB", "Cuba"),
    ("CV", "CPV", "Cabo Verde"),
    ("CW", "CUW", "Curaçao"),
    ("CX", "CXR", "Christmas Island"),
    ("CY", "CYP", "Cyprus"),
    ("CZ", "CZE", "Czechia"),
    ("DE", "DEU", "Germany"),
    ("DJ", "DJI", "Djibouti"),
    ("DK", "DNK", "Denmark"),
    ("DM", "DMA", "Dominica"),
    ("DO", "DOM", "Dominican Republic"),
    ("DZ", "DZA", "Algeria"),
    ("EC", "ECU", "Ecuador"),
    ("EE", "EST", "Estonia"),
    ("EG", "EGY", "Egypt"),
    ("EH", "ESH", "Western Sahara"),
    ("ER", "ERI", "Eritrea"),
    ("ES", "ESP", "Spain"),
    ("ET", "ETH", "Ethiopia"),
    ("FI", "FIN", "Finland"),
    ("FJ", "FJI", "Fiji"),
    ("FK", "FLK", "Falkland Islands (Malvinas)"),
    ("FM", "FSM", "Micronesia (Federated States of)"),
    ("FO", "FRO", "Faroe Islands"),
    ("FR", "FRA", "France"),
    ("GA", "GAB", "Gabon"),
    (
        "GB",
        "GBR",
        "United Kingdom of Great Britain and Northern Ireland",
    ),
    ("GD", "GRD", "Grenada"),
    ("GE", "GEO", "Georgia"),
    ("GF", "GUF", "French Guiana"),
    ("GG", "GGY", "Guernsey"),
    ("GH", "GHA", "Ghana"),
    ("GI", "GIB", "Gibraltar"),
    ("GL", "GRL", "Greenland"),
    ("GM", "GMB", "Gambia"),
    ("GN", "GIN", "Guinea"),
    ("GP", "GLP", "Guadeloupe"),
    ("GQ", "GNQ", "Equatorial Guinea"),
    ("GR", "GRC", "Greece"),
    ("GS", "SGS", "South Georgia and the South Sandwich Islands"),
    ("GT", "GTM", "Guatemala"),
    ("GU", "GUM", "Guam"),
    ("GW", "GNB", "Guinea-Bissau"),
    ("GY", "GUY", "Guyana"),
    (
        "HK",
        "HKG",
        "China, Hong Kong Special Administrative Region",
    ),
    ("HM", "HMD", "Heard Island and McDonald Islands"),
    ("HN", "HND", "Honduras"),
    ("HR", "HRV", "Croatia"),
    ("HT", "HTI", "Haiti"),
    ("HU", "HUN", "Hungary"),
    ("ID", "IDN", "Indonesia"),
    ("IE", "IRL", "Ireland"),
    ("IL", "ISR", "Israel"),
    ("IM", "IMN", "Isle of Man"),
    ("IN", "IND", "India"),
    ("IO", "IOT", "British Indian Ocean Territory"),
    ("IQ", "IRQ", "Iraq"),
    ("IR", "IRN", "Iran (Islamic Republic of)"),
    ("IS", "ISL", "Iceland"),
    ("IT", "ITA", "Italy"),
    ("JE", "JEY", "Jersey"),
    ("JM", "JAM", "Jamaica"),
    ("JO", "JOR", "Jordan"),
    ("JP", "JPN", "Japan"),
    ("KE", "KEN", "Kenya"),
    ("KG", "KGZ", "Kyrgyzstan"),
    ("KH", "KHM", "Cambodia"),
    ("KI", "KIR", "Kiribati"),
    ("KM", "COM", "Comoros"),
    ("KN", "KNA", "Saint Kitts and Nevis"),
    ("KP", "PRK", "Democratic People's Republic of Korea"),
    ("KR", "KOR", "Republic of Korea"),
    ("KW", "KWT", "Kuwait"),
    ("KY", "CYM", "Cayman Islands"),
    ("KZ", "KAZ", "Kazakhstan"),
    ("LA", "LAO", "Lao People's Democratic Republic"),
    ("LB", "LBN", "Lebanon"),
    ("LC", "LCA", "Saint Lucia"),
    ("LI", "LIE", "Liechtenstein"),
    ("LK", "LKA", "Sri Lanka"),
    ("LR", "LBR", "Liberia"),
    ("LS", "LSO", "Lesotho"),
    ("LT", "LTU", "Lithuania"),
    ("LU", "LUX", "Luxembourg"),
    ("LV", "LVA", "Latvia"),
    ("LY", "LBY", "Libya"),
    ("MA", "MAR", "Morocco"),
    ("MC", "MCO", "Monaco"),
    ("MD", "MDA", "Republic of Moldova"),
    ("ME", "MNE", "Montenegro"),
    ("MF", "MAF", "Saint Martin (French Part)"),
    ("MG", "MDG", "Madagascar"),
    ("MH", "MHL", "Marshall Islands"),
    ("MK", "MKD", "North Macedonia"),
    ("ML", "MLI", "Mali"),
    ("MM", "MMR", "Myanmar"),
    ("MN", "MNG", "Mongolia"),
    ("MO", "MAC", "China, Macao Special Administrative Region"),
    ("MP", "MNP", "Northern Mariana Islands"),
    ("MQ", "MTQ", "Martinique"),
    ("MR", "MRT", "Mauritania"),
    ("MS", "MSR", "Montserrat"),
    ("MT", "MLT", "Malta"),
    ("MU", "MUS", "Mauritius"),
    ("MV", "MDV", "Maldives"),
    ("MW", "MWI", "Malawi"),
    ("MX", "MEX", "Mexico"),
    ("MY", "MYS", "Malaysia"),
    ("MZ", "MOZ", "Mozambique"),
    ("NA", "NAM", "Namibia"),
    ("NC", "NCL", "New Caledonia"),
    ("NE", "NER", "Niger"),
    ("NF", "NFK", "Norfolk Island"),
    ("NG", "NGA", "Nigeria"),
    ("NI", "NIC", "Nicaragua"),
    ("NL", "NLD", "Netherlands (Kingdom of the)"),
    ("NO", "NOR", "Norway"),
    ("NP", "NPL", "Nepal"),
    ("NR", "NRU", "Naoero"),
    ("NU", "NIU", "Niue"),
    ("NZ", "NZL", "New Zealand"),
    ("OM", "OMN", "Oman"),
    ("PA", "PAN", "Panama"),
    ("PE", "PER", "Peru"),
    ("PF", "PYF", "French Polynesia"),
    ("PG", "PNG", "Papua New Guinea"),
    ("PH", "PHL", "Philippines"),
    ("PK", "PAK", "Pakistan"),
    ("PL", "POL", "Poland"),
    ("PM", "SPM", "Saint Pierre and Miquelon"),
    ("PN", "PCN", "Pitcairn"),
    ("PR", "PRI", "Puerto Rico"),
    ("PS", "PSE", "State of Palestine"),
    ("PT", "PRT", "Portugal"),
    ("PW", "PLW", "Palau"),
    ("PY", "PRY", "Paraguay"),
    ("QA", "QAT", "Qatar"),
    ("RE", "REU", "Réunion"),
    ("RO", "ROU", "Romania"),
    ("RS", "SRB", "Serbia"),
    ("RU", "RUS", "Russian Federation"),
    ("RW", "RWA", "Rwanda"),
    ("SA", "SAU", "Saudi Arabia"),
    ("SB", "SLB", "Solomon Islands"),
    ("SC", "SYC", "Seychelles"),
    ("SD", "SDN", "Sudan"),
    ("SE", "SWE", "Sweden"),
    ("SG", "SGP", "Singapore"),
    ("SH", "SHN", "Saint Helena"),
    ("SI", "SVN", "Slovenia"),
    ("SJ", "SJM", "Svalbard and Jan Mayen Islands"),
    ("SK", "SVK", "Slovakia"),
    ("SL", "SLE", "Sierra Leone"),
    ("SM", "SMR", "San Marino"),
    ("SN", "SEN", "Senegal"),
    ("SO", "SOM", "Somalia"),
    ("SR", "SUR", "Suriname"),
    ("SS", "SSD", "South Sudan"),
    ("ST", "STP", "Sao Tome and Principe"),
    ("SV", "SLV", "El Salvador"),
    ("SX", "SXM", "Sint Maarten (Dutch part)"),
    ("SY", "SYR", "Syrian Arab Republic"),
    ("SZ", "SWZ", "Eswatini"),
    ("TC", "TCA", "Turks and Caicos Islands"),
    ("TD", "TCD", "Chad"),
    ("TF", "ATF", "French Southern Territories"),
    ("TG", "TGO", "Togo"),
    ("TH", "THA", "Thailand"),
    ("TJ", "TJK", "Tajikistan"),
    ("TK", "TKL", "Tokelau"),
    ("TL", "TLS", "Timor-Leste"),
    ("TM", "TKM", "Turkmenistan"),
    ("TN", "TUN", "Tunisia"),
    ("TO", "TON", "Tonga"),
    ("TR", "TUR", "Türkiye"),
    ("TT", "TTO", "Trinidad and Tobago"),
    ("TV", "TUV", "Tuvalu"),
    ("TW", "TWN", "Taiwan (Province of China)"),
    ("TZ", "TZA", "United Republic of Tanzania"),
    ("UA", "UKR", "Ukraine"),
    ("UG", "UGA", "Uganda"),
    ("UM", "UMI", "United States Minor Outlying Islands"),
    ("US", "USA", "United States of America"),
    ("UY", "URY", "Uruguay"),
    ("UZ", "UZB", "Uzbekistan"),
    ("VA", "VAT", "Holy See"),
    ("VC", "VCT", "Saint Vincent and the Grenadines"),
    ("VE", "VEN", "Venezuela (Bolivarian Republic of)"),
    ("VG", "VGB", "British Virgin Islands"),
    ("VI", "VIR", "United States Virgin Islands"),
    ("VN", "VNM", "Viet Nam"),
    ("VU", "VUT", "Vanuatu"),
    ("WF", "WLF", "Wallis and Futuna Islands"),
    ("WS", "WSM", "Samoa"),
    ("YE", "YEM", "Yemen"),
    ("YT", "MYT", "Mayotte"),
    ("ZA", "ZAF", "South Africa"),
    ("ZM", "ZMB", "Zambia"),
    ("ZW", "ZWE", "Zimbabwe"),
];

#[cfg(test)]
mod tests {
    use super::{country_options, normalize_country_code, COUNTRIES};

    #[test]
    fn pinned_country_table_has_unique_codes_and_round_trips_every_entry() {
        assert_eq!(COUNTRIES.len(), 249);
        let mut codes = std::collections::HashSet::new();
        let mut alpha3_codes = std::collections::HashSet::new();
        for &(alpha2, alpha3, name) in COUNTRIES {
            assert!(codes.insert(alpha2));
            assert!(alpha3_codes.insert(alpha3));
            assert!(alpha2.len() == 2 && alpha2.bytes().all(|b| b.is_ascii_uppercase()));
            assert!(alpha3.len() == 3 && alpha3.bytes().all(|b| b.is_ascii_uppercase()));
            for value in [alpha2, alpha3, name] {
                assert_eq!(normalize_country_code(value), Some(alpha2), "{value}");
            }
        }
    }

    #[test]
    fn country_options_expose_each_pinned_alpha2_and_name_once() {
        assert_eq!(country_options().len(), COUNTRIES.len());
        assert_eq!(country_options()[0], ("AD", "Andorra"));
    }

    #[test]
    fn normalizes_explicit_codes_names_and_bounded_starter_aliases() {
        for (raw, expected) in [
            (" GB ", "GB"),
            ("gbr", "GB"),
            ("United Kingdom", "GB"),
            ("UK", "GB"),
            ("deu", "DE"),
            ("Germany", "DE"),
            ("IND", "IN"),
            ("India", "IN"),
            ("United States", "US"),
            ("USA", "US"),
            ("ÅLAND ISLANDS", "AX"),
            ("Réunion", "RE"),
            ("TWN", "TW"),
            ("Taiwan", "TW"),
            ("Netherlands", "NL"),
            ("Nauru", "NR"),
        ] {
            assert_eq!(normalize_country_code(raw), Some(expected), "{raw}");
        }
    }

    #[test]
    fn accepts_turkish_dotted_i_country_casing() {
        assert_eq!(normalize_country_code("TÜRKİYE"), Some("TR"));
    }

    #[test]
    fn does_not_guess_from_subdivisions_postcodes_regions_or_embedded_names() {
        for raw in [
            "",
            " ",
            "EU",
            "Europe",
            "London",
            "California",
            "Indiana",
            "SW1A 1AA",
            "GB/US",
            "Remote, India",
            "ZZ",
            "IN\u{200b}",
        ] {
            assert_eq!(normalize_country_code(raw), None, "{raw}");
        }
    }
}
