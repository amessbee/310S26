import argparse
import random
import statistics
import time
from typing import Callable, List, Tuple


def _partition_around_pivot(arr: List[int], pivot: int) -> Tuple[List[int], List[int], List[int]]:
	"""Partition arr into (< pivot), (== pivot), (> pivot)."""
	lows, highs, pivots = [], [], []
	for x in arr:
		if x < pivot:
			lows.append(x)
		elif x > pivot:
			highs.append(x)
		else:
			pivots.append(x)
	return lows, pivots, highs


def randomized_select(arr: List[int], k: int) -> int:
	"""Select the k-th smallest element (0-based) using randomized Quickselect."""
	if not (0 <= k < len(arr)):
		raise IndexError("k out of bounds")

	while True:
		if len(arr) <= 10:
			return sorted(arr)[k]

		pivot = random.choice(arr)
		lows, pivots, highs = _partition_around_pivot(arr, pivot)

		if k < len(lows):
			arr = lows
			continue
		if k < len(lows) + len(pivots):
			return pivot
		k -= len(lows) + len(pivots)
		arr = highs


def _median_of_five(chunk: List[int]) -> int:
	chunk_sorted = sorted(chunk)
	return chunk_sorted[len(chunk_sorted) // 2]


def median_of_medians_select(arr: List[int], k: int) -> int:
	"""
	Deterministic linear-time selection (BFPRT). Returns k-th smallest (0-based).
	Uses groups of 5 to select a good pivot deterministically.
	"""
	n = len(arr)
	if not (0 <= k < n):
		raise IndexError("k out of bounds")

	if n <= 10:
		return sorted(arr)[k]

	# Build list of medians of groups of 5
	medians = []
	for i in range(0, n, 5):
		medians.append(_median_of_five(arr[i:i + 5]))

	# Recursively select the median of medians as pivot
	pivot = median_of_medians_select(medians, len(medians) // 2) if len(medians) > 1 else medians[0]

	lows, pivots, highs = _partition_around_pivot(arr, pivot)

	if k < len(lows):
		return median_of_medians_select(lows, k)
	if k < len(lows) + len(pivots):
		return pivot
	return median_of_medians_select(highs, k - len(lows) - len(pivots))


def median_randomized(arr: List[int]) -> int:
	if not arr:
		raise ValueError("empty list")
	k = (len(arr) - 1) // 2  # lower median for even lengths
	return randomized_select(arr, k)


def median_deterministic(arr: List[int]) -> int:
	if not arr:
		raise ValueError("empty list")
	k = (len(arr) - 1) // 2  # lower median for even lengths
	return median_of_medians_select(arr, k)


def _trial_generate(size: int, distinct: bool, seed: int) -> List[int]:
	rng = random.Random(seed)
	if distinct:
		# Sample unique integers from a wider range
		return rng.sample(range(size * 10), k=size)
	# Allow duplicates in a bounded range
	return [rng.randint(0, size * 10) for _ in range(size)]


def benchmark(sizes: List[int], trials: int, distinct: bool, seed: int) -> None:
	print("Benchmarking median selection algorithms")
	print(f"Sizes: {sizes}, Trials per size: {trials}, Distinct: {distinct}")

	for size in sizes:
		rand_times: List[float] = []
		det_times: List[float] = []

		for t in range(trials):
			trial_seed = seed + t
			data = _trial_generate(size, distinct, trial_seed)

			# Randomized median
			random.seed(trial_seed)
			t0 = time.perf_counter()
			m_rand = median_randomized(data)
			t1 = time.perf_counter()
			rand_times.append(t1 - t0)

			# Deterministic median of medians
			t0 = time.perf_counter()
			m_det = median_deterministic(data)
			t1 = time.perf_counter()
			det_times.append(t1 - t0)

			# Sanity: both should match, and optionally check against median_low for small sizes
			if m_rand != m_det:
				raise AssertionError("Algorithms disagree on median value")

		avg_rand = sum(rand_times) / len(rand_times)
		avg_det = sum(det_times) / len(det_times)
		std_rand = (statistics.pstdev(rand_times) if len(rand_times) > 1 else 0.0)
		std_det = (statistics.pstdev(det_times) if len(det_times) > 1 else 0.0)

		# Convert to milliseconds for reporting
		avg_rand_ms = avg_rand * 1e3
		avg_det_ms = avg_det * 1e3
		std_rand_ms = std_rand * 1e3
		std_det_ms = std_det * 1e3

		print(f"Size {size:,} -> Randomized: {avg_rand_ms:.3f} ms (±{std_rand_ms:.3f}), Deterministic: {avg_det_ms:.3f} ms (±{std_det_ms:.3f})")


def _parse_args() -> argparse.Namespace:
	p = argparse.ArgumentParser(description="Compare randomized vs median-of-medians median selection")
	p.add_argument("--sizes", type=str, default="1000000,2000000",
				   help="Comma-separated input sizes (default: 100000,200000)")
	p.add_argument("--trials", type=int, default=3, help="Trials per size (default: 3)")
	p.add_argument("--seed", type=int, default=42, help="Base RNG seed (default: 42)")
	p.add_argument("--allow-duplicates", action="store_true", help="Allow duplicates in input data")
	return p.parse_args()


def _sanity_check() -> None:
	# Small sanity check to validate implementations
	test_data = [7, 1, 3, 9, 5, 2, 8, 6, 4, 0]
	m_r = median_randomized(test_data)
	m_d = median_deterministic(test_data)
	m_s = statistics.median_low(test_data)
	assert m_r == m_d == m_s, (m_r, m_d, m_s)


if __name__ == "__main__":
	_sanity_check()
	args = _parse_args()
	sizes = [int(x.strip()) for x in args.sizes.split(",") if x.strip()]
	benchmark(sizes=sizes, trials=args.trials, distinct=not args.allow_duplicates, seed=args.seed)

