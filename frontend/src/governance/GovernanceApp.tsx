/**
 * Governance App
 * Proposals list, create proposal, vote, and execute (after timelock).
 */
import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import API from '../mining/services/api';
import { useWallet } from '../mining/hooks/useWallet';

const GOVERNOR_ABI = [
  'function state(uint256 proposalId) view returns (uint8)',
  'function proposalSnapshot(uint256 proposalId) view returns (uint256)',
  'function proposalDeadline(uint256 proposalId) view returns (uint256)',
  'function hashProposal(address[] targets, uint256[] values, bytes[] calldatas, bytes32 descriptionHash) view returns (uint256)',
  'function propose(address[] targets, uint256[] values, bytes[] calldatas, string description) returns (uint256)',
  'function castVote(uint256 proposalId, uint8 support) returns (uint256)',
  'function execute(address[] targets, uint256[] values, bytes[] calldatas, bytes32 descriptionHash) payable returns (uint256)',
];

const STATE_NAMES: Record<number, string> = {
  0: 'Pending',
  1: 'Active',
  2: 'Canceled',
  3: 'Defeated',
  4: 'Succeeded',
  5: 'Queued',
  6: 'Expired',
  7: 'Executed',
};

export default function GovernanceApp() {
  const { wallet, connect, disconnect, loading: walletLoading } = useWallet();
  const [governorAddress, setGovernorAddress] = useState<string | null>(null);
  const [proposalIds, setProposalIds] = useState<string[]>([]);
  const [addProposalId, setAddProposalId] = useState('');
  const [proposals, setProposals] = useState<{ id: string; state: number; snapshot: bigint; deadline: bigint }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<'list' | 'create' | 'vote'>('list');
  const [createDesc, setCreateDesc] = useState('');
  const [createTarget, setCreateTarget] = useState('');
  const [createValue, setCreateValue] = useState('0');
  const [createCalldata, setCreateCalldata] = useState('0x');
  const [createLoading, setCreateLoading] = useState(false);
  const [voteLoading, setVoteLoading] = useState<string | null>(null);
  const [lastProposedParams, setLastProposedParams] = useState<{ targets: string[]; values: bigint[]; calldatas: string[]; description: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const addr = await API.getContractAddresses();
        const gov = (addr as { governor?: string | null }).governor;
        if (gov) setGovernorAddress(gov);
      } catch {
        if (!cancelled) setError('Failed to load governor address');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const fetchProposals = React.useCallback(async () => {
    if (!governorAddress || !window.ethereum || proposalIds.length === 0) {
      if (proposalIds.length === 0) setProposals([]);
      return;
    }
    const provider = new ethers.BrowserProvider(window.ethereum);
    const governor = new ethers.Contract(governorAddress, GOVERNOR_ABI, provider);
    const list: { id: string; state: number; snapshot: bigint; deadline: bigint }[] = [];
    for (const idStr of proposalIds) {
      try {
        const id = BigInt(idStr);
        const [state, snapshot, deadline] = await Promise.all([
          governor.state(id),
          governor.proposalSnapshot(id),
          governor.proposalDeadline(id),
        ]);
        list.push({ id: idStr, state: Number(state), snapshot, deadline });
      } catch {
        list.push({ id: idStr, state: -1, snapshot: 0n, deadline: 0n });
      }
    }
    setProposals(list);
  }, [governorAddress, proposalIds]);

  useEffect(() => {
    if (governorAddress) fetchProposals();
  }, [governorAddress, fetchProposals]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!governorAddress || !wallet.account || !window.ethereum) return;
    setCreateLoading(true);
    setError(null);
    try {
      const signer = await new ethers.BrowserProvider(window.ethereum).getSigner();
      const governor = new ethers.Contract(governorAddress, GOVERNOR_ABI, signer);
      const targets = createTarget.trim() ? [createTarget.trim()] : [];
      const values = [BigInt(createValue || '0')];
      const calldatas = createCalldata && createCalldata !== '0x' ? [createCalldata] : ['0x'];
      const description = createDesc.trim() || 'Proposal';
      const tx = await governor.propose(targets, values, calldatas, description);
      const receipt = await tx.wait();
      const descHash = ethers.id(description);
      const newId = await governor.hashProposal(targets, values, calldatas, descHash);
      setProposalIds((prev) => [...prev, String(newId)]);
      setLastProposedParams({ targets, values, calldatas, description });
      setCreateDesc('');
      setCreateTarget('');
      setCreateValue('0');
      setCreateCalldata('0x');
      await fetchProposals();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Propose failed');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleVote = async (proposalIdStr: string, support: number) => {
    if (!governorAddress || !window.ethereum) return;
    setVoteLoading(proposalIdStr);
    setError(null);
    try {
      const signer = await new ethers.BrowserProvider(window.ethereum).getSigner();
      const governor = new ethers.Contract(governorAddress, GOVERNOR_ABI, signer);
      const tx = await governor.castVote(BigInt(proposalIdStr), support);
      await tx.wait();
      await fetchProposals();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Vote failed');
    } finally {
      setVoteLoading(null);
    }
  };

  const addProposalById = () => {
    if (addProposalId.trim() && !proposalIds.includes(addProposalId.trim())) {
      setProposalIds((p) => [...p, addProposalId.trim()]);
      setAddProposalId('');
    }
  };

  const handleExecute = async () => {
    if (!governorAddress || !lastProposedParams || !window.ethereum) return;
    setError(null);
    try {
      const signer = await new ethers.BrowserProvider(window.ethereum).getSigner();
      const governor = new ethers.Contract(governorAddress, GOVERNOR_ABI, signer);
      const descriptionHash = ethers.id(lastProposedParams.description);
      const tx = await governor.execute(
        lastProposedParams.targets,
        lastProposedParams.values,
        lastProposedParams.calldatas,
        descriptionHash,
        { value: lastProposedParams.values[0] ?? 0n }
      );
      await tx.wait();
      setLastProposedParams(null);
      await fetchProposals();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Execute failed');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 text-white">
      <header className="bg-gradient-to-b from-slate-800 to-slate-900 border-b border-slate-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center h-20">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-amber-500 to-orange-600 bg-clip-text text-transparent">
            🗳️ Governance
          </h1>
          <div>
            {wallet.isConnected && wallet.account ? (
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-400">
                  {wallet.account.slice(0, 6)}...{wallet.account.slice(-4)}
                </span>
                <button
                  onClick={disconnect}
                  className="px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white text-sm"
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <button
                onClick={connect}
                disabled={walletLoading}
                className="px-6 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-medium disabled:opacity-50"
              >
                Connect
              </button>
            )}
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 flex gap-2 pb-4">
          {(['list', 'create', 'vote'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                tab === t ? 'bg-slate-700 text-white' : 'text-gray-400 hover:bg-slate-800'
              }`}
            >
              {t === 'list' ? 'Proposals' : t === 'create' ? 'Create' : 'Vote'}
            </button>
          ))}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-4 p-4 rounded-lg bg-red-900/30 border border-red-700 text-red-200">
            {error}
          </div>
        )}

        {loading || !governorAddress ? (
          <p className="text-gray-400">{loading ? 'Loading...' : 'Governor not configured.'}</p>
        ) : (
          <>
            {tab === 'list' && (
              <div className="space-y-4">
                <h2 className="text-xl font-bold text-white">Proposals</h2>
                <div className="flex gap-2 mb-4">
                  <input
                    value={addProposalId}
                    onChange={(e) => setAddProposalId(e.target.value)}
                    placeholder="Proposal ID (uint256)"
                    className="px-3 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white text-sm flex-1"
                  />
                  <button
                    type="button"
                    onClick={addProposalById}
                    className="px-4 py-2 rounded-lg bg-slate-600 hover:bg-slate-500 text-white text-sm"
                  >
                    Add
                  </button>
                </div>
                {proposals.length === 0 ? (
                  <p className="text-gray-400">Add a proposal ID above (e.g. from a created proposal) or create one in the Create tab.</p>
                ) : (
                  <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-900 border-b border-slate-700">
                        <tr>
                          <th className="text-left px-4 py-3 text-gray-300">Proposal ID</th>
                          <th className="text-left px-4 py-3 text-gray-300">State</th>
                          <th className="text-left px-4 py-3 text-gray-300">Snapshot</th>
                          <th className="text-left px-4 py-3 text-gray-300">Deadline</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-700">
                        {proposals.map((p) => (
                          <tr key={p.id}>
                            <td className="px-4 py-3 text-white font-mono text-xs">{p.id.slice(0, 20)}...</td>
                            <td className="px-4 py-3">{STATE_NAMES[p.state] ?? (p.state === -1 ? '?' : p.state)}</td>
                            <td className="px-4 py-3 text-gray-400">{String(p.snapshot)}</td>
                            <td className="px-4 py-3 text-gray-400">{String(p.deadline)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                {lastProposedParams && proposals.some((p) => p.state === 5) && (
                  <div className="mt-4 p-4 bg-amber-900/20 border border-amber-700 rounded-lg">
                    <p className="text-amber-200 text-sm mb-2">A proposal is Queued. After timelock (24h), you can execute it.</p>
                    <button
                      onClick={handleExecute}
                      className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-sm"
                    >
                      Execute
                    </button>
                  </div>
                )}
              </div>
            )}

            {tab === 'create' && (
              <div className="max-w-lg">
                <h2 className="text-xl font-bold text-white mb-4">Create Proposal</h2>
                <form onSubmit={handleCreate} className="space-y-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Description</label>
                    <input
                      value={createDesc}
                      onChange={(e) => setCreateDesc(e.target.value)}
                      className="w-full px-4 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white"
                      placeholder="Proposal description"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Target (address)</label>
                    <input
                      value={createTarget}
                      onChange={(e) => setCreateTarget(e.target.value)}
                      className="w-full px-4 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white"
                      placeholder="0x..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Value (wei)</label>
                    <input
                      value={createValue}
                      onChange={(e) => setCreateValue(e.target.value)}
                      className="w-full px-4 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Calldata (hex)</label>
                    <input
                      value={createCalldata}
                      onChange={(e) => setCreateCalldata(e.target.value)}
                      className="w-full px-4 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white"
                      placeholder="0x"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={createLoading || !wallet.isConnected}
                    className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white"
                  >
                    {createLoading ? 'Submitting...' : 'Propose'}
                  </button>
                </form>
              </div>
            )}

            {tab === 'vote' && (
              <div className="space-y-4">
                <h2 className="text-xl font-bold text-white">Vote on Active Proposals</h2>
                {proposals.filter((p) => p.state === 1).length === 0 ? (
                  <p className="text-gray-400">No active proposals. Add proposal IDs in the Proposals tab first.</p>
                ) : (
                  <div className="space-y-3">
                    {proposals
                      .filter((p) => p.state === 1)
                      .map((p) => (
                        <div
                          key={p.id}
                          className="flex items-center justify-between p-4 bg-slate-800 rounded-lg border border-slate-700"
                        >
                          <span className="text-white font-mono text-xs">{p.id.slice(0, 24)}...</span>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleVote(p.id, 1)}
                              disabled={voteLoading !== null}
                              className="px-3 py-1 rounded bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm"
                            >
                              For
                            </button>
                            <button
                              onClick={() => handleVote(p.id, 0)}
                              disabled={voteLoading !== null}
                              className="px-3 py-1 rounded bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm"
                            >
                              Against
                            </button>
                            <button
                              onClick={() => handleVote(p.id, 2)}
                              disabled={voteLoading !== null}
                              className="px-3 py-1 rounded bg-slate-600 hover:bg-slate-500 disabled:opacity-50 text-white text-sm"
                            >
                              Abstain
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}

        <div className="mt-8 pt-6 border-t border-slate-700 text-sm text-gray-500">
          Governance uses Protocol Governor + Timelock (min 24h delay). Upgrades and parameter changes go through propose → vote → queue → execute.
        </div>
      </main>
    </div>
  );
}
