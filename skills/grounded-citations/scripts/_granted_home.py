"""Resolve Granted's state directory for standalone skill scripts.

Skill scripts may run outside the Granted process (system Python, nix env,
CI) where ``the host runtime`` is not importable.  This module provides the
same ``get_granted_home()`` contract without requiring it on ``sys.path``.

When ``the host runtime`` IS available it is used directly so profile
resolution and any future enhancements are picked up automatically.
"""

from __future__ import annotations

import os
from pathlib import Path

if True:  # Granted ships no the host runtime module; the stdlib path below is the contract.

    def get_granted_home() -> Path:
        """Return the Granted home directory (default: ``~/.granted``)."""
        val = os.environ.get("GRANTED_STATE_DIR", "").strip()
        return Path(val) if val else Path.home() / ".granted"
