import json
from pathlib import Path

from .config import ABI_ROOT, REPO_ROOT

# Fallbacks cover both repo layouts:
# - monorepo style: <repo>/contracts/out
# - root foundry style: <repo>/out
_DEFAULT_ABI_ROOTS = (REPO_ROOT / "contracts" / "out", REPO_ROOT / "out")


def find_abi_file(contract_name: str) -> Path:
    pattern = f"{contract_name}.json"
    roots = []
    for root in (ABI_ROOT, *_DEFAULT_ABI_ROOTS):
        if root not in roots:
            roots.append(root)

    for root in roots:
        if not root.exists():
            continue
        for path in root.rglob(pattern):
            if path.is_file():
                return path

    looked_in = ", ".join(str(root) for root in roots)
    raise FileNotFoundError(
        f"ABI json not found for contract: {contract_name}. "
        f"Looked in: {looked_in}. "
        "Ensure Foundry build exists (e.g. forge build) and ABI_ROOT points to the foundry out directory."
    )


def load_abi(contract_name: str):
    abi_path = find_abi_file(contract_name)
    with open(abi_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    if "abi" not in data:
        raise ValueError(f"ABI field not found in: {abi_path}")
    return data["abi"]
