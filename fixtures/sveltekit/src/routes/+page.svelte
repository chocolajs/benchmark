<script>
	import VersionBanner from '$lib/VersionBanner.svelte';
	import NavBar from '$lib/NavBar.svelte';
	import Hero from '$lib/Hero.svelte';
	import Stats from '$lib/Stats.svelte';
	import LogicSection from '$lib/LogicSection.svelte';
	import ComponentsSection from '$lib/ComponentsSection.svelte';
	import CtaSection from '$lib/CtaSection.svelte';
	import CommonFooter from '$lib/CommonFooter.svelte';
</script>

<VersionBanner />
<NavBar />

<main id="top">
	<Hero />
	<Stats />
	<LogicSection />
	<ComponentsSection />
	<CtaSection />
	<CommonFooter />
</main>
