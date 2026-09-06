<script>
	let installPrompt = 'npm i chocola@next';

	let installBox;
	let promptBefore;
	let ogPrompt;
	let successMessage;
	let btn;
	let btnDisabled = false;

	async function copyPrompt() {
		const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

		if (btnDisabled) return;

		// lock dimensions to avoid layout shift during animation
		const ogWidth = ogPrompt.getBoundingClientRect().width;
		const boxHeight = installBox.getBoundingClientRect().height;
		successMessage.style.width = ogWidth + 'px';
		installBox.style.height = boxHeight + 'px';

		try {
			await navigator.clipboard.writeText(installPrompt);
		} catch {
			// fallback: still run animation even if clipboard fails
		}
		promptBefore.style.display = 'block';
		btnDisabled = true;

		try {
			await delay(50);
			promptBefore.style.width = '100%';

			await delay(250);
			ogPrompt.style.opacity = '0';

			await delay(500);
			ogPrompt.style.display = 'none';
			successMessage.style.display = 'block';
			promptBefore.style.opacity = '0';

			await delay(50);
			successMessage.style.opacity = '1';

			await delay(1500);
			successMessage.style.opacity = '0';

			await delay(500);
			successMessage.style.display = 'none';
			ogPrompt.style.display = 'block';
			promptBefore.style.display = 'none';
			promptBefore.style.width = '0%';
			promptBefore.style.opacity = '1';

			successMessage.style.width = 'auto';
			installBox.style.height = 'auto';
			btnDisabled = false;

			await delay(50);
			ogPrompt.style.opacity = '1';
		} catch (error) {
			console.error('Error en la animación de copiado:', error);
			btnDisabled = false;
		}
	}
</script>

<section class="cta-block" id="start">
	<div class="wrap cta-wrap">
		<img src="/icons/favicon.svg" alt="Chocola Logo" />

		<div class="eyebrow" style="justify-content:center;">Get started</div>

		<h2>Install once. Compile forever.</h2>

		<p>No boilerplate. No plugins to reconcile. Point Chocola at a folder.</p>

		<div bind:this={installBox} class="install-box">
			<div bind:this={promptBefore} class="before"></div>

			<span bind:this={ogPrompt} class="og-prompt"
				><span class="pink">$</span> <span class="cmd">{installPrompt}</span></span
			>

			<span bind:this={successMessage} class="sccs-msg"
				><span class="brace-gold">&#123;</span> Prompt copied! <span class="brace-gold">&#125;</span
				></span
			>

			<button bind:this={btn} class="copy-btn" on:click={copyPrompt} disabled={btnDisabled}
				>Copy</button
			>
		</div>

		<div class="cta-switch">
			<span>Looking for stable? Use</span>
			<code>npm i chocola</code>
		</div>
	</div>
</section>

<style>
	.cta-block {
		text-align: center;
		padding: 130px 0 140px;
	}

	.cta-wrap {
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	h2 {
		font-size: clamp(30px, 4vw, 46px);
	}

	p {
		color: var(--text-muted);
		font-size: 16.5px;
		margin-bottom: 44px;
	}

	img {
		margin-bottom: 32px;
		max-width: 20%;
	}

	.install-box {
		position: relative;
		display: inline-flex;
		align-items: center;
		gap: 14px;
		background-color: var(--surface-3);
		border: 1px solid var(--border);
		border-radius: 999px;
		padding: 12px 12px 12px 24px;
		font-family: 'JetBrains Mono', monospace;
		font-size: 14.5px;
		transition: background-color 0.3s ease-in-out;
		overflow: hidden;
	}

	.install-box:hover {
		background-color: var(--surface-2);
	}

	.before {
		display: none;
		position: absolute;
		top: 0;
		left: 0;
		width: 0%;
		height: 100%;
		background-color: white;
		border-radius: 999px;
		mix-blend-mode: soft-light;
		transition:
			width 1s ease-in-out,
			opacity 1s ease-in-out;
		z-index: 0;
	}

	.og-prompt,
	.sccs-msg {
		transition: all 0.5s ease-out;
	}

	.sccs-msg {
		opacity: 0;
		display: none;
		font-weight: 700;
	}

	.brace-gold {
		font-weight: 800;
		color: var(--gold);
	}

	.pink {
		opacity: 0.65;
		color: var(--pink);
	}

	.install-box .cmd {
		color: var(--text);
	}

	.copy-btn {
		background: var(--text);
		color: var(--bg);
		border: none;
		border-radius: 999px;
		font-family: 'Inter', sans-serif;
		font-weight: 600;
		font-size: 12.5px;
		padding: 8px 16px;
		cursor: pointer;
		z-index: 1;
	}

	.copy-btn:disabled {
		opacity: 0.7;
		cursor: default;
	}

	.cta-switch {
		margin-top: 16px;
		display: flex;
		align-items: center;
		gap: 8px;
		flex-wrap: wrap;
		justify-content: center;
		font-family: 'JetBrains Mono', monospace;
		font-size: 12.5px;
		color: var(--text-faint);
	}

	.cta-switch code {
		font-size: 12px;
		padding: 2px 6px;
	}
</style>
