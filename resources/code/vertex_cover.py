import argparse
import random
import statistics
import time
from typing import Dict, List, Set, Tuple


# ---------------------------------------------------------------------------
# Graph generation
# ---------------------------------------------------------------------------

def erdos_renyi(n: int, p: float, rng: random.Random) -> Dict[int, Set[int]]:
    """
    Undirected Erdos-Renyi G(n,p) using the geometric skipping trick:
    instead of flipping a coin for every pair, skip ahead by a geometrically
    distributed count, giving O(n + |E|) time instead of O(n^2).
    """
    adj: Dict[int, Set[int]] = {v: set() for v in range(n)}
    if p <= 0:
        return adj
    import math
    log1mp = math.log(1.0 - p)
    # Enumerate edges of the complete graph by a single integer index
    # edge index i corresponds to pair (u, v) with v = i % n, u = i // n (u < v)
    total_pairs = n * (n - 1) // 2
    # Use flat index over upper-triangle pairs
    idx = -1
    while True:
        # Geometric skip: number of failures before next success
        skip = int(math.log(rng.random()) / log1mp)
        idx += skip + 1
        if idx >= total_pairs:
            break
        # Convert flat index to (u, v) with u < v
        # u is the row: u = floor((1 + sqrt(1+8*idx)) / 2)  (inverse triangular)
        u = int((1 + math.sqrt(1 + 8 * idx)) / 2)
        v = idx - u * (u - 1) // 2
        if u >= n:
            break
        adj[u].add(v)
        adj[v].add(u)
    return adj


# ---------------------------------------------------------------------------
# Algorithm 1 — Greedy highest-degree
# ---------------------------------------------------------------------------

def greedy_max_degree(adj: Dict[int, Set[int]]) -> Set[int]:
    """
    Repeatedly pick the vertex with the highest current degree,
    add it to the cover, and remove all its incident edges.
    Stop when no edges remain.
    """
    # Work on mutable degree counts and adjacency copy
    deg: Dict[int, int] = {v: len(nbrs) for v, nbrs in adj.items()}
    remaining: Dict[int, Set[int]] = {v: set(nbrs) for v, nbrs in adj.items()}
    cover: Set[int] = set()

    while True:
        # Find vertex with max degree among those still having edges
        best = max((v for v in remaining if deg[v] > 0), key=lambda v: deg[v], default=None)
        if best is None:
            break
        cover.add(best)
        for nbr in list(remaining[best]):
            remaining[nbr].discard(best)
            deg[nbr] -= 1
        remaining[best] = set()
        deg[best] = 0

    return cover


# ---------------------------------------------------------------------------
# Algorithm 2 — Maximal matching (2-approximation)
# ---------------------------------------------------------------------------

def matching_cover(adj: Dict[int, Set[int]]) -> Set[int]:
    """
    Classic 2-approximation: pick any uncovered edge (u, v),
    add both endpoints to the cover, remove all edges incident
    to either endpoint, and repeat.
    """
    covered: Set[int] = set()
    cover: Set[int] = set()
    # Build edge list; process in a stable order
    edges: List[Tuple[int, int]] = [(u, v) for u, nbrs in adj.items() for v in nbrs if u < v]

    for u, v in edges:
        if u in cover or v in cover:
            continue
        cover.add(u)
        cover.add(v)

    return cover


# ---------------------------------------------------------------------------
# Verification helper
# ---------------------------------------------------------------------------

def is_valid_cover(adj: Dict[int, Set[int]], cover: Set[int]) -> bool:
    for u, nbrs in adj.items():
        for v in nbrs:
            if u not in cover and v not in cover:
                return False
    return True


# ---------------------------------------------------------------------------
# Benchmark
# ---------------------------------------------------------------------------

