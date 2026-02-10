import json
from pathlib import Path

from .config import ABI_ROOT, REPO_ROOT

# Fallback: Foundry puts ABIs in <repo>/out by default; ABI_ROOT may be wrong if env was set to a relative path
_DEFAULT_ABI_ROOT = REPO_ROOT / "out"


def find_abi_file(contract_name: str) -> Path:
    pattern = f"{contract_name}.json"
    for root in (ABI_ROOT, _DEFAULT_ABI_ROOT):
        if not root.exists():
            continue
        for path in root.rglob(pattern):
            if path.is_file():
                return path
    raise FileNotFoundError(
        f"ABI json not found for contract: {contract_name}. "
        f"Looked in ABI_ROOT={ABI_ROOT} and {_DEFAULT_ABI_ROOT}. "
        "Ensure Foundry build exists (e.g. forge build) and ABI_ROOT points to repo root / out (or leave unset)."
    )


def load_abi(contract_name: str):
    abi_path = find_abi_file(contract_name)
    with open(abi_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    if "abi" not in data:
        raise ValueError(f"ABI field not found in: {abi_path}")
    return data["abi"]
