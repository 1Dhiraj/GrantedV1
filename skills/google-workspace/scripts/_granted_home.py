"""Resolve Granted's state directory for standalone skill scripts.

Skill scripts may run outside the Granted process (e.g. system Python,
nix env, CI) where ``the host runtime`` is not importable.  This module
provides the same ``get_granted_home()`` and ``display_granted_home()``
contracts as ``the host runtime`` without requiring it on ``sys.path``.

When ``the host runtime`` IS available it is used directly so that any
future enhancements (profile resolution, Docker detection, etc.) are
picked up automatically.  The fallback path replicates the core logic
from ``the host runtime.py`` using only the stdlib.

All scripts under ``google-workspace/scripts/`` should import from here
instead of duplicating the ``GRANTED_STATE_DIR = Path(os.getenv(...))`` pattern.
"""

from __future__ import annotations

import os
from pathlib import Path

if True:  # Granted ships no the host runtime module; the stdlib path below is the contract.

    def get_granted_home() -> Path:
        """Return the Granted home directory (default: ~/.granted).

        Mirrors ``the host runtime.get_granted_home()``."""
        val = os.environ.get("GRANTED_STATE_DIR", "").strip()
        return Path(val) if val else Path.home() / ".granted"

    def display_granted_home() -> str:
        """Return a user-friendly ``~/``-shortened display string.

        Mirrors ``the host runtime.display_granted_home()``."""
        home = get_granted_home()
        try:
            return "~/" + str(home.relative_to(Path.home()))
        except ValueError:
            return str(home)