def benchmark(
    sizes: List[int],
    edge_prob: float,
    trials: int,
    seed: int,
) -> None:
    print(f"Vertex Cover Approximation Comparison")
    print(f"Edge probability p={edge_prob}, trials per size={trials}")
    print(
        f"{'n':>8}  {'|E| avg':>10}  "
        f"{'MaxDeg |C|':>12}  {'MaxDeg ms':>12}  "
        f"{'Match |C|':>12}  {'Match ms':>12}  "
        f"{'Ratio (MD/M)':>14}"
    )
    print("-" * 98)

    for n in sizes:
        md_sizes: List[int] = []
        md_times: List[float] = []
        mt_sizes: List[int] = []
        mt_times: List[float] = []
        edge_counts: List[int] = []

        for t in range(trials):
            rng = random.Random(seed + t * 997 + n)
            g = erdos_renyi(n, edge_prob, rng)
            edge_counts.append(sum(len(nbrs) for nbrs in g.values()) // 2)

            # Greedy max-degree
            t0 = time.perf_counter()
            c1 = greedy_max_degree(g)
            md_times.append(time.perf_counter() - t0)
            md_sizes.append(len(c1))
            assert is_valid_cover(g, c1), "greedy_max_degree produced invalid cover"

            # Matching 2-approx
            t0 = time.perf_counter()
            c2 = matching_cover(g)
            mt_times.append(time.perf_counter() - t0)
            mt_sizes.append(len(c2))
            assert is_valid_cover(g, c2), "matching_cover produced invalid cover"

        def avg(xs: List) -> float:
            return sum(xs) / len(xs)

        avg_edges = avg(edge_counts)
        avg_md = avg(md_sizes)
        avg_mt = avg(mt_sizes)
        avg_md_ms = avg(md_times) * 1e3
        avg_mt_ms = avg(mt_times) * 1e3
        ratio = avg_md / avg_mt if avg_mt else float("inf")

        print(
            f"{n:>8,}  {avg_edges:>10,.0f}  "
            f"{avg_md:>12.1f}  {avg_md_ms:>12.3f}  "
            f"{avg_mt:>12.1f}  {avg_mt_ms:>12.3f}  "
            f"{ratio:>14.4f}"
        )


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def _parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(
        description="Compare greedy max-degree vs matching 2-approx for Vertex Cover"
    )
    p.add_argument(
        "--sizes", type=str, default="1000,5000,10000,50000,100000",
        help="Comma-separated graph sizes n (default: 1000,5000,10000,50000,100000)",
    )
    p.add_argument(
        "--prob", type=float, default=0.05,
        help="Edge probability for G(n,p) (default: 0.05)",
    )
    p.add_argument("--trials", type=int, default=5, help="Trials per size (default: 5)")
    p.add_argument("--seed", type=int, default=42, help="Base RNG seed (default: 42)")
    return p.parse_args()


def _sanity_check() -> None:
    # Triangle graph: vertices 0,1,2 all connected
    g = {0: {1, 2}, 1: {0, 2}, 2: {0, 1}}
    c1 = greedy_max_degree(g)
    c2 = matching_cover(g)
    assert is_valid_cover(g, c1), f"sanity fail greedy: {c1}"
    assert is_valid_cover(g, c2), f"sanity fail matching: {c2}"
    # Star graph: center=0 connected to 1..4
    g2: Dict[int, Set[int]] = {0: {1, 2, 3, 4}, 1: {0}, 2: {0}, 3: {0}, 4: {0}}
    c3 = greedy_max_degree(g2)
    c4 = matching_cover(g2)
    assert is_valid_cover(g2, c3)
    assert is_valid_cover(g2, c4)
    # Greedy should pick center (degree 4) giving cover of size 1
    assert c3 == {0}, f"greedy should cover star with just center, got {c3}"


if __name__ == "__main__":
    _sanity_check()
    args = _parse_args()
    sizes = [int(x.strip()) for x in args.sizes.split(",") if x.strip()]
    benchmark(sizes=sizes, edge_prob=args.prob, trials=args.trials, seed=args.seed)
