<script>
	import CommonButton from './CommonButton.svelte';
	import Demo from './Demo.svelte';
</script>

<section class="hero">
	<div class="wrap hero-grid">
		<div>
			<div class="eyebrow">v2 preview</div>

			<h1>
				The sweetest way to build the web
				<br />
			</h1>

			<p class="lede">
				Chocola compiles enhanced <span class="brace-gold"><b>HTML, CSS, and JS</b></span> straight to the
				browser. Write logic as HTML, not template strings — no bundler,
				<span class="brace-pink"><b>no virtual DOM</b></span>, only one dependency.
			</p>

			<div class="hero-actions">
				<a href="#start">
					<CommonButton label="Install preview" primary />
				</a>

				<a href="#logic">
					<CommonButton label="See the syntax" ghost />
				</a>
			</div>
		</div>

		<div>
			<Demo />
		</div>
	</div>
</section>

<style>
	.hero {
		padding: 128px 0 88px;
	}

	.hero-grid {
		display: grid;
		grid-template-columns: 1.05fr 0.95fr;
		gap: 88px;
		align-items: center;
	}

	@media (max-width: 940px) {
		.hero-grid {
			grid-template-columns: 1fr;
		}
	}

	h1 {
		font-size: clamp(38px, 5.4vw, 62px);
		margin-bottom: 28px;
	}

	.brace-gold {
		color: var(--gold);
		font-style: italic;
	}

	.brace-pink {
		color: var(--pink);
		font-style: italic;
	}

	p.lede {
		font-size: 18px;
		color: var(--text-muted);
		max-width: 48ch;
		line-height: 1.7;
		margin: 0 0 40px;
	}

	.hero-actions {
		display: flex;
		gap: 14px;
		align-items: center;
		flex-wrap: wrap;
	}
</style>
