<script>
	import CommonButton from './CommonButton.svelte';
</script>

<header class="nav">
	<div class="nav-inner">
		<a href="#top" class="logo">
			<div class="img"></div>
			<span><span class="braces">&#123;</span> Chocola <span class="braces">&#125;</span></span>
		</a>
		<div class="links">
			<a href="#logic">Logic</a>
			<a href="#components">Components</a>
			<a href="#start">Install</a>
		</div>

		<div class="nav-cta">
			<a
				href="https://github.com/chocolajs/chocola/wiki"
				class="docs-links"
				target="_blank"
				rel="noopener noreferrer"
				title="Stable documentation for v1.6.0"
			>
				<CommonButton label="1.6.0 docs" featured />
			</a>
			<a
				href="https://github.com/chocolajs/chocola/tree/main/documentation"
				class="docs-links"
				target="_blank"
				rel="noopener noreferrer"
				title="Preview documentation for v2 (next)"
			>
				<CommonButton label="v2 docs" ghost />
			</a>
			<a href="https://github.com/chocolajs" target="_blank" rel="noopener noreferrer">
				<CommonButton label="GitHub" primary />
			</a>
		</div>
	</div>
</header>

<style>
	.nav {
		position: sticky;
		top: 0;
		z-index: 50;
		background: rgba(250, 250, 248, 0.86);
		backdrop-filter: blur(10px);
		border-bottom: 1px solid var(--border-soft);
	}

	.nav-inner {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 22px 40px;
		max-width: 1120px;
		margin: 0 auto;
	}

	.logo {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.img {
		aspect-ratio: 1;
		width: 1.75rem;
		background-image: url('/icons/favicon.svg');
		background-position: center;
		background-repeat: no-repeat;
		background-size: contain;
	}

	.logo span {
		font-family: 'Fraunces', serif !important;
		font-weight: 500;
		font-size: 20px;
		text-decoration: none;
		color: var(--text);
	}

	@media (max-width: 425px) {
		.logo span {
			display: none;
		}
	}

	span.braces {
		font-weight: 700;
		color: #d87416;
	}

	.links {
		display: flex;
		gap: 30px;
		font-size: 14.5px;
		color: var(--text-muted);
	}

	.links a {
		text-decoration: none;
		transition: color 0.15s;
	}

	.links a:hover {
		color: var(--text);
	}

	.nav-cta {
		display: flex;
		align-items: center;
		gap: 14px;
	}

	.nav-cta a {
		max-width: fit-content;
		text-decoration: none;
	}

	@media (max-width: 943px) {
		.links {
			display: none;
		}
	}

	@media (max-width: 760px) {
		.docs-links {
			display: none;
		}
	}
</style>
