"""Tests for forge.isolation.worktree — WorktreeManager."""

from __future__ import annotations

import os
import tempfile
from pathlib import Path

import git
import pytest

from forge.isolation.worktree import (
    MAX_CONCURRENT_WORKTREES,
    WorktreeCapExceededError,
    WorktreeManager,
)


@pytest.fixture
def temp_repo(tmp_path: Path) -> git.Repo:
    """Create a temporary git repository with an initial commit."""
    repo_dir = tmp_path / "test-repo"
    repo_dir.mkdir()
    repo = git.Repo.init(str(repo_dir))

    # Create an initial commit so HEAD exists
    readme = repo_dir / "README.md"
    readme.write_text("# Test Repo")
    repo.index.add(["README.md"])
    repo.index.commit("Initial commit")

    return repo


class TestWorktreeManager:
    def test_create_and_list(self, temp_repo: git.Repo) -> None:
        """Create a worktree and verify it appears in the list."""
        mgr = WorktreeManager()
        repo_path = temp_repo.working_dir

        wt_path = mgr.create(repo_path, "forge/test-branch")
        assert Path(wt_path).exists()

        active = mgr.list_active(repo_path)
        assert len(active) >= 1
        assert any("forge" in wt.get("branch", "") for wt in active)

    def test_destroy(self, temp_repo: git.Repo) -> None:
        """Create then destroy a worktree."""
        mgr = WorktreeManager()
        repo_path = temp_repo.working_dir

        wt_path = mgr.create(repo_path, "forge/destroy-test")
        assert Path(wt_path).exists()

        mgr.destroy(wt_path, force=True)
        # After destroy, the directory should be gone (or removed)
        # Note: git worktree remove may leave the dir sometimes
        # but the worktree should not be in the active list
        active = mgr.list_active(repo_path)
        active_paths = [wt["path"] for wt in active]
        assert wt_path not in active_paths

    def test_cap_enforcement(self, temp_repo: git.Repo) -> None:
        """Exceeding max worktrees should raise WorktreeCapExceededError."""
        mgr = WorktreeManager(max_worktrees=2)
        repo_path = temp_repo.working_dir

        mgr.create(repo_path, "forge/cap-1")
        mgr.create(repo_path, "forge/cap-2")

        with pytest.raises(WorktreeCapExceededError, match="cap is 2"):
            mgr.create(repo_path, "forge/cap-3")

    def test_prune_stale(self, temp_repo: git.Repo) -> None:
        """Prune with max_age_seconds=0 should prune all worktrees."""
        mgr = WorktreeManager()
        repo_path = temp_repo.working_dir

        mgr.create(repo_path, "forge/stale-test")

        pruned = mgr.prune_stale(repo_path, max_age_seconds=0)
        assert pruned >= 1

    def test_list_empty(self, temp_repo: git.Repo) -> None:
        """Listing worktrees on a fresh repo should return empty."""
        mgr = WorktreeManager()
        active = mgr.list_active(temp_repo.working_dir)
        assert len(active) == 0

    def test_default_max_worktrees(self) -> None:
        """Default cap should match the module constant."""
        mgr = WorktreeManager()
        assert mgr._max_worktrees == MAX_CONCURRENT_WORKTREES
        assert mgr._max_worktrees == 10
