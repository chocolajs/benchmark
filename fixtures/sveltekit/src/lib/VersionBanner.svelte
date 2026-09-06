<script>
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';

	let bannerEl;
	let visible = true;

	onMount(() => {
		if (!browser) return;
		const dismissed = sessionStorage.getItem('chocola-banner-dismissed');
		if (dismissed === '1') visible = false;
	});

	function dismiss() {
		visible = false;
		if (browser) sessionStorage.setItem('chocola-banner-dismissed', '1');
	}
</script>

{#if visible}
	<div bind:this={bannerEl} class="version-banner" role="status" aria-label="Preview version notice">
		<div class="banner-inner">
			<div class="banner-left">
				<span class="banner-pill">PREVIEW</span>
				<span class="banner-text">
					You’re viewing <strong>Chocola 2.0.0-next.9</strong>; unstable, breaking changes may still
					land.
				</span>
			</div>
			<div class="banner-actions">
				<button on:click={dismiss} class="banner-close" aria-label="Dismiss preview notice">✕</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.version-banner {
		display: block;
		background: #1c2025;
		border-bottom: 1px solid #2a2f35;
		color: #ecedee;
		font-family: 'Inter', sans-serif;
		font-size: 13.5px;
		line-height: 1.5;
	}

	.banner-inner {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin: 0 auto;
		padding: 10px 40px;
		max-width: 1120px;
		gap: 16px;
	}

	.banner-left {
		display: flex;
		align-items: center;
		gap: 10px;
		flex-wrap: wrap;
		min-width: 0;
	}

	.banner-pill {
		display: inline-flex;
		align-items: center;
		font-family: 'JetBrains Mono', monospace;
		font-size: 11px;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		background: #e8b368;
		color: #1c2025;
		padding: 3px 8px;
		border-radius: 999px;
		white-space: nowrap;
		line-height: 1;
	}

	.banner-text {
		color: #a7acb3;
		font-size: 13px;
	}

	.banner-text strong {
		color: #ecedee;
		font-weight: 600;
	}

	.banner-actions {
		display: flex;
		align-items: center;
		gap: 10px;
		margin-left: auto;
		max-width: fit-content;
	}

	.banner-close {
		appearance: none;
		background: transparent;
		border: 1px solid #323841;
		color: #7d838b;
		width: 26px;
		height: 26px;
		border-radius: 999px;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		font-size: 12px;
		line-height: 1;
		transition: all 0.15s ease;
		margin-left: 2px;
	}

	.banner-close:hover {
		border-color: #4a515c;
		color: #ecedee;
		background: #23282e;
	}

	@media (max-width: 760px) {
		.banner-inner {
			padding: 12px 20px;
			gap: 10px;
		}

		.banner-actions {
			width: 100%;
			justify-content: flex-start;
			margin-left: 0;
		}

		.banner-text {
			font-size: 12.5px;
		}
	}
</style>
