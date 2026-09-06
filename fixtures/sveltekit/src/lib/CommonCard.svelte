<script>
	export let title = '';
	export let desc = '';
</script>

<div class="card">
	<div class="card-title">{title}</div>
	<div class="card-desc">{desc}</div>
	<pre><slot /></pre>
</div>

<style>
	.card {
		background: var(--surface-2);
		border: 1px solid var(--border);
		border-radius: var(--radius-md);
		padding: 30px 28px 26px;
		transition:
			border-color 0.18s ease,
			transform 0.18s ease;
	}

	.card:hover {
		border-color: var(--gold-line);
		transform: translateY(-2px);
	}

	.card-title {
		font-family: 'JetBrains Mono', monospace;
		font-size: 13px;
		font-weight: 600;
		color: var(--text);
		margin-bottom: 8px;
	}

	.card-desc {
		font-size: 13.5px;
		color: var(--text-faint);
		margin-bottom: 20px;
	}
</style>
