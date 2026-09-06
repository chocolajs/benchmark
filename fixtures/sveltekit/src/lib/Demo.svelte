<script>
	let isCompiled = false;
	let logText = '';
	let interval;

	function handleClick() {
		if (isCompiled) {
			isCompiled = false;
			logText = '';
			if (interval) clearInterval(interval);
			return;
		}

		const reduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		const steps = ['resolving bindings …', 'baking component…', 'done'];

		if (reduced) {
			isCompiled = true;
			logText = steps[steps.length - 1];
			return;
		}

		let i = 0;
		logText = steps[0];
		interval = setInterval(() => {
			i++;
			if (i < steps.length) logText = steps[i];
			if (i >= steps.length - 1) {
				isCompiled = true;
				clearInterval(interval);
			}
		}, 500);
	}
</script>

<div class="demo" class:is-compiled={isCompiled} id="compileDemo">
	<div class="demo-head">
		<div class="demo-filename">status-badge.html</div>
		<div class="demo-dots"><span></span><span></span><span></span></div>
	</div>

	<div class="demo-body">
		<div class="demo-source" style:display={isCompiled ? 'none' : 'block'}>
			<div class="code-block">
				<span class="tag">&lt;h1&gt;</span><span class="baked">&#123;title&#125;</span><span
					class="tag">&lt;/h1&gt;</span
				>
				<br />
				<br />
				<span class="tag">&lt;p&gt;</span>Status: <span class="baked">&#123;status&#125;</span><span
					class="tag">&lt;/p&gt;</span
				>
				<br />
				<br />
				<span class="tag">&lt;div</span><span class="attr"> if</span>=<span class="live"
					>"&#123;status === 'live'&#125;"</span
				><span class="tag">&gt;</span>
				<br />
				<span class="tag">&emsp;&emsp;&lt;span&gt;</span>● Online<span class="tag">&lt;/span&gt;</span>
				<br />
				<span class="tag">&lt;/div&gt;</span>
			</div>
		</div>

		<div class="demo-output" style:display={isCompiled ? 'block' : 'none'}>
			<div class="code-block">
				<span class="tag">&lt;h1&gt;</span><span class="baked">Chocola</span><span
					class="tag">&lt;/h1&gt;</span
				>
				<br />
				<br />
				<span class="tag">&lt;p&gt;</span>
				<br />
				&emsp;Status: <span class="tag">&lt;span</span><span class="tag">&gt;</span><span class="baked"
					>live</span
				><span class="tag">&lt;/span&gt;</span>
				<br />
				&lt;/p&gt;
				<br />
				<br />
				<span class="tag">&lt;div</span><span class="tag">&gt;</span>
				<br />
				<span class="tag">&emsp;&emsp;&lt;span&gt;</span>● Online<span class="tag">&lt;/span&gt;</span>
				<br />
				<span class="tag">&lt;/div&gt;</span>
				<br />
			</div>
		</div>

		<div class="buildlog">{logText}</div>
	</div>

	<div class="demo-footer">
		<button
			class="compile-btn"
			on:click={handleClick}
			data-label={isCompiled ? 'reset' : 'compile'}
			aria-label={isCompiled ? 'reset compilation demo' : 'compile demo'}
		></button>
	</div>
</div>

<style>
	.demo {
		--surface: var(--dp-surface);
		--surface-2: var(--dp-surface-2);
		--border: var(--dp-border);
		--border-soft: var(--dp-border-soft);
		--text: var(--dp-text);
		--text-muted: var(--dp-text-muted);
		--text-faint: var(--dp-text-faint);
		--gold: var(--dp-gold);
		--pink: var(--dp-pink);
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--radius-lg);
		box-shadow: var(--shadow);
		overflow: hidden;
	}

	.demo.is-compiled .demo-output {
		animation: reveal 0.5s ease;
	}

	@keyframes reveal {
		from {
			opacity: 0;
			transform: translateY(6px);
		}

		to {
			opacity: 1;
			transform: none;
		}
	}

	.demo-footer {
		display: flex;
		align-items: center;
		justify-content: end;
		gap: 12px;
		padding: 16px 22px;
		border-top: 1px solid var(--border-soft);
		background: var(--surface-2);
	}

	.compile-btn {
		font-family: 'JetBrains Mono', monospace;
		font-size: 13px;
		font-weight: 600;
		background: var(--text);
		color: var(--surface);
		border: none;
		border-radius: 999px;
		padding: 8px 16px;
		cursor: pointer;
		transition: transform 0.15s ease;
		white-space: nowrap;
	}

	.compile-btn:hover {
		transform: translateY(-1px);
	}

	.demo.is-compiled .compile-btn::after {
		content: ' ↺ reset';
	}

	.demo:not(.is-compiled) .compile-btn::after {
		content: ' → compile';
	}

	.compile-btn::before {
		content: attr(data-label);
	}

	.buildlog {
		font-family: 'JetBrains Mono', monospace;
		font-size: 11.5px;
		color: var(--text-faint);
		height: 16px;
		margin-top: 6px;
	}
</style>
