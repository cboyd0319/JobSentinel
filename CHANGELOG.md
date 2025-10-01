# CHANGELOG

<!-- version list -->

## v2.4.2 (2025-10-01)


## v2.4.1 (2025-10-01)


## v2.4.0 (2025-10-01)

### Bug Fixes

- Critical deployment blockers found during real E2E test
  ([`96dde89`](https://github.com/cboyd0319/job-private-scraper-filter/commit/96dde890f13caa0abfe567ca29b3f2b78941b52e))

- Implement missing create_project function - final blocker removed
  ([`8b7e465`](https://github.com/cboyd0319/job-private-scraper-filter/commit/8b7e4653260a7cd072ad757ce0320d953ee26c2b))

- Make authenticate() async and await all run_command calls
  ([`920055a`](https://github.com/cboyd0319/job-private-scraper-filter/commit/920055a1f7f84a20d14d7ecf195348ee7432e9bf))

- Make select_region() async and await run_command
  ([`b0c6e22`](https://github.com/cboyd0319/job-private-scraper-filter/commit/b0c6e22547cf41cf921fb3a97e2c5dfea8fb45f7))

- Read version dynamically from pyproject.toml instead of hardcoding
  ([`ff096a0`](https://github.com/cboyd0319/job-private-scraper-filter/commit/ff096a015048b132f2d235327f749f8b385a3266))

- Remove incorrect await on non-async ensure_gcloud function
  ([`5c55bdc`](https://github.com/cboyd0319/job-private-scraper-filter/commit/5c55bdc0223cb2cb2d32ad88669531a3f846b528))

### Documentation

- Consolidate documentation from 35 to 31 files
  ([`7b2a1ca`](https://github.com/cboyd0319/job-private-scraper-filter/commit/7b2a1caaac4dc59f3c0a81086619e4e7fe908713))

- Remove 2 redundant docs and consolidate content
  ([`a019613`](https://github.com/cboyd0319/job-private-scraper-filter/commit/a019613650e6cc87cc4f85b5bc37efba1149e797))

### Features

- Add presentation-first UX design with Rich formatting and deployment receipts
  ([`3c0e1ef`](https://github.com/cboyd0319/job-private-scraper-filter/commit/3c0e1ef1713c335bb3f9f4b49b52b6c1ce1402c9))


## v2.3.2 (2025-09-30)

### Bug Fixes

- Add missing critical dependencies and comprehensive E2E test
  ([`1f90a2b`](https://github.com/cboyd0319/job-private-scraper-filter/commit/1f90a2b2388e4e5b7279d66fbdad0c1352febc86))


## v2.3.1 (2025-09-30)

### Bug Fixes

- Correct validation script logger and format Terraform
  ([`499db7e`](https://github.com/cboyd0319/job-private-scraper-filter/commit/499db7effb1d2088b82a7c52102111f632f71961))


## v2.3.0 (2025-09-30)

### Features

- Add deployment validation script for E2E testing
  ([`defea90`](https://github.com/cboyd0319/job-private-scraper-filter/commit/defea90e0c8bb4b29f0eb7d09150a8ffc4aa5966))


## v2.2.0 (2025-09-30)

### Features

- Add resume parser for automatic configuration
  ([`a1f29be`](https://github.com/cboyd0319/job-private-scraper-filter/commit/a1f29be27ea82f76d7a422821bf788ad20cab612))

### Refactoring

- Simplify deploy-cloud.sh as wrapper for cloud.bootstrap
  ([`77e2702`](https://github.com/cboyd0319/job-private-scraper-filter/commit/77e27023125edd7c4d720605e947ceba7f59675d))


## v2.1.0 (2025-09-30)

### Features

- Add cloud bootstrap entry point for deployments
  ([`58648cb`](https://github.com/cboyd0319/job-private-scraper-filter/commit/58648cb74e5ec096d94efbcb9326ad9097f43812))


## v2.0.0 (2025-09-30)

### Bug Fixes

- Remove invalid repository permission from release workflow
  ([`2999289`](https://github.com/cboyd0319/job-private-scraper-filter/commit/2999289c7b291f4927a780e71f9fe2d715d12d3b))

### Features

- Terraform-first GCP deployment with auto-install
  ([`18da55d`](https://github.com/cboyd0319/job-private-scraper-filter/commit/18da55d3e0463677dbb18ba24f4d4fb53fa059aa))

### Breaking Changes

- Complete refactor of GCP deployment infrastructure


## v1.0.0 (2025-09-30)

- Initial Release
