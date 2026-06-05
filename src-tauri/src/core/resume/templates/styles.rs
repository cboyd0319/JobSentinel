pub(super) fn classic() -> &'static str {
    r#"
body {
    font-family: Arial, sans-serif;
    font-size: 11pt;
    line-height: 1.4;
    color: #000;
    max-width: 8.5in;
    margin: 0 auto;
    padding: 0.5in;
}
.name {
    font-size: 24pt;
    font-weight: bold;
    text-align: center;
    margin: 0 0 8pt 0;
}
.contact {
    text-align: center;
    font-size: 10pt;
    margin-bottom: 16pt;
}
h2 {
    font-size: 14pt;
    font-weight: bold;
    text-transform: uppercase;
    margin: 16pt 0 8pt 0;
    border-bottom: 1pt solid #000;
    padding-bottom: 4pt;
}
h3 {
    font-size: 12pt;
    font-weight: bold;
    margin: 8pt 0 4pt 0;
}
.company, .institution {
    font-size: 11pt;
    font-style: italic;
    margin-bottom: 2pt;
}
.dates {
    font-size: 10pt;
    color: #333;
    margin-bottom: 4pt;
}
ul {
    margin: 4pt 0 12pt 20pt;
    padding: 0;
}
li {
    margin-bottom: 4pt;
}
.skill-category {
    margin-bottom: 6pt;
}
"#
}

pub(super) fn modern() -> &'static str {
    r#"
body {
    font-family: Calibri, Arial, sans-serif;
    font-size: 11pt;
    line-height: 1.5;
    color: #222;
    max-width: 8.5in;
    margin: 0 auto;
    padding: 0.5in;
}
.name {
    font-size: 28pt;
    font-weight: bold;
    margin: 0 0 8pt 0;
}
.contact {
    font-size: 10pt;
    margin-bottom: 16pt;
    color: #555;
}
.section-divider {
    border: none;
    border-top: 1pt solid #ccc;
    margin: 16pt 0;
}
h2 {
    font-size: 14pt;
    font-weight: bold;
    text-transform: uppercase;
    letter-spacing: 1pt;
    margin: 16pt 0 8pt 0;
    color: #000;
}
h3 {
    font-size: 12pt;
    font-weight: bold;
    margin: 8pt 0 4pt 0;
}
.company, .institution {
    font-size: 11pt;
    color: #555;
    margin-bottom: 2pt;
}
.dates {
    font-size: 10pt;
    color: #777;
    margin-bottom: 4pt;
}
ul {
    margin: 4pt 0 12pt 20pt;
    padding: 0;
}
li {
    margin-bottom: 4pt;
}
.skill-category {
    margin-bottom: 8pt;
}
"#
}

pub(super) fn technical() -> &'static str {
    r#"
body {
    font-family: Arial, sans-serif;
    font-size: 11pt;
    line-height: 1.4;
    color: #000;
    max-width: 8.5in;
    margin: 0 auto;
    padding: 0.5in;
}
.name {
    font-size: 22pt;
    font-weight: bold;
    margin: 0 0 8pt 0;
}
.contact {
    font-size: 10pt;
    margin-bottom: 16pt;
}
h2 {
    font-size: 13pt;
    font-weight: bold;
    text-transform: uppercase;
    margin: 16pt 0 8pt 0;
    border-bottom: 2pt solid #000;
    padding-bottom: 4pt;
}
h3 {
    font-size: 11pt;
    font-weight: bold;
    margin: 8pt 0 4pt 0;
}
.company, .institution {
    font-size: 10pt;
    margin-bottom: 2pt;
}
.dates {
    font-size: 10pt;
    color: #333;
    margin-bottom: 4pt;
}
ul {
    margin: 4pt 0 12pt 20pt;
    padding: 0;
}
li {
    margin-bottom: 3pt;
}
.skill-category {
    margin-bottom: 6pt;
    line-height: 1.6;
}
"#
}

pub(super) fn executive() -> &'static str {
    r#"
body {
    font-family: Times New Roman, serif;
    font-size: 11pt;
    line-height: 1.5;
    color: #000;
    max-width: 8.5in;
    margin: 0 auto;
    padding: 0.5in;
}
.name {
    font-size: 26pt;
    font-weight: bold;
    text-align: center;
    margin: 0 0 8pt 0;
}
.contact {
    text-align: center;
    font-size: 10pt;
    margin-bottom: 20pt;
}
h2 {
    font-size: 14pt;
    font-weight: bold;
    text-transform: uppercase;
    margin: 20pt 0 10pt 0;
    border-bottom: 2pt solid #000;
    padding-bottom: 4pt;
}
.executive-summary {
    background-color: #f5f5f5;
    padding: 12pt;
    margin-bottom: 16pt;
    border-left: 4pt solid #000;
}
h3 {
    font-size: 12pt;
    font-weight: bold;
    margin: 10pt 0 4pt 0;
}
.company, .institution {
    font-size: 11pt;
    font-style: italic;
    margin-bottom: 2pt;
}
.dates {
    font-size: 10pt;
    color: #444;
    margin-bottom: 4pt;
}
ul.achievements {
    margin: 6pt 0 16pt 20pt;
    padding: 0;
}
li {
    margin-bottom: 6pt;
}
.skill-category {
    margin-bottom: 8pt;
}
"#
}

pub(super) fn military() -> &'static str {
    r#"
body {
    font-family: Arial, sans-serif;
    font-size: 11pt;
    line-height: 1.4;
    color: #000;
    max-width: 8.5in;
    margin: 0 auto;
    padding: 0.5in;
}
.name {
    font-size: 24pt;
    font-weight: bold;
    text-align: center;
    margin: 0 0 8pt 0;
}
.contact {
    text-align: center;
    font-size: 10pt;
    margin-bottom: 12pt;
}
.clearance {
    text-align: center;
    font-size: 12pt;
    background-color: #f0f0f0;
    padding: 8pt;
    margin-bottom: 16pt;
    border: 1pt solid #000;
}
h2 {
    font-size: 14pt;
    font-weight: bold;
    text-transform: uppercase;
    margin: 16pt 0 8pt 0;
    border-bottom: 2pt solid #000;
    padding-bottom: 4pt;
}
h3 {
    font-size: 12pt;
    font-weight: bold;
    margin: 8pt 0 4pt 0;
}
.company, .institution {
    font-size: 11pt;
    margin-bottom: 2pt;
}
.dates {
    font-size: 10pt;
    color: #333;
    margin-bottom: 4pt;
}
ul {
    margin: 4pt 0 12pt 20pt;
    padding: 0;
}
li {
    margin-bottom: 4pt;
}
.skill-category {
    margin-bottom: 6pt;
}
"#
}
