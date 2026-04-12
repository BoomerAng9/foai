"""Forge runtime + all subsystems bundled for v1.0 production cut.
Split into per-module files during Phase 2 refactor (see SMLT-FORGE-HARNESS-001 §8).
"""
from __future__ import annotations
import asyncio, subprocess, uuid, yaml, logging
from pathlib import Path
from typing import Protocol
from forge.core.schema import Workflow, Step, RunState, IngotTier, GateName

log = logging.getLogger("forge")


# ========== ADAPTERS (MoEx) ==========
class ExecutorAdapter(Protocol):
    name: str
    async def execute(self, prompt: str, cwd: Path) -> tuple[bool, str]: ...


class ClawCodeAdapter:
    name = "claw-code"
    async def execute(self, prompt: str, cwd: Path) -> tuple[bool, str]:
        p = await asyncio.create_subprocess_exec(
            "claude", "-p", prompt, cwd=str(cwd),
            stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE)
        out, err = await p.communicate()
        return p.returncode == 0, (out + err).decode()


class CodexCLIAdapter:
    name = "codex-cli"
    async def execute(self, prompt: str, cwd: Path) -> tuple[bool, str]:
        p = await asyncio.create_subprocess_exec(
            "codex", "exec", prompt, cwd=str(cwd),
            stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE)
        out, err = await p.communicate()
        return p.returncode == 0, (out + err).decode()


class GeminiCLIAdapter:
    name = "gemini-cli"
    async def execute(self, prompt: str, cwd: Path) -> tuple[bool, str]:
        p = await asyncio.create_subprocess_exec(
            "gemini", "-p", prompt, cwd=str(cwd),
            stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE)
        out, err = await p.communicate()
        return p.returncode == 0, (out + err).decode()


ADAPTERS: dict[str, ExecutorAdapter] = {
    "claw-code": ClawCodeAdapter(), "codex-cli": CodexCLIAdapter(), "gemini-cli": GeminiCLIAdapter()
}


# ========== ISOLATION (git worktree) ==========
class WorktreeManager:
    MAX_CONCURRENT = 10

    def __init__(self, repo: Path): self.repo = repo

    def create(self, branch: str) -> Path:
        wt_root = self.repo / ".forge-worktrees"
        wt_root.mkdir(exist_ok=True)
        existing = list(wt_root.iterdir())
        if len(existing) >= self.MAX_CONCURRENT:
            raise RuntimeError(f"Worktree cap {self.MAX_CONCURRENT} hit — disk pressure mitigation")
        path = wt_root / branch.replace("/", "_")
        subprocess.run(["git", "-C", str(self.repo), "worktree", "add", "-b", branch, str(path)], check=True)
        return path

    def prune(self, path: Path) -> None:
        subprocess.run(["git", "-C", str(self.repo), "worktree", "remove", "--force", str(path)], check=False)


# ========== GATES (five-gate) ==========
async def run_gate(gate: GateName, cwd: Path) -> tuple[bool, str]:
    cmds = {
        GateName.RUFF: ["ruff", "check", "."],
        GateName.MYPY: ["mypy", "--strict", "."],
        GateName.PYTEST: ["pytest", "-q"],
        GateName.PIP_AUDIT: ["pip-audit"],
        GateName.INTEGRATION: ["pytest", "-q", "tests/integration"],
        GateName.LEANSTRAL: ["lean", "--run", "verify.lean"],
    }
    p = await asyncio.create_subprocess_exec(
        *cmds[gate], cwd=str(cwd),
        stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE)
    out, err = await p.communicate()
    return p.returncode == 0, (out + err).decode()


async def five_gate(cwd: Path) -> tuple[bool, list[str]]:
    gates = [GateName.RUFF, GateName.MYPY, GateName.PYTEST, GateName.PIP_AUDIT, GateName.INTEGRATION]
    results = await asyncio.gather(*(run_gate(g, cwd) for g in gates))
    failures = [g.value for g, (ok, _) in zip(gates, results) if not ok]
    return len(failures) == 0, failures


