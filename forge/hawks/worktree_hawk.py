"""Lil_Worktree_Hawk — git worktree lifecycle, branch isolation, auto-prune.

Wraps the isolation/worktree.py WorktreeManager to provide a hawk-level
interface for Chicken Hawk dispatch.
"""

from __future__ import annotations

import logging
from typing import Optional

from forge.isolation.worktree import WorktreeManager

logger = logging.getLogger("forge.hawks.worktree")


class WorktreeHawk:
    """Lil_Worktree_Hawk: manages git worktree lifecycle for Forge runs.

    Provides async wrappers around the synchronous WorktreeManager, generating
    branch names in the forge/smelt-{run_id} convention.
    """

    name: str = "Lil_Worktree_Hawk"
    role: str = "WORKTREE"

    def __init__(self, manager: Optional[WorktreeManager] = None) -> None:
        self._manager = manager or WorktreeManager()

    async def create_worktree(
        self,
        repo_path: str,
        run_id: str,
        worktree_dir: Optional[str] = None,
    ) -> str:
        """Create a worktree for a Forge run.

        Generates branch name: forge/smelt-{run_id[:8]}

        Args:
            repo_path: Path to the git repository.
            run_id: UUID string of the Forge run (first 8 chars used for branch).
            worktree_dir: Optional explicit worktree directory path.

        Returns:
            Absolute path to the created worktree.
        """
        branch_name = f"forge/smelt-{run_id[:8]}"
        logger.info(
            "Creating worktree for run %s on branch %s",
            run_id[:8],
            branch_name,
        )
        path = self._manager.create(
            repo_path=repo_path,
            branch_name=branch_name,
            worktree_dir=worktree_dir,
        )
        logger.info("Worktree created at %s", path)
        return path

    async def cleanup(self, worktree_path: str, force: bool = False) -> None:
        """Remove a worktree and clean up its directory.

        Args:
            worktree_path: Absolute path to the worktree to remove.
            force: Force removal even with uncommitted changes.
        """
        logger.info("Cleaning up worktree at %s", worktree_path)
        self._manager.destroy(worktree_path, force=force)
        logger.info("Worktree cleanup complete: %s", worktree_path)

    async def prune_stale(
        self,
        repo_path: str,
        max_age_seconds: int = 86400,
    ) -> int:
        """Remove worktrees older than the given threshold.

        Args:
            repo_path: Path to the git repository.
            max_age_seconds: Max age in seconds before a worktree is stale.

        Returns:
            Number of worktrees pruned.
        """
        logger.info("Pruning stale worktrees in %s (max age: %ds)", repo_path, max_age_seconds)
        pruned = self._manager.prune_stale(repo_path, max_age_seconds)
        logger.info("Pruned %d stale worktree(s)", pruned)
        return pruned
