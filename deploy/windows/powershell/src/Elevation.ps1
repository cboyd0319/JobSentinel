# requires -Version 5.1
<#
.SYNOPSIS
Explicit user - consent elevation helpers for Windows automation.
.DESCRIPTION
Supplies detection
and execution helpers that honour ShouldProcess semantics, log elevation attempts,
and never rely on silent privilege escalation.