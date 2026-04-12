"""Forge isolation — git worktree manager for branch isolation.

Manages the lifecycle of git worktrees used during Forge runs.
Each run gets its own worktree to prevent cross-contamination.
Hard cap of MAX_CONCURRENT_WORKTREES enforced to manage disk pressure.
"""

from __future__ import annotations

import logging
import shutil
import time
from pathlib import Path
from typing import Optional

import git

logger = logging.getLogger("forge.isolation")

# Hard cap: max concurrent worktrees to manage disk pressure (81% risk per spec).
MAX_CONCURRENT_WORKTREES = 10

# Stale threshold: worktrees older than this many seconds are pruned.
STALE_THRESHOLD_SECONDS = 24 * 60 * 60  # 24 hours


class WorktreeCapExceededError(Exception):
    """Raised when the worktree hard cap would be exceeded."""


class WorktreeManager:
    """Manages git worktrees for Forge run isolation.

    Uses GitPython to create, destroy, prune, and list worktrees.
    Enforces a hard cap of MAX_CONCURRENT_WORKTREES to prevent disk exhaustion.
    """

    def __init__(self, max_worktrees: int = MAX_CONCURRENT_WORKTREES) -> None:
        self._max_worktrees = max_worktrees

    def create(
        self,
        repo_path: str,
        branch_name: str,
        worktree_dir: Optional[str] = None,
    ) -> str:
        """Create a new worktree for the given branch.

        Args:
            repo_path: Path to the git repository.
            branch_name: Name for the new branch (will be created if it doesn't exist).
            worktree_dir: Optional explicit path for the worktree directory.
                          Defaults to <repo>/../forge-worktrees/<branch_name>.

        Returns:
            Absolute path to the created worktree.

        Raises:
            WorktreeCapExceededError: If creating would exceed the hard cap.
            git.GitCommandError: If the git operation fails.
        """
        repo = git.Repo(repo_path)
        active = self.list_active(repo_path)

        if len(active) >= self._max_worktrees:
            msg = (
                f"Cannot create worktree: {len(active)} active worktrees "
                f"(cap is {self._max_worktrees}). Prune stale worktrees first."
            )
            raise WorktreeCapExceededError(msg)

        # Determine worktree path
        if worktree_dir is None:
            repo_root = Path(repo.working_dir).resolve()
            worktrees_base = repo_root.parent / "forge-worktrees"
            worktrees_base.mkdir(parents=True, exist_ok=True)
            safe_branch = branch_name.replace("/", "-")
            worktree_path = worktrees_base / safe_branch
        else:
            worktree_path = Path(worktree_dir).resolve()
            worktree_path.parent.mkdir(parents=True, exist_ok=True)

        worktree_str = str(worktree_path)

        # Create the worktree with a new branch
        try:
            repo.git.worktree("add", "-b", branch_name, worktree_str, "HEAD")
        except git.GitCommandError:
            # Branch may already exist — try without -b
            try:
                repo.git.worktree("add", worktree_str, branch_name)
            except git.GitCommandError as exc:
                logger.error("Failed to create worktree at %s: %s", worktree_str, exc)
                raise

        logger.info(
            "Created worktree at %s on branch %s (%d/%d active)",
            worktree_str,
            branch_name,
            len(active) + 1,
            self._max_worktrees,
        )
        return worktree_str

    def destroy(self, worktree_path: str, force: bool = False) -> None:
        """Remove a worktree and clean up its directory.

        Args:
            worktree_path: Absolute path to the worktree to remove.
            force: Force removal even if the worktree has uncommitted changes.
        """
        wt_path = Path(worktree_path).resolve()

        if not wt_path.exists():
            logger.warning("Worktree path does not exist: %s", wt_path)
            return

        # Find the parent repo by walking up from the worktree
        try:
            repo = git.Repo(str(wt_path))
            # The common_dir points to the original repo's .git
            common_dir = Path(repo.common_dir).resolve()
            main_repo_path = common_dir.parent
            main_repo = git.Repo(str(main_repo_path))
        except (git.InvalidGitRepositoryError, git.NoSuchPathError):
            # If we can't find the repo, just remove the directory
            logger.warning("Cannot find parent repo for %s, removing directory only", wt_path)
            shutil.rmtree(str(wt_path), ignore_errors=True)
            return

        # Remove via git
        args = ["remove"]
        if force:
            args.append("--force")
        args.append(str(wt_path))

        try:
            main_repo.git.worktree(*args)
        except git.GitCommandError as exc:
            logger.error("git worktree remove failed: %s", exc)
            if force:
                shutil.rmtree(str(wt_path), ignore_errors=True)

        logger.info("Destroyed worktree at %s", wt_path)

    def prune_stale(
        self,
        repo_path: str,
        max_age_seconds: int = STALE_THRESHOLD_SECONDS,
    ) -> int:
        """Remove worktrees older than the given threshold.

        Args:
            repo_path: Path to the git repository.
            max_age_seconds: Max age in seconds before a worktree is stale.

        Returns:
            Number of worktrees pruned.
        """
        active = self.list_active(repo_path)
        now = time.time()
        pruned = 0

        for wt_info in active:
            wt_path = Path(wt_info["path"])
            if not wt_path.exists():
                continue
            try:
                mtime = wt_path.stat().st_mtime
            except OSError:
                continue

            age = now - mtime
            if age > max_age_seconds:
                logger.info(
                    "Pruning stale worktree %s (age: %.1f hours)",
                    wt_path,
                    age / 3600,
                )
                self.destroy(str(wt_path), force=True)
                pruned += 1

        # Also run git worktree prune to clean up stale admin files
        try:
            repo = git.Repo(repo_path)
            repo.git.worktree("prune")
        except git.GitCommandError as exc:
            logger.warning("git worktree prune failed: %s", exc)

        if pruned > 0:
            logger.info("Pruned %d stale worktree(s)", pruned)
        return pruned

    def list_active(self, repo_path: str) -> list[dict[str, str]]:
        """List all active worktrees for the repository.

        Args:
            repo_path: Path to the git repository.

        Returns:
            List of dicts with 'path', 'head', and 'branch' keys.
        """
        repo = git.Repo(repo_path)
        result: list[dict[str, str]] = []

        try:
            output = repo.git.worktree("list", "--porcelain")
        except git.GitCommandError:
            return result

        current_entry: dict[str, str] = {}
        for line in output.splitlines():
            if line.startswith("worktree "):
                if current_entry and current_entry.get("path"):
                    result.append(current_entry)
                current_entry = {"path": line[len("worktree "):].strip()}
            elif line.startswith("HEAD "):
                current_entry["head"] = line[len("HEAD "):].strip()
            elif line.startswith("branch "):
                current_entry["branch"] = line[len("branch "):].strip()
            elif line.strip() == "":
                if current_entry and current_entry.get("path"):
                    result.append(current_entry)
                current_entry = {}

        # Don't forget the last entry
        if current_entry and current_entry.get("path"):
            result.append(current_entry)

        # Filter out the main working tree (first entry is always the main repo)
        if result:
            main_repo_resolved = Path(repo.working_dir).resolve()
            result = [
                wt for wt in result
                if Path(wt["path"]).resolve() != main_repo_resolved
            ]

        return result
