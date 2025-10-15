import importlib
import os
import types

import pytest

RUN = os.getenv("RUN_EXAMPLE_TESTS") == "1"

pytestmark = pytest.mark.skipif(
    not RUN, reason="Set RUN_EXAMPLE_TESTS=1 to include example smoke tests"
)

EXAMPLE_MODULES = [
    # These modules were removed/renamed or may be archived; keep placeholders for future reinstatement
]


def test_import_examples():
    # Placeholder: ensure list stays empty or modules import cleanly
    for mod in EXAMPLE_MODULES:
        m = importlib.import_module(mod)
        assert isinstance(m, types.ModuleType)
