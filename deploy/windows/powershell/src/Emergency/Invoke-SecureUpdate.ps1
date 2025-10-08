# requires -Version 5.1
<#
.SYNOPSIS
Securely updates a Job Search Automation deployment from a trusted Git remote.
.DESCRIPTION
Validates repository origin, performs a safe fast - forward update(or initial clone), preserves operator - defined files, emits structured logs,
and provides rollback - ready