# JobSentinel Makefile Wrapper
# This file forwards all make commands to docs/development/Makefile
# allowing developers to run "make <target>" from the repository root.

.PHONY: help install dev test test-core test-fast test-all lint type analyze clean fmt cov mut precommit-install precommit-run

# Forward all targets to the actual Makefile
help install dev test test-core test-fast test-all lint type analyze clean fmt cov mut precommit-install precommit-run:
	@$(MAKE) -f docs/development/Makefile $@