# ========== CHRONICLE (Charter + Ledger dual-emit) ==========
class Chronicle:
    def __init__(self, out_dir: Path): self.out = out_dir; out_dir.mkdir(exist_ok=True, parents=True)

    def emit(self, run: RunState) -> None:
        charter = self.out / f"charter_{run.run_id}.md"
        ledger = self.out / f"ledger_{run.run_id}.json"
        charter.write_text(f"# Ingot {run.run_id}\nTier: {run.ingot_tier.value}\nStatus: {run.status}\n")
        ledger.write_text(run.model_dump_json(indent=2))
        log.info(f"Chronicle emitted: {charter.name}, {ledger.name}")


# ========== RUNTIME ==========
class ForgeRuntime:
    def __init__(self, repo: Path, adapter: str = "claw-code"):
        self.repo = repo
        self.adapter = ADAPTERS[adapter]
        self.wt = WorktreeManager(repo)
        self.chronicle = Chronicle(repo / ".forge-chronicle")

    @staticmethod
    def load(path: Path) -> Workflow:
        return Workflow.model_validate(yaml.safe_load(path.read_text()))

    async def run(self, wf: Workflow, inputs: dict) -> RunState:
        state = RunState(run_id=uuid.uuid4().hex[:12], workflow_id=wf.id, status="running")
        worktree: Path | None = None
        try:
            for step in wf.steps:
                state.current_step = step.id
                log.info(f"[{state.run_id}] step={step.id} hawk={step.hawk}")
                if step.hawk == "Lil_Worktree_Hawk":
                    branch = (step.branch or "forge/run-{run_id}").replace("{run_id}", state.run_id)
                    worktree = self.wt.create(branch); state.worktree_path = str(worktree)
                elif step.hawk == "Lil_Exec_Hawk":
                    assert worktree, "exec before isolate"
                    for i in range(step.max_iterations if step.iterate_until_gate_passes else 1):
                        state.iterations[step.id] = i + 1
                        ok, out = await self.adapter.execute(
                            f"Execute workflow {wf.id} per inputs {inputs}", worktree)
                        if not ok: state.errors.append(f"exec:{out[:200]}"); continue
                        if step.iterate_until_gate_passes:
                            gate_ok, fails = await five_gate(worktree)
                            if gate_ok: break
                            state.errors.append(f"gate-iter-{i}:{fails}")
                        else: break
                elif step.hawk == "Lil_Gate_Hawk":
                    assert worktree
                    ok, fails = await five_gate(worktree)
                    if not ok:
                        state.status = "failed"; state.errors.append(f"gates:{fails}"); return state
                elif step.hawk == "Buildsmith" and step.action == "promote_ingot":
                    if step.to_tier: state.ingot_tier = step.to_tier
                elif step.hawk == "Lil_Chronicle_Hawk":
                    self.chronicle.emit(state)
            state.status = "passed"
            if state.ingot_tier in (IngotTier.FORGED, IngotTier.HOLO, IngotTier.BAMR):
                log.info(f"[{state.run_id}] 🔥 BAMARAM event — tier={state.ingot_tier.value}")
            return state
        finally:
            if worktree: self.wt.prune(worktree)


# ========== CLI ==========
def main() -> None:
    import click
    @click.command()
    @click.argument("workflow")
    @click.option("--repo", type=Path, default=Path.cwd())
    @click.option("--adapter", default="claw-code")
    @click.option("--input", "-i", multiple=True, help="key=value")
    def cli(workflow: str, repo: Path, adapter: str, input: tuple[str, ...]) -> None:
        logging.basicConfig(level=logging.INFO, format="%(asctime)s %(message)s")
        wf_path = repo / "forge" / "workflows" / f"{workflow}.yaml"
        if not wf_path.exists(): wf_path = Path(__file__).parent.parent / "workflows" / f"{workflow}.yaml"
        wf = ForgeRuntime.load(wf_path)
        inputs = dict(kv.split("=", 1) for kv in input)
        rt = ForgeRuntime(repo, adapter)
        state = asyncio.run(rt.run(wf, inputs))
        click.echo(f"Run {state.run_id}: {state.status} | tier={state.ingot_tier.value}")
        if state.errors:
            for e in state.errors: click.echo(f"  ! {e}")
        raise SystemExit(0 if state.status == "passed" else 1)
    cli()


if __name__ == "__main__": main()
