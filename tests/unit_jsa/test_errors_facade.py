from __future__ import annotations

from jsa.errors import (
    ErrorCategory,
    ErrorContext,
    SystemError,
    TransientError,
    UserError,
    system_error,
    transient_error,
    user_error,
)


def test_facade_exports_exist():
    assert ErrorCategory.USER_INPUT.name == "USER_INPUT"
    ctx = ErrorContext(component="t")
    e1 = user_error(code="INVALID_INPUT", message="bad", context=ctx)
    assert isinstance(e1, UserError)
    e2 = transient_error(code="NETWORK_ERROR", message="oops", retry_after=1, context=ctx)
    assert isinstance(e2, TransientError)
    e3 = system_error(code="UNEXPECTED_ERROR", message="bug", context=ctx)
    assert isinstance(e3, SystemError)

