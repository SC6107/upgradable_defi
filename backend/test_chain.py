import math

from app.chain import ChainReader


def _reader() -> ChainReader:
    # Bypass on-chain initialization to test pure math helpers.
    return ChainReader.__new__(ChainReader)


def test_apr_to_apy_returns_none_on_exp_overflow_boundary():
    reader = _reader()
    assert reader._apr_to_apy(1_000.0) is None


def test_calculate_apr_apy_handles_huge_apr_without_throwing():
    reader = _reader()
    apr, apy = reader._calculate_apr_apy(
        reward_rate=10**40,
        total_staked=1,
        rewards_decimals=18,
        staking_decimals=18,
    )
    assert apr is not None
    assert apy is None


def test_calculate_apr_apy_returns_values_for_normal_inputs():
    reader = _reader()
    apr, apy = reader._calculate_apr_apy(
        reward_rate=10**18,
        total_staked=10**24,
        rewards_decimals=18,
        staking_decimals=18,
    )
    assert apr is not None
    assert apy is not None
    assert math.isclose(apy, math.expm1(apr), rel_tol=1e-12)


def test_calculate_apr_apy_handles_float_overflow_in_apr():
    reader = _reader()
    apr, apy = reader._calculate_apr_apy(
        reward_rate=10**400,
        total_staked=1,
        rewards_decimals=18,
        staking_decimals=18,
    )
    assert apr is None
    assert apy is None
