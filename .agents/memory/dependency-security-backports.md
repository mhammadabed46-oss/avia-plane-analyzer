---
name: Local dependency security backports
description: Maintenance guidance when a transitive dependency has a verified local patch but no fixed registry release.
---

Keep a local package-manager patch until the dependency publishes a release containing an equivalent fix or the advisory marks a fixed version. A local patch mitigates the vulnerable code path but does not change the installed package version, so registry-based audit tools may continue reporting it.

**Why:** removing the backport before an upstream release would reintroduce the vulnerable code, while reporting the audit as clean would be inaccurate.

**How to apply:** check current upstream releases and advisory metadata before removing a patch; rerun the exploit regression checks and package audit after switching to a fixed release.
